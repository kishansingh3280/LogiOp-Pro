/**
 * VoiceOrb — floating OPSI orb, rendered on every screen.
 *
 * States:
 *   idle       → slow purple breathing glow
 *   connecting → cyan spinning ring
 *   listening  → cyan pulse + waveform tick
 *   processing → purple spinning neon ring
 *   speaking   → green breathing glow (indicates AI is talking)
 *   error      → red static ring
 *
 * Interaction:
 *   Tap → toggle Realtime session ON/OFF
 *   Long-press → (Phase-2 push-to-talk placeholder)
 */
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, Easing, Keyboard, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/src/auth/context";
import { API_BASE, apiGet } from "@/src/api/client";
import { useVoiceOrb } from "@/src/context/voice-orb-context";
import { speakStreaming, type StreamingTtsHandle } from "@/src/utils/tts-stream";

// OPSI orb geometry — per the "OPSI Complete System" spec.
// 64px idle, 80px active. Two-color aura wrapper (glow) sits 12px
// larger for the diffuse breathing halo effect.
const SIZE = 64;
const SIZE_ACTIVE = 80;

// ---------------------------------------------------------------------------
// Draggable orb — persisted corner + geometry helpers.
// ---------------------------------------------------------------------------

type OrbCorner = "tl" | "tr" | "bl" | "br";

// In-memory ref that survives cross-screen navigation. We deliberately
// avoid AsyncStorage here so orb position doesn't flicker on cold start
// while the storage read is in-flight; default corner is bottom-right.
let PERSISTED_CORNER: OrbCorner = "br";

function loadCorner(): OrbCorner {
  return PERSISTED_CORNER;
}

function saveCorner(c: OrbCorner): void {
  PERSISTED_CORNER = c;
}

/**
 * Convert a corner symbol into approximate absolute window coordinates
 * of the orb's centre. Used to figure out which corner is nearest
 * after a drag release.
 */
function anchorFor(
  c: OrbCorner,
  w: number,
  h: number,
  size: number,
  insets: { top: number; bottom: number },
): { x: number; y: number } {
  const off = 16 + size / 2;
  const bottomBase = Math.max(24, insets.bottom + 16) + size / 2;
  switch (c) {
    case "tl":
      return { x: off, y: insets.top + off };
    case "tr":
      return { x: w - off, y: insets.top + off };
    case "bl":
      return { x: off, y: h - bottomBase };
    case "br":
    default:
      return { x: w - off, y: h - bottomBase };
  }
}

function OpsiUnreadBadge({ count }: { count: number }) {
  // Lightweight unread-notification counter for the OPSI orb. Count is
  // fetched by the parent VoiceOrb (single source of truth so cloud
  // bubbles + badge stay in sync).
  if (count <= 0) return null;
  return (
    <View style={styles.badgeWrap} pointerEvents="none" testID="opsi-unread-badge">
      <Text style={styles.badgeText}>{count > 9 ? "9+" : String(count)}</Text>
    </View>
  );
}


