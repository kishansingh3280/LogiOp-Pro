"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Badge,
  Input,
  Select,
  statusTone,
  EmptyState,
  Button,
} from "@/components/ui";
import {
  BAG_STATUS_LABELS,
  TRANSPORT_MODE_LABELS,
  deriveShipmentStatus,
} from "@/lib/utils";
import { apiGet } from "@/lib/client-api";
import { ChevronDown, ChevronRight, Package } from "lucide-react";

type Bag = {
  id: string;
  bagNumber: string;
  status: string;
  weightKg: number | null;
  description: string | null;
  shipment: {
    id: string;
    lotNumber: string;
    batchNumber: string | null;
    originWarehouse: { city: string } | null;
    destWarehouse: { city: string } | null;
  };
  customer: { name: string } | null;
  warehouse: { name: string } | null;
  transportAssignments: Array<{
    transportAssignment: {
      mode: string;
      carrier: { name: string } | null;
      carrierName: string | null;
      arrivalDate: string | null;
      deliveredToCustomer: boolean;
    };
  }>;
};

export default function BagsPage() {
  const [bags, setBags] = useState<Bag[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function load(query = q, st = status) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (st) params.set("status", st);
    apiGet<Bag[]>(`/api/bags?${params}`)
      .then((b) => {
        setBags(b);
        setError(null);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load")
      );
  }

  useEffect(() => {
    load();
  }, []);

  const byShipment = useMemo(() => {
    if (!bags) return [];
    const map = new Map<
      string,
      {
        shipment: Bag["shipment"];
        bags: Bag[];
      }
    >();
    for (const b of bags) {
      const key = b.shipment?.id || b.shipment?.lotNumber || "unknown";
      const g = map.get(key) || {
        shipment: b.shipment,
        bags: [],
      };
      g.bags.push(b);
      map.set(key, g);
    }
    return [...map.values()]
      .map((g) => ({
        ...g,
        bags: [...g.bags].sort((a, b) =>
          a.bagNumber.localeCompare(b.bagNumber, undefined, { numeric: true })
        ),
      }))
      .sort((a, b) =>
        (b.shipment?.lotNumber || "").localeCompare(a.shipment?.lotNumber || "")
      );
  }, [bags]);

  const statusBreakdown = (groupBags: Bag[]) => {
    const counts: Record<string, number> = {};
    for (const b of groupBags) {
      counts[b.status] = (counts[b.status] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };

  function toggleLot(id: string) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div>
      <PageHeader
        title="Bag tracker"
        subtitle="Organised by shipment lot — each lot shows how many bags it holds"
      />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label="Search lot, batch, bag #"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="e.g. LOT-2026 or 001"
          />
          <Select
            label="Status filter"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              load(q, e.target.value);
            }}
          >
            <option value="">All statuses</option>
            {Object.entries(BAG_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <div className="flex items-end">
            <Button onClick={() => load()}>Search</Button>
          </div>
        </div>
      </Card>

      {error && !bags ? (
        <Card>
          <div className="text-red-700">{error}</div>
        </Card>
      ) : !bags ? (
        <div className="text-[var(--muted)]">Loading bags…</div>
      ) : bags.length === 0 ? (
        <EmptyState
          title="No bags found"
          hint="Create a shipment or clear filters."
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5">
              <Package size={14} />
              <strong className="text-[var(--ink)]">{byShipment.length}</strong>{" "}
              shipment{byShipment.length === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5">
              <strong className="text-[var(--ink)]">{bags.length}</strong> bags
              total
            </span>
          </div>

          <div className="space-y-5">
            {byShipment.map(({ shipment, bags: groupBags }) => {
              const lotId = shipment?.id || shipment?.lotNumber || "unknown";
              const isCollapsed = Boolean(collapsed[lotId]);
              const lotStatus = deriveShipmentStatus(groupBags);
              const totalWeight = groupBags.reduce(
                (s, b) => s + (b.weightKg != null ? b.weightKg : 0),
                0
              );
              const breakdown = statusBreakdown(groupBags);

              return (
                <section
                  key={lotId}
                  className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] shadow-sm"
                >
                  {/* Shipment lot header — highlighted */}
                  <div className="border-b border-[var(--line)] bg-[var(--accent-soft)] px-4 py-4 sm:px-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium uppercase tracking-wide text-[var(--accent-ink)]">
                          Shipment lot
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleLot(lotId)}
                            className="inline-flex items-center gap-1 text-[var(--accent-ink)]"
                            aria-label={isCollapsed ? "Expand lot" : "Collapse lot"}
                          >
                            {isCollapsed ? (
                              <ChevronRight size={20} />
                            ) : (
                              <ChevronDown size={20} />
                            )}
                          </button>
                          <Link
                            href={`/shipments/${shipment.id}`}
                            className="font-display text-2xl text-[var(--accent)] hover:underline sm:text-3xl"
                          >
                            Lot {shipment.lotNumber}
                          </Link>
                          <Badge tone={statusTone(lotStatus.key)}>
                            {lotStatus.label}
                          </Badge>
                        </div>
                        <div className="mt-2 text-sm text-[var(--muted)]">
                          {shipment.originWarehouse?.city || "?"} →{" "}
                          {shipment.destWarehouse?.city || "?"}
                          {shipment.batchNumber
                            ? ` · Batch ${shipment.batchNumber}`
                            : ""}
                          {totalWeight > 0
                            ? ` · ${totalWeight.toLocaleString("en-IN", {
                                maximumFractionDigits: 2,
                              })} kg`
                            : ""}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {breakdown.map(([st, n]) => (
                            <Badge key={st} tone={statusTone(st)}>
                              {BAG_STATUS_LABELS[st] || st}: {n}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-[var(--accent)]/25 bg-[var(--panel)] px-4 py-3 text-center">
                        <div className="font-display text-3xl text-[var(--accent)]">
                          {groupBags.length}
                        </div>
                        <div className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                          bag{groupBags.length === 1 ? "" : "s"} in this lot
                        </div>
                        <Link
                          href={`/shipments/${shipment.id}`}
                          className="mt-2 inline-block text-xs text-[var(--accent)] hover:underline"
                        >
                          Open shipment →
                        </Link>
                      </div>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="data">
                        <thead>
                          <tr>
                            <th>Bag #</th>
                            <th>Deliver to</th>
                            <th>Weight</th>
                            <th>Transport</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupBags.map((b) => {
                            const ta =
                              b.transportAssignments[0]?.transportAssignment;
                            return (
                              <tr key={b.id}>
                                <td className="font-medium">#{b.bagNumber}</td>
                                <td>{b.customer?.name || "—"}</td>
                                <td>
                                  {b.weightKg != null
                                    ? `${b.weightKg} kg`
                                    : "—"}
                                </td>
                                <td className="text-xs">
                                  {ta ? (
                                    <>
                                      {TRANSPORT_MODE_LABELS[ta.mode] ||
                                        ta.mode}
                                      <br />
                                      {ta.carrier?.name ||
                                        ta.carrierName ||
                                        "—"}
                                      {ta.deliveredToCustomer && (
                                        <>
                                          <br />
                                          <Badge tone="ok">
                                            Delivered to customer
                                          </Badge>
                                        </>
                                      )}
                                    </>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td>
                                  <Badge tone={statusTone(b.status)}>
                                    {BAG_STATUS_LABELS[b.status] || b.status}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
