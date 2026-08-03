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
import { Plus, Trash2 } from "lucide-react";

type Warehouse = { id: string; name: string; city: string };
type Party = {
  id: string;
  name: string;
  type: string;
  carryRatePerKg?: number | null;
  carryRateCurrency?: "INR" | "THB";
  phone?: string | null;
  city?: string | null;
};

type ItemDraft = { name: string; quantity: string };

type BagDraft = {
  bagNumber: string;
  weightKg: string;
  description: string;
  items: ItemDraft[];
  /** Deliver-to end customer (not the goods owner) */
  customerId: string;
  /** Editable per-bag shipping; empty = auto from rate × weight */
  shippingCharge: string;
  shippingManual: boolean;
};

function emptyBag(n: number): BagDraft {
  return {
    bagNumber: String(n).padStart(3, "0"),
    weightKg: "",
    description: "",
    items: [{ name: "", quantity: "1" }],
    customerId: "",
    shippingCharge: "",
    shippingManual: false,
  };
}

export default function NewShipmentPage() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [catalog, setCatalog] = useState<Array<{ id: string; name: string }>>(
    []
  );
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
    ownerPartyId: "",
    shippingRatePerKg: "",
    shippingCurrency: "INR" as "INR" | "THB",
  });

  useEffect(() => {
    Promise.all([
      apiGet<Warehouse[]>("/api/warehouses"),
      apiGet<Party[]>("/api/parties"),
      apiGet<Array<{ id: string; name: string }>>("/api/items"),
    ])
      .then(([w, p, items]) => {
        setWarehouses(w);
        setParties(p);
        setCatalog(items);
        setLoadError(null);
        const delhi = w.find((x) => x.city === "Delhi");
        const bkk = w.find((x) => x.city === "Bangkok");
        setForm((f) => ({
          ...f,
          originWarehouseId: delhi?.id || "",
          destWarehouseId: bkk?.id || "",
          lotNumber: `LOT-${new Date()
            .toISOString()
            .slice(0, 10)
            .replace(/-/g, "")}-${Math.floor(Math.random() * 900 + 100)}`,
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

  function onOwnerChange(value: string) {
    const owner = parties.find((p) => p.id === value);
    setForm((f) => ({
      ...f,
      ownerPartyId: value,
      shippingRatePerKg:
        owner?.carryRatePerKg != null
          ? String(owner.carryRatePerKg)
          : f.shippingRatePerKg,
      shippingCurrency: owner?.carryRateCurrency || f.shippingCurrency,
    }));
    // Recalc non-manual bag charges when owner/rate changes
    setBags((prev) =>
      prev.map((b) => {
        if (b.shippingManual) return b;
        const w = Number(b.weightKg);
        const rate =
          owner?.carryRatePerKg != null
            ? owner.carryRatePerKg
            : Number(form.shippingRatePerKg);
        if (w > 0 && rate > 0) {
          return { ...b, shippingCharge: String(+(w * rate).toFixed(2)) };
        }
        return { ...b, shippingCharge: "" };
      })
    );
  }

  function generateBagRows(count: number) {
    if (count < 1) {
      alert("Enter how many bags first.");
      return;
    }
    setBags(Array.from({ length: count }, (_, i) => emptyBag(i + 1)));
    setShowDetails(true);
  }

  function updateBag(i: number, patch: Partial<BagDraft>) {
    setBags((prev) => {
      const next = [...prev];
      const bag = { ...next[i], ...patch };
      if (
        !bag.shippingManual &&
        (patch.weightKg !== undefined || patch.shippingManual === false)
      ) {
        const w = Number(bag.weightKg);
        const rate = Number(form.shippingRatePerKg);
        bag.shippingCharge =
          w > 0 && rate > 0 ? String(+(w * rate).toFixed(2)) : "";
      }
      next[i] = bag;
      return next;
    });
  }

  function onRateChange(rateStr: string) {
    setForm((f) => ({ ...f, shippingRatePerKg: rateStr }));
    const rate = Number(rateStr);
    setBags((prev) =>
      prev.map((b) => {
        if (b.shippingManual) return b;
        const w = Number(b.weightKg);
        return {
          ...b,
          shippingCharge:
            w > 0 && rate > 0 ? String(+(w * rate).toFixed(2)) : "",
        };
      })
    );
  }

  const totalWeight = useMemo(
    () =>
      bags.reduce((sum, b) => {
        const w = Number(b.weightKg);
        return sum + (Number.isFinite(w) && w > 0 ? w : 0);
      }, 0),
    [bags]
  );

  const shippingTotal = useMemo(
    () =>
      bags.reduce((sum, b) => {
        const c = Number(b.shippingCharge);
        return sum + (Number.isFinite(c) && c > 0 ? c : 0);
      }, 0),
    [bags]
  );

  const deliverToCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bags) {
      if (!b.customerId) continue;
      map.set(b.customerId, (map.get(b.customerId) || 0) + 1);
    }
    return map;
  }, [bags]);

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
        shippingChargeTotal: shippingTotal > 0 ? shippingTotal : null,
        bags: showDetails
          ? bags.map((b) => ({
              bagNumber: b.bagNumber,
              weightKg: b.weightKg ? Number(b.weightKg) : null,
              description: b.description || null,
              customerId: b.customerId || null,
              shippingCharge: b.shippingCharge
                ? Number(b.shippingCharge)
                : null,
              items: b.items
                .filter((it) => it.name.trim())
                .map((it) => ({
                  name: it.name.trim(),
                  quantity: Math.max(1, Number(it.quantity) || 1),
                })),
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
        subtitle="Owner pays shipping · assign each bag to an end customer (same customer can have many bags)"
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
            onChange={(e) => onOwnerChange(e.target.value)}
          >
            <option value="" disabled>
              Select owner…
            </option>
            <option value="__NONE__">No customer</option>
            {owners.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.carryRatePerKg != null
                  ? ` · ${c.carryRateCurrency === "THB" ? "฿" : "₹"}${c.carryRatePerKg}/kg`
                  : ""}
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
          Owner = who the goods belong to (e.g. Lalit Ji). Per bag, pick which of
          their end customers receives it — one customer may get several bags.
          Address/phone come from the party record (for Lalamove later).
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            type="button"
            onClick={() => generateBagRows(Number(bagCount) || 0)}
          >
            Fill bag details
          </Button>
        </div>
      </Card>

      {showDetails && (
        <>
          <Card className="mb-4 overflow-x-auto p-0">
            <div className="border-b border-[var(--line)] px-4 py-3 font-display text-lg">
              Bag details ({bags.length})
            </div>
            <div className="divide-y divide-[var(--line)]">
              {bags.map((b, i) => {
                const deliverName = deliverTo.find(
                  (c) => c.id === b.customerId
                )?.name;
                const sameCount = b.customerId
                  ? deliverToCounts.get(b.customerId) || 0
                  : 0;
                return (
                  <div key={i} className="grid gap-3 px-4 py-4 lg:grid-cols-12">
                    <div className="lg:col-span-1">
                      <label className="mb-1 block text-xs text-[var(--muted)]">
                        Bag #
                      </label>
                      <input
                        className="w-full rounded border border-[var(--line)] px-2 py-1.5 text-sm"
                        value={b.bagNumber}
                        onChange={(e) =>
                          updateBag(i, { bagNumber: e.target.value })
                        }
                      />
                    </div>
                    <div className="lg:col-span-1">
                      <label className="mb-1 block text-xs text-[var(--muted)]">
                        Weight kg
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full rounded border border-[var(--line)] px-2 py-1.5 text-sm"
                        value={b.weightKg}
                        onChange={(e) =>
                          updateBag(i, { weightKg: e.target.value })
                        }
                      />
                    </div>
                    <div className="lg:col-span-4">
                      <div className="mb-1 flex items-center justify-between">
                        <label className="text-xs text-[var(--muted)]">
                          Items (name + pcs)
                        </label>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs text-[var(--accent)]"
                          onClick={() =>
                            updateBag(i, {
                              items: [
                                ...b.items,
                                { name: "", quantity: "1" },
                              ],
                            })
                          }
                        >
                          <Plus size={12} /> Add item
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {b.items.map((it, j) => (
                          <div key={j} className="flex gap-1.5">
                            <input
                              className="min-w-0 flex-1 rounded border border-[var(--line)] px-2 py-1 text-sm"
                              placeholder="Item name"
                              list="shipment-catalog-items"
                              value={it.name}
                              onChange={(e) => {
                                const items = [...b.items];
                                items[j] = { ...it, name: e.target.value };
                                updateBag(i, { items });
                              }}
                            />
                            <input
                              type="number"
                              min={1}
                              className="w-16 rounded border border-[var(--line)] px-2 py-1 text-sm"
                              title="Pcs"
                              placeholder="Pcs"
                              value={it.quantity}
                              onChange={(e) => {
                                const items = [...b.items];
                                items[j] = {
                                  ...it,
                                  quantity: e.target.value,
                                };
                                updateBag(i, { items });
                              }}
                            />
                            <button
                              type="button"
                              className="rounded border border-[var(--line)] px-2 text-[var(--muted)] hover:text-red-600"
                              disabled={b.items.length <= 1}
                              onClick={() =>
                                updateBag(i, {
                                  items: b.items.filter((_, k) => k !== j),
                                })
                              }
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="lg:col-span-3">
                      <label className="mb-1 block text-xs text-[var(--muted)]">
                        Deliver to (end customer)
                      </label>
                      <select
                        className="w-full rounded border border-[var(--line)] px-2 py-1.5 text-sm"
                        value={b.customerId}
                        onChange={(e) =>
                          updateBag(i, { customerId: e.target.value })
                        }
                      >
                        <option value="">Select deliver-to…</option>
                        {deliverTo.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                            {c.city ? ` · ${c.city}` : ""}
                          </option>
                        ))}
                      </select>
                      {deliverName && sameCount > 1 && (
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {deliverName}: {sameCount} bags in this lot
                        </p>
                      )}
                    </div>
                    <div className="lg:col-span-3">
                      <label className="mb-1 block text-xs text-[var(--muted)]">
                        Shipping charge (this bag)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full rounded border border-[var(--line)] px-2 py-1.5 text-sm"
                        value={b.shippingCharge}
                        onChange={(e) =>
                          updateBag(i, {
                            shippingCharge: e.target.value,
                            shippingManual: true,
                          })
                        }
                        placeholder="Auto from rate × kg"
                      />
                      <button
                        type="button"
                        className="mt-1 text-xs text-[var(--accent)]"
                        onClick={() => {
                          const w = Number(b.weightKg);
                          const rate = Number(form.shippingRatePerKg);
                          updateBag(i, {
                            shippingManual: false,
                            shippingCharge:
                              w > 0 && rate > 0
                                ? String(+(w * rate).toFixed(2))
                                : "",
                          });
                        }}
                      >
                        Reset to rate × weight
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <datalist id="shipment-catalog-items">
              {catalog.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] bg-[var(--bg)] px-4 py-3 text-sm">
              <span className="text-[var(--muted)]">
                Bags with weight:{" "}
                {bags.filter((b) => Number(b.weightKg) > 0).length} /{" "}
                {bags.length}
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
            <h2 className="font-display text-lg">
              Shipping charges (bill to owner)
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Rate from the owner&apos;s party transportation charges — editable
              for this shipment. Each bag shows its own charge (rate × weight);
              override any bag for expensive items. Totals invoice + ledger on
              create.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Input
                label="Rate per kg"
                type="number"
                step="0.01"
                value={form.shippingRatePerKg}
                onChange={(e) => onRateChange(e.target.value)}
                placeholder="From party, editable"
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
                  Shipping total (all bags)
                </div>
                <div className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 font-display text-lg">
                  {shippingTotal > 0
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
