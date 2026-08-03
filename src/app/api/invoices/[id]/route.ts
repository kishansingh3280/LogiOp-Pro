import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { InvoiceStatus } from "@/generated/prisma/client";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      party: true,
      shipment: {
        include: {
          bags: { include: { items: true, customer: true } },
        },
      },
      lines: {
        orderBy: { sortOrder: "asc" },
        include: { catalogItem: true },
      },
    },
  });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(invoice);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();
  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const nextStatus = (body.status as InvoiceStatus) || existing.status;

  const invoice = await prisma.$transaction(async (tx) => {
    // Mark paid → record YOU_GOT payment on ledger
    if (nextStatus === "PAID" && existing.status !== "PAID") {
      await tx.ledgerEntry.create({
        data: {
          partyId: existing.partyId,
          direction: "YOU_GOT",
          amount: existing.amount,
          currency: existing.currency,
          description: `Payment received · Invoice ${existing.number}`,
          entryDate: new Date(),
          isAutoSynced: true,
        },
      });
    }

    return tx.invoice.update({
      where: { id },
      data: {
        ...(body.status != null && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes || null }),
        ...(body.description !== undefined && {
          description: body.description || null,
        }),
        ...(body.dueDate !== undefined && {
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
        }),
        ...(nextStatus === "PAID" && !existing.paidAt
          ? { paidAt: new Date() }
          : {}),
        ...(nextStatus !== "PAID" && body.status != null
          ? { paidAt: null }
          : {}),
      },
      include: {
        party: true,
        shipment: true,
        lines: { orderBy: { sortOrder: "asc" } },
      },
    });
  });

  return NextResponse.json(invoice);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  await prisma.invoice.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  return NextResponse.json({ ok: true });
}
