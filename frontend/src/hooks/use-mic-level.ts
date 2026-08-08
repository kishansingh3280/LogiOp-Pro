/**
 * useMicLevel — expose a live 0..1 amplitude value from the device
 * microphone. On native, uses `expo-audio`'s recording metering (dB) which
 * we normalise to 0..1. On web, uses the WebAudio API + AnalyserNode.
 *
 * The hook only starts sampling when `active` is true (typically while the
 * assistant is in the "listening" mode) and cleanly releases the stream
 * when `active` flips false or the component unmounts.
 *
 * Returned tuple:
 *   const { level, start, stop, error } = useMicLevel();
 *
 * The recorded audio blob (WebM/MP4 on web, m4a on native) is exposed via
 * `stop()` so the caller can POST it to the STT endpoint.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

// Only import expo-audio on native to avoid pulling native code on web.
let ExpoAudio: typeof import("expo-audio") | null = null;
if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ExpoAudio = require("expo-audio");
  } catch {
    ExpoAudio = null;
  }
}

export type MicHandle = {
  level: number;
  listening: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<{ uri?: string; blob?: Blob; mimeType?: string } | null>;
};

// dB (usually −160..0) → 0..1 with a gentle log floor so a whisper still
// registers something and a shout doesn't clip.
function dbToLevel(db: number): number {
  if (!isFinite(db)) return 0;
  // Below -60dB is effectively silence.
  const clamped = Math.max(-60, Math.min(0, db));
  return Math.max(0, Math.min(1, (clamped + 60) / 60));
}

export function useMicLevel(): MicHandle {
  const [level, setLevel] = useState(0);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const nativeRecRef = useRef<any>(null);
  const meterTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopWeb = useCallback(async (): Promise<{ blob?: Blob; mimeType?: string } | null> => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    const rec = recorderRef.current;
    let blob: Blob | undefined;
    let mimeType: string | undefined;
    if (rec && rec.state !== "inactive") {
      await new Promise<void>((resolve) => {
        rec.addEventListener("stop", () => resolve(), { once: true });
        rec.stop();
      });
      mimeType = rec.mimeType || "audio/webm";
      blob = new Blob(chunksRef.current, { type: mimeType });
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    analyserRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    setListening(false);
    setLevel(0);
    return blob ? { blob, mimeType } : null;
  }, []);

  const startWeb = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      const ctx = new AC();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        // RMS on time-domain samples (0..255, silence = 128).
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        // Boost so normal speech reads ~0.4..0.7.
        const norm = Math.min(1, rms * 3.5);
        setLevel(norm);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      // MediaRecorder for the audio blob that we'll POST to /assistant/stt.
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.start(200);
      recorderRef.current = rec;
      setListening(true);
    } catch (e) {
      setError((e as Error).message || "Microphone permission denied");
      setListening(false);
    }
  }, []);

  const startNative = useCallback(async () => {
    if (!ExpoAudio) {
      setError("expo-audio not available");
      return;
    }
    setError(null);
    try {
      const perm = await ExpoAudio.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setError("Microphone permission denied");
        return;
      }
      await ExpoAudio.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      const options = {
        // High-quality preset with metering enabled.
        ...ExpoAudio.RecordingPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      };
      const rec = new ExpoAudio.AudioRecorder(options);
      await rec.prepareToRecordAsync();
      rec.record();
      nativeRecRef.current = rec;

      // Poll metering — expo-audio doesn't push events, we sample at 30hz.
      meterTimerRef.current = setInterval(() => {
        try {
          const status = rec.getStatus();
          if (status.metering != null) {
            setLevel(dbToLevel(status.metering));
          }
        } catch {
          /* ignore transient errors */
        }
      }, 33);
      setListening(true);
    } catch (e) {
      setError((e as Error).message || "Failed to start microphone");
      setListening(false);
    }
  }, []);

  const stopNative = useCallback(async (): Promise<{ uri?: string } | null> => {
    if (meterTimerRef.current) {
      clearInterval(meterTimerRef.current);
      meterTimerRef.current = null;
    }
    const rec = nativeRecRef.current;
    nativeRecRef.current = null;
    setListening(false);
    setLevel(0);
    if (!rec) return null;
    try {
      await rec.stop();
      const uri = rec.uri as string | undefined;
      return uri ? { uri } : null;
    } catch {
      return null;
    }
  }, []);

  const start = useCallback(async () => {
    if (Platform.OS === "web") return startWeb();
    return startNative();
  }, [startWeb, startNative]);

  const stop = useCallback(async () => {
    if (Platform.OS === "web") return stopWeb();
    return stopNative();
  }, [stopWeb, stopNative]);

  useEffect(() => {
    return () => {
      stop().catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { level, listening, error, start, stop };
}
