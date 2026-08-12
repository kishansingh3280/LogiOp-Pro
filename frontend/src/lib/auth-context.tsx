/**
 * Phase-1 minimal auth context.
 *
 * Handles the passwordless auto-login flow against the backend's
 * `/api/auth/auto-login` endpoint. On mount we seed an immediate stub
 * admin (so the UI is never gated on a network round-trip) and then
 * asynchronously fetch a real JWT in the background.
 *
 * Persistence:
 *   • The bearer token is cached in AsyncStorage (NOT SecureStore, to
 *     keep native module surface area minimal for this bring-up phase).
 *
 * NO SecureStore, NO Emergent-managed auth — we're deliberately keeping
 * dependencies minimal until we've proven the APK is stable.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Role = "Admin" | "Staff" | "Carrier" | "Papa";

export type AuthUser = {
  id: string;
  username: string;
  display_name: string;
  role: Role;
  honorific: string;
  company?: string;
};

const TOKEN_KEY = "@auth_token_v1";
const USER_KEY = "@auth_user_v1";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
if (!BASE) throw new Error("EXPO_PUBLIC_BACKEND_URL is not set");

// ─── In-memory cache for api client ────────────────────────────────
let inMemoryToken: string | null = null;
let inMemoryUser: AuthUser | null = null;

export function getAuthTokenSync(): string | null {
  return inMemoryToken;
}
export function getAuthUserSync(): AuthUser | null {
  return inMemoryUser;
}

// ─── Auto-login stub ───────────────────────────────────────────────
// Kishan's admin identity per system requirements. The stub keeps
// the UI functional even before the backend responds; the real JWT
// is fetched silently in the background.
const AUTO_LOGIN_STUB_USER: AuthUser = {
  id: "auto-admin",
  username: "kishan.singh3280@gmail.com",
  display_name: "Kishan",
  role: "Admin",
  honorific: "Sir",
};

type AuthCtx = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  authError: string | null;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(AUTO_LOGIN_STUB_USER);
  const [token, setToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const loading = false; // stub user is seeded synchronously

  // Publish stub to in-memory cache immediately so api client sees it
  // on tick 0.
  useEffect(() => {
    inMemoryUser = AUTO_LOGIN_STUB_USER;
    inMemoryToken = null;
  }, []);

  const bootstrap = useCallback(async () => {
    // 1) Try to reuse a persisted token first — fast path, avoids
    //    a network round-trip on cold launch.
    try {
      const [cachedToken, cachedUserStr] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);
      if (cachedToken && cachedUserStr) {
        try {
          const cachedUser = JSON.parse(cachedUserStr) as AuthUser;
          setToken(cachedToken);
          setUser(cachedUser);
          inMemoryToken = cachedToken;
          inMemoryUser = cachedUser;
        } catch {
          /* corrupted cache — fall through to network */
        }
      }
    } catch {
      /* AsyncStorage read failed — non-fatal, keep stub */
    }

    // 2) Always try to refresh a fresh JWT via auto-login. If it
    //    succeeds it silently upgrades from stub → real token.
    try {
      const res = await fetch(`${BASE}/api/auth/auto-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        setAuthError(`auto-login ${res.status}`);
        return;
      }
      const data = (await res.json()) as {
        access_token: string;
        user: AuthUser;
      };
      setToken(data.access_token);
      setUser(data.user);
      inMemoryToken = data.access_token;
      inMemoryUser = data.user;
      setAuthError(null);
      try {
        await AsyncStorage.setItem(TOKEN_KEY, data.access_token);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
      } catch {
        /* persistence best-effort */
      }
    } catch (e) {
      setAuthError((e as Error).message || "network");
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const value = useMemo<AuthCtx>(
    () => ({ user, token, loading, authError, refresh: bootstrap }),
    [user, token, loading, authError, bootstrap],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
