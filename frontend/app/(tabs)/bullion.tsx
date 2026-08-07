import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useApi } from "@/src/api/hooks";
import type { Party } from "@/src/api/types";
import { findAirline } from "@/src/bullion/airlines";
import { AirlineBadge } from "@/src/bullion/AirlineBadge";
import { defaultAirports } from "@/src/bullion/airports";
import { FlightMap } from "@/src/bullion/FlightMap";
import { MarketTicker } from "@/src/bullion/MarketTicker";
import { setRates, useRates } from "@/src/bullion/rates";
import { usedWeightKgFor, useTrips, useTxns } from "@/src/bullion/store";
import {
  computeTxn,
  STATUS_COLOR,
  STATUS_LABEL,
  tripCapacityKg,
  type BullionTxn,
} from "@/src/bullion/types";
import { colors, radii, spacing } from "@/src/theme";
import { fmtCurrency, shortDate } from "@/src/utils/format";

type View_ = "trades" | "trips";
type Filter = "all" | "currency" | "gold" | "open" | "completed";

export default function BullionScreen() {
  const router = useRouter();
  const trips = useTrips();
  const txns = useTxns();
  const parties = useApi<Party[]>("/api/parties");
  const [view, setView] = useState<View_>("trades");
  const [filter, setFilter] = useState<Filter>("all");
  const [fabOpen, setFabOpen] = useState(false);
  const [editRates, setEditRates] = useState(false);
  const rates = useRates();

  const partyMap = useMemo(() => {
    const m: Record<string, Party> = {};
    (parties.data || []).forEach((p) => (m[p.id] = p));
    return m;
  }, [parties.data]);

  const tradesSorted = useMemo(
    () => txns.data.slice().sort((a, b) => (a.created_at > b.created_at ? -1 : 1)),
    [txns.data],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return tradesSorted;
    if (filter === "currency" || filter === "gold") return tradesSorted.filter((t) => t.type === filter);
    if (filter === "open") return tradesSorted.filter((t) => t.status !== "completed");
    return tradesSorted.filter((t) => t.status === "completed");
  }, [tradesSorted, filter]);

  const tripsSorted = useMemo(
    () => trips.data.slice().sort((a, b) => (a.date > b.date ? -1 : 1)),
    [trips.data],
  );

  // Aggregate stats
  const stats = useMemo(() => {
    let openCnt = 0, completedCnt = 0, totalProfit = 0;
    txns.data.forEach((t) => {
      const calc = computeTxn(t, rates.data);
      if (t.status === "completed") completedCnt++; else openCnt++;
      if (calc.profit_inr !== null) totalProfit += calc.profit_inr;
    });
    return { openCnt, completedCnt, totalProfit };
  }, [txns.data, rates.data]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Bullion Work</Text>
          <Text style={styles.subtitle}>
            {txns.data.length} trade{txns.data.length === 1 ? "" : "s"} · {trips.data.length} trip{trips.data.length === 1 ? "" : "s"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setEditRates(true)}
          style={styles.editRatesBtn}
          testID="edit-rates-btn"
        >
          <Ionicons name="options-outline" size={14} color={colors.lime} />
          <Text style={styles.editRatesText}>Edit rates</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tickerWrap}>
        <MarketTicker />
      </View>

      <View style={styles.segRow}>
        <SegBtn label="Trading history" active={view === "trades"} onPress={() => setView("trades")} testID="bullion-tab-trades" />
        <SegBtn label="Carrier trips" active={view === "trips"} onPress={() => setView("trips")} testID="bullion-tab-trips" />
      </View>

      {view === "trades" ? (
        <FlatList
          data={filtered}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.scroll}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          refreshControl={<RefreshControl refreshing={txns.loading} onRefresh={txns.refresh} tintColor={colors.lime} />}
          ListHeaderComponent={
            <View>
              {/* Summary */}
              <View style={styles.statsStrip}>
                <StatTile label="Open" value={String(stats.openCnt)} tint={colors.warn} />
                <StatTile label="Completed" value={String(stats.completedCnt)} tint={colors.ok} />
                <StatTile
                  label="Net profit"
                  value={fmtCurrency(stats.totalProfit, "INR")}
                  tint={stats.totalProfit >= 0 ? colors.lime : colors.danger}
                  wide
                />
              </View>

              {/* Filter chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} style={{ flexGrow: 0 }}>
                {(["all", "currency", "gold", "open", "completed"] as Filter[]).map((f) => {
                  const active = filter === f;
                  return (
                    <TouchableOpacity
                      key={f}
                      onPress={() => setFilter(f)}
                      style={[styles.chip, active && styles.chipActive]}
                      testID={`filter-${f}`}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{f}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="diamond-outline" size={40} color={colors.textDim} />
              <Text style={styles.emptyTitle}>No trades yet</Text>
              <Text style={styles.emptySub}>Tap + to start a currency or gold carry</Text>
            </View>
          }
          renderItem={({ item }) => {
            const calc = computeTxn(item, rates.data);
            const trip = trips.data.find((t) => t.id === item.trip_id);
            const isGold = item.type === "gold";
            const tint = STATUS_COLOR[item.status];
            const tintColor = tint === "warn" ? colors.warn : tint === "info" ? colors.info : colors.ok;
            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push(`/bullion/txn/${item.id}` as never)}
                style={styles.txnCard}
                testID={`txn-${item.txn_no}`}
              >
                <View style={styles.txnHead}>
                  <View style={styles.txnHeadLeft}>
                    <View style={[styles.typeIcon, isGold && styles.typeIconGold]}>
                      <Ionicons
                        name={isGold ? "diamond" : "cash-outline"}
                        size={14}
                        color={isGold ? "#F5C518" : colors.lime}
                      />
                    </View>
                    <View>
                      <Text style={styles.txnNo}>{item.txn_no}</Text>
                      <Text style={styles.txnKind}>
                        {isGold
                          ? `Gold · ${item.gold_amount || 0} ${item.gold_unit || "baht"}`
                          : `Currency · ${item.currency_amount || 0} ${item.currency || "USD"}`}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: tintColor + "22", borderColor: tintColor }]}>
                    <Text style={[styles.statusPillText, { color: tintColor }]}>{STATUS_LABEL[item.status]}</Text>
                  </View>
                </View>

                <View style={styles.txnBody}>
                  {!isGold ? (
                    <>
                      <Row label="INR spent" value={calc.inr_spent ? fmtCurrency(calc.inr_spent, "INR") : "—"} />
                      <Row label="THB received" value={calc.thb_received ? fmtCurrency(calc.thb_received, "THB") : "—"} />
                      {calc.inr_returned ? (
                        <Row label="INR returned" value={fmtCurrency(calc.inr_returned, "INR")} tint={colors.ok} />
                      ) : null}
                    </>
                  ) : (
                    <>
                      <Row label="THB paid" value={item.gold_purchase_thb ? fmtCurrency(item.gold_purchase_thb, "THB") : "—"} />
                      {calc.inr_cost ? <Row label="INR cost" value={fmtCurrency(calc.inr_cost, "INR")} /> : null}
                      {item.gold_sale_inr ? (
                        <Row label="INR sold" value={fmtCurrency(item.gold_sale_inr, "INR")} tint={colors.ok} />
                      ) : null}
                    </>
                  )}
                  <Row label="Carrier charge" value={fmtCurrency(calc.carrier_charge_inr, "INR")} tint={colors.danger} />
                  {calc.profit_inr !== null ? (
                    <Row
                      label="Net profit"
                      value={fmtCurrency(calc.profit_inr, "INR")}
                      tint={calc.profit_inr >= 0 ? colors.lime : colors.danger}
                      bold
                    />
                  ) : null}
                </View>

                <View style={styles.txnFoot}>
                  <Ionicons name="airplane-outline" size={11} color={colors.textDim} />
                  <Text style={styles.txnFootText}>
                    {trip
                      ? `${shortDate(trip.date)} · ${partyMap[trip.carrier_party_id || ""]?.name || trip.carrier_name || "Carrier"}`
                      : "No trip assigned"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
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
            const capacity = tripCapacityKg(item);
            const used = usedWeightKgFor(item.id, txns.data);
            const free = Math.max(0, capacity - used);
            const pct = capacity > 0 ? Math.round((used / capacity) * 100) : 0;
            const carrier = item.carrier_party_id ? partyMap[item.carrier_party_id] : undefined;
            const airline = findAirline(item.airline_code);
            const airports = defaultAirports(item.route);
            return (
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.tripCard}
                onPress={() => router.push(`/bullion/trip/${item.id}` as never)}
                testID={`trip-${item.id}`}
              >
                <View style={styles.tripHead}>
                  <AirlineBadge airline={airline} size="md" />
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <View style={styles.routeChip}>
                        <Text style={styles.routeChipText}>{item.route === "IN_TO_TH" ? "IN → BKK" : "BKK → IN"}</Text>
                      </View>
                      {item.flight_number ? (
                        <Text style={styles.flightNo}>{item.flight_number}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.tripCarrier}>{carrier?.name || item.carrier_name || "Carrier TBD"}</Text>
                    {airline ? <Text style={styles.airlineName}>{airline.name}</Text> : null}
                  </View>
                  <Text style={styles.tripDate}>{shortDate(item.date)}</Text>
                </View>
                <View style={styles.slotsBar}>
                  <View style={styles.slotsTrack}>
                    <View style={[styles.slotsFill, { width: `${Math.min(100, pct)}%` }]} />
                  </View>
                  <Text style={styles.slotsText}>{fmtKgSmart(free)}/{fmtKgSmart(capacity)} kg free</Text>
                </View>
                {/* Compact route-map thumbnail */}
                <View style={{ marginTop: spacing.md }}>
                  <FlightMap from={airports.from} to={airports.to} size="sm" showLabels />
                </View>
                {item.notes ? <Text style={styles.tripNotes}>{item.notes}</Text> : null}
              </TouchableOpacity>
            );
          }}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setFabOpen(true)} activeOpacity={0.9} testID="bullion-fab">
        <Ionicons name="add" size={26} color={colors.bg} />
      </TouchableOpacity>

      {fabOpen && (
        <Pressable style={styles.backdrop} onPress={() => setFabOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Create</Text>
            <SheetItem
              icon="airplane-outline"
              title="Carrier trip"
              sub="Log an upcoming India ⇄ BKK trip"
              onPress={() => { setFabOpen(false); router.push("/bullion/trip/new"); }}
              testID="fab-new-trip"
            />
            <SheetItem
              icon="cash-outline"
              title="Currency carry"
              sub="Buy foreign currency, carry to BKK"
              onPress={() => { setFabOpen(false); router.push("/bullion/txn/new?type=currency"); }}
              testID="fab-new-currency"
            />
            <SheetItem
              icon="diamond-outline"
              title="Gold carry"
              sub="Buy gold in BKK, sell in India"
              onPress={() => { setFabOpen(false); router.push("/bullion/txn/new?type=gold"); }}
              testID="fab-new-gold"
            />
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setFabOpen(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      )}

      {editRates && (
        <RatesEditorModal
          initial={rates.data}
          onClose={() => setEditRates(false)}
          onSave={async (next) => {
            await setRates(next);
            setEditRates(false);
          }}
        />
      )}
    </SafeAreaView>
  );
}

