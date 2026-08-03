import { useEffect, useMemo, useState } from "react";
import { Alert, Text, View, StyleSheet, Switch } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiGet, apiPost } from "@/lib/api";
import { TRANSPORT_MODE_LABELS, formatMoney, colors } from "@/lib/theme";
import { Screen, Title, Card, Button, Field, Chip, Loading } from "@/components/ui";

type Bag = {
  id: string;
  bagNumber: string;
  weightKg: number | null;
  shipment: { lotNumber: string };
};

type Party = {
  id: string;
  name: string;
  type: string;
  carryRatePerKg: number | null;
  defaultCurrency: string;
};

export default function NewTransportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ bags?: string }>();
  const preselected = (params.bags || "").split(",").filter(Boolean);

  const [bags, setBags] = useState<Bag[] | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(preselected));
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    mode: "CARRY_PERSON",
    carrierId: "",
    ratePerKg: "",
    totalWeightKg: "",
    currency: "INR",
    syncToLedger: true,
    markInTransit: true,
    notes: "",
  });

  useEffect(() => {
    Promise.all([apiGet<Bag[]>("/api/bags"), apiGet<Party[]>("/api/parties")])
      .then(([b, p]) => {
        setBags(b);
        setParties(p);
      })
      .catch((e) => Alert.alert("Error", e.message));
  }, []);

  const carriers = parties.filter((p) =>
    ["CARRIER", "TRANSPORTER"].includes(p.type)
  );

  const selectedBags = useMemo(
    () => (bags || []).filter((b) => selected.has(b.id)),
    [bags, selected]
  );
  const autoWeight = selectedBags.reduce((s, b) => s + (b.weightKg || 0), 0);
  const weight = form.totalWeightKg ? Number(form.totalWeightKg) : autoWeight;
  const rate = form.ratePerKg ? Number(form.ratePerKg) : 0;
  const payable = weight > 0 && rate > 0 ? weight * rate : 0;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onCarrier(id: string) {
    const c = parties.find((p) => p.id === id);
    setForm((f) => ({
      ...f,
      carrierId: id,
      ratePerKg: c?.carryRatePerKg != null ? String(c.carryRatePerKg) : f.ratePerKg,
      currency: c?.defaultCurrency || f.currency,
    }));
  }

  async function submit() {
    if (selected.size === 0) {
      Alert.alert("Select at least one bag");
      return;
    }
    setSaving(true);
    try {
      const res = await apiPost<{
        synced: boolean;
        suggestedPayable: number | null;
        ledgerEntry: { amount: number; currency: "INR" | "THB" } | null;
      }>("/api/transport", {
        ...form,
        bagIds: Array.from(selected),
        ratePerKg: form.ratePerKg ? Number(form.ratePerKg) : null,
        totalWeightKg: weight || null,
        carrierId: form.carrierId || null,
      });
      if (res.synced && res.ledgerEntry) {
        Alert.alert(
          "Synced to ledger",
          formatMoney(res.ledgerEntry.amount, res.ledgerEntry.currency)
        );
      }
      router.replace("/transport");
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  if (!bags) return <Loading />;

  return (
    <Screen>
      <Title subtitle="Air / sea / land / carry person + optional ledger sync">
        Assign transport
      </Title>

      <Card>
        <Text style={styles.section}>Select bags ({selected.size})</Text>
        {bags.slice(0, 80).map((b) => (
          <Chip
            key={b.id}
            label={`${b.shipment.lotNumber} #${b.bagNumber}${
              b.weightKg != null ? ` ${b.weightKg}kg` : ""
            }`}
            active={selected.has(b.id)}
            onPress={() => toggle(b.id)}
          />
        ))}
        <Text style={styles.meta}>Auto weight: {autoWeight} kg</Text>
      </Card>

      <Card>
        <Text style={styles.section}>Mode</Text>
        <View style={styles.row}>
          {Object.entries(TRANSPORT_MODE_LABELS).map(([k, v]) => (
            <Chip
              key={k}
              label={v}
              active={form.mode === k}
              onPress={() => setForm({ ...form, mode: k })}
            />
          ))}
        </View>

        <Text style={styles.section}>Carrier</Text>
        <View style={styles.row}>
          {carriers.map((c) => (
            <Chip
              key={c.id}
              label={
                c.carryRatePerKg != null
                  ? `${c.name} (₹${c.carryRatePerKg}/kg)`
                  : c.name
              }
              active={form.carrierId === c.id}
              onPress={() => onCarrier(c.id)}
            />
          ))}
        </View>

        <Field
          label="Rate / kg"
          keyboardType="decimal-pad"
          value={form.ratePerKg}
          onChangeText={(ratePerKg) => setForm({ ...form, ratePerKg })}
        />
        <Field
          label="Total weight kg (optional override)"
          keyboardType="decimal-pad"
          value={form.totalWeightKg}
          placeholder={String(autoWeight || "")}
          onChangeText={(totalWeightKg) => setForm({ ...form, totalWeightKg })}
        />

        {payable > 0 ? (
          <Text style={styles.pay}>
            Payable: {formatMoney(payable, form.currency as "INR" | "THB")} ({weight} ×{" "}
            {rate})
          </Text>
        ) : null}

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Sync payment to ledger?</Text>
          <Switch
            value={form.syncToLedger}
            onValueChange={(syncToLedger) => setForm({ ...form, syncToLedger })}
            trackColor={{ true: colors.accent }}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Mark bags in transit</Text>
          <Switch
            value={form.markInTransit}
            onValueChange={(markInTransit) => setForm({ ...form, markInTransit })}
            trackColor={{ true: colors.accent }}
          />
        </View>

        <Field
          label="Notes"
          value={form.notes}
          onChangeText={(notes) => setForm({ ...form, notes })}
        />
        <Button
          label={saving ? "Saving…" : "Assign transport"}
          onPress={submit}
          disabled={saving}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontWeight: "700", color: colors.ink, marginBottom: 8, marginTop: 4 },
  row: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  meta: { color: colors.muted, marginTop: 8, fontSize: 13 },
  pay: {
    backgroundColor: colors.accentSoft,
    color: colors.accentInk,
    padding: 10,
    borderRadius: 10,
    fontWeight: "700",
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  switchLabel: { color: colors.ink, flex: 1, marginRight: 12 },
});
