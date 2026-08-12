/**
 * More tab — Phase 3.
 *
 * Now provides real navigation to the Ledger screen. Other rows
 * (Reports, Bullion, OPSI, Settings) still show a Coming Soon toast
 * until their phases arrive.
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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

type MenuItem = {
  key: string;
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  route?: string;
  phase?: "3" | "4" | "5" | "8" | "9";
  adminOnly?: boolean;
};

const MENU: MenuItem[] = [
  {
    key: "ledger",
    title: "Ledger",
    subtitle: "Party statements, receivables, verified rows",
    icon: "book",
    route: "/ledger",
  },
  {
    key: "bullion",
    title: "Bullion trips",
    subtitle: "Carrier flights, vault snapshot, live rates",
    icon: "diamond",
    route: "/bullion",
  },
  {
    key: "bags",
    title: "Bags",
    subtitle: "Every bag across every shipment, per-carrier",
    icon: "cube",
    route: "/bags",
  },
  {
    key: "items",
    title: "Catalog",
    subtitle: "Products, buying / selling price, margin",
    icon: "pricetags",
    route: "/items",
  },
  {
    key: "admin",
    title: "Admin Console",
    subtitle: "Users, audit log, system health",
    icon: "shield-checkmark",
    route: "/admin",
    adminOnly: true,
  },
  {
    key: "reports",
    title: "Reports",
    subtitle: "PDF exports, insights",
    icon: "bar-chart",
    phase: "8",
  },
  {
    key: "opsi",
    title: "OPSI assistant",
    subtitle: "Voice AI, glowing orb",
    icon: "sparkles",
    phase: "9",
  },
  {
    key: "settings",
    title: "Settings",
    subtitle: "Preferences, sign-out",
    icon: "settings",
    phase: "9",
  },
];

export default function MoreScreen() {
  const { user, authError } = useAuth();
  const router = useRouter();

  const visible = MENU.filter((m) => !m.adminOnly || user?.role === "Admin");

  const handleTap = (item: MenuItem) => {
    if (item.route) {
      router.push(item.route as any);
      return;
    }
    Alert.alert(item.title, `${item.subtitle}\n\nComing in Phase ${item.phase}.`, [
      { text: "OK" },
    ]);
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>Utilities & modules</Text>

        {/* Identity card */}
        <GlassCard glow style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {(user?.display_name || "?").slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>
              {user ? `${user.display_name} ${user.honorific}` : "Signed out"}
            </Text>
            <Text style={styles.userSub}>
              {user?.role} · {user?.username}
            </Text>
          </View>
          <Pill
            label={authError ? "OFFLINE" : "LIVE"}
            tint={authError ? colors.warn : colors.brand}
            soft={authError ? colors.warnSoft : colors.brandSoft}
            size="sm"
          />
        </GlassCard>

        {/* Menu */}
        <Text style={styles.section}>Modules</Text>
        {visible.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.row}
            onPress={() => handleTap(item)}
            activeOpacity={0.75}
          >
            <View style={styles.rowIcon}>
              <Ionicons name={item.icon} size={18} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowSub}>{item.subtitle}</Text>
            </View>
            {item.route ? (
              <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
            ) : (
              <View style={styles.phaseBadge}>
                <Text style={styles.phaseText}>P{item.phase}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        <Text style={styles.footNote}>Aura · Phase 3 online</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: 100 },
  title: { color: colors.text, fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2, marginBottom: spacing.lg },
  userCard: {
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brandSoft,
    borderColor: colors.brandBorder,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: { color: colors.brand, fontSize: 18, fontWeight: "800" },
  userName: { color: colors.text, fontSize: 15, fontWeight: "700" },
  userSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  section: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
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
  phaseBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.divider,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  phaseText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  footNote: {
    color: colors.textDim,
    fontSize: 11,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: spacing.xl,
  },
});
