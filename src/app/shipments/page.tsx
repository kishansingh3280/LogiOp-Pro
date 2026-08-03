"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  EmptyState,
  statusTone,
} from "@/components/ui";
import { deriveShipmentStatus, formatMoney } from "@/lib/utils";
import { format } from "date-fns";
import { apiGet } from "@/lib/client-api";

type Shipment = {
  id: string;
  lotNumber: string;
  batchNumber: string | null;
  direction: string;
  shipDate: string | null;
  notes: string | null;
  ownerParty?: { id: string; name: string } | null;
  shippingChargeTotal?: number | null;
  shippingCurrency?: "INR" | "THB";
  originWarehouse: { name: string; city: string } | null;
  destWarehouse: { name: string; city: string } | null;
  bags: Array<{ id: string; status: string }>;
  _count: { bags: number };
};

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Shipment[]>("/api/shipments")
      .then((s) => {
        setShipments(s);
        setError(null);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load")
      );
  }, []);

  if (error && !shipments) {
    return (
      <Card>
        <div className="text-red-700">{error}</div>
      </Card>
    );
  }

  if (!shipments) {
    return <div className="text-[var(--muted)]">Loading shipments…</div>;
  }

  return (
    <div>
      <PageHeader
        title="Shipments"
        subtitle="Each lot keeps its bags together — open a shipment for bag details, status, and packing list"
        actions={
          <Link href="/shipments/new">
            <Button>New shipment</Button>
          </Link>
        }
      />

      {shipments.length === 0 ? (
        <EmptyState
          title="No shipments yet"
          hint="Create a lot with bags (e.g. 25 bags) to start tracking."
        />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="data">
            <thead>
              <tr>
                <th>Shipment (lot)</th>
                <th>Owner</th>
                <th>Route</th>
                <th>Bags</th>
                <th>Status</th>
                <th>Shipping</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => {
                const status = deriveShipmentStatus(s.bags);
                return (
                  <tr key={s.id}>
                    <td>
                      <Link
                        href={`/shipments/${s.id}`}
                        className="font-medium text-[var(--accent)] hover:underline"
                      >
                        Lot {s.lotNumber}
                      </Link>
                      {s.batchNumber && (
                        <div className="text-xs text-[var(--muted)]">
                          Batch {s.batchNumber}
                        </div>
                      )}
                    </td>
                    <td>{s.ownerParty?.name || "—"}</td>
                    <td className="text-xs text-[var(--muted)]">
                      {s.originWarehouse?.city || "?"} →{" "}
                      {s.destWarehouse?.city || "?"}
                      <br />
                      {s.direction === "IN_TO_TH"
                        ? "India → Thailand"
                        : "Thailand → India"}
                    </td>
                    <td className="font-display text-lg">{s._count.bags}</td>
                    <td>
                      <Badge tone={statusTone(status.key)}>
                        {status.label}
                      </Badge>
                    </td>
                    <td>
                      {s.shippingChargeTotal != null
                        ? formatMoney(
                            s.shippingChargeTotal,
                            s.shippingCurrency || "INR"
                          )
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap text-sm text-[var(--muted)]">
                      {s.shipDate
                        ? format(new Date(s.shipDate), "dd MMM yyyy")
                        : "—"}
                    </td>
                    <td>
                      <Link
                        href={`/shipments/${s.id}`}
                        className="text-sm text-[var(--accent)] hover:underline"
                      >
                        Open
                      </Link>
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
