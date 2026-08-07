import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  Image,
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
import type { Item, Party } from "@/src/api/types";
import { colors, radii, spacing } from "@/src/theme";
import { fmtCurrency } from "@/src/utils/format";

// AI Product Catalog — big-photo grid of every item, filterable by tag
// and supplier. Rows are clickable and route to /item/[id] for editing.
// Photos are stored as data-uri (base64) on the item record; grid uses a
// 2-column layout on phones with fallback thumbnail chips for items
// without a photo.
export default function ItemsScreen() {
  const router = useRouter();
  const items = useApi<Item[]>("/api/items");
  const parties = useApi<Party[]>("/api/parties");
  const [q, setQ] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const supplierName = (id?: string | null) =>
    (parties.data || []).find((p) => p.id === id)?.name || "—";

  const allTags = useMemo(() => {
    const set = new Set<string>();
    (items.data || []).forEach((it) => (it.tags || []).forEach((t) => set.add(t)));
    return [...set].sort();
  }, [items.data]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (items.data || []).filter((it) => {
      if (activeTag && !(it.tags || []).some((t) => t === activeTag)) return false;
      if (!needle) return true;
      return (
        (it.name || "").toLowerCase().includes(needle)
        || (it.description || "").toLowerCase().includes(needle)
        || (it.tags || []).some((t) => t.toLowerCase().includes(needle))
      );
    });
  }, [items.data, q, activeTag]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.headBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Product catalog</Text>
          <Text style={styles.subtitle}>
            {items.data?.length || 0} items · {allTags.length} tags
          </Text>
        </View>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push("/item/new" as never)}
          testID="new-item-btn"
        >
          <Ionicons name="add" size={18} color={colors.bg} />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textDim} />
        <TextInput
          style={styles.search}
          placeholder="Search name, description, tag…"
          placeholderTextColor={colors.textDim}
          value={q}
          onChangeText={setQ}
          testID="catalog-search"
        />
        {q ? (
          <TouchableOpacity onPress={() => setQ("")}>
            <Ionicons name="close-circle" size={16} color={colors.textDim} />
          </TouchableOpacity>
        ) : null}
      </View>

      {allTags.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagRow}
          style={{ flexGrow: 0 }}
        >
          <TouchableOpacity
            onPress={() => setActiveTag(null)}
            style={[styles.tag, !activeTag && styles.tagActive]}
          >
            <Text style={[styles.tagTxt, !activeTag && styles.tagTxtActive]}>All</Text>
          </TouchableOpacity>
          {allTags.map((t) => {
            const active = activeTag === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setActiveTag(active ? null : t)}
                style={[styles.tag, active && styles.tagActive]}
                testID={`catalog-tag-${t}`}
              >
                <Text style={[styles.tagTxt, active && styles.tagTxtActive]}>{t}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.md }}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        refreshControl={
          <RefreshControl
            refreshing={items.loading || parties.loading}
            onRefresh={() => {
              items.refresh();
              parties.refresh();
            }}
            tintColor={colors.lime}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="pricetags-outline" size={40} color={colors.textDim} />
            <Text style={styles.emptyTitle}>
              {q || activeTag ? "No matches" : "No items yet"}
            </Text>
            <Text style={styles.emptyMeta}>
              {q || activeTag ? "Try a different search or tag" : "Tap New to add your first product"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => router.push(`/item/${item.id}` as never)}
            testID={`catalog-card-${item.id}`}
          >
            {item.photo_url ? (
              <Image source={{ uri: item.photo_url }} style={styles.cardPhoto} resizeMode="cover" />
            ) : (
              <View style={styles.cardPhotoPh}>
                <Ionicons name="image-outline" size={32} color={colors.textDim} />
              </View>
            )}
            <View style={styles.cardBody}>
              <Text style={styles.cardName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.description ? (
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
              <Text style={styles.cardSupplier} numberOfLines={1}>
                <Ionicons name="storefront-outline" size={10} color={colors.textDim} />
                {" "}
                {supplierName(item.supplier_party_id)}
              </Text>
              <View style={styles.cardTags}>
                {(item.tags || []).slice(0, 2).map((t) => (
                  <View key={t} style={styles.cardTag}>
                    <Text style={styles.cardTagText}>{t}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.cardPriceRow}>
                <Text style={styles.cardPrice}>{fmtCurrency(item.selling_price, "INR")}</Text>
                <Text style={styles.cardUnit}>/ {item.unit || "pcs"}</Text>
              </View>
            </View>
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
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    marginBottom: spacing.sm,
  },
  search: { flex: 1, color: colors.text, fontSize: 14 },
  tagRow: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: 6 },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.chipBg,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tagActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  tagTxt: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  tagTxtActive: { color: colors.bg },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
  },
  cardPhoto: { width: "100%", aspectRatio: 1, backgroundColor: colors.chipBg },
  cardPhotoPh: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: colors.chipBg,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { padding: spacing.md, gap: 4 },
  cardName: { color: colors.text, fontSize: 14, fontWeight: "800" },
  cardDesc: { color: colors.textDim, fontSize: 11, lineHeight: 15 },
  cardSupplier: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  cardTags: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  cardTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.limeGlow,
  },
  cardTagText: { color: colors.lime, fontSize: 10, fontWeight: "800" },
  cardPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
    marginTop: 4,
    paddingTop: 6,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cardPrice: { color: colors.lime, fontSize: 14, fontWeight: "800" },
  cardUnit: { color: colors.textDim, fontSize: 10 },
  emptyBox: { padding: spacing.xxl, alignItems: "center", gap: 4 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 8 },
  emptyMeta: { color: colors.textDim, fontSize: 12 },
});
