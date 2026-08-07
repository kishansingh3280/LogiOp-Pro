import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import type { Airport } from "@/src/bullion/airports";
import { colors, radii } from "@/src/theme";

/**
 * Dark themed SVG map card that draws:
 *  - a subtle grid backdrop
 *  - two airport markers (origin + destination)
 *  - a curved great-circle-ish flight arc between them
 *  - a lime "progress" plane dot at the current fraction along the arc
 *
 * The projection is a simple linear rescaling of lat/lng into the visible
 * bounding box. Good enough for our short India ↔ Thailand corridor and
 * has no runtime dependency on native map libs.
 */

type Size = "sm" | "md" | "lg";

const DIMS: Record<Size, { w: number; h: number; padH: number; padV: number; marker: number; plane: number }> = {
  sm: { w: 320, h: 120, padH: 26, padV: 18, marker: 4, plane: 6 },
  md: { w: 360, h: 200, padH: 36, padV: 26, marker: 5, plane: 8 },
  lg: { w: 380, h: 240, padH: 40, padV: 32, marker: 6, plane: 10 },
};

interface Props {
  from: Airport;
  to: Airport;
  /** 0..1 flight progress fraction. Undefined hides the moving dot. */
  progress?: number;
  /** Optional live position. When set, plots the actual current plane. */
  live?: { latitude?: number; longitude?: number } | null;
  size?: Size;
  showLabels?: boolean;
}

