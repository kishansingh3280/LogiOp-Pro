"""Iteration 49 — STT (Speech-to-Text) fix verification.

The previous backend code was calling a non-existent method
`OpenAISpeechToText.transcribe_audio(...)`. It has been switched to
`OpenAISpeechToText.transcribe(file=<open binary file>, ...)`.

We verify:
  1. New alias endpoint `POST /api/transcribe` works with a valid WAV
  2. Old `POST /api/assistant/stt` still works (backwards-compat)
  3. Missing `audio` field returns 400 JSON (not HTML)
  4. Garbage bytes with `.webm` extension do NOT crash — returns clean JSON
     (either 200 with empty text, or 502 with JSON detail — never HTML)
  5. No AttributeError('transcribe_audio') in backend logs
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
        # Fall back to /app/frontend/.env — pytest doesn't inherit those vars.
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

# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------


def _silent_wav_bytes(seconds: float = 1.0, rate: int = 16000) -> bytes:
    """Produce a valid 16-bit mono PCM WAV containing `seconds` of silence."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)  # 16-bit PCM
        w.setframerate(rate)
        w.writeframes(b"\x00\x00" * int(rate * seconds))
    return buf.getvalue()


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    yield s
    s.close()


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Log in as kishan/Admin — some flows may need auth."""
    r = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": "kishan", "password": "Kishan@Boss2026"},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    return r.json().get("access_token") or r.json().get("token")


# ---------------------------------------------------------------------------
# 1. POST /api/transcribe — happy path, silent wav
# ---------------------------------------------------------------------------


class TestTranscribeAlias:
    """/api/transcribe canonical alias."""

    def test_transcribe_silent_wav_returns_json_200(self, api_client):
        wav = _silent_wav_bytes(1.0)
        files = {"audio": ("silence.wav", wav, "audio/wav")}
        r = api_client.post(f"{BASE_URL}/api/transcribe", files=files, timeout=60)
        # Must be JSON, never HTML — hard assertion on content-type
        ctype = r.headers.get("content-type", "")
        assert "application/json" in ctype, (
            f"Expected JSON response but got '{ctype}'. Body: {r.text[:200]}"
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "text" in body, body
        # Silence → empty transcription is the correct behaviour
        assert isinstance(body["text"], str)

    def test_transcribe_missing_audio_returns_400_json(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/transcribe", data={}, timeout=15)
        ctype = r.headers.get("content-type", "")
        assert "application/json" in ctype, f"Expected JSON, got {ctype}: {r.text[:200]}"
        assert r.status_code == 400
        body = r.json()
        assert "audio" in (body.get("detail") or "").lower()

    def test_transcribe_garbage_bytes_does_not_crash_backend(self, api_client):
        """Random bytes with .webm extension — backend must never crash.

        NOTE: We hit the backend directly on localhost:8001 here because the
        Kubernetes ingress rewrites ANY upstream 5xx into its own HTML error
        page — so hitting the public URL for a 502 flow returns HTML no matter
        what the backend body actually is. The backend contract is what we're
        actually validating (JSON body, no AttributeError). The ingress-HTML
        edge is separately reported to the main agent as an action item —
        recommend returning 400 (which the ingress leaves alone) instead of
        502 for `STT upstream error`.
        """
        garbage = os.urandom(4096)
        files = {"audio": ("junk.webm", garbage, "audio/webm")}
        r = api_client.post(
            "http://localhost:8001/api/transcribe", files=files, timeout=60
        )
        ctype = r.headers.get("content-type", "")
        assert "application/json" in ctype, (
            f"Backend did NOT return JSON, got '{ctype}'. Body: {r.text[:300]}"
        )
        assert r.status_code in (200, 400, 502), (
            f"Unexpected status {r.status_code}: {r.text[:300]}"
        )
        body = r.json()
        assert "text" in body or "detail" in body, body
        # Verify the specific "transcribe_audio" AttributeError is gone
        detail = (body.get("detail") or "") if isinstance(body, dict) else ""
        assert "transcribe_audio" not in detail, (
            f"Regression: old AttributeError bubbled up: {detail}"
        )


# ---------------------------------------------------------------------------
# 2. POST /api/assistant/stt — backwards-compat alias
# ---------------------------------------------------------------------------


class TestAssistantSttBackcompat:
    """/api/assistant/stt (older name) still works identically."""

    def test_stt_silent_wav_returns_json_200(self, api_client):
        wav = _silent_wav_bytes(1.0)
        files = {"audio": ("silence.wav", wav, "audio/wav")}
        r = api_client.post(f"{BASE_URL}/api/assistant/stt", files=files, timeout=60)
        ctype = r.headers.get("content-type", "")
        assert "application/json" in ctype, (
            f"Expected JSON, got '{ctype}'. Body: {r.text[:200]}"
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "text" in body and isinstance(body["text"], str)

    def test_stt_missing_audio_returns_400_json(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/assistant/stt", data={}, timeout=15)
        assert r.status_code == 400
        assert "application/json" in r.headers.get("content-type", "")
        assert "audio" in (r.json().get("detail") or "").lower()


# ---------------------------------------------------------------------------
# 3. Backend logs sanity — no AttributeError('transcribe_audio')
# ---------------------------------------------------------------------------


class TestBackendLogsClean:
    def test_no_transcribe_audio_attribute_error(self):
        """Grep supervisor logs for the previous AttributeError signature."""
        log_paths = [
            "/var/log/supervisor/backend.err.log",
            "/var/log/supervisor/backend.out.log",
        ]
        offenders = []
        for p in log_paths:
            try:
                with open(p, "r", errors="ignore") as fh:
                    # Only look at the tail (last 200 KB) so we don't false-flag
                    # historical failures from before the fix.
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
