/**
 * Ghost-fill store — a tiny in-memory pub/sub with sessionStorage /
 * AsyncStorage persistence, used by the Ghost-User engine to hand off a
 * pending "fill this form" payload to whichever screen matches the target
 * route.
 *
 * Flow:
 *   1. Ghost engine calls setGhostPayload({ route: "/party/new", ... }).
 *   2. Payload is written to memory AND to sessionStorage (web) so it
 *      survives a hard page reload (used as a safety net when the SPA
 *      router fails to navigate).
 *   3. Ghost engine navigates via `router.push(route)`.
 *   4. The target screen mounts, calls `useGhostFill()`, reads the
 *      payload via `getGhostPayload()`, and animates each field.
 *   5. On success (Save) or Cancel, the payload is cleared.
 *
 * Why not a URL query param? The payload can be large and JSON-encoding
 * inside a URL breaks with Devanagari / Thai text. In-memory + storage
 * is faster and lossless.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export type GhostPayload = {
  /** Target route this payload is intended for, e.g. "/party/new". */
  route: string;
  /** Field values keyed by whatever schema the target screen exposes. */
  values: Record<string, unknown>;
  /** Human-readable summary line for the banner ("Create Party: Ramesh"). */
  headline: string;
  /** What the app should POST/PATCH when the user confirms. */
  submit: {
    method: "POST" | "PUT" | "PATCH" | "DELETE";
    path: string;
    body?: Record<string, unknown>;
  };
  /** Time (ms) between field types. Higher = more visible. */
  fieldDelay?: number;
  /** Auto-save after typing completes without waiting for user tap. */
  autoSubmit?: boolean;
  /** Monotonic id used to guard against double-runs on hot reload. */
  nonce?: string;
};

type Listener = (p: GhostPayload | null) => void;

const STORAGE_KEY = "ghost.pending.payload";
let current: GhostPayload | null = null;
const listeners = new Set<Listener>();

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

function writeStorage(p: GhostPayload | null): void {
  try {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const ss = window.sessionStorage;
      if (!ss) return;
      if (p) ss.setItem(STORAGE_KEY, JSON.stringify(p));
      else ss.removeItem(STORAGE_KEY);
      return;
    }
    // Native: fire-and-forget AsyncStorage (best-effort).
    if (p) {
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } else {
      void AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* storage may be unavailable in strict privacy modes — ignore */
  }
}

function readStorageSync(): GhostPayload | null {
  try {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const raw = window.sessionStorage?.getItem(STORAGE_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (p && typeof p === "object" && "route" in p) return p as GhostPayload;
    }
  } catch {
    /* ignore */
  }
  return null;
}

// Rehydrate on module load (web only — native is async and not needed at
// startup since native navigation never triggers a hard reload).
current = readStorageSync();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function setGhostPayload(p: GhostPayload | null): void {
  // Stamp a nonce so the consumer hook can dedupe hot-reload replays.
  const stamped = p ? { ...p, nonce: p.nonce || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` } : null;
  current = stamped;
  writeStorage(stamped);
  listeners.forEach((l) => l(stamped));
}

export function getGhostPayload(): GhostPayload | null {
  return current;
}

export function subscribeGhost(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Load any pending payload from AsyncStorage on native. Called once at
 * app startup so a rare "app killed then reopened" scenario still gets a
 * chance to consume the payload. Web already reads sessionStorage
 * synchronously on module init above. */
export async function hydrateGhostFromStorage(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const p = JSON.parse(raw);
    if (p && typeof p === "object" && "route" in p) {
      current = p as GhostPayload;
      listeners.forEach((l) => l(current));
    }
  } catch {
    /* ignore */
  }
}
