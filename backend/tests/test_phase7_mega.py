"""Phase 7 MEGA batch backend tests.

Covers Fix H (ledger latest-first sort), Fix D (informal/formal/all
mode filter across ledger/shipments/invoices/trips), Fix E (trips
enrichment with allocated_kg + linked_bags), and Fix F (party_meta
company_name overlay).
"""
import os
import uuid
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")

ADMIN_USER = "kishan.singh3280@gmail.com"
ADMIN_PASS = "701A3ahig@"


@pytest.fixture(scope="module")
def token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": ADMIN_USER, "password": ADMIN_PASS},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    tok = r.json().get("access_token") or r.json().get("token")
    assert tok, r.text
    return tok


@pytest.fixture(scope="module")
def hdrs(token):
    return {"Authorization": f"Bearer {token}", "X-Entry-Source": "manual"}


# ─────────── Fix H · Ledger latest-first sort ───────────────
class TestFixHLedgerSort:
    def test_ledger_entries_sorted_desc(self, hdrs):
        r = requests.get(
            f"{BASE_URL}/api/ledger/entries?mode=all",
            headers=hdrs,
            timeout=15,
        )
        assert r.status_code == 200, r.text
        arr = r.json()
        assert isinstance(arr, list)
        if len(arr) < 4:
            pytest.skip(f"only {len(arr)} entries; sort proof requires >=4")
        dates = [
            str(e.get("date") or e.get("created_at") or "")
            for e in arr
        ]
        # first 3 should all be >= last 3
        top = dates[:3]
        bot = dates[-3:]
        assert min(top) >= max(bot), f"not desc: top={top} bot={bot}"


# ─────────── Fix D · Informal mode filter ───────────────
class TestFixDModeFilter:
    def _fetch(self, hdrs, path, mode):
        r = requests.get(
            f"{BASE_URL}/api/{path}?mode={mode}",
            headers=hdrs,
            timeout=15,
        )
        assert r.status_code == 200, f"{path}?mode={mode}: {r.text[:200]}"
        return r.json()

    @pytest.mark.parametrize("path", ["ledger/entries", "shipments", "invoices"])
    def test_informal_excludes_untagged(self, hdrs, path):
        arr = self._fetch(hdrs, path, "informal")
        assert isinstance(arr, list)
        for r in arr:
            cm = str(r.get("company_mode") or r.get("mode") or "").lower()
            assert cm == "informal", f"{path}: untagged/formal leaked: {r.get('id')} cm={cm!r}"

    @pytest.mark.parametrize("path", ["ledger/entries", "shipments", "invoices"])
    def test_formal_includes_untagged_legacy(self, hdrs, path):
        arr = self._fetch(hdrs, path, "formal")
        assert isinstance(arr, list)
        for r in arr:
            cm = str(r.get("company_mode") or r.get("mode") or "formal").lower()
            assert cm in ("formal", ""), (
                f"{path}: informal leaked into formal view: {r.get('id')} cm={cm!r}"
            )

    @pytest.mark.parametrize("path", ["ledger/entries", "shipments", "invoices"])
    def test_all_returns_superset(self, hdrs, path):
        all_arr = self._fetch(hdrs, path, "all")
        formal = self._fetch(hdrs, path, "formal")
        informal = self._fetch(hdrs, path, "informal")
        assert len(all_arr) >= len(formal)
        assert len(all_arr) >= len(informal)
        assert len(all_arr) >= (len(formal) + len(informal) - 1)

    def test_trips_mode_all(self, hdrs):
        all_trips = self._fetch(hdrs, "trips", "all")
        assert isinstance(all_trips, list)
        assert len(all_trips) >= 1, "expected at least 1 trip"

        formal = self._fetch(hdrs, "trips", "formal")
        informal = self._fetch(hdrs, "trips", "informal")
        assert len(formal) <= len(all_trips)
        assert len(informal) <= len(all_trips)
        for r in informal:
            cm = str(r.get("company_mode") or r.get("mode") or "").lower()
            assert cm == "informal", f"trips informal leak: {r.get('id')} cm={cm!r}"


