/**
 * VoiceOrb — floating Wingman voice orb, rendered on every screen.
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
import { usePathname } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, Easing, Keyboard, PanResponder, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/src/auth/context";
import { useVoiceOrb } from "@/src/context/voice-orb-context";

const SIZE = 60;

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

export function VoiceOrb() {
  const orb = useVoiceOrb();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const pathname = usePathname();
  // NOTE: All hooks below must be called on every render — do NOT put
  // an early `return null` before them, or React will throw
  // "Rendered more hooks than during the previous render" the moment
  // the user logs in (hidden flips false→true).

  // Breathing glow — scale + opacity oscillation. Tuned per state.
  const breathe = useRef(new Animated.Value(0.6)).current;
  const spin = useRef(new Animated.Value(0)).current;

  // Long-press text panel state — mini glass panel that pops above the
  // orb with a text input + send button (voice-only fallback).
  const [panelOpen, setPanelOpen] = useState(false);
  const [text, setText] = useState("");

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
  // positioning style values.
  const anchorStyle = useMemo(() => {
    const off = 16;
    const bottomBase = Math.max(24, insets.bottom + 16) + kbHeight;
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
  }, [corner, insets.top, insets.bottom, kbHeight]);

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
      {/* Long-press mini glass panel — bundles ALL orb controls in one
          compact card so the operator can type, toggle mute, or start/
          stop listening without needing separate UI surfaces. */}
      {panelOpen ? (
        <View style={styles.panel} testID="voice-orb-panel">
          {/* Row 1 — text input full width */}
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Wingman ko batao…"
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
        </View>
      ) : null}

      <View style={styles.orbWrap}>
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
          accessibilityLabel="Toggle Wingman voice assistant"
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
    width: 80,
    height: 80,
    borderRadius: 40,
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
    borderRadius: SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    ...Platform.select({
      web: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ boxShadow: "0 0 24px rgba(155,77,255,0.55)", cursor: "pointer" } as any),
      },
      default: {
        shadowColor: "#9B4DFF",
        shadowOpacity: 0.55,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
      },
    }),
  },
});
