# Voice Assistant Fixes — Verification Report (Iter 68)

Runtime tested against `https://cyber-logistics-hub-1.preview.emergentagent.com`
with the `kishan / Kishan@Boss2026` (Admin) account.

## Summary

| Fix | Status | Notes |
|-----|--------|-------|
| 1. SDP → GA endpoint `/v1/realtime/calls` | ✅ PASS | Runtime SDP POST returned **HTTP 201 Created** (previously 400). Peer connection established, data channel `oai-events` opened, orb transitioned "connecting" → "listening" (cyan pulse visible). |
| 2. Voice `verse` → `marin` | ✅ PASS (source) | `backend/server.py:2468` sets `"voice": "marin"` and comment (`2464-2467`) now matches (no `verse` vs `onyx` drift). `/api/realtime-token` returns 200 with model=`gpt-realtime`. Actual audio playback not asserted in headless test but pipeline built cleanly. |
| 3. `query_dashboard` tool + `/api/voice/query` | ⚠️ PARTIAL | **Backend endpoint fully working** — 10/10 pytest cases pass, live curl returns real data. **Tool schema present in client** (`use-realtime-voice.ts:483-512`). **Client handler present** for `response.function_call_arguments.done` (`use-realtime-voice.ts:295-343`). **System prompt updated** (`server.py:2399-2412`). **HOWEVER — tool registration is REJECTED at runtime** (see finding below). Model cannot actually invoke `query_dashboard` until this is fixed. |
| 4. `response.cancelled` interruption handling | ✅ PASS (source) | Verified in `use-realtime-voice.ts:239-256` — handles `response.cancelled`, `response.output_audio_buffer.stopped`, `output_audio_buffer.stopped`; appends " …", clears `currentAssistantIdRef`, flips to `listening` if DC open else `idle`. Not runtime-triggered in headless (no interrupt injected). |

## 🔴 NEW FINDING (blocks Fix 3 at runtime)

Captured console error immediately after data channel `onopen`:

```
{
  "type": "error",
  "event_id": "event_EBOTO7mAydN1ObtvtoKNW",
  "error": {
    "type": "invalid_request_error",
    "code": "missing_required_parameter",
    "message": "Missing required parameter: 'session.type'.",
    "param": "session.type",
    "event_id": null
  }
}
```

**Cause:** The `session.update` payload built inside `dc.onopen`
(`frontend/src/hooks/use-realtime-voice.ts:442-517`) sends:

```js
{
  type: "session.update",
  session: {
    tools: [ /* fill_form + query_dashboard */ ],
    tool_choice: "auto",
  },
}
```

The GA Realtime API requires `session.type: "realtime"` on every
`session.update`. Because the update is rejected, **the `fill_form`
and `query_dashboard` tool schemas are never registered**, so the
model will never emit `response.function_call_arguments.done` with
those names — Fix 3's end-to-end path can't complete.

**Fix suggestion (one line):**
```js
session: {
  type: "realtime",     // ← add this
  tools: [...],
  tool_choice: "auto",
},
```

## Endpoint smoke tests

`pytest backend/tests/test_voice_query_iter68.py` → **10/10 passed** (5.31s).
XML: `/app/test_reports/pytest/iter68_voice_query.xml`.

Sample live responses:
```
pending_shipments  → {"count":1,"sample":[{"consignment_no":"AURA-PEN-001","route":"Bangkok → Chennai"}]}
unpaid_invoices    → {"count":2,"total_inr":23896.0,"total_thb":0}
warehouse_bags     → {"current_bags":0,"current_kg":0,"booked_deliveries":0}
```

All 7 metrics (`pending_shipments`, `in_transit_shipments`,
`unpaid_invoices`, `active_trips`, `today_revenue`, `warehouse_bags`,
`overview`) return the expected keys. `party_balance` correctly returns
`{"error":"party_name required..."}` when name omitted. Unknown metric
returns `{"error":"Unknown metric: ..."}` with 200.

## Exact SDP call URL captured

```
POST https://api.openai.com/v1/realtime/calls?model=gpt-realtime  →  201 Created
```

This confirms Fix 1 landed correctly.

## Not modified

No production code changed. Only added test file
`/app/backend/tests/test_voice_query_iter68.py` and this report.
