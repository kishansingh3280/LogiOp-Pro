/**
 * fill-form event bus — a lightweight pub-sub used by the Voice Orb
 * (OpenAI Realtime `fill_form` tool call) to push structured form data
 * into whichever screen wants to consume it.
 *
 * Flow:
 *   1. The Realtime API returns a `fill_form` function call with a
 *      payload `{ form: "shipment_new", fields: { ... } }`.
 *   2. `use-realtime-voice.ts` invokes `dispatchFillForm(payload)`.
 *   3. The bus stores the payload as "pending" AND emits to any live
 *      subscribers. If we're already on the target form the subscriber
 *      applies it immediately; otherwise it navigates to the target
 *      route and the destination screen picks up the pending payload
 *      on mount via `consumePendingFillForm(formId)`.
 *
 * This design lets the AI drive multi-step flows without hard-coding
 * navigation logic in the voice hook.
 */

// Every form the AI can auto-fill declares an id here so the assistant
// tool schema stays in sync. Add new IDs as new forms come online.
export type FillFormId =
  | "shipment_new"
  | "invoice_new"
  | "party_new"
  | "ledger_entry_new"
  | "trip_new";

export type FillFormPayload = {
  form: FillFormId;
  /** Free-form key/value fields. Keys should match the target form's
   *  state names. Unknown keys are ignored by the consumer. */
  fields: Record<string, string | number | boolean | null>;
  /** Optional short reason the AI is filling this form — displayed as
   *  a toast so the operator understands WHY the AI acted. */
  reason?: string;
};

// -- Pending store -------------------------------------------------------
// A single-slot buffer holds the most-recent fill request until the
// target form mounts and consumes it. Nothing else in the app touches
// this ref; only the bus + subscribers.
let pending: FillFormPayload | null = null;

export function consumePendingFillForm(form: FillFormId): FillFormPayload | null {
  if (pending && pending.form === form) {
    const p = pending;
    pending = null;
    return p;
  }
  return null;
}

// -- Subscribers ---------------------------------------------------------
type Listener = (p: FillFormPayload) => void;
const listeners = new Set<Listener>();

export function subscribeFillForm(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function dispatchFillForm(p: FillFormPayload): void {
  pending = p;
  // Notify subscribers — they may consume the pending payload
  // synchronously and clear it via `consumePendingFillForm`.
  listeners.forEach((fn) => {
    try {
      fn(p);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[fill-form] listener threw:", e);
    }
  });
}

// Dev-only: expose the dispatcher on window so E2E tests can simulate
// an OpenAI Realtime fill_form tool call without actually opening a
// WebRTC session.  No-op outside browsers / production.
if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__testDispatchFill = dispatchFillForm;
}

// -- Route helper --------------------------------------------------------
// Map every FillFormId to its Expo Router path so the voice hook can
// navigate the user to the correct form when it's not already open.
export const FILL_FORM_ROUTES: Record<FillFormId, string> = {
  shipment_new: "/shipment/new",
  invoice_new: "/invoice/new",
  party_new: "/party/new",
  ledger_entry_new: "/entry/new",
  trip_new: "/bullion/trip/new",
};
