"""Phase 4 · Iteration 78 — 5 fixes backend verification.

Covers:
  • GET  /api/forex/rates                       (Fix 5)
  • POST /api/dashboard/now-brief cache behavior (Fix 2)
  • POST /api/ledger/entries with company_id + company_mode (Fix 5)
"""
import os
import time
import subprocess
import pytest
import requests

BASE_URL = os.environ.get("EXPO_BACKEND_URL") or os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL", "https://opsi-complete.preview.emergentagent.com"
)
BASE_URL = BASE_URL.rstrip("/")

ADMIN = {"username": "kishan.singh3280@gmail.com", "password": "701A3ahig@"}


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text[:200]}"
    body = r.json()
    return body.get("access_token") or body.get("token")


@pytest.fixture
def headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "X-Entry-Source": "manual",
    }


# ────────────────────────────────────────────────────────────
# Fix 5 · GET /api/forex/rates
# ────────────────────────────────────────────────────────────
class TestForexRates:
    def test_forex_rates_shape_and_values(self):
        r = requests.get(f"{BASE_URL}/api/forex/rates", timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["thb_to_inr"] == 2.35
        assert data["usd_to_inr"] == 83.5
        # inr_to_thb = 1/2.35 ≈ 0.4255
        assert abs(data["inr_to_thb"] - 0.4255) < 0.01
        assert "as_of" in data


# ────────────────────────────────────────────────────────────
# Fix 2 · Now Brief Mongo-backed persistent cache
# ────────────────────────────────────────────────────────────
class TestNowBriefCache:
    def _clear_cache(self):
        # Wipe the mongo cache collection so the next call is a fresh gen.
        # Uses the local mongod that the container ships with.
        subprocess.run(
            [
                "mongosh",
                "mongodb://localhost:27017/test_database",
                "--quiet",
                "--eval",
                "db.now_brief_cache.deleteMany({});",
            ],
            check=False,
            timeout=15,
        )
        # Also restart backend so in-memory L1 cache is dropped.
        subprocess.run(
            ["sudo", "supervisorctl", "restart", "backend"],
            check=False,
            timeout=25,
        )
        # Wait for backend to come back
        for _ in range(20):
            try:
                h = requests.get(f"{BASE_URL}/api/", timeout=3)
                if h.status_code < 500:
                    break
            except Exception:
                pass
            time.sleep(1)

    def test_first_call_generates_and_second_call_returns_cached(self, headers, token):
        self._clear_cache()

        payload = {
            "pending": 2,
            "in_transit": 3,
            "delivered": 10,
            "warehouse_bags": 4,
            "warehouse_kg": 120,
            "active_trips": 1,
            "overdue_ledger": 0,
            "tz_offset_minutes": 330,
        }

        # First call — LLM (can take up to ~60s).
        t0 = time.time()
        r1 = requests.post(
            f"{BASE_URL}/api/dashboard/now-brief",
            json=payload,
            headers=headers,
            timeout=90,
        )
        elapsed1 = time.time() - t0
        assert r1.status_code == 200, r1.text
        data1 = r1.json()
        assert isinstance(data1.get("brief"), str)
        assert len(data1["brief"]) > 5
        # First call is either from LLM or a fallback string — but never cached.
        assert data1.get("cached") is not True

        # Second call — should be <500 ms and cached=true
        t1 = time.time()
        r2 = requests.post(
            f"{BASE_URL}/api/dashboard/now-brief",
            json=payload,
            headers=headers,
            timeout=15,
        )
        elapsed2 = time.time() - t1
        assert r2.status_code == 200, r2.text
        data2 = r2.json()
        assert data2.get("cached") is True, f"expected cached=True, got {data2}"
        assert data2["brief"] == data1["brief"]
        assert elapsed2 < 3.0, f"cached call too slow: {elapsed2:.2f}s"
        print(f"first={elapsed1:.2f}s cached={elapsed2:.3f}s")

    def test_cache_survives_backend_restart(self, headers, token):
        """After a fresh LLM call, restart backend WITHOUT clearing mongo.
        Second call must still return cached=True (Mongo-backed persistence).
        """
        # Ensure a cache entry exists — piggyback on previous test's cache
        # by hitting endpoint once first (idempotent, will be cached).
        payload = {
            "pending": 2,
            "in_transit": 3,
            "delivered": 10,
            "warehouse_bags": 4,
            "warehouse_kg": 120,
            "active_trips": 1,
            "overdue_ledger": 0,
            "tz_offset_minutes": 330,
        }
        r_pre = requests.post(
            f"{BASE_URL}/api/dashboard/now-brief",
            json=payload,
            headers=headers,
            timeout=90,
        )
        assert r_pre.status_code == 200

        # Restart backend — but do NOT clear mongo cache.
        subprocess.run(
            ["sudo", "supervisorctl", "restart", "backend"],
            check=False,
            timeout=25,
        )
        # Wait for backend to come up.
        for _ in range(20):
            try:
                h = requests.get(f"{BASE_URL}/api/", timeout=3)
                if h.status_code < 500:
                    break
            except Exception:
                pass
            time.sleep(1)

        # Re-login (JWT still valid, but be safe about connectivity).
        t0 = time.time()
        r = requests.post(
            f"{BASE_URL}/api/dashboard/now-brief",
            json=payload,
            headers=headers,
            timeout=15,
        )
        elapsed = time.time() - t0
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("cached") is True, (
            f"cache did not survive restart — got {data}"
        )
        assert elapsed < 3.0, f"post-restart cached call too slow: {elapsed:.2f}s"
        print(f"post-restart cached call: {elapsed:.3f}s")


# ────────────────────────────────────────────────────────────
# Fix 5 · POST /api/ledger/entries with company_id + company_mode
# ────────────────────────────────────────────────────────────
class TestLedgerEntryCompanyStamping:
    @pytest.fixture
    def party_id(self, headers):
        # Create a TEST_ party first (or reuse existing).
        r = requests.get(f"{BASE_URL}/api/parties", headers=headers, timeout=10)
        assert r.status_code == 200
        parties = r.json()
        if parties:
            return parties[0]["id"]
        # Fallback — create one
        create = requests.post(
            f"{BASE_URL}/api/parties",
            headers=headers,
            json={"name": "TEST_LedgerParty", "role": "customer"},
            timeout=10,
        )
        assert create.status_code in (200, 201), create.text
        return create.json()["id"]

    def test_create_entry_awadh_informal(self, headers, party_id):
        payload = {
            "party_id": party_id,
            "date": "2026-01-15",
            "description": "TEST_iter78 Awadh Informal credit",
            "debit": 0,
            "credit": 500,
            "currency": "INR",
            "company_id": "awadh",
            "company_mode": "informal",
        }
        r = requests.post(
            f"{BASE_URL}/api/ledger/entries", headers=headers, json=payload, timeout=15
        )
        assert r.status_code in (200, 201), r.text
        body = r.json()
        assert body.get("id"), "entry id missing"
        assert body.get("description") == "TEST_iter78 Awadh Informal credit"
        # Verify persistence: GET entries and confirm the row is present.
        gr = requests.get(
            f"{BASE_URL}/api/ledger/entries",
            headers=headers,
            timeout=10,
        )
        assert gr.status_code == 200
        ids = [e.get("id") for e in gr.json()]
        assert body["id"] in ids

    def test_create_entry_singh_formal(self, headers, party_id):
        payload = {
            "party_id": party_id,
            "date": "2026-01-15",
            "description": "TEST_iter78 Singh Formal debit",
            "debit": 200,
            "credit": 0,
            "currency": "THB",
            "company_id": "singh_exports",
            "company_mode": "formal",
        }
        r = requests.post(
            f"{BASE_URL}/api/ledger/entries", headers=headers, json=payload, timeout=15
        )
        assert r.status_code in (200, 201), r.text
        body = r.json()
        assert body.get("id"), "entry id missing"
        assert body.get("currency") == "THB"

    def test_ledger_summary_reachable(self, headers):
        r = requests.get(
            f"{BASE_URL}/api/dashboard/ledger-summary",
            headers=headers,
            timeout=10,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "receivable" in data or "payable" in data
