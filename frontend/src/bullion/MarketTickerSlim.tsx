import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";

import { fetchMarket, type MarketSnapshot } from "@/src/bullion/api-market";
import { colors, radii, spacing } from "@/src/theme";

/**
 * Slim single-line market ticker.
 *
 * Rotates through USD/INR, USD/THB, and gold rates every ~4s with a
 * smooth vertical fade. Pinned as a thin bar at the top of the Bullion
 * screen. Tap the bar to force-refresh the underlying data.
 */
export function MarketTickerSlim({ style }: { style?: ViewStyle }) {
  const [snap, setSnap] = useState<MarketSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

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

  const items = useMemo(() => {
    if (!snap) return [] as { label: string; value: string; mocked: boolean }[];
    return [
      { label: "USD → INR", value: `₹${snap.usd_inr.toFixed(2)}`, mocked: snap.fx_mocked },
      { label: "USD → THB", value: `฿${snap.usd_thb.toFixed(2)}`, mocked: snap.fx_mocked },
      { label: "Gold ⋅ INR/g", value: `₹${snap.gold_inr_per_gram.toFixed(0)}`, mocked: snap.gold_mocked || snap.fx_mocked },
      { label: "Gold ⋅ THB/g", value: `฿${snap.gold_thb_per_gram.toFixed(0)}`, mocked: snap.gold_mocked || snap.fx_mocked },
      { label: "Gold ⋅ USD/oz", value: `$${snap.gold_usd_per_oz.toFixed(0)}`, mocked: snap.gold_mocked },
    ];
  }, [snap]);

  // Rotation loop — fade out, bump index, fade back in.
  useEffect(() => {
    if (items.length <= 1) return;
    const iv = setInterval(() => {
      Animated.timing(fade, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        setIndex((i) => (i + 1) % items.length);
        Animated.timing(fade, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      });
    }, 3800);
    return () => clearInterval(iv);
  }, [items.length, fade]);

  const current = items[index] || null;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => refresh(true)}
      style={[styles.bar, style]}
      testID="market-ticker-slim"
    >
      <View style={styles.livePulse} />
      <Text style={styles.tag}>LIVE</Text>
      {current ? (
        <Animated.View style={[styles.contentRow, { opacity: fade }]}>
          <Text style={styles.label}>{current.label}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.value}>{current.value}</Text>
          {current.mocked ? <Text style={styles.sim}>SIM</Text> : null}
        </Animated.View>
      ) : (
        <Text style={styles.dim}>{loading ? "Fetching live rates…" : "—"}</Text>
      )}
      <Ionicons
        name="refresh"
        size={12}
        color={loading ? colors.textDim : colors.textDim}
        style={{ opacity: loading ? 1 : 0.5 }}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  livePulse: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: colors.lime,
    shadowColor: colors.lime, shadowOpacity: 0.9, shadowRadius: 4,
  },
  tag: {
    color: colors.lime,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  contentRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  dot: { color: colors.border, fontSize: 12 },
  value: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  sim: {
    color: colors.warn,
    fontSize: 9,
    fontWeight: "900",
    marginLeft: 4,
    letterSpacing: 0.6,
  },
  dim: { color: colors.textDim, fontSize: 12, flex: 1 },
});

export default MarketTickerSlim;
