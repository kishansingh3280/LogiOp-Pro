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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate on mount.
  useEffect(() => {
    (async () => {
      const saved = await storage.secureGet<string>(TOKEN_KEY, "");
      const savedUser = await storage.secureGet<string>(USER_KEY, "");
      if (saved) {
        // Verify with /auth/me — cheap round-trip that catches expired tokens.
        try {
          const res = await fetch(`${BASE}/api/auth/me`, {
            headers: { Authorization: `Bearer ${saved}` },
          });
          if (res.ok) {
            const me = (await res.json()) as AuthUser;
            setToken(saved);
            setUser(me);
            broadcast(saved, me);
          } else {
            await storage.secureRemove(TOKEN_KEY);
            await storage.secureRemove(USER_KEY);
          }
        } catch {
          // Offline — trust the persisted user until we can revalidate.
          if (savedUser) {
            try {
              const me = JSON.parse(savedUser) as AuthUser;
              setToken(saved);
              setUser(me);
              broadcast(saved, me);
            } catch {
              /* ignore */
            }
          }
        }
      }
      setLoading(false);
    })();
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
