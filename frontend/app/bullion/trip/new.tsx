import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
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
import { createTrip } from "@/src/bullion/store";
import type { BullionRoute } from "@/src/bullion/types";
import { colors, radii, spacing } from "@/src/theme";

export default function NewTripScreen() {
  const router = useRouter();
  const parties = useApi<Party[]>("/api/parties");

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [route, setRoute] = useState<BullionRoute>("IN_TO_TH");
  const [carrierId, setCarrierId] = useState<string | null>(null);
  const [carrierName, setCarrierName] = useState("");
  const [availableSlots, setAvailableSlots] = useState("5");
  const [notes, setNotes] = useState("");
  const [pickOpen, setPickOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const carriers = useMemo(
    () => (parties.data || []).filter((p) => p.role === "carrier" || p.role === "vendor"),
    [parties.data],
  );
  const currentCarrier = (parties.data || []).find((p) => p.id === carrierId);

  const save = async () => {
    const slots = parseInt(availableSlots, 10);
    if (!slots || slots <= 0) return Alert.alert("Invalid", "Available slots must be > 0");
    setBusy(true);
    try {
      await createTrip({
        date,
        route,
        carrier_party_id: carrierId,
        carrier_name: currentCarrier?.name || carrierName || undefined,
        available_slots: slots,
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
          <Field label="Trip date (YYYY-MM-DD)">
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="2026-08-15"
              placeholderTextColor={colors.textDim}
              autoCapitalize="none"
              testID="trip-date"
            />
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

          <Field label="Available slots (capacity for bags/batches)">
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={availableSlots}
              onChangeText={setAvailableSlots}
              testID="trip-slots"
            />
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
  pickName: { color: colors.text, fontSize: 15, fontWeight: "600" },
  pickMeta: { color: colors.textDim, fontSize: 12, marginTop: 2, textTransform: "capitalize" },
  sheetCancel: { marginTop: spacing.md, paddingVertical: 12, alignItems: "center", borderRadius: radii.pill, backgroundColor: colors.chipBg },
  sheetCancelText: { color: colors.text, fontWeight: "700" },
});
