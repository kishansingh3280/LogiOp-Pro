"use client";

import { demoHandle, resetDemo } from "@/lib/demo-data";

const DEMO_KEY = "logiop_web_demo_mode";

/** Demo mode ON by default so the app works even if the API/DB is unreachable. */
export function getDemoMode(): boolean {
  if (typeof window === "undefined") return true;
  const saved = window.localStorage.getItem(DEMO_KEY);
  if (saved == null) return true;
  return saved === "1";
}

export function setDemoMode(on: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEMO_KEY, on ? "1" : "0");
}

export function resetDemoData(): void {
  resetDemo();
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const j = await res.json();
    return j.error || res.statusText;
  } catch {
    return res.statusText || "Request failed";
  }
}

/**
 * Client API: uses offline demo data when demo mode is on,
 * otherwise talks to /api/*. Falls back to demo if the server fails.
 */
export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  let body: unknown = undefined;
  if (options.body && typeof options.body === "string") {
    try {
      body = JSON.parse(options.body);
    } catch {
      body = undefined;
    }
  }

  const preferDemo = typeof window !== "undefined" && getDemoMode();

  if (preferDemo) {
    try {
      return (await demoHandle(method, path, body)) as T;
    } catch (e) {
      const err = e as Error & { status?: number };
      throw new ApiError(err.status || 500, err.message || "Demo error");
    }
  }

  try {
    const res = await fetch(path, {
      ...options,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...(options.headers || {}),
      },
    });
    if (!res.ok) throw new ApiError(res.status, await parseError(res));
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (e) {
    // Auto-fallback to demo so the UI never stays stuck on "Loading…"
    console.warn("API failed, falling back to demo mode:", e);
    if (typeof window !== "undefined") setDemoMode(true);
    try {
      return (await demoHandle(method, path, body)) as T;
    } catch (demoErr) {
      throw e instanceof ApiError
        ? e
        : new ApiError(0, e instanceof Error ? e.message : "Network error");
    }
  }
}

export const apiGet = <T = unknown>(path: string) => api<T>(path);

export const apiPost = <T = unknown>(path: string, body?: unknown) =>
  api<T>(path, {
    method: "POST",
    body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
  });

export const apiPatch = <T = unknown>(path: string, body: unknown) =>
  api<T>(path, { method: "PATCH", body: JSON.stringify(body) });

export const apiDelete = <T = unknown>(path: string) =>
  api<T>(path, { method: "DELETE" });

export async function uploadAttachment(entryId: string, file: File) {
  if (getDemoMode()) {
    return demoHandle("POST", `/api/ledger/${entryId}/attachments`, {
      fileName: file.name,
    });
  }
  const fd = new FormData();
  fd.append("file", file);
  try {
    const res = await fetch(`/api/ledger/${entryId}/attachments`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) throw new ApiError(res.status, await parseError(res));
    return res.json();
  } catch {
    setDemoMode(true);
    return demoHandle("POST", `/api/ledger/${entryId}/attachments`, {
      fileName: file.name,
    });
  }
}
