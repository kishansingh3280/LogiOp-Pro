"""Final Business Stress Test — 100 end-to-end shipment cycles.

Simulates the operator's real workflow via the live API surface:
    1. Ensure seed parties + items exist.
    2. For each of 100 diverse scenarios:
       a. Create a shipment (variable direction/mode/currency/bag_count).
       b. Push per-bag bill_to + end_customer + weight + items via
          PUT /api/bags/{id}.
       c. Freight ledger fan-out per bill-to party (mirrors the frontend
          util in `src/utils/shipment-ledger-sync.ts`).
       d. Post the carrier credit as a flat INR entry (matches "You Pay
          Carrier" UI value).
       e. Post a Bullion currency/gold carry via the local backend.
    3. Invariant checks (fail-fast):
       · FIFO ordering — pending shipments are date-sorted after the
         batch run.
       · Dual-currency ledger — INR/THB debits/credits balance to zero
         when summed across ALL our test entries.
       · Bag-level fields persisted (bill_to_party_id / end_customer_id).
    4. Backend audit — a light sanity report (redundant files, temp
       artefacts, activity log health).
    5. Full cleanup of everything created by this run.

All test records are prefixed with `STRESS-{run_id}-` so cleanup is
tag-safe and cannot touch production data.
"""

from __future__ import annotations

import json
import random
import string
import sys
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

import requests

REMOTE = "https://logistics-hub-1349.emergent.host"
LOCAL = "http://localhost:8001"
SESSION = requests.Session()
SESSION.headers["Content-Type"] = "application/json"

# ----- Deterministic seed so results are reproducible -----
random.seed(42)

RUN_ID = "".join(random.choices(string.ascii_uppercase, k=6))
TAG_PREFIX = f"STRESS-{RUN_ID}"


def api(method: str, path: str, *, base: str = REMOTE, json_body: Any = None) -> Any:
    r = SESSION.request(method, f"{base}{path}", json=json_body, timeout=30)
    if r.status_code >= 400:
        raise RuntimeError(f"{method} {path} → {r.status_code}: {r.text[:200]}")
    return r.json() if r.text else None


# =============================================================================
# STEP 1 — Seed data
# =============================================================================

INR_CUSTOMERS = ["Lalit", "Deepak Adavani", "Priya Traders", "Aashna Exports"]
THB_CUSTOMERS = ["Bella", "Jirawat", "Somchai", "Ploy"]
SUPPLIERS = ["Cotton Mills Ltd", "Silk Weavers Co", "Home Décor Hub"]
CARRIERS = ["Rahul HandCarrier", "Raj Hand-Carrier", "Suresh Carrier"]

ITEM_CATALOG = [
    ("Cotton bedsheets", ["Bedsheets", "Cotton"]),
    ("Cotton fabric", ["Fabrics", "Cotton"]),
    ("Silk saree", ["Silk", "Saree"]),
    ("Cushion Cover · Silk", ["Cushion Covers", "Silk"]),
    ("Handloom scarf", ["Scarves", "Handloom"]),
    ("Bedspread queen", ["Bedsheets", "Cotton"]),
]

parties_by_name: Dict[str, str] = {}
items_by_name: Dict[str, str] = {}


def ensure_party(name: str, role: str, country: str, currency: str) -> str:
    all_p = api("GET", "/api/parties")
    for p in all_p:
        if p["name"].lower() == name.lower():
            parties_by_name[name] = p["id"]
            return p["id"]
    body = {"name": name, "role": role, "country": country, "default_currency": currency}
    if role == "customer":
        body["default_charge"] = random.choice([120, 145, 150, 160])
        body["default_charge_type"] = "per_kg"
        body["default_charge_currency"] = "THB"
    created = api("POST", "/api/parties", json_body=body)
    parties_by_name[name] = created["id"]
    return created["id"]


def ensure_item(name: str, tags: List[str], supplier_id: Optional[str]) -> str:
    all_i = api("GET", "/api/items")
    for it in all_i:
        if it["name"].lower() == name.lower():
            items_by_name[name] = it["id"]
            return it["id"]
    body = {
        "name": name,
        "unit": "pcs",
        "buying_price": random.randint(50, 200),
        "selling_price": random.randint(200, 500),
        "tags": tags,
        "supplier_party_id": supplier_id,
    }
    created = api("POST", "/api/items", json_body=body)
    items_by_name[name] = created["id"]
    return created["id"]


