import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiDelete, apiPost, apiPut } from "@/src/api/client";
import { useApi } from "@/src/api/hooks";
import type {
  Invoice,
  Item,
  LedgerEntry,
  Party,
  Shipment,
  ShipmentBag,
  ShipmentStatus,
} from "@/src/api/types";
import { colors, radii, spacing } from "@/src/theme";
import { fmtCurrency, shortDate } from "@/src/utils/format";
import { generatePackingListPdf } from "@/src/utils/packing-list-pdf";

// ---------------------------------------------------------------------------
// Shipment Console 2.0 — multi-party detail screen
//
// Layout:
//   • Sticky Top Header (Consignment + Status + Modify/Delete)
//   • High-density Metric Row (Bags / Pieces / Weight) with electric-blue glow
//   • Filter Carousels — Party chips (tap to filter bags) + Bag status chips
//   • Route / Direction / Mode summary
//   • Money card (customer pays vs carrier pay vs margin)
//   • Parties card (customer + carrier)
//   • Filtered bag list — glowing bag IDs, status tags, nested item list,
//     end customer contact, per-bag Lalamove CTA
//   • Timeline, Details, Ledger, Linked Invoice
//
// Design tokens: deep-space #020202 base + Cyber-Siri electric blue accents.
// ---------------------------------------------------------------------------

const STATUS_FLOW: ShipmentStatus[] = ["pending", "in_transit", "warehouse_arrived", "delivered"];

type BookResult = {
  bag_id: string;
  bag_no: string;
  end_customer_name?: string;
  skipped?: string;
  booked?: unknown;
  error?: string;
};

// Bag status filter buckets. `all` matches everything; the rest match on the
// `bag.status` field (fallback: "packed").
const BAG_STATUS_FILTERS: { key: string; label: string; match: (s?: string) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "packed", label: "Packed", match: (s) => (s || "packed") === "packed" },
  { key: "in_transit", label: "In-Transit", match: (s) => s === "in_transit" },
  { key: "delivered", label: "Delivered", match: (s) => s === "delivered" },
];

// Status → glow colour map (used for both shipment header + per-bag chips).
const STATUS_TONE: Record<string, { fg: string; bg: string; glow: string; label: string }> = {
  pending: { fg: "#F59E0B", bg: "rgba(245,158,11,0.14)", glow: "rgba(245,158,11,0.4)", label: "Pending" },
  in_transit: { fg: "#60A5FA", bg: "rgba(96,165,250,0.14)", glow: "rgba(96,165,250,0.4)", label: "In-Transit" },
  warehouse_arrived: { fg: "#00D1FF", bg: "rgba(0,209,255,0.14)", glow: "rgba(0,209,255,0.45)", label: "Warehouse" },
  delivered: { fg: "#34D399", bg: "rgba(52,211,153,0.14)", glow: "rgba(52,211,153,0.4)", label: "Delivered" },
  packed: { fg: "#A78BFA", bg: "rgba(167,139,250,0.14)", glow: "rgba(167,139,250,0.4)", label: "Packed" },
  draft: { fg: "#94A3B8", bg: "rgba(148,163,184,0.14)", glow: "rgba(148,163,184,0.35)", label: "Draft" },
  sent: { fg: "#60A5FA", bg: "rgba(96,165,250,0.14)", glow: "rgba(96,165,250,0.4)", label: "Sent" },
  paid: { fg: "#34D399", bg: "rgba(52,211,153,0.14)", glow: "rgba(52,211,153,0.4)", label: "Paid" },
  cancelled: { fg: "#F87171", bg: "rgba(248,113,113,0.14)", glow: "rgba(248,113,113,0.4)", label: "Cancelled" },
};

function toneFor(status?: string) {
  return STATUS_TONE[status || "packed"] || STATUS_TONE.packed;
}

/** Compact kg formatter — keeps the metric tile narrow. Uses whole kg for
 *  weights ≥ 100, one decimal for smaller ones. */
function fmtKg(kg: number): string {
  if (kg >= 100) return String(Math.round(kg));
  if (kg >= 10) return kg.toFixed(1);
  return kg.toFixed(2);
}

/** Shadow / web-boxShadow helper — RN Web complains about legacy shadow* props
 *  so we prefer `boxShadow` on web and native shadow tokens elsewhere. */
function glowShadow(color: string, radius = 12) {
  if (Platform.OS === "web") {
    return { boxShadow: `0 0 ${radius}px ${color}` } as never;
  }
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: radius,
    elevation: 4,
  } as never;
}

