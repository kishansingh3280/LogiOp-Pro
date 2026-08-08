import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";

import { colors, radii, spacing } from "@/src/theme";

export function Card({ children, style, testID }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  return (
    <View style={[styles.card, style]} testID={testID}>
      {children}
    </View>
  );
}

export function SectionHeader({ title, action, testID }: { title: string; action?: React.ReactNode; testID?: string }) {
  return (
    <View style={styles.sectionHeader} testID={testID}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

export function KV({ label, value, valueStyle, testID }: { label: string; value: React.ReactNode; valueStyle?: TextStyle; testID?: string }) {
  return (
    <View style={styles.kv} testID={testID}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={[styles.kvValue, valueStyle]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function StatusPill({ status, testID }: { status: string; testID?: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    pending: { bg: "#3a2a00", fg: "#F59E0B", label: "Pending" },
    in_transit: { bg: "#0b2540", fg: "#60A5FA", label: "In transit" },
    warehouse_arrived: { bg: "#1a1a1a", fg: "#00D1FF", label: "Warehouse" },
    delivered: { bg: "#0f2a1c", fg: "#34D399", label: "Delivered" },
    draft: { bg: "#1c1c1c", fg: "#9CA3AF", label: "Draft" },
    sent: { bg: "#0b2540", fg: "#60A5FA", label: "Sent" },
    paid: { bg: "#0f2a1c", fg: "#34D399", label: "Paid" },
    cancelled: { bg: "#2a0f0f", fg: "#F87171", label: "Cancelled" },
  };
  const s = map[status] || { bg: "#1c1c1c", fg: "#9CA3AF", label: status };
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]} testID={testID}>
      <Text style={[styles.pillText, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

export function EmptyState({ title, subtitle, testID }: { title: string; subtitle?: string; testID?: string }) {
  return (
    <View style={styles.empty} testID={testID}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  kv: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  kvLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  kvValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: spacing.md,
    flexShrink: 1,
    textAlign: "right",
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    alignSelf: "flex-start",
  },
  pillText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  empty: {
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  emptySub: {
    color: colors.textDim,
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
  },
});
