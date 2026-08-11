/**
 * generateStatementPdf — bank-statement-style PDF for a party's
 * ledger over a chosen period. Format:
 *   Date · Description · Debit · Credit · Balance
 *
 * Uses expo-print to render HTML → PDF and expo-sharing to open the
 * native share sheet. Everything runs client-side on both web and
 * mobile.
 */
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import type { LedgerEntry, Party } from "@/src/api/types";
import { fmtCurrency, shortDate } from "@/src/utils/format";

export type StatementRow = {
  entry: LedgerEntry;
  ccy: "INR" | "THB";
  balanceInr: number;
  balanceThb: number;
};

export async function generateStatementPdf(opts: {
  party: Party;
  rows: StatementRow[];
  periodLabel: string;
}): Promise<void> {
  const { party, rows, periodLabel } = opts;
  const openInr = 0; // Detail row list already includes opening if any
  const closeInr = rows.length ? rows[rows.length - 1].balanceInr : 0;
  const closeThb = rows.length ? rows[rows.length - 1].balanceThb : 0;

  const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(party.name)} — Statement</title>
<style>
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #111; margin: 24px; }
  h1   { font-size: 20px; margin: 0 0 4px; letter-spacing: 0.3px; }
  .meta { color: #555; font-size: 12px; margin-bottom: 20px; }
  .party-block { border: 1px solid #ddd; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; }
  .party-block b { font-size: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead th { text-align: left; padding: 8px 6px; border-bottom: 1.5px solid #333; font-weight: 700; }
  tbody td { padding: 6px; border-bottom: 1px solid #eee; vertical-align: top; }
  tbody tr:nth-child(even) { background: #fafafa; }
  .r { text-align: right; }
  .lbl { color: #666; }
  .balance { font-weight: 700; }
  .footer { margin-top: 20px; font-size: 11px; color: #777; text-align: center; }
  .totals { margin-top: 12px; display: flex; gap: 24px; justify-content: flex-end; font-size: 13px; }
  .totals div { text-align: right; }
  .totals b { font-size: 15px; }
</style>
</head>
<body>
  <h1>Statement of Account</h1>
  <div class="meta">Period: ${escapeHtml(periodLabel)} · Generated: ${new Date().toLocaleDateString()}</div>
  <div class="party-block">
    <b>${escapeHtml(party.name)}</b><br/>
    <span class="lbl">${escapeHtml(party.role || "")} ${party.country ? "· " + escapeHtml(party.country) : ""}</span><br/>
    ${party.address ? `<span class="lbl">${escapeHtml(party.address)}</span><br/>` : ""}
    ${party.phone ? `<span class="lbl">📞 ${escapeHtml(String(party.phone))}</span>` : ""}
  </div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Description</th>
        <th class="r">Debit</th>
        <th class="r">Credit</th>
        <th class="r">Balance (INR)</th>
        <th class="r">Balance (THB)</th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map((r) => {
          const e = r.entry;
          const debit = e.debit ? fmtCurrency(e.debit, r.ccy) : "";
          const credit = e.credit ? fmtCurrency(e.credit, r.ccy) : "";
          return `<tr>
            <td>${escapeHtml(shortDate(e.date))}</td>
            <td>${escapeHtml(e.description || "")}</td>
            <td class="r">${debit}</td>
            <td class="r">${credit}</td>
            <td class="r balance">${fmtCurrency(r.balanceInr, "INR")}</td>
            <td class="r balance">${Math.abs(r.balanceThb) > 0.5 ? fmtCurrency(r.balanceThb, "THB") : ""}</td>
          </tr>`;
        })
        .join("")}
      ${
        rows.length === 0
          ? `<tr><td colspan="6" style="text-align:center;color:#999;padding:24px">No entries in this period</td></tr>`
          : ""
      }
    </tbody>
  </table>
  <div class="totals">
    <div><span class="lbl">Opening</span><br/><b>${fmtCurrency(openInr, "INR")}</b></div>
    <div><span class="lbl">Closing INR</span><br/><b>${fmtCurrency(closeInr, "INR")}</b></div>
    ${Math.abs(closeThb) > 0.5 ? `<div><span class="lbl">Closing THB</span><br/><b>${fmtCurrency(closeThb, "THB")}</b></div>` : ""}
  </div>
  <div class="footer">— LogiOp Pro · Powered by OPSI —</div>
</body>
</html>
  `.trim();

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: `${party.name} — Statement`,
      UTI: "com.adobe.pdf",
    });
  }
}

function escapeHtml(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
