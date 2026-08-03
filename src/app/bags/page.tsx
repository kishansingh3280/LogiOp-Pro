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
} from "@/components/ui";
import {
  BAG_STATUS_LABELS,
  TRANSPORT_MODE_LABELS,
  deriveShipmentStatus,
} from "@/lib/utils";
import { apiGet } from "@/lib/client-api";

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
      const key = b.shipment.id;
      const g = map.get(key) || { shipment: b.shipment, bags: [] };
      g.bags.push(b);
      map.set(key, g);
    }
    return [...map.values()].sort((a, b) =>
      b.shipment.lotNumber.localeCompare(a.shipment.lotNumber)
    );
  }, [bags]);

  return (
    <div>
      <PageHeader
        title="Bag tracker"
        subtitle="Bags grouped under their shipment — open a lot for full details"
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
            <button
              onClick={() => load()}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white"
            >
              Search
            </button>
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
        <div className="space-y-4">
          {byShipment.map(({ shipment, bags: groupBags }) => {
            const lotStatus = deriveShipmentStatus(groupBags);
            return (
              <Card key={shipment.id} className="overflow-x-auto p-0">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--bg)] px-4 py-3">
                  <div>
                    <Link
                      href={`/shipments/${shipment.id}`}
                      className="font-display text-lg text-[var(--accent)] hover:underline"
                    >
                      Lot {shipment.lotNumber}
                    </Link>
                    <div className="text-xs text-[var(--muted)]">
                      {shipment.originWarehouse?.city || "?"} →{" "}
                      {shipment.destWarehouse?.city || "?"}
                      {shipment.batchNumber
                        ? ` · Batch ${shipment.batchNumber}`
                        : ""}
                      {` · ${groupBags.length} bag${
                        groupBags.length === 1 ? "" : "s"
                      }`}
                    </div>
                  </div>
                  <Badge tone={statusTone(lotStatus.key)}>
                    {lotStatus.label}
                  </Badge>
                </div>
                <table className="data">
                  <thead>
                    <tr>
                      <th>Bag</th>
                      <th>Customer</th>
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
                          <td>#{b.bagNumber}</td>
                          <td>{b.customer?.name || "—"}</td>
                          <td>
                            {b.weightKg != null ? `${b.weightKg} kg` : "—"}
                          </td>
                          <td className="text-xs">
                            {ta ? (
                              <>
                                {TRANSPORT_MODE_LABELS[ta.mode] || ta.mode}
                                <br />
                                {ta.carrier?.name || ta.carrierName || "—"}
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
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
