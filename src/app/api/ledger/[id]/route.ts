import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const entry = await prisma.ledgerEntry.findUnique({
    where: { id },
    include: { attachments: true, party: true },
  });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(entry);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();
  const entry = await prisma.ledgerEntry.update({
    where: { id },
    data: {
      ...(body.direction != null && { direction: body.direction }),
      ...(body.amount != null && { amount: Number(body.amount) }),
      ...(body.currency != null && { currency: body.currency }),
      ...(body.description !== undefined && { description: body.description || null }),
      ...(body.entryDate != null && { entryDate: new Date(body.entryDate) }),
      ...(body.fxRate !== undefined && {
        fxRate: body.fxRate != null ? Number(body.fxRate) : null,
      }),
      ...(body.fxAmount !== undefined && {
        fxAmount: body.fxAmount != null ? Number(body.fxAmount) : null,
      }),
      ...(body.fxCurrency !== undefined && { fxCurrency: body.fxCurrency || null }),
    },
    include: { attachments: true, party: true },
  });
  return NextResponse.json(entry);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  await prisma.ledgerEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
