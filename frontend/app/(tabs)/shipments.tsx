/**
 * Shipments list — Phase 3.
 *
 * JARVIS dark theme. Tapping a row → /shipment/[id].
 */
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
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
import { shortDate, titleCase } from "@/src/lib/format";
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
        <Text style={styles.subtitle}>
          {items?.length ?? 0} total · India ⇄ Thailand
        </Text>
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
              <Ionicons name="airplane-outline" size={32} color={colors.textDim} />
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
  const s = STATUS[shipment.status] ?? { tint: colors.textMuted, soft: colors.divider };
  const dirLabel = shipment.direction === "IN_TO_TH" ? "IN → TH" : "TH → IN";

  return (
    <Link href={`/shipment/${shipment.id}` as any} asChild>
      <TouchableOpacity activeOpacity={0.75} style={styles.row}>
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
      </TouchableOpacity>
    </Link>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { color: colors.text, fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 80 },
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
  retryText: { color: colors.bg, fontSize: 12, fontWeight: "800" },
});
