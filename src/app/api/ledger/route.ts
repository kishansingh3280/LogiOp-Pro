import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Currency } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const partyId = searchParams.get("partyId");
  const currency = searchParams.get("currency") as Currency | null;

  if (partyId) {
    const entries = await prisma.ledgerEntry.findMany({
      where: {
        partyId,
        ...(currency ? { currency } : {}),
      },
      orderBy: { entryDate: "desc" },
      include: { attachments: true, party: true },
    });
    return NextResponse.json(entries);
  }

  const entries = await prisma.ledgerEntry.findMany({
    orderBy: { entryDate: "desc" },
    take: 200,
    include: { attachments: true, party: true },
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const entry = await prisma.ledgerEntry.create({
    data: {
      partyId: body.partyId,
      direction: body.direction,
      amount: Number(body.amount),
      currency: body.currency,
      description: body.description || null,
      entryDate: body.entryDate ? new Date(body.entryDate) : new Date(),
      fxRate: body.fxRate != null ? Number(body.fxRate) : null,
      fxAmount: body.fxAmount != null ? Number(body.fxAmount) : null,
      fxCurrency: body.fxCurrency || null,
      transportAssignmentId: body.transportAssignmentId || null,
      isAutoSynced: Boolean(body.isAutoSynced),
    },
    include: { attachments: true, party: true },
  });
  return NextResponse.json(entry, { status: 201 });
}
