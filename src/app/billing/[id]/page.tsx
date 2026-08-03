"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Button,
  Badge,
} from "@/components/ui";
import { formatMoney, INVOICE_STATUS_LABELS } from "@/lib/utils";
import { format } from "date-fns";
import { apiGet, apiPatch } from "@/lib/client-api";

type Invoice = {
  id: string;
  number: string;
  status: string;
  amount: number;
  subtotal: number;
  currency: "INR" | "THB";
  description: string | null;
  notes: string | null;
  issueDate: string;
  dueDate: string | null;
  paidAt: string | null;
  party: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    city: string | null;
  };
  shipment: { id: string; lotNumber: string } | null;
  lines: Array<{
    id: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    amount: number;
  }>;
};

function invoiceTone(status: string) {
  if (status === "PAID") return "ok" as const;
  if (status === "CANCELLED") return "danger" as const;
  if (status === "DRAFT") return "info" as const;
  return "accent" as const;
}

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    apiGet<Invoice>(`/api/invoices/${id}`)
      .then((inv) => {
        setInvoice(inv);
        setError(null);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load")
      );

  useEffect(() => {
    load();
  }, [id]);

  async function setStatus(status: string) {
    setBusy(true);
    try {
      await apiPatch(`/api/invoices/${id}`, { status });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (error && !invoice) {
    return (
      <Card>
        <div className="text-red-700">{error}</div>
      </Card>
    );
  }
  if (!invoice) {
    return <div className="text-[var(--muted)]">Loading invoice…</div>;
  }

  return (
    <div>
      <PageHeader
        title={invoice.number}
        subtitle={invoice.description || "Customer invoice"}
        actions={
          <>
            <Link href="/billing">
              <Button variant="secondary">All invoices</Button>
            </Link>
            {invoice.party.id && (
              <Link href={`/ledger/${invoice.party.id}`}>
                <Button variant="secondary">Open khata</Button>
              </Link>
            )}
            {invoice.status === "SENT" && (
              <Button onClick={() => setStatus("PAID")} disabled={busy}>
                Mark paid
              </Button>
            )}
            {invoice.status !== "CANCELLED" && invoice.status !== "PAID" && (
              <Button
                variant="danger"
                onClick={() => setStatus("CANCELLED")}
                disabled={busy}
              >
                Cancel
              </Button>
            )}
          </>
        }
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] pb-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--muted)]">
                Bill to
              </div>
              <div className="mt-1 font-display text-2xl">{invoice.party.name}</div>
              <div className="mt-1 text-sm text-[var(--muted)]">
                {[invoice.party.city, invoice.party.phone, invoice.party.email]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </div>
            </div>
            <Badge tone={invoiceTone(invoice.status)}>
              {INVOICE_STATUS_LABELS[invoice.status] || invoice.status}
            </Badge>
          </div>

          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <div className="text-[var(--muted)]">Issue date</div>
              <div>{format(new Date(invoice.issueDate), "dd MMM yyyy")}</div>
            </div>
            <div>
              <div className="text-[var(--muted)]">Due date</div>
              <div>
                {invoice.dueDate
                  ? format(new Date(invoice.dueDate), "dd MMM yyyy")
                  : "—"}
              </div>
            </div>
            <div>
              <div className="text-[var(--muted)]">Shipment</div>
              <div>
                {invoice.shipment ? (
                  <Link
                    href={`/shipments/${invoice.shipment.id}`}
                    className="text-[var(--accent)] hover:underline"
                  >
                    Lot {invoice.shipment.lotNumber}
                  </Link>
                ) : (
                  "—"
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="data">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((l) => (
                  <tr key={l.id}>
                    <td>{l.description}</td>
                    <td className="whitespace-nowrap">
                      {l.quantity} {l.unit}
                    </td>
                    <td>{formatMoney(l.unitPrice, invoice.currency)}</td>
                    <td>{formatMoney(l.amount, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end border-t border-[var(--line)] pt-4">
            <div className="text-right">
              <div className="text-sm text-[var(--muted)]">Total due</div>
              <div className="font-display text-3xl">
                {formatMoney(invoice.amount, invoice.currency)}
              </div>
              {invoice.paidAt && (
                <div className="mt-1 text-xs text-emerald-700">
                  Paid {format(new Date(invoice.paidAt), "dd MMM yyyy")}
                </div>
              )}
            </div>
          </div>

          {invoice.notes && (
            <p className="mt-4 text-sm text-[var(--muted)]">{invoice.notes}</p>
          )}
        </Card>

        <Card>
          <div className="font-display text-lg">Actions</div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Sent invoices post to the customer khata as You gave. Marking paid
            records You got for the same amount.
          </p>
          <div className="mt-4 grid gap-2">
            {invoice.status === "SENT" && (
              <Button onClick={() => setStatus("PAID")} disabled={busy}>
                Record payment (mark paid)
              </Button>
            )}
            <Link href={`/ledger/${invoice.party.id}`}>
              <Button variant="secondary" className="w-full">
                View customer ledger
              </Button>
            </Link>
            {invoice.shipment && (
              <Link href={`/shipments/${invoice.shipment.id}`}>
                <Button variant="secondary" className="w-full">
                  Open shipment
                </Button>
              </Link>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
