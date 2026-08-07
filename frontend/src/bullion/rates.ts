// Bullion rates — REST-backed singleton with an in-memory cache and one-time
// migration from the legacy AsyncStorage payload. Wingman writes go through
// the same endpoint so UI-side changes and AI edits stay in sync.

import { useCallback, useEffect, useState } from "react";

import { apiGet, apiPut } from "@/src/api/client";
import { storage } from "@/src/utils/storage";

const RATES_KEY = "bullion:rates";
const RATES_MIGRATION_KEY = "bullion:rates:migration:v1";
const RATES_PATH = "/api/bullion/rates";

export interface BullionRates {
  /** INR carrier fee charged per $1,000 (or per 1,000 units of foreign currency) carried. */
  currency_rate_per_1000: number;
  /** INR carrier fee per baht (15.244g) of gold carried. */
  gold_rate_per_baht: number;
  /**
   * Generic hand-carry courier fee, INR per kg. Applied automatically to
   * every "hand_carry" mode shipment (regular goods — not bullion trades).
   * Used to auto-fill the "You Pay Carrier" field on new shipments.
   */
  hand_carry_rate_inr_per_kg: number;
}

export const DEFAULT_RATES: BullionRates = {
  currency_rate_per_1000: 500,
  gold_rate_per_baht: 2500,
  hand_carry_rate_inr_per_kg: 200,
};

type Listener = (r: BullionRates) => void;
const listeners = new Set<Listener>();
let cache: BullionRates | null = null;

function notify(r: BullionRates) {
  listeners.forEach((l) => l(r));
}

function coerce(raw: Partial<BullionRates> | null | undefined): BullionRates {
  return {
    currency_rate_per_1000:
      typeof raw?.currency_rate_per_1000 === "number"
        ? raw.currency_rate_per_1000
        : DEFAULT_RATES.currency_rate_per_1000,
    gold_rate_per_baht:
      typeof raw?.gold_rate_per_baht === "number"
        ? raw.gold_rate_per_baht
        : DEFAULT_RATES.gold_rate_per_baht,
    hand_carry_rate_inr_per_kg:
      typeof raw?.hand_carry_rate_inr_per_kg === "number"
        ? raw.hand_carry_rate_inr_per_kg
        : DEFAULT_RATES.hand_carry_rate_inr_per_kg,
  };
}

async function migrateLocalRatesIfNeeded(remote: BullionRates): Promise<BullionRates> {
  const done = await storage.getItem<string>(RATES_MIGRATION_KEY, "");
  if (done) return remote;
  const raw = await storage.getItem<string>(RATES_KEY, "");
  await storage.setItem(RATES_MIGRATION_KEY, new Date().toISOString());
  if (!raw) return remote;
  try {
    const local = coerce(JSON.parse(raw));
    // Only push local if the remote is the untouched default AND local differs.
    const isRemoteDefault =
      remote.currency_rate_per_1000 === DEFAULT_RATES.currency_rate_per_1000 &&
      remote.gold_rate_per_baht === DEFAULT_RATES.gold_rate_per_baht &&
      remote.hand_carry_rate_inr_per_kg === DEFAULT_RATES.hand_carry_rate_inr_per_kg;
    const differs =
      local.currency_rate_per_1000 !== remote.currency_rate_per_1000 ||
      local.gold_rate_per_baht !== remote.gold_rate_per_baht ||
      local.hand_carry_rate_inr_per_kg !== remote.hand_carry_rate_inr_per_kg;
    if (isRemoteDefault && differs) {
      try {
        const updated = await apiPut<BullionRates>(RATES_PATH, local);
        if (updated && typeof updated === "object" && !("queued" in updated)) {
          return coerce(updated as BullionRates);
        }
        return local;
      } catch {
        return remote;
      }
    }
    return remote;
  } catch {
    return remote;
  }
}

export async function getRates(): Promise<BullionRates> {
  if (cache) return cache;
  try {
    const remote = await apiGet<BullionRates>(RATES_PATH);
    const coerced = coerce(remote);
    const finalRates = await migrateLocalRatesIfNeeded(coerced);
    cache = finalRates;
    return finalRates;
  } catch {
    cache = { ...DEFAULT_RATES };
    return cache;
  }
}

export async function setRates(next: BullionRates): Promise<void> {
  const clean: BullionRates = {
    currency_rate_per_1000: Math.max(0, Number(next.currency_rate_per_1000) || 0),
    gold_rate_per_baht: Math.max(0, Number(next.gold_rate_per_baht) || 0),
    hand_carry_rate_inr_per_kg: Math.max(0, Number(next.hand_carry_rate_inr_per_kg) || 0),
  };
  try {
    const res = await apiPut<BullionRates>(RATES_PATH, clean);
    if (res && typeof res === "object" && !("queued" in res)) {
      cache = coerce(res as BullionRates);
    } else {
      cache = clean;
    }
  } catch {
    cache = clean;
  }
  notify(cache);
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
