/**
 * FloatingJarvis — persistent "always-on" AI assistant bubble.
 *
 * Two layers, both rendered at the app root over every other UI:
 *
 *   1. Bubble — 56px pulsing blue-ring anchored bottom-right, above the
 *      tab bar. Visible on every screen except /(tabs)/assistant and the
 *      sign-in gate.
 *
 *   2. Popup — glassmorphic chat window that scales UP from the bubble's
 *      origin (bottom-right) when the bubble is tapped. NOT a Modal —
 *      the background page remains fully interactive, so the Ghost-User
 *      engine can still navigate + type on the underlying form while the
 *      operator keeps chatting through the popup.
 *
 * The popup contains:
 *   • Header: small LiveOrb + "Wingman" title + close X
 *   • Scrollable transcript of the current chat
 *   • Text input (auto-focused) + Send button
 *   • Round mic button for hold-to-talk
 *
 * It reuses the same backend endpoints as the /assistant tab:
 *   POST /api/assistant/chat   (SSE stream)
 *   POST /api/assistant/stt    (voice → text)
 *   POST /api/assistant/tts/stream  (chunked audio via `speakStreaming`)
 *
 * Ghost-User integration: after each turn the AI reply is fed into
 * `ghost.parseAndRun()` — if it contains a JSON action, the ghost engine
 * navigates the BACKGROUND page (which is fully interactive because we
 * are not blocking it with a Modal) and visually types into the target
 * form. The chat popup stays open so the operator can dictate the next
 * command while the previous one is being executed.
 */
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { usePathname } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
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
import { speakStreaming, type StreamingTtsHandle } from "@/src/utils/tts-stream";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// Popup dimensions — sized to fit comfortably on a 390px-wide phone with
// side gutters. Height caps at 70% of the screen so it doesn't crowd the
// tab bar or push the input off screen when the keyboard is up.
const POPUP_W = Math.min(320, SCREEN_W - 24);
const POPUP_H = Math.min(460, Math.floor(SCREEN_H * 0.7));

// Bubble geometry — kept in sync with styles.bubbleBtn below.
const BUBBLE_SIZE = 56;
const BUBBLE_MARGIN_RIGHT = 14;

type Msg = { role: "user" | "assistant"; text: string; at: number };

// Where NOT to show the bubble (assistant tab has its own big orb; sign-in
// is pre-auth so there's no assistant to talk to yet).
const HIDE_ON = new Set<string>(["/assistant", "/sign-in", "/(tabs)/assistant"]);

