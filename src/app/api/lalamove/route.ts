import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Currency } from "@/generated/prisma/client";
import {
  addPriorityFee,
  cancelOrder,
  changeDriver,
  createQuotation,
  defaultLanguage,
  getCities,
  getOrder,
  hasLiveCredentials,
  mapProviderStatus,
  normalizeMarket,
  placeOrder,
  toE164,
  type LalamoveCreds,
} from "@/lib/lalamove/client";

const SETTING_KEY = "lalamove";

type LalamoveSettings = {
  connected: boolean;
  apiKey: string;
  apiSecret: string;
  market: string;
  sandbox: boolean;
  language?: string;
  connectedAt?: string | null;
};

const defaultSettings = (): LalamoveSettings => ({
  connected: false,
  apiKey: "",
  apiSecret: "",
  market: "TH",
  sandbox: true,
  language: "en_TH",
  connectedAt: null,
});

async function readSettings(): Promise<LalamoveSettings> {
  const row = await prisma.appSetting.findUnique({ where: { key: SETTING_KEY } });
  if (!row) return defaultSettings();
  try {
    return { ...defaultSettings(), ...JSON.parse(row.value) };
  } catch {
    return defaultSettings();
  }
}

async function writeSettings(next: LalamoveSettings) {
  const value = JSON.stringify(next);
  await prisma.appSetting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value },
    update: { value },
  });
}

function publicSettings(s: LalamoveSettings) {
  return {
    connected: s.connected,
    market: s.market,
    sandbox: s.sandbox,
    language: s.language || defaultLanguage(s.market),
    connectedAt: s.connectedAt,
    hasApiKey: Boolean(s.apiKey),
    hasApiSecret: Boolean(s.apiSecret),
    liveReady: hasLiveCredentials(s),
    apiKeyMasked: s.apiKey
      ? `${s.apiKey.slice(0, 6)}••••${s.apiKey.slice(-4)}`
      : null,
  };
}

function credsFrom(s: LalamoveSettings): LalamoveCreds | null {
  if (!hasLiveCredentials(s)) return null;
  return {
    apiKey: s.apiKey,
    apiSecret: s.apiSecret,
    market: s.market,
    sandbox: s.sandbox,
  };
}

function mockQuote(weightKg: number, market: string) {
  const m = normalizeMarket(market);
  const base = m === "TH" ? 89 : 149;
  const perKg = m === "TH" ? 12 : 18;
  const amount = Math.round((base + Math.max(0, weightKg) * perKg) * 100) / 100;
  return {
    quoteId: `LQ-${Date.now().toString(36).toUpperCase()}`,
    quotationId: `LQ-${Date.now().toString(36).toUpperCase()}`,
    amount,
    currency: (m === "TH" ? "THB" : "INR") as Currency,
    vehicleType: weightKg > 40 ? "VAN" : "MOTORCYCLE",
    serviceType: weightKg > 40 ? "VAN" : "MOTORCYCLE",
    etaMinutes: 35 + Math.min(40, Math.round(weightKg)),
    distanceMeters: null as number | null,
    expiresAt: null as string | null,
    stops: [] as Array<{ stopId: string; address: string }>,
    priceBreakdown: null as Record<string, unknown> | null,
    mock: true as boolean,
  };
}

function weightBucket(kg: number): string {
  if (kg <= 3) return "LESS_THAN_3_KG";
  if (kg <= 5) return "BETWEEN_3_KG_AND_5_KG";
  if (kg <= 10) return "BETWEEN_5_KG_AND_10_KG";
  return "MORE_THAN_10_KG";
}

type StopInput = {
  address: string;
  lat: number;
  lng: number;
  name?: string;
  phone?: string;
  remarks?: string;
};

function parseStop(raw: unknown, label: string): StopInput | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const address = String(o.address || "").trim();
  const lat = Number(o.lat ?? o.latitude);
  const lng = Number(o.lng ?? o.longitude);
  if (!address || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return {
    address,
    lat,
    lng,
    name: o.name != null ? String(o.name) : label,
    phone: o.phone != null ? String(o.phone) : undefined,
    remarks: o.remarks != null ? String(o.remarks) : undefined,
  };
}

const deliveryInclude = {
  customer: true,
  pickupWarehouse: true,
  bags: { include: { bag: { include: { shipment: true, customer: true } } } },
} as const;

