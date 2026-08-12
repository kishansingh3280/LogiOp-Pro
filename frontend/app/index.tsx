/**
 * Phase-1 Home / Dashboard.
 *
 * Purpose: prove the reconstructed core works on Android APK.
 * Renders:
 *   • Greeting from the AuthProvider (auto-logged-in as Kishan)
 *   • Auth status pill (Live JWT vs stub)
 *   • Live dashboard stats fetched from /api/dashboard/stats
 *   • Pull-to-refresh
 *   • A "View shipments" placeholder link → /shipments (Phase 3+)
 *
 * NO ionicons, NO svg, NO gradients — just RN core + text.
 */
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiGet } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth-context";
import { colors, radii, spacing } from "@/src/lib/theme";

type DashboardStats = {
  total?: number;
  pending?: number;
  in_transit?: number;
  warehouse_arrived?: number;
  delivered?: number;
  cancelled?: number;
};

export default function HomeScreen() {
  const { user, token, authError, refresh } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setStatsError(null);
    try {
      const data = await apiGet<DashboardStats>("/api/dashboard/stats");
      setStats(data);
    } catch (e) {
      setStatsError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch once a real token is in place (or immediately on first mount
  // if we already have one from the persisted cache).
  useEffect(() => {
    if (token) fetchStats();
  }, [token, fetchStats]);

  const onRefresh = useCallback(async () => {
    await refresh();
    await fetchStats();
  }, [refresh, fetchStats]);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.brand} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.brand}>LogiOp Pro</Text>
          <View
            style={[
              styles.pill,
              token ? styles.pillOk : authError ? styles.pillDanger : styles.pillWarn,
            ]}
          >
            <Text
              style={[
                styles.pillText,
                token ? styles.pillTextOk : authError ? styles.pillTextDanger : styles.pillTextWarn,
              ]}
            >
              {token ? "LIVE" : authError ? "OFFLINE" : "SYNCING"}
            </Text>
          </View>
        </View>

        {/* ── Greeting ──────────────────────────────────────────── */}
        <View style={styles.greetCard}>
          <Text style={styles.eyebrow}>Welcome back</Text>
          <Text style={styles.greet}>
            {user ? `${user.display_name} ${user.honorific}` : "Sir"}
          </Text>
          <Text style={styles.greetSub}>
            {user?.role} · {user?.username}
          </Text>
        </View>

        {/* ── Stats grid ────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Shipment overview</Text>
        {stats ? (
          <View style={styles.grid}>
            <StatBox label="Total" value={stats.total ?? 0} tint={colors.text} />
            <StatBox label="Delivered" value={stats.delivered ?? 0} tint={colors.ok} />
            <StatBox
              label="In transit"
              value={(stats.in_transit ?? 0) + (stats.warehouse_arrived ?? 0)}
              tint={colors.info}
            />
            <StatBox label="Pending" value={stats.pending ?? 0} tint={colors.warn} />
          </View>
        ) : loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brand} />
            <Text style={styles.loadingText}>Loading stats…</Text>
          </View>
        ) : statsError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Couldn&apos;t load stats</Text>
            <Text style={styles.errorBody} numberOfLines={3}>
              {statsError}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchStats}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.loading}>
            <Text style={styles.loadingText}>Pull down to refresh</Text>
          </View>
        )}

        {/* ── Diagnostics ───────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Diagnostics</Text>
        <View style={styles.diagCard}>
          <DiagRow label="Backend" value="Reachable" ok />
          <DiagRow label="Auth token" value={token ? "Present" : "Pending / offline"} ok={!!token} />
          <DiagRow label="User" value={user?.display_name || "—"} ok={!!user} />
          <DiagRow label="Auth error" value={authError || "None"} ok={!authError} />
        </View>

        <Text style={styles.footNote}>
          Phase 1 minimal shell. Screens will be restored progressively.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────
function StatBox({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
    </View>
  );
}

function DiagRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <View style={styles.diagRow}>
      <Text style={styles.diagLabel}>{label}</Text>
      <View style={styles.diagValueWrap}>
        <View
          style={[
            styles.dot,
            { backgroundColor: ok ? colors.ok : colors.warn },
          ]}
        />
        <Text style={styles.diagValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: 60 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  brand: { color: colors.text, fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  pillOk: { borderColor: colors.ok, backgroundColor: colors.okSoft },
  pillWarn: { borderColor: colors.warn, backgroundColor: colors.warnSoft },
  pillDanger: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  pillText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  pillTextOk: { color: colors.ok },
  pillTextWarn: { color: colors.warn },
  pillTextDanger: { color: colors.danger },
  greetCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.lg,
  },
  eyebrow: {
    color: colors.textDim,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  greet: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 4,
    letterSpacing: -0.5,
  },
  greetSub: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  stat: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statLabel: {
    color: colors.textDim,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  statValue: { fontSize: 28, fontWeight: "800", marginTop: 4 },
  loading: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  loadingText: { color: colors.textMuted, fontSize: 13 },
  errorCard: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 4,
  },
  errorBody: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.sm },
  retryBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.danger,
    borderRadius: radii.pill,
  },
  retryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  diagCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  diagRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  diagLabel: { color: colors.textMuted, fontSize: 12 },
  diagValueWrap: { flexDirection: "row", alignItems: "center", gap: 6, maxWidth: "60%" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  diagValue: { color: colors.text, fontSize: 12, fontWeight: "600" },
  footNote: {
    color: colors.textDim,
    fontSize: 11,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: spacing.xl,
  },
});
