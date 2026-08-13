"""Iteration 42 — /api/dashboard/now-brief endpoint tests.

Covers:
  - 401 when unauthenticated
  - 200 with valid auth, brief starts with 'Good ', contains '👉',
    len >= 30 chars, generated_at ISO timestamp present.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://opsi-complete.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": "kishan", "password": "Kishan@Boss2026"},
        timeout=30,
    )
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    tok = r.json().get("access_token") or r.json().get("token")
    assert tok, f"no token in login response: {r.json()}"
    return tok


@pytest.fixture(scope="module")
def payload():
    return {
        "pending": 3,
        "in_transit": 2,
        "delivered": 5,
        "warehouse_bags": 12,
        "warehouse_kg": 180,
        "active_trips": 1,
        "overdue_ledger": 2,
        "tz_offset_minutes": 330,
    }


class TestNowBriefAuth:
    def test_unauth_returns_401(self, payload):
        r = requests.post(
            f"{BASE_URL}/api/dashboard/now-brief",
            json=payload,
            timeout=30,
        )
        # 401 (or 403) — must NOT be 200
        assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}: {r.text[:200]}"


class TestNowBriefSuccess:
    def test_authenticated_returns_valid_brief(self, token, payload):
        r = requests.post(
            f"{BASE_URL}/api/dashboard/now-brief",
            json=payload,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            timeout=60,
        )
        assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text[:400]}"
        data = r.json()

        # brief present
        assert "brief" in data, f"missing 'brief' in {data}"
        brief = data["brief"]
        assert isinstance(brief, str), f"brief not str: {type(brief)}"
        assert len(brief) >= 30, f"brief too short ({len(brief)}): {brief!r}"

        # Greeting requirement
        assert brief.startswith("Good "), f"brief does not start with 'Good ': {brief!r}"

        # Next-action arrow required
        assert "👉" in brief, f"brief missing 👉: {brief!r}"

        # generated_at ISO timestamp
        assert "generated_at" in data, f"missing generated_at in {data}"
        ts = data["generated_at"]
        assert isinstance(ts, str) and len(ts) >= 10, f"bad ts: {ts!r}"
        # ISO parseable
        from datetime import datetime
        try:
            datetime.fromisoformat(ts.replace("Z", "+00:00"))
        except Exception as e:
            pytest.fail(f"generated_at not ISO parseable: {ts!r} — {e}")

    def test_brief_contains_display_name(self, token, payload):
        r = requests.post(
            f"{BASE_URL}/api/dashboard/now-brief",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=60,
        )
        assert r.status_code == 200
        brief = r.json()["brief"]
        # display_name for kishan is 'Kishan', honorific 'Sir'
        assert "Kishan" in brief, f"brief missing display_name 'Kishan': {brief!r}"
