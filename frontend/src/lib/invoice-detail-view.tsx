/**
 * InvoiceDetailView — shared body component for the invoice detail
 * screen. Rendered inside:
 *   • /app/invoice/[id].tsx (mobile full screen, with back button)
 *   • /app/(tabs)/invoices.tsx (right side of tablet split view)
 *
 * Renders Bill To, items table, subtotal/tax/grand total, and share.
 * The OS share sheet includes "Print → Save as PDF" — no native
 * PDF module required.
 */
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { apiGet } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth-context";
import { fmtCurrency, longDate, shortDate, titleCase } from "@/src/lib/format";
import { colors, radii, spacing } from "@/src/lib/theme";
import { GlassCard, LabelValueRow, Pill } from "@/src/lib/ui";

type InvoiceItem = {
  description: string;
  quantity: number;
  unit?: string;
  rate: number;
};

type Invoice = {
  id: string;
  number: string;
  party_id: string;
  shipment_id?: string | null;
  date?: string;
  due_date?: string | null;
  currency?: "INR" | "THB";
  items: InvoiceItem[];
  tax_percent: number;
  status?: string;
  notes?: string | null;
  subtotal?: number;
  tax_amount?: number;
  total?: number;
  company?: string;
  created_at?: string;
};

type Party = {
  id: string;
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  gstin?: string;
};

const STATUS: Record<string, { tint: string; soft: string }> = {
  draft: { tint: colors.textDim, soft: colors.divider },
  sent: { tint: colors.info, soft: colors.infoSoft },
  paid: { tint: colors.brand, soft: colors.brandSoft },
  cancelled: { tint: colors.danger, soft: colors.dangerSoft },
  overdue: { tint: colors.warn, soft: colors.warnSoft },
};

const COMPANY_LABELS: Record<string, string> = {
  awadh_enterprise: "Awadh Enterprise",
  singh_exports: "Singh Exports",
  aura_singh: "Aura Singh",
};

