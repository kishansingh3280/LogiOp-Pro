"""
Iter 88 — Bug batch (5 fixes) regression.

Backend coverage:
- Bug 5: /api/ledger/entries sorted DESC by date (latest first).
- Bug 1 (labelling): /api/live-rates payload has expected source keys used
  by new /bullion labels (sln_bullion + superrich_th; also intergold_th / xe).
- Regression: /api/parties/gstin/{gstin} still returns {valid, reason}.
- Regression: /api/dashboard/ledger-summary + /api/shipments + /api/invoices
  + /api/trips + /api/parties still 200.
"""

import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL")
if not BASE_URL:
    raise RuntimeError("EXPO_PUBLIC_BACKEND_URL not set")
BASE_URL = BASE_URL.rstrip("/")

ADMIN_USER = "kishan.singh3280@gmail.com"
ADMIN_PASS = "701A3ahig@"


@pytest.fixture(scope="module")
def auth_headers():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": ADMIN_USER, "password": ADMIN_PASS},
        timeout=15,
    )
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text[:200]}"
    tok = r.json().get("token") or r.json().get("access_token")
    assert tok, f"no token in login response: {r.json()}"
    return {
        "Authorization": f"Bearer {tok}",
        "Content-Type": "application/json",
        "X-Entry-Source": "manual",
    }


# ── Bug 5: Ledger entries sorted DESC by date ──────────────────────
class TestBug5LedgerSort:
    def test_ledger_entries_desc_sorted(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/ledger/entries", headers=auth_headers, timeout=15)
        assert r.status_code == 200, f"{r.status_code} {r.text[:200]}"
        entries = r.json()
        assert isinstance(entries, list), "entries not a list"
        if len(entries) < 2:
            pytest.skip(f"only {len(entries)} entries — cannot verify sort")

        def key(e):
            return str(e.get("date") or e.get("created_at") or "")

        dates = [key(e) for e in entries]
        # Verify descending: dates[i] >= dates[i+1] for all i
        for i in range(len(dates) - 1):
            assert dates[i] >= dates[i + 1], (
                f"ledger not desc-sorted at idx {i}: "
                f"{dates[i]!r} < {dates[i+1]!r}"
            )

    def test_ledger_first3_ge_last3(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/ledger/entries", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        entries = r.json()
        if len(entries) < 6:
            pytest.skip(f"need >=6 entries to compare first-3/last-3, got {len(entries)}")
        first3 = [str(e.get("date") or e.get("created_at") or "") for e in entries[:3]]
        last3 = [str(e.get("date") or e.get("created_at") or "") for e in entries[-3:]]
        assert min(first3) >= max(last3), (
            f"first3 {first3} not >= last3 {last3}"
        )


# ── Bug 1: Live rates payload structure (labels source of truth) ───
class TestBug1LiveRatesShape:
    def test_live_rates_has_required_sources(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/live-rates", headers=auth_headers, timeout=20)
        assert r.status_code == 200, f"{r.status_code} {r.text[:200]}"
        data = r.json()
        assert "sources" in data, f"missing sources: {list(data.keys())}"
        sources = data["sources"]
        # Bug 1 targets these two cards specifically; the frontend now renders
        # 'India Gold (per gram)' from sln_bullion + 'Booth Exchange (Bangkok)'
        # from superrich_th. Verify both keys exist in the payload.
        assert "sln_bullion" in sources, f"missing sln_bullion in sources: {list(sources.keys())}"
        assert "superrich_th" in sources, f"missing superrich_th in sources: {list(sources.keys())}"

    def test_sln_bullion_rate_keys(self, auth_headers):
        """India gold card reads gold_24k_1g_inr, gold_22k_1g_inr, silver_1kg_inr."""
        r = requests.get(f"{BASE_URL}/api/live-rates", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        sln = r.json().get("sources", {}).get("sln_bullion") or {}
        rates = sln.get("rates") or {}
        # At least one of the three should be present as a key (value may be
        # zero if scrape is stale, but the key wiring must exist).
        expected_keys = {"gold_24k_1g_inr", "gold_22k_1g_inr", "silver_1kg_inr"}
        assert expected_keys & set(rates.keys()), (
            f"sln_bullion.rates missing all of {expected_keys}: got {list(rates.keys())}"
        )

    def test_superrich_rate_keys(self, auth_headers):
        """Booth Exchange card reads inr_thb_buy, usd_thb_buy, sgd_thb_buy."""
        r = requests.get(f"{BASE_URL}/api/live-rates", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        sr = r.json().get("sources", {}).get("superrich_th") or {}
        rates = sr.get("rates") or {}
        expected_keys = {"inr_thb_buy", "usd_thb_buy", "sgd_thb_buy"}
        assert expected_keys & set(rates.keys()), (
            f"superrich_th.rates missing all of {expected_keys}: got {list(rates.keys())}"
        )


# ── Regression: GSTIN lookup shape unchanged ───────────────────────
class TestRegressionGstinLookup:
    def test_gstin_lookup_returns_shape(self, auth_headers):
        # Use a well-known-invalid GSTIN — response shape is what matters,
        # not whether it's valid.
        r = requests.get(
            f"{BASE_URL}/api/parties/gstin/29AAAAA0000A1Z5",
            headers=auth_headers,
            timeout=15,
        )
        assert r.status_code in (200, 404), f"{r.status_code} {r.text[:200]}"
        if r.status_code == 200:
            data = r.json()
            assert "valid" in data, f"gstin response missing valid: {data}"
            assert "reason" in data, f"gstin response missing reason: {data}"


# ── Regression: Core endpoints still 200 ────────────────────────────
class TestRegressionCoreEndpoints:
    @pytest.mark.parametrize("path", [
        "/api/parties",
        "/api/shipments",
        "/api/invoices",
        "/api/ledger/entries",
        "/api/dashboard/ledger-summary",
        "/api/trips",
        "/api/bullion/trips",
        "/api/bullion/vault",
        "/api/live-rates",
    ])
    def test_endpoint_200(self, auth_headers, path):
        r = requests.get(f"{BASE_URL}{path}", headers=auth_headers, timeout=20)
        assert r.status_code == 200, f"{path} → {r.status_code} {r.text[:150]}"


# ── Bug 5 (part 2): Party statement DESC order ─────────────────────
class TestBug5PartyStatementDesc:
    def test_party_statement_desc(self, auth_headers):
        """Any single party's ledger entries (filtered by party_id) should
        also be sorted DESC (same middleware applies)."""
        r = requests.get(f"{BASE_URL}/api/parties", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        parties = r.json()
        if not parties:
            pytest.skip("no parties in DB")
        # Find first party that has ledger entries
        for p in parties[:10]:
            pid = p.get("id")
            if not pid:
                continue
            r2 = requests.get(
                f"{BASE_URL}/api/ledger/entries?party_id={pid}",
                headers=auth_headers,
                timeout=15,
            )
            if r2.status_code != 200:
                continue
            arr = r2.json()
            if len(arr) < 2:
                continue
            dates = [str(e.get("date") or e.get("created_at") or "") for e in arr]
            for i in range(len(dates) - 1):
                assert dates[i] >= dates[i + 1], (
                    f"party {pid} ledger not desc: idx {i} {dates[i]!r} < {dates[i+1]!r}"
                )
            return
        pytest.skip("no party with >=2 ledger entries found")
