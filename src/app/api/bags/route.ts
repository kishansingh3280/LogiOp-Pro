import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const lotNumber = searchParams.get("lot");
  const q = searchParams.get("q");

  const bags = await prisma.bag.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(lotNumber
        ? { shipment: { lotNumber: { contains: lotNumber } } }
        : {}),
      ...(q
        ? {
            OR: [
              { bagNumber: { contains: q } },
              { description: { contains: q } },
              { contents: { contains: q } },
              { shipment: { lotNumber: { contains: q } } },
              { shipment: { batchNumber: { contains: q } } },
            ],
          }
        : {}),
    },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      shipment: { include: { originWarehouse: true, destWarehouse: true } },
      customer: true,
      warehouse: true,
      transportAssignments: {
        include: {
          transportAssignment: { include: { carrier: true } },
        },
      },
    },
  });

  return NextResponse.json(bags);
}