function RatesEditorModal({
  initial,
  onClose,
  onSave,
}: {
  initial: { currency_rate_per_1000: number; gold_rate_per_baht: number };
  onClose: () => void;
  onSave: (next: { currency_rate_per_1000: number; gold_rate_per_baht: number }) => void | Promise<void>;
}) {
  const [currencyRate, setCurrencyRate] = useState(String(initial.currency_rate_per_1000));
  const [goldRate, setGoldRate] = useState(String(initial.gold_rate_per_baht));
  const [saving, setSaving] = useState(false);

  const commit = async () => {
    const c = parseFloat(currencyRate);
    const g = parseFloat(goldRate);
    if (!Number.isFinite(c) || c < 0) return Alert.alert("Invalid", "Currency rate must be ≥ 0");
    if (!Number.isFinite(g) || g < 0) return Alert.alert("Invalid", "Gold rate must be ≥ 0");
    setSaving(true);
    try {
      await onSave({ currency_rate_per_1000: c, gold_rate_per_baht: g });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Global carrier rates</Text>
          <Text style={styles.rateBlurb}>
            Applied to every new bullion trade. Existing trades keep their previously-computed
            carrier charge until edited.
          </Text>

          <View style={styles.rateField}>
            <Text style={styles.rateLabel}>Currency carry — INR per 1,000 units</Text>
            <TextInput
              style={styles.rateInput}
              value={currencyRate}
              onChangeText={setCurrencyRate}
              keyboardType="decimal-pad"
              placeholder="500"
              placeholderTextColor={colors.textDim}
              testID="rate-currency-per-1000"
            />
            <Text style={styles.rateHelper}>e.g. $1,000 carried → ₹{currencyRate || "0"} carrier fee.</Text>
          </View>

          <View style={styles.rateField}>
            <Text style={styles.rateLabel}>Gold carry — INR per baht (15.244 g)</Text>
            <TextInput
              style={styles.rateInput}
              value={goldRate}
              onChangeText={setGoldRate}
              keyboardType="decimal-pad"
              placeholder="2500"
              placeholderTextColor={colors.textDim}
              testID="rate-gold-per-baht"
            />
            <Text style={styles.rateHelper}>e.g. 10 baht of gold → ₹{(Number(goldRate) || 0) * 10} carrier fee.</Text>
          </View>

          <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
            <TouchableOpacity style={styles.sheetCancel} onPress={onClose} disabled={saving}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rateSaveBtn, saving && { opacity: 0.6 }]}
              onPress={commit}
              disabled={saving}
              testID="rate-save"
            >
              <Text style={styles.rateSaveText}>{saving ? "Saving…" : "Save rates"}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Pressable>
    </Pressable>
  );
}