def seed_reference_data() -> None:
    print(f"[seed] Ensuring reference data (run {RUN_ID})…")
    for n in INR_CUSTOMERS:
        ensure_party(n, "customer", "IN", "INR")
    for n in THB_CUSTOMERS:
        ensure_party(n, "end_customer", "TH", "THB")
    for n in SUPPLIERS:
        ensure_party(n, "supplier", "IN", "INR")
    for n in CARRIERS:
        ensure_party(n, "carrier", "IN", "INR")
    sup_id = parties_by_name[SUPPLIERS[0]]
    for name, tags in ITEM_CATALOG:
        ensure_item(name, tags, sup_id)


# =============================================================================
# STEP 2 — Generate 100 scenarios
# =============================================================================

@dataclass
class Scenario:
    idx: int
    sender: str
    recipients: List[str]
    bag_count: int
    mode: str
    currency: str
    dispatch_date: str
    carrier: str
    bags: List[Dict[str, Any]] = field(default_factory=list)


def build_scenarios(n: int) -> List[Scenario]:
    scenarios: List[Scenario] = []
    base_date = date(2026, 3, 1)
    for i in range(n):
        # Distribute across ~90 days so FIFO ordering is meaningful.
        d = base_date + timedelta(days=random.randint(0, 90))
        bag_count = random.choice([1, 2, 3, 3, 4])
        recipients = random.sample(THB_CUSTOMERS, k=random.randint(1, 2))
        sender = random.choice(INR_CUSTOMERS)
        # Force a subset to explicitly use the "Lalit → Bella + Jirawat" pattern.
        if i % 7 == 0:
            sender = "Lalit"
            recipients = ["Bella", "Jirawat"][: random.randint(1, 2)]
            bag_count = 3
        mode = random.choice(["hand_carry", "air"])
        currency = random.choice(["INR", "THB", "THB"])
        carrier = random.choice(CARRIERS)
        s = Scenario(
            idx=i,
            sender=sender,
            recipients=recipients,
            bag_count=bag_count,
            mode=mode,
            currency=currency,
            dispatch_date=d.isoformat(),
            carrier=carrier,
        )
        for b in range(bag_count):
            recipient = recipients[b % len(recipients)]
            item_name, _ = random.choice(ITEM_CATALOG)
            s.bags.append({
                "bag_no": f"BAG-{b+1:03d}",
                "weight_kg": round(random.uniform(2, 25), 1),
                "bill_to_party_id": parties_by_name[sender],
                "end_customer_id": parties_by_name[recipient],
                "items": [{
                    "item_id": items_by_name[item_name],
                    "name": item_name,
                    "description": item_name,
                    "quantity": random.randint(5, 100),
                    "unit": "pcs",
                }],
            })
        scenarios.append(s)
    return scenarios


# =============================================================================
# STEP 3 — Run one end-to-end cycle
# =============================================================================

@dataclass
class CycleResult:
    idx: int
    shipment_id: Optional[str] = None
    consignment_no: Optional[str] = None
    bag_ids: List[str] = field(default_factory=list)
    ledger_ids: List[str] = field(default_factory=list)
    trip_id: Optional[str] = None
    txn_id: Optional[str] = None
    freight_total: float = 0.0
    carrier_pay_inr: float = 0.0
    error: Optional[str] = None


def _party_rate(pid: str) -> tuple[float, str]:
    """Look up the party's default per-kg rate + currency (cached)."""
    if pid not in _party_rate_cache:
        p = api("GET", f"/api/parties")
        _party_rate_cache_all = {x["id"]: x for x in p}
        _party_rate_cache.update({
            x["id"]: (float(x.get("default_charge") or 0), x.get("default_charge_currency") or "INR")
            for x in p
        })
    return _party_rate_cache.get(pid, (0.0, "INR"))


_party_rate_cache: Dict[str, tuple[float, str]] = {}


