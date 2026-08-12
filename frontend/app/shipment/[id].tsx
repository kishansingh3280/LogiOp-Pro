/**
 * Shipment detail — Phase 3.
 *
 * Deep-linked at /shipment/:id. Loads the full shipment record via
 * /api/shipments/:id and displays consignment header, timeline,
 * financials (freight + carrier charge — freight in white, carrier
 * cost in red per the design), and party info.
 */
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
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
import { SafeAreaView } from "react-native-safe-area-context";

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

const TIMELINE: { key: keyof Shipment; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { key: "created_at", label: "Created", icon: "add-circle" },
  { key: "dispatched_at", label: "Dispatched", icon: "send" },
  { key: "in_transit_at", label: "In transit", icon: "airplane" },
  { key: "warehouse_arrived_at", label: "Warehouse", icon: "cube" },
  { key: "delivered_at", label: "Delivered", icon: "checkmark-done" },
];

export default function ShipmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [party, setParty] = useState<Party | null>(null);
  const [carrier, setCarrier] = useState<Party | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch shipment first — party fetches are best-effort.
      const s = await apiGet<Shipment>(`/api/shipments/${id}`);
      setShipment(s);

      const partyRequests: Promise<Party | null>[] = [];
      if (s.party_id) {
        partyRequests.push(
          apiGet<Party>(`/api/parties/${s.party_id}`).catch(() => null),
        );
      } else {
        partyRequests.push(Promise.resolve(null));
      }
      if (s.carrier_party_id) {
        partyRequests.push(
          apiGet<Party>(`/api/parties/${s.carrier_party_id}`).catch(() => null),
        );
      } else {
        partyRequests.push(Promise.resolve(null));
      }
      const [p1, p2] = await Promise.all(partyRequests);
      setParty(p1);
      setCarrier(p2);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (token && id) load();
  }, [token, id, load]);

  const status = STATUS[shipment?.status ?? ""] ?? {
    tint: colors.textMuted,
    soft: colors.divider,
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {shipment?.consignment_no || "Shipment"}
          </Text>
          <Text style={styles.subtitle}>{id}</Text>
        </View>
      </View>

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
            {/* Header card */}
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

            {/* Financials */}
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

            {/* Timeline */}
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

            {/* Parties */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: colors.textDim, fontSize: 10, marginTop: 2 },
  scroll: { padding: spacing.lg, paddingBottom: 80 },
  headerCard: { padding: spacing.lg, marginBottom: spacing.md },
  headerCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  route: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
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
