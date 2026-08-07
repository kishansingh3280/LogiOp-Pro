import { apiPost } from "@/src/api/client";
import type { LedgerEntry } from "@/src/api/types";

import { getCurrentRates, getRates } from "./rates";
import { updateTxn } from "./store";
import type { BullionTxn, CarrierTrip } from "./types";
import { computeCarrierCharge, STATUS_LABEL } from "./types";

/**
 * Auto-post a carrier fee ledger entry for a bullion transaction that has
 * just moved to "completed" status. Idempotent: if the txn already carries
 * a `ledger_entry_id`, the call is a no-op.
 *
 * Requirements to post:
 *   - status === "completed"
 *   - txn is linked to a trip
 *   - the trip has a carrier_party_id
 *   - carrier_charge_inr > 0
 *
 * The entry is recorded as a DEBIT against the carrier's ledger — i.e. we
 * owe the carrier for the carrying service. Description encodes the txn no
 * and type so it's traceable back to the source.
 *
 * Returns `true` when a new entry was posted, `false` otherwise.
 */
export async function maybePostCarrierFee(
  txn: BullionTxn,
  trip: CarrierTrip | null | undefined,
): Promise<boolean> {
  if (!txn || txn.status !== "completed") return false;
  if (txn.ledger_entry_id) return false;
  if (!trip || !trip.carrier_party_id) return false;

  // Prefer freshest global rates; getRates() is cached after the first call.
  await getRates();
  const rates = getCurrentRates();
  const carrierCharge = computeCarrierCharge(txn, rates);
  if (!carrierCharge || carrierCharge <= 0) return false;

  const typeLabel = txn.type === "currency" ? "Currency carry" : "Gold carry";
  const routeLabel = trip.route === "IN_TO_TH" ? "IN → BKK" : "BKK → IN";

  const payload = {
    party_id: trip.carrier_party_id,
    date: new Date().toISOString().slice(0, 10),
    description: `Carrier fee — ${txn.txn_no} · ${typeLabel} · ${routeLabel}`,
    debit: carrierCharge,
    credit: 0,
    currency: "INR",
    ref_type: "bullion_txn",
    ref_id: txn.id,
  };

  try {
    const entry = await apiPost<LedgerEntry & { queued?: boolean }>(
      "/api/ledger/entries",
      payload,
    );
    // Persist link so we never double-post — even for queued/offline entries.
    const linkedId = (entry as LedgerEntry).id || `queued:${Date.now()}`;
    await updateTxn(txn.id, {
      ledger_entry_id: linkedId,
      ledger_posted_at: new Date().toISOString(),
    });
    return true;
  } catch (e) {
    // Best-effort — the txn stays "completed" locally; the ledger post can
    // be retried when the user next opens the txn.
    console.warn("Carrier fee ledger post failed:", (e as Error).message);
    return false;
  }
}

/** Human-friendly summary used in UI toasts / debug. */
export function describeCarrierFee(
  txn: BullionTxn,
  trip: CarrierTrip | null | undefined,
): string {
  if (!trip?.carrier_party_id) return "No carrier assigned";
  const rates = getCurrentRates();
  const c = computeCarrierCharge(txn, rates);
  return `${STATUS_LABEL[txn.status]} · ₹${c.toLocaleString("en-IN")} → carrier`;
}
