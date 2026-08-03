"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  statusTone,
  Modal,
  Input,
  Select,
} from "@/components/ui";
import {
  BAG_STATUS_LABELS,
  TRANSPORT_MODE_LABELS,
  formatMoney,
} from "@/lib/utils";
import { format } from "date-fns";
import { apiGet, apiPost, apiPatch } from "@/lib/client-api";

type Bag = {
  id: string;
  bagNumber: string;
  weightKg: number | null;
  description: string | null;
  contents: string | null;
  shippingCharge?: number | null;
  status: string;
  arrivedAt: string | null;
  deliveredAt: string | null;
  customer: { id: string; name: string } | null;
  warehouse: { name: string } | null;
  items?: Array<{ id: string; name: string; quantity: number }>;
  transportAssignments: Array<{
    transportAssignment: {
      id: string;
      mode: string;
      carrier: { name: string } | null;
      carrierName: string | null;
      assignedDate: string;
      arrivalDate: string | null;
    };
  }>;
};

type Shipment = {
  id: string;
  lotNumber: string;
  batchNumber: string | null;
  direction: string;
  notes: string | null;
  shipDate: string | null;
  ownerParty?: { id: string; name: string } | null;
  shippingRatePerKg?: number | null;
  shippingCurrency?: "INR" | "THB";
  shippingChargeTotal?: number | null;
  shippingInvoicedAt?: string | null;
  invoices?: Array<{ id: string; number: string; amount: number; currency: string }>;
  originWarehouse: { name: string; city: string } | null;
  destWarehouse: { name: string; city: string } | null;
  bags: Bag[];
};

