"""Smoke tests for /api/voice/query endpoint (iteration 68).

Verifies the new dashboard-query endpoint used by the Voice Orb's
`query_dashboard` function tool. Auth is required (optional_current_user).
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_BACKEND_URL", "http://localhost:8001").rstrip("/")


@pytest.fixture(scope="module")
def auth_headers():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": "kishan", "password": "Kishan@Boss2026"},
        timeout=15,
    )
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text[:200]}"
    tok = r.json().get("token") or r.json().get("access_token")
    assert tok, f"no token in {r.json()}"
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


@pytest.mark.parametrize("metric,required_keys", [
    ("pending_shipments", ["metric", "count"]),
    ("in_transit_shipments", ["metric", "count"]),
    ("unpaid_invoices", ["metric", "count", "total_inr", "total_thb"]),
    ("active_trips", ["metric", "count"]),
    ("today_revenue", ["metric", "count", "revenue_inr", "revenue_thb"]),
    ("warehouse_bags", ["metric", "current_bags"]),
    ("overview", ["metric", "stats"]),
])
def test_voice_query_metric(auth_headers, metric, required_keys):
    r = requests.post(
        f"{BASE_URL}/api/voice/query",
        json={"metric": metric},
        headers=auth_headers,
        timeout=30,
    )
    assert r.status_code == 200, f"{metric} → {r.status_code} {r.text[:200]}"
    body = r.json()
    for k in required_keys:
        assert k in body, f"{metric} missing key '{k}' in {body}"


def test_voice_query_unknown_metric(auth_headers):
    r = requests.post(
        f"{BASE_URL}/api/voice/query",
        json={"metric": "does_not_exist"},
        headers=auth_headers,
        timeout=15,
    )
    assert r.status_code == 200
    assert "error" in r.json()


def test_voice_query_party_balance_missing_name(auth_headers):
    r = requests.post(
        f"{BASE_URL}/api/voice/query",
        json={"metric": "party_balance"},
        headers=auth_headers,
        timeout=15,
    )
    assert r.status_code == 200
    assert "error" in r.json()


def test_realtime_token_endpoint_returns_ephemeral(auth_headers):
    """Verify /api/realtime-token returns a working ephemeral key + model.
    Model is required by the client to build the GA SDP URL.
    """
    r = requests.post(
        f"{BASE_URL}/api/realtime-token",
        json={"page": "dashboard", "page_data_summary": "test"},
        headers=auth_headers,
        timeout=30,
    )
    assert r.status_code == 200, f"token fetch failed: {r.status_code} {r.text[:300]}"
    body = r.json()
    assert body.get("ephemeral_key"), f"no ephemeral_key in {body}"
    assert body.get("model"), f"no model in {body}"
