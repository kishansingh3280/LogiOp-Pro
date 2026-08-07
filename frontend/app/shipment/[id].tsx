import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  Item,
  LedgerEntry,
  Party,
  Shipment,
  ShipmentBag,
  ShipmentStatus,
} from "@/src/api/types";
import { StatusPill } from "@/src/components/ui";
import { colors, radii, spacing } from "@/src/theme";
import { fmtCurrency, shortDate } from "@/src/utils/format";

const STATUS_FLOW: ShipmentStatus[] = ["pending", "in_transit", "warehouse_arrived", "delivered"];

type BookResult = {
  bag_id: string;
  bag_no: string;
  end_customer_name?: string;
  skipped?: string;
  booked?: unknown;
  error?: string;
};

/**
 * Rich shipment detail:
 *   Hero: consignment, status, route, mode, bags/weight, direction
 *   Money card: freight I get vs carrier I pay = margin
 *   Parties: customer + carrier
 *   Bags list: bag_no, end customer, items (desc/qty/unit), weight, charge
 *   Lalamove delivery button when warehouse_arrived (or on demand)
 *   Timeline
 */
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

  const [busy, setBusy] = useState(false);
  const [bookResult, setBookResult] = useState<BookResult[] | null>(null);

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

  // Money math
  const money = useMemo(() => {
    const s = shipment.data;
    if (!s) return null;
    const freight = s.freight || 0;
    const freightCur = s.freight_currency;
    const carrierCharge = s.carrier_charge || 0;
    const carrierType = s.carrier_charge_type;
    const carrierCur = (s.carrier_currency || "INR") as "INR" | "THB";
    // If carrier charge is per_kg, compute actual carrier pay
    const carrierPay =
      carrierType === "per_kg" ? carrierCharge * (s.weight_kg || 0) : carrierCharge;
    // Convert carrier pay into freight currency using forex_rate
    // forex_rate is INR per THB
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
          <ActivityIndicator color={colors.lime} />
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
  const bagList = bags.data || [];

  return (
    <Wrapper>
      {!embedded && (
        <View style={styles.headBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="back-btn">
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headTitle} numberOfLines={1}>
            {s.consignment_no}
          </Text>
          <TouchableOpacity
            onPress={() => router.push(`/shipment/new?editId=${s.id}` as never)}
            style={styles.modifyBtn}
            testID="modify-shipment-btn"
          >
            <Ionicons name="create-outline" size={14} color={colors.lime} />
            <Text style={styles.modifyText}>Modify</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={remove} style={styles.iconBtn} testID="delete-btn">
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient colors={["#0d0d0d", "#080808"]} style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>Consignment</Text>
              <Text style={styles.bigTitle}>{s.consignment_no}</Text>
              <View style={styles.routeRow}>
                <View style={styles.routeCity}>
                  <Text style={styles.cityLbl}>From</Text>
                  <Text style={styles.cityName}>{s.origin || "—"}</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={colors.lime} />
                <View style={styles.routeCity}>
                  <Text style={styles.cityLbl}>To</Text>
                  <Text style={styles.cityName}>{s.destination || "—"}</Text>
                </View>
              </View>
            </View>
            <StatusPill status={s.status} />
          </View>

          <View style={styles.heroStats}>
            <HeroStat icon="cube-outline" label="Bags" value={String(s.bag_count ?? bagList.length ?? 0)} />
            <HeroStat icon="scale-outline" label="Weight" value={`${s.weight_kg ?? 0} kg`} />
            <HeroStat icon="airplane-outline" label="Mode" value={(s.mode || "-").replace("_", " ")} />
            <HeroStat icon="swap-horizontal-outline" label="Route" value={(s.direction || "").replace("_TO_", "→")} />
          </View>

          <View style={styles.actionRow}>
            {nextLabel && (
              <TouchableOpacity
                style={[styles.advanceBtn, { flex: 1 }]}
                onPress={advance}
                disabled={busy}
                testID="advance-status-btn"
              >
                {busy ? (
                  <ActivityIndicator color={colors.bg} size="small" />
                ) : (
                  <>
                    <Ionicons name="arrow-forward-circle" size={18} color={colors.bg} />
                    <Text style={styles.advanceText}>Mark as {nextLabel.replace("_", " ")}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.modifyBtnBody}
              onPress={() => router.push(`/shipment/new?editId=${s.id}` as never)}
              testID="modify-shipment-body-btn"
            >
              <Ionicons name="create-outline" size={16} color={colors.lime} />
              <Text style={styles.modifyBtnBodyText}>Modify</Text>
            </TouchableOpacity>
          </View>

          {/* Generate Invoice — visible on every shipment so the operator can
              raise a bill any time (draft, in-transit, delivered). The
              invoice form is prefilled with consignment / route / bags /
              freight and, on save, the backend auto-posts a debit entry to
              the party's ledger in the shipment currency. */}
          <TouchableOpacity
            style={styles.invoiceBtn}
            onPress={() => router.push(`/invoice/new?shipmentId=${s.id}` as never)}
            testID="generate-invoice-btn"
          >
            <Ionicons name="document-text-outline" size={16} color={colors.bg} />
            <Text style={styles.invoiceBtnText}>Generate Invoice</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Money card */}
        {money && (
          <View style={styles.moneyCard} testID="money-card">
            <View style={styles.moneyRow}>
              <View style={[styles.moneyCol, { borderRightColor: colors.border, borderRightWidth: StyleSheet.hairlineWidth }]}>
                <Text style={styles.moneyLbl}>Customer will pay</Text>
                <Text style={[styles.moneyVal, { color: colors.ok }]}>
                  {fmtCurrency(money.freight, money.freightCur)}
                </Text>
                <Text style={styles.moneyHint}>from {party?.name || "customer"}</Text>
              </View>
              <View style={styles.moneyCol}>
                <Text style={styles.moneyLbl}>You pay carrier</Text>
                <Text style={[styles.moneyVal, { color: colors.danger }]}>
                  {fmtCurrency(money.carrierPay, money.carrierCur)}
                </Text>
                <Text style={styles.moneyHint}>
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
                  { color: money.margin >= 0 ? colors.lime : colors.danger },
                ]}
              >
                {fmtCurrency(money.margin, money.freightCur)}
              </Text>
            </View>
          </View>
        )}

        {/* Parties */}
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

        {/* Bags */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bags ({bagList.length})</Text>
            {bags.loading && <ActivityIndicator size="small" color={colors.lime} />}
          </View>
          {bagList.length === 0 ? (
            <Text style={styles.dim}>No bag-level details available for this shipment.</Text>
          ) : (
            bagList.map((bag) => {
              const endCustomer = bag.end_customer_id ? partyMap[bag.end_customer_id] : undefined;
              return (
                <View key={bag.id} style={styles.bagCard} testID={`bag-${bag.bag_no}`}>
                  <View style={styles.bagHead}>
                    <View style={styles.bagChip}>
                      <Ionicons name="cube" size={14} color={colors.lime} />
                      <Text style={styles.bagChipText}>{bag.bag_no}</Text>
                    </View>
                    <StatusPill status={bag.status || "packed"} />
                  </View>

                  <View style={styles.bagBody}>
                    <View style={styles.bagKV}>
                      <Text style={styles.bagKVLabel}>End customer</Text>
                      <TouchableOpacity
                        disabled={!endCustomer}
                        onPress={() => endCustomer && router.push(`/party/${endCustomer.id}` as never)}
                      >
                        <Text style={[styles.bagKVValue, endCustomer && { color: colors.lime }]}>
                          {endCustomer?.name || "—"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.bagKV}>
                      <Text style={styles.bagKVLabel}>Weight</Text>
                      <Text style={styles.bagKVValue}>{bag.weight_kg} kg</Text>
                    </View>
                    <View style={styles.bagKV}>
                      <Text style={styles.bagKVLabel}>Bag charge</Text>
                      <Text style={[styles.bagKVValue, { color: colors.lime }]}>
                        {fmtCurrency(bag.charge, s.freight_currency)}
                      </Text>
                    </View>
                    {bag.notes ? (
                      <View style={styles.bagKV}>
                        <Text style={styles.bagKVLabel}>Notes</Text>
                        <Text style={styles.bagKVValue}>{bag.notes}</Text>
                      </View>
                    ) : null}
                  </View>

                  {bag.items && bag.items.length > 0 && (
                    <View style={styles.itemsBox}>
                      <Text style={styles.itemsHead}>Goods inside</Text>
                      {bag.items.map((it, i) => {
                        const cat = it.item_id ? itemMap[it.item_id] : undefined;
                        return (
                          <View key={i} style={styles.itemRow}>
                            <View style={styles.itemDot} />
                            <Text style={styles.itemDesc} numberOfLines={1}>
                              {it.description || cat?.name || "—"}
                            </Text>
                            <Text style={styles.itemQty}>
                              {it.quantity} {it.unit || cat?.unit || ""}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {inWarehouse && endCustomer && (
                    <View style={styles.bagContact}>
                      {endCustomer.phone ? (
                        <View style={styles.bagContactRow}>
                          <Ionicons name="call-outline" size={12} color={colors.textDim} />
                          <Text style={styles.bagContactText}>{endCustomer.phone}</Text>
                        </View>
                      ) : (
                        <View style={styles.bagContactRow}>
                          <Ionicons name="warning-outline" size={12} color={colors.warn} />
                          <Text style={[styles.bagContactText, { color: colors.warn }]}>
                            Missing phone — add to enable Lalamove
                          </Text>
                        </View>
                      )}
                      {endCustomer.lat && endCustomer.lng ? (
                        <View style={styles.bagContactRow}>
                          <Ionicons name="location-outline" size={12} color={colors.textDim} />
                          <Text style={styles.bagContactText}>
                            {endCustomer.lat}, {endCustomer.lng}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Lalamove delivery — visible in warehouse status only */}
        {inWarehouse && (
          <TouchableOpacity
            style={styles.lalamoveBtn}
            onPress={bookLalamove}
            activeOpacity={0.85}
            disabled={busy}
            testID="lalamove-book-btn"
          >
            <View style={styles.lalamoveIcon}>
              <Ionicons name="bicycle" size={22} color={colors.bg} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.lalamoveTitle}>Deliver via Lalamove</Text>
              <Text style={styles.lalamoveSub}>Auto-book delivery for all {bagList.length} bag{bagList.length === 1 ? "" : "s"}</Text>
            </View>
            {busy ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <Ionicons name="arrow-forward" size={20} color={colors.bg} />
            )}
          </TouchableOpacity>
        )}

        {/* Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Details</Text>
          <DetailRow label="Direction" value={(s.direction || "").replace("_", " → ")} />
          <DetailRow label="Dispatch date" value={shortDate(s.dispatch_date)} />
          <DetailRow label="Forex rate" value={s.forex_rate ? `1 THB = ${s.forex_rate} INR` : "—"} />
          {s.goods ? <DetailRow label="Goods" value={s.goods} /> : null}
          {s.notes ? <DetailRow label="Notes" value={s.notes} /> : null}
        </View>

        {/* Timeline */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <TimelineRow label="Created" date={s.created_at} tint={colors.textDim} />
          <TimelineRow label="Dispatched" date={s.dispatched_at} tint={colors.warn} />
          <TimelineRow label="In transit" date={s.in_transit_at} tint={colors.info} />
          <TimelineRow label="Warehouse" date={s.warehouse_arrived_at} tint={colors.lime} />
          <TimelineRow label="Delivered" date={s.delivered_at} tint={colors.ok} />
        </View>

        {/* Related ledger */}
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
    </Wrapper>
  );
}

function HeroStat({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.hs}>
      <Ionicons name={icon} size={14} color={colors.lime} />
      <Text style={styles.hsLbl}>{label}</Text>
      <Text style={styles.hsVal}>{value}</Text>
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

function TimelineRow({ label, date, tint }: { label: string; date?: string | null; tint: string }) {
  const done = !!date;
  return (
    <View style={styles.tlRow}>
      <View style={[styles.tlDot, { backgroundColor: done ? tint : "#1a1a1a", borderColor: tint }]} />
      <View style={styles.tlText}>
        <Text style={[styles.tlLabel, { color: done ? colors.text : colors.textDim }]}>{label}</Text>
        <Text style={styles.tlDate}>{done ? shortDate(date) : "—"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  embed: { flex: 1, backgroundColor: colors.bg, paddingTop: spacing.sm },
  headBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  iconBtn: { padding: 8 },
  headTitle: { flex: 1, color: colors.text, fontSize: 17, fontWeight: "800", textAlign: "center" },
  modifyBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill,
    borderColor: colors.lime, borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.chipBg,
  },
  modifyText: { color: colors.lime, fontSize: 12, fontWeight: "800" },
  content: { padding: spacing.lg, gap: spacing.md },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  dim: { color: colors.textDim, fontSize: 13, padding: spacing.sm },

  // Hero
  hero: {
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    padding: spacing.lg,
  },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md },
  eyebrow: { color: colors.textDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 },
  bigTitle: { color: colors.text, fontSize: 26, fontWeight: "800", marginTop: 2 },
  routeRow: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 12 },
  routeCity: {},
  cityLbl: { color: colors.textDim, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  cityName: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 2 },
  heroStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  hs: {
    flexBasis: "22%",
    flexGrow: 1,
    padding: 10,
    backgroundColor: colors.chipBg,
    borderRadius: radii.md,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  hsLbl: { color: colors.textDim, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 },
  hsVal: { color: colors.text, fontSize: 14, fontWeight: "800", marginTop: 2, textTransform: "capitalize" },
  advanceBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.lime,
    paddingVertical: 13,
    borderRadius: radii.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  advanceText: { color: colors.bg, fontWeight: "800", fontSize: 14, textTransform: "capitalize", letterSpacing: 0.3 },

  // Generate Invoice CTA
  invoiceBtn: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.lime,
  },
  invoiceBtnText: {
    color: colors.bg,
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.3,
  },

  // Money
  moneyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
  },
  moneyRow: { flexDirection: "row" },
  moneyCol: { flex: 1, padding: spacing.lg },
  moneyLbl: { color: colors.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  moneyVal: { fontSize: 20, fontWeight: "800", marginTop: 4 },
  moneyHint: { color: colors.textDim, fontSize: 11, marginTop: 4 },
  marginBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: "#080808",
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  marginLbl: { color: colors.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: "700" },
  marginVal: { fontSize: 16, fontWeight: "800" },

  // Card wrapper
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  // Party row
  prow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 8 },
  pavatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.limeGlow,
    borderColor: colors.lime,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pavatarText: { color: colors.lime, fontWeight: "800", fontSize: 16 },
  prole: { color: colors.textDim, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  pname: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 2 },
  pphone: { color: colors.textMuted, fontSize: 12, marginTop: 2 },

  // Bag card
  bagCard: {
    backgroundColor: "#0e0e0e",
    borderRadius: radii.md,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  bagHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  bagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.limeGlow,
    borderColor: colors.lime,
    borderWidth: 1,
  },
  bagChipText: { color: colors.lime, fontWeight: "800", fontSize: 12, letterSpacing: 0.4 },
  bagBody: { gap: 4 },
  bagKV: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  bagKVLabel: { color: colors.textDim, fontSize: 12 },
  bagKVValue: { color: colors.text, fontSize: 13, fontWeight: "600", flexShrink: 1, textAlign: "right", marginLeft: 8 },
  itemsBox: {
    marginTop: spacing.sm,
    padding: 10,
    backgroundColor: "#141414",
    borderRadius: radii.sm,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  itemsHead: {
    color: colors.textDim,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
    fontWeight: "700",
  },
  itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4, gap: 8 },
  itemDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.lime },
  itemDesc: { flex: 1, color: colors.text, fontSize: 13 },
  itemQty: { color: colors.lime, fontSize: 12, fontWeight: "700" },
  bagContact: {
    marginTop: spacing.sm,
    padding: 10,
    backgroundColor: "#141414",
    borderRadius: radii.sm,
    gap: 4,
  },
  bagContactRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  bagContactText: { color: colors.textMuted, fontSize: 12 },

  // Lalamove CTA
  lalamoveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.lime,
    borderRadius: radii.lg,
  },
  lalamoveIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  lalamoveTitle: { color: colors.bg, fontWeight: "800", fontSize: 15 },
  lalamoveSub: { color: colors.bg, opacity: 0.7, fontSize: 12, marginTop: 2 },

  // Detail row
  drow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, alignItems: "center", gap: 8 },
  dlbl: { color: colors.textDim, fontSize: 13 },
  dval: { color: colors.text, fontSize: 13, fontWeight: "600", flexShrink: 1, textAlign: "right" },

  // Timeline
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

  // Book result sheet
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
    backgroundColor: colors.lime,
    paddingVertical: 12,
    borderRadius: radii.pill,
    alignItems: "center",
  },
  sheetCtaText: { color: colors.bg, fontWeight: "800" },
});
