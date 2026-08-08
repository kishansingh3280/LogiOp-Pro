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
import { usePathname, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE } from "@/src/api/client";
import { getAuthTokenSync, useAuth } from "@/src/auth/context";
import { getCachedBlockers, useBlockers } from "@/src/components/blocker-bell";
import { setCloud, subscribeCloud, type CloudMsg } from "@/src/components/jarvis-store";
import { LiveOrb, type LiveOrbMode } from "@/src/components/live-orb";
import { useScreenContext } from "@/src/context/screen-context";
import { useGhostUser } from "@/src/ghost/ghost-user";
import { useMicLevel } from "@/src/hooks/use-mic-level";
import { useWakeWord } from "@/src/hooks/use-wake-word";
import { colors, radii, spacing } from "@/src/theme";
import { speakStreaming, type StreamingTtsHandle } from "@/src/utils/tts-stream";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// Popup dimensions — right-side vertical sidebar layout. Docked to the
// right edge, full-height (safe-area aware). Kept narrower than the full
// screen so the operator can still see the underlying page peeking on the
// left while chatting. On tablets/wide viewports it widens gracefully.
const SIDEBAR_W = Math.min(360, Math.max(280, Math.round(SCREEN_W * 0.82)));
const SIDEBAR_MAX_H = SCREEN_H;

// Bubble geometry — kept in sync with styles.bubbleBtn below.
const BUBBLE_SIZE = 56;
const BUBBLE_MARGIN_RIGHT = 14;

type Msg = { role: "user" | "assistant"; text: string; at: number };

// Where NOT to show the bubble. Only the sign-in gate — the Assistant
// tab was removed and this floater IS the assistant now.
const HIDE_ON = new Set<string>(["/sign-in"]);

export function FloatingJarvis() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  // Message-Cloud: subscribes to the module-level store so it stays fresh
  // even after the popup unmounts. When the popup / live-mode is OPEN we
  // suppress the cloud (they already show the message inline).
  const [cloudMsg, setCloudMsgState] = useState<CloudMsg | null>(null);
  useEffect(() => {
    const unsub = subscribeCloud((m) => setCloudMsgState(m));
    return unsub;
  }, []);
  // Auto-dismiss stale cloud messages after 8s.
  useEffect(() => {
    if (!cloudMsg) return;
    const stale = 8_000 - (Date.now() - cloudMsg.at);
    if (stale <= 0) {
      setCloud(null);
      return;
    }
    const t = setTimeout(() => setCloud(null), stale);
    return () => clearTimeout(t);
  }, [cloudMsg]);

  // Wake-word listener (web-only). Say "Assistant" / "Wingman" and the
  // floater opens Live Mode automatically. Paused while any modal /
  // popup is active so we don't fight the recorder for the mic stream.
  useWakeWord({
    enabled: !!user && !expanded && !liveMode,
    onWake: () => {
      // eslint-disable-next-line no-console
      console.log("[jarvis] wake-word detected — entering Live Mode");
      setExpanded(false);
      setLiveMode(true);
    },
  });

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

  // Sidebar slide-in animation. `expanded` drives a 0→1 value; we use
  // it for opacity + a subtle scale so it never renders off-screen (a
  // translate-X approach was fighting RN Web's clip-box for absolutely
  // positioned parents with `right: 0`).
  const popup = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(popup, {
      toValue: expanded ? 1 : 0,
      useNativeDriver: false,
      stiffness: expanded ? 220 : 280,
      damping: expanded ? 26 : 30,
      mass: 0.7,
    }).start();
  }, [expanded, popup]);

  const shouldHide = !user || HIDE_ON.has(pathname || "");
  if (shouldHide) return null;

  const bubbleBottom = insets.bottom + 96; // above the tab bar

  const popupOpacity = popup.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const popupScale = popup.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });

  return (
    <>
      {/* Sidebar — glassmorphic right-docked vertical panel. Slides in
          from the right edge; background stays visible to the left so
          the operator can see their app data while chatting. NOT a
          Modal — the background page remains fully interactive so
          Ghost-User can navigate + type on the underlying form while
          the operator keeps chatting. */}
      {expanded ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.popupWrap,
            {
              top: 0,
              right: 0,
              bottom: 0,
              width: SIDEBAR_W,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.popup,
              {
                width: SIDEBAR_W,
                height: "100%",
                opacity: popupOpacity,
                paddingTop: insets.top + 8,
                paddingBottom: Math.max(insets.bottom, 12) + BUBBLE_SIZE + 16,
                transform: [{ scale: popupScale }],
              },
            ]}
            pointerEvents="auto"
          >
            <JarvisPopup
              onClose={() => setExpanded(false)}
              onGoLive={() => {
                setExpanded(false);
                setLiveMode(true);
              }}
            />
          </Animated.View>
        </View>
      ) : null}

      {/* Hands-free Live Mode — fullscreen Gemini-Live-style loop. */}
      {liveMode ? (
        <LiveMode
          onClose={() => {
            setLiveMode(false);
          }}
        />
      ) : null}

      {/* Bubble — always visible when auth'd + not on assistant tab. */}
      <View
        pointerEvents="box-none"
        style={[
          styles.bubbleWrap,
          { bottom: bubbleBottom, right: BUBBLE_MARGIN_RIGHT },
        ]}
      >
        {/* Message Cloud — appears when Jarvis has a fresh reply and no
            popup / live-mode is open. Chirps up from the bubble as a
            small glassmorphic pill with the latest text. Tapping it
            opens the full popup so the operator can read the transcript
            or reply. */}
        {cloudMsg && !expanded && !liveMode ? (
          <Pressable
            style={styles.cloudWrap}
            onPress={() => {
              setCloud(null);
              setExpanded(true);
            }}
            hitSlop={4}
            testID="jarvis-cloud"
          >
            <View style={styles.cloud}>
              <Text style={styles.cloudText} numberOfLines={3}>
                {cloudMsg.text.replace(/```json[\s\S]*?```/g, "").trim()}
              </Text>
              <Pressable
                style={styles.cloudDismiss}
                onPress={(e) => {
                  // Prevent parent Pressable from firing.
                  e.stopPropagation?.();
                  setCloud(null);
                }}
                hitSlop={6}
                testID="jarvis-cloud-dismiss"
              >
                <Ionicons name="close" size={12} color={colors.textMuted} />
              </Pressable>
            </View>
            {/* Tail arrow pointing down toward the bubble. */}
            <View style={styles.cloudTail} pointerEvents="none" />
          </Pressable>
        ) : null}

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

