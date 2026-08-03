import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeBalance } from "@/lib/utils";

export async function GET() {
  const [bagGroups, recentBags, partyCount, shipmentCount, ledgerEntries, openAssignments] =
    await Promise.all([
      prisma.bag.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.bag.findMany({
        take: 15,
        orderBy: { updatedAt: "desc" },
        include: {
          shipment: true,
          customer: true,
          warehouse: true,
        },
      }),
      prisma.party.count({ where: { isActive: true } }),
      prisma.shipment.count(),
      prisma.ledgerEntry.findMany({
        select: { currency: true, direction: true, amount: true },
      }),
      prisma.transportAssignment.findMany({
        where: { deliveredToCustomer: false },
        take: 10,
        orderBy: { assignedDate: "desc" },
        include: {
          carrier: true,
          bags: { include: { bag: { include: { shipment: true } } } },
        },
      }),
    ]);

  const statusCounts: Record<string, number> = {};
  for (const g of bagGroups) {
    statusCounts[g.status] = g._count._all;
  }

  const totals = {
    INR: { toReceive: 0, toPay: 0 },
    THB: { toReceive: 0, toPay: 0 },
  };

  // Aggregate by party+currency then sum
  const byPartyCur = new Map<string, { gave: number; got: number; currency: "INR" | "THB" }>();
  // Simpler: overall YOU_GAVE vs YOU_GOT is not the same as payables
  // Recalculate properly via party grouping
  const allWithParty = await prisma.ledgerEntry.findMany({
    select: { partyId: true, currency: true, direction: true, amount: true },
  });
  const map = new Map<string, { gave: number; got: number; currency: "INR" | "THB" }>();
  for (const e of allWithParty) {
    const key = `${e.partyId}:${e.currency}`;
    const row = map.get(key) || { gave: 0, got: 0, currency: e.currency };
    if (e.direction === "YOU_GAVE") row.gave += e.amount;
    else row.got += e.amount;
    map.set(key, row);
  }
  for (const row of map.values()) {
    const bal = computeBalance(row.gave, row.got);
    if (bal > 0) totals[row.currency].toReceive += bal;
    else if (bal < 0) totals[row.currency].toPay += Math.abs(bal);
  }

  return NextResponse.json({
    statusCounts,
    recentBags,
    partyCount,
    shipmentCount,
    bagCount: Object.values(statusCounts).reduce((a, b) => a + b, 0),
    totals,
    openAssignments,
    entryCount: ledgerEntries.length,
  });
}
