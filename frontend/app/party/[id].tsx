import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useApi } from "@/src/api/hooks";
import type { Invoice, LedgerEntry, Party, Shipment } from "@/src/api/types";
import { Card, KV, StatusPill } from "@/src/components/ui";
import { colors, radii, spacing } from "@/src/theme";
import { fmtCurrency, shortDate } from "@/src/utils/format";

export default function PartyDetail({ idOverride, embedded }: { idOverride?: string; embedded?: boolean } = {}) {
  const params = useLocalSearchParams<{ id: string }>();
  const id = idOverride || params.id;
  const router = useRouter();

  const party = useApi<Party>(id ? `/api/parties/${id}` : null);
  const ledger = useApi<LedgerEntry[]>("/api/ledger/entries");
  const shipments = useApi<Shipment[]>("/api/shipments");
  const invoices = useApi<Invoice[]>("/api/invoices");

  const entries = useMemo(
    () =>
      (ledger.data || [])
        .filter((e) => e.party_id === id)
        .sort((a, b) => (a.date > b.date ? -1 : 1)),
    [ledger.data, id],
  );

  const partyShipments = useMemo(
    () => (shipments.data || []).filter((s) => s.party_id === id || s.carrier_party_id === id).slice(0, 6),
    [shipments.data, id],
  );

  const partyInvoices = useMemo(
    () => (invoices.data || []).filter((i) => i.party_id === id).slice(0, 6),
    [invoices.data, id],
  );

  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const e of entries) {
      debit += e.debit || 0;
      credit += e.credit || 0;
    }
    return { debit, credit, balance: debit - credit };
  }, [entries]);

  const Wrapper: React.ComponentType<{ children: React.ReactNode }> = embedded
    ? ({ children }) => <View style={{ flex: 1, backgroundColor: colors.bg }}>{children}</View>
    : ({ children }) => (
        <SafeAreaView edges={["top"]} style={styles.safe}>
          {children}
        </SafeAreaView>
      );

  if (party.loading && !party.data) {
    return (
      <Wrapper>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.lime} />
        </View>
      </Wrapper>
    );
  }
  if (!party.data) {
    return (
      <Wrapper>
        <View style={styles.loading}>
          <Text style={styles.dim}>Party not found</Text>
        </View>
      </Wrapper>
    );
  }

  const p = party.data;
  const cur = p.default_currency;

  return (
    <Wrapper>
      {!embedded && (
        <View style={styles.headBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headTitle} numberOfLines={1}>
            {p.name}
          </Text>
          <View style={styles.iconBtn} />
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <View style={styles.headerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(p.name || "?").slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{p.name}</Text>
              <Text style={styles.meta}>{p.role} · {p.country} · {p.default_currency}</Text>
              {p.phone ? <Text style={styles.meta}>{p.phone}</Text> : null}
            </View>
          </View>

          <View style={styles.balBox}>
            <View style={styles.balCol}>
              <Text style={styles.balLbl}>Debit</Text>
              <Text style={styles.balVal}>{fmtCurrency(totals.debit, cur)}</Text>
            </View>
            <View style={styles.balCol}>
              <Text style={styles.balLbl}>Credit</Text>
              <Text style={styles.balVal}>{fmtCurrency(totals.credit, cur)}</Text>
            </View>
            <View style={styles.balCol}>
              <Text style={styles.balLbl}>{totals.balance >= 0 ? "You will get" : "You will give"}</Text>
              <Text
                style={[
                  styles.balVal,
                  { color: totals.balance >= 0 ? colors.ok : colors.danger },
                ]}
              >
                {fmtCurrency(Math.abs(totals.balance), cur)}
              </Text>
            </View>
          </View>
        </Card>

        <Card style={{ marginTop: spacing.md }}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <KV label="Country" value={p.country} />
          <KV label="Currency" value={p.default_currency} />
          {p.gstin ? <KV label="GSTIN" value={p.gstin} /> : null}
          {p.email ? <KV label="Email" value={p.email} /> : null}
          {p.address ? <KV label="Address" value={p.address} /> : null}
        </Card>

        <Card style={{ marginTop: spacing.md }}>
          <Text style={styles.sectionTitle}>Ledger statement</Text>
          {entries.length === 0 ? (
            <Text style={styles.dim}>No ledger entries yet</Text>
          ) : (
            entries.map((e) => (
              <View key={e.id} style={styles.entryRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryDesc} numberOfLines={1}>
                    {e.description}
                  </Text>
                  <Text style={styles.entryDate}>{shortDate(e.date)}</Text>
                </View>
                <Text
                  style={[
                    styles.entryAmt,
                    { color: e.debit > 0 ? colors.ok : colors.danger },
                  ]}
                >
                  {e.debit > 0 ? `+${fmtCurrency(e.debit, cur)}` : `-${fmtCurrency(e.credit, cur)}`}
                </Text>
              </View>
            ))
          )}
        </Card>

        {partyShipments.length > 0 && (
          <Card style={{ marginTop: spacing.md }}>
            <Text style={styles.sectionTitle}>Shipments</Text>
            {partyShipments.map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => router.push(`/shipment/${s.id}` as never)}
                style={styles.linkRow}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.linkTitle}>{s.consignment_no}</Text>
                  <Text style={styles.linkSub}>
                    {s.origin || "?"} → {s.destination || "?"} · {s.weight_kg} kg
                  </Text>
                </View>
                <StatusPill status={s.status} />
              </TouchableOpacity>
            ))}
          </Card>
        )}

        {partyInvoices.length > 0 && (
          <Card style={{ marginTop: spacing.md }}>
            <Text style={styles.sectionTitle}>Invoices</Text>
            {partyInvoices.map((inv) => (
              <TouchableOpacity
                key={inv.id}
                onPress={() => router.push(`/invoice/${inv.id}` as never)}
                style={styles.linkRow}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.linkTitle}>{inv.number}</Text>
                  <Text style={styles.linkSub}>
                    {shortDate(inv.date)} · {fmtCurrency(inv.total, inv.currency)}
                  </Text>
                </View>
                <StatusPill status={inv.status} />
              </TouchableOpacity>
            ))}
          </Card>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  iconBtn: { padding: 8, width: 36 },
  headTitle: { flex: 1, color: colors.text, fontSize: 17, fontWeight: "800", textAlign: "center" },
  content: { padding: spacing.lg },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  dim: { color: colors.textDim, textAlign: "center", padding: spacing.md },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.limeGlow,
    borderWidth: 1,
    borderColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.lime, fontWeight: "800", fontSize: 22 },
  name: { color: colors.text, fontSize: 20, fontWeight: "800" },
  meta: { color: colors.textMuted, fontSize: 12, textTransform: "capitalize", marginTop: 2 },
  balBox: {
    flexDirection: "row",
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  balCol: {
    flex: 1,
    backgroundColor: colors.chipBg,
    borderRadius: radii.md,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    alignItems: "center",
  },
  balLbl: { color: colors.textDim, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  balVal: { color: colors.text, fontSize: 16, fontWeight: "800", marginTop: 6 },
  sectionTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  entryDesc: { color: colors.text, fontSize: 14 },
  entryDate: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  entryAmt: { fontSize: 14, fontWeight: "800", marginLeft: spacing.md },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  linkTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  linkSub: { color: colors.textDim, fontSize: 12, marginTop: 2 },
});
