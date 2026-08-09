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

  // Push every update into the module-level api client + persist it so
  // full-reload restarts remember the operator's last brand.
  const setActiveCompany = (c: CompanyId) => {
    setActiveCompanyState(c);
    setApiCompany(c);
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
