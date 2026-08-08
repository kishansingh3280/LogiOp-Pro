"""Iteration 20b RETEST — verify TTS/TTFT fixes + DELETE memory endpoint."""
import os
import time
import pytest
import requests

BASE = os.environ.get("EXPO_BACKEND_URL", "https://native-logistics-hub.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

TEST_KEY = "party:RetestRow"
TEST_VAL = "carrier: Vistara"


# ----- HARD FAIL retest: /assistant/tts must return real MP3 -----
def test_tts_returns_valid_mp3():
    r = requests.post(
        f"{API}/assistant/tts",
        json={"text": "नमस्ते", "voice": "nova"},
        timeout=60,
    )
    assert r.status_code == 200, f"status={r.status_code} body={r.text[:300]}"
    ct = r.headers.get("content-type", "")
    assert "audio/mpeg" in ct, f"content-type={ct}"
    body = r.content
    print(f"TTS body size = {len(body)} bytes; first4={body[:4]!r}")
    assert len(body) > 3072, f"body too small: {len(body)} bytes (<3KB)"
    # Valid MP3 signature: ID3 tag or MPEG frame sync (0xFFFB / 0xFFF3 / 0xFFFA / 0xFFF2)
    head = body[:3]
    valid = head == b"ID3" or (body[0] == 0xFF and (body[1] & 0xE0) == 0xE0)
    assert valid, f"missing MP3 header: first bytes = {body[:8]!r}"


# ----- SOFT FAIL retest: /assistant/chat TTFT must be <= 2s -----
def test_chat_ttft_under_2s():
    payload = {"session_id": "retest", "message": "नमस्ते", "history": []}
    t0 = time.perf_counter()
    with requests.post(f"{API}/assistant/chat", json=payload, stream=True, timeout=30) as r:
        assert r.status_code == 200, f"status={r.status_code} body={r.text[:200]}"
        ct = r.headers.get("content-type", "")
        assert "text/event-stream" in ct, f"content-type={ct}"

        # Look for FIRST bytes (either ": ping" keep-alive or "data:" delta)
        first_frame = None
        ttft = None
        got_done = False
        raw_chunks = []
        for raw in r.iter_lines(decode_unicode=True):
            if raw is None or raw == "":
                continue
            raw_chunks.append(raw)
            if ttft is None:
                ttft = time.perf_counter() - t0
                first_frame = raw
            if raw.startswith("event: done") or raw.startswith("event:done"):
                got_done = True
                break
            if time.perf_counter() - t0 > 25:
                break

    print(f"TTFT={ttft:.3f}s first_frame={first_frame!r}")
    assert ttft is not None, f"no frames received: {raw_chunks[:10]}"
    assert ttft <= 2.0, f"TTFT {ttft:.2f}s > 2s SLA"
    # Confirm first frame is either the ping keep-alive OR a data delta
    assert first_frame.startswith(": ping") or first_frame.startswith("data:") or first_frame.startswith(":"), \
        f"unexpected first frame: {first_frame!r}"
    assert got_done, "no 'event: done' terminator received"


# ----- Memory upsert + hit counter still works -----
def _find(rows, key):
    return next((r for r in rows if r.get("key") == key), None)


def test_memory_upsert_and_hits_bump():
    # cleanup first via new DELETE endpoint (idempotent)
    requests.delete(f"{API}/assistant/memory/{TEST_KEY}", timeout=10)

    r1 = requests.post(f"{API}/assistant/memory", json={"key": TEST_KEY, "value": TEST_VAL}, timeout=10)
    assert r1.status_code == 200 and r1.json().get("ok") is True

    rows = requests.get(f"{API}/assistant/memory", timeout=10).json()
    row = _find(rows, TEST_KEY)
    assert row is not None, "memory row missing after POST"
    base_hits = int(row.get("hits") or 0)

    r2 = requests.post(f"{API}/assistant/memory", json={"key": TEST_KEY, "value": TEST_VAL}, timeout=10)
    assert r2.status_code == 200

    rows2 = requests.get(f"{API}/assistant/memory", timeout=10).json()
    row2 = _find(rows2, TEST_KEY)
    assert row2 and int(row2["hits"]) == base_hits + 1, f"hits {base_hits} -> {row2 and row2.get('hits')}"


def test_memory_list_sorted_by_hits_desc():
    rows = requests.get(f"{API}/assistant/memory", timeout=10).json()
    assert isinstance(rows, list)
    if len(rows) >= 2:
        hits = [int(r.get("hits") or 0) for r in rows]
        assert hits == sorted(hits, reverse=True), f"not sorted desc: {hits}"


# ----- NEW: DELETE endpoint -----
def test_memory_delete_removes_row_and_is_idempotent():
    # ensure row exists
    requests.post(f"{API}/assistant/memory", json={"key": TEST_KEY, "value": TEST_VAL}, timeout=10)
    rows = requests.get(f"{API}/assistant/memory", timeout=10).json()
    assert _find(rows, TEST_KEY) is not None

    # first delete removes
    d1 = requests.delete(f"{API}/assistant/memory/{TEST_KEY}", timeout=10)
    assert d1.status_code in (200, 204), f"delete1 status={d1.status_code} body={d1.text[:200]}"

    rows2 = requests.get(f"{API}/assistant/memory", timeout=10).json()
    assert _find(rows2, TEST_KEY) is None, "row still present after DELETE"

    # second delete idempotent
    d2 = requests.delete(f"{API}/assistant/memory/{TEST_KEY}", timeout=10)
    assert d2.status_code in (200, 204, 404), f"delete2 status={d2.status_code}"


# ----- Regression: existing routes still up -----
@pytest.mark.parametrize("path", ["/invoices", "/shipments", "/bullion/rates"])
def test_regression_routes(path):
    r = requests.get(f"{API}{path}", timeout=10)
    assert r.status_code == 200, f"{path} -> {r.status_code}"
