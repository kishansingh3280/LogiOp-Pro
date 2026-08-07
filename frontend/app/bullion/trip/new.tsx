import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useApi } from "@/src/api/hooks";
import type { Party } from "@/src/api/types";
import { AIRLINES, findAirline } from "@/src/bullion/airlines";
import { AirlineBadge } from "@/src/bullion/AirlineBadge";
import { createTrip } from "@/src/bullion/store";
import type { BullionRoute } from "@/src/bullion/types";
import { colors, radii, spacing } from "@/src/theme";

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISODate(s: string): Date {
  // Interpret YYYY-MM-DD as local time to avoid TZ drift.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  if (!m) return new Date();
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function formatLongDate(s: string): string {
  const d = parseISODate(s);
  const weekday = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
  return `${weekday}, ${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

export default function NewTripScreen() {
  const router = useRouter();
  const parties = useApi<Party[]>("/api/parties");

  const [date, setDate] = useState(() => toISODate(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [route, setRoute] = useState<BullionRoute>("IN_TO_TH");
  const [carrierId, setCarrierId] = useState<string | null>(null);
  const [carrierName, setCarrierName] = useState("");
  const [airlineCode, setAirlineCode] = useState<string | null>(null);
  const [flightNumber, setFlightNumber] = useState("");
  const [availableWeight, setAvailableWeight] = useState("20");
  const [notes, setNotes] = useState("");
  const [pickOpen, setPickOpen] = useState(false);
  const [pickAirline, setPickAirline] = useState(false);
  const [busy, setBusy] = useState(false);

  const carriers = useMemo(
    () => (parties.data || []).filter((p) => p.role === "carrier" || p.role === "vendor"),
    [parties.data],
  );
  const currentCarrier = (parties.data || []).find((p) => p.id === carrierId);
  const currentAirline = useMemo(() => findAirline(airlineCode), [airlineCode]);

  const save = async () => {
    const weight = parseFloat(availableWeight);
    if (!Number.isFinite(weight) || weight < 0) {
      return Alert.alert("Invalid", "Available weight must be 0 or more (kg)");
    }
    setBusy(true);
    try {
      await createTrip({
        date,
        route,
        carrier_party_id: carrierId,
        carrier_name: currentCarrier?.name || carrierName || undefined,
        airline_code: airlineCode,
        flight_number: flightNumber.trim() || undefined,
        available_weight_kg: weight,
        notes,
      });
      router.back();
    } catch (e) {
      Alert.alert("Failed", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.headBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headTitle}>New carrier trip</Text>
        <TouchableOpacity onPress={save} disabled={busy} style={styles.saveBtn} testID="save-trip-btn">
          <Text style={styles.saveText}>{busy ? "Saving…" : "Save"}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Field label="Trip date">
            {Platform.OS === "web" ? (
              // On web use a native HTML5 date input so the browser calendar shows.
              React.createElement("input", {
                type: "date",
                value: date,
                onChange: (e: { target: { value: string } }) => setDate(e.target.value),
                "data-testid": "trip-date",
                style: {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.md,
                  padding: "14px",
                  fontSize: 15,
                  fontFamily: "inherit",
                  colorScheme: "dark",
                  width: "100%",
                  boxSizing: "border-box",
                  outline: "none",
                },
              })
            ) : (
              <TouchableOpacity
                style={styles.selectBtn}
                onPress={() => setShowDatePicker(true)}
                testID="trip-date"
              >
                <Text style={styles.selectText}>{formatLongDate(date)}</Text>
                <Ionicons name="calendar-outline" size={18} color={colors.textDim} />
              </TouchableOpacity>
            )}
            {showDatePicker && Platform.OS !== "web" && (
              <DateTimePicker
                value={parseISODate(date)}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                themeVariant="dark"
                onChange={(event: DateTimePickerEvent, selected?: Date) => {
                  // Android auto-dismisses; iOS inline stays until user taps outside.
                  if (Platform.OS === "android") setShowDatePicker(false);
                  if (event.type === "dismissed") return;
                  if (selected) setDate(toISODate(selected));
                }}
              />
            )}
            {showDatePicker && Platform.OS === "ios" && (
              <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.doneBtn}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            )}
          </Field>

          <Field label="Route">
            <View style={styles.segRow}>
              <TouchableOpacity
                onPress={() => setRoute("IN_TO_TH")}
                style={[styles.seg, route === "IN_TO_TH" && styles.segActive]}
                testID="trip-route-IN_TO_TH"
              >
                <Text style={[styles.segText, route === "IN_TO_TH" && styles.segTextActive]}>India → BKK</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setRoute("TH_TO_IN")}
                style={[styles.seg, route === "TH_TO_IN" && styles.segActive]}
                testID="trip-route-TH_TO_IN"
              >
                <Text style={[styles.segText, route === "TH_TO_IN" && styles.segTextActive]}>BKK → India</Text>
              </TouchableOpacity>
            </View>
          </Field>

          <Field label="Carrier">
            <TouchableOpacity style={styles.selectBtn} onPress={() => setPickOpen(true)} testID="trip-carrier-pick">
              <Text style={[styles.selectText, !currentCarrier && styles.selectPh]}>
                {currentCarrier?.name || "Choose from parties"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textDim} />
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              value={carrierName}
              onChangeText={(t) => {
                setCarrierName(t);
                setCarrierId(null);
              }}
              placeholder="…or type carrier name"
              placeholderTextColor={colors.textDim}
              testID="trip-carrier-name"
            />
          </Field>

          <Field label="Airline">
            <TouchableOpacity
              style={styles.selectBtn}
              onPress={() => setPickAirline(true)}
              testID="trip-airline-pick"
            >
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 10 }}>
                <AirlineBadge airline={currentAirline} size="sm" />
                <Text style={[styles.selectText, !currentAirline && styles.selectPh]}>
                  {currentAirline ? currentAirline.name : "Choose airline"}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={16} color={colors.textDim} />
            </TouchableOpacity>
          </Field>

          <Field label="Flight number (optional)">
            <TextInput
              style={styles.input}
              value={flightNumber}
              onChangeText={(t) => setFlightNumber(t.toUpperCase())}
              placeholder="e.g. TG-317"
              placeholderTextColor={colors.textDim}
              autoCapitalize="characters"
              autoCorrect={false}
              testID="trip-flight-no"
            />
          </Field>

          <Field label="Available weight (kg)">
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={availableWeight}
              onChangeText={setAvailableWeight}
              placeholder="e.g. 20"
              placeholderTextColor={colors.textDim}
              testID="trip-weight-kg"
            />
            <Text style={styles.helper}>
              Total capacity the carrier can carry, in kg. Works independently — this
              trip can hold currency/gold, shipment bags, or both. Set to 0 if none.
            </Text>
          </Field>

          <Field label="Notes (optional)">
            <TextInput
              style={[styles.input, { minHeight: 70, textAlignVertical: "top" }]}
              multiline
              value={notes}
              onChangeText={setNotes}
              placeholder="Flight number, contact, timing…"
              placeholderTextColor={colors.textDim}
              testID="trip-notes"
            />
          </Field>
        </ScrollView>
      </KeyboardAvoidingView>

      {pickOpen && (
        <Pressable style={styles.backdrop} onPress={() => setPickOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Choose carrier</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {(carriers.length ? carriers : parties.data || []).map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.pickRow}
                  onPress={() => {
                    setCarrierId(p.id);
                    setCarrierName("");
                    setPickOpen(false);
                  }}
                >
                  <Text style={styles.pickName}>{p.name}</Text>
                  <Text style={styles.pickMeta}>{p.role} · {p.country}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setPickOpen(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      )}

      {pickAirline && (
        <Pressable style={styles.backdrop} onPress={() => setPickAirline(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Choose airline</Text>
            <ScrollView style={{ maxHeight: 440 }}>
              <TouchableOpacity
                style={styles.airlineRow}
                onPress={() => { setAirlineCode(null); setPickAirline(false); }}
              >
                <AirlineBadge size="sm" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickName}>No airline / TBD</Text>
                  <Text style={styles.pickMeta}>Clear selection</Text>
                </View>
              </TouchableOpacity>
              {AIRLINES.map((a) => (
                <TouchableOpacity
                  key={a.code}
                  style={styles.airlineRow}
                  onPress={() => { setAirlineCode(a.code); setPickAirline(false); }}
                  testID={`pick-airline-${a.code}`}
                >
                  <AirlineBadge airline={a} size="sm" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickName}>{a.name}</Text>
                    <Text style={styles.pickMeta}>{a.code}</Text>
                  </View>
                  {airlineCode === a.code ? (
                    <Ionicons name="checkmark-circle" size={18} color={colors.lime} />
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setPickAirline(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: { padding: 8 },
  headTitle: { flex: 1, color: colors.text, fontSize: 16, fontWeight: "800" },
  saveBtn: { backgroundColor: colors.lime, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill },
  saveText: { color: colors.bg, fontWeight: "800", fontSize: 13 },
  content: { padding: spacing.lg },
  field: { marginBottom: spacing.md },
  label: { color: colors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 },
  helper: { color: colors.textDim, fontSize: 12, marginTop: 6, lineHeight: 16 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  segRow: { flexDirection: "row", gap: 8 },
  seg: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.chipBg,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  segActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  segText: { color: colors.textMuted, fontSize: 13, fontWeight: "700" },
  segTextActive: { color: colors.bg },
  selectBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectText: { color: colors.text, fontSize: 15 },
  selectPh: { color: colors.textDim },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.lg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing.md },
  sheetTitle: { color: colors.text, fontSize: 16, fontWeight: "800", marginBottom: spacing.md },
  pickRow: {
    paddingVertical: 12,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  airlineRow: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pickName: { color: colors.text, fontSize: 15, fontWeight: "600" },
  pickMeta: { color: colors.textDim, fontSize: 12, marginTop: 2, textTransform: "capitalize" },
  sheetCancel: { marginTop: spacing.md, paddingVertical: 12, alignItems: "center", borderRadius: radii.pill, backgroundColor: colors.chipBg },
  sheetCancelText: { color: colors.text, fontWeight: "700" },
  doneBtn: {
    marginTop: 8,
    alignSelf: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.chipBg,
  },
  doneBtnText: { color: colors.lime, fontWeight: "700", fontSize: 13 },
});
