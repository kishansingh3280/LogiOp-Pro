/**
 * Auth context — Phase 10 · Fix 1.
 *
 * Handles the passwordless auto-login flow against the backend's
 * `/api/auth/auto-login` endpoint.
 *
 * Loading gate (Fix 1):
 *   The provider now BLOCKS its children until the bearer token is
 *   confirmed present (either restored from AsyncStorage cache or
 *   freshly minted via auto-login). This eliminates the race where
 *   screens mounted, fired API calls, and got 401 because `token`
 *   was still `null` in the api-client's sync cache.
 *
 * Persistence:
 *   • Token cached in AsyncStorage (NOT SecureStore, to keep native
 *     module surface area minimal for this bring-up phase).
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
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { colors } from "./theme";

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

// ─── Refresh handle exposed to api.ts for 401-retry (Fix 1) ────────
// api.ts imports this to force a token refresh on 401 without
// having to know auth internals.
export async function refreshAuthTokenFromApi(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/auth/auto-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { access_token: string; user: AuthUser };
    inMemoryToken = data.access_token;
    inMemoryUser = data.user;
    // Best-effort persistence — do NOT await, do NOT block retry.
    AsyncStorage.setItem(TOKEN_KEY, data.access_token).catch(() => {
      /* silent */
    });
    AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user)).catch(() => {
      /* silent */
    });
    return true;
  } catch {
    return false;
  }
}

type AuthCtx = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  authError: string | null;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setAuthError(null);

    // 1) Try to reuse a persisted token first — fast path, avoids
    //    a network round-trip on cold launch.
    let cachedOk = false;
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
          cachedOk = true;
        } catch {
          /* corrupted cache — fall through to network */
        }
      }
    } catch {
      /* AsyncStorage read failed — non-fatal */
    }

    if (cachedOk) {
      // We have a usable token — unblock children immediately, then
      // silently rotate the token in the background.
      setLoading(false);
      fetch(`${BASE}/api/auth/auto-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
        .then(async (res) => {
          if (!res.ok) return;
          const data = (await res.json()) as {
            access_token: string;
            user: AuthUser;
          };
          setToken(data.access_token);
          setUser(data.user);
          inMemoryToken = data.access_token;
          inMemoryUser = data.user;
          AsyncStorage.setItem(TOKEN_KEY, data.access_token).catch(() => {
            /* silent */
          });
          AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user)).catch(() => {
            /* silent */
          });
        })
        .catch(() => {
          /* silent — cached token still works */
        });
      return;
    }

    // 2) No cache — MUST block children until we have a real token.
    try {
      const res = await fetch(`${BASE}/api/auth/auto-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        setAuthError(`auto-login ${res.status}`);
        setLoading(false);
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
      try {
        await AsyncStorage.setItem(TOKEN_KEY, data.access_token);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
      } catch {
        /* persistence best-effort */
      }
    } catch (e) {
      setAuthError((e as Error).message || "network");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const value = useMemo<AuthCtx>(
    () => ({ user, token, loading, authError, refresh: bootstrap }),
    [user, token, loading, authError, bootstrap],
  );

  return (
    <Ctx.Provider value={value}>
      {loading ? <LoadingGate /> : children}
    </Ctx.Provider>
  );
}

function LoadingGate() {
  return (
    <View style={styles.gate}>
      <ActivityIndicator color={colors.brand} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  gate: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSolid,
  },
});

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
