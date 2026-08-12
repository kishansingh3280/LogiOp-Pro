/**
 * Reusable UI primitives for the JARVIS Aura look.
 *
 * • GlassCard  — frosted holographic surface with subtle neon border
 *                and a slow "breathing" glow animation
 * • Pill       — coloured status chip
 * • Divider    — hairline separator
 * • LabelValueRow — label / value line used across list screens
 *
 * The "blur" appearance is approximated with rgba() surface + hairline
 * neon border + shadow (no `expo-blur` native module needed).
 *
 * The breathing glow uses only `Animated` from `react-native` core.
 */
import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View, ViewStyle, StyleProp, TextStyle } from "react-native";

import { colors, radii, spacing } from "./theme";

/**
 * Slow, subtle breathing glow. Cycles borderColor opacity and
 * shadowOpacity between low and high values so the card feels alive
 * without being distracting.
 */
function useBreathingGlow(enabled: boolean, offsetMs = 0) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!enabled) return;
    const seq = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: 3400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: 3400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    );
    const timer = setTimeout(() => seq.start(), offsetMs);
    return () => {
      clearTimeout(timer);
      seq.stop();
    };
  }, [enabled, t, offsetMs]);
  return t;
}

export function GlassCard({
  children,
  style,
  padded = true,
  glow = false,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  glow?: boolean;
}) {
  // Every card breathes; `glow` cards breathe harder.
  const t = useBreathingGlow(true);

  const borderOpacity = t.interpolate({
    inputRange: [0, 1],
    outputRange: glow ? [0.32, 0.7] : [0.12, 0.24],
  });
  const shadowOpacity = t.interpolate({
    inputRange: [0, 1],
    outputRange: glow ? [0.18, 0.45] : [0.05, 0.18],
  });

  // Animated color needs to use `interpolate` on RGBA — but React
  // Native can only animate colors when both endpoints are strings.
  // We emulate opacity variation by animating a plain overlay rgba
  // border with a separate Animated.View underlay for the glow.
  return (
    <View style={[styles.glassWrap, style]}>
      {/* Animated glow ring — sits behind and slightly larger than
          the card. Cheap, GPU-friendly. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glassGlowRing,
          {
            opacity: shadowOpacity,
            shadowOpacity: shadowOpacity as unknown as number,
            borderColor: colors.brand,
          },
        ]}
      />
      {/* Actual card surface */}
      <View style={[styles.glass, padded && styles.padded]}>
        {/* Animated border tint layered on top of the surface */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glassBorder,
            {
              opacity: borderOpacity,
            },
          ]}
        />
        {children}
      </View>
    </View>
  );
}

export function Pill({
  label,
  tint = colors.brand,
  soft = colors.brandSoft,
  size = "md",
}: {
  label: string;
  tint?: string;
  soft?: string;
  size?: "sm" | "md";
}) {
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: soft, borderColor: tint },
        size === "sm" && styles.pillSm,
      ]}
    >
      <Text
        style={[
          styles.pillText,
          { color: tint },
          size === "sm" && styles.pillTextSm,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

export function LabelValueRow({
  label,
  value,
  valueStyle,
  valueColor,
}: {
  label: string;
  value: string | number | null | undefined;
  valueStyle?: StyleProp<TextStyle>;
  valueColor?: string;
}) {
  return (
    <View style={styles.lvRow}>
      <Text style={styles.lvLabel}>{label}</Text>
      <Text
        style={[
          styles.lvValue,
          valueColor ? { color: valueColor } : null,
          valueStyle,
        ]}
        numberOfLines={1}
      >
        {value === null || value === undefined || value === "" ? "—" : String(value)}
      </Text>
    </View>
  );
}

// Suppress unused-var lint for `useMemo` (kept as an import for
// potential future memoisation).
void useMemo;

const styles = StyleSheet.create({
  glassWrap: {
    position: "relative",
    borderRadius: radii.lg,
  },
  glass: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radii.lg,
    overflow: "hidden",
  },
  padded: { padding: spacing.md },
  glassBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  glassGlowRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.lg,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    elevation: 6,
    borderWidth: 0.5,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  pillSm: { paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" },
  pillTextSm: { fontSize: 9 },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.sm },
  lvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  lvLabel: { color: colors.textMuted, fontSize: 12, flex: 1 },
  lvValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    maxWidth: "60%",
    textAlign: "right",
  },
});
