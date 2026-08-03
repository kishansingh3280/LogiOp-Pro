"use client";

import { useEffect, useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  Modal,
  Input,
  Select,
  Textarea,
  EmptyState,
  Badge,
} from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/client-api";

type CatalogItem = {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  defaultRate: number | null;
  currency: "INR" | "THB";
};

const emptyForm = {
  name: "",
  description: "",
  unit: "pcs",
  defaultRate: "",
  currency: "INR" as "INR" | "THB",
};

export default function ItemsPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");

  const load = () => apiGet<CatalogItem[]>("/api/items").then(setItems);

  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter(
    (i) =>
      !q ||
      i.name.toLowerCase().includes(q.toLowerCase()) ||
      (i.description || "").toLowerCase().includes(q.toLowerCase())
  );

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(item: CatalogItem) {
    setEditId(item.id);
    setForm({
      name: item.name,
      description: item.description || "",
      unit: item.unit || "pcs",
      defaultRate: item.defaultRate != null ? String(item.defaultRate) : "",
      currency: item.currency || "INR",
    });
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description || null,
      unit: form.unit || "pcs",
      defaultRate: form.defaultRate ? Number(form.defaultRate) : null,
      currency: form.currency,
    };
    try {
      if (editId) await apiPatch(`/api/items/${editId}`, payload);
      else await apiPost("/api/items", payload);
      setOpen(false);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this item from your catalog?")) return;
    try {
      await apiDelete(`/api/items/${id}`);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Items"
        subtitle="Catalog of goods you deal in — remembered for shipments & invoices (no stock control)"
        actions={<Button onClick={openCreate}>Add item</Button>}
      />

      <div className="mb-4">
        <Input
          placeholder="Search items…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No items yet"
          hint="Add items you ship often — bag details and invoices can reuse them."
        />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="data">
            <thead>
              <tr>
                <th>Item</th>
                <th>Unit</th>
                <th>Default rate</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="font-medium">{item.name}</div>
                    {item.description && (
                      <div className="text-xs text-[var(--muted)]">
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td>
                    <Badge tone="info">{item.unit}</Badge>
                  </td>
                  <td>
                    {item.defaultRate != null
                      ? formatMoney(item.defaultRate, item.currency)
                      : "—"}
                  </td>
                  <td className="space-x-3 whitespace-nowrap">
                    <button
                      className="text-sm text-[var(--accent)]"
                      onClick={() => openEdit(item)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-sm text-red-600"
                      onClick={() => remove(item.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? "Edit item" : "Add item"}
      >
        <div className="grid gap-3">
          <Input
            label="Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Gift boxes"
          />
          <Textarea
            label="Description"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Unit"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="pcs / kg / pair"
            />
            <Input
              label="Default rate (optional)"
              type="number"
              step="0.01"
              value={form.defaultRate}
              onChange={(e) => setForm({ ...form, defaultRate: e.target.value })}
            />
          </div>
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
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!form.name.trim() || saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
