/**
 * FloatingJarvis — persistent "always-on" AI assistant bubble.
 *
 * Renders two things:
 *   1. A tiny 56px pulsing blue-ring bubble anchored to the bottom-right,
 *      above the tab bar. Visible on every screen EXCEPT `/(tabs)/assistant`
 *      itself (the full-page nebula view has the assistant inline).
 *
 *   2. A fullscreen "nebula" modal that fades in when the bubble is tapped.
 *      Contains a big LiveOrb, an auto-focused text input (so the operator
 *      can type instantly), and a live mic button (press-to-talk).
 *
 * The modal reuses the same backend endpoints as the /assistant tab:
 *   - POST /api/assistant/chat  (SSE stream)
 *   - POST /api/assistant/stt   (voice → text)
 *   - POST /api/assistant/tts   (text → mp3 blob)
 *
 * It also dispatches ghost-user actions parsed from the AI reply so the
 * "create party / item / shipment / invoice" visual-fill flow works from
 * anywhere in the app, not just the assistant tab.
 *
 * Design principles:
 *   - Bubble is never in the way (56px, only bottom-right).
 *   - Modal opens with keyboard already up + input focused → zero-friction.
 *   - Uses the same LiveOrb so the visual language stays coherent.
 */
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { usePathname } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE } from "@/src/api/client";
import { getAuthTokenSync, useAuth } from "@/src/auth/context";
import { getCachedBlockers, useBlockers } from "@/src/components/blocker-bell";
import { LiveOrb, type LiveOrbMode } from "@/src/components/live-orb";
import { useScreenContext } from "@/src/context/screen-context";
import { useGhostUser } from "@/src/ghost/ghost-user";
import { useMicLevel } from "@/src/hooks/use-mic-level";
import { colors, radii, spacing } from "@/src/theme";

// (Dimensions was only used for the removed absolute width — dropped.)

type Msg = { role: "user" | "assistant"; text: string; at: number };

// Where NOT to show the bubble (assistant tab has its own big orb, and
// the sign-in gate is before auth so no assistant available).
const HIDE_ON = new Set<string>(["/assistant", "/sign-in", "/(tabs)/assistant"]);

