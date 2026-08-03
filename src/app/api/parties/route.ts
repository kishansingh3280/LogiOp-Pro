import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const parties = await prisma.party.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(parties);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const party = await prisma.party.create({
    data: {
      name: body.name,
      type: body.type,
      phone: body.phone || null,
      email: body.email || null,
      city: body.city || null,
      country: body.country || null,
      address: body.address || null,
      latitude: body.latitude != null ? Number(body.latitude) : null,
      longitude: body.longitude != null ? Number(body.longitude) : null,
      placeId: body.placeId || null,
      notes: body.notes || null,
      exchangeRate: body.exchangeRate != null ? Number(body.exchangeRate) : null,
      quoteMode: "INR_PER_THB",
      defaultCurrency: body.defaultCurrency || "INR",
      carryRatePerKg: body.carryRatePerKg != null ? Number(body.carryRatePerKg) : null,
      carryRateCurrency: body.carryRateCurrency || "INR",
    },
  });
  return NextResponse.json(party, { status: 201 });
}