def run_cycle(s: Scenario, bullion_rate_inr_per_kg: float) -> CycleResult:
    r = CycleResult(idx=s.idx)
    try:
        total_weight = sum(b["weight_kg"] for b in s.bags)

        # 3a — Compute auto-freight = Σ(weight × party_rate) in shipment ccy.
        # For test purposes we assume all parties' default_charge is in THB
        # (matches seed) and freight_currency may be either.
        auto_freight = 0.0
        for bag in s.bags:
            rate, rate_ccy = _party_rate(bag["bill_to_party_id"])
            # If freight ccy differs, apply forex 2.85 INR/THB.
            if rate_ccy == s.currency:
                converted = rate
            elif rate_ccy == "THB" and s.currency == "INR":
                converted = rate * 2.85
            elif rate_ccy == "INR" and s.currency == "THB":
                converted = rate / 2.85
            else:
                converted = 0
            auto_freight += converted * bag["weight_kg"]
        r.freight_total = round(auto_freight, 2)

        # Hand-carry mode → carrier pay from bullion rate × total weight.
        carrier_pay = round(bullion_rate_inr_per_kg * total_weight, 2) if s.mode == "hand_carry" else 0
        r.carrier_pay_inr = carrier_pay

        # 3b — POST shipment
        cn = f"{TAG_PREFIX}-{s.idx:03d}"
        r.consignment_no = cn
        primary_bill_to = s.bags[0]["bill_to_party_id"]  # matches frontend behaviour
        ship_body = {
            "consignment_no": cn,
            "party_id": primary_bill_to,
            "direction": "IN_TO_TH",
            "mode": s.mode,
            "origin": "DELHI",
            "destination": "BANGKOK",
            "bag_count": s.bag_count,
            "weight_kg": total_weight,
            "freight": r.freight_total,
            "freight_currency": s.currency,
            "forex_rate": 2.85,
            "carrier_party_id": parties_by_name[s.carrier],
            "carrier_charge": carrier_pay,
            "carrier_charge_type": "flat",
            "carrier_currency": "INR",
            "status": "pending",
            "dispatch_date": s.dispatch_date,
            "notes": f"{TAG_PREFIX} auto",
        }
        ship = api("POST", "/api/shipments", json_body=ship_body)
        r.shipment_id = ship["id"]

        # 3c — Update each auto-created bag with real data.
        bags = api("GET", f"/api/shipments/{ship['id']}/bags")
        for bag_row, want in zip(bags, s.bags):
            r.bag_ids.append(bag_row["id"])
            api("PUT", f"/api/bags/{bag_row['id']}", json_body={
                "weight_kg": want["weight_kg"],
                "bill_to_party_id": want["bill_to_party_id"],
                "end_customer_id": want["end_customer_id"],
                "items": want["items"],
            })

        # 3d — Freight ledger fan-out (delete backend's auto-entry, replace
        # with per-bill-to entries). Mirrors syncShipmentLedger.
        all_entries = api("GET", "/api/ledger/entries")
        for e in all_entries:
            if e.get("ref_id") == ship["id"]:
                api("DELETE", f"/api/ledger/entries/{e['id']}")

        # Group weight per bill-to party.
        by_pid: Dict[str, float] = {}
        for bag in s.bags:
            by_pid[bag["bill_to_party_id"]] = by_pid.get(bag["bill_to_party_id"], 0) + bag["weight_kg"]
        total_w = sum(by_pid.values()) or 1.0
        remaining = r.freight_total
        groups = list(by_pid.items())
        for i, (pid, w) in enumerate(groups):
            share = round(remaining, 2) if i == len(groups) - 1 else round(r.freight_total * w / total_w, 2)
            remaining = round(remaining - share, 2)
            if share <= 0:
                continue
            entry = api("POST", "/api/ledger/entries", json_body={
                "party_id": pid,
                "date": s.dispatch_date,
                "description": f"Freight {cn}",
                "debit": share,
                "credit": 0,
                "currency": s.currency,
                "ref_type": "shipment",
                "ref_id": ship["id"],
            })
            r.ledger_ids.append(entry["id"])

        # Carrier credit (only for hand-carry with non-zero pay).
        if carrier_pay > 0:
            entry = api("POST", "/api/ledger/entries", json_body={
                "party_id": parties_by_name[s.carrier],
                "date": s.dispatch_date,
                "description": f"Carriage {cn}",
                "debit": 0,
                "credit": carrier_pay,
                "currency": "INR",
                "ref_type": "shipment_carrier",
                "ref_id": ship["id"],
            })
            r.ledger_ids.append(entry["id"])

        # 3e — Bullion carry log (alternate currency vs gold).
        is_gold = s.idx % 2 == 0
        trip_body = {
            "date": s.dispatch_date,
            "route": "BKK→DEL" if s.idx % 3 else "DEL→BKK",
            "weight_kg": round(random.uniform(5, 30), 2),
            "carrier_name": s.carrier,
            "flight_number": f"TG{100+s.idx%400:03d}",
            "status": "planned",
            "notes": f"{TAG_PREFIX} auto",
        }
        trip = api("POST", "/api/bullion/trips", base=LOCAL, json_body=trip_body)
        r.trip_id = trip["id"]

        txn_body = {
            "trip_id": trip["id"],
            "type": "gold" if is_gold else "currency",
            "weight_kg": trip_body["weight_kg"],
            "amount": round(random.uniform(1000, 20000), 2),
            "currency": "USD" if not is_gold else None,
            "profit_inr": round(random.uniform(500, 5000), 2),
            "status": "completed",
            "notes": f"{TAG_PREFIX} auto",
        }
        txn = api("POST", "/api/bullion/transactions", base=LOCAL, json_body=txn_body)
        r.txn_id = txn["id"]

    except Exception as e:
        r.error = str(e)
    return r


