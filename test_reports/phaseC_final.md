# Phase C — Final pre-publish verification report

**Date:** 2026-01 (iter 72)
**Environment:** https://opsi-complete.preview.emergentagent.com
**Auth used:** kishan (Admin), bsingh (Papa)
**Viewports:** mobile 390×844

---

## PART A — 9-fix verification

| # | Fix | Result | Evidence |
|---|-----|--------|----------|
| 1 | Sidebar active highlight — mutually-exclusive matchers | ✅ | Sidebar screenshot shows exactly ONE nav item highlighted (Overview, green glow). Source `sidebar.tsx` lines 56-133 — 6 non-overlapping `match` predicates + `findIndex` returns single index. |
| 2 | Sidebar opaque overlay (0.97) + scrim (0.6) | ✅ | `sidebar.tsx:610` `backgroundColor: "rgba(5, 3, 15, 0.97)"`. `sidebar.tsx:549` scrim `rgba(0,0,0,0.6)`. Scrim tappable (`testID="sidebar-scrim"` verified present at runtime). Drawer body dark & fully opaque in screenshot. |
| 3 | Hamburger smart back button | ✅ | Runtime verified: `/notifications` (root) → `sidebar-hamburger` present, `sidebar-back-btn` absent. `/entry/new` (detail) → `sidebar-back-btn` present, `sidebar-hamburger` absent. Invoice detail also shows back button. `paddingLeft: 56` present in all 7 list/tab screens (`(tabs)/index`, `shipments`, `invoices`, `bullion`, `more`, `ledger`, `parties`). |
| 4 | Voice-orb frost-glass aura | ✅ | `voice-orb.tsx:659-688` — `borderRadius: SIZE/2`, `borderWidth: 1`, `borderColor: rgba(255,255,255,0.15)`, web gradient purple→green→cyan (0.35/0.25/0.30), `backdropFilter: blur(20px) saturate(180%)`, `boxShadow: 0 0 20px rgba(155,77,255,0.4), 0 0 40px rgba(0,255,136,0.2)`. Orb visible with layered glow in dashboard screenshot. |
| 5 | Realtime status bar frost glass | ✅ | `realtime-status-bar.tsx:175-190` — 50% opacity purple base + web `linear-gradient(90deg, rgba(155,77,255,0.5) 0%, rgba(0,255,136,0.5) 50%, rgba(0,245,255,0.5) 100%)` with `backdropFilter: blur(14px) saturate(160%)`. Source-verified. |
| 6 | "Sun raha hoon" nudge once per session | ✅ | `realtime-status-bar.tsx:48-63` — `listenNudgeShownRef` guards single show, 2200 ms timer, reset on `orb.isConnected === false`. Effect deps `[orb.state]` only re-fires when state re-enters listening but ref blocks repeat. Source-verified. |
| 7 | Invoice PDF generator | ✅ | `src/utils/invoice-pdf.ts` present, uses `expo-print` + `expo-sharing` + `expo-file-system`. Web path opens print dialog; native saves as `Invoice_<number>.pdf`. `invoice/[id].tsx:129,136` — `invoice-pdf-btn` header icon calls `generateInvoicePdf({ invoice: i, party })`. Runtime confirmed button present on invoice detail. |
| 8 | Papa company filter (PARTIAL) | ⚠️ | `context/company-context.tsx:65-78` forces non-Admin to `user.company` short-form (strips `co_` prefix). Runtime: Papa `GET /api/shipments?company=singh_exports` → 200 OK, request accepted. **Note discrepancies vs spec**: (a) client sends `?company=singh_exports` (short form) not `?company=co_singh_exports` as spec text says; (b) server-side row filtering requires remote-host migration (adding `company` field to legacy rows) — NOT DONE. Reported as ⚠️ PARTIAL per instructions. |
| 9 | Catalog broadcast (MOCKED) | ✅ MOCKED | `POST /api/wingman/catalog-item` (spec called it `catalog-upsert`; actual endpoint is `catalog-item`) — auto-invokes `_queue_catalog_broadcast()` when `photo_url` set (server.py:825-836). Function inserts one row per customer party in `whatsapp_broadcast_log` collection. `GET /api/catalog/broadcast/log` returns rows (200 verified). `wingman-key` protection: `_require_wingman_key()` at server.py:613-621 checks `x-wingman-key` header when `WINGMAN_API_KEY` env set; unauthenticated for dev/preview. Actual WhatsApp send is MOCKED (no live send). |

---

## PART B — Mobile screenshot audit (390×844)

Screenshots stored in `/app/test_reports/tmp/phaseC/`:

