"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Button,
  Modal,
  Input,
  Select,
  EmptyState,
  Badge,
} from "@/components/ui";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/client-api";
import { LocationPicker, type LocationValue } from "@/components/LocationPicker";
import {
  Bike,
  MapPin,
  Plus,
  RefreshCw,
  Settings2,
  Truck,
  ExternalLink,
  Phone,
  XCircle,
  CheckCircle2,
  Star,
} from "lucide-react";

type Tab = "live" | "book" | "addresses" | "settings";

type Settings = {
  connected: boolean;
  market: string;
  sandbox: boolean;
  language?: string;
  connectedAt: string | null;
  hasApiKey: boolean;
  hasApiSecret?: boolean;
  liveReady?: boolean;
  apiKeyMasked: string | null;
};

type SavedAddress = {
  id: string;
  label: string;
  contactName: string | null;
  phone: string | null;
  address: string;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  kind: string;
  notes: string | null;
};

type Delivery = {
  id: string;
  status: string;
  externalOrderId: string | null;
  quotationId?: string | null;
  quoteAmount: number | null;
  currency: string;
  vehicleType: string | null;
  trackingUrl: string | null;
  pickupAddress: string | null;
  dropoffAddress: string | null;
  pickupContact?: string | null;
  dropoffContact?: string | null;
  dropoffPhone?: string | null;
  driverId?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  providerStatus?: string | null;
  priorityFee?: number | null;
  notes: string | null;
  bookedAt: string | null;
  completedAt: string | null;
  customer?: { id: string; name: string; phone: string | null } | null;
  pickupWarehouse?: { id: string; name: string } | null;
  bags?: Array<{ bag?: { bagNumber?: string; weightKg?: number | null } }>;
};

type ReadyBag = {
  id: string;
  bagNumber: string;
  weightKg: number | null;
  customer?: { id: string; name: string; phone: string | null; address?: string | null; latitude?: number | null; longitude?: number | null } | null;
  shipment?: {
    destWarehouse?: {
      id: string;
      name: string;
      address?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      city?: string;
      country?: string;
    } | null;
  } | null;
};

type Quote = {
  quotationId: string;
  amount: number;
  currency: string;
  vehicleType: string;
  serviceType?: string;
  distanceMeters?: number | null;
  expiresAt?: string | null;
  stops?: Array<{ stopId: string; address?: string }>;
  priceBreakdown?: Record<string, unknown> | null;
  mock?: boolean;
};

type Payload = {
  settings: Settings;
  deliveries: Delivery[];
  readyBags: ReadyBag[];
  addresses: SavedAddress[];
};

const emptyLoc = (): LocationValue => ({
  address: "",
  city: "",
  country: "",
  latitude: null,
  longitude: null,
  placeId: null,
});

const MARKETS = [
  { value: "TH", label: "Thailand (TH)" },
  { value: "HK", label: "Hong Kong (HK)" },
  { value: "SG", label: "Singapore (SG)" },
  { value: "MY", label: "Malaysia (MY)" },
  { value: "PH", label: "Philippines (PH)" },
  { value: "ID", label: "Indonesia (ID)" },
  { value: "VN", label: "Vietnam (VN)" },
  { value: "TW", label: "Taiwan (TW)" },
  { value: "IN", label: "India (IN)" },
];

function statusTone(status: string): "ok" | "warn" | "danger" | "neutral" {
  const s = status.toUpperCase();
  if (s === "COMPLETED") return "ok";
  if (s === "CANCELLED" || s === "CANCELED") return "danger";
  if (s === "BOOKED" || s === "ON_GOING" || s === "ASSIGNING_DRIVER" || s === "QUOTED")
    return "warn";
  return "neutral";
}

function addrFromSaved(a: SavedAddress): LocationValue {
  return {
    address: a.address,
    city: a.city || "",
    country: a.country || "",
    latitude: a.latitude,
    longitude: a.longitude,
    placeId: a.placeId,
  };
}

