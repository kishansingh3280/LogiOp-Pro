"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, Badge, statusTone, Button } from "@/components/ui";
import { BAG_STATUS_LABELS, TRANSPORT_MODE_LABELS, formatMoney } from "@/lib/utils";
import { apiGet, getDemoMode } from "@/lib/client-api";
import { ArrowDownLeft, ArrowUpRight, Boxes, Package, Users } from "lucide-react";

type DashboardData = {
  statusCounts: Record<string, number>;
  recentBags: Array<{
    id: string;
    bagNumber: string;
    status: string;
    weightKg: number | null;
    shipment: { id: string; lotNumber: string; batchNumber: string | null };
    customer: { name: string } | null;
    warehouse: { name: string } | null;
  }>;
  partyCount: number;
  shipmentCount: number;
  bagCount: number;
  totals: {
    INR: { toReceive: number; toPay: number };
    THB: { toReceive: number; toPay: number };
  };
  openAssignments: Array<{
    id: string;
    mode: string;
    assignedDate: string;
    carrier: { name: string } | null;
    carrierName: string | null;
    bags: Array<{ bag: { bagNumber: string; shipment: { lotNumber: string } } }>;
  }>;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(true);

  useEffect(() => {
    setDemo(getDemoMode());
    apiGet<DashboardData>("/api/dashboard")
      .then((d) => {
        setData(d);
        setDemo(getDemoMode());
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  if (error && !data) {
    return (
      <Card>
        <div className="text-red-700">{error}</div>
        <Button className="mt-3" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Card>
    );
  }

  if (!data) {
    return <div className="text-[var(--muted)]">Loading dashboard…</div>;
  }

  return (
    <div>
      <PageHeader
        title="Operations overview"
        subtitle={
          demo
            ? "Demo mode ON — sample data, works offline"
            : "Live bag status, payables & receivables across INR and THB"
        }
        actions={
          <>
            <Link href="/shipments/new">
              <Button>New shipment</Button>
            </Link>
            <Link href="/ledger">
              <Button variant="secondary">Open ledger</Button>
            </Link>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="flex items-center justify-between text-sm text-[var(--muted)]">
            To receive (INR) <ArrowDownLeft size={16} className="text-[var(--inr)]" />
          </div>
          <div className="mt-2 font-display text-2xl money-inr">
            {formatMoney(data.totals.INR.toReceive, "INR")}
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between text-sm text-[var(--muted)]">
            To pay (INR) <ArrowUpRight size={16} className="text-[var(--inr)]" />
          </div>
          <div className="mt-2 font-display text-2xl money-inr">
            {formatMoney(data.totals.INR.toPay, "INR")}
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between text-sm text-[var(--muted)]">
            To receive (THB) <ArrowDownLeft size={16} className="text-[var(--thb)]" />
          </div>
          <div className="mt-2 font-display text-2xl money-thb">
            {formatMoney(data.totals.THB.toReceive, "THB")}
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between text-sm text-[var(--muted)]">
            To pay (THB) <ArrowUpRight size={16} className="text-[var(--thb)]" />
          </div>
          <div className="mt-2 font-display text-2xl money-thb">
            {formatMoney(data.totals.THB.toPay, "THB")}
          </div>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4">
          <div className="rounded-lg bg-[var(--accent-soft)] p-3 text-[var(--accent-ink)]">
            <Users size={20} />
          </div>
          <div>
            <div className="text-sm text-[var(--muted)]">Active parties</div>
            <div className="font-display text-2xl">{data.partyCount}</div>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="rounded-lg bg-[var(--accent-soft)] p-3 text-[var(--accent-ink)]">
            <Package size={20} />
          </div>
          <div>
            <div className="text-sm text-[var(--muted)]">Shipments / lots</div>
            <div className="font-display text-2xl">{data.shipmentCount}</div>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="rounded-lg bg-[var(--accent-soft)] p-3 text-[var(--accent-ink)]">
            <Boxes size={20} />
          </div>
          <div>
            <div className="text-sm text-[var(--muted)]">Total bags</div>
            <div className="font-display text-2xl">{data.bagCount}</div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-display text-lg">Bag status snapshot</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(BAG_STATUS_LABELS).map(([key, label]) => (
              <div
                key={key}
                className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2"
              >
                <div className="text-xs text-[var(--muted)]">{label}</div>
                <div className="font-display text-xl">{data.statusCounts[key] || 0}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg">Open transport</h2>
            <Link href="/transport" className="text-sm text-[var(--accent)]">
              View all
            </Link>
          </div>
          {data.openAssignments.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No open transport assignments.</p>
          ) : (
            <ul className="space-y-3">
              {data.openAssignments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-3 last:border-0"
                >
                  <div>
                    <div className="font-medium">
                      {a.carrier?.name || a.carrierName || "Unassigned carrier"}
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                      {TRANSPORT_MODE_LABELS[a.mode] || a.mode} · {a.bags.length} bag(s) · Lot{" "}
                      {a.bags[0]?.bag?.shipment?.lotNumber || "—"}
                    </div>
                  </div>
                  <Badge tone="accent">{a.bags.length} bags</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg">Recently updated bags</h2>
          <Link href="/bags" className="text-sm text-[var(--accent)]">
            Track all bags
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>Lot</th>
                <th>Bag</th>
                <th>Customer</th>
                <th>Warehouse</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recentBags.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link
                      href={`/shipments/${b.shipment.id}`}
                      className="text-[var(--accent)]"
                    >
                      {b.shipment.lotNumber}
                    </Link>
                    {b.shipment.batchNumber && (
                      <div className="text-xs text-[var(--muted)]">
                        Batch {b.shipment.batchNumber}
                      </div>
                    )}
                  </td>
                  <td>#{b.bagNumber}</td>
                  <td>{b.customer?.name || "—"}</td>
                  <td>{b.warehouse?.name || "—"}</td>
                  <td>
                    <Badge tone={statusTone(b.status)}>
                      {BAG_STATUS_LABELS[b.status] || b.status}
                    </Badge>
                  </td>
                </tr>
              ))}
              {data.recentBags.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-[var(--muted)]">
                    No bags yet — create a shipment to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
