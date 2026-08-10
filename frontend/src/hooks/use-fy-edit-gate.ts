/**
 * useFYEditGate — single source of truth for "can this user create / edit
 * data in the currently-selected Financial Year?"
 *
 * Rules
 *   • The current FY is always fully editable for everyone.
 *   • Older / future FYs are READ-ONLY for non-admin users.
 *   • Admins can always edit, in any FY (to fix historical mistakes).
 *
 * Consumers get:
 *   • `isReadOnly` boolean — true when the gate should block create/edit
 *   • `isCurrentFY`  boolean — convenience for banners / lock icons
 *   • `canEditDate(dateISO)` — evaluate an individual record's date so
 *     detail screens can decide per-row instead of per-view. E.g. a
 *     shipment dispatched today should stay editable even if the user
 *     currently has an older FY selected in the picker.
 *   • `blockReason` string — human-readable Hinglish message ready to
 *     drop into a toast / tooltip / alert.
 */
import { useCallback, useMemo } from "react";

import { useAuth } from "@/src/auth/context";
import { useFY } from "@/src/context/fy-context";
import { currentFYKey, fyLabel, isInFY } from "@/src/utils/fy";

export interface FYEditGate {
  isReadOnly: boolean;
  isCurrentFY: boolean;
  isAdmin: boolean;
  activeFY: string;
  currentFY: string;
  blockReason: string;
  canEditDate: (input: string | Date | null | undefined) => boolean;
}

export function useFYEditGate(): FYEditGate {
  const { fy } = useFY();
  const { user } = useAuth();
  const currentFY = currentFYKey();
  const isAdmin = (user?.role || "").toLowerCase() === "admin";
  const isCurrentFY = fy === currentFY;
  const isReadOnly = !isCurrentFY && !isAdmin;

  const blockReason = useMemo(() => {
    if (!isReadOnly) return "";
    // Hinglish so it reads consistently in Papa / staff toasts too.
    return `${fyLabel(fy)} closed hai — sirf Admin edit kar sakte hain.`;
  }, [isReadOnly, fy]);

  const canEditDate = useCallback(
    (input: string | Date | null | undefined) => {
      if (isAdmin) return true;
      // If no date is provided we assume the caller meant "does this
      // screen allow edits right now?" — fall back to the picker gate.
      if (input == null) return !isReadOnly;
      // A record dated inside the CURRENT FY is always editable even if
      // the user happens to be browsing an older FY (unlikely, but safe).
      return isInFY(input, currentFY);
    },
    [isAdmin, isReadOnly, currentFY],
  );

  return { isReadOnly, isCurrentFY, isAdmin, activeFY: fy, currentFY, blockReason, canEditDate };
}
