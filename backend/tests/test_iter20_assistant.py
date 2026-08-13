"""Iteration 20 backend verification for /api/assistant/* + regression."""
import os
import time
import pytest
import requests

BASE = os.environ.get("EXPO_BACKEND_URL", "https://opsi-complete.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"


# ----- Regression: pre-existing routes still up ---------------------------
@pytest.mark.parametrize("path", ["/invoices", "/shipments", "/bullion/rates"])
def test_regression_existing_routes(path):
    r = requests.get(f"{API}{path}", timeout=10)
    assert r.status_code == 200, f"{path} -> {r.status_code} / {r.text[:200]}"


# ----- /assistant/chat SSE stream + TTFT ----------------------------------
def test_assistant_chat_sse_stream_ttft():
    payload = {"session_id": "agent-test", "message": "नमस्ते", "history": []}
    t0 = time.perf_counter()
    with requests.post(f"{API}/assistant/chat", json=payload, stream=True, timeout=30) as r:
        assert r.status_code == 200, f"status={r.status_code} body={r.text[:200]}"
        ct = r.headers.get("content-type", "")
        assert "text/event-stream" in ct, f"content-type={ct}"

        first_token_time = None
        got_data = False
        got_done = False
        raw_chunks = []
        for raw in r.iter_lines(decode_unicode=True):
            if raw is None:
                continue
            if raw == "":
                continue
            raw_chunks.append(raw)
            if raw.startswith("data:") and first_token_time is None:
                first_token_time = time.perf_counter() - t0
                got_data = True
            if raw.startswith("event: done") or raw.startswith("event:done"):
                got_done = True
                break
            # safety: don't hang forever
            if time.perf_counter() - t0 > 25:
                break

    assert got_data, f"no data frame received. raw={raw_chunks[:10]}"
    assert first_token_time is not None
    print(f"TTFT={first_token_time:.3f}s")
    assert first_token_time < 2.0, f"TTFT {first_token_time:.2f}s exceeds 2s SLA"
    assert got_done, "no 'event: done' terminator received"


# ----- /assistant/memory --------------------------------------------------
TEST_KEY = "party:Ramesh"
TEST_VAL = "default carrier: Air India"


def _find_row(rows, key):
    return next((r for r in rows if r.get("key") == key), None)


def test_assistant_memory_upsert_and_hits_increment():
    # 1st POST — creates or increments
    r1 = requests.post(f"{API}/assistant/memory", json={"key": TEST_KEY, "value": TEST_VAL}, timeout=10)
    assert r1.status_code == 200 and r1.json() == {"ok": True}

    # Fetch current hits
    rows = requests.get(f"{API}/assistant/memory", timeout=10).json()
    row = _find_row(rows, TEST_KEY)
    assert row is not None, "memory row missing after POST"
    baseline_hits = int(row.get("hits") or 0)

    # 2nd POST — must bump hits
    r2 = requests.post(f"{API}/assistant/memory", json={"key": TEST_KEY, "value": TEST_VAL}, timeout=10)
    assert r2.status_code == 200 and r2.json() == {"ok": True}

    rows2 = requests.get(f"{API}/assistant/memory", timeout=10).json()
    row2 = _find_row(rows2, TEST_KEY)
    assert row2 is not None
    assert int(row2["hits"]) == baseline_hits + 1, f"hits did not bump: {baseline_hits} -> {row2['hits']}"


def test_assistant_memory_list_sorted_by_hits_desc():
    rows = requests.get(f"{API}/assistant/memory", timeout=10).json()
    assert isinstance(rows, list)
    if len(rows) >= 2:
        hits = [int(r.get("hits") or 0) for r in rows]
        assert hits == sorted(hits, reverse=True), f"not sorted desc: {hits}"


# ----- /assistant/tts -----------------------------------------------------
def test_assistant_tts_returns_audio_mpeg():
    r = requests.post(f"{API}/assistant/tts", json={"text": "नमस्ते", "voice": "nova"}, timeout=30)
    assert r.status_code == 200, f"status={r.status_code} body={r.text[:200]}"
    ct = r.headers.get("content-type", "")
    assert "audio/mpeg" in ct, f"content-type={ct}"
    assert len(r.content) > 1024, f"body too small: {len(r.content)} bytes"


# ----- /assistant/stt validation -----------------------------------------
def test_assistant_stt_400_without_audio():
    # Send an empty multipart form so FastAPI reads it as form data with no `audio` key.
    r = requests.post(f"{API}/assistant/stt", files={"dummy": ("x.txt", b"x")}, timeout=15)
    assert r.status_code == 400, f"expected 400, got {r.status_code} body={r.text[:200]}"


# ----- Perf gate ----------------------------------------------------------
@pytest.mark.parametrize("path", ["/invoices", "/shipments", "/bullion/rates", "/assistant/memory"])
def test_endpoint_under_2s(path):
    t0 = time.perf_counter()
    r = requests.get(f"{API}{path}", timeout=5)
    dt = time.perf_counter() - t0
    assert r.status_code == 200
    assert dt < 2.0, f"{path} took {dt:.2f}s > 2s"
