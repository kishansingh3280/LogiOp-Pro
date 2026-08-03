import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const addresses = await prisma.savedAddress.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
  return NextResponse.json(addresses);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const label = String(body.label || "").trim();
  const address = String(body.address || "").trim();
  if (!label || !address) {
    return NextResponse.json(
      { error: "Label and address are required" },
      { status: 400 }
    );
  }
  const lat =
    body.latitude != null && body.latitude !== ""
      ? Number(body.latitude)
      : null;
  const lng =
    body.longitude != null && body.longitude !== ""
      ? Number(body.longitude)
      : null;
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "Latitude and longitude are required (pin the location)" },
      { status: 400 }
    );
  }

  const created = await prisma.savedAddress.create({
    data: {
      label,
      contactName: body.contactName ? String(body.contactName).trim() : null,
      phone: body.phone ? String(body.phone).trim() : null,
      address,
      city: body.city ? String(body.city).trim() : null,
      country: body.country ? String(body.country).trim() : null,
      latitude: lat,
      longitude: lng,
      placeId: body.placeId ? String(body.placeId) : null,
      kind: ["PICKUP", "DROPOFF", "BOTH"].includes(String(body.kind))
        ? String(body.kind)
        : "BOTH",
      notes: body.notes ? String(body.notes).trim() : null,
      sortOrder: body.sortOrder != null ? Number(body.sortOrder) : 0,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
