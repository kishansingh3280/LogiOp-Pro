import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const existing = await prisma.savedAddress.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (body.label != null) data.label = String(body.label).trim();
  if (body.contactName !== undefined)
    data.contactName = body.contactName
      ? String(body.contactName).trim()
      : null;
  if (body.phone !== undefined)
    data.phone = body.phone ? String(body.phone).trim() : null;
  if (body.address != null) data.address = String(body.address).trim();
  if (body.city !== undefined)
    data.city = body.city ? String(body.city).trim() : null;
  if (body.country !== undefined)
    data.country = body.country ? String(body.country).trim() : null;
  if (body.latitude !== undefined)
    data.latitude =
      body.latitude != null && body.latitude !== ""
        ? Number(body.latitude)
        : null;
  if (body.longitude !== undefined)
    data.longitude =
      body.longitude != null && body.longitude !== ""
        ? Number(body.longitude)
        : null;
  if (body.placeId !== undefined)
    data.placeId = body.placeId ? String(body.placeId) : null;
  if (body.kind != null && ["PICKUP", "DROPOFF", "BOTH"].includes(String(body.kind)))
    data.kind = String(body.kind);
  if (body.notes !== undefined)
    data.notes = body.notes ? String(body.notes).trim() : null;
  if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder);
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

  const updated = await prisma.savedAddress.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.savedAddress.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.savedAddress.update({
    where: { id },
    data: { isActive: false },
  });
  return NextResponse.json({ ok: true });
}
