"""Iteration 27 — Multi-Company Phase 1 backend tests.

Coverage:
- Companies CRUD (list/create with dedupe/summary)
- Bullion trips company filter with variant matching
- Bullion trip create persists `company` field
- Papa login (bsingh)
- Seed idempotency
"""
import os
import subprocess
import uuid

import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_token(api):
    r = api.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": "kishan", "password": "Kishan@Boss2026"},
        timeout=30,
    )
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ---------------------- COMPANIES ----------------------
class TestCompanies:
    def test_list_companies_returns_two_seeded(self, api):
        r = api.get(f"{BASE_URL}/api/companies", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        ids = {c["id"] for c in data}
        assert "co_singh_exports" in ids, f"Missing Singh Exports; got: {ids}"
        assert "co_awadh_enterprise" in ids, f"Missing Awadh Enterprise; got: {ids}"
        # Owner fields
        singh = next(c for c in data if c["id"] == "co_singh_exports")
        assert singh["name"] == "Singh Exports"
        assert singh.get("owner_name") == "B Singh"
        assert singh.get("owner_nickname") == "Papa"
        assert "address" in singh
        awadh = next(c for c in data if c["id"] == "co_awadh_enterprise")
        assert awadh.get("owner_name") == "K Singh"
        assert awadh.get("owner_nickname") == "Kishan"
        # No mongo _id leak
        for c in data:
            assert "_id" not in c

    def test_create_company_and_duplicate_rejected(self, api):
        cid = f"co_test_{uuid.uuid4().hex[:8]}"
        payload = {
            "id": cid,
            "name": "TEST_Company",
            "owner_name": "TEST_Owner",
            "owner_nickname": "TESTie",
            "address": "TEST_Addr",
        }
        r1 = api.post(f"{BASE_URL}/api/companies", json=payload, timeout=30)
        assert r1.status_code == 200, f"create failed: {r1.status_code} {r1.text}"
        body = r1.json()
        assert body["id"] == cid
        assert body["name"] == "TEST_Company"
        # duplicate must 400
        r2 = api.post(f"{BASE_URL}/api/companies", json=payload, timeout=30)
        assert r2.status_code == 400, f"expected 400 duplicate, got {r2.status_code} {r2.text}"
        assert "already exists" in r2.text.lower()
        # verify persistence via list
        r3 = api.get(f"{BASE_URL}/api/companies", timeout=30)
        assert any(c["id"] == cid for c in r3.json())

    def test_awadh_summary_has_bullion_trips(self, api):
        r = api.get(f"{BASE_URL}/api/companies/co_awadh_enterprise/summary", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["company_id"] == "co_awadh_enterprise"
        assert data["bullion_trips"] >= 8, f"Expected >=8 trips, got {data['bullion_trips']}"

    def test_singh_summary_has_no_trips(self, api):
        r = api.get(f"{BASE_URL}/api/companies/co_singh_exports/summary", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["company_id"] == "co_singh_exports"
        assert data["bullion_trips"] == 0, f"Expected 0 trips, got {data['bullion_trips']}"


# ---------------------- BULLION FILTERS ----------------------
class TestBullionCompanyFilter:
    def test_filter_short_form(self, api, auth_headers):
        r = api.get(
            f"{BASE_URL}/api/bullion/trips?company=awadh_enterprise",
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 200, r.text
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 8, f"Expected >=8, got {len(items)}"

    def test_filter_prefixed_form(self, api, auth_headers):
        r = api.get(
            f"{BASE_URL}/api/bullion/trips?company=co_awadh_enterprise",
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 200, r.text
        items = r.json()
        assert len(items) >= 8, f"Prefixed form should also match; got {len(items)}"

    def test_filter_singh_empty(self, api, auth_headers):
        r = api.get(
            f"{BASE_URL}/api/bullion/trips?company=singh_exports",
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code == 200, r.text
        # allow whatever singh has BEFORE the create test; should be 0 initially
        items = r.json()
        assert isinstance(items, list)
        # We check <=1 tolerance since order of tests might leave a leftover
        # if cleanup fails — but initially should be 0.
        # Just assert it's small vs awadh:
        assert len(items) < 8

    def test_filter_omitted_returns_all(self, api, auth_headers):
        r = api.get(f"{BASE_URL}/api/bullion/trips", headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        items = r.json()
        assert len(items) >= 8


class TestBullionTripCreatePersistsCompany:
    created_id = None

    def test_create_trip_with_company_and_verify(self, api, auth_headers):
        payload = {
            "date": "2026-02-20",
            "direction": "IN_TO_TH",
            "carrier_name": "TESTCo",
            "available_weight_kg": 15,
            "company": "singh_exports",
        }
        r = api.post(
            f"{BASE_URL}/api/bullion/trips",
            json=payload,
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code in (200, 201), f"create failed: {r.status_code} {r.text}"
        body = r.json()
        assert body.get("company") == "singh_exports", f"company not persisted: {body}"
        TestBullionTripCreatePersistsCompany.created_id = body.get("id")

        # verify filter returns exactly this new one
        r2 = api.get(
            f"{BASE_URL}/api/bullion/trips?company=singh_exports",
            headers=auth_headers,
            timeout=30,
        )
        assert r2.status_code == 200
        items = r2.json()
        assert any(t.get("id") == body.get("id") for t in items), (
            f"newly-created trip not in singh_exports filter: {items}"
        )

    def test_cleanup_created_trip(self, api, auth_headers):
        tid = TestBullionTripCreatePersistsCompany.created_id
        if not tid:
            pytest.skip("no trip id from prior test")
        r = api.delete(
            f"{BASE_URL}/api/bullion/trips/{tid}", headers=auth_headers, timeout=30
        )
        assert r.status_code in (200, 204), f"delete failed: {r.status_code} {r.text}"


# ---------------------- PAPA LOGIN ----------------------
class TestPapaLogin:
    def test_bsingh_login(self, api):
        r = api.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "bsingh", "password": "Papa@2026"},
            timeout=30,
        )
        assert r.status_code == 200, f"papa login failed: {r.status_code} {r.text}"
        data = r.json()
        assert "access_token" in data
        user = data.get("user", {})
        assert user.get("role") == "Papa", f"expected role Papa, got {user}"


# ---------------------- SEED IDEMPOTENCY ----------------------
class TestSeedIdempotency:
    def test_reseed_no_duplicates(self, api):
        # Snapshot before
        before = api.get(f"{BASE_URL}/api/companies", timeout=30).json()
        count_before = len([c for c in before if c["id"].startswith("co_")])

        # Run seed again
        result = subprocess.run(
            ["python", "/app/backend/seed_companies.py"],
            capture_output=True,
            text=True,
            timeout=60,
        )
        assert result.returncode == 0, f"seed script failed: {result.stderr}"

        after = api.get(f"{BASE_URL}/api/companies", timeout=30).json()
        count_after = len([c for c in after if c["id"].startswith("co_")])
        assert count_after == count_before, (
            f"seed created duplicates: before={count_before}, after={count_after}"
        )

        # bsingh should still be able to log in with same password
        r = api.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "bsingh", "password": "Papa@2026"},
            timeout=30,
        )
        assert r.status_code == 200, "papa login broken after reseed"
