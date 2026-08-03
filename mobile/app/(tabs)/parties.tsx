import { useCallback, useState } from "react";
import { Text, View, StyleSheet, RefreshControl, Alert } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { apiGet, apiPost } from "@/lib/api";
import {
  PARTY_TYPE_LABELS,
  colors,
} from "@/lib/theme";
import {
  Screen,
  Title,
  Card,
  Loading,
  Button,
  Badge,
  Chip,
  Field,
} from "@/components/ui";

type Party = {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  city: string | null;
  exchangeRate: number | null;
  quoteMode: string;
  defaultCurrency: string;
  carryRatePerKg: number | null;
};

export default function PartiesScreen() {
  const router = useRouter();
  const [parties, setParties] = useState<Party[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "LOGISTIC_CUSTOMER",
    phone: "",
    exchangeRate: "",
    quoteMode: "INR_PER_THB",
    defaultCurrency: "INR",
    carryRatePerKg: "",
  });

  const load = useCallback(async () => {
    const data = await apiGet<Party[]>("/api/parties");
    setParties(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().catch((e) => Alert.alert("Error", e.message));
    }, [load])
  );

  const filtered =
    filter === "ALL" ? parties : parties.filter((p) => p.type === filter);

  async function save() {
    if (!form.name.trim()) {
      Alert.alert("Name required");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/api/parties", {
        ...form,
        exchangeRate: form.exchangeRate ? Number(form.exchangeRate) : null,
        carryRatePerKg: form.carryRatePerKg ? Number(form.carryRatePerKg) : null,
      });
      setShowForm(false);
      setForm({
        name: "",
        type: "LOGISTIC_CUSTOMER",
        phone: "",
        exchangeRate: "",
        quoteMode: "INR_PER_THB",
        defaultCurrency: "INR",
        carryRatePerKg: "",
      });
      await load();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  if (!parties.length && !showForm) {
    // still allow empty state after load
  }

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={load} tintColor={colors.accent} />
      }
    >
      <Title subtitle="Customers, carry persons, agents + FX quotes">Parties</Title>
      <Button
        label={showForm ? "Close form" : "Add party"}
        variant={showForm ? "secondary" : "primary"}
        onPress={() => setShowForm((v) => !v)}
      />

      {showForm ? (
        <Card style={{ marginTop: 12 }}>
          <Field
            label="Name"
            value={form.name}
            onChangeText={(name) => setForm({ ...form, name })}
          />
          <Text style={styles.label}>Type</Text>
          <View style={styles.rowWrap}>
            {Object.entries(PARTY_TYPE_LABELS).map(([k, v]) => (
              <Chip
                key={k}
                label={v}
                active={form.type === k}
                onPress={() => setForm({ ...form, type: k })}
              />
            ))}
          </View>
          <Field
            label="Phone"
            value={form.phone}
            onChangeText={(phone) => setForm({ ...form, phone })}
          />
          <Field
            label="Quoted FX rate"
            keyboardType="decimal-pad"
            value={form.exchangeRate}
            onChangeText={(exchangeRate) => setForm({ ...form, exchangeRate })}
          />
          <Field
            label="Transportation charges ₹/kg"
            keyboardType="decimal-pad"
            value={form.carryRatePerKg}
            onChangeText={(carryRatePerKg) => setForm({ ...form, carryRatePerKg })}
          />
          <View style={styles.rowWrap}>
            <Chip
              label="Default INR"
              active={form.defaultCurrency === "INR"}
              onPress={() => setForm({ ...form, defaultCurrency: "INR" })}
            />
            <Chip
              label="Default THB"
              active={form.defaultCurrency === "THB"}
              onPress={() => setForm({ ...form, defaultCurrency: "THB" })}
            />
          </View>
          <Button label={saving ? "Saving…" : "Save party"} onPress={save} disabled={saving} />
        </Card>
      ) : null}

      <View style={[styles.rowWrap, { marginTop: 12 }]}>
        {["ALL", ...Object.keys(PARTY_TYPE_LABELS)].map((t) => (
          <Chip
            key={t}
            label={t === "ALL" ? "All" : PARTY_TYPE_LABELS[t]}
            active={filter === t}
            onPress={() => setFilter(t)}
          />
        ))}
      </View>

      {filtered.map((p) => (
        <Card key={p.id}>
          <View style={styles.header}>
            <Text style={styles.name}>{p.name}</Text>
            <Badge label={PARTY_TYPE_LABELS[p.type] || p.type} tone="accent" />
          </View>
          <Text style={styles.meta}>
            {[p.city, p.phone].filter(Boolean).join(" · ") || "No contact"}
          </Text>
          <Text style={styles.meta}>
            FX:{" "}
            {p.exchangeRate != null
              ? `${p.exchangeRate} ${p.quoteMode === "INR_PER_THB" ? "₹/฿" : "฿/₹"}`
              : "—"}
            {p.carryRatePerKg != null ? ` · Carry ₹${p.carryRatePerKg}/kg` : ""}
          </Text>
          <View style={{ marginTop: 10 }}>
            <Button label="Open khata" onPress={() => router.push(`/party/${p.id}`)} />
          </View>
        </Card>
      ))}

      {filtered.length === 0 ? (
        <Card>
          <Text style={{ color: colors.muted }}>No parties yet. Add one above.</Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowWrap: { flexDirection: "row", flexWrap: "wrap" },
  label: { color: colors.muted, marginBottom: 6, fontSize: 13 },
  header: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  name: { fontSize: 17, fontWeight: "700", color: colors.ink, flex: 1 },
  meta: { marginTop: 4, color: colors.muted, fontSize: 13 },
});
