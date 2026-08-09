/**
 * CompanySwitcher — Admin-only pill that toggles between the two brands.
 *
 * Visible only when `user.role === "Admin"` (Papa and Staff never see it).
 * Uses the Cyber-Siri glass tokens so it blends with the header treatments
 * on every screen it's mounted on.
 */
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/src/auth/context";
import { useCompany } from "@/src/context/company-context";
import { colors, radii } from "@/src/theme";

const BRAND_LABELS: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  singh_exports: { label: "Singh Exports", icon: "business-outline" },
  awadh_enterprise: { label: "Awadh Enterprise", icon: "briefcase-outline" },
};

export function CompanySwitcher() {
  const { user } = useAuth();
  const { activeCompany, setActiveCompany } = useCompany();

  // Only visible to Admins. Papa/Staff/Carrier all locked to their brand.
  if (user?.role !== "Admin") return null;

  const isSingh = activeCompany === "singh_exports";
  const label = BRAND_LABELS[activeCompany]?.label ?? "Company";
  const icon = BRAND_LABELS[activeCompany]?.icon ?? "business-outline";

  const toggle = () => {
    setActiveCompany(isSingh ? "awadh_enterprise" : "singh_exports");
  };

  return (
    <TouchableOpacity
      onPress={toggle}
      activeOpacity={0.85}
      style={[styles.pill, isSingh && styles.pillAlt]}
      testID="company-switcher"
      accessibilityRole="button"
      accessibilityLabel={`Switch company from ${label}`}
    >
      <View style={[styles.dot, isSingh && styles.dotAlt]}>
        <Ionicons name={icon} size={12} color={isSingh ? colors.warn : colors.cyan} />
      </View>
      <Text style={[styles.label, isSingh && styles.labelAlt]}>{label}</Text>
      <Ionicons name="swap-horizontal-outline" size={13} color={colors.textDim} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.chipBg,
    borderColor: colors.cyan,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 220,
  },
  pillAlt: {
    borderColor: colors.warn,
    backgroundColor: "rgba(255,176,32,0.08)",
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,209,255,0.15)",
    borderColor: colors.cyan,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dotAlt: {
    backgroundColor: "rgba(255,176,32,0.15)",
    borderColor: colors.warn,
  },
  label: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  labelAlt: {
    color: colors.warn,
  },
});

export default CompanySwitcher;
