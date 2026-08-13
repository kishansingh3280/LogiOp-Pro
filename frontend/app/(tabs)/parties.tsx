/**
 * Parties list — Phase 3 · Fix 3a.
 *
 * Full-page list with search bar, role filter chips, avatar-driven
 * cards, INR + THB per-party balances, and a floating "+" FAB that
 * routes to /party/new. Ledger balances are computed client-side from
 * the ledger.entries feed so the list stays in sync with the ledger
 * screen without a dedicated backend endpoint.
 */
import { Ionicons } from "@expo/vector-icons";
import { Link, useFocusEffect, useRouter } from "expo-router";
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
import { fmtCurrency, titleCase } from "@/src/lib/format";
import { colors, radii, spacing } from "@/src/lib/theme";
import { GlassCard } from "@/src/lib/ui";

type Party = {
  id: string;
  name: string;
  role: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  opening_balance_inr?: number;
  opening_balance_thb?: number;
};

type LedgerEntry = {
  id: string;
  party_id: string;
  currency: "INR" | "THB";
  debit: number;
  credit: number;
};

// Fix 3a · avatar palette by role.
const ROLE_COLOR: Record<string, string> = {
  customer: "#00FFFF",
  end_customer: "#FFD700",
  carrier: "#8B00FF",
  supplier: "#FFA500",
  vendor: "#FFA500",
  other: "#9E9E9E",
};

function roleAvatarColor(role?: string | null): string {
  return ROLE_COLOR[(role || "other").toLowerCase()] || ROLE_COLOR.other;
}

// Convert `#RRGGBB` → `rgba(r,g,b,a)`.
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

type FilterKey = "all" | "customer" | "end_customer" | "carrier" | "other";
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "customer", label: "Customer" },
  { key: "end_customer", label: "End Customer" },
  { key: "carrier", label: "Carrier" },
  { key: "other", label: "Other" },
];

