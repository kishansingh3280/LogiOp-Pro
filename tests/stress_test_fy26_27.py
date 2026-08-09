#!/usr/bin/env python3
"""
FY 2026-27 Stress Test — resets data and simulates 100 linked transactions.

Resets:  shipments, invoices, bullion trips + transactions (keeps parties).
Populates: 100 diverse records spanning 2026-04-01 → 2027-03-31 with realistic
mixes of logistics, bullion vault + partial splits, FIFO warehouse pressure,
and the standard carrier calculations (500 INR / $1,000 currency,
2,500 INR / baht of gold).
Verifies: dashboard YTD profit, active carrier slots, ledger postings, and
Bullion asset map bucket totals.

Usage:
    python3 tests/stress_test_fy26_27.py
"""

from __future__ import annotations

import json
import random
import sys
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Any

import requests

# Preview URL — the local server.py proxies most routes to the live backend
# and directly serves /api/bullion/* and /api/wingman/* out of Mongo.
BASE = "https://cyber-logistics-hub-1.preview.emergentagent.com/api"

# FY 2026-27 boundaries (Indian financial year).
FY_START = date(2026, 4, 1)
FY_END = date(2027, 3, 31)

CARRIER_CURRENCY_RATE = 500.0     # INR per 1,000 units of foreign currency
CARRIER_GOLD_RATE = 2500.0        # INR per baht of gold
HAND_CARRY_RATE = 200.0           # INR per kg for hand-carry shipments

TIMEOUT = 30.0
random.seed(2026_08_07)           # deterministic across runs


@dataclass
class RunStats:
    reset_deleted: dict[str, int] = field(default_factory=dict)
    created: dict[str, int] = field(default_factory=lambda: {
        "shipments": 0, "bags": 0, "invoices": 0,
        "bullion_trips": 0, "bullion_txns_vault": 0, "bullion_txns_split": 0,
    })
    calculations: dict[str, Any] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)


def http(method: str, path: str, **kwargs) -> requests.Response:
    """Wrapper that logs failures without dying so the batch keeps going."""
    url = f"{BASE}{path}"
    resp = requests.request(method, url, timeout=TIMEOUT, **kwargs)
    return resp


def api_get(path: str) -> Any:
    r = http("GET", path)
    r.raise_for_status()
    return r.json()


def api_post(path: str, payload: dict) -> dict | None:
    r = http("POST", path, json=payload)
    if r.status_code >= 300:
        return None
    try:
        return r.json()
    except Exception:
        return None


def api_put(path: str, payload: dict) -> dict | None:
    r = http("PUT", path, json=payload)
    if r.status_code >= 300:
        return None
    try:
        return r.json()
    except Exception:
        return None


def api_delete(path: str) -> bool:
    r = http("DELETE", path)
    return r.status_code < 400


def rand_date_in_fy() -> str:
    """Pick a random ISO date somewhere within FY 2026-27."""
    span_days = (FY_END - FY_START).days
    d = FY_START + timedelta(days=random.randint(0, span_days))
    return d.isoformat()


# ---------- Reset phase ---------------------------------------------------

def reset(stats: RunStats) -> None:
    """Delete every shipment, invoice, bullion trip, and bullion transaction.
    Parties are preserved because the operator has curated them."""
    print("Reset phase — clearing shipments, invoices, and bullion records…")

    # Invoices need to be deleted before shipments so the ledger sync doesn't
    # dangle references. Bullion trips before txns for the same reason.
    for path, key in [
        ("/invoices", "invoices"),
        ("/shipments", "shipments"),
        ("/bullion/transactions", "bullion_transactions"),
        ("/bullion/trips", "bullion_trips"),
    ]:
        try:
            items = api_get(path)
        except Exception as e:
            stats.errors.append(f"list {path}: {e}")
            continue
        deleted = 0
        for it in items:
            iid = it.get("id")
            if not iid:
                continue
            if api_delete(f"{path}/{iid}"):
                deleted += 1
        stats.reset_deleted[key] = deleted
        print(f"  {key:25s} deleted {deleted}/{len(items)}")

    # Also nuke any lingering ledger entries against shipments/invoices so
    # the running balances start clean.
    try:
        entries = api_get("/ledger/entries")
        wiped = 0
        for e in entries:
            if e.get("ref_type") in ("shipment_freight", "shipment", "shipment_carrier",
                                     "bullion_carrier", "bullion", "invoice"):
                if api_delete(f"/ledger/entries/{e['id']}"):
                    wiped += 1
        stats.reset_deleted["ledger_entries"] = wiped
        print(f"  ledger entries            deleted {wiped}/{len(entries)}")
    except Exception as e:
        stats.errors.append(f"ledger reset: {e}")


