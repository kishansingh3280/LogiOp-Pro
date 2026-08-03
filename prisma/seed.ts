import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const dbUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const filePath = dbUrl.replace(/^file:/, "");
const absolutePath = path.isAbsolute(filePath)
  ? filePath
  : path.join(process.cwd(), filePath);

const adapter = new PrismaBetterSqlite3({ url: absolutePath });
const prisma = new PrismaClient({ adapter });

async function main() {
  const warehouses = [
    { name: "Delhi Warehouse", city: "Delhi", country: "India" },
    { name: "Kolkata Warehouse", city: "Kolkata", country: "India" },
    { name: "Jaipur Warehouse", city: "Jaipur", country: "India" },
    { name: "Mumbai Warehouse", city: "Mumbai", country: "India" },
    { name: "Bangkok Warehouse", city: "Bangkok", country: "Thailand" },
  ];

  for (const w of warehouses) {
    const existing = await prisma.warehouse.findFirst({
      where: { name: w.name },
    });
    if (!existing) {
      await prisma.warehouse.create({ data: w });
    }
  }

  const parties = [
    {
      name: "Rajesh Traders",
      type: "LOGISTIC_CUSTOMER" as const,
      city: "Delhi",
      country: "India",
      exchangeRate: 2.45,
      quoteMode: "INR_PER_THB",
      defaultCurrency: "INR" as const,
      phone: "+91-9876543210",
      notes: "Sends goods India → Thailand",
    },
    {
      name: "Siam Gifts Co.",
      type: "LOGISTIC_CUSTOMER" as const,
      city: "Bangkok",
      country: "Thailand",
      exchangeRate: 2.42,
      quoteMode: "INR_PER_THB",
      defaultCurrency: "THB" as const,
      phone: "+66-812345678",
      notes: "Receives / sends Thai side logistics",
    },
    {
      name: "Bangkok Boutique (Buyer)",
      type: "BUYER" as const,
      city: "Bangkok",
      country: "Thailand",
      exchangeRate: 2.5,
      quoteMode: "INR_PER_THB",
      defaultCurrency: "THB" as const,
      phone: "+66-899001122",
      notes: "Buys our own products — invoices later",
    },
    {
      name: "Amit Sharma (Carrier)",
      type: "CARRIER" as const,
      city: "Delhi",
      country: "India",
      carryRatePerKg: 200,
      defaultCurrency: "INR" as const,
      phone: "+91-9988776655",
    },
    {
      name: "Bangkok Air Agent",
      type: "TRANSPORTER" as const,
      city: "Bangkok",
      country: "Thailand",
      defaultCurrency: "THB" as const,
      notes: "Air cargo company",
    },
    {
      name: "Uncle Ramesh",
      type: "INDIVIDUAL" as const,
      city: "Jaipur",
      country: "India",
      defaultCurrency: "INR" as const,
      notes: "Personal ledger",
    },
  ];

  for (const p of parties) {
    const existing = await prisma.party.findFirst({ where: { name: p.name } });
    if (!existing) {
      await prisma.party.create({ data: p });
    } else {
      // Keep names in sync with new type taxonomy on re-seed
      await prisma.party.update({
        where: { id: existing.id },
        data: { type: p.type, notes: p.notes ?? existing.notes },
      });
    }
  }

  console.log("Seed complete: warehouses + sample parties (new types)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
