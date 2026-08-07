// FIFO helper — surfaces pending bags across all shipments so the operator
// can pull the oldest lots into the shipment being edited. Keeps the
// dispatch discipline (older warehouse arrivals leave the warehouse
// first) without requiring the operator to hunt across screens.
//
// A "lot" here == a pending shipment (`status === "pending"`). Every bag
// under a pending shipment is treated as "waiting at the warehouse" and
// can be reclaimed into another shipment via `PUT /api/bags/{id}` with
// a new `shipment_id`.

import { apiGet } from "@/src/api/client";
import type { Shipment, ShipmentBag } from "@/src/api/types";

export interface WarehouseQueueBag {
  id: string;
  bag_no: string;
  weight_kg: number;
  bill_to_party_id?: string | null;
  end_customer_id?: string | null;
  items: { name?: string; description?: string; quantity?: number; unit?: string }[];
  // Parent lot metadata (used for FIFO ordering + display)
  from_shipment_id: string;
  from_consignment_no: string;
  from_dispatch_date: string;   // ISO date (yyyy-mm-dd) or empty
  from_created_at: string;      // ISO datetime, fallback sort key
}

/**
 * Fetches every pending shipment, then their bags, and returns them
 * flattened + sorted oldest-first. Excludes:
 *   · the current shipment (we don't want it to suggest its own bags)
 *   · bags with weight_kg = 0 (they are placeholders auto-created by the
 *     backend; not real cargo yet)
 */
export async function fetchWarehouseQueue(
  currentShipmentId: string | null,
): Promise<WarehouseQueueBag[]> {
  const shipments = await apiGet<Shipment[]>("/api/shipments").catch(
    () => [] as Shipment[],
  );
  const pending = shipments
    .filter((s) => s.status === "pending" && s.id !== currentShipmentId)
    // FIFO — oldest dispatch_date first; tiebreak on created_at.
    .sort((a, b) => {
      const ad = a.dispatch_date || a.created_at || "";
      const bd = b.dispatch_date || b.created_at || "";
      if (ad === bd) return (a.created_at || "").localeCompare(b.created_at || "");
      return ad.localeCompare(bd);
    });

  const flat: WarehouseQueueBag[] = [];
  await Promise.all(
    pending.map(async (s) => {
      const bags = await apiGet<ShipmentBag[]>(`/api/shipments/${s.id}/bags`).catch(
        () => [] as ShipmentBag[],
      );
      for (const b of bags) {
        if (!b.weight_kg || b.weight_kg <= 0) continue;
        flat.push({
          id: b.id,
          bag_no: b.bag_no,
          weight_kg: b.weight_kg,
          bill_to_party_id: (b as unknown as { bill_to_party_id?: string }).bill_to_party_id || null,
          end_customer_id: b.end_customer_id || null,
          items: b.items || [],
          from_shipment_id: s.id,
          from_consignment_no: s.consignment_no,
          from_dispatch_date: s.dispatch_date || "",
          from_created_at: s.created_at || "",
        });
      }
    }),
  );
  // Re-sort flat list preserving the parent-lot FIFO order + bag_no
  // as secondary key for stable rendering.
  return flat.sort((a, b) => {
    const ad = a.from_dispatch_date || a.from_created_at || "";
    const bd = b.from_dispatch_date || b.from_created_at || "";
    if (ad !== bd) return ad.localeCompare(bd);
    if (a.from_consignment_no !== b.from_consignment_no)
      return a.from_consignment_no.localeCompare(b.from_consignment_no);
    return (a.bag_no || "").localeCompare(b.bag_no || "");
  });
}
