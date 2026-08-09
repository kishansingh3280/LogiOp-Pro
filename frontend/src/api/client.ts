// Minimal fetch client backed by AsyncStorage cache + offline mutation queue.
import NetInfo from "@react-native-community/netinfo";

import { getAuthTokenSync, getAuthUserSync } from "@/src/auth/context";
import { storage } from "@/src/utils/storage";

// Backend base URL — sourced exclusively from EXPO_PUBLIC_BACKEND_URL.
// Fails fast at import time if the env var is missing, so we never silently
// call a wrong host in production.
const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
if (!BASE) {
  throw new Error(
    "EXPO_PUBLIC_BACKEND_URL is not defined. Set it in frontend/.env before starting Expo.",
  );
}
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

// -----------------------------------------------------------------
// Multi-company support — a module-level "active company" that gets
// auto-appended as `?company=<id>` to every request. Set from the
// CompanyContext provider whenever the operator flips brands.
//
// A tiny allowlist prevents us from tagging endpoints that are
// company-agnostic (auth, the companies list itself, the LLM
// assistant proxy, TTS/STT streams). Anything under those prefixes
// stays untouched so we don't break unrelated flows.
// -----------------------------------------------------------------
let _activeCompany: string | null = null;
const COMPANY_SKIP_PREFIXES = [
  "/api/auth/",
  "/api/companies",
  "/api/assistant/tts",
  "/api/assistant/stt",
];

export function setApiCompany(company: string | null): void {
  _activeCompany = company && company.length > 0 ? company : null;
}

export function getApiCompany(): string | null {
  return _activeCompany;
}

function shouldSkipCompanyParam(path: string): boolean {
  return COMPANY_SKIP_PREFIXES.some((p) => path === p || path.startsWith(p));
}

/**
 * Return `path` with `?company=<activeCompany>` appended if:
 *   1. an active company is set, AND
 *   2. the path is not in the skip list, AND
 *   3. the caller hasn't already put a `company=` param on it.
 */
function withCompanyParam(path: string): string {
  if (!_activeCompany) return path;
  if (shouldSkipCompanyParam(path)) return path;
  if (/[?&]company=/.test(path)) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}company=${encodeURIComponent(_activeCompany)}`;
}

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
  const effectivePath = withCompanyParam(path);
  const url = BASE + effectivePath;
  // Hard timeout so the UI never gets stuck on a hanging socket — the
  // fetch spec has no default timeout and a mobile network can silently
  // stall.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  // Auth + audit headers — read fresh on every request so token rotation /
  // sign-out is picked up without touching any callers.
  const token = getAuthTokenSync();
  const actor = getAuthUserSync();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Entry-Source": "manual",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (actor) {
    headers["X-Actor-Username"] = actor.username;
    headers["X-Actor-Role"] = actor.role;
    headers["X-Actor-Id"] = actor.id;
  }
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      throw new Error(`Request timed out after 20s: ${method} ${path}`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const text = await res.text();
    // Tag the error so callers can distinguish 404 (record gone) from
    // other failures — e.g. useApi can invalidate its cache when a 404
    // comes back so the "stale cached record" trap goes away.
    const err = new Error(`${res.status} ${res.statusText}: ${text}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

async function purgeCache(path: string): Promise<void> {
  try {
    await storage.removeItem(CACHE_PREFIX + path);
  } catch {
    /* ignore */
  }
}

/**
 * Invalidate the list-cache that owns a collection route so the next GET
 * always refreshes from the server. Called from apiMutate after every
 * successful POST/PUT/DELETE so the invoices tab (etc.) never shows a
 * ghost of a deleted row.
 */
async function invalidateCollection(path: string): Promise<void> {
  // Match: /api/invoices/{id} → /api/invoices; /api/bullion/transactions/{id}
  // → /api/bullion/transactions. Query strings and trailing slashes stripped.
  const base = path.split("?")[0].replace(/\/+$/, "");
  const parts = base.split("/");
  // Drop trailing id-like segment (last segment that isn't the collection root)
  if (parts.length > 3) {
    const withoutId = parts.slice(0, -1).join("/");
    await purgeCache(withoutId);
    await purgeCache(base); // also clear the item entry itself
  } else {
    await purgeCache(base);
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  // Bake the active company into the cache key so switching brands
  // doesn't return the other company's cached list.
  const cacheKey = withCompanyParam(path);
  const online = await isOnline();
  if (online) {
    try {
      const data = await rawRequest<T>("GET", path);
      await writeCache(cacheKey, data);
      return data;
    } catch (e) {
      // Don't hide 404s behind cached data — that's exactly the "Invoice
      // not found" symptom the operator hit after a data reset. Purge the
      // stale entry and rethrow so the UI can surface a clear message.
      if ((e as { status?: number }).status === 404) {
        await purgeCache(cacheKey);
        throw e;
      }
      const cached = await readCache<T>(cacheKey);
      if (cached !== null) return cached;
      throw e;
    }
  }
  const cached = await readCache<T>(cacheKey);
  if (cached !== null) return cached;
  throw new Error("Offline and no cached data");
}

export async function apiMutate<T>(method: Method, path: string, body?: unknown): Promise<T | { queued: true }> {
  const online = await isOnline();
  if (online) {
    try {
      const res = await rawRequest<T>(method, path, body);
      // Wipe the matching list cache so the very next GET reflects the
      // mutation (create/update/delete). Fire-and-forget — cache purge
      // doesn't need to block the caller.
      invalidateCollection(path).catch(() => undefined);
      return res;
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
