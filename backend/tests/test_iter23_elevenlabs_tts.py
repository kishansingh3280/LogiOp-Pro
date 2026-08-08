"""iter23 — ElevenLabs TTS primary-path + Assistant history/chat regression.

Focus:
  1. /api/assistant/tts/stream (POST + GET) serves REAL ElevenLabs MP3
     bytes (Liam voice TX3LPaxmHKxFdv7VOQHJ) via eleven_multilingual_v2.
  2. Backend log emits "[TTS] ElevenLabs streaming" (not the OpenAI
     shimmer fallback line) for the same request.
  3. /api/assistant/history returns a JSON list for kishan.
  4. /api/assistant/chat returns 200 with a reply for a Hinglish prompt.
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
if BASE_URL:
    BASE_URL = BASE_URL.rstrip("/")

LOG_PATH = "/var/log/supervisor/backend.err.log"


def _log_size() -> int:
    try:
        return os.path.getsize(LOG_PATH)
    except OSError:
        return 0


def _log_since(offset: int) -> str:
    try:
        with open(LOG_PATH, "rb") as f:
            f.seek(offset)
            return f.read().decode("utf-8", errors="ignore")
    except OSError:
        return ""


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def token(api):
    r = api.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": "kishan", "password": "Kishan@Boss2026"},
        timeout=15,
    )
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text[:200]}"
    data = r.json()
    assert "access_token" in data
    return data["access_token"]


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


class TestAuth:
    def test_login_returns_access_token(self, api):
        r = api.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "kishan", "password": "Kishan@Boss2026"},
            timeout=15,
        )
        assert r.status_code == 200
        j = r.json()
        assert isinstance(j.get("access_token"), str) and len(j["access_token"]) > 20


class TestAssistantHistory:
    """Unified Wingman/WhatsApp history feed used by floating-jarvis sidebar.
    Endpoint uses optional_current_user: returns [] for unauth, list for auth.
    """

    def test_history_unauth_returns_empty_list(self, api):
        r = api.get(f"{BASE_URL}/api/assistant/history", timeout=10)
        assert r.status_code == 200
        assert r.json() == []

    def test_history_returns_list_for_kishan(self, api, auth_headers):
        r = api.get(f"{BASE_URL}/api/assistant/history", headers=auth_headers, timeout=15)
        assert r.status_code == 200, f"{r.status_code} {r.text[:200]}"
        j = r.json()
        assert isinstance(j, list), f"expected list, got {type(j)}"
        # If any items, they must have id/role/content
        for m in j[:5]:
            assert "role" in m and "content" in m


class TestAssistantChat:
    def test_chat_returns_hinglish_text(self, api, auth_headers):
        import uuid
        payload = {
            "session_id": f"iter23-{uuid.uuid4().hex[:8]}",
            "message": "Boss, ek line mein hello bolo.",
            "history": [],
            "honorific": "Sir",
            "display_name": "Kishan",
        }
        r = api.post(
            f"{BASE_URL}/api/assistant/chat",
            headers=auth_headers,
            json=payload,
            timeout=60,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        body = r.text
        assert body and len(body.strip()) > 0
        # SSE frames start with `data:` — accept either raw JSON or SSE
        assert "data:" in body or "{" in body


class TestTtsStreamPrimaryElevenLabs:
    HINGLISH = "Namaste Kishan boss, aaj ka status bilkul theek hai."

    def _read_mp3(self, resp, max_bytes: int = 65536) -> bytes:
        assert resp.status_code == 200, f"{resp.status_code} {resp.text[:300]}"
        ctype = resp.headers.get("content-type", "").lower()
        assert "audio/mpeg" in ctype, f"unexpected content-type: {ctype}"
        chunks = []
        total = 0
        for chunk in resp.iter_content(chunk_size=4096):
            if not chunk:
                continue
            chunks.append(chunk)
            total += len(chunk)
            if total >= max_bytes:
                break
        blob = b"".join(chunks)
        assert total >= 2048, f"stream too small ({total}B) — probably error/empty"
        head = blob[:4]
        looks_like_mp3 = (
            head.startswith(b"ID3")
            or (len(blob) >= 2 and blob[0] == 0xFF and (blob[1] & 0xE0) == 0xE0)
        )
        assert looks_like_mp3, f"first bytes don't look like MP3: {head!r}"
        return blob

    def _assert_log_says_elevenlabs(self, offset: int):
        # Give the log a beat to flush
        for _ in range(6):
            time.sleep(0.5)
            new = _log_since(offset)
            if "[TTS] ElevenLabs streaming" in new or "[TTS] Using OpenAI" in new:
                break
        new = _log_since(offset)
        assert "[TTS] ElevenLabs streaming" in new, (
            "expected '[TTS] ElevenLabs streaming' in appended log window.\n"
            f"---LOG WINDOW ({len(new)}B)---\n{new[-2000:]}"
        )
        assert "[TTS] Using OpenAI shimmer fallback" not in new, (
            "backend fell back to OpenAI — ElevenLabs primary path is NOT active"
        )

    def test_post_tts_stream_uses_elevenlabs(self):
        offset = _log_size()
        r = requests.post(
            f"{BASE_URL}/api/assistant/tts/stream",
            json={"text": self.HINGLISH},
            stream=True,
            timeout=45,
        )
        try:
            blob = self._read_mp3(r)
            print(f"[POST tts/stream] streamed {len(blob)}B ElevenLabs MP3")
        finally:
            r.close()
        self._assert_log_says_elevenlabs(offset)

    def test_get_tts_stream_uses_elevenlabs(self):
        offset = _log_size()
        r = requests.get(
            f"{BASE_URL}/api/assistant/tts/stream",
            params={"text": self.HINGLISH},
            stream=True,
            timeout=45,
        )
        try:
            blob = self._read_mp3(r)
            print(f"[GET tts/stream] streamed {len(blob)}B ElevenLabs MP3")
        finally:
            r.close()
        self._assert_log_says_elevenlabs(offset)

    def test_tts_stream_empty_text_400(self, api):
        r = api.post(
            f"{BASE_URL}/api/assistant/tts/stream",
            json={"text": ""},
            timeout=10,
        )
        assert r.status_code == 400