export function VoiceOrb() {
  const orb = useVoiceOrb();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  // NOTE: All hooks below must be called on every render — do NOT put
  // an early `return null` before them, or React will throw
  // "Rendered more hooks than during the previous render" the moment
  // the user logs in (hidden flips false→true).

  // Breathing glow — scale + opacity oscillation. Tuned per state.
  const breathe = useRef(new Animated.Value(0.6)).current;
  const spin = useRef(new Animated.Value(0)).current;

  // ─── OPSI Part 7 · Cloud Bubble Notifications ─────────────────────
  // Poll /api/todo/blockers every 45s. When the total INCREASES from
  // the previous check, surface a floating pill ABOVE the orb showing
  // the Hinglish one-liner summary. The pill fades in with a soft
  // scale/rise (cloud/smoke feel) and auto-dismisses after 4 s.
  const [unreadCount, setUnreadCount] = useState(0);
  const [topBlockers, setTopBlockers] = useState<
    { icon: string; text: string; route?: string }[]
  >([]);
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const prevCountRef = useRef<number | null>(null);
  const bubbleAnim = useRef(new Animated.Value(0)).current;
  const bubbleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBubble = React.useCallback(
    (msg: string) => {
      setBubbleText(msg);
      // Fade + rise in.
      Animated.spring(bubbleAnim, {
        toValue: 1,
        useNativeDriver: false,
        friction: 7,
        tension: 60,
      }).start();
      if (bubbleTimeout.current) clearTimeout(bubbleTimeout.current);
      bubbleTimeout.current = setTimeout(() => {
        Animated.timing(bubbleAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: false,
        }).start(() => setBubbleText(null));
      }, 4000);
    },
    [bubbleAnim],
  );

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/todo/blockers`, {
          headers: { Accept: "application/json" },
        });
        if (!r.ok) return;
        const j = (await r.json()) as {
          items?: unknown[];
          total?: number;
          summary_hi?: string;
          shipments?: { consignment_no?: string; route?: string; missing?: string[] }[];
          invoices?: { invoice_no?: string; party_name?: string; route?: string }[];
          bags?: { bag_no?: string; shipment_id?: string; route?: string }[];
        };
        const total =
          typeof j?.total === "number"
            ? j.total
            : Array.isArray(j?.items)
              ? j.items.length
              : 0;
        if (!alive) return;
        setUnreadCount(total);

        // Materialise top-3 blockers for the OPSI panel preview.
        const previews: { icon: string; text: string; route?: string }[] = [];
        (j.bags || []).slice(0, 2).forEach((b) => {
          previews.push({
            icon: "📦",
            text: `Bag ${b.bag_no || "?"} — weight missing`,
            route: b.route,
          });
        });
        (j.shipments || []).slice(0, 2).forEach((s) => {
          const miss = (s.missing || []).join(" + ") || "info";
          previews.push({
            icon: "🚚",
            text: `${s.consignment_no || "Shipment"} — ${miss}`,
            route: s.route,
          });
        });
        (j.invoices || []).slice(0, 2).forEach((inv) => {
          previews.push({
            icon: "🧾",
            text: `${inv.invoice_no || "Invoice"} · ${inv.party_name || "—"} — amount ₹0`,
            route: inv.route,
          });
        });
        setTopBlockers(previews.slice(0, 3));

        // Detect COUNT INCREASE (new notification arrived). We skip the
        // very first load so operators don't see a bubble every time
        // they open the app just because there were unread items from
        // yesterday — the badge already communicates that.
        const prev = prevCountRef.current;
        if (prev !== null && total > prev && typeof j.summary_hi === "string" && j.summary_hi.length > 0) {
          showBubble(j.summary_hi);
        }
        prevCountRef.current = total;
      } catch {
        /* silent — badge stays at last-known value */
      }
    };
    load();
    const id = setInterval(load, 45_000);
    return () => {
      alive = false;
      clearInterval(id);
      if (bubbleTimeout.current) clearTimeout(bubbleTimeout.current);
    };
  }, [showBubble]);

  // React to explicit pushBubble calls broadcast via the context (e.g.
  // Wingman writes an invoice, WhatsApp inbound arrives). Fires only
  // when the tick moves forward, and only for non-empty messages.
  useEffect(() => {
    if (orb.bubbleTick > 0 && orb.bubbleMessage) {
      showBubble(orb.bubbleMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orb.bubbleTick]);

  // ─── OPSI Part 5 · Smart Unmute ────────────────────────────────────
  // When the operator toggles mute OFF (unmute), OPSI should GREET them
  // with today's now-brief. We fetch `/api/now-brief` and speak the
  // `spoken_summary` via the streaming TTS pipeline. Idempotent: no-op
  // if the mute flag doesn't actually change, and cancels any in-flight
  // playback on remount.
  const prevMutedRef = useRef<boolean>(orb.muted);
  const ttsHandleRef = useRef<StreamingTtsHandle | null>(null);
  useEffect(() => {
    const wasMuted = prevMutedRef.current;
    const isMuted = orb.muted;
    prevMutedRef.current = isMuted;
    if (!wasMuted || isMuted) return; // only fire on false → true transition (unmute)
    let cancelled = false;
    (async () => {
      try {
        const j = await apiGet<{ spoken_summary?: string; top_action?: string }>(
          "/api/now-brief",
        );
        if (cancelled) return;
        const text = (j?.spoken_summary || j?.top_action || "").trim();
        if (!text || cancelled) return;
        // Show the same message as a cloud bubble for visual cue.
        showBubble(text.length > 90 ? text.slice(0, 87) + "…" : text);
        // Stop anything already playing before starting fresh.
        if (ttsHandleRef.current) {
          try { ttsHandleRef.current.stop(); } catch { /* ignore */ }
          ttsHandleRef.current = null;
        }
        ttsHandleRef.current = speakStreaming({
          text,
          voice: "shimmer",
        });
      } catch {
        /* silent — smart unmute is best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orb.muted, showBubble]);

  // Cleanup streaming TTS on unmount so we don't leak MediaSource /
  // audio players when the orb re-mounts across route swaps.
  useEffect(() => {
    return () => {
      if (ttsHandleRef.current) {
        try { ttsHandleRef.current.stop(); } catch { /* ignore */ }
        ttsHandleRef.current = null;
      }
    };
  }, []);

  // Long-press text panel state — mini glass panel that pops above the
  // orb with a text input + send button (voice-only fallback). The
  // `panelAnim` value drives a soft smoke-rise animation (scale + fade
  // + translateY) whenever the panel opens/closes.
  const [panelOpen, setPanelOpen] = useState(false);
  const [text, setText] = useState("");
  const panelAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(panelAnim, {
      toValue: panelOpen ? 1 : 0,
      duration: panelOpen ? 260 : 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [panelOpen, panelAnim]);

  // Keyboard-aware lift — track soft-keyboard height so the orb rides
  // above it on Android/iOS. Web doesn't fire these events.
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const sub1 = Keyboard.addListener(showEvt, (e) => setKbHeight(e.endCoordinates?.height || 0));
    const sub2 = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, []);

  // ------- Draggable + snap-to-corner ---------------------------------
  // Phase B: the orb can be dragged anywhere on the screen and snaps
  // to the nearest corner on release. Default = bottom-right. Position
  // is remembered across screens via `React.useRef` in the parent
  // module (persists for the lifetime of the app process).
  type Corner = OrbCorner;
  const [corner, setCorner] = useState<Corner>(loadCorner());
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const dragging = useRef(false);
  const win = Dimensions.get("window");
  const ORB_SIZE = 88; // approx wrapper size incl. label

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (_e, g) => Math.abs(g.dx) + Math.abs(g.dy) > 0,
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) + Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        dragging.current = true;
        pan.setOffset({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          x: (pan.x as any)._value || 0,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          y: (pan.y as any)._value || 0,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_e, g) => {
        pan.flattenOffset();
        // Determine the absolute release point in window coordinates.
        // We approximate by adding cumulative delta to the CURRENT
        // corner anchor.
        const anchor = anchorFor(corner, win.width, win.height, ORB_SIZE, insets);
        const finalX = anchor.x + g.dx;
        const finalY = anchor.y + g.dy;
        const midX = win.width / 2;
        const midY = win.height / 2;
        const nextCorner: Corner =
          finalX < midX
            ? finalY < midY ? "tl" : "bl"
            : finalY < midY ? "tr" : "br";
        setCorner(nextCorner);
        saveCorner(nextCorner);
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
          friction: 6,
          tension: 60,
        }).start(() => {
          dragging.current = false;
        });
      },
      onPanResponderTerminate: () => {
        pan.flattenOffset();
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        dragging.current = false;
      },
    }),
  ).current;

  // Corner anchor helper — converts corner symbol into absolute
  // positioning style values. On wide screens (tablet+PC+TV) we bump
  // the bottom offset UP so the orb doesn't collide with common bottom
  // FABs like "Add entry", "New Shipment", etc. The user can still
  // drag it anywhere; this is just a smarter default.
  const anchorStyle = useMemo(() => {
    const off = 16;
    const isWide = win.width >= 900;
    // Wide screens: bump 140 px (FAB height + margin). Narrow: no bump —
    // tab bar already gives 60 px clearance and the orb is smaller.
    const bottomBase = Math.max(24, insets.bottom + 16) + kbHeight + (isWide ? 140 : 0);
    switch (corner) {
      case "tl":
        return { top: insets.top + off, left: off };
      case "tr":
        return { top: insets.top + off, right: off };
      case "bl":
        return { bottom: bottomBase, left: off };
      case "br":
      default:
        return { bottom: bottomBase, right: off };
    }
  }, [corner, insets.top, insets.bottom, kbHeight, win.width]);

  // Radiating cyan rings — 2-ring outward loop while listening.
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (orb.state !== "listening") {
      ring1.setValue(0);
      ring2.setValue(0);
      return undefined;
    }
    const mkLoop = (v: Animated.Value, delay = 0) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, {
            toValue: 1,
            duration: 1600,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: false }),
        ]),
      );
    const l1 = mkLoop(ring1, 0);
    const l2 = mkLoop(ring2, 800);
    l1.start();
    l2.start();
    return () => {
      l1.stop();
      l2.stop();
    };
  }, [orb.state, ring1, ring2]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: orb.state === "speaking" ? 900 : 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(breathe, {
          toValue: 0.6,
          duration: orb.state === "speaking" ? 900 : 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [orb.state, breathe]);

  useEffect(() => {
    if (orb.state === "connecting" || orb.state === "processing") {
      const loop = Animated.loop(
        Animated.timing(spin, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      loop.start();
      return () => loop.stop();
    }
    spin.setValue(0);
    return undefined;
  }, [orb.state, spin]);

  // Surface Realtime errors via a toast so the operator knows why the
  // orb turned red. Fires once per unique error string to avoid spam.
  const lastErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (!orb.error) return;
    if (lastErrorRef.current === orb.error) return;
    lastErrorRef.current = orb.error;
    // Lazy-require the toast to keep the import graph tight.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { toast } = require("@/src/components/toast");
    toast.warn(orb.error);
  }, [orb.error]);

  // Hide the orb on the sign-in / auth screens — it should only appear
  // once the user is logged in and inside the app shell. Placed AFTER
  // all hooks to comply with React's Rules of Hooks.
  const hidden = !auth.user || (pathname || "").includes("sign-in");
  if (hidden) return null;

  const stateColor = (() => {
    switch (orb.state) {
      case "connecting":
        return "#00F5FF";
      case "listening":
        return "#00F5FF";
      case "processing":
        return "#B98BFF";
      case "speaking":
        return "#00FF88";
      case "error":
        return "#FF5C7A";
      default:
        return "#9B4DFF"; // idle purple
    }
  })();

  const glowScale = breathe.interpolate({ inputRange: [0.6, 1], outputRange: [1, 1.28] });
  const glowOpacity = breathe.interpolate({ inputRange: [0.6, 1], outputRange: [0.35, 0.75] });
  const spinRot = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  const icon: React.ComponentProps<typeof Ionicons>["name"] =
    orb.state === "listening"
      ? "mic"
      : orb.state === "speaking"
        ? "volume-high"
        : orb.state === "processing" || orb.state === "connecting"
          ? "sync"
          : orb.state === "error"
            ? "warning"
            : "sparkles";

  const showLabel = orb.state !== "idle";
  const labelText =
    orb.state === "connecting"
      ? "Connecting…"
      : orb.state === "listening"
        ? "Sun raha hoon"
        : orb.state === "processing"
          ? "Soch raha hoon"
          : orb.state === "speaking"
            ? "Bol raha hoon"
            : orb.state === "error"
              ? "Error"
              : "";

  return (
    <Animated.View
      {...panResponder.panHandlers}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style={[
        styles.wrapper,
        anchorStyle,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
          // pointer-events routed through style on web to silence RNW's
          // deprecation warning about the top-level prop.
          ...(Platform.OS === "web" ? ({ pointerEvents: "box-none" } as any) : {}),
        },
      ]}
      pointerEvents="box-none"
    >
      {showLabel ? (
        <View style={[styles.labelPill, { borderColor: stateColor + "88" }]}>
          <View style={[styles.labelDot, { backgroundColor: stateColor }]} />
          <Text style={[styles.labelText, { color: stateColor }]}>{labelText}</Text>
        </View>
      ) : null}
      {/* ─── OPSI Part 7 · Cloud Bubble Notification ─────────────────
          Floating pill above the orb — animates in with a soft rise
          + fade and auto-dismisses after 4 s. Tapping the bubble
          opens the OPSI mini panel so the operator can act. */}
      {bubbleText ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.cloudBubbleWrap,
            {
              opacity: bubbleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
              transform: [
                {
                  translateY: bubbleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
                {
                  scale: bubbleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.85, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              setPanelOpen(true);
              // Hide bubble immediately when user taps it.
              if (bubbleTimeout.current) clearTimeout(bubbleTimeout.current);
              Animated.timing(bubbleAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
              }).start(() => setBubbleText(null));
            }}
            style={styles.cloudBubble}
            testID="opsi-cloud-bubble"
          >
            <Text style={styles.cloudEmoji}>💬</Text>
            <Text style={styles.cloudText} numberOfLines={2}>
              {bubbleText}
            </Text>
          </TouchableOpacity>
          {/* Small tail pointing down toward orb */}
          <View style={styles.cloudTail} pointerEvents="none" />
        </Animated.View>
      ) : null}
      {/* Long-press mini glass panel — bundles ALL orb controls in one
          compact card so the operator can type, toggle mute, or start/
          stop listening without needing separate UI surfaces. */}
      {panelOpen ? (
        <Animated.View
          style={[
            styles.panel,
            {
              opacity: panelAnim,
              transform: [
                {
                  translateY: panelAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
                {
                  scale: panelAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                },
              ],
            },
          ]}
          testID="voice-orb-panel"
        >
          {/* ── OPSI Panel Header — ✨ OPSI + mute + close ─────────────
              Sticky header so the operator can always mute/close no
              matter how far they scroll through the blockers/chat. */}
          <View style={styles.panelHeader} testID="voice-orb-panel-header">
            <View style={styles.panelHeaderLeft}>
              <Text style={styles.panelHeaderEmoji}>✨</Text>
              <Text style={styles.panelHeaderTitle}>OPSI</Text>
              {orb.state !== "idle" ? (
                <View style={[styles.panelHeaderStateDot, { backgroundColor: stateColor }]} />
              ) : null}
            </View>
            <View style={styles.panelHeaderRight}>
              <TouchableOpacity
                onPress={() => orb.toggleMute()}
                style={[
                  styles.panelHeaderBtn,
                  orb.muted && styles.panelBtnMuted,
                ]}
                testID="voice-orb-panel-mute-header"
                accessibilityLabel={orb.muted ? "Unmute" : "Mute"}
              >
                <Ionicons
                  name={orb.muted ? "volume-mute" : "volume-high"}
                  size={14}
                  color={orb.muted ? "#FF5C7A" : "#00FF88"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setPanelOpen(false);
                  setText("");
                }}
                style={styles.panelHeaderBtn}
                testID="voice-orb-panel-close-header"
                accessibilityLabel="Close panel"
              >
                <Ionicons name="close" size={14} color="#B98BFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── OPSI Part 4 · Blockers preview (top 3) ────────────────
              Rendered only when the panel is open AND we have items.
              Tapping a row navigates to the offending record and closes
              the panel so the operator can act immediately. */}
          {topBlockers.length > 0 ? (
            <View style={styles.panelBlockers} testID="voice-orb-panel-blockers">
              <View style={styles.panelSectionHeader}>
                <Text style={styles.panelSectionEmoji}>📌</Text>
                <Text style={styles.panelSectionTitle}>Aaj karo ({unreadCount})</Text>
              </View>
              {topBlockers.map((b, idx) => (
                <TouchableOpacity
                  key={`${idx}-${b.text}`}
                  style={styles.panelBlockerRow}
                  onPress={() => {
                    if (b.route) {
                      try {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        router.push(b.route as any);
                      } catch { /* ignore */ }
                    }
                    setPanelOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.panelBlockerEmoji}>{b.icon}</Text>
                  <Text style={styles.panelBlockerText} numberOfLines={1}>
                    {b.text}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={13}
                    color="rgba(255,255,255,0.45)"
                  />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {/* ── OPSI Part 4 · Recent chat bubbles (last 4 turns) ───── */}
          {orb.transcript.length > 0 ? (
            <View style={styles.panelChat} testID="voice-orb-panel-chat">
              <View style={styles.panelSectionHeader}>
                <Text style={styles.panelSectionEmoji}>💬</Text>
                <Text style={styles.panelSectionTitle}>Recent</Text>
              </View>
              <ScrollView
                style={styles.panelChatScroll}
                showsVerticalScrollIndicator={false}
              >
                {orb.transcript.slice(-4).map((t) => (
                  <View
                    key={t.id}
                    style={[
                      styles.chatBubble,
                      t.role === "user" ? styles.chatBubbleUser : styles.chatBubbleAssistant,
                    ]}
                  >
                    <Text style={styles.chatBubbleText} numberOfLines={3}>
                      {t.content}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : (
            <View style={styles.panelChatEmpty} testID="voice-orb-panel-chat-empty">
              <Text style={styles.panelChatEmptyText}>
                🎤 Bolo ya ⌨️ likho — OPSI sun raha hai
              </Text>
            </View>
          )}

          {/* Row 1 — text input full width */}
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="OPSI ko batao…"
            placeholderTextColor="rgba(255,255,255,0.55)"
            style={styles.panelInput}
            autoFocus
            multiline
            testID="voice-orb-panel-input"
            onSubmitEditing={() => {
              const clean = text.trim();
              if (!clean) return;
              if (!orb.isConnected) orb.toggle();
              setTimeout(() => orb.sendText(clean), orb.isConnected ? 0 : 800);
              setText("");
            }}
          />
          {/* Row 2 — action row: mic | mute | close | send */}
          <View style={styles.panelRow}>
            {/* Mic toggle — starts/stops the realtime listening session */}
            <TouchableOpacity
              onPress={() => orb.toggle()}
              style={[
                styles.panelBtn,
                orb.state === "listening" && styles.panelBtnActive,
              ]}
              testID="voice-orb-panel-mic"
              accessibilityLabel={orb.isConnected ? "Stop listening" : "Start listening"}
            >
              <Ionicons
                name={orb.state === "listening" ? "mic" : "mic-outline"}
                size={16}
                color={orb.state === "listening" ? "#0A0A14" : "#00F5FF"}
              />
            </TouchableOpacity>
            {/* Mute — silences the AI narration/TTS globally */}
            <TouchableOpacity
              onPress={() => orb.toggleMute()}
              style={[
                styles.panelBtn,
                orb.muted && styles.panelBtnMuted,
              ]}
              testID="voice-orb-panel-mute"
              accessibilityLabel={orb.muted ? "Unmute AI voice" : "Mute AI voice"}
            >
              <Ionicons
                name={orb.muted ? "volume-mute" : "volume-high"}
                size={16}
                color={orb.muted ? "#FF5C7A" : "#00FF88"}
              />
            </TouchableOpacity>
            {/* Close panel */}
            <TouchableOpacity
              onPress={() => {
                setPanelOpen(false);
                setText("");
              }}
              style={styles.panelBtn}
              testID="voice-orb-panel-close"
              accessibilityLabel="Close panel"
            >
              <Ionicons name="close" size={16} color="#B98BFF" />
            </TouchableOpacity>
            {/* Send — spacer + primary CTA */}
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              onPress={() => {
                const clean = text.trim();
                if (!clean) return;
                if (!orb.isConnected) orb.toggle();
                setTimeout(() => orb.sendText(clean), orb.isConnected ? 0 : 800);
                setText("");
                setPanelOpen(false);
              }}
              style={[styles.panelBtn, styles.panelSendBtn]}
              testID="voice-orb-panel-send"
              accessibilityLabel="Send message"
              disabled={!text.trim()}
            >
              <Ionicons name="arrow-up" size={16} color="#0A0A14" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      ) : null}

      <View style={styles.orbWrap}>
        {/* OPSI unread notifications badge — small red dot with count
            in the top-right corner of the orb. Refreshes when the
            component mounts and every 30s so it feels live without
            hammering the API. */}
        <OpsiUnreadBadge count={unreadCount} />
        {/* Radiating cyan rings while listening — expand outward + fade. */}
        {orb.state === "listening" ? (
          <>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.radRing,
                {
                  borderColor: "#00F5FF",
                  opacity: ring1.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
                  transform: [
                    { scale: ring1.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) },
                  ],
                },
              ]}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.radRing,
                {
                  borderColor: "#00F5FF",
                  opacity: ring2.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                  transform: [
                    { scale: ring2.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) },
                  ],
                },
              ]}
            />
          </>
        ) : null}
        {/* Outer breathing glow */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glow,
            {
              backgroundColor: stateColor + "40",
              transform: [{ scale: glowScale }],
              opacity: glowOpacity,
            },
          ]}
        />
        {/* Spinning ring for connecting/processing */}
        {(orb.state === "connecting" || orb.state === "processing") ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.spinRing,
              { borderTopColor: stateColor, transform: [{ rotate: spinRot }] },
            ]}
          />
        ) : null}
        {/* Solid orb — Tap toggles voice, long-press (500ms) opens
            the text panel. Orb size grows to 80×80 while listening. */}
        <Pressable
          onPress={() => orb.toggle()}
          onLongPress={() => setPanelOpen((o) => !o)}
          delayLongPress={500}
          style={({ pressed }) => [
            styles.orb,
            orb.state === "listening" ? styles.orbLarge : null,
            {
              backgroundColor: stateColor,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          testID="voice-orb"
          accessibilityLabel="Toggle OPSI"
        >
          <Ionicons
            name={icon}
            size={orb.state === "listening" ? 30 : 26}
            color="#0A0A14"
          />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    alignItems: "flex-end",
    zIndex: 100,
    // On web, `position:fixed` behaves better across scrolls / route swaps.
    ...Platform.select({
      web: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ position: "fixed" } as any),
      },
      default: {},
    }),
  },
  labelPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(10,10,20,0.85)",
    marginBottom: 6,
  },
  labelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  labelText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  // ─── OPSI Cloud Bubble Notification ────────────────────────────────
  cloudBubbleWrap: {
    alignItems: "flex-end",
    marginBottom: 8,
    maxWidth: 260,
  },
  cloudBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: "rgba(10,10,20,0.92)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(155,77,255,0.55)",
    ...Platform.select({
      web: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({
          backgroundImage:
            "linear-gradient(135deg, rgba(155,77,255,0.35) 0%, rgba(0,245,255,0.25) 100%)",
          backdropFilter: "blur(18px) saturate(160%)",
          WebkitBackdropFilter: "blur(18px) saturate(160%)",
          boxShadow: "0 6px 24px rgba(155,77,255,0.35)",
        } as any),
      },
      default: {
        shadowColor: "#9B4DFF",
        shadowOpacity: 0.5,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
    }),
  },
  cloudEmoji: {
    fontSize: 14,
  },
  cloudText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  cloudTail: {
    alignSelf: "flex-end",
    width: 10,
    height: 10,
    marginTop: -4,
    marginRight: 16,
    transform: [{ rotate: "45deg" }],
    backgroundColor: "rgba(10,10,20,0.92)",
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(155,77,255,0.55)",
  },
  orbWrap: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  glow: {
    position: "absolute",
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
  },
  radRing: {
    position: "absolute",
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 2,
  },
  orbLarge: {
    width: SIZE_ACTIVE,
    height: SIZE_ACTIVE,
    borderRadius: SIZE_ACTIVE / 2,
  },
  // Red unread-count badge floated over the top-right of the orb.
  badgeWrap: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: "#FF3B30",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
    borderWidth: 2,
    borderColor: "#0A0A14",
    ...Platform.select({
      web: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ boxShadow: "0 0 8px rgba(255,59,48,0.7)" } as any),
      },
      default: {
        shadowColor: "#FF3B30",
        shadowOpacity: 0.7,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 0 },
      },
    }),
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 12,
    textAlign: "center",
  },
  panel: {
    minWidth: 260,
    maxWidth: 320,
    padding: 10,
    borderRadius: 16,
    marginBottom: 8,
    // Fallback base (50% opacity dark). Web gets the AI gradient over
    // this layer via `backgroundImage` below.
    backgroundColor: "rgba(24, 12, 44, 0.50)",
    borderColor: "rgba(155, 77, 255, 0.55)",
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({
          backgroundImage:
            "linear-gradient(135deg, rgba(155,77,255,0.50) 0%, rgba(0,255,136,0.50) 50%, rgba(0,245,255,0.50) 100%)",
          backdropFilter: "blur(22px) saturate(160%)",
          WebkitBackdropFilter: "blur(22px) saturate(160%)",
          boxShadow: "0 10px 32px rgba(0,0,0,0.55)",
        } as any),
      },
      default: {
        shadowColor: "#9B4DFF",
        shadowOpacity: 0.55,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
    }),
  },
  panelInput: {
    minHeight: 40,
    maxHeight: 88,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "500",
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 10,
    borderColor: "rgba(255,255,255,0.15)",
    borderWidth: StyleSheet.hairlineWidth,
  },
  panelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  panelBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.28)",
    borderColor: "rgba(255,255,255,0.22)",
    borderWidth: StyleSheet.hairlineWidth,
  },
  panelBtnActive: {
    backgroundColor: "#00F5FF",
    borderColor: "#00F5FF",
  },
  panelBtnMuted: {
    backgroundColor: "rgba(255,92,122,0.18)",
    borderColor: "rgba(255,92,122,0.6)",
  },
  panelSendBtn: {
    backgroundColor: "#00FF88",
    borderColor: "#00FF88",
  },
  // ── OPSI Part 4 · panel section headers, blockers, chat bubbles ────
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  panelHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  panelHeaderEmoji: {
    fontSize: 14,
  },
  panelHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
    textShadowColor: "rgba(155,77,255,0.55)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  panelHeaderStateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 4,
  },
  panelHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  panelHeaderBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.28)",
    borderColor: "rgba(255,255,255,0.22)",
    borderWidth: StyleSheet.hairlineWidth,
  },
  panelChatEmpty: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: "rgba(155,77,255,0.10)",
    borderColor: "rgba(155,77,255,0.28)",
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  panelChatEmptyText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  panelBlockers: {
    marginBottom: 8,
  },
  panelChat: {
    marginBottom: 8,
  },
  panelChatScroll: {
    maxHeight: 120,
  },
  panelSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  panelSectionEmoji: {
    fontSize: 12,
  },
  panelSectionTitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  panelBlockerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  panelBlockerEmoji: {
    fontSize: 12,
  },
  panelBlockerText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  chatBubble: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 4,
    maxWidth: "88%",
  },
  chatBubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(0,245,255,0.20)",
    borderColor: "rgba(0,245,255,0.35)",
    borderWidth: StyleSheet.hairlineWidth,
  },
  chatBubbleAssistant: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(155,77,255,0.22)",
    borderColor: "rgba(155,77,255,0.40)",
    borderWidth: StyleSheet.hairlineWidth,
  },
  chatBubbleText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "500",
    lineHeight: 15,
  },
  spinRing: {
    position: "absolute",
    width: SIZE + 10,
    height: SIZE + 10,
    borderRadius: (SIZE + 10) / 2,
    borderWidth: 2,
    borderColor: "transparent",
  },
  orb: {
    width: SIZE,
    height: SIZE,
    // Phase C: frost-glass AI aura — perfect circle with an AI gradient
    // fill, translucent border, and layered glow. Native falls back to
    // shadow* while web gets true backdrop-filter blur + saturate.
    borderRadius: SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(24,12,44,0.55)", // fallback tint under gradient
    ...Platform.select({
      web: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({
          backgroundImage:
            "linear-gradient(135deg, rgba(155,77,255,0.35) 0%, rgba(0,255,136,0.25) 55%, rgba(0,245,255,0.30) 100%)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          boxShadow:
            "0 0 20px rgba(155,77,255,0.5), 0 0 40px rgba(0,245,255,0.3)",
          cursor: "pointer",
        } as any),
      },
      default: {
        shadowColor: "#9B4DFF",
        shadowOpacity: 0.55,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 4 },
      },
    }),
  },
});
