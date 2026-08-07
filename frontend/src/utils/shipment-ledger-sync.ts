// Frontend-side per-bag ledger fan-out for shipments.
//
// The remote backend only accepts ONE `party_id` on a shipment and creates
// a single freight ledger entry against that party — and only on POST, not
// PUT. That means:
//   • Freight can't be split across multiple bill-to parties when a single
//     shipment holds bags for different customers.
//   • Editing freight/party on an existing shipment silently fails to sync
//     the ledger.
//
// This module fixes both problems client-side. After every shipment save
// (create OR edit), it:
//   1. Deletes any prior ledger entries that reference the shipment
//      (`ref_type = "shipment"` or `"shipment_carrier"` with `ref_id`).
//   2. Groups the shipment's bags by `bill_to_party_id`, computes each
//      group's weight-proportional share of the freight, and POSTs one
//      freight entry per bill-to party.
//   3. Re-creates the single carrier ledger entry from the current
//      carrier_charge / carrier_charge_type / weight.
//
// All entries carry `ref_id = shipment.id` so the next re-sync can find and
// wipe them cleanly.

import { apiDelete, apiGet, apiPost } from "@/src/api/client";

type LedgerRow = {
  id: string;
  party_id: string;
  ref_type?: string | null;
  ref_id?: string | null;
};

export type ShipmentForSync = {
  id: string;
  consignment_no: string;
  origin: string;
  destination: string;
  freight: number;
  freight_currency: string;
  carrier_party_id?: string | null;
  carrier_charge?: number | null;
  carrier_charge_type?: "flat" | "per_kg" | string | null;
  carrier_currency?: string | null;
  dispatch_date?: string | null;
  weight_kg: number;
};

export type BagForSync = {
  bag_no?: string;
  bill_to_party_id?: string | null;
  weight_kg: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

async function deleteExistingRefEntries(shipmentId: string) {
  let all: LedgerRow[] = [];
  try {
    all = await apiGet<LedgerRow[]>("/api/ledger/entries");
  } catch {
    return;
  }
  const targets = all.filter(
    (e) =>
      e.ref_id === shipmentId &&
      (e.ref_type === "shipment" || e.ref_type === "shipment_carrier"),
  );
  // Fire in parallel; individual failures are non-fatal.
  await Promise.all(
    targets.map((e) =>
      apiDelete(`/api/ledger/entries/${e.id}`).catch(() => undefined),
    ),
  );
}

/**
 * Re-fans-out ledger entries for a shipment so each Bill-to party is charged
 * its weight-proportional share of the freight, plus a single carrier
 * carriage credit. Safe to call after every shipment create/update.
 */
export async function syncShipmentLedger(
  shipment: ShipmentForSync,
  bags: BagForSync[],
): Promise<{ freightEntries: number; carrierEntries: number }> {
  await deleteExistingRefEntries(shipment.id);

  const dispatchDate =
    shipment.dispatch_date || new Date().toISOString().slice(0, 10);
  const route = `${shipment.origin || ""}→${shipment.destination || ""}`;
  let freightEntries = 0;
  let carrierEntries = 0;

  // --- Freight fan-out (per Bill-to) --------------------------------------
  const validBags = bags.filter(
    (b) => !!b.bill_to_party_id && (Number(b.weight_kg) || 0) > 0,
  );
  const totalW = validBags.reduce(
    (s, b) => s + (Number(b.weight_kg) || 0),
    0,
  );
  const freightAmount = Number(shipment.freight) || 0;

  if (freightAmount > 0 && totalW > 0 && validBags.length > 0) {
    // Sum weight per bill-to party.
    const grouped = new Map<string, number>();
    for (const b of validBags) {
      const pid = b.bill_to_party_id as string;
      grouped.set(pid, (grouped.get(pid) || 0) + (Number(b.weight_kg) || 0));
    }
    const groups = [...grouped.entries()];
    let remaining = freightAmount;
    for (let i = 0; i < groups.length; i++) {
      const [pid, w] = groups[i];
      const isLast = i === groups.length - 1;
      const share = isLast
        ? round2(remaining)
        : round2((freightAmount * w) / totalW);
      remaining = round2(remaining - share);
      if (share <= 0) continue;
      const bagCount = validBags.filter((b) => b.bill_to_party_id === pid).length;
      const desc = `Freight ${shipment.consignment_no} · ${route} · ${bagCount} bag${bagCount === 1 ? "" : "s"} (${round2(w)} kg)`;
      try {
        await apiPost("/api/ledger/entries", {
          party_id: pid,
          date: dispatchDate,
          description: desc,
          debit: share,
          credit: 0,
          currency: shipment.freight_currency,
          ref_type: "shipment",
          ref_id: shipment.id,
        });
        freightEntries += 1;
      } catch (e) {
        console.warn(
          `Freight ledger for party ${pid} failed:`,
          (e as Error).message,
        );
      }
    }
  }

  // --- Carrier ledger (single carrier per shipment) -----------------------
  const carrierCharge = Number(shipment.carrier_charge) || 0;
  if (shipment.carrier_party_id && carrierCharge > 0) {
    const carrierAmount =
      shipment.carrier_charge_type === "per_kg"
        ? round2(carrierCharge * (Number(shipment.weight_kg) || 0))
        : round2(carrierCharge);
    if (carrierAmount > 0) {
      try {
        await apiPost("/api/ledger/entries", {
          party_id: shipment.carrier_party_id,
          date: dispatchDate,
          description: `Carriage ${shipment.consignment_no} · ${route}`,
          debit: 0,
          credit: carrierAmount,
          currency: shipment.carrier_currency || "INR",
          ref_type: "shipment_carrier",
          ref_id: shipment.id,
        });
        carrierEntries += 1;
      } catch (e) {
        console.warn("Carrier ledger sync failed:", (e as Error).message);
      }
    }
  }

  return { freightEntries, carrierEntries };
}
