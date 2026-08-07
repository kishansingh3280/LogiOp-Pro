import { useCallback, useEffect, useState } from "react";

import { storage } from "@/src/utils/storage";

import type { BullionBatch, CarrierTrip } from "./types";

const TRIPS_KEY = "bullion:trips";
const BATCHES_KEY = "bullion:batches";

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() {
  listeners.forEach((l) => l());
}

// -------- Trips --------

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
  const trip: CarrierTrip = {
    ...input,
    id: newId(),
    created_at: new Date().toISOString(),
  };
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
  // Also detach from batches
  const batches = await getBatches();
  let changed = false;
  const updated = batches.map((b) => {
    if (b.trip_id_to_bkk === id) {
      changed = true;
      return { ...b, trip_id_to_bkk: null };
    }
    if (b.trip_id_to_in === id) {
      changed = true;
      return { ...b, trip_id_to_in: null };
    }
    return b;
  });
  if (changed) await setBatches(updated);
}

// -------- Batches --------

export async function getBatches(): Promise<BullionBatch[]> {
  const raw = await storage.getItem<string>(BATCHES_KEY, "");
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as BullionBatch[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function setBatches(b: BullionBatch[]) {
  await storage.setItem(BATCHES_KEY, JSON.stringify(b));
  notify();
}

export async function createBatch(input: Omit<BullionBatch, "id" | "created_at" | "batch_no">): Promise<BullionBatch> {
  const list = await getBatches();
  const nextNum = 1 + list.reduce((m, b) => Math.max(m, parseBatchNum(b.batch_no)), 0);
  const batch: BullionBatch = {
    ...input,
    id: newId(),
    batch_no: `BUL-${String(nextNum).padStart(3, "0")}`,
    created_at: new Date().toISOString(),
  };
  list.push(batch);
  await setBatches(list);
  return batch;
}

export async function updateBatch(id: string, patch: Partial<BullionBatch>): Promise<BullionBatch | null> {
  const list = await getBatches();
  const idx = list.findIndex((b) => b.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch, id: list[idx].id };
  await setBatches(list);
  return list[idx];
}

export async function deleteBatch(id: string): Promise<void> {
  const list = await getBatches();
  await setBatches(list.filter((b) => b.id !== id));
}

function parseBatchNum(bn: string): number {
  const m = bn.match(/BUL-(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// -------- React hooks --------

export function useTrips() {
  const [data, setData] = useState<CarrierTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    const t = await getTrips();
    setData(t);
    setLoading(false);
  }, []);
  useEffect(() => {
    refresh();
    const cb = () => refresh();
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, [refresh]);
  return { data, loading, refresh };
}

export function useBatches() {
  const [data, setData] = useState<BullionBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    const b = await getBatches();
    setData(b);
    setLoading(false);
  }, []);
  useEffect(() => {
    refresh();
    const cb = () => refresh();
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, [refresh]);
  return { data, loading, refresh };
}

// Compute used slots per trip (assigned batches)
export function usedSlotsFor(tripId: string, batches: BullionBatch[]): number {
  return batches.filter((b) => b.trip_id_to_bkk === tripId || b.trip_id_to_in === tripId).length;
}