export function FloatingJarvis() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);

  // Bubble breath pulse.
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

  // Popup scale-up animation. Driven by the `expanded` flag. transform-
  // origin is anchored to the bubble (bottom-right) via a translate + scale
  // combo so it visually "grows out of" the button.
  const popup = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(popup, {
      toValue: expanded ? 1 : 0,
      useNativeDriver: false, // we animate width/height + transform origin
      stiffness: expanded ? 220 : 300,
      damping: expanded ? 22 : 26,
      mass: 0.6,
    }).start();
  }, [expanded, popup]);

  const shouldHide = !user || HIDE_ON.has(pathname || "");
  if (shouldHide) return null;

  const bubbleBottom = insets.bottom + 96; // above the tab bar

  // Interpolate the popup transform. It starts as a 0-scale dot at the
  // bubble's center and grows to full size at the popup's top-right
  // anchor. `translateX` and `translateY` correct for the fact that
  // scale grows AROUND the element's center by default — we want it to
  // grow FROM its bottom-right corner (i.e. the bubble).
  const popupScale = popup.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] });
  const popupOpacity = popup.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const popupTX = popup.interpolate({
    inputRange: [0, 1],
    // At scale 0.15, the popup is (1-0.15)/2 of its size to the right of
    // its natural centre. We slide the natural centre to align with the
    // bubble by shifting right/down proportionally.
    outputRange: [POPUP_W * 0.42, 0],
  });
  const popupTY = popup.interpolate({
    inputRange: [0, 1],
    outputRange: [POPUP_H * 0.42, 0],
  });

  return (
    <>
      {/* Popup — rendered ABOVE the bubble, extending upward. The wrap
          uses pointerEvents="box-none" so taps outside the popup fall
          through to the background page (ghost-user can still animate
          forms below). */}
      {expanded ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.popupWrap,
            {
              // Anchor the top-right corner near the top of where the
              // bubble sits and stretch upward.
              bottom: bubbleBottom + BUBBLE_SIZE + 8,
              right: BUBBLE_MARGIN_RIGHT,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.popup,
              {
                width: POPUP_W,
                height: POPUP_H,
                opacity: popupOpacity,
                transform: [
                  { translateX: popupTX },
                  { translateY: popupTY },
                  { scale: popupScale },
                ],
              },
            ]}
            pointerEvents="auto"
          >
            <JarvisPopup onClose={() => setExpanded(false)} />
          </Animated.View>
        </View>
      ) : null}

      {/* Bubble — always visible when auth'd + not on assistant tab. */}
      <View
        pointerEvents="box-none"
        style={[
          styles.bubbleWrap,
          { bottom: bubbleBottom, right: BUBBLE_MARGIN_RIGHT },
        ]}
      >
        <Pressable
          onPress={() => setExpanded((prev) => !prev)}
          style={styles.bubbleBtn}
          testID="floating-jarvis"
          accessibilityRole="button"
          accessibilityLabel={expanded ? "Close Wingman chat" : "Open Wingman chat"}
          hitSlop={8}
        >
          {/* Outer pulsing ring — subdued while popup is open. */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.bubbleRing,
              {
                transform: [{ scale: ringScale }],
                opacity: expanded ? 0.35 : ringOpacity,
              },
            ]}
          />
          <View style={styles.bubbleRingSteady} pointerEvents="none" />
          <View style={styles.bubbleCore} pointerEvents="none">
            <LinearGradient
              colors={["#FFFFFF", "#00FFFF", "#00D1FF"]}
              start={{ x: 0.3, y: 0.3 }}
              end={{ x: 0.7, y: 0.7 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
          {/* Glyph swaps to close-X when the popup is open. */}
          <Ionicons
            name={expanded ? "close" : "sparkles"}
            size={expanded ? 18 : 14}
            color="#FFFFFF"
            style={{ zIndex: 2, opacity: 0.95 }}
          />
        </Pressable>
      </View>
    </>
  );
}

// ---------------------------------------------------------------------------
// JarvisPopup — the actual chat surface rendered inside the animated shell
// ---------------------------------------------------------------------------

