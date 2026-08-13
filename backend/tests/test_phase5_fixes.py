"""Phase 5 · Fix 3 backend regression — carrier_rates on party_meta.

The party detail screen writes/reads carrier_rates via
    PUT/GET /api/parties/{id}/meta
so the backend must accept + return the `carrier_rates` field in the
overlay document.
"""
import os
import uuid
import requests
import pytest

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
ADMIN = {"username": "kishan.singh3280@gmail.com", "password": "701A3ahig@"}


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN, timeout=15)
    assert r.status_code == 200, r.text
    j = r.json()
    return j.get("access_token") or j.get("token")


@pytest.fixture(scope="module")
def carrier_party_id(token):
    """Create a fresh carrier party for isolated testing."""
    h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    payload = {
        "name": f"TEST_CarrierPhase5_{uuid.uuid4().hex[:6]}",
        "role": "carrier",
        "country": "IN",
        "default_currency": "INR",
    }
    r = requests.post(f"{BASE_URL}/api/parties", json=payload, headers=h, timeout=15)
    assert r.status_code in (200, 201), r.text
    return r.json()["id"]


def test_put_party_meta_persists_carrier_rates(token, carrier_party_id):
    h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    body = {
        "party_id": carrier_party_id,
        "carrier_rates": {
            "per_kg": "250",
            "per_baht": "180",
            "per_1000_usd": "500",
        },
    }
    r = requests.put(
        f"{BASE_URL}/api/parties/{carrier_party_id}/meta",
        json=body,
        headers=h,
        timeout=15,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert "carrier_rates" in data, (
        f"PUT response missing 'carrier_rates' — got keys={list(data.keys())}"
    )
    assert data["carrier_rates"] == body["carrier_rates"]


def test_get_party_meta_returns_carrier_rates(token, carrier_party_id):
    h = {"Authorization": f"Bearer {token}"}
    r = requests.get(
        f"{BASE_URL}/api/parties/{carrier_party_id}/meta",
        headers=h,
        timeout=15,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert "carrier_rates" in data, (
        f"GET response missing 'carrier_rates' — got keys={list(data.keys())}. "
        "Backend PartyMeta model does not accept carrier_rates."
    )
    cr = data["carrier_rates"]
    assert cr.get("per_kg") == "250"
    assert cr.get("per_baht") == "180"
    assert cr.get("per_1000_usd") == "500"


def test_party_detail_merges_carrier_rates(token, carrier_party_id):
    """GET /api/parties/{id} must have carrier_rates merged via overlay."""
    h = {"Authorization": f"Bearer {token}"}
    r = requests.get(f"{BASE_URL}/api/parties/{carrier_party_id}", headers=h, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "carrier_rates" in data, (
        f"Party detail missing merged 'carrier_rates' — keys={list(data.keys())}"
    )
    cr = data["carrier_rates"] or {}
    assert cr.get("per_kg") == "250"
    assert cr.get("per_baht") == "180"
    assert cr.get("per_1000_usd") == "500"


def test_additive_set_partial_updates_do_not_blank_other_keys(token):
    """Regression: sending only {notes} then only {carrier_rates.per_kg}
    must keep BOTH keys — additive `$set` with `exclude_unset=True`."""
    h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    # Fresh carrier party so we don't collide with the module-scoped fixture.
    create = requests.post(
        f"{BASE_URL}/api/parties",
        json={
            "name": f"TEST_AdditivePhase5_{uuid.uuid4().hex[:6]}",
            "role": "carrier",
            "country": "IN",
            "default_currency": "INR",
        },
        headers=h,
        timeout=15,
    )
    assert create.status_code in (200, 201), create.text
    pid = create.json()["id"]

    # 1) Set notes only.
    r1 = requests.put(
        f"{BASE_URL}/api/parties/{pid}/meta",
        json={"party_id": pid, "notes": "vip"},
        headers=h,
        timeout=15,
    )
    assert r1.status_code == 200, r1.text

    # 2) Set carrier_rates only.
    r2 = requests.put(
        f"{BASE_URL}/api/parties/{pid}/meta",
        json={"party_id": pid, "carrier_rates": {"per_kg": "300"}},
        headers=h,
        timeout=15,
    )
    assert r2.status_code == 200, r2.text

    # 3) Final GET must have BOTH.
    r3 = requests.get(f"{BASE_URL}/api/parties/{pid}/meta", headers=h, timeout=15)
    assert r3.status_code == 200, r3.text
    final = r3.json()
    assert final.get("notes") == "vip", (
        f"notes was blanked by later PUT — additive $set broken. Got: {final}"
    )
    assert (final.get("carrier_rates") or {}).get("per_kg") == "300", (
        f"carrier_rates.per_kg missing — Got: {final}"
    )


def test_health_and_login(token):
    """Basic sanity check."""
    assert token
    r = requests.get(f"{BASE_URL}/api/parties", headers={"Authorization": f"Bearer {token}"}, timeout=15)
    assert r.status_code == 200