export default function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editBag, setEditBag] = useState<Bag | null>(null);
  const [addCount, setAddCount] = useState("1");

  const load = () =>
    apiGet<Shipment>(`/api/shipments/${id}`)
      .then((s) => {
        setShipment(s);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));

  useEffect(() => {
    load();
  }, [id]);

  function toggle(bagId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(bagId)) next.delete(bagId);
      else next.add(bagId);
      return next;
    });
  }

  function toggleAll() {
    if (!shipment) return;
    if (selected.size === shipment.bags.length) setSelected(new Set());
    else setSelected(new Set(shipment.bags.map((b) => b.id)));
  }

  async function updateBag() {
    if (!editBag) return;
    try {
      await apiPatch(`/api/bags/${editBag.id}`, {
        bagNumber: editBag.bagNumber,
        weightKg: editBag.weightKg,
        description: editBag.description,
        shippingCharge: editBag.shippingCharge ?? null,
        status: editBag.status,
        customerId: editBag.customer?.id || null,
        items: editBag.items || [],
      });
      setEditBag(null);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update bag");
    }
  }

  async function addBags() {
    try {
      await apiPost(`/api/shipments/${id}/bags`, {
        count: Number(addCount) || 1,
      });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to add bags");
    }
  }

  if (error && !shipment) {
    return (
      <Card>
        <div className="text-red-700">{error}</div>
        <Button className="mt-3" onClick={() => load()}>
          Retry
        </Button>
      </Card>
    );
  }

  if (!shipment) return <div className="text-[var(--muted)]">Loading shipment…</div>;

  const assignHref =
    selected.size > 0
      ? `/transport/new?bags=${Array.from(selected).join(",")}`
      : "/transport/new";

  const totalWeight = shipment.bags.reduce(
    (s, b) => s + (b.weightKg != null ? b.weightKg : 0),
    0
  );

  return (
    <div>
      <PageHeader
        title={`Lot ${shipment.lotNumber}`}
        subtitle={`${
          shipment.direction === "IN_TO_TH" ? "India → Thailand" : "Thailand → India"
        }${shipment.batchNumber ? ` · Batch ${shipment.batchNumber}` : ""} · ${
          shipment.originWarehouse?.city || "?"
        } → ${shipment.destWarehouse?.city || "?"}`}
        actions={
          <>
            <Link href="/shipments">
              <Button variant="secondary">All shipments</Button>
            </Link>
            <Link href={assignHref}>
              <Button disabled={selected.size === 0}>
                Assign transport ({selected.size})
              </Button>
            </Link>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card>
          <div className="text-sm text-[var(--muted)]">Goods owner</div>
          <div className="mt-1 font-display text-xl">
            {shipment.ownerParty?.name || "—"}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-[var(--muted)]">Total weight</div>
          <div className="mt-1 font-display text-xl">
            {totalWeight.toLocaleString("en-IN", { maximumFractionDigits: 2 })} kg
          </div>
        </Card>
        <Card>
          <div className="text-sm text-[var(--muted)]">Shipping charges</div>
          <div className="mt-1 font-display text-xl">
            {shipment.shippingChargeTotal != null
              ? formatMoney(
                  shipment.shippingChargeTotal,
                  shipment.shippingCurrency || "INR"
                )
              : "—"}
          </div>
          {shipment.shippingInvoicedAt && (
            <div className="mt-1 text-xs text-emerald-700">
              Invoiced
              {shipment.invoices?.[0]
                ? ` · ${shipment.invoices[0].number}`
                : ""}{" "}
              · on owner ledger
            </div>
          )}
        </Card>
      </div>

      <Card className="mb-4 flex flex-wrap items-end gap-3">
        <Input
          label="Add more bags"
          type="number"
          min={1}
          className="w-28"
          value={addCount}
          onChange={(e) => setAddCount(e.target.value)}
        />
        <Button variant="secondary" onClick={addBags}>
          Add bags
        </Button>
        <div className="ml-auto text-sm text-[var(--muted)]">
          {shipment.bags.length} bags · select bags to assign air / sea / land / carry person
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="data">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={
                    shipment.bags.length > 0 && selected.size === shipment.bags.length
                  }
                  onChange={toggleAll}
                />
              </th>
              <th>Bag</th>
              <th>Weight</th>
              <th>Items</th>
              <th>Deliver to</th>
              <th>Ship charge</th>
              <th>Status</th>
              <th>Transport</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {shipment.bags.map((b) => {
              const ta = b.transportAssignments[0]?.transportAssignment;
              return (
                <tr key={b.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(b.id)}
                      onChange={() => toggle(b.id)}
                    />
                  </td>
                  <td className="font-medium">#{b.bagNumber}</td>
                  <td>{b.weightKg != null ? `${b.weightKg} kg` : "—"}</td>
                  <td className="text-xs">
                    {(b.items || []).length > 0
                      ? (b.items || [])
                          .map((it) => `${it.name} × ${it.quantity}`)
                          .join(", ")
                      : b.contents || b.description || "—"}
                  </td>
                  <td>{b.customer?.name || "—"}</td>
                  <td>
                    {b.shippingCharge != null
                      ? formatMoney(
                          b.shippingCharge,
                          shipment.shippingCurrency || "INR"
                        )
                      : "—"}
                  </td>
                  <td>
                    <Badge tone={statusTone(b.status)}>
                      {BAG_STATUS_LABELS[b.status] || b.status}
                    </Badge>
                  </td>
                  <td className="text-xs">
                    {ta ? (
                      <>
                        {TRANSPORT_MODE_LABELS[ta.mode] || ta.mode}
                        <br />
                        {ta.carrier?.name || ta.carrierName || "—"}
                        <br />
                        {format(new Date(ta.assignedDate), "dd MMM yyyy")}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <button
                      className="text-sm text-[var(--accent)]"
                      onClick={() => setEditBag(b)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Modal open={!!editBag} onClose={() => setEditBag(null)} title="Edit bag">
        {editBag && (
          <div className="grid gap-3">
            <Input
              label="Bag number"
              value={editBag.bagNumber}
              onChange={(e) => setEditBag({ ...editBag, bagNumber: e.target.value })}
            />
            <Input
              label="Weight (kg)"
              type="number"
              value={editBag.weightKg ?? ""}
              onChange={(e) =>
                setEditBag({
                  ...editBag,
                  weightKg: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
            <Input
              label="Shipping charge (this bag)"
              type="number"
              step="0.01"
              value={editBag.shippingCharge ?? ""}
              onChange={(e) =>
                setEditBag({
                  ...editBag,
                  shippingCharge: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
            />
            <Input
              label="Description"
              value={editBag.description || ""}
              onChange={(e) =>
                setEditBag({ ...editBag, description: e.target.value })
              }
            />
            <div>
              <div className="mb-1.5 text-sm text-[var(--muted)]">
                Items (name + pcs)
              </div>
              <div className="space-y-1.5">
                {(editBag.items || [{ id: "new", name: "", quantity: 1 }]).map(
                  (it, j) => (
                    <div key={it.id || j} className="flex gap-2">
                      <input
                        className="min-w-0 flex-1 rounded border border-[var(--line)] px-2 py-1 text-sm"
                        placeholder="Item"
                        value={it.name}
                        onChange={(e) => {
                          const items = [...(editBag.items || [])];
                          if (!items[j])
                            items[j] = { id: `tmp_${j}`, name: "", quantity: 1 };
                          items[j] = { ...items[j], name: e.target.value };
                          setEditBag({ ...editBag, items });
                        }}
                      />
                      <input
                        type="number"
                        min={1}
                        className="w-20 rounded border border-[var(--line)] px-2 py-1 text-sm"
                        value={it.quantity}
                        onChange={(e) => {
                          const items = [...(editBag.items || [])];
                          if (!items[j])
                            items[j] = { id: `tmp_${j}`, name: "", quantity: 1 };
                          items[j] = {
                            ...items[j],
                            quantity: Number(e.target.value) || 1,
                          };
                          setEditBag({ ...editBag, items });
                        }}
                      />
                    </div>
                  )
                )}
                <button
                  type="button"
                  className="text-xs text-[var(--accent)]"
                  onClick={() =>
                    setEditBag({
                      ...editBag,
                      items: [
                        ...(editBag.items || []),
                        { id: `tmp_${Date.now()}`, name: "", quantity: 1 },
                      ],
                    })
                  }
                >
                  + Add item
                </button>
              </div>
            </div>
            <Select
              label="Status"
              value={editBag.status}
              onChange={(e) => setEditBag({ ...editBag, status: e.target.value })}
            >
              {Object.entries(BAG_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditBag(null)}>
                Cancel
              </Button>
              <Button onClick={updateBag}>Save</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
