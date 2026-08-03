import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULT_UNITS = [
  "pcs",
  "meter",
  "yard",
  "liter",
  "kg",
  "pair",
  "set",
  "box",
];

export async function GET() {
  // Ensure defaults exist once
  for (const name of DEFAULT_UNITS) {
    await prisma.catalogUnit.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }
  const units = await prisma.catalogUnit.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(units);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = String(body.name || "")
    .trim()
    .toLowerCase();
  if (!name) {
    return NextResponse.json({ error: "Unit name required" }, { status: 400 });
  }
  const existing = await prisma.catalogUnit.findUnique({ where: { name } });
  if (existing) {
    const updated = await prisma.catalogUnit.update({
      where: { id: existing.id },
      data: { isActive: true },
    });
    return NextResponse.json(updated);
  }
  const unit = await prisma.catalogUnit.create({ data: { name } });
  return NextResponse.json(unit, { status: 201 });
}
