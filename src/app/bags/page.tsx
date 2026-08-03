"use client";

import { useEffect, useState } from "react";
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
import { BAG_STATUS_LABELS, TRANSPORT_MODE_LABELS } from "@/lib/utils";

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
  const [bags, setBags] = useState<Bag[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  function load(query = q, st = status) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (st) params.set("status", st);
    fetch(`/api/bags?${params}`)
      .then((r) => r.json())
      .then(setBags);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader
        title="Bag tracker"
        subtitle="Real-time status by lot / batch — where every bag is right now"
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

      {bags.length === 0 ? (
        <EmptyState title="No bags found" hint="Create a shipment or clear filters." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="data">
            <thead>
              <tr>
                <th>Lot / Batch</th>
                <th>Bag</th>
                <th>Route</th>
                <th>Customer</th>
                <th>Weight</th>
                <th>Transport</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bags.map((b) => {
                const ta = b.transportAssignments[0]?.transportAssignment;
                return (
                  <tr key={b.id}>
                    <td>
                      <Link
                        href={`/shipments/${b.shipment.id}`}
                        className="font-medium text-[var(--accent)] hover:underline"
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
                    <td className="text-xs text-[var(--muted)]">
                      {b.shipment.originWarehouse?.city || "?"} →{" "}
                      {b.shipment.destWarehouse?.city || "?"}
                      {b.warehouse && (
                        <>
                          <br />
                          Now: {b.warehouse.name}
                        </>
                      )}
                    </td>
                    <td>{b.customer?.name || "—"}</td>
                    <td>{b.weightKg != null ? `${b.weightKg} kg` : "—"}</td>
                    <td className="text-xs">
                      {ta ? (
                        <>
                          {TRANSPORT_MODE_LABELS[ta.mode] || ta.mode}
                          <br />
                          {ta.carrier?.name || ta.carrierName || "—"}
                          {ta.deliveredToCustomer && (
                            <>
                              <br />
                              <Badge tone="ok">Delivered to customer</Badge>
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
      )}
    </div>
  );
}
