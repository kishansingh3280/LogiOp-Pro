/**
 * New Invoice — Phase 7 · Batch B · Fix 8.
 *
 * Full-page create form that flips between two modes:
 *   • Informal → "Cash Receipt": no GST, no company field, minimal.
 *   • Formal   → "GST Invoice":  Company, GSTIN, HSN + tax % per line.
 *
 * Both modes: multi-currency (INR/THB per line item), auto totals,
 * bill-to party picker, optional shipment link, notes.
 *
 * Universal Form Rule respected via ModeCompanyBlock at TOP.
 */
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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

import { apiGet, apiPost } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth-context";
import { useCompany } from "@/src/lib/company-context";
import {
  ModeCompanyBlock,
  type FormCompany,
  type FormMode,
} from "@/src/lib/mode-company-block";
import { colors, radii, spacing } from "@/src/lib/theme";
import { GlassCard } from "@/src/lib/ui";

type Party = { id: string; name: string; role?: string };
type Currency = "INR" | "THB";
type Shipment = { id: string; consignment_no?: string; party_id?: string };

type LineItem = {
  key: string;
  description: string;
  hsn: string;
  qty: string;
  rate: string;
  currency: Currency;
  tax_percent: string; // Formal only
};

const TAX_PCTS = ["0", "5", "12", "18", "28"] as const;
const COMPANY_GSTIN: Record<string, string> = {
  awadh: "09AAAAA0000A1Z5",
  singh_exports: "09BBBBB1111B2Y6",
};

