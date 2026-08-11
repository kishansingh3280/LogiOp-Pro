/**
 * invoicePdf — generate a Singh-Exports-style PDF invoice using
 * expo-print. Renders an HTML template, hands it to `printToFileAsync`,
 * then hands the resulting file URI to `expo-sharing` so the operator
 * can push it to WhatsApp, Email, Drive etc.
 *
 * Web fallback: expo-print's web behaviour opens a browser print
 * dialog. We fall back to that path automatically.
 */
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import type { Invoice, Party } from "@/src/api/types";
import { fmtCurrency } from "@/src/utils/format";

export type InvoicePdfInput = {
  invoice: Invoice;
  party?: Party | null;
  shipTo?: {
    name?: string;
    address?: string;
    country?: string;
    phone?: string;
    consignment_no?: string;
    route?: string;
  } | null;
  company?: {
    name: string;
    address?: string;
    gstin?: string;
    phone?: string;
    email?: string;
  };
};

const DEFAULT_COMPANY = {
  name: "Singh Exports",
  address: "Delhi · India",
  gstin: "",
  phone: "",
  email: "",
};

// escape untrusted strings so no user-entered <script> breaks the doc
function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Build an HTML string that expo-print renders to PDF. Kept simple —
 * no external CSS or images so the doc is fully self-contained.
 */
