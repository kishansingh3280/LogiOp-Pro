import { useCallback, useEffect, useState } from "react";
import { Text, View, StyleSheet, Alert, RefreshControl } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { BAG_STATUS_LABELS, TRANSPORT_MODE_LABELS, colors } from "@/lib/theme";
import {
  Screen,
  Card,
  Loading,
  Button,
  Badge,
  Field,
  Chip,
} from "@/components/ui";

type Bag = {
  id: string;
  bagNumber: string;
  weightKg: number | null;
  status: string;
  description: string | null;
  customer: { name: string } | null;
  transportAssignments: Array<{
    transportAssignment: {
      mode: string;
      carrier: { name: string } | null;
      carrierName: string | null;
    };
  }>;
};

type Shipment = {
  id: string;
  lotNumber: string;
  batchNumber: string | null;
  direction: string;
  originWarehouse: { city: string } | null;
  destWarehouse: { city: string } | null;
  bags: Bag[];
};

export default function ShipmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addCount, setAddCount] = useState("1");

  const load = useCallback(async () => {
    setShipment(await apiGet<Shipment>(`/api/shipments/${id}`));
  }, [id]);

  useEffect(() => {
    load().catch((e) => Alert.alert("Error", e.message));
  }, [load]);

  function toggle(bagId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(bagId)) next.delete(bagId);
      else next.add(bagId);
      return next;
    });
  }

  async function addBags() {
    await apiPost(`/api/shipments/${id}/bags`, { count: Number(addCount) || 1 });
    await load();
  }

  async function setStatus(bagId: string, status: string) {
    await apiPatch(`/api/bags/${bagId}`, { status });
    await load();
  }

  if (!shipment) return <Loading />;

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={load} tintColor={colors.accent} />
      }
    >
      <Text style={styles.lot}>Lot {shipment.lotNumber}</Text>
      <Text style={styles.meta}>
        {shipment.direction === "IN_TO_TH" ? "India → Thailand" : "Thailand → India"}
        {shipment.batchNumber ? ` · Batch ${shipment.batchNumber}` : ""}
      </Text>
      <Text style={styles.meta}>
        {shipment.originWarehouse?.city || "?"} → {shipment.destWarehouse?.city || "?"}
      </Text>

      <Card style={{ marginTop: 12 }}>
        <Field
          label="Add more bags"
          keyboardType="number-pad"
          value={addCount}
          onChangeText={setAddCount}
        />
        <Button label="Add bags" variant="secondary" onPress={addBags} />
      </Card>

      <Button
        label={`Assign transport (${selected.size})`}
        disabled={selected.size === 0}
        onPress={() =>
          router.push({
            pathname: "/transport/new",
            params: { bags: Array.from(selected).join(",") },
          })
        }
      />

      {shipment.bags.map((b) => {
        const ta = b.transportAssignments[0]?.transportAssignment;
        const checked = selected.has(b.id);
        return (
          <Card key={b.id} style={{ marginTop: 10 }}>
            <View style={styles.header}>
              <Chip
                label={checked ? `✓ #${b.bagNumber}` : `#${b.bagNumber}`}
                active={checked}
                onPress={() => toggle(b.id)}
              />
              <Badge label={BAG_STATUS_LABELS[b.status] || b.status} tone="accent" />
            </View>
            <Text style={styles.meta}>
              {b.weightKg != null ? `${b.weightKg} kg` : "No weight"} ·{" "}
              {b.customer?.name || "No customer"}
            </Text>
            {ta ? (
              <Text style={styles.meta}>
                {TRANSPORT_MODE_LABELS[ta.mode]} · {ta.carrier?.name || ta.carrierName}
              </Text>
            ) : null}
            <View style={styles.rowWrap}>
              {["IN_TRANSIT", "ARRIVED", "DELIVERED"].map((s) => (
                <Chip
                  key={s}
                  label={BAG_STATUS_LABELS[s]}
                  active={b.status === s}
                  onPress={() => setStatus(b.id, s)}
                />
              ))}
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  lot: { fontSize: 24, fontWeight: "700", color: colors.ink },
  meta: { color: colors.muted, marginTop: 2, fontSize: 13 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
});
