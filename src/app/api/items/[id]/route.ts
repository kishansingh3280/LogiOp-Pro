import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Currency } from "@/generated/prisma/client";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const item = await prisma.catalogItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();
  const item = await prisma.catalogItem.update({
    where: { id },
    data: {
      ...(body.name != null && { name: String(body.name).trim() }),
      ...(body.description !== undefined && {
        description: body.description || null,
      }),
      ...(body.unit != null && { unit: body.unit }),
      ...(body.defaultRate !== undefined && {
        defaultRate: body.defaultRate != null ? Number(body.defaultRate) : null,
      }),
      ...(body.currency != null && { currency: body.currency as Currency }),
      ...(body.isActive != null && { isActive: Boolean(body.isActive) }),
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  await prisma.catalogItem.update({
    where: { id },
    data: { isActive: false },
  });
  return NextResponse.json({ ok: true });
}
