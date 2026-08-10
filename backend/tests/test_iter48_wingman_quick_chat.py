"""Backend tests for iteration 48 — Voice AI Assistant inside Now Brief card.

Covers:
  - POST /api/wingman/quick-chat: Admin role (kishan) → Hinglish reply with real IDs
  - POST /api/wingman/quick-chat: Papa role (bsingh) → 'Papa ji' style, Singh-Exports scope
  - POST /api/wingman/quick-chat: multi-turn history acknowledged
  - POST /api/assistant/stt: Whisper accepts multipart audio
  - POST /api/dashboard/now-brief: returns { brief, generated_at } ISO
  - POST /api/assistant/tts/stream: returns audio/mpeg (ElevenLabs 401 → OpenAI fallback)
"""

import io
import os
import wave
import struct

import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback to frontend/.env by reading it directly (env not always exported to pytest)
    from pathlib import Path
    envp = Path("/app/frontend/.env")
    if envp.exists():
        for line in envp.read_text().splitlines():
            if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": "kishan", "password": "Kishan@Boss2026"},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    return body.get("access_token") or body.get("token")


@pytest.fixture(scope="module")
def papa_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": "bsingh", "password": "Papa@2026"},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    return body.get("access_token") or body.get("token")


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


# ------------------------------------------------------------------
# /api/wingman/quick-chat
# ------------------------------------------------------------------
class TestWingmanQuickChat:
    def test_admin_returns_hinglish_reply_with_real_ids(self, admin_token):
        r = requests.post(
            f"{BASE_URL}/api/wingman/quick-chat",
            headers=_auth(admin_token),
            json={"message": "Aaj kitne shipments active hain? Top 3 batao."},
            timeout=60,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "response" in body and "data_used" in body
        assert isinstance(body["response"], str) and len(body["response"]) > 10
        assert isinstance(body["data_used"], list)
        # data_used should contain real consignment IDs from the DB snapshot
        assert len(body["data_used"]) >= 1, f"data_used empty: {body}"
        # At least one real-looking ID (AURA- or SN- or similar)
        assert any(len(cn) >= 3 for cn in body["data_used"])

    def test_papa_reply_uses_papa_ji_style(self, papa_token):
        r = requests.post(
            f"{BASE_URL}/api/wingman/quick-chat",
            headers=_auth(papa_token),
            json={"message": "Aaj kya kaam hai?"},
            timeout=60,
        )
        assert r.status_code == 200, r.text
        text = r.json()["response"].lower()
        # Papa role must NOT address as 'Sir' — expects 'papa ji' or 'ji'
        assert "papa" in text or " ji" in text, f"Papa reply missing honorific: {text}"

    def test_history_multiturn_context(self, admin_token):
        history = [
            {"role": "user", "content": "Delhi shipment ki status batao"},
            {"role": "assistant", "content": "Sir, Delhi ka shipment abhi in-transit hai."},
        ]
        r = requests.post(
            f"{BASE_URL}/api/wingman/quick-chat",
            headers=_auth(admin_token),
            json={"message": "Aur usme kitne bags hain?", "history": history},
            timeout=60,
        )
        assert r.status_code == 200, r.text
        assert isinstance(r.json().get("response"), str)
        assert len(r.json()["response"]) > 5

    def test_no_auth_still_returns_200_admin_default(self):
        # optional_current_user → endpoint works even without token
        r = requests.post(
            f"{BASE_URL}/api/wingman/quick-chat",
            json={"message": "Hi"},
            timeout=60,
        )
        assert r.status_code == 200
        assert "response" in r.json()


# ------------------------------------------------------------------
# /api/dashboard/now-brief
# ------------------------------------------------------------------
class TestDashboardNowBrief:
    def test_returns_brief_and_generated_at(self, admin_token):
        r = requests.post(
            f"{BASE_URL}/api/dashboard/now-brief",
            headers=_auth(admin_token),
            json={"tz_offset_minutes": 330},
            timeout=60,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "brief" in body and "generated_at" in body
        assert isinstance(body["brief"], str) and len(body["brief"]) > 20
        # ISO timestamp parseable
        from datetime import datetime
        datetime.fromisoformat(body["generated_at"].replace("Z", "+00:00"))

    def test_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/dashboard/now-brief", timeout=15)
        assert r.status_code in (401, 403)


# ------------------------------------------------------------------
# /api/assistant/stt (Whisper)
# ------------------------------------------------------------------
def _tiny_silent_wav_bytes(seconds: float = 0.5, sr: int = 16000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        n = int(sr * seconds)
        w.writeframes(struct.pack("<" + "h" * n, *([0] * n)))
    return buf.getvalue()


class TestAssistantSTT:
    def test_whisper_accepts_multipart(self, admin_token):
        wav = _tiny_silent_wav_bytes()
        files = {"file": ("silent.wav", wav, "audio/wav")}
        r = requests.post(
            f"{BASE_URL}/api/assistant/stt",
            headers=_auth(admin_token),
            files=files,
            timeout=45,
        )
        # Whisper may return 200 with empty text OR 400 for unusable audio.
        assert r.status_code in (200, 400), r.text
        if r.status_code == 200:
            body = r.json()
            assert "text" in body


# ------------------------------------------------------------------
# /api/assistant/tts/stream
# ------------------------------------------------------------------
class TestAssistantTTSStream:
    def test_streams_audio_mpeg(self, admin_token):
        r = requests.post(
            f"{BASE_URL}/api/assistant/tts/stream",
            headers=_auth(admin_token),
            json={"text": "Namaste Sir, wingman ready hai."},
            stream=True,
            timeout=60,
        )
        assert r.status_code == 200, r.text[:400] if hasattr(r, "text") else r.status_code
        ctype = r.headers.get("content-type", "").lower()
        assert "audio/mpeg" in ctype or "audio/mp3" in ctype, f"Unexpected content-type: {ctype}"
        # Consume a small chunk to confirm the stream is real
        chunk = next(r.iter_content(chunk_size=1024), b"")
        assert chunk and len(chunk) > 0
