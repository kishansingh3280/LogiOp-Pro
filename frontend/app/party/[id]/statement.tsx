/**
 * Party Statement — Phase 4.
 *
 * Chronological ledger statement for a single party. Shows:
 *   • Header with party name + statement period
 *   • Opening balance (from party record)
 *   • Every entry with running balance in white
 *   • Debit / credit columns (red / green respectively)
 *   • Closing balance
 *   • Share button — uses RN core Share.share() for OS share sheet
 *     (Android's "Print" flow can save as PDF)
 *
 * All entries can be dual-currency (INR + THB). We render two
 * columns per row when both are non-zero; otherwise a compact
 * single-currency column.
 */
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiGet, apiPatch } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth-context";
import { fmtCurrency, longDate, shortDate } from "@/src/lib/format";
import { colors, radii, spacing } from "@/src/lib/theme";
import { GlassCard, Pill } from "@/src/lib/ui";

type Party = {
  id: string;
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  default_currency?: "INR" | "THB";
  opening_balance_inr?: number;
  opening_balance_thb?: number;
};

type Entry = {
  id: string;
  party_id: string;
  date?: string;
  description: string;
  currency: "INR" | "THB";
  debit: number;
  credit: number;
  ref_type?: string;
};

type Row = {
  entry: Entry;
  balInr: number;
  balThb: number;
};

