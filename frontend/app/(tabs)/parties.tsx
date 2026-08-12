/**
 * Parties list — Phase 3.
 *
 * JARVIS dark theme. Tapping a row → /party/[id].
 */
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
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

type Party = {
  id: string;
  name: string;
  role: string;
  country?: string;
  default_currency?: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
};

const ROLE: Record<string, { tint: string; soft: string }> = {
  customer: { tint: colors.info, soft: colors.infoSoft },
  end_customer: { tint: colors.info, soft: colors.infoSoft },
  supplier: { tint: colors.warn, soft: colors.warnSoft },
  vendor: { tint: colors.warn, soft: colors.warnSoft },
  carrier: { tint: colors.brand, soft: colors.brandSoft },
  other: { tint: colors.textMuted, soft: colors.divider },
};

export default function PartiesScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState<Party[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<Party[]>("/api/parties");
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
    if (!items) return [];
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.phone || "").toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q) ||
        (p.city || "").toLowerCase().includes(q),
    );
  }, [items, query]);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Parties</Text>
        <Text style={styles.subtitle}>
          {items?.length ?? 0} total · Customers, Suppliers, Carriers
        </Text>

        <View style={styles.searchWrap}>
          <Ionicons
            name="search"
            size={16}
            color={colors.textDim}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.search}
            placeholder="Search by name, phone, city…"
            placeholderTextColor={colors.textDim}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
      </View>

      {items === null && loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.dim}>Loading parties…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={24} color={colors.danger} />
          <Text style={styles.errorTitle}>Couldn&apos;t load parties</Text>
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
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PartyRow party={item} />}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="people-outline" size={32} color={colors.textDim} />
              <Text style={styles.emptyTitle}>
                {query ? "No matching parties" : "No parties yet"}
              </Text>
              <Text style={styles.emptyBody}>
                {query
                  ? `Nothing matched "${query}". Try a different keyword.`
                  : "Parties created in the desktop console will appear here."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function PartyRow({ party }: { party: Party }) {
  const roleKey = (party.role || "other").toLowerCase();
  const r = ROLE[roleKey] ?? ROLE.other;
  const initial = (party.name || "?").slice(0, 1).toUpperCase();

  return (
    <Link href={`/party/${party.id}` as any} asChild>
      <TouchableOpacity activeOpacity={0.75} style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: r.soft, borderColor: r.tint }]}>
          <Text style={[styles.avatarText, { color: r.tint }]}>{initial}</Text>
        </View>
        <View style={styles.rowLeft}>
          <Text style={styles.name} numberOfLines={1}>
            {party.name}
          </Text>
          <Text style={styles.rowSub} numberOfLines={1}>
            {party.phone || party.email || party.city || party.country || "—"}
          </Text>
        </View>
        <Pill label={titleCase(party.role || "other")} tint={r.tint} soft={r.soft} size="sm" />
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
  search: {
    flex: 1,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "800" },
  rowLeft: { flex: 1 },
  name: { color: colors.text, fontSize: 15, fontWeight: "700" },
  rowSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  dim: { color: colors.textDim, fontSize: 12 },
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
