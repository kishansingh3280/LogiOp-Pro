/**
 * /reports/pick-party — Full-page picker for Party Statement report.
 * Replaces the previous bottom-sheet Modal in reports.tsx (Fix 5).
 */
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import { apiGet } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth-context";
import { titleCase } from "@/src/lib/format";
import { FullPagePicker, type PickerItem } from "@/src/components/full-page-picker";
import { runPartyStatement, type Party } from "@/src/lib/reports-share";

export default function PickPartyScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiGet<Party[]>("/api/parties")
      .then((p) => setParties(Array.isArray(p) ? p : []))
      .catch(() => setParties([]))
      .finally(() => setLoading(false));
  }, [token]);

  const items: PickerItem[] = useMemo(
    () =>
      parties.map((p) => ({
        id: p.id,
        title: p.name,
        sub: `${titleCase(p.role || "")} · ${p.phone || p.email || "—"}`,
      })),
    [parties],
  );

  const onPick = useCallback(
    async (id: string) => {
      const p = parties.find((x) => x.id === id);
      if (!p) return;
      setPending(true);
      try {
        await runPartyStatement(p);
      } catch (e) {
        console.warn("[pick-party] failed:", (e as Error).message);
      } finally {
        setPending(false);
        router.back();
      }
    },
    [parties, router],
  );

  return (
    <FullPagePicker
      headerTitle="Pick a party"
      headerSub="Generate a ledger statement PDF"
      items={items}
      loading={loading}
      pending={pending}
      onPick={onPick}
      searchPlaceholder="Search by name or phone…"
    />
  );
}
