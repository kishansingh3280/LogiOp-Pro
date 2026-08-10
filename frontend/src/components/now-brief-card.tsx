/**
 * NowBriefCard — JARVIS Aura Voice AI Assistant.
 *
 * This card is Wingman's entire voice + text interface. The user can:
 *   • Hold the mic button to speak → audio → Whisper STT → Wingman chat →
 *     typewriter response + ElevenLabs TTS narration (auto-fallback to
 *     OpenAI TTS if ElevenLabs 401s).
 *   • Toggle the keyboard icon → type a message → same AI flow.
 *   • Tap the mute icon → auto-narrate all future responses.
 *   • Tap refresh → regenerate the daily "Now Brief" greeting.
 *
 * Auto-brief: on first mount (and every 30 min after) we hit
 * /api/dashboard/now-brief for a warm greeting + one suggested action.
 * If the mic is un-muted, we narrate that automatically too.
 *
 * Visual states (JARVIS Aura theme):
 *   idle       → purple/green/cyan static gradient
 *   listening  → red pulse on mic + animated waveform bars
 *   processing → shimmer overlay + "Soch raha hoon…"
 *   responding → typewriter text + neon-green breathing border
 *   speaking   → neon-green breathing border + ⏹ stop button
 *   error      → dim red text with a retry action
 *
 * Only this file changes. No other screen is touched.
 */
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "@/src/auth/context";
import { useMicLevel } from "@/src/hooks/use-mic-level";
import { colors, radii, spacing } from "@/src/theme";
import { speakStreaming, type StreamingTtsHandle } from "@/src/utils/tts-stream";
import {
  fetchNowBrief,
  transcribeAudio,
  wingmanChat,
  type WingmanTurn,
} from "@/src/utils/wingman-api";

// ---------------------------------------------------------------------------
// Web-only inline style for the animated AI card gradient — see @keyframes
// aiCardGradient / aiBreathe defined in app/_layout.tsx.
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const webAiCardAnim: any = {
  animation:
    "aiCardGradient 8s ease-in-out infinite, aiBreathe 4s ease-in-out infinite",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  willChange: "background, box-shadow",
};

const CACHE_MS = 30 * 60 * 1000; // Auto-brief refresh window (30 min)
const HISTORY_MAX = 5;

type UiState = "idle" | "listening" | "processing" | "responding" | "speaking" | "error";

type Props = {
  pending: number;
  inTransit: number;
  delivered: number;
  warehouseBags: number;
  warehouseKg: number;
  activeTrips: number;
  overdueLedger?: number;
};

