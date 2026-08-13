/**
 * /ledger/new-entry — Phase 5 · Fix 6.
 *
 * Field order (top-to-bottom): Date → Party → Type → Amount + Currency
 * → Convert option → Description (optional) → Company → Mode → Save.
 *
 * Currency options: INR and THB only (USD removed). A "Convert & save
 * as X instead →" button toggles between INR and THB and re-fills the
 * amount using forex rates from /api/forex/rates (fallback 2.35 INR/THB).
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
import { fmtCurrency } from "@/src/lib/format";
import { colors, radii, spacing } from "@/src/lib/theme";
import { GlassCard } from "@/src/lib/ui";

type Party = { id: string; name: string; role?: string };
type Rates = { thb_to_inr: number; inr_to_thb: number };
type Currency = "INR" | "THB";
type Company = "awadh" | "singh_exports";
type Mode = "formal" | "informal";

export default function NewLedgerEntryScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const params = useLocalSearchParams<{ party_id?: string }>();

  const [dateStr, setDateStr] = useState(new Date().toISOString().slice(0, 10));
  const [parties, setParties] = useState<Party[]>([]);
  const [query, setQuery] = useState("");
  const [partyId, setPartyId] = useState<string | null>(params.party_id || null);
  const [type, setType] = useState<"credit" | "debit">("credit");
  const [amountStr, setAmountStr] = useState("");
  const [currency, setCurrency] = useState<Currency>("INR");
  const [description, setDescription] = useState("");
  const [company, setCompany] = useState<Company>("awadh");
  const [companyMode, setCompanyMode] = useState<Mode>("informal");
  const [rates, setRates] = useState<Rates>({ thb_to_inr: 2.35, inr_to_thb: 0.4255 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiGet<Party[]>("/api/parties")
      .then((p) => setParties(Array.isArray(p) ? p : []))
      .catch(() => setParties([]));
    apiGet<Rates>("/api/forex/rates")
      .then((r) => {
        if (r?.thb_to_inr && r?.inr_to_thb) setRates(r);
      })
      .catch(() => {
        /* fallback rates already set */
      });
  }, [token]);

  const selectedParty = parties.find((p) => p.id === partyId);
  const filteredParties = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || selectedParty) return parties.slice(0, 8);
    return parties
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.role || "").toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [parties, query, selectedParty]);

  const amount = parseFloat(amountStr) || 0;
  const previewOther = useMemo(() => {
    if (!amount) return null;
    if (currency === "INR") return { cur: "THB" as const, amt: amount * rates.inr_to_thb };
    return { cur: "INR" as const, amt: amount * rates.thb_to_inr };
  }, [amount, currency, rates]);

  const convertCurrency = () => {
    if (!previewOther) {
      setCurrency(currency === "INR" ? "THB" : "INR");
      return;
    }
    setCurrency(previewOther.cur);
    // 2 decimals is enough for both INR and THB.
    setAmountStr(previewOther.amt.toFixed(2));
  };

  // Fix 6 (Phase 5) · Description is now OPTIONAL.
  const canSubmit = useMemo(
    () => !!partyId && amount > 0 && !saving,
    [partyId, amount, saving],
  );

  const submit = async () => {
    if (!canSubmit || !partyId) return;
    setSaving(true);
    try {
      await apiPost("/api/ledger/entries", {
        party_id: partyId,
        date: dateStr,
        description: description.trim() || "—",
        debit: type === "debit" ? amount : 0,
        credit: type === "credit" ? amount : 0,
        currency,
        company_id: company,
        company_mode: companyMode,
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
          <Text style={styles.subtitle}>Debit / credit · INR or THB</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <GlassCard style={styles.card}>
          {/* Date */}
          <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={dateStr}
            onChangeText={setDateStr}
            placeholder="2026-08-13"
            placeholderTextColor={colors.textDim}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Party */}
          <Text style={styles.label}>Party</Text>
          {selectedParty ? (
            <View style={styles.selectedParty}>
              <Text style={styles.selectedPartyText}>{selectedParty.name}</Text>
              <TouchableOpacity
                onPress={() => {
                  setPartyId(null);
                  setQuery("");
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={16} color={colors.textDim} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                value={query}
                onChangeText={setQuery}
                placeholder="Search parties…"
                placeholderTextColor={colors.textDim}
                autoCapitalize="words"
              />
              <View style={styles.suggestList}>
                {filteredParties.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => {
                      setPartyId(p.id);
                      setQuery("");
                    }}
                    activeOpacity={0.75}
                    style={styles.suggestRow}
                  >
                    <Text style={styles.suggestName} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={styles.suggestRole} numberOfLines={1}>
                      {p.role || "—"}
                    </Text>
                  </TouchableOpacity>
                ))}
                {filteredParties.length === 0 ? (
                  <Text style={styles.dim}>No parties match</Text>
                ) : null}
              </View>
            </>
          )}

          {/* Type */}
          <Text style={styles.label}>Type</Text>
          <View style={styles.segment}>
            <TouchableOpacity
              onPress={() => setType("credit")}
              activeOpacity={0.75}
              style={[
                styles.segmentBtn,
                type === "credit" && {
                  backgroundColor: "rgba(0,255,136,0.15)",
                  borderColor: colors.credit,
                },
              ]}
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
                You Got · Credit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setType("debit")}
              activeOpacity={0.75}
              style={[
                styles.segmentBtn,
                type === "debit" && {
                  backgroundColor: "rgba(255,68,68,0.15)",
                  borderColor: colors.debit,
                },
              ]}
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
                You Gave · Debit
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
                {(["INR", "THB"] as Currency[]).map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCurrency(c)}
                    activeOpacity={0.75}
                    style={[
                      styles.segmentBtn,
                      currency === c && {
                        backgroundColor: colors.brandSoft,
                        borderColor: colors.brand,
                      },
                    ]}
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

          {/* Convert option */}
          {previewOther ? (
            <TouchableOpacity
              style={styles.convertBtn}
              onPress={convertCurrency}
              activeOpacity={0.8}
            >
              <Ionicons name="swap-horizontal" size={14} color={colors.brand} />
              <Text style={styles.convertText}>
                ≈ {fmtCurrency(previewOther.amt, previewOther.cur)} — Convert &amp; save as{" "}
                {previewOther.cur} instead →
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* Description (optional) */}
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.multi]}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Payment received for AURA-INV-001"
            placeholderTextColor={colors.textDim}
            multiline
          />

          {/* Company */}
          <Text style={styles.label}>Company</Text>
          <View style={styles.segment}>
            {(["awadh", "singh_exports"] as Company[]).map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setCompany(c)}
                activeOpacity={0.75}
                style={[
                  styles.segmentBtn,
                  company === c && {
                    backgroundColor: colors.brandSoft,
                    borderColor: colors.brand,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: company === c ? colors.brand : colors.textDim },
                  ]}
                >
                  {c === "singh_exports" ? "Singh Exp." : "Awadh"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Mode */}
          <Text style={styles.label}>Mode</Text>
          <View style={styles.segment}>
            {(["formal", "informal"] as Mode[]).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setCompanyMode(m)}
                activeOpacity={0.75}
                style={[
                  styles.segmentBtn,
                  companyMode === m && {
                    backgroundColor: colors.brandSoft,
                    borderColor: colors.brand,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: companyMode === m ? colors.brand : colors.textDim },
                  ]}
                >
                  {m === "formal" ? "Formal" : "Informal"}
                </Text>
              </TouchableOpacity>
            ))}
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
            onPress={submit}
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
  multi: { minHeight: 60 },
  selectedParty: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  selectedPartyText: { color: colors.brand, fontSize: 14, fontWeight: "800" },
  suggestList: {
    marginTop: 6,
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  suggestRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
  },
  suggestName: { color: colors.text, fontSize: 13, fontWeight: "700", flex: 1 },
  suggestRole: { color: colors.textDim, fontSize: 11, marginLeft: 6 },
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
  convertBtn: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    backgroundColor: colors.brandSoft,
  },
  convertText: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  dim: { color: colors.textDim, fontSize: 12, padding: spacing.md },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
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
