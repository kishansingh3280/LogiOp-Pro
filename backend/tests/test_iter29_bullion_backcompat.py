"""Iter29 — Backward-compat coverage for BullionTrip route/direction mirroring.

Covers the 'direction<->route auto-fill' behaviour that was not exercised in
iter26/iter27/iter28. The BullionTrip model accepts either `direction` OR
`route` and mirrors the missing side onto the other so old clients don't
break.
"""
import os
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
    assert r.status_code == 200
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


class TestBullionTripDirectionRouteBackcompat:
    created_ids = []

    def _cleanup(self, api, auth_headers, tid):
        try:
            api.delete(
                f"{BASE_URL}/api/bullion/trips/{tid}",
                headers=auth_headers,
                timeout=15,
            )
        except Exception:
            pass

    def test_only_route_sets_direction(self, api, auth_headers):
        payload = {
            "date": "2026-03-01",
            "route": "TH_TO_IN",
            "carrier_name": f"TEST_route_only_{uuid.uuid4().hex[:6]}",
            "available_weight_kg": 5,
        }
        r = api.post(
            f"{BASE_URL}/api/bullion/trips",
            json=payload,
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code in (200, 201), r.text
        body = r.json()
        assert body.get("route") == "TH_TO_IN"
        assert body.get("direction") == "TH_TO_IN", (
            f"direction should mirror route; got: {body}"
        )
        TestBullionTripDirectionRouteBackcompat.created_ids.append(body["id"])
        self._cleanup(api, auth_headers, body["id"])

    def test_only_direction_sets_route(self, api, auth_headers):
        payload = {
            "date": "2026-03-02",
            "direction": "IN_TO_TH",
            "carrier_name": f"TEST_dir_only_{uuid.uuid4().hex[:6]}",
            "available_weight_kg": 7,
        }
        r = api.post(
            f"{BASE_URL}/api/bullion/trips",
            json=payload,
            headers=auth_headers,
            timeout=30,
        )
        assert r.status_code in (200, 201), r.text
        body = r.json()
        assert body.get("direction") == "IN_TO_TH"
        assert body.get("route") == "IN_TO_TH", (
            f"route should mirror direction; got: {body}"
        )
        TestBullionTripDirectionRouteBackcompat.created_ids.append(body["id"])
        self._cleanup(api, auth_headers, body["id"])
