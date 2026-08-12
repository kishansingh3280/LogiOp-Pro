/**
 * Invoices — Phase 10 Turn 2.
 *
 * Mobile: list-only. Tap row → /invoice/[id]
 * Tablet (width ≥ 900): master-detail split layout
 *   • LEFT: list, +New button, search box, filter chips
 *   • RIGHT: selected invoice detail (via <InvoiceDetailView />)
 *
 * Filters: All / Draft / Sent / Paid / Cancelled
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
import { fmtCurrency, shortDate, titleCase } from "@/src/lib/format";
import { InvoiceDetailView } from "@/src/lib/invoice-detail-view";
import { colors, radii, spacing } from "@/src/lib/theme";
import { Pill } from "@/src/lib/ui";

type InvoiceItem = { description?: string; quantity?: number; rate?: number };
type Invoice = {
  id: string;
  number: string;
  party_id: string;
  shipment_id?: string;
  date?: string;
  due_date?: string;
  currency?: string;
  items?: InvoiceItem[];
  tax_percent?: number;
  status?: string;
  notes?: string;
};

type Party = { id: string; name: string };

const STATUS: Record<string, { tint: string; soft: string }> = {
  draft: { tint: colors.textDim, soft: colors.divider },
  sent: { tint: colors.info, soft: colors.infoSoft },
  paid: { tint: colors.brand, soft: colors.brandSoft },
  cancelled: { tint: colors.danger, soft: colors.dangerSoft },
  overdue: { tint: colors.warn, soft: colors.warnSoft },
};

const FILTERS = ["all", "draft", "sent", "paid", "cancelled"] as const;
type FilterKey = (typeof FILTERS)[number];

function subtotal(inv: Invoice): number {
  return (inv.items || []).reduce(
    (sum, it) => sum + Number(it.rate ?? 0) * Number(it.quantity ?? 0),
    0,
  );
}
function grandTotal(inv: Invoice): number {
  const sub = subtotal(inv);
  const tax = sub * (Number(inv.tax_percent ?? 0) / 100);
  return sub + tax;
}

function handleNewInvoice() {
  Alert.alert(
    "New Invoice",
    "Create invoices from the desktop console. Mobile create flow is coming soon.",
    [{ text: "OK" }],
  );
}

export default function InvoicesScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const isTablet = useIsTablet();
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [parties, setParties] = useState<Party[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [invs, ps] = await Promise.all([
        apiGet<Invoice[]>("/api/invoices"),
        apiGet<Party[]>("/api/parties"),
      ]);
      setInvoices(Array.isArray(invs) ? invs : []);
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

  const partyMap = useMemo(() => {
    const m: Record<string, string> = {};
    (parties || []).forEach((p) => (m[p.id] = p.name));
    return m;
  }, [parties]);

  const filtered = useMemo(() => {
    let list = invoices || [];
    if (filter !== "all") list = list.filter((i) => (i.status || "draft") === filter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          (i.number || "").toLowerCase().includes(q) ||
          (partyMap[i.party_id] || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [invoices, filter, query, partyMap]);

  useEffect(() => {
    if (!isTablet) return;
    if (!filtered.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.find((i) => i.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [isTablet, filtered, selectedId]);

  const listPanel = (
    <View style={isTablet ? styles.leftPane : styles.mobilePane}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Invoices</Text>
            <Text style={styles.subtitle}>
              {filtered.length} shown · {invoices?.length ?? 0} total
            </Text>
          </View>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={handleNewInvoice}
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
            placeholder="Search by number or party…"
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
            const isActive = filter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setFilter(f)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {titleCase(f)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {invoices === null && loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.dim}>Loading invoices…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={24} color={colors.danger} />
          <Text style={styles.errorTitle}>Couldn&apos;t load invoices</Text>
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
          keyExtractor={(inv) => inv.id}
          renderItem={({ item }) => (
            <InvoiceRow
              invoice={item}
              partyName={partyMap[item.party_id]}
              selected={isTablet && item.id === selectedId}
              onPress={() =>
                isTablet ? setSelectedId(item.id) : router.push(`/invoice/${item.id}` as any)
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
              <Ionicons name="receipt-outline" size={32} color={colors.textDim} />
              <Text style={styles.emptyTitle}>
                {query || filter !== "all" ? "No matching invoices" : "No invoices yet"}
              </Text>
              <Text style={styles.emptyBody}>
                Invoices auto-generated from shipments will appear here.
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
              <InvoiceDetailView id={selectedId} />
            ) : (
              <View style={styles.emptyDetail}>
                <Ionicons name="receipt-outline" size={40} color={colors.textDim} />
                <Text style={styles.emptyDetailTitle}>No invoice selected</Text>
                <Text style={styles.emptyDetailBody}>
                  Pick an invoice from the list to view items, totals, and share as PDF.
                </Text>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      {listPanel}
    </SafeAreaView>
  );
}

function InvoiceRow({
  invoice,
  partyName,
  selected,
  onPress,
}: {
  invoice: Invoice;
  partyName?: string;
  selected?: boolean;
  onPress: () => void;
}) {
  const s = STATUS[(invoice.status || "draft").toLowerCase()] ?? STATUS.draft;
  const total = grandTotal(invoice);

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={[styles.row, selected && styles.rowSelected]}
      onPress={onPress}
    >
      <View style={styles.rowIcon}>
        <Ionicons name="receipt" size={16} color={colors.brand} />
      </View>
      <View style={styles.rowLeft}>
        <Text style={styles.invNo} numberOfLines={1}>
          {invoice.number}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {partyName || "Unknown party"}
        </Text>
        <View style={styles.rowMetaWrap}>
          <Pill
            label={titleCase(invoice.status || "draft")}
            tint={s.tint}
            soft={s.soft}
            size="sm"
          />
          <Text style={styles.dim}>{shortDate(invoice.date)}</Text>
        </View>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.amount}>{fmtCurrency(total, invoice.currency)}</Text>
        <Text style={styles.dim}>
          {invoice.items?.length ?? 0} item{(invoice.items?.length ?? 0) === 1 ? "" : "s"}
        </Text>
      </View>
    </TouchableOpacity>
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
  rowSelected: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
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
  invNo: { color: colors.text, fontSize: 15, fontWeight: "700" },
  rowSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  rowMetaWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 8 },
  amount: { color: colors.text, fontSize: 15, fontWeight: "800", letterSpacing: 0.3 },
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
