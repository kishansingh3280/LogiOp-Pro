/**
 * New Shipment — Phase 6 · Fix 9.
 *
 * Full mobile-first creation form for a shipment. Wired to
 * POST /api/shipments. Four sections:
 *   1. Basic Info       — Direction · Mode · Origin · Destination · Dispatch date
 *   2. Parties & Cargo  — Customer · Carrier(s) · Weight · Bags · Goods
 *   3. Financials       — Freight + currency · Forex rate · Carrier charge + currency + type
 *   4. Meta             — Notes · Company · Mode (defaults Awadh / Informal)
 *
 * Universal Form Rule respected: Company defaults to "Awadh",
 * Mode defaults to "Informal".
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
import { colors, radii, spacing } from "@/src/lib/theme";
import { GlassCard } from "@/src/lib/ui";

type Party = { id: string; name: string; role?: string };
type Direction = "IN_TO_TH" | "TH_TO_IN";
type Mode = "air" | "sea" | "land" | "hand_carry";
type Currency = "INR" | "THB";
type CarrierChargeType = "flat" | "per_kg";
type Company = "awadh" | "singh_exports";
type CompanyMode = "informal" | "formal";

const DIRECTIONS: { key: Direction; label: string; icon: "airplane" | "airplane-outline" }[] = [
  { key: "IN_TO_TH", label: "IN → TH", icon: "airplane" },
  { key: "TH_TO_IN", label: "TH → IN", icon: "airplane-outline" },
];

// Fix 9 (Phase 6 · retest) · Shipment transport mode — must match
// backend literal {air, sea, land, hand_carry}. Company-mode
// (Informal/Formal) lives in Section 4 and is a separate field.
const MODES: { key: Mode; label: string }[] = [
  { key: "hand_carry", label: "Hand Carry" },
  { key: "air", label: "Air" },
  { key: "sea", label: "Sea" },
  { key: "land", label: "Land" },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function NewShipmentScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { activeCompany, activeMode, setActiveCompany, setActiveMode } = useCompany();

  // ─── Section 1 · Basic Info ───────────────────────────────────
  const [direction, setDirection] = useState<Direction>("IN_TO_TH");
  const [mode, setModeLocal] = useState<Mode>("hand_carry");
  const [origin, setOrigin] = useState<string>("");
  const [destination, setDestination] = useState<string>("");
  const [dispatchDate, setDispatchDate] = useState<string>(todayISO());
  const [consignmentNo, setConsignmentNo] = useState<string>("");

  // Auto-set origin/destination on direction toggle.
  useEffect(() => {
    if (direction === "IN_TO_TH") {
      if (!origin) setOrigin("Delhi");
      if (!destination) setDestination("Bangkok");
    } else {
      if (!origin) setOrigin("Bangkok");
      if (!destination) setDestination("Delhi");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction]);

  // ─── Section 2 · Parties & Cargo ──────────────────────────────
  const [allParties, setAllParties] = useState<Party[]>([]);
  const [partiesLoading, setPartiesLoading] = useState(false);
  const [customerId, setCustomerId] = useState<string>("");
  const [carrierIds, setCarrierIds] = useState<string[]>([]); // multi
  const [weight, setWeight] = useState<string>("");
  const [bags, setBags] = useState<string>("1");
  const [goods, setGoods] = useState<string>("");
  const [pickerOpen, setPickerOpen] = useState<null | "customer" | "carrier">(null);
  const [partySearch, setPartySearch] = useState("");

  useEffect(() => {
    if (!token) return;
    setPartiesLoading(true);
    apiGet<Party[]>(`/api/parties`)
      .then((rows) => setAllParties(Array.isArray(rows) ? rows : []))
      .catch(() => setAllParties([]))
      .finally(() => setPartiesLoading(false));
  }, [token]);

  const customers = useMemo(
    () => allParties.filter((p) => (p.role || "").toLowerCase() === "customer"),
    [allParties],
  );
  const carriers = useMemo(
    () => allParties.filter((p) => (p.role || "").toLowerCase() === "carrier"),
    [allParties],
  );

  const selectedCustomer = useMemo(
    () => customers.find((p) => p.id === customerId) || null,
    [customers, customerId],
  );
  const selectedCarriers = useMemo(
    () => carriers.filter((p) => carrierIds.includes(p.id)),
    [carriers, carrierIds],
  );

  const pickerList = useMemo(() => {
    const base = pickerOpen === "customer" ? customers : pickerOpen === "carrier" ? carriers : [];
    const q = partySearch.trim().toLowerCase();
    if (!q) return base;
    return base.filter((p) => p.name.toLowerCase().includes(q));
  }, [pickerOpen, customers, carriers, partySearch]);

  const toggleCarrier = (id: string) => {
    setCarrierIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // ─── Section 3 · Financials ───────────────────────────────────
  const [freight, setFreight] = useState<string>("");
  const [freightCcy, setFreightCcy] = useState<Currency>("INR");
  const [forexRate, setForexRate] = useState<string>("");
  const [carrierCharge, setCarrierCharge] = useState<string>("");
  const [carrierCcy, setCarrierCcy] = useState<Currency>("INR");
  const [carrierChargeType, setCarrierChargeType] = useState<CarrierChargeType>("flat");

  // ─── Section 4 · Meta ─────────────────────────────────────────
  const [notes, setNotes] = useState<string>("");
  const [formCompany, setFormCompany] = useState<Company>(activeCompany);
  const [formMode, setFormMode] = useState<CompanyMode>(
    activeMode === "informal" || activeMode === "formal" ? activeMode : "informal",
  );

  // Keep the form's Universal Rule default aligned with global context
  // when it first loads (defaults to Awadh / Informal on cold-open).
  useEffect(() => {
    setFormCompany(activeCompany);
  }, [activeCompany]);
  useEffect(() => {
    setFormMode(activeMode === "informal" || activeMode === "formal" ? activeMode : "informal");
  }, [activeMode]);

  // ─── Save ─────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);

  const validate = (): string | null => {
    if (!customerId) return "Please select a Customer.";
    if (!direction) return "Please choose a Direction.";
    if (!weight.trim()) return "Please enter Weight (kg).";
    const w = Number(weight);
    if (!Number.isFinite(w) || w <= 0) return "Weight must be a positive number.";
    const b = Number(bags || "0");
    if (!Number.isFinite(b) || b < 0) return "Bag count must be zero or more.";
    if (freight.trim()) {
      const f = Number(freight);
      if (!Number.isFinite(f) || f < 0) return "Freight must be a non-negative number.";
    }
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
        direction,
        mode,
        origin: origin || null,
        destination: destination || null,
        goods: goods.trim() || null,
        bag_count: Number(bags || "0") || 0,
        weight_kg: Number(weight),
        freight: freight.trim() ? Number(freight) : 0,
        freight_currency: freightCcy,
        party_id: customerId,
        dispatch_date: dispatchDate || null,
        notes: notes.trim() || null,
        company_id: formCompany,
        company_mode: formMode,
        status: "pending",
      };
      if (consignmentNo.trim()) payload.consignment_no = consignmentNo.trim();
      if (forexRate.trim()) payload.forex_rate = Number(forexRate);
      if (carrierIds[0]) payload.carrier_party_id = carrierIds[0];
      if (carrierIds.length > 1) payload.carrier_party_ids = carrierIds;
      if (carrierCharge.trim()) {
        payload.carrier_charge = Number(carrierCharge);
        payload.carrier_currency = carrierCcy;
        payload.carrier_charge_type = carrierChargeType;
      }

      const res = await apiPost<{ id?: string }>("/api/shipments", payload);
      // Persist the form's chosen company/mode to the global context so
      // subsequent screens honor the user's selection.
      if (formCompany !== activeCompany) setActiveCompany(formCompany);
      if (formMode !== activeMode) setActiveMode(formMode);
      // Route to the freshly created shipment (or list if id missing).
      if (res?.id) {
        router.replace(`/shipment/${res.id}` as never);
      } else {
        router.replace("/shipments" as never);
      }
    } catch (e) {
      Alert.alert("Could not save", (e as Error).message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const activePill = (active: boolean) =>
    active ? [styles.pill, styles.pillActive] : [styles.pill, styles.pillIdle];
  const activePillText = (active: boolean) =>
    active ? styles.pillTextActive : styles.pillTextIdle;

  const ccySym = (c: Currency) => (c === "INR" ? "₹" : "฿");

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>New Shipment</Text>
          <Text style={styles.subtitle}>Create a shipment record — 4 quick sections</Text>
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
          {/* ── 1 · Basic Info ─────────────────────────────── */}
          <SectionHeader index={1} title="Basic Info" />
          <GlassCard>
            <Label>Direction</Label>
            <View style={styles.pillRow}>
              {DIRECTIONS.map((d) => (
                <TouchableOpacity
                  key={d.key}
                  onPress={() => setDirection(d.key)}
                  activeOpacity={0.75}
                  style={activePill(direction === d.key)}
                >
                  <Ionicons
                    name={d.icon}
                    size={13}
                    color={direction === d.key ? colors.brand : colors.textDim}
                  />
                  <Text style={activePillText(direction === d.key)}>{d.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Label style={{ marginTop: 14 }}>Mode</Label>
            <View style={styles.pillRow}>
              {MODES.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  onPress={() => setModeLocal(m.key)}
                  activeOpacity={0.75}
                  style={activePill(mode === m.key)}
                >
                  <Text style={activePillText(mode === m.key)}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.rowSplit}>
              <View style={{ flex: 1 }}>
                <Label>Origin</Label>
                <TextInput
                  style={styles.input}
                  value={origin}
                  onChangeText={setOrigin}
                  placeholder="Delhi"
                  placeholderTextColor={colors.textDim}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Label>Destination</Label>
                <TextInput
                  style={styles.input}
                  value={destination}
                  onChangeText={setDestination}
                  placeholder="Bangkok"
                  placeholderTextColor={colors.textDim}
                />
              </View>
            </View>

            <View style={styles.rowSplit}>
              <View style={{ flex: 1 }}>
                <Label>Dispatch date</Label>
                <TextInput
                  style={styles.input}
                  value={dispatchDate}
                  onChangeText={setDispatchDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textDim}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Label>Consignment no. (optional)</Label>
                <TextInput
                  style={styles.input}
                  value={consignmentNo}
                  onChangeText={setConsignmentNo}
                  placeholder="Auto-assigned"
                  placeholderTextColor={colors.textDim}
                  autoCapitalize="characters"
                />
              </View>
            </View>
          </GlassCard>

          {/* ── 2 · Parties & Cargo ────────────────────────── */}
          <SectionHeader index={2} title="Parties & Cargo" />
          <GlassCard>
            <Label>Customer</Label>
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() => {
                setPickerOpen("customer");
                setPartySearch("");
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="person" size={16} color={colors.brand} />
              <Text
                style={[
                  styles.pickerBtnText,
                  { color: selectedCustomer ? colors.text : colors.textDim },
                ]}
                numberOfLines={1}
              >
                {selectedCustomer ? selectedCustomer.name : "Select customer…"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textDim} />
            </TouchableOpacity>

            <Label style={{ marginTop: 14 }}>Carrier(s)</Label>
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() => {
                setPickerOpen("carrier");
                setPartySearch("");
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="airplane" size={16} color={colors.brand} />
              <Text
                style={[
                  styles.pickerBtnText,
                  { color: selectedCarriers.length ? colors.text : colors.textDim },
                ]}
                numberOfLines={1}
              >
                {selectedCarriers.length
                  ? selectedCarriers.map((c) => c.name).join(", ")
                  : "Add carriers…"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textDim} />
            </TouchableOpacity>

            <View style={styles.rowSplit}>
              <View style={{ flex: 1 }}>
                <Label>Weight (kg)</Label>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textDim}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Label>Bag count</Label>
                <TextInput
                  style={styles.input}
                  value={bags}
                  onChangeText={setBags}
                  keyboardType="number-pad"
                  placeholder="1"
                  placeholderTextColor={colors.textDim}
                />
              </View>
            </View>

            <Label style={{ marginTop: 14 }}>Goods (optional)</Label>
            <TextInput
              style={styles.input}
              value={goods}
              onChangeText={setGoods}
              placeholder="e.g. Samples, Documents"
              placeholderTextColor={colors.textDim}
            />
          </GlassCard>

          {/* ── 3 · Financials ─────────────────────────────── */}
          <SectionHeader index={3} title="Financials" />
          <GlassCard>
            <Label>Freight (customer will pay)</Label>
            <View style={styles.amountRow}>
              <View style={styles.ccyPickerGroup}>
                {(["INR", "THB"] as Currency[]).map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setFreightCcy(c)}
                    activeOpacity={0.75}
                    style={activePill(freightCcy === c)}
                  >
                    <Text style={activePillText(freightCcy === c)}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.amountBox}>
                <Text style={styles.amountPrefix}>{ccySym(freightCcy)}</Text>
                <TextInput
                  style={styles.amountInput}
                  value={freight}
                  onChangeText={setFreight}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.textDim}
                />
              </View>
            </View>

            <Label style={{ marginTop: 14 }}>Forex rate (optional)</Label>
            <TextInput
              style={styles.input}
              value={forexRate}
              onChangeText={setForexRate}
              keyboardType="decimal-pad"
              placeholder="e.g. 2.4"
              placeholderTextColor={colors.textDim}
            />

            <Label style={{ marginTop: 14 }}>Carrier charge (you will pay)</Label>
            <View style={styles.amountRow}>
              <View style={styles.ccyPickerGroup}>
                {(["INR", "THB"] as Currency[]).map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCarrierCcy(c)}
                    activeOpacity={0.75}
                    style={activePill(carrierCcy === c)}
                  >
                    <Text style={activePillText(carrierCcy === c)}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.amountBox}>
                <Text style={styles.amountPrefix}>{ccySym(carrierCcy)}</Text>
                <TextInput
                  style={styles.amountInput}
                  value={carrierCharge}
                  onChangeText={setCarrierCharge}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.textDim}
                />
              </View>
            </View>
            <View style={[styles.pillRow, { marginTop: 8 }]}>
              {(["flat", "per_kg"] as CarrierChargeType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setCarrierChargeType(t)}
                  activeOpacity={0.75}
                  style={activePill(carrierChargeType === t)}
                >
                  <Text style={activePillText(carrierChargeType === t)}>
                    {t === "flat" ? "Flat" : "Per kg"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>

          {/* ── 4 · Meta ──────────────────────────────────── */}
          <SectionHeader index={4} title="Notes & Company" />
          <GlassCard>
            <Label>Notes (optional)</Label>
            <TextInput
              style={[styles.input, { height: 88, textAlignVertical: "top" }]}
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="Anything important to remember for this shipment…"
              placeholderTextColor={colors.textDim}
            />

            <Label style={{ marginTop: 14 }}>Company</Label>
            <View style={styles.pillRow}>
              <TouchableOpacity
                onPress={() => setFormCompany("awadh")}
                activeOpacity={0.75}
                style={activePill(formCompany === "awadh")}
              >
                <Text style={activePillText(formCompany === "awadh")}>Awadh</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFormCompany("singh_exports")}
                activeOpacity={0.75}
                style={activePill(formCompany === "singh_exports")}
              >
                <Text style={activePillText(formCompany === "singh_exports")}>Singh Exports</Text>
              </TouchableOpacity>
            </View>

            <Label style={{ marginTop: 14 }}>Mode</Label>
            <View style={styles.pillRow}>
              <TouchableOpacity
                onPress={() => setFormMode("informal")}
                activeOpacity={0.75}
                style={activePill(formMode === "informal")}
              >
                <Text style={activePillText(formMode === "informal")}>Informal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFormMode("formal")}
                activeOpacity={0.75}
                style={activePill(formMode === "formal")}
              >
                <Text style={activePillText(formMode === "formal")}>Formal</Text>
              </TouchableOpacity>
            </View>
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
                <Text style={styles.saveBtnText}>Save Shipment</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Party picker modal ─────────────────────────────── */}
      {pickerOpen ? (
        <Pressable style={styles.pickerBackdrop} onPress={() => setPickerOpen(null)}>
          <Pressable style={styles.pickerCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.pickerTitle}>
              {pickerOpen === "customer" ? "Select customer" : "Select carrier(s)"}
            </Text>
            <TextInput
              style={styles.input}
              value={partySearch}
              onChangeText={setPartySearch}
              placeholder="Search by name…"
              placeholderTextColor={colors.textDim}
              autoFocus
            />
            <ScrollView style={{ maxHeight: 340, marginTop: 8 }}>
              {partiesLoading ? (
                <View style={{ padding: 20, alignItems: "center" }}>
                  <ActivityIndicator color={colors.brand} />
                </View>
              ) : pickerList.length === 0 ? (
                <Text style={styles.pickerEmpty}>
                  No parties found. Add one from the Parties tab first.
                </Text>
              ) : (
                pickerList.map((p) => {
                  const isSelected =
                    pickerOpen === "customer"
                      ? customerId === p.id
                      : carrierIds.includes(p.id);
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.pickerRow, isSelected && styles.pickerRowActive]}
                      onPress={() => {
                        if (pickerOpen === "customer") {
                          setCustomerId(p.id);
                          setPickerOpen(null);
                        } else {
                          toggleCarrier(p.id);
                        }
                      }}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={
                          pickerOpen === "customer"
                            ? isSelected
                              ? "radio-button-on"
                              : "radio-button-off"
                            : isSelected
                            ? "checkbox"
                            : "square-outline"
                        }
                        size={18}
                        color={isSelected ? colors.brand : colors.textDim}
                      />
                      <Text style={styles.pickerRowText}>{p.name}</Text>
                    </TouchableOpacity>
                  );
                })
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

// ─── Small building blocks ──────────────────────────────────────
function SectionHeader({ index, title }: { index: number; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionNum}>
        <Text style={styles.sectionNumText}>{index}</Text>
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function Label({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return <Text style={[styles.label, style]}>{children}</Text>;
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

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionNumText: { color: colors.brand, fontSize: 11, fontWeight: "800" },
  sectionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 6,
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
  rowSplit: { flexDirection: "row", gap: 10, marginTop: 12 },

  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillIdle: { borderColor: colors.cardBorder, backgroundColor: "transparent" },
  pillActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  pillTextIdle: { color: colors.textDim, fontSize: 12, fontWeight: "700" },
  pillTextActive: { color: colors.brand, fontSize: 12, fontWeight: "800" },

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

  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  ccyPickerGroup: { flexDirection: "row", gap: 6 },
  amountBox: {
    flex: 1,
    minWidth: 140,
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
  amountPrefix: { color: colors.brand, fontSize: 15, fontWeight: "800" },
  amountInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    padding: 0,
  },

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

  // Party picker
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