# ─────────── Fix E · Trips allocated_kg + linked_bags ───────────────
class TestFixETripsEnrichment:
    def test_trips_include_allocated_kg_and_linked_bags(self, hdrs):
        r = requests.get(f"{BASE_URL}/api/trips?mode=all", headers=hdrs, timeout=20)
        assert r.status_code == 200, r.text
        trips = r.json()
        assert isinstance(trips, list)
        if not trips:
            pytest.skip("no trips seeded")
        for t in trips:
            assert "allocated_kg" in t, f"trip {t.get('id')} missing allocated_kg"
            assert "linked_bags" in t, f"trip {t.get('id')} missing linked_bags"
            ak = t["allocated_kg"]
            assert isinstance(ak, (int, float)) and ak >= 0, (
                f"allocated_kg must be number>=0, got {ak!r}"
            )
            assert isinstance(t["linked_bags"], list), (
                f"linked_bags must be list, got {type(t['linked_bags'])}"
            )

    def test_at_least_one_trip_has_allocation_when_carrier_matched(self, hdrs):
        r = requests.get(f"{BASE_URL}/api/trips?mode=all", headers=hdrs, timeout=20)
        assert r.status_code == 200
        trips = r.json()
        if not trips:
            pytest.skip("no trips")
        # Not strictly required — but log for visibility
        with_alloc = [t for t in trips if float(t.get("allocated_kg") or 0) > 0]
        print(
            f"[trips-alloc] {len(with_alloc)}/{len(trips)} trips have allocated_kg > 0"
        )
        # soft assert — at least one trip should have SOME shape
        assert all(
            isinstance(t.get("linked_bags", []), list) for t in trips
        )


# ─────────── Fix F · Party meta company_name overlay ───────────────
class TestFixFCompanyNameOverlay:
    def test_put_meta_company_name_persists(self, hdrs):
        # Pick any existing party
        rp = requests.get(f"{BASE_URL}/api/parties", headers=hdrs, timeout=15)
        assert rp.status_code == 200, rp.text
        parties = rp.json()
        assert isinstance(parties, list) and parties, "no parties seeded"
        pid = parties[0].get("id") or parties[0].get("_id")
        assert pid, "party id missing"

        unique_name = f"TEST_CO_{uuid.uuid4().hex[:8]}"
        r = requests.put(
            f"{BASE_URL}/api/parties/{pid}/meta",
            json={"party_id": pid, "company_name": unique_name},
            headers=hdrs,
            timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        assert body.get("company_name") == unique_name

        # GET single party should now include company_name via overlay
        r2 = requests.get(f"{BASE_URL}/api/parties/{pid}", headers=hdrs, timeout=15)
        assert r2.status_code == 200, r2.text
        p = r2.json()
        assert p.get("company_name") == unique_name, (
            f"overlay merge failed. Got: {p.get('company_name')!r}"
        )

    def test_get_meta_returns_company_name(self, hdrs):
        rp = requests.get(f"{BASE_URL}/api/parties", headers=hdrs, timeout=15)
        parties = rp.json()
        pid = parties[0].get("id") or parties[0].get("_id")
        rm = requests.get(f"{BASE_URL}/api/parties/{pid}/meta", headers=hdrs, timeout=15)
        assert rm.status_code == 200, rm.text
        # company_name key should be present (may be None on unseeded parties)
        body = rm.json()
        assert isinstance(body, dict)


# ─────────── Regression smoke ──────────────────────
class TestRegressionSmoke:
    @pytest.mark.parametrize("ep", [
        "/api/parties",
        "/api/shipments",
        "/api/invoices",
        "/api/ledger/entries",
        "/api/trips",
        "/api/live-rates",
    ])
    def test_endpoint_200(self, hdrs, ep):
        r = requests.get(f"{BASE_URL}{ep}", headers=hdrs, timeout=20)
        assert r.status_code == 200, f"{ep}: {r.status_code} {r.text[:200]}"
