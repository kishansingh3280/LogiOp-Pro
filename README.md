# LogiOp Pro (Web-first)

**Primary product is the web app** — use Chrome (or Edge/Firefox/Safari) on your PC or phone.  
Android APK will be rebuilt later, only after you are happy with the web functionality.

> Note: Internet Explorer is not supported. Use **Google Chrome** or Microsoft Edge.

## Features (same as planned for Android)

- **Parties** — India/Thai customers, carry persons, agents with per-party FX quotes  
- **Ledger (Khata)** — You gave (red) / You got (green), auto FX convert, bill attach before save  
- **Payables / Receivables** — Who you need to pay / who will pay you (INR & THB)  
- **Shipments** — Create lots with N bags  
- **Bag tracker** — Live status by lot/batch  
- **Transport** — Air / sea / land / carry person + optional ledger sync  
- **Warehouses** — Delhi, Kolkata, Jaipur, Mumbai, Bangkok  

## Run on your PC

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open **http://localhost:3000** in Chrome.

## Use on your phone (same data)

1. PC and phone must be on the same Wi‑Fi.  
2. Find your PC’s IP (Windows: `ipconfig`, Mac/Linux: `ifconfig` / `ip a`).  
3. On the phone Chrome, open `http://YOUR-PC-IP:3000` (example: `http://192.168.1.10:3000`).  
4. Optional: Chrome → **Add to Home screen** for an app-like icon.

## Typical workflow

1. Add parties and quote each customer’s exchange rate  
2. Record daily ledger entries (advances, THB received, INR paid) with bills  
3. Create a shipment lot with bags  
4. Assign bags to carry person / cargo  
5. Sync agent payment to ledger when asked  
6. Update arrival & delivery  

## Android (later)

The `mobile/` folder is paused until the web app matches all your needs.  
When you say you are satisfied, we will rebuild the Android app from the final web design.
