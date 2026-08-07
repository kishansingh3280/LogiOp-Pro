import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiPut } from "@/src/api/client";
import { useApi } from "@/src/api/hooks";
import type { Currency, Invoice, LedgerEntry, Party, Shipment } from "@/src/api/types";
import { FYPicker } from "@/src/components/fy-picker";
import { toast } from "@/src/components/toast";
import { Card, KV, StatusPill } from "@/src/components/ui";
import { useFY } from "@/src/context/fy-context";
import { colors, radii, spacing } from "@/src/theme";
import { fmtCurrency, shortDate } from "@/src/utils/format";
import { fyLabel, isInFY } from "@/src/utils/fy";

export default function PartyDetail({ idOverride, embedded }: { idOverride?: string; embedded?: boolean } = {}) {
  const params = useLocalSearchParams<{ id: string }>();
  const id = idOverride || params.id;
  const router = useRouter();

  const party = useApi<Party>(id ? `/api/parties/${id}` : null);
  const ledger = useApi<LedgerEntry[]>("/api/ledger/entries");
  const shipments = useApi<Shipment[]>("/api/shipments");
  const invoices = useApi<Invoice[]>("/api/invoices");

  const { fy } = useFY();

  // Statement rows: chronological (oldest → newest) so running balance
  // accumulates the same way a bank statement does. Filtered by the
  // globally selected Financial Year so opening/closing figures match
  // the totals shown on the Ledger dashboard.
  const entries = useMemo(
    () =>
      (ledger.data || [])
        .filter((e) => e.party_id === id && isInFY(e.date, fy))
        .sort((a, b) => (a.date > b.date ? 1 : -1)),
    [ledger.data, id, fy],
  );

  // Attach a running INR + THB balance to each entry — mirrors what a
  // passbook shows. Legacy rows without `currency` are treated as INR.
  const statementRows = useMemo(() => {
    let inr = 0;
    let thb = 0;
    return entries.map((e) => {
      const ccy = (e.currency || "INR").toUpperCase();
      const delta = (e.debit || 0) - (e.credit || 0);
      if (ccy === "THB") thb += delta;
      else inr += delta;
      return { entry: e, ccy, balanceInr: inr, balanceThb: thb };
    });
  }, [entries]);
  // Reverse for display so newest is on top (matches operator's mental
  // model on mobile); the running balance already reflects the same day.
  const displayRows = useMemo(() => [...statementRows].reverse(), [statementRows]);

  // "Mark as Verified" — bumps the party's `verified_up_to` to the newest
  // entry date in the current statement. Every row on or before that date
  // gains a small ✅ badge, and the header shows the reconciled cut-off.
  // Idempotent: subsequent taps just refresh the bookmark.
  const [verifyBusy, setVerifyBusy] = useState(false);
  const onVerify = async () => {
    if (statementRows.length === 0 || !party.data) return;
    const upTo = statementRows[statementRows.length - 1].entry.date;
    setVerifyBusy(true);
    try {
      await apiPut(`/api/parties/${party.data.id}`, { verified_up_to: upTo });
      toast.success(`Verified through ${upTo}`);
      party.refresh();
    } catch (e) {
      Alert.alert("Failed", (e as Error).message);
    } finally {
      setVerifyBusy(false);
    }
  };

  const partyShipments = useMemo(
    () => (shipments.data || []).filter((s) => s.party_id === id || s.carrier_party_id === id).slice(0, 6),
    [shipments.data, id],
  );

  const partyInvoices = useMemo(
    () => (invoices.data || []).filter((i) => i.party_id === id).slice(0, 6),
    [invoices.data, id],
  );

  const totals = useMemo(() => {
    // Aggregate debit/credit per currency. Legacy rows missing `currency` are
    // treated as INR since that's the historical default of the backend.
    const buckets: Record<string, { debit: number; credit: number }> = {};
    for (const e of entries) {
      const c = (e.currency || "INR").toUpperCase();
      if (!buckets[c]) buckets[c] = { debit: 0, credit: 0 };
      buckets[c].debit += e.debit || 0;
      buckets[c].credit += e.credit || 0;
    }
    const rows = Object.entries(buckets).map(([currency, v]) => ({
      currency: currency as Currency,
      debit: v.debit,
      credit: v.credit,
      balance: v.debit - v.credit,
    }));
    // Preferred order: party's default currency first, then INR, then THB.
    const partyDefault = party.data?.default_currency;
    const order = [partyDefault, "INR", "THB"].filter(Boolean) as string[];
    rows.sort((a, b) => {
      const ai = order.indexOf(a.currency); const bi = order.indexOf(b.currency);
      if (ai === bi) return a.currency.localeCompare(b.currency);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return rows;
  }, [entries, party.data]);

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
          <TouchableOpacity
            onPress={() => router.push(`/party/new?editId=${p.id}` as never)}
            style={styles.iconBtn}
            testID="party-edit-btn"
          >
            <Ionicons name="create-outline" size={22} color={colors.lime} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

          <View style={styles.balCurrencies}>
            {totals.length === 0 ? (
              <View style={styles.balCol}>
                <Text style={styles.balLbl}>No entries yet</Text>
                <Text style={styles.balVal}>—</Text>
              </View>
            ) : (
              totals.map((t) => (
                <View key={t.currency} style={styles.balCurRow}>
                  <View style={styles.curTag}>
                    <Text style={styles.curTagText}>{t.currency}</Text>
                  </View>
                  <View style={styles.balCol}>
                    <Text style={styles.balLbl}>Debit</Text>
                    <Text style={styles.balVal}>{fmtCurrency(t.debit, t.currency)}</Text>
                  </View>
                  <View style={styles.balCol}>
                    <Text style={styles.balLbl}>Credit</Text>
                    <Text style={styles.balVal}>{fmtCurrency(t.credit, t.currency)}</Text>
                  </View>
                  <View style={styles.balCol}>
                    <Text style={styles.balLbl}>{t.balance >= 0 ? "You will get" : "You will give"}</Text>
                    <Text
                      style={[
                        styles.balVal,
                        { color: t.balance >= 0 ? colors.ok : colors.danger },
                      ]}
                    >
                      {fmtCurrency(Math.abs(t.balance), t.currency)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </Card>

        <Card style={{ marginTop: spacing.md }}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <KV label="Country" value={p.country} />
          <KV label="Currency" value={p.default_currency} />
          {typeof p.default_charge === "number" && p.default_charge > 0 ? (
            <KV
              label="Default rate"
              value={`${p.default_charge} ${p.default_charge_currency || p.default_currency}/kg`}
            />
          ) : null}
          {p.gstin ? <KV label="GSTIN" value={p.gstin} /> : null}
          {p.email ? <KV label="Email" value={p.email} /> : null}
          {p.address ? <KV label="Address" value={p.address} /> : null}
        </Card>

        <Card style={{ marginTop: spacing.md }}>
          <View style={styles.stmtHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Statement</Text>
              <Text style={styles.stmtSub}>
                {fyLabel(fy)} · running balance
                {p.verified_up_to ? ` · ✅ verified up to ${shortDate(p.verified_up_to)}` : ""}
              </Text>
            </View>
            <FYPicker compact />
          </View>

          {/* Bank-style column headers */}
          <View style={styles.stmtColHead}>
            <Text style={[styles.stmtHeadTxt, { width: 62 }]}>Date</Text>
            <Text style={[styles.stmtHeadTxt, { flex: 1 }]}>Description</Text>
            <Text style={[styles.stmtHeadTxt, styles.stmtNumCol]}>Debit</Text>
            <Text style={[styles.stmtHeadTxt, styles.stmtNumCol]}>Credit</Text>
            <Text style={[styles.stmtHeadTxt, styles.stmtNumCol]}>Balance</Text>
          </View>

          {displayRows.length === 0 ? (
            <Text style={styles.dim}>No transactions in {fyLabel(fy)}</Text>
          ) : (
            displayRows.map(({ entry: e, ccy, balanceInr, balanceThb }) => {
              const balForRow = ccy === "THB" ? balanceThb : balanceInr;
              const isVerified = !!p.verified_up_to && e.date <= p.verified_up_to;
              return (
                <View key={e.id} style={styles.stmtRow}>
                  <View style={{ width: 62 }}>
                    <Text style={styles.stmtCell}>{shortDate(e.date)}</Text>
                    {isVerified ? (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="shield-checkmark" size={9} color={colors.lime} />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stmtDesc} numberOfLines={2}>
                      {e.description || "—"}
                    </Text>
                    <View style={styles.stmtMeta}>
                      <View style={[styles.stmtCcyTag, ccy === "THB" ? styles.stmtCcyThb : styles.stmtCcyInr]}>
                        <Text style={styles.stmtCcyText}>{ccy}</Text>
                      </View>
                      {e.ref_type ? (
                        <Text style={styles.stmtRef}>{e.ref_type.replace("_", " ")}</Text>
                      ) : null}
                    </View>
                  </View>
                  <Text style={[styles.stmtCell, styles.stmtNumCol, { color: (e.debit || 0) > 0 ? colors.ok : colors.textDim }]}>
                    {e.debit ? fmtCurrency(e.debit, ccy as Currency) : "—"}
                  </Text>
                  <Text style={[styles.stmtCell, styles.stmtNumCol, { color: (e.credit || 0) > 0 ? colors.danger : colors.textDim }]}>
                    {e.credit ? fmtCurrency(e.credit, ccy as Currency) : "—"}
                  </Text>
                  <Text
                    style={[
                      styles.stmtCell,
                      styles.stmtNumCol,
                      styles.stmtBalCol,
                      { color: balForRow >= 0 ? colors.text : colors.danger },
                    ]}
                  >
                    {fmtCurrency(Math.abs(balForRow), ccy as Currency)}
                    {balForRow < 0 ? " Cr" : balForRow > 0 ? " Dr" : ""}
                  </Text>
                </View>
              );
            })
          )}

          {/* Closing balances footer */}
          {statementRows.length > 0 ? (
            <View style={styles.stmtFooter}>
              <Text style={styles.stmtFooterLabel}>Closing balance</Text>
              <View style={styles.stmtFooterCcys}>
                {(() => {
                  const last = statementRows[statementRows.length - 1];
                  const chips: React.ReactNode[] = [];
                  if (Math.abs(last.balanceInr) > 0.005) {
                    chips.push(
                      <Text
                        key="inr"
                        style={[
                          styles.stmtFooterVal,
                          { color: last.balanceInr >= 0 ? colors.ok : colors.danger },
                        ]}
                      >
                        {fmtCurrency(Math.abs(last.balanceInr), "INR")}
                        <Text style={styles.stmtFooterTag}>{last.balanceInr >= 0 ? " Dr" : " Cr"}</Text>
                      </Text>,
                    );
                  }
                  if (Math.abs(last.balanceThb) > 0.005) {
                    chips.push(
                      <Text
                        key="thb"
                        style={[
                          styles.stmtFooterVal,
                          { color: last.balanceThb >= 0 ? colors.ok : colors.danger },
                        ]}
                      >
                        {fmtCurrency(Math.abs(last.balanceThb), "THB")}
                        <Text style={styles.stmtFooterTag}>{last.balanceThb >= 0 ? " Dr" : " Cr"}</Text>
                      </Text>,
                    );
                  }
                  return chips.length ? chips : <Text style={styles.dim}>Settled</Text>;
                })()}
              </View>
            </View>
          ) : null}

          {/* Mark-as-Verified action — stamps the newest entry date as the
              new "verified up to" bookmark, so any reconciliation email
              you send today locks the ledger up to this point. */}
          {statementRows.length > 0 ? (
            <TouchableOpacity
              style={[styles.verifyBtn, verifyBusy && { opacity: 0.55 }]}
              onPress={onVerify}
              disabled={verifyBusy}
              testID="mark-verified-btn"
            >
              <Ionicons
                name={p.verified_up_to ? "refresh" : "shield-checkmark-outline"}
                size={14}
                color={colors.bg}
              />
              <Text style={styles.verifyBtnText}>
                {verifyBusy
                  ? "Saving…"
                  : p.verified_up_to
                    ? `Update verified date (through ${shortDate(statementRows[statementRows.length - 1].entry.date)})`
                    : `Mark verified through ${shortDate(statementRows[statementRows.length - 1].entry.date)}`}
              </Text>
            </TouchableOpacity>
          ) : null}
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

      {!embedded && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionGave]}
            onPress={() => router.push(`/entry/new?party_id=${p.id}&kind=gave` as never)}
            testID="party-you-gave-btn"
          >
            <Ionicons name="arrow-up-outline" size={16} color={colors.text} />
            <Text style={styles.actionText}>You gave</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionGot]}
            onPress={() => router.push(`/entry/new?party_id=${p.id}&kind=got` as never)}
            testID="party-you-got-btn"
          >
            <Ionicons name="arrow-down-outline" size={16} color={colors.bg} />
            <Text style={[styles.actionText, { color: colors.bg }]}>You got</Text>
          </TouchableOpacity>
        </View>
      )}
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
  balCurrencies: { marginTop: spacing.md, gap: spacing.sm },
  balCurRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 6,
  },
  curTag: {
    justifyContent: "center", alignItems: "center",
    paddingHorizontal: 8,
    borderRadius: radii.md,
    borderColor: colors.lime, borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.limeGlow,
    minWidth: 40,
  },
  curTagText: { color: colors.lime, fontWeight: "900", fontSize: 11, letterSpacing: 0.8 },
  entryMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  entryCurTag: {
    paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4,
    backgroundColor: colors.chipBg, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth,
  },
  entryCurText: { color: colors.textDim, fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
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

  // ---- Bank-style statement ----
  stmtHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stmtSub: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  stmtColHead: {
    flexDirection: "row",
    marginTop: spacing.md,
    paddingBottom: 6,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  stmtHeadTxt: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  stmtNumCol: { width: 68, textAlign: "right" },
  stmtBalCol: { fontWeight: "800" },
  stmtRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 6,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stmtCell: { color: colors.text, fontSize: 12 },
  stmtDesc: { color: colors.text, fontSize: 13, fontWeight: "600" },
  stmtMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  stmtCcyTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  stmtCcyInr: { backgroundColor: colors.limeGlow, borderColor: colors.lime, borderWidth: StyleSheet.hairlineWidth },
  stmtCcyThb: { backgroundColor: colors.chipBg, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth },
  stmtCcyText: { color: colors.textMuted, fontSize: 9, fontWeight: "800" },
  stmtRef: {
    color: colors.textDim,
    fontSize: 10,
    textTransform: "capitalize",
    fontStyle: "italic",
  },
  stmtFooter: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopColor: colors.lime,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  stmtFooterLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  stmtFooterCcys: { alignItems: "flex-end", gap: 4 },
  stmtFooterVal: { fontSize: 14, fontWeight: "900" },
  stmtFooterTag: { color: colors.textDim, fontSize: 10, fontWeight: "600" },

  // ---- Verification affordances ----
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 3,
  },
  verifiedText: {
    color: colors.lime,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  verifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing.md,
    paddingVertical: 11,
    borderRadius: radii.pill,
    backgroundColor: colors.lime,
  },
  verifyBtnText: { color: colors.bg, fontWeight: "800", fontSize: 13 },
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
  actionBar: {
    flexDirection: "row",
    padding: spacing.md,
    gap: spacing.md,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.surface,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 50,
    borderRadius: radii.md,
  },
  actionGave: { backgroundColor: colors.danger },
  actionGot: { backgroundColor: colors.ok },
  actionText: { color: colors.text, fontSize: 15, fontWeight: "800", letterSpacing: 0.3 },
});
