import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { subscribeQueue, getQueue, flushQueue } from "@/src/api/client";
import { useApi } from "@/src/api/hooks";
import type { DashboardStats, LedgerSummary, Shipment, WarehouseSummary } from "@/src/api/types";
import { useTrips, useTxns, usedSlotsFor } from "@/src/bullion/store";
import { Card } from "@/src/components/ui";
import { useIsTablet } from "@/src/hooks/use-is-tablet";
import { colors, radii, spacing } from "@/src/theme";
import { fmtCurrency, relTime, shortDate } from "@/src/utils/format";

export default function DashboardScreen() {
  const router = useRouter();
  const tablet = useIsTablet();
  const stats = useApi<DashboardStats>("/api/dashboard/stats");
  const warehouse = useApi<WarehouseSummary>("/api/dashboard/warehouse");
  const ledger = useApi<LedgerSummary>("/api/dashboard/ledger-summary");
  const shipments = useApi<Shipment[]>("/api/shipments");
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
    await Promise.all([stats.refresh(), warehouse.refresh(), ledger.refresh(), shipments.refresh()]);
  }, [stats, warehouse, ledger, shipments]);

  const loading = stats.loading || warehouse.loading || ledger.loading;

  const s = stats.data?.shipments;
  const total = s?.total || 0;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  const recent = (shipments.data || []).slice(0, tablet ? 6 : 4);

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.lime} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header} testID="overview-header">
          <View>
            <Text style={styles.eyebrow}>Welcome back, Admin</Text>
            <Text style={styles.title}>India <Text style={styles.lime}>⇄</Text> Thailand</Text>
            <Text style={styles.subtitle}>Live view of shipments, ledger and warehouse.</Text>
          </View>
          {pending > 0 ? (
            <TouchableOpacity style={styles.badge} onPress={onRefresh} testID="sync-badge">
              <Ionicons name="cloud-upload-outline" size={14} color={colors.lime} />
              <Text style={styles.badgeText}>{pending} queued</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Stat cards */}
        <View style={[styles.statsGrid, tablet && styles.statsGridTablet]} testID="stat-grid">
          <StatTile
            title="Delivered"
            value={String(s?.delivered ?? 0)}
            sub={`${pct(s?.delivered || 0)}% of total`}
            tint={colors.ok}
            icon="checkmark-done-outline"
          />
          <StatTile
            title="In Transit"
            value={String(s?.in_transit ?? 0)}
            sub={`${pct(s?.in_transit || 0)}% of total`}
            tint={colors.info}
            icon="airplane-outline"
          />
          <StatTile
            title="Pending"
            value={String(s?.pending ?? 0)}
            sub={`${pct(s?.pending || 0)}% of total`}
            tint={colors.warn}
            icon="time-outline"
          />
          <StatTile
            title="Warehouse"
            value={String(s?.warehouse_arrived ?? 0)}
            sub={`${pct(s?.warehouse_arrived || 0)}% of total`}
            tint={colors.lime}
            icon="business-outline"
          />
        </View>

        {/* Warehouse card */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push("/shipments")}
          testID="warehouse-card"
        >
          <LinearGradient
            colors={["#0a0a0a", "#0f0f0f"]}
            style={styles.hero}
          >
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroLabel}>Bangkok warehouse</Text>
                <Text style={styles.heroValue}>{warehouse.data?.current_bags ?? 0}</Text>
                <Text style={styles.heroSub}>bags awaiting delivery</Text>
              </View>
              <View style={styles.heroRight}>
                <Text style={styles.heroLabel}>Total weight</Text>
                <Text style={styles.heroValueSmall}>{Math.round(warehouse.data?.current_kg || 0)} kg</Text>
                <Text style={styles.heroSub}>
                  {Math.round(warehouse.data?.pct || 0)}% of {Math.round(warehouse.data?.capacity_kg || 0)} kg
                </Text>
              </View>
            </View>

            {/* Capacity bar */}
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.min(100, warehouse.data?.pct || 0)}%` },
                ]}
              />
            </View>

            <View style={styles.heroFooter}>
              <View>
                <Text style={styles.heroLabel}>Not yet booked</Text>
                <Text style={styles.heroValueSmall}>{warehouse.data?.pending_deliveries ?? 0}</Text>
              </View>
              <View>
                <Text style={styles.heroLabel}>Booked</Text>
                <Text style={styles.heroValueSmall}>{warehouse.data?.booked_deliveries ?? 0}</Text>
              </View>
              <TouchableOpacity style={styles.heroCta} onPress={() => router.push("/shipments")}>
                <Text style={styles.heroCtaText}>view shipments</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.bg} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Ledger snapshot */}
        <View style={[styles.row, tablet && styles.rowTablet]}>
          <TouchableOpacity
            style={[styles.col, tablet && styles.colTablet]}
            activeOpacity={0.85}
            onPress={() => router.push("/ledger")}
            testID="ledger-get-card"
          >
            <Card style={styles.ledgerCard}>
              <View style={styles.ledgerHeader}>
                <View style={[styles.ledgerDot, { backgroundColor: colors.ok }]} />
                <Text style={styles.ledgerLabel}>You will get</Text>
              </View>
              <Text style={styles.ledgerBig}>{fmtCurrency(ledger.data?.receivable.inr, "INR")}</Text>
              <Text style={styles.ledgerAlt}>{fmtCurrency(ledger.data?.receivable.thb, "THB")}</Text>
              {ledger.data?.top_get?.[0] ? (
                <Text style={styles.ledgerHint} numberOfLines={1}>
                  Top: {ledger.data.top_get[0].name}
                </Text>
              ) : null}
            </Card>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.col, tablet && styles.colTablet]}
            activeOpacity={0.85}
            onPress={() => router.push("/ledger")}
            testID="ledger-give-card"
          >
            <Card style={styles.ledgerCard}>
              <View style={styles.ledgerHeader}>
                <View style={[styles.ledgerDot, { backgroundColor: colors.danger }]} />
                <Text style={styles.ledgerLabel}>You will give</Text>
              </View>
              <Text style={styles.ledgerBig}>{fmtCurrency(ledger.data?.payable.inr, "INR")}</Text>
              <Text style={styles.ledgerAlt}>{fmtCurrency(ledger.data?.payable.thb, "THB")}</Text>
              {ledger.data?.top_give?.[0] ? (
                <Text style={styles.ledgerHint} numberOfLines={1}>
                  Top: {ledger.data.top_give[0].name}
                </Text>
              ) : null}
            </Card>
          </TouchableOpacity>
        </View>

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

        {/* Active carrier slots (Bullion) */}
        <View style={styles.recentHeader}>
          <Text style={styles.cardTitle}>Active carrier slots</Text>
          <TouchableOpacity onPress={() => router.push("/bullion")} testID="see-all-bullion">
            <Text style={styles.link}>Bullion →</Text>
          </TouchableOpacity>
        </View>
        {(() => {
          const today = new Date().toISOString().slice(0, 10);
          const upcoming = trips.data
            .filter((t) => t.date >= today)
            .map((t) => ({ ...t, used: usedSlotsFor(t.id, batches.data) }))
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
                const free = Math.max(0, t.available_slots - t.used);
                const pct = t.available_slots > 0 ? Math.round((t.used / t.available_slots) * 100) : 0;
                const full = free === 0;
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
                            {full ? "FULL" : `${free}/${t.available_slots}`}
                          </Text>
                          <Text style={styles.recDim}>slots free</Text>
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

function StatTile({
  title,
  value,
  sub,
  tint,
  icon,
}: {
  title: string;
  value: string;
  sub: string;
  tint: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.stat} testID={`stat-${title}`}>
      <View style={styles.statHead}>
        <Text style={styles.statTitle}>{title}</Text>
        <View style={[styles.statIcon, { borderColor: tint + "55" }]}>
          <Ionicons name={icon} size={14} color={tint} />
        </View>
      </View>
      <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
      <Text style={styles.statSub}>{sub}</Text>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
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
});
