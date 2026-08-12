/**
 * Overview / Dashboard — Phase 3.
 *
 * Dark JARVIS Aura. Layout:
 *   • Header bar with brand + LIVE pill
 *   • Greeting card
 *   • Shipment KPIs (2×2 glass grid)
 *   • Ledger summary (Receivable neon-green, Payable coral-red)
 *   • Diagnostics
 *
 * All numbers are rendered white; only the KPI's meaning-colour dot
 * carries the semantic tint. Money values in the ledger row use
 * credit-green / debit-red per the design brief.
 */
import { Ionicons } from "@expo/vector-icons";
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
import { fmtCurrency } from "@/src/lib/format";
import { colors, radii, spacing } from "@/src/lib/theme";
import { GlassCard, LabelValueRow, Pill } from "@/src/lib/ui";

type DashboardStats = {
  total?: number;
  pending?: number;
  in_transit?: number;
  warehouse_arrived?: number;
  delivered?: number;
  cancelled?: number;
};

type LedgerSummary = {
  receivable?: { inr?: number; thb?: number };
  payable?: { inr?: number; thb?: number };
};

export default function HomeScreen() {
  const { user, token, authError, refresh } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [ledger, setLedger] = useState<LedgerSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, l] = await Promise.all([
        apiGet<DashboardStats>("/api/dashboard/stats"),
        apiGet<LedgerSummary>("/api/dashboard/ledger-summary"),
      ]);
      setStats(s);
      setLedger(l);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) loadAll();
  }, [token, loadAll]);

  const onRefresh = useCallback(async () => {
    await refresh();
    await loadAll();
  }, [refresh, loadAll]);

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
          <View style={styles.brandWrap}>
            <View style={styles.brandDot} />
            <Text style={styles.brand}>LogiOp Pro</Text>
          </View>
          <Pill
            label={token ? "LIVE" : authError ? "OFFLINE" : "SYNCING"}
            tint={token ? colors.brand : authError ? colors.danger : colors.warn}
            soft={token ? colors.brandSoft : authError ? colors.dangerSoft : colors.warnSoft}
          />
        </View>

        {/* ── Greeting ──────────────────────────────────────────── */}
        <GlassCard glow style={styles.greetCard}>
          <Text style={styles.eyebrow}>Welcome back</Text>
          <Text style={styles.greet}>
            {user ? `${user.display_name} ${user.honorific}` : "Sir"}
          </Text>
          <Text style={styles.greetSub}>
            {user?.role} · {user?.username}
          </Text>
        </GlassCard>

        {/* ── Shipment KPIs ─────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Shipment overview</Text>
        {stats ? (
          <View style={styles.grid}>
            <StatBox label="Total" value={stats.total ?? 0} tint={colors.text} icon="cube" />
            <StatBox
              label="Delivered"
              value={stats.delivered ?? 0}
              tint={colors.brand}
              icon="checkmark-done"
            />
            <StatBox
              label="In transit"
              value={(stats.in_transit ?? 0) + (stats.warehouse_arrived ?? 0)}
              tint={colors.info}
              icon="airplane"
            />
            <StatBox
              label="Pending"
              value={stats.pending ?? 0}
              tint={colors.warn}
              icon="hourglass"
            />
          </View>
        ) : loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brand} />
            <Text style={styles.dim}>Loading…</Text>
          </View>
        ) : error ? (
          <ErrorBox message={error} onRetry={loadAll} />
        ) : null}

        {/* ── Ledger summary ────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Ledger summary</Text>
        <GlassCard>
          <LedgerRow
            label="Receivable · INR"
            value={fmtCurrency(ledger?.receivable?.inr ?? 0, "INR")}
            tint={colors.credit}
          />
          <LedgerRow
            label="Receivable · THB"
            value={fmtCurrency(ledger?.receivable?.thb ?? 0, "THB")}
            tint={colors.credit}
          />
          <LedgerRow
            label="Payable · INR"
            value={fmtCurrency(ledger?.payable?.inr ?? 0, "INR")}
            tint={colors.debit}
          />
          <LedgerRow
            label="Payable · THB"
            value={fmtCurrency(ledger?.payable?.thb ?? 0, "THB")}
            tint={colors.debit}
          />
        </GlassCard>

        {/* ── Diagnostics ───────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Diagnostics</Text>
        <GlassCard>
          <LabelValueRow
            label="Backend"
            value="Reachable"
            valueColor={colors.credit}
          />
          <LabelValueRow
            label="Auth token"
            value={token ? "Present" : "Pending / offline"}
            valueColor={token ? colors.credit : colors.warn}
          />
          <LabelValueRow
            label="User"
            value={user?.display_name || "—"}
          />
          <LabelValueRow
            label="Auth error"
            value={authError || "None"}
            valueColor={authError ? colors.debit : colors.credit}
          />
        </GlassCard>

        <Text style={styles.footNote}>Aura · Phase 3 online</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────
function StatBox({
  label,
  value,
  tint,
  icon,
}: {
  label: string;
  value: number;
  tint: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <View style={styles.stat}>
      <View style={styles.statHeader}>
        <View style={[styles.statDot, { backgroundColor: tint }]} />
        <Text style={styles.statLabel}>{label}</Text>
        <Ionicons name={icon} size={14} color={colors.textDim} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function LedgerRow({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <View style={styles.ledgerRow}>
      <View style={styles.ledgerRowLeft}>
        <View style={[styles.dot, { backgroundColor: tint }]} />
        <Text style={styles.ledgerLabel}>{label}</Text>
      </View>
      <Text style={[styles.ledgerValue, { color: tint }]}>{value}</Text>
    </View>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.errorBox}>
      <Ionicons name="alert-circle" size={20} color={colors.danger} />
      <Text style={styles.errorText} numberOfLines={2}>
        {message}
      </Text>
      <TouchableOpacity style={styles.retry} onPress={onRetry}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: 80 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  brandWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand,
    shadowColor: colors.brand,
    shadowOpacity: 0.9,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
    elevation: 4,
  },
  brand: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  greetCard: { marginBottom: spacing.lg, padding: spacing.lg },
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
    fontSize: 14,
    fontWeight: "800",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    letterSpacing: 0.3,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  stat: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statDot: { width: 6, height: 6, borderRadius: 3 },
  statLabel: {
    color: colors.textDim,
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    flex: 1,
  },
  statValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 6,
  },
  ledgerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  ledgerRowLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  ledgerLabel: { color: colors.textMuted, fontSize: 12 },
  ledgerValue: { fontSize: 15, fontWeight: "800", letterSpacing: 0.2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  loading: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  dim: { color: colors.textMuted, fontSize: 12 },
  errorBox: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radii.md,
    alignItems: "center",
  },
  errorText: { flex: 1, color: colors.text, fontSize: 12 },
  retry: {
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  retryText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  footNote: {
    color: colors.textDim,
    fontSize: 11,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: spacing.xl,
  },
});
