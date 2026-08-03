import { useCallback, useState } from "react";
import { Text, View, StyleSheet, RefreshControl, Alert } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { apiGet } from "@/lib/api";
import { BAG_STATUS_LABELS, TRANSPORT_MODE_LABELS, colors } from "@/lib/theme";
import { Screen, Title, Card, Loading, Badge, Field, Chip, Button } from "@/components/ui";

type Bag = {
  id: string;
  bagNumber: string;
  status: string;
  weightKg: number | null;
  shipment: {
    id: string;
    lotNumber: string;
    batchNumber: string | null;
    originWarehouse: { city: string } | null;
    destWarehouse: { city: string } | null;
  };
  customer: { name: string } | null;
  transportAssignments: Array<{
    transportAssignment: {
      mode: string;
      carrier: { name: string } | null;
      carrierName: string | null;
    };
  }>;
};

export default function BagsScreen() {
  const router = useRouter();
  const [bags, setBags] = useState<Bag[] | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async (query = q, st = status) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (st) params.set("status", st);
    setBags(await apiGet<Bag[]>(`/api/bags?${params}`));
  }, [q, status]);

  useFocusEffect(
    useCallback(() => {
      load().catch((e) => Alert.alert("Error", e.message));
    }, [load])
  );

  if (!bags) return <Loading />;

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={() => load()} tintColor={colors.accent} />
      }
    >
      <Title subtitle="Live status by lot / batch / bag #">Bag tracker</Title>
      <Field
        label="Search"
        value={q}
        onChangeText={setQ}
        placeholder="LOT-… or bag number"
        onSubmitEditing={() => load()}
      />
      <View style={styles.rowWrap}>
        <Chip label="All" active={!status} onPress={() => { setStatus(""); load(q, ""); }} />
        {["IN_TRANSIT", "ARRIVED", "DELIVERED", "CREATED"].map((s) => (
          <Chip
            key={s}
            label={BAG_STATUS_LABELS[s]}
            active={status === s}
            onPress={() => {
              setStatus(s);
              load(q, s);
            }}
          />
        ))}
      </View>
      <Button label="Search" onPress={() => load()} />

      {bags.map((b) => {
        const ta = b.transportAssignments[0]?.transportAssignment;
        return (
          <Card key={b.id} style={{ marginTop: 10 }}>
            <View style={styles.header}>
              <Text style={styles.title}>
                {b.shipment.lotNumber} · #{b.bagNumber}
              </Text>
              <Badge label={BAG_STATUS_LABELS[b.status] || b.status} tone="accent" />
            </View>
            {b.shipment.batchNumber ? (
              <Text style={styles.meta}>Batch {b.shipment.batchNumber}</Text>
            ) : null}
            <Text style={styles.meta}>
              {b.shipment.originWarehouse?.city || "?"} →{" "}
              {b.shipment.destWarehouse?.city || "?"}
              {b.weightKg != null ? ` · ${b.weightKg} kg` : ""}
            </Text>
            <Text style={styles.meta}>{b.customer?.name || "No customer"}</Text>
            {ta ? (
              <Text style={styles.meta}>
                {TRANSPORT_MODE_LABELS[ta.mode] || ta.mode} ·{" "}
                {ta.carrier?.name || ta.carrierName || "—"}
              </Text>
            ) : null}
            <Text
              style={styles.link}
              onPress={() => router.push(`/shipment/${b.shipment.id}`)}
            >
              Open shipment →
            </Text>
          </Card>
        );
      })}

      {bags.length === 0 ? (
        <Card style={{ marginTop: 10 }}>
          <Text style={{ color: colors.muted }}>No bags match your search.</Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowWrap: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  header: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  title: { fontWeight: "700", color: colors.ink, flex: 1, fontSize: 15 },
  meta: { color: colors.muted, fontSize: 13, marginTop: 3 },
  link: { marginTop: 8, color: colors.accent, fontWeight: "700" },
});
