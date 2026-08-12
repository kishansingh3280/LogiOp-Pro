/**
 * Phase-2 Shipments list.
 *
 * Fetches `/api/shipments` and renders them in a FlatList. Each row
 * shows consignment no, direction, mode, status, weight, and creation
 * date. Pull-to-refresh included.
 *
 * Detail navigation is deferred to a later phase — tapping a row is a
 * no-op for now.
 */
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiGet } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth-context";
import { colors, radii, spacing } from "@/src/lib/theme";

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

const STATUS_TINT: Record<string, string> = {
  pending: colors.warn,
  in_transit: colors.info,
  warehouse_arrived: colors.info,
  delivered: colors.ok,
  cancelled: colors.textDim,
};

const STATUS_SOFT: Record<string, string> = {
  pending: colors.warnSoft,
  in_transit: colors.infoSoft,
  warehouse_arrived: colors.infoSoft,
  delivered: colors.okSoft,
  cancelled: colors.divider,
};

export default function ShipmentsScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState<Shipment[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<Shipment[]>("/api/shipments");
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) load();
  }, [token, load]);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Shipments</Text>
        <Text style={styles.subtitle}>{items?.length ?? 0} total · India ⇄ Thailand</Text>
      </View>

      {items === null && loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.dim}>Loading shipments…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
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
          data={items ?? []}
          keyExtractor={(sh) => sh.id}
          renderItem={({ item }) => <ShipmentRow shipment={item} />}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>No shipments yet</Text>
              <Text style={styles.emptyBody}>
                Shipments created in the desktop console will appear here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function ShipmentRow({ shipment }: { shipment: Shipment }) {
  const tint = STATUS_TINT[shipment.status] ?? colors.textMuted;
  const soft = STATUS_SOFT[shipment.status] ?? colors.divider;
  const dirLabel = shipment.direction === "IN_TO_TH" ? "IN → TH" : "TH → IN";

  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.consignment} numberOfLines={1}>
          {shipment.consignment_no}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {dirLabel} · {shipment.mode?.replace("_", " ") || "—"}
        </Text>
        <View style={styles.rowMetaWrap}>
          <View style={[styles.chip, { backgroundColor: soft, borderColor: tint }]}>
            <Text style={[styles.chipText, { color: tint }]}>
              {shipment.status.replace("_", " ")}
            </Text>
          </View>
          <Text style={styles.dim}>{shortDate(shipment.created_at)}</Text>
        </View>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.weight}>{shipment.weight_kg} kg</Text>
        <Text style={styles.dim}>{shipment.bag_count} bag{shipment.bag_count !== 1 ? "s" : ""}</Text>
      </View>
    </View>
  );
}

function shortDate(iso?: string) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso.slice(0, 10);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { color: colors.text, fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 80 },
  row: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: "row",
    padding: spacing.md,
  },
  rowLeft: { flex: 1 },
  rowRight: { alignItems: "flex-end", justifyContent: "center" },
  consignment: { color: colors.text, fontSize: 15, fontWeight: "700" },
  rowSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  rowMetaWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 8 },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  chipText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },
  weight: { color: colors.text, fontSize: 15, fontWeight: "800" },
  dim: { color: colors.textDim, fontSize: 11 },
  sep: { height: spacing.sm },
  center: {
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
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
  retryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
});
