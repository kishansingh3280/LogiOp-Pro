/**
 * VaultSnapshotSection — Phase B redesign.
 *
 * Two-section rollup:
 *   🇮🇳 India (cyan)     — Delhi row + Kolkata row
 *   🇹🇭 Thailand (gold)  — Bangkok row
 * Each row: bags · weight · currency value.
 * Total row at the bottom sums INR + THB across both sections.
 * Rows are tappable — tap opens `/warehouses` with a `?loc=<city>` param
 * so the warehouse screen can jump to the right city.
 *
 * Data (all live, no mocks):
 *   • Bangkok:  `/api/dashboard/warehouse` → current_bags + current_kg
 *               + THB portion carried in active TH_TO_IN trips
 *   • Delhi:    live shipments delivered/in-transit to Delhi / North IN
 *   • Kolkata:  shipments delivered/in-transit to Kolkata / East IN
 *   • INR value at each Indian city = INR portion of trips destined
 *     there (approximation — best-effort)
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { Party, Shipment, WarehouseSummary } from "@/src/api/types";
import type { CarrierTrip } from "@/src/bullion/types";
import { useCardBreathing } from "@/src/hooks/use-card-breathing";
import { colors, radii, spacing } from "@/src/theme";

const INDIA_TINT = "#00F5FF";
const THAI_TINT = "#FFD700";

// City tokens — case-insensitive substring match against
// destination / origin strings on shipments and party addresses.
const DELHI_TOKENS = ["delhi", "new delhi", "ncr", "gurgaon", "gurugram", "noida"];
const KOLKATA_TOKENS = ["kolkata", "calcutta", "howrah"];
const BKK_TOKENS = ["bangkok", "bkk", "thailand"];

function matches(text: string | undefined | null, tokens: string[]): boolean {
  if (!text) return false;
  const s = text.toLowerCase();
  return tokens.some((t) => s.includes(t));
}

type RowStats = {
  bags: number;
  kg: number;
  inr: number;
  thb: number;
};

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

  // Filter to live shipments (not delivered, not cancelled) so bag/weight
  // counts represent inventory currently on hand, not historical.
  const liveShipments = useMemo(
    () =>
      (shipments || []).filter((s) => {
        const st = (s.status || "").toLowerCase();
        return ["pending", "in_transit", "warehouse_arrived"].includes(st);
      }),
    [shipments],
  );

  const activeTrips = useMemo(
    () =>
      (trips || []).filter((t) => {
        const st = (t.status || "").toLowerCase();
        return ["pending", "in_transit", "partial_delivered"].includes(st);
      }),
    [trips],
  );

  const delhi = useMemo<RowStats>(() => {
    const inCity = liveShipments.filter((s) => matches(s.destination, DELHI_TOKENS));
    const bags = inCity.reduce((n, s) => n + (Number(s.bag_count) || 0), 0);
    const kg = Math.round(inCity.reduce((n, s) => n + (Number(s.weight_kg) || 0), 0));
    // INR portion of active TH→IN trips that go to Delhi (best effort:
    // uses notes/destination if present, else divides evenly with Kol).
    let inr = 0;
    for (const t of activeTrips) {
      const a = t as unknown as Record<string, unknown>;
      const dir = String(a.direction || a.route || "").toUpperCase();
      if (!dir.includes("TH_TO_IN") && !dir.includes("TH → IN")) continue;
      const note = String(a.notes || "").toLowerCase();
      const cur = String(a.currency_type || "").toUpperCase();
      const amt = Number(a.currency_amount || 0) || 0;
      if (cur !== "INR") continue;
      if (matches(note, DELHI_TOKENS)) inr += amt;
    }
    return { bags, kg, inr, thb: 0 };
  }, [liveShipments, activeTrips]);

  const kolkata = useMemo<RowStats>(() => {
    const inCity = liveShipments.filter((s) => matches(s.destination, KOLKATA_TOKENS));
    const bags = inCity.reduce((n, s) => n + (Number(s.bag_count) || 0), 0);
    const kg = Math.round(inCity.reduce((n, s) => n + (Number(s.weight_kg) || 0), 0));
    let inr = 0;
    for (const t of activeTrips) {
      const a = t as unknown as Record<string, unknown>;
      const dir = String(a.direction || a.route || "").toUpperCase();
      if (!dir.includes("TH_TO_IN") && !dir.includes("TH → IN")) continue;
      const note = String(a.notes || "").toLowerCase();
      const cur = String(a.currency_type || "").toUpperCase();
      const amt = Number(a.currency_amount || 0) || 0;
      if (cur !== "INR") continue;
      if (matches(note, KOLKATA_TOKENS)) inr += amt;
    }
    return { bags, kg, inr, thb: 0 };
  }, [liveShipments, activeTrips]);

  const bangkok = useMemo<RowStats>(() => {
    const bags = warehouseData?.current_bags ?? 0;
    const kg = Math.round(warehouseData?.current_kg || 0);
    let thb = 0;
    for (const t of activeTrips) {
      const a = t as unknown as Record<string, unknown>;
      const dir = String(a.direction || a.route || "").toUpperCase();
      if (!dir.includes("IN_TO_TH") && !dir.includes("IN → TH")) continue;
      const cur = String(a.currency_type || "").toUpperCase();
      const amt = Number(a.currency_amount || 0) || 0;
      if (cur === "THB") thb += amt;
    }
    return { bags, kg, inr: 0, thb };
  }, [warehouseData, activeTrips]);

  const totals = useMemo(
    () => ({
      bags: delhi.bags + kolkata.bags + bangkok.bags,
      kg: delhi.kg + kolkata.kg + bangkok.kg,
      inr: delhi.inr + kolkata.inr,
      thb: bangkok.thb,
    }),
    [delhi, kolkata, bangkok],
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _partyCounts = parties?.length ?? 0;

  const openWarehouse = (city?: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push((city ? `/warehouses?loc=${encodeURIComponent(city)}` : "/warehouses") as any);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Vault snapshot</Text>
        <Text style={styles.sectionHint}>Live · tap a row to open warehouse</Text>
      </View>

      {/* India section */}
      <View style={[styles.section, { borderColor: hexA(INDIA_TINT, 0.30) }, breathe as object]}>
        <View style={styles.sectionHead}>
          <Text style={[styles.flag, { textShadowColor: hexA(INDIA_TINT, 0.7) }]}>🇮🇳</Text>
          <Text style={[styles.sectionName, { color: INDIA_TINT }]}>India</Text>
        </View>
        <VaultRow label="Delhi" tint={INDIA_TINT} stats={delhi} onPress={() => openWarehouse("Delhi")} testID="vault-row-delhi" />
        <VaultRow label="Kolkata" tint={INDIA_TINT} stats={kolkata} onPress={() => openWarehouse("Kolkata")} testID="vault-row-kolkata" />
      </View>

      {/* Thailand section */}
      <View style={[styles.section, { borderColor: hexA(THAI_TINT, 0.30) }, breathe as object]}>
        <View style={styles.sectionHead}>
          <Text style={[styles.flag, { textShadowColor: hexA(THAI_TINT, 0.7) }]}>🇹🇭</Text>
          <Text style={[styles.sectionName, { color: THAI_TINT }]}>Thailand</Text>
        </View>
        <VaultRow label="Bangkok" tint={THAI_TINT} stats={bangkok} onPress={() => openWarehouse("Bangkok")} testID="vault-row-bangkok" />
      </View>

      {/* Totals */}
      <View style={styles.totalRow} testID="vault-row-total">
        <Text style={styles.totalLbl}>TOTAL</Text>
        <View style={styles.totalCells}>
          <Text style={styles.totalCell}>{totals.bags} bags</Text>
          <Text style={styles.totalCell}>{totals.kg} kg</Text>
          <Text style={[styles.totalCell, { color: INDIA_TINT }]}>
            {formatCurrency(totals.inr, "₹")}
          </Text>
          <Text style={[styles.totalCell, { color: THAI_TINT }]}>
            {formatCurrency(totals.thb, "฿")}
          </Text>
        </View>
      </View>
    </View>
  );
}

