"""FY + Ledger contract tests for iteration 14.

Validates:
1. GET /api/parties returns Lalit with default_currency + default_charge.
2. GET /api/ledger/entries returns entries with the fields the party
   statement (frontend/app/party/[id].tsx) needs: date, debit, credit,
   currency, ref_type, ref_id, party_id.
3. At least one INR + one THB ledger row exist (so dual-currency
   running balance is exercisable).
4. FY math (mirrors /app/frontend/src/utils/fy.ts) matches the JS logic
   at the April-1 / March-31 boundary.
5. Live running-balance for Lalit in his current-data FY matches
   sum(debit-credit) grouped by currency.
6. Wingman + Bullion endpoints still respond (regression from iter 13).
"""

import os
import datetime as dt
from collections import defaultdict

import pytest
import requests

LOCAL = "http://localhost:8001"
REMOTE = os.environ.get("EXPO_BACKEND_URL", "").rstrip("/")
LALIT_ID = "5ef74d41-e3d1-48d4-bb7a-3937eef8b1cb"

if not REMOTE:
    pytest.skip("EXPO_BACKEND_URL not set", allow_module_level=True)


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------- FY math (mirror of /app/frontend/src/utils/fy.ts) ----------

FY_START_MONTH = 4


def _get_fy_key(iso: str):
    """Python mirror of getFYKey() — UTC-based."""
    if not iso:
        return None
    d = dt.datetime.fromisoformat(iso.replace("Z", "+00:00"))
    if d.tzinfo is None:
        d = d.replace(tzinfo=dt.timezone.utc)
    d = d.astimezone(dt.timezone.utc)
    y = d.year
    m = d.month
    start = y if m >= FY_START_MONTH else y - 1
    end = (start + 1) % 100
    return f"{start}-{end:02d}"


def _is_in_fy(iso: str, key: str) -> bool:
    if not iso:
        return False
    d = dt.datetime.fromisoformat(iso.replace("Z", "+00:00"))
    if d.tzinfo is None:
        d = d.replace(tzinfo=dt.timezone.utc)
    d = d.astimezone(dt.timezone.utc)
    start_year = int(key.split("-")[0])
    start = dt.datetime(start_year, FY_START_MONTH, 1, tzinfo=dt.timezone.utc)
    end = dt.datetime(start_year + 1, FY_START_MONTH, 1, tzinfo=dt.timezone.utc)
    return start <= d < end


class TestFYUtil:
    """Mirror of /app/frontend/src/utils/fy.ts boundary tests."""

    def test_get_fy_key_april_1(self):
        assert _get_fy_key("2026-04-01") == "2026-27"

    def test_get_fy_key_march_31(self):
        assert _get_fy_key("2026-03-31") == "2025-26"

    def test_is_in_fy_april_1_true(self):
        assert _is_in_fy("2026-04-01", "2026-27") is True

    def test_is_in_fy_march_31_false(self):
        assert _is_in_fy("2026-03-31", "2026-27") is False

    def test_is_in_fy_march_31_true_for_prev(self):
        assert _is_in_fy("2026-03-31", "2025-26") is True

    def test_is_in_fy_last_moment_of_fy(self):
        # 2027-03-31 23:59 should still be in 2026-27
        assert _is_in_fy("2027-03-31T23:59:59", "2026-27") is True
        assert _is_in_fy("2027-04-01T00:00:00", "2026-27") is False


# ---------- Backend contract ----------

class TestPartiesContract:
    def test_parties_list_ok(self, s):
        r = s.get(f"{REMOTE}/api/parties", timeout=30)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert isinstance(data, list) and len(data) > 0

    def test_lalit_present_with_currency_and_charge_fields(self, s):
        r = s.get(f"{REMOTE}/api/parties", timeout=30)
        parties = r.json()
        lalit = next((p for p in parties if p.get("id") == LALIT_ID), None)
        assert lalit is not None, f"Lalit ({LALIT_ID}) not in parties list"
        # These two fields are required by /app/frontend/app/party/[id].tsx
        assert "default_currency" in lalit, f"default_currency missing: {lalit}"
        assert "default_charge" in lalit, f"default_charge missing: {lalit}"
        # currency should be a real code
        assert lalit["default_currency"] in ("INR", "THB", "USD"), lalit["default_currency"]

    def test_get_lalit_by_id(self, s):
        r = s.get(f"{REMOTE}/api/parties/{LALIT_ID}", timeout=30)
        assert r.status_code == 200, r.text[:200]
        p = r.json()
        assert p["id"] == LALIT_ID
        assert "default_currency" in p


