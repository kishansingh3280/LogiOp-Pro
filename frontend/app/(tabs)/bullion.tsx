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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useApi } from "@/src/api/hooks";
import type { Party } from "@/src/api/types";
import { findAirline } from "@/src/bullion/airlines";
import { AirlineBadge } from "@/src/bullion/AirlineBadge";
import { defaultAirports } from "@/src/bullion/airports";
import { FlightMap } from "@/src/bullion/FlightMap";
import { MarketTickerSlim } from "@/src/bullion/MarketTickerSlim";
import { getRateHistory, setRates, useRates, type BullionRateHistoryEntry } from "@/src/bullion/rates";
import { AssetMap } from "@/src/bullion/AssetMap";
import { SplitSheet } from "@/src/bullion/SplitSheet";
import { usedWeightKgFor, useTrips, useTxns } from "@/src/bullion/store";
import { FYPicker } from "@/src/components/fy-picker";
import { FYLockedButton } from "@/src/components/fy-gate";
import { useFY } from "@/src/context/fy-context";
import {
  computeTxn,
  STATUS_COLOR,
  STATUS_LABEL,
  tripCapacityKg,
  type BullionTxn,
} from "@/src/bullion/types";
import { colors, radii, spacing } from "@/src/theme";
import { fmtCurrency, shortDate } from "@/src/utils/format";
import { isInFY } from "@/src/utils/fy";

type View_ = "trades" | "trips" | "map";
type Filter = "all" | "currency" | "gold" | "open" | "completed";

