/**
 * Auth context — single source of truth for the logged-in user + JWT token.
 *
 * The token is persisted in SecureStore (Keychain / EncryptedSharedPreferences).
 * The `api/client.ts` module reads the current token from this same store on
 * every request, so a login/logout takes effect for the next network call
 * without any extra wiring.
 *
 * Roles: Admin | Staff | Carrier.
 * - Admin: full access, can register/edit users, delete anything.
 * - Staff: create / edit records but cannot delete or manage users.
 * - Carrier: read-only + can update carrier-facing fields on their own trips.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { storage } from "@/src/utils/storage";

export type Role = "Admin" | "Staff" | "Carrier" | "Papa";

export type AuthUser = {
  id: string;
  username: string;
  display_name: string;
  role: Role;
  honorific: string;
  /** Multi-company scoping — set on Papa / Staff / Carrier user documents. */
  company?: string;
};

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
if (!BASE) throw new Error("EXPO_PUBLIC_BACKEND_URL is not set");

// Lightweight in-module cache so api/client.ts can read the current bearer
// token without an async round-trip on every request. Kept in sync with
// SecureStore by AuthProvider.
let inMemoryToken: string | null = null;
let inMemoryUser: AuthUser | null = null;
const tokenListeners = new Set<(token: string | null, user: AuthUser | null) => void>();

export function getAuthTokenSync(): string | null {
  return inMemoryToken;
}
export function getAuthUserSync(): AuthUser | null {
  return inMemoryUser;
}
export function subscribeAuth(cb: (token: string | null, user: AuthUser | null) => void) {
  tokenListeners.add(cb);
  return () => {
    tokenListeners.delete(cb);
  };
}
function broadcast(token: string | null, user: AuthUser | null) {
  inMemoryToken = token;
  inMemoryUser = user;
  tokenListeners.forEach((cb) => cb(token, user));
}

type AuthCtx = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

// ─── AUTO-LOGIN MODE ────────────────────────────────────────────────
// The login/auth screen has been removed per product decision.
// On app launch we call the backend's passwordless `/api/auth/auto-login`
// endpoint (gated by the `AUTO_LOGIN_ENABLED` server env flag) to get a
// real admin JWT. NO password is embedded in the client bundle — this
// is the security-cleared version of the "no login" flow.
//
// If the auto-login endpoint fails (network offline, backend unreachable,
// or the env flag is turned off), we fall back to a hardcoded admin
// stub so the UI still opens and read-only proxied endpoints keep
// working. Any authenticated write in that fallback mode will fail
// with a 401 which the user will see as a toast.
const AUTO_LOGIN_STUB_USER: AuthUser = {
  id: "auto-admin",
  username: "kishan.singh3280@gmail.com",
  display_name: "Kishan",
  role: "Admin",
  honorific: "Sir",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Seed state with the stub admin so consumers of `useAuth()` see a
  // logged-in user IMMEDIATELY on first render — no white flash, no
  // loading gate, no redirect churn.
  const [user, setUser] = useState<AuthUser | null>(AUTO_LOGIN_STUB_USER);
  const [token, setToken] = useState<string | null>(null);
  const loading = false; // never block the UI — auto-login means we're always ready

  // Silent bootstrap: fetch a real backend token in the background so
  // authenticated writes work with the correct user identity. UI is
  // ALREADY interactive by this point (stub user was seeded above).
  useEffect(() => {
    // Publish the stub immediately so `getAuthUserSync()` and any
    // module-level consumers see a signed-in admin on tick 0.
    broadcast(null, AUTO_LOGIN_STUB_USER);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${BASE}/api/auth/auto-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { access_token: string; user: AuthUser };
        setToken(data.access_token);
        setUser(data.user);
        broadcast(data.access_token, data.user);
      } catch {
        // Silent — the stub admin above keeps the UI functional even
        // when the backend is unreachable.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(res.status === 401 ? "Incorrect username or password" : text);
    }
    const data = (await res.json()) as { access_token: string; user: AuthUser };
    await storage.secureSet(TOKEN_KEY, data.access_token);
    await storage.secureSet(USER_KEY, JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    broadcast(data.access_token, data.user);
  }, []);

  const signOut = useCallback(async () => {
    await storage.secureRemove(TOKEN_KEY);
    await storage.secureRemove(USER_KEY);
    setToken(null);
    setUser(null);
    broadcast(null, null);
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const me = (await res.json()) as AuthUser;
        setUser(me);
        await storage.secureSet(USER_KEY, JSON.stringify(me));
        broadcast(token, me);
      }
    } catch {
      /* ignore */
    }
  }, [token]);

  const value = useMemo<AuthCtx>(
    () => ({ user, token, loading, signIn, signOut, refresh }),
    [user, token, loading, signIn, signOut, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Convenience: what honorific + name the AI should use to address the user. */
export function useAddressForm(): string {
  const { user } = useAuth();
  if (!user) return "Sir";
  return `${user.display_name} ${user.honorific}`.trim();
}

/** Role check helpers — UI convenience only. Backend enforces via require_roles(). */
export function useHasRole(...roles: Role[]): boolean {
  const { user } = useAuth();
  if (!user) return false;
  return roles.includes(user.role);
}
