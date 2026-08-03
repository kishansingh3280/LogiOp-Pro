import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

/** Add more bags to an existing shipment */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();
  const shipment = await prisma.shipment.findUnique({
    where: { id },
    include: { bags: true },
  });
  if (!shipment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const count = Number(body.count) || 1;
  const start = shipment.bags.length + 1;
  const bags = await prisma.$transaction(
    Array.from({ length: count }, (_, i) =>
      prisma.bag.create({
        data: {
          shipmentId: id,
          bagNumber: body.bags?.[i]?.bagNumber || String(start + i).padStart(3, "0"),
          weightKg: body.bags?.[i]?.weightKg != null ? Number(body.bags[i].weightKg) : null,
          description: body.bags?.[i]?.description || null,
          contents: body.bags?.[i]?.contents || null,
          customerId: body.bags?.[i]?.customerId || body.defaultCustomerId || null,
          warehouseId: body.warehouseId || shipment.originWarehouseId || null,
          status: "CREATED",
        },
      })
    )
  );

  return NextResponse.json(bags, { status: 201 });
}
