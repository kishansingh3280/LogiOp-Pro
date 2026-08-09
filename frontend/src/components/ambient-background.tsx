/**
 * AmbientBackground — JARVIS Aura backdrop.
 *
 * Layer order (bottom → top, all pointerEvents="none"):
 *   1. #07070f deep base (from theme colors.bg)
 *   2. Four slow-moving colour orbs (purple / gold / cyan / green),
 *      opacity 0.18–0.22, 30–40 s drift cycle
 *   3. 35 gold particles floating upward with a sine-wave sway
 *   4. 50 % black glass overlay: rgba(3,2,10,0.50) + blur(40px)
 *
 * Sits at the root of the app so ambient colour bleeds through every
 * glass surface without touching a single layout constant.
 */
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo } from "react";
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

// ---------------------------------------------------------------------------
// Colour orbs — purple / gold / cyan / green.
// ---------------------------------------------------------------------------
type Orb = {
  size: number;
  colors: string[];
  x0: number;
  y0: number;
  dx: number;
  dy: number;
  period: number;   // 30–40 s per JARVIS Aura spec
  opacity: number;  // 0.18–0.22 per JARVIS Aura spec
};

// Per JARVIS Aura spec — target visible peak alphas:
//   purple rgba(155,77,255,0.22), gold rgba(255,215,0,0.18),
//   cyan rgba(0,245,255,0.16), green rgba(0,255,136,0.14).
// The gradient inner alpha is kept high (0.8–1.0) so it survives the 50%
// black glass scrim overhead; the `opacity` prop then scales the entire
// orb to the spec's target peak alpha.
const ORBS: Orb[] = [
  {
    // Purple — top-left drift
    size: Math.max(SW, SH) * 0.95,
    colors: ["rgba(155, 77, 255, 1.0)", "rgba(155, 77, 255, 0.0)"],
    x0: -0.35,
    y0: -0.25,
    dx: 0.15,
    dy: 0.12,
    period: 32000,
    opacity: 0.28,
  },
  {
    // Gold — mid-right drift
    size: Math.max(SW, SH) * 1.0,
    colors: ["rgba(255, 215, 0, 1.0)", "rgba(255, 215, 0, 0.0)"],
    x0: 0.55,
    y0: 0.25,
    dx: -0.18,
    dy: 0.10,
    period: 36000,
    opacity: 0.23,
  },
  {
    // Cyan — bottom-left drift
    size: Math.max(SW, SH) * 0.85,
    colors: ["rgba(0, 245, 255, 1.0)", "rgba(0, 245, 255, 0.0)"],
    x0: -0.15,
    y0: 0.65,
    dx: 0.22,
    dy: -0.14,
    period: 30000,
    opacity: 0.20,
  },
  {
    // Neon green — top-right accent
    size: Math.max(SW, SH) * 0.75,
    colors: ["rgba(0, 255, 136, 1.0)", "rgba(0, 255, 136, 0.0)"],
    x0: 0.45,
    y0: -0.15,
    dx: -0.10,
    dy: 0.18,
    period: 38000,
    opacity: 0.18,
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

// ---------------------------------------------------------------------------
// Gold particles — 35 sprites drifting upward with a sine-wave sway.
// Each particle uses one shared value driving vertical rise; the horizontal
// sway is derived from the same value via sin() inside the worklet so we
// avoid a second animation loop per particle.
// ---------------------------------------------------------------------------
const PARTICLE_COUNT = 35;
const GOLD_TONES = ["#FFD700", "#FFC300", "#FFE566", "#FFAA00"] as const;

type Particle = {
  size: number;
  tone: string;
  startX: number;     // 0..1 fraction of screen width
  sway: number;       // horizontal sway amplitude (px)
  swayFreq: number;   // cycles per rise
  period: number;     // ms per full rise
  delay: number;      // ms initial offset
  opacity: number;    // 0.5..0.85
};

function buildParticles(): Particle[] {
  // Deterministic pseudo-random so React Native reconciler doesn't churn
  // on re-render. Uses a small LCG seeded from the index.
  const rnd = (i: number, salt: number) => {
    const x = Math.sin(i * 928.371 + salt * 173.19) * 43758.5453;
    return x - Math.floor(x);
  };
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    size: 3.5 + rnd(i, 1) * 4.5,                    // 3.5–8 px (bigger = more visible)
    tone: GOLD_TONES[i % GOLD_TONES.length],
    startX: rnd(i, 2),
    sway: 18 + rnd(i, 3) * 42,                      // 18–60 px sway
    swayFreq: 1 + Math.floor(rnd(i, 4) * 3),        // 1–3 cycles per rise
    period: 14000 + rnd(i, 5) * 12000,              // 14–26 s per rise
    delay: rnd(i, 6) * 15000,                       // stagger start
    opacity: Math.min(1, (0.6 + rnd(i, 7) * 0.25) * 1.3), // 0.6–0.85 × 1.3 = 0.78–1.0 (spec +30%)
  }));
}

function ParticleView({ p }: { p: Particle }) {
  const t = useSharedValue(0);
  useEffect(() => {
    // Start slightly after mount by feeding the initial value.
    t.value = (p.delay % p.period) / p.period;
    t.value = withRepeat(
      withTiming(1, { duration: p.period, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => {
    // Rise from below the screen to above it.
    const y = SH + p.size * 2 - t.value * (SH + p.size * 4);
    const swayX = Math.sin(t.value * Math.PI * 2 * p.swayFreq) * p.sway;
    const baseX = p.startX * SW - p.size / 2;
    // Fade in at the bottom, hold, fade out at the top for a smooth loop.
    let opacity = p.opacity;
    if (t.value < 0.1) opacity = p.opacity * (t.value / 0.1);
    else if (t.value > 0.9) opacity = p.opacity * ((1 - t.value) / 0.1);
    return {
      transform: [{ translateX: baseX + swayX }, { translateY: y }],
      opacity,
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          width: p.size,
          height: p.size,
          borderRadius: p.size / 2,
          backgroundColor: p.tone,
          // Native glow via shadow; web glow via CSS boxShadow.
          ...(Platform.OS === "web"
            ? ({ boxShadow: `0 0 ${p.size * 3}px ${p.tone}, 0 0 ${p.size * 6}px ${p.tone}` } as unknown as object)
            : {
                shadowColor: p.tone,
                shadowOpacity: 1,
                shadowRadius: p.size * 2.5,
                shadowOffset: { width: 0, height: 0 },
              }),
        },
        style,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Composite background
// ---------------------------------------------------------------------------
export function AmbientBackground() {
  const particles = useMemo(() => buildParticles(), []);
  return (
    <View pointerEvents="none" style={styles.wrap}>
      {/* Layer 2 — colour orbs */}
      {ORBS.map((orb, i) => (
        <OrbView key={`orb-${i}`} orb={orb} />
      ))}

      {/* Layer 3 — 35 upward-drifting gold particles */}
      {particles.map((p, i) => (
        <ParticleView key={`p-${i}`} p={p} />
      ))}

      {/* NOTE: the previous internal black scrim has been moved to a
          GLOBAL fixed overlay in app/_layout.tsx (per JARVIS Aura spec
          v2 — black-tinted blur glass layer above orbs/particles, below
          content). Keeping only a very light top-to-bottom vignette here
          so the top of the viewport recedes gracefully. */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(7,7,15,0.06)", "rgba(7,7,15,0.02)", "rgba(7,7,15,0.20)"]}
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
    backgroundColor: colors.bg, // #07070f base — layer 1
  },
});
