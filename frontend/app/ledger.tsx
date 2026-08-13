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
import { Stack, useFocusEffect, useRouter } from "expo-router";
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
  verified?: boolean;
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
  const { activeCompany, activeMode } = useCompany();
  const router = useRouter();
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[] | null>(null);
  const [parties, setParties] = useState<Party[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fix 2 · party filter chip state (Add-Entry is now a full-page route)
  const [partyFilter, setPartyFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, e, p, v] = await Promise.all([
        apiGet<LedgerSummary>("/api/dashboard/ledger-summary"),
        apiGet<LedgerEntry[]>(
          appendCompanyQuery("/api/ledger/entries", activeCompany, activeMode),
        ),
        apiGet<Party[]>("/api/parties"),
        apiGet<{ entry_ids: string[] }>("/api/ledger/verified").catch(() => ({ entry_ids: [] })),
      ]);
      setSummary(s);
      const vSet = new Set(v?.entry_ids || []);
      const list = Array.isArray(e) ? e : [];
      // Fold verified overlay into entries so the UI can render a ✓
      setEntries(list.map((en) => ({ ...en, verified: vSet.has(en.id) })));
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

  // Fix 5 · Refresh ledger data whenever the screen regains focus
  //         (e.g. returning from the /ledger/new-entry route).
  useFocusEffect(
    useCallback(() => {
      if (token) load();
    }, [token, load]),
  );

  const partyMap = useMemo(() => {
    const m: Record<string, string> = {};
    (parties || []).forEach((p) => (m[p.id] = p.name));
    return m;
  }, [parties]);

  const recentEntries = useMemo(() => {
    if (!entries) return [];
    let list = entries;
    if (partyFilter !== "all") {
      list = list.filter((e) => e.party_id === partyFilter);
    }
    return list
      .slice()
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 20);
  }, [entries, partyFilter]);

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
                <TouchableOpacity
                  key={p.id}
                  activeOpacity={0.75}
                  onPress={() => router.push(`/party/${p.id}/statement` as any)}
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
                  <Ionicons name="chevron-forward" size={14} color={colors.textDim} />
                </TouchableOpacity>
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
                <TouchableOpacity
                  key={p.id}
                  activeOpacity={0.75}
                  onPress={() => router.push(`/party/${p.id}/statement` as any)}
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
                  <Ionicons name="chevron-forward" size={14} color={colors.textDim} />
                </TouchableOpacity>
              ))}
            </GlassCard>
          </>
        ) : null}

        {/* Recent entries + party filter chips (Fix 2) */}
        {(entries?.length ?? 0) > 0 ? (
          <>
            <View style={styles.recentHeader}>
              <Text style={styles.section}>Recent entries</Text>
              <Text style={styles.recentCount}>
                {recentEntries.length}
                {partyFilter !== "all" ? " filtered" : ""}
              </Text>
            </View>
            {/* Party filter chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              <FilterChip
                label="All"
                active={partyFilter === "all"}
                onPress={() => setPartyFilter("all")}
              />
              {(parties || []).map((p) => (
                <FilterChip
                  key={p.id}
                  label={p.name}
                  active={partyFilter === p.id}
                  onPress={() => setPartyFilter(p.id)}
                />
              ))}
            </ScrollView>

            {recentEntries.length ? (
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
                        <View style={styles.entryDescRow}>
                          {e.verified ? (
                            <Ionicons
                              name="checkmark-circle"
                              size={13}
                              color={colors.textDim}
                              style={{ marginRight: 4 }}
                            />
                          ) : null}
                          <Text style={styles.entryDesc} numberOfLines={1}>
                            {e.description}
                          </Text>
                        </View>
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
            ) : (
              <GlassCard style={styles.emptyFiltered}>
                <Ionicons name="filter" size={22} color={colors.textDim} />
                <Text style={styles.emptyFilteredText}>
                  No entries for this party yet.
                </Text>
              </GlassCard>
            )}
          </>
        ) : null}

        <Text style={styles.footNote}>
          {entries?.length ?? 0} total entries · showing latest {recentEntries.length}
        </Text>
      </ScrollView>

      {/* Fix 2 · Floating "+ Add Entry" button. Positioned above the
          OPSI orb which sits at bottom-right (72px pad).
          Fix 5 · now opens a full-page route instead of a bottom sheet. */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          router.push({
            pathname: "/ledger/new-entry",
            params: partyFilter !== "all" ? { party_id: partyFilter } : {},
          } as any)
        }
        activeOpacity={0.85}
        accessibilityLabel="Add ledger entry"
      >
        <Ionicons name="add" size={22} color={colors.bgSolid} />
        <Text style={styles.fabText}>Add Entry</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── Small chip button used for party filter row ───────────────────
function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Add-entry moved to full-page route /ledger/new-entry (Fix 5) ──

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

  // Fix 2 · filter chips + FAB + modal styles
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: spacing.md,
  },
  recentCount: { color: colors.textDim, fontSize: 11, fontWeight: "700" },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    maxWidth: 180,
  },
  chipActive: { backgroundColor: colors.brandSoft, borderColor: colors.brandBorder },
  chipText: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },
  chipTextActive: { color: colors.brand },
  emptyFiltered: {
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.lg,
  },
  emptyFilteredText: { color: colors.textMuted, fontSize: 12 },
  entryDescRow: { flexDirection: "row", alignItems: "center" },
  fab: {
    position: "absolute",
    right: spacing.lg,
    // sits well above the OPSI orb (~64 px orb + 24 pad + safe margin).
    bottom: 160,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brand,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radii.pill,
    shadowColor: colors.brand,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    elevation: 8,
    zIndex: 20,
  },
  fabText: {
    color: colors.bgSolid,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
    ...(Platform.OS === "web" ? { alignItems: "center" } : {}),
  },
  modalSheet: {
    backgroundColor: colors.bgSolid,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: colors.cardBorder,
    borderRightColor: colors.cardBorder,
    padding: spacing.lg,
    paddingBottom: Platform.OS === "web" ? spacing.lg : 32,
    ...(Platform.OS === "web"
      ? { width: 460, maxWidth: "90%", borderRadius: 20, borderWidth: 1, marginBottom: 32 }
      : {}),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  modalLabel: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: spacing.md,
    marginBottom: 6,
  },
  modalRow: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  segment: {
    flexDirection: "row",
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  segmentText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  modalBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: radii.pill,
  },
  modalBtnGhost: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalBtnGhostText: { color: colors.textMuted, fontSize: 13, fontWeight: "700" },
  modalBtnPrimary: { backgroundColor: colors.brand },
  modalBtnPrimaryText: { color: colors.bgSolid, fontSize: 13, fontWeight: "800" },
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
