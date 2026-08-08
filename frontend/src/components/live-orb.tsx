/**
 * LiveOrb — the "life in a body" pulsing waveform that sits at the centre of
 * the Assistant screen. Three overlapping SVG blobs drift and pulse in
 * different colours (Gemini-esque cyan / magenta / lime), driven by an
 * amplitude value from 0..1 supplied by the parent (mic level while
 * listening, TTS envelope while speaking, and a slow idle breath otherwise).
 *
 * Uses react-native-reanimated (worklets) for 120fps updates without touching
 * the JS thread on every frame.
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
  amplitude?: number;   // 0..1
  mode?: LiveOrbMode;
}) {
  // A single shared value driven either by the amplitude prop (loud voice ->
  // bigger orb) OR by an internal "breath" loop while idle. Using
  // withRepeat means the animation lives on the UI thread.
  const level = useSharedValue(0.15);
  const rotation = useSharedValue(0);
  const modeShift = useSharedValue(0);

  // Update the shared value on every amplitude change. When the mode is
  // idle we start a slow breath cycle; otherwise the amplitude drives it.
  useEffect(() => {
    if (mode === "idle") {
      cancelAnimation(level);
      level.value = withRepeat(
        withTiming(0.35, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    } else if (mode === "thinking") {
      cancelAnimation(level);
      level.value = withRepeat(
        withTiming(0.55, { duration: 480, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    } else {
      // Listening / speaking — smooth towards the incoming amplitude so
      // the orb doesn't twitch on every mic sample.
      const target = Math.max(0.2, Math.min(1, amplitude));
      level.value = withTiming(target, { duration: 120, easing: Easing.out(Easing.quad) });
    }
  }, [amplitude, mode, level]);

  // Continuous slow rotation for the outer gradient ring.
  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 14000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(rotation);
  }, [rotation]);

  // Colour shift for mode changes (idle→listening→speaking).
  useEffect(() => {
    const target = mode === "listening" ? 0 : mode === "speaking" ? 1 : mode === "thinking" ? 0.5 : 0.25;
    modeShift.value = withTiming(target, { duration: 600 });
  }, [mode, modeShift]);

  const radius = size / 2;

  // Outer breathing shell — big soft glow.
  const outerStyle = useAnimatedStyle(() => {
    const scale = 0.95 + level.value * 0.25;
    return {
      transform: [{ scale }, { rotate: `${rotation.value}deg` }],
      opacity: 0.75 + level.value * 0.2,
    };
  });

  // Inner core — reacts more aggressively.
  const innerStyle = useAnimatedStyle(() => {
    const scale = 0.85 + level.value * 0.35;
    return { transform: [{ scale }] };
  });

  // Middle ring — counter-rotates for depth.
  const midStyle = useAnimatedStyle(() => {
    const scale = 0.9 + level.value * 0.28;
    return {
      transform: [{ scale }, { rotate: `${-rotation.value * 0.7}deg` }],
      opacity: 0.6 + level.value * 0.3,
    };
  });

  const innerCircleProps = useAnimatedProps(() => {
    return { r: (radius * 0.42) * (0.85 + level.value * 0.35) };
  });

  return (
    <View style={[styles.wrap, { width: size, height: size }]} pointerEvents="none">
      {/* Outer soft ring — cyan/magenta drift */}
      <Animated.View style={[StyleSheet.absoluteFill, outerStyle]}>
        <LinearGradient
          colors={["#7DF9FF", "#FF3EA5", "#C6FF00", "#7DF9FF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.blob, { width: size, height: size, borderRadius: radius }]}
        />
      </Animated.View>

      {/* Middle counter-rotating ring — orange/lime */}
      <Animated.View style={[StyleSheet.absoluteFill, midStyle, { padding: size * 0.1 }]}>
        <LinearGradient
          colors={["#FFB020", "#C6FF00", "#00E5FF"]}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, borderRadius: size, opacity: 0.85 }}
        />
      </Animated.View>

      {/* Inner core — SVG radial gradient */}
      <Animated.View style={[StyleSheet.absoluteFill, innerStyle, { alignItems: "center", justifyContent: "center" }]}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="core" cx="50%" cy="50%" rx="50%" ry="50%" fx="45%" fy="45%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <Stop offset="40%" stopColor={colors.lime} stopOpacity="0.85" />
              <Stop offset="80%" stopColor="#FF3EA5" stopOpacity="0.55" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <AnimatedCircle cx={radius} cy={radius} animatedProps={innerCircleProps} fill="url(#core)" />
        </Svg>
      </Animated.View>

      {/* Bright pinpoint highlight (fixed, small) to give the orb "life" */}
      <View
        style={[
          styles.highlight,
          {
            top: size * 0.30,
            left: size * 0.34,
            width: size * 0.10,
            height: size * 0.06,
            borderRadius: size * 0.05,
            // Web fallback: RN's `filter: blur()` is not supported cross-platform.
            ...(Platform.OS === "web" ? ({ filter: "blur(6px)" } as any) : {}),
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
    opacity: 0.8,
  },
  highlight: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.65)",
  },
});
