import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useApi } from "@/src/api/hooks";
import type { Party } from "@/src/api/types";
import { findAirline } from "@/src/bullion/airlines";
import { AirlineBadge } from "@/src/bullion/AirlineBadge";
import { defaultAirports, findAirport } from "@/src/bullion/airports";
import { FlightMap } from "@/src/bullion/FlightMap";
import { FlightStatusCard } from "@/src/bullion/FlightStatusCard";
import { usedWeightKgFor, useTrips, useTxns } from "@/src/bullion/store";
import { tripCapacityKg } from "@/src/bullion/types";
import { useFlight } from "@/src/bullion/use-flight";
import { colors, radii, spacing } from "@/src/theme";
import { shortDate } from "@/src/utils/format";

export default function TripDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const trips = useTrips();
  const txns = useTxns();
  const parties = useApi<Party[]>("/api/parties");

  const trip = trips.data.find((t) => t.id === id);
  const airline = findAirline(trip?.airline_code);
  const partyMap = useMemo(() => {
    const m: Record<string, Party> = {};
    (parties.data || []).forEach((p) => (m[p.id] = p));
    return m;
  }, [parties.data]);
  const carrier = trip?.carrier_party_id ? partyMap[trip.carrier_party_id] : undefined;

  // Trip's linked txns for capacity readout
  const linkedTxns = useMemo(
    () => (trip ? txns.data.filter((t) => t.trip_id === trip.id) : []),
    [trip, txns.data],
  );
  const capacity = trip ? tripCapacityKg(trip) : 0;
  const used = trip ? usedWeightKgFor(trip.id, txns.data) : 0;
  const free = Math.max(0, capacity - used);

  // Live flight snapshot (uses AviationStack when a flight number is set;
  // otherwise falls back to a deterministic mock).
  const flightHint = {
    fromIata: trip
      ? defaultAirports(trip.route).from.code
      : "DEL",
    toIata: trip
      ? defaultAirports(trip.route).to.code
      : "BKK",
    date: trip?.date,
  };
  const flight = useFlight(trip?.flight_number || null, flightHint, { pollMs: 60 * 1000 });

  // Airport pair for the map — either live from the flight response,
  // or the route's default city pair.
  const routeAirports = useMemo(() => {
    if (!trip) return null;
    const fromCode = flight.data?.departure.airport_iata || defaultAirports(trip.route).from.code;
    const toCode = flight.data?.arrival.airport_iata || defaultAirports(trip.route).to.code;
    return {
      from: findAirport(fromCode) || defaultAirports(trip.route).from,
      to: findAirport(toCode) || defaultAirports(trip.route).to,
    };
  }, [trip, flight.data]);

  if (!trip) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <Header title="Trip" onBack={() => router.back()} />
        <View style={styles.emptyBox}>
          <Ionicons name="airplane-outline" size={40} color={colors.textDim} />
          <Text style={styles.emptyTitle}>Trip not found</Text>
          <Text style={styles.emptySub}>The trip may have been deleted.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <Header
        title="Trip"
        onBack={() => router.back()}
        onModify={() => router.push(`/bullion/trip/new?editId=${trip.id}` as never)}
      />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        refreshControl={
          <RefreshControl refreshing={flight.loading} onRefresh={flight.refresh} tintColor={colors.lime} />
        }
      >
        {/* Hero */}
        <View style={styles.hero}>
          <AirlineBadge airline={airline} size="lg" />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <View style={styles.heroTopRow}>
              <View style={styles.routeChip}>
                <Text style={styles.routeChipText}>
                  {trip.route === "IN_TO_TH" ? "IN → BKK" : "BKK → IN"}
                </Text>
              </View>
              {trip.flight_number ? (
                <Text style={styles.flightNo}>{trip.flight_number}</Text>
              ) : null}
            </View>
            <Text style={styles.carrierName}>
              {carrier?.name || trip.carrier_name || "Carrier TBD"}
            </Text>
            <Text style={styles.metaLine}>
              {airline?.name ? `${airline.name} · ` : ""}{shortDate(trip.date)}
            </Text>
          </View>
        </View>

        {/* Flight status */}
        {trip.flight_number ? (
          <FlightStatusCard snap={flight.data} />
        ) : (
          <View style={styles.warnCard}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textDim} />
            <Text style={styles.warnText}>
              Add a flight number to the trip to see live status. Showing route map only.
            </Text>
          </View>
        )}

        {/* Map */}
        {routeAirports && (
          <FlightMap
            from={routeAirports.from}
            to={routeAirports.to}
            progress={flight.data?.progress ?? 0}
            live={flight.data?.live}
            size="lg"
          />
        )}

        {/* Capacity */}
        <View style={styles.capacityCard}>
          <Text style={styles.capLabel}>Cargo capacity</Text>
          <View style={styles.capRow}>
            <Text style={styles.capVal}>{fmt(free)} <Text style={styles.capUnit}>kg free</Text></Text>
            <Text style={styles.capTotal}>of {fmt(capacity)} kg total</Text>
          </View>
          <View style={styles.capTrack}>
            <View style={[styles.capFill, { width: `${capacity > 0 ? Math.min(100, (used / capacity) * 100) : 0}%` }]} />
          </View>
          <Text style={styles.capMeta}>
            {linkedTxns.length} linked bullion txn{linkedTxns.length === 1 ? "" : "s"}
          </Text>
        </View>

        {trip.notes ? (
          <View style={styles.notesCard}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{trip.notes}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ title, onBack, onModify }: { title: string; onBack: () => void; onModify?: () => void }) {
  return (
    <View style={styles.headBar}>
      <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.headTitle}>{title}</Text>
      {onModify ? (
        <TouchableOpacity onPress={onModify} style={styles.modifyBtn} testID="modify-trip-btn">
          <Ionicons name="create-outline" size={14} color={colors.lime} />
          <Text style={styles.modifyText}>Modify</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ width: 32 }} />
      )}
    </View>
  );
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
    borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: { padding: 6 },
  headTitle: { flex: 1, color: colors.text, fontSize: 16, fontWeight: "800", textAlign: "center" },
  modifyBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill,
    borderColor: colors.lime, borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.chipBg, marginRight: 4,
  },
  modifyText: { color: colors.lime, fontSize: 12, fontWeight: "800" },

  hero: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surface, borderRadius: radii.lg,
    borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  heroTopRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  routeChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill,
    backgroundColor: colors.limeGlow, borderColor: colors.lime, borderWidth: 1,
  },
  routeChipText: { color: colors.lime, fontWeight: "800", fontSize: 12 },
  flightNo: {
    color: colors.textMuted, fontSize: 11, fontWeight: "800",
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    backgroundColor: colors.chipBg, letterSpacing: 0.5,
  },
  carrierName: { color: colors.text, fontSize: 16, fontWeight: "800", marginTop: 4 },
  metaLine: { color: colors.textDim, fontSize: 12, marginTop: 2 },

  warnCard: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.surface, borderRadius: radii.lg,
    borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  warnText: { color: colors.textDim, fontSize: 12, flex: 1, lineHeight: 17 },

  capacityCard: {
    backgroundColor: colors.surface, borderRadius: radii.lg,
    borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  capLabel: {
    color: colors.textDim, fontSize: 11, textTransform: "uppercase",
    letterSpacing: 0.6, fontWeight: "700",
  },
  capRow: {
    flexDirection: "row", alignItems: "baseline", justifyContent: "space-between",
    marginTop: 6, marginBottom: 8,
  },
  capVal: { color: colors.lime, fontSize: 24, fontWeight: "900" },
  capUnit: { color: colors.textDim, fontSize: 12, fontWeight: "700" },
  capTotal: { color: colors.textDim, fontSize: 12 },
  capTrack: { height: 6, borderRadius: 3, backgroundColor: colors.chipBg, overflow: "hidden" },
  capFill: { height: "100%", backgroundColor: colors.lime },
  capMeta: { color: colors.textDim, fontSize: 11, marginTop: 8 },

  notesCard: {
    backgroundColor: colors.surface, borderRadius: radii.lg,
    borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  notesLabel: {
    color: colors.textDim, fontSize: 11, textTransform: "uppercase",
    letterSpacing: 0.6, marginBottom: 6, fontWeight: "700",
  },
  notesText: { color: colors.text, fontSize: 13, lineHeight: 19 },

  emptyBox: { padding: spacing.xxl, alignItems: "center", gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 8 },
  emptySub: { color: colors.textDim, fontSize: 13, textAlign: "center" },
});
