/**
 * API client — Phase 10 · Fix 1.
 *
 *   • Reads BASE from EXPO_PUBLIC_BACKEND_URL (fails-fast if unset).
 *   • Attaches the current bearer token from auth-context (if any).
 *   • Timeout: 30 000 ms  (was 20 000 ms — bumped per Fix 1).
 *   • Returns typed JSON.
 *   • On HTTP 401 → automatically refresh the token via
 *     `refreshAuthTokenFromApi()` and retry the request ONCE.
 *
 * NOTE: no @react-native-community/netinfo, no offline queue — those
 * were flagged as APK-crash suspects; keeping surface minimal.
 */
import {
  getAuthTokenSync,
  getAuthUserSync,
  refreshAuthTokenFromApi,
} from "./auth-context";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
if (!BASE) {
  throw new Error(
    "EXPO_PUBLIC_BACKEND_URL is not defined. Set it in frontend/.env before starting Expo.",
  );
}

export const API_BASE = BASE;
const REQUEST_TIMEOUT_MS = 30_000;

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export class ApiError extends Error {
  status: number;
  body?: string;
  constructor(status: number, message: string, body?: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function buildHeaders(): Record<string, string> {
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
  return headers;
}

async function sendOnce(
  method: Method,
  path: string,
  body?: unknown,
): Promise<Response> {
  const url = `${BASE}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method,
      headers: buildHeaders(),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function request<T>(
  method: Method,
  path: string,
  body?: unknown,
): Promise<T> {
  let res: Response;
  try {
    res = await sendOnce(method, path, body);
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      throw new ApiError(
        0,
        `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s: ${method} ${path}`,
      );
    }
    throw e;
  }

  // Fix 1 — on 401, attempt ONE token refresh + retry.
  if (res.status === 401) {
    const refreshed = await refreshAuthTokenFromApi();
    if (refreshed) {
      try {
        res = await sendOnce(method, path, body);
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          throw new ApiError(
            0,
            `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s: ${method} ${path}`,
          );
        }
        throw e;
      }
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, `${res.status} ${res.statusText}`, text);
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

export const apiGet = <T>(path: string, opts?: { skipCache?: boolean }) =>
  cachedGet<T>(path, opts);
export const apiPost = <T>(path: string, body?: unknown) => {
  // Invalidate GET cache on any mutation. Best-effort scoping —
  // clears the same-path GET and any GETs that begin with the
  // resource prefix (e.g. POST /api/shipments clears cached
  // /api/shipments and /api/shipments?...&company_id=... entries).
  invalidateGetCache(path);
  return request<T>("POST", path, body);
};
export const apiPut = <T>(path: string, body?: unknown) => {
  invalidateGetCache(path);
  return request<T>("PUT", path, body);
};
export const apiPatch = <T>(path: string, body?: unknown) => {
  invalidateGetCache(path);
  return request<T>("PATCH", path, body);
};
export const apiDelete = <T>(path: string, body?: unknown) => {
  invalidateGetCache(path);
  return request<T>("DELETE", path, body);
};

// ── Fix 3 (Phase 7) · Simple GET cache with SWR semantics ──────────
// Rationale: list screens (shipments, invoices, ledger, parties) hit
// the same endpoint on every mount which showed a visible loading
// spinner even when the data hadn't changed. We now:
//   1. Cache the last-good body per URL with a 60s TTL.
//   2. On cache hit within TTL → return cached value INSTANTLY and
//      kick off a silent background refresh so the next visit sees
//      the freshest data.
//   3. On cache miss or expiry → fall through to a normal fetch and
//      populate the cache once the response resolves.
//   4. All mutating verbs (POST/PUT/PATCH/DELETE) automatically
//      invalidate cached GETs that share the same resource prefix
//      to avoid stale writes.
type CacheEntry<T> = { at: number; value: T };
const GET_CACHE_TTL_MS = 60_000;
const _getCache = new Map<string, CacheEntry<unknown>>();

function invalidateGetCache(mutationPath: string) {
  const prefix = mutationPath.split("?")[0].split("/").slice(0, 4).join("/");
  for (const key of _getCache.keys()) {
    const keyPrefix = key.split("?")[0].split("/").slice(0, 4).join("/");
    if (keyPrefix === prefix || key.startsWith(mutationPath)) {
      _getCache.delete(key);
    }
  }
}

async function cachedGet<T>(
  path: string,
  opts?: { skipCache?: boolean },
): Promise<T> {
  if (opts?.skipCache) {
    const value = await request<T>("GET", path);
    _getCache.set(path, { at: Date.now(), value });
    return value;
  }
  const hit = _getCache.get(path) as CacheEntry<T> | undefined;
  const now = Date.now();
  if (hit && now - hit.at < GET_CACHE_TTL_MS) {
    // Fire-and-forget background revalidation so the next call has
    // fresh data. Failures are silently ignored — the cached value
    // is still returned to the caller.
    request<T>("GET", path)
      .then((v) => _getCache.set(path, { at: Date.now(), value: v }))
      .catch(() => {
        /* silent */
      });
    return hit.value;
  }
  const value = await request<T>("GET", path);
  _getCache.set(path, { at: now, value });
  return value;
}

export function clearApiGetCache() {
  _getCache.clear();
}