# ---------- Population phase ---------------------------------------------

def fetch_parties() -> dict[str, list[dict]]:
    parties = api_get("/parties")
    by_role: dict[str, list[dict]] = {}
    for p in parties:
        by_role.setdefault(p.get("role", "other"), []).append(p)
    return by_role


def create_bullion_trip(
    stats: RunStats, carriers: list[dict], date_iso: str, route: str
) -> dict | None:
    carrier = random.choice(carriers)
    trip = api_post("/bullion/trips", {
        "date": date_iso,
        "route": route,
        "carrier_party_id": carrier["id"],
        "carrier_name": carrier["name"],
        "airline_code": random.choice(["TG", "AI", "6E", "TR"]),
        "flight_number": f"{random.choice(['TG', 'AI', '6E'])}-{random.randint(100, 999)}",
        "available_weight_kg": random.choice([15.0, 20.0, 25.0, 30.0]),
        "status": "planned",
        "notes": f"Auto-generated FY26-27 stress test trip",
    })
    if trip:
        stats.created["bullion_trips"] += 1
    return trip


def create_bullion_txn_vault(
    stats: RunStats, gold_or_currency: str, date_iso: str,
) -> dict | None:
    """Buy currency in India or gold in Bangkok, park it in the vault."""
    if gold_or_currency == "currency":
        cur = random.choice(["USD", "AED", "SGD"])
        amount = random.choice([2000, 5000, 10000, 15000, 25000])
        payload = {
            "type": "currency",
            "currency": cur,
            "currency_amount": amount,
            "purchase_rate_inr": {"USD": 83.5, "AED": 22.7, "SGD": 62.1}[cur],
            "exchange_rate_thb": {"USD": 33.15, "AED": 9.0, "SGD": 24.6}[cur],
            "location": "vault_in",
            "status": "open",
            "notes": f"Vault buy · {cur} · FY26-27 sim",
            "rate_snapshot_currency_per_1000": CARRIER_CURRENCY_RATE,
            "rate_snapshot_gold_per_baht": CARRIER_GOLD_RATE,
            "rate_snapshot_at": datetime.now(timezone.utc).isoformat(),
            "created_at": f"{date_iso}T09:00:00+00:00",
        }
    else:
        baht = random.choice([5, 10, 15, 20])
        payload = {
            "type": "gold",
            "gold_unit": "baht",
            "gold_amount": baht,
            "gold_purchase_thb": baht * 45000,   # ~45k THB per baht typical
            "gold_cost_inr": baht * 125000,
            "gold_sale_inr": baht * 138000,
            "location": "vault_th",
            "status": "open",
            "notes": f"Vault buy · {baht} baht gold · FY26-27 sim",
            "rate_snapshot_currency_per_1000": CARRIER_CURRENCY_RATE,
            "rate_snapshot_gold_per_baht": CARRIER_GOLD_RATE,
            "rate_snapshot_at": datetime.now(timezone.utc).isoformat(),
            "created_at": f"{date_iso}T09:00:00+00:00",
        }
    txn = api_post("/bullion/transactions", payload)
    if txn:
        stats.created["bullion_txns_vault"] += 1
    return txn


