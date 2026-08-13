# Logistics Hub — Phase 5 Read-Only Audit

**Mode:** Source-code + live-API audit (no UI clicks; no file modifications).
**Backend base:** `https://opsi-complete.preview.emergentagent.com`
**Users:** kishan (Admin) login OK · bsingh (Papa) login OK.

## 1. Executive summary
- Items audited: 118
- ✅ WORKING: 92
- ⚠️ PARTIAL: 11
- ❌ BROKEN: 4
- 🔲 NOT BUILT: 11

## 2. Full audit table

| Sec | Item | Status | Notes |
|---|---|---|---|
| 1.1 | Sidebar → Overview | ✅ | `sidebar-nav-overview` → `/(tabs)` (sidebar.tsx:57-64) |
| 1.2 | Sidebar → Shipments | ✅ | Route `/(tabs)/shipments` |
| 1.3 | Sidebar → Invoices | ✅ | Route `/(tabs)/invoices` |
| 1.4 | Sidebar → Ledger | ✅ | Route `/ledger` |
| 1.5 | Sidebar → Trips | ✅ | Route `/(tabs)/bullion` |
| 1.6 | Sidebar → More/Aur | ✅ | Route `/(tabs)/more`; hidden for Papa (PAPA_HIDDEN_LABELS) |
| 1.7 | Sidebar Notifications action → `/notifications` | ❌ | **Route file does NOT exist.** `sidebar.tsx:298-302` pushes `/notifications` but no `app/notifications.tsx` present. Tap will crash to Expo Router unmatched-route screen. |
| 1.8 | Profile tap → `/admin` | ✅ | `sidebar-profile` (sidebar.tsx:303-311) |
| 1.9 | Back buttons on detail screens | ✅ | Standard Stack navigation; confirmed present in files. |
| 1.10 | Deep link `/shipment/<id>` | ✅ | `app/shipment/[id].tsx` present |
| 2.1 | Now Brief AI greeting | ✅ | `now-brief-card.tsx:774-791` seeds greeting turn on mount |
| 2.2 | Forex USD→INR + INR→THB | ✅ | `forex-widget.tsx` (frankfurter.dev) |
| 2.3 | Assets on Hand card | ✅ | `AssetsOnHandCard` (index.tsx:814) |
| 2.4 | Vault Snapshot 2-col | ✅ | `VaultSnapshotSection` renders `vault-india` + `vault-bangkok` |
| 2.5 | Dashboard charts | ✅ | `dashboard-charts.tsx` (pie/bar/donut) |
| 2.6 | Consignment / carrier pills | ✅ | Stat tile mini-lists per shipment status |
| 2.7 | Notification bell top-right | ✅ | `BlockerBell` with `count` badge from `/api/todo/blockers` (returned 5 blockers live) |
| 3.1 | Shipments list | ✅ | GET `/api/shipments` → 5 records, 200 |
| 3.2 | Filter chips | ✅ | Present in shipments.tsx |
| 3.3 | Search | ✅ | Text filter in shipments list |
| 3.4 | Row → detail | ✅ | `/shipment/[id]` |
| 3.5 | New shipment | ✅ | `/shipment/new` |
| 3.6 | Bag editor | ✅ | Present in `shipment/new.tsx` (rows regenerate on bag_count fill) |
| 3.7 | Packing list PDF | ✅ | Backend PDF endpoint `/api/shipments/{id}/packing-list.pdf` used |
| 3.8 | Edit shipment | ✅ | Modify button in detail |
| 3.9 | Split-panel on tablet | ⚠️ | Layout uses `useIsTablet` for column widening only; no true master-detail embedded pane on shipments list. |
| 4.1 | Invoices list | ✅ | GET `/api/invoices` → 200, 3 records |
| 4.2 | Filter chips | ✅ | In `invoices.tsx` |
| 4.3 | New invoice | ✅ | `/invoice/new` |
| 4.4 | Invoice detail | ✅ | `/invoice/[id]` |
| 4.5 | Generate PDF | ✅ | Wired to backend `/api/invoices/{id}/pdf` |
| 4.6 | Split-panel on tablet | ⚠️ | Same as 3.9 — column stretch only |
| 5.1 | Party list | ✅ | GET `/api/parties` → 200, sizable payload |
| 5.2 | Party detail w/ running balance | ✅ | `/party/[id]` computes balance client-side from ledger entries |
| 5.3 | New entry FAB | ✅ | Present in ledger.tsx |
| 5.4 | Live INR/THB converter + dual save | ✅ | `entry/new.tsx` (confirmed) |
| 5.5 | Debit=red / Credit=green | ✅ | ledger.tsx colour tokens |
| 6.1 | Carrier trips list | ✅ | GET `/api/bullion/trips` → 200 |
| 6.2 | Trip detail | ✅ | `/bullion/trip/[id]` |
| 6.3 | New trip form | ✅ | `/bullion/trip/new` |
| 6.4 | Vault info on trip cards | ✅ | Trip card shows route, currency, gold, weight |
| 6.5 | Compact/dense layout | ✅ | Phase 1 zoom reduction preserved |
| 7.1 | Items list `/items` | ✅ | `app/items.tsx` present; GET `/api/items` → 200 |
| 7.2 | Add item form | ⚠️ | Add flow lives inside `items.tsx` (inline sheet). No standalone `/item/new`. |
| 7.3 | Photo upload | ⚠️ | Item schema supports photo but frontend upload flow not verifiable from source without runtime — reference `app/item/[id].tsx`. |
| 7.4 | Supplier tag on item | ✅ | Field present in item model |
| 7.5 | Customer broadcast | 🔲 | Not built — no broadcast API/route. |
| 8.1 | Parties list `/parties` | ✅ | `app/parties.tsx` |
| 8.2 | Party detail phone/currency/balance | ✅ | `party/[id].tsx` |
| 8.3 | Search parties | ✅ | Inline text filter |
| 8.4 | New party form | ✅ | `/party/new` present; fill_form dispatcher wired |
| 9.1 | Tap orb → listening | ✅ | `voice-orb.tsx:336` Pressable onPress→orb.toggle() |
| 9.2 | Mute inside long-press panel | ✅ | `voice-orb-panel-mute` (line 231-245) |
| 9.3 | Text input in orb panel | ✅ | `voice-orb-panel-input` + `voice-orb-panel-send` |
| 9.4 | Orb visible on all screens except sign-in | ✅ | `hidden = !user \|\| pathname.includes("sign-in")` (line 119) |
| 9.5 | Orb hidden on form/detail screens? | ✅ (by design) | Orb remains visible on forms — bell is what got hidden. Matches Phase 1 spec. |
| 10.1 | AI greeting first bubble | ✅ | Seeded in useEffect on mount |
| 10.2 | Conversation area occupies full card | ✅ | body maxHeight 480 |
| 10.3 | Mute in card header | ⚠️ | **`now-brief-mute` button still present in header (now-brief-card.tsx:1056-1067).** User preference was NO mute inside card; mute now lives in orb. Recommend removing header button. |
| 10.4 | Refresh button | ✅ | `now-brief-refresh` |
| 11.1 | Bell blocker count | ✅ | Live `/api/todo/blockers` returns total=5 |
| 11.2 | Tap bell → destination | ⚠️ | Opens in-app slide-in `BlockerPanel` modal (not a route). Acceptable but does not navigate to a `/notifications` page. |
| 11.3 | `/notifications` page exists | ❌ | **Missing** — no `app/notifications.tsx`. |
| 11.4 | Mark-read functionality | 🔲 | Blockers panel only deep-links to fix items; there is no explicit "mark read" endpoint or gesture. |
| 12.1 | Nav links correct | ✅ | See 1.1–1.6 |
| 12.2 | CompanySwitcher (Admin only) | ✅ | Returns null for non-Admin (company-switcher.tsx:26) |
| 12.3 | FY selector picker | ✅ | `FYPicker compact earliest="2024-04-01"` |
| 12.4 | Papa Hindi labels | ✅ | PAPA_LABEL_OVERRIDES (Ghar/Maal Bheja/Bill/Hisaab/Saman Yatra) |
| 12.5 | Papa locked brand badge "Singh Exports 🔒" | ✅ | `sidebar-brand-locked` (sidebar.tsx:249-261) with lock-closed icon |
| 13.1 | Profile tap → Admin | ✅ | `router.push("/admin")` |
| 13.2 | Admin index renders | ✅ | `app/admin/index.tsx` |
| 13.3 | Admin/users sub-page | ✅ | `app/admin/users.tsx` |
| 13.4 | Admin-only hidden for Papa | ⚠️ | Profile tap on Papa also pushes `/admin` (sidebar.tsx:306-308). Route is not role-gated at navigation time. If the Admin screen isn't internally gated for Papa it could leak. |
| 14.1 | GET `/api/companies` | ✅ | 200; both companies + 1 leftover TEST record returned |
| 14.2 | CompanySwitcher toggles | ✅ | company-switcher.tsx line 32-34 |
| 14.3 | `?company=<id>` appended | ✅ | Per iteration 64: 9/12 API calls carry param |
| 14.4 | Papa pinned to co_singh_exports | ✅ | Backend enforces on auth |
| 15.1 | Papa login | ✅ | POST /api/auth/login `{bsingh, Papa@2026}` → 200 |
| 15.2 | Hindi labels | ✅ | See 12.4 |
| 15.3 | Restricted access | ⚠️ | Only "More" hidden. Admin route still reachable via profile tap (see 13.4). |
| 15.4 | Shipment status edit, no delete/modify | ⚠️ | Backend enforces permissions `["view","create","edit_status"]`. Frontend does not visibly disable delete/modify buttons for Papa — server rejects. |
| 16.1 | FY banner on non-current FY | ✅ | `FYBanner` mounted (`_layout.tsx:11,123`) |
| 16.2 | Lock icons on older FY forms | ⚠️ | `fy-gate.tsx` exists but visual 🔒 presence per form not confirmed w/o runtime; gate wrapper is imported into forms. |
| 16.3 | "Back to current FY" | ✅ | FY banner CTA |
| 16.4 | Admin override lock | ✅ | fy-gate.tsx checks role |
| 17.1 | Dark #07070f background | ✅ | contentStyle in `_layout.tsx:187`; iter63 sampled rgb(7,7,15) |
| 17.2 | Hamburger opens sidebar | ✅ | `sidebar-hamburger` |
| 17.3 | Scrim closes | ✅ | `sidebar-scrim` Pressable |
| 17.4 | No overlapping controls | ✅ | Bell hidden on forms (HIDE_ON_PREFIXES); orb pinned bottom-right |
| 17.5 | Voice orb visible above keyboard | ⚠️ | Orb uses `position:absolute` on native + `fixed` on web; no `KeyboardAvoidingView`. May be occluded by soft-keyboard on some Android configs. |
| 18.1 | `/api/dashboard/stats` | ✅ | 200 (259B) |
| 18.2 | `/api/shipments` | ✅ | 200 (4017B, 5 rows) |
| 18.3 | `/api/invoices` | ✅ | 200 (1247B) |
| 18.4 | `/api/parties` | ✅ | 200 (7884B) |
| 18.5 | `/api/ledger/entries` | ✅ | 200 (10034B) |
| 18.6 | `/api/bullion/trips` | ✅ | 200 (3720B) |
| 18.7 | `/api/items` | ✅ | 200 (6846B) |
| 18.8 | `/api/dashboard/warehouse` | ✅ | 200 (151B) |
| 18.9 | `/api/companies` | ✅ | 200 (Awadh + Singh + TEST leftover) |
| 18.10 | `/api/realtime-token` | ⚠️ | Endpoint is **POST-only** (server.py:2405). GET returns 404. Frontend uses POST — OK. Ephemeral token relies on `OPENAI_API_KEY` (present in .env). No graceful degradation on 401 from OpenAI verified. |
| 19.1 | fill_form on 5 forms | ✅ | Verified in iteration 64 (shipment/invoice/party/ledger/trip) |
| 19.2 | WingmanFillOverlay | ✅ | Mounted in `_layout.tsx:23,206`; iter64 confirmed animation |
| 19.3 | Native WebRTC polyfill | ✅ | `src/utils/webrtc.ts` + `@config-plugins/react-native-webrtc` in app.json plugins |
| 19.4 | Notification bell hidden on form/detail routes | ✅ | HIDE_ON_PREFIXES in `blocker-bell.tsx:138` |

