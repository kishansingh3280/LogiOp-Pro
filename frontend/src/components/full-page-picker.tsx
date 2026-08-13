/**
 * Shared full-page picker used by /reports/pick-* routes.
 * JARVIS dark theme, back button top-left, search + list.
 * Replaces the previous slide-up Modal picker.
 */
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing } from "@/src/lib/theme";
import { GlassCard } from "@/src/lib/ui";

export type PickerItem = { id: string; title: string; sub: string };

export function FullPagePicker({
  headerTitle,
  headerSub,
  items,
  loading,
  pending,
  emptyHint,
  onPick,
  searchPlaceholder = "Search…",
}: {
  headerTitle: string;
  headerSub?: string;
  items: PickerItem[];
  loading?: boolean;
  pending?: boolean;
  emptyHint?: string;
  onPick: (id: string) => void;
  searchPlaceholder?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        it.sub.toLowerCase().includes(q),
    );
  }, [items, query]);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{headerTitle}</Text>
          {headerSub ? <Text style={styles.subtitle}>{headerSub}</Text> : null}
        </View>
        {pending ? <ActivityIndicator color={colors.brand} /> : null}
      </View>

      <GlassCard style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textDim} />
        <TextInput
          style={styles.search}
          placeholder={searchPlaceholder}
          placeholderTextColor={colors.textDim}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          autoFocus
        />
      </GlassCard>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => onPick(item.id)}
              android_ripple={{ color: colors.brandSoft }}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {item.sub}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.dim}>{emptyHint || "Nothing to show"}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
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
  title: { color: colors.text, fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  subtitle: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  searchWrap: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  search: { flex: 1, paddingVertical: 8, color: colors.text, fontSize: 14 },
  list: { padding: spacing.lg, paddingTop: spacing.md, paddingBottom: 120 },
  sep: { height: 1, backgroundColor: colors.divider },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: spacing.sm,
  },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: "800" },
  rowSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  empty: { padding: spacing.xl, alignItems: "center" },
  dim: { color: colors.textDim, fontSize: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
