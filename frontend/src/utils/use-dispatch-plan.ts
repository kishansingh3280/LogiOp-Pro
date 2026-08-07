import { useEffect, useMemo, useState } from "react";

import { apiGet } from "@/src/api/client";
import { useApi } from "@/src/api/hooks";
import type { Shipment } from "@/src/api/types";
import { planDispatch, type DispatchBag, type DispatchSuggestion } from "@/src/utils/fifo-dispatch";

interface RemoteBag {
  id: string;
  bag_no: string;
  shipment_id: string;
  weight_kg: number;
  status?: string;
}

/**
 * Fetches all shipments + their bags, then runs the FIFO dispatch planner
 * against the given capacity. Returns the plan + `loading` flag.
 *
 * The bags-per-shipment fetch fan-outs are cached client-side by `apiGet`
 * so re-mounts are cheap. We only re-run when `capacityKg` changes.
 */
export function useDispatchPlan(capacityKg: number, direction?: "IN_TO_TH" | "TH_TO_IN" | null) {
  const shipments = useApi<Shipment[]>("/api/shipments");
  const [bagsMap, setBagsMap] = useState<Record<string, DispatchBag[]>>({});
  const [loadingBags, setLoadingBags] = useState(false);

  // Filter to pending / in-progress shipments in the same direction so we
  // don't suggest already-delivered bags or wrong-direction cargo.
  const candidateShipments = useMemo(() => {
    const list = shipments.data || [];
    return list.filter((s) => {
      if (direction && s.direction !== direction) return false;
      const status = (s.status || "").toLowerCase();
      // Skip finished shipments — their bags are already delivered.
      return status !== "delivered" && status !== "cancelled";
    });
  }, [shipments.data, direction]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (candidateShipments.length === 0) {
        setBagsMap({});
        return;
      }
      setLoadingBags(true);
      const next: Record<string, DispatchBag[]> = {};
      try {
        await Promise.all(
          candidateShipments.map(async (s) => {
            try {
              const raw = await apiGet<RemoteBag[]>(`/api/shipments/${s.id}/bags`);
              next[s.id] = (raw || []).map((b) => ({
                id: b.id,
                bag_no: b.bag_no,
                weight_kg: b.weight_kg || 0,
                shipment_id: b.shipment_id,
                status: b.status,
                lot_date: s.dispatch_date || s.created_at || "",
                lot_consignment: s.consignment_no,
                party_id: s.party_id,
              }));
            } catch {
              next[s.id] = [];
            }
          }),
        );
        if (!cancelled) setBagsMap(next);
      } finally {
        if (!cancelled) setLoadingBags(false);
      }
    })();
    return () => { cancelled = true; };
  }, [candidateShipments]);

  const plan: DispatchSuggestion = useMemo(
    () => planDispatch(candidateShipments, bagsMap, capacityKg),
    [candidateShipments, bagsMap, capacityKg],
  );

  return {
    plan,
    loading: shipments.loading || loadingBags,
    error: shipments.error,
    bagsMap,
    shipments: candidateShipments,
  };
}
