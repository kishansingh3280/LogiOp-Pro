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
  const [bagCount, setBagCount] = useState("1");
  const [weight, setWeight] = useState("");
  const [freight, setFreight] = useState("");
  const [freightCcy, setFreightCcy] = useState<Currency>("THB");
  const [forexRate, setForexRate] = useState("");
  const [partyId, setPartyId] = useState<string | null>(null);
  const [carrierId, setCarrierId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [pickParty, setPickParty] = useState(false);
  const [pickCarrier, setPickCarrier] = useState(false);

  const customers = useMemo(
    () => (parties.data || []).filter((p) => p.role === "customer"),
    [parties.data],
  );
  const carriers = useMemo(
    () => (parties.data || []).filter((p) => p.role === "carrier" || p.role === "vendor"),
    [parties.data],
  );

  const currentParty = (parties.data || []).find((p) => p.id === partyId);
  const currentCarrier = (parties.data || []).find((p) => p.id === carrierId);

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
        setBagCount(String(s.bag_count ?? 0));
        setWeight(String(s.weight_kg ?? ""));
        setFreight(String(s.freight ?? ""));
        setFreightCcy((s.freight_currency as Currency) || "THB");
        setForexRate(String(s.forex_rate ?? ""));
        setPartyId(s.party_id || null);
        setCarrierId(s.carrier_party_id || null);
        setNotes(s.notes || "");
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
    if (!partyId) {
      toast.warn("Choose a party");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        consignment_no: consignmentNo.trim(),
        party_id: partyId,
        direction,
        mode,
        origin,
        destination,
        bag_count: Number(bagCount) || 0,
        weight_kg: Number(weight) || 0,
        freight: Number(freight) || 0,
        freight_currency: freightCcy,
        forex_rate: Number(forexRate) || 0,
        carrier_party_id: carrierId,
        status: "pending",
        dispatch_date: new Date().toISOString().slice(0, 10),
        notes,
      };
      const res = isEdit
        ? await apiPut<Shipment>(`/api/shipments/${editId}`, payload)
        : await apiPost<Shipment>("/api/shipments", payload);
      if ((res as { queued?: boolean }).queued) {
        toast.info(`Queued • ${consignmentNo.trim()} will sync when online`);
      } else {
        toast.success(isEdit ? `Shipment ${consignmentNo.trim()} updated` : `Shipment ${consignmentNo.trim()} saved`);
      }
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

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Field label="Bags">
                <TextInput style={styles.input} keyboardType="number-pad" value={bagCount} onChangeText={setBagCount} />
              </Field>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field label="Weight (kg)">
                <TextInput style={styles.input} keyboardType="decimal-pad" value={weight} onChangeText={setWeight} />
              </Field>
            </View>
          </View>

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

          <Field label="Party / Client">
            <TouchableOpacity style={styles.selectBtn} onPress={() => setPickParty(true)} testID="pick-party-btn">
              <Text style={[styles.selectText, !currentParty && styles.selectPh]}>
                {currentParty?.name || "Choose party"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textDim} />
            </TouchableOpacity>
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

      {pickParty && (
        <PartyPicker
          list={customers.length ? customers : (parties.data || [])}
          onClose={() => setPickParty(false)}
          onPick={(p) => {
            setPartyId(p.id);
            setPickParty(false);
          }}
          title="Choose party"
        />
      )}
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
