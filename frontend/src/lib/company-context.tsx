/**
 * Company + Mode context — persistent across app restarts.
 *
 * Phase 2 · Fix 5.
 *
 * Two dimensions:
 *   • activeCompany : "awadh" | "singh_exports"
 *   • activeMode    : "formal" | "informal"
 *
 * The pair is stored in AsyncStorage under `logiop_company_prefs` so
 * user preferences survive process restarts and app upgrades. The
 * provider hydrates from storage before painting children so hooks
 * always return a consistent value (never flashes default → stored).
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

export type CompanyId = "awadh" | "singh_exports" | null;
export type CompanyMode = "formal" | "informal" | null;

type Prefs = { activeCompany: CompanyId; activeMode: CompanyMode };

type CompanyContextValue = Prefs & {
  ready: boolean;
  setActiveCompany: (c: CompanyId) => void;
  setActiveMode: (m: CompanyMode) => void;
};

const STORAGE_KEY = "logiop_company_prefs";
const DEFAULT_PREFS: Prefs = {
  activeCompany: "awadh",
  activeMode: "formal",
};

const CompanyContext = createContext<CompanyContextValue | null>(null);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);

  // Hydrate persisted prefs before children mount.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!alive) return;
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<{
            activeCompany: string | null;
            activeMode: string | null;
          }>;
          const cRaw = parsed.activeCompany;
          const mRaw = parsed.activeMode;
          const next: Prefs = {
            activeCompany:
              cRaw === null
                ? null
                : cRaw === "singh_exports"
                  ? "singh_exports"
                  : "awadh",
            activeMode:
              mRaw === null
                ? null
                : mRaw === "informal"
                  ? "informal"
                  : "formal",
          };
          setPrefs(next);
        }
      } catch {
        /* corrupt storage → keep defaults */
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback(async (next: Prefs) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* best-effort — no crash if quota exceeded */
    }
  }, []);

  const setActiveCompany = useCallback(
    (c: CompanyId) => {
      setPrefs((prev) => {
        if (prev.activeCompany === c) return prev;
        const next = { ...prev, activeCompany: c };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const setActiveMode = useCallback(
    (m: CompanyMode) => {
      setPrefs((prev) => {
        if (prev.activeMode === m) return prev;
        const next = { ...prev, activeMode: m };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const value = useMemo<CompanyContextValue>(
    () => ({
      ...prefs,
      ready,
      setActiveCompany,
      setActiveMode,
    }),
    [prefs, ready, setActiveCompany, setActiveMode],
  );

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany(): CompanyContextValue {
  const ctx = useContext(CompanyContext);
  if (!ctx) {
    // Defensive: return defaults if provider is missing so callers
    // don't crash mid-render during hot reload.
    return {
      ...DEFAULT_PREFS,
      ready: false,
      setActiveCompany: () => {
        /* no-op */
      },
      setActiveMode: () => {
        /* no-op */
      },
    };
  }
  return ctx;
}

/**
 * Convenience — returns URL-ready query fragment.
 * Omits params entirely when the corresponding pref is null:
 *   both null           → ""            (Master · All)
 *   only activeCompany  → "company_id=X"
 *   only activeMode     → "mode=Y"      (rare)
 *   both set            → "company_id=X&mode=Y"
 */
export function useCompanyQuery(): string {
  const { activeCompany, activeMode } = useCompany();
  return buildCompanyQuery(activeCompany, activeMode);
}

export function buildCompanyQuery(
  activeCompany: CompanyId,
  activeMode: CompanyMode,
): string {
  const parts: string[] = [];
  if (activeCompany) parts.push(`company_id=${activeCompany}`);
  if (activeMode) parts.push(`mode=${activeMode}`);
  return parts.join("&");
}

/**
 * Convenience — append the company-mode query string to a base URL with the
 * correct separator ("?" or "&"). Returns the base URL unchanged when both
 * prefs are null so we don't leave a dangling "?".
 */
export function appendCompanyQuery(
  base: string,
  activeCompany: CompanyId,
  activeMode: CompanyMode,
): string {
  const qs = buildCompanyQuery(activeCompany, activeMode);
  if (!qs) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}${qs}`;
}
