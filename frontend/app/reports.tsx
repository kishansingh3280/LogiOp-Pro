// Reports console — central hub for PDF exports.
// Three sections: Invoices · Packing Lists · Bullion History. Each is
// filtered by the currently-active Indian Financial Year (via FYContext)
// so the operator never accidentally exports last year's numbers.

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useApi } from "@/src/api/hooks";
import type { Invoice, Party, Shipment, ShipmentBag } from "@/src/api/types";
import { useTxns } from "@/src/bullion/store";
import type { BullionTxn } from "@/src/bullion/types";
import { FYPicker } from "@/src/components/fy-picker";
import { toast } from "@/src/components/toast";
import { useFY } from "@/src/context/fy-context";
import { colors, radii, spacing } from "@/src/theme";
import { fyBounds, fyLabel as fyLabelFn } from "@/src/utils/fy";
import { shortDate } from "@/src/utils/format";
import { esc, fmtMoney, renderPdf, sharePdf, wrapPdf } from "@/src/utils/pdf";

type ReportKind = "invoice" | "packing" | "bullion";

export default function ReportsConsole() {
  const router = useRouter();
  const { fy } = useFY();
  const { start: fyStartDate, end: fyEndDate } = fyBounds(fy);
  const fyStart = fyStartDate.toISOString().slice(0, 10);
  const fyEnd = fyEndDate.toISOString().slice(0, 10);
  const fyLabel = fyLabelFn(fy);

  const invoices = useApi<Invoice[]>("/api/invoices");
  const shipments = useApi<Shipment[]>("/api/shipments");
  const parties = useApi<Party[]>("/api/parties");
  const txns = useTxns();

  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<ReportKind>("invoice");

  const partyById = useMemo(() => {
    const m: Record<string, Party> = {};
    (parties.data || []).forEach((p) => { m[p.id] = p; });
    return m;
  }, [parties.data]);

  // Apply FY filter to each source dataset.
  const fyInvoices = useMemo(
    () => (invoices.data || []).filter((i) => {
      const d = i.date || "";
      return d >= fyStart && d <= fyEnd;
    }),
    [invoices.data, fyStart, fyEnd],
  );
  const fyShipments = useMemo(
    () => (shipments.data || []).filter((s) => {
      const d = (s as { dispatch_date?: string; date?: string }).dispatch_date
        || (s as { date?: string }).date
        || "";
      return d >= fyStart && d <= fyEnd;
    }),
    [shipments.data, fyStart, fyEnd],
  );
  const fyTxns = useMemo(
    () => txns.data.filter((t) => {
      const d = (t.created_at || "").slice(0, 10);
      return d >= fyStart && d <= fyEnd;
    }),
    [txns.data, fyStart, fyEnd],
  );

  const onRefresh = () => {
    invoices.refresh();
    shipments.refresh();
    parties.refresh();
    txns.refresh();
  };

  const runInvoicePdf = async (inv: Invoice) => {
    setBusy(inv.id);
    try {
      const party = partyById[inv.party_id || ""];
      const html = renderInvoiceHtml(inv, party);
      const uri = await renderPdf(html);
      await sharePdf(uri, `${inv.number}.pdf`);
      toast.success(`PDF ready for ${inv.number}`);
    } catch (e) {
      toast.error(`Export failed: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const runPackingListPdf = async (ship: Shipment) => {
    setBusy(ship.id);
    try {
      // Backend keeps bags on a nested path — fetch just-in-time so the
      // list view stays lightweight.
      const bagsRes = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/shipments/${ship.id}/bags`,
      );
      const bags = (await bagsRes.json()) as ShipmentBag[];
      const party = partyById[(ship as { party_id?: string }).party_id || ""];
      const html = renderPackingListHtml(ship, bags, party);
      const uri = await renderPdf(html);
      await sharePdf(uri, `packing-${ship.consignment_no}.pdf`);
      toast.success(`Packing list ready for ${ship.consignment_no}`);
    } catch (e) {
      toast.error(`Export failed: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const runBullionHistoryPdf = async () => {
    setBusy("bullion");
    try {
      const html = renderBullionHistoryHtml(fyTxns, fyLabel);
      const uri = await renderPdf(html);
      await sharePdf(uri, `bullion-history-${fyLabel.replace(/\s+/g, "-")}.pdf`);
      toast.success("Bullion history PDF ready");
    } catch (e) {
      toast.error(`Export failed: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.headBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headTitle}>Reports</Text>
        <View style={{ width: 32 }} />
      </View>
      <View style={styles.fyRow}>
        <FYPicker earliest="2024-04-01" />
      </View>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        <TabBtn label="Invoices" count={fyInvoices.length} active={tab === "invoice"} onPress={() => setTab("invoice")} testID="tab-invoices" />
        <TabBtn label="Packing" count={fyShipments.length} active={tab === "packing"} onPress={() => setTab("packing")} testID="tab-packing" />
        <TabBtn label="Bullion" count={fyTxns.length} active={tab === "bullion"} onPress={() => setTab("bullion")} testID="tab-bullion" />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={invoices.loading} onRefresh={onRefresh} tintColor={colors.lime} />}
      >
        {tab === "invoice" ? (
          fyInvoices.length === 0 ? (
            <EmptyState hint="No invoices in this FY yet." />
          ) : (
            fyInvoices.map((inv) => (
              <ReportRow
                key={inv.id}
                title={inv.number}
                subtitle={`${partyById[inv.party_id || ""]?.name || "—"} · ${shortDate(inv.date)}`}
                aside={fmtMoney(inv.total, inv.currency)}
                busy={busy === inv.id}
                testID={`export-invoice-${inv.id}`}
                onPress={() => runInvoicePdf(inv)}
              />
            ))
          )
        ) : tab === "packing" ? (
          fyShipments.length === 0 ? (
            <EmptyState hint="No shipments in this FY yet." />
          ) : (
            fyShipments.map((s) => (
              <ReportRow
                key={s.id}
                title={s.consignment_no}
                subtitle={`${(s as { origin?: string }).origin || "?"} → ${(s as { destination?: string }).destination || "?"} · ${shortDate((s as { dispatch_date?: string; date?: string }).dispatch_date || (s as { date?: string }).date || "")}`}
                aside={`${Number((s as { weight_kg?: number }).weight_kg || 0).toFixed(1)} kg`}
                busy={busy === s.id}
                testID={`export-packing-${s.id}`}
                onPress={() => runPackingListPdf(s)}
              />
            ))
          )
        ) : (
          <>
            <TouchableOpacity
              style={styles.bullionAll}
              onPress={runBullionHistoryPdf}
              disabled={busy === "bullion"}
              testID="export-bullion-history"
            >
              {busy === "bullion" ? (
                <ActivityIndicator size="small" color={colors.bg} />
              ) : (
                <>
                  <Ionicons name="download-outline" size={16} color={colors.bg} />
                  <Text style={styles.bullionAllText}>
                    Download bullion history — {fyLabel}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={styles.bullionMeta}>
              {fyTxns.length} transaction{fyTxns.length === 1 ? "" : "s"} · rate-locked at
              creation · EXIF stripped
            </Text>
            <View style={{ height: spacing.md }} />
            {fyTxns.slice(0, 30).map((t) => (
              <View key={t.id} style={styles.miniRow}>
                <Text style={styles.miniRowLbl}>{t.txn_no || t.id.slice(0, 8)}</Text>
                <Text style={styles.miniRowMeta} numberOfLines={1}>
                  {t.type === "gold"
                    ? `${t.gold_amount || 0} ${t.gold_unit || "baht"} gold`
                    : `${(t.currency_amount || 0).toLocaleString()} ${t.currency || "USD"}`}
                </Text>
                <Text style={styles.miniRowDate}>{(t.created_at || "").slice(0, 10)}</Text>
              </View>
            ))}
            {fyTxns.length > 30 ? (
              <Text style={styles.dim}>+{fyTxns.length - 30} more in the PDF</Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TabBtn({ label, count, active, onPress, testID }: { label: string; count: number; active: boolean; onPress: () => void; testID: string }) {
  return (
    <TouchableOpacity
      style={[styles.tab, active && styles.tabActive]}
      onPress={onPress}
      testID={testID}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label} · {count}
      </Text>
    </TouchableOpacity>
  );
}

function ReportRow({
  title, subtitle, aside, busy, onPress, testID,
}: {
  title: string; subtitle: string; aside: string; busy: boolean; onPress: () => void; testID: string;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={busy} testID={testID}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Text style={styles.rowAside}>{aside}</Text>
      {busy ? (
        <ActivityIndicator color={colors.lime} style={{ marginLeft: 8 }} />
      ) : (
        <Ionicons name="download-outline" size={18} color={colors.lime} style={{ marginLeft: 8 }} />
      )}
    </TouchableOpacity>
  );
}

function EmptyState({ hint }: { hint: string }) {
  return (
    <View style={styles.emptyBox}>
      <Ionicons name="document-outline" size={40} color={colors.textDim} />
      <Text style={styles.emptyHint}>{hint}</Text>
    </View>
  );
}

// ---------- HTML renderers -----------------------------------------------

function renderInvoiceHtml(inv: Invoice, party?: Party): string {
  const rows = (inv.items || []).map((it) => `
    <tr>
      <td>${esc(it.description)}</td>
      <td class="num">${esc(String(it.quantity || 0))} ${esc(it.unit || "")}</td>
      <td class="num">${fmtMoney(it.rate || 0, inv.currency)}</td>
      <td class="num">${fmtMoney((Number(it.quantity) || 0) * (Number(it.rate) || 0), inv.currency)}</td>
    </tr>
  `).join("");
  const body = `
    <h2>Bill To</h2>
    <div class="kv"><span class="k">Client</span><span class="v">${esc(party?.name || "-")}</span></div>
    ${party?.address ? `<div class="kv"><span class="k">Address</span><span class="v">${esc(party.address)}</span></div>` : ""}
    ${party?.phone ? `<div class="kv"><span class="k">Phone</span><span class="v">${esc(party.phone)}</span></div>` : ""}
    <div class="kv"><span class="k">Invoice date</span><span class="v">${esc(shortDate(inv.date))}</span></div>
    ${inv.due_date ? `<div class="kv"><span class="k">Due</span><span class="v">${esc(shortDate(inv.due_date))}</span></div>` : ""}
    <div class="kv"><span class="k">Status</span><span class="v"><span class="badge">${esc(inv.status || "draft")}</span></span></div>

    <h2>Line items</h2>
    <table>
      <thead>
        <tr><th>Description</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="4" class="muted">No line items</td></tr>`}</tbody>
      <tfoot>
        <tr><td colspan="3" class="num">Subtotal</td><td class="num">${fmtMoney(inv.subtotal || 0, inv.currency)}</td></tr>
        ${inv.tax_percent ? `<tr><td colspan="3" class="num">Tax (${esc(String(inv.tax_percent))}%)</td><td class="num">${fmtMoney(inv.tax_amount || 0, inv.currency)}</td></tr>` : ""}
        <tr><td colspan="3" class="num lime">TOTAL</td><td class="num lime">${fmtMoney(inv.total || 0, inv.currency)}</td></tr>
      </tfoot>
    </table>
    ${inv.notes ? `<h2>Notes</h2><div class="muted">${esc(inv.notes)}</div>` : ""}
  `;
  return wrapPdf(`Invoice ${inv.number}`, body, esc(party?.name || ""));
}

function renderPackingListHtml(ship: Shipment, bags: ShipmentBag[], party?: Party): string {
  const rows = bags.map((b, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${esc(b.bag_no)}</td>
      <td class="num">${esc(String(b.weight_kg || 0))} kg</td>
      <td>${esc((b.items || []).map((it) => `${it.quantity || ""} ${it.unit || ""} ${it.name}`.trim()).join(", ") || "—")}</td>
    </tr>
  `).join("");
  const s = ship as Record<string, unknown>;
  const body = `
    <h2>Shipment</h2>
    <div class="kv"><span class="k">Consignment</span><span class="v">${esc(ship.consignment_no)}</span></div>
    <div class="kv"><span class="k">Route</span><span class="v">${esc(String(s.origin || "?"))} → ${esc(String(s.destination || "?"))}</span></div>
    <div class="kv"><span class="k">Date</span><span class="v">${esc(shortDate(String(s.dispatch_date || s.date || "")))}</span></div>
    <div class="kv"><span class="k">Bill to</span><span class="v">${esc(party?.name || "-")}</span></div>
    <div class="kv"><span class="k">Status</span><span class="v"><span class="badge">${esc(String(s.status || "pending"))}</span></span></div>

    <h2>Bags (${bags.length})</h2>
    <table>
      <thead><tr><th>#</th><th>Bag</th><th class="num">Weight</th><th>Contents</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="4" class="muted">No bags</td></tr>`}</tbody>
      <tfoot>
        <tr><td colspan="2" class="num">Total weight</td><td class="num">${bags.reduce((sum, b) => sum + (Number(b.weight_kg) || 0), 0).toFixed(1)} kg</td><td></td></tr>
      </tfoot>
    </table>
  `;
  return wrapPdf(`Packing list · ${ship.consignment_no}`, body, party?.name || "");
}

function renderBullionHistoryHtml(txns: BullionTxn[], fyLabel: string): string {
  const rows = txns.map((t) => {
    const type = t.type === "gold"
      ? `${t.gold_amount || 0} ${t.gold_unit || "baht"} gold`
      : `${(t.currency_amount || 0).toLocaleString()} ${t.currency || "USD"}`;
    const location = t.location || (t.trip_id ? "in_transit" : (t.type === "gold" ? "vault_th" : "vault_in"));
    return `
      <tr>
        <td>${esc(t.txn_no || t.id.slice(0, 8))}</td>
        <td>${esc((t.created_at || "").slice(0, 10))}</td>
        <td>${esc(t.type)}</td>
        <td>${esc(type)}</td>
        <td>${esc(location)}</td>
        <td>${esc(t.status || "open")}</td>
      </tr>
    `;
  }).join("");
  const body = `
    <h2>Financial Year · ${esc(fyLabel)}</h2>
    <div class="muted">${txns.length} transaction${txns.length === 1 ? "" : "s"} in this window · rate snapshots preserve historical accuracy.</div>
    <h2>Transactions</h2>
    <table>
      <thead><tr><th>TXN</th><th>Date</th><th>Type</th><th>Amount</th><th>Location</th><th>Status</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="6" class="muted">No records</td></tr>`}</tbody>
    </table>
  `;
  return wrapPdf(`Bullion history · ${fyLabel}`, body);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  headBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  iconBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  fyRow: {
    paddingHorizontal: spacing.md,
    marginTop: 4,
    marginBottom: spacing.sm,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  tabRow: {
    flexDirection: "row",
    gap: 6,
    padding: 4,
    marginHorizontal: spacing.md,
    borderRadius: 999,
    backgroundColor: colors.chipBg,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
  },
  tabActive: { backgroundColor: colors.lime },
  tabText: { color: colors.textMuted, fontSize: 12, fontWeight: "800", letterSpacing: 0.3 },
  tabTextActive: { color: colors.bg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
  rowSub: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  rowAside: { color: colors.lime, fontSize: 13, fontWeight: "800" },
  bullionAll: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 999,
    backgroundColor: colors.lime,
    marginBottom: 6,
  },
  bullionAllText: { color: colors.bg, fontSize: 13, fontWeight: "800" },
  bullionMeta: { color: colors.textDim, fontSize: 11, textAlign: "center", marginBottom: spacing.md },
  miniRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  miniRowLbl: { color: colors.lime, fontSize: 11, fontWeight: "800", minWidth: 68 },
  miniRowMeta: { color: colors.text, fontSize: 12, flex: 1 },
  miniRowDate: { color: colors.textDim, fontSize: 11 },
  emptyBox: { alignItems: "center", padding: spacing.xxl, gap: 8 },
  emptyHint: { color: colors.textDim, fontSize: 13 },
  dim: { color: colors.textDim, fontSize: 12, textAlign: "center", marginTop: spacing.md },
});
