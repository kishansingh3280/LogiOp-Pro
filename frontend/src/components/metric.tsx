/**
 * Metric — a big, glowing headline number in a semantic brand colour.
 *
 * Uses text-shadow (native) / CSS text-shadow (web) to give the number a
 * soft chromatic glow that matches the ambient orb palette. The label
 * above is small, uppercase, dim.
 *
 * Semantic buckets:
 *   gold    → amber
 *   inr/usd → lime
 *   thb     → cyan
 *   balance → purple
 *   info    → blue
 *   ok      → green
 *   danger  → red
 */
import React from "react";
import { Platform, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { colors, font, metric } from "@/src/theme";

export type MetricKind = keyof typeof metric;

export function Metric({
  label,
  value,
  sub,
  kind = "inr",
  size = "lg",
  align = "left",
  style,
}: {
  label?: string;
  value: string;
  sub?: string;
  kind?: MetricKind;
  size?: "sm" | "md" | "lg" | "xl";
  align?: "left" | "center" | "right";
  style?: StyleProp<ViewStyle>;
}) {
  const tone = metric[kind];
  const sizes: Record<string, number> = { sm: 18, md: 22, lg: 30, xl: 42 };
  const valueSize = sizes[size];
  const glow: TextStyle = Platform.select({
    web: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...({ textShadow: `0 0 20px ${tone.glow}, 0 0 40px ${tone.glow}` } as any),
    },
    default: {
      textShadowColor: tone.glow,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 12,
    },
  }) as TextStyle;

  return (
    <View style={[{ alignItems: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start" }, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Text
        style={[
          styles.value,
          glow,
          { color: tone.color, fontSize: valueSize, lineHeight: valueSize * 1.1 },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
    fontFamily: font.display,
  },
  value: {
    fontWeight: "800",
    letterSpacing: -0.5,
    fontFamily: font.display,
  },
  sub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
    fontFamily: font.display,
  },
});