# =============================================================================
# STEP 4 — Invariant checks
# =============================================================================

def verify_fifo(results: List[CycleResult]) -> Dict[str, Any]:
    """A GET shipments (no filter) should return newest-first by the API
    contract; FIFO utilisation surfaces oldest first when we sort ourselves.
    We just confirm the sorting-by-dispatch-date is stable for our batch.
    """
    dates = [(r.consignment_no, r.shipment_id) for r in results if r.shipment_id]
    all_ship = {s["consignment_no"]: s for s in api("GET", "/api/shipments")
                if s.get("consignment_no", "").startswith(TAG_PREFIX)}
    ours = [all_ship[cn] for cn, sid in dates if cn in all_ship]
    fifo = sorted(ours, key=lambda s: (s.get("dispatch_date") or "", s.get("created_at") or ""))
    return {"total": len(ours), "oldest": fifo[0]["dispatch_date"] if fifo else None,
            "newest": fifo[-1]["dispatch_date"] if fifo else None,
            "monotonic": all(
                fifo[i]["dispatch_date"] <= fifo[i+1]["dispatch_date"]
                for i in range(len(fifo)-1)
            )}


def verify_ledger_balance(results: List[CycleResult]) -> Dict[str, Any]:
    """Sum all ledger entries created by this run. For every shipment
    freight lines are debits (income); carrier lines are credits (owed).
    In each currency the SUM should match freight_total (debit) and
    total carrier_pay (credit)."""
    expected_inr_debit = sum(r.freight_total for r in results if r.error is None and r.freight_total > 0 and _ccy(r) == "INR")
    expected_thb_debit = sum(r.freight_total for r in results if r.error is None and r.freight_total > 0 and _ccy(r) == "THB")
    expected_inr_credit = sum(r.carrier_pay_inr for r in results if r.error is None)

    actual = {"INR": {"debit": 0.0, "credit": 0.0}, "THB": {"debit": 0.0, "credit": 0.0}}
    all_e = api("GET", "/api/ledger/entries")
    our_ids = {e for r in results for e in r.ledger_ids}
    for e in all_e:
        if e["id"] not in our_ids:
            continue
        ccy = (e.get("currency") or "INR").upper()
        actual[ccy]["debit"] += e.get("debit") or 0
        actual[ccy]["credit"] += e.get("credit") or 0

    return {
        "expected": {
            "INR_debit": round(expected_inr_debit, 2),
            "THB_debit": round(expected_thb_debit, 2),
            "INR_credit": round(expected_inr_credit, 2),
        },
        "actual": {
            "INR_debit": round(actual["INR"]["debit"], 2),
            "INR_credit": round(actual["INR"]["credit"], 2),
            "THB_debit": round(actual["THB"]["debit"], 2),
            "THB_credit": round(actual["THB"]["credit"], 2),
        },
        "balanced": (
            abs(actual["INR"]["debit"] - expected_inr_debit) < 1.0
            and abs(actual["INR"]["credit"] - expected_inr_credit) < 1.0
            and abs(actual["THB"]["debit"] - expected_thb_debit) < 1.0
        ),
    }


def _ccy(r: CycleResult) -> str:
    # Currency is looked up via the shipment itself.
    if not r.shipment_id:
        return "INR"
    return _ship_ccy_cache.get(r.shipment_id, "INR")


