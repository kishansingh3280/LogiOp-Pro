import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Currency } from "@/generated/prisma/client";

export async function GET() {
  const shipments = await prisma.shipment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      originWarehouse: true,
      destWarehouse: true,
      ownerParty: true,
      bags: {
        include: {
          customer: true,
          items: true,
          transportAssignments: {
            include: { transportAssignment: { include: { carrier: true } } },
          },
        },
      },
      invoices: true,
      _count: { select: { bags: true } },
    },
  });
  return NextResponse.json(shipments);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const bagCount = Number(body.bagCount) || 0;
  const bagDetails: Array<{
    bagNumber?: string;
    weightKg?: number | null;
    description?: string | null;
    customerId?: string | null;
    shippingCharge?: number | null;
    items?: Array<{ name: string; quantity: number; unit?: string }>;
    warehouseId?: string;
  }> = body.bags || [];

  const ownerPartyId = body.ownerPartyId || body.defaultCustomerId || null;
  const shippingRatePerKg =
    body.shippingRatePerKg != null && body.shippingRatePerKg !== ""
      ? Number(body.shippingRatePerKg)
      : null;
  const shippingCurrency = (body.shippingCurrency || "INR") as Currency;

  const bagCountFinal = Math.max(bagCount, bagDetails.length);

  const shippingChargeTotal =
    body.shippingChargeTotal != null && body.shippingChargeTotal !== ""
      ? Number(body.shippingChargeTotal)
      : bagDetails.reduce((s, d) => {
          if (d.shippingCharge != null) return s + Number(d.shippingCharge);
          if (
            shippingRatePerKg != null &&
            d.weightKg != null &&
            Number(d.weightKg) > 0
          ) {
            return s + shippingRatePerKg * Number(d.weightKg);
          }
          return s;
        }, 0) || null;

  const totalWeightFromBags = bagDetails.reduce(
    (s, b) => s + (b.weightKg != null ? Number(b.weightKg) : 0),
    0
  );

  const shipment = await prisma.$transaction(async (tx) => {
    const created = await tx.shipment.create({
      data: {
        lotNumber: body.lotNumber,
        batchNumber: body.batchNumber || null,
        direction: body.direction || "IN_TO_TH",
        originWarehouseId: body.originWarehouseId || null,
        destWarehouseId: body.destWarehouseId || null,
        ownerPartyId: ownerPartyId || null,
        notes: body.notes || null,
        shipDate: body.shipDate ? new Date(body.shipDate) : null,
        shippingRatePerKg,
        shippingCurrency,
        shippingChargeTotal:
          shippingChargeTotal != null && shippingChargeTotal > 0
            ? shippingChargeTotal
            : null,
        bags: {
          create: Array.from({ length: bagCountFinal }, (_, i) => {
            const detail = bagDetails[i] || {};
            const weightKg =
              detail.weightKg != null ? Number(detail.weightKg) : null;
            let shippingCharge =
              detail.shippingCharge != null
                ? Number(detail.shippingCharge)
                : null;
            if (
              shippingCharge == null &&
              shippingRatePerKg != null &&
              weightKg != null &&
              weightKg > 0
            ) {
              shippingCharge = shippingRatePerKg * weightKg;
            }
            const items = (detail.items || []).filter((it) => it.name?.trim());
            return {
              bagNumber: detail.bagNumber || String(i + 1).padStart(3, "0"),
              weightKg,
              description: detail.description || null,
              customerId: detail.customerId || null,
              shippingCharge,
              warehouseId: detail.warehouseId || body.originWarehouseId || null,
              status: "CREATED" as const,
              items: {
                create: items.map((it) => ({
                  name: it.name.trim(),
                  quantity: Math.max(0.01, Number(it.quantity) || 1),
                  unit: (it.unit || "pcs").trim().toLowerCase() || "pcs",
                })),
              },
            };
          }),
        },
      },
      include: {
        bags: { include: { customer: true, items: true } },
        originWarehouse: true,
        destWarehouse: true,
        ownerParty: true,
      },
    });

    if (
      ownerPartyId &&
      shippingChargeTotal != null &&
      shippingChargeTotal > 0
    ) {
      const invNumber = `INV-${created.lotNumber}`;

      const itemQtyByKey = new Map<string, { name: string; qty: number; unit: string }>();
      for (const bag of created.bags) {
        for (const it of bag.items || []) {
          const name = it.name.trim();
          if (!name) continue;
          const unit = (it.unit || "pcs").toLowerCase();
          const key = `${name}||${unit}`;
          const prev = itemQtyByKey.get(key);
          itemQtyByKey.set(key, {
            name,
            unit,
            qty: (prev?.qty || 0) + it.quantity,
          });
        }
      }
      const catalogIds = new Map<string, string>();
      for (const { name, unit } of itemQtyByKey.values()) {
        const cat = await tx.catalogItem.upsert({
          where: { name },
          create: { name, unit, currency: shippingCurrency },
          update: { isActive: true, unit },
        });
        catalogIds.set(name, cat.id);
        await tx.catalogUnit.upsert({
          where: { name: unit },
          create: { name: unit },
          update: { isActive: true },
        });
      }
      for (const bag of created.bags) {
        for (const it of bag.items || []) {
          const cid = catalogIds.get(it.name.trim());
          if (cid) {
            await tx.bagItem.update({
              where: { id: it.id },
              data: { catalogItemId: cid },
            });
          }
        }
      }

      const lines: Array<{
        catalogItemId: string | null;
        description: string;
        quantity: number;
        unit: string;
        unitPrice: number;
        amount: number;
        sortOrder: number;
      }> = [
        {
          catalogItemId: null,
          description: `Shipping charges · Lot ${created.lotNumber}${
            shippingRatePerKg != null
              ? ` · ${shippingRatePerKg}/kg × ${totalWeightFromBags || "?"} kg`
              : ""
          }`,
          quantity: 1,
          unit: "lot",
          unitPrice: shippingChargeTotal,
          amount: shippingChargeTotal,
          sortOrder: 0,
        },
      ];
      let sort = 1;
      for (const { name, qty, unit } of itemQtyByKey.values()) {
        lines.push({
          catalogItemId: catalogIds.get(name) || null,
          description: `Goods shipped · ${name}`,
          quantity: qty,
          unit,
          unitPrice: 0,
          amount: 0,
          sortOrder: sort++,
        });
      }

      const ledger = await tx.ledgerEntry.create({
        data: {
          partyId: ownerPartyId,
          direction: "YOU_GAVE",
          amount: shippingChargeTotal,
          currency: shippingCurrency,
          description: `Invoice ${invNumber} · Shipping · Lot ${created.lotNumber}`,
          entryDate: created.shipDate || new Date(),
          isAutoSynced: true,
        },
      });
      await tx.invoice.create({
        data: {
          number: invNumber,
          partyId: ownerPartyId,
          shipmentId: created.id,
          status: "SENT",
          amount: shippingChargeTotal,
          subtotal: shippingChargeTotal,
          currency: shippingCurrency,
          description: `Shipping charges for lot ${created.lotNumber}`,
          issueDate: created.shipDate || new Date(),
          ledgerEntryId: ledger.id,
          lines: { create: lines },
        },
      });
      return tx.shipment.update({
        where: { id: created.id },
        data: {
          shippingInvoicedAt: new Date(),
          shippingLedgerEntryId: ledger.id,
        },
        include: {
          bags: { include: { customer: true, items: true } },
          originWarehouse: true,
          destWarehouse: true,
          ownerParty: true,
          invoices: { include: { lines: true } },
        },
      });
    }

    return created;
  });

  return NextResponse.json(shipment, { status: 201 });
}
