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
    weightKg?: number;
    description?: string;
    contents?: string;
    customerId?: string | null;
    deliveryNotes?: string | null;
    warehouseId?: string;
  }> = body.bags || [];

  const ownerPartyId =
    body.ownerPartyId || body.defaultCustomerId || null;
  const shippingRatePerKg =
    body.shippingRatePerKg != null && body.shippingRatePerKg !== ""
      ? Number(body.shippingRatePerKg)
      : null;
  const shippingCurrency = (body.shippingCurrency || "INR") as Currency;

  const totalWeightFromBags = bagDetails.reduce(
    (s, b) => s + (b.weightKg != null ? Number(b.weightKg) : 0),
    0
  );
  const shippingChargeTotal =
    body.shippingChargeTotal != null && body.shippingChargeTotal !== ""
      ? Number(body.shippingChargeTotal)
      : shippingRatePerKg != null && totalWeightFromBags > 0
        ? shippingRatePerKg * totalWeightFromBags
        : null;

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
        shippingChargeTotal,
        bags: {
          create: Array.from(
            { length: Math.max(bagCount, bagDetails.length) },
            (_, i) => {
              const detail = bagDetails[i] || {};
              return {
                bagNumber: detail.bagNumber || String(i + 1).padStart(3, "0"),
                weightKg:
                  detail.weightKg != null ? Number(detail.weightKg) : null,
                description: detail.description || null,
                contents: detail.contents || null,
                // Deliver-to only — do not copy owner onto every bag
                customerId: detail.customerId || null,
                deliveryNotes: detail.deliveryNotes || null,
                warehouseId:
                  detail.warehouseId || body.originWarehouseId || null,
                status: "CREATED" as const,
              };
            }
          ),
        },
      },
      include: {
        bags: true,
        originWarehouse: true,
        destWarehouse: true,
        ownerParty: true,
      },
    });

    // Auto-invoice + ledger when shipping charges and owner are set
    if (
      ownerPartyId &&
      shippingChargeTotal != null &&
      shippingChargeTotal > 0
    ) {
      const invNumber = `INV-${created.lotNumber}`;
      const ledger = await tx.ledgerEntry.create({
        data: {
          partyId: ownerPartyId,
          direction: "YOU_GAVE",
          amount: shippingChargeTotal,
          currency: shippingCurrency,
          description: `Shipping charges · Lot ${created.lotNumber}${
            shippingRatePerKg != null
              ? ` · ${shippingRatePerKg}/kg × ${totalWeightFromBags || "?"} kg`
              : ""
          }`,
          entryDate: created.shipDate || new Date(),
          isAutoSynced: true,
        },
      });
      await tx.invoice.create({
        data: {
          number: invNumber,
          partyId: ownerPartyId,
          shipmentId: created.id,
          amount: shippingChargeTotal,
          currency: shippingCurrency,
          description: `Shipping charges for lot ${created.lotNumber}`,
          issueDate: created.shipDate || new Date(),
          ledgerEntryId: ledger.id,
        },
      });
      return tx.shipment.update({
        where: { id: created.id },
        data: {
          shippingInvoicedAt: new Date(),
          shippingLedgerEntryId: ledger.id,
        },
        include: {
          bags: { include: { customer: true } },
          originWarehouse: true,
          destWarehouse: true,
          ownerParty: true,
          invoices: true,
        },
      });
    }

    return created;
  });

  return NextResponse.json(shipment, { status: 201 });
}
