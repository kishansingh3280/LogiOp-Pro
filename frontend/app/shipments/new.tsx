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
import { ModeCompanyBlock } from "@/src/lib/mode-company-block";
import { colors, radii, spacing } from "@/src/lib/theme";
import { GlassCard } from "@/src/lib/ui";

type Party = { id: string; name: string; role?: string };
type Direction = "IN_TO_TH" | "TH_TO_IN";
type Mode = "air" | "sea" | "land" | "hand_carry";
type Currency = "INR" | "THB";
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

  // ─── Section 3 · Parties & Cargo (Fix 6 · Phase 7 Batch B) ───
  // Multiple customers, multiple carriers, per-bag pipeline.
  const [allParties, setAllParties] = useState<Party[]>([]);
  const [partiesLoading, setPartiesLoading] = useState(false);

  type CustomerRow = { party_id: string; freight: string; currency: Currency };
  type CarrierRow = { party_id: string; charge: string; currency: Currency };
  type BagRow = {
    key: string; // local UI key
    bag_no: number;
    weight_kg: string;
    description: string;
    customer_party_id: string;
    carrier_party_id: string;
  };

  const [customerRows, setCustomerRows] = useState<CustomerRow[]>([]);
  const [carrierRows, setCarrierRows] = useState<CarrierRow[]>([]);
  const [bagRows, setBagRows] = useState<BagRow[]>([]);
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
  const partyById = useMemo(() => {
    const m: Record<string, Party> = {};
    allParties.forEach((p) => (m[p.id] = p));
    return m;
  }, [allParties]);

  const pickerList = useMemo(() => {
    const base = pickerOpen === "customer" ? customers : pickerOpen === "carrier" ? carriers : [];
    const q = partySearch.trim().toLowerCase();
    // Exclude parties already added to the corresponding row set.
    const excluded =
      pickerOpen === "customer"
        ? new Set(customerRows.map((r) => r.party_id))
        : new Set(carrierRows.map((r) => r.party_id));
    const filtered = base.filter((p) => !excluded.has(p.id));
    if (!q) return filtered;
    return filtered.filter((p) => p.name.toLowerCase().includes(q));
  }, [pickerOpen, customers, carriers, partySearch, customerRows, carrierRows]);

  const addCustomer = (id: string) => {
    setCustomerRows((prev) => [
      ...prev,
      { party_id: id, freight: "", currency: "INR" },
    ]);
    setPickerOpen(null);
  };
  const addCarrier = (id: string) => {
    setCarrierRows((prev) => [
      ...prev,
      { party_id: id, charge: "", currency: "INR" },
    ]);
    setPickerOpen(null);
  };
  const removeCustomer = (id: string) => {
    setCustomerRows((prev) => prev.filter((r) => r.party_id !== id));
    // Also clear any bag references to this customer.
    setBagRows((prev) =>
      prev.map((b) =>
        b.customer_party_id === id ? { ...b, customer_party_id: "" } : b,
      ),
    );
  };
  const removeCarrier = (id: string) => {
    setCarrierRows((prev) => prev.filter((r) => r.party_id !== id));
    setBagRows((prev) =>
      prev.map((b) =>
        b.carrier_party_id === id ? { ...b, carrier_party_id: "" } : b,
      ),
    );
  };
  const updateCustomer = (id: string, patch: Partial<CustomerRow>) => {
    setCustomerRows((prev) =>
      prev.map((r) => (r.party_id === id ? { ...r, ...patch } : r)),
    );
  };
  const updateCarrier = (id: string, patch: Partial<CarrierRow>) => {
    setCarrierRows((prev) =>
      prev.map((r) => (r.party_id === id ? { ...r, ...patch } : r)),
    );
  };
  const addBag = () => {
    setBagRows((prev) => [
      ...prev,
      {
        key: `bag-${Date.now()}-${prev.length}`,
        bag_no: prev.length + 1,
        weight_kg: "",
        description: "",
        customer_party_id: customerRows[0]?.party_id || "",
        carrier_party_id: carrierRows[0]?.party_id || "",
      },
    ]);
  };
  const removeBag = (key: string) => {
    setBagRows((prev) =>
      prev
        .filter((b) => b.key !== key)
        .map((b, i) => ({ ...b, bag_no: i + 1 })),
    );
  };
  const updateBag = (key: string, patch: Partial<BagRow>) => {
    setBagRows((prev) => prev.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  };

  // Auto-totals for the Financials section.
  const totalReceivableInr = useMemo(
    () =>
      customerRows
        .filter((r) => r.currency === "INR")
        .reduce((s, r) => s + (Number(r.freight) || 0), 0),
    [customerRows],
  );
  const totalReceivableThb = useMemo(
    () =>
      customerRows
        .filter((r) => r.currency === "THB")
        .reduce((s, r) => s + (Number(r.freight) || 0), 0),
    [customerRows],
  );
  const totalPayableInr = useMemo(
    () =>
      carrierRows
        .filter((r) => r.currency === "INR")
        .reduce((s, r) => s + (Number(r.charge) || 0), 0),
    [carrierRows],
  );
  const totalPayableThb = useMemo(
    () =>
      carrierRows
        .filter((r) => r.currency === "THB")
        .reduce((s, r) => s + (Number(r.charge) || 0), 0),
    [carrierRows],
  );
  const totalWeight = useMemo(
    () => bagRows.reduce((s, b) => s + (Number(b.weight_kg) || 0), 0),
    [bagRows],
  );

  // ─── Section 4 · Financials (forex only — freight came from rows) ─
  const [forexRate, setForexRate] = useState<string>("");

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
    if (customerRows.length === 0) return "Please add at least one Customer.";
    if (!direction) return "Please choose a Direction.";
    for (const r of customerRows) {
      const f = Number(r.freight);
      if (r.freight.trim() && (!Number.isFinite(f) || f < 0)) {
        return "Freight amounts must be non-negative numbers.";
      }
    }
    for (const r of carrierRows) {
      const c = Number(r.charge);
      if (r.charge.trim() && (!Number.isFinite(c) || c < 0)) {
        return "Carrier charges must be non-negative numbers.";
      }
    }
    for (const b of bagRows) {
      const w = Number(b.weight_kg);
      if (b.weight_kg.trim() && (!Number.isFinite(w) || w < 0)) {
        return "Bag weight must be a non-negative number.";
      }
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
      // Fix 6 (Phase 7 · Batch B) — payload now carries `customers` and
      // `bags` arrays. `party_id` / `carrier_party_id(s)` are set from
      // the FIRST row of each collection so legacy consumers still see
      // the primary customer/carrier.
      const bagPayload = bagRows.map((b) => ({
        bag_no: b.bag_no,
        weight_kg: Number(b.weight_kg) || 0,
        description: b.description.trim() || undefined,
        customer_party_id: b.customer_party_id || undefined,
        carrier_party_id: b.carrier_party_id || undefined,
      }));
      const customersPayload = customerRows.map((r) => ({
        party_id: r.party_id,
        freight: Number(r.freight) || 0,
        currency: r.currency,
      }));
      const carriersPayload = carrierRows.map((r) => ({
        party_id: r.party_id,
        charge: Number(r.charge) || 0,
        currency: r.currency,
      }));

      const primaryCustomer = customerRows[0];
      const payload: Record<string, unknown> = {
        direction,
        mode,
        origin: origin || null,
        destination: destination || null,
        goods: goods.trim() || null,
        bag_count: bagRows.length,
        weight_kg: totalWeight,
        party_id: primaryCustomer?.party_id,
        party_ids: customerRows.map((r) => r.party_id),
        customers: customersPayload,
        carriers: carriersPayload,
        bags: bagPayload,
        // Freight fields kept for legacy consumers — use primary
        // customer's freight or fall back to sum of all customer
        // freights (rough total).
        freight:
          primaryCustomer && primaryCustomer.freight.trim()
            ? Number(primaryCustomer.freight) || 0
            : totalReceivableInr + totalReceivableThb,
        freight_currency: primaryCustomer?.currency || "INR",
        dispatch_date: dispatchDate || null,
        notes: notes.trim() || null,
        company_id: formCompany,
        company_mode: formMode,
        status: "pending",
      };
      if (consignmentNo.trim()) payload.consignment_no = consignmentNo.trim();
      if (forexRate.trim()) payload.forex_rate = Number(forexRate);
      if (carrierRows[0]) payload.carrier_party_id = carrierRows[0].party_id;
      if (carrierRows.length > 1) {
        payload.carrier_party_ids = carrierRows.map((r) => r.party_id);
      }
      if (carrierRows[0]?.charge.trim()) {
        payload.carrier_charge = Number(carrierRows[0].charge) || 0;
        payload.carrier_currency = carrierRows[0].currency;
        payload.carrier_charge_type = "flat";
      }

      const res = await apiPost<{ id?: string }>("/api/shipments", payload);
      if (formCompany !== activeCompany) setActiveCompany(formCompany);
      if (formMode !== activeMode) setActiveMode(formMode);
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
          {/* ── 0 · Mode-First (Phase 7 · Fix 5) ─────────────
              Universal rule: transaction Mode selector shown FIRST.
              If Formal → Company field appears. Defaults: Informal +
              (hidden) Awadh. */}
          <SectionHeader index={1} title="Mode" />
          <GlassCard>
            <ModeCompanyBlock
              mode={formMode}
              company={formCompany}
              onModeChange={setFormMode}
              onCompanyChange={setFormCompany}
              showLabel={false}
            />
          </GlassCard>

          {/* ── 1 · Basic Info ─────────────────────────────── */}
          <SectionHeader index={2} title="Basic Info" />
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

          {/* ── 3 · Parties & Cargo (Fix 6 · Phase 7 Batch B) ── */}
          <SectionHeader index={3} title="Parties & Cargo" />
          <GlassCard>
            {/* Customers (multiple) */}
            <View style={styles.subheadRow}>
              <Text style={styles.subhead}>Customers · Grahak</Text>
              <TouchableOpacity
                style={styles.addChipBtn}
                activeOpacity={0.75}
                onPress={() => {
                  setPickerOpen("customer");
                  setPartySearch("");
                }}
              >
                <Ionicons name="add-circle" size={14} color={colors.brand} />
                <Text style={styles.addChipText}>Grahak Jodo</Text>
              </TouchableOpacity>
            </View>
            {customerRows.length === 0 ? (
              <Text style={styles.emptyRow}>No customers yet — tap “Grahak Jodo”.</Text>
            ) : (
              customerRows.map((row) => {
                const p = partyById[row.party_id];
                return (
                  <View key={row.party_id} style={styles.partyRow}>
                    <View style={[styles.avatarSm, styles.avatarCust]}>
                      <Text style={styles.avatarSmText}>
                        {(p?.name || "?").slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginRight: 6 }}>
                      <Text style={styles.partyRowName} numberOfLines={1}>
                        {p?.name || "—"}
                      </Text>
                      <View style={styles.miniAmountRow}>
                        <Text style={styles.miniPrefix}>{ccySym(row.currency)}</Text>
                        <TextInput
                          style={styles.miniAmountInput}
                          value={row.freight}
                          onChangeText={(v) => updateCustomer(row.party_id, { freight: v })}
                          keyboardType="decimal-pad"
                          placeholder="Freight"
                          placeholderTextColor={colors.textDim}
                        />
                        <View style={styles.ccyToggle}>
                          {(["INR", "THB"] as Currency[]).map((c) => (
                            <TouchableOpacity
                              key={c}
                              onPress={() => updateCustomer(row.party_id, { currency: c })}
                              style={[
                                styles.miniPill,
                                row.currency === c ? styles.pillActive : styles.pillIdle,
                              ]}
                              activeOpacity={0.75}
                            >
                              <Text
                                style={
                                  row.currency === c
                                    ? styles.pillTextActive
                                    : styles.pillTextIdle
                                }
                              >
                                {c}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeCustomer(row.party_id)}
                      style={styles.removeBtn}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="close" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}

            {/* Carriers (multiple) */}
            <View style={[styles.subheadRow, { marginTop: 18 }]}>
              <Text style={styles.subhead}>Carriers · Vahak</Text>
              <TouchableOpacity
                style={styles.addChipBtn}
                activeOpacity={0.75}
                onPress={() => {
                  setPickerOpen("carrier");
                  setPartySearch("");
                }}
              >
                <Ionicons name="add-circle" size={14} color={colors.brand} />
                <Text style={styles.addChipText}>Vahak Jodo</Text>
              </TouchableOpacity>
            </View>
            {carrierRows.length === 0 ? (
              <Text style={styles.emptyRow}>No carriers yet — tap “Vahak Jodo”.</Text>
            ) : (
              carrierRows.map((row) => {
                const p = partyById[row.party_id];
                return (
                  <View key={row.party_id} style={styles.partyRow}>
                    <View style={[styles.avatarSm, styles.avatarCarr]}>
                      <Ionicons name="airplane" size={12} color={colors.brand} />
                    </View>
                    <View style={{ flex: 1, marginRight: 6 }}>
                      <Text style={styles.partyRowName} numberOfLines={1}>
                        {p?.name || "—"}
                      </Text>
                      <View style={styles.miniAmountRow}>
                        <Text style={styles.miniPrefix}>{ccySym(row.currency)}</Text>
                        <TextInput
                          style={styles.miniAmountInput}
                          value={row.charge}
                          onChangeText={(v) => updateCarrier(row.party_id, { charge: v })}
                          keyboardType="decimal-pad"
                          placeholder="Charge"
                          placeholderTextColor={colors.textDim}
                        />
                        <View style={styles.ccyToggle}>
                          {(["INR", "THB"] as Currency[]).map((c) => (
                            <TouchableOpacity
                              key={c}
                              onPress={() => updateCarrier(row.party_id, { currency: c })}
                              style={[
                                styles.miniPill,
                                row.currency === c ? styles.pillActive : styles.pillIdle,
                              ]}
                              activeOpacity={0.75}
                            >
                              <Text
                                style={
                                  row.currency === c
                                    ? styles.pillTextActive
                                    : styles.pillTextIdle
                                }
                              >
                                {c}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeCarrier(row.party_id)}
                      style={styles.removeBtn}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="close" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}

            {/* Bags subsection */}
            <View style={[styles.subheadRow, { marginTop: 18 }]}>
              <Text style={styles.subhead}>Bags</Text>
              <TouchableOpacity
                style={styles.addChipBtn}
                activeOpacity={0.75}
                onPress={addBag}
                disabled={customerRows.length === 0 && carrierRows.length === 0}
              >
                <Ionicons name="add-circle" size={14} color={colors.brand} />
                <Text style={styles.addChipText}>Bag Jodo</Text>
              </TouchableOpacity>
            </View>
            {bagRows.length === 0 ? (
              <Text style={styles.emptyRow}>
                No bags yet — add customers / carriers, then “Bag Jodo”.
              </Text>
            ) : (
              bagRows.map((b) => (
                <View key={b.key} style={styles.bagCard}>
                  <View style={styles.bagHead}>
                    <Text style={styles.bagNo}>Bag #{b.bag_no}</Text>
                    <TouchableOpacity
                      onPress={() => removeBag(b.key)}
                      style={styles.removeBtnSmall}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="close" size={14} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.rowSplit}>
                    <View style={{ flex: 1 }}>
                      <Label>Weight (kg)</Label>
                      <TextInput
                        style={styles.input}
                        value={b.weight_kg}
                        onChangeText={(v) => updateBag(b.key, { weight_kg: v })}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={colors.textDim}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Label>Description</Label>
                      <TextInput
                        style={styles.input}
                        value={b.description}
                        onChangeText={(v) => updateBag(b.key, { description: v })}
                        placeholder="e.g. Gold, docs"
                        placeholderTextColor={colors.textDim}
                      />
                    </View>
                  </View>
                  <Label style={{ marginTop: 10 }}>Customer</Label>
                  <View style={styles.pillRow}>
                    {customerRows.map((r) => {
                      const p = partyById[r.party_id];
                      const active = b.customer_party_id === r.party_id;
                      return (
                        <TouchableOpacity
                          key={r.party_id}
                          onPress={() => updateBag(b.key, { customer_party_id: r.party_id })}
                          activeOpacity={0.75}
                          style={activePill(active)}
                        >
                          <Text style={activePillText(active)}>{p?.name || "—"}</Text>
                        </TouchableOpacity>
                      );
                    })}
                    {customerRows.length === 0 ? (
                      <Text style={styles.emptyMini}>Add a customer first</Text>
                    ) : null}
                  </View>
                  <Label style={{ marginTop: 10 }}>Carrier</Label>
                  <View style={styles.pillRow}>
                    {carrierRows.map((r) => {
                      const p = partyById[r.party_id];
                      const active = b.carrier_party_id === r.party_id;
                      return (
                        <TouchableOpacity
                          key={r.party_id}
                          onPress={() => updateBag(b.key, { carrier_party_id: r.party_id })}
                          activeOpacity={0.75}
                          style={activePill(active)}
                        >
                          <Text style={activePillText(active)}>{p?.name || "—"}</Text>
                        </TouchableOpacity>
                      );
                    })}
                    {carrierRows.length === 0 ? (
                      <Text style={styles.emptyMini}>Add a carrier first</Text>
                    ) : null}
                  </View>
                </View>
              ))
            )}

            <Label style={{ marginTop: 14 }}>Goods (overall description)</Label>
            <TextInput
              style={styles.input}
              value={goods}
              onChangeText={setGoods}
              placeholder="e.g. Samples, Documents"
              placeholderTextColor={colors.textDim}
            />
          </GlassCard>

          {/* ── 4 · Financials · Auto-summed from customer/carrier rows */}
          <SectionHeader index={4} title="Financials" />
          <GlassCard>
            <View style={styles.totalsRow}>
              <View style={styles.totalsCol}>
                <Text style={styles.totalsLabel}>Total Milna Hai</Text>
                <Text style={[styles.totalsValue, { color: colors.credit }]}>
                  ₹{totalReceivableInr.toLocaleString()}
                </Text>
                {totalReceivableThb > 0 ? (
                  <Text style={[styles.totalsSub, { color: colors.credit }]}>
                    ฿{totalReceivableThb.toLocaleString()}
                  </Text>
                ) : null}
              </View>
              <View style={styles.totalsCol}>
                <Text style={styles.totalsLabel}>Total Dena Hai</Text>
                <Text style={[styles.totalsValue, { color: colors.debit }]}>
                  ₹{totalPayableInr.toLocaleString()}
                </Text>
                {totalPayableThb > 0 ? (
                  <Text style={[styles.totalsSub, { color: colors.debit }]}>
                    ฿{totalPayableThb.toLocaleString()}
                  </Text>
                ) : null}
              </View>
              <View style={styles.totalsCol}>
                <Text style={styles.totalsLabel}>Total Weight</Text>
                <Text style={styles.totalsValue}>{totalWeight.toFixed(1)} kg</Text>
                <Text style={styles.totalsSub}>{bagRows.length} bag(s)</Text>
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
          </GlassCard>

          {/* ── 4 · Meta ──────────────────────────────────── */}
          <SectionHeader index={5} title="Notes" />
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
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={styles.pickerRow}
                      onPress={() => {
                        if (pickerOpen === "customer") addCustomer(p.id);
                        else addCarrier(p.id);
                      }}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="add-circle" size={18} color={colors.brand} />
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

  // ── Fix 6 (Phase 7 · Batch B) · Multi-party + bag styles ──
  subheadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  subhead: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
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
  addChipText: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "800",
  },
  emptyRow: {
    color: colors.textDim,
    fontSize: 11,
    fontStyle: "italic",
    paddingVertical: 8,
  },
  partyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  avatarSm: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  avatarCust: {
    backgroundColor: "rgba(0,200,255,0.14)",
    borderColor: "rgba(0,200,255,0.4)",
  },
  avatarCarr: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brandBorder,
  },
  avatarSmText: {
    color: "#00C8FF",
    fontSize: 12,
    fontWeight: "800",
  },
  partyRowName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  miniAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  miniPrefix: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "800",
    minWidth: 12,
  },
  miniAmountInput: {
    flex: 1,
    minWidth: 60,
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.sm,
    backgroundColor: colors.card,
  },
  ccyToggle: {
    flexDirection: "row",
    gap: 4,
  },
  miniPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  removeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: "rgba(255,68,68,0.55)",
  },
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
  bagCard: {
    marginTop: 10,
    padding: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  bagHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  bagNo: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  emptyMini: {
    color: colors.textDim,
    fontSize: 11,
    fontStyle: "italic",
  },
  totalsRow: {
    flexDirection: "row",
    gap: 8,
  },
  totalsCol: {
    flex: 1,
    padding: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    alignItems: "flex-start",
  },
  totalsLabel: {
    color: colors.textDim,
    fontSize: 9,
    letterSpacing: 0.5,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  totalsValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 4,
  },
  totalsSub: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },

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
