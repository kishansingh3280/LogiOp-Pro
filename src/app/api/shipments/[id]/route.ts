import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const shipment = await prisma.shipment.findUnique({
    where: { id },
    include: {
      originWarehouse: true,
      destWarehouse: true,
      ownerParty: true,
      invoices: true,
      bags: {
        orderBy: { bagNumber: "asc" },
        include: {
          customer: true,
          items: true,
          warehouse: true,
          transportAssignments: {
            include: {
              transportAssignment: { include: { carrier: true } },
            },
          },
        },
      },
    },
  });
  if (!shipment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(shipment);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();
  const shipment = await prisma.shipment.update({
    where: { id },
    data: {
      ...(body.lotNumber != null && { lotNumber: body.lotNumber }),
      ...(body.batchNumber !== undefined && { batchNumber: body.batchNumber || null }),
      ...(body.direction != null && { direction: body.direction }),
      ...(body.originWarehouseId !== undefined && {
        originWarehouseId: body.originWarehouseId || null,
      }),
      ...(body.destWarehouseId !== undefined && {
        destWarehouseId: body.destWarehouseId || null,
      }),
      ...(body.notes !== undefined && { notes: body.notes || null }),
      ...(body.shipDate !== undefined && {
        shipDate: body.shipDate ? new Date(body.shipDate) : null,
      }),
    },
    include: { bags: true, originWarehouse: true, destWarehouse: true },
  });
  return NextResponse.json(shipment);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  await prisma.shipment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
