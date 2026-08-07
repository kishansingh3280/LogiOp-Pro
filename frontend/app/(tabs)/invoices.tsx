import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useApi } from "@/src/api/hooks";
import type { Invoice, Party } from "@/src/api/types";
import { Card, StatusPill } from "@/src/components/ui";
import { colors, radii, spacing } from "@/src/theme";
import { fmtCurrency, shortDate } from "@/src/utils/format";

export default function InvoicesScreen() {
  const router = useRouter();
  const invoices = useApi<Invoice[]>("/api/invoices");
  const parties = useApi<Party[]>("/api/parties");

  const partyMap = useMemo(() => {
    const m: Record<string, Party> = {};
    (parties.data || []).forEach((p) => (m[p.id] = p));
    return m;
  }, [parties.data]);

  const list = useMemo(
    () => (invoices.data || []).slice().sort((a, b) => (a.date > b.date ? -1 : 1)),
    [invoices.data],
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.headBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Invoices</Text>
          <Text style={styles.subtitle}>{list.length} total</Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={() => router.push("/invoice/new")} testID="new-invoice-btn">
          <Ionicons name="add" size={18} color={colors.bg} />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={list}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        refreshControl={
          <RefreshControl refreshing={invoices.loading} onRefresh={invoices.refresh} tintColor={colors.lime} />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="document-text-outline" size={40} color={colors.textDim} />
            <Text style={styles.emptyTitle}>No invoices</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/invoice/${item.id}` as never)} testID={`invoice-row-${item.id}`}>
            <Card>
              <View style={styles.rowTop}>
                <Text style={styles.number}>{item.number}</Text>
                <StatusPill status={item.status} />
              </View>
              <Text style={styles.party} numberOfLines={1}>
                {partyMap[item.party_id]?.name || "Unknown party"}
              </Text>
              <View style={styles.rowBottom}>
                <Text style={styles.date}>{shortDate(item.date)}</Text>
                <Text style={styles.amount}>{fmtCurrency(item.total, item.currency)}</Text>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: 4,
  },
  iconBtn: { padding: 8 },
  title: { color: colors.text, fontSize: 22, fontWeight: "800" },
  subtitle: { color: colors.textDim, fontSize: 12 },
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
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  number: { color: colors.text, fontSize: 16, fontWeight: "800", letterSpacing: 0.4 },
  party: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
  rowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  date: { color: colors.textDim, fontSize: 12 },
  amount: { color: colors.lime, fontSize: 16, fontWeight: "800" },
  emptyBox: { padding: spacing.xxl, alignItems: "center", gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 8 },
});