function VaultRow({
  label,
  tint,
  stats,
  onPress,
  testID,
}: {
  label: string;
  tint: string;
  stats: RowStats;
  onPress: () => void;
  testID?: string;
}) {
  const empty = stats.bags === 0 && stats.kg === 0 && stats.inr === 0 && stats.thb === 0;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.row} testID={testID}>
      <View style={styles.rowLeft}>
        <View style={[styles.dot, { backgroundColor: tint }]} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowStat, empty && styles.rowStatDim]} numberOfLines={1}>
          {empty ? "—" : `${stats.bags} bags`}
        </Text>
        <Text style={[styles.rowStat, empty && styles.rowStatDim]} numberOfLines={1}>
          {empty ? "—" : `${stats.kg} kg`}
        </Text>
        <Text style={[styles.rowStatValue, { color: tint }]} numberOfLines={1}>
          {stats.inr > 0
            ? formatCurrency(stats.inr, "₹")
            : stats.thb > 0
              ? formatCurrency(stats.thb, "฿")
              : "—"}
        </Text>
        <Ionicons name="chevron-forward" size={12} color={colors.textDim} />
      </View>
    </TouchableOpacity>
  );
}

function formatCurrency(amount: number, symbol: string): string {
  if (!amount || amount <= 0) return `${symbol}0`;
  if (amount >= 10_000_000) return `${symbol}${(amount / 10_000_000).toFixed(1)}Cr`;
  if (amount >= 100_000) return `${symbol}${(amount / 100_000).toFixed(1)}L`;
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(1)}K`;
  return `${symbol}${Math.round(amount)}`;
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
  sectionHint: { color: colors.textDim, fontSize: 10, fontWeight: "600" },

  section: {
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: "rgba(12,12,30,0.75)",
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  flag: {
    fontSize: 20,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  sectionName: { fontSize: 13, fontWeight: "800", letterSpacing: 0.4 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderTopColor: "rgba(255,255,255,0.06)",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  rowLabel: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowStat: { color: colors.textMuted, fontSize: 11, fontWeight: "600", minWidth: 44, textAlign: "right" },
  rowStatDim: { color: colors.textDim },
  rowStatValue: { fontSize: 12, fontWeight: "800", minWidth: 60, textAlign: "right" },

  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: "rgba(0,255,136,0.06)",
    borderRadius: radii.lg,
    borderColor: "rgba(0,255,136,0.30)",
    borderWidth: StyleSheet.hairlineWidth,
  },
  totalLbl: {
    color: "#00FF88",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  totalCells: { flexDirection: "row", alignItems: "center", gap: 8 },
  totalCell: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
});
