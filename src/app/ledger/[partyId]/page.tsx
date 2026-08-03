"use client";

import { useEffect, useMemo, useState, use, Fragment } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Button,
  Modal,
  Input,
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
import { FileText, Paperclip } from "lucide-react";
import {
  apiGet,
  apiPost,
  apiDelete,
  apiPatch,
  uploadAttachment,
} from "@/lib/client-api";
import { LedgerStatementModal } from "@/components/LedgerStatementModal";

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
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  country?: string | null;
  exchangeRate: number | null;
  quoteMode: string;
  defaultCurrency: "INR" | "THB";
  booksSharedUntil?: string | null;
  ledgerEntries: Entry[];
};

function convertAmount(
  amount: number,
  from: "INR" | "THB",
  rate: number,
  quoteMode: string
): { to: "INR" | "THB"; value: number } {
  const inrPerThb = quoteMode === "THB_PER_INR" ? (rate === 0 ? 0 : 1 / rate) : rate;
  if (from === "THB") return { to: "INR", value: amount * inrPerThb };
  return { to: "THB", value: inrPerThb === 0 ? 0 : amount / inrPerThb };
}

export default function PartyLedgerPage({
  params,
}: {
  params: Promise<{ partyId: string }>;
}) {
  const { partyId } = use(params);
  const [party, setParty] = useState<Party | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [statementOpen, setStatementOpen] = useState(false);
  const [attachFor, setAttachFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingBill, setPendingBill] = useState<File | null>(null);
  const [saveAs, setSaveAs] = useState<"INR" | "THB" | null>(null);
  const [form, setForm] = useState({
    direction: "YOU_GAVE" as "YOU_GAVE" | "YOU_GOT",
    amount: "",
    currency: "INR" as "INR" | "THB",
    description: "",
    entryDate: new Date().toISOString().slice(0, 10),
    fxRate: "",
  });

  const load = () =>
    apiGet<Party>(`/api/parties/${partyId}`)
      .then((p) => {
        setParty(p);
        setError(null);
        setForm((f) => ({
          ...f,
          currency: p.defaultCurrency || "INR",
          fxRate: p.exchangeRate != null ? String(p.exchangeRate) : "",
        }));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));

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

  const conversion = useMemo(() => {
    const amount = Number(form.amount);
    const rate = Number(form.fxRate);
    if (!amount || !rate || amount <= 0 || rate <= 0) return null;
    const quoteMode = party?.quoteMode || "INR_PER_THB";
    const converted = convertAmount(amount, form.currency, rate, quoteMode);
    return {
      original: { currency: form.currency, amount },
      converted,
    };
  }, [form.amount, form.fxRate, form.currency, party?.quoteMode]);

  useEffect(() => {
    if (!conversion) setSaveAs(null);
  }, [conversion]);

  async function saveEntry() {
    if (!form.amount) return;

    const amountNum = Number(form.amount);
    const rateNum = form.fxRate ? Number(form.fxRate) : null;

    let postAmount = amountNum;
    let postCurrency: "INR" | "THB" = form.currency;
    let fxAmount: number | null = null;
    let fxCurrency: "INR" | "THB" | null = null;
    let postFxRate: number | null = null;

    if (conversion && rateNum) {
      if (!saveAs) {
        alert("FX rate is set — choose whether to save as THB or INR.");
        return;
      }
      if (saveAs === form.currency) {
        // Entered as-is — keep the amount only, no FX note on the entry
        postAmount = conversion.original.amount;
        postCurrency = conversion.original.currency;
      } else {
        // Actually converted to the other currency
        postAmount = conversion.converted.value;
        postCurrency = conversion.converted.to;
        fxAmount = conversion.original.amount;
        fxCurrency = conversion.original.currency;
        postFxRate = rateNum;
      }
    }

    setSaving(true);
    try {
      const payload = {
        partyId,
        direction: form.direction,
        amount: postAmount,
        currency: postCurrency,
        description: form.description,
        entryDate: form.entryDate,
        fxRate: postFxRate,
        fxAmount,
        fxCurrency,
      };
      let entryId = editId;
      if (editId) {
        await apiPatch(`/api/ledger/${editId}`, payload);
      } else {
        const entry = await apiPost<{ id: string }>("/api/ledger", payload);
        entryId = entry?.id || null;
      }
      if (pendingBill && entryId) {
        await uploadAttachment(entryId, pendingBill);
      }
      setOpen(false);
      setEditId(null);
      setPendingBill(null);
      setSaveAs(null);
      setForm((f) => ({
        ...f,
        amount: "",
        description: "",
        entryDate: new Date().toISOString().slice(0, 10),
      }));
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save entry");
    } finally {
      setSaving(false);
    }
  }

  function openCreate() {
    setEditId(null);
    setPendingBill(null);
    setSaveAs(null);
    setForm({
      direction: "YOU_GAVE",
      amount: "",
      currency: party?.defaultCurrency || "INR",
      description: "",
      entryDate: new Date().toISOString().slice(0, 10),
      fxRate: party?.exchangeRate != null ? String(party.exchangeRate) : "",
    });
    setOpen(true);
  }

  function openModify(e: Entry) {
    setEditId(e.id);
    setPendingBill(null);
    const converted =
      e.fxAmount != null &&
      e.fxCurrency != null &&
      e.fxCurrency !== e.currency;
    if (converted) {
      setForm({
        direction: e.direction,
        amount: String(e.fxAmount),
        currency: e.fxCurrency as "INR" | "THB",
        description: e.description || "",
        entryDate: e.entryDate.slice(0, 10),
        fxRate: e.fxRate != null ? String(e.fxRate) : "",
      });
      setSaveAs(e.currency);
    } else {
      setForm({
        direction: e.direction,
        amount: String(e.amount),
        currency: e.currency,
        description: e.description || "",
        entryDate: e.entryDate.slice(0, 10),
        fxRate: "",
      });
      setSaveAs(null);
    }
    setOpen(true);
  }

  async function uploadBill(entryId: string, file: File) {
    try {
      await uploadAttachment(entryId, file);
      setAttachFor(null);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to upload bill");
    }
  }

  async function deleteEntry(id: string) {
    if (!confirm("Delete this ledger entry?")) return;
    try {
      await apiDelete(`/api/ledger/${id}`);
      setOpen(false);
      setEditId(null);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete entry");
    }
  }

  if (error && !party) {
    return (
      <Card>
        <div className="text-red-700">{error}</div>
        <Button className="mt-3" onClick={() => load()}>
          Retry
        </Button>
      </Card>
    );
  }

  if (!party) return <div className="text-[var(--muted)]">Loading khata…</div>;

  const entries = [...(party.ledgerEntries || [])].sort(
    (a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
  );

  const sharedUntil = party.booksSharedUntil
    ? String(party.booksSharedUntil).slice(0, 10)
    : null;

  function isShared(entryDate: string) {
    if (!sharedUntil) return false;
    return entryDate.slice(0, 10) <= sharedUntil;
  }

  async function clearSharedMark() {
    if (!confirm("Clear the books-shared mark for this party?")) return;
    try {
      await apiPatch(`/api/parties/${partyId}`, { booksSharedUntil: null });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to clear");
    }
  }

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
            <Button
              variant="secondary"
              onClick={() => setStatementOpen(true)}
            >
              <FileText className="h-4 w-4" />
              PDF statement
            </Button>
            <Button onClick={openCreate}>Add entry</Button>
          </>
        }
      />

      {sharedUntil && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <span>
            Books shared / discussed till{" "}
            <strong>{format(new Date(sharedUntil), "dd MMM yyyy")}</strong>
          </span>
          <button
            type="button"
            className="text-xs text-emerald-800/70 underline hover:text-emerald-950"
            onClick={clearSharedMark}
          >
            Clear mark
          </button>
        </div>
      )}

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
              {entries.map((e, idx) => {
                const shared = isShared(e.entryDate);
                const prev = entries[idx - 1];
                const showDivider =
                  !!sharedUntil &&
                  !!prev &&
                  !isShared(prev.entryDate) &&
                  shared;
                return (
                  <Fragment key={e.id}>
                    {showDivider && (
                      <tr className="bg-emerald-50/80">
                        <td
                          colSpan={7}
                          className="py-1.5 text-center text-xs font-medium text-emerald-800"
                        >
                          ↑ Newer (not shared yet) · Shared till{" "}
                          {format(new Date(sharedUntil), "dd MMM yyyy")} ↓
                        </td>
                      </tr>
                    )}
                    <tr className={shared ? "bg-emerald-50/40" : undefined}>
                      <td className="whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          {format(new Date(e.entryDate), "dd MMM yyyy")}
                          {shared && (
                            <span
                              title="Shared / discussed with customer"
                              className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
                            />
                          )}
                        </span>
                        {e.isAutoSynced && (
                          <div>
                            <Badge tone="info">Auto-synced</Badge>
                          </div>
                        )}
                      </td>
                      <td>
                        <Badge
                          tone={e.direction === "YOU_GAVE" ? "danger" : "ok"}
                        >
                          {directionLabel(e.direction)}
                        </Badge>
                      </td>
                      <td
                        className={
                          e.currency === "INR" ? "money-inr" : "money-thb"
                        }
                      >
                        {formatMoney(e.amount, e.currency)}
                      </td>
                      <td className="max-w-xs">{e.description || "—"}</td>
                      <td className="text-xs text-[var(--muted)]">
                        {e.fxRate != null &&
                        e.fxAmount != null &&
                        e.fxCurrency &&
                        e.fxCurrency !== e.currency ? (
                          <>
                            {e.fxCurrency}{" "}
                            {e.fxAmount.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            @ {e.fxRate}
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
                        <Paperclip size={12} /> Add bill
                      </button>
                    </div>
                  </td>
                  <td>
                    <button
                      className="text-xs text-[var(--accent)] hover:underline"
                      onClick={() => openModify(e)}
                    >
                      Modify
                    </button>
                  </td>
                </tr>
                  </Fragment>
              );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditId(null);
        }}
        title={editId ? "Modify ledger entry" : "Add ledger entry"}
        wide
      >
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 text-sm text-[var(--muted)]">Direction</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, direction: "YOU_GAVE" })}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  form.direction === "YOU_GAVE"
                    ? "bg-red-600 text-white"
                    : "border border-[var(--line)] bg-[var(--panel)] text-[var(--muted)]"
                }`}
              >
                You gave
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, direction: "YOU_GOT" })}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  form.direction === "YOU_GOT"
                    ? "bg-emerald-600 text-white"
                    : "border border-[var(--line)] bg-[var(--panel)] text-[var(--muted)]"
                }`}
              >
                You got
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Date"
              type="date"
              value={form.entryDate}
              onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
            />
            <div>
              <div className="mb-1.5 text-sm text-[var(--muted)]">Entered currency</div>
              <div className="flex gap-2">
                {(["INR", "THB"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setForm({ ...form, currency: c });
                      setSaveAs(null);
                    }}
                    className={`rounded-lg px-3 py-2 text-sm font-medium ${
                      form.currency === c
                        ? "bg-[var(--accent)] text-white"
                        : "border border-[var(--line)] text-[var(--muted)]"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <Input
              label="Amount *"
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => {
                setForm({ ...form, amount: e.target.value });
                setSaveAs(null);
              }}
            />
            <Input
              label="FX rate (₹ per ฿)"
              type="number"
              step="0.01"
              value={form.fxRate}
              onChange={(e) => {
                setForm({ ...form, fxRate: e.target.value });
                setSaveAs(null);
              }}
              placeholder="e.g. 2.85"
            />
          </div>

          {conversion && (
            <div className="rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] p-4">
              <div className="font-medium text-[var(--accent-ink)]">
                How do you want to save this entry?
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Choose one — nothing is selected until you tap.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSaveAs(conversion.original.currency)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    saveAs === conversion.original.currency
                      ? "bg-[var(--accent)] text-white"
                      : "border border-[var(--line)] bg-white"
                  }`}
                >
                  As {conversion.original.currency} — no exchange (
                  {formatMoney(conversion.original.amount, conversion.original.currency)})
                </button>
                <button
                  type="button"
                  onClick={() => setSaveAs(conversion.converted.to)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    saveAs === conversion.converted.to
                      ? "bg-[var(--accent)] text-white"
                      : "border border-[var(--line)] bg-white"
                  }`}
                >
                  Convert to {conversion.converted.to} (
                  {formatMoney(conversion.converted.value, conversion.converted.to)})
                </button>
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">
                Exchange rate is stored (and shown on PDF) only when you convert to the other
                currency.
              </p>
            </div>
          )}

          <Textarea
            label="Description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="e.g. Credit advance against goods / THB received in Bangkok bank"
          />

          <div>
            <label className="block text-sm">
              <span className="mb-1.5 block text-[var(--muted)]">Attach bill (before save)</span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="block w-full text-sm"
                onChange={(e) => setPendingBill(e.target.files?.[0] || null)}
              />
            </label>
            {pendingBill && (
              <p className="mt-1 text-sm text-[var(--accent-ink)]">
                📎 {pendingBill.name}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          {editId ? (
            <Button
              variant="danger"
              onClick={() => editId && deleteEntry(editId)}
              disabled={saving}
            >
              Delete entry
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setOpen(false);
                setEditId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={saveEntry}
              disabled={!form.amount || saving || (!!conversion && !saveAs)}
            >
              {saving
                ? "Saving…"
                : conversion && !saveAs
                  ? "Choose how to save"
                  : editId
                    ? "Save changes"
                    : "Save entry"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!attachFor}
        onClose={() => setAttachFor(null)}
        title="Attach another bill"
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
      </Modal>

      <LedgerStatementModal
        open={statementOpen}
        onClose={() => setStatementOpen(false)}
        party={party}
        entries={party.ledgerEntries || []}
        onMarkedShared={() => {
          setStatementOpen(false);
          load();
        }}
      />
    </div>
  );
}
