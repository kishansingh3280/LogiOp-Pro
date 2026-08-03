import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const assignment = await prisma.transportAssignment.findUnique({
    where: { id },
    include: {
      carrier: true,
      bags: { include: { bag: { include: { shipment: true, customer: true } } } },
      ledgerEntries: { include: { attachments: true } },
    },
  });
  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(assignment);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();

  const assignment = await prisma.transportAssignment.update({
    where: { id },
    data: {
      ...(body.mode != null && { mode: body.mode }),
      ...(body.carrierId !== undefined && { carrierId: body.carrierId || null }),
      ...(body.carrierName !== undefined && { carrierName: body.carrierName || null }),
      ...(body.assignedDate != null && { assignedDate: new Date(body.assignedDate) }),
      ...(body.departureDate !== undefined && {
        departureDate: body.departureDate ? new Date(body.departureDate) : null,
      }),
      ...(body.arrivalDate !== undefined && {
        arrivalDate: body.arrivalDate ? new Date(body.arrivalDate) : null,
      }),
      ...(body.ratePerKg !== undefined && {
        ratePerKg: body.ratePerKg != null ? Number(body.ratePerKg) : null,
      }),
      ...(body.totalWeightKg !== undefined && {
        totalWeightKg: body.totalWeightKg != null ? Number(body.totalWeightKg) : null,
      }),
      ...(body.currency != null && { currency: body.currency }),
      ...(body.trackingRef !== undefined && { trackingRef: body.trackingRef || null }),
      ...(body.notes !== undefined && { notes: body.notes || null }),
      ...(body.deliveredToCustomer != null && {
        deliveredToCustomer: body.deliveredToCustomer,
        deliveredAt: body.deliveredToCustomer
          ? body.deliveredAt
            ? new Date(body.deliveredAt)
            : new Date()
          : null,
      }),
    },
    include: {
      carrier: true,
      bags: { include: { bag: true } },
      ledgerEntries: true,
    },
  });

  // Propagate status updates to bags
  const bagIds = assignment.bags.map((b) => b.bagId);
  if (body.markBagsStatus && bagIds.length) {
    const statusData: Record<string, unknown> = { status: body.markBagsStatus };
    if (body.markBagsStatus === "ARRIVED") statusData.arrivedAt = new Date();
    if (body.markBagsStatus === "DELIVERED") statusData.deliveredAt = new Date();
    await prisma.bag.updateMany({
      where: { id: { in: bagIds } },
      data: statusData,
    });
  } else if (body.arrivalDate && bagIds.length) {
    await prisma.bag.updateMany({
      where: { id: { in: bagIds } },
      data: { status: "ARRIVED", arrivedAt: new Date(body.arrivalDate) },
    });
  } else if (body.deliveredToCustomer && bagIds.length) {
    await prisma.bag.updateMany({
      where: { id: { in: bagIds } },
      data: { status: "DELIVERED", deliveredAt: new Date() },
    });
  }

  // Optional late ledger sync
  let ledgerEntry = null;
  if (body.syncToLedger && !assignment.ledgerEntries.length && assignment.carrierId) {
    const weight = assignment.totalWeightKg || 0;
    const rate = assignment.ratePerKg || 0;
    const amount = weight * rate;
    if (amount > 0) {
      ledgerEntry = await prisma.ledgerEntry.create({
        data: {
          partyId: assignment.carrierId,
          direction: "YOU_GOT",
          amount,
          currency: assignment.currency,
          description:
            body.ledgerDescription ||
            `Transport payment (${assignment.mode}) — ${weight} kg × ${rate}`,
          transportAssignmentId: assignment.id,
          isAutoSynced: true,
        },
      });
    }
  }

  return NextResponse.json({ assignment, ledgerEntry });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  await prisma.transportAssignment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