// ---------------------------------------------------------------------------
// Waveform bars — 12 vertical bars whose height is driven by mic level.
// ---------------------------------------------------------------------------
function Waveform({ level, active }: { level: number; active: boolean }) {
  const bars = 12;
  const anims = useRef(
    Array.from({ length: bars }, () => new Animated.Value(0.2)),
  ).current;

  useEffect(() => {
    if (!active) {
      anims.forEach((a) => a.setValue(0.2));
      return;
    }
    // Randomise each bar around the current level so it looks organic.
    anims.forEach((a, i) => {
      const jitter = 0.5 + Math.random() * 0.5;
      const target = Math.max(0.15, Math.min(1, level * jitter + (i % 3) * 0.05));
      Animated.timing(a, {
        toValue: target,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    });
  }, [level, active, anims]);

  return (
    <View style={styles.waveform} pointerEvents="none">
      {anims.map((a, i) => (
        <Animated.View
          key={i}
          style={[
            styles.waveBar,
            {
              height: a.interpolate({
                inputRange: [0, 1],
                outputRange: [4, 32],
              }),
              opacity: active ? 1 : 0.35,
              backgroundColor: active ? "#FF5C7A" : colors.accent,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Mic pulse — outer ring that scales while recording.
// ---------------------------------------------------------------------------
function MicPulseRing({ active }: { active: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active) {
      scale.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.4,
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 900,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, scale]);

  if (!active) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.micPulseRing,
        { transform: [{ scale }] },
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Typewriter — animates text char-by-char at ~28ms/char.
// ---------------------------------------------------------------------------
function useTypewriter(target: string, active: boolean, speed = 22): string {
  const [shown, setShown] = useState<string>(active ? "" : target);
  const iRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (!active) {
      setShown(target);
      return;
    }
    iRef.current = 0;
    setShown("");
    timerRef.current = setInterval(() => {
      iRef.current += 1;
      if (iRef.current >= target.length) {
        setShown(target);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return;
      }
      setShown(target.slice(0, iRef.current));
    }, speed);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [target, active, speed]);

  return shown;
}

// ---------------------------------------------------------------------------
// Border breathing — animated Value between 0..1 (used for glow intensity).
// ---------------------------------------------------------------------------
function useBreathe(active: boolean) {
  const v = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    if (!active) {
      v.setValue(0.4);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(v, {
          toValue: 0.4,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, v]);
  return v;
}

// ---------------------------------------------------------------------------
// MicButtonWeb — dedicated web-only implementation.
//
// The original React Native `Pressable` `onPressIn` / `onPressOut` maps to
// synthetic press handlers that can drop the "up" event on scroll, parent
// re-renders, or if the pointer leaves the button before release, so the
// hold gesture would release immediately.
//
// Fix: use raw DOM mouse + touch events (per user spec) so the hold is
// sustained reliably across every browser. All handlers share a single
// `pressedRef` guard so the start/stop callbacks fire exactly once
// regardless of whether the up came from mouseup, mouseleave, touchend
// or touchcancel.
// ---------------------------------------------------------------------------
function MicButtonWeb(props: {
  onDown: () => void;
  onUp: () => void;
  disabled: boolean;
  listening: boolean;
  processing: boolean;
  micLevel: number;
}) {
  const { onDown, onUp, disabled, listening, processing, micLevel } = props;
  const pressedRef = useRef<boolean>(false);

  const startPress = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => {
      if (disabled || pressedRef.current) return;
      if (e && typeof e.preventDefault === "function") e.preventDefault();
      pressedRef.current = true;
      onDown();
    },
    [disabled, onDown],
  );

  const endPress = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => {
      if (!pressedRef.current) return;
      pressedRef.current = false;
      if (e && typeof e.preventDefault === "function") e.preventDefault();
      onUp();
    },
    [onUp],
  );

  // Consume drag / context-menu events so the browser doesn't get in
  // the way of the hold gesture.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const preventDefault = useCallback((e: any) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
  }, []);

  // react-native-web forwards these DOM-level props straight through to
  // the underlying <div>, so we can wire raw mouse + touch events here.
  // We intentionally register BOTH mouse and touch — pointer events are
  // less reliable across older Safari + WebView shells.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webProps: any = {
    // Mouse (desktop)
    onMouseDown: startPress,
    onMouseUp: endPress,
    onMouseLeave: endPress,
    // Touch (mobile browsers / tablets)
    onTouchStart: startPress,
    onTouchEnd: endPress,
    onTouchCancel: endPress,
    // Anti-drag / anti-selection while holding
    onDragStart: preventDefault,
    onContextMenu: preventDefault,
  };

  return (
    <View
      {...webProps}
      style={[
        styles.micBtn,
        // Full RED background + red glow when listening (per user spec).
        listening ? styles.micBtnRecording : null,
        disabled ? { opacity: 0.7 } : null,
        // Disable text selection + tap highlight while holding, and tell
        // the browser not to intercept the touch for scrolling/zooming.
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...({
            userSelect: "none",
            WebkitUserSelect: "none",
            MozUserSelect: "none",
            msUserSelect: "none",
            WebkitTouchCallout: "none",
            WebkitTapHighlightColor: "transparent",
            touchAction: "none",
            cursor: disabled ? "not-allowed" : "pointer",
          } as any),
        },
      ]}
      testID="now-brief-mic"
    >
      {listening ? (
        // While holding: red button, mic icon, "Recording…" label, and
        // waveform bars animated by mic level.
        <View style={styles.recordingRow}>
          <Ionicons name="mic" size={16} color="#FFFFFF" />
          <Text style={styles.recordingText}>Recording…</Text>
          <View style={styles.recordingWaveWrap}>
            <Waveform level={micLevel} active />
          </View>
        </View>
      ) : (
        <>
          <Ionicons
            name="mic"
            size={18}
            color={processing ? colors.textMuted : "#0A0A14"}
          />
          <Text style={styles.micBtnText}>
            {processing ? "Processing…" : "Hold to Speak"}
          </Text>
        </>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main card
// ---------------------------------------------------------------------------
export function NowBriefCard(props: Props) {
  const auth = useAuth();
  const role = auth.user?.role || "Admin";
  const sessionId = useRef<string>(`wingman-${auth.user?.id || "anon"}-${Date.now()}`).current;

  const [uiState, setUiState] = useState<UiState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [aiText, setAiText] = useState<string>("");
  const [typeTarget, setTypeTarget] = useState<string>("");
  const [typing, setTyping] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(true);
  const [showText, setShowText] = useState<boolean>(false);
  const [textInput, setTextInput] = useState<string>("");
  const [history, setHistory] = useState<WingmanTurn[]>([]);
  // Ephemeral toast used to nudge the operator when they release the mic
  // too fast ("Thoda der hold karein 🎤"). Shown for 1.6s.
  const [toast, setToast] = useState<string>("");
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(""), 1600);
  }, []);

  const lastBriefAt = useRef<number>(0);
  const ttsHandleRef = useRef<StreamingTtsHandle | null>(null);
  const mic = useMicLevel();

  const shownText = useTypewriter(typeTarget, typing, 22);
  const breathe = useBreathe(uiState === "responding" || uiState === "speaking");

  // -------------------------------------------------------------------
  // Kill in-flight TTS on unmount / when user interrupts.
  // -------------------------------------------------------------------
  const stopTts = useCallback(() => {
    if (ttsHandleRef.current) {
      try {
        ttsHandleRef.current.stop();
      } catch {
        /* ignore */
      }
      ttsHandleRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopTts();
    };
  }, [stopTts]);

  // -------------------------------------------------------------------
  // Play a response — typewriter + (if not muted) narrate via TTS.
  // -------------------------------------------------------------------
  const playResponse = useCallback(
    (text: string, autoNarrate: boolean) => {
      const clean = (text || "").trim();
      if (!clean) return;
      // Reset any prior narration.
      stopTts();
      setAiText(clean);
      setTypeTarget(clean);
      setTyping(true);
      setUiState("responding");

      // Estimate typewriter duration (~22ms/char) to release UI back to idle.
      const estMs = Math.max(1200, clean.length * 22 + 400);
      setTimeout(() => {
        setTyping(false);
      }, estMs);

      if (autoNarrate) {
        setUiState("speaking");
        const handle = speakStreaming({
          text: clean,
          voice: "shimmer",
          onStart: () => {
            // No-op — the "speaking" state is already set.
          },
          onError: (err) => {
            // Fall back silently; the text is already shown.
            // eslint-disable-next-line no-console
            console.warn("[wingman] TTS error:", err.message);
          },
        });
        ttsHandleRef.current = handle;
        // When narration finishes, drop back to responding then idle.
        handle.promise
          .catch(() => undefined)
          .finally(() => {
            ttsHandleRef.current = null;
            setUiState((s) => (s === "speaking" ? "responding" : s));
            setTimeout(() => {
              setUiState((s) => (s === "responding" ? "idle" : s));
            }, 600);
          });
      } else {
        // Text-only response — return to idle after typewriter finishes.
        setTimeout(() => {
          setUiState((s) => (s === "responding" ? "idle" : s));
        }, estMs + 200);
      }
    },
    [stopTts],
  );

  // -------------------------------------------------------------------
  // Generate the daily Now-Brief greeting.
  // -------------------------------------------------------------------
  const generateDailyBrief = useCallback(
    async (autoNarrate: boolean) => {
      setUiState("processing");
      setErrorMsg("");
      try {
        const brief = await fetchNowBrief({
          pending: props.pending,
          in_transit: props.inTransit,
          delivered: props.delivered,
          warehouse_bags: props.warehouseBags,
          warehouse_kg: props.warehouseKg,
          active_trips: props.activeTrips,
          overdue_ledger: props.overdueLedger ?? 0,
        });
        lastBriefAt.current = Date.now();
        playResponse(brief, autoNarrate && !muted);
      } catch (e) {
        setUiState("error");
        setErrorMsg((e as Error).message || "Brief generate nahi hua");
      }
    },
    [
      props.pending,
      props.inTransit,
      props.delivered,
      props.warehouseBags,
      props.warehouseKg,
      props.activeTrips,
      props.overdueLedger,
      playResponse,
      muted,
    ],
  );

  // Auto-brief on mount + every 30 min if the counters are known.
  useEffect(() => {
    if (Date.now() - lastBriefAt.current > CACHE_MS) {
      generateDailyBrief(!muted);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------
  // Send a chat message (voice or text).
  // -------------------------------------------------------------------
  const sendMessage = useCallback(
    async (message: string) => {
      const clean = message.trim();
      if (!clean) return;
      const userTurn: WingmanTurn = { role: "user", content: clean, at: Date.now() };
      const nextHistory = [...history, userTurn].slice(-HISTORY_MAX * 2);
      setHistory(nextHistory);
      setUiState("processing");
      setErrorMsg("");
      try {
        const { response } = await wingmanChat(clean, nextHistory, sessionId);
        const aiTurn: WingmanTurn = { role: "assistant", content: response, at: Date.now() };
        setHistory((h) => [...h, aiTurn].slice(-HISTORY_MAX * 2));
        playResponse(response, !muted);
      } catch (e) {
        setUiState("error");
        setErrorMsg((e as Error).message || "AI response fail hua");
      }
    },
    [history, playResponse, muted, sessionId],
  );

  // -------------------------------------------------------------------
  // Hold-to-speak handlers.
  // -------------------------------------------------------------------
  const recordingStartedAtRef = useRef<number>(0);
  const onMicPressIn = useCallback(async () => {
    // Instant visual feedback — flip to listening state BEFORE we await
    // anything. If permissions are still pending or the audio-context
    // takes a beat, the pulse ring + waveform frame is already on-screen
    // so the operator gets confirmation that we heard the tap.
    stopTts();
    setErrorMsg("");
    setUiState("listening");
    recordingStartedAtRef.current = Date.now();
    try {
      await mic.start();
    } catch (e) {
      // Permission denied / hardware unavailable → surface a clear msg
      // and drop back to idle. The user can tap the keyboard toggle to
      // type instead.
      setUiState("error");
      setErrorMsg(
        (e as Error).message ||
          "Microphone access nahi mila. Settings me permission dein, ya keypad se type karein.",
      );
    }
  }, [mic, stopTts]);

  const onMicPressOut = useCallback(async () => {
    // Guard against short holds (< 500ms) where the recorder likely never
    // captured meaningful audio — nudge the user to hold longer via toast,
    // skip STT, and drop back to idle.
    const heldMs = Date.now() - recordingStartedAtRef.current;
    if (heldMs < 500) {
      try {
        await mic.stop();
      } catch {
        /* ignore */
      }
      setUiState((s) => (s === "listening" ? "idle" : s));
      showToast("Thoda der hold karein 🎤");
      return;
    }

    setUiState("processing");
    try {
      const result = await mic.stop();
      if (!result || (!result.uri && !result.blob)) {
        // No audio captured — silently drop back to idle.
        setUiState("idle");
        return;
      }
      const text = await transcribeAudio(result);
      if (!text) {
        // Whisper returned empty — likely silence. Nudge the user.
        setUiState("idle");
        setAiText("Kuch sunayi nahi diya, Sir. Dobara try karein? 🎤");
        setTypeTarget("Kuch sunayi nahi diya, Sir. Dobara try karein? 🎤");
        setTyping(false);
        return;
      }
      await sendMessage(text);
    } catch (e) {
      setUiState("error");
      // Sanitize any raw HTML that might have leaked through ingress
      // error pages before showing it in the response area.
      const raw = (e as Error).message || "Voice ko samajh nahi paya";
      const looksLikeHtml = /<!doctype|<html|<body|<style/i.test(raw);
      setErrorMsg(
        looksLikeHtml
          ? "Voice server abhi respond nahi kar raha. Dobara try karein? 🎤"
          : raw,
      );
    }
  }, [mic, sendMessage, showToast]);

  // -------------------------------------------------------------------
  // Text input handlers.
  // -------------------------------------------------------------------
  const onTextSend = useCallback(async () => {
    const t = textInput.trim();
    if (!t) return;
    setTextInput("");
    setShowText(false);
    await sendMessage(t);
  }, [textInput, sendMessage]);

  // -------------------------------------------------------------------
  // Header actions.
  // -------------------------------------------------------------------
  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      // If un-muting mid-speech, do nothing extra (audio keeps playing).
      // If muting mid-speech, stop the current TTS.
      if (!next === false) {
        // muting
        stopTts();
      }
      return next;
    });
  }, [stopTts]);

  const onRefresh = useCallback(() => {
    if (uiState === "processing" || uiState === "responding" || uiState === "listening") return;
    stopTts();
    generateDailyBrief(!muted);
  }, [uiState, stopTts, generateDailyBrief, muted]);

  const onStopSpeaking = useCallback(() => {
    stopTts();
    setUiState("idle");
  }, [stopTts]);

  // -------------------------------------------------------------------
  // Recent history pills — last N user prompts.
  // -------------------------------------------------------------------
  const recentPrompts = useMemo(
    () => history.filter((h) => h.role === "user").slice(-HISTORY_MAX),
    [history],
  );

  const replayTurn = useCallback(
    (idx: number) => {
      // Replay the assistant response that followed this prompt.
      const userTurns = history.filter((h) => h.role === "user");
      const target = userTurns[idx];
      if (!target) return;
      const pos = history.indexOf(target);
      const next = history.slice(pos + 1).find((h) => h.role === "assistant");
      if (next) playResponse(next.content, !muted);
    },
    [history, playResponse, muted],
  );

  const clearHistory = useCallback(() => {
    stopTts();
    setHistory([]);
  }, [stopTts]);

  // -------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------
  const stateBadge = () => {
    if (uiState === "listening") return { color: "#FF5C7A", label: "Sun raha hoon…" };
    if (uiState === "processing") return { color: "#B98BFF", label: "Soch raha hoon…" };
    if (uiState === "responding") return { color: colors.accent, label: "Reply" };
    if (uiState === "speaking") return { color: colors.accent, label: "Bol raha hoon…" };
    if (uiState === "error") return { color: "#FF6B8A", label: "Error" };
    return null;
  };
  const badge = stateBadge();

  // Border colour bound to the breathing animation on responding/speaking.
  const animatedBorderStyle = {
    borderColor: breathe.interpolate({
      inputRange: [0, 1],
      outputRange: ["rgba(0, 255, 136, 0.22)", "rgba(0, 255, 136, 0.85)"],
    }),
    shadowOpacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.55] }) as unknown as number,
  };

  return (
    <Animated.View
      style={[
        styles.card,
        Platform.OS === "web" ? webAiCardAnim : null,
        (uiState === "responding" || uiState === "speaking") ? animatedBorderStyle : null,
      ]}
      testID="now-brief-card"
    >
      {/* ---------------- Toast (short-hold nudge, etc.) ---------------- */}
      {toast ? (
        <View style={styles.toast} pointerEvents="none" testID="now-brief-toast">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}

      {/* ---------------- Header ---------------- */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>✨</Text>
        </View>
        <Text style={styles.title}>NOW BRIEF</Text>
        {badge ? (
          <View style={[styles.stateChip, { borderColor: badge.color + "88", backgroundColor: badge.color + "22" }]}>
            <View style={[styles.stateDot, { backgroundColor: badge.color }]} />
            <Text style={[styles.stateChipText, { color: badge.color }]} numberOfLines={1}>
              {badge.label}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={toggleMute}
          style={styles.iconBtn}
          hitSlop={8}
          testID="now-brief-mute"
        >
          <Ionicons
            name={muted ? "volume-mute" : "volume-high"}
            size={16}
            color={muted ? colors.textMuted : colors.accent}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onRefresh}
          style={styles.iconBtn}
          hitSlop={8}
          disabled={uiState === "processing" || uiState === "listening"}
          testID="now-brief-refresh"
        >
          {uiState === "processing" ? (
            <ActivityIndicator color="#B98BFF" size="small" />
          ) : (
            <Ionicons name="refresh" size={16} color="#B98BFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* ---------------- Response body ---------------- */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {uiState === "processing" && !aiText ? (
          <Text style={styles.bodyText}>Wingman soch raha hai…</Text>
        ) : uiState === "error" ? (
          <View>
            <Text style={[styles.bodyText, { color: "#FF9AA8" }]}>
              {errorMsg || "Kuch galat ho gaya. Dobara try karein?"}
            </Text>
            <TouchableOpacity
              onPress={onRefresh}
              style={styles.retryBtn}
              testID="now-brief-retry"
            >
              <Ionicons name="refresh" size={14} color={colors.accent} />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.bodyText}>
            {typing ? shownText : aiText || `Namaste ${auth.user?.display_name || "Sir"}! 🙏 Mic dabaake baat karein.`}
            {typing ? <Text style={styles.caret}>▌</Text> : null}
          </Text>
        )}
      </ScrollView>

      {/* ---------------- Stop-speaking button (mid-narration) ---------------- */}
      {uiState === "speaking" ? (
        <TouchableOpacity
          onPress={onStopSpeaking}
          style={styles.stopBtn}
          testID="now-brief-stop-speaking"
        >
          <Ionicons name="stop" size={12} color="#FFFFFF" />
          <Text style={styles.stopBtnText}>Stop</Text>
        </TouchableOpacity>
      ) : null}

      {/* ---------------- Recent-history pills ---------------- */}
      {recentPrompts.length > 0 ? (
        <View style={styles.historyRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingRight: 30 }}
          >
            {recentPrompts.map((p, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => replayTurn(i)}
                style={styles.historyPill}
                testID={`now-brief-history-${i}`}
              >
                <Ionicons name="chatbubble-ellipses" size={10} color={colors.accent} />
                <Text style={styles.historyPillText} numberOfLines={1}>
                  {p.content}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            onPress={clearHistory}
            hitSlop={8}
            style={styles.historyClearBtn}
            testID="now-brief-history-clear"
          >
            <Ionicons name="close-circle-outline" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ---------------- Divider ---------------- */}
      <View style={styles.divider} />

      {/* ---------------- Input row ---------------- */}
      {showText ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={80}
          style={styles.textInputRow}
        >
          <TextInput
            value={textInput}
            onChangeText={setTextInput}
            placeholder="Kuch pooch lein…"
            placeholderTextColor={colors.textMuted}
            style={styles.textInput}
            autoFocus
            multiline
            onSubmitEditing={onTextSend}
            returnKeyType="send"
            blurOnSubmit
            testID="now-brief-text-input"
          />
          <TouchableOpacity
            onPress={() => {
              setShowText(false);
              setTextInput("");
            }}
            hitSlop={8}
            style={styles.iconBtn}
            testID="now-brief-close-text"
          >
            <Ionicons name="close" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onTextSend}
            style={[styles.iconBtn, styles.sendBtn]}
            disabled={!textInput.trim()}
            hitSlop={8}
            testID="now-brief-text-send"
          >
            <Ionicons name="arrow-up" size={16} color={colors.bg} />
          </TouchableOpacity>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.inputRow}>
          {/* Hold-to-speak main button — platform-specific gesture wiring.
              Web: raw pointer events (onPointerDown / onPointerUp /
              onPointerLeave / onPointerCancel) sustain the hold reliably
              across mouse + touch + pen inputs. RN's Pressable can drop
              press-out on scroll or when a parent view repaints.
              Native: standard Pressable onPressIn / onPressOut. */}
          <View style={styles.micWrap}>
            <MicPulseRing active={uiState === "listening"} />
            {Platform.OS === "web" ? (
              <MicButtonWeb
                onDown={onMicPressIn}
                onUp={onMicPressOut}
                disabled={uiState === "processing"}
                listening={uiState === "listening"}
                processing={uiState === "processing"}
                micLevel={mic.level}
              />
            ) : (
              <Pressable
                onPressIn={onMicPressIn}
                onPressOut={onMicPressOut}
                disabled={uiState === "processing"}
                delayLongPress={99999}
                style={({ pressed }) => [
                  styles.micBtn,
                  uiState === "listening" ? styles.micBtnListening : null,
                  pressed ? { opacity: 0.85 } : null,
                ]}
                testID="now-brief-mic"
              >
                {uiState === "listening" ? (
                  <Waveform level={mic.level} active />
                ) : (
                  <>
                    <Ionicons
                      name="mic"
                      size={18}
                      color={uiState === "processing" ? colors.textMuted : "#0A0A14"}
                    />
                    <Text style={styles.micBtnText}>
                      {uiState === "processing" ? "Processing…" : "Hold to Speak"}
                    </Text>
                  </>
                )}
              </Pressable>
            )}
          </View>

          <TouchableOpacity
            onPress={() => setShowText(true)}
            style={styles.iconBtn}
            hitSlop={8}
            testID="now-brief-keyboard-toggle"
          >
            <Ionicons name="keypad" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Role tag — small hint for staff/papa/carrier */}
      {role !== "Admin" ? (
        <Text style={styles.roleHint}>
          {role === "Papa"
            ? "Papa Mode · Simple Hindi · Singh Exports only"
            : role === "Carrier"
              ? "Carrier · Trip guidance"
              : "Staff · Task assistant"}
        </Text>
      ) : null}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: "rgba(24, 12, 44, 0.55)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    ...Platform.select({
      web: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({
          background:
            "linear-gradient(135deg, rgba(155,77,255,0.20) 0%, rgba(0,255,136,0.12) 40%, rgba(0,245,255,0.15) 80%, rgba(155,77,255,0.18) 100%)",
        } as any),
      },
      default: {
        shadowColor: "#9B4DFF",
        shadowOpacity: 0.35,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 4 },
      },
    }),
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(155, 77, 255, 0.18)",
    borderColor: "rgba(185, 139, 255, 0.55)",
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 13 },
  title: {
    color: "#B98BFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.9,
    textShadowColor: "rgba(155,77,255,0.50)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  stateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    marginLeft: "auto",
    marginRight: 4,
    maxWidth: 140,
  },
  stateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stateChipText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(155,77,255,0.10)",
    borderColor: "rgba(185,139,255,0.40)",
    borderWidth: StyleSheet.hairlineWidth,
  },
  sendBtn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },

  body: {
    maxHeight: 220,
    marginBottom: 8,
  },
  bodyContent: {
    paddingRight: 4,
  },
  bodyText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "500",
  },
  caret: {
    color: colors.accent,
    fontWeight: "900",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accent + "88",
    alignSelf: "flex-start",
  },
  retryText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255, 92, 122, 0.85)",
    marginBottom: 8,
  },
  stopBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },

  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  historyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: 200,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(0, 255, 136, 0.08)",
    borderColor: "rgba(0, 255, 136, 0.35)",
    borderWidth: StyleSheet.hairlineWidth,
  },
  historyPillText: {
    color: colors.text,
    fontSize: 11,
    maxWidth: 170,
  },
  historyClearBtn: {
    marginLeft: 6,
    padding: 4,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 8,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  micWrap: {
    flex: 1,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  micBtn: {
    flex: 1,
    width: "100%",
    height: 46,
    borderRadius: 999,
    backgroundColor: colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    zIndex: 2,
    ...Platform.select({
      web: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ boxShadow: "0 0 22px rgba(0,255,136,0.35)" } as any),
      },
      default: {
        shadowColor: colors.accent,
        shadowOpacity: 0.55,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 0 },
      },
    }),
  },
  micBtnListening: {
    backgroundColor: "rgba(255, 92, 122, 0.15)",
    borderColor: "#FF5C7A",
    borderWidth: 1,
  },
  // Full-red "Recording…" state used on web while the button is being
  // held. The native Pressable already lights up correctly via
  // micBtnListening; on web we go a step further and paint the whole
  // pill red so the operator has an unmistakable hold indicator.
  micBtnRecording: {
    backgroundColor: "#FF3355",
    borderColor: "#FF3355",
    borderWidth: 0,
    ...Platform.select({
      web: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ boxShadow: "0 0 26px rgba(255,51,85,0.65)" } as any),
      },
      default: {
        shadowColor: "#FF3355",
        shadowOpacity: 0.65,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 0 },
      },
    }),
  },
  recordingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordingText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  recordingWaveWrap: {
    marginLeft: 4,
  },
  micBtnText: {
    color: "#0A0A14",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  micPulseRing: {
    position: "absolute",
    width: "100%",
    height: 46,
    borderRadius: 999,
    borderColor: "#FF5C7A",
    borderWidth: 2,
    zIndex: 1,
    ...Platform.select({
      web: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ boxShadow: "0 0 24px rgba(255,92,122,0.45)" } as any),
      },
      default: {
        shadowColor: "#FF5C7A",
        shadowOpacity: 0.55,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 0 },
      },
    }),
  },
  waveform: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    height: 32,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: "#FF5C7A",
  },

  textInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 46,
    maxHeight: 90,
    borderRadius: radii.md,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    borderColor: "rgba(255,255,255,0.14)",
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },

  roleHint: {
    marginTop: 8,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.4,
    textAlign: "center",
  },

  toast: {
    position: "absolute",
    top: -14,
    alignSelf: "center",
    left: 20,
    right: 20,
    zIndex: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(24, 12, 44, 0.95)",
    borderColor: "rgba(0, 255, 136, 0.55)",
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    ...Platform.select({
      web: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ boxShadow: "0 6px 24px rgba(0,0,0,0.55)" } as any),
      },
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.55,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
      },
    }),
  },
  toastText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    textAlign: "center",
  },
});
