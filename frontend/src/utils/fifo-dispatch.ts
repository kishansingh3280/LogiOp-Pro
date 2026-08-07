import type { Shipment } from "@/src/api/types";

/**
 * A bag surfaced from the shipment API. Only the fields the dispatch
 * algorithm needs — keeps this module unit-testable.
 */
export interface DispatchBag {
  id: string;
  bag_no: string;
  weight_kg: number;
  shipment_id: string;
  status?: string;
  lot_date: string;             // shipment.dispatch_date (used for FIFO order)
  lot_consignment: string;      // shipment.consignment_no (display)
  party_id?: string | null;
}

export interface DispatchSuggestion {
  suggested: DispatchBag[];     // chosen bags in order
  skipped_no_fit: DispatchBag[];// bags that couldn't fit on this trip
  total_kg: number;
  remaining_kg: number;
  lots_touched: string[];       // consignment numbers in FIFO order
  fully_cleared_lots: string[]; // consignments whose bags all fit
  partial_lots: string[];       // consignments still with unassigned bags
}

/**
 * Build a FIFO-with-best-fit dispatch plan.
 *
 * Rules the algorithm enforces:
 *   1. Older lots (by `dispatch_date`) are exhausted first — no new lot's
 *      bag is picked until the previous lot has been considered fully.
 *   2. Within a lot, we prefer bags whose weight is closest to the remaining
 *      capacity so full bags are used first (avoiding "opened" bags).
 *   3. Bags with weight === 0 are treated as "unknown weight" and skipped
 *      by the auto-suggester (they don't consume capacity, so we don't want
 *      to greedily add them and mislead the user).
 *
 * The algorithm is O(bags × lots) in the worst case, which is trivial for
 * realistic fleets (< 1000 bags on any given trip planning session).
 */
export function planDispatch(
  shipments: Shipment[],
  bagsByShipment: Record<string, DispatchBag[]>,
  capacityKg: number,
): DispatchSuggestion {
  const suggested: DispatchBag[] = [];
  const skipped: DispatchBag[] = [];
  const lotsTouched: string[] = [];
  const fullyCleared: string[] = [];
  const partial: string[] = [];

  // FIFO lot order — oldest dispatch_date first, then created_at as tiebreaker.
  const lots = [...shipments].sort((a, b) => {
    const ad = a.dispatch_date || a.created_at || "";
    const bd = b.dispatch_date || b.created_at || "";
    if (ad === bd) return (a.created_at || "").localeCompare(b.created_at || "");
    return ad.localeCompare(bd);
  });

  let remaining = capacityKg;

  for (const lot of lots) {
    const lotBags = (bagsByShipment[lot.id] || [])
      .filter((b) => (b.status || "packed") !== "delivered")
      .filter((b) => b.weight_kg > 0);
    if (lotBags.length === 0) continue;
    lotsTouched.push(lot.consignment_no);

    // Keep picking best-fit bag from THIS lot while any fits.
    const remainingLotBags = [...lotBags];
    let picked = 0;
    while (remainingLotBags.length > 0) {
      // Find bag with weight closest to remaining capacity that still fits.
      let bestIdx = -1;
      let bestGap = Number.POSITIVE_INFINITY;
      for (let i = 0; i < remainingLotBags.length; i++) {
        const w = remainingLotBags[i].weight_kg;
        if (w > remaining + 1e-6) continue; // won't fit
        const gap = remaining - w;
        if (gap < bestGap) {
          bestGap = gap;
          bestIdx = i;
        }
      }
      if (bestIdx === -1) break; // nothing from this lot fits
      const chosen = remainingLotBags.splice(bestIdx, 1)[0];
      suggested.push(chosen);
      remaining -= chosen.weight_kg;
      picked++;
      if (remaining < 1e-6) break;
    }
    // Any leftover bags in this lot are "skipped no fit" — recorded so the
    // UI can highlight them (user might want to load a partial bag manually).
    remainingLotBags.forEach((b) => skipped.push(b));

    if (remainingLotBags.length === 0 && picked > 0) {
      fullyCleared.push(lot.consignment_no);
    } else if (picked > 0) {
      partial.push(lot.consignment_no);
    } else {
      partial.push(lot.consignment_no);
    }

    // Rule 1: don't move to next lot until this one has been considered
    // completely. We continue the outer for-loop only once we've either
    // exhausted this lot or filled the trip. If trip is full, stop.
    if (remaining < 1e-6) break;
  }

  const totalKg = suggested.reduce((s, b) => s + b.weight_kg, 0);
  return {
    suggested,
    skipped_no_fit: skipped,
    total_kg: totalKg,
    remaining_kg: Math.max(0, capacityKg - totalKg),
    lots_touched: lotsTouched,
    fully_cleared_lots: fullyCleared,
    partial_lots: partial,
  };
}