function JarvisPopup({ onClose, onGoLive }: { onClose: () => void; onGoLive: () => void }) {
  const { user } = useAuth();
  const { describeForAI } = useScreenContext();
  const ghost = useGhostUser();
  const mic = useMicLevel();
  const router = useRouter();

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

  // ---------------------------------------------------------------------
  // Brain Connection — pull the shared conversation history from the
  // server. This includes messages that originated from WhatsApp so the
  // in-app Wingman and the external WhatsApp bot share ONE memory.
  // Sourced from the `assistant_messages` MongoDB collection via
  // `GET /api/assistant/history`.
  // ---------------------------------------------------------------------
  const [historyLoaded, setHistoryLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = getAuthTokenSync();
        const resp = await fetch(`${API_BASE}/api/assistant/history?limit=40`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const rows = (await resp.json()) as {
          id?: string;
          role: "user" | "assistant";
          content: string;
          created_at?: string;
        }[];
        if (cancelled) return;
        const loaded: Msg[] = rows
          .filter((r) => r && r.role && r.content)
          .map((r) => ({
            role: r.role,
            text: r.content,
            at: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
          }));
        setMessages(loaded);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 60);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[jarvis] history load failed:", (e as Error).message);
      } finally {
        if (!cancelled) setHistoryLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Proactive greeting — if blockers exist AND we have no prior
  // conversation loaded, greet with the summary line.
  useEffect(() => {
    if (!historyLoaded) return;
    const b = getCachedBlockers();
    if (!b || b.total === 0) return;
    setMessages((prev) => {
      if (prev.length > 0) return prev; // don't clobber loaded history
      speak(b.summary_hi).catch(() => undefined);
      return [{ role: "assistant", text: b.summary_hi, at: Date.now() }];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyLoaded]);

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
        // Publish to the cloud store so if the operator closes the popup
        // the bubble can still chirp the reply as a speech bubble.
        setCloud({ text: full, at: Date.now() });
        // Ghost-user dispatches on the background page (which is fully
        // interactive because this popup isn't a Modal).
        void ghost.parseAndRun(full).catch(() => undefined);
        void speak(full).catch(() => undefined);
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `Error: ${(e as Error).message}`, at: Date.now() },
        ]);
        setStreaming("");
        setMode("idle");
      }
    },
    [describeForAI, ghost, messages, scrollToEnd, speak, user],
  );

  const handleMicPress = useCallback(async () => {
    // No-op — kept for backward compat. Mic in the popup now opens Live Mode.
  }, []);
  void handleMicPress; // silence unused warning

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
            <View style={styles.popupSubRow}>
              <Text style={styles.popupSub} numberOfLines={1}>
                {user ? `${user.display_name} ${user.honorific}` : "Kishan Sir"} · {modeLabel}
              </Text>
              {historyLoaded && messages.length > 0 ? (
                <View style={styles.brainBadge} testID="jarvis-brain-synced">
                  <Ionicons name="logo-whatsapp" size={9} color="#34D399" />
                  <Text style={styles.brainBadgeText}>brain synced</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
        <Pressable
          onPress={() => {
            onClose();
            // Small delay so the popup animation can start closing before
            // the route transition. Otherwise the two animations stutter.
            setTimeout(() => router.push("/wingman/activity" as never), 120);
          }}
          style={styles.popupClose}
          hitSlop={10}
          testID="jarvis-history"
          accessibilityLabel="Open Wingman activity log"
        >
          <Ionicons name="time-outline" size={16} color={colors.textMuted} />
        </Pressable>
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
            Boliye Sir — party, item, shipment ya invoice banana ho, ya
            koi update, bata dijiye.
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
          onPress={onGoLive}
          style={({ pressed }) => [
            styles.composerMic,
            pressed && { transform: [{ scale: 0.94 }] },
          ]}
          testID="jarvis-mic"
          accessibilityLabel="Enter hands-free Live mode"
        >
          <Ionicons name="mic" size={16} color={colors.accent} />
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

// ---------------------------------------------------------------------------
// LiveMode — fullscreen hands-free "Gemini-Live"-style conversation loop
// ---------------------------------------------------------------------------
//
// Auto-listens on mount. When the mic level goes above a speech threshold
// and then stays below a silence threshold for ~1.5s, we treat it as
// "user finished a phrase", run STT → chat → TTS, then re-open the mic
// for the next turn. Loop continues until the operator taps End.

function LiveMode({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { describeForAI } = useScreenContext();
  const ghost = useGhostUser();
  const mic = useMicLevel();

  const [phase, setPhase] = useState<"listening" | "processing" | "thinking" | "speaking" | "starting">("starting");
  const [transcript, setTranscript] = useState("");         // rolling last STT
  const [reply, setReply] = useState("");                    // rolling last assistant reply
  const messagesRef = useRef<Msg[]>([]);
  const ttsHandleRef = useRef<StreamingTtsHandle | null>(null);
  const spokeRef = useRef(false);                            // has user vocalised at least once this cycle?
  const silenceSinceRef = useRef<number | null>(null);       // ms timestamp when silence started
  const cancelledRef = useRef(false);
  const busyRef = useRef(false);

  // Big-orb amplitude
  const amplitude = useMemo(() => {
    if (phase === "listening") return mic.level;
    if (phase === "speaking") return 0.55;
    if (phase === "thinking" || phase === "processing") return 0.15;
    return 0;
  }, [phase, mic.level]);

  const orbMode: LiveOrbMode =
    phase === "listening" ? "listening" : phase === "speaking" ? "speaking" : phase === "thinking" ? "thinking" : "idle";

  // ---------- helpers ----------
  const beginListening = useCallback(async () => {
    if (cancelledRef.current) return;
    setPhase("listening");
    spokeRef.current = false;
    silenceSinceRef.current = null;
    setTranscript("");
    try {
      await mic.start();
    } catch {
      setPhase("starting");
    }
  }, [mic]);

  const finishTurn = useCallback(async () => {
    if (busyRef.current || cancelledRef.current) return;
    busyRef.current = true;
    try {
      setPhase("processing");
      const result = await mic.stop();
      if (cancelledRef.current) return;
      if (!result) {
        // Nothing was captured; loop back to listening after a brief pause.
        setTimeout(() => void beginListening(), 400);
        return;
      }
      // Upload for STT.
      const form = new FormData();
      if ("blob" in result && result.blob) {
        const filename = (result.mimeType || "audio/webm").includes("mp4") ? "voice.mp4" : "voice.webm";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        form.append("audio", result.blob as any, filename);
      } else if ("uri" in result && result.uri) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        form.append("audio", { uri: result.uri, name: "voice.m4a", type: "audio/m4a" } as any);
      }
      const sttRes = await fetch(`${API_BASE}/api/assistant/stt`, { method: "POST", body: form });
      if (!sttRes.ok) throw new Error(`STT ${sttRes.status}`);
      const sttJson = (await sttRes.json()) as { text?: string };
      const heard = (sttJson.text || "").trim();
      if (!heard) {
        if (!cancelledRef.current) setTimeout(() => void beginListening(), 400);
        return;
      }
      setTranscript(heard);
      messagesRef.current = [...messagesRef.current, { role: "user", text: heard, at: Date.now() }];

      // Now stream chat.
      setPhase("thinking");
      const token = getAuthTokenSync();
      const chatRes = await fetch(`${API_BASE}/api/assistant/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Entry-Source": "ai",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          session_id: `live-${Date.now()}`,
          message: heard,
          history: messagesRef.current,
          screen_context: describeForAI(),
          honorific: user?.honorific || "Sir",
          display_name: user?.display_name || "Kishan",
        }),
      });
      if (!chatRes.ok || !chatRes.body) throw new Error(`chat ${chatRes.status}`);
      const reader = chatRes.body.getReader();
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
          setReply(full);
        }
      }
      messagesRef.current = [...messagesRef.current, { role: "assistant", text: full, at: Date.now() }];
      // Publish to cloud store — if the operator ends Live Mode while the
      // reply is still on screen, the bubble chirps it as a cloud.
      setCloud({ text: full, at: Date.now() });
      // Ghost dispatches happen on the background page — user hears the
      // spoken confirmation while the ghost fills the form.
      void ghost.parseAndRun(full).catch(() => undefined);

      if (cancelledRef.current) return;

      // Speak.
      const clean = full.replace(/```json[\s\S]*?```/g, "").trim();
      if (clean) {
        setPhase("speaking");
        ttsHandleRef.current?.stop();
        const handle = speakStreaming({
          text: clean,
          voice: "shimmer",
          authToken: token,
          onError: () => undefined,
        });
        ttsHandleRef.current = handle;
        await handle.promise;
        ttsHandleRef.current = null;
      }
      if (!cancelledRef.current) {
        // Auto-listen again.
        await beginListening();
      }
    } catch {
      if (!cancelledRef.current) {
        setTimeout(() => void beginListening(), 800);
      }
    } finally {
      busyRef.current = false;
    }
  }, [beginListening, describeForAI, ghost, mic, user]);

  // Kick off the first listen on mount.
  useEffect(() => {
    void beginListening();
    return () => {
      cancelledRef.current = true;
      ttsHandleRef.current?.stop();
      ttsHandleRef.current = null;
      if (mic.listening) void mic.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // VAD — poll the mic level and detect end of utterance.
  useEffect(() => {
    if (phase !== "listening") return;
    const now = Date.now();
    const SPEECH_THRESHOLD = 0.15;
    const SILENCE_THRESHOLD = 0.08;
    const SILENCE_HOLD_MS = 1400;
    if (mic.level > SPEECH_THRESHOLD) {
      spokeRef.current = true;
      silenceSinceRef.current = null;
      return;
    }
    if (spokeRef.current && mic.level < SILENCE_THRESHOLD) {
      if (silenceSinceRef.current == null) {
        silenceSinceRef.current = now;
      } else if (now - silenceSinceRef.current >= SILENCE_HOLD_MS) {
        // End of phrase — fire the pipeline.
        silenceSinceRef.current = null;
        void finishTurn();
      }
    }
  }, [mic.level, phase, finishTurn]);

  // Manual "send now" — tap the orb to finish speaking early.
  const handleOrbTap = useCallback(() => {
    if (phase === "listening" && spokeRef.current) void finishTurn();
  }, [phase, finishTurn]);

  const label =
    phase === "starting" ? "Warming up…" :
    phase === "listening" ? "Suno raha hoon…" :
    phase === "processing" ? "Aapki baat samajh raha hoon…" :
    phase === "thinking" ? "Soch raha hoon…" :
    phase === "speaking" ? "Bol raha hoon…" : "";

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.liveWrap}>
        <LinearGradient
          colors={["#020202", "#050820", "#020202"]}
          style={StyleSheet.absoluteFill}
        />
        {Platform.OS !== "web" ? (
          <BlurView tint="dark" intensity={40} style={StyleSheet.absoluteFill} />
        ) : (
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(2,2,2,0.55)" }]}
            pointerEvents="none"
          />
        )}

        {/* Close button */}
        <Pressable
          onPress={onClose}
          style={[styles.liveClose, { top: insets.top + 12 }]}
          testID="live-close"
          accessibilityLabel="End Live mode"
          hitSlop={12}
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>

        {/* Header */}
        <View style={[styles.liveHeader, { top: insets.top + 14 }]}>
          <View style={styles.liveHeaderDot} />
          <Text style={styles.liveHeaderText}>
            Live · {user ? `${user.display_name} ${user.honorific}` : "Kishan Sir"}
          </Text>
        </View>

        {/* Orb — tap to end phrase early */}
        <Pressable
          onPress={handleOrbTap}
          style={styles.liveOrbArea}
          accessibilityLabel="Tap to end phrase"
        >
          <LiveOrb size={260} amplitude={amplitude} mode={orbMode} />
        </Pressable>

        {/* Status + last transcript / reply */}
        <View style={[styles.liveStatus, { paddingBottom: Math.max(insets.bottom, 12) + 24 }]}>
          <Text style={styles.liveLabel}>{label}</Text>
          {transcript ? (
            <Text style={styles.liveTranscript} numberOfLines={2}>
              “{transcript}”
            </Text>
          ) : null}
          {reply ? (
            <Text style={styles.liveReply} numberOfLines={4}>
              {reply.replace(/```json[\s\S]*?```/g, "").trim()}
            </Text>
          ) : null}
          <Text style={styles.liveHint}>Tap orb to send · Tap × to end</Text>
        </View>
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

  // ------------------- Message Cloud -------------------
  cloudWrap: {
    position: "absolute",
    // Anchored to the bubble; sits just above and slightly to the left
    // so the tail visually connects to the bubble's top.
    right: 6,
    bottom: BUBBLE_SIZE + 6,
    alignItems: "flex-end",
    maxWidth: 260,
    zIndex: 1000,
  },
  cloud: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.lg,
    borderBottomRightRadius: 4,
    backgroundColor: "rgba(6, 12, 24, 0.94)",
    borderColor: colors.borderStrong,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  cloudText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  cloudDismiss: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  cloudTail: {
    // Little downward-pointing triangle glued to the cloud's bottom-right
    // corner, aimed at the bubble beneath.
    position: "absolute",
    right: 12,
    bottom: -6,
    width: 12,
    height: 12,
    backgroundColor: "rgba(6, 12, 24, 0.94)",
    borderRightColor: colors.borderStrong,
    borderBottomColor: colors.borderStrong,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    transform: [{ rotate: "45deg" }],
  },

  // ------------------- Sidebar shell -------------------
  popupWrap: {
    position: "absolute",
    zIndex: 998,
  },
  popup: {
    // Full-height right-docked panel. Corners only rounded on the LEFT
    // edge so it visually attaches to the right side of the screen.
    borderTopLeftRadius: radii.xl,
    borderBottomLeftRadius: radii.xl,
    overflow: "hidden",
    backgroundColor: "rgba(6, 10, 20, 0.86)",
    borderLeftColor: colors.borderStrong,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    // Cyan halo along the left edge so the panel visually "detaches"
    // from the background app.
    shadowColor: colors.accent,
    shadowOpacity: 0.55,
    shadowRadius: 30,
    shadowOffset: { width: -12, height: 0 },
    elevation: 24,
  },
  popupInner: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  popupTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 6, 16, 0.55)",
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
  popupSubRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 1 },
  brainBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(52, 211, 153, 0.10)",
    borderColor: "rgba(52, 211, 153, 0.35)",
    borderWidth: StyleSheet.hairlineWidth,
  },
  brainBadgeText: {
    color: "#34D399",
    fontSize: 8,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
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

  // ------------------- Live Mode -------------------
  liveWrap: {
    flex: 1,
    backgroundColor: "#020202",
  },
  liveClose: {
    position: "absolute",
    right: 14,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 209, 255, 0.10)",
    borderColor: colors.borderStrong,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 20,
  },
  liveHeader: {
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
  liveHeaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  liveHeaderText: { color: colors.text, fontSize: 12, fontWeight: "800" },
  liveOrbArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
  },
  liveStatus: {
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    gap: 8,
  },
  liveLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  liveTranscript: {
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 18,
  },
  liveReply: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  liveHint: {
    color: colors.textDim,
    fontSize: 10,
    marginTop: 12,
    letterSpacing: 0.6,
  },
});
