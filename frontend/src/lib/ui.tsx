/**
 * Reusable UI primitives for the JARVIS Aura look.
 *
 * • GlassCard  — frosted holographic surface with subtle neon border
 * • Pill       — coloured status chip
 * • Divider    — hairline separator
 * • Row        — label / value line used across all list screens
 *
 * These are intentionally style-only — no external native modules
 * (no BlurView, no LinearGradient). We'll add real blur in a later
 * phase once we're confident about the APK stability profile.
 */
import React from "react";
import { StyleSheet, Text, View, ViewStyle, StyleProp, TextStyle } from "react-native";

import { colors, radii, spacing } from "./theme";

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
  return (
    <View
      style={[
        styles.glass,
        padded && styles.padded,
        glow && styles.glassGlow,
        style,
      ]}
    >
      {children}
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

const styles = StyleSheet.create({
  glass: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radii.lg,
    overflow: "hidden",
  },
  padded: { padding: spacing.md },
  glassGlow: {
    borderColor: colors.brandBorder,
    shadowColor: colors.brand,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 6,
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
