/**
 * Ambient background — JARVIS Aura.
 *
 * Two large, out-of-phase colour-cycling orbs that live behind the
 * whole app. Each orb slowly breathes (opacity + scale) AND rotates
 * through a 4-colour palette on a 12-second-per-stop loop.
 *
 * ZERO native modules — pure React Native `Animated`.
 *   • Orb 1 palette: cyan → purple → neon-green → red (loop)
 *   • Orb 2 palette: red → neon-green → purple → cyan (loop, 6s phase offset)
 *
 * A semi-transparent overlay rgba(5,3,15,0.55) sits above the orbs to
 * keep foreground contrast readable. No expo-blur used (pure style).
 */
import { useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, Easing, StyleSheet, View } from "react-native";

// ─── Orb sizing (previous base × 1.7) ──────────────────────────────
// Previous orb 1 was 420, orb 2 was 380 → now 714 and 646.
const ORB1_SIZE = Math.round(420 * 1.7);
const ORB2_SIZE = Math.round(380 * 1.7);
const ORB3_SIZE = ORB1_SIZE; // Fix 3b · same size as Orb 1

// Colour palettes — each colour holds for 12000ms
const ORB1_COLORS = ["#00FFFF", "#8B00FF", "#00FF88", "#FF0033"] as const;
const ORB2_COLORS = ["#FF0033", "#00FF88", "#8B00FF", "#00FFFF"] as const;
// Fix 3b · Orb 3 palette per spec:
//   #00FFFF → #8B00FF → #00FF88 → #FF0033 → #00FFFF (loop)
const ORB3_COLORS = ["#00FFFF", "#8B00FF", "#00FF88", "#FF0033"] as const;
const COLOR_STOP_MS = 12000;

// Slow breathing envelope — 10s loop, opacity 0.5→0.85→0.5, scale 0.92→1.0→0.92
const BREATHE_MS = 10000;

// Orb 2 starts 6000ms later so the two orbs are always out of phase.
const ORB2_DELAY = 6000;
// Fix 3b · Orb 3 starts 4000ms later — third out-of-phase offset.
const ORB3_DELAY = 4000;

type OrbConfig = {
  size: number;
  fromX: number; // fraction of screen width
  toX: number;
  fromY: number;
  toY: number;
  colors: readonly string[];
  delay: number;
};

const ORB1: OrbConfig = {
  size: ORB1_SIZE,
  fromX: -0.25,
  toX: -0.08,
  fromY: -0.05,
  toY: 0.08,
  colors: ORB1_COLORS,
  delay: 0,
};

const ORB2: OrbConfig = {
  size: ORB2_SIZE,
  fromX: 0.55,
  toX: 0.4,
  fromY: 0.6,
  toY: 0.75,
  colors: ORB2_COLORS,
  delay: ORB2_DELAY,
};

// Fix 3b · Third orb — top-right corner (top: '-5%', right: '-10%')
// Translated to fromX/fromY fractions of the screen so the same
// drift-tween logic can reuse it: right:-10% is roughly x = 1.10 − size/W
// where W is screen width. Since size is 714 (fixed), and window widths
// vary, we pin the orb via fromX ~ 0.70 (fixed) with mild drift.
const ORB3: OrbConfig = {
  size: ORB3_SIZE,
  fromX: 0.72,
  toX: 0.65,
  fromY: -0.08,
  toY: 0.02,
  colors: ORB3_COLORS,
  delay: ORB3_DELAY,
};

export function AmbientBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <BreathingOrb {...ORB1} />
      <BreathingOrb {...ORB2} />
      <BreathingOrb {...ORB3} />
      {/* Frosted overlay — sits ABOVE the orbs, BEHIND content */}
      <View style={styles.overlay} pointerEvents="none" />
    </View>
  );
}

