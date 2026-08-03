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
  fxAmount?: number | null;
  fxCurrency?: "INR" | "THB" | null;
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

type PendingBill = {
  uri: string;
  name: string;
  mimeType?: string;
};

/** Convert using party's quote. Default quoteMode INR_PER_THB = how many ₹ for 1 ฿ */
function convertAmount(
  amount: number,
  from: "INR" | "THB",
  rate: number,
  quoteMode: string
): { to: "INR" | "THB"; value: number } {
  const inrPerThb = quoteMode === "THB_PER_INR" ? (rate === 0 ? 0 : 1 / rate) : rate;
  if (from === "THB") return { to: "INR", value: amount * inrPerThb };
  return { to: "THB", value: inrPerThb === 0 ? 0 : amount / inrPerThb };
}

export default function PartyKhataScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [party, setParty] = useState<Party | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingBill, setPendingBill] = useState<PendingBill | null>(null);
  /** Which currency to post as the main ledger amount when FX is present */
  const [saveAs, setSaveAs] = useState<"INR" | "THB" | null>(null);
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

  const conversion = useMemo(() => {
    const amount = Number(form.amount);
    const rate = Number(form.fxRate);
    if (!amount || !rate || amount <= 0 || rate <= 0) return null;
    const quoteMode = party?.quoteMode || "INR_PER_THB";
    const converted = convertAmount(amount, form.currency, rate, quoteMode);
    return {
      original: { currency: form.currency, amount },
      converted,
    };
  }, [form.amount, form.fxRate, form.currency, party?.quoteMode]);

  // When conversion appears, default saveAs to the entered currency until user picks
  useEffect(() => {
    if (conversion && !saveAs) setSaveAs(form.currency);
    if (!conversion) setSaveAs(null);
  }, [conversion, form.currency, saveAs]);

  async function pickBillForForm() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setPendingBill({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType || undefined,
    });
  }

  async function saveEntry() {
    if (!form.amount) {
      Alert.alert("Amount required");
      return;
    }

    const amountNum = Number(form.amount);
    const rateNum = form.fxRate ? Number(form.fxRate) : null;

    let postAmount = amountNum;
    let postCurrency: "INR" | "THB" = form.currency;
    let fxAmount: number | null = null;
    let fxCurrency: "INR" | "THB" | null = null;

    if (conversion && rateNum) {
      if (!saveAs) {
        Alert.alert(
          "Choose currency",
          "FX rate is set — pick whether to save this entry as THB or INR."
        );
        return;
      }
      if (saveAs === form.currency) {
        postAmount = conversion.original.amount;
        postCurrency = conversion.original.currency;
        fxAmount = conversion.converted.value;
        fxCurrency = conversion.converted.to;
      } else {
        postAmount = conversion.converted.value;
        postCurrency = conversion.converted.to;
        fxAmount = conversion.original.amount;
        fxCurrency = conversion.original.currency;
      }
    }

    setSaving(true);
    try {
      const entry = await apiPost<Entry>("/api/ledger", {
        partyId: id,
        direction: form.direction,
        amount: postAmount,
        currency: postCurrency,
        description: form.description,
        fxRate: rateNum,
        fxAmount,
        fxCurrency,
      });

      if (pendingBill && entry?.id) {
        await uploadAttachment(
          entry.id,
          pendingBill.uri,
          pendingBill.name,
          pendingBill.mimeType
        );
      }

      setShowForm(false);
      setPendingBill(null);
      setSaveAs(null);
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
        onPress={() => {
          setShowForm((v) => !v);
          setPendingBill(null);
          setSaveAs(null);
        }}
      />

      {showForm ? (
        <Card style={{ marginTop: 12 }}>
          <Text style={styles.sectionLabel}>Direction</Text>
          <View style={styles.rowWrap}>
            <Chip
              label="You gave"
              tone="danger"
              active={form.direction === "YOU_GAVE"}
              onPress={() => setForm({ ...form, direction: "YOU_GAVE" })}
            />
            <Chip
              label="You got"
              tone="ok"
              active={form.direction === "YOU_GOT"}
              onPress={() => setForm({ ...form, direction: "YOU_GOT" })}
            />
          </View>

          <Text style={styles.sectionLabel}>Entered currency</Text>
          <View style={styles.rowWrap}>
            <Chip
              label="INR"
              active={form.currency === "INR"}
              onPress={() => {
                setForm({ ...form, currency: "INR" });
                setSaveAs(null);
              }}
            />
            <Chip
              label="THB"
              active={form.currency === "THB"}
              onPress={() => {
                setForm({ ...form, currency: "THB" });
                setSaveAs(null);
              }}
            />
          </View>

          <Field
            label="Amount"
            keyboardType="decimal-pad"
            value={form.amount}
            onChangeText={(amount) => {
              setForm({ ...form, amount });
              setSaveAs(null);
            }}
          />
          <Field
            label="FX rate (₹ per ฿)"
            keyboardType="decimal-pad"
            value={form.fxRate}
            onChangeText={(fxRate) => {
              setForm({ ...form, fxRate });
              setSaveAs(null);
            }}
          />

          {conversion ? (
            <View style={styles.fxBox}>
              <Text style={styles.fxTitle}>Auto converted</Text>
              <Text style={styles.fxLine}>
                {formatMoney(conversion.original.amount, conversion.original.currency)}{" "}
                @ {form.fxRate} ={" "}
                {formatMoney(conversion.converted.value, conversion.converted.to)}
              </Text>
              <Text style={styles.fxAsk}>
                Save this entry as THB or INR?
              </Text>
              <View style={styles.rowWrap}>
                <Chip
                  label={`As ${conversion.original.currency} (${formatMoney(
                    conversion.original.amount,
                    conversion.original.currency
                  )})`}
                  active={saveAs === conversion.original.currency}
                  onPress={() => setSaveAs(conversion.original.currency)}
                />
                <Chip
                  label={`As ${conversion.converted.to} (${formatMoney(
                    conversion.converted.value,
                    conversion.converted.to
                  )})`}
                  active={saveAs === conversion.converted.to}
                  onPress={() => setSaveAs(conversion.converted.to)}
                />
              </View>
            </View>
          ) : null}

          <Field
            label="Description"
            value={form.description}
            onChangeText={(description) => setForm({ ...form, description })}
          />

          <View style={styles.billBlock}>
            <Button
              label={pendingBill ? "Change bill" : "Attach bill"}
              variant="secondary"
              onPress={pickBillForForm}
            />
            {pendingBill ? (
              <Text style={styles.billName}>📎 {pendingBill.name}</Text>
            ) : (
              <Text style={styles.meta}>Optional — attach before saving</Text>
            )}
          </View>

          <Button
            label={saving ? "Saving…" : "Save"}
            onPress={saveEntry}
            disabled={saving}
          />
        </Card>
      ) : null}

      {entries.map((e) => (
        <Card key={e.id} style={{ marginTop: 10 }}>
          <View style={styles.header}>
            <Badge
              label={e.direction === "YOU_GAVE" ? "You gave" : "You got"}
              tone={e.direction === "YOU_GAVE" ? "danger" : "ok"}
            />
            <Money amount={formatMoney(e.amount, e.currency)} currency={e.currency} />
          </View>
          <Text style={styles.meta}>
            {format(new Date(e.entryDate), "dd MMM yyyy")}
            {e.isAutoSynced ? " · Auto-synced" : ""}
          </Text>
          {e.description ? <Text style={styles.desc}>{e.description}</Text> : null}
          {e.fxRate != null ? (
            <Text style={styles.meta}>
              FX {e.fxRate}
              {e.fxAmount != null && e.fxCurrency
                ? ` · ≈ ${formatMoney(e.fxAmount, e.fxCurrency)}`
                : ""}
            </Text>
          ) : null}
          {e.attachments.map((a) => (
            <Text key={a.id} style={styles.meta}>
              📎 {a.fileName}
            </Text>
          ))}
          <View style={styles.actions}>
            <Button label="Add another bill" variant="secondary" onPress={() => attachBill(e.id)} />
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
  sectionLabel: { color: colors.muted, fontSize: 13, marginBottom: 6, marginTop: 4 },
  fxBox: {
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  fxTitle: { fontWeight: "700", color: colors.accentInk, marginBottom: 4 },
  fxLine: { color: colors.ink, fontWeight: "600", marginBottom: 8 },
  fxAsk: { color: colors.accentInk, fontSize: 13, marginBottom: 8 },
  billBlock: { marginBottom: 12, gap: 6 },
  billName: { color: colors.accentInk, fontWeight: "600", marginTop: 4 },
});
