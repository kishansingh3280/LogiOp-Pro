import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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

import { maybePostCarrierFee } from "@/src/bullion/ledger-sync";
import { useRates } from "@/src/bullion/rates";
import { createTxn, deleteTxn, updateTxn, usedWeightKgFor, useTrips, useTxns } from "@/src/bullion/store";
import {
  computeTxn,
  STATUS_LABEL,
  tripCapacityKg,
  type BullionTxn,
  type CarryType,
  type GoldUnit,
  type TxnStatus,
} from "@/src/bullion/types";
import { colors, radii, spacing } from "@/src/theme";
import { fmtCurrency, shortDate } from "@/src/utils/format";

/**
 * Combined new/edit screen for bullion transactions.
 * URL: /bullion/txn/[id]  where id === "new" for creation (with ?type=currency|gold)
 */
export default function TxnScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; type?: CarryType }>();
  const isNew = params.id === "new";
  const trips = useTrips();
  const txns = useTxns();
  const rates = useRates();

  const existing = !isNew ? txns.data.find((t) => t.id === params.id) : null;

  const [type, setType] = useState<CarryType>(existing?.type || params.type || "currency");
  const [currency, setCurrency] = useState(existing?.currency || "USD");
  const [currencyAmount, setCurrencyAmount] = useState(existing?.currency_amount?.toString() || "");
  const [purchaseRate, setPurchaseRate] = useState(existing?.purchase_rate_inr?.toString() || "");
  const [exchangeRate, setExchangeRate] = useState(existing?.exchange_rate_thb?.toString() || "");
  const [transferRate, setTransferRate] = useState(existing?.transfer_rate_inr_per_thb?.toString() || "");
  const [goldUnit, setGoldUnit] = useState<GoldUnit>(existing?.gold_unit || "baht");
  const [goldAmount, setGoldAmount] = useState(existing?.gold_amount?.toString() || "");
  const [goldPurchaseThb, setGoldPurchaseThb] = useState(existing?.gold_purchase_thb?.toString() || "");
  const [goldCostInr, setGoldCostInr] = useState(existing?.gold_cost_inr?.toString() || "");
  const [goldSaleInr, setGoldSaleInr] = useState(existing?.gold_sale_inr?.toString() || "");
  const [tripId, setTripId] = useState<string | null>(existing?.trip_id || null);
  const [weightKg, setWeightKg] = useState(existing?.weight_kg?.toString() || "");
  const [status, setStatus] = useState<TxnStatus>(existing?.status || "open");
  const [notes, setNotes] = useState(existing?.notes || "");
  const [pickTrip, setPickTrip] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Sync all form fields from the loaded transaction when it arrives async.
    if (!isNew && existing) {
      setType(existing.type);
      setStatus(existing.status);
      setCurrency(existing.currency || "USD");
      setCurrencyAmount(existing.currency_amount?.toString() || "");
      setPurchaseRate(existing.purchase_rate_inr?.toString() || "");
      setExchangeRate(existing.exchange_rate_thb?.toString() || "");
      setTransferRate(existing.transfer_rate_inr_per_thb?.toString() || "");
      setGoldUnit(existing.gold_unit || "baht");
      setGoldAmount(existing.gold_amount?.toString() || "");
      setGoldPurchaseThb(existing.gold_purchase_thb?.toString() || "");
      setGoldCostInr(existing.gold_cost_inr?.toString() || "");
      setGoldSaleInr(existing.gold_sale_inr?.toString() || "");
      setTripId(existing.trip_id || null);
      setWeightKg(existing.weight_kg?.toString() || "");
      setNotes(existing.notes || "");
    }
  }, [isNew, existing?.id]);  // eslint-disable-line react-hooks/exhaustive-deps

  const draft: BullionTxn = useMemo(
    () => ({
      id: existing?.id || "draft",
      txn_no: existing?.txn_no || "DRAFT",
      type,
      status,
      trip_id: tripId,
      weight_kg: parseFloatOrUndef(weightKg),
      notes,
      created_at: existing?.created_at || new Date().toISOString(),
      currency: type === "currency" ? currency : undefined,
      currency_amount: parseFloatOrUndef(currencyAmount),
      purchase_rate_inr: parseFloatOrUndef(purchaseRate),
      exchange_rate_thb: parseFloatOrUndef(exchangeRate),
      transfer_rate_inr_per_thb: parseFloatOrUndef(transferRate),
      gold_unit: type === "gold" ? goldUnit : undefined,
      gold_amount: parseFloatOrUndef(goldAmount),
      gold_purchase_thb: parseFloatOrUndef(goldPurchaseThb),
      gold_cost_inr: parseFloatOrUndef(goldCostInr),
      gold_sale_inr: parseFloatOrUndef(goldSaleInr),
    }),
    [existing, type, status, tripId, weightKg, notes, currency, currencyAmount, purchaseRate, exchangeRate,
      transferRate, goldUnit, goldAmount, goldPurchaseThb, goldCostInr, goldSaleInr],
  );

  const calc = computeTxn(draft, rates.data);
  const trip = trips.data.find((t) => t.id === tripId);

  const tripOptions = useMemo(
    () =>
      trips.data
        .map((t) => ({
          ...t,
          capacity_kg: tripCapacityKg(t),
          used_kg: usedWeightKgFor(t.id, txns.data.filter((x) => x.id !== existing?.id)),
        }))
        .sort((a, b) => (a.date < b.date ? -1 : 1)),
    [trips.data, txns.data, existing?.id],
  );

  const save = async () => {
    setBusy(true);
    try {
      const payload = {
        type,
        trip_id: tripId,                       // fully optional — trip can be null
        weight_kg: draft.weight_kg,
        notes,
        currency: type === "currency" ? currency : undefined,
        currency_amount: draft.currency_amount,
        purchase_rate_inr: draft.purchase_rate_inr,
        exchange_rate_thb: draft.exchange_rate_thb,
        transfer_rate_inr_per_thb: draft.transfer_rate_inr_per_thb,
        gold_unit: type === "gold" ? goldUnit : undefined,
        gold_amount: draft.gold_amount,
        gold_purchase_thb: draft.gold_purchase_thb,
        gold_cost_inr: draft.gold_cost_inr,
        gold_sale_inr: draft.gold_sale_inr,
      };
      let savedTxn;
      if (isNew) {
        savedTxn = await createTxn(payload);
      } else {
        savedTxn = await updateTxn(existing!.id, { ...payload, status });
      }
      // Auto-sync the carrier fee to the party ledger the first time a
      // txn is saved as "completed" with a carrier assigned.
      if (savedTxn && savedTxn.status === "completed") {
        const linkedTrip = trips.data.find((t) => t.id === savedTxn!.trip_id);
        const posted = await maybePostCarrierFee(savedTxn, linkedTrip);
        if (posted) {
          Alert.alert(
            "Carrier fee posted",
            `Expense recorded in ${linkedTrip?.carrier_name || "carrier"}'s ledger.`,
          );
        }
      }
      router.back();
    } catch (e) {
      Alert.alert("Failed", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const cycleStatus = async () => {
    if (isNew) return;
    const next: TxnStatus =
      status === "open" ? "in_transit" : status === "in_transit" ? "completed" : "open";
    setStatus(next);
    const updated = await updateTxn(existing!.id, { status: next });
    if (updated && next === "completed") {
      const linkedTrip = trips.data.find((t) => t.id === updated.trip_id);
      const posted = await maybePostCarrierFee(updated, linkedTrip);
      if (posted) {
        Alert.alert(
          "Carrier fee posted",
          `Expense recorded in ${linkedTrip?.carrier_name || "carrier"}'s ledger.`,
        );
      }
    }
  };

  const remove = () => {
    if (isNew || !existing) return;
    Alert.alert("Delete transaction", `Delete ${existing.txn_no}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await deleteTxn(existing.id); router.back(); } },
    ]);
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.headBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name={isNew ? "close" : "chevron-back"} size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headTitle}>{isNew ? "New trade" : existing?.txn_no || "Trade"}</Text>
        {!isNew && (
          <TouchableOpacity onPress={remove} style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        )}
        {isNew && <View style={{ width: 40 }} />}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Type toggle */}
          <View style={styles.typeRow}>
            <TypeBtn
              icon="cash-outline" label="Currency" active={type === "currency"}
              onPress={() => setType("currency")} testID="type-currency"
            />
            <TypeBtn
              icon="diamond-outline" label="Gold" active={type === "gold"}
              onPress={() => setType("gold")} testID="type-gold"
            />
          </View>

          {/* Trip — optional. A trip can carry bullion, shipment bags, or both. */}
          <Field label="Carrier trip (optional)">
            <TouchableOpacity style={styles.selectBtn} onPress={() => setPickTrip(true)} testID="pick-trip">
              <Text style={[styles.selectText, !trip && styles.selectPh]}>
                {trip ? `${shortDate(trip.date)} · ${trip.carrier_name || "TBD"} · ${trip.route === "IN_TO_TH" ? "IN → BKK" : "BKK → IN"}` : "Not linked to a trip"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textDim} />
            </TouchableOpacity>
            {trip ? (
              <TouchableOpacity onPress={() => setTripId(null)} style={styles.clearLinkBtn} testID="clear-trip">
                <Ionicons name="close-circle-outline" size={14} color={colors.textDim} />
                <Text style={styles.clearLinkText}>Remove trip link</Text>
              </TouchableOpacity>
            ) : null}
          </Field>

          <Field label="Weight consumed on trip (kg, optional)">
            <TextInput
              style={styles.input}
              value={weightKg}
              onChangeText={setWeightKg}
              keyboardType="decimal-pad"
              placeholder="e.g. 2.5"
              placeholderTextColor={colors.textDim}
              testID="txn-weight-kg"
            />
          </Field>

          {type === "currency" ? (
            <>
              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Field label="Currency">
                    <TextInput style={styles.input} value={currency} onChangeText={(t) => setCurrency(t.toUpperCase())} autoCapitalize="characters" placeholder="USD" placeholderTextColor={colors.textDim} testID="curr-code" />
                  </Field>
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Field label="Amount">
                    <TextInput style={styles.input} value={currencyAmount} onChangeText={setCurrencyAmount} keyboardType="decimal-pad" placeholder="10000" placeholderTextColor={colors.textDim} testID="curr-amount" />
                  </Field>
                </View>
              </View>

              <Field label="Purchase rate (INR per unit)">
                <TextInput style={styles.input} value={purchaseRate} onChangeText={setPurchaseRate} keyboardType="decimal-pad" placeholder="83.0" placeholderTextColor={colors.textDim} testID="curr-purchase-rate" />
              </Field>

              <Field label="Exchange rate in BKK (THB per unit)">
                <TextInput style={styles.input} value={exchangeRate} onChangeText={setExchangeRate} keyboardType="decimal-pad" placeholder="34.5" placeholderTextColor={colors.textDim} testID="curr-exchange-rate" />
              </Field>

              <Field label="Transfer rate back to India (INR per THB) — optional">
                <TextInput style={styles.input} value={transferRate} onChangeText={setTransferRate} keyboardType="decimal-pad" placeholder="2.5 (leave blank if buying gold)" placeholderTextColor={colors.textDim} testID="curr-transfer-rate" />
              </Field>
            </>
          ) : (
            <>
              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Field label="Amount">
                    <TextInput style={styles.input} value={goldAmount} onChangeText={setGoldAmount} keyboardType="decimal-pad" placeholder="10" placeholderTextColor={colors.textDim} testID="gold-amount" />
                  </Field>
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Field label="Unit">
                    <View style={styles.segRow}>
                      {(["baht", "grams"] as GoldUnit[]).map((u) => {
                        const active = goldUnit === u;
                        return (
                          <TouchableOpacity key={u} onPress={() => setGoldUnit(u)} style={[styles.seg, active && styles.segActive]} testID={`gold-unit-${u}`}>
                            <Text style={[styles.segText, active && styles.segTextActive]}>{u}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </Field>
                </View>
              </View>

              <Field label="Purchase price (THB total)">
                <TextInput style={styles.input} value={goldPurchaseThb} onChangeText={setGoldPurchaseThb} keyboardType="decimal-pad" placeholder="345000" placeholderTextColor={colors.textDim} testID="gold-purchase-thb" />
              </Field>

              <Field label="INR cost of that THB — optional (for profit calc)">
                <TextInput style={styles.input} value={goldCostInr} onChangeText={setGoldCostInr} keyboardType="decimal-pad" placeholder="850000" placeholderTextColor={colors.textDim} testID="gold-cost-inr" />
              </Field>

              <Field label="Sale price in India (INR total)">
                <TextInput style={styles.input} value={goldSaleInr} onChangeText={setGoldSaleInr} keyboardType="decimal-pad" placeholder="900000" placeholderTextColor={colors.textDim} testID="gold-sale-inr" />
              </Field>
            </>
          )}

          <Field label="Notes">
            <TextInput style={[styles.input, { minHeight: 60, textAlignVertical: "top" }]} multiline value={notes} onChangeText={setNotes} placeholder="Optional…" placeholderTextColor={colors.textDim} />
          </Field>

          {/* Profit calculator */}
          <View style={styles.profitCard} testID="profit-card">
            <Text style={styles.profitTitle}>Profit calculator</Text>
            {type === "currency" ? (
              <>
                <Row label="INR spent" value={calc.inr_spent ? fmtCurrency(calc.inr_spent, "INR") : "—"} />
                <Row label="THB received" value={calc.thb_received ? fmtCurrency(calc.thb_received, "THB") : "—"} />
                {calc.inr_returned ? <Row label="INR returned" value={fmtCurrency(calc.inr_returned, "INR")} tint={colors.ok} /> : null}
              </>
            ) : (
              <>
                <Row label={`${calc.baht_equiv?.toFixed(2) || 0} baht equivalent`} value="" muted />
                {calc.inr_cost ? <Row label="INR cost" value={fmtCurrency(calc.inr_cost, "INR")} /> : null}
                {draft.gold_sale_inr ? <Row label="INR sale" value={fmtCurrency(draft.gold_sale_inr, "INR")} tint={colors.ok} /> : null}
              </>
            )}
            <Row label="Carrier charge" value={fmtCurrency(calc.carrier_charge_inr, "INR")} tint={colors.danger} />
            <View style={styles.profitDivider} />
            <Row
              label="Net profit"
              value={calc.profit_inr !== null ? fmtCurrency(calc.profit_inr, "INR") : "—"}
              tint={calc.profit_inr !== null ? (calc.profit_inr >= 0 ? colors.lime : colors.danger) : colors.textDim}
              bold
            />
            {!calc.can_settle && (
              <Text style={styles.profitHint}>
                {type === "currency"
                  ? "Fill purchase rate + exchange rate + transfer rate to see net profit."
                  : "Fill THB cost + INR cost + INR sale to see net profit."}
              </Text>
            )}
          </View>

          {/* Status control (only when editing) */}
          {!isNew && (
            <TouchableOpacity style={styles.statusBtn} onPress={cycleStatus} testID="cycle-status">
              <Text style={styles.statusBtnLbl}>Status</Text>
              <Text style={styles.statusBtnVal}>{STATUS_LABEL[status]} · tap to cycle</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={busy} testID="save-txn-btn">
            <Text style={styles.saveText}>{busy ? "Saving…" : isNew ? "Create trade" : "Save changes"}</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {pickTrip && (
        <Pressable style={styles.backdrop} onPress={() => setPickTrip(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Choose carrier trip</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {tripOptions.length === 0 ? (
                <Text style={styles.pickEmpty}>No trips yet. Add one from the Bullion tab.</Text>
              ) : (
                tripOptions.map((t) => {
                  const free = Math.max(0, t.capacity_kg - t.used_kg);
                  const full = t.capacity_kg > 0 && free <= 0 && t.id !== tripId;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={styles.pickRow}
                      onPress={() => { setTripId(t.id); setPickTrip(false); }}
                      testID={`pick-trip-${t.id}`}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pickName}>
                          {shortDate(t.date)} · {t.carrier_name || "TBD"}
                        </Text>
                        <Text style={styles.pickMeta}>
                          {t.route === "IN_TO_TH" ? "IN → BKK" : "BKK → IN"} · {fmtKg(free)}/{fmtKg(t.capacity_kg)} kg free
                        </Text>
                      </View>
                      {full ? <Text style={styles.fullTag}>FULL</Text> : <Ionicons name="chevron-forward" size={16} color={colors.textDim} />}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setPickTrip(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

function parseFloatOrUndef(s: string): number | undefined {
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function fmtKg(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function TypeBtn({ icon, label, active, onPress, testID }: { icon: keyof typeof Ionicons.glyphMap; label: string; active: boolean; onPress: () => void; testID: string }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.typeBtn, active && styles.typeBtnActive]} testID={testID}>
      <Ionicons name={icon} size={18} color={active ? colors.bg : colors.lime} />
      <Text style={[styles.typeBtnText, active && { color: colors.bg }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Row({ label, value, tint, bold, muted }: { label: string; value: string; tint?: string; bold?: boolean; muted?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLbl, muted && { color: colors.textDim }]}>{label}</Text>
      <Text style={[styles.rowVal, tint ? { color: tint } : null, bold && { fontWeight: "800", fontSize: 16 }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.sm,
    borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: { padding: 8, width: 40 },
  headTitle: { flex: 1, color: colors.text, fontSize: 16, fontWeight: "800" },
  content: { padding: spacing.lg },
  typeRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  typeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    height: 48, borderRadius: radii.md, borderWidth: 2, borderColor: colors.lime,
    backgroundColor: colors.surface,
  },
  typeBtnActive: { backgroundColor: colors.lime },
  typeBtnText: { color: colors.lime, fontWeight: "800", fontSize: 14 },
  field: { marginBottom: spacing.md },
  label: { color: colors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface, borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 15,
  },
  row2: { flexDirection: "row" },
  segRow: { flexDirection: "row", gap: 8 },
  seg: {
    flex: 1, paddingVertical: 12, borderRadius: radii.md,
    backgroundColor: colors.chipBg, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  segActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  segText: { color: colors.textMuted, fontSize: 13, fontWeight: "700", textTransform: "capitalize" },
  segTextActive: { color: colors.bg },
  selectBtn: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: colors.surface, borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  selectText: { color: colors.text, fontSize: 15 },
  selectPh: { color: colors.textDim },
  clearLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  clearLinkText: { color: colors.textDim, fontSize: 12 },
  profitCard: {
    backgroundColor: colors.surface, borderRadius: radii.lg,
    borderColor: colors.lime, borderWidth: 1,
    padding: spacing.lg, gap: 4, marginTop: spacing.md,
  },
  profitTitle: { color: colors.lime, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 },
  profitDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 6 },
  profitHint: { color: colors.textDim, fontSize: 11, marginTop: 8, fontStyle: "italic" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  rowLbl: { color: colors.textMuted, fontSize: 13 },
  rowVal: { color: colors.text, fontSize: 14, fontWeight: "700" },
  statusBtn: {
    marginTop: spacing.md, padding: spacing.md, borderRadius: radii.md,
    backgroundColor: colors.chipBg, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  statusBtnLbl: { color: colors.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  statusBtnVal: { color: colors.lime, fontSize: 13, fontWeight: "800" },
  saveBtn: {
    marginTop: spacing.lg, backgroundColor: colors.lime,
    paddingVertical: 14, borderRadius: radii.pill, alignItems: "center",
  },
  saveText: { color: colors.bg, fontWeight: "800", fontSize: 15 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surfaceAlt, padding: spacing.lg,
    borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing.md },
  sheetTitle: { color: colors.text, fontSize: 16, fontWeight: "800", marginBottom: spacing.md },
  pickRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 12, gap: spacing.md,
    borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth,
  },
  pickName: { color: colors.text, fontSize: 15, fontWeight: "700" },
  pickMeta: { color: colors.textDim, fontSize: 12, marginTop: 2, textTransform: "capitalize" },
  pickEmpty: { color: colors.textDim, textAlign: "center", padding: spacing.lg },
  fullTag: { color: colors.danger, fontWeight: "800", fontSize: 11 },
  sheetCancel: {
    marginTop: spacing.md, paddingVertical: 12, alignItems: "center",
    borderRadius: radii.pill, backgroundColor: colors.chipBg,
  },
  sheetCancelText: { color: colors.text, fontWeight: "700" },
});
