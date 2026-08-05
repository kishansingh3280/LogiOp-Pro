import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiPatch, apiDelete } from "@/src/api/client";
import { useApi } from "@/src/api/hooks";
import type { LedgerEntry, Party, Shipment, ShipmentStatus } from "@/src/api/types";
import { Card, KV, StatusPill } from "@/src/components/ui";
import { colors, radii, spacing } from "@/src/theme";
import { fmtCurrency, shortDate } from "@/src/utils/format";

const STATUS_FLOW: ShipmentStatus[] = ["pending", "in_transit", "warehouse_arrived", "delivered"];

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
  const parties = useApi<Party[]>("/api/parties");
  const ledger = useApi<LedgerEntry[]>("/api/ledger/entries");
  const [busy, setBusy] = useState(false);

  const party = useMemo(
    () => (parties.data || []).find((p) => p.id === shipment.data?.party_id),
    [parties.data, shipment.data?.party_id],
  );
  const carrier = useMemo(
    () => (parties.data || []).find((p) => p.id === shipment.data?.carrier_party_id),
    [parties.data, shipment.data?.carrier_party_id],
  );

  const related = useMemo(
    () =>
      (ledger.data || [])
        .filter((e) => e.ref_type === "shipment" && e.ref_id === id)
        .sort((a, b) => (a.date > b.date ? -1 : 1)),
    [ledger.data, id],
  );

  const advance = async () => {
    if (!shipment.data) return;
    const idx = STATUS_FLOW.indexOf(shipment.data.status);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
    const next = STATUS_FLOW[idx + 1];
    setBusy(true);
    try {
      const res = await apiPatch<Shipment>(`/api/shipments/${shipment.data.id}`, { status: next });
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

  const remove = async () => {
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

  return (
    <Wrapper>
      {!embedded ? (
        <View style={styles.headBar}>
          <TouchableOpacity onPress={() => router.back()} testID="back-btn" style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headTitle} numberOfLines={1}>
            {s.consignment_no}
          </Text>
          <TouchableOpacity onPress={remove} style={styles.iconBtn} testID="delete-btn">
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <View style={styles.topRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>Consignment</Text>
              <Text style={styles.bigTitle}>{s.consignment_no}</Text>
              <Text style={styles.route}>
                {s.origin || "—"} <Text style={styles.arrow}>→</Text> {s.destination || "—"}
              </Text>
            </View>
            <StatusPill status={s.status} />
          </View>

          <View style={styles.metaRow}>
            <Metric label="Bags" value={String(s.bag_count)} />
            <Metric label="Weight" value={`${s.weight_kg} kg`} />
            <Metric label="Mode" value={(s.mode || "-").replace("_", " ")} />
          </View>

          {nextLabel && (
            <TouchableOpacity
              style={styles.advanceBtn}
              onPress={advance}
              disabled={busy}
              testID="advance-status-btn"
            >
              {busy ? (
                <ActivityIndicator color={colors.bg} size="small" />
              ) : (
                <>
                  <Ionicons name="arrow-forward-circle-outline" size={16} color={colors.bg} />
                  <Text style={styles.advanceText}>Mark as {nextLabel.replace("_", " ")}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </Card>

        <Card style={{ marginTop: spacing.md }}>
          <Text style={styles.sectionTitle}>Details</Text>
          <KV label="Direction" value={(s.direction || "").replace("_", " → ")} />
          <KV label="Dispatch date" value={shortDate(s.dispatch_date)} />
          <KV label="Freight" value={fmtCurrency(s.freight, s.freight_currency)} />
          <KV label="Forex rate" value={s.forex_rate ? String(s.forex_rate) : "—"} />
          {s.goods ? <KV label="Goods" value={s.goods} /> : null}
          {s.notes ? <KV label="Notes" value={s.notes} /> : null}
        </Card>

        <Card style={{ marginTop: spacing.md }}>
          <Text style={styles.sectionTitle}>Parties</Text>
          <KV label="Client" value={party?.name || "—"} />
          {party?.phone ? <KV label="Client phone" value={party.phone} /> : null}
          <KV label="Carrier" value={carrier?.name || "—"} />
          <KV
            label="Carrier charge"
            value={
              s.carrier_charge
                ? `${fmtCurrency(s.carrier_charge, (s.carrier_currency || "INR") as "INR" | "THB")} · ${s.carrier_charge_type}`
                : "—"
            }
          />
        </Card>

        <Card style={{ marginTop: spacing.md }}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <TimelineRow label="Created" date={s.created_at} tint={colors.textDim} />
          <TimelineRow label="Dispatched" date={s.dispatched_at} tint={colors.warn} />
          <TimelineRow label="In transit" date={s.in_transit_at} tint={colors.info} />
          <TimelineRow label="Warehouse" date={s.warehouse_arrived_at} tint={colors.lime} />
          <TimelineRow label="Delivered" date={s.delivered_at} tint={colors.ok} />
        </Card>

        {related.length > 0 && (
          <Card style={{ marginTop: spacing.md }}>
            <Text style={styles.sectionTitle}>Related ledger entries</Text>
            {related.map((e) => (
              <View key={e.id} style={styles.ledgerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ledgerDesc}>{e.description}</Text>
                  <Text style={styles.ledgerDate}>{shortDate(e.date)}</Text>
                </View>
                <Text
                  style={[
                    styles.ledgerAmount,
                    { color: e.credit > 0 ? colors.ok : colors.danger },
                  ]}
                >
                  {e.credit > 0 ? `+${e.credit}` : `-${e.debit}`}
                </Text>
              </View>
            ))}
          </Card>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </Wrapper>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
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
    gap: 4,
  },
  iconBtn: { padding: 8 },
  headTitle: { flex: 1, color: colors.text, fontSize: 17, fontWeight: "800", textAlign: "center" },
  content: { padding: spacing.lg },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  dim: { color: colors.textDim, fontSize: 14 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md },
  eyebrow: { color: colors.textDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 },
  bigTitle: { color: colors.text, fontSize: 22, fontWeight: "800", marginTop: 2 },
  route: { color: colors.textMuted, fontSize: 14, marginTop: 6 },
  arrow: { color: colors.lime, fontWeight: "800" },
  metaRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  metric: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.chipBg,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
  },
  metricLabel: { color: colors.textDim, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  metricValue: { color: colors.text, fontSize: 18, fontWeight: "800", marginTop: 4, textTransform: "capitalize" },
  advanceBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.lime,
    paddingVertical: 12,
    borderRadius: radii.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  advanceText: { color: colors.bg, fontWeight: "800", fontSize: 13, textTransform: "capitalize" },
  sectionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  tlRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  tlDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, marginRight: 10 },
  tlText: { flex: 1, flexDirection: "row", justifyContent: "space-between" },
  tlLabel: { fontSize: 13, fontWeight: "600" },
  tlDate: { color: colors.textDim, fontSize: 12 },
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
});
