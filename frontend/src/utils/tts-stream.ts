/**
 * tts-stream — low-latency Text-to-Speech playback.
 *
 * Web (Chromium/Firefox):
 *   1. Fetch the backend's chunked `/api/assistant/tts/stream` endpoint.
 *   2. Attach a MediaSource to an <audio> element.
 *   3. Feed incoming chunks straight into the source buffer.
 *   4. `<audio>.play()` starts within ~300-500ms of the request going out.
 *
 * Safari:
 *   MediaSource with `audio/mpeg` is NOT supported on Safari, so we fall
 *   back to blob-buffered playback (still uses the streaming endpoint but
 *   waits for the full download).
 *
 * Native (Expo iOS/Android):
 *   Pass the GET URL to `expo-audio.createAudioPlayer({ uri })` — the OS
 *   audio player consumes the chunked HTTP stream natively.
 *
 * Return value:
 *   { promise, stop }
 *   `promise` resolves when playback finishes (or errors).
 *   `stop` interrupts + releases resources — call it on modal close /
 *   next chat turn / component unmount.
 */
import { Platform } from "react-native";

import { API_BASE } from "@/src/api/client";

export type StreamingTtsHandle = {
  promise: Promise<void>;
  stop: () => void;
};

export type StreamingTtsOptions = {
  text: string;
  voice?: string;
  /** Called when the audio actually begins playing — useful to switch the
   * orb into "speaking" mode. */
  onStart?: () => void;
  /** Called ONCE when the audio metadata has loaded and the total
   * duration (in ms) is known. Callers can use this to re-time the
   * ghost-typing / karaoke reveal so it matches the real narration. */
  onDuration?: (durationMs: number) => void;
  /** Called on any error — the caller may want to display a toast. */
  onError?: (err: Error) => void;
  /** Optional auth token; when present, sent as Bearer. */
  authToken?: string | null;
};

/** Start playback. Returns a handle so the caller can stop / await it. */
export function speakStreaming(opts: StreamingTtsOptions): StreamingTtsHandle {
  const text = (opts.text || "").trim();
  if (!text) {
    return {
      promise: Promise.resolve(),
      stop: () => undefined,
    };
  }

  if (Platform.OS === "web") {
    return _speakWeb(opts);
  }
  return _speakNative(opts);
}

