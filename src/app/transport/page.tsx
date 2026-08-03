"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  EmptyState,
  Modal,
  Select,
  Input,
  statusTone,
} from "@/components/ui";
import {
  TRANSPORT_MODE_LABELS,
  BAG_STATUS_LABELS,
  formatMoney,
} from "@/lib/utils";
import { format } from "date-fns";
import { apiGet, apiPatch, apiPost } from "@/lib/client-api";
import {
  Plane,
  Ship,
  Truck,
  UserRound,
  PackageCheck,
  MapPin,
  Clock3,
  History,
  Link2,
  Unlink,
  Bike,
} from "lucide-react";

type BagRow = {
  id: string;
  bagNumber: string;
  status: string;
  weightKg: number | null;
  arrivedAt?: string | null;
  customer: {
    id: string;
    name: string;
    phone?: string | null;
    city?: string | null;
    address?: string | null;
  } | null;
  shipment: {
    id: string;
    lotNumber: string;
    destWarehouse?: {
      id: string;
      name: string;
      city: string;
      address?: string | null;
    } | null;
    originWarehouse?: { name: string; city: string } | null;
    ownerParty?: { name: string } | null;
  };
};

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
  trackingRef: string | null;
  notes?: string | null;
  carrier: { id: string; name: string; phone?: string | null } | null;
  carrierName: string | null;
  bags: Array<{ bag: BagRow }>;
  ledgerEntries: Array<{ id: string; amount: number; currency: string }>;
};

type LalamoveSettings = {
  connected: boolean;
  market: string;
  sandbox: boolean;
  connectedAt?: string | null;
  hasApiKey: boolean;
  apiKeyMasked: string | null;
};

type LastMile = {
  id: string;
  status: string;
  externalOrderId: string | null;
  quoteAmount: number | null;
  currency: "INR" | "THB";
  vehicleType: string | null;
  trackingUrl: string | null;
  pickupAddress: string | null;
  dropoffAddress: string | null;
  bookedAt: string | null;
  completedAt: string | null;
  customer: { id: string; name: string; phone?: string | null } | null;
  pickupWarehouse: { name: string; city: string } | null;
  bags: Array<{ bag: { id: string; bagNumber: string; shipment: { lotNumber: string } } }>;
};

type Tab = "active" | "lastmile" | "upcoming" | "history";

function modeIcon(mode: string) {
  if (mode === "AIR") return Plane;
  if (mode === "SEA") return Ship;
  if (mode === "LAND") return Truck;
  return UserRound;
}

function assignmentPhase(a: Assignment) {
  if (a.deliveredToCustomer) return "delivered";
  if (a.arrivalDate) return "arrived";
  if (a.departureDate) return "transit";
  return "assigned";
}

function phaseBadge(a: Assignment) {
  const p = assignmentPhase(a);
  if (p === "delivered") return <Badge tone="ok">Delivered</Badge>;
  if (p === "arrived") return <Badge tone="info">At dest warehouse</Badge>;
  if (p === "transit") return <Badge tone="accent">In transit</Badge>;
  return <Badge tone="warn">Assigned</Badge>;
}

