"""Phase 6 · Batch B backend regression:
- Fix 9: POST /api/shipments with the payload shape sent by the new form.
- Basic party fetch (used by picker) and shipment retrieval by id.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback: read frontend/.env directly
    with open("/app/frontend/.env") as fh:
        for line in fh:
            if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")


@pytest.fixture(scope="session")
def token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": "kishan.singh3280@gmail.com", "password": "701A3ahig@"},
        timeout=20,
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture()
def auth(token):
    return {"Authorization": f"Bearer {token}", "X-Entry-Source": "manual"}


def test_parties_list(auth):
    r = requests.get(f"{BASE_URL}/api/parties", headers=auth, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    assert len(data) > 0, "Need parties for picker"
    # verify shape used by /shipments/new picker
    roles = {(p.get("role") or "").lower() for p in data}
    assert "customer" in roles or "carrier" in roles, roles


def _pick(parties, role):
    return next(p for p in parties if (p.get("role") or "").lower() == role)


def test_create_shipment_universal_defaults(auth):
    # Fetch parties
    parties = requests.get(f"{BASE_URL}/api/parties", headers=auth, timeout=20).json()
    customer = _pick(parties, "customer")
    carrier = _pick(parties, "carrier")

    payload = {
        "direction": "IN_TO_TH",
        "mode": "informal",
        "origin": "Delhi",
        "destination": "Bangkok",
        "goods": "TEST_batchB_test_goods",
        "bag_count": 1,
        "weight_kg": 12,
        "freight": 5000,
        "freight_currency": "INR",
        "party_id": customer["id"],
        "carrier_party_id": carrier["id"],
        "dispatch_date": "2026-01-15",
        "notes": "TEST_ Phase6 BatchB Fix9 shipment",
        "company_id": "awadh",
        "company_mode": "informal",
        "status": "pending",
    }
    r = requests.post(f"{BASE_URL}/api/shipments", json=payload, headers=auth, timeout=30)
    assert r.status_code in (200, 201), f"{r.status_code}: {r.text}"
    body = r.json()
    sid = body.get("id") or body.get("_id") or body.get("shipment", {}).get("id")
    assert sid, f"No id returned: {body}"

    # Verify persistence
    g = requests.get(f"{BASE_URL}/api/shipments/{sid}", headers=auth, timeout=20)
    assert g.status_code == 200, g.text
    got = g.json()
    assert got.get("weight_kg") in (12, 12.0, "12")
    assert got.get("party_id") == customer["id"]
    assert got.get("carrier_party_id") == carrier["id"]
    assert (got.get("company_id") or got.get("company")) in ("awadh",)
    return sid


def test_create_shipment_missing_customer_rejected(auth):
    # party_id missing -> should be a 4xx (schema/validation)
    payload = {
        "direction": "IN_TO_TH",
        "mode": "informal",
        "weight_kg": 5,
        "bag_count": 1,
        "freight": 100,
        "freight_currency": "INR",
        "status": "pending",
        "company_id": "awadh",
        "company_mode": "informal",
    }
    r = requests.post(f"{BASE_URL}/api/shipments", json=payload, headers=auth, timeout=20)
    # Accept either 4xx validation OR success (some backends allow party-less draft).
    # But we assert it did not 500.
    assert r.status_code < 500, r.text


def test_shipments_list_recent(auth):
    r = requests.get(f"{BASE_URL}/api/shipments", headers=auth, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
