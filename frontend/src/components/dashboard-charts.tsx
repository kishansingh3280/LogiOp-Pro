/**
 * DashboardCharts — three JARVIS Aura charts on a single card row.
 *
 *   1. Shipments Pie  — Delivered / In-Transit / Pending share
 *   2. Revenue Bar    — Last 6 months revenue from ledger entries
 *   3. Trips Donut    — Completed / In-Progress / Planned semi-donut
 *
 * Charts are rendered with plain `react-native-svg` (no heavy chart lib
 * dependency) so they render identically on web + native.
 */
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";

import type { LedgerEntry, Shipment } from "@/src/api/types";
import type { CarrierTrip } from "@/src/bullion/types";
import { colors, radii, spacing } from "@/src/theme";
import { fmtCurrency } from "@/src/utils/format";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TAU = Math.PI * 2;

function polar(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

// Arc from `startAngle` → `endAngle` (radians, 0 = 3 o'clock). Angles are
// in the SVG coordinate system (Y grows downward → +ve angles rotate CW).
function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polar(cx, cy, r, startAngle);
  const end = polar(cx, cy, r, endAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y} Z`;
}

// Donut segment (stroke-based) for a semi-donut arc.
function donutSegment(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polar(cx, cy, r, startAngle);
  const end = polar(cx, cy, r, endAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

// ---------------------------------------------------------------------------
// 1) Shipments Pie
// ---------------------------------------------------------------------------
function ShipmentsPie({ delivered, inTransit, pending }: { delivered: number; inTransit: number; pending: number }) {
  const total = Math.max(1, delivered + inTransit + pending);
  const slices = [
    { label: "Delivered", value: delivered, color: colors.ok },
    { label: "In Transit", value: inTransit, color: colors.info },
    { label: "Pending", value: pending, color: colors.warn },
  ];
  const size = 130;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;
  let angle = -Math.PI / 2; // Start at 12 o'clock

  return (
    <View style={styles.chartCol} testID="chart-shipments-pie">
      <Text style={styles.chartTitle}>SHIPMENTS</Text>
      <View style={styles.pieBody}>
        <Svg width={size} height={size}>
          {slices.map((s) => {
            const sweep = (s.value / total) * TAU;
            const start = angle;
            const end = angle + sweep;
            angle = end;
            if (sweep === 0) return null;
            // Full-circle case (single non-zero slice) — draw a full ring.
            if (sweep >= TAU - 0.0001) {
              return (
                <Circle key={s.label} cx={cx} cy={cy} r={r} fill={s.color} opacity={0.9} />
              );
            }
            return <Path key={s.label} d={arcPath(cx, cy, r, start, end)} fill={s.color} opacity={0.9} />;
          })}
          {/* Center hole (donut effect) */}
          <Circle cx={cx} cy={cy} r={r * 0.5} fill="rgba(7,7,15,0.85)" />
          <SvgText
            x={cx}
            y={cy}
            fill={colors.text}
            fontSize={16}
            fontWeight="900"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {total}
          </SvgText>
        </Svg>
        <View style={styles.legend}>
          {slices.map((s) => (
            <View key={s.label} style={styles.legendRow}>
              <View style={[styles.legendSwatch, { backgroundColor: s.color }]} />
              <Text style={styles.legendLabel}>{s.label}</Text>
              <Text style={styles.legendValue}>{s.value}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 2) Revenue Bar (last 6 months, from ledger entries where amount > 0)
// ---------------------------------------------------------------------------
function RevenueBar({ entries, fy }: { entries: LedgerEntry[]; fy?: string }) {
  const buckets = useMemo(() => {
    // Sum credit entries (customer payments in) per month for the last 6 months
    const now = new Date();
    const months: { key: string; label: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleString("en-US", { month: "short" }),
        total: 0,
      });
    }
    for (const e of entries || []) {
      const raw = (e as unknown as { date?: string; created_at?: string }).date || (e as unknown as { created_at?: string }).created_at;
      if (!raw) continue;
      const dt = new Date(raw);
      if (isNaN(dt.getTime())) continue;
      const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      const bucket = months.find((m) => m.key === k);
      if (!bucket) continue;
      // Sum the total absolute activity (debit + credit) per month as a
      // proxy for revenue turnover. The ledger uses `debit` / `credit`
      // rather than a signed amount + direction; we sum both sides so
      // every posted rupee counts once as business volume.
      const debit = Number((e as unknown as { debit?: number }).debit || 0);
      const credit = Number((e as unknown as { credit?: number }).credit || 0);
      bucket.total += Math.abs(debit) + Math.abs(credit);
    }
    return months;
  }, [entries]);

  const w = 220;
  const h = 130;
  const paddingL = 28;
  const paddingR = 6;
  const paddingT = 8;
  const paddingB = 22;
  const chartW = w - paddingL - paddingR;
  const chartH = h - paddingT - paddingB;
  const max = Math.max(1, ...buckets.map((b) => b.total));
  const barW = (chartW / buckets.length) * 0.6;
  const step = chartW / buckets.length;

  return (
    <View style={styles.chartCol} testID="chart-revenue-bar">
      <Text style={styles.chartTitle}>TURNOVER (6M){fy ? ` · FY${fy.slice(-2)}` : ""}</Text>
      <View style={styles.barBody}>
        <Svg width={w} height={h}>
          {/* Baseline */}
          <Line x1={paddingL} y1={paddingT + chartH} x2={w - paddingR} y2={paddingT + chartH} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
          {buckets.map((b, i) => {
            const bh = (b.total / max) * chartH;
            const x = paddingL + step * i + (step - barW) / 2;
            const y = paddingT + chartH - bh;
            return (
              <G key={b.key}>
                <Rect x={x} y={y} width={barW} height={Math.max(1, bh)} rx={3} fill={colors.accent} opacity={0.85} />
                <SvgText
                  x={x + barW / 2}
                  y={paddingT + chartH + 14}
                  fill={colors.textMuted}
                  fontSize={9}
                  textAnchor="middle"
                >
                  {b.label}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>
      <Text style={styles.chartFoot} numberOfLines={1}>
        Max: {fmtCurrency(max, "INR")}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 3) Trips Semi-Donut (planned / in-progress / completed)
// ---------------------------------------------------------------------------
function TripsSemiDonut({ trips }: { trips: CarrierTrip[] }) {
  // Bucket trips by inferred status. Trips schema has no status field so
  // we derive it from the date:
  //   • date in the future or today  → "Planned"
  //   • date within last 3 days      → "In-Progress"
  //   • older                        → "Completed"
  const buckets = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const b = { planned: 0, inProgress: 0, completed: 0 };
    for (const t of trips || []) {
      const d = new Date(t.date);
      if (isNaN(d.getTime())) continue;
      const diffDays = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) b.planned += 1;
      else if (diffDays <= 3) b.inProgress += 1;
      else b.completed += 1;
    }
    return b;
  }, [trips]);

  const slices = [
    { label: "Completed", value: buckets.completed, color: colors.ok },
    { label: "In-Progress", value: buckets.inProgress, color: colors.info },
    { label: "Planned", value: buckets.planned, color: colors.warn },
  ];
  const total = Math.max(1, buckets.completed + buckets.inProgress + buckets.planned);
  const trueTotal = buckets.completed + buckets.inProgress + buckets.planned;

  const w = 170;
  const h = 100;
  const cx = w / 2;
  const cy = h - 8;
  const r = 68;
  const strokeW = 12;
  let angle = Math.PI; // Start left (9 o'clock)

  return (
    <View style={styles.chartCol} testID="chart-trips-donut">
      <Text style={styles.chartTitle}>TRIPS</Text>
      <View style={styles.donutBody}>
        <Svg width={w} height={h}>
          {/* Background track */}
          <Path
            d={donutSegment(cx, cy, r, Math.PI, TAU)}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeW}
            fill="none"
            strokeLinecap="round"
          />
          {slices.map((s) => {
            const sweep = (s.value / total) * Math.PI;
            const start = angle;
            const end = angle + sweep;
            angle = end;
            if (sweep === 0) return null;
            return (
              <Path
                key={s.label}
                d={donutSegment(cx, cy, r, start, end)}
                stroke={s.color}
                strokeWidth={strokeW}
                strokeLinecap="round"
                fill="none"
              />
            );
          })}
          <SvgText
            x={cx}
            y={cy - 6}
            fill={colors.text}
            fontSize={20}
            fontWeight="900"
            textAnchor="middle"
          >
            {trueTotal}
          </SvgText>
          <SvgText
            x={cx}
            y={cy + 8}
            fill={colors.textMuted}
            fontSize={9}
            textAnchor="middle"
          >
            trips
          </SvgText>
        </Svg>
        <View style={styles.legendCompact}>
          {slices.map((s) => (
            <View key={s.label} style={styles.legendRow}>
              <View style={[styles.legendSwatch, { backgroundColor: s.color }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>{s.label}</Text>
              <Text style={styles.legendValue}>{s.value}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Container — wraps the 3 charts in a horizontally-scrollable row on phones
// and a 3-column grid on tablets.
// ---------------------------------------------------------------------------
export function DashboardCharts({
  shipments,
  entries,
  trips,
  fy,
  tablet,
}: {
  shipments: Shipment[];
  entries: LedgerEntry[];
  trips: CarrierTrip[];
  fy?: string;
  tablet?: boolean;
}) {
  const totals = useMemo(() => {
    let delivered = 0;
    let inTransit = 0;
    let pending = 0;
    for (const s of shipments || []) {
      const st = (s.status || "").toString();
      if (st === "delivered") delivered += 1;
      else if (st === "pending") pending += 1;
      else if (st === "in_transit" || st === "warehouse_arrived") inTransit += 1;
    }
    return { delivered, inTransit, pending };
  }, [shipments]);

  return (
    <View style={styles.container} testID="dashboard-charts">
      <View style={styles.header}>
        <Ionicons name="stats-chart" size={14} color={colors.accent} />
        <Text style={styles.headerText}>ANALYTICS</Text>
      </View>
      <View style={[styles.grid, tablet ? styles.gridTablet : null]}>
        <ShipmentsPie {...totals} />
        <RevenueBar entries={entries} fy={fy} />
        <TripsSemiDonut trips={trips} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: "rgba(24, 12, 44, 0.35)",
    borderColor: "rgba(155, 77, 255, 0.35)",
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
    gap: 6,
    marginBottom: 10,
  },
  headerText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    textShadowColor: "rgba(0,255,136,0.35)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  grid: {
    flexDirection: "column",
    gap: spacing.md,
  },
  gridTablet: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  chartCol: {
    flex: 1,
    minWidth: 0,
  },
  chartTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  chartFoot: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 4,
  },
  pieBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  barBody: {
    alignItems: "center",
  },
  donutBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  legend: {
    flex: 1,
    gap: 4,
  },
  legendCompact: {
    flex: 1,
    gap: 3,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendSwatch: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendLabel: {
    color: colors.text,
    fontSize: 11,
    flex: 1,
  },
  legendValue: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "700",
  },
});
