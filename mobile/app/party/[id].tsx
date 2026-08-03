import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  Alert,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { format } from "date-fns";
import { apiGet, apiPost, apiDelete, uploadAttachment } from "@/lib/api";
import {
  PARTY_TYPE_LABELS,
  formatMoney,
  formatBalanceLabel,
  colors,
} from "@/lib/theme";
import {
  Screen,
  Card,
  Loading,
  Button,
  Badge,
  Field,
  Chip,
  Money,
} from "@/components/ui";

type Entry = {
  id: string;
  direction: "YOU_GAVE" | "YOU_GOT";
  amount: number;
  currency: "INR" | "THB";
  description: string | null;
  entryDate: string;
  fxRate: number | null;
  isAutoSynced: boolean;
  attachments: Array<{ id: string; fileName: string; filePath: string }>;
};

type Party = {
  id: string;
  name: string;
  type: string;
  exchangeRate: number | null;
  quoteMode: string;
  defaultCurrency: "INR" | "THB";
  ledgerEntries: Entry[];
};

export default function PartyKhataScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [party, setParty] = useState<Party | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    direction: "YOU_GAVE" as "YOU_GAVE" | "YOU_GOT",
    amount: "",
    currency: "INR" as "INR" | "THB",
    description: "",
    fxRate: "",
  });

  const load = useCallback(async () => {
    const p = await apiGet<Party>(`/api/parties/${id}`);
    setParty(p);
    setForm((f) => ({
      ...f,
      currency: p.defaultCurrency || "INR",
      fxRate: p.exchangeRate != null ? String(p.exchangeRate) : f.fxRate,
    }));
  }, [id]);

  useEffect(() => {
    load().catch((e) => Alert.alert("Error", e.message));
  }, [load]);

  const balances = useMemo(() => {
    const map = {
      INR: { gave: 0, got: 0 },
      THB: { gave: 0, got: 0 },
    };
    for (const e of party?.ledgerEntries || []) {
      if (e.direction === "YOU_GAVE") map[e.currency].gave += e.amount;
      else map[e.currency].got += e.amount;
    }
    return map;
  }, [party]);

  async function saveEntry() {
    if (!form.amount) {
      Alert.alert("Amount required");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/api/ledger", {
        partyId: id,
        direction: form.direction,
        amount: Number(form.amount),
        currency: form.currency,
        description: form.description,
        fxRate: form.fxRate ? Number(form.fxRate) : null,
      });
      setShowForm(false);
      setForm((f) => ({ ...f, amount: "", description: "" }));
      await load();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function attachBill(entryId: string) {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    try {
      await uploadAttachment(
        entryId,
        asset.uri,
        asset.name,
        asset.mimeType || undefined
      );
      await load();
      Alert.alert("Attached", asset.name);
    } catch (e) {
      Alert.alert("Upload failed", e instanceof Error ? e.message : "Error");
    }
  }

  async function removeEntry(entryId: string) {
    Alert.alert("Delete entry?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await apiDelete(`/api/ledger/${entryId}`);
          await load();
        },
      },
    ]);
  }

  if (!party) return <Loading />;

  const entries = [...(party.ledgerEntries || [])].sort(
    (a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
  );

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={load} tintColor={colors.accent} />
      }
    >
      <Text style={styles.name}>{party.name}</Text>
      <Text style={styles.meta}>
        {PARTY_TYPE_LABELS[party.type] || party.type}
        {party.exchangeRate != null
          ? ` · FX ${party.exchangeRate} ${
              party.quoteMode === "INR_PER_THB" ? "₹/฿" : "฿/₹"
            }`
          : ""}
      </Text>

      <View style={styles.grid}>
        {(["INR", "THB"] as const).map((c) => {
          const bal = balances[c].gave - balances[c].got;
          return (
            <Card key={c} style={styles.half}>
              <Text style={styles.meta}>{c}</Text>
              <Text
                style={{
                  fontWeight: "700",
                  color: bal > 0 ? colors.ok : bal < 0 ? colors.warn : colors.muted,
                }}
              >
                {formatBalanceLabel(bal, c)}
              </Text>
            </Card>
          );
        })}
      </View>

      <Button
        label={showForm ? "Close" : "Add entry"}
        variant={showForm ? "secondary" : "primary"}
        onPress={() => setShowForm((v) => !v)}
      />

      {showForm ? (
        <Card style={{ marginTop: 12 }}>
          <View style={styles.rowWrap}>
            <Chip
              label="You gave"
              active={form.direction === "YOU_GAVE"}
              onPress={() => setForm({ ...form, direction: "YOU_GAVE" })}
            />
            <Chip
              label="You got"
              active={form.direction === "YOU_GOT"}
              onPress={() => setForm({ ...form, direction: "YOU_GOT" })}
            />
            <Chip
              label="INR"
              active={form.currency === "INR"}
              onPress={() => setForm({ ...form, currency: "INR" })}
            />
            <Chip
              label="THB"
              active={form.currency === "THB"}
              onPress={() => setForm({ ...form, currency: "THB" })}
            />
          </View>
          <Field
            label="Amount"
            keyboardType="decimal-pad"
            value={form.amount}
            onChangeText={(amount) => setForm({ ...form, amount })}
          />
          <Field
            label="FX rate"
            keyboardType="decimal-pad"
            value={form.fxRate}
            onChangeText={(fxRate) => setForm({ ...form, fxRate })}
          />
          <Field
            label="Description"
            value={form.description}
            onChangeText={(description) => setForm({ ...form, description })}
          />
          <Button label={saving ? "Saving…" : "Save"} onPress={saveEntry} disabled={saving} />
        </Card>
      ) : null}

      {entries.map((e) => (
        <Card key={e.id} style={{ marginTop: 10 }}>
          <View style={styles.header}>
            <Badge
              label={e.direction === "YOU_GAVE" ? "You gave" : "You got"}
              tone={e.direction === "YOU_GAVE" ? "ok" : "warn"}
            />
            <Money amount={formatMoney(e.amount, e.currency)} currency={e.currency} />
          </View>
          <Text style={styles.meta}>
            {format(new Date(e.entryDate), "dd MMM yyyy")}
            {e.isAutoSynced ? " · Auto-synced" : ""}
          </Text>
          {e.description ? <Text style={styles.desc}>{e.description}</Text> : null}
          {e.fxRate != null ? <Text style={styles.meta}>FX {e.fxRate}</Text> : null}
          {e.attachments.map((a) => (
            <Text key={a.id} style={styles.meta}>
              📎 {a.fileName}
            </Text>
          ))}
          <View style={styles.actions}>
            <Button label="Attach bill" variant="secondary" onPress={() => attachBill(e.id)} />
            <Button label="Delete" variant="danger" onPress={() => removeEntry(e.id)} />
          </View>
        </Card>
      ))}

      {entries.length === 0 ? (
        <Card style={{ marginTop: 10 }}>
          <Text style={{ color: colors.muted }}>No entries yet.</Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 24, fontWeight: "700", color: colors.ink },
  meta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  desc: { marginTop: 6, color: colors.ink },
  grid: { flexDirection: "row", gap: 8, marginVertical: 12 },
  half: { flex: 1 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  actions: { gap: 8, marginTop: 10 },
});
