import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
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

import { apiGet, apiPost, apiPut } from "@/src/api/client";
import { useApi } from "@/src/api/hooks";
import type { Currency, Direction, Party, Shipment, ShipmentMode } from "@/src/api/types";
import { ItemPicker } from "@/src/components/item-picker";
import { toast } from "@/src/components/toast";
import { colors, radii, spacing } from "@/src/theme";

const DIRECTIONS: { key: Direction; label: string }[] = [
  { key: "IN_TO_TH", label: "IN → TH" },
  { key: "TH_TO_IN", label: "TH → IN" },
];
const MODES: ShipmentMode[] = ["air", "sea", "land", "hand_carry"];

export default function NewShipmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ editId?: string }>();
  const editId = params.editId || null;
  const isEdit = !!editId;
  const parties = useApi<Party[]>("/api/parties");

  const [consignmentNo, setConsignmentNo] = useState("");
  const [direction, setDirection] = useState<Direction>("IN_TO_TH");
  const [mode, setMode] = useState<ShipmentMode>("air");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [freight, setFreight] = useState("");
  const [freightCcy, setFreightCcy] = useState<Currency>("THB");
  const [forexRate, setForexRate] = useState("");
  const [carrierId, setCarrierId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [pickCarrier, setPickCarrier] = useState(false);

  // Per-bag rows: each bag can be assigned to a different customer AND
  // can hold multiple line-items (each with its own qty + unit). This
  // replaces the old top-level "Party / Client" field so multi-customer
  // consignments can be booked in one shot.
  interface BagItemRow {
    item_id: string;
    name: string;
    quantity: string;
    unit: string;
  }
  interface BagRow {
    bag_no: string;         // display only (auto-numbered)
    weight_kg: string;
    end_customer_id: string | null;
    items: BagItemRow[];
  }
  const [bags, setBags] = useState<BagRow[]>([
    { bag_no: "BAG-001", weight_kg: "", end_customer_id: null, items: [] },
  ]);
  const [pickBagIdx, setPickBagIdx] = useState<number | null>(null);
  const [pickItemBagIdx, setPickItemBagIdx] = useState<number | null>(null);

  const customers = useMemo(
    () => (parties.data || []).filter((p) => p.role === "customer"),
    [parties.data],
  );
  const carriers = useMemo(
    () => (parties.data || []).filter((p) => p.role === "carrier" || p.role === "vendor"),
    [parties.data],
  );

  const currentCarrier = (parties.data || []).find((p) => p.id === carrierId);
  const totalBagWeight = useMemo(
    () => bags.reduce((s, b) => s + (parseFloat(b.weight_kg) || 0), 0),
    [bags],
  );

  // Bag-row mutators
  const addBag = () => {
    setBags((prev) => [
      ...prev,
      {
        bag_no: `BAG-${String(prev.length + 1).padStart(3, "0")}`,
        weight_kg: "",
        end_customer_id: null,
        items: [],
      },
    ]);
  };
  const removeBag = (idx: number) => {
    setBags((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.slice(0, idx).concat(prev.slice(idx + 1));
      return next.map((b, i) => ({ ...b, bag_no: `BAG-${String(i + 1).padStart(3, "0")}` }));
    });
  };
  const patchBag = (idx: number, patch: Partial<BagRow>) => {
    setBags((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  };
  const addItemToBag = (idx: number, item: { id: string; name: string; unit: string }) => {
    setBags((prev) => prev.map((b, i) =>
      i === idx
        ? { ...b, items: [...b.items, { item_id: item.id, name: item.name, quantity: "1", unit: item.unit || "pcs" }] }
        : b,
    ));
  };
  const removeItemFromBag = (bagIdx: number, itemIdx: number) => {
    setBags((prev) => prev.map((b, i) =>
      i === bagIdx ? { ...b, items: b.items.filter((_, j) => j !== itemIdx) } : b,
    ));
  };
  const patchItemInBag = (bagIdx: number, itemIdx: number, patch: Partial<BagItemRow>) => {
    setBags((prev) => prev.map((b, i) =>
      i === bagIdx
        ? { ...b, items: b.items.map((it, j) => (j === itemIdx ? { ...it, ...patch } : it)) }
        : b,
    ));
  };

  // Prefill fields when in edit mode. Loads once when the screen mounts.
  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await apiGet<Shipment>(`/api/shipments/${editId}`);
        if (cancelled) return;
        setConsignmentNo(s.consignment_no || "");
        setDirection((s.direction as Direction) || "IN_TO_TH");
        setMode((s.mode as ShipmentMode) || "air");
        setOrigin(s.origin || "");
        setDestination(s.destination || "");
        setFreight(String(s.freight ?? ""));
        setFreightCcy((s.freight_currency as Currency) || "THB");
        setForexRate(String(s.forex_rate ?? ""));
        setCarrierId(s.carrier_party_id || null);
        setNotes(s.notes || "");
        // Load existing bags into the per-bag editor.
        try {
          const rawBags = await apiGet<{ id: string; bag_no: string; weight_kg: number; end_customer_id: string | null; items?: { item_id: string; name: string; quantity: number; unit: string }[] }[]>(
            `/api/shipments/${editId}/bags`,
          );
          if (!cancelled && Array.isArray(rawBags) && rawBags.length > 0) {
            setBags(
              rawBags.map((b, i) => ({
                bag_no: b.bag_no || `BAG-${String(i + 1).padStart(3, "0")}`,
                weight_kg: String(b.weight_kg ?? ""),
                end_customer_id: b.end_customer_id || null,
                items: (b.items || []).map((it) => ({
                  item_id: it.item_id,
                  name: it.name,
                  quantity: String(it.quantity ?? ""),
                  unit: it.unit || "pcs",
                })),
              })),
            );
          }
        } catch {
          // best effort — leave the default single-row placeholder
        }
      } catch (e) {
        toast.error(`Failed to load: ${(e as Error).message}`);
      }
    })();
    return () => { cancelled = true; };
  }, [editId]);

  const submit = async () => {
    if (!consignmentNo.trim()) {
      toast.warn("Consignment number is required");
      return;
    }
    // At least one bag must be assigned to a customer — otherwise there's
    // no ledger link to bill the shipment against.
    const firstAssigned = bags.find((b) => !!b.end_customer_id);
    if (!firstAssigned) {
      toast.warn("Assign each bag to a party/customer");
      return;
    }
    setBusy(true);
    try {
      // The backend still requires a `party_id` on the shipment (it treats
      // it as the "primary client"). We use the first bag's customer so the
      // record stays queryable in the parties view — but the real per-bag
      // billing happens through each bag's `end_customer_id`.
      const primaryPartyId = firstAssigned.end_customer_id!;
      const totalBags = bags.length;
      const totalWeightKg = bags.reduce((s, b) => s + (parseFloat(b.weight_kg) || 0), 0);
      const shipmentPayload = {
        consignment_no: consignmentNo.trim(),
        party_id: primaryPartyId,
        direction,
        mode,
        origin,
        destination,
        bag_count: totalBags,
        weight_kg: totalWeightKg,
        freight: Number(freight) || 0,
        freight_currency: freightCcy,
        forex_rate: Number(forexRate) || 0,
        carrier_party_id: carrierId,
        status: "pending",
        dispatch_date: new Date().toISOString().slice(0, 10),
        notes,
      };
      const saved = isEdit
        ? await apiPut<Shipment>(`/api/shipments/${editId}`, shipmentPayload)
        : await apiPost<Shipment>("/api/shipments", shipmentPayload);
      if ((saved as { queued?: boolean }).queued) {
        toast.info(`Queued • ${consignmentNo.trim()} will sync when online`);
        router.back();
        return;
      }

      // Once the shipment exists, sync bag-level details. The backend
      // auto-creates N empty bags on shipment create/update; we PUT each
      // one with its customer + weight so the ledger + FIFO planner have
      // per-bag data.
      let liveBags: { id: string }[] = [];
      try {
        liveBags = await apiGet<{ id: string; bag_no: string }[]>(
          `/api/shipments/${saved.id}/bags`,
        );
      } catch {
        liveBags = [];
      }
      const bagUpdates = liveBags.slice(0, bags.length).map((lb, i) => {
        const row = bags[i];
        return apiPut(`/api/bags/${lb.id}`, {
          end_customer_id: row.end_customer_id,
          weight_kg: parseFloat(row.weight_kg) || 0,
          items: row.items.map((it) => ({
            item_id: it.item_id,
            name: it.name,
            quantity: parseFloat(it.quantity) || 0,
            unit: it.unit,
          })),
        }).catch((e) => {
          console.warn(`Bag ${i + 1} update failed:`, (e as Error).message);
        });
      });
      await Promise.all(bagUpdates);
      toast.success(
        isEdit
          ? `Shipment ${consignmentNo.trim()} updated · ${totalBags} bag${totalBags === 1 ? "" : "s"}`
          : `Shipment ${consignmentNo.trim()} saved · ${totalBags} bag${totalBags === 1 ? "" : "s"}`,
      );
      router.back();
    } catch (e) {
      toast.error(`Save failed: ${(e as Error).message}`);
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
        <Text style={styles.headTitle}>{isEdit ? "Edit shipment" : "New shipment"}</Text>
        <TouchableOpacity onPress={submit} disabled={busy} style={styles.saveBtn} testID="save-shipment-btn">
          <Text style={styles.saveText}>{busy ? "Saving…" : "Save"}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Field label="Consignment #">
            <TextInput
              style={styles.input}
              placeholder="CN-1006"
              placeholderTextColor={colors.textDim}
              value={consignmentNo}
              onChangeText={setConsignmentNo}
              autoCapitalize="characters"
              testID="input-consignment"
            />
          </Field>

          <Field label="Direction">
            <SegRow options={DIRECTIONS.map((d) => ({ key: d.key, label: d.label }))} value={direction} onChange={(v) => setDirection(v as Direction)} />
          </Field>

          <Field label="Mode">
            <SegRow
              options={MODES.map((m) => ({ key: m, label: m.replace("_", " ") }))}
              value={mode}
              onChange={(v) => setMode(v as ShipmentMode)}
            />
          </Field>

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Field label="Origin">
                <TextInput style={styles.input} placeholder="Kolkata" placeholderTextColor={colors.textDim} value={origin} onChangeText={setOrigin} />
              </Field>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field label="Destination">
                <TextInput style={styles.input} placeholder="Bangkok" placeholderTextColor={colors.textDim} value={destination} onChangeText={setDestination} />
              </Field>
            </View>
          </View>

          {/* Bag details — each bag independently assigned to a customer */}
          <Field label={`Bag details · ${bags.length} bag${bags.length === 1 ? "" : "s"} · ${totalBagWeight ? totalBagWeight.toFixed(1) : "0"} kg total`}>
            <View style={{ gap: 10 }}>
              {bags.map((b, idx) => {
                const cust = (parties.data || []).find((p) => p.id === b.end_customer_id);
                return (
                  <View key={idx} style={styles.bagCard}>
                    <View style={styles.bagCardHead}>
                      <Text style={styles.bagCardNo}>{b.bag_no}</Text>
                      {bags.length > 1 ? (
                        <TouchableOpacity onPress={() => removeBag(idx)} testID={`remove-bag-${idx}`}>
                          <Ionicons name="trash-outline" size={16} color={colors.danger} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    <View style={styles.row2}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.bagFieldLbl}>Weight (kg)</Text>
                        <TextInput
                          style={styles.input}
                          keyboardType="decimal-pad"
                          value={b.weight_kg}
                          onChangeText={(t) => patchBag(idx, { weight_kg: t })}
                          placeholder="0"
                          placeholderTextColor={colors.textDim}
                          testID={`bag-weight-${idx}`}
                        />
                      </View>
                      <View style={{ width: 10 }} />
                      <View style={{ flex: 1.4 }}>
                        <Text style={styles.bagFieldLbl}>Party / Customer</Text>
                        <TouchableOpacity
                          style={styles.selectBtn}
                          onPress={() => setPickBagIdx(idx)}
                          testID={`bag-party-${idx}`}
                        >
                          <Text style={[styles.selectText, !cust && styles.selectPh]} numberOfLines={1}>
                            {cust?.name || "Choose"}
                          </Text>
                          <Ionicons name="chevron-down" size={14} color={colors.textDim} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Item lines inside this bag */}
                    <Text style={styles.bagFieldLbl}>Items in this bag</Text>
                    {b.items.length === 0 ? (
                      <Text style={styles.noItems}>No items yet — add contents below.</Text>
                    ) : (
                      b.items.map((it, iIdx) => (
                        <View key={iIdx} style={styles.itemLine}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
                            <View style={styles.itemMetaRow}>
                              <TextInput
                                style={styles.qtyInput}
                                keyboardType="decimal-pad"
                                value={it.quantity}
                                onChangeText={(t) => patchItemInBag(idx, iIdx, { quantity: t })}
                                placeholder="0"
                                placeholderTextColor={colors.textDim}
                                testID={`item-qty-${idx}-${iIdx}`}
                              />
                              <Text style={styles.itemUnit}>{it.unit}</Text>
                            </View>
                          </View>
                          <TouchableOpacity onPress={() => removeItemFromBag(idx, iIdx)}>
                            <Ionicons name="close-circle" size={18} color={colors.textDim} />
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                    <TouchableOpacity
                      style={styles.addItemBtn}
                      onPress={() => setPickItemBagIdx(idx)}
                      testID={`add-item-${idx}`}
                    >
                      <Ionicons name="add-circle-outline" size={14} color={colors.lime} />
                      <Text style={styles.addItemTxt}>Add item</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
              <TouchableOpacity style={styles.addBagBtn} onPress={addBag} testID="add-bag-btn">
                <Ionicons name="add" size={16} color={colors.lime} />
                <Text style={styles.addBagText}>Add another bag</Text>
              </TouchableOpacity>
            </View>
          </Field>

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Field label="Freight">
                <TextInput style={styles.input} keyboardType="decimal-pad" value={freight} onChangeText={setFreight} />
              </Field>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field label="Currency">
                <SegRow
                  options={[
                    { key: "INR", label: "INR" },
                    { key: "THB", label: "THB" },
                  ]}
                  value={freightCcy}
                  onChange={(v) => setFreightCcy(v as Currency)}
                />
              </Field>
            </View>
          </View>

          <Field label="Forex rate (INR per THB)">
            <TextInput style={styles.input} keyboardType="decimal-pad" value={forexRate} onChangeText={setForexRate} placeholder="2.65" placeholderTextColor={colors.textDim} />
          </Field>

          <Field label="Carrier (optional)">
            <TouchableOpacity style={styles.selectBtn} onPress={() => setPickCarrier(true)}>
              <Text style={[styles.selectText, !currentCarrier && styles.selectPh]}>
                {currentCarrier?.name || "Choose carrier"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textDim} />
            </TouchableOpacity>
          </Field>

          <Field label="Notes">
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Handling instructions…"
              placeholderTextColor={colors.textDim}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </Field>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {pickBagIdx !== null && (
        <PartyPicker
          list={customers.length ? customers : (parties.data || [])}
          onClose={() => setPickBagIdx(null)}
          onPick={(p) => {
            patchBag(pickBagIdx, { end_customer_id: p.id });
            setPickBagIdx(null);
          }}
          title={`Bag ${(bags[pickBagIdx]?.bag_no) || ""} — choose customer`}
        />
      )}

      <ItemPicker
        visible={pickItemBagIdx !== null}
        onClose={() => setPickItemBagIdx(null)}
        onPick={(item) => {
          if (pickItemBagIdx !== null) {
            addItemToBag(pickItemBagIdx, item);
          }
        }}
        title={pickItemBagIdx !== null ? `Add item to ${bags[pickItemBagIdx]?.bag_no}` : "Choose item"}
      />
      {pickCarrier && (
        <PartyPicker
          list={carriers.length ? carriers : (parties.data || [])}
          onClose={() => setPickCarrier(false)}
          onPick={(p) => {
            setCarrierId(p.id);
            setPickCarrier(false);
          }}
          title="Choose carrier"
        />
      )}
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function SegRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segRow}>
      {options.map((o) => {
        const active = value === o.key;
        return (
          <TouchableOpacity
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[styles.seg, active && styles.segActive]}
            testID={`seg-${o.key}`}
          >
            <Text style={[styles.segText, active && styles.segTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function PartyPicker({
  list,
  onClose,
  onPick,
  title,
}: {
  list: Party[];
  onClose: () => void;
  onPick: (p: Party) => void;
  title: string;
}) {
  return (
    <Pressable style={styles.sheetBackdrop} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>{title}</Text>
        <ScrollView style={{ maxHeight: 420 }}>
          {list.length === 0 ? (
            <Text style={styles.emptyPicker}>No parties yet. Create one from the Parties tab.</Text>
          ) : (
            list.map((p) => (
              <TouchableOpacity key={p.id} style={styles.sheetItem} onPress={() => onPick(p)}>
                <View>
                  <Text style={styles.sheetItemName}>{p.name}</Text>
                  <Text style={styles.sheetItemMeta}>{p.role} · {p.country}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
        <TouchableOpacity style={styles.sheetCancel} onPress={onClose}>
          <Text style={styles.sheetCancelText}>Cancel</Text>
        </TouchableOpacity>
      </Pressable>
    </Pressable>
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
    gap: 4,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: { padding: 8 },
  headTitle: { flex: 1, color: colors.text, fontSize: 16, fontWeight: "800" },
  saveBtn: { backgroundColor: colors.lime, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill },
  saveText: { color: colors.bg, fontWeight: "800", fontSize: 13 },
  content: { padding: spacing.lg },
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
  multiline: { minHeight: 80, textAlignVertical: "top" },
  bagCard: {
    backgroundColor: colors.chipBg,
    borderRadius: radii.md,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: 8,
  },
  bagCardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bagCardNo: {
    color: colors.lime,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  bagFieldLbl: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  addBagBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderColor: colors.lime,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
    backgroundColor: colors.chipBg,
  },
  addBagText: {
    color: colors.lime,
    fontSize: 13,
    fontWeight: "800",
  },
  noItems: { color: colors.textDim, fontSize: 12, fontStyle: "italic", marginBottom: 6 },
  itemLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  itemName: { color: colors.text, fontSize: 13, fontWeight: "700" },
  itemMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 3,
  },
  qtyInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
    color: colors.text, fontSize: 12, minWidth: 60,
  },
  itemUnit: { color: colors.textDim, fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  addItemBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth,
    marginTop: 6,
  },
  addItemTxt: { color: colors.lime, fontSize: 11, fontWeight: "700" },
  row2: { flexDirection: "row" },
  segRow: { gap: 8, paddingVertical: 2 },
  seg: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.chipBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  segActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  segText: { color: colors.textMuted, fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  segTextActive: { color: colors.bg },
  selectBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectText: { color: colors.text, fontSize: 15 },
  selectPh: { color: colors.textDim },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.lg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  sheetTitle: { color: colors.text, fontSize: 16, fontWeight: "800", marginBottom: spacing.md },
  sheetItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sheetItemName: { color: colors.text, fontSize: 15, fontWeight: "600" },
  sheetItemMeta: { color: colors.textDim, fontSize: 12, marginTop: 2, textTransform: "capitalize" },
  emptyPicker: { color: colors.textDim, textAlign: "center", padding: spacing.lg, fontSize: 13 },
  sheetCancel: {
    marginTop: spacing.md,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.chipBg,
  },
  sheetCancelText: { color: colors.text, fontWeight: "700" },
});
