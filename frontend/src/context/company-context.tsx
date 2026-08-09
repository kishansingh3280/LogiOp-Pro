/**
 * CompanyContext — global "active company" for the Multi-Company feature.
 *
 * The active company id is persisted to AsyncStorage so switching brands
 * survives a full app reload. The provider also pushes the current id into
 * the module-level api client (via setApiCompany) so every GET/POST auto-
 * inherits the company filter without every screen threading it manually.
 */
import React, { createContext, useContext, useEffect, useState } from "react";

import { setApiCompany } from "@/src/api/client";
import { useAuth } from "@/src/auth/context";
import { resetBullionCaches } from "@/src/bullion/store";
import { storage } from "@/src/utils/storage";

export type CompanyId = "awadh_enterprise" | "singh_exports" | string;

type CompanyContextType = {
  activeCompany: CompanyId;
  setActiveCompany: (c: CompanyId) => void;
  ready: boolean;
};

const CompanyContext = createContext<CompanyContextType>({
  activeCompany: "awadh_enterprise",
  setActiveCompany: () => {},
  ready: false,
});

const STORAGE_KEY = "active_company";
const DEFAULT_COMPANY: CompanyId = "awadh_enterprise";

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeCompany, setActiveCompanyState] = useState<CompanyId>(DEFAULT_COMPANY);
  const [ready, setReady] = useState(false);

  // Hydrate from AsyncStorage on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await storage.getItem(STORAGE_KEY);
        if (!cancelled && saved) {
          setActiveCompanyState(saved as CompanyId);
          setApiCompany(saved);
        } else {
          setApiCompany(DEFAULT_COMPANY);
        }
      } catch {
        setApiCompany(DEFAULT_COMPANY);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Non-Admin users are always scoped to their own company. When a Papa /
  // Staff / Carrier logs in with a `user.company` on their profile, we
  // pin the active company to that brand and ignore any stored value.
  // Admins keep their persisted preference so the switcher works.
  useEffect(() => {
    if (!ready || !user) return;
    if (user.role === "Admin") return;
    const rawCompany = (user as unknown as { company?: string }).company;
    if (!rawCompany) return;
    // The user profile stores the prefixed form ("co_singh_exports")
    // but records are tagged with the short form ("singh_exports").
    const short = rawCompany.startsWith("co_") ? rawCompany.slice(3) : rawCompany;
    if (short !== activeCompany) {
      setActiveCompanyState(short);
      setApiCompany(short);
      resetBullionCaches();
    }
  }, [ready, user, activeCompany]);

  // Push every update into the module-level api client + persist it so
  // full-reload restarts remember the operator's last brand. Also purge
  // the in-memory bullion caches so switching brands immediately reflects
  // the new data instead of showing the previous company's list.
  const setActiveCompany = (c: CompanyId) => {
    if (c === activeCompany) return;
    setActiveCompanyState(c);
    setApiCompany(c);
    resetBullionCaches();
    // Fire-and-forget persistence — a failed write shouldn't block the UI.
    storage.setItem(STORAGE_KEY, c).catch(() => {});
  };

  return (
    <CompanyContext.Provider value={{ activeCompany, setActiveCompany, ready }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyContext);
}