const newLine = (): LineItem => ({
  key: `li-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  description: "",
  hsn: "",
  qty: "1",
  rate: "",
  currency: "INR",
  tax_percent: "0",
});

export default function NewInvoiceScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { activeCompany, activeMode, setActiveCompany, setActiveMode } = useCompany();

  const [formMode, setFormMode] = useState<FormMode>(
    activeMode === "formal" ? "formal" : "informal",
  );
  const [formCompany, setFormCompany] = useState<FormCompany>(
    (activeCompany as FormCompany) || "awadh",
  );

  const [parties, setParties] = useState<Party[]>([]);
  const [partyId, setPartyId] = useState<string>("");
  const [pickerOpen, setPickerOpen] = useState<null | "party" | "shipment">(null);
  const [partySearch, setPartySearch] = useState("");

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [shipmentId, setShipmentId] = useState<string>("");

  const [dateStr, setDateStr] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<LineItem[]>([newLine()]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiGet<Party[]>("/api/parties")
      .then((rows) => setParties(Array.isArray(rows) ? rows : []))
      .catch(() => setParties([]));
    apiGet<Shipment[]>("/api/shipments")
      .then((rows) => setShipments(Array.isArray(rows) ? rows : []))
      .catch(() => setShipments([]));
  }, [token]);

  const selectedParty = useMemo(
    () => parties.find((p) => p.id === partyId) || null,
    [parties, partyId],
  );
  const selectedShipment = useMemo(
    () => shipments.find((s) => s.id === shipmentId) || null,
    [shipments, shipmentId],
  );

  const pickerList = useMemo(() => {
    if (pickerOpen === "party") {
      const q = partySearch.trim().toLowerCase();
      return q
        ? parties.filter((p) => p.name.toLowerCase().includes(q))
        : parties;
    }
    if (pickerOpen === "shipment") {
      return shipments.slice(0, 200);
    }
    return [];
  }, [pickerOpen, parties, shipments, partySearch]);

  const updateItem = (key: string, patch: Partial<LineItem>) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  const removeItem = (key: string) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.key !== key) : prev));
  const addItem = () => setItems((prev) => [...prev, newLine()]);

  const subtotals = useMemo(() => {
    let inr = 0;
    let thb = 0;
    let taxInr = 0;
    let taxThb = 0;
    items.forEach((it) => {
      const line = (Number(it.qty) || 0) * (Number(it.rate) || 0);
      const t = formMode === "formal" ? line * ((Number(it.tax_percent) || 0) / 100) : 0;
      if (it.currency === "THB") {
        thb += line;
        taxThb += t;
      } else {
        inr += line;
        taxInr += t;
      }
    });
    return { inr, thb, taxInr, taxThb };
  }, [items, formMode]);
  const totalInr = subtotals.inr + subtotals.taxInr;
  const totalThb = subtotals.thb + subtotals.taxThb;

  const validate = (): string | null => {
    if (!partyId) return "Please select the bill-to Party.";
    if (items.length === 0) return "Add at least one line item.";
    for (const it of items) {
      if (!it.description.trim()) return "Line item description is required.";
      const q = Number(it.qty);
      const r = Number(it.rate);
      if (!Number.isFinite(q) || q <= 0) return "Line item qty must be positive.";
      if (!Number.isFinite(r) || r < 0) return "Line item rate cannot be negative.";
    }
    return null;
  };

  const onSave = async () => {
    const err = validate();
    if (err) {
      Alert.alert("Missing info", err);
      return;
    }
    // Fix 5 (Phase 7 · Batch C-2) · Formal-save confirmation popup.
    // Government-facing GST invoices go through this extra confirm
    // step so nothing is committed by accident. Informal saves skip
    // the popup entirely.
    if (formMode === "formal") {
      Alert.alert(
        "Formal Entry Confirm karein?",
        "Yeh ek formal GST entry hai jo government records mein jaayegi.\nKya aap confirm karte hain?",
        [
          { text: "Wapas Jao", style: "cancel" },
          { text: "Haan, Save Karo", onPress: () => doSave() },
        ],
      );
      return;
    }
    await doSave();
  };

  const doSave = async () => {
    setSaving(true);
    try {
      const isFormal = formMode === "formal";
      const payload: Record<string, unknown> = {
        party_id: partyId,
        date: dateStr,
        currency: items[0]?.currency || "INR",
        items: items.map((it) => ({
          description: it.description.trim(),
          hsn: isFormal ? it.hsn.trim() || undefined : undefined,
          quantity: Number(it.qty) || 0,
          rate: Number(it.rate) || 0,
          currency: it.currency,
          tax_percent: isFormal ? Number(it.tax_percent) || 0 : 0,
          amount:
            (Number(it.qty) || 0) *
            (Number(it.rate) || 0) *
            (isFormal ? 1 + (Number(it.tax_percent) || 0) / 100 : 1),
        })),
        tax_percent: isFormal ? Math.max(...items.map((it) => Number(it.tax_percent) || 0)) : 0,
        notes: notes.trim() || undefined,
        status: "draft",
        // Universal Form Rule
        mode: formMode,
        company_mode: formMode,
        company_id: isFormal ? formCompany : undefined,
        invoice_type: isFormal ? "gst_invoice" : "cash_receipt",
        gstin: isFormal ? COMPANY_GSTIN[formCompany] : undefined,
        shipment_id: shipmentId || undefined,
      };
      const res = await apiPost<{ id?: string }>("/api/invoices", payload);
      if (formCompany !== activeCompany && isFormal) setActiveCompany(formCompany);
      if (formMode !== activeMode) setActiveMode(formMode);
      if (res?.id) {
        router.replace(`/invoice/${res.id}` as never);
      } else {
        router.replace("/invoices" as never);
      }
    } catch (e) {
      Alert.alert("Could not save", (e as Error).message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const isFormal = formMode === "formal";
  const ccySym = (c: Currency) => (c === "INR" ? "₹" : "฿");

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {isFormal ? "New GST Invoice" : "New Cash Receipt"}
          </Text>
          <Text style={styles.subtitle}>
            {isFormal
              ? "Formal tax invoice with GSTIN + HSN"
              : "Informal cash receipt — no GST"}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Mode-First */}
          <GlassCard>
            <ModeCompanyBlock
              mode={formMode}
              company={formCompany}
              onModeChange={setFormMode}
              onCompanyChange={setFormCompany}
            />
            {isFormal ? (
              <View style={styles.gstinRow}>
                <Text style={styles.gstinLabel}>GSTIN</Text>
                <Text style={styles.gstinValue}>{COMPANY_GSTIN[formCompany]}</Text>
              </View>
            ) : null}
          </GlassCard>

          {/* Bill-to */}
          <Text style={styles.section}>Bill-to Party</Text>
          <GlassCard>
            <TouchableOpacity
              style={styles.pickerBtn}
              activeOpacity={0.75}
              onPress={() => {
                setPickerOpen("party");
                setPartySearch("");
              }}
            >
              <Ionicons name="person" size={16} color={colors.brand} />
              <Text
                style={[
                  styles.pickerBtnText,
                  { color: selectedParty ? colors.text : colors.textDim },
                ]}
                numberOfLines={1}
              >
                {selectedParty ? selectedParty.name : "Select party…"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textDim} />
            </TouchableOpacity>

            <View style={styles.rowSplit}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Date</Text>
                <TextInput
                  style={styles.input}
                  value={dateStr}
                  onChangeText={setDateStr}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textDim}
                  autoCapitalize="none"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Shipment (optional)</Text>
                <TouchableOpacity
                  style={styles.pickerBtn}
                  activeOpacity={0.75}
                  onPress={() => setPickerOpen("shipment")}
                >
                  <Ionicons name="airplane" size={14} color={colors.brand} />
                  <Text
                    style={[
                      styles.pickerBtnText,
                      { color: selectedShipment ? colors.text : colors.textDim, fontSize: 12 },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedShipment
                      ? selectedShipment.consignment_no || selectedShipment.id.slice(0, 8)
                      : "Link…"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </GlassCard>

          {/* Line items */}
          <View style={styles.sectionRow}>
            <Text style={styles.section}>Line Items</Text>
            <TouchableOpacity onPress={addItem} activeOpacity={0.75} style={styles.addChipBtn}>
              <Ionicons name="add-circle" size={14} color={colors.brand} />
              <Text style={styles.addChipText}>Line Item jodo</Text>
            </TouchableOpacity>
          </View>
          {items.map((it, idx) => {
            const line = (Number(it.qty) || 0) * (Number(it.rate) || 0);
            return (
              <GlassCard key={it.key} style={{ marginBottom: 10 }}>
                <View style={styles.itemHead}>
                  <Text style={styles.itemNo}>Item #{idx + 1}</Text>
                  {items.length > 1 ? (
                    <TouchableOpacity
                      onPress={() => removeItem(it.key)}
                      style={styles.removeBtnSmall}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="close" size={14} color={colors.danger} />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={styles.input}
                  value={it.description}
                  onChangeText={(v) => updateItem(it.key, { description: v })}
                  placeholder="Item / service description"
                  placeholderTextColor={colors.textDim}
                />
                <View style={styles.rowSplit}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Qty</Text>
                    <TextInput
                      style={styles.input}
                      value={it.qty}
                      onChangeText={(v) => updateItem(it.key, { qty: v })}
                      keyboardType="decimal-pad"
                      placeholderTextColor={colors.textDim}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Rate</Text>
                    <View style={styles.rateBox}>
                      <Text style={styles.ratePrefix}>{ccySym(it.currency)}</Text>
                      <TextInput
                        style={styles.rateInput}
                        value={it.rate}
                        onChangeText={(v) => updateItem(it.key, { rate: v })}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={colors.textDim}
                      />
                    </View>
                    <View style={styles.pillRow}>
                      {(["INR", "THB"] as Currency[]).map((c) => (
                        <TouchableOpacity
                          key={c}
                          onPress={() => updateItem(it.key, { currency: c })}
                          activeOpacity={0.75}
                          style={[
                            styles.miniPill,
                            it.currency === c ? styles.pillActive : styles.pillIdle,
                          ]}
                        >
                          <Text
                            style={
                              it.currency === c ? styles.pillTextActive : styles.pillTextIdle
                            }
                          >
                            {c}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {isFormal ? (
                  <View style={styles.rowSplit}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>HSN code</Text>
                      <TextInput
                        style={styles.input}
                        value={it.hsn}
                        onChangeText={(v) => updateItem(it.key, { hsn: v })}
                        placeholder="e.g. 9965"
                        placeholderTextColor={colors.textDim}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Tax %</Text>
                      <View style={styles.pillRow}>
                        {TAX_PCTS.map((t) => (
                          <TouchableOpacity
                            key={t}
                            onPress={() => updateItem(it.key, { tax_percent: t })}
                            activeOpacity={0.75}
                            style={[
                              styles.miniPill,
                              it.tax_percent === t ? styles.pillActive : styles.pillIdle,
                            ]}
                          >
                            <Text
                              style={
                                it.tax_percent === t
                                  ? styles.pillTextActive
                                  : styles.pillTextIdle
                              }
                            >
                              {t}%
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                ) : null}

                <View style={styles.lineTotalRow}>
                  <Text style={styles.lineTotalLbl}>Line total</Text>
                  <Text style={styles.lineTotalVal}>
                    {ccySym(it.currency)}
                    {(
                      line *
                      (isFormal ? 1 + (Number(it.tax_percent) || 0) / 100 : 1)
                    ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </Text>
                </View>
              </GlassCard>
            );
          })}

          {/* Totals */}
          <GlassCard>
            <View style={styles.totalsRow}>
              {subtotals.inr > 0 ? (
                <View style={styles.totalsCol}>
                  <Text style={styles.totalsLabel}>Total (INR)</Text>
                  <Text style={styles.totalsValue}>
                    ₹
                    {totalInr.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </Text>
                  {isFormal && subtotals.taxInr > 0 ? (
                    <Text style={styles.totalsSub}>
                      + ₹{subtotals.taxInr.toLocaleString()} tax
                    </Text>
                  ) : null}
                </View>
              ) : null}
              {subtotals.thb > 0 ? (
                <View style={styles.totalsCol}>
                  <Text style={styles.totalsLabel}>Total (THB)</Text>
                  <Text style={styles.totalsValue}>
                    ฿
                    {totalThb.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </Text>
                  {isFormal && subtotals.taxThb > 0 ? (
                    <Text style={styles.totalsSub}>
                      + ฿{subtotals.taxThb.toLocaleString()} tax
                    </Text>
                  ) : null}
                </View>
              ) : null}
              {subtotals.inr === 0 && subtotals.thb === 0 ? (
                <View style={styles.totalsCol}>
                  <Text style={styles.totalsLabel}>Total</Text>
                  <Text style={styles.totalsValue}>—</Text>
                </View>
              ) : null}
            </View>
          </GlassCard>

          {/* Notes */}
          <Text style={styles.section}>Notes</Text>
          <GlassCard>
            <TextInput
              style={[styles.input, { height: 88, textAlignVertical: "top" }]}
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="Anything to remember about this invoice…"
              placeholderTextColor={colors.textDim}
            />
          </GlassCard>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            activeOpacity={0.85}
            onPress={onSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.bgSolid} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color={colors.bgSolid} />
                <Text style={styles.saveBtnText}>
                  Save {isFormal ? "GST Invoice" : "Cash Receipt"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Party / Shipment picker modal */}
      {pickerOpen ? (
        <Pressable style={styles.pickerBackdrop} onPress={() => setPickerOpen(null)}>
          <Pressable style={styles.pickerCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.pickerTitle}>
              {pickerOpen === "party" ? "Select party" : "Link a shipment"}
            </Text>
            {pickerOpen === "party" ? (
              <TextInput
                style={styles.input}
                value={partySearch}
                onChangeText={setPartySearch}
                placeholder="Search by name…"
                placeholderTextColor={colors.textDim}
                autoFocus
              />
            ) : null}
            <ScrollView style={{ maxHeight: 340, marginTop: 8 }}>
              {pickerList.length === 0 ? (
                <Text style={styles.pickerEmpty}>Nothing to show.</Text>
              ) : pickerOpen === "party" ? (
                (pickerList as Party[]).map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.pickerRow, partyId === p.id && styles.pickerRowActive]}
                    onPress={() => {
                      setPartyId(p.id);
                      setPickerOpen(null);
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={partyId === p.id ? "radio-button-on" : "radio-button-off"}
                      size={18}
                      color={partyId === p.id ? colors.brand : colors.textDim}
                    />
                    <Text style={styles.pickerRowText}>{p.name}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                (pickerList as Shipment[]).map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.pickerRow, shipmentId === s.id && styles.pickerRowActive]}
                    onPress={() => {
                      setShipmentId(s.id === shipmentId ? "" : s.id);
                      setPickerOpen(null);
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="airplane" size={16} color={colors.brand} />
                    <Text style={styles.pickerRowText}>
                      {s.consignment_no || s.id.slice(0, 8)}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.pickerDone}
              onPress={() => setPickerOpen(null)}
              activeOpacity={0.85}
            >
              <Text style={styles.pickerDoneText}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      ) : null}
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
  title: { color: colors.text, fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  scroll: { padding: spacing.lg, paddingBottom: 120 },
  section: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.8,
    fontWeight: "800",
    textTransform: "uppercase",
    marginTop: spacing.md,
    marginBottom: 6,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    marginBottom: 6,
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.card,
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  rowSplit: { flexDirection: "row", gap: 10 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  miniPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillIdle: { borderColor: colors.cardBorder, backgroundColor: "transparent" },
  pillActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  pillTextIdle: { color: colors.textDim, fontSize: 11, fontWeight: "700" },
  pillTextActive: { color: colors.brand, fontSize: 11, fontWeight: "800" },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.sm,
    backgroundColor: colors.card,
  },
  pickerBtnText: { flex: 1, fontSize: 14, fontWeight: "700" },
  addChipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    backgroundColor: colors.brandSoft,
  },
  addChipText: { color: colors.brand, fontSize: 11, fontWeight: "800" },
  itemHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  itemNo: { color: colors.brand, fontSize: 12, fontWeight: "800", letterSpacing: 0.4 },
  removeBtnSmall: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: "rgba(255,68,68,0.55)",
  },
  rateBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.card,
  },
  ratePrefix: { color: colors.brand, fontSize: 14, fontWeight: "800" },
  rateInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    padding: 0,
  },
  lineTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  lineTotalLbl: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  lineTotalVal: { color: colors.text, fontSize: 14, fontWeight: "800" },
  totalsRow: { flexDirection: "row", gap: 10 },
  totalsCol: {
    flex: 1,
    padding: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    backgroundColor: colors.brandSoft,
  },
  totalsLabel: {
    color: colors.textDim,
    fontSize: 9,
    letterSpacing: 0.5,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  totalsValue: {
    color: colors.brand,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 4,
  },
  totalsSub: { color: colors.textDim, fontSize: 11, fontWeight: "700", marginTop: 2 },
  gstinRow: {
    marginTop: 12,
    padding: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: "rgba(92,200,255,0.35)",
    backgroundColor: "rgba(92,200,255,0.10)",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  gstinLabel: { color: "#5CC8FF", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  gstinValue: { color: colors.text, fontSize: 12, fontWeight: "800", letterSpacing: 0.4 },
  saveBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.brand,
    borderRadius: 999,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnText: { color: colors.bgSolid, fontSize: 14, fontWeight: "800" },
  pickerBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  pickerCard: {
    backgroundColor: colors.bgSolid,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  pickerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radii.sm,
  },
  pickerRowActive: { backgroundColor: colors.brandSoft },
  pickerRowText: { color: colors.text, fontSize: 14, fontWeight: "600", flex: 1 },
  pickerEmpty: {
    color: colors.textDim,
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 24,
  },
  pickerDone: {
    marginTop: 12,
    backgroundColor: colors.brand,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
  },
  pickerDoneText: { color: colors.bgSolid, fontSize: 13, fontWeight: "800" },
});
