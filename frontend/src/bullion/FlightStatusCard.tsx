import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { FlightSnapshot } from "@/src/bullion/api-flight";
import { statusLabel, statusTint } from "@/src/bullion/api-flight";
import { colors, radii, spacing } from "@/src/theme";

/**
 * Compact card showing the live status pill, departure/arrival times,
 * progress bar and (when the API returns them) altitude / speed / aircraft.
 */
export function FlightStatusCard({ snap }: { snap: FlightSnapshot | null }) {
  if (!snap) {
    return (
      <View style={styles.card}>
        <Text style={styles.dim}>No live data yet.</Text>
      </View>
    );
  }
  const tint = statusTint(snap.status);
  const tintColor =
    tint === "info" ? colors.info :
    tint === "ok" ? colors.ok :
    tint === "danger" ? colors.danger :
    tint === "warn" ? colors.warn :
    colors.textDim;
  const pct = Math.round(snap.progress * 100);

  const depTime = snap.departure.actual || snap.departure.scheduled;
  const arrTime = snap.arrival.estimated || snap.arrival.scheduled;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={[styles.pill, { borderColor: tintColor }]}>
          <View style={[styles.dot, { backgroundColor: tintColor }]} />
          <Text style={[styles.pillText, { color: tintColor }]}>{statusLabel(snap.status)}</Text>
        </View>
        <Text style={styles.flightCode}>{snap.flight_iata}</Text>
        {snap.mocked ? (
          <View style={styles.mockPill}>
            <Text style={styles.mockPillText}>SIMULATED</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.routeRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.iata}>{snap.departure.airport_iata || "—"}</Text>
          <Text style={styles.timeLg}>{fmtTime(depTime)}</Text>
          <Text style={styles.timeSm}>{fmtDate(depTime)}</Text>
          {snap.departure.terminal ? (
            <Text style={styles.gate}>T{snap.departure.terminal}{snap.departure.gate ? ` · Gate ${snap.departure.gate}` : ""}</Text>
          ) : null}
        </View>

        <Ionicons name="airplane" size={20} color={colors.lime} style={{ marginHorizontal: 12, transform: [{ rotate: "90deg" }] }} />

        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <Text style={styles.iata}>{snap.arrival.airport_iata || "—"}</Text>
          <Text style={styles.timeLg}>{fmtTime(arrTime)}</Text>
          <Text style={styles.timeSm}>{fmtDate(arrTime)}</Text>
          {snap.arrival.terminal ? (
            <Text style={styles.gate}>T{snap.arrival.terminal}{snap.arrival.gate ? ` · Gate ${snap.arrival.gate}` : ""}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.progressText}>{pct}% flown</Text>
      </View>

      {(snap.aircraft_type || snap.live?.altitude_m || snap.live?.speed_kmh) ? (
        <View style={styles.telem}>
          <Telem label="Aircraft" value={snap.aircraft_type || "—"} />
          <Telem
            label="Altitude"
            value={snap.live?.altitude_m ? `${(snap.live.altitude_m / 304.8).toFixed(0)} kft` : "—"}
          />
          <Telem
            label="Speed"
            value={snap.live?.speed_kmh ? `${Math.round(snap.live.speed_kmh)} km/h` : "—"}
          />
        </View>
      ) : null}
    </View>
  );
}

function Telem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.telemBox}>
      <Text style={styles.telemLbl}>{label}</Text>
      <Text style={styles.telemVal}>{value}</Text>
    </View>
  );
}

function fmtTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
}

function fmtDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    backgroundColor: colors.chipBg,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  flightCode: { color: colors.text, fontSize: 15, fontWeight: "800", flex: 1, textAlign: "right" },
  mockPill: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    backgroundColor: colors.chipBg, borderColor: colors.warn, borderWidth: StyleSheet.hairlineWidth,
  },
  mockPillText: { color: colors.warn, fontSize: 9, fontWeight: "900", letterSpacing: 0.6 },
  routeRow: { flexDirection: "row", alignItems: "center" },
  iata: { color: colors.text, fontSize: 20, fontWeight: "900", letterSpacing: 1 },
  timeLg: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 2 },
  timeSm: { color: colors.textDim, fontSize: 11, marginTop: 1 },
  gate: { color: colors.textDim, fontSize: 10, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  progressWrap: {},
  progressTrack: {
    height: 5, borderRadius: 3, backgroundColor: colors.chipBg, overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.lime, borderRadius: 3 },
  progressText: { color: colors.textDim, fontSize: 11, marginTop: 6, textAlign: "right" },
  telem: {
    flexDirection: "row",
    gap: 8,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
  },
  telemBox: {
    flex: 1, alignItems: "center",
    paddingVertical: 4,
  },
  telemLbl: { color: colors.textDim, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6 },
  telemVal: { color: colors.text, fontSize: 13, fontWeight: "700", marginTop: 3 },
  dim: { color: colors.textDim, fontSize: 13 },
});
