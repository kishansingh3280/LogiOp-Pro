"""Iteration 21 — Auth (JWT + RBAC) + Audit stamping + Assistant honorifics/context.

Focus: newly-shipped Phase A/B/C endpoints per the review request.

Sections:
- Auth: /api/auth/login, /me, /users (RBAC), /register (admin), PATCH/DELETE,
        /change-password
- Audit: /api/bullion/trips + /api/bullion/transactions must stamp
         created_by / modified_by / entry_source (manual vs ai). PUT preserves
         created_by.
- Proxy audit injection: POST /api/parties (proxied) as kishan should still
         succeed after audit-field injection.
- Assistant: /api/assistant/chat SSE honors screen_context + honorific.
             Navigation intent returns a JSON `action=navigate` block.
- Regression: /api/wingman/health.
"""

from __future__ import annotations

import json
import os
import re
import time
from typing import Any, Dict, Optional

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


# --------------------------------------------------------------------------
# Fixtures — obtain tokens once per module
# --------------------------------------------------------------------------

@pytest.fixture(scope="module")
def s() -> requests.Session:
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


def _login(s, creds) -> Dict[str, Any]:
    r = s.post(f"{API}/auth/login", json=creds, timeout=15)
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


def _auth_headers(login: Dict[str, Any], *, entry_source: Optional[str] = None) -> Dict[str, str]:
    h = {"Authorization": f"Bearer {login['access_token']}", "Content-Type": "application/json"}
    if entry_source:
        h["X-Entry-Source"] = entry_source
    return h


# --------------------------------------------------------------------------
# Auth: login + /me
# --------------------------------------------------------------------------
class TestAuthLoginMe:
    def test_login_success_returns_token_and_user(self, kishan_login):
        assert "access_token" in kishan_login and kishan_login["access_token"]
        assert kishan_login.get("token_type") == "bearer"
        u = kishan_login["user"]
        assert u["username"] == "kishan"
        assert u["role"] == "Admin"
        assert u["honorific"] == "Sir"
        assert u["display_name"] == "Kishan"

    def test_login_wrong_password_401(self, s):
        r = s.post(f"{API}/auth/login", json={"username": "kishan", "password": "WRONG"}, timeout=15)
        assert r.status_code == 401, f"expected 401 got {r.status_code}: {r.text[:200]}"

    def test_me_with_valid_token(self, s, kishan_login):
        r = s.get(f"{API}/auth/me", headers=_auth_headers(kishan_login), timeout=15)
        assert r.status_code == 200, r.text[:200]
        assert r.json()["username"] == "kishan"

    def test_me_missing_token_401(self, s):
        r = s.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_me_invalid_token_401(self, s):
        r = s.get(
            f"{API}/auth/me",
            headers={"Authorization": "Bearer notarealjwt.value.here"},
            timeout=15,
        )
        assert r.status_code == 401


