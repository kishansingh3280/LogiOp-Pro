# LogiOp Pro

Enterprise logistics + multi-currency ledger for India ↔ Thailand trade.

## Features

- **Parties** — India/Thai customers, carry persons, agents with per-party FX quotes
- **Ledger (Khata)** — You gave / You got in INR & THB, bill attachments, FX context
- **Payables / Receivables** — Live overview of who you need to pay and who will pay you
- **Shipments** — Create lots/batches with N bags (bag details optional)
- **Bag tracker** — Real-time status by lot/batch number
- **Transport** — Air, sea, land, carry person with who/when/arrival/delivery
- **Ledger sync** — Optional auto entry when assigning transport (e.g. 100 kg × ₹200/kg)
- **Warehouses** — Delhi, Kolkata, Jaipur, Mumbai, Bangkok (add more anytime)

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Prisma + SQLite (easy local start; swap to Postgres later)

## Setup

```bash
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Typical workflow

1. Add parties and quote each customer’s exchange rate
2. Record daily ledger entries (advances, THB received, INR paid) with bills
3. Create a shipment lot with bags
4. Assign bags to a carry person / cargo mode
5. Confirm ledger sync for agent payment
6. Update arrival & delivery — track every bag live

## Android app

Native Android client lives in `mobile/` (Expo / React Native).

```bash
# Terminal 1 — API
npm run dev

# Terminal 2 — Android
cd mobile && npm start
```

See [mobile/README.md](mobile/README.md) for Expo Go, emulator, and APK build steps.

