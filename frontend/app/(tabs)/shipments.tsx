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
import type { Party, Shipment, ShipmentStatus } from "@/src/api/types";
import { Card, StatusPill } from "@/src/components/ui";
import { useIsTablet } from "@/src/hooks/use-is-tablet";
import { colors, radii, spacing } from "@/src/theme";
import { fmtCurrency, shortDate } from "@/src/utils/format";

import ShipmentDetail from "../shipment/[id]";

const FILTERS: { key: "all" | ShipmentStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in_transit", label: "In transit" },
  { key: "warehouse_arrived", label: "Warehouse" },
  { key: "delivered", label: "Delivered" },
];

export default function ShipmentsScreen() {
  const router = useRouter();
  const tablet = useIsTablet();
  const shipments = useApi<Shipment[]>("/api/shipments");
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
    let items = shipments.data || [];
    if (filter !== "all") items = items.filter((s) => s.status === filter);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      items = items.filter(
        (s) =>
          (s.consignment_no || "").toLowerCase().includes(needle) ||
          (s.origin || "").toLowerCase().includes(needle) ||
          (s.destination || "").toLowerCase().includes(needle) ||
          (partyMap[s.party_id]?.name || "").toLowerCase().includes(needle),
      );
    }
    return items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }, [shipments.data, filter, q, partyMap]);

  // For tablet: default select first
  const currentId = selectedId || list[0]?.id || null;

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Shipments</Text>
          <Text style={styles.subtitle}>{list.length} of {shipments.data?.length || 0}</Text>
        </View>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push("/shipment/new")}
          testID="new-shipment-btn"
        >
          <Ionicons name="add" size={18} color={colors.bg} />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textDim} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search consignment, party, city…"
          placeholderTextColor={colors.textDim}
          value={q}
          onChangeText={setQ}
          testID="shipments-search"
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
              testID={`filter-${f.key}`}
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
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={shipments.loading} onRefresh={shipments.refresh} tintColor={colors.lime} />
            }
            ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="cube-outline" size={40} color={colors.textDim} />
                <Text style={styles.emptyTitle}>No shipments</Text>
                <Text style={styles.emptySub}>Tap “New” to create your first shipment</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  if (tablet) setSelectedId(item.id);
                  else router.push(`/shipment/${item.id}` as never);
                }}
                testID={`shipment-row-${item.id}`}
              >
                <Card
                  style={[
                    styles.rowCard,
                    tablet && currentId === item.id && styles.rowCardActive,
                  ]}
                >
                  <View style={styles.rowTop}>
                    <Text style={styles.consNo}>{item.consignment_no}</Text>
                    <StatusPill status={item.status} testID={`status-${item.id}`} />
                  </View>
                  <Text style={styles.rowRoute}>
                    {item.origin || "—"} <Text style={styles.arrow}>→</Text> {item.destination || "—"}
                  </Text>
                  <View style={styles.rowMeta}>
                    <Meta icon="cube-outline" text={`${item.bag_count ?? 0} bag${(item.bag_count ?? 0) === 1 ? "" : "s"}`} />
                    <Meta icon="scale-outline" text={`${item.weight_kg} kg`} />
                    <Meta icon="airplane-outline" text={(item.mode || "-").replace("_", " ")} />
                  </View>
                  <View style={styles.rowFooter}>
                    <Text style={styles.party} numberOfLines={1}>
                      {partyMap[item.party_id]?.name || "Unknown party"}
                    </Text>
                    <Text style={styles.freight}>
                      {fmtCurrency(item.freight, item.freight_currency)}
                    </Text>
                  </View>
                  <Text style={styles.date}>{shortDate(item.dispatch_date || item.created_at)}</Text>
                </Card>
              </TouchableOpacity>
            )}
          />
        </View>

        {tablet ? (
          <View style={styles.detailCol}>
            {currentId ? (
              <ShipmentDetail idOverride={currentId} embedded />
            ) : (
              <View style={styles.emptyBox}>
                <Ionicons name="reader-outline" size={40} color={colors.textDim} />
                <Text style={styles.emptyTitle}>Select a shipment</Text>
              </View>
            )}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={13} color={colors.textDim} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
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
  chipRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
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
  chipText: { color: colors.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
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
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  detailCol: { flex: 1, minWidth: 0, backgroundColor: "transparent" },
  rowCard: { padding: spacing.lg },
  rowCardActive: { borderColor: colors.lime, backgroundColor: colors.limeGlow },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  consNo: { color: colors.text, fontSize: 16, fontWeight: "800", letterSpacing: 0.4 },
  rowRoute: { color: colors.text, fontSize: 14, marginTop: 6, fontWeight: "500" },
  arrow: { color: colors.lime, fontWeight: "800" },
  rowMeta: { flexDirection: "row", marginTop: 10, gap: spacing.md, flexWrap: "wrap" },
  meta: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: colors.textMuted, fontSize: 12, textTransform: "capitalize" },
  rowFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  party: { color: colors.textMuted, fontSize: 13, flex: 1, marginRight: 8 },
  freight: { color: colors.lime, fontSize: 14, fontWeight: "800" },
  date: { color: colors.textDim, fontSize: 11, marginTop: 4 },
  emptyBox: {
    padding: spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 8 },
  emptySub: { color: colors.textDim, fontSize: 13, textAlign: "center" },
});
