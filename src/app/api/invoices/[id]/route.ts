import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { InvoiceStatus } from "@/generated/prisma/client";

type Ctx = { params: Promise<{ id: string }> };

function lineAmount(qty: number, price: number) {
  return Math.round(qty * price * 100) / 100;
}

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
  const existing = await prisma.invoice.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const nextStatus = (body.status as InvoiceStatus) || existing.status;

  const invoice = await prisma.$transaction(async (tx) => {
    let amount = existing.amount;
    let subtotal = existing.subtotal;

    // Update line rates / amounts (draft or sent — before paid)
    if (Array.isArray(body.lines) && existing.status !== "PAID" && existing.status !== "CANCELLED") {
      for (const row of body.lines as Array<{
        id: string;
        unitPrice?: number;
        quantity?: number;
      }>) {
        const line = existing.lines.find((l) => l.id === row.id);
        if (!line) continue;
        const unitPrice =
          row.unitPrice != null ? Number(row.unitPrice) : line.unitPrice;
        const quantity =
          row.quantity != null ? Number(row.quantity) : line.quantity;
        await tx.invoiceLine.update({
          where: { id: line.id },
          data: {
            unitPrice,
            quantity,
            amount: lineAmount(quantity, unitPrice),
          },
        });
      }
      const refreshed = await tx.invoiceLine.findMany({
        where: { invoiceId: id },
      });
      subtotal = refreshed.reduce((s, l) => s + l.amount, 0);
      amount = Math.round(subtotal * 100) / 100;
      subtotal = amount;
    }

    let ledgerEntryId = existing.ledgerEntryId;

    // Draft → Sent: post YOU_GAVE to ledger
    if (
      nextStatus === "SENT" &&
      existing.status === "DRAFT" &&
      !ledgerEntryId
    ) {
      const ledger = await tx.ledgerEntry.create({
        data: {
          partyId: existing.partyId,
          direction: "YOU_GAVE",
          amount,
          currency: existing.currency,
          description: `Invoice ${existing.number}${
            existing.description ? ` · ${existing.description}` : ""
          }`,
          entryDate: existing.issueDate || new Date(),
          isAutoSynced: true,
        },
      });
      ledgerEntryId = ledger.id;
      if (existing.shipmentId) {
        await tx.shipment.update({
          where: { id: existing.shipmentId },
          data: { shippingLedgerEntryId: ledger.id },
        });
      }
    }

    // Mark paid → record YOU_GOT payment on ledger
    if (nextStatus === "PAID" && existing.status !== "PAID") {
      await tx.ledgerEntry.create({
        data: {
          partyId: existing.partyId,
          direction: "YOU_GOT",
          amount,
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
        ...(Array.isArray(body.lines) ? { amount, subtotal } : {}),
        ...(ledgerEntryId !== existing.ledgerEntryId
          ? { ledgerEntryId }
          : {}),
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
        lines: { orderBy: { sortOrder: "asc" }, include: { catalogItem: true } },
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
