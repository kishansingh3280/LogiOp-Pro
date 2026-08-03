import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeBalance, formatBalanceLabel } from "@/lib/utils";
import type { Currency } from "@/generated/prisma/client";

export async function GET() {
  const entries = await prisma.ledgerEntry.findMany({
    select: {
      partyId: true,
      currency: true,
      direction: true,
      amount: true,
      party: { select: { id: true, name: true, type: true, exchangeRate: true, quoteMode: true } },
    },
  });

  type Agg = {
    partyId: string;
    name: string;
    type: string;
    exchangeRate: number | null;
    quoteMode: string;
    currency: Currency;
    youGave: number;
    youGot: number;
  };

  const map = new Map<string, Agg>();

  for (const e of entries) {
    const key = `${e.partyId}:${e.currency}`;
    let row = map.get(key);
    if (!row) {
      row = {
        partyId: e.partyId,
        name: e.party.name,
        type: e.party.type,
        exchangeRate: e.party.exchangeRate,
        quoteMode: e.party.quoteMode,
        currency: e.currency,
        youGave: 0,
        youGot: 0,
      };
      map.set(key, row);
    }
    if (e.direction === "YOU_GAVE") row.youGave += e.amount;
    else row.youGot += e.amount;
  }

  // Also include parties with no entries but quoted rates
  const allParties = await prisma.party.findMany({
    where: { isActive: true },
    select: { id: true, name: true, type: true, exchangeRate: true, quoteMode: true, defaultCurrency: true },
  });

  for (const p of allParties) {
    const key = `${p.id}:${p.defaultCurrency}`;
    if (!map.has(key)) {
      map.set(key, {
        partyId: p.id,
        name: p.name,
        type: p.type,
        exchangeRate: p.exchangeRate,
        quoteMode: p.quoteMode,
        currency: p.defaultCurrency,
        youGave: 0,
        youGot: 0,
      });
    }
  }

  const balances = Array.from(map.values()).map((r) => {
    const balance = computeBalance(r.youGave, r.youGot);
    return {
      ...r,
      balance,
      label: formatBalanceLabel(balance, r.currency),
    };
  });

  const totals = {
    INR: { toReceive: 0, toPay: 0 },
    THB: { toReceive: 0, toPay: 0 },
  };

  for (const b of balances) {
    if (b.balance > 0) totals[b.currency].toReceive += b.balance;
    else if (b.balance < 0) totals[b.currency].toPay += Math.abs(b.balance);
  }

  return NextResponse.json({ balances, totals });
}
