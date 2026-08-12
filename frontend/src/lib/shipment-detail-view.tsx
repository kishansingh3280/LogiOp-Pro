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
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
  carrier_charge?: number;
  carrier_currency?: "INR" | "THB";
  bags?: {
    id: string;
    weight_kg?: number;
    status?: string;
    carrier_party_id?: string | null;
    contents?: string | null;
  }[];
  party_id: string;
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
  const [carrier, setCarrier] = useState<Party | null>(null);
  const [allParties, setAllParties] = useState<Party[]>([]);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const s = await apiGet<Shipment>(`/api/shipments/${id}`);
      setShipment(s);

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

      apiGet<Party[]>("/api/parties")
        .then((ps) => setAllParties(Array.isArray(ps) ? ps : []))
        .catch(() => setAllParties([]));
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
      setCarrier(null);
      setInvoiceId(null);
      load();
    }
  }, [token, id, load]);

  const status = STATUS[shipment?.status ?? ""] ?? {
    tint: colors.textMuted,
    soft: colors.divider,
  };

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

          <Text style={styles.section}>Parties</Text>
          <GlassCard>
            <LabelValueRow
              label="Customer"
              value={party?.name || "—"}
              valueColor={colors.text}
            />
            <LabelValueRow
              label="Carrier"
              value={carrier?.name || "—"}
              valueColor={carrier ? colors.brand : colors.textDim}
            />
            {shipment.goods ? (
              <LabelValueRow label="Goods" value={shipment.goods} />
            ) : null}
          </GlassCard>

          {shipment.bags && shipment.bags.length > 0 ? (
            <>
              <View style={styles.bagsHeader}>
                <Text style={styles.section}>Bags · per-carrier</Text>
                <Text style={styles.dim}>{shipment.bags.length} bags</Text>
              </View>
              <GlassCard padded={false}>
                {shipment.bags.map((b, idx, arr) => {
                  const carrierName =
                    (b.carrier_party_id
                      ? allParties.find((p) => p.id === b.carrier_party_id)?.name
                      : null) || (carrier?.name || null);
                  const isShared = !b.carrier_party_id;
                  return (
                    <View
                      key={b.id}
                      style={[
                        styles.bagRow,
                        idx < arr.length - 1 && styles.bagRowBorder,
                      ]}
                    >
                      <View style={styles.bagIcon}>
                        <Ionicons name="cube" size={14} color={colors.brand} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.bagId}>
                          Bag {(b.id || "").slice(0, 8) || `#${idx + 1}`}
                        </Text>
                        <Text style={styles.bagSub} numberOfLines={1}>
                          {carrierName ? (
                            <>
                              Carrier:{" "}
                              <Text
                                style={{
                                  color: isShared ? colors.textMuted : colors.brand,
                                  fontWeight: "800",
                                }}
                              >
                                {carrierName}
                              </Text>
                              {isShared ? " (default)" : null}
                            </>
                          ) : (
                            <Text style={{ color: colors.warn }}>No carrier assigned</Text>
                          )}
                        </Text>
                        {b.contents ? (
                          <Text style={styles.bagSub} numberOfLines={1}>
                            {b.contents}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={styles.bagWeight}>{Number(b.weight_kg ?? 0)} kg</Text>
                    </View>
                  );
                })}
              </GlassCard>
            </>
          ) : null}

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

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: 80 },
  headerCard: { padding: spacing.lg, marginBottom: spacing.md },
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
});
