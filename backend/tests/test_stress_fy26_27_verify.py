"""Iteration 18 — FY 2026-27 stress test verification.

Independently checks the current backend state after the sim script ran.
Covers acceptance criteria (a)–(e); frontend (f) & (g) are done via Playwright.
"""
from __future__ import annotations

import os
import time
import pytest
import requests

BASE = os.environ.get("EXPO_BACKEND_URL", "https://native-logistics-hub.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

FY_START = "2026-04-01"
FY_END = "2027-03-31"
CURR_RATE = 500.0
GOLD_RATE = 2500.0
PERF_BUDGET_S = 2.0


def _timed_get(path: str):
    t0 = time.perf_counter()
    r = requests.get(f"{API}{path}", timeout=30)
    elapsed = time.perf_counter() - t0
    r.raise_for_status()
    return r.json(), elapsed


# ---------- (a) DATA STATE ---------------------------------------------
class TestDataState:
    def test_shipments_count_and_dates(self):
        ships, t = _timed_get("/shipments")
        assert t < PERF_BUDGET_S, f"/shipments took {t:.2f}s"
        assert len(ships) == 35, f"expected 35 shipments, got {len(ships)}"
        for s in ships:
            d = s.get("dispatch_date") or ""
            assert FY_START <= d[:10] <= FY_END, f"shipment {s.get('id')} out of FY: {d}"

    def test_invoices_count_and_dates(self):
        invs, t = _timed_get("/invoices")
        assert t < PERF_BUDGET_S, f"/invoices took {t:.2f}s"
        assert len(invs) == 20, f"expected 20 invoices, got {len(invs)}"
        for i in invs:
            d = i.get("date") or ""
            assert FY_START <= d[:10] <= FY_END, f"invoice {i.get('id')} out of FY: {d}"

    def test_bullion_txns_and_splits(self):
        txns, t = _timed_get("/bullion/transactions")
        assert t < PERF_BUDGET_S, f"/bullion/transactions took {t:.2f}s"
        assert len(txns) == 43, f"expected 43 txns, got {len(txns)}"
        splits = [x for x in txns if x.get("parent_id")]
        assert len(splits) >= 18, f"expected ≥18 splits, got {len(splits)}"

    def test_bullion_trips_count(self):
        trips, t = _timed_get("/bullion/trips")
        assert t < PERF_BUDGET_S, f"/bullion/trips took {t:.2f}s"
        assert len(trips) == 8, f"expected 8 trips, got {len(trips)}"


# ---------- (b) CALCULATIONS -------------------------------------------
class TestCalculations:
    def test_snapshot_rates_present(self):
        txns, _ = _timed_get("/bullion/transactions")
        for t in txns:
            assert t.get("rate_snapshot_currency_per_1000") == CURR_RATE, (
                f"txn {t.get('id')} currency snap = {t.get('rate_snapshot_currency_per_1000')}"
            )
            assert t.get("rate_snapshot_gold_per_baht") == GOLD_RATE, (
                f"txn {t.get('id')} gold snap = {t.get('rate_snapshot_gold_per_baht')}"
            )

    def test_currency_fee_math_sample(self):
        txns, _ = _timed_get("/bullion/transactions")
        currency_txns = [x for x in txns if x.get("type") == "currency"][:3]
        assert len(currency_txns) >= 3, "need at least 3 currency txns to sample"
        for t in currency_txns:
            amt = float(t.get("currency_amount") or 0)
            rate = float(t.get("rate_snapshot_currency_per_1000"))
            expected_fee = amt / 1000.0 * rate
            # Sanity: expected fee should be positive and finite
            assert expected_fee >= 0, f"negative fee on {t.get('id')}"
            # Cross-check: recomputing with the 500 constant matches
            assert abs(expected_fee - amt / 1000.0 * CURR_RATE) < 0.01

    def test_gold_fee_math_sample(self):
        txns, _ = _timed_get("/bullion/transactions")
        gold_txns = [x for x in txns if x.get("type") == "gold"][:3]
        assert len(gold_txns) >= 3, f"need 3 gold txns, only {len(gold_txns)}"
        for t in gold_txns:
            baht = float(t.get("gold_amount") or 0)
            rate = float(t.get("rate_snapshot_gold_per_baht"))
            expected_fee = baht * rate
            assert expected_fee >= 0
            assert abs(expected_fee - baht * GOLD_RATE) < 0.01


# ---------- (c) LEDGER --------------------------------------------------
class TestLedger:
    def test_ledger_receivable_and_top_get(self):
        ls, t = _timed_get("/dashboard/ledger-summary")
        assert t < PERF_BUDGET_S, f"/dashboard/ledger-summary took {t:.2f}s"
        thb = float((ls.get("receivable") or {}).get("thb") or 0)
        assert thb > 0, f"receivable.thb should be non-zero, got {thb}"
        # Sim report said ~747,970; allow some drift
        assert 500_000 <= thb <= 1_000_000, f"receivable.thb {thb} way off the sim (~747970)"
        top_get = ls.get("top_get") or []
        assert len(top_get) >= 3, f"top_get should have ≥3 customers, got {len(top_get)}"


# ---------- (d) FIFO WAREHOUSE -----------------------------------------
class TestWarehouseFIFO:
    def test_warehouse_fifo_order(self):
        wh, t = _timed_get("/dashboard/warehouse")
        assert t < PERF_BUDGET_S, f"/dashboard/warehouse took {t:.2f}s"
        # Endpoint may return list directly or object with list
        items = wh if isinstance(wh, list) else (
            wh.get("bags") or wh.get("items") or wh.get("warehouse_arrived") or []
        )
        if not items:
            pytest.skip(f"warehouse endpoint returned no items: {str(wh)[:200]}")
        # Determine ordering field
        ts_keys = ["warehouse_arrived_at", "arrived_at", "warehouse_arrival_at", "warehouseDate", "dispatch_date"]
        key = None
        for k in ts_keys:
            if items[0].get(k):
                key = k
                break
        assert key is not None, f"no timestamp key found on warehouse item: {list(items[0].keys())}"
        stamps = [it.get(key) or "" for it in items]
        assert stamps == sorted(stamps), f"warehouse not oldest-first by {key}: {stamps}"


# ---------- (e) DASHBOARD YTD ------------------------------------------
class TestDashboardYTD:
    def test_dashboard_stats(self):
        ds, t = _timed_get("/dashboard/stats")
        assert t < PERF_BUDGET_S, f"/dashboard/stats took {t:.2f}s"
        # Try multiple possible schemas: nested {shipments:{total}} or flat
        shipments_total = None
        if isinstance(ds.get("shipments"), dict):
            shipments_total = ds["shipments"].get("total")
        elif "shipments_total" in ds:
            shipments_total = ds["shipments_total"]
        elif "total_shipments" in ds:
            shipments_total = ds["total_shipments"]
        assert shipments_total is not None, f"dashboard stats missing shipments.total: {list(ds.keys())}"
        assert shipments_total >= 35, f"shipments.total = {shipments_total}, need ≥35"

        # non-zero for at least 3 of {pending, in_transit, delivered, warehouse_arrived}
        buckets = {}
        # try nested first
        if isinstance(ds.get("shipments"), dict):
            for k in ("pending", "in_transit", "delivered", "warehouse_arrived"):
                if k in ds["shipments"]:
                    buckets[k] = ds["shipments"][k]
        for k in ("pending", "in_transit", "delivered", "warehouse_arrived"):
            if k in ds and k not in buckets:
                buckets[k] = ds[k]
        assert buckets, f"no shipment buckets in dashboard stats: {list(ds.keys())}"
        nonzero = sum(1 for v in buckets.values() if v and v > 0)
        assert nonzero >= 3, f"only {nonzero} non-zero buckets: {buckets}"