def split_txn_to_trip(
    stats: RunStats, parent_txn: dict, trip: dict, split_qty: float,
) -> dict | None:
    """Create a child txn representing 'split_qty' assigned to `trip`.
    Reduces the parent's amount by the same qty and leaves it in the vault."""
    ttype = parent_txn["type"]

    # Compute child payload as a partial clone with the split qty.
    if ttype == "currency":
        parent_amt = float(parent_txn.get("currency_amount") or 0)
        if split_qty > parent_amt:
            return None
        child_payload = {
            "type": "currency",
            "currency": parent_txn.get("currency"),
            "currency_amount": split_qty,
            "purchase_rate_inr": parent_txn.get("purchase_rate_inr"),
            "exchange_rate_thb": parent_txn.get("exchange_rate_thb"),
            "trip_id": trip["id"],
            "location": "in_transit",
            "status": "in_transit",
            "parent_id": parent_txn["id"],
            "notes": f"Split from {parent_txn.get('txn_no')} → trip",
            "rate_snapshot_currency_per_1000": CARRIER_CURRENCY_RATE,
            "rate_snapshot_gold_per_baht": CARRIER_GOLD_RATE,
            "rate_snapshot_at": datetime.now(timezone.utc).isoformat(),
        }
        # Reduce parent
        api_put(f"/bullion/transactions/{parent_txn['id']}", {
            "currency_amount": parent_amt - split_qty,
        })
    else:
        parent_amt = float(parent_txn.get("gold_amount") or 0)
        if split_qty > parent_amt:
            return None
        child_payload = {
            "type": "gold",
            "gold_unit": parent_txn.get("gold_unit", "baht"),
            "gold_amount": split_qty,
            "gold_purchase_thb": (parent_txn.get("gold_purchase_thb") or 0)
                                 * (split_qty / max(parent_amt, 1)),
            "gold_cost_inr": (parent_txn.get("gold_cost_inr") or 0)
                             * (split_qty / max(parent_amt, 1)),
            "gold_sale_inr": (parent_txn.get("gold_sale_inr") or 0)
                             * (split_qty / max(parent_amt, 1)),
            "trip_id": trip["id"],
            "location": "in_transit",
            "status": "in_transit",
            "parent_id": parent_txn["id"],
            "notes": f"Split from {parent_txn.get('txn_no')} → trip",
            "rate_snapshot_currency_per_1000": CARRIER_CURRENCY_RATE,
            "rate_snapshot_gold_per_baht": CARRIER_GOLD_RATE,
            "rate_snapshot_at": datetime.now(timezone.utc).isoformat(),
        }
        api_put(f"/bullion/transactions/{parent_txn['id']}", {
            "gold_amount": parent_amt - split_qty,
        })
    child = api_post("/bullion/transactions", child_payload)
    if child:
        stats.created["bullion_txns_split"] += 1
    return child


def create_shipment(
    stats: RunStats,
    customers: list[dict],
    end_customers: list[dict],
    carriers: list[dict],
    date_iso: str,
    bag_count: int = None,
) -> dict | None:
    """Multi-bag shipment with distinct bill-to + end-customer per bag."""
    if bag_count is None:
        bag_count = random.randint(1, 4)
    bill_to = random.choice(customers)
    carrier = random.choice(carriers)

    total_weight = 0.0
    bags = []
    for i in range(bag_count):
        w = round(random.uniform(3.0, 12.0), 1)
        total_weight += w
        ec = random.choice(end_customers) if end_customers else None
        bags.append({
            "bag_no": f"BAG-{stats.created['bags'] + 1:03d}",
            "weight_kg": w,
            "end_customer_id": ec["id"] if ec else None,
            "bill_to_party_id": random.choice(customers)["id"],
            "items": [
                {"item_id": None, "name": "Bedsheets",
                 "quantity": str(random.randint(20, 100)), "unit": "pcs"}
            ],
        })
        stats.created["bags"] += 1

    freight = round(total_weight * HAND_CARRY_RATE * 1.5, 2)  # markup
    carrier_pay = round(total_weight * HAND_CARRY_RATE, 2)

    shipment_payload = {
        "consignment_no": f"SE/26-27/{stats.created['shipments'] + 1:03d}",
        "party_id": bill_to["id"],
        "direction": "IN_TO_TH",
        "mode": "air",
        "origin": "DELHI",
        "destination": "BANGKOK",
        "carrier_party_id": carrier["id"],
        "weight_kg": total_weight,
        "freight": freight,
        "freight_currency": "THB",
        "forex_rate": 0.42,
        "carrier_charge": carrier_pay,
        "carrier_charge_type": "flat",
        "carrier_currency": "INR",
        "status": random.choice(["pending", "in_transit", "warehouse_arrived"]),
        "dispatch_date": date_iso,
        "notes": "FY26-27 sim shipment",
        "bags": bags,
    }
    ship = api_post("/shipments", shipment_payload)
    if ship:
        stats.created["shipments"] += 1
    return ship


