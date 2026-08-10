"""Iteration 50 — confirm STT endpoint returns 400 (not 502) on upstream errors.

Rationale (from iter49 findings): the K8s ingress rewrites any upstream 5xx
into an HTML 'Bad gateway' page which then leaked into the frontend error
card as "STT 502: <!DOCTYPE html>...". Fix: backend now raises
HTTPException(400, ...) instead of 502 for invalid audio, so the JSON body
passes through the ingress untouched.

We validate:
  1. Random bytes via PUBLIC URL → 400 JSON `{"detail":"STT upstream error: ..."}`
     (previously 502-HTML)
  2. Missing audio field via PUBLIC URL → 400 JSON `{"detail":"Missing ..."}`
  3. Silent WAV via PUBLIC URL → 200 JSON `{"text":""}`
  4. Content-Type is application/json in ALL cases; body never contains
     '<!DOCTYPE' / '<html'.
"""
import io
import os
import wave

import pytest
import requests


def _load_backend_url() -> str:
    url = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get(
        "EXPO_BACKEND_URL"
    )
    if not url:
        try:
            with open("/app/frontend/.env", "r") as fh:
                for line in fh:
                    line = line.strip()
                    if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
                        url = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break
        except FileNotFoundError:
            pass
    if not url:
        raise RuntimeError("EXPO_PUBLIC_BACKEND_URL not set")
    return url.rstrip("/")


BASE_URL = _load_backend_url()


def _silent_wav_bytes(seconds: float = 1.0, rate: int = 16000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(b"\x00\x00" * int(rate * seconds))
    return buf.getvalue()


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    yield s
    s.close()


HTML_MARKERS = ("<!doctype", "<html", "<body", "<style")


def _assert_no_html_leak(text: str, ctx: str):
    low = text.lower()
    for marker in HTML_MARKERS:
        assert marker not in low, (
            f"[{ctx}] Response body leaks HTML marker '{marker}': {text[:200]}"
        )


class TestSttNoHtmlLeaksThroughPublicIngress:
    """Public URL — verify the 502→400 fix reaches the operator cleanly."""

    def test_garbage_bytes_returns_400_json_not_502_html(self, api_client):
        garbage = os.urandom(4096)
        files = {"audio": ("junk.webm", garbage, "audio/webm")}
        r = api_client.post(
            f"{BASE_URL}/api/transcribe", files=files, timeout=60
        )
        ctype = r.headers.get("content-type", "")
        assert "application/json" in ctype, (
            f"Public URL returned non-JSON ({ctype}). Body: {r.text[:300]}"
        )
        assert r.status_code == 400, (
            f"Expected 400 (not 502), got {r.status_code}. Body: {r.text[:300]}"
        )
        _assert_no_html_leak(r.text, "garbage-bytes public url")
        body = r.json()
        assert "detail" in body, body
        assert "transcribe_audio" not in (body.get("detail") or ""), (
            "Old AttributeError signature must not appear"
        )

    def test_missing_audio_returns_400_json(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/transcribe", data={}, timeout=15)
        ctype = r.headers.get("content-type", "")
        assert "application/json" in ctype, (
            f"Expected JSON, got {ctype}: {r.text[:200]}"
        )
        assert r.status_code == 400
        _assert_no_html_leak(r.text, "missing-audio public url")
        body = r.json()
        assert "audio" in (body.get("detail") or "").lower()

    def test_silent_wav_returns_200_empty_text(self, api_client):
        wav = _silent_wav_bytes(1.0)
        files = {"audio": ("silence.wav", wav, "audio/wav")}
        r = api_client.post(
            f"{BASE_URL}/api/transcribe", files=files, timeout=60
        )
        ctype = r.headers.get("content-type", "")
        assert "application/json" in ctype, (
            f"Expected JSON, got {ctype}: {r.text[:200]}"
        )
        assert r.status_code == 200, r.text
        _assert_no_html_leak(r.text, "silent-wav public url")
        body = r.json()
        assert "text" in body and isinstance(body["text"], str)
        # Silent WAV → empty transcription is expected
        assert body["text"] == "", (
            f"Silent WAV should give empty text, got: {body['text']!r}"
        )

    def test_assistant_stt_alias_garbage_bytes_400_not_502(self, api_client):
        """Backwards-compat /api/assistant/stt alias must also return 400."""
        garbage = os.urandom(4096)
        files = {"audio": ("junk.webm", garbage, "audio/webm")}
        r = api_client.post(
            f"{BASE_URL}/api/assistant/stt", files=files, timeout=60
        )
        ctype = r.headers.get("content-type", "")
        assert "application/json" in ctype, (
            f"Alias endpoint returned non-JSON ({ctype}). Body: {r.text[:300]}"
        )
        assert r.status_code == 400, (
            f"Alias expected 400 (not 502), got {r.status_code}. Body: {r.text[:300]}"
        )
        _assert_no_html_leak(r.text, "alias garbage-bytes public url")


class TestBackendLogsCleanIter50:
    def test_no_recent_transcribe_audio_attribute_error(self):
        log_paths = [
            "/var/log/supervisor/backend.err.log",
            "/var/log/supervisor/backend.out.log",
        ]
        offenders = []
        for p in log_paths:
            try:
                with open(p, "r", errors="ignore") as fh:
                    fh.seek(0, os.SEEK_END)
                    size = fh.tell()
                    fh.seek(max(0, size - 200_000))
                    tail = fh.read()
                if "transcribe_audio" in tail:
                    offenders.append(p)
            except FileNotFoundError:
                continue
        assert not offenders, (
            f"Old AttributeError signature 'transcribe_audio' present in: {offenders}"
        )
