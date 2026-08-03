import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeBalance } from "@/lib/utils";
import { format, startOfMonth, subMonths } from "date-fns";

export async function GET() {
  const [
    bagGroups,
    recentBags,
    partyCount,
    shipmentCount,
    ledgerEntries,
    openAssignments,
    invoices,
  ] = await Promise.all([
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
    prisma.invoice.findMany({
      where: { status: { not: "CANCELLED" } },
      include: {
        lines: { include: { catalogItem: true } },
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

  // P&L worm: last 6 months (INR primary). Revenue from invoice lines;
  // cost from catalog purchaseRate × qty on goods lines.
  const months: Array<{
    key: string;
    label: string;
    revenue: number;
    cost: number;
    profit: number;
    cumulative: number;
  }> = [];
  const now = startOfMonth(new Date());
  for (let i = 5; i >= 0; i--) {
    const m = subMonths(now, i);
    months.push({
      key: format(m, "yyyy-MM"),
      label: format(m, "MMM"),
      revenue: 0,
      cost: 0,
      profit: 0,
      cumulative: 0,
    });
  }
  const byKey = new Map(months.map((m) => [m.key, m]));

  for (const inv of invoices) {
    if (inv.currency !== "INR") continue;
    const key = format(startOfMonth(new Date(inv.issueDate)), "yyyy-MM");
    const bucket = byKey.get(key);
    if (!bucket) continue;

    for (const line of inv.lines) {
      bucket.revenue += line.amount;
      const purchase = line.catalogItem?.purchaseRate;
      if (purchase != null && purchase > 0) {
        bucket.cost += purchase * line.quantity;
      }
    }
  }

  let running = 0;
  for (const m of months) {
    m.profit = Math.round((m.revenue - m.cost) * 100) / 100;
    running += m.profit;
    m.cumulative = Math.round(running * 100) / 100;
    m.revenue = Math.round(m.revenue * 100) / 100;
    m.cost = Math.round(m.cost * 100) / 100;
  }

  const pnlSummary = {
    revenue: months.reduce((s, m) => s + m.revenue, 0),
    cost: months.reduce((s, m) => s + m.cost, 0),
    profit: months.reduce((s, m) => s + m.profit, 0),
    currency: "INR" as const,
  };

  return NextResponse.json({
    statusCounts,
    recentBags,
    partyCount,
    shipmentCount,
    bagCount: Object.values(statusCounts).reduce((a, b) => a + b, 0),
    totals,
    openAssignments,
    entryCount: ledgerEntries.length,
    pnlSeries: months,
    pnlSummary,
  });
}
