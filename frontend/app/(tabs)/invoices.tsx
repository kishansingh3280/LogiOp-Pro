import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
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
import type { Invoice, Party } from "@/src/api/types";
import { Card, StatusPill } from "@/src/components/ui";
import { FYLockedButton } from "@/src/components/fy-gate";
import { useIsTablet } from "@/src/hooks/use-is-tablet";
import { colors, radii, spacing } from "@/src/theme";
import { fmtCurrency, shortDate } from "@/src/utils/format";

import InvoiceDetail from "../invoice/[id]";

type InvoiceStatus = Invoice["status"];

const FILTERS: { key: "all" | InvoiceStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "paid", label: "Paid" },
  { key: "cancelled", label: "Cancelled" },
];

/**
 * Invoices screen — dark-glass split-panel that mirrors the Shipments
 * screen. On tablet width the invoice list stays pinned on the left and
 * tapping any row swaps the detail pane on the right, so the operator
 * can flip through invoices without leaving the module. On phone width
 * we fall back to the classic "tap → push detail route" flow.
 */
export default function InvoicesScreen() {
  const router = useRouter();
  const tablet = useIsTablet();
  const invoices = useApi<Invoice[]>("/api/invoices");
  const parties = useApi<Party[]>("/api/parties");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const partyMap = useMemo(() => {
    const m: Record<string, Party> = {};
    (parties.data || []).forEach((p) => (m[p.id] = p));
    return m;
  }, [parties.data]);

  const list = useMemo(() => {
    let items = (invoices.data || []).slice();
    if (filter !== "all") items = items.filter((i) => i.status === filter);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      items = items.filter(
        (i) =>
          (i.number || "").toLowerCase().includes(needle) ||
          (partyMap[i.party_id]?.name || "").toLowerCase().includes(needle),
      );
    }
    return items.sort((a, b) => (a.date > b.date ? -1 : 1));
  }, [invoices.data, filter, q, partyMap]);

  // For tablet: default select first invoice so the detail pane isn't empty.
  const currentId = selectedId || list[0]?.id || null;

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Invoices</Text>
          <Text style={styles.subtitle}>
            {list.length} of {invoices.data?.length || 0}
          </Text>
        </View>
        <FYLockedButton
          style={styles.newBtn}
          onPress={() => router.push("/invoice/new")}
          testID="new-invoice-btn"
          accessibilityLabel="New invoice"
        >
          <Ionicons name="add" size={18} color={colors.bg} />
          <Text style={styles.newBtnText}>New</Text>
        </FYLockedButton>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textDim} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search invoice # or party…"
          placeholderTextColor={colors.textDim}
          value={q}
          onChangeText={setQ}
          testID="invoices-search"
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
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.chip, active && styles.chipActive]}
              testID={`invoice-filter-${f.key}`}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.body, tablet && styles.bodyTablet]}>
        <View style={[styles.listCol, tablet && styles.listColTablet]}>
          <FlatList
            data={list}
            keyExtractor={(i) => i.id}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
            refreshControl={
              <RefreshControl
                refreshing={invoices.loading}
                onRefresh={invoices.refresh}
                tintColor={colors.lime}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="document-text-outline" size={40} color={colors.textDim} />
                <Text style={styles.emptyTitle}>No invoices</Text>
                <Text style={styles.emptySub}>Tap "New" to create your first invoice</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  if (tablet) setSelectedId(item.id);
                  else router.push(`/invoice/${item.id}` as never);
                }}
                testID={`invoice-row-${item.id}`}
              >
                <Card
                  style={[
                    styles.rowCard,
                    tablet && currentId === item.id && styles.rowCardActive,
                  ]}
                >
                  <View style={styles.rowTop}>
                    <Text style={styles.number}>{item.number}</Text>
                    <StatusPill status={item.status} />
                  </View>
                  <Text style={styles.party} numberOfLines={1}>
                    {partyMap[item.party_id]?.name || "Unknown party"}
                  </Text>
                  <View style={styles.rowBottom}>
                    <Text style={styles.date}>{shortDate(item.date)}</Text>
                    <Text style={styles.amount}>
                      {fmtCurrency(item.total, item.currency)}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            )}
          />
        </View>

        {tablet ? (
          <View style={styles.detailCol}>
            {currentId ? (
              <InvoiceDetail idOverride={currentId} embedded />
            ) : (
              <View style={styles.emptyBox}>
                <Ionicons name="reader-outline" size={40} color={colors.textDim} />
                <Text style={styles.emptyTitle}>Select an invoice</Text>
                <Text style={styles.emptySub}>
                  Tap any invoice on the left to see details here.
                </Text>
              </View>
            )}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    paddingRight: 56, // reserve space for the floating notification bell
  },
  title: { color: colors.text, fontSize: 22, fontWeight: "800" },
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
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, paddingVertical: 0 },
  chipRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    height: 32,
    paddingHorizontal: 12,
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

  body: { flex: 1 },
  bodyTablet: { flexDirection: "row", alignItems: "stretch" },
  listCol: { flex: 1 },
  listColTablet: {
    flex: 0,
    flexBasis: 380,
    flexGrow: 0,
    flexShrink: 0,
    width: 380,
    borderRightColor: colors.border,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  detailCol: { flex: 1, minWidth: 0, backgroundColor: "transparent" },

  rowCard: {
    padding: spacing.md,
    backgroundColor: "rgba(12,12,30,0.6)",
    borderColor: "rgba(255,255,255,0.10)",
  },
  rowCardActive: {
    borderColor: colors.lime,
    backgroundColor: "rgba(0,255,136,0.06)",
    shadowColor: colors.lime,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  number: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  party: { color: colors.textMuted, fontSize: 12, marginTop: 6 },
  rowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  date: { color: colors.textDim, fontSize: 11 },
  amount: { color: colors.lime, fontSize: 15, fontWeight: "800" },

  emptyBox: {
    padding: spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 8 },
  emptySub: { color: colors.textDim, fontSize: 13, textAlign: "center", maxWidth: 240 },
});
