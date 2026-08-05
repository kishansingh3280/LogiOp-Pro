import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useApi } from "@/src/api/hooks";
import type { LedgerEntry, Party } from "@/src/api/types";
import { Card } from "@/src/components/ui";
import { useIsTablet } from "@/src/hooks/use-is-tablet";
import { colors, radii, spacing } from "@/src/theme";
import { fmtCurrency } from "@/src/utils/format";

import PartyDetail from "../party/[id]";

const ROLES = ["all", "customer", "supplier", "carrier", "vendor"] as const;

export default function PartiesScreen() {
  const router = useRouter();
  const tablet = useIsTablet();
  const parties = useApi<Party[]>("/api/parties");
  const ledger = useApi<LedgerEntry[]>("/api/ledger/entries");
  const [role, setRole] = useState<(typeof ROLES)[number]>("all");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const balances = useMemo(() => {
    const map: Record<string, { inr: number; thb: number }> = {};
    for (const e of ledger.data || []) {
      const b = (map[e.party_id] ||= { inr: 0, thb: 0 });
      // Debit - Credit = balance receivable in party.default_currency
      b.inr += 0; // placeholder to keep shape; we compute below
      const delta = (e.debit || 0) - (e.credit || 0);
      const party = (parties.data || []).find((p) => p.id === e.party_id);
      const cur = party?.default_currency || "INR";
      if (cur === "INR") b.inr += delta;
      else b.thb += delta;
    }
    return map;
  }, [ledger.data, parties.data]);

  const list = useMemo(() => {
    let items = parties.data || [];
    if (role !== "all") items = items.filter((p) => p.role === role);
    if (q.trim()) {
      const n = q.trim().toLowerCase();
      items = items.filter(
        (p) => p.name.toLowerCase().includes(n) || (p.phone || "").toLowerCase().includes(n),
      );
    }
    return items;
  }, [parties.data, role, q]);

  const currentId = selectedId || list[0]?.id || null;

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Parties</Text>
          <Text style={styles.subtitle}>{list.length} of {parties.data?.length || 0}</Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={() => router.push("/party/new")} testID="new-party-btn">
          <Ionicons name="add" size={18} color={colors.bg} />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textDim} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name or phone…"
          placeholderTextColor={colors.textDim}
          value={q}
          onChangeText={setQ}
          testID="parties-search"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={{ flexGrow: 0 }}
      >
        {ROLES.map((r) => {
          const active = role === r;
          return (
            <TouchableOpacity
              key={r}
              onPress={() => setRole(r)}
              style={[styles.chip, active && styles.chipActive]}
              testID={`role-${r}`}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{r}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.body, tablet && styles.bodyTablet]}>
        <View style={[styles.listCol, tablet && styles.listColTablet]}>
          <FlatList
            data={list}
            keyExtractor={(i) => i.id}
            ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={parties.loading} onRefresh={parties.refresh} tintColor={colors.lime} />
            }
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="people-outline" size={40} color={colors.textDim} />
                <Text style={styles.emptyTitle}>No parties</Text>
              </View>
            }
            renderItem={({ item }) => {
              const bal = balances[item.id] || { inr: 0, thb: 0 };
              const val = item.default_currency === "INR" ? bal.inr : bal.thb;
              return (
                <TouchableOpacity
                  onPress={() => {
                    if (tablet) setSelectedId(item.id);
                    else router.push(`/party/${item.id}` as never);
                  }}
                  testID={`party-row-${item.id}`}
                >
                  <Card style={[styles.rowCard, tablet && currentId === item.id && styles.rowCardActive]}>
                    <View style={styles.rowTop}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{item.name.slice(0, 1).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.role}>
                          {item.role} · {item.country}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={[styles.balance, { color: val >= 0 ? colors.ok : colors.danger }]}>
                          {fmtCurrency(Math.abs(val), item.default_currency)}
                        </Text>
                        <Text style={styles.balanceLbl}>{val >= 0 ? "get" : "give"}</Text>
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {tablet ? (
          <View style={styles.detailCol}>
            {currentId ? (
              <PartyDetail idOverride={currentId} embedded />
            ) : (
              <View style={styles.emptyBox}>
                <Ionicons name="person-outline" size={40} color={colors.textDim} />
                <Text style={styles.emptyTitle}>Select a party</Text>
              </View>
            )}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: { color: colors.text, fontSize: 26, fontWeight: "800" },
  subtitle: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  newBtn: {
    backgroundColor: colors.lime,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  newBtnText: { color: colors.bg, fontWeight: "800", fontSize: 13 },
  searchWrap: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, paddingVertical: 0 },
  chipRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
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
  body: { flex: 1 },
  bodyTablet: { flexDirection: "row", alignItems: "stretch" },
  listCol: { flex: 1 },
  listColTablet: {
    flex: 0,
    flexBasis: 420,
    flexGrow: 0,
    flexShrink: 0,
    width: 420,
    borderRightColor: colors.border,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  detailCol: { flex: 1, minWidth: 0 },
  rowCard: { padding: spacing.lg },
  rowCardActive: { borderColor: colors.lime, backgroundColor: colors.limeGlow },
  rowTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.limeGlow,
    borderWidth: 1,
    borderColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.lime, fontWeight: "800", fontSize: 18 },
  name: { color: colors.text, fontSize: 16, fontWeight: "700" },
  role: { color: colors.textDim, fontSize: 12, textTransform: "capitalize", marginTop: 2 },
  balance: { fontSize: 15, fontWeight: "800" },
  balanceLbl: { color: colors.textDim, fontSize: 10, textTransform: "uppercase", marginTop: 2 },
  emptyBox: { padding: spacing.xxl, alignItems: "center", gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 8 },
});
