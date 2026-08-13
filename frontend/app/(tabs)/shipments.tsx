/**
 * Shipments — Phase 10 Turn 2.
 *
 * Mobile: list-only. Tap row → /shipment/[id]
 * Tablet (width ≥ 900): master-detail split layout
 *   • LEFT: list, +New button, search box, filter chips
 *   • RIGHT: selected shipment detail (via <ShipmentDetailView />)
 *
 * Filters: All / Pending / In Transit / Warehouse / Delivered
 */
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import { useIsTablet } from "@/src/hooks/use-is-tablet";
import { apiGet } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth-context";
import { appendCompanyQuery, useCompany } from "@/src/lib/company-context";
import { shortDate, titleCase } from "@/src/lib/format";
import { ShipmentDetailView } from "@/src/lib/shipment-detail-view";
import { colors, radii, spacing } from "@/src/lib/theme";
import { Pill } from "@/src/lib/ui";

type Shipment = {
  id: string;
  consignment_no: string;
  direction: "IN_TO_TH" | "TH_TO_IN";
  mode: string;
  origin?: string;
  destination?: string;
  status: string;
  weight_kg: number;
  bag_count: number;
  created_at: string;
  party_id?: string;
};

const STATUS: Record<string, { tint: string; soft: string }> = {
  pending: { tint: colors.warn, soft: colors.warnSoft },
  in_transit: { tint: colors.info, soft: colors.infoSoft },
  warehouse_arrived: { tint: colors.info, soft: colors.infoSoft },
  delivered: { tint: colors.brand, soft: colors.brandSoft },
  cancelled: { tint: colors.textDim, soft: colors.divider },
};

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in_transit", label: "In Transit" },
  { key: "warehouse_arrived", label: "Warehouse" },
  { key: "delivered", label: "Delivered" },
];

function handleNewShipment() {
  Alert.alert(
    "New Shipment",
    "Create shipments from the desktop console. Mobile create flow is coming soon.",
    [{ text: "OK" }],
  );
}

