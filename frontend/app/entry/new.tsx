import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiPost } from "@/src/api/client";
import { useApi } from "@/src/api/hooks";
import type { Currency, LedgerEntry, Party } from "@/src/api/types";
import { toast } from "@/src/components/toast";
import { colors, radii, spacing } from "@/src/theme";
import { fmtCurrency } from "@/src/utils/format";
import { fetchSpot } from "@/src/utils/forex";

type Kind = "got" | "gave";

/**
 * Ledger New Entry — compact JARVIS Aura sheet.
 *
 * Design goals:
 *   • Max 600px width so tablets don't stretch a single entry form
 *     across the full screen.
 *   • Live INR↔THB spot rate chip fetched from frankfurter.dev,
 *     cached in-memory for 15 min.
 *   • Auto-computed cross-currency preview so the operator sees
 *     what the amount converts to in the *other* currency.
 *   • Two save buttons — "Save as INR" / "Save as THB" — that
 *     submit the entry in the chosen currency directly instead of
 *     forcing the operator to hunt for a currency toggle.
 */
export default function NewLedgerEntry() {
  const router = useRouter();
  const params = useLocalSearchParams<{ party_id?: string; kind?: Kind }>();
  const partyId = params.party_id;
  const { width } = useWindowDimensions();

  const party = useApi<Party>(partyId ? `/api/parties/${partyId}` : null);

  const [kind, setKind] = useState<Kind>(params.kind || "gave");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [savingCurrency, setSavingCurrency] = useState<Currency | null>(null);

  // ------ Live FX ---------------------------------------------------------
  // Fetch a spot rate for INR→THB. We invert to also compute THB→INR from
  // the same call. Cached in-memory for 15 minutes inside `forex.ts`.
  const [inrToThb, setInrToThb] = useState<number | null>(null);
  const [fxLoading, setFxLoading] = useState(false);
  const [fxDate, setFxDate] = useState<string | null>(null);
  const loadFx = useCallback(async () => {
    setFxLoading(true);
    try {
      const spot = await fetchSpot({ base: "INR", quote: "THB" });
      setInrToThb(spot.rate);
      setFxDate(spot.date);
    } catch {
      // Silent failure — the chip just shows "rate unavailable" and both
      // save buttons remain functional using the raw amount as-is.
    } finally {
      setFxLoading(false);
    }
  }, []);
  useEffect(() => { void loadFx(); }, [loadFx]);

  const amountNum = Number(amount) || 0;
  const thbFromInr = inrToThb ? amountNum * inrToThb : 0;
  const inrFromThb = inrToThb ? amountNum / inrToThb : 0;

  const save = async (currency: Currency) => {
    if (!partyId) { toast.warn("Party is required"); return; }
    if (amountNum <= 0) { toast.warn("Amount must be greater than 0"); return; }
    setSavingCurrency(currency);
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
        toast.info(`Queued • ${currency} entry will sync when online`);
      } else {
        toast.success(`${currency} entry saved`);
      }
      if (router.canGoBack()) router.back();
      else router.replace("/ledger" as never);
    } catch (e) {
      toast.error(`Save failed: ${(e as Error).message}`);
    } finally {
      setSavingCurrency(null);
    }
  };

  // Two-column layout kicks in once the viewport is comfortably above the
  // form's max width. Below that we fall back to a single-column layout
  // so the amount input never gets clipped.
  const MAX_W = 600;
  const containerWidth = Math.min(width - 24, MAX_W);
  const busy = savingCurrency !== null;

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.headBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="close-entry-btn">
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headTitle}>New entry</Text>
        <View style={{ width: 34 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { alignItems: "center" }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.container, { width: containerWidth }]}>
            {/* Party header */}
            {party.data ? (
              <View style={styles.partyRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(party.data.name || "?").slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.partyName} numberOfLines={1}>{party.data.name}</Text>
                  <Text style={styles.partyMeta} numberOfLines={1}>
                    {party.data.role} · {party.data.country} · default {party.data.default_currency}
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
                <Ionicons name="arrow-up-outline" size={14} color={kind === "gave" ? colors.text : colors.danger} />
                <Text style={[styles.kindText, kind === "gave" && { color: colors.text }]}>You gave</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.kindBtn, kind === "got" && { backgroundColor: colors.ok, borderColor: colors.ok }]}
                onPress={() => setKind("got")}
                testID="kind-got"
              >
                <Ionicons name="arrow-down-outline" size={14} color={kind === "got" ? colors.bg : colors.ok} />
                <Text style={[styles.kindText, kind === "got" && { color: colors.bg }]}>You got</Text>
              </TouchableOpacity>
            </View>

            {/* Amount */}
            <View style={styles.amountBox}>
              <View style={styles.amountHeadRow}>
                <Text style={styles.amountLbl}>Amount</Text>
                <FxChip loading={fxLoading} rate={inrToThb} asOf={fxDate} onRefresh={loadFx} />
              </View>
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
              {/* Cross-currency preview strip */}
              {inrToThb && amountNum > 0 ? (
                <View style={styles.previewStrip} testID="entry-convert-strip">
                  <ConvertPill
                    label="As INR"
                    primary={fmtCurrency(amountNum, "INR")}
                    secondary={`≈ ${fmtCurrency(thbFromInr, "THB")}`}
                  />
                  <View style={styles.previewSep} />
                  <ConvertPill
                    label="As THB"
                    primary={fmtCurrency(amountNum, "THB")}
                    secondary={`≈ ${fmtCurrency(inrFromThb, "INR")}`}
                  />
                </View>
              ) : null}
            </View>

            {/* Note */}
            <View style={styles.field}>
              <Text style={styles.label}>Note (optional)</Text>
              <TextInput
                style={[styles.input, { minHeight: 60, textAlignVertical: "top" }]}
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

            {/* Dual save buttons */}
            <View style={styles.saveRow}>
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  styles.saveInr,
                  (busy || amountNum <= 0) && styles.saveDisabled,
                ]}
                disabled={busy || amountNum <= 0}
                onPress={() => save("INR")}
                testID="save-inr-btn"
              >
                {savingCurrency === "INR" ? (
                  <ActivityIndicator size="small" color={colors.bg} />
                ) : (
                  <>
                    <Text style={styles.saveTextPrimary}>Save as INR</Text>
                    {amountNum > 0 ? (
                      <Text style={styles.saveTextSub}>{fmtCurrency(amountNum, "INR")}</Text>
                    ) : null}
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  styles.saveThb,
                  (busy || amountNum <= 0) && styles.saveDisabled,
                ]}
                disabled={busy || amountNum <= 0}
                onPress={() => save("THB")}
                testID="save-thb-btn"
              >
                {savingCurrency === "THB" ? (
                  <ActivityIndicator size="small" color={colors.bg} />
                ) : (
                  <>
                    <Text style={styles.saveTextPrimary}>Save as THB</Text>
                    {amountNum > 0 ? (
                      <Text style={styles.saveTextSub}>{fmtCurrency(amountNum, "THB")}</Text>
                    ) : null}
                  </>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.footHint}>
              {kind === "got"
                ? "This entry will decrease their balance owed to you."
                : "This entry will increase their balance owed to you."}
            </Text>

            <View style={{ height: 24 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Small internal components
// ---------------------------------------------------------------------------

function FxChip({
  loading,
  rate,
  asOf,
  onRefresh,
}: {
  loading: boolean;
  rate: number | null;
  asOf: string | null;
  onRefresh: () => void;
}) {
  if (loading && !rate) {
    return (
      <View style={styles.fxChip} testID="fx-chip">
        <ActivityIndicator size="small" color={colors.lime} />
        <Text style={styles.fxChipTextDim}>Loading rate…</Text>
      </View>
    );
  }
  if (!rate) {
    return (
      <TouchableOpacity style={styles.fxChip} onPress={onRefresh} testID="fx-chip">
        <Ionicons name="refresh" size={12} color={colors.textDim} />
        <Text style={styles.fxChipTextDim}>Rate unavailable</Text>
      </TouchableOpacity>
    );
  }
  const inrToThb = rate;
  const thbToInr = 1 / rate;
  return (
    <TouchableOpacity style={styles.fxChip} onPress={onRefresh} testID="fx-chip">
      <View style={styles.fxDot} />
      <View>
        <Text style={styles.fxChipTitle}>
          1 INR = {inrToThb.toFixed(3)} THB
        </Text>
        <Text style={styles.fxChipSub}>
          1 THB = ₹{thbToInr.toFixed(2)}{asOf ? ` · ${asOf}` : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function ConvertPill({
  label,
  primary,
  secondary,
}: {
  label: string;
  primary: string;
  secondary: string;
}) {
  return (
    <View style={styles.convertPill}>
      <Text style={styles.convertLbl}>{label}</Text>
      <Text style={styles.convertPrimary} numberOfLines={1} adjustsFontSizeToFit>{primary}</Text>
      <Text style={styles.convertSecondary} numberOfLines={1}>{secondary}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
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
  headTitle: { flex: 1, color: colors.text, fontSize: 16, fontWeight: "800", textAlign: "center", marginRight: 34 },

  scroll: { padding: spacing.lg, paddingBottom: 40 },
  container: { width: "100%", maxWidth: 600, alignSelf: "center" },

  // Party
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
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.limeGlow,
    alignItems: "center", justifyContent: "center",
    borderColor: colors.lime, borderWidth: 1,
  },
  avatarText: { color: colors.lime, fontWeight: "800", fontSize: 16 },
  partyName: { color: colors.text, fontSize: 15, fontWeight: "700" },
  partyMeta: { color: colors.textDim, fontSize: 12, marginTop: 2, textTransform: "capitalize" },

  // Kind toggle
  kindToggle: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  kindBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  kindText: { color: colors.textMuted, fontSize: 13, fontWeight: "800", letterSpacing: 0.3 },

  // Amount
  amountBox: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
  },
  amountHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: 4,
  },
  amountLbl: { color: colors.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: "700" },
  amountInput: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "800",
    paddingVertical: 4,
  },
  fxChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: "rgba(0, 255, 136, 0.06)",
    borderColor: "rgba(0, 255, 136, 0.35)",
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: "60%",
  },
  fxDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.lime,
  },
  fxChipTitle: { color: colors.lime, fontSize: 11, fontWeight: "800" },
  fxChipSub: { color: colors.textDim, fontSize: 9, marginTop: 1 },
  fxChipTextDim: { color: colors.textDim, fontSize: 11, fontWeight: "700" },

  // Preview strip
  previewStrip: {
    marginTop: 10,
    paddingTop: 10,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
  },
  previewSep: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  convertPill: { flex: 1, paddingHorizontal: 6, minWidth: 0 },
  convertLbl: {
    color: colors.textDim, fontSize: 9, textTransform: "uppercase",
    letterSpacing: 0.5, fontWeight: "800", marginBottom: 2,
  },
  convertPrimary: { color: colors.text, fontSize: 15, fontWeight: "800" },
  convertSecondary: { color: colors.textMuted, fontSize: 11, marginTop: 1 },

  // Fields
  field: { marginBottom: spacing.md },
  label: { color: colors.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6, fontWeight: "700" },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },

  // Save
  saveRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  saveBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveInr: { backgroundColor: colors.lime },
  saveThb: { backgroundColor: "#F5C518" },
  saveDisabled: { opacity: 0.4 },
  saveTextPrimary: { color: colors.bg, fontSize: 14, fontWeight: "800", letterSpacing: 0.3 },
  saveTextSub: { color: "rgba(0,0,0,0.65)", fontSize: 11, fontWeight: "700", marginTop: 2 },
  footHint: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: spacing.md,
    textAlign: "center",
  },
});
