/**
 * /reports/pick-shipment — Full-page picker for Shipment Manifest report.
 * Replaces the previous bottom-sheet Modal in reports.tsx (Fix 5).
 */
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import { apiGet } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth-context";
import { titleCase } from "@/src/lib/format";
import { FullPagePicker, type PickerItem } from "@/src/components/full-page-picker";
import {
  runShipmentManifest,
  type Party,
  type Shipment,
} from "@/src/lib/reports-share";

export default function PickShipmentScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      apiGet<Shipment[]>("/api/shipments").catch(() => []),
      apiGet<Party[]>("/api/parties").catch(() => []),
    ])
      .then(([s, p]) => {
        setShipments(Array.isArray(s) ? s : []);
        setParties(Array.isArray(p) ? p : []);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const partyMap = useMemo(() => {
    const m: Record<string, Party> = {};
    for (const p of parties) m[p.id] = p;
    return m;
  }, [parties]);

  const items: PickerItem[] = useMemo(
    () =>
      shipments.map((s) => ({
        id: s.id,
        title: s.consignment_no,
        sub: `${s.direction === "IN_TO_TH" ? "IN→TH" : "TH→IN"} · ${s.weight_kg} kg · ${titleCase(s.status)}`,
      })),
    [shipments],
  );

  const onPick = useCallback(
    async (id: string) => {
      const s = shipments.find((x) => x.id === id);
      if (!s) return;
      setPending(true);
      try {
        await runShipmentManifest(s, partyMap);
      } catch (e) {
        console.warn("[pick-shipment] failed:", (e as Error).message);
      } finally {
        setPending(false);
        router.back();
      }
    },
    [shipments, partyMap, router],
  );

  return (
    <FullPagePicker
      headerTitle="Pick a shipment"
      headerSub="Generate a consignment manifest PDF"
      items={items}
      loading={loading}
      pending={pending}
      onPick={onPick}
      searchPlaceholder="Search consignment #…"
    />
  );
}
