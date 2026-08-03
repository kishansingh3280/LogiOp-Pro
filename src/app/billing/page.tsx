"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  EmptyState,
} from "@/components/ui";
import {
  formatMoney,
  INVOICE_STATUS_LABELS,
} from "@/lib/utils";
import { format } from "date-fns";
import { apiGet } from "@/lib/client-api";

type Invoice = {
  id: string;
  number: string;
  status: string;
  amount: number;
  currency: "INR" | "THB";
  description: string | null;
  issueDate: string;
  paidAt: string | null;
  party: { id: string; name: string };
  shipment: { id: string; lotNumber: string } | null;
  lines: Array<{ id: string; description: string; amount: number }>;
};

function invoiceTone(status: string) {
  if (status === "PAID") return "ok" as const;
  if (status === "CANCELLED") return "danger" as const;
  if (status === "DRAFT") return "info" as const;
  return "accent" as const;
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    apiGet<Invoice[]>("/api/invoices")
      .then((data) => {
        setInvoices(data);
        setError(null);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load")
      );
  }, []);

  const filtered = useMemo(() => {
    if (!invoices) return [];
    if (filter === "ALL") return invoices;
    return invoices.filter((i) => i.status === filter);
  }, [invoices, filter]);

  const summary = useMemo(() => {
    const list = invoices || [];
    const outstanding = list
      .filter((i) => i.status === "SENT")
      .reduce((s, i) => s + i.amount, 0);
    const paid = list
      .filter((i) => i.status === "PAID")
      .reduce((s, i) => s + i.amount, 0);
    return {
      count: list.length,
      outstanding,
      paid,
      outstandingCurrency:
        list.find((i) => i.status === "SENT")?.currency || "INR",
      paidCurrency: list.find((i) => i.status === "PAID")?.currency || "INR",
    };
  }, [invoices]);

  if (error && !invoices) {
    return (
      <Card>
        <div className="text-red-700">{error}</div>
      </Card>
    );
  }

  if (!invoices) {
    return <div className="text-[var(--muted)]">Loading billing…</div>;
  }

  return (
    <div>
      <PageHeader
        title="Billing"
        subtitle="Invoices for customers — auto-created from shipments, or create manually"
        actions={
          <Link href="/billing/new">
            <Button>New invoice</Button>
          </Link>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card>
          <div className="text-sm text-[var(--muted)]">Outstanding</div>
          <div className="mt-1 font-display text-2xl money-inr">
            {formatMoney(summary.outstanding, summary.outstandingCurrency)}
          </div>
          <div className="mt-1 text-xs text-[var(--muted)]">Sent, unpaid</div>
        </Card>
        <Card>
          <div className="text-sm text-[var(--muted)]">Collected</div>
          <div className="mt-1 font-display text-2xl text-emerald-700">
            {formatMoney(summary.paid, summary.paidCurrency)}
          </div>
          <div className="mt-1 text-xs text-[var(--muted)]">Marked paid</div>
        </Card>
        <Card>
          <div className="text-sm text-[var(--muted)]">Invoices</div>
          <div className="mt-1 font-display text-2xl">{summary.count}</div>
          <div className="mt-1 text-xs text-[var(--muted)]">All time</div>
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {["ALL", "SENT", "PAID", "DRAFT", "CANCELLED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              filter === s
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--line)] bg-[var(--panel)] text-[var(--muted)]"
            }`}
          >
            {s === "ALL" ? "All" : INVOICE_STATUS_LABELS[s] || s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No invoices"
          hint="Create a shipment with shipping charges, or add a manual invoice."
        />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="data">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <Link
                      href={`/billing/${inv.id}`}
                      className="font-medium text-[var(--accent)] hover:underline"
                    >
                      {inv.number}
                    </Link>
                    {inv.shipment && (
                      <div className="text-xs text-[var(--muted)]">
                        Lot {inv.shipment.lotNumber}
                      </div>
                    )}
                    {inv.description && (
                      <div className="text-xs text-[var(--muted)]">
                        {inv.description}
                      </div>
                    )}
                  </td>
                  <td>{inv.party.name}</td>
                  <td className="whitespace-nowrap">
                    {format(new Date(inv.issueDate), "dd MMM yyyy")}
                  </td>
                  <td
                    className={
                      inv.currency === "INR" ? "money-inr" : "money-thb"
                    }
                  >
                    {formatMoney(inv.amount, inv.currency)}
                  </td>
                  <td>
                    <Badge tone={invoiceTone(inv.status)}>
                      {INVOICE_STATUS_LABELS[inv.status] || inv.status}
                    </Badge>
                  </td>
                  <td>
                    <Link
                      href={`/billing/${inv.id}`}
                      className="text-sm text-[var(--accent)] hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
