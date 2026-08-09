import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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

  // -------- JARVIS Aura v3: INR | THB currency toggle --------
  // Placed BEFORE early returns to satisfy the Rules of Hooks. Default
  // to the party's own default currency once loaded; fall back to INR.
  const [selectedCcy, setSelectedCcy] = useState<"INR" | "THB">("INR");
  // Sync to the party's default currency once it loads (first time only).
  const [ccyInitialised, setCcyInitialised] = useState(false);
  useEffect(() => {
    if (!ccyInitialised && party.data?.default_currency) {
      const dc = party.data.default_currency;
      if (dc === "INR" || dc === "THB") setSelectedCcy(dc);
      setCcyInitialised(true);
    }
  }, [ccyInitialised, party.data]);
  const activeTotal = useMemo(
    () => totals.find((t) => t.currency === selectedCcy) || { currency: selectedCcy, debit: 0, credit: 0, balance: 0 },
    [totals, selectedCcy],
  );
  const filteredDisplayRows = useMemo(
    () => displayRows.filter((r) => r.ccy === selectedCcy),
    [displayRows, selectedCcy],
  );

  const Wrapper: React.ComponentType<{ children: React.ReactNode }> = embedded
    ? ({ children }) => <View style={{ flex: 1, backgroundColor: "transparent" }}>{children}</View>
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
            {/* Currency toggle — INR | THB */}
            <View style={styles.ccyToggleRow}>
              {(["INR", "THB"] as const).map((c) => {
                const active = selectedCcy === c;
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setSelectedCcy(c)}
                    style={[styles.ccyTogglePill, active && styles.ccyTogglePillActive]}
                    testID={`ccy-toggle-${c}`}
                  >
                    <Text style={[styles.ccyToggleText, active && styles.ccyToggleTextActive]}>{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryLbl, { color: "#FF4444" }]}>DEBIT</Text>
                <Text style={[styles.summaryVal, { color: "#FF4444" }]} numberOfLines={1} adjustsFontSizeToFit>
                  {fmtCurrency(activeTotal.debit, activeTotal.currency)}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryLbl, { color: "#00FF88" }]}>CREDIT</Text>
                <Text style={[styles.summaryVal, { color: "#00FF88" }]} numberOfLines={1} adjustsFontSizeToFit>
                  {fmtCurrency(activeTotal.credit, activeTotal.currency)}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryLbl, { color: "#FFFFFF" }]}>
                  {activeTotal.balance >= 0 ? "YOU'LL GET" : "YOU'LL GIVE"}
                </Text>
                <Text style={[styles.summaryVal, { color: "#FFFFFF" }]} numberOfLines={1} adjustsFontSizeToFit>
                  {fmtCurrency(Math.abs(activeTotal.balance), activeTotal.currency)}
                </Text>
              </View>
            </View>
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

          {filteredDisplayRows.length === 0 ? (
            <Text style={styles.dim}>No {selectedCcy} transactions in {fyLabel(fy)}</Text>
          ) : (
            filteredDisplayRows.map(({ entry: e, ccy, balanceInr, balanceThb }) => {
              const balForRow = ccy === "THB" ? balanceThb : balanceInr;
              const isVerified = !!p.verified_up_to && e.date <= p.verified_up_to;
              return (
                <StatementRow
                  key={e.id}
                  date={e.date}
                  description={e.description || "—"}
                  refType={e.ref_type}
                  debit={e.debit || 0}
                  credit={e.credit || 0}
                  balance={balForRow}
                  currency={ccy as Currency}
                  verified={isVerified}
                />
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
                          last.balanceInr >= 0 ? styles.glowGreen : styles.glowRed,
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
                          last.balanceThb >= 0 ? styles.glowGreen : styles.glowRed,
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
            style={[styles.actionBtn, { backgroundColor: "#FF4444" }]}
            onPress={() => router.push(`/entry/new?party_id=${p.id}&kind=gave` as never)}
            testID="party-you-gave-btn"
          >
            <Ionicons name="arrow-up-outline" size={16} color="#FFFFFF" />
            <Text style={[styles.actionText, { color: "#FFFFFF" }]}>You gave</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#00FF88" }]}
            onPress={() => router.push(`/entry/new?party_id=${p.id}&kind=got` as never)}
            testID="party-you-got-btn"
          >
            <Ionicons name="arrow-down-outline" size={16} color="#FFFFFF" />
            <Text style={[styles.actionText, { color: "#FFFFFF" }]}>You got</Text>
          </TouchableOpacity>
        </View>
      )}
    </Wrapper>
  );
}

// ---------------------------------------------------------------------------
// StatementRow — compact 44 px passbook row. Debit is red, credit green,
// running balance white. Description truncates at 60 chars; tap the row
// to expand the full text.
// ---------------------------------------------------------------------------
function StatementRow({
  date,
  description,
  refType,
  debit,
  credit,
  balance,
  currency,
  verified,
}: {
  date: string;
  description: string;
  refType?: string | null;
  debit: number;
  credit: number;
  balance: number;
  currency: Currency;
  verified: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const truncated = description.length > 60 ? description.slice(0, 57) + "…" : description;
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => setExpanded((v) => !v)}
      style={styles.stmtRowCompact}
    >
      <View style={{ width: 58 }}>
        <Text style={styles.stmtDate}>{shortDate(date)}</Text>
        {verified ? (
          <Text style={styles.stmtVerifiedInline}>✓</Text>
        ) : null}
      </View>
      <View style={{ flex: 1, marginRight: 6 }}>
        <Text style={styles.stmtDescCompact} numberOfLines={expanded ? 0 : 1}>
          {expanded ? description : truncated}
        </Text>
        {refType && expanded ? (
          <Text style={styles.stmtRef}>{refType.replace("_", " ")}</Text>
        ) : null}
      </View>
      <Text style={[styles.stmtNumCompact, { color: debit > 0 ? "#FF4444" : "rgba(255,255,255,0.30)" }]}>
        {debit > 0 ? fmtCurrency(debit, currency) : "—"}
      </Text>
      <Text style={[styles.stmtNumCompact, { color: credit > 0 ? "#00FF88" : "rgba(255,255,255,0.30)" }]}>
        {credit > 0 ? fmtCurrency(credit, currency) : "—"}
      </Text>
      <Text style={[styles.stmtNumCompact, styles.stmtBalCol, { color: "#FFFFFF" }]}>
        {fmtCurrency(Math.abs(balance), currency)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
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
  // ---- JARVIS Aura v3 — compact 3-card summary + INR/THB toggle ----
  ccyToggleRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  ccyTogglePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.20)",
    backgroundColor: "transparent",
  },
  ccyTogglePillActive: {
    backgroundColor: "#00FF88",
    borderColor: "#00FF88",
  },
  ccyToggleText: {
    color: "rgba(255,255,255,0.60)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  ccyToggleTextActive: { color: "#000000" },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    borderRadius: radii.md,
    padding: 10,
    backgroundColor: "rgba(12,12,30,0.75)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.10)",
    minWidth: 0,
  },
  summaryLbl: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  summaryVal: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 4,
  },
  // ---- Compact 44 px statement row ----
  stmtRowCompact: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 6,
    minHeight: 44,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: 4,
  },
  stmtDate: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  stmtVerifiedInline: {
    color: "#00FF88",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 1,
  },
  stmtDescCompact: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  stmtNumCompact: {
    width: 78,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
  },
  // ---- JARVIS Aura number-glow variants (pure white text, semantic
  //      glow via text-shadow so numbers stay legible on any surface). --
  glowGreen: {
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 255, 136, 0.75)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  glowRed: {
    color: "#FFFFFF",
    textShadowColor: "rgba(255, 107, 138, 0.85)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  glowNeutral: {
    color: "#FFFFFF",
  },
  sectionTitle: {
    color: colors.lime,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    textShadowColor: "rgba(0, 255, 136, 0.45)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
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
