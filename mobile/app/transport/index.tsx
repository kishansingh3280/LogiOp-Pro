import { useCallback, useEffect, useState } from "react";
import { Text, View, StyleSheet, Alert, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { format } from "date-fns";
import { apiGet, apiPatch } from "@/lib/api";
import { TRANSPORT_MODE_LABELS, formatMoney, colors } from "@/lib/theme";
import { Screen, Title, Card, Loading, Button, Badge } from "@/components/ui";

type Assignment = {
  id: string;
  mode: string;
  assignedDate: string;
  departureDate: string | null;
  arrivalDate: string | null;
  ratePerKg: number | null;
  totalWeightKg: number | null;
  currency: "INR" | "THB";
  deliveredToCustomer: boolean;
  carrier: { name: string } | null;
  carrierName: string | null;
  bags: Array<{ bag: { bagNumber: string; shipment: { lotNumber: string } } }>;
  ledgerEntries: Array<{ id: string; amount: number }>;
};

export default function TransportScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Assignment[] | null>(null);

  const load = useCallback(async () => {
    setItems(await apiGet<Assignment[]>("/api/transport"));
  }, []);

  useEffect(() => {
    load().catch((e) => Alert.alert("Error", e.message));
  }, [load]);

  async function update(id: string, patch: Record<string, unknown>) {
    await apiPatch(`/api/transport/${id}`, patch);
    await load();
  }

  if (!items) return <Loading />;

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={load} tintColor={colors.accent} />
      }
    >
      <Title subtitle="Who took bags · arrival · delivery">Transport</Title>
      <Button label="Assign transport" onPress={() => router.push("/transport/new")} />

      {items.map((a) => {
        const payable =
          a.ratePerKg != null && a.totalWeightKg != null
            ? a.ratePerKg * a.totalWeightKg
            : null;
        const lots = Array.from(new Set(a.bags.map((b) => b.bag.shipment.lotNumber)));
        return (
          <Card key={a.id} style={{ marginTop: 12 }}>
            <Text style={styles.name}>
              {a.carrier?.name || a.carrierName || "Unnamed carrier"}
            </Text>
            <Text style={styles.meta}>
              {TRANSPORT_MODE_LABELS[a.mode] || a.mode} ·{" "}
              {format(new Date(a.assignedDate), "dd MMM yyyy")} · {a.bags.length} bags
            </Text>
            <Text style={styles.meta}>Lots: {lots.join(", ") || "—"}</Text>
            {payable != null ? (
              <Text style={styles.pay}>
                {formatMoney(payable, a.currency)}
                {a.ledgerEntries.length ? " · ledger synced" : ""}
              </Text>
            ) : null}
            <View style={styles.badges}>
              {a.deliveredToCustomer ? (
                <Badge label="Delivered" tone="ok" />
              ) : a.arrivalDate ? (
                <Badge label="Arrived" tone="accent" />
              ) : (
                <Badge label="In progress" tone="warn" />
              )}
            </View>
            <View style={styles.actions}>
              <Button
                label="Mark in transit"
                variant="secondary"
                onPress={() =>
                  update(a.id, {
                    departureDate: new Date().toISOString(),
                    markBagsStatus: "IN_TRANSIT",
                  })
                }
              />
              <Button
                label="Mark arrived"
                variant="secondary"
                onPress={() =>
                  update(a.id, {
                    arrivalDate: new Date().toISOString(),
                    markBagsStatus: "ARRIVED",
                  })
                }
              />
              <Button
                label="Delivered to customer"
                onPress={() =>
                  update(a.id, {
                    deliveredToCustomer: true,
                    markBagsStatus: "DELIVERED",
                  })
                }
              />
              {a.ledgerEntries.length === 0 && a.carrier && a.ratePerKg && a.totalWeightKg ? (
                <Button
                  label="Sync payment to ledger"
                  variant="secondary"
                  onPress={() => update(a.id, { syncToLedger: true })}
                />
              ) : null}
            </View>
          </Card>
        );
      })}

      {items.length === 0 ? (
        <Card style={{ marginTop: 12 }}>
          <Text style={{ color: colors.muted }}>No transport assignments yet.</Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 18, fontWeight: "700", color: colors.ink },
  meta: { color: colors.muted, fontSize: 13, marginTop: 3 },
  pay: { marginTop: 8, fontWeight: "700", color: colors.inr, fontSize: 16 },
  badges: { flexDirection: "row", gap: 6, marginTop: 8 },
  actions: { gap: 8, marginTop: 12 },
});
