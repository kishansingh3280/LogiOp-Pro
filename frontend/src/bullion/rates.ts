import { useCallback, useEffect, useState } from "react";

import { storage } from "@/src/utils/storage";

const RATES_KEY = "bullion:rates";

export interface BullionRates {
  /** INR carrier fee charged per $1,000 (or per 1,000 units of foreign currency) carried. */
  currency_rate_per_1000: number;
  /** INR carrier fee per baht (15.244g) of gold carried. */
  gold_rate_per_baht: number;
}

export const DEFAULT_RATES: BullionRates = {
  currency_rate_per_1000: 500,
  gold_rate_per_baht: 2500,
};

type Listener = (r: BullionRates) => void;
const listeners = new Set<Listener>();
let cache: BullionRates | null = null;

function notify(r: BullionRates) {
  listeners.forEach((l) => l(r));
}

export async function getRates(): Promise<BullionRates> {
  if (cache) return cache;
  const raw = await storage.getItem<string>(RATES_KEY, "");
  if (!raw) {
    cache = { ...DEFAULT_RATES };
    return cache;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<BullionRates>;
    cache = {
      currency_rate_per_1000:
        typeof parsed.currency_rate_per_1000 === "number"
          ? parsed.currency_rate_per_1000
          : DEFAULT_RATES.currency_rate_per_1000,
      gold_rate_per_baht:
        typeof parsed.gold_rate_per_baht === "number"
          ? parsed.gold_rate_per_baht
          : DEFAULT_RATES.gold_rate_per_baht,
    };
    return cache;
  } catch {
    cache = { ...DEFAULT_RATES };
    return cache;
  }
}

export async function setRates(next: BullionRates): Promise<void> {
  const clean: BullionRates = {
    currency_rate_per_1000: Math.max(0, Number(next.currency_rate_per_1000) || 0),
    gold_rate_per_baht: Math.max(0, Number(next.gold_rate_per_baht) || 0),
  };
  cache = clean;
  await storage.setItem(RATES_KEY, JSON.stringify(clean));
  notify(clean);
}

/** Synchronous getter — returns the currently-cached rates or defaults. */
export function getCurrentRates(): BullionRates {
  return cache ? { ...cache } : { ...DEFAULT_RATES };
}

/**
 * React hook that subscribes to global rate changes.
 * On mount it kicks off an async load; subscribers get live updates
 * whenever `setRates` is called from anywhere.
 */
export function useRates(): { data: BullionRates; refresh: () => Promise<void> } {
  const [data, setData] = useState<BullionRates>(getCurrentRates());

  const refresh = useCallback(async () => {
    const r = await getRates();
    setData(r);
  }, []);

  useEffect(() => {
    refresh();
    const cb = (r: BullionRates) => setData(r);
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, [refresh]);

  return { data, refresh };
}
