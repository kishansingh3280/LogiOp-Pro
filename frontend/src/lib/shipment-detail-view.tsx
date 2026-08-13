/**
 * ShipmentDetailView — shared body component for the shipment detail screen.
 *
 * Rendered inside:
 *   • /app/shipment/[id].tsx (mobile full screen)
 *   • /app/(tabs)/shipments.tsx (right side of tablet split view)
 *
 * Renders parties, financials (freight + carrier cost), timeline, and
 * per-bag multi-carrier rows. No header/back button — that stays in
 * the containing screen.
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { apiGet } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth-context";
import { fmtCurrency, longDate, shortDate, titleCase } from "@/src/lib/format";
import { colors, radii, spacing } from "@/src/lib/theme";
import { GlassCard, LabelValueRow, Pill } from "@/src/lib/ui";

type Shipment = {
  id: string;
  consignment_no: string;
  direction: "IN_TO_TH" | "TH_TO_IN";
  mode: string;
  origin?: string;
  destination?: string;
  goods?: string;
  status: string;
  weight_kg: number;
  bag_count: number;
  freight: number;
  freight_currency: "INR" | "THB";
  forex_rate: number;
  carrier_party_id?: string;
  carrier_party_ids?: string[]; // multi-carrier support
  carrier_charge?: number;
  carrier_charge_type?: "flat" | "per_kg";
  carrier_currency?: "INR" | "THB";
  bags?: {
    id: string;
    weight_kg?: number;
    pieces?: number;
    status?: string;
    carrier_party_id?: string | null;
    contents?: string | null;
  }[];
  party_id: string;
  party_ids?: string[]; // Fix 10 (Phase 6) · multi-customer support
  dispatch_date?: string;
  dispatched_at?: string;
  in_transit_at?: string;
  warehouse_arrived_at?: string;
  delivered_at?: string;
  notes?: string;
  created_at: string;
};

type Party = { id: string; name: string; role: string };

const STATUS: Record<string, { tint: string; soft: string }> = {
  pending: { tint: colors.warn, soft: colors.warnSoft },
  in_transit: { tint: colors.info, soft: colors.infoSoft },
  warehouse_arrived: { tint: colors.info, soft: colors.infoSoft },
  delivered: { tint: colors.brand, soft: colors.brandSoft },
  cancelled: { tint: colors.danger, soft: colors.dangerSoft },
};

const TIMELINE: {
  key: keyof Shipment;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}[] = [
  { key: "created_at", label: "Created", icon: "add-circle" },
  { key: "dispatched_at", label: "Dispatched", icon: "send" },
  { key: "in_transit_at", label: "In transit", icon: "airplane" },
  { key: "warehouse_arrived_at", label: "Warehouse", icon: "cube" },
  { key: "delivered_at", label: "Delivered", icon: "checkmark-done" },
];

export function ShipmentDetailView({ id }: { id: string }) {
  const { token } = useAuth();
  const router = useRouter();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [party, setParty] = useState<Party | null>(null);
  const [customers, setCustomers] = useState<Party[]>([]);
  const [carrier, setCarrier] = useState<Party | null>(null);
  const [carriers, setCarriers] = useState<Party[]>([]);
  const [allParties, setAllParties] = useState<Party[]>([]);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [bagsList, setBagsList] = useState<Shipment["bags"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const s = await apiGet<Shipment>(`/api/shipments/${id}`);
      setShipment(s);
      // Seed bags from the shipment record; may be overwritten by the
      // dedicated fetch below if the endpoint returns richer data.
      setBagsList(s.bags || []);

      // Fix 4 — parallel fetch of bags for this shipment.
      apiGet<Shipment["bags"]>(`/api/shipments/${id}/bags`)
        .then((b) => {
          if (Array.isArray(b) && b.length) setBagsList(b);
        })
        .catch(() => {
          /* silent — falls back to shipment.bags */
        });

      const partyRequests: Promise<Party | null>[] = [];
      partyRequests.push(
        s.party_id
          ? apiGet<Party>(`/api/parties/${s.party_id}`).catch(() => null)
          : Promise.resolve(null),
      );
      partyRequests.push(
        s.carrier_party_id
          ? apiGet<Party>(`/api/parties/${s.carrier_party_id}`).catch(() => null)
          : Promise.resolve(null),
      );
      const [p1, p2] = await Promise.all(partyRequests);
      setParty(p1);
      setCarrier(p2);

      apiGet<{ id: string; shipment_id?: string | null }[]>("/api/invoices")
        .then((invs) => {
          const match = invs.find((iv) => iv.shipment_id === id);
          setInvoiceId(match?.id || null);
        })
        .catch(() => setInvoiceId(null));

      // Full party list — used for per-bag carrier name resolution AND
      // to derive the "multi-carrier" list (unique carrier ids from
      // bags + top-level carrier_party_id + carrier_party_ids array)
      // and (Fix 10 · Phase 6) the "multi-customer" list.
      apiGet<Party[]>("/api/parties")
        .then((ps) => {
          const all = Array.isArray(ps) ? ps : [];
          setAllParties(all);
          const cIds = new Set<string>();
          if (s.carrier_party_id) cIds.add(s.carrier_party_id);
          (s.carrier_party_ids || []).forEach((cid) => cIds.add(cid));
          (s.bags || []).forEach((b) => {
            if (b.carrier_party_id) cIds.add(b.carrier_party_id);
          });
          const carrierList = Array.from(cIds)
            .map((cid) => all.find((p) => p.id === cid))
            .filter((p): p is Party => !!p);
          setCarriers(carrierList);

          // Fix 10 · Multi-customer list (party_id + optional party_ids).
          const pIds = new Set<string>();
          if (s.party_id) pIds.add(s.party_id);
          (s.party_ids || []).forEach((pid) => pIds.add(pid));
          const customerList = Array.from(pIds)
            .map((pid) => all.find((p) => p.id === pid))
            .filter((p): p is Party => !!p);
          setCustomers(customerList);
        })
        .catch(() => {
          setAllParties([]);
          setCarriers([]);
        });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (token && id) {
      // reset per-id
      setShipment(null);
      setParty(null);
      setCustomers([]);
      setCarrier(null);
      setCarriers([]);
      setInvoiceId(null);
      setBagsList(null);
      load();
    }
  }, [token, id, load]);

  const status = STATUS[shipment?.status ?? ""] ?? {
    tint: colors.textMuted,
    soft: colors.divider,
  };

  // ── Money math — Customer pays / You pay carrier / Your margin ──
  const money = useMemo(() => {
    if (!shipment) return null;
    const freight = shipment.freight || 0;
    const freightCur = shipment.freight_currency;
    const carrierCharge = shipment.carrier_charge || 0;
    const carrierType = shipment.carrier_charge_type || "flat";
    const carrierCur = (shipment.carrier_currency || "INR") as "INR" | "THB";
    const carrierPay =
      carrierType === "per_kg" ? carrierCharge * (shipment.weight_kg || 0) : carrierCharge;
    let carrierPayInFreight = carrierPay;
    if (carrierCur !== freightCur && shipment.forex_rate) {
      if (freightCur === "THB" && carrierCur === "INR")
        carrierPayInFreight = carrierPay / shipment.forex_rate;
      else if (freightCur === "INR" && carrierCur === "THB")
        carrierPayInFreight = carrierPay * shipment.forex_rate;
    }
    const margin = freight - carrierPayInFreight;
    return { freight, freightCur, carrierPay, carrierCur, carrierType, margin };
  }, [shipment]);

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand} />
      }
      showsVerticalScrollIndicator={false}
    >
      {shipment === null && loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.dim}>Loading shipment…</Text>
        </View>
      ) : error ? (
        <GlassCard style={styles.errorCard}>
          <Ionicons name="alert-circle" size={20} color={colors.danger} />
          <Text style={styles.errorText} numberOfLines={3}>
            {error}
          </Text>
          <TouchableOpacity style={styles.retry} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </GlassCard>
      ) : shipment ? (
        <>
          <GlassCard glow style={styles.headerCard}>
            <View style={styles.headerCardTop}>
              <Pill
                label={titleCase(shipment.status)}
                tint={status.tint}
                soft={status.soft}
              />
              <Text style={styles.dim}>{longDate(shipment.created_at)}</Text>
            </View>
            <Text style={styles.route}>
              {shipment.origin || "—"}{" "}
              <Ionicons
                name={shipment.direction === "IN_TO_TH" ? "arrow-forward" : "arrow-back"}
                size={16}
                color={colors.brand}
              />{" "}
              {shipment.destination || "—"}
            </Text>
            <Text style={styles.routeSub}>
              {titleCase(shipment.mode)} · {shipment.bag_count} bag
              {shipment.bag_count !== 1 ? "s" : ""} · {shipment.weight_kg} kg
            </Text>
          </GlassCard>

          {/* ── Cost cards row: Customer pays / You pay carrier ── */}
          {money ? (
            <View style={styles.costRow}>
              <View style={[styles.costCard, styles.costCardOk]}>
                <Text style={styles.costLabel}>Customer Pays</Text>
                <Text style={[styles.costValue, { color: colors.credit }]}>
                  {fmtCurrency(money.freight, money.freightCur)}
                </Text>
                <Text style={styles.costSub} numberOfLines={1}>
                  {party?.name || "customer"}
                </Text>
              </View>
              <View style={[styles.costCard, styles.costCardDanger]}>
                <Text style={styles.costLabel}>You Pay Carrier</Text>
                <Text style={[styles.costValue, { color: colors.debit }]}>
                  {fmtCurrency(money.carrierPay, money.carrierCur)}
                </Text>
                <Text style={styles.costSub} numberOfLines={1}>
                  {carriers.length > 1
                    ? `${carriers.length} carriers`
                    : carrier?.name || "carrier"}
                  {money.carrierType === "per_kg" ? " · per-kg" : ""}
                </Text>
              </View>
            </View>
          ) : null}

          {/* ── Fix 10 (Phase 6) · Parties as horizontal avatar rails ── */}
          <PartiesRails
            customers={customers.length > 0 ? customers : party ? [party] : []}
            carriers={carriers}
            goods={shipment.goods}
            onPressParty={(pid) => router.push(`/party/${pid}` as any)}
          />

          <Text style={styles.section}>Financials</Text>
          <GlassCard>
            <LabelValueRow
              label="Freight"
              value={fmtCurrency(shipment.freight, shipment.freight_currency)}
              valueColor={colors.text}
            />
            <LabelValueRow
              label="Forex rate"
              value={shipment.forex_rate ? `${shipment.forex_rate}` : "—"}
            />
            {shipment.carrier_charge ? (
              <LabelValueRow
                label="Carrier cost"
                value={fmtCurrency(
                  shipment.carrier_charge,
                  shipment.carrier_currency || "INR",
                )}
                valueColor={colors.debit}
              />
            ) : null}
          </GlassCard>

          {/* ── Bags detail section — below Financials, above Timeline (Fix 1) ── */}
          <BagsSection
            bags={bagsList || []}
            allParties={allParties}
            defaultCarrier={carrier}
            customer={party}
          />

          <Text style={styles.section}>Timeline</Text>
          <GlassCard>
            {TIMELINE.map((t, idx) => {
              const val = shipment[t.key] as string | undefined;
              const done = !!val;
              const active =
                !done && idx > 0 && !!(shipment[TIMELINE[idx - 1].key] as string | undefined);
              return (
                <View key={t.key} style={styles.timelineRow}>
                  <View
                    style={[
                      styles.timelineIcon,
                      {
                        backgroundColor: done
                          ? colors.brandSoft
                          : active
                            ? colors.warnSoft
                            : colors.divider,
                        borderColor: done
                          ? colors.brandBorder
                          : active
                            ? colors.warn
                            : colors.cardBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name={t.icon}
                      size={14}
                      color={done ? colors.brand : active ? colors.warn : colors.textDim}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.timelineLabel,
                        { color: done ? colors.text : colors.textMuted },
                      ]}
                    >
                      {t.label}
                    </Text>
                    <Text style={styles.timelineDate}>{shortDate(val)}</Text>
                  </View>
                </View>
              );
            })}
          </GlassCard>

          {invoiceId ? (
            <TouchableOpacity
              style={styles.linkCard}
              onPress={() => router.push(`/invoice/${invoiceId}` as any)}
              activeOpacity={0.75}
            >
              <Ionicons name="receipt" size={18} color={colors.brand} />
              <View style={{ flex: 1 }}>
                <Text style={styles.linkTitle}>Linked invoice</Text>
                <Text style={styles.linkSub}>Tap to view invoice details & PDF</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
            </TouchableOpacity>
          ) : null}

          {shipment.notes ? (
            <>
              <Text style={styles.section}>Notes</Text>
              <GlassCard>
                <Text style={styles.notes}>{shipment.notes}</Text>
              </GlassCard>
            </>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

// ── Bags section (Fix 4) ─────────────────────────────────────────
// Placed at the top of the shipment detail — shows all bags for this
// shipment with weight, pieces, carrier assignment and an edit stub.
function BagsSection({
  bags,
  allParties,
  defaultCarrier,
  customer,
}: {
  bags: NonNullable<Shipment["bags"]>;
  allParties: Party[];
  defaultCarrier: Party | null;
  customer: Party | null;
}) {
  const onAddBag = () =>
    Alert.alert("Add Bag", "Feature coming soon.", [{ text: "OK" }]);
  const onEditBag = () =>
    Alert.alert("Edit Bag", "Edit coming soon.", [{ text: "OK" }]);

  return (
    <>
      <View style={styles.bagsSectionHeader}>
        <View style={styles.bagsHeaderLeft}>
          <Text style={styles.section}>Bags</Text>
          <Text style={styles.dim}>{bags.length} total</Text>
        </View>
        <TouchableOpacity
          style={styles.addBagBtn}
          onPress={onAddBag}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color={colors.bgSolid} />
          <Text style={styles.addBagBtnText}>Add Bag</Text>
        </TouchableOpacity>
      </View>

      {bags.length === 0 ? (
        <GlassCard style={styles.emptyBagsCard}>
          <Ionicons name="cube-outline" size={24} color={colors.textDim} />
          <Text style={styles.emptyBagsText}>No bags added yet</Text>
          <TouchableOpacity
            style={[styles.addBagBtn, { marginTop: 8 }]}
            onPress={onAddBag}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color={colors.bgSolid} />
            <Text style={styles.addBagBtnText}>Add Bag</Text>
          </TouchableOpacity>
        </GlassCard>
      ) : (
        bags.map((b, idx) => {
          const bagCarrier = b.carrier_party_id
            ? allParties.find((p) => p.id === b.carrier_party_id) || null
            : defaultCarrier;
          const hasCarrier = !!bagCarrier;
          return (
            <GlassCard key={b.id} style={styles.bagCard}>
              <View style={styles.bagCardRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.bagLine1}>
                    <Text style={styles.bagCardId}>
                      Bag #{idx + 1}
                      {b.id ? (
                        <Text style={styles.bagCardIdSub}>
                          {"  "}
                          {b.id.slice(0, 6)}
                        </Text>
                      ) : null}
                    </Text>
                    <Text style={styles.bagCardWeight}>
                      {Number(b.weight_kg ?? 0)} kg
                    </Text>
                  </View>
                  <Text style={styles.bagCardSub}>
                    {b.pieces ? `${b.pieces} pcs` : "— pcs"}
                  </Text>
                  <Text
                    style={[
                      styles.bagCardCarrier,
                      { color: hasCarrier ? colors.brand : colors.warn },
                    ]}
                    numberOfLines={1}
                  >
                    {hasCarrier
                      ? `Carrier: ${bagCarrier.name}`
                      : "No carrier assigned"}
                  </Text>
                  {customer ? (
                    <Text style={styles.bagCardCustomer} numberOfLines={1}>
                      For: {customer.name}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={onEditBag}
                  hitSlop={10}
                  style={styles.bagEditBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil" size={14} color={colors.textDim} />
                </TouchableOpacity>
              </View>
            </GlassCard>
          );
        })
      )}
    </>
  );
}


// ── Fix 10 (Phase 6) · Horizontal circular-avatar rails for parties ──
// Shipments can have multiple Customers and/or multiple Carriers.
// Each rail is horizontally scrollable when parties overflow.
function PartiesRails({
  customers,
  carriers,
  goods,
  onPressParty,
}: {
  customers: Party[];
  carriers: Party[];
  goods?: string;
  onPressParty: (partyId: string) => void;
}) {
  return (
    <>
      <View style={styles.railHeader}>
        <Text style={styles.section}>Customers</Text>
        <Text style={styles.railCount}>
          {customers.length} {customers.length === 1 ? "party" : "parties"}
        </Text>
      </View>
      <PartyRail
        parties={customers}
        role="customer"
        emptyText="No customer linked"
        onPressParty={onPressParty}
      />

      <View style={styles.railHeader}>
        <Text style={styles.section}>Carriers</Text>
        <Text style={styles.railCount}>
          {carriers.length} {carriers.length === 1 ? "party" : "parties"}
        </Text>
      </View>
      <PartyRail
        parties={carriers}
        role="carrier"
        emptyText="No carrier assigned"
        onPressParty={onPressParty}
      />

      {goods ? (
        <View style={styles.goodsChip}>
          <Ionicons name="cube-outline" size={14} color={colors.textDim} />
          <Text style={styles.goodsLabel}>Goods:</Text>
          <Text style={styles.goodsValue}>{goods}</Text>
        </View>
      ) : null}
    </>
  );
}

function PartyRail({
  parties,
  role,
  emptyText,
  onPressParty,
}: {
  parties: Party[];
  role: "customer" | "carrier";
  emptyText: string;
  onPressParty: (partyId: string) => void;
}) {
  if (parties.length === 0) {
    return (
      <View style={styles.railEmpty}>
        <Ionicons
          name={role === "customer" ? "person-outline" : "airplane-outline"}
          size={22}
          color={colors.textDim}
        />
        <Text style={styles.railEmptyText}>{emptyText}</Text>
      </View>
    );
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.railContent}
    >
      {parties.map((p) => (
        <PartyAvatar
          key={p.id}
          party={p}
          role={role}
          onPress={() => onPressParty(p.id)}
        />
      ))}
    </ScrollView>
  );
}

function PartyAvatar({
  party,
  role,
  onPress,
}: {
  party: Party;
  role: "customer" | "carrier";
  onPress: () => void;
}) {
  // Compute up-to-two letter initials from the party name.
  const initials = (party.name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("") || "?";
  const isCarrier = role === "carrier";
  const tint = isCarrier ? colors.brand : "#00C8FF";
  const soft = isCarrier ? colors.brandSoft : "rgba(0,200,255,0.14)";
  const border = isCarrier ? colors.brandBorder : "rgba(0,200,255,0.35)";
  const badgeIcon = isCarrier ? "airplane" : "person";
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={styles.avatarCard}
    >
      <View
        style={[
          styles.avatarCircle,
          { backgroundColor: soft, borderColor: border },
        ]}
      >
        <Text style={[styles.avatarInitials, { color: tint }]}>{initials}</Text>
        <View style={[styles.avatarBadge, { backgroundColor: tint }]}>
          <Ionicons name={badgeIcon} size={10} color={colors.bgSolid} />
        </View>
      </View>
      <Text style={styles.avatarName} numberOfLines={1}>
        {party.name}
      </Text>
      <Text style={styles.avatarRole} numberOfLines={1}>
        {isCarrier ? "Carrier" : "Customer"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: 80 },
  headerCard: { padding: spacing.lg, marginBottom: spacing.md },

  // Cost cards row
  costRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  costCard: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  costCardOk: {
    borderColor: colors.brandBorder,
    backgroundColor: colors.brandSoft,
  },
  costCardDanger: {
    borderColor: "rgba(255,68,68,0.35)",
    backgroundColor: "rgba(255,68,68,0.06)",
  },
  costCardMargin: {
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  costLabel: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  costValue: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginTop: 4,
  },
  costSub: { color: colors.textMuted, fontSize: 11, marginTop: 4 },

  // Party rows
  partyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  partyRowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  partyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brandSoft,
    borderColor: colors.brandBorder,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  partyRole: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  partyName: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  partyGoodsRow: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  partyGoodsLabel: { color: colors.textMuted, fontSize: 12 },
  partyGoodsValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    maxWidth: "60%",
    textAlign: "right",
  },

  bagTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  // Fix 4 — new Bags section styles
  bagsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  bagsHeaderLeft: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
  },
  addBagBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brand,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    shadowColor: colors.brand,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  addBagBtnText: {
    color: colors.bgSolid,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  emptyBagsCard: {
    alignItems: "center",
    padding: spacing.lg,
    gap: 6,
  },
  emptyBagsText: { color: colors.textMuted, fontSize: 13 },
  bagCard: { padding: spacing.md, marginBottom: spacing.sm },
  bagCardRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  bagLine1: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 4,
  },
  bagCardId: { color: colors.text, fontSize: 15, fontWeight: "800" },
  bagCardIdSub: { color: colors.textDim, fontSize: 11, fontWeight: "600" },
  bagCardWeight: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "right",
  },
  bagCardSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  bagCardCarrier: { fontSize: 12, fontWeight: "700", marginTop: 4 },
  bagCardCustomer: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  bagEditBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
  },
  headerCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  route: { color: colors.text, fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  routeSub: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  section: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 8,
  },
  timelineIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLabel: { fontSize: 13, fontWeight: "700" },
  timelineDate: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  notes: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  linkCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.brandSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  linkTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  linkSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  bagsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  bagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  bagRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  bagIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brandSoft,
    borderColor: colors.brandBorder,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bagId: { color: colors.text, fontSize: 13, fontWeight: "800" },
  bagSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  bagWeight: { color: colors.text, fontSize: 13, fontWeight: "800" },
  loading: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  dim: { color: colors.textDim, fontSize: 11 },
  errorCard: {
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderColor: colors.danger,
  },
  errorText: { flex: 1, color: colors.text, fontSize: 12 },
  retry: {
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  retryText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },

  // ── Fix 10 (Phase 6) · Parties rails ───────────────────────
  railHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: spacing.md,
    marginBottom: 4,
  },
  railCount: {
    color: colors.textDim,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  railContent: {
    paddingVertical: 6,
    gap: 12,
    paddingRight: 4,
  },
  railEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    borderStyle: "dashed",
  },
  railEmptyText: { color: colors.textDim, fontSize: 12, fontWeight: "600" },
  avatarCard: {
    width: 92,
    alignItems: "center",
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    position: "relative",
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  avatarBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    width: 88,
  },
  avatarRole: {
    color: colors.textDim,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginTop: 2,
  },
  goodsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    marginTop: spacing.sm,
  },
  goodsLabel: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  goodsValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
});
