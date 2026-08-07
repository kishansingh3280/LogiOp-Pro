// Global "selected Financial Year" state, persisted to AsyncStorage so
// the choice survives app restarts. Every dashboard / ledger / bullion
// screen reads from this hook — one selector, one source of truth.

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { currentFYKey, type FYKey } from "@/src/utils/fy";

const STORAGE_KEY = "app:selected-fy";

interface FYState {
  fy: FYKey;
  setFY: (next: FYKey) => void;
  hydrated: boolean;
}

const FYContext = createContext<FYState | null>(null);

export function FYProvider({ children }: { children: React.ReactNode }) {
  const [fy, setFyState] = useState<FYKey>(() => currentFYKey());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && stored) setFyState(stored);
      } catch {
        /* AsyncStorage errors are non-fatal */
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setFY = useCallback((next: FYKey) => {
    setFyState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const value = useMemo(() => ({ fy, setFY, hydrated }), [fy, setFY, hydrated]);

  return <FYContext.Provider value={value}>{children}</FYContext.Provider>;
}

export function useFY(): FYState {
  const ctx = useContext(FYContext);
  if (!ctx) {
    // Fallback to a read-only default so screens outside the provider
    // don't crash during dev navigation.
    const noop = () => undefined;
    return { fy: currentFYKey(), setFY: noop, hydrated: true };
  }
  return ctx;
}