export default function ShipmentDetail({
  idOverride,
  embedded,
}: {
  idOverride?: string;
  embedded?: boolean;
} = {}) {
  const params = useLocalSearchParams<{ id: string }>();
  const id = idOverride || params.id;
  const router = useRouter();

  const shipment = useApi<Shipment>(id ? `/api/shipments/${id}` : null);
  const bags = useApi<ShipmentBag[]>(id ? `/api/shipments/${id}/bags` : null);
  const parties = useApi<Party[]>("/api/parties");
  const items = useApi<Item[]>("/api/items");
  const ledger = useApi<LedgerEntry[]>("/api/ledger/entries");
  const invoices = useApi<Invoice[]>("/api/invoices");
  const linkedInvoice = useMemo(
    () => (invoices.data || []).find((inv) => inv.shipment_id === id),
    [invoices.data, id],
  );

  const [busy, setBusy] = useState(false);
  const [bookResult, setBookResult] = useState<BookResult[] | null>(null);
  // Filter state — "all" or a specific party ID
  const [partyFilter, setPartyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const partyMap = useMemo(() => {
    const m: Record<string, Party> = {};
    (parties.data || []).forEach((p) => (m[p.id] = p));
    return m;
  }, [parties.data]);

  const itemMap = useMemo(() => {
    const m: Record<string, Item> = {};
    (items.data || []).forEach((i) => (m[i.id] = i));
    return m;
  }, [items.data]);

  const party = shipment.data ? partyMap[shipment.data.party_id] : undefined;
  const carrier = shipment.data?.carrier_party_id
    ? partyMap[shipment.data.carrier_party_id]
    : undefined;

  const related = useMemo(
    () =>
      (ledger.data || [])
        .filter((e) => e.ref_type === "shipment" && e.ref_id === id)
        .sort((a, b) => (a.date > b.date ? -1 : 1)),
    [ledger.data, id],
  );

  const bagList: ShipmentBag[] = useMemo(() => bags.data || [], [bags.data]);

  // Unique end customers extracted from the bag list — powers the top filter
  // carousel. Bags without an end_customer_id fall into the "unassigned"
  // bucket so operators can spot them at a glance.
  type PartyBucket = { id: string; name: string; count: number; weight: number; pieces: number };
  const partyBuckets: PartyBucket[] = useMemo(() => {
    const buckets = new Map<string, PartyBucket>();
    for (const bag of bagList) {
      const key = bag.end_customer_id || "__unassigned__";
      const name =
        (bag.end_customer_id && partyMap[bag.end_customer_id]?.name) ||
        "Unassigned";
      const pieces = (bag.items || []).reduce((sum, it) => sum + (it.quantity || 0), 0);
      const prev = buckets.get(key);
      if (prev) {
        prev.count += 1;
        prev.weight += bag.weight_kg || 0;
        prev.pieces += pieces;
      } else {
        buckets.set(key, { id: key, name, count: 1, weight: bag.weight_kg || 0, pieces });
      }
    }
    return Array.from(buckets.values()).sort((a, b) => b.count - a.count);
  }, [bagList, partyMap]);

  // Filtered bags (party + status)
  const filteredBags = useMemo(() => {
    const statusMatcher = BAG_STATUS_FILTERS.find((f) => f.key === statusFilter)?.match || (() => true);
    return bagList.filter((bag) => {
      const partyOk =
        partyFilter === "all"
          ? true
          : partyFilter === "__unassigned__"
            ? !bag.end_customer_id
            : bag.end_customer_id === partyFilter;
      const statusOk = statusMatcher(bag.status);
      return partyOk && statusOk;
    });
  }, [bagList, partyFilter, statusFilter]);

  // Aggregate metrics — always across ALL bags so the top glow doesn't jitter
  // as filters change.
  const totals = useMemo(() => {
    let pieces = 0;
    let weight = 0;
    for (const bag of bagList) {
      weight += bag.weight_kg || 0;
      pieces += (bag.items || []).reduce((s, it) => s + (it.quantity || 0), 0);
    }
    return { pieces, weight, bags: bagList.length };
  }, [bagList]);

  // Money math (unchanged, still supports mixed-currency margin calc)
  const money = useMemo(() => {
    const s = shipment.data;
    if (!s) return null;
    const freight = s.freight || 0;
    const freightCur = s.freight_currency;
    const carrierCharge = s.carrier_charge || 0;
    const carrierType = s.carrier_charge_type;
    const carrierCur = (s.carrier_currency || "INR") as "INR" | "THB";
    const carrierPay =
      carrierType === "per_kg" ? carrierCharge * (s.weight_kg || 0) : carrierCharge;
    let carrierPayInFreight = carrierPay;
    if (carrierCur !== freightCur && s.forex_rate) {
      if (freightCur === "THB" && carrierCur === "INR") carrierPayInFreight = carrierPay / s.forex_rate;
      else if (freightCur === "INR" && carrierCur === "THB") carrierPayInFreight = carrierPay * s.forex_rate;
    }
    const margin = freight - carrierPayInFreight;
    return {
      freight,
      freightCur,
      carrierPay,
      carrierCur,
      carrierType,
      carrierPayInFreight,
      margin,
    };
  }, [shipment.data]);

  const advance = async () => {
    if (!shipment.data) return;
    const idx = STATUS_FLOW.indexOf(shipment.data.status);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
    const next = STATUS_FLOW[idx + 1];
    setBusy(true);
    try {
      const res = await apiPut<Shipment>(`/api/shipments/${shipment.data.id}`, {
        ...shipment.data,
        status: next,
      });
      if ((res as { queued?: boolean }).queued) {
        Alert.alert("Queued", "Status change will sync when back online.");
      }
      await shipment.refresh();
    } catch (e) {
      Alert.alert("Failed", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const bookLalamove = async () => {
    if (!shipment.data) return;
    setBusy(true);
    try {
      const res = await apiPost<{ results: BookResult[]; booked: number; skipped: number; errors: number }>(
        `/api/shipments/${shipment.data.id}/auto-book-lalamove`,
      );
      if ((res as { queued?: boolean }).queued) {
        Alert.alert("Queued", "Lalamove booking will run when back online.");
        return;
      }
      const r = res as { results: BookResult[]; booked: number; skipped: number; errors: number };
      setBookResult(r.results || []);
    } catch (e) {
      Alert.alert("Failed", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    if (!shipment.data) return;
    Alert.alert("Delete shipment", `Delete ${shipment.data.consignment_no}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await apiDelete(`/api/shipments/${shipment.data!.id}`);
            if (!embedded) router.back();
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const Wrapper: React.ComponentType<{ children: React.ReactNode }> = embedded
    ? ({ children }) => <View style={styles.embed}>{children}</View>
    : ({ children }) => (
        <SafeAreaView edges={["top"]} style={styles.safe}>
          {children}
        </SafeAreaView>
      );

  if (shipment.loading && !shipment.data) {
    return (
      <Wrapper>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Wrapper>
    );
  }

  if (!shipment.data) {
    return (
      <Wrapper>
        <View style={styles.loading}>
          <Text style={styles.dim}>Shipment not found</Text>
        </View>
      </Wrapper>
    );
  }

  const s = shipment.data;
  const nextIdx = STATUS_FLOW.indexOf(s.status);
  const nextLabel = nextIdx >= 0 && nextIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[nextIdx + 1] : null;
  const inWarehouse = s.status === "warehouse_arrived";
  const canModify = s.status === "pending";
  const modifyLockedReason = !canModify
    ? s.status === "delivered"
      ? "Delivered · locked"
      : s.status === "in_transit"
        ? "Dispatched · locked"
        : s.status === "warehouse_arrived"
          ? "At warehouse · locked"
          : "Locked"
    : null;
  const shipTone = toneFor(s.status);

  const openModify = () => {
    if (!canModify) {
      Alert.alert(
        "Shipment locked",
        `This shipment is ${s.status.replace("_", " ")}. Modifications are only allowed while the shipment is pending. To make changes, first roll back the status.`,
      );
      return;
    }
    router.push(`/shipment/new?editId=${s.id}` as never);
  };

  return (
    <Wrapper>
      {!embedded && (
        <View style={styles.headBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="back-btn">
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headCenter}>
            <Text style={styles.headEyebrow}>Consignment</Text>
            <Text style={styles.headTitle} numberOfLines={1}>
              {s.consignment_no}
            </Text>
          </View>
          <TouchableOpacity
            onPress={openModify}
            style={[styles.modifyBtn, !canModify && styles.modifyBtnDisabled]}
            testID="modify-shipment-btn"
          >
            <Ionicons
              name={canModify ? "create-outline" : "lock-closed-outline"}
              size={14}
              color={canModify ? colors.accent : colors.textDim}
            />
            <Text style={[styles.modifyText, !canModify && styles.modifyTextDisabled]}>
              {canModify ? "Modify" : "Locked"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (!shipment.data) return;
              generatePackingListPdf({
                shipment: shipment.data,
                bags: bagList,
                parties: parties.data || [],
              }).catch(() => { /* silent — sharing sheet may be cancelled */ });
            }}
            style={styles.iconBtn}
            testID="packing-list-btn"
            accessibilityLabel="Generate packing list"
          >
            <Ionicons name="document-text-outline" size={20} color={colors.lime} />
          </TouchableOpacity>
          <TouchableOpacity onPress={remove} style={styles.iconBtn} testID="delete-btn">
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ============================================================
             Hero — High-density metric header
           ============================================================ */}
        <LinearGradient
          colors={["rgba(0, 209, 255, 0.10)", "rgba(124, 58, 237, 0.05)", "rgba(2,2,2,0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, glowShadow("rgba(0,209,255,0.35)", 24)]}
        >
          {/* Status + Route */}
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <View style={styles.routeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cityLbl}>Origin</Text>
                  <Text style={styles.cityName} numberOfLines={1}>
                    {s.origin || "—"}
                  </Text>
                </View>
                <View style={styles.routeArrow}>
                  <Ionicons name="airplane" size={16} color={colors.accent} />
                </View>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text style={styles.cityLbl}>Destination</Text>
                  <Text style={[styles.cityName, { textAlign: "right" }]} numberOfLines={1}>
                    {s.destination || "—"}
                  </Text>
                </View>
              </View>
              <View style={styles.heroMetaRow}>
                <View style={styles.metaChip}>
                  <Ionicons name="swap-horizontal" size={11} color={colors.accent} />
                  <Text style={styles.metaChipText}>{(s.direction || "").replace("_TO_", " → ")}</Text>
                </View>
                <View style={styles.metaChip}>
                  <Ionicons name="airplane-outline" size={11} color={colors.accent} />
                  <Text style={styles.metaChipText}>{(s.mode || "-").replace("_", " ")}</Text>
                </View>
                <View style={styles.metaChip}>
                  <Ionicons name="calendar-outline" size={11} color={colors.accent} />
                  <Text style={styles.metaChipText}>{shortDate(s.dispatch_date)}</Text>
                </View>
              </View>
            </View>
            <View
              style={[
                styles.statusChip,
                { backgroundColor: shipTone.bg, borderColor: shipTone.fg },
                glowShadow(shipTone.glow, 10),
              ]}
              testID="ship-status-chip"
            >
              <View style={[styles.statusDot, { backgroundColor: shipTone.fg }]} />
              <Text style={[styles.statusChipText, { color: shipTone.fg }]}>{shipTone.label}</Text>
            </View>
          </View>

          {/* Big metric row — Pieces / Weight / Bags */}
          <View style={styles.metricRow}>
            <MetricTile
              icon="apps"
              label="Total Pieces"
              value={String(totals.pieces || 0)}
              glow="rgba(0, 209, 255, 0.45)"
            />
            <MetricTile
              icon="scale-outline"
              label="Total Weight"
              value={fmtKg(totals.weight || s.weight_kg || 0)}
              suffix="kg"
              glow="rgba(0, 255, 255, 0.45)"
              tint={colors.cyan}
            />
            <MetricTile
              icon="cube-outline"
              label="Bags"
              value={String(totals.bags || s.bag_count || 0)}
              glow="rgba(167, 139, 250, 0.45)"
              tint={colors.purpleSoft}
            />
          </View>

          {/* Action row */}
          <View style={styles.actionRow}>
            {nextLabel && (
              <TouchableOpacity
                style={[styles.advanceBtn, glowShadow("rgba(0,209,255,0.55)", 14)]}
                onPress={advance}
                disabled={busy}
                testID="advance-status-btn"
              >
                {busy ? (
                  <ActivityIndicator color="#020202" size="small" />
                ) : (
                  <>
                    <Ionicons name="arrow-forward-circle" size={18} color="#020202" />
                    <Text style={styles.advanceText}>Mark as {nextLabel.replace("_", " ")}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {linkedInvoice ? (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => router.push(`/invoice/${linkedInvoice.id}` as never)}
                testID="open-linked-invoice-btn"
              >
                <Ionicons name="document-text" size={15} color={colors.accent} />
                <Text style={styles.secondaryBtnText} numberOfLines={1}>
                  {linkedInvoice.number}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => router.push(`/invoice/new?shipmentId=${s.id}` as never)}
                testID="generate-invoice-btn"
              >
                <Ionicons name="document-text-outline" size={15} color={colors.accent} />
                <Text style={styles.secondaryBtnText}>Generate Invoice</Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>

        {/* ============================================================
             Party Filter Carousel
           ============================================================ */}
        {partyBuckets.length > 0 && (
          <View style={styles.filterBlock}>
            <View style={styles.filterHead}>
              <Ionicons name="people" size={13} color={colors.accent} />
              <Text style={styles.filterHeadText}>Parties · {partyBuckets.length}</Text>
              {partyFilter !== "all" && (
                <TouchableOpacity onPress={() => setPartyFilter("all")} style={styles.clearFilter}>
                  <Ionicons name="close-circle" size={12} color={colors.textMuted} />
                  <Text style={styles.clearFilterText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carousel}
            >
              <PartyChip
                label="All"
                sublabel={`${bagList.length} bag${bagList.length === 1 ? "" : "s"}`}
                active={partyFilter === "all"}
                onPress={() => setPartyFilter("all")}
                testID="party-chip-all"
                variant="all"
              />
              {partyBuckets.map((b) => (
                <PartyChip
                  key={b.id}
                  label={b.name}
                  sublabel={`${b.count} bag${b.count === 1 ? "" : "s"} · ${b.pieces} pc · ${b.weight.toFixed(1)}kg`}
                  active={partyFilter === b.id}
                  onPress={() => setPartyFilter(b.id)}
                  testID={`party-chip-${b.id}`}
                  variant={b.id === "__unassigned__" ? "warn" : "party"}
                />
              ))}
            </ScrollView>

            {/* Status filter row */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statusFilterRow}
            >
              {BAG_STATUS_FILTERS.map((f) => {
                const active = statusFilter === f.key;
                const t = f.key === "all" ? { fg: colors.accent, bg: "rgba(0,209,255,0.10)" } : toneFor(f.key);
                return (
                  <TouchableOpacity
                    key={f.key}
                    onPress={() => setStatusFilter(f.key)}
                    style={[
                      styles.statusFilterChip,
                      active && {
                        backgroundColor: t.bg,
                        borderColor: t.fg,
                      },
                    ]}
                    testID={`status-filter-${f.key}`}
                  >
                    <Text style={[styles.statusFilterText, active && { color: t.fg }]}>{f.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ============================================================
             Money card
           ============================================================ */}
        {money && (
          <View style={styles.moneyCard} testID="money-card">
            <View style={styles.moneyRow}>
              <View style={[styles.moneyCol, styles.moneyColBorder]}>
                <Text style={styles.moneyLbl}>Customer pays</Text>
                <Text style={[styles.moneyVal, { color: colors.ok }]}>
                  {fmtCurrency(money.freight, money.freightCur)}
                </Text>
                <Text style={styles.moneyHint} numberOfLines={1}>
                  {party?.name || "customer"}
                </Text>
              </View>
              <View style={styles.moneyCol}>
                <Text style={styles.moneyLbl}>You pay carrier</Text>
                <Text style={[styles.moneyVal, { color: colors.danger }]}>
                  {fmtCurrency(money.carrierPay, money.carrierCur)}
                </Text>
                <Text style={styles.moneyHint} numberOfLines={1}>
                  {carrier?.name || "carrier"}
                  {money.carrierType === "per_kg" ? ` · ${fmtCurrency(s.carrier_charge || 0, money.carrierCur)}/kg` : ""}
                </Text>
              </View>
            </View>
            <View style={styles.marginBar}>
              <Text style={styles.marginLbl}>Your margin</Text>
              <Text
                style={[
                  styles.marginVal,
                  { color: money.margin >= 0 ? colors.accent : colors.danger },
                  money.margin >= 0 ? glowShadow(colors.accentGlow, 8) : undefined,
                ]}
              >
                {fmtCurrency(money.margin, money.freightCur)}
              </Text>
            </View>
          </View>
        )}

        {/* ============================================================
             Parties (Customer + Carrier)
           ============================================================ */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Parties</Text>
          <PartyRow
            role="Customer"
            party={party}
            onPress={() => party && router.push(`/party/${party.id}` as never)}
            testID="party-customer"
          />
          <PartyRow
            role="Carrier"
            party={carrier}
            onPress={() => carrier && router.push(`/party/${carrier.id}` as never)}
            testID="party-carrier"
          />
        </View>

        {/* ============================================================
             Bag list (filtered)
           ============================================================ */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Bags · {filteredBags.length}
              {filteredBags.length !== bagList.length ? (
                <Text style={styles.sectionSubtitle}> of {bagList.length}</Text>
              ) : null}
            </Text>
            {bags.loading && <ActivityIndicator size="small" color={colors.accent} />}
          </View>
          {bagList.length === 0 ? (
            <View style={styles.emptyBags}>
              <Ionicons name="cube-outline" size={22} color={colors.textDim} />
              <Text style={styles.dim}>No bag-level details available for this shipment.</Text>
            </View>
          ) : filteredBags.length === 0 ? (
            <View style={styles.emptyBags}>
              <Ionicons name="funnel-outline" size={22} color={colors.textDim} />
              <Text style={styles.dim}>No bags match this filter.</Text>
              <TouchableOpacity
                onPress={() => {
                  setPartyFilter("all");
                  setStatusFilter("all");
                }}
                style={styles.emptyReset}
              >
                <Text style={styles.emptyResetText}>Reset filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredBags.map((bag) => (
              <BagCard
                key={bag.id}
                bag={bag}
                partyMap={partyMap}
                itemMap={itemMap}
                currency={s.freight_currency}
                showLalamove={inWarehouse}
                onOpenParty={(pid) => router.push(`/party/${pid}` as never)}
                onBookLalamove={(ecId, bagId) =>
                  router.push(`/lalamove?shipmentId=${s.id}&bagId=${bagId}&endCustomerId=${ecId}` as never)
                }
                busy={busy}
              />
            ))
          )}
        </View>

        {/* ============================================================
             Bulk Lalamove
           ============================================================ */}
        {inWarehouse && (
          <TouchableOpacity
            style={[styles.lalamoveBtn, glowShadow("rgba(0,209,255,0.55)", 20)]}
            onPress={bookLalamove}
            activeOpacity={0.85}
            disabled={busy}
            testID="lalamove-book-btn"
          >
            <View style={styles.lalamoveIcon}>
              <Ionicons name="bicycle" size={22} color="#020202" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.lalamoveTitle}>Deliver via Lalamove</Text>
              <Text style={styles.lalamoveSub}>
                Auto-book all {bagList.length} bag{bagList.length === 1 ? "" : "s"}
              </Text>
            </View>
            {busy ? (
              <ActivityIndicator color="#020202" />
            ) : (
              <Ionicons name="arrow-forward" size={20} color="#020202" />
            )}
          </TouchableOpacity>
        )}

        {/* ============================================================
             Details
           ============================================================ */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Details</Text>
          <DetailRow label="Direction" value={(s.direction || "").replace("_", " → ")} />
          <DetailRow label="Dispatch date" value={shortDate(s.dispatch_date)} />
          <DetailRow label="Forex rate" value={s.forex_rate ? `1 THB = ${s.forex_rate} INR` : "—"} />
          {s.goods ? <DetailRow label="Goods" value={s.goods} /> : null}
          {s.notes ? <DetailRow label="Notes" value={s.notes} /> : null}
        </View>

        {/* ============================================================
             Timeline
           ============================================================ */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <TimelineRow label="Created" date={s.created_at} tint={colors.textDim} />
          {linkedInvoice ? (
            <TimelineRow
              label={`Invoice ${linkedInvoice.number}`}
              date={linkedInvoice.created_at}
              tint={colors.accent}
              onPress={() => router.push(`/invoice/${linkedInvoice.id}` as never)}
              testID="timeline-invoice-row"
            />
          ) : null}
          <TimelineRow label="Dispatched" date={s.dispatched_at} tint={colors.warn} />
          <TimelineRow label="In transit" date={s.in_transit_at} tint={colors.info} />
          <TimelineRow label="Warehouse" date={s.warehouse_arrived_at} tint={colors.accent} />
          <TimelineRow label="Delivered" date={s.delivered_at} tint={colors.ok} />
        </View>

        {/* ============================================================
             Linked invoice summary
           ============================================================ */}
        {linkedInvoice ? (
          <View style={styles.card}>
            <View style={styles.linkedInvHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionEyebrow}>Linked invoice</Text>
                <Text style={styles.linkedInvNo}>{linkedInvoice.number}</Text>
                <Text style={styles.linkedInvMeta}>
                  {shortDate(linkedInvoice.date)} · {(linkedInvoice.items || []).length} line
                  {(linkedInvoice.items || []).length === 1 ? "" : "s"}
                </Text>
              </View>
              <View
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: toneFor(linkedInvoice.status || "draft").bg,
                    borderColor: toneFor(linkedInvoice.status || "draft").fg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    { color: toneFor(linkedInvoice.status || "draft").fg },
                  ]}
                >
                  {toneFor(linkedInvoice.status || "draft").label}
                </Text>
              </View>
            </View>
            <View style={styles.linkedInvStatsRow}>
              <View style={styles.linkedInvStat}>
                <Text style={styles.linkedInvStatLbl}>Subtotal</Text>
                <Text style={styles.linkedInvStatVal}>
                  {fmtCurrency(linkedInvoice.subtotal, linkedInvoice.currency)}
                </Text>
              </View>
              <View style={styles.linkedInvStat}>
                <Text style={styles.linkedInvStatLbl}>Tax</Text>
                <Text style={styles.linkedInvStatVal}>
                  {fmtCurrency(linkedInvoice.tax_amount, linkedInvoice.currency)}
                </Text>
              </View>
              <View style={styles.linkedInvStat}>
                <Text style={styles.linkedInvStatLbl}>Total</Text>
                <Text style={[styles.linkedInvStatVal, { color: colors.accent }]}>
                  {fmtCurrency(linkedInvoice.total, linkedInvoice.currency)}
                </Text>
              </View>
            </View>
            <View style={styles.linkedInvCtaRow}>
              <TouchableOpacity
                style={styles.linkedInvEdit}
                onPress={() => router.push(`/invoice/${linkedInvoice.id}` as never)}
                testID="open-linked-invoice-detail"
              >
                <Ionicons name="open-outline" size={14} color={colors.accent} />
                <Text style={styles.linkedInvEditText}>Open invoice</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* ============================================================
             Related ledger
           ============================================================ */}
        {related.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Related ledger entries</Text>
            {related.map((e) => (
              <View key={e.id} style={styles.ledgerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ledgerDesc}>{e.description}</Text>
                  <Text style={styles.ledgerDate}>{shortDate(e.date)}</Text>
                </View>
                <Text style={[styles.ledgerAmount, { color: e.credit > 0 ? colors.ok : colors.danger }]}>
                  {e.credit > 0 ? `+${e.credit}` : `-${e.debit}`}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Book result sheet */}
      {bookResult && (
        <Pressable style={styles.backdrop} onPress={() => setBookResult(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Lalamove booking result</Text>
            <ScrollView style={{ maxHeight: 380 }}>
              {bookResult.map((r) => {
                const ok = !r.skipped && !r.error;
                return (
                  <View key={r.bag_id} style={styles.bookRow}>
                    <View
                      style={[
                        styles.bookDot,
                        { backgroundColor: ok ? colors.ok : r.error ? colors.danger : colors.warn },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bookName}>
                        {r.bag_no} · {r.end_customer_name || ""}
                      </Text>
                      <Text style={styles.bookStatus}>
                        {ok ? "Booked ✓" : r.error ? `Error: ${r.error}` : r.skipped || "Skipped"}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.sheetCta} onPress={() => setBookResult(null)}>
              <Text style={styles.sheetCtaText}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      )}

      {!canModify && !embedded ? (
        <View style={styles.lockBanner} pointerEvents="none">
          <Ionicons name="lock-closed" size={11} color={colors.textDim} />
          <Text style={styles.lockBannerText}>{modifyLockedReason}</Text>
        </View>
      ) : null}
    </Wrapper>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetricTile({
  icon,
  label,
  value,
  suffix,
  glow,
  tint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  suffix?: string;
  glow: string;
  tint?: string;
}) {
  const color = tint || colors.accent;
  return (
    <View style={[styles.metric, glowShadow(glow, 14)]}>
      <View style={styles.metricHead}>
        <Ionicons name={icon} size={12} color={color} />
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <View style={styles.metricValueRow}>
        <Text style={[styles.metricValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        {suffix ? <Text style={styles.metricSuffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

function PartyChip({
  label,
  sublabel,
  active,
  onPress,
  testID,
  variant,
}: {
  label: string;
  sublabel: string;
  active: boolean;
  onPress: () => void;
  testID?: string;
  variant?: "all" | "party" | "warn";
}) {
  const tint =
    variant === "warn"
      ? colors.warn
      : variant === "all"
        ? colors.accent
        : colors.accent;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.partyChip,
        active && [styles.partyChipActive, { borderColor: tint }, glowShadow(`${tint}66`, 10)],
      ]}
      testID={testID}
      activeOpacity={0.8}
    >
      <View style={[styles.partyChipAvatar, { borderColor: tint, backgroundColor: `${tint}22` }]}>
        <Text style={[styles.partyChipInitial, { color: tint }]}>
          {(label || "?").slice(0, 1).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.partyChipLabel, active && { color: tint }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.partyChipSub} numberOfLines={1}>
          {sublabel}
        </Text>
      </View>
      {active ? <Ionicons name="checkmark-circle" size={14} color={tint} /> : null}
    </TouchableOpacity>
  );
}

function BagCard({
  bag,
  partyMap,
  itemMap,
  currency,
  showLalamove,
  onOpenParty,
  onBookLalamove,
  busy,
}: {
  bag: ShipmentBag;
  partyMap: Record<string, Party>;
  itemMap: Record<string, Item>;
  currency: "INR" | "THB" | string;
  showLalamove: boolean;
  onOpenParty: (id: string) => void;
  onBookLalamove: (endCustomerId: string, bagId: string) => void;
  busy: boolean;
}) {
  const endCustomer = bag.end_customer_id ? partyMap[bag.end_customer_id] : undefined;
  const tone = toneFor(bag.status || "packed");
  const pieces = (bag.items || []).reduce((s, it) => s + (it.quantity || 0), 0);
  const canBook = !!(endCustomer?.phone && endCustomer?.lat && endCustomer?.lng);

  return (
    <View style={styles.bagCard} testID={`bag-${bag.bag_no}`}>
      {/* Head: Bag ID + Status pill */}
      <View style={styles.bagHead}>
        <View style={[styles.bagChip, glowShadow(colors.accentGlow, 10)]}>
          <Ionicons name="cube" size={12} color={colors.accent} />
          <Text style={styles.bagChipText}>{bag.bag_no}</Text>
        </View>
        <View
          style={[
            styles.statusChipSm,
            { backgroundColor: tone.bg, borderColor: tone.fg },
            glowShadow(tone.glow, 8),
          ]}
        >
          <View style={[styles.statusDotSm, { backgroundColor: tone.fg }]} />
          <Text style={[styles.statusChipTextSm, { color: tone.fg }]}>{tone.label}</Text>
        </View>
      </View>

      {/* End customer block */}
      <TouchableOpacity
        disabled={!endCustomer}
        onPress={() => endCustomer && onOpenParty(endCustomer.id)}
        style={styles.ecBlock}
        activeOpacity={0.8}
      >
        <View style={[styles.ecAvatar, !endCustomer && styles.ecAvatarEmpty]}>
          <Text style={[styles.ecInitial, !endCustomer && { color: colors.textDim }]}>
            {(endCustomer?.name || "?").slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ecName} numberOfLines={1}>
            {endCustomer?.name || "Unassigned"}
          </Text>
          {endCustomer?.phone ? (
            <View style={styles.ecMetaRow}>
              <Ionicons name="call-outline" size={11} color={colors.textMuted} />
              <Text style={styles.ecMeta}>{endCustomer.phone}</Text>
            </View>
          ) : (
            <View style={styles.ecMetaRow}>
              <Ionicons name="warning-outline" size={11} color={colors.warn} />
              <Text style={[styles.ecMeta, { color: colors.warn }]}>Missing phone</Text>
            </View>
          )}
        </View>
        {endCustomer ? <Ionicons name="chevron-forward" size={14} color={colors.textDim} /> : null}
      </TouchableOpacity>

      {/* Stats: pieces / weight / charge */}
      <View style={styles.bagStatRow}>
        <BagStat label="Pieces" value={String(pieces)} />
        <View style={styles.bagStatDivider} />
        <BagStat label="Weight" value={`${(bag.weight_kg || 0).toFixed(2)} kg`} tint={colors.cyan} />
        <View style={styles.bagStatDivider} />
        <BagStat label="Charge" value={fmtCurrency(bag.charge, currency)} tint={colors.accent} />
      </View>

      {/* Item list */}
      {bag.items && bag.items.length > 0 && (
        <View style={styles.itemsBox}>
          <View style={styles.itemsHeadRow}>
            <Ionicons name="list" size={11} color={colors.textDim} />
            <Text style={styles.itemsHead}>Inventory · {bag.items.length}</Text>
          </View>
          {bag.items.map((it, i) => {
            const cat = it.item_id ? itemMap[it.item_id] : undefined;
            return (
              <View key={i} style={styles.itemRow}>
                <View style={styles.itemDot} />
                <Text style={styles.itemDesc} numberOfLines={2}>
                  {it.description || cat?.name || "—"}
                </Text>
                <Text style={styles.itemQty}>
                  {it.quantity}
                  <Text style={styles.itemUnit}> {it.unit || cat?.unit || ""}</Text>
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Notes */}
      {bag.notes ? (
        <View style={styles.notesBox}>
          <Ionicons name="chatbox-outline" size={11} color={colors.textDim} />
          <Text style={styles.notesText}>{bag.notes}</Text>
        </View>
      ) : null}

      {/* Lalamove */}
      {showLalamove && endCustomer && (
        <>
          {!canBook && (
            <View style={styles.warnBox}>
              <Ionicons name="warning-outline" size={11} color={colors.warn} />
              <Text style={styles.warnBoxText}>
                {!endCustomer.phone
                  ? "Add phone number to enable Lalamove."
                  : "Add coordinates to enable one-tap Lalamove."}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[
              styles.bagLalamoveBtn,
              !canBook && styles.bagLalamoveBtnDisabled,
              canBook && glowShadow("rgba(0,209,255,0.45)", 12),
            ]}
            disabled={!canBook || busy}
            onPress={() => canBook && onBookLalamove(endCustomer.id, bag.id)}
            testID={`book-lalamove-${bag.bag_no}`}
          >
            <Ionicons
              name="bicycle"
              size={14}
              color={canBook ? "#020202" : colors.textDim}
            />
            <Text style={[styles.bagLalamoveTxt, !canBook && { color: colors.textDim }]}>
              Book Lalamove
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

function BagStat({ label, value, tint }: { label: string; value: string; tint?: string }) {
  return (
    <View style={styles.bagStat}>
      <Text style={styles.bagStatLbl}>{label}</Text>
      <Text style={[styles.bagStatVal, tint ? { color: tint } : null]}>{value}</Text>
    </View>
  );
}

function PartyRow({
  role,
  party,
  onPress,
  testID,
}: {
  role: string;
  party?: Party;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <TouchableOpacity onPress={onPress} disabled={!party} style={styles.prow} testID={testID}>
      <View style={[styles.pavatar, !party && { backgroundColor: colors.chipBg, borderColor: colors.border }]}>
        <Text style={[styles.pavatarText, !party && { color: colors.textDim }]}>
          {(party?.name || "?").slice(0, 1).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.prole}>{role}</Text>
        <Text style={styles.pname}>{party?.name || "—"}</Text>
        {party?.phone ? <Text style={styles.pphone}>{party.phone}</Text> : null}
      </View>
      {party ? <Ionicons name="chevron-forward" size={16} color={colors.textDim} /> : null}
    </TouchableOpacity>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.drow}>
      <Text style={styles.dlbl}>{label}</Text>
      <Text style={styles.dval} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function TimelineRow({
  label,
  date,
  tint,
  onPress,
  testID,
}: {
  label: string;
  date?: string | null;
  tint: string;
  onPress?: () => void;
  testID?: string;
}) {
  const done = !!date;
  const inner = (
    <View style={styles.tlRow}>
      <View
        style={[
          styles.tlDot,
          { backgroundColor: done ? tint : "rgba(20,24,34,0.6)", borderColor: tint },
          done ? glowShadow(`${tint}88`, 8) : undefined,
        ]}
      />
      <View style={styles.tlText}>
        <Text style={[styles.tlLabel, { color: done ? colors.text : colors.textDim }]}>{label}</Text>
        <Text style={styles.tlDate}>{done ? shortDate(date) : "—"}</Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={14} color={tint} /> : null}
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} testID={testID}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  embed: { flex: 1, backgroundColor: "transparent", paddingTop: spacing.sm },

  headBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  headCenter: { flex: 1, alignItems: "center" },
  headEyebrow: {
    color: colors.textDim,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  iconBtn: { padding: 8 },
  headTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.4,
  },
  modifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderColor: colors.accent,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.chipBg,
  },
  modifyText: { color: colors.accent, fontSize: 12, fontWeight: "800" },
  modifyBtnDisabled: {
    backgroundColor: "transparent",
    borderColor: colors.border,
  },
  modifyTextDisabled: { color: colors.textDim },
  content: { padding: spacing.lg, gap: spacing.md },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  dim: { color: colors.textDim, fontSize: 13, padding: spacing.sm, textAlign: "center" },

  // -------- Hero --------
  hero: {
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    padding: spacing.lg,
    backgroundColor: colors.glass,
    overflow: "hidden",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  routeArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,209,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    borderColor: colors.borderStrong,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cityLbl: {
    color: colors.textDim,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  cityName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: 0.2,
  },
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: spacing.md,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: "rgba(0,209,255,0.08)",
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metaChipText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
    letterSpacing: 0.3,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusChipText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },

  // Metric tiles
  metricRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  metric: {
    flex: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: colors.glassStrong,
    borderColor: colors.borderStrong,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metricHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  metricValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  metricSuffix: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 3,
  },

  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  advanceBtn: {
    flex: 1.4,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: radii.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  advanceText: {
    color: "#020202",
    fontWeight: "800",
    fontSize: 13,
    textTransform: "capitalize",
    letterSpacing: 0.4,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    borderColor: colors.borderStrong,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.glass,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  secondaryBtnText: {
    color: colors.accent,
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.2,
  },

  // -------- Filter block --------
  filterBlock: {
    gap: spacing.sm,
  },
  filterHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.xs,
  },
  filterHeadText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    flex: 1,
  },
  clearFilter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  clearFilterText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  carousel: {
    gap: 8,
    paddingRight: spacing.md,
    paddingVertical: 2,
  },
  partyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.lg,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.glass,
    minWidth: 160,
    maxWidth: 220,
  },
  partyChipActive: {
    backgroundColor: colors.glassStrong,
  },
  partyChipAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  partyChipInitial: { fontWeight: "800", fontSize: 12 },
  partyChipLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  partyChipSub: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  statusFilterRow: {
    gap: 6,
    paddingRight: spacing.md,
    paddingTop: 2,
  },
  statusFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.glass,
  },
  statusFilterText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },

  // -------- Money --------
  moneyCard: {
    backgroundColor: colors.glass,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
  },
  moneyRow: { flexDirection: "row" },
  moneyCol: { flex: 1, padding: spacing.lg },
  moneyColBorder: {
    borderRightColor: colors.border,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  moneyLbl: {
    color: colors.textMuted,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    fontWeight: "700",
  },
  moneyVal: { fontSize: 20, fontWeight: "800", marginTop: 4 },
  moneyHint: { color: colors.textDim, fontSize: 11, marginTop: 4 },
  marginBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  marginLbl: {
    color: colors.textMuted,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    fontWeight: "700",
  },
  marginVal: { fontSize: 18, fontWeight: "900", letterSpacing: 0.3 },

  // -------- Section card --------
  card: {
    backgroundColor: colors.glass,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sectionSubtitle: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  // -------- Party row --------
  prow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 8,
  },
  pavatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentGlow,
    borderColor: colors.accent,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pavatarText: { color: colors.accent, fontWeight: "800", fontSize: 16 },
  prole: {
    color: colors.textDim,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  pname: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  pphone: { color: colors.textMuted, fontSize: 12, marginTop: 2 },

  // -------- Bag card --------
  bagCard: {
    backgroundColor: "rgba(8,10,16,0.6)",
    borderRadius: radii.md,
    borderColor: colors.borderStrong,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  bagHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: "rgba(0,209,255,0.14)",
    borderColor: colors.accent,
    borderWidth: 1,
  },
  bagChipText: {
    color: colors.accent,
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  statusChipSm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  statusDotSm: { width: 5, height: 5, borderRadius: 2.5 },
  statusChipTextSm: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },

  ecBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: radii.sm,
    backgroundColor: "rgba(0,209,255,0.05)",
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  ecAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,209,255,0.15)",
    borderColor: colors.accent,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ecAvatarEmpty: {
    backgroundColor: colors.chipBg,
    borderColor: colors.border,
  },
  ecInitial: { color: colors.accent, fontWeight: "800", fontSize: 14 },
  ecName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  ecMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  ecMeta: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },

  bagStatRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bagStat: { flex: 1, alignItems: "center" },
  bagStatDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  bagStatLbl: {
    color: colors.textDim,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontWeight: "700",
  },
  bagStatVal: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 3,
    letterSpacing: 0.2,
  },

  itemsBox: {
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: radii.sm,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  itemsHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  itemsHead: {
    color: colors.textDim,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    fontWeight: "700",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    gap: 8,
  },
  itemDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.accent,
  },
  itemDesc: { flex: 1, color: colors.text, fontSize: 13, fontWeight: "500" },
  itemQty: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  itemUnit: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  notesBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    padding: 8,
    backgroundColor: "rgba(245,197,24,0.06)",
    borderRadius: radii.sm,
    borderColor: "rgba(245,197,24,0.20)",
    borderWidth: StyleSheet.hairlineWidth,
  },
  notesText: {
    color: colors.textMuted,
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  warnBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    padding: 8,
    backgroundColor: "rgba(245,158,11,0.08)",
    borderColor: "rgba(245,158,11,0.20)",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.sm,
  },
  warnBoxText: { color: colors.warn, fontSize: 11, fontWeight: "600", flex: 1 },

  bagLalamoveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  bagLalamoveBtnDisabled: {
    backgroundColor: colors.chipBg,
    opacity: 0.6,
  },
  bagLalamoveTxt: {
    color: "#020202",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
  },

  emptyBags: {
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emptyReset: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderColor: colors.accent,
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyResetText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },

  // -------- Bulk Lalamove --------
  lalamoveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
  },
  lalamoveIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(2,2,2,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  lalamoveTitle: { color: "#020202", fontWeight: "800", fontSize: 15 },
  lalamoveSub: { color: "#020202", opacity: 0.7, fontSize: 12, marginTop: 2 },

  // -------- Details / Timeline --------
  drow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    alignItems: "center",
    gap: 8,
  },
  dlbl: { color: colors.textDim, fontSize: 13 },
  dval: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "right",
  },
  tlRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  tlDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, marginRight: 10 },
  tlText: { flex: 1, flexDirection: "row", justifyContent: "space-between" },
  tlLabel: { fontSize: 13, fontWeight: "600" },
  tlDate: { color: colors.textDim, fontSize: 12 },

  // Ledger
  ledgerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  ledgerDesc: { color: colors.text, fontSize: 13 },
  ledgerDate: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  ledgerAmount: { fontSize: 14, fontWeight: "800" },

  // Sheet
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.lg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderColor: colors.borderStrong,
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
  sheetTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: spacing.md,
  },
  bookRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 10,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bookDot: { width: 10, height: 10, borderRadius: 5 },
  bookName: { color: colors.text, fontSize: 14, fontWeight: "700" },
  bookStatus: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  sheetCta: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: radii.pill,
    alignItems: "center",
  },
  sheetCtaText: { color: "#020202", fontWeight: "800" },

  // Linked invoice card
  linkedInvHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  sectionEyebrow: {
    color: colors.textDim,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  linkedInvNo: { color: colors.text, fontSize: 20, fontWeight: "800", marginTop: 2 },
  linkedInvMeta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  linkedInvStatsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  linkedInvStat: {
    flex: 1,
    backgroundColor: colors.chipBg,
    borderRadius: radii.md,
    padding: 10,
    alignItems: "center",
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  linkedInvStatLbl: {
    color: colors.textDim,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  linkedInvStatVal: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 4,
  },
  linkedInvCtaRow: { flexDirection: "row", marginTop: spacing.md },
  linkedInvEdit: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: radii.pill,
    borderColor: colors.accent,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.chipBg,
  },
  linkedInvEditText: { color: colors.accent, fontSize: 12, fontWeight: "800" },

  lockBanner: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: "rgba(2,2,2,0.6)",
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  lockBannerText: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
});
