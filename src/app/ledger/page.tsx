"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, Badge, EmptyState, Button } from "@/components/ui";
import { formatMoney, formatBalanceLabel, PARTY_TYPE_LABELS } from "@/lib/utils";

type BalanceRow = {
  partyId: string;
  name: string;
  type: string;
  currency: "INR" | "THB";
  youGave: number;
  youGot: number;
  balance: number;
  label: string;
  exchangeRate: number | null;
  quoteMode: string;
};

type Summary = {
  balances: BalanceRow[];
  totals: {
    INR: { toReceive: number; toPay: number };
    THB: { toReceive: number; toPay: number };
  };
};

export default function LedgerIndexPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [currencyFilter, setCurrencyFilter] = useState<"ALL" | "INR" | "THB">("ALL");

  useEffect(() => {
    fetch("/api/ledger/summary")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <div className="text-[var(--muted)]">Loading ledger…</div>;

  const rows = data.balances
    .filter((b) => currencyFilter === "ALL" || b.currency === currencyFilter)
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

  return (
    <div>
      <PageHeader
        title="Ledger overview"
        subtitle="Who you need to pay and who will pay you — INR & THB"
        actions={
          <Link href="/parties">
            <Button variant="secondary">Manage parties</Button>
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="text-sm text-[var(--muted)]">Receive · INR</div>
          <div className="mt-1 font-display text-2xl money-inr">
            {formatMoney(data.totals.INR.toReceive, "INR")}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-[var(--muted)]">Pay · INR</div>
          <div className="mt-1 font-display text-2xl money-inr">
            {formatMoney(data.totals.INR.toPay, "INR")}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-[var(--muted)]">Receive · THB</div>
          <div className="mt-1 font-display text-2xl money-thb">
            {formatMoney(data.totals.THB.toReceive, "THB")}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-[var(--muted)]">Pay · THB</div>
          <div className="mt-1 font-display text-2xl money-thb">
            {formatMoney(data.totals.THB.toPay, "THB")}
          </div>
        </Card>
      </div>

      <div className="mb-4 flex gap-2">
        {(["ALL", "INR", "THB"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCurrencyFilter(c)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              currencyFilter === c
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--line)] bg-[var(--panel)]"
            }`}
          >
            {c === "ALL" ? "All currencies" : c}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No ledger balances" hint="Add parties and start recording entries." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="data">
            <thead>
              <tr>
                <th>Party</th>
                <th>Type</th>
                <th>Currency</th>
                <th>You gave</th>
                <th>You got</th>
                <th>Balance</th>
                <th>Quoted FX</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.partyId}-${r.currency}`}>
                  <td className="font-medium">{r.name}</td>
                  <td>
                    <Badge tone="neutral">{PARTY_TYPE_LABELS[r.type] || r.type}</Badge>
                  </td>
                  <td>{r.currency}</td>
                  <td className={r.currency === "INR" ? "money-inr" : "money-thb"}>
                    {formatMoney(r.youGave, r.currency)}
                  </td>
                  <td className={r.currency === "INR" ? "money-inr" : "money-thb"}>
                    {formatMoney(r.youGot, r.currency)}
                  </td>
                  <td>
                    <span
                      className={
                        r.balance > 0
                          ? "text-emerald-700"
                          : r.balance < 0
                            ? "text-amber-800"
                            : "text-[var(--muted)]"
                      }
                    >
                      {formatBalanceLabel(r.balance, r.currency)}
                    </span>
                  </td>
                  <td>
                    {r.exchangeRate != null
                      ? `${r.exchangeRate} ${r.quoteMode === "INR_PER_THB" ? "₹/฿" : "฿/₹"}`
                      : "—"}
                  </td>
                  <td>
                    <Link
                      href={`/ledger/${r.partyId}`}
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
    </div>
  );
}
