/**
 * /trips/new — Full-page Add Bullion Trip form.
 * Replaces the previous bottom-sheet Modal in bullion.tsx (Fix 5).
 */
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiGet, apiPost } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth-context";
import { colors, radii, spacing } from "@/src/lib/theme";
import { GlassCard } from "@/src/lib/ui";

type Party = { id: string; name: string; role?: string };

export default function NewTripScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [carriers, setCarriers] = useState<Party[]>([]);
  const [carrierId, setCarrierId] = useState<string | null>(null);
  const [flightNumber, setFlightNumber] = useState("");
  const [airline, setAirline] = useState("");
  const [departureDate, setDepartureDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [direction, setDirection] = useState<"IN_TO_TH" | "TH_TO_IN">("IN_TO_TH");
  const [capacityKg, setCapacityKg] = useState("");
  const [gold, setGold] = useState("");
  const [currency, setCurrency] = useState("");
  const [carry, setCarry] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiGet<Party[]>("/api/parties")
      .then((all) => {
        const only = (Array.isArray(all) ? all : []).filter(
          (p) => (p.role || "").toLowerCase() === "carrier",
        );
        setCarriers(only.length ? only : (Array.isArray(all) ? all : []));
      })
      .catch(() => setCarriers([]));
  }, [token]);

  const canSubmit = useMemo(
    () => !!carrierId && !!departureDate,
    [carrierId, departureDate],
  );

  const handleSave = async () => {
    if (!canSubmit) return;
    const origin = direction === "IN_TO_TH" ? "India" : "Thailand";
    const destination = direction === "IN_TO_TH" ? "Thailand" : "India";
    setSaving(true);
    try {
      await apiPost("/api/trips", {
        carrier_id: carrierId!,
        flight_number: flightNumber.trim() || undefined,
        airline: airline.trim() || undefined,
        departure_date: departureDate,
        origin,
        destination,
        capacity_kg: parseFloat(capacityKg) || undefined,
        gold_baht: parseFloat(gold) || undefined,
        currency_amount: parseFloat(currency) || undefined,
        carry_charge: parseFloat(carry) || undefined,
        status: "scheduled",
      });
      router.back();
    } catch (e) {
      Alert.alert("Add trip failed", (e as Error).message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Schedule a Trip</Text>
          <Text style={styles.subtitle}>New carrier bullion flight</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <GlassCard style={styles.card}>
          {/* Carrier */}
          <Text style={styles.label}>Carrier</Text>
          {carriers.length === 0 ? (
            <Text style={styles.dim}>
              No carrier parties yet. Add one from the desktop console first.
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {carriers.map((c) => {
                const active = carrierId === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setCarrierId(c.id)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? colors.brand : colors.textMuted },
                      ]}
                      numberOfLines={1}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Direction */}
          <Text style={styles.label}>Direction</Text>
          <View style={styles.segment}>
            {(["IN_TO_TH", "TH_TO_IN"] as const).map((d) => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.segmentBtn,
                  direction === d && {
                    backgroundColor: colors.brandSoft,
                    borderColor: colors.brand,
                  },
                ]}
                onPress={() => setDirection(d)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: direction === d ? colors.brand : colors.textDim },
                  ]}
                >
                  {d === "IN_TO_TH" ? "India → Thailand" : "Thailand → India"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Flight + Airline row */}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Flight number</Text>
              <TextInput
                style={styles.input}
                value={flightNumber}
                onChangeText={setFlightNumber}
                placeholder="TG 315"
                placeholderTextColor={colors.textDim}
                autoCapitalize="characters"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Airline</Text>
              <TextInput
                style={styles.input}
                value={airline}
                onChangeText={setAirline}
                placeholder="Thai Airways"
                placeholderTextColor={colors.textDim}
              />
            </View>
          </View>

          {/* Departure date */}
          <Text style={styles.label}>Departure date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={departureDate}
            onChangeText={setDepartureDate}
            placeholder="2026-08-20"
            placeholderTextColor={colors.textDim}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Amounts row */}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Capacity (kg)</Text>
              <TextInput
                style={styles.input}
                value={capacityKg}
                onChangeText={setCapacityKg}
                keyboardType="decimal-pad"
                placeholder="30"
                placeholderTextColor={colors.textDim}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Saman (baht)</Text>
              <TextInput
                style={styles.input}
                value={gold}
                onChangeText={setGold}
                keyboardType="decimal-pad"
                placeholder="10"
                placeholderTextColor={colors.textDim}
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Currency amount</Text>
              <TextInput
                style={styles.input}
                value={currency}
                onChangeText={setCurrency}
                keyboardType="decimal-pad"
                placeholder="50000"
                placeholderTextColor={colors.textDim}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Carry charge (INR)</Text>
              <TextInput
                style={styles.input}
                value={carry}
                onChangeText={setCarry}
                keyboardType="decimal-pad"
                placeholder="8000"
                placeholderTextColor={colors.textDim}
              />
            </View>
          </View>
        </GlassCard>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionGhost]}
            onPress={() => router.back()}
            disabled={saving}
            activeOpacity={0.75}
          >
            <Text style={styles.actionGhostText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.actionPrimary,
              (!canSubmit || saving) && { opacity: 0.5 },
            ]}
            onPress={handleSave}
            disabled={!canSubmit || saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={colors.bgSolid} size="small" />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color={colors.bgSolid} />
                <Text style={styles.actionPrimaryText}>Save Trip</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  subtitle: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  scroll: { padding: spacing.lg, paddingBottom: 120 },
  card: { padding: spacing.md, gap: 4 },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  row: { flexDirection: "row", gap: spacing.md },
  chipRow: { gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: "center",
  },
  chipActive: { backgroundColor: colors.brandSoft, borderColor: colors.brand },
  chipText: { color: colors.textDim, fontSize: 12, fontWeight: "600" },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
  },
  segment: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: "transparent",
  },
  segmentText: { fontSize: 12, fontWeight: "700" },
  dim: { color: colors.textDim, fontSize: 12 },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  actionGhost: {
    backgroundColor: "transparent",
    borderColor: colors.cardBorder,
  },
  actionGhostText: { color: colors.textDim, fontSize: 14, fontWeight: "700" },
  actionPrimary: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  actionPrimaryText: {
    color: colors.bgSolid,
    fontSize: 14,
    fontWeight: "800",
  },
});
