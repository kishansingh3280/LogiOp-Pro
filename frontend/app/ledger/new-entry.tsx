/**
 * /ledger/new-entry — Full-page Add Ledger Entry form.
 * Replaces the previous bottom-sheet Modal in ledger.tsx (Fix 5).
 * Accepts optional `party_id` query param to preselect a party.
 */
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
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

type Party = { id: string; name: string };

export default function NewLedgerEntryScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const params = useLocalSearchParams<{ party_id?: string }>();

  const [parties, setParties] = useState<Party[]>([]);
  const [partyId, setPartyId] = useState<string | null>(params.party_id || null);
  const [type, setType] = useState<"debit" | "credit">("credit");
  const [amountStr, setAmountStr] = useState("");
  const [currency, setCurrency] = useState<"INR" | "THB">("INR");
  const [description, setDescription] = useState("");
  const [dateStr, setDateStr] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiGet<Party[]>("/api/parties")
      .then((p) => setParties(Array.isArray(p) ? p : []))
      .catch(() => setParties([]));
  }, [token]);

  const canSubmit = useMemo(
    () => !!partyId && parseFloat(amountStr) > 0 && description.trim().length > 0,
    [partyId, amountStr, description],
  );

  const handleSave = async () => {
    if (!canSubmit || !partyId) return;
    const amt = parseFloat(amountStr);
    setSaving(true);
    try {
      await apiPost("/api/ledger/entries", {
        party_id: partyId,
        date: dateStr,
        description: description.trim(),
        debit: type === "debit" ? amt : 0,
        credit: type === "credit" ? amt : 0,
        currency,
      });
      router.back();
    } catch (e) {
      Alert.alert("Add entry failed", (e as Error).message || "Please try again.");
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
          <Text style={styles.title}>Add Ledger Entry</Text>
          <Text style={styles.subtitle}>New debit or credit entry</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <GlassCard style={styles.card}>
          {/* Party */}
          <Text style={styles.label}>Party</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {parties.length === 0 ? (
              <Text style={styles.dim}>Loading parties…</Text>
            ) : (
              parties.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.chip, partyId === p.id && styles.chipActive]}
                  onPress={() => setPartyId(p.id)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[styles.chipText, partyId === p.id && styles.chipTextActive]}
                    numberOfLines={1}
                  >
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {/* Type */}
          <Text style={styles.label}>Type</Text>
          <View style={styles.segment}>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                type === "credit" && {
                  backgroundColor: colors.brandSoft,
                  borderColor: colors.brand,
                },
              ]}
              onPress={() => setType("credit")}
              activeOpacity={0.75}
            >
              <Ionicons
                name="arrow-down"
                size={14}
                color={type === "credit" ? colors.credit : colors.textDim}
              />
              <Text
                style={[
                  styles.segmentText,
                  { color: type === "credit" ? colors.credit : colors.textDim },
                ]}
              >
                Credit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                type === "debit" && {
                  backgroundColor: "rgba(255,68,68,0.10)",
                  borderColor: colors.danger,
                },
              ]}
              onPress={() => setType("debit")}
              activeOpacity={0.75}
            >
              <Ionicons
                name="arrow-up"
                size={14}
                color={type === "debit" ? colors.debit : colors.textDim}
              />
              <Text
                style={[
                  styles.segmentText,
                  { color: type === "debit" ? colors.debit : colors.textDim },
                ]}
              >
                Debit
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount + Currency */}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Amount</Text>
              <TextInput
                style={styles.input}
                value={amountStr}
                onChangeText={setAmountStr}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textDim}
              />
            </View>
            <View style={{ width: 130 }}>
              <Text style={styles.label}>Currency</Text>
              <View style={styles.segment}>
                {(["INR", "THB"] as const).map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.segmentBtn,
                      currency === c && {
                        backgroundColor: colors.brandSoft,
                        borderColor: colors.brand,
                      },
                    ]}
                    onPress={() => setCurrency(c)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { color: currency === c ? colors.brand : colors.textDim },
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Payment received for AURA-INV-001"
            placeholderTextColor={colors.textDim}
            multiline
          />

          {/* Date */}
          <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={dateStr}
            onChangeText={setDateStr}
            placeholder="2026-08-12"
            placeholderTextColor={colors.textDim}
            autoCapitalize="none"
            autoCorrect={false}
          />
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
                <Text style={styles.actionPrimaryText}>Save Entry</Text>
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
  scroll: { padding: spacing.lg, paddingBottom: 100 },
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
  chipTextActive: { color: colors.brand },
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
