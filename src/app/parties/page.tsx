"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Button,
  Modal,
  Input,
  Select,
  Textarea,
  Badge,
  EmptyState,
} from "@/components/ui";
import { PARTY_TYPE_LABELS, PARTY_TYPE_DESCRIPTIONS } from "@/lib/utils";
import { apiGet, apiPost, apiPatch } from "@/lib/client-api";

type Party = {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  email?: string | null;
  city: string | null;
  country: string | null;
  notes?: string | null;
  exchangeRate: number | null;
  quoteMode: string;
  defaultCurrency: string;
  carryRatePerKg: number | null;
};

const emptyForm = {
  name: "",
  type: "LOGISTIC_CUSTOMER",
  phone: "",
  email: "",
  city: "",
  country: "",
  notes: "",
  exchangeRate: "",
  quoteMode: "INR_PER_THB",
  defaultCurrency: "INR",
  carryRatePerKg: "",
};

export default function PartiesPage() {
  const [parties, setParties] = useState<Party[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () =>
    apiGet<Party[]>("/api/parties").then(setParties);

  useEffect(() => {
    load();
  }, []);

  const filtered =
    filter === "ALL" ? parties : parties.filter((p) => p.type === filter);

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(p: Party) {
    setEditId(p.id);
    setForm({
      name: p.name,
      type: p.type,
      phone: p.phone || "",
      email: p.email || "",
      city: p.city || "",
      country: p.country || "",
      notes: p.notes || "",
      exchangeRate: p.exchangeRate != null ? String(p.exchangeRate) : "",
      quoteMode: p.quoteMode || "INR_PER_THB",
      defaultCurrency: p.defaultCurrency || "INR",
      carryRatePerKg: p.carryRatePerKg != null ? String(p.carryRatePerKg) : "",
    });
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    const payload = {
      ...form,
      exchangeRate: form.exchangeRate ? Number(form.exchangeRate) : null,
      carryRatePerKg: form.carryRatePerKg ? Number(form.carryRatePerKg) : null,
    };
    try {
      if (editId) {
        await apiPatch(`/api/parties/${editId}`, payload);
      } else {
        await apiPost("/api/parties", payload);
      }
      setOpen(false);
      setEditId(null);
      setForm(emptyForm);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Parties"
        subtitle="Logistic customers, buyers, carriers, transporters & individuals"
        actions={<Button onClick={openCreate}>Add party</Button>}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {["ALL", ...Object.keys(PARTY_TYPE_LABELS)].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              filter === t
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--line)] bg-[var(--panel)] text-[var(--muted)]"
            }`}
          >
            {t === "ALL" ? "All" : PARTY_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No parties yet"
          hint="Add a logistic customer, buyer, carrier, transporter or individual."
        />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Location</th>
                <th>Quoted FX</th>
                <th>Default</th>
                <th>Carry / transport rate</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="font-medium">{p.name}</div>
                    {p.phone && (
                      <div className="text-xs text-[var(--muted)]">{p.phone}</div>
                    )}
                  </td>
                  <td>
                    <Badge tone="accent">{PARTY_TYPE_LABELS[p.type] || p.type}</Badge>
                  </td>
                  <td>
                    {[p.city, p.country].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td>
                    {p.exchangeRate != null ? (
                      <span>
                        {p.exchangeRate}{" "}
                        <span className="text-xs text-[var(--muted)]">
                          {p.quoteMode === "INR_PER_THB" ? "₹ / ฿" : "฿ / ₹"}
                        </span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{p.defaultCurrency}</td>
                  <td>
                    {p.carryRatePerKg != null ? `₹${p.carryRatePerKg}/kg` : "—"}
                  </td>
                  <td className="space-x-3 whitespace-nowrap">
                    <button
                      className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
                      onClick={() => openEdit(p)}
                    >
                      Edit
                    </button>
                    <Link
                      href={`/ledger/${p.id}`}
                      className="text-sm text-[var(--accent)] hover:underline"
                    >
                      Open khata
                    </Link>
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
        title={editId ? "Edit party" : "Add party"}
        wide
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Select
            label="Type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {Object.entries(PARTY_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <div className="sm:col-span-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--muted)]">
            {PARTY_TYPE_DESCRIPTIONS[form.type] || ""}
          </div>
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            label="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="City"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
          <Input
            label="Country"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
          />
          <Input
            label="Quoted exchange rate"
            type="number"
            step="0.01"
            value={form.exchangeRate}
            onChange={(e) => setForm({ ...form, exchangeRate: e.target.value })}
            placeholder="e.g. 2.45"
          />
          <Select
            label="Quote mode"
            value={form.quoteMode}
            onChange={(e) => setForm({ ...form, quoteMode: e.target.value })}
          >
            <option value="INR_PER_THB">INR per 1 THB (₹/฿)</option>
            <option value="THB_PER_INR">THB per 1 INR (฿/₹)</option>
          </Select>
          <Select
            label="Default currency"
            value={form.defaultCurrency}
            onChange={(e) => setForm({ ...form, defaultCurrency: e.target.value })}
          >
            <option value="INR">INR (₹)</option>
            <option value="THB">THB (฿)</option>
          </Select>
          <Input
            label={
              form.type === "TRANSPORTER" || form.type === "CARRIER"
                ? "Rate (₹/kg) — optional"
                : "Carry rate (₹/kg) — optional"
            }
            type="number"
            step="0.01"
            value={form.carryRatePerKg}
            onChange={(e) => setForm({ ...form, carryRatePerKg: e.target.value })}
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
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!form.name || saving}>
            {saving ? "Saving…" : editId ? "Update party" : "Save party"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
