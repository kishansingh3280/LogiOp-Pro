"""
Phase-2 backend verification — OpenAI Realtime Voice Assistant.

Focus:
- ElevenLabs fully removed from active TTS pipeline (Phase 2)
- /api/assistant/tts/stream now goes STRAIGHT to OpenAI onyx
- Backend logs show `[TTS] OpenAI <voice> (speed=X)` and no ElevenLabs traces
- /api/realtime-token still returns ephemeral `ek_...` keys (Phase-1 unchanged)
"""
import os
import re
import time

import pytest
import requests

BASE_URL = (os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "").rstrip("/")
if not BASE_URL:
    raise RuntimeError("EXPO_PUBLIC_BACKEND_URL is required for tests")


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


class TestTTSStream:
    """Phase-2: ElevenLabs removed → OpenAI onyx direct."""

    def test_tts_stream_get_onyx_returns_audio(self, api_client):
        r = api_client.get(
            f"{BASE_URL}/api/assistant/tts/stream",
            params={"text": "Hi", "voice": "onyx"},
            timeout=30,
        )
        assert r.status_code == 200, f"status={r.status_code} body={r.text[:200]}"
        assert r.headers.get("content-type", "").startswith("audio/mpeg"), (
            f"content-type={r.headers.get('content-type')}"
        )
        assert len(r.content) > 5000, f"audio bytes={len(r.content)} (expected >5000)"

    def test_tts_stream_get_default_voice(self, api_client):
        # No voice param → default "shimmer" (OpenAI). Still audio/mpeg 200.
        r = api_client.get(
            f"{BASE_URL}/api/assistant/tts/stream",
            params={"text": "Namaste"},
            timeout=30,
        )
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("audio/mpeg")

    def test_tts_stream_post_returns_audio(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/assistant/tts/stream",
            json={"text": "Hello ji", "voice": "onyx", "speed": 0.88},
            timeout=30,
        )
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("audio/mpeg")
        assert len(r.content) > 5000

    def test_tts_stream_rejects_empty_text(self, api_client):
        r = api_client.get(
            f"{BASE_URL}/api/assistant/tts/stream",
            params={"text": ""},
            timeout=15,
        )
        assert r.status_code == 400


class TestBackendLogTraceHasNoElevenLabs:
    """Regression: after an actual TTS call, the backend log line should be
    the simplified `[TTS] OpenAI <voice> (speed=X)` and NOT reference
    ElevenLabs/fallback in this iteration."""

    LOG_PATHS = [
        "/var/log/supervisor/backend.err.log",
        "/var/log/supervisor/backend.out.log",
    ]

    def _read_recent(self, max_bytes=200_000):
        # Read the tail of EACH file separately so the [TTS] log line
        # inside backend.err.log isn't crowded out by verbose access
        # logs in backend.out.log.
        chunks = []
        for p in self.LOG_PATHS:
            if os.path.exists(p):
                try:
                    with open(p, "rb") as f:
                        f.seek(0, 2)
                        size = f.tell()
                        f.seek(max(0, size - max_bytes))
                        chunks.append(f.read().decode("utf-8", errors="ignore"))
                except Exception:
                    pass
        return "\n===LOGSEP===\n".join(chunks)

    def test_marker_after_call(self, api_client):
        marker = f"tts-marker-{int(time.time())}"
        # Record the current tail-end of each log so we can look ONLY at
        # lines emitted AFTER this test call. This isolates the current
        # Phase-2 log line from stale entries from prior iterations.
        pre_lengths = {}
        for p in self.LOG_PATHS:
            if os.path.exists(p):
                pre_lengths[p] = os.path.getsize(p)
            else:
                pre_lengths[p] = 0

        r = api_client.get(
            f"{BASE_URL}/api/assistant/tts/stream",
            params={"text": marker, "voice": "onyx"},
            timeout=30,
        )
        assert r.status_code == 200
        time.sleep(1.2)  # flush stdout/stderr into supervisor log

        # Read ONLY the new bytes appended since pre_lengths.
        chunks = []
        for p in self.LOG_PATHS:
            if not os.path.exists(p):
                continue
            try:
                with open(p, "rb") as f:
                    f.seek(pre_lengths.get(p, 0))
                    chunks.append(f.read().decode("utf-8", errors="ignore"))
            except Exception:
                pass
        window = "\n".join(chunks)

        # 1. The new `[TTS] OpenAI ...` log line must be present.
        assert re.search(r"\[TTS\] OpenAI \w+ \(speed=", window), (
            f"Missing '[TTS] OpenAI ...' log line in new backend log window:\n{window[-2000:]}"
        )

        # 2. NO fallback/failure messages in the NEW window only.
        forbidden = [
            "[TTS] Using OpenAI",
            "[TTS] ElevenLabs failed",
            "ElevenLabs 401",
            "ElevenLabs 402",
            "ElevenLabs 403",
        ]
        for token in forbidden:
            assert token not in window, (
                f"Forbidden legacy log line still present in NEW window: '{token}'."
            )


class TestRealtimeTokenUnchanged:
    """Phase-1 regression: POST /api/realtime-token still returns ek_...."""

    def test_realtime_token_returns_ephemeral(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/realtime-token", json={}, timeout=30)
        assert r.status_code == 200, f"status={r.status_code} body={r.text[:300]}"
        data = r.json()
        assert "ephemeral_key" in data, f"payload missing ephemeral_key: {data}"
        assert data["ephemeral_key"].startswith("ek_"), (
            f"ephemeral_key does not start with ek_: {data['ephemeral_key']}"
        )
        assert data.get("model") == "gpt-realtime"
        assert "expires_at" in data
        assert "session_id" in data


class TestVoiceCommandSmoke:
    """Phase-1 regression: /api/voice-command still resolves known actions."""

    def test_get_summary_action(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/voice-command",
            json={"action": "get_summary", "params": {}},
            timeout=30,
        )
        assert r.status_code == 200
        body = r.json()
        assert body.get("ok") is True

    def test_unknown_action_soft_fails(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/voice-command",
            json={"action": "totally_bogus_xyz", "params": {}},
            timeout=30,
        )
        assert r.status_code == 200
        body = r.json()
        assert body.get("ok") is False
