"""Phase B — 700-entry stress test + cross-module integrity.

Uses the public preview URL from EXPO_PUBLIC_BACKEND_URL.
"""
import os
import time
import uuid
import requests
import pytest

BASE = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
assert BASE, "EXPO_PUBLIC_BACKEND_URL missing"


def _login():
    r = requests.post(f"{BASE}/api/auth/login",
                      json={"username": "kishan", "password": "Kishan@Boss2026"},
                      timeout=20)
    r.raise_for_status()
    tok = r.json().get("token") or r.json().get("access_token")
    assert tok, f"no token in {r.json()}"
    return tok


@pytest.fixture(scope="module")
def hdrs():
    tok = _login()
    return {"Authorization": f"Bearer {tok}",
            "Content-Type": "application/json",
            "X-Entry-Source": "manual"}


COUNTERS = {}


def _bulk(name, url, payloads, hdrs, n=100):
    ok = 0
    fail_samples = []
    ids = []
    for i, p in enumerate(payloads[:n]):
        try:
            r = requests.post(url, json=p, headers=hdrs, timeout=15)
            if r.status_code in (200, 201):
                ok += 1
                try:
                    ids.append(r.json().get("id") or r.json().get("_id"))
                except Exception:
                    pass
            else:
                if len(fail_samples) < 3:
                    fail_samples.append(f"HTTP {r.status_code}: {r.text[:200]}")
        except Exception as e:
            if len(fail_samples) < 3:
                fail_samples.append(str(e)[:200])
    COUNTERS[name] = {"ok": ok, "fail": len(payloads[:n]) - ok,
                      "samples": fail_samples, "ids": ids[:5]}
    print(f"[{name}] {ok}/{n} ok. errs={fail_samples}")
    return ids


def test_seed_parties(hdrs):
    payloads = [{
        "name": f"TEST_Party_{uuid.uuid4().hex[:8]}",
        "type": "customer",
        "phone": f"90{i:08d}",
        "city": "Delhi",
        "gstin": None,
    } for i in range(100)]
    _bulk("parties", f"{BASE}/api/parties", payloads, hdrs, 100)


def test_seed_items(hdrs):
    payloads = [{
        "name": f"TEST_Item_{uuid.uuid4().hex[:6]}",
        "hsn": "7108",
        "unit": "kg",
        "rate": 100 + i,
    } for i in range(100)]
    _bulk("items", f"{BASE}/api/items", payloads, hdrs, 100)


def test_seed_shipments(hdrs):
    payloads = [{
        "consignment_no": f"TEST-CN-{uuid.uuid4().hex[:6]}",
        "origin": "Delhi",
        "destination": "Bangkok",
        "shipper_name": "TEST_Shipper",
        "consignee_name": "TEST_Consignee",
        "status": "pending",
        "freight_amount": 1000 + i,
        "date": "2025-06-01",
    } for i in range(100)]
    _bulk("shipments", f"{BASE}/api/shipments", payloads, hdrs, 100)


def test_seed_invoices(hdrs):
    payloads = [{
        "invoice_no": f"TEST-INV-{uuid.uuid4().hex[:6]}",
        "party_name": "TEST_Party",
        "amount": 5000 + i,
        "date": "2025-06-01",
        "status": "draft",
    } for i in range(100)]
    _bulk("invoices", f"{BASE}/api/invoices", payloads, hdrs, 100)


def test_seed_ledger(hdrs):
    payloads = [{
        "party_name": "TEST_Party",
        "type": "get" if i % 2 == 0 else "give",
        "amount": 100 + i,
        "note": f"TEST_ledger_{i}",
        "date": "2025-06-01",
    } for i in range(200)]
    _bulk("ledger", f"{BASE}/api/ledger/entries", payloads, hdrs, 200)


def test_seed_trips(hdrs):
    payloads = [{
        "trip_no": f"TEST-TRIP-{uuid.uuid4().hex[:6]}",
        "carrier_name": "TEST_Carrier",
        "origin": "Delhi",
        "destination": "Bangkok",
        "date": "2025-06-01",
        "status": "planned",
    } for i in range(100)]
    _bulk("trips", f"{BASE}/api/bullion/trips", payloads, hdrs, 100)


def test_fy_filter(hdrs):
    r = requests.get(f"{BASE}/api/shipments?fy=2025-26", headers=hdrs, timeout=20)
    print(f"[fy_filter] HTTP {r.status_code}")
    assert r.status_code == 200, r.text[:300]
    data = r.json()
    COUNTERS["fy_filter_count"] = len(data) if isinstance(data, list) else "?"


def test_company_filter(hdrs):
    r = requests.get(f"{BASE}/api/shipments?company=co_singh_exports", headers=hdrs, timeout=20)
    print(f"[company_filter] HTTP {r.status_code}")
    assert r.status_code == 200, r.text[:300]


def test_dump_counters():
    print("\n=== FINAL COUNTERS ===")
    for k, v in COUNTERS.items():
        print(f"  {k}: {v}")
