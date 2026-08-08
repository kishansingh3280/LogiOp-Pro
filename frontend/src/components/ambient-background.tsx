/**
 * AmbientBackground — three softly-glowing orbs drifting behind everything.
 *
 * Sits at the root of the app, `pointerEvents="none"`, and uses radial
 * gradients (SVG on native + CSS on web) to bloom the Purple / Blue / Lime
 * palette against a `#050505` base. Each orb runs its own long-period
 * Reanimated worklet loop so the animation is 120fps on the UI thread.
 *
 * This component is deliberately expensive-looking but cheap: only 3 View
 * layers + gradient fill. It's the single biggest visual lift of the
 * "Siri 2.0" theme.
 */
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { Dimensions, Platform, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/src/theme";

const { width: SW, height: SH } = Dimensions.get("window");

type Orb = {
  size: number;
  colors: string[];
  // Start position (fraction of screen).
  x0: number;
  y0: number;
  // How far it drifts.
  dx: number;
  dy: number;
  // Cycle length (ms).
  period: number;
  opacity: number;
};

const ORBS: Orb[] = [
  {
    // Deep purple — top-left drift (subtle)
    size: Math.max(SW, SH) * 0.9,
    colors: ["rgba(124, 58, 237, 0.35)", "rgba(124, 58, 237, 0.0)"],
    x0: -0.35,
    y0: -0.25,
    dx: 0.15,
    dy: 0.12,
    period: 22000,
    opacity: 0.45,
  },
  {
    // Ocean blue — mid-right drift
    size: Math.max(SW, SH) * 0.95,
    colors: ["rgba(37, 99, 235, 0.30)", "rgba(37, 99, 235, 0.0)"],
    x0: 0.55,
    y0: 0.25,
    dx: -0.18,
    dy: 0.10,
    period: 27000,
    opacity: 0.4,
  },
  {
    // Lime — bottom-left drift (matches CTA colour)
    size: Math.max(SW, SH) * 0.75,
    colors: ["rgba(163, 230, 53, 0.22)", "rgba(198, 255, 0, 0.0)"],
    x0: -0.15,
    y0: 0.65,
    dx: 0.22,
    dy: -0.14,
    period: 32000,
    opacity: 0.35,
  },
];

function OrbView({ orb }: { orb: Orb }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: orb.period, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => cancelAnimation(t);
  }, [orb.period, t]);

  const style = useAnimatedStyle(() => {
    const x = (orb.x0 + orb.dx * t.value) * SW;
    const y = (orb.y0 + orb.dy * t.value) * SH;
    const scale = 0.95 + 0.1 * t.value;
    return {
      transform: [{ translateX: x }, { translateY: y }, { scale }],
      opacity: orb.opacity,
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          width: orb.size,
          height: orb.size,
          borderRadius: orb.size / 2,
          // Web: use CSS blur filter to soften the gradient edge for a
          // dreamier bloom. Native uses the gradient's alpha ramp.
          ...(Platform.OS === "web" ? ({ filter: "blur(60px)" } as unknown as object) : {}),
        },
        style,
      ]}
    >
      <LinearGradient
        colors={orb.colors as unknown as [string, string]}
        style={{ flex: 1, borderRadius: orb.size / 2 }}
        start={{ x: 0.4, y: 0.4 }}
        end={{ x: 1, y: 1 }}
      />
    </Animated.View>
  );
}

export function AmbientBackground() {
  return (
    <View pointerEvents="none" style={styles.wrap}>
      {ORBS.map((orb, i) => (
        <OrbView key={i} orb={orb} />
      ))}
      {/* Full-screen vignette that darkens the entire canvas so content
          on top reads clearly. Applied AFTER the orbs so they bloom
          through a semi-opaque black scrim. */}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(5,5,5,0.68)" }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(5,5,5,0.10)", "rgba(5,5,5,0.05)", "rgba(5,5,5,0.35)"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0.0 }}
        end={{ x: 0.5, y: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    backgroundColor: colors.bg, // ensures near-black base under the orbs
  },
});