export function FlightMap({ from, to, progress, live, size = "md", showLabels = true }: Props) {
  const dim = DIMS[size];
  const { w, h, padH, padV, marker, plane } = dim;

  const bounds = useMemo(() => {
    const lats = [from.lat, to.lat];
    const lngs = [from.lng, to.lng];
    if (live?.latitude !== undefined) lats.push(live.latitude);
    if (live?.longitude !== undefined) lngs.push(live.longitude);
    // Add a generous horizontal padding — the arc bulges "upward" so we
    // pad extra vertically to fit the peak of the bezier.
    const latMin = Math.min(...lats) - 3;
    const latMax = Math.max(...lats) + 8;
    const lngMin = Math.min(...lngs) - 4;
    const lngMax = Math.max(...lngs) + 4;
    return { latMin, latMax, lngMin, lngMax };
  }, [from, to, live]);

  const project = (lat: number, lng: number) => {
    const x = padH + ((lng - bounds.lngMin) / (bounds.lngMax - bounds.lngMin)) * (w - 2 * padH);
    // SVG y grows downward; latitude grows upward → invert.
    const y = padV + (1 - (lat - bounds.latMin) / (bounds.latMax - bounds.latMin)) * (h - 2 * padV);
    return { x, y };
  };

  const p0 = project(from.lat, from.lng);
  const p1 = project(to.lat, to.lng);

  // Control point: midpoint pulled upward for a nice arc.
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const midX = (p0.x + p1.x) / 2;
  const midY = (p0.y + p1.y) / 2;
  // Perpendicular unit vector, biased upward (negative y).
  const nx = -dy / (dist || 1);
  const ny = dx / (dist || 1);
  const bow = Math.min(dist * 0.28, h * 0.55);
  const cx = midX + nx * -bow;
  const cy = midY + ny * -bow;

  // Sample the quadratic bezier at fraction t for the plane dot.
  const sample = (t: number) => {
    const it = 1 - t;
    return {
      x: it * it * p0.x + 2 * it * t * cx + t * t * p1.x,
      y: it * it * p0.y + 2 * it * t * cy + t * t * p1.y,
      // Tangent for heading.
      hx: 2 * it * (cx - p0.x) + 2 * t * (p1.x - cx),
      hy: 2 * it * (cy - p0.y) + 2 * t * (p1.y - cy),
    };
  };

  const t = typeof progress === "number" ? Math.max(0, Math.min(1, progress)) : 0;
  const planePos = live?.latitude !== undefined && live?.longitude !== undefined
    ? project(live.latitude, live.longitude)
    : sample(t);
  const planeAngle = Math.atan2(planePos.hy ?? 0, planePos.hx ?? 1) * (180 / Math.PI);

  const arcPath = `M ${p0.x} ${p0.y} Q ${cx} ${cy} ${p1.x} ${p1.y}`;

  // Grid lines for texture.
  const gridStep = 40;
  const rows = Array.from({ length: Math.floor(h / gridStep) }, (_, i) => padV + (i + 1) * gridStep);
  const cols = Array.from({ length: Math.floor(w / gridStep) }, (_, i) => padH + (i + 1) * gridStep);

  return (
    <View style={styles.container}>
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id="arc" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colors.lime} stopOpacity="0.3" />
            <Stop offset="0.6" stopColor={colors.lime} stopOpacity="0.9" />
            <Stop offset="1" stopColor={colors.lime} stopOpacity="0.5" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={w} height={h} rx={12} fill={colors.surface} />

        {/* Grid */}
        <G opacity={0.12}>
          {rows.map((y) => (
            <Line key={`r${y}`} x1={padH / 2} y1={y} x2={w - padH / 2} y2={y} stroke={colors.textDim} strokeWidth={0.5} />
          ))}
          {cols.map((x) => (
            <Line key={`c${x}`} x1={x} y1={padV / 2} x2={x} y2={h - padV / 2} stroke={colors.textDim} strokeWidth={0.5} />
          ))}
        </G>

        {/* Great-circle-ish arc: dashed base + solid up to progress */}
        <Path d={arcPath} stroke={colors.border} strokeWidth={1.5} strokeDasharray="4,4" fill="none" />
        {t > 0 && (
          <Path d={arcPath} stroke="url(#arc)" strokeWidth={2.5} fill="none" strokeDasharray={`${t * 1000},1000`} />
        )}

        {/* Airports */}
        <Circle cx={p0.x} cy={p0.y} r={marker + 2} fill={colors.limeGlow} opacity={0.6} />
        <Circle cx={p0.x} cy={p0.y} r={marker} fill={colors.lime} />
        <Circle cx={p1.x} cy={p1.y} r={marker + 2} fill={colors.limeGlow} opacity={0.6} />
        <Circle cx={p1.x} cy={p1.y} r={marker} fill={colors.lime} />

        {showLabels && (
          <>
            <SvgText x={p0.x} y={p0.y - marker - 6} fill={colors.text} fontSize={size === "sm" ? 9 : 11} fontWeight="700" textAnchor="middle">
              {from.code}
            </SvgText>
            <SvgText x={p1.x} y={p1.y - marker - 6} fill={colors.text} fontSize={size === "sm" ? 9 : 11} fontWeight="700" textAnchor="middle">
              {to.code}
            </SvgText>
            {size !== "sm" && (
              <>
                <SvgText x={p0.x} y={p0.y + marker + 12} fill={colors.textDim} fontSize={9} textAnchor="middle">
                  {from.city}
                </SvgText>
                <SvgText x={p1.x} y={p1.y + marker + 12} fill={colors.textDim} fontSize={9} textAnchor="middle">
                  {to.city}
                </SvgText>
              </>
            )}
          </>
        )}

        {/* Plane dot */}
        {typeof progress === "number" && (
          <G>
            <Circle cx={planePos.x} cy={planePos.y} r={plane + 4} fill={colors.lime} opacity={0.25} />
            <Circle cx={planePos.x} cy={planePos.y} r={plane} fill={colors.lime} stroke={colors.bg} strokeWidth={2} />
            <SvgText
              x={planePos.x}
              y={planePos.y + (plane / 2) - 1}
              fill={colors.bg}
              fontSize={plane + 2}
              fontWeight="900"
              textAnchor="middle"
              transform={`rotate(${planeAngle}, ${planePos.x}, ${planePos.y})`}
            >
              ✈
            </SvgText>
          </G>
        )}
      </Svg>
      {size !== "sm" && (
        <View style={styles.footer}>
          <View style={styles.footerCol}>
            <Text style={styles.footerCode}>{from.code}</Text>
            <Text style={styles.footerCity}>{from.city}</Text>
          </View>
          <View style={styles.footerBar}>
            <View style={[styles.footerFill, { width: `${Math.round(t * 100)}%` }]} />
          </View>
          <View style={[styles.footerCol, { alignItems: "flex-end" }]}>
            <Text style={styles.footerCode}>{to.code}</Text>
            <Text style={styles.footerCity}>{to.city}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerCol: { minWidth: 40 },
  footerCode: { color: colors.text, fontSize: 13, fontWeight: "800" },
  footerCity: { color: colors.textDim, fontSize: 10 },
  footerBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.chipBg,
    borderRadius: 2,
    overflow: "hidden",
  },
  footerFill: { height: "100%", backgroundColor: colors.lime, borderRadius: 2 },
});
