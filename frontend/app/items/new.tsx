/**
 * Add / Edit Item — Phase 8 · Catalog redesign.
 *
 * Route: /items/new (add) or /items/[id]/edit (edit) — this file
 * handles both by reading the optional `?id=` query param. Same UI
 * for both flows.
 *
 * Fields: Photo (Coming Soon), Name*, Parent Category, Sub-category,
 * Variant, Unit, Buy Price + Currency, Sell Price + Currency,
 * Margin % (auto), Stock Qty, Notes.
 *
 * Mode-first respected via ModeCompanyBlock at the top; defaults
 * Informal + Awadh.
 */
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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

import { apiGet, apiPatch, apiPost } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth-context";
import { useCompany } from "@/src/lib/company-context";
import {
  ModeCompanyBlock,
  type FormCompany,
  type FormMode,
} from "@/src/lib/mode-company-block";
import { colors, radii, spacing } from "@/src/lib/theme";
import { GlassCard } from "@/src/lib/ui";

type Currency = "INR" | "THB";
const UNITS = ["pcs", "kg", "gram", "box", "set", "baht", "meter"] as const;

type Item = {
  id: string;
  name?: string;
  unit?: string;
  buying_price?: number;
  selling_price?: number;
  buy_currency?: Currency;
  sell_currency?: Currency;
  stock_qty?: number;
  parent_category?: string;
  sub_category?: string;
  variant?: string;
  notes?: string | null;
  company_id?: string;
  company_mode?: string;
};