export default function BullionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const trips = useTrips();
  const txns = useTxns();
  const parties = useApi<Party[]>("/api/parties");
  const [view, setView] = useState<View_>("trips");
  const [filter, setFilter] = useState<Filter>("all");
  const [fabOpen, setFabOpen] = useState(false);
  const [editRates, setEditRates] = useState(false);
  const [splitTarget, setSplitTarget] = useState<BullionTxn | null>(null);
  const rates = useRates();

  const partyMap = useMemo(() => {
    const m: Record<string, Party> = {};
    (parties.data || []).forEach((p) => (m[p.id] = p));
    return m;
  }, [parties.data]);

  const { fy } = useFY();
  const fyTrips = useMemo(
    () => trips.data.filter((t) => isInFY(t.date, fy)),
    [trips.data, fy],
  );
  // For txns we bucket by the parent trip's date when available; otherwise
  // fall back to the txn's own created_at.
  const fyTxns = useMemo(() => {
    const tripDates = new Map(trips.data.map((t) => [t.id, t.date]));
    return txns.data.filter((t) => {
      const anchor = (t.trip_id && tripDates.get(t.trip_id)) || t.created_at;
      return isInFY(anchor, fy);
    });
  }, [txns.data, trips.data, fy]);

  const tradesSorted = useMemo(
    () => fyTxns.slice().sort((a, b) => (a.created_at > b.created_at ? -1 : 1)),
    [fyTxns],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return tradesSorted;
    if (filter === "currency" || filter === "gold") return tradesSorted.filter((t) => t.type === filter);
    if (filter === "open") return tradesSorted.filter((t) => t.status !== "completed");
    return tradesSorted.filter((t) => t.status === "completed");
  }, [tradesSorted, filter]);

  const tripsSorted = useMemo(
    () => fyTrips.slice().sort((a, b) => (a.date > b.date ? -1 : 1)),
    [fyTrips],
  );

  // Aggregate stats — FY-scoped
  const stats = useMemo(() => {
    let openCnt = 0, completedCnt = 0, totalProfit = 0;
    fyTxns.forEach((t) => {
      const calc = computeTxn(t, rates.data);
      if (t.status === "completed") completedCnt++; else openCnt++;
      if (calc.profit_inr !== null) totalProfit += calc.profit_inr;
    });
    return { openCnt, completedCnt, totalProfit };
  }, [fyTxns, rates.data]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Trips</Text>
          <Text style={styles.subtitle}>
            {fyTxns.length} trade{fyTxns.length === 1 ? "" : "s"} · {fyTrips.length} trip{fyTrips.length === 1 ? "" : "s"}
          </Text>
        </View>
        <FYPicker earliest="2024-04-01" />
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
        <MarketTickerSlim />
      </View>

      <View style={styles.segRow}>
        <SegBtn label="Trips" active={view === "trips"} onPress={() => setView("trips")} testID="bullion-tab-trips" />
        <SegBtn label="Vault" active={view === "map"} onPress={() => setView("map")} testID="bullion-tab-map" />
        <SegBtn label="Trades" active={view === "trades"} onPress={() => setView("trades")} testID="bullion-tab-trades" />
      </View>

      {view === "map" ? (
        <AssetMap txns={fyTxns} />
      ) : view === "trades" ? (
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
                  {/* Partial-split state chip + inline split button */}
                  {(() => {
                    const isChild = !!item.parent_id;
                    const original = item.weight_kg || 0;
                    const remaining =
                      typeof item.remaining_weight_kg === "number"
                        ? item.remaining_weight_kg
                        : original;
                    const wasSplit = original > 0 && remaining < original;
                    const canSplit = !isChild && remaining > 0 && trips.data.length > 0 && original > 0;
                    const unit = (item.gold_unit as string | undefined) || "kg";
                    return (
                      <View style={styles.splitInline}>
                        {isChild ? (
                          <View style={styles.childChip}>
                            <Ionicons name="git-branch-outline" size={10} color={colors.info} />
                            <Text style={styles.childChipText}>SPLIT CHILD</Text>
                          </View>
                        ) : wasSplit ? (
                          <View style={styles.remainChip}>
                            <Ionicons name="pie-chart-outline" size={10} color={colors.warn} />
                            <Text style={styles.remainChipText}>
                              {remaining} {unit} left
                            </Text>
                          </View>
                        ) : null}
                        {canSplit ? (
                          <Pressable
                            onPress={(e) => {
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              (e as any).stopPropagation?.();
                              setSplitTarget(item as BullionTxn);
                            }}
                            hitSlop={6}
                            style={styles.splitBtn}
                            testID={`split-btn-${item.txn_no}`}
                          >
                            <Ionicons name="cut-outline" size={12} color={colors.lime} />
                            <Text style={styles.splitBtnText}>Split</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    );
                  })()}
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
            // ------- Trips-module column values -------
            const cur = (item.currency_amount || 0) > 0
              ? `${fmtCompact(item.currency_amount || 0)} ${item.currency_type || ""}`.trim()
              : null;
            const gold = (item.gold_baht || 0) > 0 ? `${fmtCompact(item.gold_baht || 0)} baht` : null;
            const charge = (item.carry_charge_inr || 0) > 0
              ? fmtCurrency(item.carry_charge_inr || 0, "INR")
              : null;
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
                {/* Trips-module compact info strip. Renders only fields that
                    have a value so the card stays clean when nothing is set. */}
                {(cur || gold || charge || item.shipment_ref?.consignment_no) ? (
                  <View style={styles.tripStrip} testID={`trip-strip-${item.id}`}>
                    {cur ? (
                      <View style={styles.tripPill}>
                        <Ionicons name="cash-outline" size={11} color={colors.lime} />
                        <Text style={styles.tripPillText}>{cur}</Text>
                      </View>
                    ) : null}
                    {gold ? (
                      <View style={[styles.tripPill, { borderColor: "#F5C518", backgroundColor: "#3a2f0022" }]}>
                        <Ionicons name="diamond-outline" size={11} color="#F5C518" />
                        <Text style={[styles.tripPillText, { color: "#F5C518" }]}>{gold}</Text>
                      </View>
                    ) : null}
                    {charge ? (
                      <View style={[styles.tripPill, { borderColor: colors.warn, backgroundColor: "rgba(255,176,32,0.10)" }]}>
                        <Ionicons name="wallet-outline" size={11} color={colors.warn} />
                        <Text style={[styles.tripPillText, { color: colors.warn }]}>{charge}</Text>
                      </View>
                    ) : null}
                    {item.shipment_ref?.consignment_no ? (
                      <View style={[styles.tripPill, { borderColor: colors.info, backgroundColor: "rgba(0,209,255,0.10)" }]}>
                        <Ionicons name="cube-outline" size={11} color={colors.info} />
                        <Text style={[styles.tripPillText, { color: colors.info }]}>
                          {item.shipment_ref.consignment_no}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
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

      <FYLockedButton
        style={[styles.fab, { bottom: insets.bottom + 168 }]}
        onPress={() => setFabOpen(true)}
        testID="bullion-fab"
        accessibilityLabel="Create new bullion entry"
      >
        <Ionicons name="add" size={26} color={colors.bg} />
      </FYLockedButton>

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

      <SplitSheet
        txn={splitTarget}
        trips={trips.data}
        visible={!!splitTarget}
        onClose={() => setSplitTarget(null)}
        onDone={async () => {
          setSplitTarget(null);
          await txns.refresh();
          await trips.refresh();
        }}
      />
    </SafeAreaView>
  );
}

function RatesEditorModal({
  initial,
  onClose,
  onSave,
}: {
  initial: { currency_rate_per_1000: number; gold_rate_per_baht: number; hand_carry_rate_inr_per_kg: number };
  onClose: () => void;
  onSave: (next: { currency_rate_per_1000: number; gold_rate_per_baht: number; hand_carry_rate_inr_per_kg: number }) => void | Promise<void>;
}) {
  const [currencyRate, setCurrencyRate] = useState(String(initial.currency_rate_per_1000));
  const [goldRate, setGoldRate] = useState(String(initial.gold_rate_per_baht));
  const [handCarryRate, setHandCarryRate] = useState(String(initial.hand_carry_rate_inr_per_kg));
  const [saving, setSaving] = useState(false);
  // Tabs: "edit" (default) shows the rate inputs, "history" shows the
  // timeline of past changes so the operator can audit what was updated
  // when. The history is fetched lazily the first time the tab is opened.
  const [tab, setTab] = useState<"edit" | "history">("edit");
  const [history, setHistory] = useState<BullionRateHistoryEntry[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const list = await getRateHistory(50);
      setHistory(list);
    } finally {
      setHistoryLoading(false);
    }
  };

  const commit = async () => {
    const c = parseFloat(currencyRate);
    const g = parseFloat(goldRate);
    const h = parseFloat(handCarryRate);
    if (!Number.isFinite(c) || c < 0) return Alert.alert("Invalid", "Currency rate must be ≥ 0");
    if (!Number.isFinite(g) || g < 0) return Alert.alert("Invalid", "Gold rate must be ≥ 0");
    if (!Number.isFinite(h) || h < 0) return Alert.alert("Invalid", "Hand-carry rate must be ≥ 0");
    setSaving(true);
    try {
      await onSave({ currency_rate_per_1000: c, gold_rate_per_baht: g, hand_carry_rate_inr_per_kg: h });
      // Invalidate the cached history so it re-fetches with the new entry
      // next time the operator opens this modal.
      setHistory(null);
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
            Applied only to new bullion trades and hand-carry shipments. Existing
            records keep the rate that was in effect on the day they were saved,
            so historical carrier fees never move.
          </Text>

          {/* Edit / History tab switcher */}
          <View style={styles.rateTabRow}>
            <TouchableOpacity
              style={[styles.rateTab, tab === "edit" && styles.rateTabActive]}
              onPress={() => setTab("edit")}
              testID="rate-tab-edit"
            >
              <Ionicons
                name="pricetags-outline"
                size={14}
                color={tab === "edit" ? colors.bg : colors.textMuted}
              />
              <Text style={[styles.rateTabText, tab === "edit" && styles.rateTabTextActive]}>
                Edit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rateTab, tab === "history" && styles.rateTabActive]}
              onPress={() => {
                setTab("history");
                if (!history) loadHistory();
              }}
              testID="rate-tab-history"
            >
              <Ionicons
                name="time-outline"
                size={14}
                color={tab === "history" ? colors.bg : colors.textMuted}
              />
              <Text style={[styles.rateTabText, tab === "history" && styles.rateTabTextActive]}>
                History
              </Text>
            </TouchableOpacity>
          </View>

          {tab === "edit" ? (
            <>
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

              <View style={styles.rateField}>
                <Text style={styles.rateLabel}>Hand-carry shipments — INR per kg</Text>
                <TextInput
                  style={styles.rateInput}
                  value={handCarryRate}
                  onChangeText={setHandCarryRate}
                  keyboardType="decimal-pad"
                  placeholder="200"
                  placeholderTextColor={colors.textDim}
                  testID="rate-hand-carry-per-kg"
                />
                <Text style={styles.rateHelper}>
                  e.g. 25 kg hand-carry → ₹{(Number(handCarryRate) || 0) * 25} paid to the carrier.
                </Text>
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
            </>
          ) : (
            <RatesHistoryView
              history={history}
              loading={historyLoading}
              onRefresh={loadHistory}
              onClose={onClose}
            />
          )}
        </KeyboardAvoidingView>
      </Pressable>
    </Pressable>
  );
}

function RatesHistoryView({
  history,
  loading,
  onRefresh,
  onClose,
}: {
  history: BullionRateHistoryEntry[] | null;
  loading: boolean;
  onRefresh: () => void | Promise<void>;
  onClose: () => void;
}) {
  const list = history || [];
  return (
    <View>
      <View style={styles.historyHead}>
        <Text style={styles.historyCount}>
          {loading ? "Loading…" : `${list.length} change${list.length === 1 ? "" : "s"} recorded`}
        </Text>
        <TouchableOpacity onPress={onRefresh} disabled={loading} style={styles.historyRefresh}>
          <Ionicons name="refresh-outline" size={14} color={colors.lime} />
          <Text style={styles.historyRefreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>
      {list.length === 0 && !loading ? (
        <View style={styles.historyEmpty}>
          <Ionicons name="time-outline" size={36} color={colors.textDim} />
          <Text style={styles.historyEmptyTitle}>No rate changes yet</Text>
          <Text style={styles.historyEmptySub}>
            Save a new rate from the Edit tab and the change will show up here.
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.historyScroll} showsVerticalScrollIndicator={false}>
          {list.map((h, idx) => (
            <View key={h.id} style={styles.historyRow}>
              <View style={styles.historyDot}>
                <View style={styles.historyDotInner} />
                {idx < list.length - 1 ? <View style={styles.historyDotLine} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.historyRowHead}>
                  <Text style={styles.historyTime}>
                    {new Date(h.timestamp).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </Text>
                  {h.source ? (
                    <View
                      style={[
                        styles.historySrcPill,
                        h.source === "wingman" && { borderColor: colors.info, backgroundColor: colors.info + "22" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.historySrcText,
                          h.source === "wingman" && { color: colors.info },
                        ]}
                      >
                        {h.source}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {Object.keys(h.diffs || {}).length === 0 ? (
                  <Text style={styles.historyNoChange}>(no numeric change)</Text>
                ) : (
                  Object.entries(h.diffs).map(([k, v]) => (
                    <View key={k} style={styles.historyDiffRow}>
                      <Text style={styles.historyDiffKey}>{RATE_LABELS[k] || k}</Text>
                      <Text style={styles.historyDiffFrom}>{formatRateNum(v.from)}</Text>
                      <Ionicons name="arrow-forward" size={11} color={colors.textDim} />
                      <Text style={styles.historyDiffTo}>{formatRateNum(v.to)}</Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
      <TouchableOpacity style={[styles.sheetCancel, { marginTop: spacing.md }]} onPress={onClose}>
        <Text style={styles.sheetCancelText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

const RATE_LABELS: Record<string, string> = {
  currency_rate_per_1000: "Currency carry (INR/1,000)",
  gold_rate_per_baht: "Gold carry (INR/baht)",
  hand_carry_rate_inr_per_kg: "Hand-carry (INR/kg)",
};

function formatRateNum(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n as number)) return "—";
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function fmtKgSmart(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** Compact number formatter used by the Trips card strip:
 *  1500  → "1.5K", 20000 → "20K", 1250000 → "1.3M". Falls back to
 *  the raw integer for values under 1000 so tiny amounts stay legible. */
function fmtCompact(n: number): string {
  const v = Math.abs(n || 0);
  if (v < 1000) return Number.isInteger(v) ? String(v) : v.toFixed(1);
  if (v < 1_000_000) return `${(v / 1000).toFixed(v >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return `${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
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
  safe: { flex: 1, backgroundColor: "transparent" },
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
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
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
  txnFootText: { color: colors.textDim, fontSize: 11, flex: 1 },
  splitInline: { flexDirection: "row", alignItems: "center", gap: 6 },
  remainChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.pill,
    backgroundColor: "rgba(255,176,32,0.12)",
    borderColor: "rgba(255,176,32,0.35)", borderWidth: StyleSheet.hairlineWidth,
  },
  remainChipText: { color: colors.warn, fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },
  childChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.pill,
    backgroundColor: "rgba(125,249,255,0.10)",
    borderColor: "rgba(125,249,255,0.30)", borderWidth: StyleSheet.hairlineWidth,
  },
  childChipText: { color: colors.info, fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },
  splitBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: radii.pill,
    borderColor: colors.lime, borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0, 209, 255, 0.08)",
  },
  splitBtnText: { color: colors.lime, fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },
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
  tripStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tripPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.limeGlow,
    borderColor: colors.lime,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tripPillText: {
    color: colors.lime,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  emptyBox: { padding: spacing.xxl, alignItems: "center", gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 8 },
  emptySub: { color: colors.textDim, fontSize: 13, textAlign: "center" },
  fab: {
    position: "absolute", right: spacing.lg,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.lime, alignItems: "center", justifyContent: "center",
    elevation: 10,
    zIndex: 1001,   // sit above the FloatingJarvis bubble (zIndex 999)
    shadowColor: colors.lime,
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
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
  // Rate editor tab switcher
  rateTabRow: {
    flexDirection: "row",
    gap: 6,
    padding: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.chipBg,
    marginBottom: spacing.md,
  },
  rateTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  rateTabActive: {
    backgroundColor: colors.lime,
  },
  rateTabText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  rateTabTextActive: {
    color: colors.bg,
  },
  // Rate change history view
  historyHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  historyCount: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  historyRefresh: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.chipBg,
    borderColor: colors.lime,
    borderWidth: StyleSheet.hairlineWidth,
  },
  historyRefreshText: { color: colors.lime, fontSize: 11, fontWeight: "800" },
  historyEmpty: {
    padding: spacing.lg,
    alignItems: "center",
    gap: 6,
  },
  historyEmptyTitle: { color: colors.text, fontSize: 14, fontWeight: "700", marginTop: 6 },
  historyEmptySub: { color: colors.textDim, fontSize: 12, textAlign: "center" },
  historyScroll: { maxHeight: 340 },
  historyRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  historyDot: {
    width: 14,
    alignItems: "center",
    paddingTop: 4,
  },
  historyDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.lime,
  },
  historyDotLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: 3,
  },
  historyRowHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  historyTime: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  historySrcPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lime,
    backgroundColor: colors.limeGlow,
  },
  historySrcText: {
    color: colors.lime,
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  historyDiffRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
    flexWrap: "wrap",
  },
  historyDiffKey: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    marginRight: 4,
  },
  historyDiffFrom: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: "700",
    textDecorationLine: "line-through",
  },
  historyDiffTo: {
    color: colors.lime,
    fontSize: 12,
    fontWeight: "800",
  },
  historyNoChange: {
    color: colors.textDim,
    fontSize: 11,
    fontStyle: "italic",
  },
});

// Types re-export for other components (BullionTxn imported at top).
export type { BullionTxn };
