import { useCallback, useState } from "react";
import { Text, View, StyleSheet, RefreshControl, Alert } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { apiGet } from "@/lib/api";
import { BAG_STATUS_LABELS, colors } from "@/lib/theme";
import { Screen, Title, Card, Loading, Button, Badge } from "@/components/ui";

type Shipment = {
  id: string;
  lotNumber: string;
  batchNumber: string | null;
  direction: string;
  originWarehouse: { city: string } | null;
  destWarehouse: { city: string } | null;
  bags: Array<{ status: string }>;
  _count: { bags: number };
};

export default function ShipmentsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Shipment[] | null>(null);

  const load = useCallback(async () => {
    setItems(await apiGet<Shipment[]>("/api/shipments"));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().catch((e) => Alert.alert("Error", e.message));
    }, [load])
  );

  if (!items) return <Loading />;

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={load} tintColor={colors.accent} />
      }
    >
      <Title subtitle="Lots & batches with bag tracking">Shipments</Title>
      <Button label="New shipment" onPress={() => router.push("/shipment/new")} />

      {items.map((s) => {
        const summary = s.bags.reduce<Record<string, number>>((acc, b) => {
          acc[b.status] = (acc[b.status] || 0) + 1;
          return acc;
        }, {});
        return (
          <Card key={s.id} style={{ marginTop: 12 }}>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lot}>Lot {s.lotNumber}</Text>
                {s.batchNumber ? (
                  <Text style={styles.meta}>Batch {s.batchNumber}</Text>
                ) : null}
                <Text style={styles.meta}>
                  {s.originWarehouse?.city || "?"} → {s.destWarehouse?.city || "?"} ·{" "}
                  {s.direction === "IN_TO_TH" ? "IN→TH" : "TH→IN"}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.count}>{s._count.bags}</Text>
                <Text style={styles.meta}>bags</Text>
              </View>
            </View>
            <View style={styles.badges}>
              {Object.entries(summary).map(([st, n]) => (
                <Badge
                  key={st}
                  label={`${BAG_STATUS_LABELS[st] || st}: ${n}`}
                  tone="accent"
                />
              ))}
            </View>
            <View style={{ marginTop: 10 }}>
              <Button label="Open lot" onPress={() => router.push(`/shipment/${s.id}`)} />
            </View>
          </Card>
        );
      })}

      {items.length === 0 ? (
        <Card style={{ marginTop: 12 }}>
          <Text style={{ color: colors.muted }}>
            No shipments yet. Create a lot with bags to start tracking.
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", gap: 12 },
  lot: { fontSize: 18, fontWeight: "700", color: colors.ink },
  meta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  count: { fontSize: 28, fontWeight: "700", color: colors.accent },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
});