export function FloatingJarvis() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);

  // Slow "breath" pulse for the bubble ring.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.9] });

  const shouldHide = !user || HIDE_ON.has(pathname || "");
  if (shouldHide && !expanded) return null;

  return (
    <>
      {!shouldHide && !expanded ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.bubbleWrap,
            {
              bottom: insets.bottom + 96, // above the tab bar
              right: 14,
            },
          ]}
        >
          <Pressable
            onPress={() => setExpanded(true)}
            style={styles.bubbleBtn}
            testID="floating-jarvis"
            accessibilityRole="button"
            accessibilityLabel="Open Wingman assistant"
            hitSlop={8}
          >
            {/* Outer pulsing ring */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.bubbleRing,
                { transform: [{ scale: ringScale }], opacity: ringOpacity },
              ]}
            />
            {/* Middle steady ring */}
            <View style={styles.bubbleRingSteady} pointerEvents="none" />
            {/* Core mini-orb */}
            <View style={styles.bubbleCore} pointerEvents="none">
              <LinearGradient
                colors={["#FFFFFF", "#00FFFF", "#00D1FF"]}
                start={{ x: 0.3, y: 0.3 }}
                end={{ x: 0.7, y: 0.7 }}
                style={StyleSheet.absoluteFill}
              />
            </View>
            {/* Sparkle glyph */}
            <Ionicons
              name="sparkles"
              size={14}
              color="#FFFFFF"
              style={{ zIndex: 2, opacity: 0.9 }}
            />
          </Pressable>
        </View>
      ) : null}

      {/* Expanded nebula modal */}
      {expanded ? (
        <NebulaModal onClose={() => setExpanded(false)} />
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Fullscreen nebula listening mode
// ---------------------------------------------------------------------------

/**
 * NebulaModal — reused by FloatingJarvis. Auto-focuses the text input and
 * lights up the mic so the operator can immediately type OR press-to-talk.
 */
function NebulaModal({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { describeForAI } = useScreenContext();
  const ghost = useGhostUser();
  const mic = useMicLevel();

  const [mode, setMode] = useState<LiveOrbMode>("idle");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState("");
  const [textInput, setTextInput] = useState("");
  const inputRef = useRef<TextInput | null>(null);

  // TTS envelope — same 5-6Hz burst pattern as the main assistant.
  const ttsLevel = useRef(new Animated.Value(0)).current;
  const [ttsLevelNum, setTtsLevelNum] = useState(0);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const id = ttsLevel.addListener(({ value }) => setTtsLevelNum(value));
    return () => ttsLevel.removeListener(id);
  }, [ttsLevel]);

  useEffect(() => {
    if (mode !== "speaking") {
      ttsLevel.stopAnimation();
      ttsLevel.setValue(0);
      return;
    }
    const loop = () => {
      Animated.sequence([
        Animated.timing(ttsLevel, {
          toValue: 0.9,
          duration: 90,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(ttsLevel, {
          toValue: 0.15,
          duration: 110,
          easing: Easing.in(Easing.quad),
          useNativeDriver: false,
        }),
      ]).start(() => {
        if (mode === "speaking") loop();
      });
    };
    loop();
    return () => ttsLevel.stopAnimation();
  }, [mode, ttsLevel]);

  // Amplitude for the orb — mic while listening, TTS envelope while speaking.
  const amplitude = useMemo(() => {
    if (mode === "listening") return mic.level;
    if (mode === "speaking") return 0.3 + ttsLevelNum * 0.7;
    return 0;
  }, [mode, mic.level, ttsLevelNum]);

  useEffect(() => {
    if (mic.listening) setMode("listening");
    else if (mode === "listening") setMode("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mic.listening]);

  // Auto-focus the text input the moment the modal opens.
  useEffect(() => {
    const t = setTimeout(() => {
      inputRef.current?.focus();
    }, 220);
    return () => clearTimeout(t);
  }, []);

  // Proactive greeting: if there are blockers, greet with a short Hindi
  // summary the moment the nebula opens. Uses the cached blocker set so
  // there's no visible network wait — if empty, the hook still refreshes
  // in the background.
  useBlockers(); // ensures the hook starts polling in this component too
  useEffect(() => {
    const b = getCachedBlockers();
    if (!b || b.total === 0) return;
    // Small delay so the modal transition finishes before speech starts.
    const t = setTimeout(() => {
      setMessages((prev) => (prev.length ? prev : [{ role: "assistant", text: b.summary_hi, at: Date.now() }]));
      speak(b.summary_hi).catch(() => undefined);
    }, 400);
    return () => clearTimeout(t);
    // Intentional: run only once on mount — subsequent blocker changes
    // are surfaced by the bell badge, not by another spoken interrupt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stripTools = (text: string) => text.replace(/```json[\s\S]*?```/g, "").trim();

  const speak = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      try {
        setMode("speaking");
        const res = await fetch(`${API_BASE}/api/assistant/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: stripTools(text), voice: "shimmer" }),
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
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const ExpoAudio = require("expo-audio") as typeof import("expo-audio");
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const FS = require("expo-file-system") as typeof import("expo-file-system");
          const path = `${FS.cacheDirectory}nebula-tts-${Date.now()}.mp3`;
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

  const sendMessage = useCallback(
    async (message: string) => {
      const q = message.trim();
      if (!q) return;
      setMessages((prev) => [...prev, { role: "user", text: q, at: Date.now() }]);
      setStreaming("");
      setMode("thinking");
      try {
        const token = getAuthTokenSync();
        const resp = await fetch(`${API_BASE}/api/assistant/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Entry-Source": "ai",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            session_id: `nebula-${Date.now()}`,
            message: q,
            history: messages,
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
          const frames = chunk.split("\n\n");
          carry = frames.pop() || "";
          for (const frame of frames) {
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
        // Fire ghost actions — this is the whole point of the floating
        // bubble: user can trigger "create party X" from ANY screen.
        void ghost.parseAndRun(full).catch(() => undefined);
        speak(full).catch(() => undefined);
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `त्रुटि: ${(e as Error).message}`, at: Date.now() },
        ]);
        setStreaming("");
        setMode("idle");
      }
    },
    [describeForAI, ghost, messages, speak, user],
  );

  const handleMicPress = useCallback(async () => {
    if (mic.listening) {
      const result = await mic.stop();
      setMode("thinking");
      if (!result) {
        setMode("idle");
        return;
      }
      try {
        const form = new FormData();
        if ("blob" in result && result.blob) {
          const filename = (result.mimeType || "audio/webm").includes("mp4")
            ? "voice.mp4"
            : "voice.webm";
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          form.append("audio", result.blob as any, filename);
        } else if ("uri" in result && result.uri) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          form.append("audio", { uri: result.uri, name: "voice.m4a", type: "audio/m4a" } as any);
        }
        const res = await fetch(`${API_BASE}/api/assistant/stt`, { method: "POST", body: form });
        if (!res.ok) throw new Error(`STT ${res.status}`);
        const data = (await res.json()) as { text?: string };
        const text = (data.text || "").trim();
        if (text) await sendMessage(text);
        else setMode("idle");
      } catch {
        setMode("idle");
      }
    } else {
      await mic.start();
    }
  }, [mic, sendMessage]);

  const close = useCallback(() => {
    // Stop any in-flight audio + release mic.
    if (audioElRef.current) {
      try {
        audioElRef.current.pause();
        audioElRef.current.src = "";
      } catch {
        /* ignore */
      }
      audioElRef.current = null;
    }
    if (mic.listening) void mic.stop();
    onClose();
  }, [mic, onClose]);

  const modeLabel =
    mode === "listening"
      ? "Listening…"
      : mode === "thinking"
        ? "Thinking…"
        : mode === "speaking"
          ? "Speaking…"
          : "Type or hold mic to talk";

  const lastReply = messages.length > 0 ? messages[messages.length - 1].text : "";

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={styles.modalWrap}>
        {/* Deep-space background */}
        <LinearGradient
          colors={["#020202", "#050820", "#020202"]}
          style={StyleSheet.absoluteFill}
        />
        {/* Semi-blur overlay for depth */}
        {Platform.OS !== "web" ? (
          <BlurView tint="dark" intensity={40} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(2,2,2,0.75)" }]} />
        )}

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          {/* Close button */}
          <Pressable
            onPress={close}
            style={[styles.modalClose, { top: insets.top + 12 }]}
            testID="jarvis-close"
            hitSlop={12}
          >
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>

          {/* Header pill */}
          <View style={[styles.modalHeader, { top: insets.top + 12 }]}>
            <View style={styles.modalHeaderDot} />
            <Text style={styles.modalHeaderText}>
              Wingman · {user ? `${user.display_name} ${user.honorific}` : "Kishan Sir"}
            </Text>
          </View>

          {/* Orb centrepiece */}
          <View style={styles.modalOrbArea}>
            <LiveOrb size={280} amplitude={amplitude} mode={mode} />
          </View>

          {/* Streaming / last reply strip */}
          <ScrollView
            style={styles.modalTranscriptWrap}
            contentContainerStyle={{ paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.modalModeLabel}>{modeLabel}</Text>
            <Text style={styles.modalTranscript} numberOfLines={6}>
              {streaming || lastReply}
            </Text>
          </ScrollView>

          {/* Input row + Mic button */}
          <View
            style={[
              styles.modalControls,
              { paddingBottom: Math.max(insets.bottom, 12) + 12 },
            ]}
          >
            <View style={styles.modalTextRow}>
              <TextInput
                ref={inputRef}
                autoFocus
                value={textInput}
                onChangeText={setTextInput}
                placeholder="बोलिए या यहाँ टाइप कीजिए…"
                placeholderTextColor={colors.textDim}
                style={styles.modalTextInput}
                testID="jarvis-input"
                onSubmitEditing={() => {
                  const v = textInput.trim();
                  if (!v) return;
                  setTextInput("");
                  void sendMessage(v);
                }}
                returnKeyType="send"
              />
              <Pressable
                onPress={() => {
                  const v = textInput.trim();
                  if (!v) return;
                  setTextInput("");
                  void sendMessage(v);
                }}
                style={styles.modalSend}
                testID="jarvis-send"
              >
                {mode === "thinking" ? (
                  <ActivityIndicator size={16} color="#000" />
                ) : (
                  <Ionicons name="send" size={16} color="#000" />
                )}
              </Pressable>
            </View>

            <Pressable
              onPress={handleMicPress}
              style={({ pressed }) => [
                styles.modalMic,
                mic.listening && styles.modalMicActive,
                pressed && { transform: [{ scale: 0.96 }] },
              ]}
              testID="jarvis-mic"
            >
              <Ionicons
                name={mic.listening ? "stop" : "mic"}
                size={28}
                color={mic.listening ? "#000" : colors.accent}
              />
            </Pressable>
            {mic.error ? <Text style={styles.modalError}>{mic.error}</Text> : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // ------------------- Bubble -------------------
  bubbleWrap: {
    position: "absolute",
    zIndex: 999,
  },
  bubbleBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 209, 255, 0.08)",
  },
  bubbleRing: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  bubbleRingSteady: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(0, 255, 255, 0.55)",
  },
  bubbleCore: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: "hidden",
    shadowColor: colors.cyan,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },

  // ------------------- Modal (nebula listening mode) -------------------
  modalWrap: {
    flex: 1,
    backgroundColor: "#020202",
  },
  modalClose: {
    position: "absolute",
    right: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 209, 255, 0.08)",
    borderColor: colors.borderStrong,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 20,
  },
  modalHeader: {
    position: "absolute",
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: "rgba(0, 209, 255, 0.08)",
    borderColor: colors.borderStrong,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 20,
  },
  modalHeaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  modalHeaderText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  modalOrbArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
  },
  modalTranscriptWrap: {
    maxHeight: 120,
    paddingHorizontal: spacing.lg,
  },
  modalModeLabel: {
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 6,
    fontWeight: "800",
  },
  modalTranscript: {
    color: colors.text,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  modalControls: {
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    gap: 12,
  },
  modalTextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  modalTextInput: {
    flex: 1,
    backgroundColor: "rgba(10, 12, 20, 0.65)",
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    paddingHorizontal: 18,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    color: colors.text,
    fontSize: 15,
  },
  modalSend: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOpacity: 0.9,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  modalMic: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 209, 255, 0.06)",
    borderColor: colors.accent,
    borderWidth: 2,
    shadowColor: colors.accent,
    shadowOpacity: 0.9,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  modalMicActive: {
    backgroundColor: colors.accent,
  },
  modalError: {
    color: colors.danger,
    fontSize: 11,
    textAlign: "center",
  },
});
