/**
 * Ledger — Phase 4 · Fix 3.
 *
 * Khata-book style landing:
 *   1. Summary cards (Receivable INR/THB, Payable INR/THB)
 *   2. All parties list with per-party running balance
 *      (colored avatar + name + role + INR/THB balance)
 *   Tap a row → /party/[id]/statement (bank-statement view)
 *
 * Removed vs Phase 3: horizontal party chip filter strip, "+ Add Entry"
 * FAB, and the recent-transactions tab.
 */
import { Ionicons } from "@expo/vector-icons";
import { Link, Stack, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
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
import { appendCompanyQuery, useCompany } from "@/src/lib/company-context";
import { fmtCurrency, titleCase } from "@/src/lib/format";
import { colors, spacing } from "@/src/lib/theme";
import { GlassCard } from "@/src/lib/ui";

type LedgerEntry = {
  id: string;
  party_id: string;
  currency: "INR" | "THB";
  debit: number;
  credit: number;
};

type Party = {
  id: string;
  name: string;
  role?: string;
  phone?: string;
  opening_balance_inr?: number;
  opening_balance_thb?: number;
};

type LedgerSummary = {
  receivable?: { inr?: number; thb?: number };
  payable?: { inr?: number; thb?: number };
};

// Fix 3 · avatar palette by role (same as parties list for consistency).
const ROLE_COLOR: Record<string, string> = {
  customer: "#00FFFF",
  end_customer: "#FFD700",
  carrier: "#8B00FF",
  supplier: "#FFA500",
  vendor: "#FFA500",
  other: "#9E9E9E",
};
function roleColor(role?: string): string {
  return ROLE_COLOR[(role || "other").toLowerCase()] || ROLE_COLOR.other;
}
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function LedgerScreen() {
  const { token } = useAuth();
  const { activeCompany, activeMode } = useCompany();
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, e, p] = await Promise.all([
        apiGet<LedgerSummary>("/api/dashboard/ledger-summary"),
        apiGet<LedgerEntry[]>(
          appendCompanyQuery("/api/ledger/entries", activeCompany, activeMode),
        ),
        apiGet<Party[]>("/api/parties"),
      ]);
      setSummary(s);
      setEntries(Array.isArray(e) ? e : []);
      setParties(Array.isArray(p) ? p : []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [activeCompany, activeMode]);

  useEffect(() => {
    if (token) load();
  }, [token, load, activeCompany, activeMode]);

  useFocusEffect(
    useCallback(() => {
      if (token) load();
    }, [token, load]),
  );

  // Per-party balance map (INR + THB), seeded with opening balances.
  const balances = useMemo(() => {
    const b: Record<string, { inr: number; thb: number }> = {};
    for (const p of parties) {
      b[p.id] = {
        inr: p.opening_balance_inr ?? 0,
        thb: p.opening_balance_thb ?? 0,
      };
    }
    for (const e of entries) {
      const k = b[e.party_id] || { inr: 0, thb: 0 };
      const delta = (e.debit || 0) - (e.credit || 0);
      if (e.currency === "THB") k.thb += delta;
      else k.inr += delta;
      b[e.party_id] = k;
    }
    return b;
  }, [parties, entries]);

  // Sort parties by absolute total balance (biggest first) so the most
  // important rows sit at the top of the khata book.
  const sortedParties = useMemo(() => {
    return parties
      .slice()
      .sort((a, b) => {
        const ba = Math.abs((balances[a.id]?.inr || 0)) +
          Math.abs((balances[a.id]?.thb || 0));
        const bb = Math.abs((balances[b.id]?.inr || 0)) +
          Math.abs((balances[b.id]?.thb || 0));
        return bb - ba;
      });
  }, [parties, balances]);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand} />
        }
      >
        <Text style={styles.title}>Ledger</Text>
        <Text style={styles.subtitle}>Party-wise running balances</Text>

        {/* Fix 4 (Phase 5) · Single summary card with 2 rows, Hinglish labels. */}
        <GlassCard style={styles.summaryOne}>
          <View style={styles.summaryRow}>
            <SummaryCell
              label="Inse Lena Hai (INR)"
              amount={summary?.receivable?.inr ?? 0}
              tint={colors.credit}
            />
            <View style={styles.summarySep} />
            <SummaryCell
              label="Inhe Dena Hai (INR)"
              amount={summary?.payable?.inr ?? 0}
              tint={colors.debit}
            />
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <SummaryCell
              label="Inse Lena Hai (THB)"
              amount={summary?.receivable?.thb ?? 0}
              currency="THB"
              tint={colors.credit}
            />
            <View style={styles.summarySep} />
            <SummaryCell
              label="Inhe Dena Hai (THB)"
              amount={summary?.payable?.thb ?? 0}
              currency="THB"
              tint={colors.debit}
            />
          </View>
        </GlassCard>

        {/* Party list — khata book style */}
        <Text style={styles.section}>Parties</Text>
        {error ? (
          <GlassCard>
            <View style={styles.errorBody}>
              <Ionicons name="alert-circle" size={20} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={load} style={styles.retryBtn}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        ) : loading && parties.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : sortedParties.length === 0 ? (
          <GlassCard>
            <Text style={styles.dim}>No parties yet.</Text>
          </GlassCard>
        ) : (
          sortedParties.map((p) => (
            <PartyKhataRow
              key={p.id}
              party={p}
              inr={balances[p.id]?.inr ?? 0}
              thb={balances[p.id]?.thb ?? 0}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCell({
  label,
  amount,
  currency = "INR",
  tint,
}: {
  label: string;
  amount: number;
  currency?: "INR" | "THB";
  tint: string;
}) {
  return (
    <View style={styles.summaryCell}>
      <Text style={[styles.summaryCellLabel, { color: tint }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.summaryCellAmount, { color: tint }]} numberOfLines={1}>
        {fmtCurrency(Math.abs(amount), currency)}
      </Text>
    </View>
  );
}

function PartyKhataRow({
  party,
  inr,
  thb,
}: {
  party: Party;
  inr: number;
  thb: number;
}) {
  const color = roleColor(party.role);
  const soft = hexToRgba(color, 0.15);
  const initial = (party.name || "?").slice(0, 1).toUpperCase();
  return (
    <Link href={`/party/${party.id}/statement` as any} asChild>
      <TouchableOpacity activeOpacity={0.75} style={{ marginBottom: spacing.sm }}>
        <GlassCard>
          <View style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: soft, borderColor: color }]}>
              <Text style={[styles.avatarText, { color }]}>{initial}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name} numberOfLines={1}>
                {party.name}
              </Text>
              <Text style={styles.role} numberOfLines={1}>
                {titleCase(party.role || "other")}
              </Text>
            </View>
            <View style={styles.balCol}>
              {inr !== 0 ? (
                <Text
                  style={[styles.balAmt, { color: inr > 0 ? colors.credit : colors.debit }]}
                  numberOfLines={1}
                >
                  {inr > 0 ? "+ " : "− "}
                  {fmtCurrency(Math.abs(inr), "INR")}
                </Text>
              ) : (
                <Text style={[styles.balAmt, { color: colors.textDim }]}>—</Text>
              )}
              {thb !== 0 ? (
                <Text
                  style={[styles.balSub, { color: thb > 0 ? colors.credit : colors.debit }]}
                  numberOfLines={1}
                >
                  {thb > 0 ? "+ " : "− "}
                  {fmtCurrency(Math.abs(thb), "THB")}
                </Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
          </View>
        </GlassCard>
      </TouchableOpacity>
    </Link>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: 120 },
  title: { color: colors.text, fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2, marginBottom: spacing.lg },
  section: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  // Fix 4 (Phase 5) · Single-card summary layout.
  summaryOne: { padding: spacing.md, marginBottom: spacing.sm },
  summaryRow: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 56,
  },
  summarySep: {
    width: 1,
    backgroundColor: colors.divider,
    marginHorizontal: spacing.sm,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.sm,
  },
  summaryCell: {
    flex: 1,
    justifyContent: "center",
  },
  summaryCellLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  summaryCellAmount: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  summaryCard: {
    flex: 1,
    padding: spacing.md,
    borderWidth: 1,
  },
  summaryPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 6,
  },
  summaryPillText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },
  summaryAmount: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
    ...Platform.select({
      ios: { fontVariant: ["tabular-nums"] },
      default: {},
    }),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "800" },
  name: { color: colors.text, fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
  role: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  balCol: { alignItems: "flex-end", minWidth: 90 },
  balAmt: { fontSize: 14, fontWeight: "800" },
  balSub: { fontSize: 11, fontWeight: "700", marginTop: 2 },
  dim: { color: colors.textDim, fontSize: 12, padding: spacing.md },
  loadingBox: { padding: spacing.xl, alignItems: "center" },
  errorBody: { padding: spacing.md, alignItems: "center", gap: 8 },
  errorText: { color: colors.textMuted, fontSize: 12, textAlign: "center" },
  retryBtn: {
    marginTop: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.brand,
  },
  retryText: { color: colors.bgSolid, fontSize: 12, fontWeight: "800" },
});
