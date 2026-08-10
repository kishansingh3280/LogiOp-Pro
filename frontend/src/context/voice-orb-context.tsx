/**
 * VoiceOrbContext — shared state for the floating Wingman voice orb.
 *
 * Every screen can:
 *   • Report its current route + a short data-summary via `setPageContext`
 *   • Read the live transcript + orb state so screens can (in Phase 2)
 *     ghost-fill forms driven by the model.
 */
import React, {
  createContext,
  useCallback,
  useContext,
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
  setPageContext: (page: string, summary?: string) => void;
  toggle: () => void; // start or stop the realtime session
}

const VoiceOrbContext = createContext<VoiceOrbCtx | null>(null);

export function VoiceOrbProvider({ children }: { children: React.ReactNode }) {
  const rv = useRealtimeVoice();
  const [page, setPage] = useState<string>("dashboard");
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

  const value = useMemo<VoiceOrbCtx>(
    () => ({
      supported: rv.supported,
      isConnected: rv.isConnected,
      state: rv.state,
      micLevel: rv.micLevel,
      transcript: rv.transcript,
      error: rv.error,
      page,
      setPageContext,
      toggle,
    }),
    [rv.supported, rv.isConnected, rv.state, rv.micLevel, rv.transcript, rv.error, page, setPageContext, toggle],
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
      setPageContext: () => undefined,
      toggle: () => undefined,
    };
  }
  return ctx;
}