function JarvisPopup({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { describeForAI } = useScreenContext();
  const ghost = useGhostUser();
  const mic = useMicLevel();

  const [mode, setMode] = useState<LiveOrbMode>("idle");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState("");
  const [textInput, setTextInput] = useState("");
  const inputRef = useRef<TextInput | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const ttsHandleRef = useRef<StreamingTtsHandle | null>(null);
  useBlockers(); // keeps the shared blocker cache warm

  // Auto-focus the input the moment the popup mounts.
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 260);
    return () => clearTimeout(t);
  }, []);

  // Proactive greeting — if blockers exist, greet with the summary line.
  useEffect(() => {
    const b = getCachedBlockers();
    if (!b || b.total === 0) return;
    const t = setTimeout(() => {
      setMessages((prev) =>
        prev.length ? prev : [{ role: "assistant", text: b.summary_hi, at: Date.now() }],
      );
      speak(b.summary_hi).catch(() => undefined);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount — cancel in-flight TTS + release mic.
  useEffect(() => {
    return () => {
      ttsHandleRef.current?.stop();
      ttsHandleRef.current = null;
      if (mic.listening) void mic.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const amplitude = useMemo(() => {
    if (mode === "listening") return mic.level;
    if (mode === "speaking") return 0.4;
    return 0;
  }, [mode, mic.level]);

  useEffect(() => {
    if (mic.listening) setMode("listening");
    else if (mode === "listening") setMode("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mic.listening]);

  const stripTools = (text: string) => text.replace(/```json[\s\S]*?```/g, "").trim();

  const speak = useCallback(async (text: string) => {
    const clean = stripTools(text);
    if (!clean.trim()) return;
    ttsHandleRef.current?.stop();
    const token = getAuthTokenSync();
    const handle = speakStreaming({
      text: clean,
      voice: "shimmer",
      authToken: token,
      onStart: () => setMode("speaking"),
      onError: () => setMode("idle"),
    });
    ttsHandleRef.current = handle;
    handle.promise.finally(() => {
      if (ttsHandleRef.current === handle) {
        setMode("idle");
        ttsHandleRef.current = null;
      }
    });
  }, []);

  const scrollToEnd = useCallback(() => {
    // Small delay so the new message has been laid out.
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 30);
  }, []);

  const sendMessage = useCallback(
    async (message: string) => {
      const q = message.trim();
      if (!q) return;
      setMessages((prev) => [...prev, { role: "user", text: q, at: Date.now() }]);
      scrollToEnd();
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
            session_id: `popup-${Date.now()}`,
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
            scrollToEnd();
          }
        }
        setMessages((prev) => [...prev, { role: "assistant", text: full, at: Date.now() }]);
        setStreaming("");
        scrollToEnd();
        // Ghost-user dispatches on the background page (which is fully
        // interactive because this popup isn't a Modal).
        void ghost.parseAndRun(full).catch(() => undefined);
        void speak(full).catch(() => undefined);
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `त्रुटि: ${(e as Error).message}`, at: Date.now() },
        ]);
        setStreaming("");
        setMode("idle");
      }
    },
    [describeForAI, ghost, messages, scrollToEnd, speak, user],
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

  const modeLabel =
    mode === "listening"
      ? "Listening…"
      : mode === "thinking"
        ? "Thinking…"
        : mode === "speaking"
          ? "Speaking…"
          : "Ready";

  return (
    <View style={styles.popupInner}>
      {/* Glass background — BlurView on native, plain darkened panel on web
          (some Chromium builds refuse to blur inside a scale-transformed
          parent, producing a solid-white flash). */}
      {Platform.OS !== "web" ? (
        <BlurView
          tint="dark"
          intensity={55}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}
      <View style={styles.popupTint} pointerEvents="none" />

      {/* Header */}
      <View style={styles.popupHeader}>
        <View style={styles.popupHeaderLeft}>
          <View style={styles.popupOrbSlot}>
            <LiveOrb size={34} amplitude={amplitude} mode={mode} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.popupTitle}>Wingman</Text>
            <Text style={styles.popupSub} numberOfLines={1}>
              {user ? `${user.display_name} ${user.honorific}` : "Kishan Sir"} · {modeLabel}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={onClose}
          style={styles.popupClose}
          hitSlop={10}
          testID="jarvis-close"
        >
          <Ionicons name="close" size={16} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Transcript */}
      <ScrollView
        ref={scrollRef}
        style={styles.transcript}
        contentContainerStyle={styles.transcriptContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && !streaming ? (
          <Text style={styles.transcriptPlaceholder}>
            बोलिए, सर — Party, item, shipment, या invoice बनाना हो, या कोई
            update करना हो, बता दीजिए।
          </Text>
        ) : null}
        {messages.map((m, i) => (
          <View
            key={i}
            style={[
              styles.msg,
              m.role === "user" ? styles.msgUser : styles.msgAi,
            ]}
          >
            <Text
              style={[
                styles.msgText,
                m.role === "user" ? styles.msgTextUser : styles.msgTextAi,
              ]}
            >
              {stripTools(m.text) || (m.role === "assistant" && mode === "thinking" ? "…" : "")}
            </Text>
          </View>
        ))}
        {streaming ? (
          <View style={[styles.msg, styles.msgAi, styles.msgStreaming]}>
            <Text style={[styles.msgText, styles.msgTextAi]}>{stripTools(streaming)}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Composer */}
      <View style={styles.composer}>
        <TextInput
          ref={inputRef}
          value={textInput}
          onChangeText={setTextInput}
          placeholder="Type a command…"
          placeholderTextColor={colors.textDim}
          style={styles.composerInput}
          testID="jarvis-input"
          onSubmitEditing={() => {
            const v = textInput.trim();
            if (!v) return;
            setTextInput("");
            void sendMessage(v);
          }}
          returnKeyType="send"
          multiline={false}
          autoFocus
        />
        <Pressable
          onPress={handleMicPress}
          style={({ pressed }) => [
            styles.composerMic,
            mic.listening && styles.composerMicActive,
            pressed && { transform: [{ scale: 0.94 }] },
          ]}
          testID="jarvis-mic"
        >
          <Ionicons
            name={mic.listening ? "stop" : "mic"}
            size={16}
            color={mic.listening ? "#000" : colors.accent}
          />
        </Pressable>
        <Pressable
          onPress={() => {
            const v = textInput.trim();
            if (!v) return;
            setTextInput("");
            void sendMessage(v);
          }}
          style={({ pressed }) => [
            styles.composerSend,
            pressed && { transform: [{ scale: 0.94 }] },
          ]}
          testID="jarvis-send"
        >
          {mode === "thinking" ? (
            <ActivityIndicator size={14} color="#000" />
          ) : (
            <Ionicons name="send" size={14} color="#000" />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ------------------- Bubble -------------------
  bubbleWrap: {
    position: "absolute",
    zIndex: 999,
  },
  bubbleBtn: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 209, 255, 0.10)",
  },
  bubbleRing: {
    position: "absolute",
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
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

  // ------------------- Popup shell -------------------
  popupWrap: {
    position: "absolute",
    zIndex: 998,
  },
  popup: {
    borderRadius: radii.xl,
    overflow: "hidden",
    backgroundColor: "rgba(6, 10, 20, 0.94)",
    borderColor: colors.borderStrong,
    borderWidth: StyleSheet.hairlineWidth,
    // Cyan halo glow so the popup reads as a Cyber-Siri chat surface.
    shadowColor: colors.accent,
    shadowOpacity: 0.55,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 24,
  },
  popupInner: {
    flex: 1,
    padding: spacing.md,
  },
  popupTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 6, 16, 0.65)",
  },

  // Popup header
  popupHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  popupHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  popupOrbSlot: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  popupTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
  popupSub: { color: colors.textMuted, fontSize: 10, marginTop: 1, letterSpacing: 0.3 },
  popupClose: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 209, 255, 0.06)",
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },

  // Transcript
  transcript: {
    flex: 1,
  },
  transcriptContent: {
    paddingBottom: 8,
    gap: 6,
  },
  transcriptPlaceholder: {
    color: colors.textMuted,
    fontSize: 12,
    fontStyle: "italic",
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: 10,
    paddingVertical: 24,
  },
  msg: {
    maxWidth: "88%",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  msgUser: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(0, 209, 255, 0.85)",
  },
  msgAi: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(15, 25, 45, 0.85)",
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  msgStreaming: { opacity: 0.9 },
  msgText: { fontSize: 12.5, lineHeight: 17 },
  msgTextUser: { color: "#02121a", fontWeight: "600" },
  msgTextAi: { color: colors.text },

  // Composer
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  composerInput: {
    flex: 1,
    backgroundColor: "rgba(10, 14, 24, 0.9)",
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 9 : 6,
    color: colors.text,
    fontSize: 13,
  },
  composerMic: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 209, 255, 0.08)",
    borderColor: colors.accent,
    borderWidth: 1,
  },
  composerMicActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  composerSend: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
});