// ---------------------------------------------------------------------------
// Web implementation (MediaSource + <audio>)
// ---------------------------------------------------------------------------
function _speakWeb(opts: StreamingTtsOptions): StreamingTtsHandle {
  let audioEl: HTMLAudioElement | null = null;
  let cancelled = false;
  let controller: AbortController | null = null;

  const stop = () => {
    cancelled = true;
    try {
      controller?.abort();
    } catch {
      /* ignore */
    }
    if (audioEl) {
      try {
        audioEl.pause();
        audioEl.src = "";
      } catch {
        /* ignore */
      }
      audioEl = null;
    }
  };

  const promise = (async () => {
    try {
      controller = new AbortController();
      const res = await fetch(`${API_BASE}/api/assistant/tts/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(opts.authToken ? { Authorization: `Bearer ${opts.authToken}` } : {}),
        },
        body: JSON.stringify({ text: opts.text, voice: opts.voice || "shimmer" }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        throw new Error(`TTS ${res.status}`);
      }

      const canStream =
        typeof MediaSource !== "undefined" && MediaSource.isTypeSupported("audio/mpeg");

      if (canStream) {
        await _playViaMediaSource(res, {
          onCreateAudio: (a) => {
            audioEl = a;
          },
          isCancelled: () => cancelled,
          onStart: opts.onStart,
          onDuration: opts.onDuration,
        });
      } else {
        // Safari fallback — buffer, then play.
        const blob = await res.blob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const el = new (window as any).Audio(url) as HTMLAudioElement;
        audioEl = el;
        // Emit total duration as soon as the metadata is available so the
        // caller can re-time character reveal to match the real audio.
        el.onloadedmetadata = () => {
          if (isFinite(el.duration) && el.duration > 0) {
            opts.onDuration?.(el.duration * 1000);
          }
        };
        el.onplaying = () => opts.onStart?.();
        await el.play();
        await new Promise<void>((resolve) => {
          el.onended = () => resolve();
          el.onerror = () => resolve();
        });
      }
    } catch (e) {
      if (!cancelled) opts.onError?.(e as Error);
    }
  })();

  return { promise, stop };
}

/** Feed the fetch stream into a MediaSource + <audio> combo. */
async function _playViaMediaSource(
  res: Response,
  helpers: {
    onCreateAudio: (a: HTMLAudioElement) => void;
    isCancelled: () => boolean;
    onStart?: () => void;
    onDuration?: (durationMs: number) => void;
  },
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AudioCtor = (window as any).Audio as typeof HTMLAudioElement;
  const mediaSource = new MediaSource();
  const el = new AudioCtor();
  helpers.onCreateAudio(el);
  el.autoplay = true;
  el.src = URL.createObjectURL(mediaSource);
  let startedFired = false;
  let durationFired = false;
  el.addEventListener("playing", () => {
    if (!startedFired) {
      startedFired = true;
      helpers.onStart?.();
    }
  });
  const tryEmitDuration = () => {
    if (durationFired) return;
    if (isFinite(el.duration) && el.duration > 0) {
      durationFired = true;
      helpers.onDuration?.(el.duration * 1000);
    }
  };
  el.addEventListener("loadedmetadata", tryEmitDuration);
  el.addEventListener("durationchange", tryEmitDuration);

  const openPromise = new Promise<SourceBuffer>((resolve, reject) => {
    mediaSource.addEventListener("sourceopen", () => {
      try {
        const sb = mediaSource.addSourceBuffer("audio/mpeg");
        resolve(sb);
      } catch (e) {
        reject(e as Error);
      }
    });
    mediaSource.addEventListener("sourceerror", () => reject(new Error("MediaSource error")));
  });

  const sourceBuffer = await openPromise;

  // Reader loop — append each chunk. `updating` MUST be false before we
  // call appendBuffer again, so we wait between appends.
  const reader = res.body!.getReader();
  const chunkQueue: Uint8Array[] = [];
  let readerDone = false;

  const appendNext = async () => {
    if (helpers.isCancelled()) return;
    while (chunkQueue.length && !sourceBuffer.updating) {
      const next = chunkQueue.shift();
      if (!next) break;
      try {
        sourceBuffer.appendBuffer(next);
        await new Promise<void>((resolve) => {
          sourceBuffer.addEventListener("updateend", () => resolve(), { once: true });
        });
      } catch (e) {
        // QuotaExceededError shouldn't happen for a short mp3 but guard.
        // eslint-disable-next-line no-console
        console.warn("[tts-stream] appendBuffer error:", (e as Error).message);
        break;
      }
    }
  };

  while (!readerDone) {
    const { value, done } = await reader.read();
    if (helpers.isCancelled()) break;
    if (done) {
      readerDone = true;
      break;
    }
    if (value && value.byteLength > 0) {
      chunkQueue.push(value);
      await appendNext();
    }
  }

  // Drain any remaining chunks.
  await appendNext();
  if (!helpers.isCancelled()) {
    try {
      if (mediaSource.readyState === "open") mediaSource.endOfStream();
    } catch {
      /* ignore */
    }
  }

  // Wait for playback to finish (or 60s cap so we never hang forever).
  await new Promise<void>((resolve) => {
    const done = () => resolve();
    el.addEventListener("ended", done, { once: true });
    el.addEventListener("error", done, { once: true });
    // Safety timeout — 60s of continuous speech is way beyond our use case.
    setTimeout(done, 60_000);
  });
}

// ---------------------------------------------------------------------------
// Native implementation (expo-audio + GET URL — OS handles streaming)
// ---------------------------------------------------------------------------
function _speakNative(opts: StreamingTtsOptions): StreamingTtsHandle {
  let cancelled = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let player: any = null;

  const stop = () => {
    cancelled = true;
    try {
      player?.pause?.();
      player?.remove?.();
    } catch {
      /* ignore */
    }
    player = null;
  };

  const promise = (async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ExpoAudio = require("expo-audio") as typeof import("expo-audio");
      const params = new URLSearchParams({
        text: opts.text,
        voice: opts.voice || "shimmer",
      });
      const url = `${API_BASE}/api/assistant/tts/stream?${params.toString()}`;
      player = ExpoAudio.createAudioPlayer({ uri: url });
      player.play();
      opts.onStart?.();
      // Wait for the "finished" event or cancel.
      await new Promise<void>((resolve) => {
        try {
          player.addListener?.("playbackStatusUpdate", (s: { didJustFinish?: boolean }) => {
            if (cancelled || s.didJustFinish) resolve();
          });
        } catch {
          resolve();
        }
        setTimeout(resolve, 60_000);
      });
    } catch (e) {
      if (!cancelled) opts.onError?.(e as Error);
    }
  })();

  return { promise, stop };
}
