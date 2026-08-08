/**
 * SplitSheet — bottom-sheet UI to carve off a portion of a parent bullion
 * transaction and assign it to a carrier trip. On confirm calls
 * POST /api/bullion/transactions/{id}/split.
 *
 * Business rules enforced in the UI (also re-checked server-side):
 *   - split_weight_kg must be > 0 and ≤ parent.remaining_weight_kg
 *   - only parent transactions (parent_id == null) can be split
 *   - a trip is required for the split (unassigned splits are rejected here
 *     but backend still supports them — kept strict in UI for clarity)
 */
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_BASE } from "@/src/api/client";
import { getAuthTokenSync } from "@/src/auth/context";
import type { BullionTxn, CarrierTrip } from "@/src/bullion/types";
import { colors, radii, spacing } from "@/src/theme";
import { shortDate } from "@/src/utils/format";

export function SplitSheet({
  txn,
  trips,
  visible,
  onClose,
  onDone,
}: {
  txn: BullionTxn | null;
  trips: CarrierTrip[];
  visible: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [weight, setWeight] = useState<string>("");
  const [tripId, setTripId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const unit = (txn?.gold_unit as string | undefined) || "kg";
  const original = txn?.weight_kg || 0;
  const remaining = typeof txn?.remaining_weight_kg === "number" ? txn.remaining_weight_kg : original;

  useEffect(() => {
    if (!visible) {
      setWeight("");
      setTripId(null);
      setErr(null);
      setBusy(false);
    }
  }, [visible]);

  const parsed = useMemo(() => {
    const n = parseFloat(weight);
    if (isNaN(n)) return null;
    return n;
  }, [weight]);

  const canSubmit =
    txn != null &&
    parsed != null &&
    parsed > 0 &&
    parsed <= remaining + 1e-9 &&
    tripId != null &&
    !busy;

  const submit = async () => {
    if (!txn || !canSubmit || parsed == null) return;
    setBusy(true);
    setErr(null);
    try {
      const token = getAuthTokenSync();
      const res = await fetch(`${API_BASE}/api/bullion/transactions/${txn.id}/split`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ split_weight_kg: parsed, trip_id: tripId }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(j?.detail || `HTTP ${res.status}`);
      }
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const eligibleTrips = useMemo(() => {
    return trips
      .filter((t) => t.id !== txn?.trip_id)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [trips, txn]);

  if (!txn) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.sheetKb}
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Split {txn.txn_no}</Text>
              <Text style={styles.subtitle}>
                Parent: {original} {unit} · Remaining: {remaining} {unit}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Weight to assign ({unit})</Text>
            <View style={styles.weightRow}>
              <TextInput
                value={weight}
                onChangeText={(v) => {
                  setWeight(v.replace(/[^\d.]/g, ""));
                  if (err) setErr(null);
                }}
                keyboardType="decimal-pad"
                placeholder={`e.g. ${(remaining / 2).toFixed(1)}`}
                placeholderTextColor={colors.textDim}
                style={styles.weightInput}
                testID="split-weight"
              />
              <Pressable
                onPress={() => setWeight(String(remaining))}
                style={styles.maxBtn}
                hitSlop={6}
                testID="split-max"
              >
                <Text style={styles.maxBtnText}>MAX</Text>
              </Pressable>
            </View>

            <View style={styles.quickRow}>
              {[0.25, 0.5, 0.75].map((frac) => {
                const v = +(remaining * frac).toFixed(2);
                if (v <= 0) return null;
                return (
                  <Pressable
                    key={frac}
                    onPress={() => setWeight(String(v))}
                    style={styles.quickChip}
                  >
                    <Text style={styles.quickChipText}>
                      {Math.round(frac * 100)}% · {v}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label, { marginTop: spacing.lg }]}>Assign to trip</Text>
            {eligibleTrips.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="airplane-outline" size={22} color={colors.textDim} />
                <Text style={styles.emptyText}>No other trips available.</Text>
              </View>
            ) : (
              <View style={styles.tripList}>
                {eligibleTrips.map((t) => {
                  const active = tripId === t.id;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => setTripId(t.id)}
                      style={[styles.tripRow, active && styles.tripRowActive]}
                      testID={`split-trip-${t.id}`}
                    >
                      <View style={styles.tripIcon}>
                        <Ionicons name="airplane" size={14} color={colors.lime} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tripName}>
                          {t.carrier_name || "Carrier"} · {t.route === "IN_TO_TH" ? "IN → BKK" : "BKK → IN"}
                        </Text>
                        <Text style={styles.tripMeta}>
                          {shortDate(t.date)}
                          {t.airline_code ? ` · ${t.airline_code}` : ""}
                          {t.flight_number ? ` ${t.flight_number}` : ""}
                        </Text>
                      </View>
                      {active ? (
                        <Ionicons name="checkmark-circle" size={20} color={colors.lime} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {err ? (
              <View style={styles.errorBar}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={styles.errorText}>{err}</Text>
              </View>
            ) : null}

            {parsed != null && parsed > remaining ? (
              <Text style={styles.warn}>
                Cannot exceed remaining {remaining} {unit}.
              </Text>
            ) : null}

            <Pressable
              onPress={submit}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.submit,
                !canSubmit && { opacity: 0.5 },
                pressed && { opacity: 0.85 },
              ]}
              testID="split-submit"
            >
              {busy ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.submitText}>
                  Split {parsed || 0} {unit} → trip
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  sheetKb: { position: "absolute", left: 0, right: 0, bottom: 0 },
  sheet: {
    backgroundColor: "#0a0a0a",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: "88%",
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { color: colors.text, fontSize: 17, fontWeight: "800" },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  body: { padding: spacing.lg, gap: 8 },
  label: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  weightRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  weightInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 17,
    fontWeight: "700",
  },
  maxBtn: {
    backgroundColor: colors.limeGlow,
    borderColor: colors.lime,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  maxBtnText: { color: colors.lime, fontWeight: "800", fontSize: 12 },
  quickRow: { flexDirection: "row", gap: 6, marginTop: 6 },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  quickChipText: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },
  tripList: { gap: 6, marginTop: 6 },
  tripRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.surface,
  },
  tripRowActive: { borderColor: colors.lime, backgroundColor: "rgba(0, 209, 255, 0.06)" },
  tripIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.limeGlow,
    alignItems: "center",
    justifyContent: "center",
  },
  tripName: { color: colors.text, fontSize: 13, fontWeight: "700" },
  tripMeta: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  emptyBox: {
    alignItems: "center",
    padding: spacing.lg,
    gap: 6,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    borderStyle: "dashed",
  },
  emptyText: { color: colors.textMuted, fontSize: 12 },
  errorBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: radii.md,
    backgroundColor: "rgba(248,113,113,0.10)",
    borderColor: "rgba(248,113,113,0.30)",
    borderWidth: StyleSheet.hairlineWidth,
  },
  errorText: { color: colors.danger, fontSize: 12, flex: 1 },
  warn: { color: colors.warn, fontSize: 11, marginTop: 4 },
  submit: {
    marginTop: spacing.lg,
    backgroundColor: colors.lime,
    paddingVertical: 14,
    borderRadius: radii.pill,
    alignItems: "center",
  },
  submitText: { color: "#000", fontWeight: "800", fontSize: 15 },
});
