"""Backend tests for Bullion REST endpoints (iteration 16).

Covers all 12 scenarios requested by the main agent:
    - Rates: default GET + PUT round-trip preserves values, updated_at set
    - Trips: create with full schema, legacy `available_slots` mirroring,
      list contains it, PUT preserves unrelated fields, DELETE removes it
    - Transactions: auto txn_no assignment, auto-increment, explicit txn_no
      honoured, PUT patches, DELETE cleans up

All tests live in ONE class so pytest-xdist's `--dist loadscope` (the
repository-mandated setting) pins them to the same worker. That's required
because ordered tests share the module-level STATE dict for created ids.
"""

import os
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


class TestBullionFlow:
    """Sequential end-to-end coverage of the Bullion module."""

    STATE: Dict[str, Any] = {
        "trip_id_full": None,
        "trip_id_legacy": None,
        "txn_id_currency": None,
        "txn_id_gold": None,
        "txn_id_explicit": None,
        "initial_max_txn": 0,
    }

    # ---------------------------------------------------------- Rates
    def test_01_get_rates_returns_defaults_or_persisted(self, s):
        r = s.get(f"{BASE_URL}/api/bullion/rates", timeout=TIMEOUT)
        assert r.status_code == 200, r.text[:500]
        j = r.json()
        for k in ("currency_rate_per_1000", "gold_rate_per_baht", "hand_carry_rate_inr_per_kg"):
            assert k in j, f"missing key {k}: {j}"
            assert isinstance(j[k], (int, float))
        assert "_id" not in j and "_singleton" not in j

    def test_02_put_rates_round_trip(self, s):
        payload = {
            "currency_rate_per_1000": 600,
            "gold_rate_per_baht": 2700,
            "hand_carry_rate_inr_per_kg": 250,
        }
        r = s.put(f"{BASE_URL}/api/bullion/rates", json=payload, timeout=TIMEOUT)
        assert r.status_code == 200, r.text[:500]
        j = r.json()
        assert j["currency_rate_per_1000"] == 600
        assert j["gold_rate_per_baht"] == 2700
        assert j["hand_carry_rate_inr_per_kg"] == 250
        assert j.get("updated_at"), "updated_at must be set"
        assert "_id" not in j and "_singleton" not in j

        # verify persistence
        r2 = s.get(f"{BASE_URL}/api/bullion/rates", timeout=TIMEOUT)
        j2 = r2.json()
        assert j2["currency_rate_per_1000"] == 600
        assert j2["gold_rate_per_baht"] == 2700
        assert j2["hand_carry_rate_inr_per_kg"] == 250

    # ---------------------------------------------------------- Trips
    def test_03_create_trip_full_payload_preserves_all_fields(self, s):
        payload = {
            "date": "2026-01-20",
            "route": "IN_TO_TH",
            "carrier_party_id": "party-TEST-001",
            "carrier_name": "TEST Carrier",
            "airline_code": "AI",
            "flight_number": "AI332",
            "available_weight_kg": 12.5,
            "notes": "TEST_full trip payload",
        }
        r = s.post(f"{BASE_URL}/api/bullion/trips", json=payload, timeout=TIMEOUT)
        assert r.status_code == 200, r.text[:500]
        j = r.json()
        for k, v in payload.items():
            assert j.get(k) == v, f"field {k}: got {j.get(k)!r} expected {v!r}"
        assert j.get("id")
        assert j.get("status") == "planned"
        assert "_id" not in j
        self.STATE["trip_id_full"] = j["id"]

    def test_04_create_trip_legacy_slots_mirrors_weight(self, s):
        payload = {
            "date": "2026-01-21",
            "route": "TH_TO_IN",
            "carrier_name": "Legacy TEST",
            "available_slots": 7,
            "notes": "TEST_legacy slot mirroring",
        }
        r = s.post(f"{BASE_URL}/api/bullion/trips", json=payload, timeout=TIMEOUT)
        assert r.status_code == 200, r.text[:500]
        j = r.json()
        assert j.get("available_slots") == 7
        assert j.get("available_weight_kg") == 7.0, (
            f"available_weight_kg should mirror available_slots (7). got {j.get('available_weight_kg')!r}"
        )
        self.STATE["trip_id_legacy"] = j["id"]

    def test_05_list_trips_contains_created(self, s):
        r = s.get(f"{BASE_URL}/api/bullion/trips", timeout=TIMEOUT)
        assert r.status_code == 200, r.text[:500]
        ids = {d.get("id") for d in r.json()}
        assert self.STATE["trip_id_full"] in ids
        assert self.STATE["trip_id_legacy"] in ids

    def test_06_update_trip_patch_preserves_other_fields(self, s):
        trip_id = self.STATE["trip_id_full"]
        assert trip_id, "trip_id_full missing"
        patch = {"notes": "TEST_updated notes", "airline_code": "TG"}
        r = s.put(f"{BASE_URL}/api/bullion/trips/{trip_id}", json=patch, timeout=TIMEOUT)
        assert r.status_code == 200, r.text[:500]
        j = r.json()
        assert j["notes"] == "TEST_updated notes"
        assert j["airline_code"] == "TG"
        # untouched fields preserved
        assert j.get("carrier_name") == "TEST Carrier"
        assert j.get("carrier_party_id") == "party-TEST-001"
        assert j.get("flight_number") == "AI332"
        assert j.get("route") == "IN_TO_TH"
        assert j.get("available_weight_kg") == 12.5

    # --------------------------------------------------- Transactions
    def _current_max_txn(self, s) -> int:
        r = s.get(f"{BASE_URL}/api/bullion/transactions", timeout=TIMEOUT)
        assert r.status_code == 200, r.text[:500]
        max_n = 0
        for d in r.json():
            tn = str(d.get("txn_no") or "")
            if tn.startswith("TXN-"):
                try:
                    max_n = max(max_n, int(tn.split("-", 1)[1]))
                except (ValueError, IndexError):
                    pass
        return max_n

    def test_07_capture_initial_max_txn(self, s):
        # Not part of the request spec but required so the assertions
        # below tolerate an environment that already has txns. The
        # spec's "TXN-001 initially" holds on a freshly-seeded DB.
        self.STATE["initial_max_txn"] = self._current_max_txn(s)

    def test_08_create_currency_txn_auto_txn_no(self, s):
        assert self.STATE["trip_id_full"], "trip must exist first"
        payload = {
            "type": "currency",
            "currency": "USD",
            "currency_amount": 1500,
            "purchase_rate_inr": 83.5,
            "exchange_rate_thb": 33.1,
            "weight_kg": 0.1,
            "trip_id": self.STATE["trip_id_full"],
        }
        r = s.post(f"{BASE_URL}/api/bullion/transactions", json=payload, timeout=TIMEOUT)
        assert r.status_code == 200, r.text[:500]
        j = r.json()
        expected = f"TXN-{str(self.STATE['initial_max_txn'] + 1).zfill(3)}"
        assert j.get("txn_no") == expected, (
            f"expected auto txn_no {expected} (spec says TXN-001 on empty DB), got {j.get('txn_no')!r}"
        )
        # currency-specific fields must round-trip verbatim
        assert j["currency"] == "USD"
        assert j["currency_amount"] == 1500
        assert j["purchase_rate_inr"] == 83.5
        assert j["exchange_rate_thb"] == 33.1
        assert j["weight_kg"] == 0.1
        assert j["trip_id"] == self.STATE["trip_id_full"]
        assert j["type"] == "currency"
        assert j.get("status") == "open"
        assert "_id" not in j
        self.STATE["txn_id_currency"] = j["id"]

    def test_09_create_gold_txn_increments_txn_no(self, s):
        payload = {
            "type": "gold",
            "gold_amount": 10,
            "gold_unit": "baht",
            "gold_purchase_thb": 100000,
            "gold_cost_inr": 270000,
            "gold_sale_inr": 300000,
            "weight_kg": 0.5,
        }
        r = s.post(f"{BASE_URL}/api/bullion/transactions", json=payload, timeout=TIMEOUT)
        assert r.status_code == 200, r.text[:500]
        j = r.json()
        expected = f"TXN-{str(self.STATE['initial_max_txn'] + 2).zfill(3)}"
        assert j.get("txn_no") == expected, (
            f"expected auto-incremented txn_no {expected} (spec says TXN-002 on empty DB), got {j.get('txn_no')!r}"
        )
        assert j["type"] == "gold"
        assert j["gold_amount"] == 10
        assert j["gold_unit"] == "baht"
        assert j["gold_purchase_thb"] == 100000
        assert j["gold_cost_inr"] == 270000
        assert j["gold_sale_inr"] == 300000
        assert j["weight_kg"] == 0.5
        self.STATE["txn_id_gold"] = j["id"]

    def test_10_create_txn_with_explicit_txn_no_is_kept(self, s):
        payload = {
            "type": "currency",
            "txn_no": "TXN-999",
            "currency": "SGD",
            "currency_amount": 200,
            "weight_kg": 0.02,
        }
        r = s.post(f"{BASE_URL}/api/bullion/transactions", json=payload, timeout=TIMEOUT)
        assert r.status_code == 200, r.text[:500]
        j = r.json()
        assert j.get("txn_no") == "TXN-999", (
            f"explicit txn_no was overwritten. got {j.get('txn_no')!r}"
        )
        assert j.get("currency") == "SGD"
        self.STATE["txn_id_explicit"] = j["id"]

    def test_11_update_txn_status_and_ledger(self, s):
        txn_id = self.STATE["txn_id_currency"]
        assert txn_id, "txn_id_currency missing"
        patch = {"status": "completed", "ledger_entry_id": "LEDG-TEST-42"}
        r = s.put(f"{BASE_URL}/api/bullion/transactions/{txn_id}", json=patch, timeout=TIMEOUT)
        assert r.status_code == 200, r.text[:500]
        j = r.json()
        assert j["status"] == "completed"
        assert j["ledger_entry_id"] == "LEDG-TEST-42"
        # untouched currency fields still preserved
        assert j["currency"] == "USD"
        assert j["currency_amount"] == 1500

    def test_12_delete_txn_and_verify_absent(self, s):
        for key in ("txn_id_currency", "txn_id_gold", "txn_id_explicit"):
            tid = self.STATE.get(key)
            if not tid:
                continue
            r = s.delete(f"{BASE_URL}/api/bullion/transactions/{tid}", timeout=TIMEOUT)
            assert r.status_code == 200, f"{key} delete failed: {r.text[:500]}"
            assert r.json().get("ok") is True

        # verify absence via list
        r = s.get(f"{BASE_URL}/api/bullion/transactions", timeout=TIMEOUT)
        assert r.status_code == 200
        ids = {d.get("id") for d in r.json()}
        for key in ("txn_id_currency", "txn_id_gold", "txn_id_explicit"):
            tid = self.STATE.get(key)
            if tid:
                assert tid not in ids, f"{key} still present after DELETE"

        # repeat DELETE returns 404
        stale = self.STATE.get("txn_id_currency")
        if stale:
            r2 = s.delete(f"{BASE_URL}/api/bullion/transactions/{stale}", timeout=TIMEOUT)
            assert r2.status_code == 404, f"expected 404 on repeat delete, got {r2.status_code}"

    def test_13_delete_trips_cleanup(self, s):
        for key in ("trip_id_full", "trip_id_legacy"):
            tid = self.STATE.get(key)
            if not tid:
                continue
            r = s.delete(f"{BASE_URL}/api/bullion/trips/{tid}", timeout=TIMEOUT)
            assert r.status_code == 200, f"{key} delete failed: {r.text[:500]}"
            assert r.json().get("ok") is True

        r = s.get(f"{BASE_URL}/api/bullion/trips", timeout=TIMEOUT)
        assert r.status_code == 200
        ids = {d.get("id") for d in r.json()}
        for key in ("trip_id_full", "trip_id_legacy"):
            tid = self.STATE.get(key)
            if tid:
                assert tid not in ids, f"{key} still present after DELETE"

        stale = self.STATE.get("trip_id_full")
        if stale:
            r2 = s.delete(f"{BASE_URL}/api/bullion/trips/{stale}", timeout=TIMEOUT)
            assert r2.status_code == 404