/** GET — connection status + last-mile deliveries + bags ready + saved addresses */
export async function GET(req: NextRequest) {
  const settings = await readSettings();
  const url = new URL(req.url);
  const wantCities = url.searchParams.get("cities") === "1";

  if (wantCities) {
    const creds = credsFrom(settings);
    if (!creds) {
      return NextResponse.json({
        cities: [
          {
            locode: "TH BKK",
            name: "Bangkok",
            services: [
              { key: "MOTORCYCLE", description: "Motorcycle (demo)" },
              { key: "CAR", description: "Car (demo)" },
              { key: "VAN", description: "Van (demo)" },
            ],
          },
        ],
        mock: true,
      });
    }
    try {
      const res = await getCities(creds);
      return NextResponse.json({ cities: res.data || [], mock: false });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Failed to load cities" },
        { status: 502 }
      );
    }
  }

  const [deliveries, arrivedBags, addresses] = await Promise.all([
    prisma.lastMileDelivery.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      include: deliveryInclude,
    }),
    prisma.bag.findMany({
      where: { status: "ARRIVED" },
      include: {
        customer: true,
        shipment: { include: { destWarehouse: true, ownerParty: true } },
        warehouse: true,
      },
      orderBy: { arrivedAt: "desc" },
    }),
    prisma.savedAddress.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    }),
  ]);

  return NextResponse.json({
    settings: publicSettings(settings),
    deliveries,
    readyBags: arrivedBags,
    addresses,
  });
}

