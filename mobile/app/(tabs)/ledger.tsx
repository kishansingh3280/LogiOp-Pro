import { useCallback, useState } from "react";
import { Text, View, StyleSheet, RefreshControl, Alert } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { apiGet } from "@/lib/api";
import {
  PARTY_TYPE_LABELS,
  formatMoney,
  formatBalanceLabel,
  colors,
} from "@/lib/theme";
import { Screen, Title, Card, Loading, Badge, Chip, Money } from "@/components/ui";

type BalanceRow = {
  partyId: string;
  name: string;
  type: string;
  currency: "INR" | "THB";
  balance: number;
  label: string;
  exchangeRate: number | null;
  quoteMode: string;
};

type Summary = {
  balances: BalanceRow[];
  totals: {
    INR: { toReceive: number; toPay: number };
    THB: { toReceive: number; toPay: number };
  };
};

export default function LedgerScreen() {
  const router = useRouter();
  const [data, setData] = useState<Summary | null>(null);
  const [filter, setFilter] = useState<"ALL" | "INR" | "THB">("ALL");

  const load = useCallback(async () => {
    const s = await apiGet<Summary>("/api/ledger/summary");
    setData(s);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().catch((e) => Alert.alert("Error", e.message));
    }, [load])
  );

  if (!data) return <Loading />;

  const rows = data.balances
    .filter((b) => filter === "ALL" || b.currency === filter)
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={load} tintColor={colors.accent} />
      }
    >
      <Title subtitle="Who to pay · who will pay you">Ledger</Title>

      <View style={styles.grid}>
        <Card style={styles.half}>
          <Text style={styles.muted}>Receive INR</Text>
          <Money amount={formatMoney(data.totals.INR.toReceive, "INR")} currency="INR" large />
        </Card>
        <Card style={styles.half}>
          <Text style={styles.muted}>Pay INR</Text>
          <Money amount={formatMoney(data.totals.INR.toPay, "INR")} currency="INR" large />
        </Card>
        <Card style={styles.half}>
          <Text style={styles.muted}>Receive THB</Text>
          <Money amount={formatMoney(data.totals.THB.toReceive, "THB")} currency="THB" large />
        </Card>
        <Card style={styles.half}>
          <Text style={styles.muted}>Pay THB</Text>
          <Money amount={formatMoney(data.totals.THB.toPay, "THB")} currency="THB" large />
        </Card>
      </View>

      <View style={styles.rowWrap}>
        {(["ALL", "INR", "THB"] as const).map((c) => (
          <Chip
            key={c}
            label={c === "ALL" ? "All" : c}
            active={filter === c}
            onPress={() => setFilter(c)}
          />
        ))}
      </View>

      {rows.map((r) => (
        <Card key={`${r.partyId}-${r.currency}`}>
          <View style={styles.header}>
            <Text style={styles.name}>{r.name}</Text>
            <Badge label={r.currency} tone="accent" />
          </View>
          <Text style={styles.meta}>{PARTY_TYPE_LABELS[r.type] || r.type}</Text>
          <Text
            style={{
              marginTop: 6,
              fontWeight: "700",
              color: r.balance > 0 ? colors.ok : r.balance < 0 ? colors.warn : colors.muted,
            }}
          >
            {formatBalanceLabel(r.balance, r.currency)}
          </Text>
          {r.exchangeRate != null ? (
            <Text style={styles.meta}>
              Quoted FX {r.exchangeRate}{" "}
              {r.quoteMode === "INR_PER_THB" ? "₹/฿" : "฿/₹"}
            </Text>
          ) : null}
          <Text
            style={styles.link}
            onPress={() => router.push(`/party/${r.partyId}`)}
          >
            Open khata →
          </Text>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  half: { width: "48%", flexGrow: 1 },
  muted: { color: colors.muted, fontSize: 12, marginBottom: 4 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", marginVertical: 8 },
  header: { flexDirection: "row", justifyContent: "space-between" },
  name: { fontSize: 16, fontWeight: "700", color: colors.ink, flex: 1 },
  meta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  link: { marginTop: 10, color: colors.accent, fontWeight: "700" },
});
