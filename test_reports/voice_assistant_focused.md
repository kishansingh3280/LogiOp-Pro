# Voice Assistant — Focused Diagnostic (Read-Only)

**Date**: 2026-01-10  
**Auth**: `kishan` (Admin, JWT via `/api/auth/login`)  
**Backend base URL**: `https://cyber-logistics-hub-1.preview.emergentagent.com`  
**Frontend preview**: `http://localhost:3000` (Expo web)  
**Transport under test**: WebRTC (SDP over HTTPS to OpenAI), NOT WebSocket

---

## 🚨 TL;DR — CRITICAL BUG BLOCKING ALL VOICE

The Voice Orb is **completely non-functional in the current preview** because the frontend still POSTs the SDP offer to OpenAI's **deprecated Beta WebRTC endpoint**. OpenAI now rejects it with HTTP **400 `beta_api_shape_disabled`**. The peer connection therefore never reaches `connected`, the `oai-events` data channel never opens, and no scenario that requires an open session can be exercised.

Exact error body from OpenAI:
```
HTTP 400
{ "error": {
    "message": "The Realtime Beta API is no longer supported. Please use /v1/realtime for the GA API.",
    "type": "invalid_request_error",
    "code": "beta_api_shape_disabled",
    "param": ""
} }
```

**Root cause** — `frontend/src/hooks/use-realtime-voice.ts:425-436` uses the beta URL:
```ts
fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, ...)
```
GA WebRTC path is now `https://api.openai.com/v1/realtime/calls` (see OpenAI GA docs — https://developers.openai.com/api/docs/guides/realtime-webrtc). The backend's `/v1/realtime/client_secrets` mint call (`server.py:2457`) is already on the GA path — only the client SDP POST is stuck on the beta URL.

**Suggested fix** (single line, main agent to apply):
```ts
`https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(model)}`
```

---

## Scenario Matrix

### 1. Orb click → transport handshake — ❌ FAILS at SDP step
- `POST /api/realtime-token` → **200 ✅** (`ephemeral_key: ek_...`, `model: "gpt-realtime"`, `session_id: sess_...`)
- Instrumented `RTCPeerConnection`:
  - `addTrack(kind=audio, label="Fake Default Audio Input", enabled, live)` ✅ (mic track was actually added)
  - `createDataChannel("oai-events")` ✅
  - Local SDP offer contains a valid `m=audio 9 UDP/TLS/RTP/SAVPF 111 …` section with Opus/48000 — SDP shape is fine.
- `POST https://api.openai.com/v1/realtime?model=gpt-realtime` → **400 `beta_api_shape_disabled`** ❌
- `pc.connectionState` never leaves `new` → hook throws → `disconnect()` closes DC/PC.
- Final state: `pc.connectionState = "closed"`, `dc.readyState = "closed"`.

### 2. Response time for "Namaste, mera naam kya hai?" — ⚠️ CANNOT TEST
- Injected via `dc.send({type:"conversation.item.create"...}) + {type:"response.create"}` after the orb click.
- Result: `dc.readyState = "closed"` — send returned `ok: false, reason: "dc not open"`.
- No `response.created` or `response.audio.delta` events ever fired. Latency cannot be measured until scenario 1 is fixed.

### 3. Data-fetch response for "Kitne shipments pending hain?" — ⚠️ CANNOT TEST
- Same blockage as #2. No data channel → no model turn.
- **Design note** (source review): even once the session opens, this query relies solely on the `page_data_summary` string that the client sends to `/api/realtime-token` at mint time. There is **no tool exposed to the model for live shipment/ledger queries** — only `fill_form` (`use-realtime-voice.ts:371-406`). So even in the happy path the answer will be limited to whatever the current-screen summary snapshot contains. Consider adding a `get_dashboard_stats` / `query_shipments` function tool if you want authoritative live numbers, otherwise the model will fall back to "main check karta hoon" style responses.

### 4. Interruption behavior — ⚠️ CANNOT TEST
- Depends on an open DC. Source review confirms handling is wired:
  - `interrupt_response: true` set at `server.py:2441`.
  - `response.output_audio_buffer.stopped` handled implicitly (no explicit branch, but `response.done` returns state to `listening`).
  - Manual barge-in via `sendText` sends `response.create` regardless of active response.
- No `response.cancelled` handler is registered in `use-realtime-voice.ts` (only `error`, `response.done`, `response.audio_transcript.delta`, `response.output_text.delta`, `response.function_call_arguments.done`). Not a blocker but worth noting — a cancelled response won't currently roll back the placeholder transcript bubble.

### 5. TTS voice model — ⚠️ CODE/COMMENT MISMATCH (confirmed)
- Actual body sent (`server.py:2448`): `"voice": "verse"`.
- Comment on the two lines above (`2446-2447`): "`alloy` / `onyx` / `verse` etc. — onyx is deep + male, closest to a natural Indian-English business tone."
- The comment suggests **onyx** was intended, but **verse** is what ships. Either update the comment or switch the value to `onyx` for the "deep male business tone" the comment describes.

