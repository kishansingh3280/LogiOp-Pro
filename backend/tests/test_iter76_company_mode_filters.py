"""Phase 2 Fix 4 — company_id + mode filter params on 4 endpoints."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "http://localhost:8001").rstrip("/")
ADMIN_USER = "kishan.singh3280@gmail.com"
ADMIN_PASS = "701A3ahig@"


@pytest.fixture(scope="module")
def token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": ADMIN_USER, "password": ADMIN_PASS},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _count(data):
    if isinstance(data, list):
        return len(data)
    if isinstance(data, dict) and "items" in data:
        return len(data["items"])
    return -1


@pytest.mark.parametrize(
    "path,company,mode,expected",
    [
        ("/api/shipments", "awadh", "formal", 5),
        ("/api/shipments", "singh_exports", "formal", 0),
        ("/api/invoices", "awadh", "formal", 2),
        ("/api/ledger/entries", "awadh", "formal", 30),
        ("/api/trips", "awadh", "formal", 1),
    ],
)
def test_company_mode_filters(headers, path, company, mode, expected):
    r = requests.get(
        f"{BASE_URL}{path}?company_id={company}&mode={mode}",
        headers=headers,
        timeout=20,
    )
    assert r.status_code == 200, r.text
    assert _count(r.json()) == expected


def test_defaults_apply_when_no_filter(headers):
    # Without filters, legacy records w/o company fields should default to awadh/formal.
    r = requests.get(f"{BASE_URL}/api/shipments", headers=headers, timeout=20)
    assert r.status_code == 200
    # No filter -> full dataset should be >= filtered awadh set
    assert _count(r.json()) >= 5


def test_informal_mode_returns_empty_for_awadh_shipments(headers):
    r = requests.get(
        f"{BASE_URL}/api/shipments?company_id=awadh&mode=informal",
        headers=headers,
        timeout=20,
    )
    assert r.status_code == 200
    assert _count(r.json()) == 0
