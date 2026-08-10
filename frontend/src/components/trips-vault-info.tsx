/**
 * TripsVaultInfo — Active-carrier-trips summary card for the dashboard.
 *
 * For every carrier trip whose date is today or in the future, we compute:
 *   • Direction icon + route (IN→TH / TH→IN)
 *   • Item type (saman / currency / gold / mixed) — inferred from linked txns
 *   • Total weight (kg)
 *   • Currency amount (native units)
 *   • Gold weight (baht)
 *   • Estimated INR value — sum of `gold_sale_inr` + `currency_amount * purchase_rate_inr`
 *
 * If there are no active trips we render a friendly empty state.
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { BullionTxn, CarrierTrip } from "@/src/bullion/types";
import { colors, radii, spacing } from "@/src/theme";
import { fmtCurrency } from "@/src/utils/format";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function directionLabel(route?: string) {
  if (!route) return "—";
  const r = route.toUpperCase();
  if (r.includes("IN_TO_TH") || r === "IN-TH") return "India → Thailand";
  if (r.includes("TH_TO_IN") || r === "TH-IN") return "Thailand → India";
  return route;
}

function tripKind(txns: BullionTxn[]): { label: string; icon: React.ComponentProps<typeof Ionicons>["name"]; color: string } {
  const hasCurrency = txns.some((t) => (t.currency_amount ?? 0) > 0);
  const hasGold = txns.some((t) => (t.gold_amount ?? 0) > 0);
  const hasSaman = txns.some((t) => (t.weight_kg ?? 0) > 0 && !hasCurrency && !hasGold);
  if (hasGold && hasCurrency) return { label: "Gold + Cash", icon: "diamond", color: "#FFD700" };
  if (hasGold) return { label: "Gold", icon: "diamond", color: "#FFD700" };
  if (hasCurrency) return { label: "Currency", icon: "cash", color: colors.info };
  if (hasSaman) return { label: "Saman", icon: "cube", color: colors.accent };
  return { label: "Empty", icon: "airplane", color: colors.textMuted };
}

// ---------------------------------------------------------------------------
// One trip row
// ---------------------------------------------------------------------------
function TripRow({ trip, txns, onPress }: { trip: CarrierTrip; txns: BullionTxn[]; onPress: () => void }) {
  const kind = tripKind(txns);
  const totalWeightKg = txns.reduce((sum, t) => sum + (Number(t.weight_kg) || 0), 0);
  const totalGoldBaht = txns.reduce((sum, t) => sum + (Number(t.gold_amount) || 0), 0);
  const totalCurrency = txns.reduce((sum, t) => sum + (Number(t.currency_amount) || 0), 0);
  const currencyLabel = txns.find((t) => t.currency)?.currency || trip.currency_type || "";
  const estInr = txns.reduce((sum, t) => {
    // Prefer explicit gold_sale_inr, else compute currency_amount × purchase_rate_inr,
    // else fall back to gold_cost_inr / purchase INR ("what did we spend").
    const goldSale = Number(t.gold_sale_inr) || 0;
    const currSpend = (Number(t.currency_amount) || 0) * (Number(t.purchase_rate_inr) || 0);
    const goldCost = Number(t.gold_cost_inr) || 0;
    return sum + (goldSale || currSpend || goldCost || 0);
  }, 0);

  return (
    <TouchableOpacity onPress={onPress} style={styles.tripRow} activeOpacity={0.85} testID={`trip-row-${trip.id}`}>
      <View style={[styles.kindBadge, { backgroundColor: kind.color + "22", borderColor: kind.color + "88" }]}>
        <Ionicons name={kind.icon} size={16} color={kind.color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.rowBetween}>
          <Text style={styles.tripRoute} numberOfLines={1}>
            {directionLabel(trip.route || trip.direction)}
          </Text>
          <Text style={styles.tripDate}>{trip.date}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaChip}>{kind.label}</Text>
          {totalWeightKg > 0 ? (
            <Text style={styles.metaChip}>
              {totalWeightKg.toFixed(1)} kg
            </Text>
          ) : null}
          {totalGoldBaht > 0 ? (
            <Text style={styles.metaChip}>
              {totalGoldBaht.toFixed(2)} baht
            </Text>
          ) : null}
          {totalCurrency > 0 && currencyLabel ? (
            <Text style={styles.metaChip}>
              {totalCurrency.toLocaleString("en-IN")} {currencyLabel}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.valueBlock}>
        <Text style={styles.valueLabel}>Est. Value</Text>
        <Text style={styles.valueText} numberOfLines={1}>
          {estInr > 0 ? fmtCurrency(estInr, "INR") : "—"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Main card
// ---------------------------------------------------------------------------
export function TripsVaultInfo({
  trips,
  txns,
}: {
  trips: CarrierTrip[];
  txns: BullionTxn[];
}) {
  const router = useRouter();
  const active = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (trips || [])
      .filter((t) => {
        const d = new Date(t.date);
        if (isNaN(d.getTime())) return false;
        // Show trips from 3 days ago through the future so recently-departed
        // trips still appear in the vault view.
        const diff = (today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
        return diff <= 3;
      })
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .slice(0, 6);
  }, [trips]);

  const totals = useMemo(() => {
    let totalWeightKg = 0;
    let totalGoldBaht = 0;
    let totalEstInr = 0;
    for (const t of active) {
      const linked = (txns || []).filter((x) => x.trip_id === t.id);
      for (const x of linked) {
        totalWeightKg += Number(x.weight_kg) || 0;
        totalGoldBaht += Number(x.gold_amount) || 0;
        const goldSale = Number(x.gold_sale_inr) || 0;
        const currSpend = (Number(x.currency_amount) || 0) * (Number(x.purchase_rate_inr) || 0);
        const goldCost = Number(x.gold_cost_inr) || 0;
        totalEstInr += goldSale || currSpend || goldCost || 0;
      }
    }
    return { totalWeightKg, totalGoldBaht, totalEstInr };
  }, [active, txns]);

  return (
    <View style={styles.card} testID="trips-vault-info">
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="airplane" size={14} color={colors.info} />
          <Text style={styles.headerText}>ACTIVE TRIPS VAULT</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/bullion" as never)} hitSlop={8} testID="trips-vault-open">
          <Text style={styles.headerAction}>Open →</Text>
        </TouchableOpacity>
      </View>

      {/* Roll-up totals */}
      <View style={styles.totalsRow}>
        <View style={styles.totalCol}>
          <Text style={styles.totalLabel}>Trips</Text>
          <Text style={styles.totalValue}>{active.length}</Text>
        </View>
        <View style={styles.totalCol}>
          <Text style={styles.totalLabel}>Weight</Text>
          <Text style={styles.totalValue}>{totals.totalWeightKg.toFixed(1)} kg</Text>
        </View>
        <View style={styles.totalCol}>
          <Text style={styles.totalLabel}>Gold</Text>
          <Text style={styles.totalValue}>{totals.totalGoldBaht.toFixed(2)} baht</Text>
        </View>
        <View style={styles.totalCol}>
          <Text style={styles.totalLabel}>Est. Value</Text>
          <Text style={styles.totalValue} numberOfLines={1}>
            {totals.totalEstInr > 0 ? fmtCurrency(totals.totalEstInr, "INR") : "—"}
          </Text>
        </View>
      </View>

      {/* Trip list */}
      {active.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="airplane-outline" size={22} color={colors.textMuted} />
          <Text style={styles.emptyText}>No active trips in vault right now</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} nestedScrollEnabled>
          {active.map((t) => (
            <TripRow
              key={t.id}
              trip={t}
              txns={(txns || []).filter((x) => x.trip_id === t.id)}
              onPress={() => router.push(`/bullion/trip/${t.id}` as never)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: "rgba(0, 245, 255, 0.06)",
    borderColor: "rgba(0, 245, 255, 0.30)",
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" } as any),
      },
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerText: {
    color: colors.info,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.9,
    textShadowColor: "rgba(0,245,255,0.35)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  headerAction: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "800",
  },
  totalsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: 10,
    marginBottom: 8,
    borderBottomColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  totalCol: {
    flex: 1,
    minWidth: 0,
  },
  totalLabel: {
    color: colors.textMuted,
    fontSize: 9,
    letterSpacing: 0.5,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  totalValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  list: {
    maxHeight: 260,
  },
  tripRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomColor: "rgba(255,255,255,0.06)",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  kindBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tripRoute: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    flex: 1,
  },
  tripDate: {
    color: colors.textMuted,
    fontSize: 11,
    marginLeft: 8,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 3,
  },
  metaChip: {
    color: colors.text,
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  valueBlock: {
    alignItems: "flex-end",
  },
  valueLabel: {
    color: colors.textMuted,
    fontSize: 9,
    letterSpacing: 0.4,
  },
  valueText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "900",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 6,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
