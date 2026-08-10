/**
 * useRealtimeVoice — WebRTC connection to OpenAI Realtime API.
 *
 * Web-only (Native falls back to the existing Whisper pipeline in the
 * Now Brief card). Flow:
 *   1. Hit /api/realtime-token for an ephemeral client_secret
 *   2. Build an RTCPeerConnection + data channel
 *   3. Attach the mic track
 *   4. SDP offer/answer with OpenAI
 *   5. Attach remote audio element to play the model's voice
 *   6. Expose transcript events + connection state to the UI
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import { API_BASE } from "@/src/api/client";
import { getAuthTokenSync } from "@/src/auth/context";

export type OrbState = "idle" | "connecting" | "listening" | "processing" | "speaking" | "error";

export type TranscriptTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  at: number;
  // For karaoke sync on the currently-speaking assistant turn
  isFinal?: boolean;
};

export interface UseRealtimeVoiceResult {
  supported: boolean;
  state: OrbState;
  transcript: TranscriptTurn[];
  error: string | null;
  micLevel: number;
  connect: (pageCtx: { page: string; summary?: string }) => Promise<void>;
  disconnect: () => void;
  sendText: (message: string) => void;
  isConnected: boolean;
}

export function useRealtimeVoice(): UseRealtimeVoiceResult {
  const supported =
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    typeof RTCPeerConnection !== "undefined";

  const [state, setState] = useState<OrbState>("idle");
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const levelRafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Track the in-progress assistant turn so we can accumulate deltas.
  const currentAssistantIdRef = useRef<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  // ---------------- Mic level meter (webaudio analyser) ----------------
  const startLevelMeter = useCallback((stream: MediaStream) => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioCtx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx: AudioContext = new AudioCtx();
    audioCtxRef.current = ctx;
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    const buf = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      setMicLevel(Math.min(1, rms * 3));
      levelRafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const stopLevelMeter = useCallback(() => {
    if (levelRafRef.current) cancelAnimationFrame(levelRafRef.current);
    levelRafRef.current = null;
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {
        /* ignore */
      }
    }
    audioCtxRef.current = null;
    setMicLevel(0);
  }, []);

  // ---------------- Disconnect ----------------
  const disconnect = useCallback(() => {
    if (dcRef.current) {
      try {
        dcRef.current.close();
      } catch {
        /* ignore */
      }
    }
    dcRef.current = null;
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {
        /* ignore */
      }
    }
    pcRef.current = null;
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    micStreamRef.current = null;
    stopLevelMeter();
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.srcObject = null;
    }
    audioElRef.current = null;
    setIsConnected(false);
    setState("idle");
  }, [stopLevelMeter]);

  // ---------------- Event handler for data channel messages ----------------
  const handleServerEvent = useCallback((ev: MessageEvent) => {
    try {
      const msg = JSON.parse(ev.data);
      const type: string = msg.type || "";

      // --- USER speech transcription -----
      if (type === "conversation.item.input_audio_transcription.delta") {
        const text = msg.delta || "";
        setTranscript((prev) => {
          const id = currentUserIdRef.current;
          if (!id) return prev;
          const idx = prev.findIndex((t) => t.id === id);
          if (idx < 0) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], content: (next[idx].content || "") + text };
          return next;
        });
      }
      if (type === "conversation.item.input_audio_transcription.completed") {
        const text = msg.transcript || "";
        setTranscript((prev) => {
          const id = currentUserIdRef.current;
          currentUserIdRef.current = null;
          if (!id) {
            // Fresh turn — user spoke before we could open a placeholder.
            return [...prev, { id: `u-${Date.now()}`, role: "user", content: text, at: Date.now(), isFinal: true }];
          }
          const idx = prev.findIndex((t) => t.id === id);
          if (idx < 0) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], content: text, isFinal: true };
          return next;
        });
      }
      if (type === "input_audio_buffer.speech_started") {
        // A fresh user turn is starting → open a placeholder bubble.
        const id = `u-${Date.now()}`;
        currentUserIdRef.current = id;
        setState("listening");
        setTranscript((prev) => [...prev, { id, role: "user", content: "", at: Date.now(), isFinal: false }]);
      }
      if (type === "input_audio_buffer.speech_stopped") {
        setState("processing");
      }

      // --- ASSISTANT streaming response -----
      if (type === "response.created") {
        const id = `a-${Date.now()}`;
        currentAssistantIdRef.current = id;
        setTranscript((prev) => [...prev, { id, role: "assistant", content: "", at: Date.now(), isFinal: false }]);
        setState("speaking");
      }
      if (type === "response.output_text.delta" || type === "response.audio_transcript.delta") {
        const delta = msg.delta || "";
        setTranscript((prev) => {
          const id = currentAssistantIdRef.current;
          if (!id) return prev;
          const idx = prev.findIndex((t) => t.id === id);
          if (idx < 0) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], content: (next[idx].content || "") + delta };
          return next;
        });
      }
      if (type === "response.done") {
        setTranscript((prev) => {
          const id = currentAssistantIdRef.current;
          currentAssistantIdRef.current = null;
          if (!id) return prev;
          const idx = prev.findIndex((t) => t.id === id);
          if (idx < 0) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], isFinal: true };
          return next;
        });
        // Handsfree — server VAD keeps the mic hot. As soon as the AI
        // finishes, we flip visual state back to `listening` so the
        // orb re-enters its cyan-pulse state and the user can jump in
        // without tapping. The mic track is never actually stopped
        // during the session; server-side VAD handles turn boundaries.
        setState(dcRef.current && dcRef.current.readyState === "open" ? "listening" : "idle");
      }
      if (type === "error") {
        // eslint-disable-next-line no-console
        console.warn("[realtime] server error:", msg);
        setError((msg.error && msg.error.message) || "Realtime error");
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[realtime] event parse failed", e);
    }
  }, []);

  // ---------------- Connect flow ----------------
  const connect = useCallback(
    async (pageCtx: { page: string; summary?: string }) => {
      if (!supported) {
        setError("Realtime voice is web-only in Phase 1");
        return;
      }
      setError(null);
      setState("connecting");
      try {
        // 1. Mint an ephemeral token from our backend
        const token = getAuthTokenSync();
        const tokRes = await fetch(`${API_BASE}/api/realtime-token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            page: pageCtx.page,
            page_data_summary: pageCtx.summary || "",
          }),
        });
        if (!tokRes.ok) throw new Error(`Token ${tokRes.status}`);
        const tokJson = (await tokRes.json()) as { ephemeral_key: string; model: string };
        const ephemeralKey = tokJson.ephemeral_key;
        const model = tokJson.model || "gpt-realtime";

        // 2. Request microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
        startLevelMeter(stream);

        // 3. Peer connection
        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        // 4. Remote audio → <audio> tag
        const audioEl = document.createElement("audio");
        audioEl.autoplay = true;
        audioElRef.current = audioEl;
        pc.ontrack = (e) => {
          if (audioElRef.current) audioElRef.current.srcObject = e.streams[0];
        };

        // 5. Add mic track
        stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));

        // 6. Data channel for events
        const dc = pc.createDataChannel("oai-events");
        dcRef.current = dc;
        dc.onmessage = handleServerEvent;
        dc.onopen = () => {
          setIsConnected(true);
          setState("listening");
        };
        dc.onerror = (e) => {
          // eslint-disable-next-line no-console
          console.warn("[realtime] data channel error", e);
        };

        // 7. Offer/Answer with OpenAI
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const sdpRes = await fetch(
          `https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`,
          {
            method: "POST",
            body: offer.sdp || "",
            headers: {
              Authorization: `Bearer ${ephemeralKey}`,
              "Content-Type": "application/sdp",
            },
          },
        );
        if (!sdpRes.ok) throw new Error(`SDP ${sdpRes.status}: ${await sdpRes.text().catch(() => "")}`);
        const answerSdp = await sdpRes.text();
        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      } catch (e) {
        setError((e as Error).message || "Realtime connect failed");
        setState("error");
        disconnect();
      }
    },
    [supported, handleServerEvent, startLevelMeter, disconnect],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // ---------------- Send a typed text message through the channel ----
  const sendText = useCallback((message: string) => {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== "open") return;
    const clean = (message || "").trim();
    if (!clean) return;
    // Mirror the user turn locally so the UI shows it instantly.
    const uid = `u-${Date.now()}`;
    setTranscript((prev) => [
      ...prev,
      { id: uid, role: "user", content: clean, at: Date.now(), isFinal: true },
    ]);
    // Two-step protocol per OpenAI Realtime spec: create a conversation
    // item, then trigger a response.
    try {
      dc.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: clean }],
          },
        }),
      );
      dc.send(JSON.stringify({ type: "response.create" }));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[realtime] sendText failed", e);
    }
  }, []);

  return {
    supported,
    state,
    transcript,
    error,
    micLevel,
    connect,
    disconnect,
    sendText,
    isConnected,
  };
}
