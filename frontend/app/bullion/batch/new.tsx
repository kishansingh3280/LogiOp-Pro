import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { createBatch } from "@/src/bullion/store";
import { colors, radii, spacing } from "@/src/theme";

export default function NewBatchScreen() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return Alert.alert("Invalid", "Purchase amount must be > 0");
    setBusy(true);
    try {
      await createBatch({
        status: "purchased_in",
        purchase_amount_inr: amt,
        purchase_date: date,
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
        <Text style={styles.headTitle}>New bullion batch</Text>
        <TouchableOpacity onPress={save} disabled={busy} style={styles.saveBtn} testID="save-batch-btn">
          <Text style={styles.saveText}>{busy ? "Saving…" : "Save"}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.heroLbl}>PHASE 1</Text>
            <Text style={styles.heroTitle}>Currency purchase · India</Text>
            <Text style={styles.heroSub}>
              Enter the INR amount used to purchase currency in India. Later you&apos;ll assign this batch
              to a carrier trip and progress through BKK deposit → gold → return → sale.
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Amount (INR)</Text>
            <TextInput
              style={styles.amountInput}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={colors.textDim}
              autoFocus
              testID="batch-amount"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Purchase date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="2026-08-07"
              placeholderTextColor={colors.textDim}
              autoCapitalize="none"
              testID="batch-date"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, { minHeight: 70, textAlignVertical: "top" }]}
              multiline
              value={notes}
              onChangeText={setNotes}
              placeholder="Where bought, exchange rate reference, etc."
              placeholderTextColor={colors.textDim}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  hero: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.lg,
  },
  heroLbl: { color: colors.lime, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  heroTitle: { color: colors.text, fontSize: 20, fontWeight: "800", marginTop: 4 },
  heroSub: { color: colors.textMuted, fontSize: 13, marginTop: 8, lineHeight: 18 },
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
  amountInput: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 34,
    fontWeight: "800",
  },
});
