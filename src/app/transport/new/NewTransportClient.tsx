"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { TRANSPORT_MODE_LABELS, formatMoney } from "@/lib/utils";
import { apiGet, apiPost } from "@/lib/client-api";

type Bag = {
  id: string;
  bagNumber: string;
  weightKg: number | null;
  shipment: { lotNumber: string };
};

type Party = {
  id: string;
  name: string;
  type: string;
  carryRatePerKg: number | null;
  defaultCurrency: string;
};

export default function NewTransportClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselected = (searchParams.get("bags") || "").split(",").filter(Boolean);

  const [allBags, setAllBags] = useState<Bag[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(preselected));
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState({
    mode: "CARRY_PERSON",
    carrierId: "",
    carrierName: "",
    assignedDate: new Date().toISOString().slice(0, 10),
    departureDate: "",
    arrivalDate: "",
    ratePerKg: "",
    totalWeightKg: "",
    currency: "INR",
    trackingRef: "",
    notes: "",
    syncToLedger: true,
    markInTransit: true,
  });

  useEffect(() => {
    Promise.all([apiGet<Bag[]>("/api/bags"), apiGet<Party[]>("/api/parties")])
      .then(([bags, parties]) => {
        setAllBags(bags);
        setParties(parties);
        setLoadError(null);
      })
      .catch((e) =>
        setLoadError(e instanceof Error ? e.message : "Failed to load")
      );
  }, []);

  const carriers = parties.filter(
    (p) => p.type === "CARRY_PERSON" || p.type === "AGENT" || p.type === "OTHER"
  );

  const selectedBags = useMemo(
    () => allBags.filter((b) => selected.has(b.id)),
    [allBags, selected]
  );

  const autoWeight = useMemo(
    () => selectedBags.reduce((s, b) => s + (b.weightKg || 0), 0),
    [selectedBags]
  );

  const weight = form.totalWeightKg ? Number(form.totalWeightKg) : autoWeight;
  const rate = form.ratePerKg ? Number(form.ratePerKg) : 0;
  const payable = weight > 0 && rate > 0 ? weight * rate : 0;

  function onCarrierChange(id: string) {
    const c = parties.find((p) => p.id === id);
    setForm((f) => ({
      ...f,
      carrierId: id,
      ratePerKg:
        c?.carryRatePerKg != null ? String(c.carryRatePerKg) : f.ratePerKg,
      currency: c?.defaultCurrency || f.currency,
    }));
  }

  async function submit() {
    if (selected.size === 0) {
      alert("Select at least one bag");
      return;
    }
    setSaving(true);
    try {
      const data = await apiPost<{
        synced?: boolean;
        ledgerEntry?: { amount: number; currency: "INR" | "THB" };
      }>("/api/transport", {
        ...form,
        bagIds: Array.from(selected),
        ratePerKg: form.ratePerKg ? Number(form.ratePerKg) : null,
        totalWeightKg: weight || null,
        departureDate: form.departureDate || null,
        arrivalDate: form.arrivalDate || null,
        carrierId: form.carrierId || null,
      });
      if (data.synced && data.ledgerEntry) {
        alert(
          `Transport assigned. Ledger entry synced: ${formatMoney(
            data.ledgerEntry.amount,
            data.ledgerEntry.currency
          )}`
        );
      }
      router.push("/transport");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <Card>
        <div className="text-red-700">{loadError}</div>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title="Assign transport"
        subtitle="Air / sea / land / carry person — optional auto ledger sync for agent payment"
        actions={
          <Link href="/transport">
            <Button variant="secondary">Back</Button>
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-display text-lg">Select bags</h2>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {allBags.map((b) => (
              <label
                key={b.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--line)] px-3 py-2 hover:bg-[var(--bg)]"
              >
                <input
                  type="checkbox"
                  checked={selected.has(b.id)}
                  onChange={() => {
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(b.id)) next.delete(b.id);
                      else next.add(b.id);
                      return next;
                    });
                  }}
                />
                <div className="text-sm">
                  <span className="font-medium">
                    {b.shipment.lotNumber} · #{b.bagNumber}
                  </span>
                  {b.weightKg != null && (
                    <span className="text-[var(--muted)]"> · {b.weightKg} kg</span>
                  )}
                </div>
              </label>
            ))}
            {allBags.length === 0 && (
              <p className="text-sm text-[var(--muted)]">No bags available.</p>
            )}
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">
            Selected {selected.size} · auto weight {autoWeight} kg
          </p>
        </Card>

        <Card>
          <h2 className="mb-3 font-display text-lg">Assignment details</h2>
          <div className="grid gap-3">
            <Select
              label="Transport mode"
              value={form.mode}
              onChange={(e) => setForm({ ...form, mode: e.target.value })}
            >
              {Object.entries(TRANSPORT_MODE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            <Select
              label="Carrier / carry person / agent"
              value={form.carrierId}
              onChange={(e) => onCarrierChange(e.target.value)}
            >
              <option value="">—</option>
              {carriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.carryRatePerKg != null ? ` (₹${c.carryRatePerKg}/kg)` : ""}
                </option>
              ))}
            </Select>
            <Input
              label="Or carrier name (free text)"
              value={form.carrierName}
              onChange={(e) => setForm({ ...form, carrierName: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Assigned date"
                type="date"
                value={form.assignedDate}
                onChange={(e) => setForm({ ...form, assignedDate: e.target.value })}
              />
              <Input
                label="Departure"
                type="date"
                value={form.departureDate}
                onChange={(e) => setForm({ ...form, departureDate: e.target.value })}
              />
              <Input
                label="Arrival (Bangkok / dest)"
                type="date"
                value={form.arrivalDate}
                onChange={(e) => setForm({ ...form, arrivalDate: e.target.value })}
              />
              <Input
                label="Tracking ref"
                value={form.trackingRef}
                onChange={(e) => setForm({ ...form, trackingRef: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Rate / kg"
                type="number"
                step="0.01"
                value={form.ratePerKg}
                onChange={(e) => setForm({ ...form, ratePerKg: e.target.value })}
              />
              <Input
                label="Total weight kg"
                type="number"
                step="0.01"
                placeholder={String(autoWeight || "")}
                value={form.totalWeightKg}
                onChange={(e) => setForm({ ...form, totalWeightKg: e.target.value })}
              />
              <Select
                label="Currency"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                <option value="INR">INR</option>
                <option value="THB">THB</option>
              </Select>
            </div>

            {payable > 0 && (
              <div className="rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-sm">
                Calculated payable:{" "}
                <strong>
                  {formatMoney(payable, form.currency as "INR" | "THB")}
                </strong>{" "}
                ({weight} kg × {rate})
              </div>
            )}

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.syncToLedger}
                onChange={(e) =>
                  setForm({ ...form, syncToLedger: e.target.checked })
                }
              />
              <span>
                Sync this payment to the carrier&apos;s ledger now?
                <span className="block text-xs text-[var(--muted)]">
                  Creates a &quot;You got&quot; entry so you don&apos;t forget to pay the
                  carry person / agent.
                </span>
              </span>
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.markInTransit}
                onChange={(e) =>
                  setForm({ ...form, markInTransit: e.target.checked })
                }
              />
              Mark bags as in transit
            </label>

            <Textarea
              label="Notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />

            <Button onClick={submit} disabled={saving || selected.size === 0}>
              {saving ? "Saving…" : "Assign transport"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