export default function TransportPage() {
  const [items, setItems] = useState<Assignment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Assignment | null>(null);
  const [tab, setTab] = useState<Tab>("active");
  const [lalamove, setLalamove] = useState<{
    settings: LalamoveSettings;
    deliveries: LastMile[];
    readyBags: BagRow[];
  } | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [market, setMarket] = useState("TH");
  const [bookOpen, setBookOpen] = useState(false);
  const [bookBagIds, setBookBagIds] = useState<string[]>([]);
  const [quote, setQuote] = useState<{
    amount: number;
    currency: "INR" | "THB";
    vehicleType: string;
    etaMinutes: number;
    quoteId: string;
  } | null>(null);
  const [quoteMeta, setQuoteMeta] = useState<{
    pickup?: { name: string; address: string } | null;
    dropoff?: { name: string; address: string | null; phone?: string | null } | null;
    weightKg?: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [transport, lm] = await Promise.all([
        apiGet<Assignment[]>("/api/transport"),
        apiGet<{
          settings: LalamoveSettings;
          deliveries: LastMile[];
          readyBags: BagRow[];
        }>("/api/lalamove"),
      ]);
      setItems(transport);
      setLalamove(lm);
      setMarket(lm.settings.market || "TH_BKK");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const widgets = useMemo(() => {
    const list = items || [];
    const inTransit = list.filter((a) => assignmentPhase(a) === "transit").length;
    const atDest = list.filter((a) => assignmentPhase(a) === "arrived").length;
    const delivered = list.filter((a) => assignmentPhase(a) === "delivered").length;
    const assigned = list.filter((a) => assignmentPhase(a) === "assigned").length;
    const openBags = list
      .filter((a) => !a.deliveredToCustomer)
      .reduce((s, a) => s + a.bags.length, 0);
    const carriers = new Map<string, number>();
    for (const a of list.filter((x) => !x.deliveredToCustomer)) {
      const name = a.carrier?.name || a.carrierName || "Unnamed";
      carriers.set(name, (carriers.get(name) || 0) + 1);
    }
    const readyLm = lalamove?.readyBags.length || 0;
    const lmBooked =
      lalamove?.deliveries.filter((d) => d.status === "BOOKED").length || 0;
    return {
      inTransit,
      atDest,
      delivered,
      assigned,
      openBags,
      readyLm,
      lmBooked,
      carriers: [...carriers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  }, [items, lalamove]);

  const upcoming = useMemo(() => {
    return (items || [])
      .filter(
        (a) =>
          !a.deliveredToCustomer && !a.arrivalDate && a.departureDate != null
      )
      .slice(0, 12);
  }, [items]);

  const history = useMemo(
    () =>
      (items || [])
        .filter((a) => a.deliveredToCustomer || a.arrivalDate)
        .slice(0, 20),
    [items]
  );

  const activeList = useMemo(
    () => (items || []).filter((a) => !a.deliveredToCustomer),
    [items]
  );

  async function updateStatus(id: string, patch: Record<string, unknown>) {
    setBusy(true);
    try {
      await apiPatch(`/api/transport/${id}`, patch);
      setActive(null);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setBusy(false);
    }
  }

  async function connectLalamove() {
    if (!apiKey.trim()) {
      alert("Paste your Lalamove API key");
      return;
    }
    if (!apiSecret.trim()) {
      alert("Paste your Lalamove API secret (Partner Portal → Developers)");
      return;
    }
    setBusy(true);
    try {
      await apiPost("/api/lalamove", {
        action: "connect",
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
        market,
        sandbox: true,
      });
      setConnectOpen(false);
      setApiKey("");
      setApiSecret("");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to connect");
    } finally {
      setBusy(false);
    }
  }

  async function disconnectLalamove() {
    if (!confirm("Disconnect Lalamove from LogiOp?")) return;
    setBusy(true);
    try {
      await apiPost("/api/lalamove", { action: "disconnect" });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function openBookForCustomer(bags: BagRow[]) {
    setBookBagIds(bags.map((b) => b.id));
    setQuote(null);
    setQuoteMeta(null);
    setBookOpen(true);
  }

  async function getQuote() {
    setBusy(true);
    try {
      const res = await apiPost<{
        quote: {
          amount: number;
          currency: "INR" | "THB";
          vehicleType: string;
          etaMinutes: number;
          quoteId: string;
        };
        pickup: { name: string; address: string } | null;
        dropoff: {
          name: string;
          address: string | null;
          phone?: string | null;
        } | null;
        weightKg: number;
      }>("/api/lalamove", { action: "quote", bagIds: bookBagIds });
      setQuote(res.quote);
      setQuoteMeta({
        pickup: res.pickup,
        dropoff: res.dropoff,
        weightKg: res.weightKg,
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Quote failed");
    } finally {
      setBusy(false);
    }
  }

  async function bookLalamove() {
    setBusy(true);
    try {
      await apiPost("/api/lalamove", {
        action: "book",
        bagIds: bookBagIds,
        quoteAmount: quote?.amount,
      });
      setBookOpen(false);
      setTab("lastmile");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setBusy(false);
    }
  }

  async function completeDelivery(id: string) {
    setBusy(true);
    try {
      await apiPost("/api/lalamove", { action: "complete", id });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const readyByCustomer = useMemo(() => {
    const map = new Map<string, { customer: BagRow["customer"]; bags: BagRow[] }>();
    for (const b of lalamove?.readyBags || []) {
      const key = b.customer?.id || "__none__";
      const g = map.get(key) || { customer: b.customer, bags: [] };
      g.bags.push(b);
      map.set(key, g);
    }
    return [...map.values()];
  }, [lalamove]);

  if (error && !items) {
    return (
      <Card>
        <div className="text-red-700">{error}</div>
        <Button className="mt-3" onClick={() => load()}>
          Retry
        </Button>
      </Card>
    );
  }

  if (!items || !lalamove) {
    return <div className="text-[var(--muted)]">Loading transport ops…</div>;
  }

  return (
    <div>
      <PageHeader
        title="Transport ops"
        subtitle="Long-haul to destination warehouse, then Lalamove last-mile to the end customer"
        actions={
          <>
            <Link href="/lalamove">
              <Button variant="secondary">
                <Bike size={16} />
                Lalamove hub
              </Button>
            </Link>
            <Button
              variant="secondary"
              onClick={() => setConnectOpen(true)}
            >
              <Link2 size={16} />
              {lalamove.settings.connected ? "Lalamove settings" : "Connect Lalamove"}
            </Button>
            <Link href="/transport/new">
              <Button>Assign transport</Button>
            </Link>
          </>
        }
      />

      {/* Widgets */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="flex items-center justify-between text-sm text-[var(--muted)]">
            In transit <Truck size={16} />
          </div>
          <div className="mt-2 font-display text-3xl">{widgets.inTransit}</div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            {widgets.openBags} bags still moving
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between text-sm text-[var(--muted)]">
            At dest warehouse <MapPin size={16} />
          </div>
          <div className="mt-2 font-display text-3xl">{widgets.atDest}</div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            {widgets.readyLm} bags ready for Lalamove
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between text-sm text-[var(--muted)]">
            Delivered <PackageCheck size={16} />
          </div>
          <div className="mt-2 font-display text-3xl text-emerald-700">
            {widgets.delivered}
          </div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            Closed long-haul legs
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between text-sm text-[var(--muted)]">
            Lalamove <Bike size={16} />
          </div>
          <div className="mt-2 font-display text-3xl">{widgets.lmBooked}</div>
          <div className="mt-1 text-xs text-[var(--muted)]">
            {lalamove.settings.connected ? (
              <span className="text-emerald-700">
                Connected · {lalamove.settings.market}
                {lalamove.settings.sandbox ? " (sandbox)" : ""}
              </span>
            ) : (
              "Not connected"
            )}
          </div>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="font-display text-lg">Who is running open legs</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Carriers / transporters currently responsible for bags in motion.
          </p>
          {widgets.carriers.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted)]">No open assignments.</p>
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {widgets.carriers.map(([name, count]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2"
                >
                  <div className="font-medium">{name}</div>
                  <Badge tone="accent">
                    {count} run{count === 1 ? "" : "s"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h2 className="font-display text-lg">Pipeline</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Assigned</span>
              <strong>{widgets.assigned}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">In transit</span>
              <strong>{widgets.inTransit}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">At warehouse</span>
              <strong>{widgets.atDest}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Delivered</span>
              <strong className="text-emerald-700">{widgets.delivered}</strong>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2 border-b border-[var(--line)] pb-2">
        {(
          [
            ["active", "Active runs", activeList.length],
            ["lastmile", "Last-mile (Lalamove)", widgets.readyLm + widgets.lmBooked],
            ["upcoming", "Upcoming", upcoming.length],
            ["history", "History", history.length],
          ] as Array<[Tab, string, number]>
        ).map(([key, label, n]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              tab === key
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)] hover:bg-[var(--bg)]"
            }`}
          >
            {label} ({n})
          </button>
        ))}
      </div>

      {tab === "active" && (
        <div className="space-y-3">
          {activeList.length === 0 ? (
            <EmptyState
              title="No active transport"
              hint="Assign bags from a shipment to air / sea / land / carry person."
            />
          ) : (
            activeList.map((a) => {
              const Icon = modeIcon(a.mode);
              const payable =
                a.ratePerKg != null && a.totalWeightKg != null
                  ? a.ratePerKg * a.totalWeightKg
                  : null;
              const lots = Array.from(
                new Set(a.bags.map((b) => b.bag.shipment.lotNumber))
              );
              return (
                <Card key={a.id}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-[var(--accent-soft)] p-2 text-[var(--accent-ink)]">
                          <Icon size={18} />
                        </span>
                        <div>
                          <div className="font-display text-xl">
                            {a.carrier?.name || a.carrierName || "Unnamed carrier"}
                          </div>
                          <div className="text-sm text-[var(--muted)]">
                            {TRANSPORT_MODE_LABELS[a.mode] || a.mode} ·{" "}
                            {format(new Date(a.assignedDate), "dd MMM yyyy")}
                            {a.trackingRef ? ` · Ref ${a.trackingRef}` : ""}
                          </div>
                        </div>
                        {phaseBadge(a)}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {lots.map((lot) => (
                          <Link key={lot} href={`/shipments/${a.bags.find((b) => b.bag.shipment.lotNumber === lot)?.bag.shipment.id}`}>
                            <Badge tone="accent">Lot {lot}</Badge>
                          </Link>
                        ))}
                        <Badge tone="neutral">{a.bags.length} bags</Badge>
                        {a.ledgerEntries.length > 0 && (
                          <Badge tone="info">Ledger synced</Badge>
                        )}
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
                            .slice(0, 10)
                            .join(", ")}
                          {a.bags.length > 10 ? "…" : ""}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {payable != null && (
                        <div className="font-display text-xl">
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
                        Change status
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {tab === "lastmile" && (
        <div className="space-y-4">
          {!lalamove.settings.connected && (
            <Card className="border-[var(--accent)] bg-[var(--accent-soft)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-display text-lg">Connect Lalamove</div>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    After bags arrive at the destination warehouse, book a rider
                    to the end customer&apos;s address.
                  </p>
                </div>
                <Button onClick={() => setConnectOpen(true)}>Connect</Button>
              </div>
            </Card>
          )}

          <Card>
            <h2 className="font-display text-lg">Ready at destination warehouse</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Bags marked Arrived — book Lalamove for last-mile delivery.
            </p>
            {readyByCustomer.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--muted)]">
                No arrived bags waiting. Mark a transport leg as arrived first.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {readyByCustomer.map((g) => {
                  const wh = g.bags[0]?.shipment.destWarehouse;
                  const weight = g.bags.reduce(
                    (s, b) => s + (b.weightKg || 0),
                    0
                  );
                  return (
                    <div
                      key={g.customer?.id || "none"}
                      className="rounded-lg border border-[var(--line)] bg-[var(--bg)] p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">
                            {g.customer?.name || "No deliver-to party"}
                          </div>
                          <div className="mt-1 text-xs text-[var(--muted)]">
                            {[g.customer?.phone, g.customer?.address || g.customer?.city]
                              .filter(Boolean)
                              .join(" · ") || "Add phone/address on party for Lalamove"}
                          </div>
                          <div className="mt-1 text-xs text-[var(--muted)]">
                            Pickup: {wh?.name || "Dest warehouse"}
                            {wh?.city ? ` · ${wh.city}` : ""} · {g.bags.length}{" "}
                            bags · {weight} kg
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {g.bags.map((b) => (
                              <Badge key={b.id} tone="info">
                                #{b.bagNumber} · {b.shipment.lotNumber}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button
                          disabled={!lalamove.settings.connected || !g.customer}
                          onClick={() => openBookForCustomer(g.bags)}
                        >
                          <Bike size={16} />
                          Book Lalamove
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="font-display text-lg">Lalamove orders</h2>
            {(lalamove.deliveries || []).length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">No last-mile bookings yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {lalamove.deliveries.map((d) => (
                  <div
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--line)] px-3 py-2"
                  >
                    <div>
                      <div className="font-medium">
                        {d.customer?.name || "Customer"} ·{" "}
                        {d.externalOrderId || d.id.slice(0, 8)}
                      </div>
                      <div className="text-xs text-[var(--muted)]">
                        {d.pickupWarehouse?.name || d.pickupAddress || "Pickup"} →{" "}
                        {d.dropoffAddress || "Dropoff"} ·{" "}
                        {d.bags.map((b) => `#${b.bag.bagNumber}`).join(", ")}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        tone={
                          d.status === "COMPLETED"
                            ? "ok"
                            : d.status === "CANCELLED"
                              ? "danger"
                              : "accent"
                        }
                      >
                        {d.status}
                      </Badge>
                      {d.quoteAmount != null && (
                        <span className="text-sm">
                          {formatMoney(d.quoteAmount, d.currency)}
                        </span>
                      )}
                      {d.status === "BOOKED" && (
                        <Button
                          variant="secondary"
                          onClick={() => completeDelivery(d.id)}
                          disabled={busy}
                        >
                          Mark delivered
                        </Button>
                      )}
                      {d.trackingUrl && (
                        <a
                          href={d.trackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-[var(--accent)]"
                        >
                          Track
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "upcoming" && (
        <div className="space-y-3">
          {upcoming.length === 0 ? (
            <EmptyState
              title="No upcoming arrivals"
              hint="Legs that have departed but not yet arrived show here."
            />
          ) : (
            upcoming.map((a) => (
              <Card key={a.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock3 size={16} className="text-[var(--muted)]" />
                      <span className="font-display text-lg">
                        {a.carrier?.name || a.carrierName || "Carrier"}
                      </span>
                      {phaseBadge(a)}
                    </div>
                    <div className="mt-1 text-sm text-[var(--muted)]">
                      Departed{" "}
                      {a.departureDate
                        ? format(new Date(a.departureDate), "dd MMM yyyy")
                        : "—"}{" "}
                      · {a.bags.length} bags · Lots{" "}
                      {Array.from(
                        new Set(a.bags.map((b) => b.bag.shipment.lotNumber))
                      ).join(", ")}
                    </div>
                  </div>
                  <Button variant="secondary" onClick={() => setActive(a)}>
                    Update
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <EmptyState title="No history yet" hint="Completed and arrived legs appear here." />
          ) : (
            history.map((a) => (
              <Card key={a.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <History size={16} className="text-[var(--muted)]" />
                      <span className="font-display text-lg">
                        {a.carrier?.name || a.carrierName || "Carrier"}
                      </span>
                      {phaseBadge(a)}
                    </div>
                    <div className="mt-1 text-sm text-[var(--muted)]">
                      {TRANSPORT_MODE_LABELS[a.mode]} ·{" "}
                      {format(new Date(a.assignedDate), "dd MMM yyyy")}
                      {a.arrivalDate
                        ? ` · Arrived ${format(new Date(a.arrivalDate), "dd MMM yyyy")}`
                        : ""}
                      {a.deliveredToCustomer && a.bags[0]
                        ? ` · ${a.bags.length} bags`
                        : ""}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {a.bags.slice(0, 6).map((b) => (
                        <Badge key={b.bag.id} tone={statusTone(b.bag.status)}>
                          #{b.bag.bagNumber} {BAG_STATUS_LABELS[b.bag.status]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" onClick={() => setActive(a)}>
                    Details
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Status modal */}
      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        title="Update transport status"
      >
        {active && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--muted)]">
              {active.carrier?.name || active.carrierName} · {active.bags.length}{" "}
              bags · {phaseBadge(active)}
            </p>
            <div className="grid gap-2">
              <Button
                variant="secondary"
                disabled={busy}
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
                disabled={busy}
                onClick={() =>
                  updateStatus(active.id, {
                    arrivalDate: new Date().toISOString(),
                    markBagsStatus: "ARRIVED",
                  })
                }
              >
                Mark arrived at destination warehouse
              </Button>
              <Button
                disabled={busy}
                onClick={() => {
                  updateStatus(active.id, {
                    deliveredToCustomer: true,
                    markBagsStatus: "DELIVERED",
                  });
                }}
              >
                Mark long-haul complete (delivered)
              </Button>
              <p className="text-xs text-[var(--muted)]">
                Prefer Lalamove for end-customer delivery after warehouse
                arrival — use the Last-mile tab.
              </p>
              {active.ledgerEntries.length === 0 &&
                active.carrier &&
                active.ratePerKg &&
                active.totalWeightKg && (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() =>
                      updateStatus(active.id, { syncToLedger: true })
                    }
                  >
                    Sync payment to ledger
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

      {/* Connect Lalamove */}
      <Modal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        title="Connect Lalamove"
      >
        <p className="mb-3 text-sm text-[var(--muted)]">
          Prefer the{" "}
          <Link href="/lalamove" className="text-[var(--accent)] underline">
            Lalamove hub
          </Link>{" "}
          for saved addresses, live tracking, and full booking. Paste key + secret
          from Partner Portal → Developers.
        </p>
        {lalamove.settings.connected ? (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Connected · {lalamove.settings.apiKeyMasked} ·{" "}
            {lalamove.settings.market}
            {lalamove.settings.sandbox ? " · sandbox" : ""}
          </div>
        ) : null}
        <div className="grid gap-3">
          <Input
            label="API key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="pk_test_… or pk_prod_…"
          />
          <Input
            label="API secret"
            type="password"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            placeholder="sk_test_… or sk_prod_…"
          />
          <Select
            label="Market"
            value={market}
            onChange={(e) => setMarket(e.target.value)}
          >
            <option value="TH">Thailand (TH)</option>
            <option value="IN">India (IN)</option>
            <option value="HK">Hong Kong (HK)</option>
            <option value="SG">Singapore (SG)</option>
            <option value="MY">Malaysia (MY)</option>
          </Select>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {lalamove.settings.connected && (
            <Button
              variant="danger"
              onClick={disconnectLalamove}
              disabled={busy}
            >
              <Unlink size={16} />
              Disconnect
            </Button>
          )}
          <Button variant="secondary" onClick={() => setConnectOpen(false)}>
            Close
          </Button>
          <Button
            onClick={connectLalamove}
            disabled={busy || !apiKey.trim() || !apiSecret.trim()}
          >
            {lalamove.settings.connected ? "Update credentials" : "Connect"}
          </Button>
        </div>
      </Modal>

      {/* Book Lalamove */}
      <Modal
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        title="Book Lalamove last-mile"
        wide
      >
        <p className="mb-3 text-sm text-[var(--muted)]">
          Pickup from destination warehouse → dropoff to end customer.{" "}
          {bookBagIds.length} bag{bookBagIds.length === 1 ? "" : "s"} selected.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={getQuote} disabled={busy}>
            Get quote
          </Button>
        </div>
        {quote && (
          <div className="mt-4 space-y-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] p-3 text-sm">
            <div className="font-display text-2xl">
              {formatMoney(quote.amount, quote.currency)}
            </div>
            <div className="text-[var(--muted)]">
              {quote.vehicleType} · ETA ~{quote.etaMinutes} min · Quote{" "}
              {quote.quoteId}
            </div>
            {quoteMeta?.pickup && (
              <div>
                <strong>Pickup:</strong> {quoteMeta.pickup.name} —{" "}
                {quoteMeta.pickup.address}
              </div>
            )}
            {quoteMeta?.dropoff && (
              <div>
                <strong>Dropoff:</strong> {quoteMeta.dropoff.name}
                {quoteMeta.dropoff.address
                  ? ` — ${quoteMeta.dropoff.address}`
                  : ""}
                {quoteMeta.dropoff.phone ? ` · ${quoteMeta.dropoff.phone}` : ""}
              </div>
            )}
            {quoteMeta?.weightKg != null && (
              <div className="text-[var(--muted)]">
                Weight {quoteMeta.weightKg} kg
              </div>
            )}
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setBookOpen(false)}>
            Cancel
          </Button>
          <Button onClick={bookLalamove} disabled={busy || !quote}>
            Confirm booking
          </Button>
        </div>
      </Modal>
    </div>
  );
}
