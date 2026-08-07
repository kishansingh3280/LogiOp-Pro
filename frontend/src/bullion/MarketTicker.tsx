import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { fetchMarket, type MarketSnapshot } from "@/src/bullion/api-market";
import { colors, radii, spacing } from "@/src/theme";

/**
 * Compact live market reference widget. Shows USD/INR, USD/THB and gold
 * per gram in both currencies. Auto-refreshes every 5 minutes (cache TTL)
 * and can be manually refreshed by tap.
 *
 * Marked as "sim" when the API/key fails and we fell back to mock values.
 */
export function MarketTicker({ style }: { style?: object }) {
  const [snap, setSnap] = useState<MarketSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const m = await fetchMarket(force);
      setSnap(m);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const iv = setInterval(() => refresh(false), 60 * 1000);
    return () => clearInterval(iv);
  }, [refresh]);

  const items = snap
    ? [
        { label: "USD / INR", value: `₹${snap.usd_inr.toFixed(2)}`, mocked: snap.fx_mocked },
        { label: "USD / THB", value: `฿${snap.usd_thb.toFixed(2)}`, mocked: snap.fx_mocked },
        { label: "Gold INR/g", value: `₹${snap.gold_inr_per_gram.toFixed(0)}`, mocked: snap.gold_mocked || snap.fx_mocked },
        { label: "Gold THB/g", value: `฿${snap.gold_thb_per_gram.toFixed(0)}`, mocked: snap.gold_mocked || snap.fx_mocked },
        { label: "Gold USD/oz", value: `$${snap.gold_usd_per_oz.toFixed(0)}`, mocked: snap.gold_mocked },
      ]
    : [];

  return (
    <View style={[styles.container, style]}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.livePulse} />
          <Text style={styles.headerLabel}>Live market</Text>
        </View>
        <TouchableOpacity onPress={() => refresh(true)} disabled={loading} style={styles.refreshBtn} testID="ticker-refresh">
          <Ionicons name="refresh" size={12} color={loading ? colors.textDim : colors.lime} />
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {items.length === 0 ? (
          <View style={styles.chip}>
            <Text style={styles.chipVal}>{loading ? "…" : "—"}</Text>
          </View>
        ) : (
          items.map((it) => (
            <View key={it.label} style={styles.chip}>
              <Text style={styles.chipLbl}>{it.label}</Text>
              <Text style={styles.chipVal}>{it.value}</Text>
              {it.mocked ? <Text style={styles.sim}>SIM</Text> : null}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    marginBottom: 6,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  livePulse: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: colors.lime,
    shadowColor: colors.lime, shadowOpacity: 0.9, shadowRadius: 4,
  },
  headerLabel: {
    color: colors.textDim, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: "700",
  },
  refreshBtn: {
    padding: 4,
    borderRadius: radii.pill,
  },
  scroll: { paddingHorizontal: spacing.md, gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: colors.chipBg,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 92,
  },
  chipLbl: {
    color: colors.textDim, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: "700",
  },
  chipVal: { color: colors.text, fontSize: 15, fontWeight: "800", marginTop: 2 },
  sim: {
    color: colors.warn, fontSize: 8, fontWeight: "800", letterSpacing: 0.6, marginTop: 2,
  },
});
