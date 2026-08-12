/**
 * Ambient background — JARVIS Aura.
 *
 * Three large, softly-glowing orbs (purple, cyan, neon-green) that
 * slowly breathe (scale + opacity + translate) behind the entire app.
 *
 * ZERO native modules — pure React Native `Animated` API + layered
 * transparent circles for a fake-glow effect that reads well against
 * the #07070F background.
 *
 * The orbs run on the JS thread (not `useNativeDriver`) for the
 * simplest possible fallback across every device. The animation is
 * slow (12s cycle) so the JS load is negligible.
 */
import { useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, Easing, StyleSheet, View } from "react-native";

// Orb config — hue, base opacity, size, initial pos as fraction of
// screen dimensions.
type Orb = {
  color: string;
  size: number;
  opacityFrom: number;
  opacityTo: number;
  fromX: number; // fraction 0..1 of screen width
  toX: number;
  fromY: number;
  toY: number;
  duration: number; // ms
  delay: number;
};

const ORBS: Orb[] = [
  {
    color: "#7A3BFF", // purple
    size: 420,
    opacityFrom: 0.18,
    opacityTo: 0.32,
    fromX: -0.25,
    toX: -0.08,
    fromY: -0.05,
    toY: 0.08,
    duration: 12000,
    delay: 0,
  },
  {
    color: "#00E0FF", // cyan
    size: 380,
    opacityFrom: 0.15,
    opacityTo: 0.28,
    fromX: 0.55,
    toX: 0.4,
    fromY: 0.6,
    toY: 0.75,
    duration: 14000,
    delay: 2000,
  },
  {
    color: "#00FF88", // neon green (brand)
    size: 340,
    opacityFrom: 0.10,
    opacityTo: 0.22,
    fromX: 0.2,
    toX: 0.35,
    fromY: 0.28,
    toY: 0.18,
    duration: 16000,
    delay: 4000,
  },
];

export function AmbientBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {ORBS.map((orb, i) => (
        <BreathingOrb key={i} {...orb} />
      ))}
      {/* Soft vignette overlay so orbs don't overpower the app */}
      <View style={styles.vignette} pointerEvents="none" />
    </View>
  );
}

function BreathingOrb(orb: Orb) {
  const t = useRef(new Animated.Value(0)).current;
  const win = Dimensions.get("window");

  useEffect(() => {
    // Kick off a ping-pong loop after the initial delay.
    const seq = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: orb.duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: orb.duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    );
    const timer = setTimeout(() => seq.start(), orb.delay);
    return () => {
      clearTimeout(timer);
      seq.stop();
    };
  }, [t, orb.duration, orb.delay]);

  // Interpolations
  const opacity = t.interpolate({
    inputRange: [0, 1],
    outputRange: [orb.opacityFrom, orb.opacityTo],
  });
  const translateX = t.interpolate({
    inputRange: [0, 1],
    outputRange: [orb.fromX * win.width, orb.toX * win.width],
  });
  const translateY = t.interpolate({
    inputRange: [0, 1],
    outputRange: [orb.fromY * win.height, orb.toY * win.height],
  });
  const scale = t.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.05],
  });

  // Layered "fake blur": we stack multiple concentric transparent
  // circles with decreasing opacity + increasing size. This reads
  // convincingly as a soft-glow orb without needing expo-blur.
  const layers = useMemo(() => {
    const arr: { d: number; o: number }[] = [];
    for (let i = 0; i < 5; i++) {
      arr.push({
        d: orb.size * (1 - i * 0.14),
        o: 1 - i * 0.16,
      });
    }
    return arr;
  }, [orb.size]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: orb.size,
        height: orb.size,
        opacity,
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    >
      {layers.map((l, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: (orb.size - l.d) / 2,
            top: (orb.size - l.d) / 2,
            width: l.d,
            height: l.d,
            borderRadius: l.d / 2,
            backgroundColor: orb.color,
            opacity: l.o * 0.25,
          }}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7,7,15,0.35)", // slight over-tint to keep contrast
  },
});
