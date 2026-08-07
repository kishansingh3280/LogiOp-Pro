// Bullion store — REST-backed with an in-memory cache and one-time migration
// from the legacy AsyncStorage payload. The Wingman gateway and the app now
// share the same MongoDB collections, so any AI-created trade appears here
// as soon as `refresh()` runs.

import { useCallback, useEffect, useState } from "react";

import { apiDelete, apiGet, apiPost, apiPut } from "@/src/api/client";
import { storage } from "@/src/utils/storage";

import type { BullionTxn, CarrierTrip } from "./types";

const TRIPS_KEY = "bullion:trips";
const TXNS_KEY = "bullion:txns";
const MIGRATION_KEY = "bullion:migration:v1";

const TRIPS_PATH = "/api/bullion/trips";
const TXNS_PATH = "/api/bullion/transactions";

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() {
  listeners.forEach((l) => l());
}

// ---------- In-memory cache ----------
let tripsCache: CarrierTrip[] | null = null;
let txnsCache: BullionTxn[] | null = null;

function isQueuedResponse(x: unknown): x is { queued: true } {
  return !!x && typeof x === "object" && (x as { queued?: boolean }).queued === true;
}

// ---------- Legacy AsyncStorage helpers (used only for one-time migration) ----------
async function readLegacyTrips(): Promise<CarrierTrip[]> {
  const raw = await storage.getItem<string>(TRIPS_KEY, "");
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as CarrierTrip[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function readLegacyTxns(): Promise<BullionTxn[]> {
  const raw = await storage.getItem<string>(TXNS_KEY, "");
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as BullionTxn[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/**
 * One-time push of any locally-stored trips/trades into the backend so we
 * don't lose historic data during the migration. Guarded by MIGRATION_KEY so
 * it only runs once per install.
 */
async function migrateLegacyIfNeeded(remoteTrips: CarrierTrip[], remoteTxns: BullionTxn[]) {
  const done = await storage.getItem<string>(MIGRATION_KEY, "");
  if (done) return { migratedTrips: 0, migratedTxns: 0 };

  const localTrips = await readLegacyTrips();
  const localTxns = await readLegacyTxns();

  // If backend already has data OR there's nothing local, just mark done.
  if ((localTrips.length === 0 && localTxns.length === 0) || remoteTrips.length > 0 || remoteTxns.length > 0) {
    await storage.setItem(MIGRATION_KEY, new Date().toISOString());
    return { migratedTrips: 0, migratedTxns: 0 };
  }

  let migratedTrips = 0;
  let migratedTxns = 0;
  for (const t of localTrips) {
    try {
      const res = await apiPost<CarrierTrip>(TRIPS_PATH, t);
      if (!isQueuedResponse(res)) migratedTrips++;
    } catch {
      /* skip */
    }
  }
  for (const t of localTxns) {
    try {
      const res = await apiPost<BullionTxn>(TXNS_PATH, t);
      if (!isQueuedResponse(res)) migratedTxns++;
    } catch {
      /* skip */
    }
  }
  await storage.setItem(MIGRATION_KEY, new Date().toISOString());
  return { migratedTrips, migratedTxns };
}

// ---------- Trips ----------

export async function getTrips(): Promise<CarrierTrip[]> {
  try {
    const remote = await apiGet<CarrierTrip[]>(TRIPS_PATH);
    // Attempt one-time migration when both sides are empty and legacy has data.
    const txnsRemote = txnsCache ?? (await safeGetTxnsOnce());
    if (remote.length === 0) {
      const m = await migrateLegacyIfNeeded(remote, txnsRemote);
      if (m.migratedTrips > 0) {
        const fresh = await apiGet<CarrierTrip[]>(TRIPS_PATH);
        tripsCache = fresh;
        return fresh;
      }
    }
    tripsCache = remote;
    return remote;
  } catch {
    return tripsCache ?? [];
  }
}

// Small helper to avoid recursion during migration.
async function safeGetTxnsOnce(): Promise<BullionTxn[]> {
  try {
    return await apiGet<BullionTxn[]>(TXNS_PATH);
  } catch {
    return [];
  }
}

export async function createTrip(
  input: Omit<CarrierTrip, "id" | "created_at">,
): Promise<CarrierTrip> {
  const body = { ...input };
  const res = await apiPost<CarrierTrip>(TRIPS_PATH, body);
  if (isQueuedResponse(res)) {
    // Optimistically add a placeholder to the local cache.
    const optimistic: CarrierTrip = {
      ...(body as CarrierTrip),
      id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      created_at: new Date().toISOString(),
    };
    tripsCache = [optimistic, ...(tripsCache ?? [])];
    notify();
    return optimistic;
  }
  tripsCache = [res, ...(tripsCache ?? [])];
  notify();
  return res;
}

export async function updateTrip(id: string, patch: Partial<CarrierTrip>): Promise<void> {
  const res = await apiPut<CarrierTrip>(`${TRIPS_PATH}/${id}`, patch);
  if (!isQueuedResponse(res) && tripsCache) {
    tripsCache = tripsCache.map((t) => (t.id === id ? { ...t, ...res } : t));
  } else if (tripsCache) {
    tripsCache = tripsCache.map((t) => (t.id === id ? { ...t, ...patch } : t));
  }
  notify();
}

export async function deleteTrip(id: string): Promise<void> {
  await apiDelete(`${TRIPS_PATH}/${id}`).catch(() => undefined);
  if (tripsCache) tripsCache = tripsCache.filter((t) => t.id !== id);
  // Also detach any orphan txns locally & remotely.
  if (txnsCache) {
    const orphans = txnsCache.filter((t) => t.trip_id === id);
    txnsCache = txnsCache.map((t) => (t.trip_id === id ? { ...t, trip_id: null } : t));
    for (const o of orphans) {
      await apiPut(`${TXNS_PATH}/${o.id}`, { trip_id: null }).catch(() => undefined);
    }
  }
  notify();
}

// ---------- Transactions ----------

export async function getTxns(): Promise<BullionTxn[]> {
  try {
    const remote = await apiGet<BullionTxn[]>(TXNS_PATH);
    txnsCache = remote;
    return remote;
  } catch {
    return txnsCache ?? [];
  }
}

export async function createTxn(
  input: Omit<BullionTxn, "id" | "txn_no" | "created_at" | "status">,
): Promise<BullionTxn> {
  // Server assigns id, txn_no, status and created_at.
  const body = { ...input, status: "open" as const };
  const res = await apiPost<BullionTxn>(TXNS_PATH, body);
  if (isQueuedResponse(res)) {
    const localSeq = 1 + (txnsCache ?? []).reduce((m, t) => {
      const n = parseInt((t.txn_no || "TXN-0").replace("TXN-", ""), 10);
      return Number.isFinite(n) ? Math.max(m, n) : m;
    }, 0);
    const optimistic: BullionTxn = {
      ...(body as BullionTxn),
      id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      txn_no: `TXN-${String(localSeq).padStart(3, "0")}`,
      status: "open",
      created_at: new Date().toISOString(),
    };
    txnsCache = [optimistic, ...(txnsCache ?? [])];
    notify();
    return optimistic;
  }
  txnsCache = [res, ...(txnsCache ?? [])];
  notify();
  return res;
}

export async function updateTxn(id: string, patch: Partial<BullionTxn>): Promise<BullionTxn | null> {
  const res = await apiPut<BullionTxn>(`${TXNS_PATH}/${id}`, patch);
  if (isQueuedResponse(res)) {
    if (txnsCache) {
      txnsCache = txnsCache.map((t) => (t.id === id ? { ...t, ...patch } : t));
      notify();
      return txnsCache.find((t) => t.id === id) || null;
    }
    return null;
  }
  if (txnsCache) {
    txnsCache = txnsCache.map((t) => (t.id === id ? { ...t, ...res } : t));
  }
  notify();
  return res;
}

export async function deleteTxn(id: string): Promise<void> {
  await apiDelete(`${TXNS_PATH}/${id}`).catch(() => undefined);
  if (txnsCache) txnsCache = txnsCache.filter((t) => t.id !== id);
  notify();
}

// ---------- React hooks ----------

export function useTrips() {
  const [data, setData] = useState<CarrierTrip[]>(tripsCache ?? []);
  const [loading, setLoading] = useState<boolean>(tripsCache === null);
  const refresh = useCallback(async () => {
    setLoading(true);
    const list = await getTrips();
    setData(list);
    setLoading(false);
  }, []);
  useEffect(() => {
    refresh();
    const cb = () => setData(tripsCache ?? []);
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, [refresh]);
  return { data, loading, refresh };
}

export function useTxns() {
  const [data, setData] = useState<BullionTxn[]>(txnsCache ?? []);
  const [loading, setLoading] = useState<boolean>(txnsCache === null);
  const refresh = useCallback(async () => {
    setLoading(true);
    const list = await getTxns();
    setData(list);
    setLoading(false);
  }, []);
  useEffect(() => {
    refresh();
    const cb = () => setData(txnsCache ?? []);
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, [refresh]);
  return { data, loading, refresh };
}

export function usedWeightKgFor(tripId: string, txns: BullionTxn[]): number {
  return txns
    .filter((t) => t.trip_id === tripId)
    .reduce((sum, t) => sum + (typeof t.weight_kg === "number" ? t.weight_kg : 0), 0);
}

/** @deprecated Use usedWeightKgFor. Kept temporarily for legacy call-sites. */
export function usedSlotsFor(tripId: string, txns: BullionTxn[]): number {
  return usedWeightKgFor(tripId, txns);
}