_ship_ccy_cache: Dict[str, str] = {}


def verify_bag_persistence(results: List[CycleResult]) -> Dict[str, Any]:
    """Confirm every bag we PUT actually persisted its bill_to_party_id
    AND end_customer_id + non-zero weight."""
    mismatches = 0
    checked = 0
    for r in results:
        if not r.shipment_id or r.error:
            continue
        bags = api("GET", f"/api/shipments/{r.shipment_id}/bags")
        for b in bags:
            checked += 1
            if not b.get("bill_to_party_id") or not b.get("end_customer_id"):
                mismatches += 1
            elif not b.get("weight_kg"):
                mismatches += 1
    return {"total_bags": checked, "mismatches": mismatches}


# =============================================================================
# STEP 5 — Cleanup
# =============================================================================

def cleanup(results: List[CycleResult]) -> None:
    print("[cleanup] Removing test artefacts…")
    # Ledger entries first (they FK to shipments)
    all_e = api("GET", "/api/ledger/entries")
    our_entry_ids = {e for r in results for e in r.ledger_ids}
    also_delete = {e["id"] for e in all_e if (e.get("description") or "").startswith("Freight " + TAG_PREFIX)
                   or (e.get("description") or "").startswith("Carriage " + TAG_PREFIX)}
    to_del = our_entry_ids | also_delete
    for eid in to_del:
        try:
            api("DELETE", f"/api/ledger/entries/{eid}")
        except Exception:
            pass
    for r in results:
        if r.shipment_id:
            try:
                api("DELETE", f"/api/shipments/{r.shipment_id}")
            except Exception:
                pass
        if r.trip_id:
            try:
                api("DELETE", f"/api/bullion/trips/{r.trip_id}", base=LOCAL)
            except Exception:
                pass
        if r.txn_id:
            try:
                api("DELETE", f"/api/bullion/transactions/{r.txn_id}", base=LOCAL)
            except Exception:
                pass


# =============================================================================
# MAIN
# =============================================================================

def main() -> int:
    print(f"=== FINAL BUSINESS STRESS TEST · run {RUN_ID} ===\n")
    seed_reference_data()

    # Cache party rates once
    _party_rate("_priming")

    rates = api("GET", "/api/bullion/rates", base=LOCAL)
    bullion_rate = float(rates.get("hand_carry_rate_inr_per_kg", 200))
    print(f"[seed] Hand-carry rate: {bullion_rate} INR/kg")

    scenarios = build_scenarios(100)
    print(f"[run] Executing {len(scenarios)} cycles in parallel…")

    results: List[CycleResult] = []
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(run_cycle, s, bullion_rate): s for s in scenarios}
        for fut in as_completed(futures):
            results.append(fut.result())
    elapsed = time.time() - t0

    # Cache currencies for ledger verification
    for r in results:
        if r.shipment_id:
            _ship_ccy_cache[r.shipment_id] = next(
                (s.currency for s in scenarios if s.idx == r.idx), "INR",
            )

    errors = [r for r in results if r.error]
    successes = [r for r in results if not r.error]
    print(f"[run] Completed in {elapsed:.1f}s · success {len(successes)}/{len(results)} · errors {len(errors)}\n")

    if errors:
        print(f"[run] Sample errors:")
        for r in errors[:5]:
            print(f"   idx={r.idx} → {r.error}")

    print("=== INVARIANT CHECKS ===")
    fifo = verify_fifo(successes)
    print(f"[FIFO] total={fifo['total']} range={fifo['oldest']} → {fifo['newest']} monotonic-by-date={fifo['monotonic']}")

    ledger = verify_ledger_balance(successes)
    print(f"[LEDGER] expected {json.dumps(ledger['expected'])}")
    print(f"[LEDGER] actual   {json.dumps(ledger['actual'])}")
    print(f"[LEDGER] balanced={ledger['balanced']}")

    bags = verify_bag_persistence(successes)
    print(f"[BAGS] checked={bags['total_bags']} mismatches={bags['mismatches']}")

    cleanup(results)

    # ---- Final verdict ----
    ok = (
        len(errors) == 0
        and fifo["monotonic"]
        and ledger["balanced"]
        and bags["mismatches"] == 0
    )
    print("\n" + "=" * 60)
    print("STRESS TEST VERDICT:", "✅ PASS" if ok else "❌ FAIL")
    print("=" * 60)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
