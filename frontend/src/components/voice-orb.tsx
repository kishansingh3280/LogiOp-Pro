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
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/src/auth/context";
import { useVoiceOrb } from "@/src/context/voice-orb-context";

const SIZE = 60;

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
    <View
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style={[
        styles.wrapper,
        {
          bottom: Math.max(24, insets.bottom + 16),
          right: 16,
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
      <View style={styles.orbWrap}>
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
        {/* Solid orb */}
        <Pressable
          onPress={() => orb.toggle()}
          style={({ pressed }) => [
            styles.orb,
            {
              backgroundColor: stateColor,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          testID="voice-orb"
          accessibilityLabel="Toggle Wingman voice assistant"
        >
          <Ionicons name={icon} size={26} color="#0A0A14" />
        </Pressable>
      </View>
    </View>
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
