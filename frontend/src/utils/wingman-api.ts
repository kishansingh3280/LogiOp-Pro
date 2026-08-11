/**
 * wingman-api — thin client for the OPSI Wingman in the OPSI Daily Brief card.
 *
 * Endpoints hit:
 *   • POST /api/wingman/quick-chat  — non-streaming Hinglish chat (Claude Haiku)
 *   • POST /api/assistant/stt       — Whisper transcription (multipart)
 *   • POST /api/dashboard/now-brief — cached daily brief
 *
 * TTS playback is delegated to `@/src/utils/tts-stream` which prefers
 * ElevenLabs (voice ID set via ELEVENLABS_VOICE_ID env) and auto-falls-back
 * to OpenAI TTS shimmer on any 401 / 5xx from ElevenLabs.
 */
import { Platform } from "react-native";

import { API_BASE } from "@/src/api/client";
import { getAuthTokenSync } from "@/src/auth/context";

export type WingmanTurn = { role: "user" | "assistant"; content: string; at: number };

export type QuickChatResult = {
  response: string;
  data_used: string[];
};

/** Fire a Wingman chat turn. Returns the full response text. */
export async function wingmanChat(
  message: string,
  history: WingmanTurn[],
  sessionId: string,
): Promise<QuickChatResult> {
  const token = getAuthTokenSync();
  const res = await fetch(`${API_BASE}/api/wingman/quick-chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      history: history.map((t) => ({ role: t.role, content: t.content })),
    }),
  });
  if (!res.ok) {
    throw new Error(`Wingman ${res.status}`);
  }
  return (await res.json()) as QuickChatResult;
}

/**
 * Upload a recording to Whisper for transcription. Accepts either a native
 * file URI (from expo-audio) or a Web Blob (from MediaRecorder).
 */
export async function transcribeAudio(
  input: { uri?: string; blob?: Blob; mimeType?: string },
): Promise<string> {
  const token = getAuthTokenSync();
  const form = new FormData();

  if (Platform.OS === "web" && input.blob) {
    const ext = (input.mimeType || "audio/webm").includes("mp4") ? "mp4" : "webm";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form.append("audio", input.blob as any, `voice.${ext}`);
  } else if (input.uri) {
    // React Native FormData accepts a file-like { uri, name, type } object.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form.append("audio", {
      uri: input.uri,
      name: "voice.m4a",
      type: "audio/m4a",
    } as any);
  } else {
    throw new Error("No audio input provided");
  }

  const res = await fetch(`${API_BASE}/api/transcribe`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Don't set Content-Type — the browser/RN adds the multipart boundary.
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: form as any,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    // If the ingress ever substitutes an HTML 502/504 error page, strip
    // the HTML so the operator sees a clean Hinglish message instead of
    // "<!DOCTYPE html>..." in the error card.
    const looksLikeHtml = /<!doctype|<html|<body/i.test(t);
    const clean = looksLikeHtml
      ? "Voice server abhi respond nahi kar raha. Dobara try karein."
      : t.slice(0, 120);
    throw new Error(`STT ${res.status}: ${clean}`);
  }
  const data = (await res.json()) as { text?: string };
  return (data.text || "").trim();
}

/** Fetch a fresh daily brief text. */
export async function fetchNowBrief(counters: {
  pending: number;
  in_transit: number;
  delivered: number;
  warehouse_bags: number;
  warehouse_kg: number;
  active_trips: number;
  overdue_ledger: number;
}): Promise<string> {
  const token = getAuthTokenSync();
  const tzOffset = -new Date().getTimezoneOffset();
  const res = await fetch(`${API_BASE}/api/dashboard/now-brief`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ ...counters, tz_offset_minutes: tzOffset }),
  });
  if (!res.ok) throw new Error(`now-brief ${res.status}`);
  const data = (await res.json()) as { brief?: string };
  return (data.brief || "").trim();
}
