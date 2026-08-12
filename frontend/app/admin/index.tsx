/**
 * Admin Console — Phase 7.
 *
 * Landing page for admin-only sections. Gated on `user.role === "Admin"`.
 * Non-admins get bounced back to the tabs root.
 */
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Stack, useRouter } from "expo-router";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/lib/auth-context";
import { colors, radii, spacing } from "@/src/lib/theme";
import { GlassCard, Pill } from "@/src/lib/ui";

type Section = {
  key: string;
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  href?: string;
  comingSoon?: boolean;
};

const SECTIONS: Section[] = [
  {
    key: "users",
    title: "Users",
    subtitle: "Add, disable, or change roles for staff and carriers",
    icon: "people",
    href: "/admin/users",
  },
  {
    key: "audit",
    title: "Audit Log",
    subtitle: "Every create / update / delete with actor + timestamp",
    icon: "time",
    comingSoon: true,
  },
  {
    key: "health",
    title: "System Health",
    subtitle: "MongoDB, remote proxy, Wingman workers",
    icon: "pulse",
    comingSoon: true,
  },
  {
    key: "backup",
    title: "Backup & Restore",
    subtitle: "Snapshot the live DB or restore a previous state",
    icon: "cloud-download",
    comingSoon: true,
  },
];

export default function AdminHome() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) return null;
  if (!user || user.role !== "Admin") return <Redirect href="/(tabs)" />;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Admin Console</Text>
          <Text style={styles.subtitle}>Restricted · {user.username}</Text>
        </View>
        <Pill label="ADMIN" tint={colors.brand} soft={colors.brandSoft} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Warning banner */}
        <GlassCard glow style={styles.warning}>
          <Ionicons name="shield-checkmark" size={20} color={colors.brand} />
          <View style={{ flex: 1 }}>
            <Text style={styles.warningTitle}>Elevated privileges</Text>
            <Text style={styles.warningBody}>
              Every action here is audit-logged. Only signed-in admins can reach this screen.
            </Text>
          </View>
        </GlassCard>

        {/* Sections */}
        {SECTIONS.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[styles.row, s.comingSoon && styles.rowMuted]}
            onPress={() =>
              s.href
                ? router.push(s.href as any)
                : Alert.alert(s.title, `${s.subtitle}\n\nComing soon.`)
            }
            activeOpacity={0.75}
          >
            <View style={styles.rowIcon}>
              <Ionicons name={s.icon} size={18} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{s.title}</Text>
              <Text style={styles.rowSub}>{s.subtitle}</Text>
            </View>
            {s.comingSoon ? (
              <View style={styles.comingBadge}>
                <Text style={styles.comingText}>SOON</Text>
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  scroll: { padding: spacing.lg, paddingBottom: 80 },
  warning: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  warningTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
  warningBody: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  row: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  rowMuted: { opacity: 0.75 },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.brandSoft,
    borderColor: colors.brandBorder,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  rowSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  comingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.divider,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  comingText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
});