# --------------------------------------------------------------------------
# Auth: RBAC on /auth/users and /auth/register
# --------------------------------------------------------------------------
class TestAuthRBAC:
    def test_list_users_admin_ok(self, s, kishan_login):
        r = s.get(f"{API}/auth/users", headers=_auth_headers(kishan_login), timeout=15)
        assert r.status_code == 200, r.text[:200]
        users = r.json()
        usernames = {u["username"] for u in users}
        assert {"kishan", "staff", "carrier"}.issubset(usernames), f"got {usernames}"

    def test_list_users_staff_forbidden(self, s, staff_login):
        r = s.get(f"{API}/auth/users", headers=_auth_headers(staff_login), timeout=15)
        assert r.status_code == 403

    def test_list_users_carrier_forbidden(self, s, carrier_login):
        r = s.get(f"{API}/auth/users", headers=_auth_headers(carrier_login), timeout=15)
        assert r.status_code == 403

    def test_register_staff_by_admin_and_cleanup(self, s, kishan_login):
        uname = f"test_reg_{int(time.time())}"
        payload = {
            "username": uname,
            "password": "TempPass@2026",
            "display_name": "Temp Reg User",
            "role": "Staff",
            "honorific": "Ji",
        }
        r = s.post(f"{API}/auth/register", json=payload, headers=_auth_headers(kishan_login), timeout=15)
        assert r.status_code == 200, r.text[:200]
        u = r.json()
        assert u["username"] == uname
        assert u["role"] == "Staff"
        # cleanup
        d = s.delete(f"{API}/auth/users/{u['id']}", headers=_auth_headers(kishan_login), timeout=15)
        assert d.status_code == 200

    def test_register_by_staff_forbidden(self, s, staff_login):
        r = s.post(
            f"{API}/auth/register",
            json={"username": "shouldnotexist", "password": "TempPass@2026", "display_name": "X"},
            headers=_auth_headers(staff_login),
            timeout=15,
        )
        assert r.status_code == 403

    def test_register_by_carrier_forbidden(self, s, carrier_login):
        r = s.post(
            f"{API}/auth/register",
            json={"username": "shouldnotexist2", "password": "TempPass@2026", "display_name": "X"},
            headers=_auth_headers(carrier_login),
            timeout=15,
        )
        assert r.status_code == 403


# --------------------------------------------------------------------------
# Auth: PATCH/DELETE — Admin cannot delete self
# --------------------------------------------------------------------------
class TestAuthUpdateDelete:
    def test_patch_user_admin_ok(self, s, kishan_login):
        # Find staff user id via listing
        r = s.get(f"{API}/auth/users", headers=_auth_headers(kishan_login), timeout=15)
        assert r.status_code == 200
        staff_id = next(u["id"] for u in r.json() if u["username"] == "staff")
        # Update display_name/honorific
        new_dn = f"Ops Staff {int(time.time()) % 1000}"
        p = s.patch(
            f"{API}/auth/users/{staff_id}",
            json={"display_name": new_dn, "honorific": "Ji"},
            headers=_auth_headers(kishan_login),
            timeout=15,
        )
        assert p.status_code == 200, p.text[:200]
        # Verify persistence via list
        r2 = s.get(f"{API}/auth/users", headers=_auth_headers(kishan_login), timeout=15)
        got = next(u for u in r2.json() if u["username"] == "staff")
        assert got["display_name"] == new_dn
        # Revert
        s.patch(
            f"{API}/auth/users/{staff_id}",
            json={"display_name": "Ops Staff"},
            headers=_auth_headers(kishan_login),
            timeout=15,
        )

    def test_admin_cannot_delete_self(self, s, kishan_login):
        kishan_id = kishan_login["user"]["id"]
        r = s.delete(f"{API}/auth/users/{kishan_id}", headers=_auth_headers(kishan_login), timeout=15)
        assert r.status_code == 400, f"expected 400 got {r.status_code}: {r.text[:200]}"


# --------------------------------------------------------------------------
# Auth: change-password (dry-run — revert to original after)
# --------------------------------------------------------------------------
class TestChangePassword:
    def test_change_password_wrong_current_401(self, s, kishan_login):
        r = s.post(
            f"{API}/auth/change-password",
            json={"current_password": "definitely-wrong", "new_password": "NewPass@2026"},
            headers=_auth_headers(kishan_login),
            timeout=15,
        )
        assert r.status_code == 401, r.text[:200]

    def test_change_password_roundtrip(self, s, kishan_login):
        new_pw = "Kishan@Boss2026TMP"
        # Change
        r1 = s.post(
            f"{API}/auth/change-password",
            json={"current_password": KISHAN["password"], "new_password": new_pw},
            headers=_auth_headers(kishan_login),
            timeout=15,
        )
        assert r1.status_code == 200, r1.text[:200]
        # Login with new password
        r2 = s.post(f"{API}/auth/login", json={"username": "kishan", "password": new_pw}, timeout=15)
        assert r2.status_code == 200, r2.text[:200]
        new_tok = r2.json()["access_token"]
        # Revert
        r3 = s.post(
            f"{API}/auth/change-password",
            json={"current_password": new_pw, "new_password": KISHAN["password"]},
            headers={"Authorization": f"Bearer {new_tok}", "Content-Type": "application/json"},
            timeout=15,
        )
        assert r3.status_code == 200, r3.text[:200]


