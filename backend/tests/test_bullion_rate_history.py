"""Iteration-17 backend tests: bullion rate history log + txn rate_snapshot freeze.

Focus areas per the review_request:
  1. POST /api/bullion/transactions with rate_snapshot_* fields round-trips them.
  2. PUT /api/bullion/rates with a real change writes a new row into
     GET /api/bullion/rates/history with correct diffs { from, to }, source,
     changed_by, ordered newest-first.
  3. PUT /api/bullion/rates with the SAME values does NOT add a history row
     (no-op guard).
  4. Cleanup: any created txn is DELETE'd at the end.

All tests share the module-level STATE dict, so they must live in a single
class (pytest-xdist `loadscope` pins one class -> one worker).
"""

import os
import time
from typing import Any, Dict

import pytest
import requests

BASE_URL = (
    os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or os.environ.get("EXPO_BACKEND_URL")
    or "http://localhost:8001"
).rstrip("/")
TIMEOUT = 30


@pytest.fixture(scope="class")
def s() -> requests.Session:
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


class TestBullionRatesHistoryAndSnapshot:
    STATE: Dict[str, Any] = {
        "orig_rates": None,
        "history_count_before": 0,
        "history_count_after_change": 0,
        "history_count_after_noop": 0,
        "created_txn_id": None,
    }

    # ---------- Setup: capture originals ------------------------------------
    def test_00_snapshot_originals(self, s):
        r = s.get(f"{BASE_URL}/api/bullion/rates", timeout=TIMEOUT)
        assert r.status_code == 200, r.text[:400]
        self.STATE["orig_rates"] = {
            k: r.json().get(k)
            for k in (
                "currency_rate_per_1000",
                "gold_rate_per_baht",
                "hand_carry_rate_inr_per_kg",
            )
        }
        r2 = s.get(f"{BASE_URL}/api/bullion/rates/history?limit=500", timeout=TIMEOUT)
        assert r2.status_code == 200, r2.text[:400]
        self.STATE["history_count_before"] = len(r2.json())

    # ---------- (1) txn rate_snapshot round-trip ----------------------------
    def test_01_txn_round_trips_rate_snapshot_fields(self, s):
        payload = {
            "type": "currency",
            "currency": "USD",
            "currency_amount": 1000,
            "purchase_rate_inr": 83.0,
            "exchange_rate_thb": 33.0,
            "weight_kg": 0.05,
            "rate_snapshot_currency_per_1000": 555,
            "rate_snapshot_gold_per_baht": 2650,
            "rate_snapshot_hand_carry_inr_per_kg": 240,
            "rate_snapshot_at": "2026-01-15T10:00:00Z",
            "notes": "TEST_iter17 snapshot round-trip",
        }
        r = s.post(f"{BASE_URL}/api/bullion/transactions", json=payload, timeout=TIMEOUT)
        assert r.status_code == 200, r.text[:400]
        j = r.json()
        assert j.get("id"), "no id on created txn"
        # Snapshot fields must survive the round trip verbatim (extra='allow')
        assert j.get("rate_snapshot_currency_per_1000") == 555, j
        assert j.get("rate_snapshot_gold_per_baht") == 2650, j
        assert j.get("rate_snapshot_hand_carry_inr_per_kg") == 240, j
        assert j.get("rate_snapshot_at") == "2026-01-15T10:00:00Z", j
        # Also confirm normal fields still round-trip alongside
        assert j.get("currency") == "USD"
        assert j.get("currency_amount") == 1000
        assert "_id" not in j
        self.STATE["created_txn_id"] = j["id"]

        # Re-fetch via list to confirm persistence
        r2 = s.get(f"{BASE_URL}/api/bullion/transactions", timeout=TIMEOUT)
        assert r2.status_code == 200
        match = next((d for d in r2.json() if d.get("id") == j["id"]), None)
        assert match, "created txn missing from list"
        assert match.get("rate_snapshot_currency_per_1000") == 555

    # ---------- (2) PUT rates with real change -> history row ---------------
    def test_02_put_rates_with_change_creates_history_row(self, s):
        orig = self.STATE["orig_rates"]
        assert orig, "originals not captured"
        # Bump currency_rate_per_1000 by +7 (deterministic distinct value)
        new_currency = float(orig["currency_rate_per_1000"] or 0) + 7
        payload = {
            "currency_rate_per_1000": new_currency,
            "gold_rate_per_baht": orig["gold_rate_per_baht"],
            "hand_carry_rate_inr_per_kg": orig["hand_carry_rate_inr_per_kg"],
            "changed_by": "TEST_iter17",
            "source": "app",
        }
        r = s.put(f"{BASE_URL}/api/bullion/rates", json=payload, timeout=TIMEOUT)
        assert r.status_code == 200, r.text[:400]
        j = r.json()
        assert j["currency_rate_per_1000"] == new_currency
        assert j.get("updated_at")

        # Small delay to ensure timestamp ordering is deterministic on the DB
        time.sleep(0.5)

        # History must have grown by exactly 1
        r2 = s.get(f"{BASE_URL}/api/bullion/rates/history?limit=500", timeout=TIMEOUT)
        assert r2.status_code == 200
        history = r2.json()
        self.STATE["history_count_after_change"] = len(history)
        assert (
            self.STATE["history_count_after_change"]
            == self.STATE["history_count_before"] + 1
        ), (
            f"expected +1 row; before={self.STATE['history_count_before']} "
            f"after={self.STATE['history_count_after_change']}"
        )

        # Newest-first ordering: first row must be the one we just wrote
        top = history[0]
        assert "diffs" in top and isinstance(top["diffs"], dict), top
        assert "currency_rate_per_1000" in top["diffs"], top["diffs"]
        d = top["diffs"]["currency_rate_per_1000"]
        assert "from" in d and "to" in d, d
        assert float(d["from"]) == float(orig["currency_rate_per_1000"])
        assert float(d["to"]) == float(new_currency)
        assert top.get("source") == "app"
        assert top.get("changed_by") == "TEST_iter17"
        assert top.get("timestamp")
        # Sort check: timestamps monotonically non-increasing
        ts = [h.get("timestamp") for h in history if h.get("timestamp")]
        assert ts == sorted(ts, reverse=True), "history not sorted newest-first"

        # Untouched keys should not have diffs
        assert "gold_rate_per_baht" not in top["diffs"]
        assert "hand_carry_rate_inr_per_kg" not in top["diffs"]

    # ---------- (3) No-op PUT does NOT add history --------------------------
    def test_03_put_rates_same_values_is_noop_for_history(self, s):
        # Re-read the just-updated rates so we PUT the exact same values
        r0 = s.get(f"{BASE_URL}/api/bullion/rates", timeout=TIMEOUT)
        assert r0.status_code == 200
        cur = r0.json()
        payload = {
            "currency_rate_per_1000": cur["currency_rate_per_1000"],
            "gold_rate_per_baht": cur["gold_rate_per_baht"],
            "hand_carry_rate_inr_per_kg": cur["hand_carry_rate_inr_per_kg"],
            "changed_by": "TEST_iter17_noop",
            "source": "app",
        }
        r = s.put(f"{BASE_URL}/api/bullion/rates", json=payload, timeout=TIMEOUT)
        assert r.status_code == 200, r.text[:400]

        time.sleep(0.5)
        r2 = s.get(f"{BASE_URL}/api/bullion/rates/history?limit=500", timeout=TIMEOUT)
        assert r2.status_code == 200
        history = r2.json()
        self.STATE["history_count_after_noop"] = len(history)
        assert (
            self.STATE["history_count_after_noop"]
            == self.STATE["history_count_after_change"]
        ), (
            "no-op PUT must not add a history row. "
            f"before-noop={self.STATE['history_count_after_change']} "
            f"after-noop={self.STATE['history_count_after_noop']}"
        )

    # ---------- (4) Regression: quick smoke on trips/txns/rates ------------
    def test_04_regression_smoke_lists_ok(self, s):
        for path in ("/api/bullion/trips", "/api/bullion/transactions", "/api/bullion/rates"):
            r = s.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
            assert r.status_code == 200, f"{path}: {r.status_code} {r.text[:200]}"

    # ---------- Cleanup ------------------------------------------------------
    def test_99_cleanup_restore_rates_and_delete_txn(self, s):
        # Restore rates to originals so we don't drift the operator's data.
        # This WILL add another history row (real change again) which is
        # expected & documented.
        orig = self.STATE["orig_rates"]
        if orig:
            s.put(
                f"{BASE_URL}/api/bullion/rates",
                json={
                    "currency_rate_per_1000": orig["currency_rate_per_1000"],
                    "gold_rate_per_baht": orig["gold_rate_per_baht"],
                    "hand_carry_rate_inr_per_kg": orig["hand_carry_rate_inr_per_kg"],
                    "changed_by": "TEST_iter17_cleanup",
                    "source": "app",
                },
                timeout=TIMEOUT,
            )
        # Delete created txn
        tid = self.STATE.get("created_txn_id")
        if tid:
            rd = s.delete(
                f"{BASE_URL}/api/bullion/transactions/{tid}", timeout=TIMEOUT
            )
            assert rd.status_code == 200, rd.text[:200]
