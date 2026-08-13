/**
 * /reports/pick-invoice — Full-page picker for Invoice PDF report.
 * Replaces the previous bottom-sheet Modal in reports.tsx (Fix 5).
 */
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import { apiGet } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth-context";
import { titleCase } from "@/src/lib/format";
import { FullPagePicker, type PickerItem } from "@/src/components/full-page-picker";
import {
  runInvoicePdf,
  type Invoice,
  type Party,
} from "@/src/lib/reports-share";

export default function PickInvoiceScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      apiGet<Invoice[]>("/api/invoices").catch(() => []),
      apiGet<Party[]>("/api/parties").catch(() => []),
    ])
      .then(([i, p]) => {
        setInvoices(Array.isArray(i) ? i : []);
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
      invoices.map((i) => ({
        id: i.id,
        title: i.number,
        sub: `${partyMap[i.party_id]?.name || "—"} · ${titleCase(i.status || "draft")}`,
      })),
    [invoices, partyMap],
  );

  const onPick = useCallback(
    async (id: string) => {
      const inv = invoices.find((x) => x.id === id);
      if (!inv) return;
      setPending(true);
      try {
        await runInvoicePdf(inv, partyMap);
      } catch (e) {
        console.warn("[pick-invoice] failed:", (e as Error).message);
      } finally {
        setPending(false);
        router.back();
      }
    },
    [invoices, partyMap, router],
  );

  return (
    <FullPagePicker
      headerTitle="Pick an invoice"
      headerSub="Export a pro-forma invoice PDF"
      items={items}
      loading={loading}
      pending={pending}
      onPick={onPick}
      searchPlaceholder="Search invoice # or party…"
    />
  );
}