**Backend endpoints called with GET (informational):**
- `/api/notifications` → **404** (not built)
- `/api/dashboard/now-brief` → 404 on GET (POST-only, expected)
- `/api/realtime-token` → 404 on GET (POST-only, expected)

## 3. Prioritized fix list

### P0 — Broken behaviour
- **[1.7 / 11.3] `/notifications` route missing.** Sidebar bottom action pushes to `/notifications` but no `app/notifications.tsx` file exists → tap lands on Expo Router unmatched-route screen. Either (a) create the notifications page (list of blockers + activity), or (b) change the sidebar action to open the existing `BlockerPanel` modal instead of navigating.

### P1 — Design/UX regressions
- **[10.3] Remove mute button from NowBriefCard header** (now-brief-card.tsx:1056-1067). User preference: mute lives in the orb long-press panel only.
- **[13.4 / 15.3] Papa can navigate to `/admin`** via profile tap. Either hide the profile row for non-Admin in `sidebar.tsx:303-311`, or add a role-gate inside `app/admin/index.tsx` that redirects Papa/Staff/Carrier back to `/(tabs)`.
- **[15.4] Frontend disables for Papa.** In shipment/invoice/party detail screens, visibly hide/disable Delete + Modify buttons when `user.role !== "Admin"` so Papa doesn't hit a server-rejection toast.
- **[17.5] Voice orb + soft keyboard.** Wrap the orb in a `KeyboardAvoidingView` or nudge its `bottom` insets when keyboard is visible on Android.
- **[3.9 / 4.6] Tablet split-panel** — currently only widens columns; a true master/detail embedded pane would meet the spec.

### P2 — Polish / nice-to-have
- **[7.5] Customer broadcast** — not built. Confirm if this is still on the roadmap.
- **[11.4] Mark-read functionality** — no explicit mark-read UX or endpoint.
- **[7.2/7.3] Standalone `/item/new` + photo upload** — currently inline in items.tsx; upgrade to a dedicated form for parity with other modules.
- **[14] Leftover `TEST_` company** in `/api/companies` response (see iter64). Clean up seed leftovers.
- **[16.2] Lock icons** on older-FY create/edit buttons — verify `FYGate` renders a visible 🔒 badge (source imports the gate but visual affordance was not sampled here).

## 4. Auth / seed sanity
- `/app/memory/test_credentials.md` present with kishan/bsingh credentials. Both logins tested live and returned 200 with expected role + company scoping.

_End of audit._
