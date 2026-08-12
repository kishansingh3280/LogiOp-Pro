/**
 * Phase-1 minimal API client.
 *
 * A tiny fetch wrapper that:
 *   • Reads BASE from EXPO_PUBLIC_BACKEND_URL (fails-fast if unset)
 *   • Attaches the current bearer token from auth-context (if any)
 *   • Timeouts at 20s
 *   • Returns typed JSON
 *
 * NOTE: We deliberately DO NOT depend on @react-native-community/netinfo
 * or any offline queue in Phase 1 — those native modules were flagged as
 * potential Android APK crash suspects. We'll wire them back in a later
 * phase once the base app is confirmed stable.
 */
import { getAuthTokenSync, getAuthUserSync } from "./auth-context";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
if (!BASE) {
  throw new Error(
    "EXPO_PUBLIC_BACKEND_URL is not defined. Set it in frontend/.env before starting Expo.",
  );
}

export const API_BASE = BASE;

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

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const url = `${BASE}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

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
      throw new ApiError(0, `Request timed out after 20s: ${method} ${path}`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
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
export const apiPost = <T>(path: string, body?: unknown) => request<T>("POST", path, body);
export const apiPut = <T>(path: string, body?: unknown) => request<T>("PUT", path, body);
export const apiDelete = <T>(path: string, body?: unknown) => request<T>("DELETE", path, body);
