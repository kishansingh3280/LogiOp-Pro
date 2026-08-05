import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useApi } from "@/src/api/hooks";
import type { LedgerEntry, LedgerSummary, Party } from "@/src/api/types";
import { Card } from "@/src/components/ui";
import { colors, radii, spacing } from "@/src/theme";
import { fmtCurrency, shortDate } from "@/src/utils/format";

type Tab = "summary" | "get" | "give" | "entries";

export default function LedgerScreen() {
  const router = useRouter();
  const summary = useApi<LedgerSummary>("/api/dashboard/ledger-summary");
  const entries = useApi<LedgerEntry[]>("/api/ledger/entries");
  const parties = useApi<Party[]>("/api/parties");
  const [tab, setTab] = useState<Tab>("summary");

  const partyMap = useMemo(() => {
    const m: Record<string, Party> = {};
    (parties.data || []).forEach((p) => (m[p.id] = p));
    return m;
  }, [parties.data]);

  const sortedEntries = useMemo(
    () => (entries.data || []).slice().sort((a, b) => (a.date > b.date ? -1 : 1)),
    [entries.data],
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Ledger</Text>
          <Text style={styles.subtitle}>Snapshot &amp; entries</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {(["summary", "get", "give", "entries"] as Tab[]).map((t) => {
          const active = tab === t;
          const label = t === "summary" ? "Summary" : t === "get" ? "You will get" : t === "give" ? "You will give" : "Entries";
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[styles.chip, active && styles.chipActive]}
              testID={`ledger-tab-${t}`}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {tab === "summary" && (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={summary.loading} onRefresh={summary.refresh} tintColor={colors.lime} />
          }
        >
          <View style={styles.summaryRow}>
            <Card style={styles.summaryCard}>
              <View style={styles.dotRow}>
                <View style={[styles.dot, { backgroundColor: colors.ok }]} />
                <Text style={styles.summaryLbl}>You will get</Text>
              </View>
              <Text style={styles.summaryBig}>{fmtCurrency(summary.data?.receivable.inr, "INR")}</Text>
              <Text style={styles.summaryAlt}>{fmtCurrency(summary.data?.receivable.thb, "THB")}</Text>
            </Card>
            <View style={{ width: spacing.md }} />
            <Card style={styles.summaryCard}>
              <View style={styles.dotRow}>
                <View style={[styles.dot, { backgroundColor: colors.danger }]} />
                <Text style={styles.summaryLbl}>You will give</Text>
              </View>
              <Text style={styles.summaryBig}>{fmtCurrency(summary.data?.payable.inr, "INR")}</Text>
              <Text style={styles.summaryAlt}>{fmtCurrency(summary.data?.payable.thb, "THB")}</Text>
            </Card>
          </View>

          <Card style={{ marginTop: spacing.md }}>
            <Text style={styles.sectionTitle}>Top receivables</Text>
            {(summary.data?.top_get || []).length === 0 ? (
              <Text style={styles.dim}>All clear</Text>
            ) : (
              (summary.data?.top_get || []).map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={styles.topRow}
                  onPress={() => router.push(`/party/${r.id}` as never)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topName}>{r.name}</Text>
                    <Text style={styles.topSub}>
                      {fmtCurrency(r.inr, "INR")} · {fmtCurrency(r.thb, "THB")}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
                </TouchableOpacity>
              ))
            )}
          </Card>

          <Card style={{ marginTop: spacing.md }}>
            <Text style={styles.sectionTitle}>Top payables</Text>
            {(summary.data?.top_give || []).length === 0 ? (
              <Text style={styles.dim}>All clear</Text>
            ) : (
              (summary.data?.top_give || []).map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={styles.topRow}
                  onPress={() => router.push(`/party/${r.id}` as never)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topName}>{r.name}</Text>
                    <Text style={styles.topSub}>
                      {fmtCurrency(r.inr, "INR")} · {fmtCurrency(r.thb, "THB")}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
                </TouchableOpacity>
              ))
            )}
          </Card>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {(tab === "get" || tab === "give") && (
        <FlatList
          data={tab === "get" ? summary.data?.top_get || [] : summary.data?.top_give || []}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListEmptyComponent={<Text style={styles.dim}>Nothing here</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => router.push(`/party/${item.id}` as never)} testID={`bal-row-${item.id}`}>
              <Card>
                <Text style={styles.topName}>{item.name}</Text>
                <View style={styles.balRow}>
                  <View style={styles.balPill}>
                    <Text style={styles.balPillLabel}>INR</Text>
                    <Text style={[styles.balPillVal, { color: tab === "get" ? colors.ok : colors.danger }]}>
                      {fmtCurrency(item.inr, "INR")}
                    </Text>
                  </View>
                  <View style={styles.balPill}>
                    <Text style={styles.balPillLabel}>THB</Text>
                    <Text style={[styles.balPillVal, { color: tab === "get" ? colors.ok : colors.danger }]}>
                      {fmtCurrency(item.thb, "THB")}
                    </Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}

      {tab === "entries" && (
        <FlatList
          data={sortedEntries}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          refreshControl={
            <RefreshControl refreshing={entries.loading} onRefresh={entries.refresh} tintColor={colors.lime} />
          }
          ListEmptyComponent={<Text style={styles.dim}>No entries yet</Text>}
          renderItem={({ item }) => {
            const p = partyMap[item.party_id];
            const cur = p?.default_currency || "INR";
            return (
              <TouchableOpacity
                onPress={() => (p ? router.push(`/party/${p.id}` as never) : null)}
                testID={`entry-row-${item.id}`}
              >
                <Card>
                  <View style={styles.entryTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.entryDesc}>{item.description}</Text>
                      <Text style={styles.entrySub}>
                        {p?.name || "Unknown"} · {shortDate(item.date)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.entryAmt,
                        { color: item.debit > 0 ? colors.ok : colors.danger },
                      ]}
                    >
                      {item.debit > 0 ? `+${fmtCurrency(item.debit, cur)}` : `-${fmtCurrency(item.credit, cur)}`}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
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
  chipRow: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
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
  chipText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: colors.bg },
  content: { padding: spacing.lg },
  summaryRow: { flexDirection: "row" },
  summaryCard: { flex: 1 },
  dotRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  summaryLbl: { color: colors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 },
  summaryBig: { color: colors.text, fontSize: 22, fontWeight: "800", marginTop: 6 },
  summaryAlt: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  sectionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  dim: { color: colors.textDim, fontSize: 13, padding: spacing.md, textAlign: "center" },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  topName: { color: colors.text, fontSize: 14, fontWeight: "700" },
  topSub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  balRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  balPill: {
    flex: 1,
    backgroundColor: colors.chipBg,
    borderRadius: radii.md,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    alignItems: "center",
  },
  balPillLabel: { color: colors.textDim, fontSize: 10, textTransform: "uppercase" },
  balPillVal: { fontSize: 14, fontWeight: "800", marginTop: 4 },
  entryTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  entryDesc: { color: colors.text, fontSize: 14, fontWeight: "600" },
  entrySub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  entryAmt: { fontSize: 14, fontWeight: "800" },
});
