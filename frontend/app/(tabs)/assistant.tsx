/**
 * Assistant — Gemini Live-style immersive AI Assistant.
 *
 * Full-screen dark canvas with a big pulsing multi-colour orb ("Life in a
 * body") reacting to the operator's voice while listening and to the TTS
 * envelope while the AI is speaking.
 *
 * Modes:
 *   idle       — slow breath
 *   listening  — mic level drives the orb
 *   thinking   — fast heartbeat while LLM is computing
 *   speaking   — TTS envelope drives the orb, transcript scrolls under it
 *
 * The chat log lives in a bottom sheet accessible via the "Transcript"
 * button so the immersive vibe stays clean.
 */
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE } from "@/src/api/client";
import { useAuth } from "@/src/auth/context";
import { LiveOrb, type LiveOrbMode } from "@/src/components/live-orb";
import { useScreenContext } from "@/src/context/screen-context";
import { useMicLevel } from "@/src/hooks/use-mic-level";
import { colors, radii, spacing } from "@/src/theme";

import { TAB_BAR_BOTTOM_PAD } from "./_layout";

type Msg = { role: "user" | "assistant"; text: string; at: number };

const SESSION_KEY = `assistant-${Date.now()}`;

export default function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { describeForAI, route } = useScreenContext();
  const mic = useMicLevel();

  const [mode, setMode] = useState<LiveOrbMode>("idle");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [greeted, setGreeted] = useState(false);
  // TTS-driven amplitude envelope (0..1) — a lightweight sine oscillator
  // that runs while the AI is speaking (we can't sniff <audio> level on web
  // for MP3 buffers, so we simulate with a natural cadence).
  const ttsLevel = useRef(new Animated.Value(0)).current;
  const [ttsLevelNum, setTtsLevelNum] = useState(0);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // Emit a spoken greeting on first mount so the immersion feels alive.
  useEffect(() => {
    if (greeted) return;
    const address = user ? `${user.display_name} ${user.honorific}` : "Sir";
    const ctx = describeForAI();
    const opener = `नमस्ते ${address}! मैं आपका AI सहायक हूँ। ${
      ctx && ctx !== "Current route: /(tabs)/assistant"
        ? "बताइए, क्या मदद करूँ?"
        : "बोलिए, क्या हुक्म है?"
    }`;
    setMessages([{ role: "assistant", text: opener, at: Date.now() }]);
    speak(opener).catch(() => undefined);
    setGreeted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Keep the visual mode in sync with mic listening state.
  useEffect(() => {
    if (mic.listening) setMode("listening");
    else if (mode === "listening") setMode("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mic.listening]);

  // Amplitude drives the orb — mic during listening, ttsLevel during
  // speaking, slow breath otherwise.
  const amplitude = useMemo(() => {
    if (mode === "listening") return mic.level;
    if (mode === "speaking") return 0.3 + ttsLevelNum * 0.7;
    return 0;
  }, [mode, mic.level, ttsLevelNum]);

  // Wire the animated value to a plain number for the orb (which expects
  // a number amplitude, not an animated node).
  useEffect(() => {
    const id = ttsLevel.addListener(({ value }) => setTtsLevelNum(value));
    return () => ttsLevel.removeListener(id);
  }, [ttsLevel]);

  // Start / stop the fake TTS envelope while `mode === "speaking"`.
  useEffect(() => {
    if (mode !== "speaking") {
      ttsLevel.stopAnimation();
      ttsLevel.setValue(0);
      return;
    }
    // 5-6 Hz burst pattern — mimics natural speech cadence.
    const loop = () => {
      Animated.sequence([
        Animated.timing(ttsLevel, { toValue: 0.9, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: false }),
        Animated.timing(ttsLevel, { toValue: 0.15, duration: 110, easing: Easing.in(Easing.quad), useNativeDriver: false }),
      ]).start(() => {
        if (mode === "speaking") loop();
      });
    };
    loop();
    return () => ttsLevel.stopAnimation();
  }, [mode, ttsLevel]);

  // Fetch TTS mp3 for the given text, play it, and briefly enter speaking
  // mode so the orb envelope pulses along with it.
  const speak = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      try {
        setMode("speaking");
        const res = await fetch(`${API_BASE}/api/assistant/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: stripTools(text), voice: "nova" }),
        });
        if (!res.ok) throw new Error(`TTS ${res.status}`);
        const blob = await res.blob();
        if (Platform.OS === "web") {
          const url = URL.createObjectURL(blob);
          if (audioElRef.current) {
            audioElRef.current.pause();
            audioElRef.current.src = "";
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const audio = new (window as any).Audio(url) as HTMLAudioElement;
          audioElRef.current = audio;
          audio.onended = () => setMode("idle");
          audio.onerror = () => setMode("idle");
          await audio.play();
        } else {
          // Native playback via expo-audio player. Import lazily to
          // avoid pulling native modules on web.
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const ExpoAudio = require("expo-audio") as typeof import("expo-audio");
          // Save blob to a temp file first — native player can't play a
          // browser Blob directly.
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const FS = require("expo-file-system") as typeof import("expo-file-system");
          const path = `${FS.cacheDirectory}tts-${Date.now()}.mp3`;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onerror = () => reject(new Error("blob read failed"));
            reader.onload = () => resolve((reader.result as string).split(",")[1] || "");
            reader.readAsDataURL(blob);
          });
          await FS.writeAsStringAsync(path, base64, { encoding: FS.EncodingType.Base64 });
          const player = ExpoAudio.createAudioPlayer({ uri: path });
          player.play();
          player.addListener("playbackStatusUpdate", (s: { didJustFinish?: boolean }) => {
            if (s.didJustFinish) setMode("idle");
          });
        }
      } catch {
        setMode("idle");
      }
    },
    [],
  );

  // Send a text message to /assistant/chat and stream back the reply.
  const sendMessage = useCallback(
    async (message: string) => {
      const q = message.trim();
      if (!q) return;
      setMessages((prev) => [...prev, { role: "user", text: q, at: Date.now() }]);
      setStreaming("");
      setMode("thinking");
      try {
        const resp = await fetch(`${API_BASE}/api/assistant/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Entry-Source": "ai",
          },
          body: JSON.stringify({
            session_id: SESSION_KEY,
            message: q,
            history: [],
            screen_context: describeForAI(),
            honorific: user?.honorific || "Sir",
            display_name: user?.display_name || "Kishan",
          }),
        });
        if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let full = "";
        let carry = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = carry + decoder.decode(value, { stream: true });
          // Frames end at a blank line (\n\n). Anything after the last \n\n
          // is a partial frame — save it to carry into the next read().
          const frames = chunk.split("\n\n");
          carry = frames.pop() || "";
          for (const frame of frames) {
            // Extract every `data:` line inside the frame — SSE spec says a
            // record can span multiple `data:` lines which the receiver
            // joins with "\n". Ignore comment (`: ...`) and event lines.
            const dataLines = frame
              .split("\n")
              .filter((l) => l.startsWith("data:"))
              .map((l) => l.slice(5).replace(/^ /, ""));
            if (dataLines.length === 0) continue;
            const payload = dataLines.join("\n");
            if (payload === "[DONE]") continue;
            full += payload;
            setStreaming(full);
          }
        }
        setMessages((prev) => [...prev, { role: "assistant", text: full, at: Date.now() }]);
        setStreaming("");
        // Trigger a Ghost-User execution flow if the AI emitted a JSON tool call.
        maybeHandleAction(full, router);
        // Speak the reply (strips JSON blocks).
        speak(full).catch(() => undefined);
      } catch (e) {
        const msg = `त्रुटि: ${(e as Error).message}`;
        setMessages((prev) => [...prev, { role: "assistant", text: msg, at: Date.now() }]);
        setStreaming("");
        setMode("idle");
      }
    },
    [describeForAI, router, speak, user],
  );

  // Hold-to-talk. On press we start mic; on release we stop, POST the
  // audio to /assistant/stt, then feed the transcription into /chat.
  const handleMicPress = useCallback(async () => {
    if (mic.listening) {
      // Stop → transcribe → send.
      const result = await mic.stop();
      setMode("thinking");
      if (!result) {
        setMode("idle");
        return;
      }
      try {
        const form = new FormData();
        if ("blob" in result && result.blob) {
          const filename = (result.mimeType || "audio/webm").includes("mp4") ? "voice.mp4" : "voice.webm";
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          form.append("audio", result.blob as any, filename);
        } else if ("uri" in result && result.uri) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          form.append("audio", { uri: result.uri, name: "voice.m4a", type: "audio/m4a" } as any);
        }
        const res = await fetch(`${API_BASE}/api/assistant/stt`, {
          method: "POST",
          body: form,
        });
        if (!res.ok) throw new Error(`STT ${res.status}`);
        const data = (await res.json()) as { text?: string };
        const text = (data.text || "").trim();
        if (text) {
          await sendMessage(text);
        } else {
          setMode("idle");
        }
      } catch {
        setMode("idle");
      }
    } else {
      await mic.start();
    }
  }, [mic, sendMessage]);

  const modeLabel = mode === "listening" ? "Listening…"
    : mode === "thinking" ? "Thinking…"
    : mode === "speaking" ? "Speaking…"
    : "Tap the mic to speak";

  return (
    <View style={styles.wrap}>
      {/* Ambient background gradient — very dark base with a subtle tint */}
      <LinearGradient
        colors={["#000000", "#050a05", "#000000"]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerDot} />
            <View>
              <Text style={styles.headerTitle}>Live Assistant</Text>
              <Text style={styles.headerSub}>
                {user ? `${user.display_name} ${user.honorific}` : "Kishan Sir"} · Hindi
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => setShowTranscript(true)}
            style={styles.pill}
            hitSlop={8}
            testID="assistant-transcript-open"
          >
            <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.lime} />
            <Text style={styles.pillText}>Transcript</Text>
          </Pressable>
        </View>

        {/* Screen-context chip */}
        <View style={styles.ctxChip}>
          <Ionicons name="eye-outline" size={12} color={colors.limeSoft} />
          <Text style={styles.ctxText} numberOfLines={1}>
            {describeForAI() || `Route ${route}`}
          </Text>
        </View>

        {/* Orb */}
        <View style={styles.orbArea}>
          <LiveOrb size={280} amplitude={amplitude} mode={mode} />
        </View>

        {/* Live transcript strip — last AI reply */}
        <View style={styles.transcriptArea}>
          <Text style={styles.modeLabel}>{modeLabel}</Text>
          <Text style={styles.transcriptLine} numberOfLines={4}>
            {streaming || messages[messages.length - 1]?.text || ""}
          </Text>
        </View>

        {/* Controls */}
        <View style={[styles.controls, { paddingBottom: TAB_BAR_BOTTOM_PAD + insets.bottom + 8 }]}>
          <View style={styles.textRow}>
            <TextInput
              value={textInput}
              onChangeText={setTextInput}
              placeholder="Type or hold mic to talk…"
              placeholderTextColor={colors.textDim}
              style={styles.textInput}
              testID="assistant-input"
              onSubmitEditing={() => {
                const v = textInput.trim();
                if (!v) return;
                setTextInput("");
                sendMessage(v);
              }}
              returnKeyType="send"
            />
            <Pressable
              onPress={() => {
                const v = textInput.trim();
                if (!v) return;
                setTextInput("");
                sendMessage(v);
              }}
              style={styles.sendBtn}
              testID="assistant-send"
              hitSlop={6}
            >
              <Ionicons name="send" size={16} color="#000" />
            </Pressable>
          </View>

          <Pressable
            onPress={handleMicPress}
            style={({ pressed }) => [
              styles.mic,
              mic.listening && styles.micActive,
              pressed && { transform: [{ scale: 0.96 }] },
            ]}
            testID="assistant-mic"
          >
            <Ionicons
              name={mic.listening ? "stop" : "mic"}
              size={30}
              color={mic.listening ? "#000" : colors.lime}
            />
          </Pressable>
          {mic.error ? <Text style={styles.errorText}>{mic.error}</Text> : null}
        </View>
      </SafeAreaView>

      {/* Transcript bottom-sheet modal */}
      <TranscriptSheet
        visible={showTranscript}
        onClose={() => setShowTranscript(false)}
        messages={messages}
        streaming={streaming}
      />
    </View>
  );
}

