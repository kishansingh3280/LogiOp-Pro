/**
 * VaultSnapshotSection — JARVIS Aura v4: 2-column split showing India
 * vs Bangkok at a glance. Each column displays:
 *   • Bags in play
 *   • Total weight (kg)
 *   • INR / THB value at that location
 *   • Party count linked to that location
 *
 * Data sources (all live, no mocks):
 *   • Bangkok column: `/api/dashboard/warehouse` (current bags + kg),
 *     active carrier trips carrying INR/THB into BKK (IN → TH) plus
 *     any live gold-baht carried.
 *   • India column: derived from active carrier trips heading India-
 *     bound (TH → IN in-transit / pending) that represent currency +
 *     gold currently being brought into India, plus shipments in status
 *     `pending` / `in_transit` (bags + weight of goods currently
 *     moving into India).
 *   • Party counts: derived from the full party list, bucketed by the
 *     `country` field into IN/India vs TH/Thailand.
 *
 * Tapping either column navigates to `/warehouses` for detail drill-down.
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { Party, Shipment, WarehouseSummary } from "@/src/api/types";
import type { CarrierTrip } from "@/src/bullion/types";
import { useCardBreathing } from "@/src/hooks/use-card-breathing";
import { colors, radii, spacing } from "@/src/theme";

const INDIA_COUNTRY_TOKENS = ["in", "india", "ind"];
const BKK_COUNTRY_TOKENS = ["th", "thailand", "bangkok", "bkk"];

const INDIA_TINT = "#00F5FF"; // cyan
const BKK_TINT = "#FFD700";   // gold

function normCountry(c?: string | null): "IN" | "TH" | null {
  const s = (c || "").trim().toLowerCase();
  if (!s) return null;
  if (INDIA_COUNTRY_TOKENS.includes(s)) return "IN";
  if (BKK_COUNTRY_TOKENS.includes(s)) return "TH";
  return null;
}

export function VaultSnapshotSection({
  warehouseData,
  trips,
  shipments,
  parties,
}: {
  warehouseData?: WarehouseSummary | null;
  trips?: CarrierTrip[];
  shipments?: Shipment[];
  parties?: Party[];
}) {
  const router = useRouter();
  const breathe = useCardBreathing({ blur: false });

  // ------- Bangkok column ----------------------------------------------
  const bangkok = useMemo(() => {
    // Warehouse-resident bags/weight
    const bags = warehouseData?.current_bags ?? 0;
    const kg = Math.round(warehouseData?.current_kg || 0);

    // Active trips carrying material into / stationed at Bangkok.
    // Convention: IN_TO_TH = leaving India, arriving BKK; the currency /
    // gold on that trip is treated as "at BKK" once the trip is active.
    const active = (trips || []).filter((t) => {
      const st = (t.status || "").toLowerCase();
      return ["pending", "in_transit", "partial_delivered"].includes(st);
    });
    let inr = 0, thb = 0, gold = 0;
    for (const t of active) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const a = t as any;
      const dir = String(a.direction || a.route || "").toUpperCase();
      // Trip is "at Bangkok" when heading IN → TH (payload arrives BKK)
      // or when it's a TH-side leg (BKK → IN not yet dispatched from BKK).
      const isBkk = dir.includes("IN_TO_TH") || dir.includes("IN → TH");
      if (!isBkk) continue;
      const cur = String(a.currency_type || "").toUpperCase();
      const amt = Number(a.currency_amount || 0) || 0;
      if (cur === "INR") inr += amt;
      if (cur === "THB") thb += amt;
      gold += Number(a.gold_baht || a.gold_bt || 0) || 0;
    }
    return { bags, kg, inr, thb, gold, activeTrips: active.length };
  }, [warehouseData, trips]);

  // ------- India column ------------------------------------------------
  const india = useMemo(() => {
    // Bags/weight = shipments currently in India (delivered, warehouse
    // pending, or arriving IN via TH → IN in_transit).
    const activeShipments = (shipments || []).filter((s) => {
      const st = (s.status || "").toLowerCase();
      // A shipment counts as "in India" if it's warehouse_arrived within
      // India OR delivered; and dispatch_direction/destination is India.
      // Fall back to any non-BKK destination shipment that's live.
      const dest = (s.destination || "").toLowerCase();
      const isIndiaBound = dest.includes("india") || dest.includes("delhi") || dest.includes("mumbai") || dest.includes("bombay");
      return ["pending", "in_transit", "warehouse_arrived"].includes(st) && !isIndiaBound === false
        ? true
        : ["warehouse_arrived", "in_transit"].includes(st) && isIndiaBound;
    });
    // Simplification — sum bags/weight of any live shipment whose
    // destination looks like an Indian city (or unknown). Anything
    // clearly Bangkok-bound stays in the BKK column via the trip data.
    const indiaLive = (shipments || []).filter((s) => {
      const st = (s.status || "").toLowerCase();
      const dest = (s.destination || "").toLowerCase();
      const isBkk = dest.includes("bangkok") || dest.includes("bkk") || dest.includes("thailand");
      return !isBkk && ["pending", "in_transit", "warehouse_arrived", "delivered"].includes(st);
    });
    // Only count non-delivered as "in-play" bags; delivered shipments'
    // bags no longer sit in a warehouse.
    const inPlay = indiaLive.filter((s) => (s.status || "").toLowerCase() !== "delivered");
    const bags = inPlay.reduce((sum, s) => sum + (Number(s.bag_count) || 0), 0);
    const kg = Math.round(inPlay.reduce((sum, s) => sum + (Number(s.weight_kg) || 0), 0));

    // Currency/gold arriving India via TH → IN active trips
    const active = (trips || []).filter((t) => {
      const st = (t.status || "").toLowerCase();
      return ["pending", "in_transit", "partial_delivered"].includes(st);
    });
    let inr = 0, thb = 0, gold = 0;
    for (const t of active) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const a = t as any;
      const dir = String(a.direction || a.route || "").toUpperCase();
      const isIndiaBound = dir.includes("TH_TO_IN") || dir.includes("TH → IN");
      if (!isIndiaBound) continue;
      const cur = String(a.currency_type || "").toUpperCase();
      const amt = Number(a.currency_amount || 0) || 0;
      if (cur === "INR") inr += amt;
      if (cur === "THB") thb += amt;
      gold += Number(a.gold_baht || a.gold_bt || 0) || 0;
    }
    return { bags, kg, inr, thb, gold, activeShipments: activeShipments.length };
  }, [shipments, trips]);

  // ------- Party counts by location -----------------------------------
  const partyCounts = useMemo(() => {
    let ind = 0, thai = 0;
    for (const p of parties || []) {
      const norm = normCountry(p.country);
      if (norm === "IN") ind++;
      else if (norm === "TH") thai++;
    }
    return { india: ind, bangkok: thai };
  }, [parties]);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Vault snapshot</Text>
        <Text style={styles.sectionHint}>Live · tap to open warehouse</Text>
      </View>

      <View style={styles.row}>
        <LocationColumn
          flag="🇮🇳"
          name="India"
          tint={INDIA_TINT}
          bags={india.bags}
          kg={india.kg}
          inr={india.inr}
          thb={india.thb}
          gold={india.gold}
          parties={partyCounts.india}
          onOpen={() => router.push("/warehouses")}
          breathe={breathe}
          testID="vault-india"
        />
        <LocationColumn
          flag="🇹🇭"
          name="Bangkok"
          tint={BKK_TINT}
          bags={bangkok.bags}
          kg={bangkok.kg}
          inr={bangkok.inr}
          thb={bangkok.thb}
          gold={bangkok.gold}
          parties={partyCounts.bangkok}
          onOpen={() => router.push("/warehouses")}
          breathe={breathe}
          testID="vault-bangkok"
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// One column = one location card
// ---------------------------------------------------------------------------

function LocationColumn({
  flag,
  name,
  tint,
  bags,
  kg,
  inr,
  thb,
  gold,
  parties,
  onOpen,
  breathe,
  testID,
}: {
  flag: string;
  name: string;
  tint: string;
  bags: number;
  kg: number;
  inr: number;
  thb: number;
  gold: number;
  parties: number;
  onOpen: () => void;
  breathe?: object;
  testID?: string;
}) {
  const empty = bags === 0 && kg === 0 && inr === 0 && thb === 0 && gold === 0;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onOpen}
      style={[styles.col, { borderColor: hexA(tint, 0.35) }, breathe as object]}
      testID={testID}
    >
      {/* Header — flag + name */}
      <View style={styles.colHead}>
        <Text style={[styles.flag, { textShadowColor: hexA(tint, 0.7) }]}>{flag}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.locName, { color: tint }]}>{name}</Text>
          <Text style={styles.locSub}>
            {parties} part{parties === 1 ? "y" : "ies"} linked
          </Text>
        </View>
      </View>

      {/* Bags + weight */}
      <View style={styles.metricRow}>
        <View style={styles.metric}>
          <Ionicons name="cube-outline" size={12} color={tint} />
          <View style={{ marginLeft: 6, flex: 1, minWidth: 0 }}>
            <Text style={styles.metricLbl}>Bags</Text>
            <Text style={[styles.metricVal, empty && styles.metricValDim]} numberOfLines={1}>
              {empty ? "—" : bags}
            </Text>
          </View>
        </View>
        <View style={styles.metric}>
          <Ionicons name="scale-outline" size={12} color={tint} />
          <View style={{ marginLeft: 6, flex: 1, minWidth: 0 }}>
            <Text style={styles.metricLbl}>Weight</Text>
            <Text style={[styles.metricVal, empty && styles.metricValDim]} numberOfLines={1}>
              {empty ? "—" : `${kg} kg`}
            </Text>
          </View>
        </View>
      </View>

      {/* Currency values */}
      <View style={styles.currencyRow}>
        <CurrencyPill code="INR" amount={inr} tint={tint} />
        <CurrencyPill code="THB" amount={thb} tint={tint} />
      </View>

      {/* Gold row (only when > 0) */}
      {gold > 0 ? (
        <View style={styles.goldRow}>
          <Ionicons name="diamond-outline" size={11} color="#F5C518" />
          <Text style={styles.goldText}>{gold.toFixed(1)} bt gold</Text>
        </View>
      ) : null}

      <View style={styles.cta}>
        <Text style={styles.ctaText}>View</Text>
        <Ionicons name="chevron-forward" size={12} color={colors.textDim} />
      </View>
    </TouchableOpacity>
  );
}

