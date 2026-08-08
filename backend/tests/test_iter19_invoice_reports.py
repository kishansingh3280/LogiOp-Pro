"""Iteration 19 backend tests.

Covers:
  - 5-instance invoice create round-trip (Create -> GET -> DELETE flow used
    by the frontend save button).
  - 404 on GET after DELETE (drives the branded error card).
  - Read endpoints used by /reports console (invoices, shipments, parties,
    bullion transactions).
"""
import os
import time
import uuid

import pytest
import requests

BASE_URL = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL",
    "https://logistics-ai-hub-18.preview.emergentagent.com",
).rstrip("/")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def a_party(api):
    r = api.get(f"{BASE_URL}/api/parties", timeout=10)
    assert r.status_code == 200
    parties = [p for p in r.json() if p.get("role") in ("customer", "end_customer")]
    assert parties, "Need at least one customer party"
    return parties[0]


# --- Bug fix: 5-instance invoice create / persist / delete ---------------
class TestInvoice5Instances:
    created_ids: list[str] = []

    def test_create_5_invoices_persists(self, api, a_party):
        ts = int(time.time())
        for i in range(1, 6):
            payload = {
                "number": f"INV-VERIFY-{ts}-{i}",
                "date": "2026-06-15",
                "party_id": a_party["id"],
                "currency": "THB",
                "items": [{
                    "description": f"Verify test line {i}",
                    "quantity": 1,
                    "rate": 100.0,
                }],
                "tax_percent": 0,
            }
            t0 = time.time()
            r = api.post(f"{BASE_URL}/api/invoices", json=payload, timeout=15)
            elapsed = time.time() - t0
            assert r.status_code in (200, 201), f"iter {i}: {r.status_code} {r.text[:200]}"
            assert elapsed < 2, f"iter {i}: POST too slow ({elapsed:.2f}s)"
            body = r.json()
            assert "id" in body and body["id"]
            assert body.get("number") == payload["number"]
            TestInvoice5Instances.created_ids.append(body["id"])

            # Immediate GET must return the same record (the failing race
            # from the operator's report).
            g = api.get(f"{BASE_URL}/api/invoices/{body['id']}", timeout=10)
            assert g.status_code == 200, (
                f"iter {i}: newly-created invoice not fetchable immediately "
                f"({g.status_code}): {g.text[:200]}"
            )
            assert g.json().get("number") == payload["number"]

    def test_cleanup_delete_test_invoices(self, api):
        # Cleanup: verify deletes succeed AND subsequent GET is 404.
        for iid in TestInvoice5Instances.created_ids:
            d = api.delete(f"{BASE_URL}/api/invoices/{iid}", timeout=10)
            assert d.status_code in (200, 204), f"delete {iid}: {d.status_code}"
            g = api.get(f"{BASE_URL}/api/invoices/{iid}", timeout=10)
            assert g.status_code == 404


# --- 404 branded error card path -----------------------------------------
class Test404InvoicePath:
    def test_unknown_invoice_returns_404(self, api):
        r = api.get(f"{BASE_URL}/api/invoices/{uuid.uuid4()}", timeout=10)
        assert r.status_code == 404

    def test_delete_then_get_returns_404(self, api, a_party):
        # Create disposable invoice, delete it, confirm GET 404.
        payload = {
            "number": f"INV-VERIFY-DEL-{int(time.time())}",
            "date": "2026-06-15",
            "party_id": a_party["id"],
            "currency": "THB",
            "items": [{"description": "temp", "quantity": 1, "rate": 10.0}],
        }
        r = api.post(f"{BASE_URL}/api/invoices", json=payload, timeout=10)
        assert r.status_code in (200, 201)
        iid = r.json()["id"]
        d = api.delete(f"{BASE_URL}/api/invoices/{iid}", timeout=10)
        assert d.status_code in (200, 204)
        g = api.get(f"{BASE_URL}/api/invoices/{iid}", timeout=10)
        assert g.status_code == 404


# --- Reports Console data sources ----------------------------------------
class TestReportsDataSources:
    def test_invoices_list(self, api):
        t0 = time.time()
        r = api.get(f"{BASE_URL}/api/invoices", timeout=10)
        elapsed = time.time() - t0
        assert r.status_code == 200
        assert elapsed < 2, f"invoices too slow ({elapsed:.2f}s)"
        assert isinstance(r.json(), list)

    def test_shipments_list(self, api):
        r = api.get(f"{BASE_URL}/api/shipments", timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_parties_list(self, api):
        r = api.get(f"{BASE_URL}/api/parties", timeout=10)
        assert r.status_code == 200
        assert len(r.json()) >= 3

    def test_bullion_txns(self, api):
        r = api.get(f"{BASE_URL}/api/bullion/transactions", timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_bullion_trips(self, api):
        r = api.get(f"{BASE_URL}/api/bullion/trips", timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_shipment_bags_nested(self, api):
        # Packing list PDF depends on this endpoint per row.
        ships = api.get(f"{BASE_URL}/api/shipments", timeout=10).json()
        if not ships:
            pytest.skip("no shipments")
        sid = ships[0]["id"]
        r = api.get(f"{BASE_URL}/api/shipments/{sid}/bags", timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
