"""Phase 7 · Batch C-2 backend tests — GSTIN lookup endpoint (Fix 4).

Fix 4: GET /api/parties/lookup-gstin?gstin=<15-char>
  - Invalid short/long GSTIN → returns {valid: False, reason: 'invalid_format'}
  - RAPIDAPI_KEY not set → {valid: False, reason: 'no_api_key_configured'}
  - Endpoint never crashes on any input (200 OK envelope)
  - Response shape has keys: valid, legal_name, trade_name, address, state, reason (or subset)
"""
import os
import pytest
import requests

from dotenv import load_dotenv
load_dotenv("/app/frontend/.env")
BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---- Fix 4 · GSTIN lookup -----------------------------------------------

class TestGstinLookup:
    def test_short_gstin_returns_invalid_format(self, api):
        r = api.get(f"{BASE_URL}/api/parties/lookup-gstin", params={"gstin": "SHORT123"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("valid") is False
        assert body.get("reason") == "invalid_format"

    def test_long_gstin_returns_invalid_format(self, api):
        r = api.get(f"{BASE_URL}/api/parties/lookup-gstin", params={"gstin": "A" * 20})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("valid") is False
        assert body.get("reason") == "invalid_format"

    def test_empty_gstin_does_not_crash(self, api):
        r = api.get(f"{BASE_URL}/api/parties/lookup-gstin", params={"gstin": ""})
        # Could be 200 (invalid_format) or 422 (validation) — must NOT be 500
        assert r.status_code in (200, 400, 422), r.text
        if r.status_code == 200:
            assert r.json().get("valid") is False

    def test_missing_gstin_query_param(self, api):
        r = api.get(f"{BASE_URL}/api/parties/lookup-gstin")
        # FastAPI returns 422 when required query param missing — must NOT crash 500
        assert r.status_code in (400, 422), r.text

    def test_15_char_gstin_no_api_key_configured(self, api):
        # In preview env RAPIDAPI_KEY is intentionally NOT set → endpoint should
        # gracefully return no_api_key_configured (never crash).
        r = api.get(
            f"{BASE_URL}/api/parties/lookup-gstin",
            params={"gstin": "09AAAAA0000A1Z5"},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert isinstance(body, dict)
        # Either no api key OR (if some tester wired one) a real response
        assert "valid" in body
        if body["valid"] is False:
            assert body.get("reason") in (
                "no_api_key_configured",
                "invalid_format",
                "network_error",
            ) or (body.get("reason") or "").startswith("upstream_")

    def test_response_shape_keys(self, api):
        r = api.get(
            f"{BASE_URL}/api/parties/lookup-gstin",
            params={"gstin": "27BBBBB1111B2Y6"},
        )
        assert r.status_code == 200
        body = r.json()
        # Minimum contract: `valid` always present
        assert "valid" in body
        # If invalid due to no key or format, reason is present
        if body.get("valid") is False:
            assert "reason" in body

    def test_lowercase_gstin_normalised(self, api):
        # Endpoint upper-cases input — a 15-char lowercase should NOT
        # short-circuit as invalid_format.
        r = api.get(
            f"{BASE_URL}/api/parties/lookup-gstin",
            params={"gstin": "09aaaaa0000a1z5"},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        # Not "invalid_format" because after upper() it's still 15 chars
        assert body.get("reason") != "invalid_format"

    def test_special_chars_no_crash(self, api):
        r = api.get(
            f"{BASE_URL}/api/parties/lookup-gstin",
            params={"gstin": "!@#$%^&*()_+<>?"},
        )
        assert r.status_code == 200, r.text
        # 15 chars long but non-alphanumeric — endpoint should not crash,
        # will either try upstream (and get error) or return invalid_format.
        body = r.json()
        assert body.get("valid") is False


# ---- Regression: existing endpoints still healthy -----------------------

class TestRegression:
    def test_root_healthy(self, api):
        r = api.get(f"{BASE_URL}/api/")
        assert r.status_code == 200

    def test_parties_list_reachable(self, api):
        r = api.get(f"{BASE_URL}/api/parties")
        # 200 or 401 (if auth required) — but never 500
        assert r.status_code < 500, r.text

    def test_now_brief_reachable(self, api):
        r = api.get(f"{BASE_URL}/api/now-brief")
        assert r.status_code < 500, r.text