function fmtKgSmart(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}


function SegBtn({ label, active, onPress, testID }: { label: string; active: boolean; onPress: () => void; testID?: string }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.seg, active && styles.segActive]} testID={testID}>
      <Text style={[styles.segText, active && styles.segTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatTile({ label, value, tint, wide }: { label: string; value: string; tint: string; wide?: boolean }) {
  return (
    <View style={[styles.stat, wide && { flex: 2 }]}>
      <Text style={styles.statLbl}>{label}</Text>
      <Text style={[styles.statVal, { color: tint }]}>{value}</Text>
    </View>
  );
}

function Row({ label, value, tint, bold }: { label: string; value: string; tint?: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLbl}>{label}</Text>
      <Text style={[styles.rowVal, tint ? { color: tint } : null, bold && { fontWeight: "800" }]}>{value}</Text>
    </View>
  );
}

function SheetItem({ icon, title, sub, onPress, testID }: { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string; onPress: () => void; testID: string }) {
  return (
    <TouchableOpacity style={styles.sheetItem} onPress={onPress} testID={testID}>
      <View style={styles.sheetIcon}>
        <Ionicons name={icon} size={20} color={colors.lime} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sheetItemTitle}>{title}</Text>
        <Text style={styles.sheetItemSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md,
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
  },
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
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  statsStrip: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  stat: {
    flex: 1,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statLbl: { color: colors.textDim, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  statVal: { fontSize: 20, fontWeight: "800", marginTop: 4 },
  chipRow: { gap: 8, paddingBottom: spacing.md },
  chip: {
    height: 34, paddingHorizontal: 14, borderRadius: radii.pill,
    backgroundColor: colors.chipBg, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  chipText: { color: colors.textMuted, fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  chipTextActive: { color: colors.bg },
  txnCard: {
    backgroundColor: colors.surface, borderRadius: radii.lg,
    borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md, gap: 6,
  },
  txnHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  txnHeadLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  typeIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.limeGlow, borderColor: colors.lime, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  typeIconGold: { backgroundColor: "#3a2f0033", borderColor: "#F5C518" },
  txnNo: { color: colors.text, fontSize: 15, fontWeight: "800", letterSpacing: 0.3 },
  txnKind: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radii.pill, borderWidth: 1 },
  statusPillText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  txnBody: { gap: 4, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  rowLbl: { color: colors.textDim, fontSize: 12 },
  rowVal: { color: colors.text, fontSize: 13, fontWeight: "600" },
  txnFoot: {
    flexDirection: "row", alignItems: "center", gap: 4,
    marginTop: 6, paddingTop: 6, borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth,
  },
  txnFootText: { color: colors.textDim, fontSize: 11 },
  tripCard: {
    backgroundColor: colors.surface, borderRadius: radii.lg,
    borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  tripHead: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
  routeChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill,
    backgroundColor: colors.limeGlow, borderColor: colors.lime, borderWidth: 1,
  },
  routeChipText: { color: colors.lime, fontWeight: "800", fontSize: 12 },
  tripDate: { color: colors.text, fontSize: 13, fontWeight: "700" },
  tripCarrier: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 4 },
  airlineName: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  flightNo: {
    color: colors.textMuted, fontSize: 11, fontWeight: "800",
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    backgroundColor: colors.chipBg, letterSpacing: 0.5,
  },
  editRatesBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill,
    backgroundColor: colors.chipBg,
    borderColor: colors.lime, borderWidth: StyleSheet.hairlineWidth,
  },
  editRatesText: { color: colors.lime, fontSize: 12, fontWeight: "700" },
  tickerWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  rateBlurb: { color: colors.textDim, fontSize: 12, lineHeight: 17, marginBottom: spacing.md },
  rateField: { marginBottom: spacing.md },
  rateLabel: {
    color: colors.textMuted, fontSize: 12, textTransform: "uppercase",
    letterSpacing: 0.6, marginBottom: 6,
  },
  rateInput: {
    backgroundColor: colors.surface, borderRadius: radii.md,
    borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14, paddingVertical: 12,
    color: colors.text, fontSize: 15, fontWeight: "600",
  },
  rateHelper: { color: colors.textDim, fontSize: 12, marginTop: 6 },
  rateSaveBtn: {
    flex: 1, paddingVertical: 12, borderRadius: radii.pill,
    backgroundColor: colors.lime, alignItems: "center",
  },
  rateSaveText: { color: colors.bg, fontWeight: "800", fontSize: 14 },
  slotsBar: { flexDirection: "row", alignItems: "center", gap: 8 },
  slotsTrack: { flex: 1, height: 8, backgroundColor: colors.chipBg, borderRadius: 4, overflow: "hidden" },
  slotsFill: { height: "100%", backgroundColor: colors.lime, borderRadius: 4 },
  slotsText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  tripNotes: { color: colors.textDim, fontSize: 12, marginTop: 8 },
  emptyBox: { padding: spacing.xxl, alignItems: "center", gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 8 },
  emptySub: { color: colors.textDim, fontSize: 13, textAlign: "center" },
  fab: {
    position: "absolute", right: spacing.lg, bottom: spacing.lg + 60,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.lime, alignItems: "center", justifyContent: "center",
    elevation: 10,
  },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surfaceAlt, padding: spacing.lg,
    borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
    borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing.md },
  sheetTitle: { color: colors.text, fontSize: 16, fontWeight: "800", marginBottom: spacing.md },
  sheetItem: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingVertical: 12, borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth,
  },
  sheetIcon: {
    width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.limeGlow, borderColor: colors.lime, borderWidth: 1,
  },
  sheetItemTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  sheetItemSub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  sheetCancel: {
    marginTop: spacing.md, paddingVertical: 12, alignItems: "center",
    borderRadius: radii.pill, backgroundColor: colors.chipBg,
  },
  sheetCancelText: { color: colors.text, fontWeight: "700" },
});

// Types re-export for other components (BullionTxn imported at top).
export type { BullionTxn };
