# Wingman API Playbook

Everything the Wingman assistant needs to read from — and write into — the
logistics hub. All routes live under the same origin the mobile app uses:

```
Base URL   : {DEPLOYED_APP_URL}
API prefix : /api
```

For preview / dev: `https://logistics-ai-hub-18.preview.emergentagent.com`.

Optional auth: set the `WINGMAN_API_KEY` env var on the backend to require
`X-Wingman-Key: <value>` (or `Authorization: Bearer <value>`) on every
`/api/wingman/*` call. In dev the key is empty so requests pass through
unauthenticated for easier testing.

> ✅ TL;DR — Wingman only ever calls `/api/wingman/*` and the four
> read-only endpoints listed at the bottom. It never PUTs shipments,
> bags, or items directly; the gateway handles field-safe merges,
> stamped notes, and audit logging.

---

## 1. Carrier Webhook → Shipment update

Endpoint: `POST /api/wingman/carrier-update`

Use when a carrier messages an update about a specific consignment.
Lookup is by human-friendly `consignment_no` (e.g. `CN-1005`, `SE/098/01`).
Only the fields you set will be applied; everything else on the record is
preserved. `notes` is **appended** with a `[Wingman YYYY-MM-DD HH:MM]`
stamp so operator context is never overwritten.

```json
POST /api/wingman/carrier-update
{
  "consignment_no": "CN-1005",
  "status": "in_transit",             // pending | in_transit | warehouse_arrived | delivered | cancelled
  "flight_number": "AI355",
  "dispatch_date": "2026-06-15",      // ISO date
  "delivered_at": null,               // set when carrier confirms delivery
  "tracking_url": "https://...",
  "notes": "Picked up from warehouse, ETA Bangkok 15:00"
}
```

**Common natural-language mappings**

| Carrier says | Fields to set |
|---|---|
| "Picked up from warehouse, on the way" | `status: "in_transit"`, `notes: "..."` |
| "Landed at BKK / arrived warehouse" | `status: "warehouse_arrived"`, `notes: "..."` |
| "Delivered to consignee at 4pm" | `status: "delivered"`, `delivered_at: "<ISO>"`, `notes: "..."` |
| "Flight AI355 rescheduled to 22:30" | `flight_number: "AI355"`, `notes: "..."` |
| "Cancelling this shipment" | `status: "cancelled"`, `notes: "..."` |

Response: `{ok: true, shipment: {...}, applied: {...}}`.

---

## 2. Bag update

Endpoint: `POST /api/wingman/bag-status`

Use when a carrier reports on an individual bag (weight adjustment on the
scale, torn packaging, etc.). Both `consignment_no` and `bag_no` (`BAG-001`)
are required.

```json
POST /api/wingman/bag-status
{
  "consignment_no": "CN-1005",
  "bag_no": "BAG-002",
  "weight_kg": 12.5,                  // only if the scale reading changed
  "notes": "Package was retaped at BKK"
}
```

---

## 3. Ledger entry (memo)

Endpoint: `POST /api/wingman/ledger-entry`

Use for adjustments that don't map to a shipment/invoice — forex loss,
tip to porter, misc reimbursement. Party lookup is by exact name match
(case-insensitive).

```json
POST /api/wingman/ledger-entry
{
  "party_name": "Lalit",
  "date": "2026-06-15",               // optional; defaults to today
  "description": "Adjustment: forex loss on Aug 2",
  "debit": 0,
  "credit": 500,                       // debit == income you'll get, credit == what you'll pay
  "currency": "THB",                  // INR | THB
  "ref_type": "wingman"
}
```

> ℹ️ Invoices auto-post their own debit entry — Wingman does **not** need
> to add a ledger row after generating an invoice.

---

## 4. Catalog write (Vision-driven)

Endpoint: `POST /api/wingman/catalog-item`

Powers the "AI Prep" flow — after a vision model classifies a product
photo, Wingman posts here to create or extend the catalog entry.

* Provide `item_id` to update an existing product, `name` to lookup by
  name (case-insensitive), or omit both to always create.
* `photo_url` is a data-uri (`data:image/jpeg;base64,...`) or an HTTPS URL.
* `tags` is a free-text list. The mobile Catalog view groups by these.
* `supplier_party_name` resolves to a Party in role `supplier`.

```json
POST /api/wingman/catalog-item
{
  "name": "Bedsheets",                 // used for lookup if item_id missing
  "photo_url": "data:image/jpeg;base64,...",
  "description": "Premium 400-thread cotton bedsheet set (king size)",
  "tags": ["Bedsheets", "Cotton", "Home"],
  "supplier_party_name": "Cotton Mills Ltd",
  "selling_price": 300,
  "buying_price": 120,
  "unit": "pcs"
}
```

