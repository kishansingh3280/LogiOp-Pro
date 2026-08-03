import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const assignments = await prisma.transportAssignment.findMany({
    orderBy: { assignedDate: "desc" },
    include: {
      carrier: true,
      bags: { include: { bag: { include: { shipment: true } } } },
      ledgerEntries: true,
    },
  });
  return NextResponse.json(assignments);
}

/**
 * Create transport assignment for selected bags.
 * Optionally sync a ledger entry for the carrier/agent payment.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const bagIds: string[] = body.bagIds || [];
  if (!bagIds.length) {
    return NextResponse.json({ error: "Select at least one bag" }, { status: 400 });
  }

  const bags = await prisma.bag.findMany({ where: { id: { in: bagIds } } });
  const totalWeight =
    body.totalWeightKg != null
      ? Number(body.totalWeightKg)
      : bags.reduce((s, b) => s + (b.weightKg || 0), 0);

  const ratePerKg = body.ratePerKg != null ? Number(body.ratePerKg) : null;
  const payableAmount =
    ratePerKg != null && totalWeight > 0 ? ratePerKg * totalWeight : null;

  const assignment = await prisma.transportAssignment.create({
    data: {
      mode: body.mode,
      carrierId: body.carrierId || null,
      carrierName: body.carrierName || null,
      assignedDate: body.assignedDate ? new Date(body.assignedDate) : new Date(),
      departureDate: body.departureDate ? new Date(body.departureDate) : null,
      arrivalDate: body.arrivalDate ? new Date(body.arrivalDate) : null,
      ratePerKg,
      totalWeightKg: totalWeight || null,
      currency: body.currency || "INR",
      trackingRef: body.trackingRef || null,
      notes: body.notes || null,
      bags: {
        create: bagIds.map((bagId) => ({ bagId })),
      },
    },
    include: {
      carrier: true,
      bags: { include: { bag: true } },
    },
  });

  // Update bag statuses to ASSIGNED (or IN_TRANSIT if departure set)
  const newStatus = body.departureDate || body.markInTransit ? "IN_TRANSIT" : "ASSIGNED";
  await prisma.bag.updateMany({
    where: { id: { in: bagIds } },
    data: { status: newStatus },
  });

  let ledgerEntry = null;
  const syncLedger = Boolean(body.syncToLedger);
  if (syncLedger && payableAmount != null && payableAmount > 0 && body.carrierId) {
    ledgerEntry = await prisma.ledgerEntry.create({
      data: {
        partyId: body.carrierId,
        direction: "YOU_GOT", // you owe the carrier (they will receive payment from you)
        amount: payableAmount,
        currency: body.currency || "INR",
        description:
          body.ledgerDescription ||
          `Transport payment (${body.mode}) — ${totalWeight} kg × ${ratePerKg} = ${payableAmount}`,
        entryDate: body.assignedDate ? new Date(body.assignedDate) : new Date(),
        transportAssignmentId: assignment.id,
        isAutoSynced: true,
      },
    });
  }

  return NextResponse.json(
    {
      assignment,
      ledgerEntry,
      suggestedPayable: payableAmount,
      synced: Boolean(ledgerEntry),
    },
    { status: 201 }
  );
}
