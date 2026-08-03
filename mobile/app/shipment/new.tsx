import { useEffect, useState } from "react";
import { Alert, Text, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { apiGet, apiPost } from "@/lib/api";
import { colors } from "@/lib/theme";
import { Screen, Title, Card, Button, Field, Chip } from "@/components/ui";

type Warehouse = { id: string; name: string; city: string };
type Party = { id: string; name: string; type: string };

export default function NewShipmentScreen() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    lotNumber: `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
    batchNumber: "",
    direction: "IN_TO_TH",
    originWarehouseId: "",
    destWarehouseId: "",
    bagCount: "25",
    defaultCustomerId: "",
    notes: "",
  });

  useEffect(() => {
    Promise.all([
      apiGet<Warehouse[]>("/api/warehouses"),
      apiGet<Party[]>("/api/parties"),
    ])
      .then(([w, p]) => {
        setWarehouses(w);
        setParties(p);
        const delhi = w.find((x) => x.city === "Delhi");
        const bkk = w.find((x) => x.city === "Bangkok");
        setForm((f) => ({
          ...f,
          originWarehouseId: delhi?.id || "",
          destWarehouseId: bkk?.id || "",
          lotNumber: `${f.lotNumber}-${Math.floor(Math.random() * 900 + 100)}`,
        }));
      })
      .catch((e) => Alert.alert("Error", e.message));
  }, []);

  async function submit() {
    if (!form.lotNumber || !form.bagCount) {
      Alert.alert("Lot number and bag count required");
      return;
    }
    setSaving(true);
    try {
      const ship = await apiPost<{ id: string }>("/api/shipments", {
        ...form,
        bagCount: Number(form.bagCount),
        defaultCustomerId: form.defaultCustomerId || null,
        originWarehouseId: form.originWarehouseId || null,
        destWarehouseId: form.destWarehouseId || null,
      });
      router.replace(`/shipment/${ship.id}`);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  const customers = parties.filter(
    (p) => p.type === "CUSTOMER_IN" || p.type === "CUSTOMER_TH"
  );

  return (
    <Screen>
      <Title subtitle="Create lot and generate bags">New shipment</Title>
      <Card>
        <Field
          label="Lot number"
          value={form.lotNumber}
          onChangeText={(lotNumber) => setForm({ ...form, lotNumber })}
        />
        <Field
          label="Batch number"
          value={form.batchNumber}
          onChangeText={(batchNumber) => setForm({ ...form, batchNumber })}
        />
        <Text style={styles.label}>Direction</Text>
        <View style={styles.row}>
          <Chip
            label="India → Thailand"
            active={form.direction === "IN_TO_TH"}
            onPress={() => setForm({ ...form, direction: "IN_TO_TH" })}
          />
          <Chip
            label="Thailand → India"
            active={form.direction === "TH_TO_IN"}
            onPress={() => setForm({ ...form, direction: "TH_TO_IN" })}
          />
        </View>
        <Text style={styles.label}>Origin warehouse</Text>
        <View style={styles.row}>
          {warehouses.map((w) => (
            <Chip
              key={w.id}
              label={w.city}
              active={form.originWarehouseId === w.id}
              onPress={() => setForm({ ...form, originWarehouseId: w.id })}
            />
          ))}
        </View>
        <Text style={styles.label}>Destination</Text>
        <View style={styles.row}>
          {warehouses.map((w) => (
            <Chip
              key={`d-${w.id}`}
              label={w.city}
              active={form.destWarehouseId === w.id}
              onPress={() => setForm({ ...form, destWarehouseId: w.id })}
            />
          ))}
        </View>
        <Field
          label="Number of bags"
          keyboardType="number-pad"
          value={form.bagCount}
          onChangeText={(bagCount) => setForm({ ...form, bagCount })}
        />
        <Text style={styles.label}>Default customer (optional)</Text>
        <View style={styles.row}>
          <Chip
            label="None"
            active={!form.defaultCustomerId}
            onPress={() => setForm({ ...form, defaultCustomerId: "" })}
          />
          {customers.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              active={form.defaultCustomerId === c.id}
              onPress={() => setForm({ ...form, defaultCustomerId: c.id })}
            />
          ))}
        </View>
        <Field
          label="Notes"
          value={form.notes}
          onChangeText={(notes) => setForm({ ...form, notes })}
        />
        <Button
          label={saving ? "Creating…" : `Create ${form.bagCount || 0} bags`}
          onPress={submit}
          disabled={saving}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.muted, marginBottom: 6, fontSize: 13 },
  row: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
});
