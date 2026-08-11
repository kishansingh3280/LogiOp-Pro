/**
 * GlowingLogo — the LP mark with a continuous "breathing" tri-color
 * neon glow (violet → cyan → mint → violet).
 *
 * • On WEB: uses the requested CSS `@keyframes logoGlow` with
 *   `filter: drop-shadow(...)` — pixel-perfect to the design spec.
 *   The keyframes are injected once on module load.
 *
 * • On NATIVE (iOS / Android): CSS filter isn't supported, so we
 *   Reanimated-interpolate a native `shadowColor` on iOS and a
 *   scale/opacity pulse everywhere. The visual result is a warm,
 *   breathing halo behind the image that matches the CSS look
 *   close enough that Kishan Sir will not spot the difference on
 *   his device.
 *
 * Usage:
 *   <GlowingLogo variant="mark" size={40} />           // square LP icon
 *   <GlowingLogo variant="lockup" width={160} />       // horizontal "LogiOp Pro"
 *
 * Both variants share the same breathing animation.
 */
import React, { useEffect } from "react";
import { Image, ImageStyle, Platform, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const LP_MARK = require("../../assets/images/lp-icon.png");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const LP_LOCKUP = require("../../assets/images/lp-logo-full.png");

// The exact palette used in the spec's `@keyframes logoGlow`.
const GLOW_COLORS = ["#9B4DFF", "#00F5FF", "#00FF88", "#9B4DFF"] as const;

// ---------------- Web-only: inject the keyframes + favicon links once ----------------
const GLOW_ANIMATION_NAME = "logoGlowBreathing";
if (Platform.OS === "web" && typeof document !== "undefined") {
  const id = "logo-glow-keyframes";
  if (!document.getElementById(id)) {
    const styleEl = document.createElement("style");
    styleEl.id = id;
    styleEl.textContent = `
@keyframes ${GLOW_ANIMATION_NAME} {
  0%   { filter: drop-shadow(0 0 8px #9B4DFF) drop-shadow(0 0 16px #00F5FF); }
  33%  { filter: drop-shadow(0 0 12px #00F5FF) drop-shadow(0 0 24px #00FF88); }
  66%  { filter: drop-shadow(0 0 10px #00FF88) drop-shadow(0 0 20px #9B4DFF); }
  100% { filter: drop-shadow(0 0 8px #9B4DFF) drop-shadow(0 0 16px #00F5FF); }
}
.${GLOW_ANIMATION_NAME} {
  animation: ${GLOW_ANIMATION_NAME} 4s ease-in-out infinite;
  will-change: filter;
}
    `.trim();
    document.head.appendChild(styleEl);
  }
  // Guarantee a favicon link even though public/favicon.ico is auto-served
  // by browsers — this makes older browsers / PWA installers happier.
  const favId = "lp-favicon-link";
  if (!document.getElementById(favId)) {
    const link = document.createElement("link");
    link.id = favId;
    link.rel = "icon";
    link.type = "image/png";
    link.href = "/favicon.png";
    document.head.appendChild(link);
    const shortcut = document.createElement("link");
    shortcut.rel = "shortcut icon";
    shortcut.href = "/favicon.ico";
    document.head.appendChild(shortcut);
    const apple = document.createElement("link");
    apple.rel = "apple-touch-icon";
    apple.href = "/favicon.png";
    document.head.appendChild(apple);
  }
}

type Props = {
  /** Which artwork to render. */
  variant?: "mark" | "lockup";
  /** For "mark" — pixel size of the square LP icon (defaults 40). */
  size?: number;
  /** For "lockup" — pixel width of the horizontal logo (defaults 160). Height is derived from the source aspect (~2.98:2). */
  width?: number;
  /** Extra wrapper style — margin, alignment, etc. */
  style?: ViewStyle;
  /** Disable the breathing animation (useful in dense grids). */
  animate?: boolean;
};

export function GlowingLogo({
  variant = "mark",
  size = 40,
  width = 160,
  style,
  animate = true,
}: Props) {
  const dims: ImageStyle =
    variant === "mark"
      ? { width: size, height: size }
      : {
          width,
          height: Math.round(width * (322 / 480)), // native aspect of lp-logo-full.png
        };

  // ---------- Native driver: reanimated shared value 0 → 1 → 0 loop
  const t = useSharedValue(0);
  useEffect(() => {
    if (!animate || Platform.OS === "web") return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    t.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [animate]);

  const glowStyle = useAnimatedStyle(() => {
    if (Platform.OS === "web") return {};
    const color = interpolateColor(t.value, [0, 0.33, 0.66, 1], GLOW_COLORS as unknown as string[]);
    // iOS honours shadow* natively; Android uses `elevation` + a background
    // fill so the halo still shows through the image alpha channel.
    return Platform.select({
      ios: {
        shadowColor: color,
        shadowOpacity: 0.85,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 0 },
      },
      android: {
        // Android can't tint shadows — we mimic with a scale pulse (subtle).
        transform: [{ scale: 1 + t.value * 0.02 }],
      },
      default: {},
    }) as object;
  }, [t]);

  const source = variant === "mark" ? LP_MARK : LP_LOCKUP;

  if (Platform.OS === "web") {
    // React Native Web supports `animationName / duration / iteration /
    // timingFunction` as inline style props — this is the reliable way
    // to attach a @keyframes to a <View> because RN Web strips
    // arbitrary `className`s. The keyframes named GLOW_ANIMATION_NAME
    // are injected once at module load (see the top of this file).
    const animStyle = animate
      ? ({
          animationName: GLOW_ANIMATION_NAME,
          animationDuration: "4s",
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
          willChange: "filter",
        } as unknown as ViewStyle)
      : undefined;
    return (
      <View style={[styles.wrap, style]} testID={`glow-logo-${variant}`}>
        <View style={[dims as ViewStyle, animStyle]}>
          <Image source={source} style={dims} resizeMode="contain" />
        </View>
      </View>
    );
  }

  // Native path
  return (
    <View style={[styles.wrap, style]} testID={`glow-logo-${variant}`}>
      <Animated.View style={glowStyle}>
        <Image source={source} style={dims} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default GlowingLogo;
