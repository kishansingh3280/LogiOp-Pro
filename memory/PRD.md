# Native Logistics Hub — Mobile App PRD

## Overview
Native Android/iOS Expo app that mirrors the live web app deployed at
`https://logistics-hub-1349.emergent.host`. The mobile app is a full-featured
client for the shared remote backend — logistics operations (shipments, parties,
warehouses, Lalamove dispatch) and ledger operations (parties, invoices, ledger
entries) stay in sync between web and mobile.

- **Frontend**: Expo Router (`app/` directory routing) + React Native primitives only.
- **Backend**: Live remote API at `https://logistics-hub-1349.emergent.host/api/*`. No local backend used.
- **Auth**: None (open API per user requirement).
- **Design**: True Black (#000) canvas with lime-green (#C6FF00) accents.

## Modules

| Module | Route | Endpoints |
| --- | --- | --- |
| Dashboard / Overview | `/(tabs)` | `/api/dashboard/stats`, `/api/dashboard/warehouse`, `/api/dashboard/ledger-summary`, `/api/shipments` |
| Shipments (list + detail + create) | `/(tabs)/shipments`, `/shipment/[id]`, `/shipment/new` | `/api/shipments` (GET/POST/PATCH/DELETE) |
| Parties (list + detail + create) | `/(tabs)/parties`, `/party/[id]`, `/party/new` | `/api/parties`, `/api/ledger/entries` |
| Ledger (summary + receivable/payable + entries) | `/(tabs)/ledger` | `/api/dashboard/ledger-summary`, `/api/ledger/entries` |
| Invoices (list + detail + create) | `/invoices`, `/invoice/[id]`, `/invoice/new` | `/api/invoices` |
| Items catalog | `/items` | `/api/items` |
| Warehouses | `/warehouses` | `/api/warehouses` |
| Lalamove | `/lalamove` | `/api/lalamove/orders`, `/api/lalamove/config` |
| More menu + sync | `/(tabs)/more` | — |

## Responsive layout
- Phone (Samsung S26 Ultra ≈ 390–430 dp wide): stack navigation, list → detail push.
- Tablet (Samsung Tab S11 ≥ 900 dp wide): dedicated two-pane master–detail on Shipments and Parties. Detail column reuses same screen components (`<Component embedded />` pattern).

## Offline queue
- `src/api/client.ts` caches every GET response in AsyncStorage (`cache:<url>` keys) and mirrors last data when offline.
- Mutations (POST/PATCH/DELETE) are enqueued in AsyncStorage under `pendingMutations` when offline and replayed automatically on connectivity restore via NetInfo listener. UI badge on Dashboard and More tab shows the pending count.

## Design tokens (`src/theme/index.ts`)
- `bg` #000, `surface` #0a0a0a, `border` #1c1c1c, `text` #F5F5F5, `textMuted` #9CA3AF, `textDim` #6B7280, `lime` #C6FF00, `limeSoft` #A3E635, `limeGlow` rgba(198,255,0,0.12), status accents (ok/warn/info/danger).
- Spacing scale 4/8/12/16/24/32. Radii 8/12/16/20/pill.

## Non-goals for v1
- No authentication.
- No push notifications.
- Lalamove auto-booking flow (viewing only in v1).
- Report exports (PDF/CSV) — deferred.
