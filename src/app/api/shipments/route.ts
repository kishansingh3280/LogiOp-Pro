import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const shipments = await prisma.shipment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      originWarehouse: true,
      destWarehouse: true,
      bags: {
        include: {
          customer: true,
          transportAssignments: {
            include: { transportAssignment: { include: { carrier: true } } },
          },
        },
      },
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
    customerId?: string;
    warehouseId?: string;
  }> = body.bags || [];

  const shipment = await prisma.shipment.create({
    data: {
      lotNumber: body.lotNumber,
      batchNumber: body.batchNumber || null,
      direction: body.direction || "IN_TO_TH",
      originWarehouseId: body.originWarehouseId || null,
      destWarehouseId: body.destWarehouseId || null,
      notes: body.notes || null,
      shipDate: body.shipDate ? new Date(body.shipDate) : null,
      bags: {
        create: Array.from({ length: Math.max(bagCount, bagDetails.length) }, (_, i) => {
          const detail = bagDetails[i] || {};
          return {
            bagNumber: detail.bagNumber || String(i + 1).padStart(3, "0"),
            weightKg: detail.weightKg != null ? Number(detail.weightKg) : null,
            description: detail.description || null,
            contents: detail.contents || null,
            customerId: detail.customerId || body.defaultCustomerId || null,
            warehouseId: detail.warehouseId || body.originWarehouseId || null,
            status: "CREATED" as const,
          };
        }),
      },
    },
    include: {
      bags: true,
      originWarehouse: true,
      destWarehouse: true,
    },
  });

  return NextResponse.json(shipment, { status: 201 });
}
