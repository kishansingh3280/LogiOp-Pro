"""Iteration 28 — Re-verify Papa auto-scope fix.

Focused re-test:
1. POST /api/auth/login for bsingh/Papa@2026 -> user.company == "co_singh_exports"
2. POST /api/auth/login for kishan/Kishan@Boss2026 -> user.company is None or absent

Only these two backend checks needed per iter28 review request.
"""
import os

import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------------------- PAPA AUTO-SCOPE ----------------------
class TestPapaLoginCompanyField:
    """Papa login MUST expose user.company for the frontend to auto-scope."""

    def test_papa_login_returns_company_field(self, api):
        r = api.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "bsingh", "password": "Papa@2026"},
            timeout=30,
        )
        assert r.status_code == 200, f"Papa login failed: {r.status_code} {r.text}"
        data = r.json()
        assert "access_token" in data, "Missing access_token"
        assert "user" in data, "Missing user object"
        user = data["user"]
        assert user["username"] == "bsingh"
        assert user["role"] == "Papa"
        assert user.get("company") == "co_singh_exports", (
            f"Papa user.company must be 'co_singh_exports' for frontend "
            f"auto-scoping; got: {user.get('company')!r}. Full user: {user}"
        )

    def test_papa_me_endpoint_returns_company_field(self, api):
        """Verify /auth/me also carries the company field (used on app rehydrate)."""
        login = api.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "bsingh", "password": "Papa@2026"},
            timeout=30,
        )
        assert login.status_code == 200
        tok = login.json()["access_token"]
        r = api.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {tok}"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        me = r.json()
        assert me.get("company") == "co_singh_exports", (
            f"/auth/me for Papa must include company=co_singh_exports; got: "
            f"{me.get('company')!r}"
        )


class TestAdminLoginNoCompany:
    """Admin login must NOT carry a company field (or must be None)."""

    def test_admin_login_company_is_none_or_absent(self, api):
        r = api.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "kishan", "password": "Kishan@Boss2026"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        user = data["user"]
        assert user["role"] == "Admin"
        # Admin may either omit "company" entirely or have it as None
        assert user.get("company") in (None, ""), (
            f"Admin user.company must be null/absent to preserve switcher "
            f"persistence; got: {user.get('company')!r}"
        )


# ---------------------- BULLION TRIPS SCOPE SANITY ----------------------
class TestBullionTripsScope:
    """Confirm Papa's scope has 0 trips and Awadh has 8 (seed baseline)."""

    def test_awadh_has_eight_trips(self, api):
        r = api.get(
            f"{BASE_URL}/api/bullion/trips?company=awadh_enterprise",
            timeout=30,
        )
        assert r.status_code == 200, r.text
        trips = r.json()
        assert isinstance(trips, list)
        # iter27 baseline was 8 seed trips; allow small drift from adhoc creates
        assert len(trips) >= 8, f"Expected >=8 Awadh trips; got {len(trips)}"

    def test_singh_exports_has_zero_trips(self, api):
        r = api.get(
            f"{BASE_URL}/api/bullion/trips?company=singh_exports",
            timeout=30,
        )
        assert r.status_code == 200, r.text
        trips = r.json()
        assert isinstance(trips, list)
        # Papa lands here and MUST see 0 seeded trips (all seed is Awadh)
        assert len(trips) == 0, (
            f"Singh Exports should have 0 seeded trips; got {len(trips)}: {trips}"
        )
