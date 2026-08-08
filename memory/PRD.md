# LogiOp Pro — Mobile App PRD (last updated 2026-02)

## Overview
Native Expo (React Native Web-compatible) full-stack app for logistics operations:
shipments, parties, ledger, invoices, warehouses, Lalamove dispatch, bullion/trips,
and a Wingman AI assistant. Backend is FastAPI + MongoDB running locally in the
same container (via supervisord), NOT the old live remote host.

- **Frontend**: Expo Router (`app/` directory), react-native-safe-area-context,
  react-native-reanimated, Ionicons. All screens follow the **Cyber-Siri** theme
  (deep-space `#020202` bg, electric blue `#00D1FF`, lime-green `#C6FF00` accents,
  glassmorphic cards with soft ambient orbs).
- **Backend**: `/app/backend/server.py` — FastAPI @ `0.0.0.0:8001`, all routes
  under `/api/*`. MongoDB via `MONGO_URL` in `/app/backend/.env`.
- **Auth**: JWT with Role-Based Access Control. Bcrypt hashed passwords, seed
  admin `kishan / Kishan@Boss2026`.

## Modules

| Module | Route | Backend endpoints |
| --- | --- | --- |
| Dashboard | `/(tabs)` | `/api/dashboard/stats`, `/api/dashboard/warehouse`, `/api/dashboard/ledger-summary`, `/api/shipments` |
| Shipments Console 2.0 (multi-party bag cards, glass metrics) | `/(tabs)/shipments`, `/shipment/[id]`, `/shipment/new` | `/api/shipments` (GET/POST/PATCH/DELETE), `/api/shipments/{id}/bags` |
| Parties | `/party/[id]`, `/party/new` (under More) | `/api/parties`, `/api/ledger/entries` |
| Invoices | `/(tabs)/invoices`, `/invoice/[id]`, `/invoice/new` | `/api/invoices` |
| **Trips (Bullion)** | `/(tabs)/bullion`, `/bullion/trip/[id]`, `/bullion/trip/new`, `/bullion/txn/*` | `/api/bullion/trips` (GET/POST/PUT/DELETE with `direction ↔ route` alias), `/api/bullion/txns`, `/api/bullion/vault` |
| Wingman AI Assistant (Floating Sidebar + WhatsApp brain-sync) | overlay on all tabs via `<FloatingJarvis />` in `_layout.tsx` | `/api/assistant/chat`, `/api/assistant/history`, `/api/assistant/tts/stream` (GET+POST), `/api/assistant/stt`, `/api/assistant/webhook` (WhatsApp) |
| Admin (RBAC) | `/admin/users` | `/api/auth/*`, `/api/admin/users` |
| Lalamove (mocked pending keys) | `/lalamove` | `/api/lalamove/orders`, `/api/lalamove/config` |
| More menu | `/(tabs)/more` | — |

Tab bar order: **Home · Shipments · Invoices · Trips · More** (Wingman is a
floating overlay, not a tab).

## Design system (`/app/frontend/src/theme/index.ts`)
- **Cyber-Siri** palette: `bg` #020202, `surface` #0a0a0a glassmorphic, `border`
  #1c1c1c, `cyan` #00D1FF (primary highlight), `lime` #C6FF00 (money/positive
  accent), `warn` #FFB020, `danger` #FF4D4F, `info` cyan.
- 8pt spacing scale (4/8/12/16/24/32), radii 8/12/16/20/pill.
- Ambient orbs: soft pulsing blue + cyan blurs behind auth + main tabs
  (`ambient-background.tsx`).
- Touch targets ≥ 44×44. Safe-area insets everywhere.

## Key architectural notes
- **Wingman brain sync**: Both the in-app Assistant and the WhatsApp channel
  write to the same `assistant_messages` MongoDB collection
  `{user_id, channel, role, content, created_at}`. In-app UI pulls unified
  history from `/api/assistant/history`.
- **TTS pipeline**: ElevenLabs primary (voice `TX3LPaxmHKxFdv7VOQHJ` = Liam
  premade, supports Hinglish via `eleven_multilingual_v2`). OpenAI Shimmer is
  the automatic fallback if ElevenLabs errors. Response is
  chunked-streaming audio/mpeg for instant playback.
- **Emergent LLM key** (`emergentintegrations`) powers Claude Sonnet 4.5
  (assistant chat), OpenAI Whisper-1 (STT), and OpenAI TTS (fallback).
- **JWT auth**: token stored in SecureStore/AsyncStorage, attached via
  `Authorization: Bearer …`. `useAuth()` React context in `src/auth/context.tsx`.
- **BlockerBell** global top-right — hidden on `/sign-in` and `/bullion/trip/*`
  to avoid covering header actions.
- **FloatingJarvis** global bottom-right overlay — bubble at `insets.bottom + 96`,
  zIndex 999. Right-docked glassmorphic sidebar slides in when tapped.

## Environment / URL protections
- Never edit `EXPO_PACKAGER_PROXY_URL`, `EXPO_PACKAGER_HOSTNAME`,
  `EXPO_PUBLIC_BACKEND_URL` in `/app/frontend/.env`.
- Never edit `MONGO_URL` in `/app/backend/.env`.
- All backend routes MUST be prefixed with `/api`.

## Auth credentials (see `/app/memory/test_credentials.md`)
`kishan / Kishan@Boss2026` (admin role).

## Non-goals / deferred
- Push notifications (requires deploy + Firebase key from user).
- FY-over-FY comparison chart on dashboard.
- Warehouse FIFO queue array in `/api/dashboard/warehouse` (currently aggregate only).
- Reskin Waves 4-5: `/party/[id]` and `/invoice/[id]` still on legacy theme.
- Deprecated RN Web shims: `shadow*`, `pointerEvents` prop → style migration
  (console warnings only, no functional impact).
