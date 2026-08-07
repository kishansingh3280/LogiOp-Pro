import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useApi } from "@/src/api/hooks";
import type { Invoice, Party } from "@/src/api/types";
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
          <KV
            label="Linked shipment"
            value={i.shipment_id ? "Yes — see shipment" : "None — invoice-only"}
          />
        </Card>

        {/* Unlinked invoices get a shortcut to create the missing
            shipment. Freight amount + party + currency pre-fill via the
            invoice's own values so the operator only fills in bags. */}
        {!i.shipment_id ? (
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
        ) : (
          <TouchableOpacity
            style={styles.openShipmentBtn}
            onPress={() => router.push(`/shipment/${i.shipment_id}` as never)}
            testID="open-linked-shipment"
          >
            <Ionicons name="link" size={14} color={colors.lime} />
            <Text style={styles.openShipmentText}>Open linked shipment</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
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
});
