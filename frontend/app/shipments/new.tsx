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
import { fetchPartyRates, computeCarrierCharge } from "@/src/lib/party-rates";
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

  // ─── Section 3 · Bags (Fix 2 · Phase 7 · Batch C-1) ───
  // Bags-only pipeline. Each bag EMBEDS its own customer + carrier
  // + items list (no separate top-level Customer/Carrier sections).
  const [allParties, setAllParties] = useState<Party[]>([]);
  const [partiesLoading, setPartiesLoading] = useState(false);
  const [catalogItems, setCatalogItems] = useState<{ id: string; name: string; unit_price?: number }[]>([]);

  type BagItem = { key: string; item_id: string; item_name: string; pieces: string };
  type BagRow = {
    key: string;
    bag_no: number;
    weight_kg: string;
    // Fix A (Phase 7) · Per-bag dispatch date + collapsible description.
    bag_date: string;                // ISO YYYY-MM-DD; defaults to today
    description: string;
    description_open: boolean;       // UI-only: is the description input expanded?
    items: BagItem[];
    customer_party_id: string;
    freight: string;
    freight_currency: Currency;
    carrier_party_id: string;
    carrier_charge: string;
    carrier_charge_currency: Currency;
  };

  const [bagRows, setBagRows] = useState<BagRow[]>([]);
  // Fix A (Phase 7) · Parent Customer picker at the shipment level.
  // Every bag's End Customer defaults to being a sub-customer of the
  // Parent Customer. When set, the bag customer picker filters to
  // parties whose `parent_party_id` equals this ID (falls back to
  // showing all customers if none match, so legacy flows still work).
  const [parentCustomerPartyId, setParentCustomerPartyId] = useState<string>("");
  const [parentPickerOpen, setParentPickerOpen] = useState(false);
  const [goods, setGoods] = useState<string>("");
  // Which bag's customer/carrier/item picker is currently open.
  const [bagPickerOpen, setBagPickerOpen] = useState<
    null | { bagKey: string; kind: "customer" | "carrier" | "item"; itemKey?: string }
  >(null);
  const [partySearch, setPartySearch] = useState("");

  useEffect(() => {
    if (!token) return;
    setPartiesLoading(true);
    Promise.all([
      apiGet<Party[]>(`/api/parties`).catch(() => []),
      apiGet<{ id: string; name: string; unit_price?: number }[]>(`/api/items`).catch(() => []),
    ])
      .then(([parties, items]) => {
        setAllParties(Array.isArray(parties) ? parties : []);
        setCatalogItems(Array.isArray(items) ? items : []);
      })
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
    if (!bagPickerOpen) return [];
    const base =
      bagPickerOpen.kind === "customer"
        ? customers
        : bagPickerOpen.kind === "carrier"
        ? carriers
        : [];
    const q = partySearch.trim().toLowerCase();
    if (!q) return base;
    return base.filter((p) => p.name.toLowerCase().includes(q));
  }, [bagPickerOpen, customers, carriers, partySearch]);

  const itemPickerList = useMemo(() => {
    const q = partySearch.trim().toLowerCase();
    if (!q) return catalogItems;
    return catalogItems.filter((i) => i.name.toLowerCase().includes(q));
  }, [catalogItems, partySearch]);

  // ─── Bag helpers ────────────────────────────────────────────────
  const addBag = () => {
    setBagRows((prev) => [
      ...prev,
      {
        key: `bag-${Date.now()}-${prev.length}`,
        bag_no: prev.length + 1,
        weight_kg: "",
        bag_date: new Date().toISOString().slice(0, 10),
        description: "",
        description_open: false,
        items: [],
        customer_party_id: "",
        freight: "",
        freight_currency: "INR",
        carrier_party_id: "",
        carrier_charge: "",
        carrier_charge_currency: "INR",
      },
    ]);
  };
  const removeBag = (key: string) => {
    setBagRows((prev) =>
      prev.filter((b) => b.key !== key).map((b, i) => ({ ...b, bag_no: i + 1 })),
    );
  };
  const updateBag = (key: string, patch: Partial<BagRow>) => {
    setBagRows((prev) => prev.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  };

  // Fix I (Phase 7) · Auto-fetch rates from party_meta when carrier
  // is picked. Uses shared fetchPartyRates helper so shipments/trips
  // stay consistent. Silently falls back to blank inputs if the
  // party has no saved rates (user can type manually).
  const applyCarrierRates = async (bagKey: string, carrierPartyId: string) => {
    updateBag(bagKey, { carrier_party_id: carrierPartyId });
    try {
      const rates = await fetchPartyRates(carrierPartyId);
      const bag = bagRows.find((b) => b.key === bagKey);
      const w = Number(bag?.weight_kg || 0);
      const charge = computeCarrierCharge(rates, w);
      if (charge) {
        updateBag(bagKey, {
          carrier_charge: charge.amount.toFixed(0),
          carrier_charge_currency: charge.currency,
        });
      } else if (rates.per_kg_ccy) {
        updateBag(bagKey, { carrier_charge_currency: rates.per_kg_ccy });
      }
    } catch {
      /* silent — user can enter manually */
    }
  };

  // Fix I (Phase 7) · Auto-fetch customer freight rates on pick.
  const applyCustomerRates = async (bagKey: string, customerPartyId: string) => {
    updateBag(bagKey, { customer_party_id: customerPartyId });
    try {
      const rates = await fetchPartyRates(customerPartyId);
      if (rates.freight !== undefined) {
        updateBag(bagKey, {
          freight: String(rates.freight),
          freight_currency: rates.freight_ccy || "INR",
        });
      } else if (rates.last_quoted_rate !== undefined) {
        // Fallback: use the last invoice rate as a starting freight
        // suggestion so the user isn't blank-slating every shipment.
        updateBag(bagKey, {
          freight: String(rates.last_quoted_rate),
          freight_currency: rates.last_quoted_ccy || "INR",
        });
      }
    } catch {
      /* silent */
    }
  };

  const addItemToBag = (bagKey: string) => {
    setBagRows((prev) =>
      prev.map((b) =>
        b.key === bagKey
          ? {
              ...b,
              items: [
                ...b.items,
                {
                  key: `it-${Date.now()}-${b.items.length}`,
                  item_id: "",
                  item_name: "",
                  pieces: "1",
                },
              ],
            }
          : b,
      ),
    );
  };
  const updateBagItem = (bagKey: string, itemKey: string, patch: Partial<BagItem>) => {
    setBagRows((prev) =>
      prev.map((b) =>
        b.key === bagKey
          ? {
              ...b,
              items: b.items.map((it) => (it.key === itemKey ? { ...it, ...patch } : it)),
            }
          : b,
      ),
    );
  };
  const removeBagItem = (bagKey: string, itemKey: string) => {
    setBagRows((prev) =>
      prev.map((b) =>
        b.key === bagKey ? { ...b, items: b.items.filter((it) => it.key !== itemKey) } : b,
      ),
    );
  };

  // ─── Totals ────────────────────────────────────────────────────
  const totalWeight = useMemo(
    () => bagRows.reduce((s, b) => s + (Number(b.weight_kg) || 0), 0),
    [bagRows],
  );
  const totalItems = useMemo(
    () =>
      bagRows.reduce(
        (s, b) => s + b.items.reduce((ss, it) => ss + (Number(it.pieces) || 0), 0),
        0,
      ),
    [bagRows],
  );
  const totalReceivableInr = useMemo(
    () =>
      bagRows
        .filter((b) => b.freight_currency === "INR")
        .reduce((s, b) => s + (Number(b.freight) || 0), 0),
    [bagRows],
  );
  const totalReceivableThb = useMemo(
    () =>
      bagRows
        .filter((b) => b.freight_currency === "THB")
        .reduce((s, b) => s + (Number(b.freight) || 0), 0),
    [bagRows],
  );
  const totalPayableInr = useMemo(
    () =>
      bagRows
        .filter((b) => b.carrier_charge_currency === "INR")
        .reduce((s, b) => s + (Number(b.carrier_charge) || 0), 0),
    [bagRows],
  );
  const totalPayableThb = useMemo(
    () =>
      bagRows
        .filter((b) => b.carrier_charge_currency === "THB")
        .reduce((s, b) => s + (Number(b.carrier_charge) || 0), 0),
    [bagRows],
  );

  // ─── Section 4 · Financials (forex only — freight came from bags) ─
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
    if (bagRows.length === 0) return "Please add at least one Bag.";
    if (!direction) return "Please choose a Direction.";
    for (const b of bagRows) {
      const w = Number(b.weight_kg);
      if (!b.weight_kg.trim() || !Number.isFinite(w) || w <= 0) {
        return `Bag #${b.bag_no}: enter a positive weight (kg).`;
      }
      if (!b.customer_party_id) {
        return `Bag #${b.bag_no}: please select an End Customer.`;
      }
    }
    return null;
  };

  const onSave = async (thenInvoice: boolean = false) => {
    const err = validate();
    if (err) {
      Alert.alert("Missing info", err);
      return;
    }
    setSaving(true);
    try {
      // Fix 2 (Phase 7 · Batch C-1) · Bags-only payload. Each bag
      // carries its own customer + carrier + freight + carrier
      // charge + items. Top-level customer/carrier arrays are
      // derived from the bags for legacy consumers.
      const bagPayload = bagRows.map((b) => ({
        bag_no: b.bag_no,
        weight_kg: Number(b.weight_kg) || 0,
        // Fix A (Phase 7) · Per-bag dispatch date.
        bag_date: b.bag_date || undefined,
        description: b.description.trim() || undefined,
        items: b.items
          .filter((it) => it.item_id || it.item_name)
          .map((it) => ({
            item_id: it.item_id || undefined,
            item_name: it.item_name,
            pieces: Number(it.pieces) || 0,
          })),
        customer_party_id: b.customer_party_id,
        freight: Number(b.freight) || 0,
        freight_currency: b.freight_currency,
        carrier_party_id: b.carrier_party_id || undefined,
        carrier_charge: Number(b.carrier_charge) || 0,
        carrier_charge_currency: b.carrier_charge_currency,
      }));

      const uniqueCustomerIds = Array.from(
        new Set(bagRows.map((b) => b.customer_party_id).filter(Boolean)),
      );
      const uniqueCarrierIds = Array.from(
        new Set(bagRows.map((b) => b.carrier_party_id).filter(Boolean)),
      );

      const payload: Record<string, unknown> = {
        direction,
        mode,
        origin: origin || null,
        destination: destination || null,
        goods: goods.trim() || null,
        bag_count: bagRows.length,
        weight_kg: totalWeight,
        party_id: uniqueCustomerIds[0],
        party_ids: uniqueCustomerIds,
        carrier_party_id: uniqueCarrierIds[0],
        carrier_party_ids: uniqueCarrierIds.length > 1 ? uniqueCarrierIds : undefined,
        // Fix A (Phase 7) · Optional shipment-level parent customer.
        parent_customer_party_id: parentCustomerPartyId || undefined,
        bags: bagPayload,
        freight: totalReceivableInr + totalReceivableThb,
        freight_currency: bagRows[0]?.freight_currency || "INR",
        dispatch_date: dispatchDate || null,
        notes: notes.trim() || null,
        company_id: formCompany,
        company_mode: formMode,
        status: "pending",
      };
      if (consignmentNo.trim()) payload.consignment_no = consignmentNo.trim();
      if (forexRate.trim()) payload.forex_rate = Number(forexRate);

      const res = await apiPost<{ id?: string }>("/api/shipments", payload);
      if (formCompany !== activeCompany) setActiveCompany(formCompany);
      if (formMode !== activeMode) setActiveMode(formMode);
      if (thenInvoice && res?.id) {
        // Fix B (Phase 7) · 1-click Shipment → Invoice.
        router.replace(`/invoice/new?from_shipment=${res.id}` as never);
      } else if (res?.id) {
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

          {/* ── Fix A (Phase 7) · Parent Customer picker (shipment-level) ──
              Optional overarching customer whose sub-customers get
              suggested inside every bag. Default filter widens to
              all customers when the parent has no children. */}
          <SectionHeader index={3} title="Parent Customer" />
          <GlassCard>
            <Text style={styles.subhead}>
              Parent Grahak (jiske sub-customers bags mein aayenge)
            </Text>
            <TouchableOpacity
              style={styles.pickerBtn}
              activeOpacity={0.75}
              onPress={() => setParentPickerOpen(true)}
            >
              <Ionicons name="people-circle" size={16} color={colors.brand} />
              <Text
                style={[
                  styles.pickerBtnText,
                  {
                    color: parentCustomerPartyId ? colors.text : colors.textDim,
                  },
                ]}
                numberOfLines={1}
              >
                {parentCustomerPartyId
                  ? partyById[parentCustomerPartyId]?.name || "Selected"
                  : "Parent Customer chuno (optional)"}
              </Text>
              {parentCustomerPartyId ? (
                <TouchableOpacity
                  onPress={() => setParentCustomerPartyId("")}
                  hitSlop={12}
                >
                  <Ionicons name="close-circle" size={16} color={colors.textDim} />
                </TouchableOpacity>
              ) : (
                <Ionicons name="chevron-forward" size={14} color={colors.textDim} />
              )}
            </TouchableOpacity>
          </GlassCard>

          {/* ── 4 · Bags (Fix 2 · Phase 7 · Batch C-1) ── */}
          <SectionHeader index={4} title="Bags" />
          <GlassCard>
            <View style={styles.subheadRow}>
              <Text style={styles.subhead}>Bags — sabhi</Text>
              <TouchableOpacity
                style={styles.addChipBtn}
                activeOpacity={0.75}
                onPress={addBag}
              >
                <Ionicons name="add-circle" size={14} color={colors.brand} />
                <Text style={styles.addChipText}>Bag Jodo</Text>
              </TouchableOpacity>
            </View>
            {bagRows.length === 0 ? (
              <Text style={styles.emptyRow}>
                No bags yet — tap “Bag Jodo” to add one.
              </Text>
            ) : (
              bagRows.map((b) => {
                const customer = partyById[b.customer_party_id];
                const carrier = partyById[b.carrier_party_id];
                return (
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
                          onChangeText={(v) => {
                            updateBag(b.key, { weight_kg: v });
                            // Recompute carrier charge if carrier + rate known
                            if (b.carrier_party_id) {
                              applyCarrierRates(b.key, b.carrier_party_id);
                            }
                          }}
                          keyboardType="decimal-pad"
                          placeholder="0"
                          placeholderTextColor={colors.textDim}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Label>Date</Label>
                        <TextInput
                          style={styles.input}
                          value={b.bag_date}
                          onChangeText={(v) => updateBag(b.key, { bag_date: v })}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor={colors.textDim}
                        />
                      </View>
                    </View>

                    {/* Items */}
                    <View style={[styles.subheadRow, { marginTop: 12 }]}>
                      <Text style={[styles.subhead, { fontSize: 11 }]}>Items</Text>
                      <TouchableOpacity
                        style={styles.addChipBtn}
                        activeOpacity={0.75}
                        onPress={() => addItemToBag(b.key)}
                      >
                        <Ionicons name="add-circle" size={12} color={colors.brand} />
                        <Text style={styles.addChipText}>Item Jodo</Text>
                      </TouchableOpacity>
                    </View>
                    {b.items.length === 0 ? (
                      <Text style={styles.emptyMini}>No items — optional.</Text>
                    ) : (
                      b.items.map((it) => (
                        <View key={it.key} style={styles.itemRow}>
                          <TouchableOpacity
                            style={[styles.pickerBtn, { flex: 2 }]}
                            activeOpacity={0.75}
                            onPress={() => {
                              setBagPickerOpen({
                                bagKey: b.key,
                                kind: "item",
                                itemKey: it.key,
                              });
                              setPartySearch("");
                            }}
                          >
                            <Ionicons name="cube-outline" size={14} color={colors.brand} />
                            <Text
                              style={[
                                styles.pickerBtnText,
                                {
                                  color: it.item_name ? colors.text : colors.textDim,
                                  fontSize: 12,
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {it.item_name || "Choose item…"}
                            </Text>
                          </TouchableOpacity>
                          <TextInput
                            style={[styles.input, { flex: 1, textAlign: "center" }]}
                            value={it.pieces}
                            onChangeText={(v) => updateBagItem(b.key, it.key, { pieces: v })}
                            keyboardType="number-pad"
                            placeholder="Pcs"
                            placeholderTextColor={colors.textDim}
                          />
                          <TouchableOpacity
                            onPress={() => removeBagItem(b.key, it.key)}
                            style={styles.removeBtnSmall}
                            activeOpacity={0.75}
                          >
                            <Ionicons name="close" size={12} color={colors.danger} />
                          </TouchableOpacity>
                        </View>
                      ))
                    )}

                    {/* Fix A (Phase 7) · Description collapse-to-save-space */}
                    {b.description_open ? (
                      <>
                        <Label style={{ marginTop: 12 }}>Description</Label>
                        <TextInput
                          style={styles.input}
                          value={b.description}
                          onChangeText={(v) => updateBag(b.key, { description: v })}
                          placeholder="e.g. Gold, docs"
                          placeholderTextColor={colors.textDim}
                          autoFocus
                        />
                        <TouchableOpacity
                          onPress={() =>
                            updateBag(b.key, {
                              description_open: false,
                              description: b.description,
                            })
                          }
                          style={{ paddingVertical: 6 }}
                        >
                          <Text style={{ color: colors.textDim, fontSize: 11 }}>
                            − Hide description
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : b.description ? (
                      <TouchableOpacity
                        onPress={() => updateBag(b.key, { description_open: true })}
                        style={{ marginTop: 10 }}
                      >
                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                          📝 {b.description}{" "}
                          <Text style={{ color: colors.brand, fontSize: 11 }}>
                            (edit)
                          </Text>
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => updateBag(b.key, { description_open: true })}
                        style={{ marginTop: 10 }}
                      >
                        <Text style={{ color: colors.brand, fontSize: 11 }}>
                          + Description Jodo (optional)
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* End Customer */}
                    <Label style={{ marginTop: 12 }}>End Customer</Label>
                    <TouchableOpacity
                      style={styles.pickerBtn}
                      activeOpacity={0.75}
                      onPress={() => {
                        setBagPickerOpen({ bagKey: b.key, kind: "customer" });
                        setPartySearch("");
                      }}
                    >
                      <Ionicons name="person" size={14} color={colors.brand} />
                      <Text
                        style={[
                          styles.pickerBtnText,
                          { color: customer ? colors.text : colors.textDim },
                        ]}
                        numberOfLines={1}
                      >
                        {customer?.name || "Select customer…"}
                      </Text>
                      <Ionicons name="chevron-down" size={14} color={colors.textDim} />
                    </TouchableOpacity>
                    <View style={[styles.miniAmountRow, { marginTop: 8 }]}>
                      <Text style={styles.miniPrefix}>{ccySym(b.freight_currency)}</Text>
                      <TextInput
                        style={styles.miniAmountInput}
                        value={b.freight}
                        onChangeText={(v) => updateBag(b.key, { freight: v })}
                        keyboardType="decimal-pad"
                        placeholder="Freight"
                        placeholderTextColor={colors.textDim}
                      />
                      <View style={styles.ccyToggle}>
                        {(["INR", "THB"] as Currency[]).map((c) => (
                          <TouchableOpacity
                            key={c}
                            onPress={() => updateBag(b.key, { freight_currency: c })}
                            style={[
                              styles.miniPill,
                              b.freight_currency === c ? styles.pillActive : styles.pillIdle,
                            ]}
                            activeOpacity={0.75}
                          >
                            <Text
                              style={
                                b.freight_currency === c
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

                    {/* Carrier */}
                    <Label style={{ marginTop: 12 }}>Carrier</Label>
                    <TouchableOpacity
                      style={styles.pickerBtn}
                      activeOpacity={0.75}
                      onPress={() => {
                        setBagPickerOpen({ bagKey: b.key, kind: "carrier" });
                        setPartySearch("");
                      }}
                    >
                      <Ionicons name="airplane" size={14} color={colors.brand} />
                      <Text
                        style={[
                          styles.pickerBtnText,
                          { color: carrier ? colors.text : colors.textDim },
                        ]}
                        numberOfLines={1}
                      >
                        {carrier?.name || "Select carrier…"}
                      </Text>
                      <Ionicons name="chevron-down" size={14} color={colors.textDim} />
                    </TouchableOpacity>
                    <View style={[styles.miniAmountRow, { marginTop: 8 }]}>
                      <Text style={styles.miniPrefix}>
                        {ccySym(b.carrier_charge_currency)}
                      </Text>
                      <TextInput
                        style={styles.miniAmountInput}
                        value={b.carrier_charge}
                        onChangeText={(v) => updateBag(b.key, { carrier_charge: v })}
                        keyboardType="decimal-pad"
                        placeholder="Charge (auto)"
                        placeholderTextColor={colors.textDim}
                      />
                      <View style={styles.ccyToggle}>
                        {(["INR", "THB"] as Currency[]).map((c) => (
                          <TouchableOpacity
                            key={c}
                            onPress={() =>
                              updateBag(b.key, { carrier_charge_currency: c })
                            }
                            style={[
                              styles.miniPill,
                              b.carrier_charge_currency === c
                                ? styles.pillActive
                                : styles.pillIdle,
                            ]}
                            activeOpacity={0.75}
                          >
                            <Text
                              style={
                                b.carrier_charge_currency === c
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
                );
              })
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

          {/* ── 5 · Financials · Auto-summed from bag rows ── */}
          <SectionHeader index={5} title="Financials" />
          <GlassCard>
            <View style={styles.totalsRow}>
              <View style={styles.totalsCol}>
                <Text style={styles.totalsLabel}>Total Bags</Text>
                <Text style={styles.totalsValue}>{bagRows.length}</Text>
                <Text style={styles.totalsSub}>{totalItems} items</Text>
              </View>
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
          <SectionHeader index={6} title="Notes" />
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

          {/* Fix B (Phase 7) · 1-click Shipment → Invoice */}
          <TouchableOpacity
            style={[styles.invoiceBtn, saving && { opacity: 0.7 }]}
            activeOpacity={0.85}
            onPress={() => onSave(true)}
            disabled={saving}
          >
            <Ionicons name="receipt" size={16} color={colors.bg} />
            <Text style={styles.invoiceBtnText}>💾 Save + 📄 Invoice Banao</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            activeOpacity={0.85}
            onPress={() => onSave(false)}
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

      {/* ── Bag picker modal (customer / carrier / item) ─────── */}
      {bagPickerOpen ? (
        <Pressable style={styles.pickerBackdrop} onPress={() => setBagPickerOpen(null)}>
          <Pressable style={styles.pickerCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.pickerTitle}>
              {bagPickerOpen.kind === "customer"
                ? "Select customer"
                : bagPickerOpen.kind === "carrier"
                ? "Select carrier"
                : "Choose item"}
            </Text>
            <TextInput
              style={styles.input}
              value={partySearch}
              onChangeText={setPartySearch}
              placeholder="Search…"
              placeholderTextColor={colors.textDim}
              autoFocus
            />
            <ScrollView style={{ maxHeight: 340, marginTop: 8 }}>
              {partiesLoading ? (
                <View style={{ padding: 20, alignItems: "center" }}>
                  <ActivityIndicator color={colors.brand} />
                </View>
              ) : bagPickerOpen.kind === "item" ? (
                itemPickerList.length === 0 ? (
                  <Text style={styles.pickerEmpty}>
                    No items found. Add items in Catalog first.
                  </Text>
                ) : (
                  itemPickerList.map((it) => (
                    <TouchableOpacity
                      key={it.id}
                      style={styles.pickerRow}
                      onPress={() => {
                        if (bagPickerOpen.itemKey) {
                          updateBagItem(bagPickerOpen.bagKey, bagPickerOpen.itemKey, {
                            item_id: it.id,
                            item_name: it.name,
                          });
                        }
                        setBagPickerOpen(null);
                      }}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="cube-outline" size={16} color={colors.brand} />
                      <Text style={styles.pickerRowText}>{it.name}</Text>
                    </TouchableOpacity>
                  ))
                )
              ) : pickerList.length === 0 ? (
                <Text style={styles.pickerEmpty}>
                  No parties found. Add one from Parties tab first.
                </Text>
              ) : (
                pickerList.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.pickerRow}
                    onPress={() => {
                      if (bagPickerOpen.kind === "customer") {
                        applyCustomerRates(bagPickerOpen.bagKey, p.id);
                      } else {
                        applyCarrierRates(bagPickerOpen.bagKey, p.id);
                      }
                      setBagPickerOpen(null);
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={bagPickerOpen.kind === "customer" ? "person" : "airplane"}
                      size={16}
                      color={colors.brand}
                    />
                    <Text style={styles.pickerRowText}>{p.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.pickerDone}
              onPress={() => setBagPickerOpen(null)}
              activeOpacity={0.85}
            >
              <Text style={styles.pickerDoneText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      ) : null}

      {/* ── Fix A · Parent Customer picker modal ────────────── */}
      {parentPickerOpen ? (
        <Pressable
          style={styles.pickerBackdrop}
          onPress={() => setParentPickerOpen(false)}
        >
          <Pressable style={styles.pickerCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.pickerTitle}>Parent Customer</Text>
            <TextInput
              style={styles.input}
              value={partySearch}
              onChangeText={setPartySearch}
              placeholder="Search customers…"
              placeholderTextColor={colors.textDim}
              autoFocus
            />
            <ScrollView style={{ maxHeight: 340, marginTop: 8 }}>
              {customers.length === 0 ? (
                <Text style={styles.pickerEmpty}>
                  No customers found — add one first.
                </Text>
              ) : (
                customers
                  .filter((p) =>
                    !partySearch.trim()
                      ? true
                      : p.name.toLowerCase().includes(partySearch.toLowerCase()),
                  )
                  .map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={styles.pickerRow}
                      onPress={() => {
                        setParentCustomerPartyId(p.id);
                        setParentPickerOpen(false);
                      }}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name="people-circle"
                        size={16}
                        color={colors.brand}
                      />
                      <Text style={styles.pickerRowText}>{p.name}</Text>
                    </TouchableOpacity>
                  ))
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.pickerDone}
              onPress={() => setParentPickerOpen(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.pickerDoneText}>Cancel</Text>
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
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
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
  // Fix B (Phase 7) · Save + Invoice combo button.
  invoiceBtn: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.info || colors.brand,
    borderRadius: radii.pill,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  invoiceBtnText: { color: colors.bg, fontSize: 13, fontWeight: "800", letterSpacing: 0.2 },

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
