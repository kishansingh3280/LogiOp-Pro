import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useApi } from "@/src/api/hooks";
import type { Invoice, Party, Shipment, ShipmentBag } from "@/src/api/types";
import { Card, KV, StatusPill } from "@/src/components/ui";
import { colors, radii, spacing } from "@/src/theme";
import { fmtCurrency, shortDate } from "@/src/utils/format";

export default function InvoiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const inv = useApi<Invoice>(id ? `/api/invoices/${id}` : null);
  const parties = useApi<Party[]>("/api/parties");
  const party = useMemo(
    () => (parties.data || []).find((p) => p.id === inv.data?.party_id),
    [parties.data, inv.data?.party_id],
  );
  // Only fetch the linked shipment + its bags when we actually have one —
  // avoids a wasted round-trip for invoice-only records. `useApi` returns
  // `{ data: null }` when the path is null so downstream reads stay safe.
  const linkedShipment = useApi<Shipment>(
    inv.data?.shipment_id ? `/api/shipments/${inv.data.shipment_id}` : null,
  );
  const linkedBags = useApi<ShipmentBag[]>(
    inv.data?.shipment_id ? `/api/shipments/${inv.data.shipment_id}/bags` : null,
  );

  if (inv.loading && !inv.data) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.lime} />
      </SafeAreaView>
    );
  }
  if (!inv.data) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safe}>
        <Text style={styles.dim}>Invoice not found</Text>
      </SafeAreaView>
    );
  }

  const i = inv.data;

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.headBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headTitle}>{i.number}</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.topRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>Invoice</Text>
              <Text style={styles.big}>{i.number}</Text>
              <Text style={styles.sub}>{party?.name || "Unknown party"} · {shortDate(i.date)}</Text>
            </View>
            <StatusPill status={i.status} />
          </View>
          <View style={styles.totalRow}>
            <View style={styles.totalCol}>
              <Text style={styles.totalLbl}>Subtotal</Text>
              <Text style={styles.totalVal}>{fmtCurrency(i.subtotal, i.currency)}</Text>
            </View>
            <View style={styles.totalCol}>
              <Text style={styles.totalLbl}>Tax</Text>
              <Text style={styles.totalVal}>{fmtCurrency(i.tax_amount, i.currency)}</Text>
            </View>
            <View style={styles.totalCol}>
              <Text style={styles.totalLbl}>Total</Text>
              <Text style={[styles.totalVal, { color: colors.lime }]}>
                {fmtCurrency(i.total, i.currency)}
              </Text>
            </View>
          </View>
        </Card>

        <Card style={{ marginTop: spacing.md }}>
          <Text style={styles.sectionTitle}>Items</Text>
          {i.items.map((it, idx) => (
            <View key={idx} style={styles.item}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemDesc}>{it.description}</Text>
                <Text style={styles.itemMeta}>
                  {it.quantity} × {fmtCurrency(it.rate, i.currency)}
                  {it.unit ? ` ${it.unit}` : ""}
                </Text>
              </View>
              <Text style={styles.itemTotal}>
                {fmtCurrency(it.quantity * it.rate, i.currency)}
              </Text>
            </View>
          ))}
        </Card>

        <Card style={{ marginTop: spacing.md }}>
          <Text style={styles.sectionTitle}>Details</Text>
          <KV label="Currency" value={i.currency} />
          <KV label="Date" value={shortDate(i.date)} />
          {i.due_date ? <KV label="Due" value={shortDate(i.due_date)} /> : null}
          {i.tax_percent ? <KV label="Tax %" value={`${i.tax_percent}%`} /> : null}
          {i.notes ? <KV label="Notes" value={i.notes} /> : null}
        </Card>

        {/* Shipment fulfilment section — swaps between two modes:
              · Not yet created  → prominent CTA to spawn a shipment
                                    with invoice items pre-loaded.
              · Already linked   → rich summary card + Edit / Open CTAs.
            No more "Yes — see shipment" placeholder row. */}
        {i.shipment_id ? (
          <LinkedShipmentCard
            shipment={linkedShipment.data}
            bags={linkedBags.data || []}
            loading={linkedShipment.loading}
            onEdit={() =>
              router.push(`/shipment/new?editId=${i.shipment_id}` as never)
            }
            onOpen={() =>
              router.push(`/shipment/${i.shipment_id}` as never)
            }
          />
        ) : (
          <TouchableOpacity
            style={styles.createShipmentBtn}
            onPress={() => router.push(
              `/shipment/new?fromInvoice=${i.id}` as never,
            )}
            testID="create-shipment-from-invoice"
          >
            <Ionicons name="cube-outline" size={16} color={colors.bg} />
            <Text style={styles.createShipmentText}>
              Create shipment from this invoice
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Compact but information-dense summary of the shipment linked to this
 * invoice. Shows status pill, route, weight/bag totals, and a peek at the
 * first few bags with their bag_no + recipient. Two CTAs — "Edit" jumps
 * back into the shipment form for corrections; "Open" navigates to the
 * shipment detail page for status timeline and Lalamove booking.
 */
function LinkedShipmentCard({
  shipment,
  bags,
  loading,
  onEdit,
  onOpen,
}: {
  shipment: Shipment | null;
  bags: ShipmentBag[];
  loading: boolean;
  onEdit: () => void;
  onOpen: () => void;
}) {
  if (loading && !shipment) {
    return (
      <Card style={{ marginTop: spacing.md, alignItems: "center", paddingVertical: spacing.xl }}>
        <ActivityIndicator color={colors.lime} />
        <Text style={styles.dim}>Loading linked shipment…</Text>
      </Card>
    );
  }
  if (!shipment) {
    return (
      <Card style={{ marginTop: spacing.md }}>
        <Text style={styles.dim}>Linked shipment could not be loaded.</Text>
      </Card>
    );
  }
  const totalWeight = bags.length
    ? bags.reduce((s, b) => s + (Number(b.weight_kg) || 0), 0)
    : Number(shipment.weight_kg) || 0;
  const bagCount = bags.length || shipment.bag_count || 0;
  const route = `${shipment.origin || "?"} → ${shipment.destination || "?"}`;
  return (
    <Card style={{ marginTop: spacing.md }}>
      <View style={styles.shipHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>Linked shipment</Text>
          <Text style={styles.shipNo}>{shipment.consignment_no}</Text>
          <Text style={styles.shipRoute}>{route}</Text>
        </View>
        <StatusPill status={shipment.status || "pending"} />
      </View>

      <View style={styles.shipStatsRow}>
        <View style={styles.shipStat}>
          <Text style={styles.shipStatLbl}>Bags</Text>
          <Text style={styles.shipStatVal}>{bagCount}</Text>
        </View>
        <View style={styles.shipStat}>
          <Text style={styles.shipStatLbl}>Weight</Text>
          <Text style={styles.shipStatVal}>{totalWeight.toFixed(1)} kg</Text>
        </View>
        <View style={styles.shipStat}>
          <Text style={styles.shipStatLbl}>Freight</Text>
          <Text style={[styles.shipStatVal, { color: colors.lime }]}>
            {fmtCurrency(Number(shipment.freight) || 0, shipment.freight_currency)}
          </Text>
        </View>
      </View>

      {bags.length > 0 ? (
        <View style={styles.shipBagList}>
          {bags.slice(0, 4).map((b) => (
            <View key={b.id} style={styles.shipBagRow}>
              <Ionicons name="cube-outline" size={13} color={colors.lime} />
              <Text style={styles.shipBagText} numberOfLines={1}>
                {b.bag_no} · {b.weight_kg} kg
                {b.items && b.items.length
                  ? ` · ${b.items.length} item${b.items.length === 1 ? "" : "s"}`
                  : ""}
              </Text>
            </View>
          ))}
          {bags.length > 4 ? (
            <Text style={styles.shipBagMore}>
              +{bags.length - 4} more bag{bags.length - 4 === 1 ? "" : "s"}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.shipCtaRow}>
        <TouchableOpacity
          style={styles.shipEditBtn}
          onPress={onEdit}
          testID="edit-linked-shipment"
        >
          <Ionicons name="create-outline" size={14} color={colors.lime} />
          <Text style={styles.shipEditText}>Edit shipment</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.shipOpenBtn}
          onPress={onOpen}
          testID="open-linked-shipment"
        >
          <Text style={styles.shipOpenText}>Open</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.bg} />
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  iconBtn: { padding: 8, width: 36 },
  headTitle: { flex: 1, color: colors.text, fontSize: 17, fontWeight: "800", textAlign: "center" },
  content: { padding: spacing.lg },
  dim: { color: colors.textDim, textAlign: "center", padding: spacing.xl },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md },
  eyebrow: { color: colors.textDim, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 },
  big: { color: colors.text, fontSize: 22, fontWeight: "800", marginTop: 2 },
  sub: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
  totalRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  totalCol: {
    flex: 1,
    backgroundColor: colors.chipBg,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: "center",
  },
  totalLbl: { color: colors.textDim, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  totalVal: { color: colors.text, fontSize: 16, fontWeight: "800", marginTop: 4 },
  sectionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  itemDesc: { color: colors.text, fontSize: 14, fontWeight: "600" },
  itemMeta: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  itemTotal: { color: colors.lime, fontSize: 14, fontWeight: "800" },
  createShipmentBtn: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.lime,
  },
  createShipmentText: {
    color: colors.bg,
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.3,
  },
  openShipmentBtn: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: radii.pill,
    borderColor: colors.lime,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.chipBg,
  },
  openShipmentText: { color: colors.lime, fontSize: 12, fontWeight: "800" },
  // Linked shipment card
  shipHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  shipNo: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
  },
  shipRoute: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  shipStatsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  shipStat: {
    flex: 1,
    backgroundColor: colors.chipBg,
    borderRadius: radii.md,
    padding: 10,
    alignItems: "center",
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  shipStatLbl: {
    color: colors.textDim,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  shipStatVal: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 4,
  },
  shipBagList: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  shipBagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
  },
  shipBagText: {
    color: colors.textMuted,
    fontSize: 12,
    flex: 1,
  },
  shipBagMore: {
    color: colors.textDim,
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 4,
  },
  shipCtaRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  shipEditBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: radii.pill,
    borderColor: colors.lime,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.chipBg,
  },
  shipEditText: { color: colors.lime, fontSize: 12, fontWeight: "800" },
  shipOpenBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: radii.pill,
    backgroundColor: colors.lime,
  },
  shipOpenText: { color: colors.bg, fontSize: 12, fontWeight: "800" },
});
