/**
 * useWakeWord — continuous background listening for a wake phrase.
 *
 * Web: uses the browser's SpeechRecognition API in continuous mode. When
 * the transcript contains any of the configured wake phrases (default:
 * "assistant" / "wingman" / "hey jarvis"), the `onWake` callback fires.
 *
 * Native (iOS / Android): the ExpoAudio recording API doesn't expose an
 * incremental transcript, and integrating a wake-word library like
 * porcupine adds ~5MB to the bundle. We skip wake-word on native — the
 * bubble tap + Live Mode remain the primary entry points.
 *
 * The recogniser only starts if:
 *   • `enabled` is true (default), AND
 *   • Mic permission is already `granted` (so we never prompt just for
 *     wake-word — the user must have used the mic at least once already)
 *
 * When the popup / live-mode is active the wake-word listener is paused
 * so it doesn't fight the recorder for the mic stream.
 */
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

type Options = {
  enabled: boolean;
  phrases?: string[];
  /** Called with the matched phrase whenever a wake word is heard. */
  onWake: (phrase: string) => void;
};

const DEFAULT_PHRASES = ["assistant", "wingman", "hey jarvis", "hey wingman"];

export function useWakeWord({ enabled, phrases, onWake }: Options) {
  const onWakeRef = useRef(onWake);
  onWakeRef.current = onWake;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (Platform.OS !== "web") return; // native: no-op
    if (!enabled) return;
    if (typeof window === "undefined") return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const Recog = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recog) {
      // eslint-disable-next-line no-console
      console.log("[wake-word] SpeechRecognition unavailable — skipping");
      return;
    }

    // Only start if the user has already granted mic permission — asking
    // just to poll for a wake word is annoying and Chrome will re-prompt
    // every session anyway.
    const runIfPermitted = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const perm = await (navigator.permissions as any)?.query?.({ name: "microphone" as PermissionName });
        if (perm?.state && perm.state !== "granted") {
          // eslint-disable-next-line no-console
          console.log(`[wake-word] mic permission is ${perm.state} — not starting`);
          return;
        }
      } catch {
        /* Permissions API missing (e.g. Firefox) — try anyway */
      }
      startRecogniser();
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let recog: any = null;
    let stopped = false;

    const startRecogniser = () => {
      if (stopped) return;
      try {
        recog = new Recog();
      } catch {
        return;
      }
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = "en-IN"; // Indian-English works well for Hinglish
      const list = (phrases || DEFAULT_PHRASES).map((p) => p.toLowerCase());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recog.onresult = (event: any) => {
        if (!enabledRef.current || stopped) return;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = (event.results[i][0]?.transcript || "").toLowerCase();
          for (const p of list) {
            if (transcript.includes(p)) {
              onWakeRef.current?.(p);
              return;
            }
          }
        }
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recog.onerror = (e: any) => {
        // "no-speech" and "aborted" are normal — silently retry.
        if (e?.error === "no-speech" || e?.error === "aborted") return;
        // eslint-disable-next-line no-console
        console.log("[wake-word] error:", e?.error || e);
      };
      recog.onend = () => {
        // Auto-restart unless we've been explicitly stopped or paused.
        if (!stopped && enabledRef.current) {
          try {
            recog?.start();
          } catch {
            /* recog may not be ready to restart yet — try again in 1s */
            setTimeout(() => {
              if (!stopped && enabledRef.current) {
                try { recog?.start(); } catch { /* give up */ }
              }
            }, 1000);
          }
        }
      };
      try {
        recog.start();
      } catch {
        // Another SpeechRecognition instance is running — leave it be.
      }
    };

    void runIfPermitted();

    return () => {
      stopped = true;
      try { recog?.abort?.(); } catch { /* ignore */ }
    };
  }, [enabled, phrases]);
}
