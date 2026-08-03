import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { BagStatus } from "@/generated/prisma/client";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const bag = await prisma.bag.findUnique({
    where: { id },
    include: {
      shipment: { include: { originWarehouse: true, destWarehouse: true } },
      customer: true,
      warehouse: true,
      transportAssignments: {
        include: { transportAssignment: { include: { carrier: true } } },
      },
    },
  });
  if (!bag) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(bag);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.bagNumber != null) data.bagNumber = body.bagNumber;
  if (body.weightKg !== undefined)
    data.weightKg = body.weightKg != null ? Number(body.weightKg) : null;
  if (body.description !== undefined) data.description = body.description || null;
  if (body.contents !== undefined) data.contents = body.contents || null;
  if (body.customerId !== undefined) data.customerId = body.customerId || null;
  if (body.deliveryNotes !== undefined)
    data.deliveryNotes = body.deliveryNotes || null;
  if (body.warehouseId !== undefined) data.warehouseId = body.warehouseId || null;
  if (body.notes !== undefined) data.notes = body.notes || null;
  if (body.status != null) {
    data.status = body.status as BagStatus;
    if (body.status === "ARRIVED") data.arrivedAt = new Date();
    if (body.status === "DELIVERED") data.deliveredAt = new Date();
  }
  if (body.arrivedAt) data.arrivedAt = new Date(body.arrivedAt);
  if (body.deliveredAt) data.deliveredAt = new Date(body.deliveredAt);

  const bag = await prisma.bag.update({
    where: { id },
    data,
    include: {
      shipment: true,
      customer: true,
      warehouse: true,
    },
  });
  return NextResponse.json(bag);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  await prisma.bag.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