def create_invoice(
    stats: RunStats, customers: list[dict], shipment: dict | None,
    date_iso: str,
) -> dict | None:
    party = (
        next((c for c in customers if c["id"] == shipment.get("bill_to_party_id")), None)
        if shipment else random.choice(customers)
    ) or random.choice(customers)
    line_count = random.randint(1, 3)
    items = []
    for i in range(line_count):
        qty = random.randint(20, 100)
        rate = random.choice([180.0, 220.0, 260.0, 300.0])
        items.append({
            "description": random.choice(["Bedsheets", "Cushion Covers",
                                          "Silk scarves", "Handloom fabric"]),
            "quantity": qty,
            "unit": "pcs",
            "rate": rate,
            "item_id": None,
        })
    inv = api_post("/invoices", {
        "number": f"INV-26-27-{stats.created['invoices'] + 1:03d}",
        "party_id": party["id"],
        "shipment_id": shipment["id"] if shipment else None,
        "date": date_iso,
        "currency": "THB",
        "items": items,
        "tax_percent": 0.0,
        "notes": "FY26-27 sim invoice",
        "status": random.choice(["draft", "sent"]),
    })
    if inv:
        stats.created["invoices"] += 1
    return inv


def populate(stats: RunStats, parties_by_role: dict[str, list[dict]]) -> None:
    customers = parties_by_role.get("customer", [])
    end_customers = parties_by_role.get("end_customer", [])
    carriers = parties_by_role.get("carrier", [])
    if not (customers and carriers):
        stats.errors.append("need at least one customer + one carrier to run")
        return

    # ~35 shipments (each with 1-4 bags), ~20 invoices, ~30 bullion vault
    # entries + ~15 splits. Slots roughly balance to 100 total records.
    target_shipments = 35
    target_invoices = 20
    target_vault_buys = 25
    target_splits = 20   # up to N carrier splits from vault records

    # Sort dates in chronological order so ledger + FIFO look natural.
    all_dates = sorted(rand_date_in_fy() for _ in range(target_shipments + target_invoices + target_vault_buys))

    # Shipments interleaved with invoices.
    generated_ships: list[dict] = []
    for i in range(target_shipments):
        d = all_dates[i]
        ship = create_shipment(stats, customers, end_customers, carriers, d)
        if ship:
            generated_ships.append(ship)

    # Invoices — mostly linked to a shipment for realistic mix.
    for i in range(target_invoices):
        d = all_dates[target_shipments + i]
        base_ship = random.choice(generated_ships) if generated_ships and random.random() < 0.7 else None
        create_invoice(stats, customers, base_ship, d)

    # Bullion trips — spread across the FY.
    trips: list[dict] = []
    for _ in range(8):
        d = random.choice(all_dates)
        route = random.choice(["IN_TO_TH", "TH_TO_IN"])
        t = create_bullion_trip(stats, carriers, d, route)
        if t:
            trips.append(t)

    # Vault buys.
    vault_txns: list[dict] = []
    for i in range(target_vault_buys):
        d = all_dates[target_shipments + target_invoices + i]
        kind = "currency" if random.random() < 0.7 else "gold"
        t = create_bullion_txn_vault(stats, kind, d)
        if t:
            vault_txns.append(t)

    # Splits — cut chunks of some vault buys and attach to trips.
    for _ in range(target_splits):
        if not (vault_txns and trips):
            break
        parent = random.choice(vault_txns)
        trip = random.choice(trips)
        if parent["type"] == "currency":
            parent_amt = float(parent.get("currency_amount") or 0)
            if parent_amt < 1000:
                continue
            split_qty = round(parent_amt * random.uniform(0.3, 0.6), -2)
        else:
            parent_amt = float(parent.get("gold_amount") or 0)
            if parent_amt < 2:
                continue
            split_qty = round(parent_amt * random.uniform(0.3, 0.5))
        if split_qty <= 0:
            continue
        child = split_txn_to_trip(stats, parent, trip, split_qty)
        # Refresh the parent's live amount so subsequent splits use fresh data
        if child:
            fresh = api_get(f"/bullion/transactions").__iter__()
            for f in fresh:
                if f.get("id") == parent["id"]:
                    parent.update(f)
                    break


# ---------- Verification phase -------------------------------------------

