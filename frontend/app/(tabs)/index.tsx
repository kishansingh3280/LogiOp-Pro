import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { subscribeQueue, getQueue, flushQueue } from "@/src/api/client";
import { useApi } from "@/src/api/hooks";
import type { DashboardStats, LedgerEntry, LedgerSummary, Party, Shipment, WarehouseSummary } from "@/src/api/types";
import { useAuth } from "@/src/auth/context";
import { computeAssetTotals } from "@/src/bullion/AssetMap";
import { useTrips, useTxns, usedWeightKgFor } from "@/src/bullion/store";
import type { BullionTxn, CarrierTrip } from "@/src/bullion/types";
import { tripCapacityKg } from "@/src/bullion/types";
import { CompanySwitcher } from "@/src/components/company-switcher";
import { FYPicker } from "@/src/components/fy-picker";
import { Card } from "@/src/components/ui";
import { useFY } from "@/src/context/fy-context";
import { useCardBreathing } from "@/src/hooks/use-card-breathing";
import { useIsTablet } from "@/src/hooks/use-is-tablet";
import { colors, radii, spacing } from "@/src/theme";
import { fmtCurrency, relTime, shortDate } from "@/src/utils/format";
import { isInFY } from "@/src/utils/fy";

export default function DashboardScreen() {
  const router = useRouter();
  const tablet = useIsTablet();
  const { fy } = useFY();
  const { user } = useAuth();
  const stats = useApi<DashboardStats>("/api/dashboard/stats");
  const warehouse = useApi<WarehouseSummary>("/api/dashboard/warehouse");
  const ledger = useApi<LedgerSummary>("/api/dashboard/ledger-summary");
  const shipments = useApi<Shipment[]>("/api/shipments");
  const entries = useApi<LedgerEntry[]>("/api/ledger/entries");
  const parties = useApi<Party[]>("/api/parties");
  const trips = useTrips();
  const batches = useTxns();

  const [pending, setPending] = useState(0);
  useEffect(() => {
    const load = () => getQueue().then((q) => setPending(q.length));
    load();
    return subscribeQueue(load);
  }, []);

  const onRefresh = useCallback(async () => {
    await flushQueue();
    await Promise.all([
      stats.refresh(),
      warehouse.refresh(),
      ledger.refresh(),
      shipments.refresh(),
      entries.refresh(),
      parties.refresh(),
    ]);
  }, [stats, warehouse, ledger, shipments, entries, parties]);

  const loading = stats.loading || warehouse.loading || ledger.loading;

  // FY-filtered shipments/ledger — dashboard stat counters and receivable
  // tiles now reflect the selected Financial Year. Aggregate endpoints
  // don't accept FY params, so we recompute client-side from the raw
  // lists. `warehouse` remains real-time (it's a "right now" metric).
  const fyShipments = useMemo(
    () => (shipments.data || []).filter((sh) => isInFY(sh.dispatch_date || sh.created_at, fy)),
    [shipments.data, fy],
  );
  const fyStats = useMemo(() => {
    const acc = { total: 0, delivered: 0, in_transit: 0, pending: 0, warehouse_arrived: 0, cancelled: 0 };
    for (const sh of fyShipments) {
      acc.total += 1;
      const key = (sh.status || "pending") as keyof typeof acc;
      if (key in acc) (acc as Record<string, number>)[key] += 1;
    }
    return acc;
  }, [fyShipments]);

  const fyLedger = useMemo(() => {
    const perParty: Record<string, { inr: number; thb: number }> = {};
    for (const e of entries.data || []) {
      if (!isInFY(e.date, fy)) continue;
      const cur = (e.currency || "INR").toUpperCase() === "THB" ? "thb" : "inr";
      const bucket = (perParty[e.party_id] ||= { inr: 0, thb: 0 });
      bucket[cur] += (e.debit || 0) - (e.credit || 0);
    }
    let recInr = 0, recThb = 0, payInr = 0, payThb = 0;
    for (const bal of Object.values(perParty)) {
      if (bal.inr > 0) recInr += bal.inr;
      else if (bal.inr < 0) payInr += -bal.inr;
      if (bal.thb > 0) recThb += bal.thb;
      else if (bal.thb < 0) payThb += -bal.thb;
    }
    return { receivable: { inr: recInr, thb: recThb }, payable: { inr: payInr, thb: payThb } };
  }, [entries.data, fy]);

  const s = fyStats;
  const total = s.total || 0;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  const recent = fyShipments.slice(0, tablet ? 6 : 4);

  // ------------------------------------------------------------------
  // Mini-lists inside Delivered / In Transit / Pending stat tiles.
  // Each tile shows the last 4 shipments in its status bucket. Party
  // and carrier names are resolved via the /api/parties response.
  // ------------------------------------------------------------------
  const partyName = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of parties.data || []) m.set(p.id, p.name);
    return (id?: string | null) => (id && m.get(id)) || "—";
  }, [parties.data]);

  const deliveredList = useMemo<StatItem[]>(() => {
    return [...fyShipments]
      .filter((sh) => sh.status === "delivered")
      .sort((a, b) => {
        const da = a.delivered_at || a.dispatch_date || a.created_at;
        const db = b.delivered_at || b.dispatch_date || b.created_at;
        return da < db ? 1 : -1;
      })
      .slice(0, 4)
      .map((sh) => ({
        key: sh.id,
        line1: sh.consignment_no,
        line2: `${shortDate(sh.delivered_at || sh.dispatch_date || sh.created_at)} · ${partyName(sh.party_id)}`,
        onPress: () => router.push(`/shipment/${sh.id}` as never),
      }));
  }, [fyShipments, partyName, router]);

  const inTransitList = useMemo<StatItem[]>(() => {
    return [...fyShipments]
      .filter((sh) => sh.status === "in_transit" || sh.status === "warehouse_arrived")
      .sort((a, b) => {
        const da = a.in_transit_at || a.dispatch_date || a.created_at;
        const db = b.in_transit_at || b.dispatch_date || b.created_at;
        return da < db ? 1 : -1;
      })
      .slice(0, 4)
      .map((sh) => ({
        key: sh.id,
        line1: sh.consignment_no,
        line2: `${sh.direction === "IN_TO_TH" ? "IN→TH" : "TH→IN"} · ${partyName(sh.carrier_party_id)}`,
        onPress: () => router.push(`/shipment/${sh.id}` as never),
      }));
  }, [fyShipments, partyName, router]);

  const pendingList = useMemo<StatItem[]>(() => {
    return [...fyShipments]
      .filter((sh) => sh.status === "pending")
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 4)
      .map((sh) => ({
        key: sh.id,
        line1: sh.consignment_no,
        line2: `${shortDate(sh.created_at)} · ${sh.weight_kg} kg`,
        onPress: () => router.push(`/shipment/${sh.id}` as never),
      }));
  }, [fyShipments, router]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.lime} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header} testID="overview-header">
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>
              Welcome back, {user ? `${user.display_name} ${user.honorific}` : "Sir"}
            </Text>
            <Text style={styles.title}>India <Text style={styles.lime}>⇄</Text> Thailand</Text>
            <Text style={styles.subtitle}>Live view of shipments, ledger and warehouse.</Text>
          </View>
          <View style={{ gap: 8, alignItems: "flex-end" }}>
            <CompanySwitcher />
            <FYPicker earliest="2024-04-01" />
            {pending > 0 ? (
              <TouchableOpacity style={styles.badge} onPress={onRefresh} testID="sync-badge">
                <Ionicons name="cloud-upload-outline" size={14} color={colors.lime} />
                <Text style={styles.badgeText}>{pending} queued</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* ---------------- Row 1 (FIXED — no horizontal scroll) ----------------
            Ledger snapshot: 2 widgets side by side. Pinned near the top so
            the operator sees the money position immediately. `flexDirection`
            is forced to "row" (overrides the mobile default of column) so
            the two cards always share the width, on every screen size. */}
        <View style={[styles.row, styles.rowTablet]}>
          <View style={[styles.col, styles.colTablet]}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push("/ledger")}
              testID="ledger-get-card"
            >
              <Card style={styles.ledgerCard}>
                <View style={styles.ledgerHeader}>
                  <View style={[styles.ledgerDot, { backgroundColor: colors.ok }]} />
                  <Text style={styles.ledgerLabel}>Customer will pay</Text>
                </View>
                <Text style={styles.ledgerBig} numberOfLines={1} adjustsFontSizeToFit>{fmtCurrency(fyLedger.receivable.inr, "INR")}</Text>
                <Text style={styles.ledgerAlt} numberOfLines={1} adjustsFontSizeToFit>{fmtCurrency(fyLedger.receivable.thb, "THB")}</Text>
                {ledger.data?.top_get?.[0] ? (
                  <Text style={styles.ledgerHint} numberOfLines={1}>
                    Top: {ledger.data.top_get[0].name}
                  </Text>
                ) : null}
              </Card>
            </TouchableOpacity>
          </View>
          <View style={[styles.col, styles.colTablet]}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push("/ledger")}
              testID="ledger-give-card"
            >
              <Card style={styles.ledgerCard}>
                <View style={styles.ledgerHeader}>
                  <View style={[styles.ledgerDot, { backgroundColor: colors.danger }]} />
                  <Text style={styles.ledgerLabel}>You pay carrier</Text>
                </View>
                <Text style={styles.ledgerBig} numberOfLines={1} adjustsFontSizeToFit>{fmtCurrency(fyLedger.payable.inr, "INR")}</Text>
                <Text style={styles.ledgerAlt} numberOfLines={1} adjustsFontSizeToFit>{fmtCurrency(fyLedger.payable.thb, "THB")}</Text>
                {ledger.data?.top_give?.[0] ? (
                  <Text style={styles.ledgerHint} numberOfLines={1}>
                    Top: {ledger.data.top_give[0].name}
                  </Text>
                ) : null}
              </Card>
            </TouchableOpacity>
          </View>
        </View>

        {/* ---------------- Row 2a (FIXED — Bangkok Warehouse on its own full-width row) ----------------
            Warehouse widget is always visible; not part of the carousel. */}
        <WarehouseHero
          warehouseData={warehouse.data}
          onOpen={() => router.push("/shipments")}
        />

        {/* ---------------- Row 2b (HORIZONTAL CAROUSEL — 3 widgets) ----------------
            Delivered / In Transit / Pending. Each tile shows the last 4
            related shipments below its main number. Dots auto-count to 3. */}
        <DashCarousel tablet={tablet}>
          {/* Widget 1 — Delivered */}
          <StatTile
            title="Delivered"
            value={String(s.delivered)}
            sub={`${pct(s.delivered)}% of total`}
            tint={colors.ok}
            icon="checkmark-done-outline"
            items={deliveredList}
          />
          {/* Widget 2 — In Transit */}
          <StatTile
            title="In Transit"
            value={String(s.in_transit + s.warehouse_arrived)}
            sub={`${pct(s.in_transit + s.warehouse_arrived)}% of total`}
            tint={colors.info}
            icon="airplane-outline"
            items={inTransitList}
          />
          {/* Widget 3 — Pending */}
          <StatTile
            title="Pending"
            value={String(s.pending)}
            sub={`${pct(s.pending)}% of total`}
            tint={colors.warn}
            icon="time-outline"
            items={pendingList}
          />
        </DashCarousel>

        {/* Bullion module — reordered per operator's request:
              1. Active Carrier Trips (upcoming/in-flight bullion trips)
              2. Bullion Vault Snapshot (assets on hand by location) */}
        <ActiveCarrierTripsCard
          trips={trips.data}
          txns={batches.data}
          onPress={() => router.push("/bullion" as never)}
        />
        <AssetsOnHandCard txns={batches.data} onPress={() => router.push("/bullion" as never)} />

        {/* Reports console shortcut — quick access to PDF exports. */}
        <TouchableOpacity
          style={styles.reportsShortcut}
          onPress={() => router.push("/reports" as never)}
          testID="reports-shortcut"
        >
          <Ionicons name="document-text-outline" size={16} color={colors.lime} />
          <Text style={styles.reportsShortcutText}>Open Reports Console</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textDim} />
        </TouchableOpacity>

        {/* Modes + Direction */}
        <View style={[styles.row, tablet && styles.rowTablet]}>
          <View style={[styles.col, tablet && styles.colTablet]}>
            <Card>
              <Text style={styles.cardTitle}>Shipments by mode</Text>
              <Text style={styles.cardSub}>Volume across cargo modes</Text>
              <View style={{ marginTop: spacing.md }}>
                {(stats.data?.modes || []).length === 0 ? (
                  <Text style={styles.dim}>No shipment data yet</Text>
                ) : (
                  (stats.data?.modes || []).map((m) => (
                    <ModeBar key={m.mode} mode={m.mode} count={m.count} total={total} />
                  ))
                )}
              </View>
            </Card>
          </View>
          <View style={[styles.col, tablet && styles.colTablet]}>
            <Card>
              <Text style={styles.cardTitle}>Direction &amp; status</Text>
              <Text style={styles.cardSub}>India ⇄ Thailand split</Text>
              <View style={styles.directionGrid}>
                <DirTile label="IN → TH" value={countBy(shipments.data || [], (x) => x.direction === "IN_TO_TH")} />
                <DirTile label="TH → IN" value={countBy(shipments.data || [], (x) => x.direction === "TH_TO_IN")} />
                <DirTile label="Delivered" value={s?.delivered || 0} tint={colors.ok} />
                <DirTile label="Warehouse" value={s?.warehouse_arrived || 0} tint={colors.lime} />
                <DirTile label="In transit" value={s?.in_transit || 0} tint={colors.info} />
                <DirTile label="Pending" value={s?.pending || 0} tint={colors.warn} />
              </View>
            </Card>
          </View>
        </View>

        {/* Active carrier weight (Bullion) */}
        <View style={styles.recentHeader}>
          <Text style={styles.cardTitle}>Active carrier trips</Text>
          <TouchableOpacity onPress={() => router.push("/bullion")} testID="see-all-bullion">
            <Text style={styles.link}>Bullion →</Text>
          </TouchableOpacity>
        </View>
        {(() => {
          const today = new Date().toISOString().slice(0, 10);
          const upcoming = trips.data
            .filter((t) => t.date >= today)
            .map((t) => ({
              ...t,
              capacity_kg: tripCapacityKg(t),
              used_kg: usedWeightKgFor(t.id, batches.data),
            }))
            .sort((a, b) => (a.date < b.date ? -1 : 1))
            .slice(0, tablet ? 6 : 3);
          if (upcoming.length === 0) {
            return (
              <Card>
                <Text style={styles.dim}>
                  No upcoming trips. Open the Bullion tab to add a carrier trip.
                </Text>
              </Card>
            );
          }
          return (
            <View style={{ gap: spacing.md }}>
              {upcoming.map((t) => {
                const free = Math.max(0, t.capacity_kg - t.used_kg);
                const pct = t.capacity_kg > 0 ? Math.round((t.used_kg / t.capacity_kg) * 100) : 0;
                const full = t.capacity_kg > 0 && free <= 0;
                return (
                  <TouchableOpacity
                    key={t.id}
                    activeOpacity={0.85}
                    onPress={() => router.push("/bullion")}
                    testID={`dash-trip-${t.id}`}
                  >
                    <Card>
                      <View style={styles.recRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.recTitle}>
                            {t.carrier_name || "Carrier TBD"}
                          </Text>
                          <Text style={styles.recSub}>
                            {t.route === "IN_TO_TH" ? "India → BKK" : "BKK → India"} · {shortDate(t.date)}
                          </Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={[styles.recValue, full && { color: colors.danger }]}>
                            {full ? "FULL" : `${fmtKgDash(free)}/${fmtKgDash(t.capacity_kg)}`}
                          </Text>
                          <Text style={styles.recDim}>kg free</Text>
                        </View>
                      </View>
                      <View style={styles.trackMini}>
                        <View style={[styles.trackFillMini, { width: `${Math.min(100, pct)}%` }]} />
                      </View>
                    </Card>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })()}

        {/* Recent */}
        <View style={styles.recentHeader}>
          <Text style={styles.cardTitle}>Recent shipments</Text>
          <TouchableOpacity onPress={() => router.push("/shipments")} testID="see-all-shipments">
            <Text style={styles.link}>See all →</Text>
          </TouchableOpacity>
        </View>
        {recent.length === 0 ? (
          <Card>
            <Text style={styles.dim}>No shipments yet — create one to see it here</Text>
          </Card>
        ) : (
          <View style={{ gap: spacing.md }}>
            {recent.map((sh) => (
              <TouchableOpacity
                key={sh.id}
                onPress={() => router.push(`/shipment/${sh.id}` as never)}
                activeOpacity={0.85}
                testID={`recent-shipment-${sh.id}`}
              >
                <Card>
                  <View style={styles.recRow}>
                    <View>
                      <Text style={styles.recTitle}>{sh.consignment_no}</Text>
                      <Text style={styles.recSub}>
                        {sh.origin || "?"} → {sh.destination || "?"} · {sh.mode}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.recValue}>{sh.weight_kg} kg</Text>
                      <Text style={styles.recDim}>{relTime(sh.created_at)}</Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function fmtKgDash(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * WarehouseHero — Bangkok warehouse full-width card. Extracted so we can
 * hook `useCardBreathing` at the component root (hooks can't sit in-line
 * inside the JSX tree of DashboardScreen).
 */
function WarehouseHero({
  warehouseData,
  onOpen,
}: {
  warehouseData: WarehouseSummary | null | undefined;
  onOpen: () => void;
}) {
  const breathe = useCardBreathing({ blur: false });
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onOpen} testID="warehouse-card">
      <LinearGradient colors={["#0a0a0a", "#0f0f0f"]} style={[styles.hero, breathe]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>Bangkok warehouse</Text>
            <Text style={styles.heroValue}>{warehouseData?.current_bags ?? 0}</Text>
            <Text style={styles.heroSub}>bags awaiting delivery</Text>
          </View>
          <View style={styles.heroRight}>
            <Text style={styles.heroLabel}>Total weight</Text>
            <Text style={styles.heroValueSmall}>{Math.round(warehouseData?.current_kg || 0)} kg</Text>
            <Text style={styles.heroSub}>
              {Math.round(warehouseData?.pct || 0)}% of {Math.round(warehouseData?.capacity_kg || 0)} kg
            </Text>
          </View>
        </View>

        {/* Capacity bar */}
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${Math.min(100, warehouseData?.pct || 0)}%` }]} />
        </View>

        <View style={styles.heroFooter}>
          <View>
            <Text style={styles.heroLabel}>Not yet booked</Text>
            <Text style={styles.heroValueSmall}>{warehouseData?.pending_deliveries ?? 0}</Text>
          </View>
          <View>
            <Text style={styles.heroLabel}>Booked</Text>
            <Text style={styles.heroValueSmall}>{warehouseData?.booked_deliveries ?? 0}</Text>
          </View>
          <TouchableOpacity style={styles.heroCta} onPress={onOpen}>
            <Text style={styles.heroCtaText}>view shipments</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.bg} />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}


export type StatItem = {
  key: string;
  line1: string;
  line2: string;
  onPress?: () => void;
};

function StatTile({
  title,
  value,
  sub,
  tint,
  icon,
  items,
}: {
  title: string;
  value: string;
  sub: string;
  tint: string;
  icon: keyof typeof Ionicons.glyphMap;
  items?: StatItem[];
}) {
  const breathe = useCardBreathing();
  return (
    <View style={[styles.stat, breathe]} testID={`stat-${title}`}>
      <View style={styles.statHead}>
        <Text style={styles.statTitle}>{title}</Text>
        <View style={[styles.statIcon, { borderColor: tint + "55" }]}>
          <Ionicons name={icon} size={14} color={tint} />
        </View>
      </View>
      <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
      <Text style={styles.statSub}>{sub}</Text>
      {items && items.length > 0 ? (
        <View style={styles.statList} testID={`stat-${title}-list`}>
          <View style={styles.statListDivider} />
          {items.map((it) => (
            <TouchableOpacity
              key={it.key}
              activeOpacity={0.7}
              onPress={it.onPress}
              style={styles.statListRow}
              testID={`stat-${title}-row-${it.key}`}
            >
              <Text style={styles.statListL1} numberOfLines={1}>
                {it.line1}
              </Text>
              <Text style={styles.statListL2} numberOfLines={1}>
                {it.line2}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * DashCarousel — horizontal snap-carousel with dot indicators.
 *
 * • Renders each child on its own "page".
 * • Mobile: 1 page fills the viewport width (minus the ScrollView's
 *   horizontal padding). Tablet: 2 pages fit side-by-side.
 * • `pagingEnabled` + `snapToInterval` gives auto-snap on scroll stop
 *   on both touch (mobile) and mouse-drag / wheel (RN Web).
 * • Dot count = child count (3 pages: Delivered / In Transit / Pending).
 */
function DashCarousel({
  tablet,
  children,
}: {
  tablet: boolean;
  children: React.ReactNode;
}) {
  const items = React.Children.toArray(children);
  const { width: winWidth } = useWindowDimensions();
  // Horizontal padding around the whole dashboard scroll view (styles.content).
  // Kept in sync with the actual value below (see styles.content).
  const contentPadH = spacing.lg * 2;
  const perPage = tablet ? 2 : 1;
  const gap = spacing.md;
  const trackWidth = Math.max(280, winWidth - contentPadH);
  const pageWidth = perPage === 2 ? (trackWidth - gap) / 2 : trackWidth;
  const [active, setActive] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      // Snap unit = pageWidth + gap (each item occupies pageWidth then a gap).
      const idx = Math.round(x / (pageWidth + gap));
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      if (clamped !== active) setActive(clamped);
    },
    [active, items.length, pageWidth, gap],
  );
  return (
    <View testID="dash-carousel">
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        // Snap to each item's width so a single swipe moves exactly one
        // widget (mobile) or one column (tablet).
        snapToInterval={pageWidth + gap}
        snapToAlignment="start"
        decelerationRate="fast"
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        // Also update active dot mid-scroll so desktop mouse-wheel (which
        // never fires the momentum/drag-end events on RN Web) keeps the
        // dot indicators in sync.
        onScroll={onScrollEnd}
        scrollEventThrottle={64}
        contentContainerStyle={{ gap }}
      >
        {items.map((child, i) => (
          <View key={i} style={{ width: pageWidth }} testID={`dash-carousel-page-${i}`}>
            {child}
          </View>
        ))}
      </ScrollView>
      {/* Dot indicators — one per child, always visible below the row.  */}
      <View style={styles.dotRow} testID="dash-carousel-dots">
        {items.map((_, i) => {
          const isActive = i === active;
          return (
            <TouchableOpacity
              key={i}
              onPress={() => {
                setActive(i);
                scrollRef.current?.scrollTo({ x: i * (pageWidth + gap), animated: true });
              }}
              accessibilityRole="button"
              accessibilityLabel={`Go to widget ${i + 1}`}
              testID={`dash-carousel-dot-${i}`}
              hitSlop={10}
            >
              <View style={[styles.dot, isActive && styles.dotActive]} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function DirTile({ label, value, tint }: { label: string; value: number; tint?: string }) {
  return (
    <View style={styles.dir}>
      <Text style={styles.dirLabel}>{label}</Text>
      <Text style={[styles.dirValue, tint ? { color: tint } : null]}>{value}</Text>
    </View>
  );
}

function ModeBar({ mode, count, total }: { mode: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={styles.modeRow}>
        <Text style={styles.modeLabel}>{(mode || "").replace("_", " ")}</Text>
        <Text style={styles.modeCount}>{count}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

function countBy<T>(arr: T[], fn: (x: T) => boolean) {
  let n = 0;
  for (const x of arr) if (fn(x)) n++;
  return n;
}

/**
 * Compact "Assets on hand" widget for the dashboard. Shows Gold + top
 * currencies broken down by physical location so the operator can
 * eyeball where the money is without diving into the Bullion tab.
 */

/**
 * Active Carrier Trips widget — top-most bullion-related card on the
 * dashboard. Shows planned/in-transit trips first with capacity vs.
 * usage bar so the operator sees at a glance where free slots are.
 */
function ActiveCarrierTripsCard({
  trips, txns, onPress,
}: { trips: CarrierTrip[]; txns: BullionTxn[]; onPress: () => void }) {
  const active = trips
    .filter((t) => t.status === "planned" || t.status === "in_transit")
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const usedByTrip: Record<string, number> = {};
  txns.forEach((t) => {
    if (!t.trip_id) return;
    usedByTrip[t.trip_id] = (usedByTrip[t.trip_id] || 0) + (Number(t.weight_kg) || 0);
  });
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} testID="active-trips-card">
      <Card>
        <View style={styles.aohHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.aohEyebrow}>Bullion module</Text>
            <Text style={styles.aohTitle}>Active carrier trips</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
        </View>
        {active.length === 0 ? (
          <Text style={styles.aohEmpty}>No trips scheduled. Add one from the Bullion tab.</Text>
        ) : (
          <View style={{ marginTop: spacing.md, gap: 12 }}>
            {active.slice(0, 4).map((t) => {
              const capacity = tripCapacityKg(t) || 0;
              const used = usedByTrip[t.id] || 0;
              const pct = capacity > 0 ? Math.min(100, (used / capacity) * 100) : 0;
              return (
                <View key={t.id}>
                  <View style={styles.tripHead}>
                    <Text style={styles.tripName} numberOfLines={1}>
                      {t.carrier_name || "TBD"} · {t.route === "IN_TO_TH" ? "IN → BKK" : "BKK → IN"}
                    </Text>
                    <Text style={styles.tripDate}>{shortDate(t.date)}</Text>
                  </View>
                  <View style={styles.tripBar}>
                    <View style={[styles.tripFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.tripMeta}>
                    {used.toFixed(1)} / {capacity.toFixed(0)} kg · {(capacity - used).toFixed(1)} kg free · {t.status}
                  </Text>
                </View>
              );
            })}
            {active.length > 4 ? (
              <Text style={styles.tripMore}>+{active.length - 4} more trips</Text>
            ) : null}
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

function AssetsOnHandCard({ txns, onPress }: { txns: BullionTxn[]; onPress: () => void }) {
  const totals = computeAssetTotals(txns);
  const totalGoldBaht =
    totals.vault_in.gold_baht + totals.vault_th.gold_baht + totals.in_transit.gold_baht;
  const allCurrencies = new Set<string>();
  (["vault_in", "vault_th", "in_transit"] as const).forEach((loc) => {
    Object.keys(totals[loc].currencies).forEach((c) => allCurrencies.add(c));
  });
  const currencyList = [...allCurrencies];
  const anyCurrency = currencyList.some(
    (c) =>
      (totals.vault_in.currencies[c] || 0) +
        (totals.vault_th.currencies[c] || 0) +
        (totals.in_transit.currencies[c] || 0) >
      0,
  );
  const hasAny = totalGoldBaht > 0 || anyCurrency;

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} testID="assets-on-hand-card">
      <Card>
        <View style={styles.aohHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.aohEyebrow}>Assets on hand</Text>
            <Text style={styles.aohTitle}>Vault snapshot</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
        </View>
        {!hasAny ? (
          <Text style={styles.aohEmpty}>
            No bullion in play yet. Log a currency or gold trade to see it here.
          </Text>
        ) : (
          <View style={styles.aohBody}>
            {/* Gold row */}
            {totalGoldBaht > 0 ? (
              <View style={styles.aohGroup}>
                <View style={styles.aohGroupHead}>
                  <Ionicons name="diamond" size={13} color="#F5C518" />
                  <Text style={styles.aohGroupTitle}>Gold on hand</Text>
                  <Text style={styles.aohGroupTotal}>
                    {formatBaht(totalGoldBaht)} baht
                  </Text>
                </View>
                <View style={styles.aohSplitRow}>
                  <SplitPill
                    label="India"
                    value={`${formatBaht(totals.vault_in.gold_baht)} baht`}
                    tint={colors.warn}
                  />
                  <SplitPill
                    label="Bangkok"
                    value={`${formatBaht(totals.vault_th.gold_baht)} baht`}
                    tint={colors.info}
                  />
                  <SplitPill
                    label="In transit"
                    value={`${formatBaht(totals.in_transit.gold_baht)} baht`}
                    tint={colors.lime}
                  />
                </View>
              </View>
            ) : null}
            {/* Currency rows — one per ccy so USD/AED etc. don't collide */}
            {currencyList.map((c) => {
              const totalForCcy =
                (totals.vault_in.currencies[c] || 0) +
                (totals.vault_th.currencies[c] || 0) +
                (totals.in_transit.currencies[c] || 0);
              if (totalForCcy <= 0) return null;
              return (
                <View key={c} style={styles.aohGroup}>
                  <View style={styles.aohGroupHead}>
                    <Ionicons name="cash-outline" size={13} color={colors.lime} />
                    <Text style={styles.aohGroupTitle}>{c} on hand</Text>
                    <Text style={styles.aohGroupTotal}>
                      {totalForCcy.toLocaleString()} {c}
                    </Text>
                  </View>
                  <View style={styles.aohSplitRow}>
                    <SplitPill
                      label="India"
                      value={(totals.vault_in.currencies[c] || 0).toLocaleString()}
                      tint={colors.warn}
                    />
                    <SplitPill
                      label="Bangkok"
                      value={(totals.vault_th.currencies[c] || 0).toLocaleString()}
                      tint={colors.info}
                    />
                    <SplitPill
                      label="In transit"
                      value={(totals.in_transit.currencies[c] || 0).toLocaleString()}
                      tint={colors.lime}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

function SplitPill({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <View style={[styles.splitPill, { borderColor: tint }]}>
      <Text style={[styles.splitPillLbl, { color: tint }]}>{label}</Text>
      <Text style={styles.splitPillVal}>{value}</Text>
    </View>
  );
}

function formatBaht(n: number): string {
  if (n === 0) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}


const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 120, gap: spacing.md },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: spacing.md,
  },
  eyebrow: { color: colors.textDim, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  title: { color: colors.text, fontSize: 30, fontWeight: "800", marginTop: 2 },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  lime: { color: colors.lime },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderColor: colors.lime,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.limeGlow,
  },
  badgeText: { color: colors.lime, fontSize: 11, fontWeight: "700" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  statsGridTablet: { flexWrap: "nowrap" },
  statsCarousel: {
    paddingRight: spacing.lg,
    gap: spacing.md,
    paddingBottom: 2,
  },
  statSnap: { width: 168 },
  stat: {
    flexGrow: 1,
    flexBasis: "47%",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  statHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statTitle: { color: colors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8 },
  statIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 32, fontWeight: "800", marginTop: 6 },
  statSub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  hero: {
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  heroTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md },
  heroRight: { alignItems: "flex-end" },
  heroLabel: { color: colors.textMuted, fontSize: 12 },
  heroValue: { color: colors.lime, fontSize: 40, fontWeight: "800" },
  heroValueSmall: { color: colors.text, fontSize: 22, fontWeight: "700" },
  heroSub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  barTrack: { height: 6, backgroundColor: "#1c1c1c", borderRadius: 3, overflow: "hidden", marginVertical: spacing.md },
  barFill: { height: "100%", backgroundColor: colors.lime, borderRadius: 3 },
  heroFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.sm },
  heroCta: {
    backgroundColor: colors.lime,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroCtaText: { color: colors.bg, fontWeight: "800", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 },
  row: { flexDirection: "column", gap: spacing.md },
  rowTablet: { flexDirection: "row" },
  col: { flexGrow: 1 },
  colTablet: { flexBasis: 0, flex: 1 },
  ledgerCard: { paddingVertical: spacing.lg },
  ledgerHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  ledgerDot: { width: 8, height: 8, borderRadius: 4 },
  ledgerLabel: { color: colors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 },
  ledgerBig: { color: colors.text, fontSize: 26, fontWeight: "800", marginTop: 6 },
  ledgerAlt: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  ledgerHint: { color: colors.textDim, fontSize: 12, marginTop: 8 },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  cardSub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  dim: { color: colors.textDim, fontSize: 13, textAlign: "center", padding: spacing.md },
  directionGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  dir: {
    flexBasis: "31%",
    flexGrow: 1,
    backgroundColor: colors.chipBg,
    padding: 12,
    borderRadius: radii.md,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dirLabel: { color: colors.textDim, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  dirValue: { color: colors.text, fontSize: 20, fontWeight: "800", marginTop: 4 },
  modeRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  modeLabel: { color: colors.textMuted, fontSize: 13, textTransform: "capitalize" },
  modeCount: { color: colors.text, fontSize: 13, fontWeight: "700" },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  link: { color: colors.lime, fontSize: 13, fontWeight: "700" },
  recRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  recTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  recSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  recValue: { color: colors.lime, fontSize: 15, fontWeight: "700" },
  recDim: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  trackMini: { height: 4, backgroundColor: "#1c1c1c", borderRadius: 2, overflow: "hidden", marginTop: 10 },
  trackFillMini: { height: "100%", backgroundColor: colors.lime, borderRadius: 2 },
  // Assets on hand widget
  aohHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aohEyebrow: {
    color: colors.textDim,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  aohTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 2,
  },
  aohEmpty: {
    color: colors.textDim,
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 12,
  },
  aohBody: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  aohGroup: {
    gap: 8,
  },
  aohGroupHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  aohGroupTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flex: 1,
  },
  aohGroupTotal: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  aohSplitRow: {
    flexDirection: "row",
    gap: 6,
  },
  splitPill: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: colors.chipBg,
    alignItems: "center",
  },
  splitPillLbl: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  splitPillVal: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  // Active Carrier Trips widget
  tripHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  tripName: { color: colors.text, fontSize: 13, fontWeight: "700", flex: 1 },
  tripDate: { color: colors.textDim, fontSize: 11 },
  tripBar: {
    height: 4,
    backgroundColor: colors.chipBg,
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 4,
  },
  tripFill: { height: "100%", backgroundColor: colors.lime, borderRadius: 2 },
  tripMeta: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tripMore: { color: colors.textDim, fontSize: 11, fontStyle: "italic" },
  // Reports console shortcut card
  reportsShortcut: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  reportsShortcutText: { color: colors.lime, fontSize: 13, fontWeight: "800", flex: 1 },

  // ---- Dashboard carousel dot indicators (Row 2) ----
  dotRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.textDim,
    opacity: 0.5,
  },
  dotActive: {
    width: 20,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.lime,
    opacity: 1,
  },
  // ---- Stat tile mini list (Delivered / In Transit / Pending) ----
  statList: {
    marginTop: 10,
    gap: 6,
  },
  statListDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginBottom: 6,
  },
  statListRow: {
    paddingVertical: 3,
  },
  statListL1: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  statListL2: {
    color: "rgba(255, 255, 255, 0.60)",
    fontSize: 11,
    marginTop: 1,
  },
});
