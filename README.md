# Logistics Hub — Mobile

Native Android + iOS app (Expo) that mirrors the live web app at
[logistics-hub-1349.emergent.host](https://logistics-hub-1349.emergent.host)
and shares the same backend, so shipments, ledger, parties, invoices and bullion
work stay in sync between web and mobile.

---

## Download the latest APK

> **Latest release**: _pending first Publish build_
>
> **[Download APK](REPLACE_ME_WITH_APK_URL)** &nbsp;·&nbsp; _updated: YYYY-MM-DD_
>
> _If the link above says "REPLACE_ME_..." it means a new build has not been
> generated yet. Follow the "How to generate a new APK" section below and paste
> the new URL over the placeholder, then push to GitHub again._

### How to generate a new APK

1. Open this project in Emergent.
2. **Top-right → Publish**. Confirm the deployment.
3. After deploy completes, select **Generate Android build**.
4. Provide (or accept) the package name — default is `com.logisticshub.mobile`.
5. Wait for the build to finish. Emergent shows a **Download APK** button and
   gives you a permanent hosted URL.
6. Copy that URL and paste it into this README where it says
   `REPLACE_ME_WITH_APK_URL`, then push again via Emergent's
   **Save to GitHub** button.

### Install the APK on your device

- Samsung Tab S11 / S26 Ultra: open the download link in Chrome, tap the APK
  file, and confirm the "Install from unknown sources" prompt.
- No Expo Go required. No SDK-version issues. Fresh install every time.

---

## Features

- **Overview dashboard** — shipments split by status, warehouse capacity,
  ledger snapshot, active carrier slots (Bullion), recent shipments.
- **Shipments** — full list + rich detail with hero card, money card
  (customer freight vs. carrier pay + margin), bag-level details, timeline,
  and Lalamove auto-book when in warehouse.
- **Ledger** — Khatabook-style: combined receivables/payables snippet, all
  parties with balance, per-party "You gave / You got" quick entry.
- **Parties** — searchable list with role filters, party detail with ledger
  statement + related shipments + related invoices.
- **Bullion Work** — client-side (device-local) tracker for the currency ↔ gold
  cycle:
  - **Carrier trips** with date, route (IN↔BKK), and available slots.
  - **Bullion batches** progressing through Phase 1 (India purchase → in-transit)
    → Phase 2 (BKK deposit → gold secured) → Phase 3 (return → arrived → sold)
    with automatic margin calculation.
- **Invoices, Items, Warehouses, Lalamove** — full CRUD screens.
- **Offline queue** — GET responses cached in AsyncStorage; POST/PATCH/DELETE
  mutations queued when offline and auto-replayed on reconnect.
- **Responsive** — dedicated two-pane master–detail layout on tablets
  (≥ 900 dp: Samsung Tab S11) and single-pane push nav on phones
  (Samsung S26 Ultra).
- **True Black + Lime Green (#C6FF00)** theme throughout.

## Tech stack

- **Expo SDK 54** (React Native 0.81, Hermes) with file-based routing via
  `expo-router`.
- React Native primitives only (no HTML, no CSS).
- `@react-native-community/netinfo` for offline detection.
- `@/src/utils/storage` for AsyncStorage-backed local persistence
  (bullion trips/batches, GET cache, offline mutation queue).
- Remote backend (FastAPI + MongoDB) at `https://logistics-hub-1349.emergent.host`.

## Local development (advanced — most users should just install the APK)

```bash
cd frontend
yarn install
yarn expo start
```

The `.env` file already points to the live remote backend. No local backend or
MongoDB is required.

## Directory layout

```
app/
├── frontend/                # Expo app
│   ├── app/                 # file-based routes (Expo Router)
│   │   ├── (tabs)/          # bottom-tab screens
│   │   │   ├── index.tsx    # Overview
│   │   │   ├── shipments.tsx
│   │   │   ├── ledger.tsx
│   │   │   ├── bullion.tsx  # Bullion Work
│   │   │   ├── parties.tsx
│   │   │   └── more.tsx
│   │   ├── shipment/        # shipment detail + create
│   │   ├── party/           # party detail + create
│   │   ├── entry/           # ledger entry create
│   │   ├── invoice/         # invoice detail + create
│   │   └── bullion/         # bullion batch + trip create/detail
│   ├── src/
│   │   ├── api/             # client, hooks, types
│   │   ├── bullion/         # local store + types
│   │   ├── components/      # shared UI
│   │   ├── hooks/
│   │   ├── theme/
│   │   └── utils/
│   ├── .env                 # EXPO_PUBLIC_BACKEND_URL
│   ├── app.json
│   └── package.json
├── backend/                 # unused FastAPI template (mobile app hits remote)
└── memory/PRD.md            # product requirements doc
```

## Backend URL

The app is hard-pinned to `https://logistics-hub-1349.emergent.host/api/*` via
a defensive fallback in `src/api/client.ts` — even if the platform resets the
`.env` value, the app will always talk to the correct backend.

## Change log

- **2026-08-07** — Bullion Work module (carrier trips + batch lifecycle with
  3-phase progression, dashboard active-slots widget).
- **2026-08-07** — Ledger redesign (Khatabook style): combined receivables/
  payables snippet, All parties list, FAB add-entry, per-party You gave / You got.
- **2026-08-05** — Shipment detail redesign (money card, bag-level goods list,
  Lalamove auto-book CTA); PATCH → PUT status fix.
- **2026-08-05** — Initial mobile MVP with 5 tabs, offline queue, responsive
  phone + tablet layouts.

## Support

Reach `support@emergent.sh` for platform-level questions (deploy, builds,
GitHub push, universal LLM key). For bugs in this specific project, open an
issue on this repo.
