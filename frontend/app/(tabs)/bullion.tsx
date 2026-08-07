import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useApi } from "@/src/api/hooks";
import type { Party } from "@/src/api/types";
import { usedSlotsFor, useBatches, useTrips } from "@/src/bullion/store";
import type { BullionBatch, BullionStatus, CarrierTrip } from "@/src/bullion/types";
import { STATUS_LABEL, STATUS_PHASE } from "@/src/bullion/types";
import { colors, radii, spacing } from "@/src/theme";
import { fmtCurrency, shortDate } from "@/src/utils/format";

type View_ = "batches" | "trips";

export default function BullionScreen() {
  const router = useRouter();
  const trips = useTrips();
  const batches = useBatches();
  const parties = useApi<Party[]>("/api/parties");
  const [view, setView] = useState<View_>("batches");
  const [fabOpen, setFabOpen] = useState(false);

  const partyMap = useMemo(() => {
    const m: Record<string, Party> = {};
    (parties.data || []).forEach((p) => (m[p.id] = p));
    return m;
  }, [parties.data]);

  const tripsSorted = useMemo(
    () => trips.data.slice().sort((a, b) => (a.date > b.date ? -1 : 1)),
    [trips.data],
  );
  const batchesSorted = useMemo(
    () => batches.data.slice().sort((a, b) => (a.created_at > b.created_at ? -1 : 1)),
    [batches.data],
  );

  const phase1 = batchesSorted.filter((b) => STATUS_PHASE[b.status] === 1);
  const phase2 = batchesSorted.filter((b) => STATUS_PHASE[b.status] === 2);
  const phase3 = batchesSorted.filter((b) => STATUS_PHASE[b.status] === 3 && b.status !== "sold");
  const sold = batchesSorted.filter((b) => b.status === "sold");

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Bullion Work</Text>
          <Text style={styles.subtitle}>
            {batches.data.length} batch{batches.data.length === 1 ? "" : "es"} · {trips.data.length} trip{trips.data.length === 1 ? "" : "s"}
          </Text>
        </View>
      </View>

      {/* Segmented control */}
      <View style={styles.segRow}>
        <SegBtn label="Batches" active={view === "batches"} onPress={() => setView("batches")} testID="bullion-tab-batches" />
        <SegBtn label="Carrier trips" active={view === "trips"} onPress={() => setView("trips")} testID="bullion-tab-trips" />
      </View>

      {view === "batches" ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={batches.loading} onRefresh={batches.refresh} tintColor={colors.lime} />}
        >
          {/* Summary strip */}
          <View style={styles.summaryStrip}>
            <SummaryTile label="Phase 1" value={phase1.length} tint={colors.warn} sub="India" />
            <SummaryTile label="Phase 2" value={phase2.length} tint={colors.info} sub="BKK" />
            <SummaryTile label="Phase 3" value={phase3.length} tint={colors.lime} sub="Return" />
            <SummaryTile label="Sold" value={sold.length} tint={colors.ok} sub="Done" />
          </View>

          <PhaseSection
            title="Phase 1 · Currency purchase (India)"
            items={phase1}
            trips={trips.data}
            router={router}
            emptyHint="No active batches. Tap + to start."
          />
          <PhaseSection
            title="Phase 2 · Bangkok deposit & gold"
            items={phase2}
            trips={trips.data}
            router={router}
          />
          <PhaseSection
            title="Phase 3 · Return & final sale"
            items={phase3}
            trips={trips.data}
            router={router}
          />
          {sold.length > 0 && (
            <PhaseSection title="Sold" items={sold} trips={trips.data} router={router} muted />
          )}
          <View style={{ height: 80 }} />
        </ScrollView>
      ) : (
        <FlatList
          data={tripsSorted}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.scroll}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          refreshControl={<RefreshControl refreshing={trips.loading} onRefresh={trips.refresh} tintColor={colors.lime} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="airplane-outline" size={40} color={colors.textDim} />
              <Text style={styles.emptyTitle}>No trips scheduled</Text>
              <Text style={styles.emptySub}>Tap + to add an upcoming carrier trip</Text>
            </View>
          }
          renderItem={({ item }) => {
            const used = usedSlotsFor(item.id, batches.data);
            const free = Math.max(0, item.available_slots - used);
            const pct = item.available_slots > 0 ? Math.round((used / item.available_slots) * 100) : 0;
            const carrier = item.carrier_party_id ? partyMap[item.carrier_party_id] : undefined;
            return (
              <View style={styles.tripCard} testID={`trip-${item.id}`}>
                <View style={styles.tripHead}>
                  <View style={styles.routeChip}>
                    <Text style={styles.routeChipText}>
                      {item.route === "IN_TO_TH" ? "IN → BKK" : "BKK → IN"}
                    </Text>
                  </View>
                  <Text style={styles.tripDate}>{shortDate(item.date)}</Text>
                </View>
                <Text style={styles.tripCarrier}>{carrier?.name || item.carrier_name || "Carrier TBD"}</Text>
                <View style={styles.slotsBar}>
                  <View style={styles.slotsTrack}>
                    <View style={[styles.slotsFill, { width: `${Math.min(100, pct)}%` }]} />
                  </View>
                  <Text style={styles.slotsText}>
                    {free}/{item.available_slots} free
                  </Text>
                </View>
                {item.notes ? <Text style={styles.tripNotes}>{item.notes}</Text> : null}
              </View>
            );
          }}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setFabOpen(true)}
        activeOpacity={0.9}
        testID="bullion-fab"
      >
        <Ionicons name="add" size={26} color={colors.bg} />
      </TouchableOpacity>

      {fabOpen && (
        <Pressable style={styles.backdrop} onPress={() => setFabOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Create</Text>
            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => {
                setFabOpen(false);
                router.push("/bullion/batch/new");
              }}
              testID="fab-new-batch"
            >
              <View style={styles.sheetIcon}>
                <Ionicons name="diamond-outline" size={20} color={colors.lime} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetItemTitle}>New bullion batch</Text>
                <Text style={styles.sheetItemSub}>Start a Phase 1 currency purchase</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => {
                setFabOpen(false);
                router.push("/bullion/trip/new");
              }}
              testID="fab-new-trip"
            >
              <View style={styles.sheetIcon}>
                <Ionicons name="airplane-outline" size={20} color={colors.lime} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetItemTitle}>New carrier trip</Text>
                <Text style={styles.sheetItemSub}>Log an upcoming India ⇄ BKK trip</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setFabOpen(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

function SegBtn({ label, active, onPress, testID }: { label: string; active: boolean; onPress: () => void; testID?: string }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.seg, active && styles.segActive]}
      testID={testID}
    >
      <Text style={[styles.segText, active && styles.segTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SummaryTile({ label, value, tint, sub }: { label: string; value: number; tint: string; sub: string }) {
  return (
    <View style={styles.sumTile}>
      <Text style={styles.sumLbl}>{label}</Text>
      <Text style={[styles.sumVal, { color: tint }]}>{value}</Text>
      <Text style={styles.sumSub}>{sub}</Text>
    </View>
  );
}

function PhaseSection({
  title,
  items,
  trips,
  router,
  emptyHint,
  muted,
}: {
  title: string;
  items: BullionBatch[];
  trips: CarrierTrip[];
  router: ReturnType<typeof useRouter>;
  emptyHint?: string;
  muted?: boolean;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, muted && { color: colors.textMuted }]}>{title}</Text>
      {items.length === 0 ? (
        emptyHint ? <Text style={styles.sectionEmpty}>{emptyHint}</Text> : null
      ) : (
        items.map((b) => (
          <TouchableOpacity
            key={b.id}
            style={styles.batchCard}
            activeOpacity={0.85}
            onPress={() => router.push(`/bullion/batch/${b.id}` as never)}
            testID={`batch-${b.batch_no}`}
          >
            <View style={styles.batchHead}>
              <View style={styles.batchChip}>
                <Ionicons name="diamond" size={12} color={colors.lime} />
                <Text style={styles.batchChipText}>{b.batch_no}</Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>{STATUS_LABEL[b.status as BullionStatus]}</Text>
              </View>
            </View>
            <View style={styles.batchRow}>
              <Text style={styles.batchLbl}>Bought</Text>
              <Text style={styles.batchVal}>
                {fmtCurrency(b.purchase_amount_inr, "INR")} · {shortDate(b.purchase_date)}
              </Text>
            </View>
            {b.bkk_deposit_amount_thb ? (
              <View style={styles.batchRow}>
                <Text style={styles.batchLbl}>Deposited</Text>
                <Text style={styles.batchVal}>{fmtCurrency(b.bkk_deposit_amount_thb, "THB")}</Text>
              </View>
            ) : null}
            {b.gold_weight_g ? (
              <View style={styles.batchRow}>
                <Text style={styles.batchLbl}>Gold</Text>
                <Text style={[styles.batchVal, { color: colors.lime }]}>
                  {b.gold_weight_g} g
                  {b.gold_price_thb_per_g ? ` @ ${fmtCurrency(b.gold_price_thb_per_g, "THB")}/g` : ""}
                </Text>
              </View>
            ) : null}
            {b.final_sale_amount_inr ? (
              <View style={styles.batchRow}>
                <Text style={styles.batchLbl}>Sold for</Text>
                <Text style={[styles.batchVal, { color: colors.ok }]}>{fmtCurrency(b.final_sale_amount_inr, "INR")}</Text>
              </View>
            ) : null}

            {/* Trip assignments */}
            <TripHint tripId={b.trip_id_to_bkk} trips={trips} label="→ BKK on" />
            <TripHint tripId={b.trip_id_to_in} trips={trips} label="→ India on" />
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

function TripHint({ tripId, trips, label }: { tripId?: string | null; trips: CarrierTrip[]; label: string }) {
  if (!tripId) return null;
  const t = trips.find((x) => x.id === tripId);
  if (!t) return null;
  return (
    <Text style={styles.tripHint}>
      <Ionicons name="airplane-outline" size={11} color={colors.lime} /> {label} {shortDate(t.date)}
    </Text>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { color: colors.text, fontSize: 26, fontWeight: "800" },
  subtitle: { color: colors.textDim, fontSize: 12, marginTop: 2 },

  segRow: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    marginBottom: spacing.md,
  },
  seg: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: radii.pill },
  segActive: { backgroundColor: colors.lime },
  segText: { color: colors.textMuted, fontWeight: "700", fontSize: 13 },
  segTextActive: { color: colors.bg },

  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },

  summaryStrip: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  sumTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    alignItems: "center",
  },
  sumLbl: { color: colors.textDim, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  sumVal: { fontSize: 22, fontWeight: "800", marginTop: 4 },
  sumSub: { color: colors.textDim, fontSize: 10, marginTop: 2 },

  section: { marginBottom: spacing.lg },
  sectionTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  sectionEmpty: { color: colors.textDim, fontSize: 12, paddingVertical: 8 },

  batchCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 4,
  },
  batchHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  batchChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.limeGlow,
    borderColor: colors.lime,
    borderWidth: 1,
  },
  batchChipText: { color: colors.lime, fontWeight: "800", fontSize: 11, letterSpacing: 0.3 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.chipBg,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusPillText: { color: colors.text, fontSize: 10, fontWeight: "700", letterSpacing: 0.4 },
  batchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 2 },
  batchLbl: { color: colors.textDim, fontSize: 12 },
  batchVal: { color: colors.text, fontSize: 13, fontWeight: "600" },
  tripHint: { color: colors.textMuted, fontSize: 11, marginTop: 2 },

  // Trips
  tripCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  tripHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  routeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.limeGlow,
    borderColor: colors.lime,
    borderWidth: 1,
  },
  routeChipText: { color: colors.lime, fontWeight: "800", fontSize: 12 },
  tripDate: { color: colors.text, fontSize: 13, fontWeight: "700" },
  tripCarrier: { color: colors.text, fontSize: 15, fontWeight: "700", marginBottom: 8 },
  slotsBar: { flexDirection: "row", alignItems: "center", gap: 8 },
  slotsTrack: { flex: 1, height: 8, backgroundColor: colors.chipBg, borderRadius: 4, overflow: "hidden" },
  slotsFill: { height: "100%", backgroundColor: colors.lime, borderRadius: 4 },
  slotsText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  tripNotes: { color: colors.textDim, fontSize: 12, marginTop: 8 },

  emptyBox: { padding: spacing.xxl, alignItems: "center", gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 8 },
  emptySub: { color: colors.textDim, fontSize: 13, textAlign: "center" },

  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg + 60,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.lime,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
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
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 12,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sheetIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.limeGlow,
    borderColor: colors.lime,
    borderWidth: 1,
  },
  sheetItemTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  sheetItemSub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  sheetCancel: { marginTop: spacing.md, paddingVertical: 12, alignItems: "center", borderRadius: radii.pill, backgroundColor: colors.chipBg },
  sheetCancelText: { color: colors.text, fontWeight: "700" },
});
