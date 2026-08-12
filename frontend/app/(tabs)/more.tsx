/**
 * Phase-2 More tab.
 *
 * Landing spot for secondary functionality that will be restored in
 * later phases:
 *   • Invoices
 *   • Ledger
 *   • Reports
 *   • Bullion trips
 *   • Assistant / OPSI
 *   • Settings
 *
 * For now, tapping a row toggles an "coming soon" message so the user
 * can see the roadmap. Real navigation will be wired up in Phase 3+.
 */
import { useState } from "react";
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

type MenuItem = {
  key: string;
  title: string;
  subtitle: string;
  phase: "3" | "4" | "5";
};

const MENU: MenuItem[] = [
  { key: "invoices", title: "Invoices", subtitle: "Bills, GST, PDF exports", phase: "3" },
  { key: "ledger", title: "Ledger", subtitle: "Party statements, receivables", phase: "3" },
  { key: "reports", title: "Reports", subtitle: "PDF exports, insights", phase: "4" },
  { key: "bullion", title: "Bullion trips", subtitle: "Carrier flights, vault snapshot", phase: "4" },
  { key: "opsi", title: "OPSI assistant", subtitle: "Voice AI, glowing orb", phase: "5" },
  { key: "settings", title: "Settings", subtitle: "Preferences, sign-out", phase: "3" },
];

export default function MoreScreen() {
  const { user, authError } = useAuth();
  const [tapped, setTapped] = useState<string | null>(null);

  const handleTap = (item: MenuItem) => {
    setTapped(item.key);
    Alert.alert(
      item.title,
      `${item.subtitle}\n\nComing in Phase ${item.phase}.`,
      [{ text: "OK", style: "default" }],
    );
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>Roadmap of features being restored</Text>

        {/* User card */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {(user?.display_name || "?").slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>
              {user ? `${user.display_name} ${user.honorific}` : "Signed out"}
            </Text>
            <Text style={styles.userSub}>{user?.role} · {user?.username}</Text>
          </View>
          <View style={[styles.pill, authError ? styles.pillWarn : styles.pillOk]}>
            <Text style={[styles.pillText, authError ? styles.pillTextWarn : styles.pillTextOk]}>
              {authError ? "OFFLINE" : "LIVE"}
            </Text>
          </View>
        </View>

        {/* Menu */}
        <Text style={styles.section}>Coming up</Text>
        {MENU.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.row}
            onPress={() => handleTap(item)}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowSub}>{item.subtitle}</Text>
            </View>
            <View style={styles.phaseBadge}>
              <Text style={styles.phaseText}>P{item.phase}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <Text style={styles.footNote}>
          Phase 2 · {tapped ? `Last tapped: ${tapped}` : "Restore in progress"}
        </Text>
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
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radii.lg,
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
    borderColor: colors.brand,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: { color: colors.brand, fontSize: 18, fontWeight: "800" },
  userName: { color: colors.text, fontSize: 15, fontWeight: "700" },
  userSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  pillOk: { borderColor: colors.ok, backgroundColor: colors.okSoft },
  pillWarn: { borderColor: colors.warn, backgroundColor: colors.warnSoft },
  pillText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  pillTextOk: { color: colors.ok },
  pillTextWarn: { color: colors.warn },
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
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  rowSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  phaseBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.divider,
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