export default function ItemForm() {
  const router = useRouter();
  const { token } = useAuth();
  const { activeCompany, activeMode, setActiveCompany, setActiveMode } = useCompany();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = typeof params.id === "string" ? params.id : "";

  const [formMode, setFormMode] = useState<FormMode>(
    activeMode === "formal" ? "formal" : "informal",
  );
  const [formCompany, setFormCompany] = useState<FormCompany>(
    (activeCompany as FormCompany) || "awadh",
  );

  const [name, setName] = useState("");
  const [parentCategory, setParentCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [variant, setVariant] = useState("");
  const [unit, setUnit] = useState<string>("pcs");
  const [buyPrice, setBuyPrice] = useState("");
  const [buyCurrency, setBuyCurrency] = useState<Currency>("INR");
  const [sellPrice, setSellPrice] = useState("");
  const [sellCurrency, setSellCurrency] = useState<Currency>("INR");
  const [stockQty, setStockQty] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!editId || !token) return;
    setLoading(true);
    apiGet<Item>(`/api/items/${editId}`)
      .then((it) => {
        if (!it) return;
        setName(it.name || "");
        setParentCategory(it.parent_category || "");
        setSubCategory(it.sub_category || "");
        setVariant(it.variant || "");
        setUnit(it.unit || "pcs");
        setBuyPrice(it.buying_price ? String(it.buying_price) : "");
        setBuyCurrency((it.buy_currency as Currency) || "INR");
        setSellPrice(it.selling_price ? String(it.selling_price) : "");
        setSellCurrency((it.sell_currency as Currency) || "INR");
        setStockQty(it.stock_qty !== undefined ? String(it.stock_qty) : "");
        setNotes(it.notes || "");
        if (it.company_mode === "formal" || it.company_mode === "informal") {
          setFormMode(it.company_mode);
        }
        if (it.company_id === "awadh" || it.company_id === "singh_exports") {
          setFormCompany(it.company_id);
        }
      })
      .catch((e) => Alert.alert("Load failed", (e as Error).message))
      .finally(() => setLoading(false));
  }, [editId, token]);

  const marginPct = useMemo(() => {
    const b = Number(buyPrice) || 0;
    const s = Number(sellPrice) || 0;
    if (b <= 0) return 0;
    return Math.round(((s - b) / b) * 100);
  }, [buyPrice, sellPrice]);

  const validate = (): string | null => {
    if (!name.trim()) return "Item ka naam zaroori hai.";
    if (buyPrice && Number.isNaN(Number(buyPrice))) return "Buy price invalid.";
    if (sellPrice && Number.isNaN(Number(sellPrice))) return "Sell price invalid.";
    return null;
  };

  const onSave = async () => {
    const err = validate();
    if (err) {
      Alert.alert("Missing info", err);
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        unit,
        buying_price: buyPrice ? Number(buyPrice) : undefined,
        selling_price: sellPrice ? Number(sellPrice) : undefined,
        buy_currency: buyCurrency,
        sell_currency: sellCurrency,
        stock_qty: stockQty ? Number(stockQty) : undefined,
        parent_category: parentCategory.trim() || undefined,
        sub_category: subCategory.trim() || undefined,
        variant: variant.trim() || undefined,
        notes: notes.trim() || undefined,
        company_id: formCompany,
        company_mode: formMode,
      };
      if (editId) {
        await apiPatch(`/api/items/${editId}`, payload);
      } else {
        await apiPost("/api/items", payload);
      }
      if (formCompany !== activeCompany) setActiveCompany(formCompany);
      if (formMode !== activeMode) setActiveMode(formMode);
      router.back();
    } catch (e) {
      Alert.alert("Save failed", (e as Error).message || "Please try again.");
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
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{editId ? "Edit Item" : "Naya Item"}</Text>
          <Text style={styles.subtitle}>
            Catalog · {editId ? "changes" : "new entry"}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scroll}>
            {/* Mode + Company */}
            <ModeCompanyBlock
              mode={formMode}
              onModeChange={setFormMode}
              company={formCompany}
              onCompanyChange={setFormCompany}
            />

            {/* Photo — Coming Soon */}
            <GlassCard>
              <View style={styles.photoPlaceholder}>
                <Ionicons name="image-outline" size={28} color={colors.textDim} />
                <Text style={styles.photoText}>Photo (Coming Soon)</Text>
              </View>
            </GlassCard>

            {/* Core */}
            <GlassCard>
              <Text style={styles.label}>
                Item Name<Text style={{ color: colors.danger }}> *</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Banarasi Dupatta"
                placeholderTextColor={colors.textDim}
                autoCapitalize="words"
              />

              <View style={styles.rowSplit}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Parent Category</Text>
                  <TextInput
                    style={styles.input}
                    value={parentCategory}
                    onChangeText={setParentCategory}
                    placeholder="e.g. Textile"
                    placeholderTextColor={colors.textDim}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Sub-category</Text>
                  <TextInput
                    style={styles.input}
                    value={subCategory}
                    onChangeText={setSubCategory}
                    placeholder="e.g. Cotton"
                    placeholderTextColor={colors.textDim}
                  />
                </View>
              </View>

              <Text style={styles.label}>Variant (optional)</Text>
              <TextInput
                style={styles.input}
                value={variant}
                onChangeText={setVariant}
                placeholder="e.g. Red / XL / 500ml"
                placeholderTextColor={colors.textDim}
              />

              <Text style={styles.label}>Unit</Text>
              <View style={styles.pillRow}>
                {UNITS.map((u) => {
                  const active = unit === u;
                  return (
                    <TouchableOpacity
                      key={u}
                      onPress={() => setUnit(u)}
                      activeOpacity={0.75}
                      style={[styles.pill, active && styles.pillActive]}
                    >
                      <Text style={[styles.pillText, active && styles.pillTextActive]}>
                        {u}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </GlassCard>

            {/* Pricing */}
            <GlassCard>
              <Text style={styles.sectionHeader}>Pricing</Text>
              <View style={styles.rowSplit}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Buy Price</Text>
                  <TextInput
                    style={styles.input}
                    value={buyPrice}
                    onChangeText={setBuyPrice}
                    placeholder="0"
                    placeholderTextColor={colors.textDim}
                    keyboardType="decimal-pad"
                  />
                  <View style={styles.pillRow}>
                    {(["INR", "THB"] as Currency[]).map((c) => (
                      <TouchableOpacity
                        key={c}
                        onPress={() => setBuyCurrency(c)}
                        activeOpacity={0.75}
                        style={[styles.miniPill, buyCurrency === c && styles.pillActive]}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            buyCurrency === c && styles.pillTextActive,
                          ]}
                        >
                          {c}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Sell Price</Text>
                  <TextInput
                    style={styles.input}
                    value={sellPrice}
                    onChangeText={setSellPrice}
                    placeholder="0"
                    placeholderTextColor={colors.textDim}
                    keyboardType="decimal-pad"
                  />
                  <View style={styles.pillRow}>
                    {(["INR", "THB"] as Currency[]).map((c) => (
                      <TouchableOpacity
                        key={c}
                        onPress={() => setSellCurrency(c)}
                        activeOpacity={0.75}
                        style={[styles.miniPill, sellCurrency === c && styles.pillActive]}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            sellCurrency === c && styles.pillTextActive,
                          ]}
                        >
                          {c}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.marginBox}>
                <Text style={styles.marginLabel}>Margin %</Text>
                <Text
                  style={[
                    styles.marginValue,
                    { color: marginPct >= 0 ? colors.credit : colors.debit },
                  ]}
                >
                  {marginPct}%
                </Text>
              </View>
            </GlassCard>

            {/* Stock + Notes */}
            <GlassCard>
              <Text style={styles.label}>Stock Quantity</Text>
              <TextInput
                style={styles.input}
                value={stockQty}
                onChangeText={setStockQty}
                placeholder="0"
                placeholderTextColor={colors.textDim}
                keyboardType="number-pad"
              />

              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any details worth remembering…"
                placeholderTextColor={colors.textDim}
                multiline
              />
            </GlassCard>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={onSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color={colors.bgSolid} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color={colors.bgSolid} />
                  <Text style={styles.saveBtnText}>
                    {editId ? "Save Changes" : "Item Save Karo"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
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
  scroll: { padding: spacing.lg, paddingBottom: 120, gap: spacing.md },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  label: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 13,
  },
  multiline: {
    minHeight: 60,
    textAlignVertical: "top",
    paddingVertical: 8,
  },
  rowSplit: { flexDirection: "row", gap: spacing.sm },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
  },
  miniPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
  },
  pillActive: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
  },
  pillText: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },
  pillTextActive: { color: colors.brand },
  sectionHeader: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  photoPlaceholder: {
    borderStyle: "dashed",
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  photoText: { color: colors.textDim, fontSize: 11 },
  marginBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.brandSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  marginLabel: { color: colors.textDim, fontSize: 12, fontWeight: "700" },
  marginValue: { fontSize: 18, fontWeight: "900", letterSpacing: -0.3 },
  saveBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.brand,
    borderRadius: radii.pill,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnText: { color: colors.bgSolid, fontSize: 14, fontWeight: "800" },
});
