import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
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

import { deleteBatch, updateBatch, useBatches, useTrips, usedSlotsFor } from "@/src/bullion/store";
import type { BullionRoute, BullionStatus } from "@/src/bullion/types";
import { STATUS_LABEL, STATUS_PHASE } from "@/src/bullion/types";
import { colors, radii, spacing } from "@/src/theme";
import { fmtCurrency, shortDate } from "@/src/utils/format";

export default function BatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const batches = useBatches();
  const trips = useTrips();
  const batch = batches.data.find((b) => b.id === id);

  const [tripPickRoute, setTripPickRoute] = useState<BullionRoute | null>(null);
  const [phase2Open, setPhase2Open] = useState(false);
  const [phase3Open, setPhase3Open] = useState(false);

  // Phase 2 inputs
  const [depositThb, setDepositThb] = useState("");
  const [goldGrams, setGoldGrams] = useState("");
  const [goldPrice, setGoldPrice] = useState("");

  // Phase 3 inputs
  const [saleInr, setSaleInr] = useState("");

  const availableTripsForRoute = useMemo(() => {
    if (!tripPickRoute) return [];
    return trips.data
      .filter((t) => t.route === tripPickRoute)
      .map((t) => ({ ...t, used: usedSlotsFor(t.id, batches.data) }))
      .sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [tripPickRoute, trips.data, batches.data]);

  if (!batch) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.dim}>Batch not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const tripToBkk = trips.data.find((t) => t.id === batch.trip_id_to_bkk);
  const tripToIn = trips.data.find((t) => t.id === batch.trip_id_to_in);
  const currentPhase = STATUS_PHASE[batch.status];

  const assignTrip = async (tripId: string) => {
    if (!tripPickRoute) return;
    if (tripPickRoute === "IN_TO_TH") {
      await updateBatch(batch.id, { trip_id_to_bkk: tripId, status: "in_transit_to_bkk" });
    } else {
      await updateBatch(batch.id, { trip_id_to_in: tripId, status: "in_transit_to_in" });
    }
    setTripPickRoute(null);
  };

  const advanceTo = async (status: BullionStatus) => {
    await updateBatch(batch.id, { status });
  };

  const commitPhase2 = async () => {
    const dep = parseFloat(depositThb);
    const gg = parseFloat(goldGrams);
    const gp = parseFloat(goldPrice);
    if (!dep || dep <= 0) return Alert.alert("Invalid", "Deposit amount required");
    await updateBatch(batch.id, {
      bkk_deposit_amount_thb: dep,
      gold_weight_g: gg || undefined,
      gold_price_thb_per_g: gp || undefined,
      gold_purchase_date: gg ? new Date().toISOString().slice(0, 10) : undefined,
      status: gg ? "gold_secured" : "deposited_bkk",
    });
    setPhase2Open(false);
    setDepositThb("");
    setGoldGrams("");
    setGoldPrice("");
  };

  const commitPhase3 = async () => {
    const sale = parseFloat(saleInr);
    if (!sale || sale <= 0) return Alert.alert("Invalid", "Sale amount required");
    await updateBatch(batch.id, {
      final_sale_amount_inr: sale,
      final_sale_date: new Date().toISOString().slice(0, 10),
      status: "sold",
    });
    setPhase3Open(false);
    setSaleInr("");
  };

  const remove = () => {
    Alert.alert("Delete batch", `Delete ${batch.batch_no}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteBatch(batch.id);
          router.back();
        },
      },
    ]);
  };

  const margin =
    batch.final_sale_amount_inr && batch.purchase_amount_inr
      ? batch.final_sale_amount_inr - batch.purchase_amount_inr
      : null;

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.headBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headTitle}>{batch.batch_no}</Text>
        <TouchableOpacity onPress={remove} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.chip}><Ionicons name="diamond" size={12} color={colors.lime} /><Text style={styles.chipText}>{batch.batch_no}</Text></View>
          <Text style={styles.status}>{STATUS_LABEL[batch.status]}</Text>
          <Text style={styles.purchase}>{fmtCurrency(batch.purchase_amount_inr, "INR")}</Text>
          <Text style={styles.dim}>Purchased on {shortDate(batch.purchase_date)}</Text>

          {/* Phase progress dots */}
          <View style={styles.phaseRow}>
            {[1, 2, 3].map((p) => (
              <View key={p} style={styles.phaseCol}>
                <View style={[styles.phaseDot, currentPhase >= p && styles.phaseDotDone]}>
                  <Text style={[styles.phaseNum, currentPhase >= p && { color: colors.bg }]}>{p}</Text>
                </View>
                <Text style={[styles.phaseLbl, currentPhase >= p && { color: colors.text }]}>
                  {p === 1 ? "India" : p === 2 ? "BKK" : "Return"}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Phase 1: assign to trip */}
        <Card>
          <SectionHead icon="airplane-outline" title="Phase 1 · Trip to BKK" />
          {tripToBkk ? (
            <>
              <Row label="Assigned trip" value={`${shortDate(tripToBkk.date)} · ${tripToBkk.carrier_name || "TBD"}`} />
              <Row label="Route" value="India → BKK" />
              {batch.status === "in_transit_to_bkk" ? (
                <TouchableOpacity style={styles.advanceBtn} onPress={() => setPhase2Open(true)} testID="advance-to-bkk">
                  <Text style={styles.advanceText}>Mark deposited / buy gold</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.bg} />
                </TouchableOpacity>
              ) : null}
            </>
          ) : (
            <TouchableOpacity style={styles.assignBtn} onPress={() => setTripPickRoute("IN_TO_TH")} testID="assign-trip-bkk">
              <Ionicons name="add-circle-outline" size={18} color={colors.lime} />
              <Text style={styles.assignText}>Assign to India → BKK trip</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Phase 2 detail */}
        {currentPhase >= 2 && (
          <Card>
            <SectionHead icon="cash-outline" title="Phase 2 · BKK deposit & gold" />
            {batch.bkk_deposit_amount_thb ? <Row label="Deposited" value={fmtCurrency(batch.bkk_deposit_amount_thb, "THB")} /> : null}
            {batch.gold_weight_g ? (
              <>
                <Row label="Gold weight" value={`${batch.gold_weight_g} g`} valueColor={colors.lime} />
                {batch.gold_price_thb_per_g ? (
                  <Row label="Buy price" value={`${fmtCurrency(batch.gold_price_thb_per_g, "THB")}/g`} />
                ) : null}
                {batch.gold_purchase_date ? <Row label="Gold date" value={shortDate(batch.gold_purchase_date)} /> : null}
              </>
            ) : null}

            {batch.status === "deposited_bkk" && !batch.gold_weight_g ? (
              <TouchableOpacity style={styles.advanceBtn} onPress={() => setPhase2Open(true)} testID="advance-to-gold">
                <Text style={styles.advanceText}>Add gold purchase</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.bg} />
              </TouchableOpacity>
            ) : null}

            {batch.status === "gold_secured" && !batch.trip_id_to_in ? (
              <TouchableOpacity style={styles.assignBtn} onPress={() => setTripPickRoute("TH_TO_IN")} testID="assign-trip-in">
                <Ionicons name="add-circle-outline" size={18} color={colors.lime} />
                <Text style={styles.assignText}>Assign to BKK → India trip</Text>
              </TouchableOpacity>
            ) : null}
          </Card>
        )}

        {/* Phase 3 detail */}
        {currentPhase >= 3 && (
          <Card>
            <SectionHead icon="checkmark-done-outline" title="Phase 3 · Return & final sale" />
            {tripToIn ? (
              <Row label="Return trip" value={`${shortDate(tripToIn.date)} · ${tripToIn.carrier_name || "TBD"}`} />
            ) : null}
            {batch.status === "in_transit_to_in" ? (
              <TouchableOpacity style={styles.advanceBtn} onPress={() => advanceTo("arrived_in")} testID="advance-to-arrived">
                <Text style={styles.advanceText}>Mark arrived India</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.bg} />
              </TouchableOpacity>
            ) : null}
            {batch.status === "arrived_in" ? (
              <TouchableOpacity style={styles.advanceBtn} onPress={() => setPhase3Open(true)} testID="advance-to-sold">
                <Text style={styles.advanceText}>Record final sale</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.bg} />
              </TouchableOpacity>
            ) : null}
            {batch.final_sale_amount_inr ? (
              <>
                <Row label="Final sale" value={fmtCurrency(batch.final_sale_amount_inr, "INR")} valueColor={colors.ok} />
                {batch.final_sale_date ? <Row label="Sold on" value={shortDate(batch.final_sale_date)} /> : null}
                {margin !== null ? (
                  <Row
                    label="Net margin"
                    value={fmtCurrency(margin, "INR")}
                    valueColor={margin >= 0 ? colors.lime : colors.danger}
                  />
                ) : null}
              </>
            ) : null}
          </Card>
        )}

        {batch.notes ? (
          <Card>
            <SectionHead icon="document-text-outline" title="Notes" />
            <Text style={styles.notes}>{batch.notes}</Text>
          </Card>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Trip picker */}
      {tripPickRoute && (
        <Pressable style={styles.backdrop} onPress={() => setTripPickRoute(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              Assign to {tripPickRoute === "IN_TO_TH" ? "India → BKK" : "BKK → India"} trip
            </Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {availableTripsForRoute.length === 0 ? (
                <View>
                  <Text style={styles.pickEmpty}>No trips available for this route yet.</Text>
                  <TouchableOpacity
                    style={styles.newTripBtn}
                    onPress={() => {
                      setTripPickRoute(null);
                      router.push("/bullion/trip/new");
                    }}
                  >
                    <Text style={styles.newTripText}>+ Create trip</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                availableTripsForRoute.map((t) => {
                  const free = t.available_slots - t.used;
                  const disabled = free <= 0;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      disabled={disabled}
                      style={[styles.pickRow, disabled && { opacity: 0.4 }]}
                      onPress={() => assignTrip(t.id)}
                      testID={`pick-trip-${t.id}`}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pickName}>{shortDate(t.date)} · {t.carrier_name || "TBD"}</Text>
                        <Text style={styles.pickMeta}>{free}/{t.available_slots} slots free</Text>
                      </View>
                      {disabled ? <Text style={styles.fullTag}>FULL</Text> : <Ionicons name="chevron-forward" size={16} color={colors.textDim} />}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setTripPickRoute(null)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      )}

      {/* Phase 2 input sheet */}
      {phase2Open && (
        <Pressable style={styles.backdrop} onPress={() => setPhase2Open(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>BKK deposit & gold purchase</Text>
              <TextInput style={styles.input} placeholder="Deposit amount (THB)" placeholderTextColor={colors.textDim} keyboardType="decimal-pad" value={depositThb} onChangeText={setDepositThb} testID="p2-deposit" />
              <View style={{ height: 10 }} />
              <TextInput style={styles.input} placeholder="Gold weight (grams) — optional" placeholderTextColor={colors.textDim} keyboardType="decimal-pad" value={goldGrams} onChangeText={setGoldGrams} testID="p2-gold-grams" />
              <View style={{ height: 10 }} />
              <TextInput style={styles.input} placeholder="Buy price THB per gram — optional" placeholderTextColor={colors.textDim} keyboardType="decimal-pad" value={goldPrice} onChangeText={setGoldPrice} testID="p2-gold-price" />
              <TouchableOpacity style={styles.commitBtn} onPress={commitPhase2} testID="p2-commit">
                <Text style={styles.commitText}>Save</Text>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      )}

      {/* Phase 3 input sheet */}
      {phase3Open && (
        <Pressable style={styles.backdrop} onPress={() => setPhase3Open(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Record final sale</Text>
              <TextInput style={styles.input} placeholder="Final sale amount (INR)" placeholderTextColor={colors.textDim} keyboardType="decimal-pad" value={saleInr} onChangeText={setSaleInr} testID="p3-sale" />
              <TouchableOpacity style={styles.commitBtn} onPress={commitPhase3} testID="p3-commit">
                <Text style={styles.commitText}>Mark sold</Text>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function SectionHead({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View style={styles.sectionHead}>
      <Ionicons name={icon} size={14} color={colors.lime} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLbl}>{label}</Text>
      <Text style={[styles.rowVal, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  dim: { color: colors.textDim, fontSize: 13 },
  headBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  iconBtn: { padding: 8 },
  headTitle: { flex: 1, color: colors.text, fontSize: 17, fontWeight: "800", textAlign: "center" },
  content: { padding: spacing.lg, gap: spacing.md },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.limeGlow,
    borderColor: colors.lime,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  chipText: { color: colors.lime, fontWeight: "800", fontSize: 11 },
  status: { color: colors.text, fontSize: 12, fontWeight: "700", marginTop: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  purchase: { color: colors.text, fontSize: 30, fontWeight: "800", marginTop: 6 },
  phaseRow: { flexDirection: "row", justifyContent: "space-around", marginTop: spacing.lg },
  phaseCol: { alignItems: "center", gap: 6 },
  phaseDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  phaseDotDone: { backgroundColor: colors.lime, borderColor: colors.lime },
  phaseNum: { color: colors.textDim, fontSize: 13, fontWeight: "800" },
  phaseLbl: { color: colors.textDim, fontSize: 11, fontWeight: "700" },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: 4,
  },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  sectionTitle: { color: colors.text, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  rowLbl: { color: colors.textDim, fontSize: 13 },
  rowVal: { color: colors.text, fontSize: 13, fontWeight: "700" },
  advanceBtn: {
    marginTop: 10,
    backgroundColor: colors.lime,
    paddingVertical: 12,
    borderRadius: radii.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  advanceText: { color: colors.bg, fontWeight: "800", fontSize: 14 },
  assignBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.limeGlow,
    borderColor: colors.lime,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: 4,
  },
  assignText: { color: colors.lime, fontWeight: "800", fontSize: 13 },
  notes: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.lg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing.md },
  sheetTitle: { color: colors.text, fontSize: 16, fontWeight: "800", marginBottom: spacing.md },
  pickRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: spacing.md,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pickName: { color: colors.text, fontSize: 15, fontWeight: "700" },
  pickMeta: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  pickEmpty: { color: colors.textDim, textAlign: "center", padding: spacing.lg },
  fullTag: { color: colors.danger, fontWeight: "800", fontSize: 11 },
  newTripBtn: {
    marginTop: spacing.md,
    padding: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.lime,
    alignItems: "center",
  },
  newTripText: { color: colors.bg, fontWeight: "800" },
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
  commitBtn: { marginTop: spacing.lg, backgroundColor: colors.lime, paddingVertical: 12, borderRadius: radii.pill, alignItems: "center" },
  commitText: { color: colors.bg, fontWeight: "800", fontSize: 14 },
  sheetCancel: { marginTop: spacing.md, paddingVertical: 12, alignItems: "center", borderRadius: radii.pill, backgroundColor: colors.chipBg },
  sheetCancelText: { color: colors.text, fontWeight: "700" },
});