export default function ShipmentsScreen() {
  const { token } = useAuth();
  const { activeCompany, activeMode } = useCompany();
  const isTablet = useIsTablet();
  const [items, setItems] = useState<Shipment[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<Shipment[]>(
        appendCompanyQuery("/api/shipments", activeCompany, activeMode),
      );
      const list = Array.isArray(data) ? data : [];
      setItems(list);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [activeCompany, activeMode]);

  useEffect(() => {
    if (token) load();
  }, [token, load, activeCompany, activeMode]);

  const filtered = useMemo(() => {
    let list = items || [];
    if (filter !== "all") list = list.filter((sh) => (sh.status || "") === filter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (sh) =>
          (sh.consignment_no || "").toLowerCase().includes(q) ||
          (sh.origin || "").toLowerCase().includes(q) ||
          (sh.destination || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [items, filter, query]);

  // Auto-select first item on tablet whenever the filtered list changes
  useEffect(() => {
    if (!isTablet) return;
    if (!filtered.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.find((s) => s.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [isTablet, filtered, selectedId]);

  const listPanel = (
    <View style={isTablet ? styles.leftPane : styles.mobilePane}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Shipments</Text>
            <Text style={styles.subtitle}>
              {filtered.length} shown · {items?.length ?? 0} total
            </Text>
          </View>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={handleNewShipment}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color={colors.bgSolid} />
            <Text style={styles.newBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.textDim} style={styles.searchIcon} />
          <TextInput
            style={styles.search}
            placeholder="Search consignment, origin, destination…"
            placeholderTextColor={colors.textDim}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textDim} />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {items === null && loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.dim}>Loading shipments…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={24} color={colors.danger} />
          <Text style={styles.errorTitle}>Couldn&apos;t load shipments</Text>
          <Text style={styles.errorBody} numberOfLines={3}>
            {error}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(sh) => sh.id}
          renderItem={({ item }) => (
            <ShipmentRow
              shipment={item}
              selected={isTablet && item.id === selectedId}
              onPress={
                isTablet
                  ? () => setSelectedId(item.id)
                  : undefined /* mobile uses Link wrapper below */
              }
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="airplane-outline" size={32} color={colors.textDim} />
              <Text style={styles.emptyTitle}>
                {query || filter !== "all" ? "No matching shipments" : "No shipments yet"}
              </Text>
              <Text style={styles.emptyBody}>
                Shipments created in the desktop console will appear here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );

  if (isTablet) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
        <View style={styles.splitRow}>
          {listPanel}
          <View style={styles.rightPane}>
            {selectedId ? (
              <ShipmentDetailView id={selectedId} />
            ) : (
              <View style={styles.emptyDetail}>
                <Ionicons name="airplane-outline" size={40} color={colors.textDim} />
                <Text style={styles.emptyDetailTitle}>No shipment selected</Text>
                <Text style={styles.emptyDetailBody}>
                  Pick a shipment from the list to view its parties, bags, and cost details.
                </Text>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Mobile layout
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      {listPanel}
    </SafeAreaView>
  );
}

function ShipmentRow({
  shipment,
  selected,
  onPress,
}: {
  shipment: Shipment;
  selected?: boolean;
  onPress?: () => void;
}) {
  const s = STATUS[shipment.status] ?? { tint: colors.textMuted, soft: colors.divider };
  const dirLabel = shipment.direction === "IN_TO_TH" ? "IN → TH" : "TH → IN";

  const rowContent = (
    <View style={[styles.row, selected && styles.rowSelected]}>
      <View style={styles.rowIcon}>
        <Ionicons
          name={shipment.direction === "IN_TO_TH" ? "arrow-forward" : "arrow-back"}
          size={16}
          color={colors.brand}
        />
      </View>
      <View style={styles.rowLeft}>
        <Text style={styles.consignment} numberOfLines={1}>
          {shipment.consignment_no}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {dirLabel} · {titleCase(shipment.mode)}
        </Text>
        <View style={styles.rowMetaWrap}>
          <Pill label={titleCase(shipment.status)} tint={s.tint} soft={s.soft} size="sm" />
          <Text style={styles.dim}>{shortDate(shipment.created_at)}</Text>
        </View>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.weight}>{shipment.weight_kg} kg</Text>
        <Text style={styles.dim}>
          {shipment.bag_count} bag{shipment.bag_count !== 1 ? "s" : ""}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.75} onPress={onPress}>
        {rowContent}
      </TouchableOpacity>
    );
  }

  return (
    <Link href={`/shipment/${shipment.id}` as any} asChild>
      <TouchableOpacity activeOpacity={0.75}>{rowContent}</TouchableOpacity>
    </Link>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  splitRow: { flex: 1, flexDirection: "row" },
  leftPane: {
    width: 380,
    borderRightWidth: 1,
    borderRightColor: colors.divider,
  },
  rightPane: { flex: 1 },
  mobilePane: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  titleRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  title: { color: colors.text, fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brand,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    shadowColor: colors.brand,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  newBtnText: { color: colors.bgSolid, fontSize: 12, fontWeight: "800", letterSpacing: 0.3 },
  searchWrap: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  searchIcon: { marginRight: spacing.sm },
  search: { flex: 1, paddingVertical: 10, color: colors.text, fontSize: 14 },
  filterRow: { flexDirection: "row", gap: 8, paddingTop: spacing.sm, paddingBottom: 2 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  filterChipActive: { backgroundColor: colors.brandSoft, borderColor: colors.brandBorder },
  filterText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  filterTextActive: { color: colors.brand },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 80, paddingTop: spacing.sm },
  row: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.md,
  },
  rowSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brandSoft,
    borderColor: colors.brandBorder,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLeft: { flex: 1 },
  rowRight: { alignItems: "flex-end", justifyContent: "center" },
  consignment: { color: colors.text, fontSize: 15, fontWeight: "700" },
  rowSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  rowMetaWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 8 },
  weight: { color: colors.text, fontSize: 15, fontWeight: "800" },
  dim: { color: colors.textDim, fontSize: 11 },
  sep: { height: spacing.sm },
  center: { padding: spacing.xl, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  emptyBody: { color: colors.textMuted, fontSize: 12, textAlign: "center" },
  errorTitle: { color: colors.danger, fontSize: 14, fontWeight: "800" },
  errorBody: { color: colors.textMuted, fontSize: 12, textAlign: "center" },
  retryBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  retryText: { color: colors.bg, fontSize: 12, fontWeight: "800" },
  emptyDetail: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: spacing.xxl,
  },
  emptyDetailTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  emptyDetailBody: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    maxWidth: 320,
    lineHeight: 18,
  },
});
