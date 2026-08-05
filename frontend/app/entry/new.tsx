import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
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

import { apiPost } from "@/src/api/client";
import { useApi } from "@/src/api/hooks";
import type { Currency, LedgerEntry, Party } from "@/src/api/types";
import { colors, radii, spacing } from "@/src/theme";
import { fmtCurrency } from "@/src/utils/format";

type Kind = "got" | "gave";

/**
 * Khatabook-style entry creator.
 * URL params:
 *   party_id (required)
 *   kind = "got" (credit — money received; balance decreases) | "gave" (debit — money given; balance increases)
 */
export default function NewLedgerEntry() {
  const router = useRouter();
  const params = useLocalSearchParams<{ party_id?: string; kind?: Kind }>();
  const partyId = params.party_id;

  const party = useApi<Party>(partyId ? `/api/parties/${partyId}` : null);

  const [kind, setKind] = useState<Kind>(params.kind || "gave");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [currency, setCurrency] = useState<Currency>((party.data?.default_currency as Currency) || "INR");
  const [busy, setBusy] = useState(false);

  useMemo(() => {
    if (party.data?.default_currency && currency !== party.data.default_currency) {
      setCurrency(party.data.default_currency);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [party.data?.default_currency]);

  const amountNum = Number(amount) || 0;

  const save = async () => {
    if (!partyId) return Alert.alert("Missing", "Party is required");
    if (amountNum <= 0) return Alert.alert("Invalid", "Amount must be greater than 0");
    setBusy(true);
    try {
      const payload = {
        party_id: partyId,
        date,
        description: note.trim() || (kind === "gave" ? "You gave" : "You got"),
        debit: kind === "gave" ? amountNum : 0,
        credit: kind === "got" ? amountNum : 0,
        currency,
        ref_type: "manual",
      };
      const res = await apiPost<LedgerEntry>("/api/ledger/entries", payload);
      if ((res as { queued?: boolean }).queued) {
        Alert.alert("Queued", "Entry saved locally — will sync when back online.");
      }
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
        <Text style={styles.headTitle}>New entry</Text>
        <TouchableOpacity
          onPress={save}
          disabled={busy}
          style={[styles.saveBtn, kind === "got" ? styles.saveBtnGot : styles.saveBtnGave]}
          testID="save-entry-btn"
        >
          <Text style={styles.saveText}>{busy ? "Saving…" : "Save"}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Party header */}
          {party.data ? (
            <View style={styles.partyRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(party.data.name || "?").slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.partyName}>{party.data.name}</Text>
                <Text style={styles.partyMeta}>
                  {party.data.role} · {party.data.country} · {party.data.default_currency}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Kind toggle */}
          <View style={styles.kindToggle}>
            <TouchableOpacity
              style={[styles.kindBtn, kind === "gave" && { backgroundColor: colors.danger, borderColor: colors.danger }]}
              onPress={() => setKind("gave")}
              testID="kind-gave"
            >
              <Ionicons
                name="arrow-up-outline"
                size={16}
                color={kind === "gave" ? colors.text : colors.danger}
              />
              <Text style={[styles.kindText, kind === "gave" && { color: colors.text }]}>You gave</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.kindBtn, kind === "got" && { backgroundColor: colors.ok, borderColor: colors.ok }]}
              onPress={() => setKind("got")}
              testID="kind-got"
            >
              <Ionicons
                name="arrow-down-outline"
                size={16}
                color={kind === "got" ? colors.bg : colors.ok}
              />
              <Text style={[styles.kindText, kind === "got" && { color: colors.bg }]}>You got</Text>
            </TouchableOpacity>
          </View>

          {/* Amount */}
          <View style={styles.amountBox}>
            <Text style={styles.amountLbl}>Amount ({currency})</Text>
            <TextInput
              style={styles.amountInput}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={colors.textDim}
              testID="entry-amount"
              autoFocus
            />
            <View style={styles.currencyRow}>
              {(["INR", "THB"] as Currency[]).map((c) => {
                const active = currency === c;
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCurrency(c)}
                    style={[styles.currBtn, active && styles.currBtnActive]}
                    testID={`entry-curr-${c}`}
                  >
                    <Text style={[styles.currBtnText, active && styles.currBtnTextActive]}>{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Note */}
          <View style={styles.field}>
            <Text style={styles.label}>Note (optional)</Text>
            <TextInput
              style={[styles.input, { minHeight: 70, textAlignVertical: "top" }]}
              placeholder="e.g. Freight for CN-1005, cash advance…"
              placeholderTextColor={colors.textDim}
              multiline
              value={note}
              onChangeText={setNote}
              testID="entry-note"
            />
          </View>

          {/* Date */}
          <View style={styles.field}>
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textDim}
              value={date}
              onChangeText={setDate}
              autoCapitalize="none"
              testID="entry-date"
            />
          </View>

          {/* Preview */}
          <View
            style={[
              styles.preview,
              { borderColor: kind === "got" ? colors.ok : colors.danger },
            ]}
          >
            <Text style={styles.previewLbl}>{kind === "got" ? "You will get less by" : "You will get more by"}</Text>
            <Text
              style={[
                styles.previewVal,
                { color: kind === "got" ? colors.ok : colors.danger },
              ]}
            >
              {kind === "got" ? "-" : "+"}
              {fmtCurrency(amountNum, currency)}
            </Text>
          </View>

          <View style={{ height: 40 }} />
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
  saveBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill },
  saveBtnGot: { backgroundColor: colors.ok },
  saveBtnGave: { backgroundColor: colors.danger },
  saveText: { color: colors.bg, fontWeight: "800", fontSize: 13 },
  content: { padding: spacing.lg },
  partyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.limeGlow,
    alignItems: "center",
    justifyContent: "center",
    borderColor: colors.lime,
    borderWidth: 1,
  },
  avatarText: { color: colors.lime, fontWeight: "800", fontSize: 18 },
  partyName: { color: colors.text, fontSize: 16, fontWeight: "700" },
  partyMeta: { color: colors.textDim, fontSize: 12, marginTop: 2, textTransform: "capitalize" },

  kindToggle: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  kindBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 48,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  kindText: { color: colors.textMuted, fontSize: 14, fontWeight: "800", letterSpacing: 0.3 },

  amountBox: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
  },
  amountLbl: { color: colors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  amountInput: {
    color: colors.text,
    fontSize: 40,
    fontWeight: "800",
    paddingVertical: 8,
    marginTop: 4,
  },
  currencyRow: { flexDirection: "row", gap: spacing.sm, marginTop: 6 },
  currBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.chipBg,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  currBtnActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  currBtnText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  currBtnTextActive: { color: colors.bg },

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
  preview: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.surface,
    marginTop: spacing.md,
    alignItems: "center",
  },
  previewLbl: { color: colors.textDim, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  previewVal: { fontSize: 26, fontWeight: "800", marginTop: 6 },
});
