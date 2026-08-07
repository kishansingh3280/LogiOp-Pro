"""Iteration 15 backend tests.

Covers:
1. PUT /api/parties/{id} accepts `verified_up_to` and echoes it back
   via GET /api/parties/{id} + list GET /api/parties. Revert to null.
2. GET /api/invoices rows expose `shipment_id` (may be null). If any
   row is linked, confirm the referenced shipment still exists.
3. Regression: Lalit FY 2026-27 running balance still INR +5000 /
   THB +13703.8.
4. Regression: /api/wingman/health + /api/bullion/rates still 200.
"""

from __future__ import annotations

import datetime as dt
import os
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


# ---------- FY math mirror (from iter 14) ----------
FY_START_MONTH = 4


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


# ---------- 1. Party.verified_up_to round-trip ----------

class TestPartyVerifiedUpTo:
    """PUT verified_up_to on Lalit, confirm via GET, then revert."""

    TARGET_DATE = "2026-08-07"

    def test_field_present_in_get(self, s):
        r = s.get(f"{REMOTE}/api/parties/{LALIT_ID}", timeout=30)
        assert r.status_code == 200, r.text[:300]
        p = r.json()
        # Key must exist in the shape, even if null.
        assert "verified_up_to" in p, f"verified_up_to field missing from party payload: {list(p.keys())}"

    def test_put_verified_up_to_and_revert(self, s):
        # Snapshot original value so we can revert regardless of prior state.
        r0 = s.get(f"{REMOTE}/api/parties/{LALIT_ID}", timeout=30)
        assert r0.status_code == 200
        original = r0.json().get("verified_up_to")

        # PUT the new value
        r1 = s.put(
            f"{REMOTE}/api/parties/{LALIT_ID}",
            json={"verified_up_to": self.TARGET_DATE},
            timeout=30,
        )
        assert r1.status_code in (200, 204), f"PUT verified_up_to failed: {r1.status_code} {r1.text[:300]}"

        # Confirm on the singleton GET
        r2 = s.get(f"{REMOTE}/api/parties/{LALIT_ID}", timeout=30)
        assert r2.status_code == 200
        got = r2.json().get("verified_up_to")
        # Backend may return the ISO date or a full datetime; both must
        # start with the requested date.
        assert got is not None, "verified_up_to came back null after PUT"
        assert str(got).startswith(self.TARGET_DATE), (
            f"verified_up_to mismatch: expected startswith {self.TARGET_DATE} got {got}"
        )

        # Confirm the same value is also visible in the list endpoint.
        r3 = s.get(f"{REMOTE}/api/parties", timeout=30)
        assert r3.status_code == 200
        row = next((p for p in r3.json() if p.get("id") == LALIT_ID), None)
        assert row is not None
        list_val = row.get("verified_up_to")
        assert list_val is not None and str(list_val).startswith(self.TARGET_DATE), (
            f"list-endpoint verified_up_to mismatch: got {list_val}"
        )

        # Revert to original (null or previous)
        rrev = s.put(
            f"{REMOTE}/api/parties/{LALIT_ID}",
            json={"verified_up_to": original},
            timeout=30,
        )
        assert rrev.status_code in (200, 204), f"revert failed: {rrev.status_code} {rrev.text[:200]}"
        r4 = s.get(f"{REMOTE}/api/parties/{LALIT_ID}", timeout=30)
        after = r4.json().get("verified_up_to")
        # Should equal original (both may be None)
        assert after == original, f"revert didn't restore: original={original} after={after}"


# ---------- 2. Invoice ↔ Shipment link ----------

class TestInvoiceShipmentLink:
    def test_invoices_have_shipment_id_field(self, s):
        r = s.get(f"{REMOTE}/api/invoices", timeout=30)
        assert r.status_code == 200, r.text[:300]
        invoices = r.json()
        assert isinstance(invoices, list), "invoices must be a list"
        assert len(invoices) > 0, "expected at least one invoice"
        # Every row must EXPOSE the key (value may be null).
        missing = [i.get("number") or i.get("id") for i in invoices if "shipment_id" not in i]
        assert not missing, f"invoices missing shipment_id field: {missing}"

    def test_linked_invoice_references_real_shipment_when_present(self, s):
        r = s.get(f"{REMOTE}/api/invoices", timeout=30)
        invoices = r.json()
        linked = [i for i in invoices if i.get("shipment_id")]
        if not linked:
            # Acceptable per the request — just log it.
            pytest.skip(
                f"No invoice currently carries a non-null shipment_id "
                f"(checked {len(invoices)}). Iteration allows this."
            )
        # If any invoice IS linked, its shipment must actually exist.
        for inv in linked:
            sid = inv["shipment_id"]
            r2 = s.get(f"{REMOTE}/api/shipments/{sid}", timeout=30)
            assert r2.status_code == 200, (
                f"invoice {inv.get('number')} links to shipment {sid} but GET returned {r2.status_code}"
            )


# ---------- 3. Regression: Lalit FY 2026-27 balance ----------

class TestLalitFY2026_27Balance:
    """Iter 14 established: Lalit closing FY 2026-27 = INR +5000, THB +13703.8."""

    EXPECTED_INR = 5000.0
    EXPECTED_THB = 13703.8

    def _lalit_entries(self, s):
        r = s.get(f"{REMOTE}/api/ledger/entries", timeout=30)
        assert r.status_code == 200
        return [e for e in r.json() if e.get("party_id") == LALIT_ID]

    def test_closing_balance_fy_2026_27(self, s):
        entries = self._lalit_entries(s)
        fy = "2026-27"
        filtered = [e for e in entries if _is_in_fy(e.get("date"), fy)]
        buckets = defaultdict(lambda: {"debit": 0.0, "credit": 0.0})
        for e in filtered:
            c = (e.get("currency") or "INR").upper()
            buckets[c]["debit"] += e.get("debit") or 0
            buckets[c]["credit"] += e.get("credit") or 0
        inr_close = buckets["INR"]["debit"] - buckets["INR"]["credit"]
        thb_close = buckets["THB"]["debit"] - buckets["THB"]["credit"]
        assert round(inr_close, 2) == self.EXPECTED_INR, (
            f"FY 2026-27 Lalit INR mismatch: got {inr_close} expected {self.EXPECTED_INR}"
        )
        assert round(thb_close, 2) == self.EXPECTED_THB, (
            f"FY 2026-27 Lalit THB mismatch: got {thb_close} expected {self.EXPECTED_THB}"
        )


# ---------- 4. Regression smoke on localhost ----------

class TestLocalRegression:
    def test_wingman_health_ok(self, s):
        r = s.get(f"{LOCAL}/api/wingman/health", timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_bullion_rates_ok(self, s):
        r = s.get(f"{LOCAL}/api/bullion/rates", timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert "hand_carry_rate_inr_per_kg" in j
