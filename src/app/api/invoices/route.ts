import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Currency, InvoiceStatus } from "@/generated/prisma/client";

type LineInput = {
  catalogItemId?: string | null;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
};

function lineAmount(qty: number, price: number) {
  return Math.round(qty * price * 100) / 100;
}

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const partyId = req.nextUrl.searchParams.get("partyId");
  const invoices = await prisma.invoice.findMany({
    where: {
      ...(status ? { status: status as InvoiceStatus } : {}),
      ...(partyId ? { partyId } : {}),
    },
    orderBy: { issueDate: "desc" },
    include: {
      party: true,
      shipment: { select: { id: true, lotNumber: true } },
      lines: { orderBy: { sortOrder: "asc" } },
    },
  });
  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.partyId) {
    return NextResponse.json({ error: "Customer required" }, { status: 400 });
  }
  const lines: LineInput[] = Array.isArray(body.lines) ? body.lines : [];
  if (lines.length === 0) {
    return NextResponse.json({ error: "Add at least one line" }, { status: 400 });
  }

  const currency = (body.currency || "INR") as Currency;
  const prepared = lines.map((l, i) => {
    const quantity = Number(l.quantity) || 0;
    const unitPrice = Number(l.unitPrice) || 0;
    return {
      catalogItemId: l.catalogItemId || null,
      description: String(l.description || "Item").trim(),
      quantity,
      unit: l.unit || "pcs",
      unitPrice,
      amount: lineAmount(quantity, unitPrice),
      sortOrder: i,
    };
  });
  const subtotal = prepared.reduce((s, l) => s + l.amount, 0);
  const amount = subtotal;
  const status = (body.status as InvoiceStatus) || "DRAFT";
  const number =
    body.number ||
    `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
      Math.random() * 9000 + 1000
    )}`;

  const invoice = await prisma.$transaction(async (tx) => {
    // Remember catalog names
    for (const l of prepared) {
      if (!l.description) continue;
      const existing = await tx.catalogItem.findUnique({
        where: { name: l.description },
      });
      if (!existing) {
        const created = await tx.catalogItem.create({
          data: {
            name: l.description,
            unit: l.unit,
            defaultRate: l.unitPrice,
            currency,
          },
        });
        l.catalogItemId = created.id;
      } else if (!l.catalogItemId) {
        l.catalogItemId = existing.id;
      }
    }

    let ledgerEntryId: string | null = null;
    if (status === "SENT" || status === "PAID") {
      const ledger = await tx.ledgerEntry.create({
        data: {
          partyId: body.partyId,
          direction: "YOU_GAVE",
          amount,
          currency,
          description: `Invoice ${number}${body.description ? ` · ${body.description}` : ""}`,
          entryDate: body.issueDate ? new Date(body.issueDate) : new Date(),
          isAutoSynced: true,
        },
      });
      ledgerEntryId = ledger.id;
    }

    return tx.invoice.create({
      data: {
        number,
        partyId: body.partyId,
        shipmentId: body.shipmentId || null,
        status,
        currency,
        subtotal,
        amount,
        description: body.description || null,
        notes: body.notes || null,
        issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        paidAt: status === "PAID" ? new Date() : null,
        ledgerEntryId,
        lines: { create: prepared },
      },
      include: {
        party: true,
        shipment: true,
        lines: { orderBy: { sortOrder: "asc" } },
      },
    });
  });

  return NextResponse.json(invoice, { status: 201 });
}