| # | Screen | Base #07070f | Hamburger overlap | Sidebar bleed | Correct highlight |
|---|--------|:-:|:-:|:-:|:-:|
| 1 | Dashboard (`01_dashboard.png`) | ✅ | ✅ (hb visible top-left) | n/a | n/a |
| 2 | Sidebar open (`02_sidebar_open.png`) | ✅ | n/a | ✅ no bleed inside drawer | ✅ Overview only |
| 3 | Shipments (`03_shipments.png`) | ✅ | ✅ pushed right of hb | n/a | n/a |
| 4 | Invoices (`04_invoices.png`) | ✅ | ✅ | n/a | n/a |
| 5 | Ledger (`05_ledger.png`) | ✅ | ✅ | n/a | n/a |
| 6 | More (`06_more.png`) | ✅ | ✅ | n/a | n/a |
| 7 | Trips (`07_trips.png`) | ✅ | ✅ | n/a | n/a |
| 8 | Notifications (`08_notifications.png`) | ✅ | ✅ (hb, root route) | n/a | n/a |
| 9 | Party detail | — | not captured (invoice detail captured instead) | — | — |
| 10 | Entry/new (`10_entry_new.png`) | ✅ | ✅ (back-btn visible) | n/a | n/a |
| 11 | Voice-orb states | ✅ idle+long-press panel visible on dashboard; orb glow layered purple/green/cyan ✅ |
| 12 | Invoice detail (`12_invoice_detail.png`) | ✅ | ✅ back-btn + PDF btn both present |

Design notes:
- Dark base uniformly applied.
- Hamburger/back button never overlaps title text (56 px reserved in header padding).
- Sidebar drawer body fully opaque (no dashboard bleed-through). Scrim covers remaining screen area.
- Voice-orb aura renders on web with `backdrop-filter` + gradient — visually distinct frost look.

Warnings surfaced by RN Web at runtime (non-blocking):
- `shadow*` / `textShadow*` / `pointerEvents` deprecation warnings from RN 0.79+ (not from these fixes).

---

## PART C — Stress test (200 rows)

pytest: `/app/backend/tests/test_phaseC_final.py` (10 tests, all ✅). JUnit XML `/app/test_reports/pytest/phaseC_final.xml`.

| Resource | POST attempts | Success | Failure |
|----------|:-:|:-:|:-:|
| Parties | 50 | 50 ✅ | 0 |
| Shipments | 50 | 50 ✅ | 0 |
| Invoices | 50 | 50 ✅ | 0 |
| Ledger entries | 50 | 50 ✅ | 0 |
| **Total** | **200** | **200** | **0** |

Cross-reference & filter checks:
- FY filter `GET /api/shipments?fy=2025-26` → 200 OK ✅
- Company scope `GET /api/shipments?company=singh_exports` (as Papa) → 200 OK ✅ (client-side scoping)
- Shipment / invoice / ledger chain — all three resources accept `party_id` FK; verified by successful POSTs referencing seeded party. Full end-to-end chain not exercised (payload smoke-tests only).

Cleanup:
- pytest run cleaned parties + ledger (module-scoped list).
- Shipments + invoices were later manually cleaned via a follow-up DELETE sweep (all 100 rows removed cleanly, 200 status). Post-clean counts: `shipments=5`, `invoices=2`, `parties=17` — matches pre-test baseline. ✅

RCA note: pytest-xdist splits test-collection across workers — module-level `CREATED` dict lost some state between the shipment/invoice tests and the cleanup test when they landed on the same worker (they did) but the module state persisted. The follow-up sweep confirmed no lingering TEST_ rows.

---

## Summary

- **9 fixes**: 8 ✅, 1 ⚠️ (Fix 8 — Papa server-side scoping still pending remote-host migration).
- **Screenshot audit**: dark base clean, hamburger↔title padding respected, sidebar opaque, no bleed, one active nav highlight only.
- **200-row stress**: 200/200 POSTs ✅; FY + company filters accept requests; cleanup restored counts.
- **Backend suite** `/app/test_reports/pytest/phaseC_final.xml`: 10/10 passing.

### Action items for main agent
1. (Fix 8) Coordinate remote-host migration to add `company` field to legacy shipments/invoices/ledger rows so server-side row-level scoping works for Papa.
2. (Fix 8 spec drift) Spec says request should include `?company=co_singh_exports` but code strips the `co_` prefix and sends `?company=singh_exports` — align spec or code.
3. (Fix 9 spec drift) Spec mentions `POST /api/wingman/catalog-upsert`; actual endpoint is `POST /api/wingman/catalog-item`. Confirm which name is canonical and update the other.
4. Live WhatsApp broadcast still MOCKED — wire `WHATSAPP_ACCESS_TOKEN` + phone number id + worker before shipping to real customers.
5. (Cosmetic) RN Web deprecation warnings for `shadow*` / `textShadow*` / `pointerEvents` — track for a future style-migration pass.
