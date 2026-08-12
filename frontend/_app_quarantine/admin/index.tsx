/**
 * Admin Console — landing page for all admin-only sections.
 *
 * Currently:
 *   /admin       → this dashboard (users, audit, health)
 *   /admin/users → user management
 *
 * Future sections: /admin/audit, /admin/health, /admin/backup.
 */
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth/context";
import { colors, radii, spacing } from "@/src/theme";

type Card = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  enabled?: boolean;
};

const CARDS: Card[] = [
  {
    title: "Users",
    subtitle: "Add, disable, or change roles for staff and carriers.",
    icon: "people-outline",
    href: "/admin/users",
    enabled: true,
  },
  {
    title: "Audit Log",
    subtitle: "See every create / update / delete with who and when.",
    icon: "time-outline",
    href: "/admin/audit",
  },
  {
    title: "System Health",
    subtitle: "MongoDB, remote proxy, Wingman workers.",
    icon: "pulse-outline",
    href: "/admin/health",
  },
];

export default function AdminHome() {
  const router = useRouter();
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.role !== "Admin") return <Redirect href="/(tabs)" />;

  return (
    <View style={styles.wrap}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Admin Console</Text>
            <Text style={styles.subtitle}>
              Signed in as {user.display_name} {user.honorific}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {CARDS.map((c) => (
            <Pressable
              key={c.href}
              disabled={!c.enabled}
              onPress={() => router.push(c.href as never)}
              style={({ pressed }) => [
                styles.card,
                !c.enabled && { opacity: 0.45 },
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
              testID={`admin-card-${c.title.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <View style={styles.cardIcon}>
                <Ionicons name={c.icon} size={22} color={colors.lime} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{c.title}</Text>
                <Text style={styles.cardSubtitle}>
                  {c.enabled ? c.subtitle : `${c.subtitle} (coming soon)`}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={c.enabled ? colors.textMuted : colors.textDim}
              />
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "transparent" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.limeGlow,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  cardSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
