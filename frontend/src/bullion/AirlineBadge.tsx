import React from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";

import type { Airline } from "@/src/bullion/airlines";
import { colors, radii } from "@/src/theme";

type Size = "sm" | "md" | "lg";

/**
 * Renders the airline's brand-coloured "badge" (IATA code stamp).
 * Falls back to a neutral chip with an aircraft glyph when no airline is set.
 */
export function AirlineBadge({
  airline,
  size = "md",
  style,
}: {
  airline?: Airline;
  size?: Size;
  style?: ViewStyle;
}) {
  const dim = size === "sm" ? 28 : size === "lg" ? 52 : 40;
  const font = size === "sm" ? 10 : size === "lg" ? 18 : 13;

  if (!airline) {
    return (
      <View style={[styles.badge, { width: dim, height: dim, backgroundColor: colors.chipBg }, style]}>
        <Text style={[styles.plane, { fontSize: font + 4, color: colors.textDim }]}>✈</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.badge,
        { width: dim, height: dim, backgroundColor: airline.brand },
        style,
      ]}
    >
      <Text style={[styles.code, { fontSize: font, color: airline.fg || "#ffffff" }]}>
        {airline.code}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  code: {
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  plane: {
    fontWeight: "700",
  },
});
