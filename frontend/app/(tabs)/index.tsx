/**
 * Overview / Dashboard — Phase 7.
 *
 * Restored quarantined widget layout (JARVIS Aura):
 *   Row 1  — Two side-by-side hero cards:
 *              • Customer will pay  (green, tap → /ledger)
 *              • You pay carrier    (red,  tap → /ledger)
 *            In Papa mode these switch to "Aapko Milega" / "Aapko Dena Hai".
 *   Row 2  — Bangkok Warehouse (full-width): current kg, bags, capacity %.
 *   Row 3  — Sliding shipment widgets carousel with page-dot indicator:
 *              • Delivered · In-transit · Pending — each shows count + a
 *              mini list of the last 4 consignments.
 *   Row 4  — Diagnostics (live sanity chips)
 *
 * NO layout / navigation logic changed elsewhere — this file alone.
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiGet } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth-context";
import { fmtCurrency, shortDate } from "@/src/lib/format";
import { useUiVoice } from "@/src/lib/papa-mode";
import { colors, radii, spacing } from "@/src/lib/theme";
import { GlassCard, LabelValueRow, Pill } from "@/src/lib/ui";

// ── API shapes ─────────────────────────────────────────────────────
type DashboardStats = {
  total?: number;
  pending?: number;
  in_transit?: number;
  warehouse_arrived?: number;
  delivered?: number;
  cancelled?: number;
};

type LedgerSummary = {
  receivable?: { inr?: number; thb?: number };
  payable?: { inr?: number; thb?: number };
  top_get?: { id: string; name: string; inr?: number; thb?: number }[];
  top_give?: { id: string; name: string; inr?: number; thb?: number }[];
};

type Warehouse = {
  current_kg?: number;
  capacity_kg?: number;
  current_bags?: number;
  undelivered_bags?: number;
  booked_deliveries?: number;
  pending_deliveries?: number;
  pct?: number;
  by_end_customer?: { name: string; bags: number; kg: number }[];
};

type Shipment = {
  id: string;
  consignment_no: string;
  direction: "IN_TO_TH" | "TH_TO_IN";
  status: string;
  weight_kg: number;
  bag_count: number;
  party_id?: string;
  carrier_party_id?: string;
  created_at: string;
  delivered_at?: string | null;
  in_transit_at?: string | null;
  dispatch_date?: string | null;
};

type Party = { id: string; name: string };

// ── Screen ─────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { user, token, authError, refresh } = useAuth();
  const voice = useUiVoice();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [ledger, setLedger] = useState<LedgerSummary | null>(null);
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [shipments, setShipments] = useState<Shipment[] | null>(null);
  const [parties, setParties] = useState<Party[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, l, w, sh, ps] = await Promise.all([
        apiGet<DashboardStats>("/api/dashboard/stats"),
        apiGet<LedgerSummary>("/api/dashboard/ledger-summary"),
        apiGet<Warehouse>("/api/dashboard/warehouse").catch(() => null),
        apiGet<Shipment[]>("/api/shipments").catch(() => []),
        apiGet<Party[]>("/api/parties").catch(() => []),
      ]);
      setStats(s);
      setLedger(l);
      setWarehouse(w);
      setShipments(Array.isArray(sh) ? sh : []);
      setParties(Array.isArray(ps) ? ps : []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) loadAll();
  }, [token, loadAll]);

  const onRefresh = useCallback(async () => {
    await refresh();
    await loadAll();
  }, [refresh, loadAll]);

  // ── Party name resolver ─────────────────────────────────────────
  const partyName = useCallback(
    (id?: string | null) =>
      (id && (parties || []).find((p) => p.id === id)?.name) || "—",
    [parties],
  );

  // ── Sorted shipment sub-lists (top 4 each) ──────────────────────
  const buckets = useMemo(() => {
    const src = shipments || [];
    const byNewest = (a: Shipment, b: Shipment) =>
      (b.created_at || "").localeCompare(a.created_at || "");
    return {
      delivered: src
        .filter((s) => s.status === "delivered")
        .sort(byNewest)
        .slice(0, 4),
      in_transit: src
        .filter((s) => s.status === "in_transit" || s.status === "warehouse_arrived")
        .sort(byNewest)
        .slice(0, 4),
      pending: src.filter((s) => s.status === "pending").sort(byNewest).slice(0, 4),
    };
  }, [shipments]);

  // ── Sliding widgets carousel ────────────────────────────────────
  const scrollRef = useRef<ScrollView | null>(null);
  const [widgetPage, setWidgetPage] = useState(0);
  const WIDGET_W = width - spacing.lg * 2; // full-width inside padding
  const WIDGETS: {
    key: "delivered" | "in_transit" | "pending";
    label: string;
    count: number;
    tint: string;
    soft: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    list: Shipment[];
  }[] = useMemo(
    () => [
      {
        key: "delivered",
        label: voice.delivered,
        count: stats?.delivered ?? 0,
        tint: colors.brand,
        soft: colors.brandSoft,
        icon: "checkmark-done",
        list: buckets.delivered,
      },
      {
        key: "in_transit",
        label: voice.inTransit,
        count: (stats?.in_transit ?? 0) + (stats?.warehouse_arrived ?? 0),
        tint: colors.info,
        soft: colors.infoSoft,
        icon: "airplane",
        list: buckets.in_transit,
      },
      {
        key: "pending",
        label: voice.pending,
        count: stats?.pending ?? 0,
        tint: colors.warn,
        soft: colors.warnSoft,
        icon: "hourglass",
        list: buckets.pending,
      },
    ],
    [buckets, stats, voice],
  );

  const onWidgetScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const page = Math.round(x / WIDGET_W);
      if (page !== widgetPage) setWidgetPage(page);
    },
    [WIDGET_W, widgetPage],
  );

  const capacityPct = Math.min(
    100,
    Math.round(warehouse?.pct ?? 0),
  );

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.brand} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandWrap}>
            <View style={styles.brandDot} />
            <Text style={styles.brand}>LogiOp Pro</Text>
          </View>
          <Pill
            label={token ? "LIVE" : authError ? "OFFLINE" : "SYNCING"}
            tint={token ? colors.brand : authError ? colors.danger : colors.warn}
            soft={token ? colors.brandSoft : authError ? colors.dangerSoft : colors.warnSoft}
          />
        </View>

        {/* Greeting */}
        <GlassCard glow style={styles.greetCard}>
          <Text style={styles.eyebrow}>{voice.greet}</Text>
          <Text style={styles.greet}>
            {user ? `${user.display_name} ${user.honorific}` : "Sir"}
          </Text>
          <Text style={styles.greetSub}>
            {user?.role} · {user?.username}
          </Text>
        </GlassCard>

        {/* Row 1 — Two hero cards side by side */}
        <View style={styles.heroRow}>
          <HeroCard
            title={voice.customerWillPay}
            valueInr={ledger?.receivable?.inr ?? 0}
            valueThb={ledger?.receivable?.thb ?? 0}
            top={ledger?.top_get?.[0]?.name || ""}
            tint={colors.credit}
            soft="rgba(0,255,136,0.14)"
            border="rgba(0,255,136,0.55)"
            onPress={() => router.push("/ledger" as any)}
          />
          <HeroCard
            title={voice.youPayCarrier}
            valueInr={ledger?.payable?.inr ?? 0}
            valueThb={ledger?.payable?.thb ?? 0}
            top={ledger?.top_give?.[0]?.name || ""}
            tint={colors.debit}
            soft="rgba(255,68,68,0.14)"
            border="rgba(255,68,68,0.55)"
            onPress={() => router.push("/ledger" as any)}
          />
        </View>

        {/* Row 2 — Bangkok Warehouse */}
        <Text style={styles.sectionTitle}>{voice.bangkokWarehouse}</Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push("/(tabs)/shipments" as any)}
        >
          <GlassCard style={styles.warehouseCard}>
            <View style={styles.warehouseTop}>
              <View style={styles.warehouseHeader}>
                <Ionicons name="cube" size={16} color={colors.brand} />
                <Text style={styles.warehouseLabel}>Bangkok</Text>
              </View>
              <Text style={styles.dim}>{warehouse?.undelivered_bags ?? 0} undelivered</Text>
            </View>
            <View style={styles.warehouseMain}>
              <View style={{ flex: 1 }}>
                <Text style={styles.warehouseValue}>
                  {(warehouse?.current_kg ?? 0).toFixed(0)}
                  <Text style={styles.warehouseUnit}> kg</Text>
                </Text>
                <Text style={styles.warehouseSub}>
                  {warehouse?.current_bags ?? 0} bags · capacity{" "}
                  {warehouse?.capacity_kg ?? 0} kg
                </Text>
              </View>
              <View style={styles.pctBadge}>
                <Text style={styles.pctText}>{capacityPct}%</Text>
              </View>
            </View>
            <View style={styles.progressWrap}>
              <View style={[styles.progressFill, { width: `${capacityPct}%` }]} />
            </View>
          </GlassCard>
        </TouchableOpacity>

        {/* Row 3 — Sliding widget carousel */}
        <Text style={styles.sectionTitle}>Shipment status</Text>
        <View>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onWidgetScroll}
            scrollEventThrottle={16}
            snapToInterval={WIDGET_W}
            decelerationRate="fast"
            style={styles.widgetScroller}
          >
            {WIDGETS.map((w) => (
              <View key={w.key} style={[styles.widgetPage, { width: WIDGET_W }]}>
                <GlassCard style={styles.widgetCard}>
                  <View style={styles.widgetTop}>
                    <View
                      style={[
                        styles.widgetIcon,
                        { backgroundColor: w.soft, borderColor: w.tint },
                      ]}
                    >
                      <Ionicons name={w.icon} size={16} color={w.tint} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.widgetLabel}>{w.label}</Text>
                      <Text style={[styles.widgetCount, { color: w.tint }]}>{w.count}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
                  </View>
                  {w.list.length ? (
                    <View style={styles.widgetList}>
                      {w.list.map((sh, idx) => (
                        <TouchableOpacity
                          key={sh.id}
                          onPress={() => router.push(`/shipment/${sh.id}` as any)}
                          activeOpacity={0.75}
                          style={[
                            styles.widgetItem,
                            idx < w.list.length - 1 && styles.widgetItemBorder,
                          ]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.widgetItemTitle} numberOfLines={1}>
                              {sh.consignment_no}
                            </Text>
                            <Text style={styles.widgetItemSub} numberOfLines={1}>
                              {w.key === "delivered"
                                ? `${shortDate(sh.delivered_at || sh.dispatch_date || sh.created_at)} · ${partyName(sh.party_id)}`
                                : w.key === "in_transit"
                                  ? `${sh.direction === "IN_TO_TH" ? "IN→TH" : "TH→IN"} · ${partyName(sh.carrier_party_id)}`
                                  : `${shortDate(sh.created_at)} · ${sh.weight_kg} kg`}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={14} color={colors.textDim} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.widgetEmpty}>
                      <Text style={styles.dim}>No {w.label.toLowerCase()} shipments</Text>
                    </View>
                  )}
                </GlassCard>
              </View>
            ))}
          </ScrollView>

          {/* Widget page dots */}
          <View style={styles.dots}>
            {WIDGETS.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  idx === widgetPage ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Diagnostics */}
        <Text style={styles.sectionTitle}>Diagnostics</Text>
        <GlassCard>
          <LabelValueRow
            label="Backend"
            value={error ? "Error" : "Reachable"}
            valueColor={error ? colors.debit : colors.credit}
          />
          <LabelValueRow
            label="Auth token"
            value={token ? "Present" : "Pending / offline"}
            valueColor={token ? colors.credit : colors.warn}
          />
          <LabelValueRow label="User" value={user?.display_name || "—"} />
          <LabelValueRow
            label="Mode"
            value={voice.isPapa ? "Papa · Simplified Hindi" : "Standard"}
            valueColor={voice.isPapa ? colors.brand : colors.text}
          />
        </GlassCard>

        {stats === null && loading ? (
          <View style={styles.loadingBar}>
            <ActivityIndicator color={colors.brand} />
            <Text style={styles.dim}>Loading…</Text>
          </View>
        ) : null}

        <Text style={styles.footNote}>
          Aura · Phase 7 online{voice.isPapa ? " · Papa Mode" : ""}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── HeroCard ────────────────────────────────────────────────────────
function HeroCard({
  title,
  valueInr,
  valueThb,
  top,
  tint,
  soft,
  border,
  onPress,
}: {
  title: string;
  valueInr: number;
  valueThb: number;
  top: string;
  tint: string;
  soft: string;
  border: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.heroWrap}>
      <View style={[styles.hero, { backgroundColor: soft, borderColor: border }]}>
        <View style={styles.heroHeader}>
          <View style={[styles.heroDot, { backgroundColor: tint }]} />
          <Text style={[styles.heroLabel, { color: tint }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <Text
          style={[styles.heroValue, { color: tint }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {fmtCurrency(valueInr, "INR")}
        </Text>
        <Text
          style={[styles.heroAlt, { color: tint }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {fmtCurrency(valueThb, "THB")}
        </Text>
        {top ? (
          <Text style={styles.heroTop} numberOfLines={1}>
            Top: {top}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: 100 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  brandWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand,
    shadowColor: colors.brand,
    shadowOpacity: 0.9,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
    elevation: 4,
  },
  brand: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  greetCard: { padding: spacing.lg, marginBottom: spacing.md },
  eyebrow: {
    color: colors.textDim,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  greet: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 4,
    letterSpacing: -0.5,
  },
  greetSub: { color: colors.textMuted, fontSize: 13, marginTop: 4 },

  // ─ Hero row
  heroRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  heroWrap: { flex: 1 },
  hero: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    minHeight: 130,
    justifyContent: "space-between",
  },
  heroHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroDot: { width: 8, height: 8, borderRadius: 4 },
  heroLabel: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flex: 1,
  },
  heroValue: { fontSize: 24, fontWeight: "800", letterSpacing: -0.4, marginTop: 6 },
  heroAlt: { fontSize: 14, fontWeight: "700", opacity: 0.85, marginTop: 2 },
  heroTop: { color: colors.textMuted, fontSize: 10, marginTop: 8 },

  // ─ Section title
  sectionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // ─ Warehouse
  warehouseCard: { padding: spacing.md },
  warehouseTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  warehouseHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  warehouseLabel: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  warehouseMain: { flexDirection: "row", alignItems: "flex-end", gap: spacing.md },
  warehouseValue: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  warehouseUnit: { fontSize: 14, color: colors.textMuted, fontWeight: "700" },
  warehouseSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  pctBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.brandSoft,
    borderColor: colors.brandBorder,
    borderWidth: 1,
    borderRadius: radii.pill,
  },
  pctText: { color: colors.brand, fontSize: 12, fontWeight: "800" },
  progressWrap: {
    height: 6,
    backgroundColor: colors.divider,
    borderRadius: 3,
    marginTop: spacing.sm,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.brand,
    borderRadius: 3,
  },

  // ─ Widgets carousel
  widgetScroller: { marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg },
  widgetPage: { paddingRight: 0 },
  widgetCard: { padding: spacing.md, marginRight: 0 },
  widgetTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  widgetIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  widgetLabel: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  widgetCount: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  widgetList: { marginTop: spacing.sm },
  widgetItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: spacing.sm,
  },
  widgetItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  widgetItemTitle: { color: colors.text, fontSize: 13, fontWeight: "700" },
  widgetItemSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  widgetEmpty: { paddingVertical: spacing.md, alignItems: "center" },

  // ─ Dots
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing.sm,
  },
  dot: { height: 6, borderRadius: 3 },
  dotActive: {
    width: 20,
    backgroundColor: colors.brand,
    shadowColor: colors.brand,
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 4,
    elevation: 2,
  },
  dotInactive: { width: 6, backgroundColor: colors.textDim, opacity: 0.5 },

  dim: { color: colors.textDim, fontSize: 11 },
  loadingBar: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  footNote: {
    color: colors.textDim,
    fontSize: 11,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: spacing.xl,
  },
});
