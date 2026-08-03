"use client";

import { useEffect, useState } from "react";
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
import { apiGet, apiPost } from "@/lib/client-api";

type Warehouse = { id: string; name: string; city: string };
type Party = { id: string; name: string; type: string };

type BagDraft = {
  bagNumber: string;
  weightKg: string;
  description: string;
  contents: string;
  customerId: string;
};

export default function NewShipmentPage() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bagCount, setBagCount] = useState("25");
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
    defaultCustomerId: "",
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

  function generateBagRows(count: number) {
    const rows: BagDraft[] = Array.from({ length: count }, (_, i) => ({
      bagNumber: String(i + 1).padStart(3, "0"),
      weightKg: "",
      description: "",
      contents: "",
      customerId: form.defaultCustomerId,
    }));
    setBags(rows);
    setShowDetails(true);
  }

  async function submit() {
    setSaving(true);
    const count = Number(bagCount) || 0;
    try {
      const data = await apiPost<{ id: string }>("/api/shipments", {
        ...form,
        bagCount: count,
        defaultCustomerId: form.defaultCustomerId || null,
        bags: showDetails
          ? bags.map((b) => ({
              bagNumber: b.bagNumber,
              weightKg: b.weightKg ? Number(b.weightKg) : null,
              description: b.description || null,
              contents: b.contents || null,
              customerId: b.customerId || form.defaultCustomerId || null,
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

  const customers = parties.filter(
    (p) => p.type === "CUSTOMER_IN" || p.type === "CUSTOMER_TH"
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
        subtitle="Create a lot, generate bags, optionally fill bag details"
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
            onChange={(e) => setForm({ ...form, originWarehouseId: e.target.value })}
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
            onChange={(e) => setForm({ ...form, destWarehouseId: e.target.value })}
          >
            <option value="">—</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.city})
              </option>
            ))}
          </Select>
          <Select
            label="Default customer (optional)"
            value={form.defaultCustomerId}
            onChange={(e) => setForm({ ...form, defaultCustomerId: e.target.value })}
          >
            <option value="">—</option>
            {customers.map((c) => (
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

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            type="button"
            onClick={() => generateBagRows(Number(bagCount) || 0)}
          >
            Fill optional bag details
          </Button>
          <span className="self-center text-xs text-[var(--muted)]">
            Bag details are optional — you can create empty bags and edit later.
          </span>
        </div>
      </Card>

      {showDetails && (
        <Card className="mb-6 overflow-x-auto p-0">
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
                <th>Customer</th>
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
                      className="w-full min-w-[120px] rounded border border-[var(--line)] px-2 py-1"
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
                      className="w-full min-w-[120px] rounded border border-[var(--line)] px-2 py-1"
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
                      className="rounded border border-[var(--line)] px-2 py-1"
                      value={b.customerId}
                      onChange={(e) => {
                        const next = [...bags];
                        next[i] = { ...b, customerId: e.target.value };
                        setBags(next);
                      }}
                    >
                      <option value="">—</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        <Button onClick={submit} disabled={!form.lotNumber || !bagCount || saving}>
          {saving ? "Creating…" : `Create shipment with ${bagCount || 0} bags`}
        </Button>
      </div>
    </div>
  );
}