export default function PartiesScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Party[] | null>(null);
  const [balances, setBalances] = useState<Record<string, { inr: number; thb: number }>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ps, entries] = await Promise.all([
        apiGet<Party[]>("/api/parties"),
        apiGet<LedgerEntry[]>("/api/ledger/entries").catch(() => []),
      ]);
      setItems(Array.isArray(ps) ? ps : []);
      const b: Record<string, { inr: number; thb: number }> = {};
      // Seed with opening balances.
      for (const p of ps || []) {
        b[p.id] = {
          inr: p.opening_balance_inr ?? 0,
          thb: p.opening_balance_thb ?? 0,
        };
      }
      for (const e of entries || []) {
        const key = b[e.party_id] || { inr: 0, thb: 0 };
        const delta = (e.debit || 0) - (e.credit || 0);
        if (e.currency === "THB") key.thb += delta;
        else key.inr += delta;
        b[e.party_id] = key;
      }
      setBalances(b);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) load();
  }, [token, load]);

  // Refresh when returning from /party/new or /party/[id]/edit.
  useFocusEffect(
    useCallback(() => {
      if (token) load();
    }, [token, load]),
  );

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = query.trim().toLowerCase();
    return items.filter((p) => {
      // Role filter
      const roleKey = (p.role || "other").toLowerCase();
      if (filter !== "all") {
        if (filter === "other") {
          if (["customer", "end_customer", "carrier"].includes(roleKey)) return false;
        } else if (roleKey !== filter) return false;
      }
      if (!q) return true;
      return (
        (p.name || "").toLowerCase().includes(q) ||
        (p.phone || "").toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q) ||
        (p.address || p.city || "").toLowerCase().includes(q)
      );
    });
  }, [items, query, filter]);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Parties</Text>
        <Text style={styles.subtitle}>
          {items?.length ?? 0} total · Customers, End Customers, Carriers
        </Text>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.textDim} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.search}
            placeholder="Search by name, phone, address…"
            placeholderTextColor={colors.textDim}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>

        {/* Fix 3a · role filter chips */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.75}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
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
          renderItem={({ item }) => (
            <PartyCard party={item} balance={balances[item.id] || { inr: 0, thb: 0 }} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="people-outline" size={32} color={colors.textDim} />
              <Text style={styles.emptyTitle}>
                {query || filter !== "all" ? "No matching parties" : "No parties yet"}
              </Text>
              <Text style={styles.emptyBody}>
                {query || filter !== "all"
                  ? "Try a different keyword or filter."
                  : "Tap + to add your first party."}
              </Text>
            </View>
          }
        />
      )}

      {/* Fix 3a · Floating + FAB → /party/new */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/party/new" as any)}
        activeOpacity={0.85}
        accessibilityLabel="Add party"
      >
        <Ionicons name="add" size={24} color={colors.bgSolid} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function PartyCard({
  party,
  balance,
}: {
  party: Party;
  balance: { inr: number; thb: number };
}) {
  const initial = (party.name || "?").slice(0, 1).toUpperCase();
  const color = roleAvatarColor(party.role);
  const soft = hexToRgba(color, 0.15);
  const inr = balance.inr;
  const thb = balance.thb;

  return (
    <Link href={`/party/${party.id}` as any} asChild>
      <TouchableOpacity activeOpacity={0.75}>
        <GlassCard style={styles.card}>
          <View style={[styles.avatar, { backgroundColor: soft, borderColor: color }]}>
            <Text style={[styles.avatarText, { color }]}>{initial}</Text>
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.name} numberOfLines={1}>
              {party.name}
            </Text>
            <View style={styles.metaRow}>
              <View style={[styles.roleChip, { backgroundColor: soft, borderColor: color }]}>
                <Text style={[styles.roleChipText, { color }]}>
                  {titleCase(party.role || "other")}
                </Text>
              </View>
              {party.phone ? (
                <Text style={styles.metaText} numberOfLines={1}>
                  · {party.phone}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.balCol}>
            {inr !== 0 ? (
              <Text
                style={[styles.balAmt, { color: inr > 0 ? colors.credit : colors.debit }]}
                numberOfLines={1}
              >
                {inr > 0 ? "+ " : "− "}
                {fmtCurrency(Math.abs(inr), "INR")}
              </Text>
            ) : (
              <Text style={[styles.balAmt, { color: colors.textDim }]}>—</Text>
            )}
            {thb !== 0 ? (
              <Text
                style={[styles.balSub, { color: thb > 0 ? colors.credit : colors.debit }]}
                numberOfLines={1}
              >
                {thb > 0 ? "+ " : "− "}
                {fmtCurrency(Math.abs(thb), "THB")}
              </Text>
            ) : null}
          </View>
        </GlassCard>
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
    paddingVertical: 4,
  },
  search: { flex: 1, color: colors.text, fontSize: 14, paddingVertical: 8 },
  filterRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterChipActive: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
  },
  filterText: { color: colors.textDim, fontSize: 11, fontWeight: "700" },
  filterTextActive: { color: colors.brand },
  list: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: 120 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "800" },
  cardBody: { flex: 1, minWidth: 0 },
  name: { color: colors.text, fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  metaText: { color: colors.textMuted, fontSize: 11 },
  roleChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  roleChipText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },
  balCol: {
    alignItems: "flex-end",
    minWidth: 90,
  },
  balAmt: { fontSize: 14, fontWeight: "800" },
  balSub: { fontSize: 11, fontWeight: "700", marginTop: 2 },
  center: {
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  dim: { color: colors.textDim, fontSize: 12 },
  errorTitle: { color: colors.danger, fontSize: 14, fontWeight: "800" },
  errorBody: { color: colors.textMuted, fontSize: 12, textAlign: "center" },
  retryBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.brand,
  },
  retryText: { color: colors.bgSolid, fontSize: 12, fontWeight: "800" },
  emptyTitle: { color: colors.text, fontSize: 14, fontWeight: "800", marginTop: 4 },
  emptyBody: { color: colors.textMuted, fontSize: 12, textAlign: "center", maxWidth: 260 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 92, // above OPSI orb
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
});
