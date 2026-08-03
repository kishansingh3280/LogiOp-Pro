import { useCallback, useState } from "react";
import { View, Text, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { apiGet } from "@/lib/api";
import { BAG_STATUS_LABELS, formatMoney, colors } from "@/lib/theme";
import { Screen, Title, Card, Money, Loading, Button, Badge } from "@/components/ui";

type Dashboard = {
  statusCounts: Record<string, number>;
  partyCount: number;
  shipmentCount: number;
  bagCount: number;
  totals: {
    INR: { toReceive: number; toPay: number };
    THB: { toReceive: number; toPay: number };
  };
  recentBags: Array<{
    id: string;
    bagNumber: string;
    status: string;
    shipment: { id: string; lotNumber: string; batchNumber: string | null };
  }>;
};

export default function DashboardScreen() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const d = await apiGet<Dashboard>("/api/dashboard");
      setData(d);
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message}. Open Settings and set your API URL.`
          : "Failed to load"
      );
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!data && !error) return <Loading />;

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
          tintColor={colors.accent}
        />
      }
    >
      <Title subtitle="Demo data ready · India ↔ Thailand operations">LogiOp Pro</Title>

      {error ? (
        <Card>
          <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text>
          <Button label="Open settings" onPress={() => router.push("/settings")} />
        </Card>
      ) : null}

      {data ? (
        <>
          <View style={styles.grid}>
            <Card style={styles.half}>
              <Text style={styles.muted}>Receive · INR</Text>
              <Money amount={formatMoney(data.totals.INR.toReceive, "INR")} currency="INR" large />
            </Card>
            <Card style={styles.half}>
              <Text style={styles.muted}>Pay · INR</Text>
              <Money amount={formatMoney(data.totals.INR.toPay, "INR")} currency="INR" large />
            </Card>
            <Card style={styles.half}>
              <Text style={styles.muted}>Receive · THB</Text>
              <Money amount={formatMoney(data.totals.THB.toReceive, "THB")} currency="THB" large />
            </Card>
            <Card style={styles.half}>
              <Text style={styles.muted}>Pay · THB</Text>
              <Money amount={formatMoney(data.totals.THB.toPay, "THB")} currency="THB" large />
            </Card>
          </View>

          <Card>
            <Text style={styles.section}>Snapshot</Text>
            <Text style={styles.muted}>
              {data.partyCount} parties · {data.shipmentCount} lots · {data.bagCount} bags
            </Text>
            <View style={styles.chips}>
              {Object.entries(BAG_STATUS_LABELS).map(([k, label]) => (
                <Badge
                  key={k}
                  label={`${label}: ${data.statusCounts[k] || 0}`}
                  tone={(data.statusCounts[k] || 0) > 0 ? "accent" : "neutral"}
                />
              ))}
            </View>
          </Card>

          <View style={styles.actions}>
            <Button label="New shipment" onPress={() => router.push("/shipment/new")} />
            <Button
              label="Transport"
              variant="secondary"
              onPress={() => router.push("/transport")}
            />
          </View>

          <Card>
            <Text style={styles.section}>Recent bags</Text>
            {data.recentBags.slice(0, 8).map((b) => (
              <View key={b.id} style={styles.bagRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bagTitle}>
                    {b.shipment.lotNumber} · #{b.bagNumber}
                  </Text>
                  {b.shipment.batchNumber ? (
                    <Text style={styles.muted}>Batch {b.shipment.batchNumber}</Text>
                  ) : null}
                </View>
                <Badge label={BAG_STATUS_LABELS[b.status] || b.status} tone="accent" />
              </View>
            ))}
            {data.recentBags.length === 0 ? (
              <Text style={styles.muted}>No bags yet</Text>
            ) : null}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  half: { width: "48%", flexGrow: 1 },
  muted: { color: colors.muted, fontSize: 13, marginBottom: 4 },
  section: { fontSize: 17, fontWeight: "700", color: colors.ink, marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  actions: { gap: 8, marginBottom: 12 },
  bagRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  bagTitle: { fontWeight: "600", color: colors.ink },
});
