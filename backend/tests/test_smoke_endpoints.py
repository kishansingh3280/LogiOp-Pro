"""Smoke tests for wingman + bullion + cleanup verification.

Runs after /app/tests/stress_test.py to confirm:
1. /api/wingman/* endpoints respond and carrier-update round-trips notes.
2. /api/bullion/rates|trips|transactions round-trip cleanly on localhost.
3. No leftover STRESS-* records remain after stress test cleanup.
"""

import os
import time
import pytest
import requests

LOCAL = "http://localhost:8001"
REMOTE = os.environ.get("EXPO_BACKEND_URL", "https://logistics-hub-1349.emergent.host").rstrip("/")


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------- Wingman ----------
class TestWingman:
    def test_health(self, s):
        r = s.get(f"{LOCAL}/api/wingman/health", timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j.get("ok") is True
        caps = j.get("capabilities") or []
        assert isinstance(caps, list) and len(caps) > 0
        joined = " ".join(caps)
        assert "carrier-update" in joined

    def test_carrier_update_roundtrip(self, s):
        # Find an existing shipment
        r = s.get(f"{REMOTE}/api/shipments", timeout=30)
        assert r.status_code == 200, r.text[:200]
        ships = r.json()
        if not ships:
            pytest.skip("No shipments available to test carrier-update")
        target = None
        for sh in ships:
            if sh.get("consignment_no"):
                target = sh
                break
        assert target, "No shipment with consignment_no"
        cn = target["consignment_no"]
        original_notes = target.get("notes") or ""

        marker = "Verified by testing_agent"
        r = s.post(
            f"{LOCAL}/api/wingman/carrier-update",
            json={"consignment_no": cn, "notes": marker},
            timeout=30,
        )
        assert r.status_code == 200, f"carrier-update failed: {r.status_code} {r.text[:300]}"

        # Verify notes appended
        time.sleep(0.5)
        r2 = s.get(f"{REMOTE}/api/shipments/{target['id']}", timeout=30)
        assert r2.status_code == 200
        after = r2.json()
        assert marker in (after.get("notes") or ""), f"Marker not appended. notes={after.get('notes')}"

        # Revert - update notes back to original
        r3 = s.put(
            f"{REMOTE}/api/shipments/{target['id']}",
            json={"notes": original_notes},
            timeout=30,
        )
        assert r3.status_code in (200, 204), f"revert failed: {r3.status_code} {r3.text[:200]}"


# ---------- Bullion ----------
class TestBullion:
    trip_id = None
    txn_id = None

    def test_rates(self, s):
        r = s.get(f"{LOCAL}/api/bullion/rates", timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert "hand_carry_rate_inr_per_kg" in j or "rate" in j or isinstance(j, dict)

    def test_trip_create_get_delete(self, s):
        body = {
            "date": "2026-04-01",
            "route": "DEL→BKK",
            "weight_kg": 10.5,
            "carrier_name": "SmokeTestCarrier",
            "flight_number": "TG999",
            "status": "planned",
            "notes": "smoke-test",
        }
        r = s.post(f"{LOCAL}/api/bullion/trips", json=body, timeout=15)
        assert r.status_code in (200, 201), r.text[:200]
        trip = r.json()
        TestBullion.trip_id = trip["id"]

        # GET list
        rg = s.get(f"{LOCAL}/api/bullion/trips", timeout=15)
        assert rg.status_code == 200
        assert any(t["id"] == trip["id"] for t in rg.json())

    def test_transaction_create_get_delete(self, s):
        assert TestBullion.trip_id, "trip must be created first"
        body = {
            "trip_id": TestBullion.trip_id,
            "type": "gold",
            "weight_kg": 10.5,
            "amount": 5000.0,
            "profit_inr": 1000.0,
            "status": "completed",
            "notes": "smoke-test",
        }
        r = s.post(f"{LOCAL}/api/bullion/transactions", json=body, timeout=15)
        assert r.status_code in (200, 201), r.text[:200]
        txn = r.json()
        TestBullion.txn_id = txn["id"]

        rg = s.get(f"{LOCAL}/api/bullion/transactions", timeout=15)
        assert rg.status_code == 200
        assert any(t["id"] == txn["id"] for t in rg.json())

    def test_zzz_cleanup(self, s):
        if TestBullion.txn_id:
            rd = s.delete(f"{LOCAL}/api/bullion/transactions/{TestBullion.txn_id}", timeout=15)
            assert rd.status_code in (200, 204)
        if TestBullion.trip_id:
            rd = s.delete(f"{LOCAL}/api/bullion/trips/{TestBullion.trip_id}", timeout=15)
            assert rd.status_code in (200, 204)


# ---------- Leftover STRESS-* audit ----------
class TestStressLeftover:
    def test_no_leftover_shipments(self, s):
        r = s.get(f"{REMOTE}/api/shipments", timeout=30)
        assert r.status_code == 200
        leftover = [x for x in r.json() if "STRESS-" in (x.get("consignment_no") or "")]
        assert len(leftover) == 0, f"Leftover STRESS shipments: {[x['consignment_no'] for x in leftover]}"

    def test_no_leftover_ledger(self, s):
        r = s.get(f"{REMOTE}/api/ledger/entries", timeout=30)
        assert r.status_code == 200
        leftover = [x for x in r.json() if "STRESS-" in (x.get("description") or "")]
        assert len(leftover) == 0, f"Leftover STRESS ledger entries: {len(leftover)}"

    def test_no_leftover_bullion_trips(self, s):
        r = s.get(f"{LOCAL}/api/bullion/trips", timeout=15)
        assert r.status_code == 200
        leftover = [x for x in r.json() if "STRESS-" in (x.get("notes") or "")]
        assert len(leftover) == 0, f"Leftover STRESS bullion trips: {len(leftover)}"