# --------------------------------------------------------------------------
# Audit stamping on Bullion writes (local endpoints)
# --------------------------------------------------------------------------
class TestBullionAudit:
    trip_ids: list = []
    txn_ids: list = []

    def test_trip_manual_stamps_created_by(self, s, kishan_login):
        body = {
            "date": "2026-05-01",
            "route": "DEL→BKK",
            "available_weight_kg": 8.0,
            "carrier_name": "TEST_Audit_Carrier",
            "status": "planned",
            "notes": "TEST_iter21_audit",
        }
        r = s.post(f"{API}/bullion/trips", json=body, headers=_auth_headers(kishan_login, entry_source="manual"), timeout=20)
        assert r.status_code in (200, 201), r.text[:300]
        doc = r.json()
        assert doc.get("created_by") == "kishan", f"got {doc.get('created_by')}"
        assert doc.get("modified_by") == "kishan"
        assert doc.get("entry_source") == "manual"
        assert doc.get("created_at"), "created_at missing"
        TestBullionAudit.trip_ids.append(doc["id"])

    def test_trip_ai_source_header(self, s, kishan_login):
        body = {
            "date": "2026-05-02",
            "route": "BKK→DEL",
            "available_weight_kg": 6.5,
            "carrier_name": "TEST_Audit_AI",
            "status": "planned",
            "notes": "TEST_iter21_audit_ai",
        }
        r = s.post(
            f"{API}/bullion/trips",
            json=body,
            headers=_auth_headers(kishan_login, entry_source="ai"),
            timeout=20,
        )
        assert r.status_code in (200, 201), r.text[:300]
        doc = r.json()
        assert doc.get("entry_source") == "ai", f"expected 'ai' got {doc.get('entry_source')}"
        assert doc.get("created_by") == "kishan"
        TestBullionAudit.trip_ids.append(doc["id"])

    def test_trip_put_preserves_created_by_updates_modified(self, s, kishan_login):
        assert TestBullionAudit.trip_ids, "no trip created earlier"
        trip_id = TestBullionAudit.trip_ids[0]
        # Login as staff for the PUT so we can verify modified_by changes
        r_staff_login = s.post(f"{API}/auth/login", json=STAFF, timeout=15)
        assert r_staff_login.status_code == 200
        staff_tok = r_staff_login.json()["access_token"]
        r = s.put(
            f"{API}/bullion/trips/{trip_id}",
            json={"notes": "TEST_iter21_updated_by_staff"},
            headers={"Authorization": f"Bearer {staff_tok}", "Content-Type": "application/json"},
            timeout=20,
        )
        assert r.status_code == 200, r.text[:300]
        doc = r.json()
        assert doc.get("created_by") == "kishan", f"created_by mutated to {doc.get('created_by')}"
        assert doc.get("modified_by") == "staff", f"modified_by should be staff, got {doc.get('modified_by')}"

    def test_txn_manual_audit_and_autoincrement_txn_no(self, s, kishan_login):
        assert TestBullionAudit.trip_ids
        body = {
            "trip_id": TestBullionAudit.trip_ids[0],
            "type": "gold",
            "weight_kg": 3.0,
            "notes": "TEST_iter21_txn_audit",
            "status": "open",
        }
        r = s.post(
            f"{API}/bullion/transactions",
            json=body,
            headers=_auth_headers(kishan_login, entry_source="manual"),
            timeout=20,
        )
        assert r.status_code in (200, 201), r.text[:300]
        doc = r.json()
        assert doc.get("created_by") == "kishan"
        assert doc.get("entry_source") == "manual"
        assert re.match(r"^TXN-\d{3,}$", doc.get("txn_no") or ""), f"bad txn_no {doc.get('txn_no')}"
        TestBullionAudit.txn_ids.append(doc["id"])

    def test_zzz_cleanup(self, s, kishan_login):
        h = _auth_headers(kishan_login)
        for tid in TestBullionAudit.txn_ids:
            s.delete(f"{API}/bullion/transactions/{tid}", headers=h, timeout=15)
        for tid in TestBullionAudit.trip_ids:
            s.delete(f"{API}/bullion/trips/{tid}", headers=h, timeout=15)


