import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const party = await prisma.party.findUnique({
    where: { id },
    include: {
      ledgerEntries: {
        orderBy: { entryDate: "desc" },
        include: { attachments: true },
        take: 100,
      },
    },
  });
  if (!party) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(party);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();
  const party = await prisma.party.update({
    where: { id },
    data: {
      ...(body.name != null && { name: body.name }),
      ...(body.type != null && { type: body.type }),
      ...(body.phone !== undefined && { phone: body.phone || null }),
      ...(body.email !== undefined && { email: body.email || null }),
      ...(body.city !== undefined && { city: body.city || null }),
      ...(body.country !== undefined && { country: body.country || null }),
      ...(body.notes !== undefined && { notes: body.notes || null }),
      ...(body.exchangeRate !== undefined && {
        exchangeRate: body.exchangeRate != null ? Number(body.exchangeRate) : null,
      }),
      ...(body.defaultCurrency != null && { defaultCurrency: body.defaultCurrency }),
      ...(body.carryRatePerKg !== undefined && {
        carryRatePerKg: body.carryRatePerKg != null ? Number(body.carryRatePerKg) : null,
      }),
      ...(body.carryRateCurrency != null && {
        carryRateCurrency: body.carryRateCurrency,
      }),
      ...(body.booksSharedUntil !== undefined && {
        booksSharedUntil:
          body.booksSharedUntil != null
            ? new Date(body.booksSharedUntil)
            : null,
      }),
      ...(body.isActive != null && { isActive: body.isActive }),
    },
  });
  return NextResponse.json(party);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  await prisma.party.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
