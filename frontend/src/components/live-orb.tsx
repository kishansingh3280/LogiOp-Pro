/**
 * LiveOrb v2 — a Siri-style nebula sphere.
 *
 * Five overlapping SVG blobs drift and pulse in different colours (Deep
 * Purple, Ocean Blue, Cyan, Lime, Magenta accent) driven by an amplitude
 * value from 0..1 supplied by the parent. The core is a soft radial white
 * highlight so the sphere reads as luminous rather than flat.
 *
 * All animation happens on the UI thread via react-native-reanimated so
 * we hit the 120fps target even during voice metering.
 */
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { colors } from "@/src/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type LiveOrbMode = "idle" | "listening" | "speaking" | "thinking";

export function LiveOrb({
  size = 300,
  amplitude = 0,
  mode = "idle",
}: {
  size?: number;
  amplitude?: number;
  mode?: LiveOrbMode;
}) {
  // Amplitude — either driven by parent (voice) or a mode-based breath loop.
  const level = useSharedValue(0.2);
  const rotA = useSharedValue(0);   // outer ring rotation
  const rotB = useSharedValue(0);   // inner ring counter-rotation
  const hueDrift = useSharedValue(0); // hue shifting

  // Level animator — voice OR breath.
  useEffect(() => {
    cancelAnimation(level);
    if (mode === "idle") {
      level.value = withRepeat(
        withTiming(0.35, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    } else if (mode === "thinking") {
      level.value = withRepeat(
        withTiming(0.6, { duration: 460, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    } else {
      const target = Math.max(0.22, Math.min(1, amplitude));
      level.value = withTiming(target, { duration: 100, easing: Easing.out(Easing.quad) });
    }
  }, [amplitude, mode, level]);

  // Slow rotations — never cancel these so the nebula always feels alive.
  useEffect(() => {
    rotA.value = withRepeat(
      withTiming(360, { duration: 22000, easing: Easing.linear }),
      -1,
      false,
    );
    rotB.value = withRepeat(
      withTiming(-360, { duration: 30000, easing: Easing.linear }),
      -1,
      false,
    );
    hueDrift.value = withRepeat(
      withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(rotA);
      cancelAnimation(rotB);
      cancelAnimation(hueDrift);
    };
  }, [rotA, rotB, hueDrift]);

  const R = size / 2;

  // Outer nebula halo — purple↔blue drift, slowly rotates
  const layerA = useAnimatedStyle(() => ({
    transform: [
      { scale: 0.92 + level.value * 0.24 },
      { rotate: `${rotA.value}deg` },
    ],
    opacity: 0.65 + level.value * 0.25,
  }));

  // Middle ring — cyan↔lime drift, counter-rotates
  const layerB = useAnimatedStyle(() => ({
    transform: [
      { scale: 0.86 + level.value * 0.30 },
      { rotate: `${rotB.value}deg` },
    ],
    opacity: 0.55 + level.value * 0.30,
  }));

  // Inner ring — pink/magenta accent, drifts slowly
  const layerC = useAnimatedStyle(() => ({
    transform: [{ scale: 0.75 + level.value * 0.35 }],
    opacity: 0.5 + level.value * 0.4,
  }));

  // Core white radial highlight — pulses hardest with voice
  const coreProps = useAnimatedProps(() => ({
    r: R * (0.28 + level.value * 0.28),
  }));

  const coreStyle = useAnimatedStyle(() => ({
    opacity: 0.85 + level.value * 0.15,
  }));

  return (
    <View style={[styles.wrap, { width: size, height: size }]} pointerEvents="none">
      {/* Outer nebula — purple / blue */}
      <Animated.View style={[StyleSheet.absoluteFill, layerA]}>
        <LinearGradient
          colors={["rgba(159,122,234,0.85)", "rgba(59,130,246,0.65)", "rgba(159,122,234,0.0)"]}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.9, y: 0.9 }}
          style={[styles.blob, { width: size, height: size, borderRadius: R }]}
        />
      </Animated.View>

      {/* Middle ring — cyan / lime */}
      <Animated.View style={[StyleSheet.absoluteFill, layerB, { padding: size * 0.09 }]}>
        <LinearGradient
          colors={["rgba(34,211,238,0.75)", "rgba(198,255,0,0.55)", "rgba(34,211,238,0.0)"]}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, borderRadius: size }}
        />
      </Animated.View>

      {/* Inner ring — magenta accent */}
      <Animated.View style={[StyleSheet.absoluteFill, layerC, { padding: size * 0.20 }]}>
        <LinearGradient
          colors={["rgba(236,72,153,0.60)", "rgba(198,255,0,0.20)", "rgba(236,72,153,0.0)"]}
          start={{ x: 0.4, y: 0 }}
          end={{ x: 0.6, y: 1 }}
          style={{ flex: 1, borderRadius: size }}
        />
      </Animated.View>

      {/* Core — bright white radial that pulses with voice */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          coreStyle,
          { alignItems: "center", justifyContent: "center" },
        ]}
      >
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="core" cx="50%" cy="45%" rx="50%" ry="50%" fx="45%" fy="40%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <Stop offset="30%" stopColor={colors.lime} stopOpacity="0.8" />
              <Stop offset="70%" stopColor={colors.purple} stopOpacity="0.35" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <AnimatedCircle cx={R} cy={R} animatedProps={coreProps} fill="url(#core)" />
        </Svg>
      </Animated.View>

      {/* Specular highlight — fixed bright dot for "life in body" feel */}
      <View
        style={[
          styles.spec,
          {
            top: size * 0.26,
            left: size * 0.30,
            width: size * 0.14,
            height: size * 0.07,
            borderRadius: size * 0.06,
            ...(Platform.OS === "web" ? ({ filter: "blur(8px)" } as unknown as object) : {}),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  blob: {
    opacity: 0.85,
  },
  spec: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.55)",
  },
});
