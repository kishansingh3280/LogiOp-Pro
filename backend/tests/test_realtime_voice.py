"""Backend tests for Phase-1 OpenAI Realtime Voice Assistant.

Endpoints under test:
  - POST /api/realtime-token   (ephemeral OpenAI client_secret)
  - POST /api/voice-command    (execute parsed intents)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL not set"

ADMIN_USERNAME = "kishan"
ADMIN_PASSWORD = "Kishan@Boss2026"


# ---------- fixtures ----------
@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_token(api_client):
    resp = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert resp.status_code == 200, f"login failed: {resp.status_code} {resp.text[:200]}"
    data = resp.json()
    token = data.get("token") or data.get("access_token")
    assert token, f"no token in login response: {data}"
    return token


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ---------- /api/realtime-token ----------
class TestRealtimeToken:
    def test_mint_ephemeral_token(self, api_client, auth_headers):
        resp = api_client.post(
            f"{BASE_URL}/api/realtime-token",
            json={"page": "dashboard", "page_data_summary": "3 pending shipments"},
            headers=auth_headers,
            timeout=20,
        )
        assert resp.status_code == 200, f"status={resp.status_code} body={resp.text[:400]}"
        data = resp.json()
        # Required fields
        assert "ephemeral_key" in data
        assert "expires_at" in data
        assert "session_id" in data
        assert "model" in data
        # Sanity checks
        assert data["ephemeral_key"], "ephemeral_key is empty"
        assert isinstance(data["ephemeral_key"], str)
        assert data["ephemeral_key"].startswith("ek_"), (
            f"ephemeral_key should start with 'ek_' but got: {data['ephemeral_key'][:20]}"
        )
        assert data["model"] == "gpt-realtime", f"model mismatch: {data['model']}"

    def test_mint_without_page_defaults_to_dashboard(self, api_client, auth_headers):
        # Endpoint should work with empty body too (page defaults)
        resp = api_client.post(
            f"{BASE_URL}/api/realtime-token",
            json={},
            headers=auth_headers,
            timeout=20,
        )
        assert resp.status_code == 200, f"status={resp.status_code} body={resp.text[:400]}"
        data = resp.json()
        assert data.get("ephemeral_key", "").startswith("ek_")


# ---------- /api/voice-command ----------
class TestVoiceCommand:
    def test_get_summary(self, api_client, auth_headers):
        resp = api_client.post(
            f"{BASE_URL}/api/voice-command",
            json={"action": "get_summary"},
            headers=auth_headers,
            timeout=15,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("ok") is True, f"expected ok=true, got: {data}"
        payload = data.get("data") or {}
        # All 4 required numeric fields
        for key in ("pending", "in_transit", "delivered", "active_trips"):
            assert key in payload, f"missing '{key}' in {payload}"
            assert isinstance(payload[key], int), f"{key} should be int, got {type(payload[key])}"

    def test_get_balance_existing_party(self, api_client, auth_headers):
        resp = api_client.post(
            f"{BASE_URL}/api/voice-command",
            json={"action": "get_balance", "params": {"party": "Abhishek"}},
            headers=auth_headers,
            timeout=15,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("ok") is True, f"unexpected: {data}"
        d = data.get("data") or {}
        assert "party_id" in d and d["party_id"]
        assert "name" in d and "Abhishek" in d["name"]
        assert "role" in d

    def test_get_balance_missing_name_soft_fail(self, api_client, auth_headers):
        resp = api_client.post(
            f"{BASE_URL}/api/voice-command",
            json={"action": "get_balance", "params": {}},
            headers=auth_headers,
            timeout=15,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("ok") is False
        assert "naam" in (data.get("message") or "").lower()

    def test_get_balance_unknown_party_soft_fail(self, api_client, auth_headers):
        resp = api_client.post(
            f"{BASE_URL}/api/voice-command",
            json={"action": "get_balance", "params": {"party": "NoSuchParty_zzz9999"}},
            headers=auth_headers,
            timeout=15,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("ok") is False

    def test_get_shipments_pending(self, api_client, auth_headers):
        resp = api_client.post(
            f"{BASE_URL}/api/voice-command",
            json={"action": "get_shipments", "params": {"status": "pending"}},
            headers=auth_headers,
            timeout=15,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("ok") is True
        arr = data.get("data")
        assert isinstance(arr, list)
        # every returned shipment must have status=='pending'
        for s in arr:
            assert (s.get("status") or "").lower() == "pending", f"non-pending returned: {s}"

    def test_get_shipments_no_status_returns_all(self, api_client, auth_headers):
        resp = api_client.post(
            f"{BASE_URL}/api/voice-command",
            json={"action": "get_shipments"},
            headers=auth_headers,
            timeout=15,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("ok") is True
        assert isinstance(data.get("data"), list)

    def test_unknown_action_soft_fail(self, api_client, auth_headers):
        resp = api_client.post(
            f"{BASE_URL}/api/voice-command",
            json={"action": "unknown_thing"},
            headers=auth_headers,
            timeout=15,
        )
        # Must NOT throw 500 — should soft-fail with 200 + ok=false
        assert resp.status_code == 200, f"expected 200 (soft-fail), got {resp.status_code}"
        data = resp.json()
        assert data.get("ok") is False
        msg = data.get("message") or ""
        assert "unknown_thing" in msg
        assert "supported nahi" in msg.lower() or "supported" in msg.lower()
