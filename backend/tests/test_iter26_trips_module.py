"""Backend tests for iteration 26 — Trips module extension.

Verifies the new BullionTrip fields (direction↔route mirror, currency_type,
currency_amount, gold_baht, carry_charge_inr, shipment_ref) end-to-end.
"""

import os
import uuid
from typing import Any, Dict

import pytest
import requests

BASE_URL = (
    os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or os.environ.get("EXPO_BACKEND_URL")
).rstrip("/")
TIMEOUT = 30

AUTH_USER = {"username": "kishan", "password": "Kishan@Boss2026"}


@pytest.fixture(scope="module")
def api():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    r = sess.post(f"{BASE_URL}/api/auth/login", json=AUTH_USER, timeout=TIMEOUT)
    if r.status_code == 200:
        token = r.json().get("access_token")
        sess.headers["Authorization"] = f"Bearer {token}"
    return sess


class TestTripsExtension:
    """Sequential coverage of the new Trips-module fields."""

    STATE: Dict[str, Any] = {"id_a": None, "id_b": None, "id_c": None}

    def test_01_create_with_direction_and_all_new_fields(self, api):
        payload = {
            "date": "2026-01-27",
            "direction": "IN_TO_TH",
            "carrier_name": "TEST_CarrierA",
            "currency_type": "USD",
            "currency_amount": 5000,
            "gold_baht": 25.5,
            "carry_charge_inr": 3200,
            "shipment_ref": {"id": "ee2542a7-b140-4920-801c-618856b1b01f", "consignment_no": "CN-1040"},
            "available_weight_kg": 18,
            "notes": "TEST_iter26_full",
        }
        r = api.post(f"{BASE_URL}/api/bullion/trips", json=payload, timeout=TIMEOUT)
        assert r.status_code == 200, r.text[:500]
        j = r.json()
        assert j["direction"] == "IN_TO_TH"
        assert j["route"] == "IN_TO_TH", f"server must mirror direction→route; got route={j.get('route')!r}"
        assert j["currency_type"] == "USD"
        assert j["currency_amount"] == 5000
        assert j["gold_baht"] == 25.5
        assert j["carry_charge_inr"] == 3200
        assert j["shipment_ref"] == payload["shipment_ref"]
        assert j["available_weight_kg"] == 18
        assert "_id" not in j
        self.STATE["id_a"] = j["id"]

    def test_02_get_list_returns_created_trip_with_new_fields_intact(self, api):
        r = api.get(f"{BASE_URL}/api/bullion/trips", timeout=TIMEOUT)
        assert r.status_code == 200, r.text[:500]
        rows = r.json()
        row = next((t for t in rows if t.get("id") == self.STATE["id_a"]), None)
        assert row is not None, "created trip not found in GET list"
        assert row["currency_type"] == "USD"
        assert row["currency_amount"] == 5000
        assert row["gold_baht"] == 25.5
        assert row["carry_charge_inr"] == 3200
        assert row["shipment_ref"] == {"id": "ee2542a7-b140-4920-801c-618856b1b01f", "consignment_no": "CN-1040"}
        assert row["direction"] == "IN_TO_TH"
        assert row["route"] == "IN_TO_TH"

    def test_03_put_direction_updates_route_mirror(self, api):
        tid = self.STATE["id_a"]
        patch = {"direction": "TH_TO_IN"}
        r = api.put(f"{BASE_URL}/api/bullion/trips/{tid}", json=patch, timeout=TIMEOUT)
        assert r.status_code == 200, r.text[:500]
        j = r.json()
        assert j["direction"] == "TH_TO_IN"
        assert j["route"] == "TH_TO_IN", (
            f"PUT direction must mirror to route; got route={j.get('route')!r}"
        )

    def test_04_put_updates_currency_gold_charge_independently(self, api):
        tid = self.STATE["id_a"]
        patch = {"currency_amount": 6500, "gold_baht": 30.0, "carry_charge_inr": 4100}
        r = api.put(f"{BASE_URL}/api/bullion/trips/{tid}", json=patch, timeout=TIMEOUT)
        assert r.status_code == 200, r.text[:500]
        j = r.json()
        assert j["currency_amount"] == 6500
        assert j["gold_baht"] == 30.0
        assert j["carry_charge_inr"] == 4100
        # untouched fields preserved
        assert j["currency_type"] == "USD"
        assert j["direction"] == "TH_TO_IN"
        assert j["route"] == "TH_TO_IN"

    def test_05_backcompat_post_with_only_route_fills_direction(self, api):
        payload = {
            "date": "2026-01-27",
            "route": "IN_TO_TH",
            "carrier_name": "TEST_CarrierB_route_only",
            "available_weight_kg": 5,
            "notes": "TEST_iter26_route_only",
        }
        r = api.post(f"{BASE_URL}/api/bullion/trips", json=payload, timeout=TIMEOUT)
        assert r.status_code == 200, r.text[:500]
        j = r.json()
        assert j["route"] == "IN_TO_TH"
        assert j["direction"] == "IN_TO_TH", (
            f"server must fill direction from route; got {j.get('direction')!r}"
        )
        self.STATE["id_b"] = j["id"]

    def test_06_backcompat_post_with_only_direction_fills_route(self, api):
        payload = {
            "date": "2026-01-27",
            "direction": "TH_TO_IN",
            "carrier_name": "TEST_CarrierC_direction_only",
            "available_weight_kg": 5,
            "notes": "TEST_iter26_direction_only",
        }
        r = api.post(f"{BASE_URL}/api/bullion/trips", json=payload, timeout=TIMEOUT)
        assert r.status_code == 200, r.text[:500]
        j = r.json()
        assert j["direction"] == "TH_TO_IN"
        assert j["route"] == "TH_TO_IN", (
            f"server must fill route from direction; got {j.get('route')!r}"
        )
        self.STATE["id_c"] = j["id"]

    def test_07_delete_regression(self, api):
        for key in ("id_a", "id_b", "id_c"):
            tid = self.STATE.get(key)
            if not tid:
                continue
            r = api.delete(f"{BASE_URL}/api/bullion/trips/{tid}", timeout=TIMEOUT)
            assert r.status_code == 200, r.text[:500]
            assert r.json().get("ok") is True

        # confirm absence
        r = api.get(f"{BASE_URL}/api/bullion/trips", timeout=TIMEOUT)
        ids = {d.get("id") for d in r.json()}
        for key in ("id_a", "id_b", "id_c"):
            tid = self.STATE.get(key)
            if tid:
                assert tid not in ids
