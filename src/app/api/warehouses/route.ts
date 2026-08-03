import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const warehouses = await prisma.warehouse.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(warehouses);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const warehouse = await prisma.warehouse.create({
    data: {
      name: body.name,
      city: body.city,
      country: body.country,
      address: body.address || null,
      latitude: body.latitude != null ? Number(body.latitude) : null,
      longitude: body.longitude != null ? Number(body.longitude) : null,
      placeId: body.placeId || null,
    },
  });
  return NextResponse.json(warehouse, { status: 201 });
}
