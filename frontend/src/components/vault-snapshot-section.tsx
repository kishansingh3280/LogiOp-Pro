/**
 * VaultSnapshotSection — JARVIS Aura v3 warehouse-wise assets view.
 *
 * The user asked for a warehouse selector — Bangkok is the only real
 * warehouse today, but the UI is set up so more warehouses (Delhi,
 * Mumbai, …) can be added later by dropping them into `WAREHOUSES`.
 * Each card shows:
 *   • total bags + total kg (from /api/dashboard/warehouse for the
 *     current active warehouse)
 *   • currency-on-hand (sum of all active bullion trip currency legs)
 *   • saman (gold) grams (sum of active bullion trip gold weight)
 *   • horizontal progress bar for capacity fill
 *
 * Tapping the card navigates to /warehouses so the user can drill into
 * per-warehouse detail.
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { WarehouseSummary } from "@/src/api/types";
import type { CarrierTrip } from "@/src/bullion/types";
import { useCardBreathing } from "@/src/hooks/use-card-breathing";
import { colors, radii, spacing } from "@/src/theme";

type WarehouseKey = "bangkok" | "delhi";

const WAREHOUSES: { key: WarehouseKey; name: string; disabled?: boolean }[] = [
  { key: "bangkok", name: "Bangkok" },
  { key: "delhi", name: "Delhi", disabled: true }, // wire real data later
];

export function VaultSnapshotSection({
  warehouseData,
  trips,
}: {
  warehouseData?: WarehouseSummary | null;
  trips?: CarrierTrip[];
}) {
  const router = useRouter();
  const [active, setActive] = useState<WarehouseKey>("bangkok");
  const breathe = useCardBreathing({ blur: false });

  // Aggregate live carrier trips → gold grams + currency on the move.
  // Only trips whose status implies material is currently carried are
  // counted (pending / in_transit / partial_delivered).
  const trip = useMemo(() => {
    const activeTrips = (trips || []).filter((t) =>
      ["pending", "in_transit", "partial_delivered"].includes((t.status || "").toLowerCase()),
    );
    let goldBaht = 0;
    let currencyInr = 0;
    let currencyThb = 0;
    for (const t of activeTrips) {
      // Field names differ across schema revisions — support both.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyT = t as any;
      goldBaht += Number(anyT.gold_baht || anyT.gold_bt || 0) || 0;
      if ((anyT.currency_type || "").toUpperCase() === "INR") {
        currencyInr += Number(anyT.currency_amount || 0) || 0;
      } else if ((anyT.currency_type || "").toUpperCase() === "THB") {
        currencyThb += Number(anyT.currency_amount || 0) || 0;
      }
    }
    return { activeTrips: activeTrips.length, goldBaht, currencyInr, currencyThb };
  }, [trips]);

  const bags = warehouseData?.current_bags ?? 0;
  const kg = Math.round(warehouseData?.current_kg || 0);
  const capacity = Math.round(warehouseData?.capacity_kg || 5000);
  const pct = Math.min(100, warehouseData?.pct || 0);

  const showData = active === "bangkok"; // Delhi is placeholder

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Vault snapshot</Text>
      </View>
      {/* Warehouse selector */}
      <View style={styles.selector}>
        {WAREHOUSES.map((w) => {
          const isActive = active === w.key;
          return (
            <TouchableOpacity
              key={w.key}
              onPress={() => !w.disabled && setActive(w.key)}
              activeOpacity={0.85}
              style={[styles.pill, isActive && styles.pillActive, w.disabled && styles.pillDisabled]}
              testID={`vault-tab-${w.key}`}
            >
              <Text style={[styles.pillText, isActive && styles.pillTextActive, w.disabled && styles.pillTextDim]}>
                {w.name}
                {w.disabled ? "  (soon)" : ""}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push("/warehouses")}
        testID="vault-card"
      >
        <View style={[styles.card, breathe]}>
          {/* Warehouse name + capacity bar */}
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.warehouseName}>
                {WAREHOUSES.find((w) => w.key === active)?.name} warehouse
              </Text>
              <Text style={styles.warehouseSub}>
                {showData ? `${bags} bags · ${kg} kg` : "No live data yet"}
              </Text>
            </View>
            <View style={styles.pctBubble}>
              <Text style={styles.pctText}>{showData ? `${Math.round(pct)}%` : "—"}</Text>
            </View>
          </View>

          {/* Capacity bar */}
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${showData ? pct : 0}%` },
              ]}
            />
          </View>
          <Text style={styles.capSub}>
            {showData ? `${kg} / ${capacity} kg capacity` : "capacity data unavailable"}
          </Text>

          {/* Asset breakdown grid */}
          <View style={styles.grid}>
            <AssetTile
              icon="cube-outline"
              label="Bags"
              value={showData ? String(bags) : "—"}
              sub={showData ? `${kg} kg` : ""}
              tint="#00F5FF"
            />
            <AssetTile
              icon="cash-outline"
              label="Currency"
              value={showData ? formatCurrencyCarried(trip.currencyInr, trip.currencyThb) : "—"}
              sub={showData ? `${trip.activeTrips} trips` : ""}
              tint="#00FF88"
            />
            <AssetTile
              icon="diamond-outline"
              label="Saman (gold)"
              value={showData && trip.goldBaht > 0 ? `${trip.goldBaht.toFixed(1)} bt` : showData ? "0 bt" : "—"}
              sub={showData && trip.goldBaht > 0 ? `${(trip.goldBaht * 15.244).toFixed(0)} g` : ""}
              tint="#FFD700"
            />
          </View>

          <View style={styles.cta}>
            <Text style={styles.ctaText}>Tap to view warehouse details</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textDim} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

function formatCurrencyCarried(inr: number, thb: number): string {
  const parts: string[] = [];
  if (inr > 0) parts.push(`₹${Math.round(inr).toLocaleString("en-IN")}`);
  if (thb > 0) parts.push(`฿${Math.round(thb).toLocaleString("en-IN")}`);
  return parts.length ? parts.join(" · ") : "None";
}

function AssetTile({
  icon,
  label,
  value,
  sub,
  tint,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  sub: string;
  tint: string;
}) {
  return (
    <View style={styles.assetTile}>
      <View style={[styles.assetIcon, { borderColor: tint + "55" }]}>
        <Ionicons name={icon} size={14} color={tint} />
      </View>
      <Text style={styles.assetLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.assetValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {sub ? <Text style={styles.assetSub} numberOfLines={1}>{sub}</Text> : null}
    </View>
  );
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
  selector: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderColor: "rgba(255,255,255,0.20)",
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "transparent",
  },
  pillActive: { backgroundColor: "#00FF88", borderColor: "#00FF88" },
  pillDisabled: { opacity: 0.5 },
  pillText: { color: "rgba(255,255,255,0.60)", fontSize: 11, fontWeight: "800", letterSpacing: 0.4 },
  pillTextActive: { color: "#000000" },
  pillTextDim: { color: "rgba(255,255,255,0.40)" },
  card: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: "rgba(12,12,30,0.75)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.10)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  warehouseName: { color: colors.text, fontSize: 16, fontWeight: "800" },
  warehouseSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  pctBubble: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderColor: "rgba(0,255,136,0.35)",
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,255,136,0.10)",
  },
  pctText: { color: "#00FF88", fontSize: 12, fontWeight: "800" },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
    marginBottom: 4,
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#00FF88",
  },
  capSub: { color: colors.textDim, fontSize: 11, marginBottom: 12 },
  grid: {
    flexDirection: "row",
    gap: 8,
  },
  assetTile: {
    flex: 1,
    minWidth: 0,
    padding: 10,
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.06)",
  },
  assetIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  assetLabel: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  assetValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  assetSub: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 10,
    gap: 4,
  },
  ctaText: { color: colors.textDim, fontSize: 11, fontWeight: "600" },
});