/**
 * POST actions:
 * connect | disconnect | quote | book | bookDirect | complete | cancel |
 * refresh | priorityFee | changeDriver | importAddresses
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const action = String(body.action || "");

  if (action === "connect") {
    const apiKey = String(body.apiKey || "").trim();
    const apiSecret = String(body.apiSecret || "").trim();
    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 400 });
    }
    if (!apiSecret) {
      return NextResponse.json(
        { error: "API secret required (from Lalamove Partner Portal → Developers)" },
        { status: 400 }
      );
    }
    const market = normalizeMarket(String(body.market || "TH"));
    const next: LalamoveSettings = {
      connected: true,
      apiKey,
      apiSecret,
      market,
      sandbox: body.sandbox !== false,
      language: String(body.language || defaultLanguage(market)),
      connectedAt: new Date().toISOString(),
    };

    // Verify credentials against cities endpoint when possible
    try {
      await getCities({
        apiKey,
        apiSecret,
        market,
        sandbox: next.sandbox,
      });
    } catch (e) {
      return NextResponse.json(
        {
          error:
            e instanceof Error
              ? `Lalamove rejected credentials: ${e.message}`
              : "Lalamove rejected credentials",
        },
        { status: 400 }
      );
    }

    await writeSettings(next);
    return NextResponse.json({ ok: true, settings: publicSettings(next) });
  }

  if (action === "disconnect") {
    await writeSettings(defaultSettings());
    return NextResponse.json({
      ok: true,
      settings: publicSettings(defaultSettings()),
    });
  }

  const settings = await readSettings();
  const creds = credsFrom(settings);
  const language = settings.language || defaultLanguage(settings.market);

  if (action === "importAddresses") {
    const [warehouses, parties] = await Promise.all([
      prisma.warehouse.findMany({ where: { isActive: true } }),
      prisma.party.findMany({
        where: { isActive: true, address: { not: null } },
      }),
    ]);
    let created = 0;
    for (const w of warehouses) {
      if (w.latitude == null || w.longitude == null) continue;
      const label = `WH · ${w.name}`;
      const existing = await prisma.savedAddress.findFirst({
        where: { label, isActive: true },
      });
      if (existing) continue;
      await prisma.savedAddress.create({
        data: {
          label,
          contactName: w.name,
          address:
            w.address || `${w.name}, ${w.city}, ${w.country}`,
          city: w.city,
          country: w.country,
          latitude: w.latitude,
          longitude: w.longitude,
          placeId: w.placeId,
          kind: "PICKUP",
          notes: "Imported from warehouse",
        },
      });
      created += 1;
    }
    for (const p of parties) {
      if (!p.address || p.latitude == null || p.longitude == null) continue;
      const label = `Party · ${p.name}`;
      const existing = await prisma.savedAddress.findFirst({
        where: { label, isActive: true },
      });
      if (existing) continue;
      await prisma.savedAddress.create({
        data: {
          label,
          contactName: p.name,
          phone: p.phone,
          address: p.address,
          city: p.city,
          country: p.country,
          latitude: p.latitude,
          longitude: p.longitude,
          placeId: p.placeId,
          kind: "DROPOFF",
          notes: "Imported from party",
        },
      });
      created += 1;
    }
    const addresses = await prisma.savedAddress.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    });
    return NextResponse.json({ ok: true, created, addresses });
  }

  if (action === "quote" || action === "book") {
    if (!settings.connected) {
      return NextResponse.json({ error: "Connect Lalamove first" }, { status: 400 });
    }
    const bagIds: string[] = body.bagIds || [];
    if (!bagIds.length) {
      return NextResponse.json({ error: "Select bags" }, { status: 400 });
    }
    const bags = await prisma.bag.findMany({
      where: { id: { in: bagIds } },
      include: {
        customer: true,
        shipment: { include: { destWarehouse: true } },
      },
    });
    const weight = bags.reduce((s, b) => s + (b.weightKg || 0), 0);
    const warehouse = bags[0]?.shipment?.destWarehouse;
    const customer = bags[0]?.customer;

    const pickupOverride = parseStop(body.pickup, "Pickup");
    const dropoffOverride = parseStop(body.dropoff, "Dropoff");

    const pickup: StopInput | null =
      pickupOverride ||
      (warehouse?.latitude != null && warehouse?.longitude != null
        ? {
            address:
              warehouse.address ||
              `${warehouse.name}, ${warehouse.city}, ${warehouse.country}`,
            lat: warehouse.latitude,
            lng: warehouse.longitude,
            name: warehouse.name,
            phone: body.pickupPhone ? String(body.pickupPhone) : undefined,
          }
        : null);

    const dropoff: StopInput | null =
      dropoffOverride ||
      (customer?.latitude != null && customer?.longitude != null
        ? {
            address:
              customer.address ||
              [customer.city, customer.country].filter(Boolean).join(", ") ||
              customer.name,
            lat: customer.latitude,
            lng: customer.longitude,
            name: customer.name,
            phone: customer.phone || undefined,
            remarks: body.notes ? String(body.notes) : undefined,
          }
        : null);

    const serviceType = String(
      body.serviceType || (weight > 40 ? "VAN" : "MOTORCYCLE")
    ).toUpperCase();

    if (action === "quote") {
      if (creds && pickup && dropoff) {
        try {
          const res = await createQuotation(creds, {
            serviceType,
            language,
            stops: [
              {
                coordinates: { lat: String(pickup.lat), lng: String(pickup.lng) },
                address: pickup.address,
              },
              {
                coordinates: {
                  lat: String(dropoff.lat),
                  lng: String(dropoff.lng),
                },
                address: dropoff.address,
              },
            ],
            specialRequests: Array.isArray(body.specialRequests)
              ? body.specialRequests.map(String)
              : undefined,
            isRouteOptimized: Boolean(body.isRouteOptimized),
            item: {
              quantity: String(bags.length || 1),
              weight: weightBucket(weight),
              categories: ["OFFICE_ITEM"],
            },
          });
          const data = res.data || {};
          const pb = (data.priceBreakdown || {}) as Record<string, string>;
          const stops = (data.stops || []) as Array<{
            stopId: string;
            address: string;
          }>;
          const dist = data.distance as { value?: string } | undefined;
          return NextResponse.json({
            quote: {
              quoteId: String(data.quotationId || ""),
              quotationId: String(data.quotationId || ""),
              amount: Number(pb.total || 0),
              currency: (pb.currency || "THB") as Currency,
              vehicleType: String(data.serviceType || serviceType),
              serviceType: String(data.serviceType || serviceType),
              etaMinutes: null,
              distanceMeters: dist?.value ? Number(dist.value) : null,
              expiresAt: data.expiresAt ? String(data.expiresAt) : null,
              stops,
              priceBreakdown: pb,
              mock: false,
            },
            pickup,
            dropoff,
            weightKg: weight,
            bagCount: bags.length,
          });
        } catch (e) {
          return NextResponse.json(
            { error: e instanceof Error ? e.message : "Quote failed" },
            { status: 502 }
          );
        }
      }

      const quote = mockQuote(weight, settings.market);
      return NextResponse.json({
        quote,
        pickup: pickup ||
          (warehouse
            ? {
                name: warehouse.name,
                address:
                  warehouse.address ||
                  `${warehouse.name}, ${warehouse.city}, ${warehouse.country}`,
                city: warehouse.city,
                latitude: warehouse.latitude,
                longitude: warehouse.longitude,
              }
            : null),
        dropoff: dropoff ||
          (customer
            ? {
                name: customer.name,
                phone: customer.phone,
                address:
                  customer.address ||
                  [customer.city, customer.country].filter(Boolean).join(", "),
                city: customer.city,
                latitude: customer.latitude,
                longitude: customer.longitude,
              }
            : null),
        weightKg: weight,
        bagCount: bags.length,
        warning:
          !creds
            ? "Using mock quote — API secret missing or incomplete credentials."
            : !pickup || !dropoff
              ? "Missing lat/lng on pickup or dropoff — pin locations, then re-quote for live pricing."
              : undefined,
      });
    }

    // book
    if (bags.some((b) => b.status !== "ARRIVED")) {
      return NextResponse.json(
        { error: "Only bags arrived at destination warehouse can be booked" },
        { status: 400 }
      );
    }

    if (creds && pickup && dropoff) {
      try {
        const quotationId = String(body.quotationId || "").trim();
        let stops = (body.stops || []) as Array<{ stopId: string; address?: string }>;
        let qAmount = body.quoteAmount != null ? Number(body.quoteAmount) : null;
        let qCurrency = (body.currency || "THB") as Currency;
        let qService = serviceType;

        if (!quotationId || stops.length < 2) {
          const qRes = await createQuotation(creds, {
            serviceType,
            language,
            stops: [
              {
                coordinates: { lat: String(pickup.lat), lng: String(pickup.lng) },
                address: pickup.address,
              },
              {
                coordinates: {
                  lat: String(dropoff.lat),
                  lng: String(dropoff.lng),
                },
                address: dropoff.address,
              },
            ],
            item: {
              quantity: String(bags.length || 1),
              weight: weightBucket(weight),
              categories: ["OFFICE_ITEM"],
            },
          });
          const qd = qRes.data || {};
          const pb = (qd.priceBreakdown || {}) as Record<string, string>;
          stops = (qd.stops || []) as Array<{ stopId: string }>;
          qAmount = Number(pb.total || 0);
          qCurrency = (pb.currency || "THB") as Currency;
          qService = String(qd.serviceType || serviceType);
          const newQid = String(qd.quotationId || "");
          if (!newQid || stops.length < 2) {
            return NextResponse.json(
              { error: "Lalamove quotation incomplete" },
              { status: 502 }
            );
          }
          const orderRes = await placeOrder(creds, {
            quotationId: newQid,
            sender: {
              stopId: stops[0].stopId,
              name: pickup.name || "Warehouse",
              phone: toE164(pickup.phone, settings.market),
            },
            recipients: [
              {
                stopId: stops[1].stopId,
                name: dropoff.name || customer?.name || "Customer",
                phone: toE164(dropoff.phone || customer?.phone, settings.market),
                remarks: dropoff.remarks || body.notes || undefined,
              },
            ],
            isPODEnabled: body.isPODEnabled !== false,
            metadata: {
              bagIds: bagIds.join(","),
              source: "LogiOp-Pro",
            },
          });
          const od = orderRes.data || {};
          const delivery = await prisma.lastMileDelivery.create({
            data: {
              provider: "LALAMOVE",
              status: mapProviderStatus(String(od.status || "ASSIGNING_DRIVER")),
              externalOrderId: String(od.orderId || ""),
              quotationId: newQid,
              quoteAmount: qAmount,
              currency: qCurrency,
              vehicleType: qService,
              trackingUrl: od.shareLink ? String(od.shareLink) : null,
              pickupAddress: pickup.address,
              dropoffAddress: dropoff.address,
              pickupLat: pickup.lat,
              pickupLng: pickup.lng,
              dropoffLat: dropoff.lat,
              dropoffLng: dropoff.lng,
              pickupContact: pickup.name || null,
              pickupPhone: toE164(pickup.phone, settings.market),
              dropoffContact: dropoff.name || customer?.name || null,
              dropoffPhone: toE164(
                dropoff.phone || customer?.phone,
                settings.market
              ),
              driverId: od.driverId ? String(od.driverId) : null,
              providerStatus: od.status ? String(od.status) : "ASSIGNING_DRIVER",
              notes: body.notes || null,
              bookedAt: new Date(),
              pickupWarehouseId: warehouse?.id || null,
              customerId: customer?.id || null,
              shipmentId: bags[0]?.shipmentId || null,
              bags: { create: bagIds.map((bagId) => ({ bagId })) },
            },
            include: deliveryInclude,
          });
          return NextResponse.json({ delivery, live: true }, { status: 201 });
        }

        const orderRes = await placeOrder(creds, {
          quotationId,
          sender: {
            stopId: stops[0].stopId,
            name: pickup.name || "Warehouse",
            phone: toE164(pickup.phone, settings.market),
          },
          recipients: [
            {
              stopId: stops[1].stopId,
              name: dropoff.name || customer?.name || "Customer",
              phone: toE164(dropoff.phone || customer?.phone, settings.market),
              remarks: dropoff.remarks || body.notes || undefined,
            },
          ],
          isPODEnabled: body.isPODEnabled !== false,
          metadata: { bagIds: bagIds.join(","), source: "LogiOp-Pro" },
        });
        const od = orderRes.data || {};
        const delivery = await prisma.lastMileDelivery.create({
          data: {
            provider: "LALAMOVE",
            status: mapProviderStatus(String(od.status || "ASSIGNING_DRIVER")),
            externalOrderId: String(od.orderId || ""),
            quotationId,
            quoteAmount: qAmount,
            currency: qCurrency,
            vehicleType: qService,
            trackingUrl: od.shareLink ? String(od.shareLink) : null,
            pickupAddress: pickup.address,
            dropoffAddress: dropoff.address,
            pickupLat: pickup.lat,
            pickupLng: pickup.lng,
            dropoffLat: dropoff.lat,
            dropoffLng: dropoff.lng,
            pickupContact: pickup.name || null,
            pickupPhone: toE164(pickup.phone, settings.market),
            dropoffContact: dropoff.name || customer?.name || null,
            dropoffPhone: toE164(
              dropoff.phone || customer?.phone,
              settings.market
            ),
            driverId: od.driverId ? String(od.driverId) : null,
            providerStatus: od.status ? String(od.status) : "ASSIGNING_DRIVER",
            notes: body.notes || null,
            bookedAt: new Date(),
            pickupWarehouseId: warehouse?.id || null,
            customerId: customer?.id || null,
            shipmentId: bags[0]?.shipmentId || null,
            bags: { create: bagIds.map((bagId) => ({ bagId })) },
          },
          include: deliveryInclude,
        });
        return NextResponse.json({ delivery, live: true }, { status: 201 });
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "Book failed" },
          { status: 502 }
        );
      }
    }

    const quote = mockQuote(weight, settings.market);
    const orderId = `LM-${Date.now().toString(36).toUpperCase()}`;
    const delivery = await prisma.lastMileDelivery.create({
      data: {
        provider: "LALAMOVE",
        status: "BOOKED",
        externalOrderId: orderId,
        quotationId: quote.quotationId,
        quoteAmount:
          body.quoteAmount != null ? Number(body.quoteAmount) : quote.amount,
        currency: quote.currency,
        vehicleType: quote.vehicleType,
        trackingUrl: `https://www.lalamove.com/tracking/${orderId}`,
        pickupAddress: pickup?.address ||
          warehouse?.address ||
          (warehouse
            ? `${warehouse.name}, ${warehouse.city}, ${warehouse.country}`
            : null),
        dropoffAddress: dropoff?.address ||
          customer?.address ||
          [customer?.city, customer?.country].filter(Boolean).join(", ") ||
          null,
        pickupLat: pickup?.lat ?? warehouse?.latitude ?? null,
        pickupLng: pickup?.lng ?? warehouse?.longitude ?? null,
        dropoffLat: dropoff?.lat ?? customer?.latitude ?? null,
        dropoffLng: dropoff?.lng ?? customer?.longitude ?? null,
        pickupContact: pickup?.name || warehouse?.name || null,
        dropoffContact: dropoff?.name || customer?.name || null,
        dropoffPhone: customer?.phone || null,
        providerStatus: "ASSIGNING_DRIVER",
        notes: body.notes || null,
        bookedAt: new Date(),
        pickupWarehouseId: warehouse?.id || null,
        customerId: customer?.id || null,
        shipmentId: bags[0]?.shipmentId || null,
        bags: { create: bagIds.map((bagId) => ({ bagId })) },
      },
      include: deliveryInclude,
    });
    return NextResponse.json(
      {
        delivery,
        quote,
        live: false,
        warning:
          !creds
            ? "Mock booking — add API key + secret for live Lalamove orders."
            : "Mock booking — pin lat/lng on pickup and dropoff for live orders.",
      },
      { status: 201 }
    );
  }

  if (action === "bookDirect") {
    if (!settings.connected) {
      return NextResponse.json({ error: "Connect Lalamove first" }, { status: 400 });
    }
    const pickup = parseStop(body.pickup, "Pickup");
    const dropoff = parseStop(body.dropoff, "Dropoff");
    if (!pickup || !dropoff) {
      return NextResponse.json(
        { error: "Pickup and dropoff need address + lat/lng" },
        { status: 400 }
      );
    }
    const serviceType = String(body.serviceType || "MOTORCYCLE").toUpperCase();
    const senderName = String(body.senderName || pickup.name || "Sender");
    const senderPhone = toE164(
      body.senderPhone || pickup.phone,
      settings.market
    );
    const recipientName = String(body.recipientName || dropoff.name || "Recipient");
    const recipientPhone = toE164(
      body.recipientPhone || dropoff.phone,
      settings.market
    );
    const remarks = body.notes ? String(body.notes) : undefined;

    if (creds) {
      try {
        let quotationId = String(body.quotationId || "").trim();
        let stops = (body.stops || []) as Array<{ stopId: string }>;
        let amount =
          body.quoteAmount != null ? Number(body.quoteAmount) : null;
        let currency = (body.currency || "THB") as Currency;
        let vehicle = serviceType;

        if (!quotationId || stops.length < 2) {
          const qRes = await createQuotation(creds, {
            serviceType,
            language,
            stops: [
              {
                coordinates: { lat: String(pickup.lat), lng: String(pickup.lng) },
                address: pickup.address,
              },
              {
                coordinates: {
                  lat: String(dropoff.lat),
                  lng: String(dropoff.lng),
                },
                address: dropoff.address,
              },
            ],
            specialRequests: Array.isArray(body.specialRequests)
              ? body.specialRequests.map(String)
              : undefined,
            item: {
              quantity: "1",
              weight: weightBucket(Number(body.weightKg) || 5),
              categories: ["OFFICE_ITEM"],
            },
          });
          const qd = qRes.data || {};
          const pb = (qd.priceBreakdown || {}) as Record<string, string>;
          quotationId = String(qd.quotationId || "");
          stops = (qd.stops || []) as Array<{ stopId: string }>;
          amount = Number(pb.total || 0);
          currency = (pb.currency || "THB") as Currency;
          vehicle = String(qd.serviceType || serviceType);
        }

        if (!quotationId || stops.length < 2) {
          return NextResponse.json(
            { error: "Quotation incomplete" },
            { status: 502 }
          );
        }

        const orderRes = await placeOrder(creds, {
          quotationId,
          sender: {
            stopId: stops[0].stopId,
            name: senderName,
            phone: senderPhone,
          },
          recipients: [
            {
              stopId: stops[1].stopId,
              name: recipientName,
              phone: recipientPhone,
              remarks,
            },
          ],
          isPODEnabled: body.isPODEnabled !== false,
          metadata: { source: "LogiOp-Pro-direct" },
        });
        const od = orderRes.data || {};
        const delivery = await prisma.lastMileDelivery.create({
          data: {
            provider: "LALAMOVE",
            status: mapProviderStatus(String(od.status || "ASSIGNING_DRIVER")),
            externalOrderId: String(od.orderId || ""),
            quotationId,
            quoteAmount: amount,
            currency,
            vehicleType: vehicle,
            trackingUrl: od.shareLink ? String(od.shareLink) : null,
            pickupAddress: pickup.address,
            dropoffAddress: dropoff.address,
            pickupLat: pickup.lat,
            pickupLng: pickup.lng,
            dropoffLat: dropoff.lat,
            dropoffLng: dropoff.lng,
            pickupContact: senderName,
            pickupPhone: senderPhone,
            dropoffContact: recipientName,
            dropoffPhone: recipientPhone,
            driverId: od.driverId ? String(od.driverId) : null,
            providerStatus: od.status ? String(od.status) : "ASSIGNING_DRIVER",
            notes: remarks || null,
            bookedAt: new Date(),
            customerId: body.customerId ? String(body.customerId) : null,
            pickupWarehouseId: body.pickupWarehouseId
              ? String(body.pickupWarehouseId)
              : null,
          },
          include: deliveryInclude,
        });
        return NextResponse.json({ delivery, live: true }, { status: 201 });
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "Book failed" },
          { status: 502 }
        );
      }
    }

    const quote = mockQuote(Number(body.weightKg) || 5, settings.market);
    const orderId = `LM-${Date.now().toString(36).toUpperCase()}`;
    const delivery = await prisma.lastMileDelivery.create({
      data: {
        provider: "LALAMOVE",
        status: "BOOKED",
        externalOrderId: orderId,
        quotationId: quote.quotationId,
        quoteAmount: quote.amount,
        currency: quote.currency,
        vehicleType: serviceType,
        trackingUrl: `https://www.lalamove.com/tracking/${orderId}`,
        pickupAddress: pickup.address,
        dropoffAddress: dropoff.address,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropoffLat: dropoff.lat,
        dropoffLng: dropoff.lng,
        pickupContact: senderName,
        pickupPhone: senderPhone,
        dropoffContact: recipientName,
        dropoffPhone: recipientPhone,
        providerStatus: "ASSIGNING_DRIVER",
        notes: remarks || null,
        bookedAt: new Date(),
      },
      include: deliveryInclude,
    });
    return NextResponse.json(
      {
        delivery,
        live: false,
        warning: "Mock booking — connect API key + secret for live orders.",
      },
      { status: 201 }
    );
  }

  if (action === "quoteDirect") {
    if (!settings.connected) {
      return NextResponse.json({ error: "Connect Lalamove first" }, { status: 400 });
    }
    const pickup = parseStop(body.pickup, "Pickup");
    const dropoff = parseStop(body.dropoff, "Dropoff");
    if (!pickup || !dropoff) {
      return NextResponse.json(
        { error: "Pickup and dropoff need address + lat/lng" },
        { status: 400 }
      );
    }
    const serviceType = String(body.serviceType || "MOTORCYCLE").toUpperCase();
    if (creds) {
      try {
        const res = await createQuotation(creds, {
          serviceType,
          language,
          stops: [
            {
              coordinates: { lat: String(pickup.lat), lng: String(pickup.lng) },
              address: pickup.address,
            },
            {
              coordinates: {
                lat: String(dropoff.lat),
                lng: String(dropoff.lng),
              },
              address: dropoff.address,
            },
          ],
          specialRequests: Array.isArray(body.specialRequests)
            ? body.specialRequests.map(String)
            : undefined,
          item: {
            quantity: "1",
            weight: weightBucket(Number(body.weightKg) || 5),
            categories: ["OFFICE_ITEM"],
          },
        });
        const data = res.data || {};
        const pb = (data.priceBreakdown || {}) as Record<string, string>;
        const dist = data.distance as { value?: string } | undefined;
        return NextResponse.json({
          quote: {
            quoteId: String(data.quotationId || ""),
            quotationId: String(data.quotationId || ""),
            amount: Number(pb.total || 0),
            currency: (pb.currency || "THB") as Currency,
            vehicleType: String(data.serviceType || serviceType),
            serviceType: String(data.serviceType || serviceType),
            distanceMeters: dist?.value ? Number(dist.value) : null,
            expiresAt: data.expiresAt ? String(data.expiresAt) : null,
            stops: data.stops || [],
            priceBreakdown: pb,
            mock: false,
          },
          pickup,
          dropoff,
        });
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "Quote failed" },
          { status: 502 }
        );
      }
    }
    const quote = mockQuote(Number(body.weightKg) || 5, settings.market);
    quote.serviceType = serviceType;
    quote.vehicleType = serviceType;
    return NextResponse.json({
      quote,
      pickup,
      dropoff,
      warning: "Mock quote — connect API key + secret for live pricing.",
    });
  }

  if (action === "refresh") {
    const id = String(body.id || "");
    const delivery = await prisma.lastMileDelivery.findUnique({ where: { id } });
    if (!delivery) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!creds || !delivery.externalOrderId) {
      return NextResponse.json({ delivery, skipped: true });
    }
    try {
      const res = await getOrder(creds, delivery.externalOrderId);
      const od = res.data || {};
      const driver = od.driver as
        | { name?: string; phone?: string }
        | undefined;
      const pb = (od.priceBreakdown || {}) as Record<string, string>;
      const updated = await prisma.lastMileDelivery.update({
        where: { id },
        data: {
          providerStatus: od.status ? String(od.status) : delivery.providerStatus,
          status: mapProviderStatus(String(od.status || delivery.providerStatus)),
          trackingUrl: od.shareLink
            ? String(od.shareLink)
            : delivery.trackingUrl,
          driverId: od.driverId ? String(od.driverId) : delivery.driverId,
          driverName: driver?.name || delivery.driverName,
          driverPhone: driver?.phone || delivery.driverPhone,
          priorityFee: pb.priorityFee != null ? Number(pb.priorityFee) : delivery.priorityFee,
          quoteAmount: pb.total != null ? Number(pb.total) : delivery.quoteAmount,
          completedAt:
            String(od.status || "").toUpperCase() === "COMPLETED"
              ? delivery.completedAt || new Date()
              : delivery.completedAt,
        },
        include: deliveryInclude,
      });
      return NextResponse.json({ delivery: updated, live: true });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Refresh failed" },
        { status: 502 }
      );
    }
  }

  if (action === "priorityFee") {
    const id = String(body.id || "");
    const amount = String(body.amount || "").trim();
    if (!amount) {
      return NextResponse.json({ error: "Priority fee amount required" }, { status: 400 });
    }
    const delivery = await prisma.lastMileDelivery.findUnique({ where: { id } });
    if (!delivery?.externalOrderId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!creds) {
      return NextResponse.json(
        { error: "Live Lalamove credentials required" },
        { status: 400 }
      );
    }
    try {
      await addPriorityFee(creds, delivery.externalOrderId, amount);
      const updated = await prisma.lastMileDelivery.update({
        where: { id },
        data: { priorityFee: Number(amount) },
        include: deliveryInclude,
      });
      return NextResponse.json({ delivery: updated });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Priority fee failed" },
        { status: 502 }
      );
    }
  }

  if (action === "changeDriver") {
    const id = String(body.id || "");
    const reason = String(body.reason || "DRIVER_UNRESPONSIVE");
    const delivery = await prisma.lastMileDelivery.findUnique({ where: { id } });
    if (!delivery?.externalOrderId || !delivery.driverId) {
      return NextResponse.json(
        { error: "Order has no assigned driver yet" },
        { status: 400 }
      );
    }
    if (!creds) {
      return NextResponse.json(
        { error: "Live Lalamove credentials required" },
        { status: 400 }
      );
    }
    try {
      await changeDriver(
        creds,
        delivery.externalOrderId,
        delivery.driverId,
        reason
      );
      const updated = await prisma.lastMileDelivery.update({
        where: { id },
        data: {
          driverId: null,
          driverName: null,
          driverPhone: null,
          providerStatus: "ASSIGNING_DRIVER",
        },
        include: deliveryInclude,
      });
      return NextResponse.json({ delivery: updated });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Change driver failed" },
        { status: 502 }
      );
    }
  }

  if (action === "complete") {
    const id = String(body.id || "");
    const delivery = await prisma.lastMileDelivery.findUnique({
      where: { id },
      include: { bags: true },
    });
    if (!delivery) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const bagIds = delivery.bags.map((b) => b.bagId);
    const updated = await prisma.$transaction(async (tx) => {
      if (bagIds.length) {
        await tx.bag.updateMany({
          where: { id: { in: bagIds } },
          data: { status: "DELIVERED", deliveredAt: new Date() },
        });
      }
      return tx.lastMileDelivery.update({
        where: { id },
        data: {
          status: "COMPLETED",
          providerStatus: "COMPLETED",
          completedAt: new Date(),
        },
        include: deliveryInclude,
      });
    });
    return NextResponse.json({ delivery: updated });
  }

  if (action === "cancel") {
    const id = String(body.id || "");
    const delivery = await prisma.lastMileDelivery.findUnique({ where: { id } });
    if (!delivery) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (creds && delivery.externalOrderId && !delivery.externalOrderId.startsWith("LM-")) {
      try {
        await cancelOrder(creds, delivery.externalOrderId);
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "Cancel failed on Lalamove" },
          { status: 502 }
        );
      }
    }
    const updated = await prisma.lastMileDelivery.update({
      where: { id },
      data: { status: "CANCELLED", providerStatus: "CANCELED" },
      include: deliveryInclude,
    });
    return NextResponse.json({ delivery: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