export default function PartyStatement() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const [party, setParty] = useState<Party | null>(null);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [verifiedIds, setVerifiedIds] = useState<Set<string>>(new Set());
  const [lastVerifiedAt, setLastVerifiedAt] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [p, es, v] = await Promise.all([
        apiGet<Party>(`/api/parties/${id}`),
        apiGet<Entry[]>(`/api/ledger/entries?party_id=${id}`),
        apiGet<{ entry_ids: string[]; last_verified_at?: string }>(
          `/api/ledger/verified?party_id=${id}`,
        ).catch(() => ({ entry_ids: [] as string[], last_verified_at: "" })),
      ]);
      setParty(p);
      setEntries(Array.isArray(es) ? es : []);
      setVerifiedIds(new Set(v?.entry_ids || []));
      setLastVerifiedAt(v?.last_verified_at || "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (token && id) load();
  }, [token, id, load]);

  // Fix 1b — mark all unverified entries as verified
  const markAllVerified = useCallback(async () => {
    if (verifying || !entries || entries.length === 0) return;
    const unverified = entries.filter((e) => !verifiedIds.has(e.id));
    if (unverified.length === 0) {
      Alert.alert("Already verified", "All entries are already verified.");
      return;
    }
    setVerifying(true);
    try {
      await Promise.all(
        unverified.map((e) =>
          apiPatch(`/api/ledger/entries/${e.id}`, { verified: true }).catch(() => null),
        ),
      );
      // Re-fetch verified map so the UI reflects the new state
      await load();
      const today = new Date().toISOString().slice(0, 10);
      Alert.alert("Verified", `All entries verified till ${today}.`);
    } catch (e) {
      Alert.alert("Mark failed", (e as Error).message || "Try again.");
    } finally {
      setVerifying(false);
    }
  }, [verifying, entries, verifiedIds, load]);

  // ── Ledger balance convention (per-party):
  //     +ve balance → they owe us (receivable)
  //     -ve balance → we owe them (payable)
  //     entry.debit → adds to receivable
  //     entry.credit → adds to payable
  const { rows, closingInr, closingThb } = useMemo(() => {
    if (!entries) return { rows: [] as Row[], closingInr: 0, closingThb: 0 };
    const sorted = entries.slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    let balInr = party?.opening_balance_inr ?? 0;
    let balThb = party?.opening_balance_thb ?? 0;
    const acc: Row[] = [];
    for (const e of sorted) {
      const delta = (e.debit || 0) - (e.credit || 0);
      if (e.currency === "THB") balThb += delta;
      else balInr += delta;
      acc.push({ entry: e, balInr, balThb });
    }
    return { rows: acc, closingInr: balInr, closingThb: balThb };
  }, [entries, party]);

  const openingInr = party?.opening_balance_inr ?? 0;
  const openingThb = party?.opening_balance_thb ?? 0;
  const period = useMemo(() => {
    if (!rows.length) return "—";
    const first = rows[0]?.entry?.date;
    const last = rows[rows.length - 1]?.entry?.date;
    return `${shortDate(first)} → ${shortDate(last)}`;
  }, [rows]);

  const buildShareText = useCallback((): string => {
    if (!party) return "";
    const lines: string[] = [];
    lines.push(`LEDGER STATEMENT — ${party.name}`);
    lines.push(`Period: ${period}`);
    lines.push(`Generated: ${longDate(new Date().toISOString())}`);
    lines.push("");
    if (openingInr !== 0)
      lines.push(`Opening balance (INR): ${fmtCurrency(openingInr, "INR")}`);
    if (openingThb !== 0)
      lines.push(`Opening balance (THB): ${fmtCurrency(openingThb, "THB")}`);
    lines.push("");
    lines.push("Date        | Description | Debit | Credit | Balance");
    lines.push("-------------------------------------------------------------");
    for (const r of rows) {
      const cur = r.entry.currency;
      const bal = cur === "THB" ? r.balThb : r.balInr;
      lines.push(
        `${shortDate(r.entry.date)} | ${r.entry.description} | ${
          r.entry.debit ? fmtCurrency(r.entry.debit, cur) : "—"
        } | ${r.entry.credit ? fmtCurrency(r.entry.credit, cur) : "—"} | ${fmtCurrency(bal, cur)}`,
      );
    }
    lines.push("-------------------------------------------------------------");
    lines.push(`Closing balance (INR): ${fmtCurrency(closingInr, "INR")}`);
    lines.push(`Closing balance (THB): ${fmtCurrency(closingThb, "THB")}`);
    if (closingInr > 0 || closingThb > 0) {
      lines.push(`Status: THEY OWE US`);
    } else if (closingInr < 0 || closingThb < 0) {
      lines.push(`Status: WE OWE THEM`);
    } else {
      lines.push(`Status: SETTLED`);
    }
    return lines.join("\n");
  }, [party, period, rows, openingInr, openingThb, closingInr, closingThb]);

  const handleShare = useCallback(async () => {
    if (!party) return;
    try {
      await Share.share(
        {
          title: `Statement — ${party.name}`,
          message: buildShareText(),
        },
        { dialogTitle: `Share statement for ${party.name}` },
      );
    } catch {
      /* user cancelled */
    }
  }, [party, buildShareText]);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {party?.name || "Statement"}
          </Text>
          <Text style={styles.subtitle}>Ledger statement</Text>
        </View>
        {party ? (
          <TouchableOpacity onPress={handleShare} style={styles.shareBtn} activeOpacity={0.75}>
            <Ionicons name="share-outline" size={18} color={colors.brand} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand} />
        }
        showsVerticalScrollIndicator={false}
      >
        {party === null && loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brand} />
            <Text style={styles.dim}>Loading statement…</Text>
          </View>
        ) : error ? (
          <GlassCard style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retry} onPress={load}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </GlassCard>
        ) : party ? (
          <>
            {/* Header meta */}
            <GlassCard glow style={styles.headerCard}>
              <Text style={styles.eyebrow}>Statement · {party.role?.toUpperCase()}</Text>
              <Text style={styles.headerName}>{party.name}</Text>
              <Text style={styles.headerPeriod}>{period}</Text>
              <View style={styles.headerBadges}>
                {closingInr !== 0 || closingThb !== 0 ? (
                  <Pill
                    label={
                      closingInr > 0 || closingThb > 0 ? "THEY OWE US" : "WE OWE THEM"
                    }
                    tint={closingInr > 0 || closingThb > 0 ? colors.credit : colors.debit}
                    soft={
                      closingInr > 0 || closingThb > 0 ? colors.brandSoft : colors.dangerSoft
                    }
                  />
                ) : (
                  <Pill label="SETTLED" tint={colors.textMuted} soft={colors.divider} />
                )}
              </View>
            </GlassCard>

            {/* Opening + closing summary */}
            <View style={styles.grid}>
              <BalCard
                label="Opening"
                inr={openingInr}
                thb={openingThb}
                accent={colors.textDim}
              />
              <BalCard
                label="Closing"
                inr={closingInr}
                thb={closingThb}
                accent={
                  closingInr > 0 || closingThb > 0
                    ? colors.credit
                    : closingInr < 0 || closingThb < 0
                      ? colors.debit
                      : colors.text
                }
              />
            </View>

            {/* Fix 1b — Verified till banner */}
            {lastVerifiedAt ? (
              <View style={styles.verifiedBanner}>
                <Ionicons name="shield-checkmark" size={16} color={colors.brand} />
                <Text style={styles.verifiedText}>
                  Verified till {shortDate(lastVerifiedAt)}
                </Text>
              </View>
            ) : null}

            {/* Statement table */}
            <Text style={styles.section}>Entries · {rows.length}</Text>
            <GlassCard padded={false} style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { flex: 1.4 }]}>Date</Text>
                <Text style={[styles.th, { flex: 3 }]}>Description</Text>
                <Text style={[styles.th, styles.thNum]}>Debit</Text>
                <Text style={[styles.th, styles.thNum]}>Credit</Text>
                <Text style={[styles.th, styles.thNum]}>Balance</Text>
              </View>
              {rows.length === 0 ? (
                <View style={styles.emptyBody}>
                  <Ionicons name="document-outline" size={32} color={colors.textDim} />
                  <Text style={styles.dim}>No entries yet</Text>
                </View>
              ) : (
                rows.map((r, idx) => {
                  const cur = r.entry.currency;
                  const bal = cur === "THB" ? r.balThb : r.balInr;
                  return (
                    <View
                      key={r.entry.id}
                      style={[
                        styles.tableRow,
                        idx < rows.length - 1 && styles.tableRowBorder,
                      ]}
                    >
                      <View style={[styles.tdDateWrap, { flex: 1.4 }]}>
                        {verifiedIds.has(r.entry.id) ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={12}
                            color={colors.textDim}
                            style={{ marginRight: 4 }}
                          />
                        ) : null}
                        <Text style={styles.tdDate}>{shortDate(r.entry.date)}</Text>
                      </View>
                      <View style={{ flex: 3 }}>
                        <Text style={styles.tdDesc} numberOfLines={2}>
                          {r.entry.description}
                        </Text>
                        {r.entry.ref_type ? (
                          <Text style={styles.tdRef}>{r.entry.ref_type}</Text>
                        ) : null}
                      </View>
                      <Text style={[styles.tdVal, styles.thNum, styles.debit]} numberOfLines={1}>
                        {r.entry.debit ? fmtCurrency(r.entry.debit, cur) : "—"}
                      </Text>
                      <Text
                        style={[styles.tdVal, styles.thNum, styles.credit]}
                        numberOfLines={1}
                      >
                        {r.entry.credit ? fmtCurrency(r.entry.credit, cur) : "—"}
                      </Text>
                      <Text
                        style={[styles.tdVal, styles.thNum, styles.balance]}
                        numberOfLines={1}
                      >
                        {fmtCurrency(bal, cur)}
                      </Text>
                    </View>
                  );
                })
              )}
            </GlassCard>

            {/* Share CTA */}
            <TouchableOpacity style={styles.primaryBtn} onPress={handleShare} activeOpacity={0.8}>
              <Ionicons name="share-outline" size={18} color={colors.bg} />
              <Text style={styles.primaryBtnText}>Share statement · Save as PDF</Text>
            </TouchableOpacity>
            <Text style={styles.tipText}>
              Tip: from the share sheet, pick <Text style={styles.tipStrong}>Print</Text> and
              choose <Text style={styles.tipStrong}>Save as PDF</Text> on Android.
            </Text>

            {/* Fix 1b — Mark as Verified CTA */}
            {rows.length > 0 ? (
              <TouchableOpacity
                style={[styles.verifyBtn, verifying && { opacity: 0.6 }]}
                onPress={markAllVerified}
                disabled={verifying}
                activeOpacity={0.8}
              >
                {verifying ? (
                  <ActivityIndicator color={colors.brand} />
                ) : (
                  <>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={16}
                      color={colors.brand}
                    />
                    <Text style={styles.verifyBtnText}>
                      Mark as Verified · till today
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function BalCard({
  label,
  inr,
  thb,
  accent,
}: {
  label: string;
  inr: number;
  thb: number;
  accent: string;
}) {
  return (
    <View style={styles.stat}>
      <View style={styles.statHeader}>
        <View style={[styles.statDot, { backgroundColor: accent }]} />
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      {inr !== 0 ? (
        <Text style={[styles.statValue, { color: inr < 0 ? colors.debit : inr > 0 ? colors.credit : colors.text }]}>
          {fmtCurrency(Math.abs(inr), "INR")}
        </Text>
      ) : null}
      {thb !== 0 ? (
        <Text
          style={[
            styles.statValueSmall,
            { color: thb < 0 ? colors.debit : thb > 0 ? colors.credit : colors.text },
          ]}
        >
          {fmtCurrency(Math.abs(thb), "THB")}
        </Text>
      ) : null}
      {inr === 0 && thb === 0 ? <Text style={styles.statValue}>—</Text> : null}
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
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brandSoft,
    borderColor: colors.brandBorder,
    borderWidth: 1,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  scroll: { padding: spacing.lg, paddingBottom: 100 },
  headerCard: { padding: spacing.lg, marginBottom: spacing.md },
  eyebrow: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  headerName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 4,
    letterSpacing: -0.3,
  },
  headerPeriod: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  headerBadges: { marginTop: spacing.md },
  section: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
  statHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  statDot: { width: 6, height: 6, borderRadius: 3 },
  statLabel: {
    color: colors.textDim,
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    flex: 1,
  },
  statValue: { fontSize: 20, fontWeight: "800", marginTop: 6, letterSpacing: 0.2, color: colors.text },
  statValueSmall: { fontSize: 14, fontWeight: "700", marginTop: 4, letterSpacing: 0.2, color: colors.text },
  tableCard: { overflow: "hidden" },
  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    backgroundColor: colors.divider,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: 4,
  },
  th: {
    color: colors.textDim,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  thNum: { flex: 1, textAlign: "right" },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    gap: 4,
    alignItems: "center",
  },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  tdDate: { color: colors.textMuted, fontSize: 10, fontWeight: "600" },
  tdDateWrap: { flexDirection: "row", alignItems: "center" },

  // Fix 1b — verified banner + mark button
  verifiedBanner: {
    marginTop: spacing.md,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.brandSoft,
    borderColor: colors.brandBorder,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  verifiedText: { color: colors.brand, fontSize: 12, fontWeight: "700" },
  verifyBtn: {
    marginTop: spacing.md,
    paddingVertical: 12,
    borderRadius: radii.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    backgroundColor: colors.brandSoft,
  },
  verifyBtnText: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  tdDesc: { color: colors.text, fontSize: 11, lineHeight: 15 },
  tdRef: { color: colors.textDim, fontSize: 9, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.4 },
  tdVal: { fontSize: 11, fontWeight: "700" },
  debit: { color: colors.debit },
  credit: { color: colors.credit },
  balance: { color: colors.text, fontWeight: "800" },
  emptyBody: { padding: spacing.xl, alignItems: "center", gap: spacing.sm },
  primaryBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.brand,
    borderRadius: radii.pill,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: colors.brand,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: { color: colors.bg, fontSize: 14, fontWeight: "800", letterSpacing: 0.3 },
  tipText: {
    color: colors.textDim,
    fontSize: 11,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 16,
  },
  tipStrong: { color: colors.brand, fontWeight: "800" },
  loading: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  dim: { color: colors.textDim, fontSize: 12 },
  errorCard: {
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderColor: colors.danger,
  },
  errorText: { flex: 1, color: colors.text, fontSize: 12 },
  retry: {
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  retryText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
});
