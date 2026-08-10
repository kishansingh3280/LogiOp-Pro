/**
 * useRealtimeVoice — WebRTC connection to OpenAI Realtime API.
 *
 * Web-only (Native falls back to the existing Whisper pipeline in the
 * Now Brief card). Flow:
 *   1. Hit /api/realtime-token for an ephemeral client_secret
 *   2. Build an RTCPeerConnection + data channel
 *   3. Attach the mic track
 *   4. SDP offer/answer with OpenAI
 *   5. Attach remote audio element to play the model's voice
 *   6. Expose transcript events + connection state to the UI
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import { API_BASE } from "@/src/api/client";
import { getAuthTokenSync } from "@/src/auth/context";
import {
  dispatchFillForm,
  FILL_FORM_ROUTES,
  type FillFormId,
  type FillFormPayload,
} from "@/src/api/fill-form-bus";
import { getWebRTC, hasWebRTC } from "@/src/utils/webrtc";

export type OrbState = "idle" | "connecting" | "listening" | "processing" | "speaking" | "error";

export type TranscriptTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  at: number;
  // For karaoke sync on the currently-speaking assistant turn
  isFinal?: boolean;
};

export interface UseRealtimeVoiceResult {
  supported: boolean;
  state: OrbState;
  transcript: TranscriptTurn[];
  error: string | null;
  micLevel: number;
  connect: (pageCtx: { page: string; summary?: string }) => Promise<void>;
  disconnect: () => void;
  sendText: (message: string) => void;
  isConnected: boolean;
}

export function useRealtimeVoice(): UseRealtimeVoiceResult {
  // Web: check browser WebRTC. Native: check whether the
  // react-native-webrtc native module linked successfully (only true
  // inside a development / production build — not in Expo Go).
  const supported = hasWebRTC();

  const [state, setState] = useState<OrbState>("idle");
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const levelRafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Track the in-progress assistant turn so we can accumulate deltas.
  const currentAssistantIdRef = useRef<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  // ---------------- Mic level meter (webaudio analyser) ----------------
  const startLevelMeter = useCallback((stream: MediaStream) => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioCtx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx: AudioContext = new AudioCtx();
    audioCtxRef.current = ctx;
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    const buf = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      setMicLevel(Math.min(1, rms * 3));
      levelRafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const stopLevelMeter = useCallback(() => {
    if (levelRafRef.current) cancelAnimationFrame(levelRafRef.current);
    levelRafRef.current = null;
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {
        /* ignore */
      }
    }
    audioCtxRef.current = null;
    setMicLevel(0);
  }, []);

  // ---------------- Disconnect ----------------
  const disconnect = useCallback(() => {
    if (dcRef.current) {
      try {
        dcRef.current.close();
      } catch {
        /* ignore */
      }
    }
    dcRef.current = null;
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {
        /* ignore */
      }
    }
    pcRef.current = null;
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    micStreamRef.current = null;
    stopLevelMeter();
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.srcObject = null;
    }
    audioElRef.current = null;
    setIsConnected(false);
    setState("idle");
  }, [stopLevelMeter]);

  // ---------------- Wingman interceptor ----------------
  // Called from `handleServerEvent` on every finalized user transcript.
  // Talks to /api/wingman-chat and injects the answer back into the
  // Realtime data channel as an override on `response.create`.
  const routeThroughWingman = useCallback(async (userText: string) => {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== "open") return;
    const clean = (userText || "").trim();
    if (!clean) return;

    // Fetch a Wingman answer (deterministic keyword brain).
    let answer: string | null = null;
    let action: string | null = null;
    try {
      const token = getAuthTokenSync();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(`${API_BASE}/api/wingman-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: clean }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = (await res.json()) as {
          answer: string | null;
          action: string | null;
        };
        answer = (data && typeof data.answer === "string") ? data.answer : null;
        action = data?.action ?? null;
      }
    } catch (e) {
      // Silent fallback — let OpenAI answer naturally on network hiccup.
      // eslint-disable-next-line no-console
      console.warn("[wingman] intercept failed, falling back:", e);
    }

    // Guard: channel may have closed during the fetch.
    const liveDc = dcRef.current;
    if (!liveDc || liveDc.readyState !== "open") return;

    try {
      if (answer && answer.trim()) {
        // Wingman has a canned answer — tell OpenAI to speak it verbatim.
        // The system prompt (see backend) instructs the model to obey any
        // `response.create.instructions` that begin with "SPEAK_EXACTLY:".
        liveDc.send(
          JSON.stringify({
            type: "response.create",
            response: {
              modalities: ["audio", "text"],
              instructions:
                "SPEAK_EXACTLY: " + answer.trim() +
                "\n\nRules: Read the text between SPEAK_EXACTLY: and the newline verbatim in warm Hinglish (Hindi in Latin script). Do NOT translate, paraphrase, add greetings, or extend. Stop after the last word.",
            },
          }),
        );
      } else {
        // Unknown intent or creation flow → let OpenAI take over so it can
        // invoke fill_form / query_dashboard tools normally.
        liveDc.send(
          JSON.stringify({
            type: "response.create",
            response: { modalities: ["audio", "text"] },
          }),
        );
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[wingman] response.create failed:", e);
    }
    // Return action so callers could log if they want (unused for now).
    void action;
  }, []);

  // ---------------- Event handler for data channel messages ----------------
  const handleServerEvent = useCallback((ev: MessageEvent) => {
    try {
      const msg = JSON.parse(ev.data);
      const type: string = msg.type || "";

      // --- USER speech transcription -----
      if (type === "conversation.item.input_audio_transcription.delta") {
        const text = msg.delta || "";
        setTranscript((prev) => {
          const id = currentUserIdRef.current;
          if (!id) return prev;
          const idx = prev.findIndex((t) => t.id === id);
          if (idx < 0) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], content: (next[idx].content || "") + text };
          return next;
        });
      }
      if (type === "conversation.item.input_audio_transcription.completed") {
        const text = msg.transcript || "";
        setTranscript((prev) => {
          const id = currentUserIdRef.current;
          currentUserIdRef.current = null;
          if (!id) {
            // Fresh turn — user spoke before we could open a placeholder.
            return [...prev, { id: `u-${Date.now()}`, role: "user", content: text, at: Date.now(), isFinal: true }];
          }
          const idx = prev.findIndex((t) => t.id === id);
          if (idx < 0) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], content: text, isFinal: true };
          return next;
        });
        // WINGMAN INTERCEPTOR ------------------------------------------------
        // Route every finalized transcript through /api/wingman-chat first.
        // Wingman is the DETERMINISTIC brain — it runs keyword matching +
        // fuzzy party lookup + live DB queries and returns a Hinglish
        // answer. OpenAI Realtime then just SPEAKS that answer verbatim
        // (no hallucinated numbers, no "sync nahi ho paya" hedges).
        //
        // If Wingman returns answer=null (unknown intent or a creation
        // flow that needs the `fill_form` tool), we fall through and let
        // the model generate its own response naturally.
        void routeThroughWingman(text);
      }
      if (type === "input_audio_buffer.speech_started") {
        // A fresh user turn is starting → open a placeholder bubble.
        const id = `u-${Date.now()}`;
        currentUserIdRef.current = id;
        setState("listening");
        setTranscript((prev) => [...prev, { id, role: "user", content: "", at: Date.now(), isFinal: false }]);
      }
      if (type === "input_audio_buffer.speech_stopped") {
        setState("processing");
      }

      // --- ASSISTANT streaming response -----
      if (type === "response.created") {
        const id = `a-${Date.now()}`;
        currentAssistantIdRef.current = id;
        setTranscript((prev) => [...prev, { id, role: "assistant", content: "", at: Date.now(), isFinal: false }]);
        setState("speaking");
      }
      if (
        type === "response.output_text.delta" ||
        type === "response.audio_transcript.delta" ||
        // GA Realtime emits this newer event name when the assistant
        // is speaking; adding it here keeps the on-screen transcript
        // in sync with the audio instead of showing "…" placeholders.
        type === "response.output_audio_transcript.delta"
      ) {
        const delta = msg.delta || "";
        setTranscript((prev) => {
          const id = currentAssistantIdRef.current;
          if (!id) return prev;
          const idx = prev.findIndex((t) => t.id === id);
          if (idx < 0) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], content: (next[idx].content || "") + delta };
          return next;
        });
      }
      if (type === "response.done") {
        setTranscript((prev) => {
          const id = currentAssistantIdRef.current;
          currentAssistantIdRef.current = null;
          if (!id) return prev;
          const idx = prev.findIndex((t) => t.id === id);
          if (idx < 0) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], isFinal: true };
          return next;
        });
        // Handsfree — server VAD keeps the mic hot. As soon as the AI
        // finishes, we flip visual state back to `listening` so the
        // orb re-enters its cyan-pulse state and the user can jump in
        // without tapping. The mic track is never actually stopped
        // during the session; server-side VAD handles turn boundaries.
        setState(dcRef.current && dcRef.current.readyState === "open" ? "listening" : "idle");
      }
      if (type === "error") {
        // eslint-disable-next-line no-console
        console.warn("[realtime] server error:", msg);
        setError((msg.error && msg.error.message) || "Realtime error");
      }
      // --- INTERRUPTION handling ------------------------------------------
      // The server can cancel an in-flight response either because the
      // user started talking again (VAD `interrupt_response`) or because
      // we asked it to (via `response.cancel`). We tag the active
      // assistant turn as final and immediately flip the orb back to
      // listening so the operator gets instant feedback.
      if (
        type === "response.cancelled" ||
        type === "response.output_audio_buffer.stopped" ||
        type === "output_audio_buffer.stopped"
      ) {
        setTranscript((prev) => {
          const id = currentAssistantIdRef.current;
          if (!id) return prev;
          const idx = prev.findIndex((t) => t.id === id);
          if (idx < 0) return prev;
          const next = [...prev];
          const trimmed = (next[idx].content || "").replace(/\s+$/g, "");
          next[idx] = { ...next[idx], content: trimmed + " …", isFinal: true };
          return next;
        });
        currentAssistantIdRef.current = null;
        setState(dcRef.current && dcRef.current.readyState === "open" ? "listening" : "idle");
      }

      // --- FUNCTION / TOOL CALLS ---------------------------------------
      // The Realtime API emits function-call arguments incrementally
      // (like text deltas) then a `.done` event with the full JSON
      // string. For `fill_form` we don't need the deltas — we just
      // parse the completed args and route the payload through our
      // fill-form bus. For `query_dashboard` we fire an HTTP request
      // to the backend and inject the JSON result back into the
      // conversation so the model can speak the number.
      if (type === "response.function_call_arguments.done") {
        const name: string = msg.name || msg.function_name || "";
        const rawArgs: string = msg.arguments || "";
        const callId: string | undefined = msg.call_id || msg.tool_call_id;
        if (name === "fill_form") {
          try {
            const parsed = JSON.parse(rawArgs || "{}");
            const formId = String(parsed.form || parsed.form_id || "");
            const fields = (parsed.fields || parsed.data || {}) as Record<
              string,
              string | number | boolean | null
            >;
            const reason = parsed.reason ? String(parsed.reason) : undefined;
            if (formId && FILL_FORM_ROUTES[formId as FillFormId]) {
              const payload: FillFormPayload = {
                form: formId as FillFormId,
                fields,
                reason,
              };
              dispatchFillForm(payload);
            } else {
              // eslint-disable-next-line no-console
              console.warn("[realtime] fill_form unknown target:", formId);
            }
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn("[realtime] fill_form parse failed:", e);
          }
        }
        if (name === "query_dashboard") {
          // Fire-and-forget: fetch the metric, push the JSON back as a
          // tool response, then ask the model to continue with a new
          // response.create so it speaks the answer.
          (async () => {
            let payload: Record<string, unknown> = {};
            try {
              payload = JSON.parse(rawArgs || "{}");
            } catch {
              payload = {};
            }
            let result: unknown = { error: "query failed" };
            try {
              const token = getAuthTokenSync();
              const res = await fetch(`${API_BASE}/api/voice/query`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload),
              });
              if (res.ok) result = await res.json();
              else result = { error: `HTTP ${res.status}` };
            } catch (e) {
              result = { error: (e as Error).message };
            }
            const dc = dcRef.current;
            if (!dc || dc.readyState !== "open") return;
            try {
              // 1. Push the tool response back into the conversation.
              dc.send(
                JSON.stringify({
                  type: "conversation.item.create",
                  item: {
                    type: "function_call_output",
                    call_id: callId,
                    output: JSON.stringify(result),
                  },
                }),
              );
              // 2. Ask the model to continue speaking with the fresh data.
              dc.send(JSON.stringify({ type: "response.create" }));
            } catch (e) {
              // eslint-disable-next-line no-console
              console.warn("[realtime] query_dashboard reply failed:", e);
            }
          })();
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[realtime] event parse failed", e);
    }
  }, [routeThroughWingman]);

  // ---------------- Connect flow ----------------
  const connect = useCallback(
    async (pageCtx: { page: string; summary?: string }) => {
      if (!supported) {
        setError(
          Platform.OS === "web"
            ? "This browser doesn't support WebRTC"
            : "Voice needs a development build (Expo Go can't run react-native-webrtc)",
        );
        return;
      }
      setError(null);
      setState("connecting");
      try {
        const rtc = getWebRTC();
        if (!rtc) throw new Error("WebRTC not available");

        // 1. Mint an ephemeral token from our backend
        const token = getAuthTokenSync();
        const tokRes = await fetch(`${API_BASE}/api/realtime-token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            page: pageCtx.page,
            page_data_summary: pageCtx.summary || "",
          }),
        });
        if (!tokRes.ok) {
          // Graceful fallback: turn the orb red-static and expose a
          // clear message so the operator knows to use text input.
          // The text send() path continues to work — it uses the same
          // data channel which is unavailable, but the panel still
          // opens for the user to type. sendText will no-op silently.
          let detail = "";
          try { detail = (await tokRes.text()).slice(0, 120); } catch { /* ignore */ }
          const status = tokRes.status;
          const isAuth = status === 401 || status === 403;
          throw new Error(
            isAuth
              ? "Voice mode unavailable (OpenAI key invalid). Use text instead."
              : `Voice mode unavailable (${status}). ${detail || "Use text instead."}`,
          );
        }
        const tokJson = (await tokRes.json()) as { ephemeral_key: string; model: string };
        const ephemeralKey = tokJson.ephemeral_key;
        const model = tokJson.model || "gpt-realtime";

        // 2. Request microphone permission — uses browser MediaDevices
        //    on web or react-native-webrtc's mediaDevices bridge on
        //    native.
        const stream = await rtc.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
        if (Platform.OS === "web") startLevelMeter(stream);

        // 3. Peer connection
        const pc = new rtc.RTCPeerConnection();
        pcRef.current = pc;

        // 4. Remote audio — web renders via <audio>. On native, the
        //    remote track auto-plays through the RN WebRTC bridge; we
        //    just keep a ref so we can stop it on disconnect.
        if (Platform.OS === "web") {
          const audioEl = document.createElement("audio");
          audioEl.autoplay = true;
          audioElRef.current = audioEl;
          pc.ontrack = (e: MessageEvent & { streams: MediaStream[] }) => {
            if (audioElRef.current) audioElRef.current.srcObject = e.streams[0];
          };
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pc.ontrack = (_e: any) => {
            // No-op on native: react-native-webrtc plays remote audio
            // through the OS audio route automatically.
          };
        }

        // 5. Add mic track
        stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));

        // 6. Data channel for events
        const dc = pc.createDataChannel("oai-events");
        dcRef.current = dc;
        dc.onmessage = handleServerEvent;
        dc.onopen = () => {
          setIsConnected(true);
          setState("listening");
          // Register the fill_form tool as soon as the channel opens
          // so the model can invoke it during this session.
          try {
            dc.send(
              JSON.stringify({
                type: "session.update",
                session: {
                  // GA Realtime API requires `session.type` on every
                  // session.update — without this the server rejects
                  // the payload with `Missing required parameter:
                  // 'session.type'` and our tools never register.
                  type: "realtime",
                  tools: [
                    {
                      type: "function",
                      name: "fill_form",
                      description:
                        "Open a form in the app and pre-fill its fields based on the operator's spoken intent. Use ONLY when the user explicitly asks to create/add/make a new record. NEVER invoke silently.",
                      parameters: {
                        type: "object",
                        properties: {
                          form: {
                            type: "string",
                            description: "Which form to open + pre-fill.",
                            enum: [
                              "shipment_new",
                              "invoice_new",
                              "party_new",
                              "ledger_entry_new",
                              "trip_new",
                            ],
                          },
                          fields: {
                            type: "object",
                            description:
                              "Key/value map of form-field values. Keys match the target form's field names. Unknown keys are ignored. Common keys per form: shipment_new → source, destination, carrier_name, weight_kg, bag_count, description. invoice_new → party_name, amount, currency, note. party_new → name, country, role, phone. ledger_entry_new → party_id, amount, currency, note, kind (got|gave). trip_new → route, direction, currency_type, currency_amount, gold_baht, carrier_name.",
                            additionalProperties: true,
                          },
                          reason: {
                            type: "string",
                            description:
                              "Short user-facing reason for opening this form. e.g. 'Naya shipment banate hain'.",
                          },
                        },
                        required: ["form", "fields"],
                      },
                    },
                    {
                      type: "function",
                      name: "query_dashboard",
                      description:
                        "Fetch live business numbers from the backend so you can answer factual questions like 'kitne shipments pending hain?', 'aaj ka revenue kya hai?', 'X party ka balance kitna hai?'. Call this BEFORE answering any question that asks for a count, sum, or balance — never guess. The result JSON is sent back as a tool response; read it and speak the answer in Hinglish.",
                      parameters: {
                        type: "object",
                        properties: {
                          metric: {
                            type: "string",
                            description: "Which live metric to fetch.",
                            enum: [
                              "pending_shipments",
                              "in_transit_shipments",
                              "unpaid_invoices",
                              "active_trips",
                              "today_revenue",
                              "party_balance",
                              "warehouse_bags",
                              "overview",
                            ],
                          },
                          party_name: {
                            type: "string",
                            description:
                              "Party name — REQUIRED only when metric='party_balance'. Case-insensitive prefix match.",
                          },
                        },
                        required: ["metric"],
                      },
                    },
                  ],
                  tool_choice: "auto",
                },
              }),
            );
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn("[realtime] tool register failed:", e);
          }
        };
        dc.onerror = (e) => {
          // eslint-disable-next-line no-console
          console.warn("[realtime] data channel error", e);
        };

        // 7. Offer/Answer with OpenAI
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const sdpRes = await fetch(
          // OpenAI Realtime GA WebRTC endpoint. The Beta path
          // `/v1/realtime` was retired in 2025 and now returns
          // `beta_api_shape_disabled` — the GA replacement is
          // `/v1/realtime/calls`. See:
          // https://developers.openai.com/api/docs/guides/realtime-webrtc
          `https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(model)}`,
          {
            method: "POST",
            body: offer.sdp || "",
            headers: {
              Authorization: `Bearer ${ephemeralKey}`,
              "Content-Type": "application/sdp",
            },
          },
        );
        if (!sdpRes.ok) throw new Error(`SDP ${sdpRes.status}: ${await sdpRes.text().catch(() => "")}`);
        const answerSdp = await sdpRes.text();
        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      } catch (e) {
        setError((e as Error).message || "Realtime connect failed");
        setState("error");
        disconnect();
      }
    },
    [supported, handleServerEvent, startLevelMeter, disconnect],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // ---------------- Send a typed text message through the channel ----
  const sendText = useCallback((message: string) => {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== "open") return;
    const clean = (message || "").trim();
    if (!clean) return;
    // Mirror the user turn locally so the UI shows it instantly.
    const uid = `u-${Date.now()}`;
    setTranscript((prev) => [
      ...prev,
      { id: uid, role: "user", content: clean, at: Date.now(), isFinal: true },
    ]);
    // Two-step protocol per OpenAI Realtime spec: create a conversation
    // item, then trigger a response.
    try {
      dc.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: clean }],
          },
        }),
      );
      dc.send(JSON.stringify({ type: "response.create" }));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[realtime] sendText failed", e);
    }
  }, []);

  return {
    supported,
    state,
    transcript,
    error,
    micLevel,
    connect,
    disconnect,
    sendText,
    isConnected,
  };
}
