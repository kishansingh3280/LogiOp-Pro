import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Currency } from "@/generated/prisma/client";

const SETTING_KEY = "lalamove";

type LalamoveSettings = {
  connected: boolean;
  apiKey: string;
  market: string;
  sandbox: boolean;
  connectedAt?: string | null;
};

const defaultSettings = (): LalamoveSettings => ({
  connected: false,
  apiKey: "",
  market: "TH_BKK",
  sandbox: true,
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

function mockQuote(weightKg: number, market: string) {
  const base = market.startsWith("TH") ? 89 : 149;
  const perKg = market.startsWith("TH") ? 12 : 18;
  const amount = Math.round((base + Math.max(0, weightKg) * perKg) * 100) / 100;
  return {
    quoteId: `LQ-${Date.now().toString(36).toUpperCase()}`,
    amount,
    currency: (market.startsWith("TH") ? "THB" : "INR") as Currency,
    vehicleType: weightKg > 40 ? "van" : "motorcycle",
    etaMinutes: 35 + Math.min(40, Math.round(weightKg)),
  };
}

/** GET — connection status + last-mile deliveries + bags ready for Lalamove */
export async function GET() {
  const settings = await readSettings();
  const [deliveries, arrivedBags] = await Promise.all([
    prisma.lastMileDelivery.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        customer: true,
        pickupWarehouse: true,
        bags: { include: { bag: { include: { shipment: true, customer: true } } } },
      },
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
  ]);

  return NextResponse.json({
    settings: {
      connected: settings.connected,
      market: settings.market,
      sandbox: settings.sandbox,
      connectedAt: settings.connectedAt,
      hasApiKey: Boolean(settings.apiKey),
      apiKeyMasked: settings.apiKey
        ? `${settings.apiKey.slice(0, 4)}••••${settings.apiKey.slice(-3)}`
        : null,
    },
    deliveries,
    readyBags: arrivedBags,
  });
}

/**
 * POST actions:
 * - connect / disconnect
 * - quote
 * - book
 * - complete
 * - cancel
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const action = String(body.action || "");

  if (action === "connect") {
    const apiKey = String(body.apiKey || "").trim();
    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 400 });
    }
    const next: LalamoveSettings = {
      connected: true,
      apiKey,
      market: String(body.market || "TH_BKK"),
      sandbox: body.sandbox !== false,
      connectedAt: new Date().toISOString(),
    };
    await writeSettings(next);
    return NextResponse.json({
      ok: true,
      settings: {
        connected: true,
        market: next.market,
        sandbox: next.sandbox,
        connectedAt: next.connectedAt,
        hasApiKey: true,
        apiKeyMasked: `${apiKey.slice(0, 4)}••••${apiKey.slice(-3)}`,
      },
    });
  }

  if (action === "disconnect") {
    await writeSettings(defaultSettings());
    return NextResponse.json({ ok: true, settings: { ...defaultSettings(), hasApiKey: false, apiKeyMasked: null } });
  }

  const settings = await readSettings();

  if (action === "quote") {
    if (!settings.connected) {
      return NextResponse.json(
        { error: "Connect Lalamove first" },
        { status: 400 }
      );
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
    const quote = mockQuote(weight, settings.market);
    const warehouse = bags[0]?.shipment?.destWarehouse;
    const customer = bags[0]?.customer;
    return NextResponse.json({
      quote,
      pickup: warehouse
        ? {
            name: warehouse.name,
            address:
              warehouse.address ||
              `${warehouse.name}, ${warehouse.city}, ${warehouse.country}`,
            city: warehouse.city,
            latitude: warehouse.latitude,
            longitude: warehouse.longitude,
            placeId: warehouse.placeId,
          }
        : null,
      dropoff: customer
        ? {
            name: customer.name,
            phone: customer.phone,
            address:
              customer.address ||
              [customer.city, customer.country].filter(Boolean).join(", ") ||
              null,
            city: customer.city,
            latitude: customer.latitude,
            longitude: customer.longitude,
            placeId: customer.placeId,
          }
        : null,
      weightKg: weight,
      bagCount: bags.length,
    });
  }

  if (action === "book") {
    if (!settings.connected) {
      return NextResponse.json(
        { error: "Connect Lalamove first" },
        { status: 400 }
      );
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
    if (bags.some((b) => b.status !== "ARRIVED")) {
      return NextResponse.json(
        { error: "Only bags arrived at destination warehouse can be booked" },
        { status: 400 }
      );
    }
    const weight = bags.reduce((s, b) => s + (b.weightKg || 0), 0);
    const quote = mockQuote(weight, settings.market);
    const warehouse = bags[0]?.shipment?.destWarehouse;
    const customer = bags[0]?.customer;
    const orderId = `LM-${Date.now().toString(36).toUpperCase()}`;

    const delivery = await prisma.lastMileDelivery.create({
      data: {
        provider: "LALAMOVE",
        status: "BOOKED",
        externalOrderId: orderId,
        quoteAmount: body.quoteAmount != null ? Number(body.quoteAmount) : quote.amount,
        currency: quote.currency,
        vehicleType: quote.vehicleType,
        trackingUrl: `https://www.lalamove.com/tracking/${orderId}`,
        pickupAddress:
          warehouse?.address ||
          (warehouse
            ? `${warehouse.name}, ${warehouse.city}, ${warehouse.country}`
            : null),
        dropoffAddress:
          customer?.address ||
          [customer?.city, customer?.country].filter(Boolean).join(", ") ||
          null,
        pickupLat: warehouse?.latitude ?? null,
        pickupLng: warehouse?.longitude ?? null,
        dropoffLat: customer?.latitude ?? null,
        dropoffLng: customer?.longitude ?? null,
        notes: body.notes || null,
        bookedAt: new Date(),
        pickupWarehouseId: warehouse?.id || null,
        customerId: customer?.id || null,
        shipmentId: bags[0]?.shipmentId || null,
        bags: { create: bagIds.map((bagId) => ({ bagId })) },
      },
      include: {
        customer: true,
        pickupWarehouse: true,
        bags: { include: { bag: { include: { shipment: true } } } },
      },
    });

    return NextResponse.json({ delivery, quote }, { status: 201 });
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
      await tx.bag.updateMany({
        where: { id: { in: bagIds } },
        data: { status: "DELIVERED", deliveredAt: new Date() },
      });
      return tx.lastMileDelivery.update({
        where: { id },
        data: { status: "COMPLETED", completedAt: new Date() },
        include: {
          customer: true,
          pickupWarehouse: true,
          bags: { include: { bag: { include: { shipment: true } } } },
        },
      });
    });
    return NextResponse.json({ delivery: updated });
  }

  if (action === "cancel") {
    const id = String(body.id || "");
    const updated = await prisma.lastMileDelivery.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: {
        customer: true,
        pickupWarehouse: true,
        bags: { include: { bag: { include: { shipment: true } } } },
      },
    });
    return NextResponse.json({ delivery: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