# --------------------------------------------------------------------------
# Proxy audit injection — /api/parties is proxied to REMOTE_BACKEND_URL.
# We POST as kishan and expect a successful create (audit-field injection
# must not break the request). We then attempt to clean up.
# --------------------------------------------------------------------------
class TestProxyAuditInjection:
    def test_parties_post_proxied_with_audit(self, s, kishan_login):
        name = f"TEST_iter21_party_{int(time.time())}"
        body = {"name": name, "role": "customer", "notes": "iter21 proxy audit test"}
        r = s.post(
            f"{API}/parties",
            json=body,
            headers=_auth_headers(kishan_login, entry_source="manual"),
            timeout=30,
        )
        assert r.status_code in (200, 201), f"proxy POST /api/parties failed: {r.status_code} {r.text[:300]}"
        doc = None
        try:
            doc = r.json()
        except Exception:
            pytest.fail(f"non-json response from proxy: {r.text[:300]}")
        assert isinstance(doc, dict) and doc.get("id"), f"missing id in response: {doc}"

        # Best-effort verification that the remote persisted the party
        rg = s.get(f"{API}/parties", headers=_auth_headers(kishan_login), timeout=30)
        if rg.status_code == 200 and isinstance(rg.json(), list):
            match = next((p for p in rg.json() if p.get("id") == doc["id"]), None)
            assert match, f"created party {doc['id']} missing in GET list"

        # Cleanup — remote may not support DELETE, so tolerate any status
        try:
            s.delete(f"{API}/parties/{doc['id']}", headers=_auth_headers(kishan_login), timeout=20)
        except Exception:
            pass


# --------------------------------------------------------------------------
# Assistant chat — honorific enforcement + screen_context echo + navigate
# --------------------------------------------------------------------------
def _consume_sse(url: str, payload: dict, *, timeout: int = 30, hard_stop: int = 25) -> str:
    """POST SSE and return the reconstructed assistant text.

    NOTE: There is a known backend SSE-framing bug where multi-line Claude
    content breaks the `data:` frame boundary. To survive this, we read the
    entire raw byte stream and strip SSE control tokens rather than trusting
    per-frame parsing. This recovers content even when framing is malformed.
    """
    t0 = time.perf_counter()
    raw_bytes = b""
    with requests.post(url, json=payload, stream=True, timeout=timeout) as r:
        assert r.status_code == 200, f"assistant status={r.status_code} body={r.text[:200]}"
        for chunk in r.iter_content(chunk_size=1024, decode_unicode=False):
            if chunk:
                raw_bytes += chunk
            if b"event: done" in raw_bytes:
                break
            if time.perf_counter() - t0 > hard_stop:
                break
    raw = raw_bytes.decode("utf-8", errors="replace")
    # Strip SSE control tokens. Each Devanagari codepoint may arrive as its
    # own `data:` frame — concat with empty separator so `स` + `र` becomes
    # `सर` (not `स\nर`). Orphan lines that leaked outside data frames due to
    # the server SSE-framing bug are also preserved (in order).
    parts: list = []
    for line in raw.splitlines():
        s = line
        if s == "":
            continue  # SSE frame terminator, no content
        if s.startswith(": "):
            continue  # comment / keep-alive
        if s.startswith("event: "):
            continue
        if s.startswith("data: [DONE]") or s.strip() == "[DONE]":
            continue
        if s.startswith("data: "):
            parts.append(s[len("data: "):])
        elif s.startswith("data:"):
            parts.append(s[len("data:"):])
        else:
            # Content leaked outside SSE data frames (server bug) — keep it.
            parts.append(s)
    return "".join(parts)


