import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();
  const warehouse = await prisma.warehouse.update({
    where: { id },
    data: {
      ...(body.name != null && { name: body.name }),
      ...(body.city != null && { city: body.city }),
      ...(body.country != null && { country: body.country }),
      ...(body.address !== undefined && { address: body.address || null }),
      ...(body.latitude !== undefined && {
        latitude: body.latitude != null ? Number(body.latitude) : null,
      }),
      ...(body.longitude !== undefined && {
        longitude: body.longitude != null ? Number(body.longitude) : null,
      }),
      ...(body.placeId !== undefined && { placeId: body.placeId || null }),
      ...(body.isActive != null && { isActive: Boolean(body.isActive) }),
    },
  });
  return NextResponse.json(warehouse);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  await prisma.warehouse.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
