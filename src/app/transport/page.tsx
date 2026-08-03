"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  EmptyState,
  Modal,
  Select,
} from "@/components/ui";
import { TRANSPORT_MODE_LABELS, formatMoney } from "@/lib/utils";
import { format } from "date-fns";

type Assignment = {
  id: string;
  mode: string;
  assignedDate: string;
  departureDate: string | null;
  arrivalDate: string | null;
  ratePerKg: number | null;
  totalWeightKg: number | null;
  currency: "INR" | "THB";
  deliveredToCustomer: boolean;
  carrier: { id: string; name: string } | null;
  carrierName: string | null;
  trackingRef: string | null;
  bags: Array<{
    bag: {
      id: string;
      bagNumber: string;
      status: string;
      shipment: { id: string; lotNumber: string };
    };
  }>;
  ledgerEntries: Array<{ id: string; amount: number; currency: string }>;
};

export default function TransportPage() {
  const [items, setItems] = useState<Assignment[]>([]);
  const [active, setActive] = useState<Assignment | null>(null);

  const load = () =>
    fetch("/api/transport")
      .then((r) => r.json())
      .then(setItems);

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(
    id: string,
    patch: Record<string, unknown>
  ) {
    await fetch(`/api/transport/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setActive(null);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Transport"
        subtitle="Who took which bags, when they left, when they arrived, delivery status"
        actions={
          <Link href="/transport/new">
            <Button>Assign transport</Button>
          </Link>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title="No transport assignments"
          hint="Select bags from a shipment and assign air, sea, land or carry person."
        />
      ) : (
        <div className="grid gap-4">
          {items.map((a) => {
            const payable =
              a.ratePerKg != null && a.totalWeightKg != null
                ? a.ratePerKg * a.totalWeightKg
                : null;
            const lots = Array.from(
              new Set(a.bags.map((b) => b.bag.shipment.lotNumber))
            );
            return (
              <Card key={a.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <div>
                    <div className="font-display text-xl">
                      {a.carrier?.name || a.carrierName || "Unnamed carrier"}
                    </div>
                    <div className="mt-1 text-sm text-[var(--muted)]">
                      {TRANSPORT_MODE_LABELS[a.mode] || a.mode} ·{" "}
                      {format(new Date(a.assignedDate), "dd MMM yyyy")}
                      {a.trackingRef && ` · Ref ${a.trackingRef}`}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {lots.map((lot) => (
                        <Badge key={lot} tone="accent">
                          Lot {lot}
                        </Badge>
                      ))}
                      <Badge tone="neutral">{a.bags.length} bags</Badge>
                      {a.deliveredToCustomer ? (
                        <Badge tone="ok">Delivered to customer</Badge>
                      ) : a.arrivalDate ? (
                        <Badge tone="info">Arrived</Badge>
                      ) : (
                        <Badge tone="warn">In progress</Badge>
                      )}
                      {a.ledgerEntries.length > 0 && (
                        <Badge tone="info">Ledger synced</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {payable != null && (
                      <div
                        className={`font-display text-xl ${
                          a.currency === "INR" ? "money-inr" : "money-thb"
                        }`}
                      >
                        {formatMoney(payable, a.currency)}
                      </div>
                    )}
                    <div className="text-xs text-[var(--muted)]">
                      {a.totalWeightKg != null ? `${a.totalWeightKg} kg` : ""}
                      {a.ratePerKg != null ? ` × ${a.ratePerKg}/kg` : ""}
                    </div>
                    <Button
                      className="mt-2"
                      variant="secondary"
                      onClick={() => setActive(a)}
                    >
                      Update status
                    </Button>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-[var(--muted)] sm:grid-cols-3">
                  <div>
                    Departed:{" "}
                    {a.departureDate
                      ? format(new Date(a.departureDate), "dd MMM yyyy")
                      : "—"}
                  </div>
                  <div>
                    Arrived:{" "}
                    {a.arrivalDate
                      ? format(new Date(a.arrivalDate), "dd MMM yyyy")
                      : "—"}
                  </div>
                  <div>
                    Bags:{" "}
                    {a.bags
                      .map((b) => `#${b.bag.bagNumber}`)
                      .slice(0, 8)
                      .join(", ")}
                    {a.bags.length > 8 ? "…" : ""}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        title="Update transport status"
      >
        {active && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--muted)]">
              {active.carrier?.name || active.carrierName} ·{" "}
              {active.bags.length} bags
            </p>
            <div className="grid gap-2">
              <Button
                variant="secondary"
                onClick={() =>
                  updateStatus(active.id, {
                    departureDate: new Date().toISOString(),
                    markBagsStatus: "IN_TRANSIT",
                  })
                }
              >
                Mark departed / in transit
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  updateStatus(active.id, {
                    arrivalDate: new Date().toISOString(),
                    markBagsStatus: "ARRIVED",
                  })
                }
              >
                Mark arrived at destination
              </Button>
              <Button
                onClick={() =>
                  updateStatus(active.id, {
                    deliveredToCustomer: true,
                    markBagsStatus: "DELIVERED",
                  })
                }
              >
                Mark delivered to customer
              </Button>
              {active.ledgerEntries.length === 0 &&
                active.carrier &&
                active.ratePerKg &&
                active.totalWeightKg && (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      updateStatus(active.id, { syncToLedger: true })
                    }
                  >
                    Sync payment to ledger now
                  </Button>
                )}
            </div>
            <Select
              label="Or set bag status"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value)
                  updateStatus(active.id, { markBagsStatus: e.target.value });
              }}
            >
              <option value="">—</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_TRANSIT">In transit</option>
              <option value="ARRIVED">Arrived</option>
              <option value="DELIVERED">Delivered</option>
              <option value="RETURNED">Returned</option>
              <option value="LOST">Lost</option>
            </Select>
          </div>
        )}
      </Modal>
    </div>
  );
}