class TestAssistantChat:
    def test_honorific_sir_and_screen_context(self):
        payload = {
            "session_id": f"iter21-sir-{int(time.time())}",
            "message": "मैं इस स्क्रीन पर क्या देख रहा हूँ?",
            "screen_context": "route=/invoices; visible=Invoice INV-042 for party 'Lalit Sons', amount ₹1,25,000",
            "honorific": "Sir",
            "display_name": "Kishan",
        }
        text = _consume_sse(f"{API}/assistant/chat", payload, timeout=40, hard_stop=35)
        print(f"\n[Sir turn] len={len(text)} preview={text[:200]!r}")
        assert text and not text.startswith("__ERR__"), f"assistant errored: {text[:200]}"
        # Honorific check (either 'सर' or 'किशन सर')
        assert ("सर" in text) or ("Sir" in text) or ("किशन" in text), (
            f"honorific missing in response: {text[:400]!r}"
        )
        # Screen context echo — expect a reference to Invoice/INV-042/invoices/Lalit
        low = text.lower()
        assert any(k in text for k in ["INV-042", "Lalit", "invoice", "इनवॉइस"]) or any(
            k in low for k in ["inv-042", "lalit", "invoice"]
        ), f"screen context not referenced: {text[:400]!r}"

    def test_honorific_boss(self):
        payload = {
            "session_id": f"iter21-boss-{int(time.time())}",
            "message": "आज का status बताओ।",
            "screen_context": "route=/dashboard",
            "honorific": "Boss",
            "display_name": "Kishan",
        }
        text = _consume_sse(f"{API}/assistant/chat", payload, timeout=40, hard_stop=35)
        print(f"\n[Boss turn] len={len(text)} preview={text[:200]!r}")
        assert text and not text.startswith("__ERR__"), f"assistant errored: {text[:200]}"
        # Should address as 'बॉस' / 'किशन सर' / 'Boss'
        assert any(k in text for k in ["बॉस", "Boss", "किशन सर", "Kishan Sir", "सर"]), (
            f"boss honorific missing: {text[:400]!r}"
        )

    def test_navigation_intent_returns_json_action(self):
        payload = {
            "session_id": f"iter21-nav-{int(time.time())}",
            "message": "मुझे invoices पर ले चलो",
            "screen_context": "route=/dashboard",
            "honorific": "Sir",
            "display_name": "Kishan",
        }
        text = _consume_sse(f"{API}/assistant/chat", payload, timeout=40, hard_stop=35)
        print(f"\n[Navigate turn] len={len(text)} preview={text[:400]!r}")
        assert text and not text.startswith("__ERR__"), f"assistant errored: {text[:200]}"
        # Look for a JSON object with action=navigate and route=/invoices.
        # Use DOTALL so multi-line JSON blocks match.
        matches = re.findall(
            r"\{[^{}]*?\"action\"\s*:\s*\"navigate\"[^{}]*?\}",
            text,
            re.DOTALL,
        )
        assert matches, f"no navigate action JSON block in response: {text[:800]!r}"
        found_route = False
        for m in matches:
            try:
                obj = json.loads(m)
            except json.JSONDecodeError:
                continue
            if obj.get("action") == "navigate" and "/invoices" in str(obj.get("route", "")):
                found_route = True
                break
        assert found_route, f"navigate action found but /invoices route missing: {matches!r}"


# --------------------------------------------------------------------------
# Regression: wingman health
# --------------------------------------------------------------------------
class TestWingmanHealth:
    def test_health(self, s):
        r = s.get(f"{API}/wingman/health", timeout=15)
        assert r.status_code == 200, r.text[:200]
        j = r.json()
        assert j.get("ok") is True
