"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Card, Button, Badge, EmptyState, statusTone } from "@/components/ui";
import { BAG_STATUS_LABELS } from "@/lib/utils";
import { format } from "date-fns";
import { apiGet } from "@/lib/client-api";

type Shipment = {
  id: string;
  lotNumber: string;
  batchNumber: string | null;
  direction: string;
  shipDate: string | null;
  notes: string | null;
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
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
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
        subtitle="Lots & batches — create bags, assign transport, track to delivery"
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
        <div className="grid gap-4">
          {shipments.map((s) => {
            const statusSummary = s.bags.reduce<Record<string, number>>((acc, b) => {
              acc[b.status] = (acc[b.status] || 0) + 1;
              return acc;
            }, {});
            return (
              <Card key={s.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Link
                      href={`/shipments/${s.id}`}
                      className="font-display text-xl text-[var(--accent)] hover:underline"
                    >
                      Lot {s.lotNumber}
                    </Link>
                    {s.batchNumber && (
                      <div className="text-sm text-[var(--muted)]">
                        Batch {s.batchNumber}
                      </div>
                    )}
                    <div className="mt-2 text-sm text-[var(--muted)]">
                      {s.originWarehouse
                        ? `${s.originWarehouse.city}`
                        : "Origin TBA"}{" "}
                      →{" "}
                      {s.destWarehouse ? s.destWarehouse.city : "Dest TBA"} ·{" "}
                      {s.direction === "IN_TO_TH" ? "India → Thailand" : "Thailand → India"}
                      {s.shipDate &&
                        ` · ${format(new Date(s.shipDate), "dd MMM yyyy")}`}
                    </div>
                    {s.notes && (
                      <p className="mt-1 text-sm text-[var(--muted)]">{s.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-display text-2xl">{s._count.bags}</div>
                    <div className="text-xs text-[var(--muted)]">bags</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(statusSummary).map(([st, n]) => (
                    <Badge key={st} tone={statusTone(st)}>
                      {BAG_STATUS_LABELS[st] || st}: {n}
                    </Badge>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