Response: `{ok, item, created: bool}`.

---

## 5. Bullion module

The Bullion module (currency + gold carry trades, hand-carry rates) is
persisted in the local MongoDB. All CRUD endpoints:

```
GET    /api/bullion/rates             # {currency_rate_per_1000, gold_rate_per_baht, hand_carry_rate_inr_per_kg}
PUT    /api/bullion/rates             # partial update

GET    /api/bullion/trips             # newest first
POST   /api/bullion/trips
PUT    /api/bullion/trips/{id}
DELETE /api/bullion/trips/{id}

GET    /api/bullion/transactions
POST   /api/bullion/transactions
PUT    /api/bullion/transactions/{id}
DELETE /api/bullion/transactions/{id}
```

Sample trip payload:

```json
{
  "date": "2026-06-15",
  "route": "BKK→DEL",
  "weight_kg": 25,
  "capacity_kg": 30,
  "carrier_name": "Rahul HandCarrier",
  "airline": "Thai Airways",
  "flight_number": "TG315",
  "status": "planned"
}
```

Rates control the *shipment* auto-carrier-pay too — updating
`hand_carry_rate_inr_per_kg` here flows into every new Hand-Carry
shipment's auto-calc immediately.

---

## 6. Read-only endpoints for context building

Wingman uses these to build prompts before calling the write endpoints.

```
GET /api/parties                    # roles: customer, end_customer, supplier, carrier, vendor
GET /api/shipments                  # includes status, freight, carrier_charge, dispatch_date
GET /api/shipments/{id}/bags        # per-bag weight, items, bill_to_party_id, end_customer_id
GET /api/items                      # catalog with photo_url, description, tags, supplier_party_id
GET /api/invoices                   # linked to shipments via shipment_id
GET /api/ledger/entries             # every ledger row (INR & THB mixed)
GET /api/dashboard/ledger-summary   # net INR/THB per party
```

---

## 7. Audit & health

* `GET  /api/wingman/health` — capability list + auth flag. No key needed.
* `GET  /api/wingman/activity?limit=50` — chronological log of every write
  Wingman has performed (request payload + summary of the effect). Use
  this from the operator UI to show "here's what Wingman did today".

---

## 8. Vision handshake

The Catalog module accepts **any** image the AI can encode into a
data-uri. Recommended flow:

1. User sends a product photo through Wingman (WhatsApp / chat).
2. Wingman calls a vision model (Claude Sonnet 5 / Gemini 3 Flash / GPT
   5.6 Terra) with the image to extract: `{name, description, tags[]}`.
3. Wingman POSTs to `/api/wingman/catalog-item` with the base64 image
   plus the extracted metadata. The mobile grid picks up the new/updated
   item on next pull-to-refresh.

> ⚠️ Keep the vision resize small (≤512px longest side, ~50 KB JPEG) —
> photos are stored inline on the item record. For hi-res library shots
> use a CDN URL in `photo_url` instead.

---

## 9. Field cheat-sheet

Every canonical field Wingman may need to reason about:

| Model | Field | Type / values |
|---|---|---|
| Shipment | `status` | `pending` → `in_transit` → `warehouse_arrived` → `delivered` (or `cancelled`) |
| Shipment | `dispatch_date` | ISO date (`YYYY-MM-DD`) |
| Shipment | `delivered_at` | ISO datetime |
| Shipment | `flight_number` | freeform |
| Shipment | `freight` / `freight_currency` / `forex_rate` | number / `INR`\|`THB` / number (INR-per-THB) |
| Shipment | `carrier_charge` / `carrier_charge_type` / `carrier_currency` | number / `flat`\|`per_kg` / currency |
| Bag | `bag_no`, `weight_kg`, `bill_to_party_id`, `end_customer_id`, `items[]` |
| Ledger | `debit` = income to us, `credit` = we owe party |
| Ledger | `currency` = `INR` or `THB`, kept separately per party |
| Party | `role` = `customer` / `end_customer` / `supplier` / `carrier` / `vendor` / `other` |
| Party | `default_charge` (per-kg freight rate) + `default_charge_currency` |
| Item | `photo_url` (data-uri), `tags[]`, `supplier_party_id` |
| Bullion rates | `hand_carry_rate_inr_per_kg` drives shipment carrier-pay auto-calc |

---

Last updated: catalog vision hooks + carrier webhook batch shipped in this
release. If Wingman needs a capability not listed here, it should error
out gracefully — do not attempt raw PUTs against the CRUD endpoints;
they bypass the audit + safe-merge behaviour.
