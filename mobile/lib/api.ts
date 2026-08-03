import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const STORAGE_KEY = "logiop_api_base";

/** Default API host. Android emulator uses 10.0.2.2 for host machine localhost. */
export function defaultApiBase(): string {
  if (Platform.OS === "android") return "http://10.0.2.2:3000";
  return "http://localhost:3000";
}

export async function getApiBase(): Promise<string> {
  const saved = await AsyncStorage.getItem(STORAGE_KEY);
  return (saved || defaultApiBase()).replace(/\/$/, "");
}

export async function setApiBase(url: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, url.replace(/\/$/, ""));
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const base = await getApiBase();
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = j.error || JSON.stringify(j);
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const apiGet = <T = unknown>(path: string) => api<T>(path);

export const apiPost = <T = unknown>(path: string, body: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(body) });

export const apiPatch = <T = unknown>(path: string, body: unknown) =>
  api<T>(path, { method: "PATCH", body: JSON.stringify(body) });

export const apiDelete = <T = unknown>(path: string) =>
  api<T>(path, { method: "DELETE" });

export async function uploadAttachment(entryId: string, uri: string, name: string, mimeType?: string) {
  const base = await getApiBase();
  const form = new FormData();
  form.append("file", {
    uri,
    name,
    type: mimeType || "application/octet-stream",
  } as unknown as Blob);
  const res = await fetch(`${base}/api/ledger/${entryId}/attachments`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new ApiError(res.status, "Upload failed");
  return res.json();
}
