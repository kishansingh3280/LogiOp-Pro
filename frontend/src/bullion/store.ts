import { useCallback, useEffect, useState } from "react";

import { storage } from "@/src/utils/storage";

import type { BullionTxn, CarrierTrip } from "./types";

const TRIPS_KEY = "bullion:trips";
const TXNS_KEY = "bullion:txns";

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() {
  listeners.forEach((l) => l());
}

// ---------- Trips ----------

export async function getTrips(): Promise<CarrierTrip[]> {
  const raw = await storage.getItem<string>(TRIPS_KEY, "");
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as CarrierTrip[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function setTrips(t: CarrierTrip[]) {
  await storage.setItem(TRIPS_KEY, JSON.stringify(t));
  notify();
}

export async function createTrip(input: Omit<CarrierTrip, "id" | "created_at">): Promise<CarrierTrip> {
  const trip: CarrierTrip = { ...input, id: newId(), created_at: new Date().toISOString() };
  const list = await getTrips();
  list.push(trip);
  await setTrips(list);
  return trip;
}

export async function updateTrip(id: string, patch: Partial<CarrierTrip>): Promise<void> {
  const list = await getTrips();
  const idx = list.findIndex((t) => t.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], ...patch, id: list[idx].id };
  await setTrips(list);
}

export async function deleteTrip(id: string): Promise<void> {
  const list = await getTrips();
  await setTrips(list.filter((t) => t.id !== id));
  const txns = await getTxns();
  let changed = false;
  const updated = txns.map((t) => {
    if (t.trip_id === id) {
      changed = true;
      return { ...t, trip_id: null };
    }
    return t;
  });
  if (changed) await setTxns(updated);
}

// ---------- Transactions ----------

export async function getTxns(): Promise<BullionTxn[]> {
  const raw = await storage.getItem<string>(TXNS_KEY, "");
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as BullionTxn[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function setTxns(t: BullionTxn[]) {
  await storage.setItem(TXNS_KEY, JSON.stringify(t));
  notify();
}

export async function createTxn(
  input: Omit<BullionTxn, "id" | "txn_no" | "created_at" | "status">,
): Promise<BullionTxn> {
  const list = await getTxns();
  const nextNum = 1 + list.reduce((m, t) => Math.max(m, parseTxnNum(t.txn_no)), 0);
  const txn: BullionTxn = {
    ...input,
    id: newId(),
    txn_no: `TXN-${String(nextNum).padStart(3, "0")}`,
    status: "open",
    created_at: new Date().toISOString(),
  };
  list.push(txn);
  await setTxns(list);
  return txn;
}

export async function updateTxn(id: string, patch: Partial<BullionTxn>): Promise<BullionTxn | null> {
  const list = await getTxns();
  const idx = list.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch, id: list[idx].id };
  await setTxns(list);
  return list[idx];
}

export async function deleteTxn(id: string): Promise<void> {
  const list = await getTxns();
  await setTxns(list.filter((t) => t.id !== id));
}

function parseTxnNum(bn: string): number {
  const m = bn.match(/TXN-(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------- React hooks ----------

export function useTrips() {
  const [data, setData] = useState<CarrierTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    setData(await getTrips());
    setLoading(false);
  }, []);
  useEffect(() => {
    refresh();
    const cb = () => refresh();
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, [refresh]);
  return { data, loading, refresh };
}

export function useTxns() {
  const [data, setData] = useState<BullionTxn[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    setData(await getTxns());
    setLoading(false);
  }, []);
  useEffect(() => {
    refresh();
    const cb = () => refresh();
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