/**
 * Extract a ```json ...``` block if present and dispatch the corresponding
 * navigation. Full ghost-user form-fill is coming in the next phase; for
 * now `navigate` and simple no-ops are handled.
 */
function maybeHandleAction(reply: string, router: ReturnType<typeof useRouter>) {
  const match = reply.match(/```json\s*([\s\S]*?)```/);
  if (!match) return;
  try {
    const obj = JSON.parse(match[1].trim());
    if (!obj || typeof obj !== "object") return;
    if (obj.action === "navigate" && typeof obj.route === "string") {
      // Small delay so the user sees the confirmation line first.
      setTimeout(() => router.push(obj.route as never), 400);
    }
    // TODO: ghost-fill / carrier_update / ledger_entry etc. — Phase D.
  } catch {
    /* not valid JSON — ignore */
  }
}

/** Strip ```json``` code fences so TTS doesn't read curly braces aloud. */
function stripTools(text: string): string {
  return text.replace(/```json[\s\S]*?```/g, "").trim();
}

function TranscriptSheet({
  visible,
  onClose,
  messages,
  streaming,
}: {
  visible: boolean;
  onClose: () => void;
  messages: Msg[];
  streaming: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Transcript</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
          {messages.map((m, i) => (
            <View
              key={i}
              style={[
                styles.bubble,
                m.role === "user" ? styles.bubbleUser : styles.bubbleAi,
              ]}
            >
              <Text style={[styles.bubbleText, m.role === "user" && styles.bubbleTextUser]}>
                {m.text}
              </Text>
            </View>
          ))}
          {streaming ? (
            <View style={[styles.bubble, styles.bubbleAi, styles.bubbleStreaming]}>
              <Text style={styles.bubbleText}>{streaming}</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.lime,
    shadowColor: colors.lime,
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  headerSub: { color: colors.textDim, fontSize: 11, letterSpacing: 0.4 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radii.pill,
    borderColor: "rgba(198,255,0,0.35)",
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(198,255,0,0.06)",
  },
  pillText: { color: colors.lime, fontSize: 11, fontWeight: "700" },
  ctxChip: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  ctxText: { color: colors.textMuted, fontSize: 11, flex: 1 },
  orbArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  transcriptArea: {
    minHeight: 92,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  modeLabel: {
    color: colors.limeSoft,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  transcriptLine: {
    color: colors.text,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    opacity: 0.92,
  },
  controls: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: 10,
    alignItems: "center",
  },
  textRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: "rgba(20,20,20,0.85)",
    borderRadius: 22,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  mic: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderColor: colors.lime,
    borderWidth: 2,
    backgroundColor: "rgba(198,255,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.lime,
    shadowOpacity: 0.7,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  micActive: {
    backgroundColor: colors.lime,
  },
  errorText: { color: colors.danger, fontSize: 12, marginTop: 4 },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "72%",
    backgroundColor: "#0a0a0a",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginTop: 8,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  bubble: {
    padding: 12,
    borderRadius: radii.md,
    maxWidth: "88%",
  },
  bubbleAi: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: colors.lime,
  },
  bubbleStreaming: {
    borderColor: colors.lime,
    borderWidth: 1,
  },
  bubbleText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: "#000", fontWeight: "700" },
});
