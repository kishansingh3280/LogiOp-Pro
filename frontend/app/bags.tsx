/**
 * Bags module — Phase 7.
 *
 * Aggregates every bag inside every shipment into a flat, searchable
 * list. Each row exposes: bag id, its parent consignment, carrier,
 * weight, and status. Tapping a row jumps to the parent shipment.
 *
 * Bags are embedded in the shipment record (`bags: [{id, weight_kg,
 * carrier_party_id, ...}]`) — there is no standalone /api/bags
 * endpoint, so we fan them out client-side after fetching /api/shipments.
 */
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiGet } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth-context";
import { titleCase } from "@/src/lib/format";
import { colors, radii, spacing } from "@/src/lib/theme";
import { Pill } from "@/src/lib/ui";

type Bag = {
  id: string;
  weight_kg?: number;
  status?: string;
  carrier_party_id?: string | null;
  contents?: string | null;
};
type Shipment = {
  id: string;
  consignment_no: string;
  status: string;
  weight_kg: number;
  bag_count: number;
  party_id?: string;
  carrier_party_id?: string;
  bags?: Bag[];
};
type Party = { id: string; name: string };

type Row = {
  bag: Bag;
  shipment: Shipment;
};

const STATUS: Record<string, { tint: string; soft: string }> = {
  pending: { tint: colors.warn, soft: colors.warnSoft },
  in_transit: { tint: colors.info, soft: colors.infoSoft },
  warehouse_arrived: { tint: colors.info, soft: colors.infoSoft },
  delivered: { tint: colors.brand, soft: colors.brandSoft },
  cancelled: { tint: colors.danger, soft: colors.dangerSoft },
};

export default function BagsScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[] | null>(null);
  const [parties, setParties] = useState<Party[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ships, ps] = await Promise.all([
        apiGet<Shipment[]>("/api/shipments"),
        apiGet<Party[]>("/api/parties").catch(() => []),
      ]);
      setShipments(Array.isArray(ships) ? ships : []);
      setParties(Array.isArray(ps) ? ps : []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) load();
  }, [token, load]);

  const partyName = useCallback(
    (id?: string | null) =>
      (id && (parties || []).find((p) => p.id === id)?.name) || "—",
    [parties],
  );

  const rows = useMemo<Row[]>(() => {
    const list: Row[] = [];
    for (const s of shipments || []) {
      for (const b of s.bags || []) list.push({ bag: b, shipment: s });
    }
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.shipment.consignment_no.toLowerCase().includes(q) ||
        (r.bag.contents || "").toLowerCase().includes(q) ||
        (r.bag.id || "").toLowerCase().includes(q) ||
        partyName(r.bag.carrier_party_id).toLowerCase().includes(q),
    );
  }, [shipments, query, partyName]);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Bags</Text>
          <Text style={styles.subtitle}>
            {rows.length} total · across {shipments?.length ?? 0} shipments
          </Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textDim} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.search}
          placeholder="Search by consignment, contents, carrier…"
          placeholderTextColor={colors.textDim}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      {shipments === null && loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.dim}>Loading bags…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={24} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => `${r.shipment.id}:${r.bag.id}`}
          renderItem={({ item }) => (
            <BagRow
              row={item}
              carrierName={partyName(item.bag.carrier_party_id)}
              onPress={() => router.push(`/shipment/${item.shipment.id}` as any)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="cube-outline" size={32} color={colors.textDim} />
              <Text style={styles.emptyTitle}>
                {query ? "No bags match" : "No bags yet"}
              </Text>
              <Text style={styles.emptyBody}>
                Bags are created when shipments are packed.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function BagRow({
  row,
  carrierName,
  onPress,
}: {
  row: Row;
  carrierName: string;
  onPress: () => void;
}) {
  const s = STATUS[row.bag.status || row.shipment.status] ?? STATUS.pending;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name="cube" size={16} color={colors.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.consignment} numberOfLines={1}>
          {row.shipment.consignment_no}
          <Text style={styles.dim}>  ·  Bag {row.bag.id?.slice(0, 6)}</Text>
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {carrierName === "—" ? "No carrier assigned" : `Carrier: ${carrierName}`}
        </Text>
        <View style={styles.rowMeta}>
          <Pill
            label={titleCase(row.bag.status || row.shipment.status)}
            tint={s.tint}
            soft={s.soft}
            size="sm"
          />
          {row.bag.contents ? (
            <Text style={styles.dim} numberOfLines={1}>
              {row.bag.contents}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.weight}>{Number(row.bag.weight_kg ?? 0)} kg</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
    </TouchableOpacity>
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
  title: { color: colors.text, fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  searchWrap: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  search: {
    flex: 1,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 80 },
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
  rowRight: { alignItems: "flex-end" },
  consignment: { color: colors.text, fontSize: 14, fontWeight: "800" },
  rowSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  weight: { color: colors.text, fontSize: 15, fontWeight: "800" },
  dim: { color: colors.textDim, fontSize: 11 },
  center: {
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  emptyBody: { color: colors.textMuted, fontSize: 12, textAlign: "center" },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: "700", textAlign: "center" },
  retry: {
    marginTop: spacing.sm,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  retryText: { color: colors.bg, fontSize: 12, fontWeight: "800" },
});
