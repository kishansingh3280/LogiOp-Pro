"""Phase C — Final pre-publish verification.

Runs against the public preview URL. Covers:
  1. Auth for kishan + bsingh
  2. Wingman catalog broadcast (Fix 9)  — mocked WhatsApp queue
  3. Papa company-scope client-side param (Fix 8)  — actually server acceptance
  4. Stress test: 50 shipments / invoices / ledger / parties → cleanup
  5. FY filter ?fy=2025-26 and ?company=singh_exports on /api/shipments
"""
import os, uuid, requests, pytest

BASE = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
if not BASE:
    # fall back to expo file
    with open("/app/frontend/.env") as f:
        for l in f:
            if l.startswith("EXPO_PUBLIC_BACKEND_URL="):
                BASE = l.split("=", 1)[1].strip().strip('"').rstrip("/")

API = f"{BASE}/api"


def _login(u, p):
    r = requests.post(f"{API}/auth/login", json={"username": u, "password": p}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    body = r.json()
    return body.get("access_token") or body.get("token")


@pytest.fixture(scope="module")
def kishan_token():
    return _login("kishan", "Kishan@Boss2026")


@pytest.fixture(scope="module")
def papa_token():
    return _login("bsingh", "Papa@2026")


@pytest.fixture(scope="module")
def kishan_hdr(kishan_token):
    return {"Authorization": f"Bearer {kishan_token}", "Content-Type": "application/json", "X-Entry-Source": "manual"}


@pytest.fixture(scope="module")
def papa_hdr(papa_token):
    return {"Authorization": f"Bearer {papa_token}", "Content-Type": "application/json", "X-Entry-Source": "manual"}


# ---------- Fix 9 — catalog broadcast log endpoint --------------------------
def test_broadcast_log_endpoint_exists():
    r = requests.get(f"{API}/catalog/broadcast/log", timeout=15)
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)


def test_wingman_health():
    r = requests.get(f"{API}/wingman/health", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data.get("ok") is True
    caps = data.get("capabilities", [])
    assert any("catalog-item" in c for c in caps)


# ---------- Fix 8 — Papa scope: server accepts ?company=singh_exports ------
def test_papa_shipments_scoped(papa_hdr):
    r = requests.get(f"{API}/shipments?company=singh_exports", headers=papa_hdr, timeout=20)
    assert r.status_code == 200, r.text


def test_kishan_shipments_all(kishan_hdr):
    r = requests.get(f"{API}/shipments", headers=kishan_hdr, timeout=20)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---------- FY filter ------------------------------------------------------
def test_shipments_fy_filter(kishan_hdr):
    r = requests.get(f"{API}/shipments?fy=2025-26", headers=kishan_hdr, timeout=20)
    assert r.status_code == 200


# ---------- Stress test — 50 of each ---------------------------------------
CREATED = {"shipments": [], "invoices": [], "parties": [], "ledger": []}


def test_stress_seed_parties(kishan_hdr):
    ok, fail = 0, 0
    for i in range(50):
        payload = {
            "name": f"TEST_Party_{uuid.uuid4().hex[:8]}",
            "role": "customer",
            "country": "IN",
            "phone": f"9000{i:06d}",
        }
        r = requests.post(f"{API}/parties", headers=kishan_hdr, json=payload, timeout=20)
        if r.status_code in (200, 201):
            ok += 1
            CREATED["parties"].append(r.json().get("id"))
        else:
            fail += 1
    print(f"parties: {ok}/50 ok, {fail} failed")
    assert ok >= 40, f"only {ok} parties created"


def test_stress_seed_shipments(kishan_hdr):
    ok, fail = 0, 0
    # need a real party_id
    parties = requests.get(f"{API}/parties", headers=kishan_hdr, timeout=15).json()
    test_pids = [p["id"] for p in parties if str(p.get("name", "")).startswith("TEST_")]
    pid = test_pids[0] if test_pids else (parties[0]["id"] if parties else None)
    if not pid:
        pytest.skip("no party available for shipment stress test")
    for i in range(50):
        payload = {
            "consignment_no": f"TEST_C_{uuid.uuid4().hex[:8]}",
            "party_id": pid,
            "direction": "IN_TO_TH",
            "mode": "hand_carry",
            "origin": "Delhi",
            "destination": "Bangkok",
            "status": "pending",
            "bag_count": 1,
            "weight_kg": 10.5,
            "dispatch_date": "2025-06-15",
        }
        r = requests.post(f"{API}/shipments", headers=kishan_hdr, json=payload, timeout=20)
        if r.status_code in (200, 201):
            ok += 1
            CREATED["shipments"].append(r.json().get("id"))
        else:
            fail += 1
    print(f"shipments: {ok}/50 ok, {fail} failed (first fail? check body)")
    assert ok >= 30, f"only {ok} shipments created"


def test_stress_seed_invoices(kishan_hdr):
    ok, fail = 0, 0
    parties = requests.get(f"{API}/parties", headers=kishan_hdr, timeout=15).json()
    test_pids = [p["id"] for p in parties if str(p.get("name", "")).startswith("TEST_")]
    pid = test_pids[0] if test_pids else (parties[0]["id"] if parties else None)
    if not pid:
        pytest.skip("no party for invoice stress test")
    for i in range(50):
        payload = {
            "number": f"TEST-INV-{uuid.uuid4().hex[:6]}",
            "party_id": pid,
            "date": "2025-06-15",
            "currency": "INR",
            "items": [{"description": "Test item", "quantity": 1, "rate": 100}],
            "subtotal": 100,
            "tax": 18,
            "total": 118,
        }
        r = requests.post(f"{API}/invoices", headers=kishan_hdr, json=payload, timeout=20)
        if r.status_code in (200, 201):
            ok += 1
            CREATED["invoices"].append(r.json().get("id"))
        else:
            fail += 1
    print(f"invoices: {ok}/50 ok, {fail} failed")
    assert ok >= 30


def test_stress_seed_ledger(kishan_hdr):
    ok, fail = 0, 0
    # Use an existing party id if any
    parties_resp = requests.get(f"{API}/parties", headers=kishan_hdr, timeout=15)
    parties = parties_resp.json() if parties_resp.status_code == 200 else []
    pid = None
    for p in parties:
        if str(p.get("name", "")).startswith("TEST_"):
            pid = p.get("id")
            break
    if not pid and parties:
        pid = parties[0].get("id")
    for i in range(50):
        payload = {
            "party_id": pid,
            "date": "2025-06-15",
            "description": f"TEST entry {i}",
            "debit": 100 + i,
            "credit": 0,
            "currency": "INR",
            "ref_type": "manual",
        }
        r = requests.post(f"{API}/ledger/entries", headers=kishan_hdr, json=payload, timeout=20)
        if r.status_code in (200, 201):
            ok += 1
            CREATED["ledger"].append(r.json().get("id"))
        else:
            fail += 1
    print(f"ledger: {ok}/50 ok, {fail} failed")
    assert ok >= 20


def test_stress_cleanup(kishan_hdr):
    counters = {}
    for kind, ids in CREATED.items():
        endpoint = {
            "shipments": "shipments",
            "invoices": "invoices",
            "parties": "parties",
            "ledger": "ledger/entries",
        }[kind]
        ok, fail = 0, 0
        for rid in ids:
            if not rid:
                continue
            r = requests.delete(f"{API}/{endpoint}/{rid}", headers=kishan_hdr, timeout=15)
            if r.status_code in (200, 204):
                ok += 1
            else:
                fail += 1
        counters[kind] = (ok, fail)
    print(f"cleanup: {counters}")
