/**
 * Catalog / Items — Phase 7.
 *
 * Product catalog from `/api/items`. Each row shows the item name,
 * unit, cost (buying_price → red debit tone), selling price (green
 * credit tone), and a computed margin pill. Search box filters live.
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
import { fmtCurrency } from "@/src/lib/format";
import { colors, radii, spacing } from "@/src/lib/theme";
import { Pill } from "@/src/lib/ui";

type Item = {
  id: string;
  name: string;
  unit?: string;
  buying_price?: number;
  selling_price?: number;
  notes?: string | null;
};

export default function ItemsScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<Item[]>("/api/items");
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

  const filtered = useMemo(() => {
    const list = items || [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (i) =>
        (i.name || "").toLowerCase().includes(q) ||
        (i.unit || "").toLowerCase().includes(q),
    );
  }, [items, query]);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Catalog</Text>
          <Text style={styles.subtitle}>{items?.length ?? 0} items · Cost, price, margin</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textDim} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.search}
          placeholder="Search catalog…"
          placeholderTextColor={colors.textDim}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      {items === null && loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.dim}>Loading catalog…</Text>
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
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <ItemRow item={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="pricetags-outline" size={32} color={colors.textDim} />
              <Text style={styles.emptyTitle}>
                {query ? "No matching items" : "Catalog empty"}
              </Text>
              <Text style={styles.emptyBody}>
                Items created from the desktop console will appear here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function ItemRow({ item }: { item: Item }) {
  const cost = Number(item.buying_price ?? 0);
  const price = Number(item.selling_price ?? 0);
  const margin = price - cost;
  const marginPct = cost > 0 ? Math.round((margin / cost) * 100) : 0;
  const positive = margin >= 0;
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name="pricetag" size={16} color={colors.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.rowSub}>Unit: {item.unit || "—"}</Text>
        <View style={styles.priceLine}>
          <Text style={styles.priceLabel}>Cost</Text>
          <Text style={[styles.priceValue, { color: colors.debit }]}>
            {fmtCurrency(cost, "INR")}
          </Text>
          <Text style={styles.priceLabel}>→</Text>
          <Text style={styles.priceLabel}>Price</Text>
          <Text style={[styles.priceValue, { color: colors.credit }]}>
            {fmtCurrency(price, "INR")}
          </Text>
        </View>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Pill
          label={`${positive ? "+" : ""}${marginPct}%`}
          tint={positive ? colors.credit : colors.debit}
          soft={positive ? colors.brandSoft : colors.dangerSoft}
          size="sm"
        />
        <Text style={styles.marginTxt}>{fmtCurrency(margin, "INR")}</Text>
      </View>
    </View>
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
  search: { flex: 1, paddingVertical: 10, color: colors.text, fontSize: 14 },
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
  name: { color: colors.text, fontSize: 15, fontWeight: "800" },
  rowSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  priceLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    flexWrap: "wrap",
  },
  priceLabel: { color: colors.textDim, fontSize: 10, fontWeight: "700", letterSpacing: 0.4 },
  priceValue: { fontSize: 12, fontWeight: "800" },
  marginTxt: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },
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
