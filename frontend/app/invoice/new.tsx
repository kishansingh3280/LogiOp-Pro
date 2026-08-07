import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
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

import { apiGet, apiPost } from "@/src/api/client";
import { useApi } from "@/src/api/hooks";
import type { Currency, Invoice, Item, Party, Shipment, ShipmentBag } from "@/src/api/types";
import { colors, radii, spacing } from "@/src/theme";
import { fmtCurrency } from "@/src/utils/format";

type Line = { description: string; quantity: string; rate: string; item_id?: string | null };

export default function NewInvoiceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ shipmentId?: string }>();
  const shipmentIdParam = params.shipmentId || null;
  const parties = useApi<Party[]>("/api/parties");
  const items = useApi<Item[]>("/api/items");

  const [number, setNumber] = useState("");
  const [partyId, setPartyId] = useState<string | null>(null);
  const [currency, setCurrency] = useState<Currency>("THB");
  const [taxPct, setTaxPct] = useState("0");
  const [lines, setLines] = useState<Line[]>([{ description: "", quantity: "1", rate: "0" }]);
  const [notes, setNotes] = useState("");
  const [pickParty, setPickParty] = useState(false);
  const [pickForLine, setPickForLine] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [shipmentId, setShipmentId] = useState<string | null>(shipmentIdParam);
  const [hydrated, setHydrated] = useState(false);

  // Prefill from shipment. Fetches the shipment + its bags and materializes:
  //  · Invoice #        → INV-{consignment_no}
  //  · Party            → shipment.party_id (primary Bill-to)
  //  · Currency         → shipment.freight_currency
  //  · Line 1           → Freight for the consignment
  //  · Notes            → Bag + item breakdown (informational)
  useEffect(() => {
    if (!shipmentIdParam || hydrated) return;
    let cancelled = false;
    (async () => {
      try {
        const [s, bags] = await Promise.all([
          apiGet<Shipment>(`/api/shipments/${shipmentIdParam}`),
          apiGet<ShipmentBag[]>(`/api/shipments/${shipmentIdParam}/bags`).catch(
            () => [] as ShipmentBag[],
          ),
        ]);
        if (cancelled) return;
        const bagList = bags || [];
        const totalWeight = bagList.reduce(
          (sum, b) => sum + (Number(b.weight_kg) || 0),
          0,
        );
        const route = `${s.origin || "?"} → ${s.destination || "?"}`;
        setNumber(`INV-${s.consignment_no || shipmentIdParam.slice(0, 6)}`);
        setPartyId(s.party_id || null);
        setCurrency((s.freight_currency as Currency) || "THB");
        setShipmentId(s.id);
        setLines([
          {
            description: `Freight — ${s.consignment_no || "shipment"} · ${route} · ${bagList.length || s.bag_count || 0} bag${(bagList.length || s.bag_count) === 1 ? "" : "s"} · ${totalWeight || s.weight_kg || 0} kg`,
            quantity: "1",
            rate: String(Number(s.freight) || 0),
          },
        ]);
        // Notes: full bag manifest so the printed invoice carries content
        // + Bill-to details without polluting the line-item totals.
        const partyById = new Map<string, Party>();
        (parties.data || []).forEach((p) => partyById.set(p.id, p));
        const manifestLines: string[] = [];
        bagList.forEach((bag, i) => {
          const wt = Number(bag.weight_kg) || 0;
          const cust =
            (bag.end_customer_id && partyById.get(bag.end_customer_id)?.name) || "—";
          const items = (bag.items || [])
            .map((it) => {
              const q = Number(it.quantity) || 0;
              const unit = it.unit || "pcs";
              // The shipment form saves items with `name`; older/back-end
              // records may use `description`. Accept either.
              const label = (it as { name?: string; description?: string }).name
                || it.description
                || "item";
              return `${label} ${q} ${unit}`;
            })
            .join(", ");
          manifestLines.push(
            `${bag.bag_no || `BAG-${String(i + 1).padStart(3, "0")}`} · ${wt} kg · ${cust}${items ? ` · ${items}` : ""}`,
          );
        });
        setNotes(
          [
            `Auto-generated from shipment ${s.consignment_no}`,
            manifestLines.length ? `\nBag manifest:\n${manifestLines.join("\n")}` : "",
          ]
            .filter(Boolean)
            .join(""),
        );
        setHydrated(true);
      } catch (e) {
        Alert.alert("Prefill failed", (e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shipmentIdParam, parties.data, hydrated]);

  const customers = useMemo(
    () => (parties.data || []).filter((p) => p.role === "customer"),
    [parties.data],
  );

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + Number(l.quantity || 0) * Number(l.rate || 0), 0),
    [lines],
  );
  const tax = (subtotal * Number(taxPct || 0)) / 100;
  const total = subtotal + tax;

  const currentParty = (parties.data || []).find((p) => p.id === partyId);

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const addLine = () => setLines((prev) => [...prev, { description: "", quantity: "1", rate: "0" }]);
  const removeLine = (i: number) =>
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));

  const save = async () => {
    if (!number.trim()) return Alert.alert("Missing", "Invoice number required");
    if (!partyId) return Alert.alert("Missing", "Choose a client");
    if (lines.every((l) => !l.description.trim())) return Alert.alert("Missing", "Add at least one line");
    setBusy(true);
    try {
      const payload = {
        number: number.trim(),
        party_id: partyId,
        shipment_id: shipmentId,
        date: new Date().toISOString().slice(0, 10),
        currency,
        items: lines
          .filter((l) => l.description.trim())
          .map((l) => ({
            description: l.description.trim(),
            quantity: Number(l.quantity) || 0,
            rate: Number(l.rate) || 0,
            item_id: l.item_id || null,
          })),
        tax_percent: Number(taxPct) || 0,
        notes,
        status: "draft",
      };
      const res = await apiPost<Invoice>("/api/invoices", payload);
      if ((res as { queued?: boolean }).queued) {
        Alert.alert("Queued", "Invoice saved locally — syncing later.");
      }
      // Prefer going back to the previous screen, but if the invoice form was
      // opened deep-linked (no back stack) `router.back()` becomes a no-op and
      // the user sees the button appear to "do nothing" even though the invoice
      // did save. Fall through to a hard navigation so the flow always ends.
      if (router.canGoBack()) {
        router.back();
      } else {
        const savedId = (res as { id?: string }).id;
        if (savedId) {
          router.replace(`/invoice/${savedId}` as never);
        } else {
          router.replace("/invoices" as never);
        }
      }
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
        <Text style={styles.headTitle}>New invoice</Text>
        <TouchableOpacity onPress={save} disabled={busy} style={styles.saveBtn}>
          <Text style={styles.saveText}>{busy ? "Saving…" : "Save"}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Field label="Number">
                <TextInput
                  style={styles.input}
                  placeholder="INV-1003"
                  placeholderTextColor={colors.textDim}
                  autoCapitalize="characters"
                  value={number}
                  onChangeText={setNumber}
                />
              </Field>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field label="Currency">
                <View style={styles.segRow}>
                  {(["INR", "THB"] as Currency[]).map((c) => {
                    const active = currency === c;
                    return (
                      <TouchableOpacity
                        key={c}
                        onPress={() => setCurrency(c)}
                        style={[styles.seg, active && styles.segActive]}
                      >
                        <Text style={[styles.segText, active && styles.segTextActive]}>{c}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Field>
            </View>
          </View>

          <Field label="Client">
            <TouchableOpacity style={styles.selectBtn} onPress={() => setPickParty(true)}>
              <Text style={[styles.selectText, !currentParty && styles.selectPh]}>
                {currentParty?.name || "Choose party"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textDim} />
            </TouchableOpacity>
          </Field>

          <View style={styles.lineHeader}>
            <Text style={styles.label}>Line items</Text>
            <TouchableOpacity onPress={addLine} style={styles.addLineBtn}>
              <Ionicons name="add-circle-outline" size={16} color={colors.lime} />
              <Text style={styles.addLineText}>Add line</Text>
            </TouchableOpacity>
          </View>

          {lines.map((l, i) => (
            <View key={i} style={styles.lineBox}>
              {/* Description input with an embedded "Pick item" chip on the
                  left so the user doesn't have to hunt for a separate button.
                  Selecting a catalog item fills the description + rate below. */}
              <View style={styles.descRow}>
                <TouchableOpacity
                  style={styles.itemPickInline}
                  onPress={() => setPickForLine(i)}
                  testID={`line-item-pick-${i}`}
                >
                  <Ionicons name="pricetag-outline" size={14} color={colors.lime} />
                  <Text style={styles.itemPickInlineText}>
                    {l.item_id ? "Change" : "Item"}
                  </Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.descInput}
                  placeholder="Description"
                  placeholderTextColor={colors.textDim}
                  value={l.description}
                  onChangeText={(t) => setLine(i, { description: t })}
                  testID={`line-desc-${i}`}
                />
                {lines.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeLine(i)}
                    style={styles.lineRemoveInline}
                    testID={`line-remove-${i}`}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={[styles.row2, { marginTop: 8 }]}>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={styles.input}
                    placeholder="Qty"
                    placeholderTextColor={colors.textDim}
                    keyboardType="decimal-pad"
                    value={l.quantity}
                    onChangeText={(t) => setLine(i, { quantity: t })}
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={styles.input}
                    placeholder="Rate"
                    placeholderTextColor={colors.textDim}
                    keyboardType="decimal-pad"
                    value={l.rate}
                    onChangeText={(t) => setLine(i, { rate: t })}
                  />
                </View>
              </View>
              <Text style={styles.lineTotal}>
                {fmtCurrency(Number(l.quantity || 0) * Number(l.rate || 0), currency)}
              </Text>
            </View>
          ))}

          <Field label="Tax %">
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={taxPct}
              onChangeText={setTaxPct}
            />
          </Field>

          <Field label="Notes">
            <TextInput
              style={[styles.input, styles.multiline]}
              multiline
              value={notes}
              onChangeText={setNotes}
              placeholder="Payment terms…"
              placeholderTextColor={colors.textDim}
            />
          </Field>

          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLbl}>Subtotal</Text>
              <Text style={styles.totalVal}>{fmtCurrency(subtotal, currency)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLbl}>Tax</Text>
              <Text style={styles.totalVal}>{fmtCurrency(tax, currency)}</Text>
            </View>
            <View style={[styles.totalRow, { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 }]}>
              <Text style={[styles.totalLbl, { color: colors.text, fontWeight: "800" }]}>Total</Text>
              <Text style={[styles.totalVal, { color: colors.lime }]}>{fmtCurrency(total, currency)}</Text>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {pickParty && (
        <PickerSheet
          title="Choose client"
          onClose={() => setPickParty(false)}
          items={customers.length ? customers : parties.data || []}
          keyExtractor={(p) => p.id}
          renderItem={(p) => (
            <View>
              <Text style={styles.pickName}>{p.name}</Text>
              <Text style={styles.pickMeta}>
                {p.role} · {p.country}
              </Text>
            </View>
          )}
          onPick={(p) => {
            setPartyId(p.id);
            setPickParty(false);
          }}
        />
      )}

      {pickForLine !== null && (
        <PickerSheet
          title="Choose item"
          onClose={() => setPickForLine(null)}
          items={items.data || []}
          keyExtractor={(it) => it.id}
          renderItem={(it) => (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              {it.photo_url ? (
                <Image
                  source={{ uri: it.photo_url }}
                  style={{ width: 40, height: 40, borderRadius: 6, backgroundColor: colors.chipBg }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 6,
                    backgroundColor: colors.chipBg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="image-outline" size={18} color={colors.textDim} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.pickName}>{it.name}</Text>
                <Text style={styles.pickMeta}>
                  {it.unit} · {fmtCurrency(it.selling_price, currency)}
                  {(it.tags || []).length ? ` · ${(it.tags || []).slice(0, 2).join(", ")}` : ""}
                </Text>
              </View>
            </View>
          )}
          onPick={(it) => {
            setLine(pickForLine, {
              description: it.name,
              rate: String(it.selling_price),
              item_id: it.id,
            });
            setPickForLine(null);
          }}
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

function PickerSheet<T>({
  title,
  onClose,
  items,
  keyExtractor,
  renderItem,
  onPick,
}: {
  title: string;
  onClose: () => void;
  items: T[];
  keyExtractor: (t: T) => string;
  renderItem: (t: T) => React.ReactNode;
  onPick: (t: T) => void;
}) {
  return (
    <Pressable style={styles.sheetBackdrop} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>{title}</Text>
        <ScrollView style={{ maxHeight: 460 }}>
          {items.length === 0 ? (
            <Text style={styles.pickEmpty}>Nothing here yet</Text>
          ) : (
            items.map((it) => (
              <TouchableOpacity key={keyExtractor(it)} style={styles.sheetItem} onPress={() => onPick(it)}>
                {renderItem(it)}
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
  row2: { flexDirection: "row" },
  segRow: { flexDirection: "row", gap: 8 },
  seg: {
    paddingHorizontal: 14,
    height: 42,
    flex: 1,
    borderRadius: radii.md,
    backgroundColor: colors.chipBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  segActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  segText: { color: colors.textMuted, fontSize: 13, fontWeight: "700" },
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
  lineHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  addLineBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  addLineText: { color: colors.lime, fontWeight: "700", fontSize: 12 },
  lineBox: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
  },
  lineTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  itemPick: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: colors.limeGlow },
  itemPickText: { color: colors.lime, fontSize: 12, fontWeight: "700" },
  // Embedded picker chip that lives inside the description row so the user
  // doesn't have to scan for a floating "Pick item" button.
  descRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingLeft: 6,
    paddingRight: 6,
  },
  itemPickInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.limeGlow,
    borderColor: colors.lime,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 8,
  },
  itemPickInlineText: { color: colors.lime, fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
  descInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 12,
    paddingRight: 6,
  },
  lineRemoveInline: {
    padding: 6,
    marginLeft: 4,
  },
  lineTotal: { color: colors.lime, fontWeight: "800", textAlign: "right", marginTop: 8 },
  totalsBox: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.md,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  totalLbl: { color: colors.textMuted, fontSize: 13 },
  totalVal: { color: colors.text, fontSize: 14, fontWeight: "700" },
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
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing.md },
  sheetTitle: { color: colors.text, fontSize: 16, fontWeight: "800", marginBottom: spacing.md },
  sheetItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pickName: { color: colors.text, fontSize: 15, fontWeight: "600" },
  pickMeta: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  pickEmpty: { color: colors.textDim, textAlign: "center", padding: spacing.lg },
  sheetCancel: {
    marginTop: spacing.md,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.chipBg,
  },
  sheetCancelText: { color: colors.text, fontWeight: "700" },
});