function CurrencyPill({ code, amount, tint }: { code: "INR" | "THB"; amount: number; tint: string }) {
  const sym = code === "INR" ? "₹" : "฿";
  const isZero = !amount || amount <= 0;
  const formatted = isZero
    ? `${sym}0`
    : amount >= 100000
      ? `${sym}${(amount / 100000).toFixed(amount >= 10_000_000 ? 0 : 1)}L`
      : amount >= 1000
        ? `${sym}${(amount / 1000).toFixed(amount >= 10_000 ? 0 : 1)}K`
        : `${sym}${Math.round(amount)}`;
  return (
    <View style={[styles.currPill, { borderColor: hexA(tint, 0.35), backgroundColor: hexA(tint, 0.08) }]}>
      <Text style={[styles.currCode, { color: tint }]}>{code}</Text>
      <Text style={[styles.currAmt, isZero && styles.currAmtDim]} numberOfLines={1} adjustsFontSizeToFit>
        {formatted}
      </Text>
    </View>
  );
}

function hexA(color: string, alpha: number): string {
  if (color.startsWith("#") && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: {
    color: "#00FF88",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    textShadowColor: "rgba(0,255,136,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  sectionHint: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "600",
  },

  row: {
    flexDirection: "row",
    gap: 8,
  },
  col: {
    flex: 1,
    minWidth: 0,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: "rgba(12,12,30,0.75)",
    borderWidth: StyleSheet.hairlineWidth,
  },
  colHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  flag: {
    fontSize: 22,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  locName: { fontSize: 14, fontWeight: "800", letterSpacing: 0.4 },
  locSub: { color: colors.textDim, fontSize: 10, marginTop: 1, fontWeight: "600" },

  metricRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  metric: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.06)",
  },
  metricLbl: {
    color: colors.textDim,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  metricVal: { color: "#FFFFFF", fontSize: 13, fontWeight: "800", marginTop: 1 },
  metricValDim: { color: colors.textDim },

  currencyRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },
  currPill: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  currCode: { fontSize: 9, fontWeight: "800", letterSpacing: 0.4 },
  currAmt: { color: "#FFFFFF", fontSize: 13, fontWeight: "800", marginTop: 2 },
  currAmtDim: { color: colors.textDim },

  goldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  goldText: { color: "#F5C518", fontSize: 11, fontWeight: "800" },

  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 2,
  },
  ctaText: { color: colors.textDim, fontSize: 10, fontWeight: "600" },
});
