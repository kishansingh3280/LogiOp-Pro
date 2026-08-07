// Minimal fetch client backed by AsyncStorage cache + offline mutation queue.
import NetInfo from "@react-native-community/netinfo";

import { storage } from "@/src/utils/storage";

// Backend base URL. We hard-pin to the live backend that the web app uses,
// so the app keeps working even if EXPO_PUBLIC_BACKEND_URL gets reset by
// the platform to the local preview host (which does NOT have our data).
const LIVE_BACKEND = "https://logistics-hub-1349.emergent.host";
const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
const BASE =
  envUrl && !envUrl.includes("preview.emergentagent.com") ? envUrl : LIVE_BACKEND;
const CACHE_PREFIX = "cache:";
const QUEUE_KEY = "pendingMutations";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type QueuedMutation = {
  id: string;
  method: Method;
  path: string;
  body: unknown;
  createdAt: number;
};

let flushing = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function subscribeQueue(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export async function getQueue(): Promise<QueuedMutation[]> {
  const q = await storage.getItem<string>(QUEUE_KEY, "");
  if (!q) return [];
  try {
    return JSON.parse(q) as QueuedMutation[];
  } catch {
    return [];
  }
}

async function setQueue(q: QueuedMutation[]) {
  await storage.setItem(QUEUE_KEY, JSON.stringify(q));
  notify();
}

async function readCache<T>(url: string): Promise<T | null> {
  const raw = await storage.getItem<string>(CACHE_PREFIX + url, "");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeCache(url: string, data: unknown) {
  await storage.setItem(CACHE_PREFIX + url, JSON.stringify(data));
}

async function isOnline(): Promise<boolean> {
  const s = await NetInfo.fetch();
  return !!s.isConnected;
}

async function rawRequest<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const url = BASE + path;
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const online = await isOnline();
  if (online) {
    try {
      const data = await rawRequest<T>("GET", path);
      await writeCache(path, data);
      return data;
    } catch (e) {
      const cached = await readCache<T>(path);
      if (cached !== null) return cached;
      throw e;
    }
  }
  const cached = await readCache<T>(path);
  if (cached !== null) return cached;
  throw new Error("Offline and no cached data");
}

export async function apiMutate<T>(method: Method, path: string, body?: unknown): Promise<T | { queued: true }> {
  const online = await isOnline();
  if (online) {
    try {
      return await rawRequest<T>(method, path, body);
    } catch (e) {
      // Non-network error — bubble up (validation etc.)
      throw e;
    }
  }
  // Queue it
  const q = await getQueue();
  q.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    method,
    path,
    body,
    createdAt: Date.now(),
  });
  await setQueue(q);
  return { queued: true };
}

export const apiPost = <T>(path: string, body?: unknown) => apiMutate<T>("POST", path, body);
export const apiPut = <T>(path: string, body?: unknown) => apiMutate<T>("PUT", path, body);
export const apiPatch = <T>(path: string, body?: unknown) => apiMutate<T>("PATCH", path, body);
export const apiDelete = <T>(path: string, body?: unknown) => apiMutate<T>("DELETE", path, body);

export async function flushQueue(): Promise<{ ok: number; failed: number }> {
  if (flushing) return { ok: 0, failed: 0 };
  flushing = true;
  let ok = 0;
  let failed = 0;
  try {
    const online = await isOnline();
    if (!online) return { ok, failed };
    const q = await getQueue();
    const remaining: QueuedMutation[] = [];
    for (const m of q) {
      try {
        await rawRequest(m.method, m.path, m.body);
        ok++;
      } catch {
        remaining.push(m);
        failed++;
      }
    }
    await setQueue(remaining);
  } finally {
    flushing = false;
  }
  return { ok, failed };
}

// Auto-flush on connectivity restore.
NetInfo.addEventListener((s) => {
  if (s.isConnected) {
    flushQueue().catch(() => {});
  }
});

export const API_BASE = BASE;
