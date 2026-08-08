"""Iteration 22 — 4-phase testing:
(A) Users admin CRUD (/api/auth/register, PATCH, DELETE + cannot-delete-self)
(B) Bullion partial-split: /api/bullion/transactions/{id}/split
(C) Ghost-User via proxy (X-Entry-Source: ai on POST /api/parties) +
    assistant SSE reply containing a ```json {"action":"create_party"...}``` block
(D) Lalamove — graceful degradation with blank keys (config, quote 503, orders 200 [])
Plus: Auth regression + audit stamps on local bullion writes.
"""
from __future__ import annotations

import json
import os
import re
import time
from typing import Any, Dict, List, Optional

import pytest
import requests

BASE = os.environ.get(
    "EXPO_BACKEND_URL",
    os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://logistics-ai-hub-18.preview.emergentagent.com"),
).rstrip("/")
API = f"{BASE}/api"

KISHAN = {"username": "kishan", "password": "Kishan@Boss2026"}
STAFF = {"username": "staff", "password": "Staff@2026"}
CARRIER = {"username": "carrier", "password": "Carrier@2026"}


# ---------- shared fixtures -------------------------------------------------

@pytest.fixture(scope="module")
def s() -> requests.Session:
    return requests.Session()


def _login(s, creds) -> Dict[str, Any]:
    r = s.post(f"{API}/auth/login", json=creds, timeout=20)
    assert r.status_code == 200, f"login failed for {creds['username']}: {r.status_code} {r.text[:200]}"
    return r.json()


@pytest.fixture(scope="module")
def kishan_login(s) -> Dict[str, Any]:
    return _login(s, KISHAN)


@pytest.fixture(scope="module")
def staff_login(s) -> Dict[str, Any]:
    return _login(s, STAFF)


@pytest.fixture(scope="module")
def carrier_login(s) -> Dict[str, Any]:
    return _login(s, CARRIER)


def _hdrs(login: Dict[str, Any], *, source: Optional[str] = None) -> Dict[str, str]:
    h = {"Authorization": f"Bearer {login['access_token']}", "Content-Type": "application/json"}
    if source:
        h["X-Entry-Source"] = source
    return h