function buildHtml({ invoice, party, shipTo, company }: Required<Pick<InvoicePdfInput, "invoice">> & Pick<InvoicePdfInput, "party" | "shipTo" | "company">): string {
  const co = { ...DEFAULT_COMPANY, ...(company || {}) };
  const total = fmtCurrency(invoice.total || 0, invoice.currency);
  const subtotal = fmtCurrency(invoice.subtotal ?? invoice.total ?? 0, invoice.currency);
  // Tax line removed per Absolute Final spec — simple Items + Subtotal = Total.
  const items = (invoice.items || []).map((it, idx) => `
      <tr>
        <td class="num">${idx + 1}</td>
        <td>${esc(it.description)}${it.unit ? ` <span class="unit">${esc(it.unit)}</span>` : ""}</td>
        <td class="num">${esc(it.quantity ?? 1)}</td>
        <td class="num">${fmtCurrency(it.rate || 0, invoice.currency)}</td>
        <td class="num">${fmtCurrency((it.quantity || 1) * (it.rate || 0), invoice.currency)}</td>
      </tr>
    `).join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Invoice ${esc(invoice.number)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0A0A14; margin: 40px; }
  h1 { margin: 0 0 4px 0; font-size: 28px; letter-spacing: 0.5px; }
  .brand { border-bottom: 3px solid #00FF88; padding-bottom: 16px; margin-bottom: 24px; }
  .co-name { font-size: 24px; font-weight: 800; }
  .co-meta { color: #555; font-size: 12px; margin-top: 4px; }
  .row { display: flex; justify-content: space-between; gap: 20px; margin-top: 16px; }
  .col { flex: 1; min-width: 0; }
  .label { color: #777; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .value { font-size: 14px; font-weight: 600; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #EEE; font-size: 12px; }
  th { background: #F5F5F7; text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; color: #333; }
  td.num, th.num { text-align: right; }
  .totals { margin-left: auto; width: 260px; margin-top: 20px; }
  .totals .line { display: flex; justify-content: space-between; padding: 6px 0; }
  .totals .grand { border-top: 2px solid #0A0A14; font-weight: 800; font-size: 16px; margin-top: 6px; padding-top: 10px; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #DDD; display: flex; justify-content: space-between; }
  .sig { text-align: right; }
  .sig .box { border-top: 1px solid #333; margin-top: 60px; padding-top: 4px; font-size: 11px; }
  .status { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .status.paid { background: #DCFCE7; color: #14532D; }
  .status.sent { background: #DBEAFE; color: #1E3A8A; }
  .status.draft { background: #FEF3C7; color: #78350F; }
  .status.cancelled { background: #FEE2E2; color: #7F1D1D; }
  .unit { color: #999; font-size: 10px; font-style: italic; margin-left: 4px; }
</style>
</head>
<body>
  <div class="brand">
    <div class="co-name">${esc(co.name)}</div>
    <div class="co-meta">
      ${esc(co.address || "")}${co.gstin ? " · GSTIN " + esc(co.gstin) : ""}
      ${co.phone ? "<br/>" + esc(co.phone) : ""}${co.email ? " · " + esc(co.email) : ""}
    </div>
  </div>

  <div class="row">
    <div class="col">
      <h1>INVOICE</h1>
      <div class="label">Invoice #</div>
      <div class="value">${esc(invoice.number)}</div>
      <div style="margin-top: 8px" class="label">Date</div>
      <div class="value">${esc(invoice.date)}</div>
      ${invoice.status ? `<div style="margin-top: 8px"><span class="status ${esc(invoice.status)}">${esc(invoice.status)}</span></div>` : ""}
    </div>
    <div class="col">
      <div class="label">Bill To</div>
      <div class="value">${esc(party?.name || "—")}</div>
      <div class="co-meta">
        ${party?.address ? esc(party.address) : ""}
        ${party?.country ? "<br/>" + esc(party.country) : ""}
        ${party?.phone ? "<br/>" + esc(party.phone) : ""}
        ${party?.gstin ? "<br/>GSTIN " + esc(party.gstin) : ""}
      </div>
    </div>
    <div class="col">
      <div class="label">Ship To</div>
      <div class="value">${esc(shipTo?.name || party?.name || "—")}</div>
      <div class="co-meta">
        ${shipTo?.address ? esc(shipTo.address) + "<br/>" : ""}
        ${shipTo?.country ? esc(shipTo.country) + "<br/>" : ""}
        ${shipTo?.phone ? "📞 " + esc(shipTo.phone) + "<br/>" : ""}
        ${shipTo?.route ? "Route: " + esc(shipTo.route) + "<br/>" : ""}
        ${shipTo?.consignment_no ? "Consignment " + esc(shipTo.consignment_no) : ""}
        ${!shipTo?.name && !shipTo?.address && !shipTo?.route ? "<i>Same as Bill To</i>" : ""}
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="num">#</th>
        <th>Description</th>
        <th class="num">Qty</th>
        <th class="num">Rate</th>
        <th class="num">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${items || `<tr><td colspan="5" style="text-align:center;color:#999">No line items</td></tr>`}
    </tbody>
  </table>

  <div class="totals">
    <div class="line"><div>Subtotal</div><div>${subtotal}</div></div>
    <!-- Tax removed per Absolute Final spec -->
    <div class="line grand"><div>Total</div><div>${total}</div></div>
  </div>

  ${invoice.notes ? `<div style="margin-top:24px;padding:12px;background:#F5F5F7;border-radius:8px;font-size:12px;color:#333"><strong>Notes:</strong> ${esc(invoice.notes)}</div>` : ""}

  <div class="footer">
    <div style="font-size:11px;color:#777">Thank you for your business.</div>
    <div class="sig">
      <div class="box">Authorized Signatory</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate and share an invoice PDF. On web, opens the browser print
 * dialog directly (no file system write). On native, writes the file
 * with a friendly `Invoice_<number>.pdf` name and pops a share sheet.
 */
export async function generateInvoicePdf(input: InvoicePdfInput): Promise<{ uri?: string; shared?: boolean }> {
  const html = buildHtml({ invoice: input.invoice, party: input.party, shipTo: input.shipTo, company: input.company });

  if (Platform.OS === "web") {
    // Web: use expo-print's print dialog directly. Users can Save-as-PDF.
    await Print.printAsync({ html });
    return { shared: true };
  }

  // Native: write to a temp file, rename to Invoice_<number>.pdf, share.
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const safeNumber = (input.invoice.number || input.invoice.id || "invoice").replace(/[^A-Za-z0-9_-]/g, "_");
  const target = `${FileSystem.cacheDirectory}Invoice_${safeNumber}.pdf`;
  try {
    await FileSystem.moveAsync({ from: uri, to: target });
  } catch {
    // If move fails, just share the original tempuri.
  }
  const finalUri = target;
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(finalUri, {
      mimeType: "application/pdf",
      dialogTitle: `Invoice_${safeNumber}.pdf`,
      UTI: "com.adobe.pdf",
    });
    return { uri: finalUri, shared: true };
  }
  return { uri: finalUri, shared: false };
}
