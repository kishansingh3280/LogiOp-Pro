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
import { formatMoney, SHIPMENT_PARTY_TYPES } from "@/lib/utils";
import { apiGet, apiPost } from "@/lib/client-api";
import { Plus, Trash2 } from "lucide-react";

type Party = { id: string; name: string; type: string; defaultCurrency?: string };
type CatalogItem = {
  id: string;
  name: string;
  unit: string;
  defaultRate: number | null;
  saleRate?: number | null;
  currency: "INR" | "THB";
};

type Line = {
  catalogItemId: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
};

export default function NewInvoicePage() {
  const router = useRouter();
  const [parties, setParties] = useState<Party[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    partyId: "",
    currency: "INR" as "INR" | "THB",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    description: "",
    notes: "",
    status: "DRAFT",
  });
  const [lines, setLines] = useState<Line[]>([
    {
      catalogItemId: "",
      description: "",
      quantity: "1",
      unit: "pcs",
      unitPrice: "",
    },
  ]);

  useEffect(() => {
    Promise.all([
      apiGet<Party[]>("/api/parties"),
      apiGet<CatalogItem[]>("/api/items"),
    ]).then(([p, items]) => {
      setParties(p);
      setCatalog(items);
    });
  }, []);

  const customers = parties.filter((p) =>
    (SHIPMENT_PARTY_TYPES as readonly string[]).includes(p.type)
  );

  const total = useMemo(
    () =>
      lines.reduce((s, l) => {
        const q = Number(l.quantity) || 0;
        const p = Number(l.unitPrice) || 0;
        return s + q * p;
      }, 0),
    [lines]
  );

  function pickCatalog(i: number, itemId: string) {
    const item = catalog.find((c) => c.id === itemId);
    setLines((prev) => {
      const next = [...prev];
      next[i] = {
        ...next[i],
        catalogItemId: itemId,
        description: item?.name || next[i].description,
        unit: item?.unit || next[i].unit,
        unitPrice:
          item?.saleRate != null
            ? String(item.saleRate)
            : item?.defaultRate != null
              ? String(item.defaultRate)
              : next[i].unitPrice,
      };
      return next;
    });
    if (item?.currency) {
      setForm((f) => ({ ...f, currency: item.currency }));
    }
  }

  async function submit() {
    if (!form.partyId) {
      alert("Select a customer");
      return;
    }
    const prepared = lines
      .filter((l) => l.description.trim())
      .map((l) => ({
        catalogItemId: l.catalogItemId || null,
        description: l.description.trim(),
        quantity: Number(l.quantity) || 1,
        unit: l.unit || "pcs",
        unitPrice: Number(l.unitPrice) || 0,
      }));
    if (prepared.length === 0) {
      alert("Add at least one line");
      return;
    }
    setSaving(true);
    try {
      const inv = await apiPost<{ id: string }>("/api/invoices", {
        ...form,
        dueDate: form.dueDate || null,
        lines: prepared,
      });
      router.push(`/billing/${inv.id}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New invoice"
        subtitle="Bill a customer — lines sync to your Items catalog"
        actions={
          <Link href="/billing">
            <Button variant="secondary">Back</Button>
          </Link>
        }
      />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Customer *"
            value={form.partyId}
            onChange={(e) => setForm({ ...form, partyId: e.target.value })}
          >
            <option value="">Select…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            label="Currency"
            value={form.currency}
            onChange={(e) =>
              setForm({ ...form, currency: e.target.value as "INR" | "THB" })
            }
          >
            <option value="INR">INR</option>
            <option value="THB">THB</option>
          </Select>
          <Input
            label="Issue date"
            type="date"
            value={form.issueDate}
            onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
          />
          <Input
            label="Due date"
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
          <div className="sm:col-span-2">
            <Input
              label="Title / description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="e.g. August shipping"
            />
          </div>
          <div className="sm:col-span-2">
            <Textarea
              label="Notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg">Line items</h2>
          <Button
            variant="secondary"
            type="button"
            onClick={() =>
              setLines((prev) => [
                ...prev,
                {
                  catalogItemId: "",
                  description: "",
                  quantity: "1",
                  unit: "pcs",
                  unitPrice: "",
                },
              ])
            }
          >
            <Plus size={14} /> Add line
          </Button>
        </div>
        <div className="space-y-3">
          {lines.map((l, i) => (
            <div
              key={i}
              className="grid gap-2 rounded-lg border border-[var(--line)] p-3 sm:grid-cols-12"
            >
              <div className="sm:col-span-3">
                <Select
                  label="From catalog"
                  value={l.catalogItemId}
                  onChange={(e) => pickCatalog(i, e.target.value)}
                >
                  <option value="">Custom / type below</option>
                  {catalog.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="sm:col-span-3">
                <Input
                  label="Description *"
                  value={l.description}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i] = { ...l, description: e.target.value };
                    setLines(next);
                  }}
                  list="catalog-names"
                />
              </div>
              <div className="sm:col-span-1">
                <Input
                  label="Qty"
                  type="number"
                  value={l.quantity}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i] = { ...l, quantity: e.target.value };
                    setLines(next);
                  }}
                />
              </div>
              <div className="sm:col-span-1">
                <Input
                  label="Unit"
                  value={l.unit}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i] = { ...l, unit: e.target.value };
                    setLines(next);
                  }}
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  label="Rate"
                  type="number"
                  step="0.01"
                  value={l.unitPrice}
                  onChange={(e) => {
                    const next = [...lines];
                    next[i] = { ...l, unitPrice: e.target.value };
                    setLines(next);
                  }}
                />
              </div>
              <div className="flex items-end justify-between gap-2 sm:col-span-2">
                <div>
                  <div className="mb-1.5 text-sm text-[var(--muted)]">Amount</div>
                  <div className="py-2 font-medium">
                    {formatMoney(
                      (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
                      form.currency
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="mb-1 rounded border border-[var(--line)] p-2 text-[var(--muted)] hover:text-red-600"
                  disabled={lines.length <= 1}
                  onClick={() => setLines(lines.filter((_, j) => j !== i))}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <datalist id="catalog-names">
          {catalog.map((c) => (
            <option key={c.id} value={c.name} />
          ))}
        </datalist>
        <div className="mt-4 flex justify-end border-t border-[var(--line)] pt-3 font-display text-xl">
          Total {formatMoney(total, form.currency)}
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button onClick={submit} disabled={saving || !form.partyId}>
          {saving ? "Saving…" : "Create invoice"}
        </Button>
      </div>
    </div>
  );
}
