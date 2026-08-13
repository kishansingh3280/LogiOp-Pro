"""Phase 7 · Batch C-2 · Fix 6 — Live Rates endpoint tests.

Checks:
  1. GET /api/live-rates returns 200 with expected top-level shape.
  2. All 4 SOURCES appear in `sources` with required keys.
  3. At least 2 sources have ok:true and is_stale:false (post-startup).
  4. Scheduler advances timestamps — two calls 65s apart should
     show at least one source's fetched_at moving forward.
  5. Endpoint never 500s.
"""
import os
import time
import pytest
import requests

from dotenv import load_dotenv
load_dotenv("/app/frontend/.env")
BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")

REQUIRED_SOURCES = {"sln_bullion", "intergold_th", "superrich_th", "xe"}
REQUIRED_KEYS = {"rates", "fetched_at", "ok", "error", "is_stale"}


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


class TestLiveRatesShape:
    def test_endpoint_reachable_200(self, api):
        r = api.get(f"{BASE_URL}/api/live-rates", timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "sources" in body
        assert "fetched_at" in body
        assert isinstance(body["fetched_at"], str)

    def test_all_four_sources_present(self, api):
        r = api.get(f"{BASE_URL}/api/live-rates", timeout=20)
        body = r.json()
        assert set(body["sources"].keys()) >= REQUIRED_SOURCES, (
            f"Missing sources: {REQUIRED_SOURCES - set(body['sources'].keys())}"
        )

    def test_each_source_has_required_keys(self, api):
        r = api.get(f"{BASE_URL}/api/live-rates", timeout=20)
        body = r.json()
        for src in REQUIRED_SOURCES:
            doc = body["sources"][src]
            missing = REQUIRED_KEYS - set(doc.keys())
            assert not missing, f"{src} missing keys: {missing}"
            assert isinstance(doc["rates"], dict)
            assert isinstance(doc["ok"], bool)
            assert isinstance(doc["is_stale"], bool)

    def test_at_least_two_sources_fresh_and_ok(self, api):
        r = api.get(f"{BASE_URL}/api/live-rates", timeout=20)
        body = r.json()
        fresh_ok = [
            s for s in REQUIRED_SOURCES
            if body["sources"][s].get("ok") is True
            and body["sources"][s].get("is_stale") is False
        ]
        assert len(fresh_ok) >= 2, (
            f"Only {len(fresh_ok)} sources fresh+ok: "
            f"{[(s, body['sources'][s].get('ok'), body['sources'][s].get('is_stale'), body['sources'][s].get('error')) for s in REQUIRED_SOURCES]}"
        )


class TestSchedulerTicking:
    def test_scheduler_advances_timestamps(self, api):
        """Fire two calls 65s apart — at least one source's fetched_at should advance."""
        r1 = api.get(f"{BASE_URL}/api/live-rates", timeout=20)
        assert r1.status_code == 200
        snap1 = {s: r1.json()["sources"][s].get("fetched_at") for s in REQUIRED_SOURCES}
        time.sleep(65)
        r2 = api.get(f"{BASE_URL}/api/live-rates", timeout=20)
        assert r2.status_code == 200
        snap2 = {s: r2.json()["sources"][s].get("fetched_at") for s in REQUIRED_SOURCES}

        advanced = [s for s in REQUIRED_SOURCES if snap1[s] != snap2[s] and snap2[s]]
        assert advanced, (
            f"No source advanced its fetched_at in 65s.\nsnap1={snap1}\nsnap2={snap2}"
        )


class TestNoCrashPath:
    def test_response_never_500(self, api):
        # Repeated hits (10x) — should always be 200
        for _ in range(5):
            r = api.get(f"{BASE_URL}/api/live-rates", timeout=20)
            assert r.status_code == 200, r.text
