import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Currency } from "@/generated/prisma/client";

export async function GET() {
  const items = await prisma.catalogItem.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const existing = await prisma.catalogItem.findUnique({ where: { name } });
  if (existing) {
    const updated = await prisma.catalogItem.update({
      where: { id: existing.id },
      data: {
        isActive: true,
        ...(body.description !== undefined && {
          description: body.description || null,
        }),
        ...(body.unit != null && { unit: body.unit }),
        ...(body.defaultRate !== undefined && {
          defaultRate:
            body.defaultRate != null ? Number(body.defaultRate) : null,
        }),
        ...(body.currency != null && {
          currency: body.currency as Currency,
        }),
      },
    });
    return NextResponse.json(updated);
  }

  const item = await prisma.catalogItem.create({
    data: {
      name,
      description: body.description || null,
      unit: body.unit || "pcs",
      defaultRate:
        body.defaultRate != null ? Number(body.defaultRate) : null,
      currency: (body.currency as Currency) || "INR",
    },
  });
  return NextResponse.json(item, { status: 201 });
}
