"use client";

import { useEffect, useState, use, useMemo } from "react";
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
  deriveShipmentStatus,
  formatMoney,
} from "@/lib/utils";
import { format } from "date-fns";
import { apiGet, apiPost, apiPatch } from "@/lib/client-api";
import { PackingListModal } from "@/components/PackingListModal";
import { FileText } from "lucide-react";

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
  customer: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  } | null;
  warehouse: { name: string } | null;
  items?: Array<{ id: string; name: string; quantity: number; unit?: string }>;
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
  ownerParty?: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  } | null;
  shippingRatePerKg?: number | null;
  shippingCurrency?: "INR" | "THB";
  shippingChargeTotal?: number | null;
  shippingInvoicedAt?: string | null;
  invoices?: Array<{
    id: string;
    number: string;
    amount: number;
    currency: string;
  }>;
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
  const [packingOpen, setPackingOpen] = useState(false);

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

  const bagsByDeliverTo = useMemo(() => {
    const bags = shipment?.bags || [];
    const groups = new Map<
      string,
      { key: string; label: string; bags: Bag[] }
    >();
    for (const b of bags) {
      const key = b.customer?.id || "__none__";
      const label = b.customer?.name || "No deliver-to assigned";
      const g = groups.get(key) || { key, label, bags: [] };
      g.bags.push(b);
      groups.set(key, g);
    }
    return [...groups.values()].sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [shipment?.bags]);

  const packingRecipients = useMemo(() => {
    if (!shipment) return [];
    const list: Array<{
      id: string;
      name: string;
      phone?: string | null;
      email?: string | null;
      role: string;
    }> = [];
    if (shipment.ownerParty) {
      list.push({
        id: `owner-${shipment.ownerParty.id}`,
        name: shipment.ownerParty.name,
        phone: shipment.ownerParty.phone,
        email: shipment.ownerParty.email,
        role: "Goods owner",
      });
    }
    const seen = new Set(list.map((r) => r.name));
    for (const b of shipment.bags) {
      if (!b.customer || seen.has(b.customer.name)) continue;
      seen.add(b.customer.name);
      list.push({
        id: `deliver-${b.customer.id}`,
        name: b.customer.name,
        phone: b.customer.phone,
        email: b.customer.email,
        role: "Deliver to",
      });
    }
    return list;
  }, [shipment]);

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

  const shipmentStatus = deriveShipmentStatus(shipment.bags);

  return (
    <div>
      <PageHeader
        title={`Lot ${shipment.lotNumber}`}
        subtitle={`${
          shipment.direction === "IN_TO_TH"
            ? "India → Thailand"
            : "Thailand → India"
        }${shipment.batchNumber ? ` · Batch ${shipment.batchNumber}` : ""} · ${
          shipment.originWarehouse?.city || "?"
        } → ${shipment.destWarehouse?.city || "?"}`}
        actions={
          <>
            <Link href="/shipments">
              <Button variant="secondary">All shipments</Button>
            </Link>
            <Button variant="secondary" onClick={() => setPackingOpen(true)}>
              <FileText size={16} />
              Packing list
            </Button>
            <Link href={assignHref}>
              <Button disabled={selected.size === 0}>
                Assign transport ({selected.size})
              </Button>
            </Link>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="text-sm text-[var(--muted)]">Shipment status</div>
          <div className="mt-2">
            <Badge tone={statusTone(shipmentStatus.key)}>
              {shipmentStatus.label}
            </Badge>
          </div>
          <div className="mt-2 text-xs text-[var(--muted)]">
            From bag progress across this lot
          </div>
        </Card>
        <Card>
          <div className="text-sm text-[var(--muted)]">Bags in this shipment</div>
          <div className="mt-1 font-display text-xl">
            {shipment.bags.length}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-[var(--muted)]">Goods owner</div>
          <div className="mt-1 font-display text-xl">
            {shipment.ownerParty?.name || "—"}
          </div>
        </Card>
        <Card>
          <div className="text-sm text-[var(--muted)]">Total weight</div>
          <div className="mt-1 font-display text-xl">
            {totalWeight.toLocaleString("en-IN", {
              maximumFractionDigits: 2,
            })}{" "}
            kg
          </div>
          {shipment.shippingChargeTotal != null && (
            <div className="mt-1 text-sm text-[var(--muted)]">
              Shipping{" "}
              {formatMoney(
                shipment.shippingChargeTotal,
                shipment.shippingCurrency || "INR"
              )}
              {shipment.invoices?.[0] && (
                <>
                  {" · "}
                  <Link
                    href={`/billing/${shipment.invoices[0].id}`}
                    className="text-[var(--accent)] underline"
                  >
                    {shipment.invoices[0].number}
                  </Link>
                </>
              )}
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
          Bags stay under this shipment · select to assign transport
        </div>
      </Card>

      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-display text-lg">
          Bags in Lot {shipment.lotNumber}
        </h2>
        <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <input
            type="checkbox"
            checked={
              shipment.bags.length > 0 &&
              selected.size === shipment.bags.length
            }
            onChange={toggleAll}
          />
          Select all
        </label>
      </div>

      <div className="space-y-4">
        {bagsByDeliverTo.map((group) => (
          <Card key={group.key} className="overflow-x-auto p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--bg)] px-4 py-2.5">
              <div>
                <div className="text-xs uppercase tracking-wide text-[var(--muted)]">
                  Deliver to
                </div>
                <div className="font-medium">{group.label}</div>
              </div>
              <div className="text-sm text-[var(--muted)]">
                {group.bags.length} bag{group.bags.length === 1 ? "" : "s"}
              </div>
            </div>
            <table className="data">
              <thead>
                <tr>
                  <th></th>
                  <th>Bag</th>
                  <th>Weight</th>
                  <th>Items</th>
                  <th>Ship charge</th>
                  <th>Status</th>
                  <th>Transport</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {group.bags.map((b) => {
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
                      <td>
                        {b.weightKg != null ? `${b.weightKg} kg` : "—"}
                      </td>
                      <td className="text-xs">
                        {(b.items || []).length > 0
                          ? (b.items || [])
                              .map(
                                (it) =>
                                  `${it.name} × ${it.quantity} ${it.unit || "pcs"}`
                              )
                              .join(", ")
                          : b.contents || b.description || "—"}
                      </td>
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
        ))}
      </div>

      <PackingListModal
        open={packingOpen}
        onClose={() => setPackingOpen(false)}
        shipment={{
          lotNumber: shipment.lotNumber,
          batchNumber: shipment.batchNumber,
          direction: shipment.direction,
          shipDate: shipment.shipDate,
          notes: shipment.notes,
          originCity: shipment.originWarehouse?.city || null,
          destCity: shipment.destWarehouse?.city || null,
          ownerName: shipment.ownerParty?.name || null,
          shippingCurrency: shipment.shippingCurrency || "INR",
          shippingChargeTotal: shipment.shippingChargeTotal,
          bags: shipment.bags.map((b) => ({
            bagNumber: b.bagNumber,
            weightKg: b.weightKg,
            status: b.status,
            customerName: b.customer?.name || null,
            shippingCharge: b.shippingCharge,
            items: (b.items || []).map((it) => ({
              name: it.name,
              quantity: it.quantity,
              unit: it.unit,
            })),
            description: b.description || b.contents,
          })),
        }}
        recipients={packingRecipients}
      />

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
                {(editBag.items || [
                  { id: "new", name: "", quantity: 1, unit: "pcs" },
                ]).map((it, j) => (
                    <div key={it.id || j} className="flex gap-2">
                      <input
                        className="min-w-0 flex-1 rounded border border-[var(--line)] px-2 py-1 text-sm"
                        placeholder="Item"
                        value={it.name}
                        onChange={(e) => {
                          const items = [...(editBag.items || [])];
                          if (!items[j])
                            items[j] = {
                              id: `tmp_${j}`,
                              name: "",
                              quantity: 1,
                              unit: "pcs",
                            };
                          items[j] = { ...items[j], name: e.target.value };
                          setEditBag({ ...editBag, items });
                        }}
                      />
                      <input
                        type="number"
                        min={0.01}
                        step="0.01"
                        className="w-16 rounded border border-[var(--line)] px-2 py-1 text-sm"
                        value={it.quantity}
                        onChange={(e) => {
                          const items = [...(editBag.items || [])];
                          if (!items[j])
                            items[j] = {
                              id: `tmp_${j}`,
                              name: "",
                              quantity: 1,
                              unit: "pcs",
                            };
                          items[j] = {
                            ...items[j],
                            quantity: Number(e.target.value) || 1,
                          };
                          setEditBag({ ...editBag, items });
                        }}
                      />
                      <input
                        className="w-20 rounded border border-[var(--line)] px-2 py-1 text-sm"
                        placeholder="unit"
                        value={it.unit || "pcs"}
                        onChange={(e) => {
                          const items = [...(editBag.items || [])];
                          if (!items[j])
                            items[j] = {
                              id: `tmp_${j}`,
                              name: "",
                              quantity: 1,
                              unit: "pcs",
                            };
                          items[j] = {
                            ...items[j],
                            unit: e.target.value || "pcs",
                          };
                          setEditBag({ ...editBag, items });
                        }}
                      />
                    </div>
                  ))}
                <button
                  type="button"
                  className="text-xs text-[var(--accent)]"
                  onClick={() =>
                    setEditBag({
                      ...editBag,
                      items: [
                        ...(editBag.items || []),
                        {
                          id: `tmp_${Date.now()}`,
                          name: "",
                          quantity: 1,
                          unit: "pcs",
                        },
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
