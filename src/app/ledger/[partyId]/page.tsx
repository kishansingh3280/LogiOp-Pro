"use client";

import { useEffect, useMemo, useState, use } from "react";
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
import {
  formatMoney,
  formatBalanceLabel,
  computeBalance,
  PARTY_TYPE_LABELS,
  directionLabel,
} from "@/lib/utils";
import { format } from "date-fns";
import { Paperclip } from "lucide-react";

type Attachment = {
  id: string;
  fileName: string;
  filePath: string;
};

type Entry = {
  id: string;
  direction: "YOU_GAVE" | "YOU_GOT";
  amount: number;
  currency: "INR" | "THB";
  description: string | null;
  entryDate: string;
  fxRate: number | null;
  fxAmount: number | null;
  fxCurrency: "INR" | "THB" | null;
  isAutoSynced: boolean;
  attachments: Attachment[];
};

type Party = {
  id: string;
  name: string;
  type: string;
  exchangeRate: number | null;
  quoteMode: string;
  defaultCurrency: "INR" | "THB";
  ledgerEntries: Entry[];
};

export default function PartyLedgerPage({
  params,
}: {
  params: Promise<{ partyId: string }>;
}) {
  const { partyId } = use(params);
  const [party, setParty] = useState<Party | null>(null);
  const [open, setOpen] = useState(false);
  const [attachFor, setAttachFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    direction: "YOU_GAVE",
    amount: "",
    currency: "INR",
    description: "",
    entryDate: new Date().toISOString().slice(0, 10),
    fxRate: "",
    fxAmount: "",
    fxCurrency: "",
  });

  const load = () =>
    fetch(`/api/parties/${partyId}`)
      .then((r) => r.json())
      .then((p) => {
        setParty(p);
        setForm((f) => ({
          ...f,
          currency: p.defaultCurrency || "INR",
          fxRate: p.exchangeRate != null ? String(p.exchangeRate) : "",
        }));
      });

  useEffect(() => {
    load();
  }, [partyId]);

  const balances = useMemo(() => {
    const map: Record<string, { gave: number; got: number }> = {
      INR: { gave: 0, got: 0 },
      THB: { gave: 0, got: 0 },
    };
    for (const e of party?.ledgerEntries || []) {
      if (e.direction === "YOU_GAVE") map[e.currency].gave += e.amount;
      else map[e.currency].got += e.amount;
    }
    return map;
  }, [party]);

  async function saveEntry() {
    setSaving(true);
    await fetch("/api/ledger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partyId,
        direction: form.direction,
        amount: Number(form.amount),
        currency: form.currency,
        description: form.description,
        entryDate: form.entryDate,
        fxRate: form.fxRate ? Number(form.fxRate) : null,
        fxAmount: form.fxAmount ? Number(form.fxAmount) : null,
        fxCurrency: form.fxCurrency || null,
      }),
    });
    setSaving(false);
    setOpen(false);
    setForm((f) => ({
      ...f,
      amount: "",
      description: "",
      fxAmount: "",
      entryDate: new Date().toISOString().slice(0, 10),
    }));
    load();
  }

  async function uploadBill(entryId: string, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    await fetch(`/api/ledger/${entryId}/attachments`, { method: "POST", body: fd });
    setAttachFor(null);
    load();
  }

  async function deleteEntry(id: string) {
    if (!confirm("Delete this ledger entry?")) return;
    await fetch(`/api/ledger/${id}`, { method: "DELETE" });
    load();
  }

  if (!party) return <div className="text-[var(--muted)]">Loading khata…</div>;

  const entries = [...(party.ledgerEntries || [])].sort(
    (a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
  );

  return (
    <div>
      <PageHeader
        title={party.name}
        subtitle={`${PARTY_TYPE_LABELS[party.type] || party.type}${
          party.exchangeRate != null
            ? ` · Quoted FX ${party.exchangeRate} ${
                party.quoteMode === "INR_PER_THB" ? "₹/฿" : "฿/₹"
              }`
            : ""
        }`}
        actions={
          <>
            <Link href="/ledger">
              <Button variant="secondary">All balances</Button>
            </Link>
            <Button onClick={() => setOpen(true)}>Add entry</Button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {(["INR", "THB"] as const).map((c) => {
          const bal = computeBalance(balances[c].gave, balances[c].got);
          return (
            <Card key={c}>
              <div className="text-sm text-[var(--muted)]">{c} balance</div>
              <div
                className={`mt-1 font-display text-2xl ${
                  c === "INR" ? "money-inr" : "money-thb"
                }`}
              >
                {formatBalanceLabel(bal, c)}
              </div>
              <div className="mt-2 flex gap-4 text-xs text-[var(--muted)]">
                <span>Gave {formatMoney(balances[c].gave, c)}</span>
                <span>Got {formatMoney(balances[c].got, c)}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {entries.length === 0 ? (
        <EmptyState
          title="No entries yet"
          hint="Record advances, payments, FX settlements and agent fees."
        />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="data">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Description</th>
                <th>FX</th>
                <th>Bills</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap">
                    {format(new Date(e.entryDate), "dd MMM yyyy")}
                    {e.isAutoSynced && (
                      <div>
                        <Badge tone="info">Auto-synced</Badge>
                      </div>
                    )}
                  </td>
                  <td>
                    <Badge tone={e.direction === "YOU_GAVE" ? "ok" : "warn"}>
                      {directionLabel(e.direction)}
                    </Badge>
                  </td>
                  <td className={e.currency === "INR" ? "money-inr" : "money-thb"}>
                    {formatMoney(e.amount, e.currency)}
                  </td>
                  <td className="max-w-xs">{e.description || "—"}</td>
                  <td className="text-xs text-[var(--muted)]">
                    {e.fxRate != null ? (
                      <>
                        Rate {e.fxRate}
                        {e.fxAmount != null && e.fxCurrency && (
                          <>
                            <br />
                            ≈ {formatMoney(e.fxAmount, e.fxCurrency)}
                          </>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <div className="flex flex-col gap-1">
                      {e.attachments.map((a) => (
                        <a
                          key={a.id}
                          href={a.filePath}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[var(--accent)] hover:underline"
                        >
                          {a.fileName}
                        </a>
                      ))}
                      <button
                        className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--accent)]"
                        onClick={() => setAttachFor(e.id)}
                      >
                        <Paperclip size={12} /> Attach
                      </button>
                    </div>
                  </td>
                  <td>
                    <button
                      className="text-xs text-red-600"
                      onClick={() => deleteEntry(e.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add ledger entry" wide>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Direction"
            value={form.direction}
            onChange={(e) => setForm({ ...form, direction: e.target.value })}
          >
            <option value="YOU_GAVE">You gave (advance / receivable)</option>
            <option value="YOU_GOT">You got (payment in / payable)</option>
          </Select>
          <Input
            label="Date"
            type="date"
            value={form.entryDate}
            onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
          />
          <Input
            label="Amount *"
            type="number"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <Select
            label="Currency"
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          >
            <option value="INR">INR (₹)</option>
            <option value="THB">THB (฿)</option>
          </Select>
          <Input
            label="FX rate (optional)"
            type="number"
            step="0.01"
            value={form.fxRate}
            onChange={(e) => setForm({ ...form, fxRate: e.target.value })}
            placeholder="Customer quoted rate"
          />
          <Input
            label="Converted amount (optional)"
            type="number"
            step="0.01"
            value={form.fxAmount}
            onChange={(e) => setForm({ ...form, fxAmount: e.target.value })}
          />
          <Select
            label="Converted currency"
            value={form.fxCurrency}
            onChange={(e) => setForm({ ...form, fxCurrency: e.target.value })}
          >
            <option value="">—</option>
            <option value="INR">INR</option>
            <option value="THB">THB</option>
          </Select>
          <div className="sm:col-span-2">
            <Textarea
              label="Description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Credit advance against goods / THB received in Bangkok bank"
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={saveEntry} disabled={!form.amount || saving}>
            {saving ? "Saving…" : "Save entry"}
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!attachFor}
        onClose={() => setAttachFor(null)}
        title="Attach bill / receipt"
      >
        <Input
          label="Choose file"
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && attachFor) uploadBill(attachFor, file);
          }}
        />
        <p className="mt-2 text-xs text-[var(--muted)]">
          PDF or image bills can be attached to every ledger entry.
        </p>
      </Modal>
    </div>
  );
}