export default function LalamovePage() {
  const [tab, setTab] = useState<Tab>("live");
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Settings form
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [market, setMarket] = useState("TH");
  const [sandbox, setSandbox] = useState(true);

  // Book form
  const [bookMode, setBookMode] = useState<"direct" | "bags">("direct");
  const [pickup, setPickup] = useState<LocationValue>(emptyLoc());
  const [dropoff, setDropoff] = useState<LocationValue>(emptyLoc());
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [serviceType, setServiceType] = useState("MOTORCYCLE");
  const [notes, setNotes] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [selectedBags, setSelectedBags] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([
    "MOTORCYCLE",
    "CAR",
    "VAN",
  ]);

  // Address modal
  const [addrOpen, setAddrOpen] = useState(false);
  const [editAddrId, setEditAddrId] = useState<string | null>(null);
  const [addrForm, setAddrForm] = useState({
    label: "",
    contactName: "",
    phone: "",
    kind: "BOTH",
    notes: "",
    loc: emptyLoc(),
  });

  // Priority fee modal
  const [feeOpen, setFeeOpen] = useState(false);
  const [feeId, setFeeId] = useState<string | null>(null);
  const [feeAmount, setFeeAmount] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await apiGet<Payload>("/api/lalamove");
      setData(res);
      setError(null);
      if (res.settings.market) {
        const m = res.settings.market.includes("_")
          ? res.settings.market.split("_")[0]
          : res.settings.market;
        setMarket(m);
      }
      setSandbox(res.settings.sandbox);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!data?.settings.connected) return;
    apiGet<{ cities: Array<{ services?: Array<{ key: string }> }> }>(
      "/api/lalamove?cities=1"
    )
      .then((r) => {
        const keys = new Set<string>();
        for (const c of r.cities || []) {
          for (const s of c.services || []) {
            if (s.key) keys.add(s.key);
          }
        }
        if (keys.size) setServices([...keys]);
      })
      .catch(() => {});
  }, [data?.settings.connected, data?.settings.liveReady]);

  const live = useMemo(() => {
    return (data?.deliveries || []).filter(
      (d) => d.status === "BOOKED" || d.status === "QUOTED"
    );
  }, [data]);

  const history = useMemo(() => {
    return (data?.deliveries || []).filter(
      (d) => d.status === "COMPLETED" || d.status === "CANCELLED"
    );
  }, [data]);

  const bagsByCustomer = useMemo(() => {
    const map = new Map<string, ReadyBag[]>();
    for (const b of data?.readyBags || []) {
      const key = b.customer?.id || "_none";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    return [...map.entries()];
  }, [data]);

  async function connect() {
    if (!apiKey.trim() || !apiSecret.trim()) {
      alert("Paste both API key and API secret from Lalamove Partner Portal");
      return;
    }
    setBusy(true);
    try {
      await apiPost("/api/lalamove", {
        action: "connect",
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
        market,
        sandbox,
      });
      setApiKey("");
      setApiSecret("");
      await load();
      alert("Lalamove connected");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Connect failed");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!confirm("Disconnect Lalamove?")) return;
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

  function applySaved(kind: "pickup" | "dropoff", a: SavedAddress) {
    const loc = addrFromSaved(a);
    if (kind === "pickup") {
      setPickup(loc);
      if (a.contactName) setSenderName(a.contactName);
      if (a.phone) setSenderPhone(a.phone);
    } else {
      setDropoff(loc);
      if (a.contactName) setRecipientName(a.contactName);
      if (a.phone) setRecipientPhone(a.phone);
    }
    setQuote(null);
  }

  async function getDirectQuote() {
    if (
      !pickup.address ||
      pickup.latitude == null ||
      !dropoff.address ||
      dropoff.latitude == null
    ) {
      alert("Pin both pickup and dropoff on the map (address + coordinates)");
      return;
    }
    setBusy(true);
    try {
      const res = await apiPost<{ quote: Quote; warning?: string }>(
        "/api/lalamove",
        {
          action: "quoteDirect",
          serviceType,
          pickup: {
            address: pickup.address,
            lat: pickup.latitude,
            lng: pickup.longitude,
            name: senderName,
            phone: senderPhone,
          },
          dropoff: {
            address: dropoff.address,
            lat: dropoff.latitude,
            lng: dropoff.longitude,
            name: recipientName,
            phone: recipientPhone,
          },
        }
      );
      setQuote(res.quote);
      if (res.warning) alert(res.warning);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Quote failed");
    } finally {
      setBusy(false);
    }
  }

  async function bookDirect() {
    if (
      !pickup.address ||
      pickup.latitude == null ||
      !dropoff.address ||
      dropoff.latitude == null
    ) {
      alert("Pin both pickup and dropoff first");
      return;
    }
    setBusy(true);
    try {
      const res = await apiPost<{ warning?: string }>("/api/lalamove", {
        action: "bookDirect",
        serviceType,
        quotationId: quote?.quotationId,
        stops: quote?.stops,
        quoteAmount: quote?.amount,
        currency: quote?.currency,
        senderName,
        senderPhone,
        recipientName,
        recipientPhone,
        notes,
        pickup: {
          address: pickup.address,
          lat: pickup.latitude,
          lng: pickup.longitude,
          name: senderName,
          phone: senderPhone,
        },
        dropoff: {
          address: dropoff.address,
          lat: dropoff.latitude,
          lng: dropoff.longitude,
          name: recipientName,
          phone: recipientPhone,
        },
      });
      if (res.warning) alert(res.warning);
      setQuote(null);
      setNotes("");
      setTab("live");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Book failed");
    } finally {
      setBusy(false);
    }
  }

  async function quoteBags() {
    if (!selectedBags.length) {
      alert("Select bags");
      return;
    }
    setBusy(true);
    try {
      const res = await apiPost<{ quote: Quote; warning?: string }>(
        "/api/lalamove",
        {
          action: "quote",
          bagIds: selectedBags,
          serviceType,
          pickup:
            pickup.latitude != null
              ? {
                  address: pickup.address,
                  lat: pickup.latitude,
                  lng: pickup.longitude,
                  name: senderName,
                  phone: senderPhone,
                }
              : undefined,
          dropoff:
            dropoff.latitude != null
              ? {
                  address: dropoff.address,
                  lat: dropoff.latitude,
                  lng: dropoff.longitude,
                  name: recipientName,
                  phone: recipientPhone,
                }
              : undefined,
        }
      );
      setQuote(res.quote);
      if (res.warning) alert(res.warning);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Quote failed");
    } finally {
      setBusy(false);
    }
  }

  async function bookBags() {
    if (!selectedBags.length) {
      alert("Select bags");
      return;
    }
    setBusy(true);
    try {
      const res = await apiPost<{ warning?: string }>("/api/lalamove", {
        action: "book",
        bagIds: selectedBags,
        serviceType,
        quotationId: quote?.quotationId,
        stops: quote?.stops,
        quoteAmount: quote?.amount,
        currency: quote?.currency,
        notes,
        pickup:
          pickup.latitude != null
            ? {
                address: pickup.address,
                lat: pickup.latitude,
                lng: pickup.longitude,
                name: senderName,
                phone: senderPhone,
              }
            : undefined,
        dropoff:
          dropoff.latitude != null
            ? {
                address: dropoff.address,
                lat: dropoff.latitude,
                lng: dropoff.longitude,
                name: recipientName,
                phone: recipientPhone,
              }
            : undefined,
      });
      if (res.warning) alert(res.warning);
      setSelectedBags([]);
      setQuote(null);
      setTab("live");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Book failed");
    } finally {
      setBusy(false);
    }
  }

  async function refreshDelivery(id: string) {
    setBusy(true);
    try {
      await apiPost("/api/lalamove", { action: "refresh", id });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setBusy(false);
    }
  }

  async function cancelDelivery(id: string) {
    if (!confirm("Cancel this Lalamove order?")) return;
    setBusy(true);
    try {
      await apiPost("/api/lalamove", { action: "cancel", id });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Cancel failed");
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

  async function changeDriver(id: string) {
    if (!confirm("Request a different driver?")) return;
    setBusy(true);
    try {
      await apiPost("/api/lalamove", {
        action: "changeDriver",
        id,
        reason: "DRIVER_UNRESPONSIVE",
      });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Change driver failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitFee() {
    if (!feeId || !feeAmount.trim()) return;
    setBusy(true);
    try {
      await apiPost("/api/lalamove", {
        action: "priorityFee",
        id: feeId,
        amount: feeAmount.trim(),
      });
      setFeeOpen(false);
      setFeeAmount("");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Priority fee failed");
    } finally {
      setBusy(false);
    }
  }

  function openNewAddress() {
    setEditAddrId(null);
    setAddrForm({
      label: "",
      contactName: "",
      phone: "",
      kind: "BOTH",
      notes: "",
      loc: emptyLoc(),
    });
    setAddrOpen(true);
  }

  function openEditAddress(a: SavedAddress) {
    setEditAddrId(a.id);
    setAddrForm({
      label: a.label,
      contactName: a.contactName || "",
      phone: a.phone || "",
      kind: a.kind,
      notes: a.notes || "",
      loc: addrFromSaved(a),
    });
    setAddrOpen(true);
  }

  async function saveAddress() {
    if (!addrForm.label.trim() || !addrForm.loc.address) {
      alert("Label and address required");
      return;
    }
    if (addrForm.loc.latitude == null || addrForm.loc.longitude == null) {
      alert("Pin the location on the map");
      return;
    }
    setBusy(true);
    const payload = {
      label: addrForm.label.trim(),
      contactName: addrForm.contactName.trim() || null,
      phone: addrForm.phone.trim() || null,
      kind: addrForm.kind,
      notes: addrForm.notes.trim() || null,
      address: addrForm.loc.address,
      city: addrForm.loc.city || null,
      country: addrForm.loc.country || null,
      latitude: addrForm.loc.latitude,
      longitude: addrForm.loc.longitude,
      placeId: addrForm.loc.placeId,
    };
    try {
      if (editAddrId) await apiPatch(`/api/lalamove/addresses/${editAddrId}`, payload);
      else await apiPost("/api/lalamove/addresses", payload);
      setAddrOpen(false);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeAddress(a: SavedAddress) {
    if (!confirm(`Remove saved address “${a.label}”?`)) return;
    try {
      await apiDelete(`/api/lalamove/addresses/${a.id}`);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function importAddresses() {
    setBusy(true);
    try {
      const res = await apiPost<{ created: number }>("/api/lalamove", {
        action: "importAddresses",
      });
      await load();
      alert(`Imported ${res.created} address(es) from warehouses & parties`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  function selectBagGroup(bags: ReadyBag[]) {
    setSelectedBags(bags.map((b) => b.id));
    setBookMode("bags");
    const first = bags[0];
    const wh = first?.shipment?.destWarehouse;
    const cust = first?.customer;
    if (wh) {
      setPickup({
        address:
          wh.address ||
          `${wh.name}${wh.city ? `, ${wh.city}` : ""}${wh.country ? `, ${wh.country}` : ""}`,
        city: wh.city || "",
        country: wh.country || "",
        latitude: wh.latitude ?? null,
        longitude: wh.longitude ?? null,
        placeId: null,
      });
      setSenderName(wh.name);
    }
    if (cust) {
      setDropoff({
        address: cust.address || cust.name,
        city: "",
        country: "",
        latitude: cust.latitude ?? null,
        longitude: cust.longitude ?? null,
        placeId: null,
      });
      setRecipientName(cust.name);
      setRecipientPhone(cust.phone || "");
    }
    setQuote(null);
    setTab("book");
  }

  if (!data) {
    return (
      <div className="py-12 text-center text-sm text-[var(--muted)]">
        {error || "Loading Lalamove…"}
      </div>
    );
  }

  const s = data.settings;

  return (
    <div>
      <PageHeader
        title="Lalamove"
        subtitle="Last-mile deliveries · saved stops · live tracking"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => load()}
              disabled={busy}
            >
              <RefreshCw size={14} /> Refresh
            </Button>
            <Button onClick={() => { setTab("book"); setBookMode("direct"); }}>
              <Plus size={14} /> Book delivery
            </Button>
          </div>
        }
      />

      {/* Status strip */}
      <Card className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
            <Bike size={20} />
          </div>
          <div>
            <div className="font-medium">
              {s.connected ? "Connected" : "Not connected"}
              {s.connected && (
                <span className="ml-2 text-sm font-normal text-[var(--muted)]">
                  {s.market}
                  {s.sandbox ? " · sandbox" : " · production"}
                  {s.liveReady ? " · live API" : " · mock quotes"}
                </span>
              )}
            </div>
            <div className="text-xs text-[var(--muted)]">
              {s.apiKeyMasked
                ? `Key ${s.apiKeyMasked}`
                : "Connect API key + secret from Partner Portal"}
              {" · "}
              Consumer-app favorites are not available via API — save them here
            </div>
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() => setTab("settings")}
        >
          <Settings2 size={14} /> Settings
        </Button>
      </Card>

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-1 border-b border-[var(--line)]">
        {(
          [
            ["live", "Live", live.length],
            ["book", "Book", null],
            ["addresses", "Saved addresses", data.addresses.length],
            ["settings", "Settings", null],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`relative px-4 py-2.5 text-sm font-medium transition ${
              tab === key
                ? "text-[var(--accent)] after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-[var(--accent)]"
                : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {label}
            {count != null && count > 0 && (
              <span className="ml-1.5 rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] text-[var(--accent-ink)]">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* LIVE */}
      {tab === "live" && (
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 font-display text-xl">Active deliveries</h2>
            {live.length === 0 ? (
              <div className="space-y-3">
                <EmptyState
                  title="No live deliveries"
                  hint="Book a delivery or send arrived bags via last-mile."
                />
                <Button onClick={() => setTab("book")}>Book now</Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {live.map((d) => (
                  <DeliveryCard
                    key={d.id}
                    d={d}
                    busy={busy}
                    onRefresh={() => refreshDelivery(d.id)}
                    onCancel={() => cancelDelivery(d.id)}
                    onComplete={() => completeDelivery(d.id)}
                    onChangeDriver={() => changeDriver(d.id)}
                    onPriorityFee={() => {
                      setFeeId(d.id);
                      setFeeAmount(String(d.priorityFee || ""));
                      setFeeOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          {(data.readyBags || []).length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-xl">
                Bags ready for last-mile
              </h2>
              <div className="grid gap-3">
                {bagsByCustomer.map(([cid, bags]) => (
                  <Card key={cid} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium">
                        {bags[0]?.customer?.name || "No customer"}
                      </div>
                      <div className="text-xs text-[var(--muted)]">
                        {bags.length} bag(s) ·{" "}
                        {bags
                          .map((b) => `#${b.bagNumber}`)
                          .join(", ")}
                        {" · "}
                        from{" "}
                        {bags[0]?.shipment?.destWarehouse?.name || "warehouse"}
                      </div>
                    </div>
                    <Button
                      disabled={!s.connected}
                      onClick={() => selectBagGroup(bags)}
                    >
                      Book Lalamove
                    </Button>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {history.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-xl">Recent history</h2>
              <div className="grid gap-2">
                {history.slice(0, 12).map((d) => (
                  <Card
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge tone={statusTone(d.status)}>{d.status}</Badge>
                        <span className="truncate text-sm">
                          {d.dropoffContact ||
                            d.customer?.name ||
                            d.dropoffAddress ||
                            d.externalOrderId}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--muted)]">
                        {d.quoteAmount != null &&
                          `${d.currency} ${d.quoteAmount} · `}
                        {d.vehicleType}
                        {d.bookedAt &&
                          ` · ${new Date(d.bookedAt).toLocaleString()}`}
                      </div>
                    </div>
                    {d.trackingUrl && (
                      <a
                        href={d.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[var(--accent)]"
                      >
                        Track <ExternalLink size={12} className="inline" />
                      </a>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* BOOK */}
      {tab === "book" && (
        <div className="space-y-5">
          {!s.connected && (
            <Card className="border-amber-300 bg-amber-50 text-sm text-amber-900">
              Connect Lalamove in Settings before booking.{" "}
              <button
                type="button"
                className="font-medium underline"
                onClick={() => setTab("settings")}
              >
                Open settings
              </button>
            </Card>
          )}

          <div className="flex gap-2">
            <Button
              variant={bookMode === "direct" ? "primary" : "secondary"}
              onClick={() => setBookMode("direct")}
            >
              New delivery
            </Button>
            <Button
              variant={bookMode === "bags" ? "primary" : "secondary"}
              onClick={() => setBookMode("bags")}
            >
              From arrived bags
            </Button>
          </div>

          {bookMode === "bags" && (
            <Card>
              <div className="mb-3 text-sm text-[var(--muted)]">
                Select arrived bags for one customer, then quote & book.
              </div>
              {(data.readyBags || []).length === 0 ? (
                <EmptyState
                  title="No arrived bags"
                  hint="Mark bags as arrived at destination warehouse first."
                />
              ) : (
                <div className="space-y-2">
                  {data.readyBags.map((b) => (
                    <label
                      key={b.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--line)] px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={selectedBags.includes(b.id)}
                        onChange={(e) => {
                          setSelectedBags((prev) =>
                            e.target.checked
                              ? [...prev, b.id]
                              : prev.filter((x) => x !== b.id)
                          );
                          setQuote(null);
                        }}
                      />
                      <div className="min-w-0 flex-1 text-sm">
                        <span className="font-medium">#{b.bagNumber}</span>
                        {" · "}
                        {b.customer?.name || "—"}
                        {b.weightKg != null && ` · ${b.weightKg} kg`}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Saved address quick picks */}
          {data.addresses.length > 0 && (
            <Card>
              <div className="mb-2 text-sm font-medium">Use saved address</div>
              <div className="flex flex-wrap gap-2">
                {data.addresses.map((a) => (
                  <div key={a.id} className="flex gap-1">
                    {(a.kind === "PICKUP" || a.kind === "BOTH") && (
                      <button
                        type="button"
                        onClick={() => applySaved("pickup", a)}
                        className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-xs hover:border-[var(--accent)]"
                      >
                        ↑ {a.label}
                      </button>
                    )}
                    {(a.kind === "DROPOFF" || a.kind === "BOTH") && (
                      <button
                        type="button"
                        onClick={() => applySaved("dropoff", a)}
                        className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-xs hover:border-[var(--accent)]"
                      >
                        ↓ {a.label}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <div className="mb-3 flex items-center gap-2 font-medium">
                <MapPin size={16} className="text-[var(--accent)]" /> Pickup
              </div>
              <div className="space-y-3">
                <Input
                  label="Contact name"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                />
                <Input
                  label="Phone (E.164 e.g. +66812345678)"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                />
                <LocationPicker
                  label="Pickup location"
                  value={pickup}
                  onChange={(v) => {
                    setPickup(v);
                    setQuote(null);
                  }}
                />
              </div>
            </Card>
            <Card>
              <div className="mb-3 flex items-center gap-2 font-medium">
                <Truck size={16} className="text-[var(--accent)]" /> Dropoff
              </div>
              <div className="space-y-3">
                <Input
                  label="Recipient name"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
                <Input
                  label="Phone (E.164)"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                />
                <LocationPicker
                  label="Dropoff location"
                  value={dropoff}
                  onChange={(v) => {
                    setDropoff(v);
                    setQuote(null);
                  }}
                />
              </div>
            </Card>
          </div>

          <Card className="space-y-3">
            <Select
              label="Vehicle / service"
              value={serviceType}
              onChange={(e) => {
                setServiceType(e.target.value);
                setQuote(null);
              }}
            >
              {services.map((sv) => (
                <option key={sv} value={sv}>
                  {sv}
                </option>
              ))}
            </Select>
            <Input
              label="Driver remarks / notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Floor, unit, gate code…"
            />

            {quote && (
              <div className="rounded-lg border border-[var(--line)] bg-[var(--bg)] p-3 text-sm">
                <div className="font-display text-2xl">
                  {quote.currency} {quote.amount}
                </div>
                <div className="text-[var(--muted)]">
                  {quote.vehicleType || quote.serviceType}
                  {quote.distanceMeters != null &&
                    ` · ${(quote.distanceMeters / 1000).toFixed(1)} km`}
                  {quote.mock && " · mock quote"}
                  {quote.expiresAt &&
                    ` · expires ${new Date(quote.expiresAt).toLocaleTimeString()}`}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={busy || !s.connected}
                onClick={() =>
                  bookMode === "bags" ? quoteBags() : getDirectQuote()
                }
              >
                Get quote
              </Button>
              <Button
                disabled={busy || !s.connected}
                onClick={() =>
                  bookMode === "bags" ? bookBags() : bookDirect()
                }
              >
                Book delivery
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ADDRESSES */}
      {tab === "addresses" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={openNewAddress}>
              <Plus size={14} /> Add address
            </Button>
            <Button variant="secondary" disabled={busy} onClick={importAddresses}>
              Import from warehouses & parties
            </Button>
          </div>
          <p className="text-sm text-[var(--muted)]">
            Lalamove&apos;s Partner API cannot read favorites saved in the consumer
            app. Save your frequent pickup/dropoff stops here once, then reuse them
            when booking.
          </p>
          {data.addresses.length === 0 ? (
            <div className="space-y-3">
              <EmptyState
                title="No saved addresses yet"
                hint="Add stops you use often, or import warehouses and parties that already have map pins."
              />
              <Button onClick={openNewAddress}>Add address</Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.addresses.map((a) => (
                <Card key={a.id}>
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{a.label}</div>
                      <Badge tone="neutral">{a.kind}</Badge>
                    </div>
                    <Star size={14} className="text-[var(--accent)]" />
                  </div>
                  <div className="mt-2 text-sm text-[var(--muted)]">
                    {a.address}
                    {a.city && ` · ${a.city}`}
                  </div>
                  {(a.contactName || a.phone) && (
                    <div className="mt-1 text-xs text-[var(--muted)]">
                      {a.contactName}
                      {a.phone && ` · ${a.phone}`}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      className="text-xs"
                      onClick={() => {
                        applySaved(
                          a.kind === "DROPOFF" ? "dropoff" : "pickup",
                          a
                        );
                        setTab("book");
                      }}
                    >
                      Use
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-xs"
                      onClick={() => openEditAddress(a)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-xs text-red-600"
                      onClick={() => removeAddress(a)}
                    >
                      Remove
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SETTINGS */}
      {tab === "settings" && (
        <div className="mx-auto max-w-lg space-y-4">
          <Card className="space-y-3">
            <h2 className="font-display text-xl">API connection</h2>
            <p className="text-sm text-[var(--muted)]">
              Get your key and secret from{" "}
              <a
                href="https://www.lalamove.com/partner-portal"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent)] underline"
              >
                Lalamove Partner Portal → Developers
              </a>
              . Use sandbox keys (<code className="text-xs">pk_test</code> /{" "}
              <code className="text-xs">sk_test</code>) until you go live.
            </p>
            {s.connected && (
              <div className="rounded-lg bg-[var(--bg)] p-3 text-sm">
                Connected · {s.apiKeyMasked} · {s.market}
                {s.sandbox ? " · sandbox" : " · production"}
                {s.liveReady ? " · credentials verified" : ""}
              </div>
            )}
            <Input
              label="API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="pk_test_… or pk_prod_…"
              autoComplete="off"
            />
            <Input
              label="API secret"
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="sk_test_… or sk_prod_…"
              autoComplete="off"
            />
            <Select
              label="Market"
              value={market}
              onChange={(e) => setMarket(e.target.value)}
            >
              {MARKETS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sandbox}
                onChange={(e) => setSandbox(e.target.checked)}
              />
              Sandbox environment
            </label>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} onClick={connect}>
                {s.connected ? "Update & verify" : "Connect"}
              </Button>
              {s.connected && (
                <Button variant="danger" disabled={busy} onClick={disconnect}>
                  Disconnect
                </Button>
              )}
            </div>
            <p className="text-xs text-[var(--muted)]">
              Turn off Demo mode in the banner to hit your real database and
              Lalamove API. Demo mode simulates quotes/bookings locally.
            </p>
          </Card>

          <Card>
            <h3 className="mb-2 font-medium">Also on Transport</h3>
            <p className="mb-3 text-sm text-[var(--muted)]">
              Arrived bags can still be booked from the Transport → Last-mile
              tab. This page is the full Lalamove workspace.
            </p>
            <Link
              href="/transport"
              className="text-sm text-[var(--accent)] underline"
            >
              Open Transport
            </Link>
          </Card>
        </div>
      )}

      {/* Address modal */}
      <Modal
        open={addrOpen}
        onClose={() => setAddrOpen(false)}
        title={editAddrId ? "Edit address" : "Save address"}
      >
        <div className="space-y-3">
          <Input
            label="Label"
            value={addrForm.label}
            onChange={(e) =>
              setAddrForm((f) => ({ ...f, label: e.target.value }))
            }
            placeholder="Bangkok WH · Sukhumvit customer"
          />
          <Input
            label="Contact name"
            value={addrForm.contactName}
            onChange={(e) =>
              setAddrForm((f) => ({ ...f, contactName: e.target.value }))
            }
          />
          <Input
            label="Phone"
            value={addrForm.phone}
            onChange={(e) =>
              setAddrForm((f) => ({ ...f, phone: e.target.value }))
            }
          />
          <Select
            label="Use as"
            value={addrForm.kind}
            onChange={(e) =>
              setAddrForm((f) => ({ ...f, kind: e.target.value }))
            }
          >
            <option value="BOTH">Pickup & dropoff</option>
            <option value="PICKUP">Pickup only</option>
            <option value="DROPOFF">Dropoff only</option>
          </Select>
          <LocationPicker
            label="Location"
            value={addrForm.loc}
            onChange={(loc) => setAddrForm((f) => ({ ...f, loc }))}
          />
          <Input
            label="Notes"
            value={addrForm.notes}
            onChange={(e) =>
              setAddrForm((f) => ({ ...f, notes: e.target.value }))
            }
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setAddrOpen(false)}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={saveAddress}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={feeOpen}
        onClose={() => setFeeOpen(false)}
        title="Add priority fee"
      >
        <div className="space-y-3">
          <p className="text-sm text-[var(--muted)]">
            Each new priority fee replaces the previous one (not additive).
          </p>
          <Input
            label="Amount"
            value={feeAmount}
            onChange={(e) => setFeeAmount(e.target.value)}
            placeholder="20"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFeeOpen(false)}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={submitFee}>
              Apply
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function DeliveryCard({
  d,
  busy,
  onRefresh,
  onCancel,
  onComplete,
  onChangeDriver,
  onPriorityFee,
}: {
  d: Delivery;
  busy: boolean;
  onRefresh: () => void;
  onCancel: () => void;
  onComplete: () => void;
  onChangeDriver: () => void;
  onPriorityFee: () => void;
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(d.status)}>
              {d.providerStatus || d.status}
            </Badge>
            <span className="font-medium">
              {d.dropoffContact || d.customer?.name || "Delivery"}
            </span>
            {d.externalOrderId && (
              <span className="font-mono text-xs text-[var(--muted)]">
                #{d.externalOrderId}
              </span>
            )}
          </div>
          <div className="mt-2 space-y-1 text-sm text-[var(--muted)]">
            <div>↑ {d.pickupAddress || d.pickupWarehouse?.name || "—"}</div>
            <div>↓ {d.dropoffAddress || "—"}</div>
            {(d.driverName || d.driverPhone) && (
              <div className="flex items-center gap-1">
                <Phone size={12} />
                {d.driverName || "Driver"}
                {d.driverPhone && ` · ${d.driverPhone}`}
              </div>
            )}
            <div>
              {d.quoteAmount != null &&
                `${d.currency} ${d.quoteAmount}`}
              {d.priorityFee != null && d.priorityFee > 0 &&
                ` · priority ${d.currency} ${d.priorityFee}`}
              {d.vehicleType && ` · ${d.vehicleType}`}
              {d.bags && d.bags.length > 0 &&
                ` · ${d.bags.length} bag(s)`}
            </div>
          </div>
        </div>
        {d.trackingUrl && (
          <a
            href={d.trackingUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-[var(--accent)]"
          >
            Track <ExternalLink size={14} />
          </a>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" disabled={busy} onClick={onRefresh}>
          <RefreshCw size={14} /> Sync status
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onPriorityFee}>
          Priority fee
        </Button>
        {d.driverId && (
          <Button variant="secondary" disabled={busy} onClick={onChangeDriver}>
            Change driver
          </Button>
        )}
        <Button variant="secondary" disabled={busy} onClick={onComplete}>
          <CheckCircle2 size={14} /> Mark delivered
        </Button>
        <Button variant="danger" disabled={busy} onClick={onCancel}>
          <XCircle size={14} /> Cancel
        </Button>
      </div>
    </Card>
  );
}