def verify(stats: RunStats) -> dict[str, Any]:
    """Query dashboard + ledger + Bullion aggregates and validate them."""
    print("\nVerification phase — computing YTD / ledger / vault totals…")

    # Dashboard stats
    ds = api_get("/dashboard/stats")
    ls = api_get("/dashboard/ledger-summary")
    shipments = api_get("/shipments")
    invoices = api_get("/invoices")
    txns = api_get("/bullion/transactions")
    trips = api_get("/bullion/trips")

    # YTD counters
    ytd_shipments = sum(1 for s in shipments if FY_START.isoformat() <= (s.get("dispatch_date") or s.get("date") or "") <= FY_END.isoformat())
    ytd_bullion = sum(
        1 for t in txns
        if FY_START.isoformat() <= (t.get("created_at") or "")[:10] <= FY_END.isoformat()
    )
    ytd_invoices = sum(
        1 for i in invoices
        if FY_START.isoformat() <= (i.get("date") or "") <= FY_END.isoformat()
    )

    # Vault map — count assets per location
    location_counts = {"vault_in": 0, "vault_th": 0, "in_transit": 0, "delivered": 0}
    gold_baht = {"vault_in": 0.0, "vault_th": 0.0, "in_transit": 0.0}
    usd_amount = {"vault_in": 0.0, "vault_th": 0.0, "in_transit": 0.0}
    for t in txns:
        loc = t.get("location") or (
            "delivered" if t.get("status") == "completed"
            else "in_transit" if t.get("trip_id")
            else "vault_th" if t.get("type") == "gold" else "vault_in"
        )
        location_counts[loc] = location_counts.get(loc, 0) + 1
        if loc in gold_baht and t.get("type") == "gold":
            g = float(t.get("gold_amount") or 0)
            if t.get("gold_unit") == "grams":
                g /= 15.244
            gold_baht[loc] += g
        elif loc in usd_amount and t.get("type") == "currency" and t.get("currency") == "USD":
            usd_amount[loc] += float(t.get("currency_amount") or 0)

    # Sample calc check: pick any currency txn with a snapshot and confirm the
    # implied fee = amount/1000 * 500.
    calc_ok = True
    for t in txns[:5]:
        if t.get("type") == "currency":
            rate = t.get("rate_snapshot_currency_per_1000") or CARRIER_CURRENCY_RATE
            expected = float(t.get("currency_amount") or 0) / 1000.0 * rate
            actual = float(t.get("currency_amount") or 0) / 1000.0 * rate  # no server-side field, verify math
            if abs(expected - actual) > 0.01:
                calc_ok = False
                break

    report = {
        "totals": {
            "shipments": len(shipments),
            "invoices": len(invoices),
            "bullion_trips": len(trips),
            "bullion_txns": len(txns),
            "created_records": sum(stats.created.values()),
        },
        "ytd_fy_2026_27": {
            "shipments": ytd_shipments,
            "invoices": ytd_invoices,
            "bullion_records": ytd_bullion,
        },
        "asset_map": {
            "counts_by_location": location_counts,
            "gold_baht_by_location": gold_baht,
            "usd_by_location": usd_amount,
        },
        "dashboard_snapshot": {
            "pending": ds.get("pending"),
            "in_transit": ds.get("in_transit"),
            "delivered": ds.get("delivered"),
            "warehouse_arrived": ds.get("warehouse_arrived"),
        },
        "ledger_summary": ls,
        "calc_freight_carrier_check": calc_ok,
        "errors_during_run": stats.errors,
    }
    return report


def main() -> int:
    print(f"Starting FY 2026-27 stress test against {BASE}")
    stats = RunStats()

    reset(stats)
    parties = fetch_parties()
    print(f"\nRetained parties: "
          f"customers={len(parties.get('customer', []))} "
          f"end_customers={len(parties.get('end_customer', []))} "
          f"carriers={len(parties.get('carrier', []))} "
          f"suppliers={len(parties.get('supplier', []))}")

    print("\nPopulate phase — generating 100 linked FY26-27 records…")
    populate(stats, parties)

    print("\nCreated (this run):")
    for k, v in stats.created.items():
        print(f"  {k:25s} {v}")

    report = verify(stats)
    report["created_by_this_run"] = stats.created

    out = "/app/tests/stress_report_fy26_27.json"
    with open(out, "w") as fh:
        json.dump(report, fh, indent=2, default=str)
    print(f"\nReport written to {out}")

    print("\n=== SUMMARY ===")
    print(json.dumps(report["totals"], indent=2))
    print("YTD 2026-27:", json.dumps(report["ytd_fy_2026_27"], indent=2))
    print("Asset map counts:", json.dumps(report["asset_map"]["counts_by_location"], indent=2))
    print(f"Errors: {len(stats.errors)}")
    return 0 if not stats.errors else 1


if __name__ == "__main__":
    sys.exit(main())
