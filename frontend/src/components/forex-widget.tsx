/**
 * ForexWidget — Live FX rates row for the JARVIS Aura dashboard.
 *
 * Renders a two-up card: USD → INR and INR → THB, each showing:
 *   • Current spot rate (large numeric)
 *   • 30-day change % (green +, red −, dim ~0)
 *   • Sparkline of the last 30 business days
 *   • Last-updated date + tap-to-refresh chip
 *
 * Data source: frankfurter.app (ECB-backed, no auth). Cached 15 min / 24 h.
 */
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { colors, radii, spacing } from "@/src/theme";
import { fetchFxCard, type FxPair, type FxSeries, type FxSpot } from "@/src/utils/forex";

const PAIRS: { pair: FxPair; label: string; inverse?: boolean }[] = [
  { pair: { base: "USD", quote: "INR" }, label: "USD → INR" },
  // frankfurter doesn't have INR as a base for THB directly, so we fetch
  // THB→INR and invert the rate/series to get INR→THB.
  { pair: { base: "THB", quote: "INR" }, label: "INR → THB", inverse: true },
];

// ---------------------------------------------------------------------------
// Sparkline — path built from `points`, normalized to viewbox.
// ---------------------------------------------------------------------------
function Sparkline({
  series,
  color,
  width,
  height,
}: {
  series: FxSeries;
  color: string;
  width: number;
  height: number;
}) {
  const { points, min, max } = series;
  if (!points.length) return null;
  const range = max - min || 1;
  const pad = 4;
  const usableH = height - pad * 2;
  const usableW = width - pad * 2;
  const step = usableW / Math.max(1, points.length - 1);
  const path = points
    .map((p, i) => {
      const x = pad + i * step;
      const y = pad + (1 - (p.rate - min) / range) * usableH;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const lastPoint = points[points.length - 1];
  const lastX = pad + (points.length - 1) * step;
  const lastY = pad + (1 - (lastPoint.rate - min) / range) * usableH;

  return (
    <Svg width={width} height={height}>
      <Path d={path} stroke={color} strokeWidth={1.8} fill="none" strokeLinejoin="round" />
      <Circle cx={lastX} cy={lastY} r={2.6} fill={color} />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Single FX card
// ---------------------------------------------------------------------------
function FxCard({
  label,
  pair,
  inverse,
}: {
  label: string;
  pair: FxPair;
  inverse?: boolean;
}) {
  const [spot, setSpot] = useState<FxSpot | null>(null);
  const [series, setSeries] = useState<FxSeries | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { spot: s, series: ss } = await fetchFxCard(pair, 30);
      if (inverse) {
        // Invert THB→INR into INR→THB.
        const inv = {
          rate: 1 / s.rate,
          date: s.date,
        };
        const invSeries: FxSeries = {
          base: pair.quote,
          quote: pair.base,
          points: ss.points.map((p) => ({ date: p.date, rate: 1 / p.rate })),
          start: 1 / ss.start,
          end: 1 / ss.end,
          // For an inverted series the min/max flip: (1/max, 1/min)
          min: 1 / ss.max,
          max: 1 / ss.min,
          change_pct: -ss.change_pct,
        };
        setSpot(inv);
        setSeries(invSeries);
      } else {
        setSpot(s);
        setSeries(ss);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [pair, inverse]);

  useEffect(() => {
    load();
  }, [load]);

  const changeColor =
    !series ? colors.textMuted : series.change_pct > 0.05
      ? colors.ok
      : series.change_pct < -0.05
        ? colors.danger
        : colors.textMuted;

  const changeIcon =
    !series ? "remove" : series.change_pct > 0.05 ? "arrow-up" : series.change_pct < -0.05 ? "arrow-down" : "remove";

  return (
    <View style={styles.card} testID={`forex-card-${pair.base}-${pair.quote}`}>
      <View style={styles.rowBetween}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity
          onPress={load}
          hitSlop={8}
          style={styles.refreshBtn}
          testID={`forex-refresh-${pair.base}-${pair.quote}`}
        >
          <Ionicons name="refresh" size={12} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errBox}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.danger} />
          <Text style={styles.errText}>Rate load fail</Text>
        </View>
      ) : (
        <>
          <View style={styles.rateRow}>
            <Text style={styles.rate} testID={`forex-rate-${pair.base}-${pair.quote}`}>
              {loading || !spot ? "—" : spot.rate.toFixed(spot.rate < 1 ? 5 : 3)}
            </Text>
            {series ? (
              <View style={[styles.changePill, { borderColor: changeColor + "88", backgroundColor: changeColor + "22" }]}>
                <Ionicons name={changeIcon as never} size={9} color={changeColor} />
                <Text style={[styles.changeText, { color: changeColor }]}>
                  {series.change_pct >= 0 ? "+" : ""}
                  {series.change_pct.toFixed(2)}%
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.sparkWrap}>
            {series ? (
              <Sparkline series={series} color={changeColor} width={140} height={38} />
            ) : (
              <View style={styles.sparkPlaceholder} />
            )}
          </View>

          <Text style={styles.updatedAt}>
            {spot ? `Updated ${spot.date}` : loading ? "Loading…" : "—"}
          </Text>
        </>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Row wrapper
// ---------------------------------------------------------------------------
export function ForexWidget() {
  return (
    <View style={styles.row} testID="forex-widget">
      {PAIRS.map((p) => (
        <FxCard key={p.label} label={p.label} pair={p.pair} inverse={p.inverse} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  card: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: "rgba(0, 245, 255, 0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0, 245, 255, 0.30)",
    ...Platform.select({
      web: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({
          backgroundImage:
            "linear-gradient(135deg, rgba(0,245,255,0.10) 0%, rgba(155,77,255,0.08) 100%)",
          backdropFilter: "blur(12px)",
        } as any),
      },
      default: {
        shadowColor: "#00F5FF",
        shadowOpacity: 0.20,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 3 },
      },
    }),
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  label: {
    color: "#00F5FF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  refreshBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,255,136,0.10)",
  },
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  rate: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  changePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  changeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  sparkWrap: {
    height: 38,
    marginTop: 2,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  sparkPlaceholder: {
    height: 38,
    width: 140,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 6,
  },
  updatedAt: {
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 0.2,
    marginTop: 4,
  },
  errBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 12,
  },
  errText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: "700",
  },
});