export function InvoiceDetailView({ id }: { id: string }) {
  const { token } = useAuth();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [party, setParty] = useState<Party | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const inv = await apiGet<Invoice>(`/api/invoices/${id}`);
      setInvoice(inv);
      if (inv.party_id) {
        apiGet<Party>(`/api/parties/${inv.party_id}`)
          .then(setParty)
          .catch(() => setParty(null));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (token && id) {
      setInvoice(null);
      setParty(null);
      load();
    }
  }, [token, id, load]);

  const totals = useMemo(() => {
    if (!invoice) return { subtotal: 0, tax: 0, total: 0 };
    const sub =
      invoice.subtotal ??
      invoice.items.reduce(
        (s, it) => s + Number(it.quantity ?? 0) * Number(it.rate ?? 0),
        0,
      );
    const tax = invoice.tax_amount ?? sub * (Number(invoice.tax_percent ?? 0) / 100);
    const total = invoice.total ?? sub + tax;
    return { subtotal: sub, tax, total };
  }, [invoice]);

  const status = STATUS[(invoice?.status || "draft").toLowerCase()] ?? STATUS.draft;

  const buildShareText = useCallback((): string => {
    if (!invoice) return "";
    const cur = invoice.currency || "INR";
    const lines: string[] = [];
    lines.push(`INVOICE ${invoice.number}`);
    if (invoice.company) lines.push(`From: ${COMPANY_LABELS[invoice.company] || invoice.company}`);
    lines.push(`Date: ${longDate(invoice.date)}`);
    if (invoice.due_date) lines.push(`Due: ${longDate(invoice.due_date)}`);
    lines.push(`Status: ${(invoice.status || "draft").toUpperCase()}`);
    lines.push("");
    lines.push(`Bill To: ${party?.name || invoice.party_id}`);
    if (party?.address) lines.push(`Address: ${party.address}`);
    if (party?.phone) lines.push(`Phone: ${party.phone}`);
    if (party?.email) lines.push(`Email: ${party.email}`);
    if (party?.gstin) lines.push(`GSTIN: ${party.gstin}`);
    lines.push("");
    lines.push("Items:");
    lines.push("-------------------------------------------");
    invoice.items.forEach((it, i) => {
      const amount = Number(it.quantity ?? 0) * Number(it.rate ?? 0);
      lines.push(
        `${i + 1}. ${it.description}\n   ${it.quantity} × ${fmtCurrency(it.rate, cur)} = ${fmtCurrency(amount, cur)}`,
      );
    });
    lines.push("-------------------------------------------");
    lines.push(`Subtotal: ${fmtCurrency(totals.subtotal, cur)}`);
    if (invoice.tax_percent) {
      lines.push(`Tax (${invoice.tax_percent}%): ${fmtCurrency(totals.tax, cur)}`);
    }
    lines.push(`GRAND TOTAL: ${fmtCurrency(totals.total, cur)}`);
    if (invoice.notes) {
      lines.push("");
      lines.push(`Notes: ${invoice.notes}`);
    }
    return lines.join("\n");
  }, [invoice, party, totals]);

  const handleShare = useCallback(async () => {
    if (!invoice) return;
    try {
      await Share.share(
        {
          title: `Invoice ${invoice.number}`,
          message: buildShareText(),
        },
        { dialogTitle: `Share Invoice ${invoice.number}` },
      );
    } catch {
      /* user cancelled */
    }
  }, [invoice, buildShareText]);

  // Fix 5 (Phase 7 · Batch C-2) · Professional GST invoice PDF.
  const [pdfBusy, setPdfBusy] = useState(false);
  const buildInvoiceHTML = useCallback((): string => {
    if (!invoice) return "";
    const esc = (s: unknown) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const cur = invoice.currency || "INR";
    const isFormal =
      invoice.mode === "formal" ||
      invoice.company_mode === "formal" ||
      invoice.invoice_type === "gst_invoice";
    const companyName = invoice.company
      ? COMPANY_LABELS[invoice.company] || invoice.company
      : "LogiOp Pro";
    const rowsHTML = (invoice.items || [])
      .map((it, i) => {
        const line = Number(it.quantity ?? 0) * Number(it.rate ?? 0);
        const taxPct = Number((it as any).tax_percent || 0);
        const taxAmt = (line * taxPct) / 100;
        const cgst = taxAmt / 2;
        const sgst = taxAmt / 2;
        const total = line + taxAmt;
        return `<tr>
            <td>${i + 1}</td>
            <td>${esc(it.description)}</td>
            <td>${esc((it as any).hsn || "")}</td>
            <td class="n">${esc(it.quantity)}</td>
            <td class="n">${esc(fmtCurrency(it.rate, cur))}</td>
            <td class="n">${taxPct}%</td>
            <td class="n">${esc(fmtCurrency(cgst, cur))}</td>
            <td class="n">${esc(fmtCurrency(sgst, cur))}</td>
            <td class="n b">${esc(fmtCurrency(total, cur))}</td>
          </tr>`;
      })
      .join("");
    const subtotal = totals.subtotal;
    const totalTax = totals.tax;
    const grand = totals.total;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  @page { margin: 22px; }
  body { font-family: -apple-system,"Helvetica Neue",Arial,sans-serif; color:#111; font-size:11px; }
  .head { display:flex; justify-content:space-between; border-bottom:2px solid #00C853; padding-bottom:8px; }
  .head h1 { margin:0; font-size:16px; }
  .brand { color:#00C853; font-weight:800; font-size:13px; }
  .sub { color:#666; font-size:10px; }
  .title { text-align:center; margin: 14px 0 6px; font-size:14px; font-weight:800; letter-spacing:.4px; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin: 10px 0; }
  .box { border:1px solid #ddd; padding:8px; border-radius:4px; }
  .box .lbl { color:#888; font-size:9px; text-transform:uppercase; letter-spacing:.5px; }
  table { width:100%; border-collapse:collapse; margin-top:10px; }
  th,td { border:1px solid #ccc; padding:5px 6px; }
  th { background:#F0F0F0; font-size:10px; }
  td.n { text-align:right; }
  td.b { font-weight:800; }
  tfoot td { font-weight:800; }
  .terms { margin-top:14px; font-size:9px; color:#666; }
  .sig { margin-top:22px; text-align:right; }
</style></head>
<body>
  <div class="head">
    <div>
      <div class="brand">${esc(companyName)}</div>
      ${invoice.gstin ? `<div class="sub">GSTIN: ${esc(invoice.gstin)}</div>` : ""}
    </div>
    <div style="text-align:right">
      <h1>${isFormal ? "TAX INVOICE" : "CASH RECEIPT"}</h1>
      <div class="sub">${esc(invoice.number)}</div>
      <div class="sub">Date: ${esc(longDate(invoice.date))}</div>
    </div>
  </div>
  <div class="title">${isFormal ? "GST Invoice — as per CGST Rules, 2017" : "Informal Cash Receipt"}</div>
  <div class="grid">
    <div class="box">
      <div class="lbl">Bill To</div>
      <div style="font-weight:800; font-size:12px">${esc(party?.name || invoice.party_id)}</div>
      ${party?.gstin ? `<div class="sub">GSTIN: ${esc(party.gstin)}</div>` : ""}
      ${party?.address ? `<div class="sub">${esc(party.address)}</div>` : ""}
    </div>
    <div class="box">
      <div class="lbl">Meta</div>
      <div class="sub">Status: ${esc((invoice.status || "draft").toUpperCase())}</div>
      ${invoice.due_date ? `<div class="sub">Due: ${esc(longDate(invoice.due_date))}</div>` : ""}
    </div>
  </div>
  <table>
    <thead><tr>
      <th>#</th><th>Description</th><th>HSN</th><th>Qty</th><th>Rate</th>
      <th>Tax%</th><th>CGST</th><th>SGST</th><th>Total</th>
    </tr></thead>
    <tbody>${rowsHTML}</tbody>
    <tfoot>
      <tr><td colspan="8" class="n">Subtotal</td><td class="n">${esc(fmtCurrency(subtotal, cur))}</td></tr>
      ${isFormal ? `<tr><td colspan="8" class="n">Total Tax</td><td class="n">${esc(fmtCurrency(totalTax, cur))}</td></tr>` : ""}
      <tr><td colspan="8" class="n" style="background:#F0FFF3">Grand Total</td><td class="n" style="background:#F0FFF3">${esc(fmtCurrency(grand, cur))}</td></tr>
    </tfoot>
  </table>
  ${invoice.notes ? `<div class="terms"><b>Notes:</b> ${esc(invoice.notes)}</div>` : ""}
  <div class="terms">This is a computer-generated invoice — signature not required.</div>
  <div class="sig">
    <div style="font-weight:800">For ${esc(companyName)}</div>
    <div class="sub" style="margin-top:24px">Authorized Signatory</div>
  </div>
</body></html>`;
  }, [invoice, party, totals]);

  const handlePdf = useCallback(async () => {
    if (!invoice || pdfBusy) return;
    setPdfBusy(true);
    try {
      const html = buildInvoiceHTML();
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (Platform.OS === "web") {
        try {
          window.open(uri, "_blank");
        } catch {
          /* silent */
        }
        return;
      }
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Invoice ${invoice.number}`,
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("PDF ready", `Saved for ${invoice.number}`);
      }
    } catch (e) {
      Alert.alert("PDF failed", (e as Error).message || "Could not build PDF.");
    } finally {
      setPdfBusy(false);
    }
  }, [invoice, pdfBusy, buildInvoiceHTML]);

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand} />
      }
      showsVerticalScrollIndicator={false}
    >
      {invoice === null && loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.dim}>Loading invoice…</Text>
        </View>
      ) : error ? (
        <GlassCard style={styles.errorCard}>
          <Ionicons name="alert-circle" size={20} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </GlassCard>
      ) : invoice ? (
        <>
          <GlassCard glow style={styles.headerCard}>
            <View style={styles.headerCardTop}>
              <Pill
                label={titleCase(invoice.status || "draft")}
                tint={status.tint}
                soft={status.soft}
              />
              <Text style={styles.dim}>{longDate(invoice.date)}</Text>
            </View>
            <Text style={styles.invNumber}>{invoice.number}</Text>
            {invoice.due_date ? (
              <Text style={styles.dueText}>Due {longDate(invoice.due_date)}</Text>
            ) : null}
          </GlassCard>

          <Text style={styles.section}>Bill To</Text>
          <GlassCard>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => router.push(`/party/${invoice.party_id}` as any)}
              style={styles.billToRow}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.partyName}>{party?.name || "Loading…"}</Text>
                {party?.address ? (
                  <Text style={styles.partySub}>{party.address}</Text>
                ) : null}
                {party?.phone || party?.email ? (
                  <Text style={styles.partySub}>
                    {[party?.phone, party?.email].filter(Boolean).join(" · ")}
                  </Text>
                ) : null}
                {party?.gstin ? (
                  <Text style={styles.partySub}>GSTIN: {party.gstin}</Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
            </TouchableOpacity>
          </GlassCard>

          <Text style={styles.section}>Items</Text>
          <GlassCard padded={false} style={styles.itemsCard}>
            <View style={styles.itemsHeader}>
              <Text style={[styles.thText, { flex: 3 }]}>Description</Text>
              <Text style={[styles.thText, styles.thNum]}>Qty</Text>
              <Text style={[styles.thText, styles.thNum]}>Rate</Text>
              <Text style={[styles.thText, styles.thNum, { flex: 1.4 }]}>Amount</Text>
            </View>
            {invoice.items.map((it, idx) => {
              const amount = Number(it.quantity ?? 0) * Number(it.rate ?? 0);
              return (
                <View
                  key={idx}
                  style={[
                    styles.itemRow,
                    idx < invoice.items.length - 1 && styles.itemRowBorder,
                  ]}
                >
                  <View style={{ flex: 3 }}>
                    <Text style={styles.itemDesc} numberOfLines={3}>
                      {it.description}
                    </Text>
                    {it.unit ? <Text style={styles.itemUnit}>{it.unit}</Text> : null}
                  </View>
                  <Text style={[styles.itemVal, styles.thNum]} numberOfLines={1}>
                    {it.quantity}
                  </Text>
                  <Text style={[styles.itemVal, styles.thNum]} numberOfLines={1}>
                    {fmtCurrency(it.rate, invoice.currency)}
                  </Text>
                  <Text
                    style={[
                      styles.itemVal,
                      styles.thNum,
                      { flex: 1.4, fontWeight: "800" },
                    ]}
                    numberOfLines={1}
                  >
                    {fmtCurrency(amount, invoice.currency)}
                  </Text>
                </View>
              );
            })}
          </GlassCard>

          <GlassCard style={styles.totalsCard}>
            <LabelValueRow
              label="Subtotal"
              value={fmtCurrency(totals.subtotal, invoice.currency)}
            />
            {invoice.tax_percent ? (
              <LabelValueRow
                label={`Tax (${invoice.tax_percent}%)`}
                value={fmtCurrency(totals.tax, invoice.currency)}
              />
            ) : null}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>GRAND TOTAL</Text>
              <Text style={styles.grandTotalValue}>
                {fmtCurrency(totals.total, invoice.currency)}
              </Text>
            </View>
          </GlassCard>

          {invoice.shipment_id ? (
            <TouchableOpacity
              style={styles.linkCard}
              onPress={() => router.push(`/shipment/${invoice.shipment_id}` as any)}
              activeOpacity={0.75}
            >
              <Ionicons name="airplane" size={18} color={colors.brand} />
              <View style={{ flex: 1 }}>
                <Text style={styles.linkTitle}>Linked shipment</Text>
                <Text style={styles.linkSub}>Tap to view consignment details</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
            </TouchableOpacity>
          ) : null}

          {invoice.notes ? (
            <>
              <Text style={styles.section}>Notes</Text>
              <GlassCard>
                <Text style={styles.notes}>{invoice.notes}</Text>
              </GlassCard>
            </>
          ) : null}

          <Text style={styles.section}>Meta</Text>
          <GlassCard>
            <LabelValueRow label="Invoice ID" value={invoice.id} />
            <LabelValueRow label="Created" value={shortDate(invoice.created_at)} />
            {invoice.company ? (
              <LabelValueRow
                label="Company"
                value={COMPANY_LABELS[invoice.company] || invoice.company}
              />
            ) : null}
          </GlassCard>

          <TouchableOpacity
            style={[styles.primaryBtn, pdfBusy && { opacity: 0.6 }]}
            onPress={handlePdf}
            activeOpacity={0.8}
            disabled={pdfBusy}
          >
            <Ionicons name="document-text-outline" size={18} color={colors.bg} />
            <Text style={styles.primaryBtnText}>
              {pdfBusy ? "PDF ban raha hai…" : "PDF Banao (1-click)"}
            </Text>
          </TouchableOpacity>

          {/* Fix C (Phase 7) · 1-click Invoice → Shipment Packing */}
          {invoice.shipment_id ? null : (
            <TouchableOpacity
              style={styles.packBtn}
              onPress={() =>
                router.push(`/invoice/${invoice.id}/pack` as never)
              }
              activeOpacity={0.85}
            >
              <Ionicons name="cube" size={16} color={colors.bg} />
              <Text style={styles.packBtnText}>📦 Shipment Banao</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.secondaryBtn} onPress={handleShare} activeOpacity={0.8}>
            <Ionicons name="share-outline" size={16} color={colors.brand} />
            <Text style={styles.secondaryBtnText}>Share text summary</Text>
          </TouchableOpacity>
          <Text style={styles.tipText}>
            Tip: <Text style={styles.tipStrong}>PDF Banao</Text> generates a
            professional GST-ready PDF instantly. Formal invoices include HSN, tax
            columns and signatory block.
          </Text>
        </>
      ) : null}
    </ScrollView>
  );
}

// Export for potential use in tablet split header (e.g. share button)
export function useInvoiceShare(_id: string) {
  return null;
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: 100 },
  headerCard: { padding: spacing.lg, marginBottom: spacing.md },
  headerCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  invNumber: { color: colors.text, fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  dueText: { color: colors.warn, fontSize: 12, fontWeight: "700", marginTop: 4 },
  section: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  billToRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  partyName: { color: colors.text, fontSize: 16, fontWeight: "800" },
  partySub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  itemsCard: { overflow: "hidden" },
  itemsHeader: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.divider,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: 6,
  },
  thText: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  thNum: { flex: 1, textAlign: "right" },
  itemRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 6,
    alignItems: "center",
  },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  itemDesc: { color: colors.text, fontSize: 12, lineHeight: 16 },
  itemUnit: { color: colors.textDim, fontSize: 10, marginTop: 2 },
  itemVal: { color: colors.text, fontSize: 12, fontWeight: "600" },
  totalsCard: { marginTop: spacing.md },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  grandTotalLabel: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  grandTotalValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  linkCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.brandSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  linkTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  linkSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  notes: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  primaryBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.brand,
    borderRadius: radii.pill,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: colors.brand,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: { color: colors.bg, fontSize: 14, fontWeight: "800", letterSpacing: 0.3 },
  // Fix C (Phase 7) · Invoice → Shipment packing button.
  packBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.info || colors.brand,
    borderRadius: radii.pill,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  packBtnText: { color: colors.bg, fontSize: 13, fontWeight: "800", letterSpacing: 0.2 },
  secondaryBtn: {
    marginTop: spacing.sm,
    borderRadius: radii.pill,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    backgroundColor: colors.brandSoft,
  },
  secondaryBtnText: { color: colors.brand, fontSize: 13, fontWeight: "700" },
  tipText: {
    color: colors.textDim,
    fontSize: 11,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 16,
  },
  tipStrong: { color: colors.brand, fontWeight: "800" },
  loading: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  dim: { color: colors.textDim, fontSize: 11 },
  errorCard: {
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderColor: colors.danger,
  },
  errorText: { flex: 1, color: colors.text, fontSize: 12 },
  retry: {
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  retryText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
});