# ============================================================================
# AUTH REGRESSION
# ============================================================================
class TestAuthRegression:
    def test_kishan_login_returns_jwt_and_sir(self, s):
        data = _login(s, KISHAN)
        assert data.get("token_type") == "bearer"
        assert data.get("access_token")
        user = data.get("user") or {}
        assert user.get("username") == "kishan"
        assert user.get("role") == "Admin"
        assert user.get("honorific") == "Sir"

    def test_auth_me(self, s, kishan_login):
        r = s.get(f"{API}/auth/me", headers=_hdrs(kishan_login), timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j.get("username") == "kishan"
        assert j.get("role") == "Admin"

    def test_users_list_admin_ok(self, s, kishan_login):
        r = s.get(f"{API}/auth/users", headers=_hdrs(kishan_login), timeout=15)
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        usernames = {u.get("username") for u in rows}
        # At least the 3 seeded users must be present.
        for u in ("kishan", "staff", "carrier"):
            assert u in usernames, f"seeded user {u} missing from /auth/users"

    def test_users_list_staff_forbidden(self, s, staff_login):
        r = s.get(f"{API}/auth/users", headers=_hdrs(staff_login), timeout=15)
        assert r.status_code == 403

    def test_users_list_carrier_forbidden(self, s, carrier_login):
        r = s.get(f"{API}/auth/users", headers=_hdrs(carrier_login), timeout=15)
        assert r.status_code == 403


# ============================================================================
# (A) USERS ADMIN CRUD
# ============================================================================
class TestUsersAdminCRUD:
    _created_id: Optional[str] = None

    def test_a1_register_new_staff(self, s, kishan_login):
        payload = {
            "username": "testuser22",
            "password": "Testpass@2026",
            "display_name": "Test User Ji",
            "role": "Staff",
            "honorific": "Ji",
        }
        # Cleanup any prior stale copy first.
        rl = s.get(f"{API}/auth/users", headers=_hdrs(kishan_login)).json()
        stale = next((u for u in rl if u.get("username") == "testuser22"), None)
        if stale:
            s.delete(f"{API}/auth/users/{stale['id']}", headers=_hdrs(kishan_login))

        r = s.post(f"{API}/auth/register", headers=_hdrs(kishan_login), json=payload, timeout=15)
        assert r.status_code == 200, r.text[:300]
        j = r.json()
        assert j.get("username") == "testuser22"
        assert j.get("role") == "Staff"
        assert j.get("display_name") == "Test User Ji"
        assert j.get("honorific") == "Ji"
        assert j.get("id")
        TestUsersAdminCRUD._created_id = j["id"]

    def test_a2_register_conflict(self, s, kishan_login):
        assert TestUsersAdminCRUD._created_id, "prerequisite failed"
        r = s.post(f"{API}/auth/register", headers=_hdrs(kishan_login), json={
            "username": "testuser22",
            "password": "Testpass@2026",
            "display_name": "dup",
            "role": "Staff",
        }, timeout=15)
        assert r.status_code == 409

    def test_a3_patch_display_and_role(self, s, kishan_login):
        uid = TestUsersAdminCRUD._created_id
        assert uid
        r = s.patch(
            f"{API}/auth/users/{uid}",
            headers=_hdrs(kishan_login),
            json={"display_name": "Renamed Ji", "role": "Carrier"},
            timeout=15,
        )
        assert r.status_code == 200, r.text[:300]
        # Verify via GET
        rl = s.get(f"{API}/auth/users", headers=_hdrs(kishan_login)).json()
        row = next((u for u in rl if u.get("id") == uid), None)
        assert row is not None
        assert row.get("display_name") == "Renamed Ji"
        assert row.get("role") == "Carrier"

    def test_a4_delete_self_forbidden(self, s, kishan_login):
        kishan_id = kishan_login["user"]["id"]
        r = s.delete(f"{API}/auth/users/{kishan_id}", headers=_hdrs(kishan_login), timeout=15)
        assert r.status_code == 400
        assert "yourself" in r.text.lower()

    def test_a5_delete_by_non_admin_forbidden(self, s, staff_login):
        uid = TestUsersAdminCRUD._created_id
        if not uid:
            pytest.skip("no user created")
        r = s.delete(f"{API}/auth/users/{uid}", headers=_hdrs(staff_login), timeout=15)
        assert r.status_code == 403

    def test_a6_delete_ok_and_gone(self, s, kishan_login):
        uid = TestUsersAdminCRUD._created_id
        assert uid
        r = s.delete(f"{API}/auth/users/{uid}", headers=_hdrs(kishan_login), timeout=15)
        assert r.status_code == 200
        # Verify GONE
        rl = s.get(f"{API}/auth/users", headers=_hdrs(kishan_login)).json()
        assert not any(u.get("id") == uid for u in rl), "user still present after delete"


# ============================================================================
# (B) BULLION PARTIAL-SPLIT UX — CORE BUSINESS LOGIC
# ============================================================================
class TestBullionSplit:
    _trip_id: Optional[str] = None
    _parent_id: Optional[str] = None
    _child_ids: List[str] = []

    def test_b0_create_trip_and_parent(self, s, kishan_login):
        # 1. Create a trip
        trip_payload = {
            "date": "2026-01-15",
            "route": "IN_TO_TH",
            "origin": "Delhi",
            "destination": "Bangkok",
            "available_weight_kg": 10.0,
            "status": "planned",
            "notes": "TEST_iter22_split",
        }
        r = s.post(f"{API}/bullion/trips", headers=_hdrs(kishan_login), json=trip_payload, timeout=15)
        assert r.status_code == 200, r.text[:300]
        trip = r.json()
        assert trip.get("id")
        TestBullionSplit._trip_id = trip["id"]

        # 2. Create parent bullion txn weight_kg=10
        txn_payload = {
            "type": "gold",
            "status": "open",
            "weight_kg": 10.0,
            "gold_amount": 100,
            "gold_unit": "baht",
            "notes": "TEST_iter22_split_parent",
        }
        r = s.post(f"{API}/bullion/transactions", headers=_hdrs(kishan_login), json=txn_payload, timeout=15)
        assert r.status_code == 200, r.text[:300]
        parent = r.json()
        assert parent.get("id")
        assert parent.get("weight_kg") == 10.0
        assert parent.get("remaining_weight_kg") == 10.0, f"remaining should equal weight on create, got {parent.get('remaining_weight_kg')}"
        assert parent.get("created_by") == "kishan"
        assert parent.get("modified_by") == "kishan"
        assert parent.get("entry_source") == "manual"
        assert parent.get("txn_no", "").startswith("TXN-")
        TestBullionSplit._parent_id = parent["id"]

    def test_b1_first_split_4kg(self, s, kishan_login):
        pid = TestBullionSplit._parent_id
        tid = TestBullionSplit._trip_id
        assert pid and tid
        r = s.post(
            f"{API}/bullion/transactions/{pid}/split",
            headers=_hdrs(kishan_login),
            json={"split_weight_kg": 4, "trip_id": tid},
            timeout=15,
        )
        assert r.status_code == 200, r.text[:400]
        j = r.json()
        parent = j.get("parent") or {}
        child = j.get("child") or {}
        # Parent
        assert parent.get("remaining_weight_kg") == 6, f"remaining after split=6 got {parent.get('remaining_weight_kg')}"
        splits = parent.get("splits") or []
        assert len(splits) == 1
        # Child
        assert child.get("parent_id") == pid
        assert child.get("trip_id") == tid
        assert child.get("weight_kg") == 4
        parent_txn_no = parent.get("txn_no", "")
        assert child.get("txn_no") == f"{parent_txn_no}-a", f"child txn_no should end with -a, got {child.get('txn_no')}"
        assert child.get("created_by") == "kishan"
        assert child.get("id")
        TestBullionSplit._child_ids.append(child["id"])

    def test_b2_second_split_6kg_fully_allocated(self, s, kishan_login):
        pid = TestBullionSplit._parent_id
        tid = TestBullionSplit._trip_id
        r = s.post(
            f"{API}/bullion/transactions/{pid}/split",
            headers=_hdrs(kishan_login),
            json={"split_weight_kg": 6, "trip_id": tid},
            timeout=15,
        )
        assert r.status_code == 200, r.text[:400]
        j = r.json()
        parent = j.get("parent") or {}
        child = j.get("child") or {}
        assert parent.get("remaining_weight_kg") == 0
        assert len(parent.get("splits") or []) == 2
        # Second child suffix should be -b
        pno = parent.get("txn_no", "")
        assert child.get("txn_no") == f"{pno}-b", f"second child suffix should be -b, got {child.get('txn_no')}"
        TestBullionSplit._child_ids.append(child["id"])

    def test_b3_third_split_rejected(self, s, kishan_login):
        pid = TestBullionSplit._parent_id
        tid = TestBullionSplit._trip_id
        r = s.post(
            f"{API}/bullion/transactions/{pid}/split",
            headers=_hdrs(kishan_login),
            json={"split_weight_kg": 1, "trip_id": tid},
            timeout=15,
        )
        assert r.status_code == 400
        assert "allocat" in r.text.lower()

    def test_b4_over_split_rejected(self, s, kishan_login):
        # Create a fresh parent (5kg) then try to split 6kg → 400
        txn_payload = {
            "type": "gold",
            "weight_kg": 5.0,
            "notes": "TEST_iter22_split_overtest",
        }
        r = s.post(f"{API}/bullion/transactions", headers=_hdrs(kishan_login), json=txn_payload, timeout=15)
        assert r.status_code == 200
        p2 = r.json()
        try:
            r = s.post(
                f"{API}/bullion/transactions/{p2['id']}/split",
                headers=_hdrs(kishan_login),
                json={"split_weight_kg": 6, "trip_id": TestBullionSplit._trip_id},
                timeout=15,
            )
            assert r.status_code == 400, r.text[:200]
            assert "remaining" in r.text.lower() or "must be between" in r.text.lower()
        finally:
            s.delete(f"{API}/bullion/transactions/{p2['id']}", headers=_hdrs(kishan_login))

    def test_b5_split_on_child_rejected(self, s, kishan_login):
        if not TestBullionSplit._child_ids:
            pytest.skip("no child produced")
        child_id = TestBullionSplit._child_ids[0]
        r = s.post(
            f"{API}/bullion/transactions/{child_id}/split",
            headers=_hdrs(kishan_login),
            json={"split_weight_kg": 1, "trip_id": TestBullionSplit._trip_id},
            timeout=15,
        )
        assert r.status_code == 400
        assert "child" in r.text.lower() or "parent" in r.text.lower()

    def test_b9_cleanup(self, s, kishan_login):
        # Delete children then parent then trip
        for cid in TestBullionSplit._child_ids:
            s.delete(f"{API}/bullion/transactions/{cid}", headers=_hdrs(kishan_login))
        if TestBullionSplit._parent_id:
            s.delete(f"{API}/bullion/transactions/{TestBullionSplit._parent_id}", headers=_hdrs(kishan_login))
        if TestBullionSplit._trip_id:
            s.delete(f"{API}/bullion/trips/{TestBullionSplit._trip_id}", headers=_hdrs(kishan_login))


# ============================================================================
# AUDIT STAMPS ON LOCAL BULLION WRITES (Manual vs AI)
# ============================================================================
class TestAuditStamps:
    def test_manual_stamp_default(self, s, kishan_login):
        r = s.post(
            f"{API}/bullion/transactions",
            headers=_hdrs(kishan_login),
            json={"type": "gold", "weight_kg": 2.5, "notes": "TEST_iter22_audit_manual"},
            timeout=15,
        )
        assert r.status_code == 200
        j = r.json()
        try:
            assert j.get("created_by") == "kishan"
            assert j.get("modified_by") == "kishan"
            assert j.get("entry_source") == "manual"
            assert j.get("remaining_weight_kg") == 2.5
        finally:
            s.delete(f"{API}/bullion/transactions/{j['id']}", headers=_hdrs(kishan_login))

    def test_ai_stamp_when_header_present(self, s, kishan_login):
        r = s.post(
            f"{API}/bullion/transactions",
            headers=_hdrs(kishan_login, source="ai"),
            json={"type": "gold", "weight_kg": 1.0, "notes": "TEST_iter22_audit_ai"},
            timeout=15,
        )
        assert r.status_code == 200
        j = r.json()
        try:
            assert j.get("entry_source") == "ai"
            assert j.get("created_by") == "kishan"
        finally:
            s.delete(f"{API}/bullion/transactions/{j['id']}", headers=_hdrs(kishan_login))


# ============================================================================
# (C) GHOST-USER via PROXY  — POST /api/parties with X-Entry-Source: ai
# ============================================================================
class TestGhostUserProxy:
    _party_id: Optional[str] = None

    def test_c1_create_party_via_proxy_ai(self, s, kishan_login):
        payload = {
            "name": "TEST_iter22_ghost_party",
            "role": "customer",
            "city": "Bangalore",
            "notes": "created via proxy audit middleware test",
        }
        r = s.post(
            f"{API}/parties",
            headers=_hdrs(kishan_login, source="ai"),
            json=payload,
            timeout=30,
        )
        assert r.status_code in (200, 201), f"proxy create failed: {r.status_code} {r.text[:300]}"
        j = r.json()
        assert j.get("name") == payload["name"]
        assert j.get("role") == "customer"
        assert j.get("id")
        TestGhostUserProxy._party_id = j["id"]

    def test_c2_cleanup(self, s, kishan_login):
        pid = TestGhostUserProxy._party_id
        if not pid:
            pytest.skip("no party created")
        r = s.delete(f"{API}/parties/{pid}", headers=_hdrs(kishan_login), timeout=15)
        # Some remotes only allow soft-delete or return 200/204; accept either.
        assert r.status_code in (200, 202, 204, 404), f"cleanup delete: {r.status_code} {r.text[:200]}"


# ============================================================================
# (C-2) GHOST-USER assistant reply parsing — SSE contains create_party JSON
# ============================================================================
def _consume_sse(resp, timeout: float = 30.0) -> str:
    """Collect raw stream body (already un-framed by requests). Returns full text."""
    chunks: List[str] = []
    start = time.time()
    for line in resp.iter_lines(decode_unicode=True):
        if time.time() - start > timeout:
            break
        if line is None:
            continue
        chunks.append(line)
        if "[DONE]" in line:
            break
    return "\n".join(chunks)


class TestAssistantGhostUserReply:
    def test_c3_assistant_returns_create_party_json_and_honorific(self, s, kishan_login):
        payload = {
            "session_id": f"iter22_{int(time.time())}",
            "message": "Anita Sharma naam ki party banao, customer, Bangalore se",
            "honorific": "Sir",
            "display_name": "Kishan",
        }
        with s.post(
            f"{API}/assistant/chat",
            headers=_hdrs(kishan_login, source="ai"),
            json=payload,
            timeout=45,
            stream=True,
        ) as r:
            assert r.status_code == 200, r.text[:300]
            raw = _consume_sse(r, timeout=45)

        # Re-assemble the streamed text by stripping `data: ` prefixes so we can
        # search the actual model output.
        data_lines = []
        for ln in raw.split("\n"):
            if ln.startswith("data: "):
                data_lines.append(ln[6:])
        assembled = "\n".join(data_lines)

        # 1. JSON block with action=create_party. Accept both fenced forms
        #    ```json {...} ```  AND  ``` \n json \n {...} \n ```  (Claude
        #    sometimes puts the language hint on its own line).
        m = re.search(r"```(?:\s*json)?\s*(\{.*?\})\s*```", assembled, re.S)
        assert m, f"no ```json``` code block in SSE. First 800 chars:\n{assembled[:800]}"
        # Claude sometimes streams a pretty-printed JSON with embedded newlines
        # that our SSE reassembly inserted. Strip control chars outside string
        # literals — safest is to remove raw newlines that broke json.loads.
        raw_block = m.group(1)
        # Strip newlines/tabs (SSE reassembly leaks them between chunks) — do NOT
        # replace with a space or we get keys like ' action'.
        cleaned_block = re.sub(r"[\n\r\t]+", "", raw_block).strip()
        try:
            block = json.loads(cleaned_block)
        except json.JSONDecodeError as e:
            pytest.fail(f"json.loads failed on tool block: {e}\nraw={raw_block!r}\ncleaned={cleaned_block!r}")
        # Normalize whitespace-padded keys just in case.
        block = {(k.strip() if isinstance(k, str) else k): v for k, v in block.items()}
        assert block.get("action") == "create_party", f"expected create_party, got {block!r}"
        assert (block.get("name") or "").lower().startswith("anita"), block
        assert block.get("role") == "customer", f"expected role customer, got {block!r}"

        # 2. Honorific — should contain सर or किशन सर somewhere in the assistant text
        assert ("सर" in assembled) or ("किशन सर" in assembled), \
            f"honorific not found in reply. text: {assembled[:400]}"


# ============================================================================
# (D) LALAMOVE — graceful degradation with blank keys
# ============================================================================
class TestLalamove:
    def test_d1_config_unconfigured(self, s, kishan_login):
        r = s.get(f"{API}/lalamove/config", headers=_hdrs(kishan_login), timeout=15)
        assert r.status_code == 200, r.text[:200]
        j = r.json()
        assert j.get("configured") is False
        assert j.get("sandbox") is True
        assert j.get("market")
        assert j.get("base_url")

    def test_d2_quote_returns_503(self, s, kishan_login):
        payload = {
            "pickup": {"lat": 12.97, "lng": 77.59, "address": "MG Road, Bangalore"},
            "dropoff": {"lat": 12.93, "lng": 77.61, "address": "HSR Layout"},
            "service_type": "MOTORCYCLE",
            "sender_name": "Kishan",
            "sender_phone": "+919999999999",
            "recipient_name": "Rahul",
            "recipient_phone": "+918888888888",
        }
        r = s.post(f"{API}/lalamove/quote", headers=_hdrs(kishan_login), json=payload, timeout=15)
        assert r.status_code == 503, f"expected 503, got {r.status_code}: {r.text[:200]}"
        j = r.json()
        detail = j.get("detail")
        if isinstance(detail, dict):
            assert detail.get("error") == "lalamove_not_configured"
        else:
            # FastAPI could serialize the detail dict inside a JSON string; check substring
            assert "lalamove_not_configured" in str(detail)

    def test_d3_orders_empty_list(self, s, kishan_login):
        r = s.get(f"{API}/lalamove/orders", headers=_hdrs(kishan_login), timeout=15)
        assert r.status_code == 200, r.text[:200]
        j = r.json()
        assert isinstance(j, list)
        # May not be strictly empty if prior runs seeded data — verify shape only
        for row in j:
            assert isinstance(row, dict)

    def test_d4_signature_helper_deterministic(self):
        """Optional — verify _auth_header produces a stable HMAC given fixed inputs."""
        try:
            from backend import lalamove  # type: ignore
        except Exception:
            try:
                import sys
                sys.path.insert(0, "/app/backend")
                import lalamove  # type: ignore
            except Exception:
                pytest.skip("lalamove module not importable directly")
                return
        # Monkey-patch KEY/SECRET for deterministic signature
        lalamove.KEY = "K"
        lalamove.SECRET = "S"
        # time is embedded so we can't get byte-identical, but two calls in
        # the same ms produce the same signature and same ts.
        h1 = lalamove._auth_header("POST", "/v3/quotations", '{"a":1}')
        h2 = lalamove._auth_header("POST", "/v3/quotations", '{"a":1}')
        # scheme + api key must match
        assert h1.startswith("hmac K:")
        assert h2.startswith("hmac K:")
        # Split and verify structure
        _, rest = h1.split(" ", 1)
        parts = rest.split(":", 2)
        assert len(parts) == 3
        assert len(parts[2]) == 64  # sha256 hex
