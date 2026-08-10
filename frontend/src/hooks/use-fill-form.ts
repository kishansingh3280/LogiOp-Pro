/**
 * useFillForm — a tiny hook that plugs a screen into the fill-form
 * bus. Screens pass a `formId` (matching the AI's tool call payload)
 * and an `apply(fields, payload)` callback that translates fields
 * into local state updates.
 *
 * On mount the hook drains any pending payload dispatched BEFORE the
 * screen finished loading, then subscribes to future dispatches. The
 * subscription cleans itself up on unmount.
 *
 * Example:
 *   useFillForm("invoice_new", ({ fields }) => {
 *     if (fields.party_name) setPartyName(String(fields.party_name));
 *   });
 */
import { useEffect } from "react";

import {
  consumePendingFillForm,
  subscribeFillForm,
  type FillFormId,
  type FillFormPayload,
} from "@/src/api/fill-form-bus";
import { emitGhostTypeStart } from "@/src/ghost/ghost-bus";

export type FillFormApply = (payload: FillFormPayload) => void;

export function useFillForm(formId: FillFormId, apply: FillFormApply): void {
  useEffect(() => {
    // 1. Drain a pending payload emitted BEFORE this screen mounted.
    const pending = consumePendingFillForm(formId);
    if (pending) {
      try {
        emitGhostTypeStart(formId);
        apply(pending);
      } catch {
        /* ignore */
      }
    }
    // 2. Subscribe to future dispatches while the screen is on-screen.
    const unsub = subscribeFillForm((p) => {
      if (p.form !== formId) return;
      try {
        emitGhostTypeStart(formId);
        apply(p);
      } catch {
        /* ignore */
      }
    });
    return unsub;
    // We deliberately ignore `apply` changing — subscribers should
    // capture a stable closure over their setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);
}
