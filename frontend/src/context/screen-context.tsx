/**
 * ScreenContextProvider — a shared blackboard where each screen registers
 * "what am I showing right now" so the Assistant can produce context-aware
 * greetings ("Kishan Sir, I see you are on Invoice #INV-042 for ABC Trader,
 * ₹5.2L pending"). Also tracks the current route via expo-router.
 *
 * Usage (from any screen):
 *   const { setScreen } = useScreenContext();
 *   useEffect(() => setScreen({ id: "invoice-detail", label: "Invoice INV-042",
 *      summary: "ABC Trader · ₹5.2L pending · 3 bags" }), []);
 */
import { usePathname } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type ScreenSnapshot = {
  /** Stable ID, e.g. `invoice-detail`, `shipments-list`. */
  id: string;
  /** Human-readable label, e.g. "Invoice INV-042". */
  label: string;
  /** One-line data summary the AI should mention (optional). */
  summary?: string;
  /** Optional structured payload (money, counts, IDs) the AI can quote. */
  data?: Record<string, unknown>;
  /** The pathname when this snapshot was recorded. */
  pathname?: string;
};

type Ctx = {
  route: string;
  screen: ScreenSnapshot | null;
  setScreen: (snap: ScreenSnapshot | null) => void;
  /** Composes a natural-language context string for the AI system prompt. */
  describeForAI: () => string;
};

const ScreenCtx = createContext<Ctx | null>(null);

export function ScreenContextProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [screen, setScreenState] = useState<ScreenSnapshot | null>(null);
  // Ref mirror so `describeForAI` doesn't re-render dependents when the screen
  // silently updates its snapshot payload.
  const screenRef = useRef<ScreenSnapshot | null>(null);

  const setScreen = useCallback((snap: ScreenSnapshot | null) => {
    screenRef.current = snap;
    setScreenState(snap);
  }, []);

  // Clear the snapshot on route change so a stale label from a previous
  // screen never leaks into the AI's context.
  useEffect(() => {
    screenRef.current = null;
    setScreenState(null);
  }, [pathname]);

  const describeForAI = useCallback(() => {
    const s = screenRef.current;
    const route = pathname || "/";
    if (!s) return `Current route: ${route}`;
    const parts = [`Current screen: ${s.label} (${route})`];
    if (s.summary) parts.push(`Details: ${s.summary}`);
    if (s.data && Object.keys(s.data).length) {
      parts.push(`Data: ${JSON.stringify(s.data)}`);
    }
    return parts.join(" · ");
  }, [pathname]);

  const value = useMemo<Ctx>(
    () => ({ route: pathname || "/", screen, setScreen, describeForAI }),
    [pathname, screen, setScreen, describeForAI],
  );

  return <ScreenCtx.Provider value={value}>{children}</ScreenCtx.Provider>;
}

export function useScreenContext(): Ctx {
  const ctx = useContext(ScreenCtx);
  if (!ctx) throw new Error("useScreenContext must be used inside <ScreenContextProvider>");
  return ctx;
}

/**
 * Convenience: register the current screen for the duration of a component's
 * lifetime, and auto-clear on unmount.
 */
export function useRegisterScreen(snap: ScreenSnapshot | null | (() => ScreenSnapshot | null)) {
  const { setScreen } = useScreenContext();
  useEffect(() => {
    const value = typeof snap === "function" ? snap() : snap;
    setScreen(value);
    return () => setScreen(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeof snap === "function" ? null : JSON.stringify(snap)]);
}