### 6. Latency from speech end → first audio byte — ⚠️ CANNOT MEASURE (headless has no real mic)
- Server VAD baseline (`server.py:2439`): `silence_duration_ms = 800`.
- Config-implied floor: ~800 ms (VAD) + ~300–600 ms (gpt-realtime TTFT) ≈ **1.1 – 1.4 s** in ideal conditions.
- 2-second target is *reachable* on paper, but real-world numbers must be re-measured **after** fixing scenario 1.

### 7. Hinglish responses — ✅ PROMPT CORRECT
- `_wingman_realtime_instructions` (`server.py:2352-2397`) explicitly:
  - `ALWAYS respond in Hinglish (Hindi in Latin script + English mix). NEVER Devanagari.` ✅
  - Persona = "Wingman — K Singh ka 24/7 AI business partner for LogiOp Pro" ✅
  - Addresses user via `{honorific}` / `"{display_name} {honorific}"` (e.g., "Kishan Sir") ✅
  - Enforces short replies (max 2 sentences), 1 emoji, background-chatter filtering ✅
  - Injects `page`, `page_data_summary`, role dynamically ✅

### 8. Regression sanity — ✅ / ⚠️
- `GET-equivalent` of the mint: `POST /api/realtime-token` with valid JWT → **200 OK**, returns non-empty `ephemeral_key` (35 chars, `ek_…`), `model = "gpt-realtime"`, `session_id = "sess_…"`, `expires_at` epoch. ✅
- The endpoint uses `optional_current_user` → an anonymous (no-auth) call also returns 200 (system prompt just falls back to defaults). Verified. This is intentional per source but means "invalid token" won't produce a red-orb state — the orb only turns red on the SDP failure downstream. If you want a hard 401 for anonymous voice, tighten the dependency.
- `OPENAI_API_KEY` is set on backend (mint succeeds), so the "500: not configured" branch is not hit.
- Orb error state: because the SDP step throws, the hook currently sets `state = "error"` and `error = "SDP 400: {…beta_api_shape_disabled…}"`. That path works, but the orb visually stays purple in the preview (see screenshot in test run) — needs a manual sanity check that the red state + toast trigger reliably once the SDP call is repaired.

---

## Evidence — measured artifacts

| Item | Value |
|---|---|
| `/api/realtime-token` status | **200** |
| ephemeral_key length | 35 chars (`ek_…`) |
| Returned model | `gpt-realtime` ✅ (matches `server.py:2428`) |
| Returned session_id | `sess_EBNd4bIVNnn4yYEHElrDS` (example) |
| Backend voice config | `verse`, pcm 24 kHz, speed 1.1× ✅ |
| Server VAD | thr 0.55, prefix 300 ms, silence 800 ms, `create_response=true`, `interrupt_response=true` ✅ |
| STT | `whisper-1` ✅ |
| SDP offer contains `m=audio` | **Yes** — Opus/48000/2 |
| Mic track added to PC | **Yes** — `Fake Default Audio Input`, live, enabled |
| OpenAI `/v1/realtime?model=…` | **400 `beta_api_shape_disabled`** ❌ |
| `pc.connectionState` after handshake | `closed` |
| `dc.readyState` after handshake | `closed` |
| Token→SDP timing observed | mint 264 ms, SDP request→400 response 337 ms (both healthy) |

---

## Action items (for main agent, in priority order)

1. **P0 — Migrate SDP POST to GA endpoint.** Change `frontend/src/hooks/use-realtime-voice.ts:425` from `…/v1/realtime?model=…` to `…/v1/realtime/calls?model=…`. Redeploy Expo. This unblocks scenarios 1–4 and 6.
2. **P2 — Fix comment/code mismatch on TTS voice.** Either edit `server.py:2446-2448` comment to reflect `verse`, or change the value to `onyx` if the deep male tone the comment describes was the intent.
3. **P3 — Handle `response.cancelled`** in `use-realtime-voice.ts:handleServerEvent` so mid-stream interrupts roll the placeholder bubble to `isFinal:true` with whatever partial text arrived.
4. **P3 — Consider live-data tools.** Add a `query_dashboard`/`query_shipments` function tool so "kitne shipments pending hain?" returns authoritative numbers instead of relying on the point-in-time page-data snapshot.
5. **P4 — Optional auth tightening** on `/api/realtime-token` if anonymous voice sessions are not desired (currently the dependency is `optional_current_user`).

---

## Cannot-test-in-headless notes
- Real microphone input latency (scenario 6) — not measurable without a physical mic / audio-loopback rig.
- Actual audio-quality / speed 1.1× perception (scenario 5) — requires an open session (blocked by P0).
- Any timing figure for scenarios 2, 3, 4 — blocked by P0.
