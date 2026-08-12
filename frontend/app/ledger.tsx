/**
 * Ledger — Phase 3.
 *
 * Two-panel view:
 *   1. Summary cards (Receivable / Payable in INR + THB)
 *   2. Top receivables / payables lists (party name, amount)
 *   3. Recent entries (debit red, credit green)
 *
 * Purpose: a single glance at "who owes what" for the whole business.
 */
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { fmtCurrency, shortDate } from "@/src/lib/format";
import { colors, radii, spacing } from "@/src/lib/theme";
import { GlassCard } from "@/src/lib/ui";

type LedgerEntry = {
  id: string;
  party_id: string;
  date?: string;
  description: string;
  currency: "INR" | "THB";
  debit: number;
  credit: number;
};

type Party = { id: string; name: string };

type LedgerSummary = {
  receivable?: { inr?: number; thb?: number };
  payable?: { inr?: number; thb?: number };
  top_get?: { id: string; name: string; inr?: number; thb?: number }[];
  top_pay?: { id: string; name: string; inr?: number; thb?: number }[];
};

export default function LedgerScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[] | null>(null);
  const [parties, setParties] = useState<Party[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, e, p] = await Promise.all([
        apiGet<LedgerSummary>("/api/dashboard/ledger-summary"),
        apiGet<LedgerEntry[]>("/api/ledger/entries"),
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
  }, []);

  useEffect(() => {
    if (token) load();
  }, [token, load]);

  const partyMap = useMemo(() => {
    const m: Record<string, string> = {};
    (parties || []).forEach((p) => (m[p.id] = p.name));
    return m;
  }, [parties]);

  const recentEntries = useMemo(() => {
    if (!entries) return [];
    return entries
      .slice()
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 20);
  }, [entries]);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Ledger</Text>
          <Text style={styles.subtitle}>Receivables · Payables · Recent entries</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand} />
        }
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <GlassCard style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color={colors.danger} />
            <Text style={styles.errorText} numberOfLines={3}>
              {error}
            </Text>
            <TouchableOpacity style={styles.retry} onPress={load}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </GlassCard>
        ) : null}

        {summary === null && loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brand} />
            <Text style={styles.dim}>Loading ledger…</Text>
          </View>
        ) : null}

        {/* Summary cards */}
        {summary ? (
          <View style={styles.grid}>
            <SummaryCard
              label="Receivable"
              currency="INR"
              value={summary.receivable?.inr ?? 0}
              tint={colors.credit}
              icon="arrow-down"
            />
            <SummaryCard
              label="Receivable"
              currency="THB"
              value={summary.receivable?.thb ?? 0}
              tint={colors.credit}
              icon="arrow-down"
            />
            <SummaryCard
              label="Payable"
              currency="INR"
              value={summary.payable?.inr ?? 0}
              tint={colors.debit}
              icon="arrow-up"
            />
            <SummaryCard
              label="Payable"
              currency="THB"
              value={summary.payable?.thb ?? 0}
              tint={colors.debit}
              icon="arrow-up"
            />
          </View>
        ) : null}

        {/* Top receivables */}
        {(summary?.top_get ?? []).length ? (
          <>
            <Text style={styles.section}>Top receivables</Text>
            <GlassCard>
              {(summary?.top_get ?? []).slice(0, 6).map((p, idx, arr) => (
                <View
                  key={p.id}
                  style={[styles.partyRow, idx < arr.length - 1 && styles.partyRowBorder]}
                >
                  <Text style={styles.partyName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <View style={styles.partyMoney}>
                    {p.inr ? (
                      <Text style={[styles.moneyText, { color: colors.credit }]}>
                        {fmtCurrency(p.inr, "INR")}
                      </Text>
                    ) : null}
                    {p.thb ? (
                      <Text style={[styles.moneyText, { color: colors.credit }]}>
                        {fmtCurrency(p.thb, "THB")}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </GlassCard>
          </>
        ) : null}

        {/* Top payables */}
        {(summary?.top_pay ?? []).length ? (
          <>
            <Text style={styles.section}>Top payables</Text>
            <GlassCard>
              {(summary?.top_pay ?? []).slice(0, 6).map((p, idx, arr) => (
                <View
                  key={p.id}
                  style={[styles.partyRow, idx < arr.length - 1 && styles.partyRowBorder]}
                >
                  <Text style={styles.partyName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <View style={styles.partyMoney}>
                    {p.inr ? (
                      <Text style={[styles.moneyText, { color: colors.debit }]}>
                        {fmtCurrency(p.inr, "INR")}
                      </Text>
                    ) : null}
                    {p.thb ? (
                      <Text style={[styles.moneyText, { color: colors.debit }]}>
                        {fmtCurrency(p.thb, "THB")}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </GlassCard>
          </>
        ) : null}

        {/* Recent entries */}
        {recentEntries.length ? (
          <>
            <Text style={styles.section}>Recent entries</Text>
            <GlassCard>
              {recentEntries.map((e, idx, arr) => {
                const isDebit = e.debit > 0;
                const amount = isDebit ? e.debit : e.credit;
                const tint = isDebit ? colors.debit : colors.credit;
                return (
                  <View
                    key={e.id}
                    style={[styles.entryRow, idx < arr.length - 1 && styles.entryRowBorder]}
                  >
                    <View style={styles.entryLeft}>
                      <Text style={styles.entryDesc} numberOfLines={1}>
                        {e.description}
                      </Text>
                      <Text style={styles.entrySub}>
                        {partyMap[e.party_id] || "—"} · {shortDate(e.date)}
                      </Text>
                    </View>
                    <View style={styles.entryRight}>
                      <Text style={[styles.entryAmt, { color: tint }]}>
                        {isDebit ? "− " : "+ "}
                        {fmtCurrency(amount, e.currency)}
                      </Text>
                      <Text style={styles.entryType}>{isDebit ? "DEBIT" : "CREDIT"}</Text>
                    </View>
                  </View>
                );
              })}
            </GlassCard>
          </>
        ) : null}

        <Text style={styles.footNote}>
          {entries?.length ?? 0} total entries · showing latest {recentEntries.length}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({
  label,
  currency,
  value,
  tint,
  icon,
}: {
  label: string;
  currency: string;
  value: number;
  tint: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <View style={styles.stat}>
      <View style={styles.statHeader}>
        <View style={[styles.statDot, { backgroundColor: tint }]} />
        <Text style={styles.statLabel}>
          {label} · {currency}
        </Text>
        <Ionicons name={icon} size={14} color={tint} />
      </View>
      <Text style={[styles.statValue, { color: tint }]}>{fmtCurrency(value, currency)}</Text>
    </View>
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
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  stat: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  statHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  statDot: { width: 6, height: 6, borderRadius: 3 },
  statLabel: {
    color: colors.textDim,
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    flex: 1,
  },
  statValue: { fontSize: 20, fontWeight: "800", marginTop: 6, letterSpacing: 0.2 },
  section: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  partyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  partyRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  partyName: { color: colors.text, fontSize: 13, fontWeight: "600", flex: 1, marginRight: 12 },
  partyMoney: { alignItems: "flex-end" },
  moneyText: { fontSize: 13, fontWeight: "800" },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: spacing.md,
  },
  entryRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  entryLeft: { flex: 1 },
  entryDesc: { color: colors.text, fontSize: 13, fontWeight: "600" },
  entrySub: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  entryRight: { alignItems: "flex-end" },
  entryAmt: { fontSize: 13, fontWeight: "800" },
  entryType: {
    color: colors.textDim,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  loading: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  dim: { color: colors.textMuted, fontSize: 12 },
  errorCard: {
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderColor: colors.danger,
    marginBottom: spacing.md,
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
