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
// ChatBubble — one row in the conversation log.
//
// Renders user turns as right-aligned cyan bubbles and assistant turns as
// left-aligned dark-glass bubbles. When `speakingWordIdx >= 0` the assistant
// bubble's text is broken into words and each word is coloured based on its
// position vs the current speaking index:
//   • Already spoken → white
//   • Currently spoken → neon green + text-shadow glow
//   • Not yet spoken → muted white 50%
// ---------------------------------------------------------------------------
function ChatBubble({
  role,
  content,
  speakingWordIdx,
}: {
  role: "user" | "assistant";
  content: string;
  speakingWordIdx: number;
}) {
  const isUser = role === "user";
  const words = useMemo(() => content.split(/(\s+)/), [content]); // keep spaces
  const showKaraoke = !isUser && speakingWordIdx >= 0;
  let wordCounter = -1;

  return (
    <View
      style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAi]}
      testID={`chat-bubble-${role}`}
    >
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
        {showKaraoke ? (
          <Text style={styles.bubbleText}>
            {words.map((w, i) => {
              // Preserve whitespace as-is.
              if (/^\s+$/.test(w)) return <Text key={i}>{w}</Text>;
              wordCounter += 1;
              const idx = wordCounter;
              const isNow = idx === speakingWordIdx;
              const isPast = idx < speakingWordIdx;
              const color = isNow
                ? colors.accent
                : isPast
                  ? "#FFFFFF"
                  : "rgba(255,255,255,0.5)";
              return (
                <Text
                  key={i}
                  style={{
                    color,
                    fontWeight: isNow ? "800" : "500",
                    textShadowColor: isNow ? "rgba(0,255,136,0.55)" : "transparent",
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: isNow ? 6 : 0,
                  }}
                >
                  {w}
                </Text>
              );
            })}
          </Text>
        ) : (
          <Text style={styles.bubbleText}>{content}</Text>
        )}
      </View>
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
  // Karaoke sync — index of the word currently being spoken by TTS in the
  // most-recent assistant turn. -1 when nothing is being spoken.
  const [speakingWordIdx, setSpeakingWordIdx] = useState<number>(-1);
  const karaokeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopKaraoke = useCallback(() => {
    if (karaokeTimerRef.current) clearInterval(karaokeTimerRef.current);
    karaokeTimerRef.current = null;
    setSpeakingWordIdx(-1);
  }, []);
  const startKaraoke = useCallback((text: string, estMs: number) => {
    if (karaokeTimerRef.current) clearInterval(karaokeTimerRef.current);
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return;
    // Distribute word timing evenly across estimated TTS duration. Bias a
    // touch faster so highlight leads the audio slightly (feels tighter).
    const perWord = Math.max(90, Math.floor(estMs / words.length) * 0.92);
    let i = 0;
    setSpeakingWordIdx(0);
    karaokeTimerRef.current = setInterval(() => {
      i += 1;
      if (i >= words.length) {
        setSpeakingWordIdx(words.length); // "all spoken"
        if (karaokeTimerRef.current) clearInterval(karaokeTimerRef.current);
        karaokeTimerRef.current = null;
        return;
      }
      setSpeakingWordIdx(i);
    }, perWord);
  }, []);
  // Ephemeral toast (short-hold nudge / permission errors)
  const [toast, setToast] = useState<string>("");
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(""), 1800);
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
  // Play a response — INSTANT display + karaoke word-highlight during TTS.
  // Optionally re-arms the mic after speaking finishes so the operator can
  // hold a continuous back-and-forth conversation without tapping.
  // -------------------------------------------------------------------
  const autoReListenRef = useRef<boolean>(false);
  const playResponse = useCallback(
    (text: string, autoNarrate: boolean) => {
      const clean = (text || "").trim();
      if (!clean) return;
      stopTts();
      stopKaraoke();
      // Show the full text INSTANTLY (no typewriter — the karaoke highlight
      // is what conveys "AI is speaking now").
      setAiText(clean);
      setTypeTarget(clean);
      setTyping(false);
      setUiState("responding");

      if (autoNarrate) {
        setUiState("speaking");
        // Karaoke word timing — approx 260ms per word until TTS reports
        // a true duration (we don't currently thread that back).
        const words = clean.split(/\s+/).filter(Boolean).length;
        const estMs = Math.max(1200, words * 260);
        startKaraoke(clean, estMs);
        const handle = speakStreaming({
          text: clean,
          // Primary: ElevenLabs (voice ID set via backend ELEVENLABS_VOICE_ID
          // env → `ibbx9zDYGvLgtYzRbqqG`, model eleven_multilingual_v2). If
          // ElevenLabs returns 401 / 5xx, the backend auto-falls-back to
          // OpenAI TTS using the voice specified here. `onyx` is OpenAI's
          // deep male voice — closest to a natural Indian-English tone.
          // We NEVER use the browser's built-in speechSynthesis.
          voice: "onyx",
          onStart: () => {},
          onError: (err) => {
            // eslint-disable-next-line no-console
            console.warn("[wingman] TTS error:", err.message);
          },
        });
        ttsHandleRef.current = handle;
        handle.promise
          .catch(() => undefined)
          .finally(() => {
            ttsHandleRef.current = null;
            stopKaraoke();
            setUiState((s) => (s === "speaking" ? "responding" : s));
            setTimeout(() => {
              setUiState((s) => (s === "responding" ? "idle" : s));
              // Continuous conversation — auto re-arm the mic 1.5s after
              // narration ends, but ONLY if the user last engaged via
              // voice (autoReListenRef) and mic is unmuted.
              if (autoReListenRef.current && !muted) {
                setTimeout(() => {
                  // Guard: don't re-arm if state has moved elsewhere.
                  setUiState((s) => (s === "idle" ? s : s));
                  triggerMicToggleRef.current?.(true);
                }, 1500);
              }
            }, 400);
          });
      } else {
        // Text-only response — no re-listen loop.
        setTimeout(() => {
          setUiState((s) => (s === "responding" ? "idle" : s));
        }, 400);
      }
    },
    [stopTts, stopKaraoke, startKaraoke, muted],
  );

  // Late-bound reference so playResponse can invoke toggleListening without
  // creating a circular useCallback dependency.
  const triggerMicToggleRef = useRef<((forceStart: boolean) => void) | null>(null);

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
  // Tap-to-speak — single small circular button toggles listening on/off.
  // Continuous recording (no hold gesture). Tap again → stop + send.
  // Native mic permission is checked explicitly before the recorder is
  // started so denied permissions don't silently swallow audio.
  // -------------------------------------------------------------------
  const listening = uiState === "listening";
  const ensureMicPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") return true; // getUserMedia prompts inline
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ExpoAudio = require("expo-audio");
      const perm = await ExpoAudio.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        showToast("Mic permission do 🎤");
        return false;
      }
      return true;
    } catch {
      // If the module isn't loadable we fall through — startNative will
      // surface a clearer error.
      return true;
    }
  }, [showToast]);

  const startListening = useCallback(async () => {
    stopTts();
    stopKaraoke();
    setErrorMsg("");
    const ok = await ensureMicPermission();
    if (!ok) return;
    setUiState("listening");
    try {
      await mic.start();
    } catch (e) {
      setUiState("error");
      setErrorMsg(
        (e as Error).message ||
          "Microphone access nahi mila. Settings me permission dein, ya keypad se type karein.",
      );
    }
  }, [ensureMicPermission, mic, stopTts, stopKaraoke]);

  const stopListeningAndSend = useCallback(async () => {
    setUiState("processing");
    try {
      const result = await mic.stop();
      if (!result || (!result.uri && !result.blob)) {
        setUiState("idle");
        return;
      }
      const text = await transcribeAudio(result);
      if (!text) {
        setUiState("idle");
        showToast("Kuch sunayi nahi diya 🎤");
        return;
      }
      // Mark the auto-re-listen flag so we keep the conversation going.
      autoReListenRef.current = true;
      await sendMessage(text);
    } catch (e) {
      setUiState("error");
      const raw = (e as Error).message || "Voice ko samajh nahi paya";
      const looksLikeHtml = /<!doctype|<html|<body|<style/i.test(raw);
      setErrorMsg(
        looksLikeHtml
          ? "Voice server abhi respond nahi kar raha. Dobara try karein? 🎤"
          : raw,
      );
    }
  }, [mic, sendMessage, showToast]);

  const toggleListening = useCallback(
    (forceStart?: boolean) => {
      if (forceStart === true) {
        startListening();
        return;
      }
      if (uiState === "listening") {
        stopListeningAndSend();
      } else if (uiState === "speaking" || uiState === "responding") {
        // Interrupt narration → immediately start listening for next input.
        stopTts();
        stopKaraoke();
        startListening();
      } else if (uiState !== "processing") {
        startListening();
      }
    },
    [uiState, startListening, stopListeningAndSend, stopTts, stopKaraoke],
  );

  // Publish the toggle reference so playResponse can re-arm the mic.
  useEffect(() => {
    triggerMicToggleRef.current = toggleListening;
  }, [toggleListening]);

  // -------------------------------------------------------------------
  // Text input handlers.
  // -------------------------------------------------------------------
  const onTextSend = useCallback(async () => {
    const t = textInput.trim();
    if (!t) return;
    setTextInput("");
    setShowText(false);
    // Text-initiated turns must NOT trigger the voice auto-re-arm loop,
    // otherwise the mic would pop open unexpectedly after the AI replies
    // to a typed message.
    autoReListenRef.current = false;
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

      {/* ---------------- Response body — CHAT BUBBLES ---------------- */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {history.length === 0 && !aiText && uiState !== "processing" && uiState !== "error" ? (
          <Text style={styles.bodyText}>
            {`Namaste ${auth.user?.display_name || "Sir"}! 🙏 Neeche mic dabaake baat karein.`}
          </Text>
        ) : null}

        {history.map((turn, i) => (
          <ChatBubble
            key={`${turn.at}-${i}`}
            role={turn.role}
            content={turn.content}
            // Karaoke: only the MOST RECENT assistant turn gets word
            // highlighting while TTS is playing.
            speakingWordIdx={
              turn.role === "assistant" &&
              i === history.length - 1 &&
              (uiState === "speaking" || uiState === "responding")
                ? speakingWordIdx
                : -1
            }
          />
        ))}

        {/* Show the "in-flight" assistant text (from daily-brief which
            doesn't hit the history array). */}
        {aiText && history.length === 0 ? (
          <ChatBubble
            role="assistant"
            content={aiText}
            speakingWordIdx={uiState === "speaking" ? speakingWordIdx : -1}
          />
        ) : null}

        {uiState === "processing" ? (
          <View style={styles.thinkingRow}>
            <ActivityIndicator size="small" color="#B98BFF" />
            <Text style={styles.thinkingText}>Wingman soch raha hai…</Text>
          </View>
        ) : null}

        {uiState === "error" ? (
          <View style={styles.errorBubble}>
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
        ) : null}
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

      {/* ---------------- Input row — SMALL TAP-TO-SPEAK toggle ----------------
          The old hold-to-speak button is replaced with a compact 48-px
          circular mic toggle in the bottom-right of the card. Tap once →
          listen (continuous); tap again → stop + send + AI reply. */}
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
        <View style={styles.tapMicRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.tapMicLabel}>
              {listening
                ? "Listening…"
                : uiState === "processing"
                  ? "Processing…"
                  : uiState === "speaking"
                    ? "Speaking…"
                    : "Tap to speak"}
            </Text>
          </View>
          {/* Keyboard toggle (kept, minimal) */}
          <TouchableOpacity
            onPress={() => setShowText(true)}
            style={styles.iconBtn}
            hitSlop={8}
            testID="now-brief-keyboard-toggle"
          >
            <Ionicons name="keypad" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          {/* Small 48px round mic toggle (bottom-right) */}
          <View style={styles.tapMicWrap}>
            {listening ? <MicPulseRing active={true} /> : null}
            <TouchableOpacity
              onPress={() => toggleListening()}
              style={[styles.tapMic, listening ? styles.tapMicActive : null]}
              testID="now-brief-mic"
              accessibilityLabel={listening ? "Stop listening" : "Tap to speak"}
              disabled={uiState === "processing"}
            >
              <Ionicons
                name={listening ? "stop" : "mic"}
                size={20}
                color={listening ? "#FFFFFF" : "#0A0A14"}
              />
            </TouchableOpacity>
          </View>
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

  // ---- Chat bubbles ---------------------------------------------------
  bubbleRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  bubbleRowUser: {
    justifyContent: "flex-end",
  },
  bubbleRowAi: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "85%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bubbleUser: {
    backgroundColor: "rgba(0, 245, 255, 0.14)",
    borderColor: "rgba(0, 245, 255, 0.55)",
    borderTopRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    borderColor: "rgba(155, 77, 255, 0.35)",
    borderTopLeftRadius: 4,
  },
  bubbleText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  thinkingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  thinkingText: {
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: "italic",
  },
  errorBubble: {
    padding: 8,
  },

  // ---- Tap-to-speak toggle -------------------------------------------
  tapMicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 2,
  },
  tapMicLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  tapMicWrap: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  tapMic: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    ...Platform.select({
      web: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ boxShadow: "0 0 18px rgba(0,255,136,0.45)", cursor: "pointer" } as any),
      },
      default: {
        shadowColor: colors.accent,
        shadowOpacity: 0.55,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 0 },
      },
    }),
  },
  tapMicActive: {
    backgroundColor: "#FF3355",
    ...Platform.select({
      web: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ boxShadow: "0 0 24px rgba(255,51,85,0.75)" } as any),
      },
      default: {
        shadowColor: "#FF3355",
        shadowOpacity: 0.75,
        shadowRadius: 18,
      },
    }),
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
