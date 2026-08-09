/**
 * SidebarContext — shared state for the app-wide sidebar (JARVIS Aura v3
 * navigation). Two flags:
 *
 *   • `expanded` — tablet-only. When true the sidebar is 220 px wide
 *     showing icons + labels; when false it collapses to 64 px, icons
 *     only. Toggled via the chevron on the right edge of the sidebar.
 *
 *   • `openMobile` — mobile-only. When true the sidebar slides in from
 *     the left as a full-height overlay with a dark scrim behind it.
 *     Toggled via the hamburger button in the top-left of every screen.
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

import { useIsTablet } from "@/src/hooks/use-is-tablet";

type SidebarState = {
  expanded: boolean;
  openMobile: boolean;
  toggleExpanded: () => void;
  openMobileDrawer: () => void;
  closeMobileDrawer: () => void;
  isTablet: boolean;
};

const SidebarContext = createContext<SidebarState | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const isTablet = useIsTablet();
  const [expanded, setExpanded] = useState(true);
  const [openMobile, setOpenMobile] = useState(false);

  const toggleExpanded = useCallback(() => setExpanded((v) => !v), []);
  const openMobileDrawer = useCallback(() => setOpenMobile(true), []);
  const closeMobileDrawer = useCallback(() => setOpenMobile(false), []);

  const value = useMemo<SidebarState>(
    () => ({ expanded, openMobile, toggleExpanded, openMobileDrawer, closeMobileDrawer, isTablet }),
    [expanded, openMobile, toggleExpanded, openMobileDrawer, closeMobileDrawer, isTablet],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): SidebarState {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used inside <SidebarProvider>");
  return ctx;
}

/** Current tablet-mode sidebar width in px. Mobile → 0 (overlay). */
export function currentSidebarWidth(s: SidebarState): number {
  if (!s.isTablet) return 0;
  return s.expanded ? 220 : 64;
}
