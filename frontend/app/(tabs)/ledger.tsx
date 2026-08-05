import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useApi } from "@/src/api/hooks";
import type { LedgerEntry, Party } from "@/src/api/types";
import { colors, radii, spacing } from "@/src/theme";
import { fmtCurrency } from "@/src/utils/format";

type Role = "all" | "customer" | "supplier" | "carrier";

/**
 * Khatabook-style ledger:
 * - Big summary widget with INR + THB Receivable / Payable
 * - Search + role chips
 * - Full party list with balance and last-activity
 * - FAB opens quick "Add entry" flow (party picker → entry form)
 */
export default function LedgerScreen() {
  const router = useRouter();
  const parties = useApi<Party[]>("/api/parties");
  const entries = useApi<LedgerEntry[]>("/api/ledger/entries");

  const [q, setQ] = useState("");
  const [role, setRole] = useState<Role>("all");
  const [showAllReceivables, setShowAllReceivables] = useState(false);
  const [showAllPayables, setShowAllPayables] = useState(false);
  const [pickForFab, setPickForFab] = useState(false);

  // Compute per-party balance in party.default_currency
  const perParty = useMemo(() => {
    const map: Record<string, { last?: string; debit: number; credit: number; balance: number }> = {};
    for (const e of entries.data || []) {
      const b = (map[e.party_id] ||= { debit: 0, credit: 0, balance: 0 });
      b.debit += e.debit || 0;
      b.credit += e.credit || 0;
      b.balance = b.debit - b.credit;
      if (!b.last || e.date > b.last) b.last = e.date;
    }
    return map;
  }, [entries.data]);

  // Totals split by currency
  const totals = useMemo(() => {
    let recInr = 0,
      payInr = 0,
      recThb = 0,
      payThb = 0;
    for (const p of parties.data || []) {
      const bal = perParty[p.id]?.balance || 0;
      const cur = p.default_currency;
      if (bal >= 0) {
        if (cur === "INR") recInr += bal;
        else recThb += bal;
      } else {
        if (cur === "INR") payInr += -bal;
        else payThb += -bal;
      }
    }
    return { recInr, payInr, recThb, payThb };
  }, [parties.data, perParty]);

  const filtered = useMemo(() => {
    let list = parties.data || [];
    if (role !== "all") list = list.filter((p) => p.role === role);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (p) => (p.name || "").toLowerCase().includes(needle) || (p.phone || "").toLowerCase().includes(needle),
      );
    }
    // Sort: highest absolute balance first
    return list.sort((a, b) => Math.abs(perParty[b.id]?.balance || 0) - Math.abs(perParty[a.id]?.balance || 0));
  }, [parties.data, role, q, perParty]);

  const receivables = useMemo(
    () =>
      filtered
        .filter((p) => (perParty[p.id]?.balance || 0) > 0)
        .sort((a, b) => (perParty[b.id]?.balance || 0) - (perParty[a.id]?.balance || 0)),
    [filtered, perParty],
  );

  const payables = useMemo(
    () =>
      filtered
        .filter((p) => (perParty[p.id]?.balance || 0) < 0)
        .sort((a, b) => (perParty[a.id]?.balance || 0) - (perParty[b.id]?.balance || 0)),
    [filtered, perParty],
  );

  const loading = parties.loading || entries.loading;
  const refresh = () => {
    parties.refresh();
    entries.refresh();
  };

  const shownReceivables = showAllReceivables ? receivables : receivables.slice(0, 3);
  const shownPayables = showAllPayables ? payables : payables.slice(0, 3);

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Ledger</Text>
          <Text style={styles.subtitle}>{parties.data?.length || 0} parties · tap to view or add entry</Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.lime} />}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            {/* Big totals widget */}
            <View style={styles.totalsCard} testID="ledger-totals">
              <View style={styles.totalsRow}>
                <View style={[styles.totalsCol, { borderRightColor: colors.border, borderRightWidth: StyleSheet.hairlineWidth }]}>
                  <View style={styles.dotRow}>
                    <View style={[styles.dot, { backgroundColor: colors.ok }]} />
                    <Text style={styles.totalsLbl}>You will get</Text>
                  </View>
                  <Text style={[styles.totalsBig, { color: colors.ok }]}>{fmtCurrency(totals.recInr, "INR")}</Text>
                  <Text style={styles.totalsAlt}>{fmtCurrency(totals.recThb, "THB")}</Text>
                </View>
                <View style={styles.totalsCol}>
                  <View style={styles.dotRow}>
                    <View style={[styles.dot, { backgroundColor: colors.danger }]} />
                    <Text style={styles.totalsLbl}>You will give</Text>
                  </View>
                  <Text style={[styles.totalsBig, { color: colors.danger }]}>{fmtCurrency(totals.payInr, "INR")}</Text>
                  <Text style={styles.totalsAlt}>{fmtCurrency(totals.payThb, "THB")}</Text>
                </View>
              </View>
              <View style={styles.netRow}>
                <Text style={styles.netLbl}>Net position</Text>
                <Text style={[styles.netVal, { color: totals.recInr - totals.payInr >= 0 ? colors.ok : colors.danger }]}>
                  {fmtCurrency(totals.recInr - totals.payInr, "INR")} · {fmtCurrency(totals.recThb - totals.payThb, "THB")}
                </Text>
              </View>
            </View>

            {/* Top receivables collapsed */}
            {receivables.length > 0 && (
              <View style={styles.section} testID="top-receivables">
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>Top receivables</Text>
                  {receivables.length > 3 ? (
                    <TouchableOpacity onPress={() => setShowAllReceivables((x) => !x)} testID="toggle-receivables">
                      <Text style={styles.link}>
                        {showAllReceivables ? "Show top 3" : `Show all (${receivables.length})`}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                {shownReceivables.map((p) => (
                  <MiniRow
                    key={p.id}
                    p={p}
                    balance={perParty[p.id]?.balance || 0}
                    last={perParty[p.id]?.last}
                    tint={colors.ok}
                    onPress={() => router.push(`/party/${p.id}` as never)}
                  />
                ))}
              </View>
            )}

            {/* Top payables collapsed */}
            {payables.length > 0 && (
              <View style={styles.section} testID="top-payables">
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>Top payables</Text>
                  {payables.length > 3 ? (
                    <TouchableOpacity onPress={() => setShowAllPayables((x) => !x)} testID="toggle-payables">
                      <Text style={styles.link}>{showAllPayables ? "Show top 3" : `Show all (${payables.length})`}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                {shownPayables.map((p) => (
                  <MiniRow
                    key={p.id}
                    p={p}
                    balance={perParty[p.id]?.balance || 0}
                    last={perParty[p.id]?.last}
                    tint={colors.danger}
                    onPress={() => router.push(`/party/${p.id}` as never)}
                  />
                ))}
              </View>
            )}

            {/* All parties header + filters */}
            <View style={styles.allHeader}>
              <Text style={styles.sectionTitle}>All parties</Text>
              <Text style={styles.smallDim}>{filtered.length} shown</Text>
            </View>

            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color={colors.textDim} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search party by name or phone…"
                placeholderTextColor={colors.textDim}
                value={q}
                onChangeText={setQ}
                testID="ledger-parties-search"
              />
              {q ? (
                <TouchableOpacity onPress={() => setQ("")}>
                  <Ionicons name="close-circle" size={16} color={colors.textDim} />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
              style={{ flexGrow: 0 }}
            >
              {(["all", "customer", "supplier", "carrier"] as Role[]).map((r) => {
                const active = role === r;
                return (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRole(r)}
                    style={[styles.chip, active && styles.chipActive]}
                    testID={`ledger-role-${r}`}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{r}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        }
        renderItem={({ item }) => {
          const bal = perParty[item.id]?.balance || 0;
          const last = perParty[item.id]?.last;
          const isGet = bal > 0;
          const isGive = bal < 0;
          return (
            <TouchableOpacity
              onPress={() => router.push(`/party/${item.id}` as never)}
              activeOpacity={0.85}
              testID={`ledger-party-${item.id}`}
            >
              <View style={styles.partyCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(item.name || "?").slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.partyName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.partyMeta} numberOfLines={1}>
                    {item.role} · {item.country}
                    {last ? ` · Last activity ${last}` : " · No activity yet"}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={[
                      styles.balAmount,
                      { color: isGet ? colors.ok : isGive ? colors.danger : colors.textDim },
                    ]}
                  >
                    {fmtCurrency(Math.abs(bal), item.default_currency)}
                  </Text>
                  <Text
                    style={[
                      styles.balTag,
                      { color: isGet ? colors.ok : isGive ? colors.danger : colors.textDim },
                    ]}
                  >
                    {isGet ? "You'll get" : isGive ? "You'll give" : "Settled"}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="people-outline" size={40} color={colors.textDim} />
            <Text style={styles.emptyTitle}>No parties found</Text>
            <Text style={styles.emptySub}>Try clearing filters or add a new party</Text>
          </View>
        }
      />

      {/* Floating action button — quick add entry */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setPickForFab(true)}
        activeOpacity={0.9}
        testID="fab-add-entry"
      >
        <Ionicons name="add" size={28} color={colors.bg} />
        <Text style={styles.fabText}>Add entry</Text>
      </TouchableOpacity>

      {pickForFab && (
        <Pressable style={styles.backdrop} onPress={() => setPickForFab(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Add entry — choose party</Text>

            <TouchableOpacity
              style={styles.newPartyRow}
              onPress={() => {
                setPickForFab(false);
                router.push("/party/new");
              }}
              testID="fab-new-party"
            >
              <View style={styles.newPartyIcon}>
                <Ionicons name="person-add-outline" size={18} color={colors.lime} />
              </View>
              <Text style={styles.newPartyText}>New party</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
            </TouchableOpacity>

            <ScrollView style={{ maxHeight: 460 }} keyboardShouldPersistTaps="handled">
              {(parties.data || []).map((p) => {
                const bal = perParty[p.id]?.balance || 0;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.pickRow}
                    onPress={() => {
                      setPickForFab(false);
                      router.push(`/entry/new?party_id=${p.id}` as never);
                    }}
                    testID={`fab-pick-party-${p.id}`}
                  >
                    <View style={styles.pickAvatar}>
                      <Text style={styles.pickAvatarText}>{(p.name || "?").slice(0, 1).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickName}>{p.name}</Text>
                      <Text style={styles.pickMeta}>{p.role} · {p.country}</Text>
                    </View>
                    <Text
                      style={[
                        styles.pickBal,
                        { color: bal > 0 ? colors.ok : bal < 0 ? colors.danger : colors.textDim },
                      ]}
                    >
                      {fmtCurrency(Math.abs(bal), p.default_currency)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setPickForFab(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

function MiniRow({
  p,
  balance,
  last,
  tint,
  onPress,
}: {
  p: Party;
  balance: number;
  last?: string;
  tint: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.miniRow} activeOpacity={0.85} testID={`mini-${p.id}`}>
      <View style={styles.miniAvatar}>
        <Text style={styles.miniAvatarText}>{(p.name || "?").slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.miniName}>{p.name}</Text>
        <Text style={styles.miniMeta}>
          {p.role}
          {last ? ` · ${last}` : ""}
        </Text>
      </View>
      <Text style={[styles.miniBal, { color: tint }]}>{fmtCurrency(Math.abs(balance), p.default_currency)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: { color: colors.text, fontSize: 26, fontWeight: "800" },
  subtitle: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  sep: { height: spacing.sm },

  // Totals widget
  totalsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    overflow: "hidden",
  },
  totalsRow: { flexDirection: "row" },
  totalsCol: { flex: 1, padding: spacing.lg },
  dotRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  totalsLbl: { color: colors.textMuted, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" },
  totalsBig: { fontSize: 22, fontWeight: "800" },
  totalsAlt: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  netRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: "#080808",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  netLbl: { color: colors.textDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: "700" },
  netVal: { fontSize: 13, fontWeight: "800" },

  // Section (top receivables / payables)
  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6 },
  link: { color: colors.lime, fontSize: 12, fontWeight: "700" },
  miniRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.chipBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  miniAvatarText: { color: colors.textMuted, fontWeight: "800", fontSize: 13 },
  miniName: { color: colors.text, fontSize: 14, fontWeight: "700" },
  miniMeta: { color: colors.textDim, fontSize: 11, marginTop: 2, textTransform: "capitalize" },
  miniBal: { fontSize: 14, fontWeight: "800" },

  // All parties
  allHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  smallDim: { color: colors.textDim, fontSize: 12 },
  searchWrap: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, paddingVertical: 0 },
  chipRow: { paddingBottom: spacing.md, gap: spacing.sm },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.chipBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  chipText: { color: colors.textMuted, fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  chipTextActive: { color: colors.bg },

  partyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.limeGlow,
    alignItems: "center",
    justifyContent: "center",
    borderColor: colors.lime,
    borderWidth: 1,
  },
  avatarText: { color: colors.lime, fontWeight: "800", fontSize: 18 },
  partyName: { color: colors.text, fontSize: 16, fontWeight: "700" },
  partyMeta: { color: colors.textDim, fontSize: 12, marginTop: 2, textTransform: "capitalize" },
  balAmount: { fontSize: 15, fontWeight: "800" },
  balTag: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 },
  emptyBox: { padding: spacing.xxl, alignItems: "center", gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 8 },
  emptySub: { color: colors.textDim, fontSize: 13, textAlign: "center" },

  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg + 60,
    backgroundColor: colors.lime,
    paddingHorizontal: 18,
    height: 52,
    borderRadius: 26,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    shadowColor: colors.lime,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  fabText: { color: colors.bg, fontWeight: "800", fontSize: 14, letterSpacing: 0.3 },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.lg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing.md },
  sheetTitle: { color: colors.text, fontSize: 16, fontWeight: "800", marginBottom: spacing.md },
  newPartyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 12,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
  },
  newPartyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.limeGlow,
    borderWidth: 1,
    borderColor: colors.lime,
  },
  newPartyText: { flex: 1, color: colors.lime, fontWeight: "800", fontSize: 15 },
  pickRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: spacing.md,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pickAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.chipBg,
    alignItems: "center",
    justifyContent: "center",
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pickAvatarText: { color: colors.textMuted, fontWeight: "800", fontSize: 14 },
  pickName: { color: colors.text, fontSize: 15, fontWeight: "700" },
  pickMeta: { color: colors.textDim, fontSize: 12, marginTop: 2, textTransform: "capitalize" },
  pickBal: { fontSize: 14, fontWeight: "800" },
  sheetCancel: {
    marginTop: spacing.md,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.chipBg,
  },
  sheetCancelText: { color: colors.text, fontWeight: "700" },
});
