"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import {
  DELIVER_TO_PARTY_TYPES,
  SHIPMENT_PARTY_TYPES,
  formatMoney,
} from "@/lib/utils";
import { apiGet, apiPost } from "@/lib/client-api";

type Warehouse = { id: string; name: string; city: string };
type Party = { id: string; name: string; type: string };

type BagDraft = {
  bagNumber: string;
  weightKg: string;
  description: string;
  contents: string;
  /** Deliver-to end customer (not the goods owner) */
  customerId: string;
  deliveryNotes: string;
};

export default function NewShipmentPage() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bagCount, setBagCount] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [bags, setBags] = useState<BagDraft[]>([]);
  const [form, setForm] = useState({
    lotNumber: "",
    batchNumber: "",
    direction: "IN_TO_TH",
    originWarehouseId: "",
    destWarehouseId: "",
    shipDate: new Date().toISOString().slice(0, 10),
    notes: "",
    /** "" = not chosen; "__NONE__" = no owner; else party id */
    ownerPartyId: "",
    shippingRatePerKg: "",
    shippingCurrency: "INR" as "INR" | "THB",
  });

  useEffect(() => {
    Promise.all([
      apiGet<Warehouse[]>("/api/warehouses"),
      apiGet<Party[]>("/api/parties"),
    ])
      .then(([w, p]) => {
        setWarehouses(w);
        setParties(p);
        setLoadError(null);
        const delhi = w.find((x) => x.city === "Delhi");
        const bkk = w.find((x) => x.city === "Bangkok");
        setForm((f) => ({
          ...f,
          originWarehouseId: delhi?.id || "",
          destWarehouseId: bkk?.id || "",
          lotNumber: `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
            Math.random() * 900 + 100
          )}`,
        }));
      })
      .catch((e) =>
        setLoadError(e instanceof Error ? e.message : "Failed to load")
      );
  }, []);

  function resolveOwnerId(raw: string): string | null {
    if (!raw || raw === "__NONE__") return null;
    return raw;
  }

  function generateBagRows(count: number) {
    if (count < 1) {
      alert("Enter how many bags first.");
      return;
    }
    const rows: BagDraft[] = Array.from({ length: count }, (_, i) => ({
      bagNumber: String(i + 1).padStart(3, "0"),
      weightKg: "",
      description: "",
      contents: "",
      customerId: "",
      deliveryNotes: "",
    }));
    setBags(rows);
    setShowDetails(true);
  }

  const totalWeight = useMemo(
    () =>
      bags.reduce((sum, b) => {
        const w = Number(b.weightKg);
        return sum + (Number.isFinite(w) && w > 0 ? w : 0);
      }, 0),
    [bags]
  );

  const shippingTotal = useMemo(() => {
    const rate = Number(form.shippingRatePerKg);
    if (!rate || rate <= 0 || totalWeight <= 0) return null;
    return rate * totalWeight;
  }, [form.shippingRatePerKg, totalWeight]);

  async function submit() {
    if (!form.ownerPartyId) {
      alert("Select goods owner / billing customer (or No customer).");
      return;
    }
    const count = Number(bagCount) || 0;
    if (count < 1) {
      alert("Enter how many bags you want.");
      return;
    }
    setSaving(true);
    const ownerPartyId = resolveOwnerId(form.ownerPartyId);
    try {
      const data = await apiPost<{ id: string }>("/api/shipments", {
        lotNumber: form.lotNumber,
        batchNumber: form.batchNumber,
        direction: form.direction,
        originWarehouseId: form.originWarehouseId,
        destWarehouseId: form.destWarehouseId,
        shipDate: form.shipDate,
        notes: form.notes,
        ownerPartyId,
        bagCount: count,
        shippingRatePerKg: form.shippingRatePerKg
          ? Number(form.shippingRatePerKg)
          : null,
        shippingCurrency: form.shippingCurrency,
        shippingChargeTotal: shippingTotal,
        bags: showDetails
          ? bags.map((b) => ({
              bagNumber: b.bagNumber,
              weightKg: b.weightKg ? Number(b.weightKg) : null,
              description: b.description || null,
              contents: b.contents || null,
              customerId: b.customerId || null,
              deliveryNotes: b.deliveryNotes || null,
            }))
          : [],
      });
      router.push(`/shipments/${data.id}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to create shipment");
    } finally {
      setSaving(false);
    }
  }

  const owners = parties.filter((p) =>
    (SHIPMENT_PARTY_TYPES as readonly string[]).includes(p.type)
  );
  const deliverTo = parties.filter((p) =>
    (DELIVER_TO_PARTY_TYPES as readonly string[]).includes(p.type)
  );

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
        title="New shipment"
        subtitle="Owner pays shipping · each bag can deliver to a different end customer (Lalamove-ready)"
        actions={
          <Link href="/shipments">
            <Button variant="secondary">Cancel</Button>
          </Link>
        }
      />

      <Card className="mb-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Lot number *"
            value={form.lotNumber}
            onChange={(e) => setForm({ ...form, lotNumber: e.target.value })}
          />
          <Input
            label="Batch number"
            value={form.batchNumber}
            onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
          />
          <Select
            label="Direction"
            value={form.direction}
            onChange={(e) => setForm({ ...form, direction: e.target.value })}
          >
            <option value="IN_TO_TH">India → Thailand</option>
            <option value="TH_TO_IN">Thailand → India</option>
          </Select>
          <Input
            label="Ship date"
            type="date"
            value={form.shipDate}
            onChange={(e) => setForm({ ...form, shipDate: e.target.value })}
          />
          <Select
            label="Origin warehouse"
            value={form.originWarehouseId}
            onChange={(e) =>
              setForm({ ...form, originWarehouseId: e.target.value })
            }
          >
            <option value="">—</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.city})
              </option>
            ))}
          </Select>
          <Select
            label="Destination warehouse"
            value={form.destWarehouseId}
            onChange={(e) =>
              setForm({ ...form, destWarehouseId: e.target.value })
            }
          >
            <option value="">—</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.city})
              </option>
            ))}
          </Select>
          <Select
            label="Goods owner / billing customer *"
            value={form.ownerPartyId}
            onChange={(e) =>
              setForm({ ...form, ownerPartyId: e.target.value })
            }
          >
            <option value="" disabled>
              Select owner…
            </option>
            <option value="__NONE__">No customer</option>
            {owners.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input
            label="Number of bags *"
            type="number"
            min={1}
            value={bagCount}
            onChange={(e) => setBagCount(e.target.value)}
            placeholder="e.g. 10"
          />
          <div className="sm:col-span-2">
            <Textarea
              label="Notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">
          Owner = who the goods belong to and who you bill (e.g. Lalit Ji). In bag
          details below, set who each bag should be delivered to among their
          customers.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            type="button"
            onClick={() => generateBagRows(Number(bagCount) || 0)}
          >
            Fill bag details
          </Button>
          <span className="self-center text-xs text-[var(--muted)]">
            Weight, deliver-to customer, and delivery notes per bag.
          </span>
        </div>
      </Card>

      {showDetails && (
        <>
          <Card className="mb-4 overflow-x-auto p-0">
            <div className="border-b border-[var(--line)] px-4 py-3 font-display text-lg">
              Bag details ({bags.length})
            </div>
            <table className="data">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Weight kg</th>
                  <th>Description</th>
                  <th>Contents</th>
                  <th>Deliver to (end customer)</th>
                  <th>Delivery note</th>
                </tr>
              </thead>
              <tbody>
                {bags.map((b, i) => (
                  <tr key={i}>
                    <td>
                      <input
                        className="w-20 rounded border border-[var(--line)] px-2 py-1"
                        value={b.bagNumber}
                        onChange={(e) => {
                          const next = [...bags];
                          next[i] = { ...b, bagNumber: e.target.value };
                          setBags(next);
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className="w-24 rounded border border-[var(--line)] px-2 py-1"
                        value={b.weightKg}
                        onChange={(e) => {
                          const next = [...bags];
                          next[i] = { ...b, weightKg: e.target.value };
                          setBags(next);
                        }}
                      />
                    </td>
                    <td>
                      <input
                        className="w-full min-w-[100px] rounded border border-[var(--line)] px-2 py-1"
                        value={b.description}
                        onChange={(e) => {
                          const next = [...bags];
                          next[i] = { ...b, description: e.target.value };
                          setBags(next);
                        }}
                      />
                    </td>
                    <td>
                      <input
                        className="w-full min-w-[100px] rounded border border-[var(--line)] px-2 py-1"
                        value={b.contents}
                        onChange={(e) => {
                          const next = [...bags];
                          next[i] = { ...b, contents: e.target.value };
                          setBags(next);
                        }}
                      />
                    </td>
                    <td>
                      <select
                        className="min-w-[140px] rounded border border-[var(--line)] px-2 py-1"
                        value={b.customerId}
                        onChange={(e) => {
                          const next = [...bags];
                          next[i] = { ...b, customerId: e.target.value };
                          setBags(next);
                        }}
                      >
                        <option value="">Select deliver-to…</option>
                        {deliverTo.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className="w-full min-w-[120px] rounded border border-[var(--line)] px-2 py-1"
                        placeholder="Address / phone (Lalamove later)"
                        value={b.deliveryNotes}
                        onChange={(e) => {
                          const next = [...bags];
                          next[i] = { ...b, deliveryNotes: e.target.value };
                          setBags(next);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] bg-[var(--bg)] px-4 py-3 text-sm">
              <span className="text-[var(--muted)]">
                Bags with weight:{" "}
                {bags.filter((b) => Number(b.weightKg) > 0).length} / {bags.length}
              </span>
              <span className="font-display text-lg">
                Total weight:{" "}
                <strong>
                  {totalWeight.toLocaleString("en-IN", {
                    maximumFractionDigits: 2,
                  })}{" "}
                  kg
                </strong>
              </span>
            </div>
          </Card>

          <Card className="mb-6">
            <h2 className="font-display text-lg">Shipping charges (bill to owner)</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Rate × total weight. On create, this amount is saved as an invoice
              and posted to the owner&apos;s ledger (You gave).
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Input
                label="Rate per kg"
                type="number"
                step="0.01"
                value={form.shippingRatePerKg}
                onChange={(e) =>
                  setForm({ ...form, shippingRatePerKg: e.target.value })
                }
                placeholder="e.g. 200"
              />
              <Select
                label="Currency"
                value={form.shippingCurrency}
                onChange={(e) =>
                  setForm({
                    ...form,
                    shippingCurrency: e.target.value as "INR" | "THB",
                  })
                }
              >
                <option value="INR">INR (₹)</option>
                <option value="THB">THB (฿)</option>
              </Select>
              <div>
                <div className="mb-1.5 text-sm text-[var(--muted)]">
                  Shipping total
                </div>
                <div className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 font-display text-lg">
                  {shippingTotal != null
                    ? formatMoney(shippingTotal, form.shippingCurrency)
                    : "—"}
                </div>
              </div>
            </div>
          </Card>
        </>
      )}

      <div className="flex justify-end gap-2">
        <Button
          onClick={submit}
          disabled={
            !form.lotNumber ||
            !bagCount ||
            Number(bagCount) < 1 ||
            !form.ownerPartyId ||
            saving
          }
        >
          {saving
            ? "Creating…"
            : `Create shipment with ${bagCount || "…"} bags`}
        </Button>
      </div>
    </div>
  );
}