function BreathingOrb(orb: OrbConfig) {
  // t drives the slow horizontal drift (mirrors old behaviour)
  const t = useRef(new Animated.Value(0)).current;
  // breathe drives opacity + scale
  const breathe = useRef(new Animated.Value(0)).current;
  // colorIdx tracks which colour we're currently displaying (0..N-1)
  const colorIdx = useRef(0);
  // colorAnim ramps 0→1 as we cross-fade between palette stops
  const colorAnim = useRef(new Animated.Value(0)).current;
  const win = Dimensions.get("window");

  useEffect(() => {
    // Drift (position + slight scale variance) — kept from old orbs
    const drift = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: 12000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: 12000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    );

    // Breathing — 10s loop, opacity 0.5→0.85→0.5, scale 0.92→1.0→0.92
    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: BREATHE_MS / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: BREATHE_MS / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );

    const driftTimer = setTimeout(() => drift.start(), orb.delay);
    const breatheTimer = setTimeout(() => breatheLoop.start(), orb.delay);
    return () => {
      clearTimeout(driftTimer);
      clearTimeout(breatheTimer);
      drift.stop();
      breatheLoop.stop();
    };
  }, [t, breathe, orb.delay]);

  // Manual colour rotation — every COLOR_STOP_MS ms advance idx and
  // ease colorAnim 0→1. We render TWO stacked orbs (current + next)
  // and cross-fade between them for a smooth transition.
  useEffect(() => {
    let alive = true;
    let stopTimer: ReturnType<typeof setTimeout>;
    const step = () => {
      if (!alive) return;
      colorAnim.setValue(0);
      Animated.timing(colorAnim, {
        toValue: 1,
        duration: COLOR_STOP_MS,
        easing: Easing.inOut(Easing.linear),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (!alive || !finished) return;
        colorIdx.current = (colorIdx.current + 1) % orb.colors.length;
        stopTimer = setTimeout(step, 0);
      });
    };
    const initial = setTimeout(step, orb.delay);
    return () => {
      alive = false;
      clearTimeout(initial);
      clearTimeout(stopTimer!);
    };
  }, [colorAnim, orb.colors.length, orb.delay]);

  // Position drift interpolations
  const translateX = t.interpolate({
    inputRange: [0, 1],
    outputRange: [orb.fromX * win.width, orb.toX * win.width],
  });
  const translateY = t.interpolate({
    inputRange: [0, 1],
    outputRange: [orb.fromY * win.height, orb.toY * win.height],
  });

  // Breathing interpolations
  const opacity = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0.85],
  });
  const scale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.0],
  });

  // Layered fake-blur — concentric transparent circles for a soft glow
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

  // Cross-fade current colour → next colour as colorAnim ramps 0→1.
  // We render two stacked orb copies; top one fades in.
  const currentIdx = colorIdx.current;
  const nextIdx = (currentIdx + 1) % orb.colors.length;
  const currentColor = orb.colors[currentIdx];
  const nextColor = orb.colors[nextIdx];
  const currentOp = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const nextOp = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

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
      {/* Current colour orb */}
      <Animated.View
        style={{
          ...StyleSheet.absoluteFillObject,
          opacity: currentOp,
        }}
      >
        {layers.map((l, i) => (
          <View
            key={`c${i}`}
            style={{
              position: "absolute",
              left: (orb.size - l.d) / 2,
              top: (orb.size - l.d) / 2,
              width: l.d,
              height: l.d,
              borderRadius: l.d / 2,
              backgroundColor: currentColor,
              opacity: l.o * 0.25,
            }}
          />
        ))}
      </Animated.View>
      {/* Next colour orb — fades in as we cross-fade */}
      <Animated.View
        style={{
          ...StyleSheet.absoluteFillObject,
          opacity: nextOp,
        }}
      >
        {layers.map((l, i) => (
          <View
            key={`n${i}`}
            style={{
              position: "absolute",
              left: (orb.size - l.d) / 2,
              top: (orb.size - l.d) / 2,
              width: l.d,
              height: l.d,
              borderRadius: l.d / 2,
              backgroundColor: nextColor,
              opacity: l.o * 0.25,
            }}
          />
        ))}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    // Fix 3a · frost glass — sits above the orbs, below content.
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(5,3,15,0.52)",
  },
});
