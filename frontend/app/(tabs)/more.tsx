/**
 * More tab — Phase 3.
 *
 * Now provides real navigation to the Ledger screen. Other rows
 * (Reports, Bullion, OPSI, Settings) still show a Coming Soon toast
 * until their phases arrive.
 */
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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
import { useCompany } from "@/src/lib/company-context";
import { colors, radii, spacing } from "@/src/lib/theme";
import { GlassCard, Pill } from "@/src/lib/ui";

type MenuItem = {
  key: string;
  title: string;
  subtitle: string;
  // Icon name — usually an Ionicons name; special-cased for "lalamove"
  // which renders a MaterialCommunityIcons truck (Fix 8 · Phase 6).
  icon: React.ComponentProps<typeof Ionicons>["name"] | "truck-fast";
  route?: string;
  phase?: "3" | "4" | "5" | "8" | "9";
  adminOnly?: boolean;
};

const MENU: MenuItem[] = [
  {
    key: "parties",
    title: "Parties",
    subtitle: "Customers, carriers, contacts",
    icon: "people",
    route: "/parties",
  },
  {
    key: "bags",
    title: "Bags",
    subtitle: "Every bag across every shipment, per-carrier",
    icon: "cube",
    route: "/bags",
  },
  {
    key: "lalamove",
    title: "Lalamove",
    subtitle: "Instant last-mile delivery — quote, book, track",
    icon: "truck-fast",
    route: "/lalamove",
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
    subtitle: "PDF exports, ledger, statements, invoices, manifests",
    icon: "bar-chart",
    route: "/reports",
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

// Fix 1 (Phase 3) · pill + summary helpers for BUSINESS SETTINGS section.
function BizPill({
  label,
  active,
  onPress,
  disabled,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={[
        stylesBiz.pill,
        active
          ? { backgroundColor: "#00FF88" }
          : { backgroundColor: "rgba(255,255,255,0.08)" },
        disabled && { opacity: 0.35 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={active ? { selected: true } : {}}
    >
      <Text
        style={[
          stylesBiz.pillText,
          { color: active ? "#000" : "#FFFFFF", fontWeight: active ? "800" : "600" },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function buildFilterSummary(
  activeCompany: "awadh" | "singh_exports" | null,
  activeMode: "formal" | "informal" | null,
): string {
  if (activeCompany === null) return "Showing: All data (Master)";
  const cName = activeCompany === "singh_exports" ? "Singh Exp." : "Awadh Ent.";
  const mName =
    activeMode === null ? "All" : activeMode === "informal" ? "Informal" : "Formal";
  return `Showing: ${cName} · ${mName}`;
}

const stylesBiz = StyleSheet.create({
  pill: {
    flex: 1,
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  pillText: { fontSize: 12, letterSpacing: 0.2 },
});

export default function MoreScreen() {
  const { user, authError } = useAuth();
  const router = useRouter();
  const { activeCompany, activeMode, setActiveCompany, setActiveMode } =
    useCompany();

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

        {/* Fix 5 (Phase 7) · Mode-First Business Settings.
            Mode is now the primary switch — Formal reveals the
            Company pills, Informal hides them (uses last-picked
            company implicitly), Master turns off both filters. */}
        <Text style={styles.section}>BUSINESS SETTINGS</Text>
        <GlassCard style={styles.bizCard}>
          <Text style={styles.bizLabel}>Mode</Text>
          <View style={styles.bizRow}>
            <BizPill
              label="Informal"
              active={activeMode === "informal"}
              onPress={() => {
                setActiveMode("informal");
                // Ensure a company is set (defaults to Awadh) so ledger
                // + shipment writes still record a company_id even when
                // the picker is hidden.
                if (!activeCompany) setActiveCompany("awadh");
              }}
            />
            <BizPill
              label="Formal"
              active={activeMode === "formal"}
              onPress={() => {
                setActiveMode("formal");
                if (!activeCompany) setActiveCompany("awadh");
              }}
            />
            <BizPill
              label="Master"
              active={activeMode === null}
              onPress={() => {
                setActiveCompany(null);
                setActiveMode(null);
              }}
            />
          </View>

          {/* Company row — visible ONLY when Mode = Formal (Fix 5). */}
          {activeMode === "formal" ? (
            <>
              <Text style={styles.bizLabel}>Company</Text>
              <View style={styles.bizRow}>
                <BizPill
                  label="Awadh Ent."
                  active={activeCompany === "awadh"}
                  onPress={() => setActiveCompany("awadh")}
                />
                <BizPill
                  label="Singh Exp."
                  active={activeCompany === "singh_exports"}
                  onPress={() => setActiveCompany("singh_exports")}
                />
              </View>
            </>
          ) : null}

          <Text style={styles.bizSummary}>{buildFilterSummary(activeCompany, activeMode)}</Text>
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
              {item.key === "lalamove" ? (
                <MaterialCommunityIcons name="truck-fast" size={20} color={colors.brand} />
              ) : (
                <Ionicons
                  name={item.icon as React.ComponentProps<typeof Ionicons>["name"]}
                  size={18}
                  color={colors.brand}
                />
              )}
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

        <Text style={styles.footNote}>Aura · Phase 8 online</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: 100 },
  title: { color: colors.text, fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2, marginBottom: spacing.lg },
  // Fix 1 (Phase 3) · Business Settings section.
  bizCard: {
    padding: spacing.md,
    gap: 8,
    marginBottom: spacing.lg,
  },
  bizLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: 4,
  },
  bizRow: {
    flexDirection: "row",
    gap: 6,
  },
  bizSummary: {
    color: colors.textDim,
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 6,
  },
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