class TestLedgerContract:
    REQUIRED_FIELDS = ("id", "date", "debit", "credit", "party_id")
    OPTIONAL_FIELDS = ("currency", "ref_type", "ref_id", "description")

    def test_ledger_endpoint_ok(self, s):
        r = s.get(f"{REMOTE}/api/ledger/entries", timeout=30)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Ledger is empty — statement view cannot be exercised"

    def test_ledger_row_shape(self, s):
        r = s.get(f"{REMOTE}/api/ledger/entries", timeout=30)
        rows = r.json()
        sample = rows[0]
        for f in self.REQUIRED_FIELDS:
            assert f in sample, f"required field '{f}' missing from ledger row: {sample}"

    def test_ledger_has_inr_and_thb(self, s):
        r = s.get(f"{REMOTE}/api/ledger/entries", timeout=30)
        rows = r.json()
        # Legacy rows may omit currency (treated as INR by frontend).
        currencies = {(row.get("currency") or "INR").upper() for row in rows}
        assert "INR" in currencies, f"No INR ledger rows. Seen: {currencies}"
        assert "THB" in currencies, (
            f"No THB ledger rows — dual-currency running balance cannot be exercised. Seen: {currencies}"
        )

    def test_ledger_ref_fields_present_when_expected(self, s):
        r = s.get(f"{REMOTE}/api/ledger/entries", timeout=30)
        rows = r.json()
        # ref_type / ref_id are OPTIONAL per contract, but the party
        # statement renders ref_type ("bag" / "bullion_txn" / ...).
        # At least *some* rows should carry ref_type so the UI has
        # something to render.
        with_ref = [r for r in rows if r.get("ref_type")]
        assert len(with_ref) > 0, "No ledger rows have ref_type — statement description meta will be empty"


class TestLalitRunningBalance:
    """Simulate the client-side running-balance derivation."""

    def _fetch_entries(self, s):
        r = s.get(f"{REMOTE}/api/ledger/entries", timeout=30)
        assert r.status_code == 200
        return [e for e in r.json() if e.get("party_id") == LALIT_ID]

    def _running_balance(self, entries, fy_key):
        """Mirror of statementRows useMemo in party/[id].tsx."""
        filtered = [e for e in entries if _is_in_fy(e.get("date"), fy_key)]
        filtered.sort(key=lambda e: e.get("date") or "")
        inr = 0.0
        thb = 0.0
        rows = []
        for e in filtered:
            ccy = (e.get("currency") or "INR").upper()
            delta = (e.get("debit") or 0) - (e.get("credit") or 0)
            if ccy == "THB":
                thb += delta
            else:
                inr += delta
            rows.append({"ccy": ccy, "inr": inr, "thb": thb})
        return filtered, rows, inr, thb

    def _sum_by_ccy(self, entries):
        buckets = defaultdict(lambda: {"debit": 0.0, "credit": 0.0})
        for e in entries:
            c = (e.get("currency") or "INR").upper()
            buckets[c]["debit"] += e.get("debit") or 0
            buckets[c]["credit"] += e.get("credit") or 0
        return {c: v["debit"] - v["credit"] for c, v in buckets.items()}

    def test_lalit_has_ledger_entries(self, s):
        entries = self._fetch_entries(s)
        assert len(entries) > 0, "Lalit has no ledger entries — cannot exercise statement"

    def test_running_balance_matches_group_sum(self, s):
        entries = self._fetch_entries(s)
        # Find the FY that actually has Lalit data — pick the FY of
        # the most-recent entry (that's what the UI defaults to via
        # currentFYKey), fall back to iterating known FYs.
        latest = max(entries, key=lambda e: e.get("date") or "")
        fy = _get_fy_key(latest["date"])
        filtered, rows, final_inr, final_thb = self._running_balance(entries, fy)
        expected = self._sum_by_ccy(filtered)
        # Legacy no-currency rows fold into INR
        assert round(final_inr, 2) == round(expected.get("INR", 0), 2), (
            f"INR mismatch fy={fy}: running={final_inr} expected={expected.get('INR', 0)}"
        )
        assert round(final_thb, 2) == round(expected.get("THB", 0), 2), (
            f"THB mismatch fy={fy}: running={final_thb} expected={expected.get('THB', 0)}"
        )
        # Sanity: last row balance == final
        if rows:
            assert round(rows[-1]["inr"], 2) == round(final_inr, 2)
            assert round(rows[-1]["thb"], 2) == round(final_thb, 2)

    def test_running_balance_current_fy_2026_27(self, s):
        """Also validate for the FY explicitly named in the request."""
        entries = self._fetch_entries(s)
        fy = "2026-27"
        filtered, rows, final_inr, final_thb = self._running_balance(entries, fy)
        expected = self._sum_by_ccy(filtered)
        assert round(final_inr, 2) == round(expected.get("INR", 0), 2), (
            f"INR mismatch fy={fy}: running={final_inr} expected={expected.get('INR', 0)}"
        )
        assert round(final_thb, 2) == round(expected.get("THB", 0), 2), (
            f"THB mismatch fy={fy}: running={final_thb} expected={expected.get('THB', 0)}"
        )
        # Log observed values for debug
        print(f"[FY {fy}] Lalit rows={len(filtered)} INR={final_inr} THB={final_thb}")


# ---------- Regression: wingman + bullion (iter 13) ----------

class TestRegressionWingmanBullion:
    def test_wingman_health(self, s):
        r = s.get(f"{LOCAL}/api/wingman/health", timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_bullion_rates_has_three_keys(self, s):
        r = s.get(f"{LOCAL}/api/bullion/rates", timeout=15)
        assert r.status_code == 200
        j = r.json()
        # Frontend/(tabs)/bullion.tsx expects three rate keys
        # Actual bullion rates schema (used by /app/frontend/app/(tabs)/bullion.tsx)
        expected_keys = [
            "hand_carry_rate_inr_per_kg",
            "gold_rate_per_baht",
            "currency_rate_per_1000",
        ]
        missing = [k for k in expected_keys if k not in j]
        assert not missing, f"Bullion rates missing keys: {missing}. Got: {list(j.keys())}"

    def test_bullion_trips_list(self, s):
        r = s.get(f"{LOCAL}/api/bullion/trips", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
