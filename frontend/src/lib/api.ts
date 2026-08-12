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

export const apiGet = <T>(path: string) => request<T>("GET", path);
export const apiPost = <T>(path: string, body?: unknown) =>
  request<T>("POST", path, body);
export const apiPut = <T>(path: string, body?: unknown) =>
  request<T>("PUT", path, body);
export const apiPatch = <T>(path: string, body?: unknown) =>
  request<T>("PATCH", path, body);
export const apiDelete = <T>(path: string, body?: unknown) =>
  request<T>("DELETE", path, body);
