/**
 * VoiceOrbContext — shared state for the floating Wingman voice orb.
 *
 * Every screen can:
 *   • Report its current route + a short data-summary via `setPageContext`
 *   • Read the live transcript + orb state so screens can (in Phase 2)
 *     ghost-fill forms driven by the model.
 *   • Toggle a global `muted` flag that silences the AI narration
 *     (TTS) coming out of OPSI Daily Brief without touching the mic/text
 *     flow. The Wingman TTS player subscribes to this flag.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useRealtimeVoice,
  type OrbState,
  type TranscriptTurn,
} from "@/src/hooks/use-realtime-voice";

interface VoiceOrbCtx {
  supported: boolean;
  isConnected: boolean;
  state: OrbState;
  micLevel: number;
  transcript: TranscriptTurn[];
  error: string | null;
  page: string;
  muted: boolean;
  setPageContext: (page: string, summary?: string) => void;
  toggle: () => void; // start or stop the realtime session
  sendText: (message: string) => void;
  setMuted: (m: boolean) => void;
  toggleMute: () => void;
  /** Broadcast a floating cloud-bubble notification above the OPSI orb.
   * The VoiceOrb component subscribes to this signal via a shared queue. */
  pushBubble: (message: string) => void;
  /** Read-only counter incremented every time `pushBubble` is called —
   * VoiceOrb watches this to show the newest message. */
  bubbleTick: number;
  /** Latest broadcast message (paired with `bubbleTick`). */
  bubbleMessage: string;
}

const VoiceOrbContext = createContext<VoiceOrbCtx | null>(null);

export function VoiceOrbProvider({ children }: { children: React.ReactNode }) {
  const rv = useRealtimeVoice();
  const [page, setPage] = useState<string>("dashboard");
  // Global mute for Wingman narration. Default = muted (matches the old
  // OPSI Daily Brief default so nobody gets surprised by talking on load).
  const [muted, setMuted] = useState<boolean>(true);
  const summaryRef = useRef<string>("");

  const setPageContext = useCallback((newPage: string, summary?: string) => {
    setPage(newPage);
    if (summary !== undefined) summaryRef.current = summary;
  }, []);

  const toggle = useCallback(() => {
    if (rv.isConnected || rv.state === "connecting") {
      rv.disconnect();
      return;
    }
    rv.connect({ page, summary: summaryRef.current });
  }, [rv, page]);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  // ─── OPSI Cloud Bubble broadcast queue ────────────────────────────
  // Any component can call `pushBubble(msg)` to surface a floating pill
  // above the orb (e.g., when Wingman writes a new invoice, when
  // WhatsApp/LINE receives an inbound reply, or when the operator
  // completes a critical action). VoiceOrb watches `bubbleTick` and
  // renders the newest `bubbleMessage`.
  const [bubbleTick, setBubbleTick] = useState(0);
  const [bubbleMessage, setBubbleMessage] = useState("");
  const pushBubble = useCallback((message: string) => {
    const trimmed = String(message || "").trim();
    if (!trimmed) return;
    setBubbleMessage(trimmed);
    setBubbleTick((t) => t + 1);
  }, []);

  // Web-only debug hook — lets you fire a bubble from browser devtools
  // via `window.__opsiBubble("Hello Sir")`. Handy for QA & demos; no-op
  // on native platforms because `window` is undefined there.
  useEffect(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__opsiBubble = pushBubble;
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      try { delete (window as any).__opsiBubble; } catch { /* ignore */ }
    };
  }, [pushBubble]);

  const value = useMemo<VoiceOrbCtx>(
    () => ({
      supported: rv.supported,
      isConnected: rv.isConnected,
      state: rv.state,
      micLevel: rv.micLevel,
      transcript: rv.transcript,
      error: rv.error,
      page,
      muted,
      setPageContext,
      toggle,
      sendText: rv.sendText,
      setMuted,
      toggleMute,
      pushBubble,
      bubbleTick,
      bubbleMessage,
    }),
    [rv.supported, rv.isConnected, rv.state, rv.micLevel, rv.transcript, rv.error, page, muted, setPageContext, toggle, rv.sendText, toggleMute, pushBubble, bubbleTick, bubbleMessage],
  );

  return <VoiceOrbContext.Provider value={value}>{children}</VoiceOrbContext.Provider>;
}

export function useVoiceOrb(): VoiceOrbCtx {
  const ctx = useContext(VoiceOrbContext);
  if (!ctx) {
    // Safe default so components mounted outside the provider don't crash.
    return {
      supported: false,
      isConnected: false,
      state: "idle",
      micLevel: 0,
      transcript: [],
      error: null,
      page: "dashboard",
      muted: true,
      setPageContext: () => undefined,
      toggle: () => undefined,
      sendText: () => undefined,
      setMuted: () => undefined,
      toggleMute: () => undefined,
      pushBubble: () => undefined,
      bubbleTick: 0,
      bubbleMessage: "",
    };
  }
  return ctx;
}
