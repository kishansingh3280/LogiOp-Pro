/**
 * generatePackingListPdf — builds the Singh Exports packing list PDF and
 * either downloads it (web) or opens the native share sheet (iOS /
 * Android). Groups the shipment's bags by end-customer party so each
 * row reads like "Party — BAG NO. X TO Y = Z BAGS".
 *
 * On WEB expo-print returns a data URI that we convert to a Blob and
 * force-download via an `<a download>` click. On NATIVE we hand the
 * resulting file URI to `expo-sharing` so the user can WhatsApp / Email
 * / AirDrop it right away.
 */
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import type { Party, Shipment, ShipmentBag } from "@/src/api/types";

type BagRun = { start: number; end: number; count: number };

// Collapse a sorted list of bag numbers into contiguous runs so we get
// "BAG NO. 1 TO 5 = 5 BAGS" rather than "BAG NO. 1, 2, 3, 4, 5".
function collapseRuns(nums: number[]): BagRun[] {
  const sorted = [...nums].sort((a, b) => a - b);
  const runs: BagRun[] = [];
  for (const n of sorted) {
    const last = runs[runs.length - 1];
    if (last && n === last.end + 1) {
      last.end = n;
      last.count += 1;
    } else {
      runs.push({ start: n, end: n, count: 1 });
    }
  }
  return runs;
}

function fmtWeight(w: number): string {
  return (Math.round(w * 1000) / 1000).toFixed(3);
}

function fmtDate(iso?: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return new Date().toLocaleDateString("en-GB").replace(/\//g, ".");
  return d.toLocaleDateString("en-GB").replace(/\//g, ".");
}

export function buildPackingListHtml({
  shipment,
  bags,
  parties,
}: {
  shipment: Shipment;
  bags: ShipmentBag[];
  parties: Party[];
}): string {
  const partyMap = new Map<string, Party>();
  for (const p of parties) partyMap.set(p.id, p);

  // Group bags by end_customer_id (or shipment party if none).
  const groups = new Map<string, { name: string; nums: number[]; weight: number }>();
  for (const b of bags) {
    const partyId = b.end_customer_id || shipment.party_id;
    const name = (partyId && partyMap.get(partyId)?.name) || "Unassigned";
    const g = groups.get(partyId || "unassigned") || { name, nums: [], weight: 0 };
    // Try to parse a numeric part from bag_no (e.g. "BAG-12" → 12).
    const parsed = parseInt(String(b.bag_no || "").replace(/\D/g, ""), 10);
    if (!isNaN(parsed)) g.nums.push(parsed);
    g.weight += Number(b.weight_kg || 0) || 0;
    groups.set(partyId || "unassigned", g);
  }

  const rows: string[] = [];
  let totalBags = 0;
  let totalWeight = 0;
  const orderedGroups = [...groups.values()];
  for (const g of orderedGroups) {
    totalBags += g.nums.length;
    totalWeight += g.weight;
  }
  // Fallback: bag-level weight_kg is 0 for many older shipments where the
  // total was captured on the shipment itself. Use shipment.weight_kg
  // when we have exactly one group; split proportionally by bag count
  // when there are multiple groups.
  if (totalWeight === 0 && Number(shipment.weight_kg) > 0) {
    const shipWeight = Number(shipment.weight_kg);
    totalWeight = shipWeight;
    if (orderedGroups.length === 1) {
      orderedGroups[0].weight = shipWeight;
    } else if (totalBags > 0) {
      for (const g of orderedGroups) g.weight = (g.nums.length / totalBags) * shipWeight;
    }
  }
  for (const g of orderedGroups) {
    const runs = collapseRuns(g.nums);
    const bagCount = g.nums.length;
    const runStr = runs.length
      ? runs
          .map((r) => (r.count === 1 ? `BAG NO. ${r.start} = 1 BAG` : `BAG NO. ${r.start} TO ${r.end} = ${r.count} BAGS`))
          .join("<br/>")
      : `BAG NO. — = ${bagCount} BAG${bagCount === 1 ? "" : "S"}`;
    rows.push(`
      <tr>
        <td class="marks">${g.name.toUpperCase()}</td>
        <td class="desc">${runStr}</td>
        <td class="pcs"></td>
        <td class="total">${fmtWeight(g.weight)}</td>
      </tr>
    `);
  }

  const number = shipment.consignment_no || "—";
  const date = fmtDate(shipment.dispatch_date || shipment.created_at);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Packing List ${number}</title>
    <style>
      @page { size: A4; margin: 18mm; }
      * { box-sizing: border-box; }
      body { font-family: 'Helvetica', Arial, sans-serif; color: #000; margin: 0; }
      .header { text-align: center; margin-bottom: 24px; }
      .brand { font-size: 22px; font-weight: 900; letter-spacing: 3px; }
      .addr { font-size: 11px; margin-top: 4px; line-height: 1.4; }
      .meta { display: flex; justify-content: space-between; align-items: center; margin: 20px 0 12px; font-size: 13px; font-weight: 700; }
      .meta .title { font-size: 15px; font-weight: 900; text-decoration: underline; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #000; padding: 8px 10px; vertical-align: top; }
      th { font-weight: 800; background: #f2f2f2; text-align: left; }
      td.pcs, td.total, th.pcs, th.total { text-align: right; }
      td.desc { white-space: pre-line; }
      .totalRow td { font-weight: 800; }
      .footer { margin-top: 32px; font-size: 11px; text-align: right; color: #555; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="brand">SINGH EXPORTS</div>
      <div class="addr">2325-26, GROUND FLOOR, TILAK STREET,<br/>CHUNA MANDI, PAHAR GANJ, NEW DELHI-110055</div>
    </div>
    <div class="meta">
      <div class="title">PACKING LIST (${number})</div>
      <div>DT :- ${date}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:28%">Marks &amp; Nos.</th>
          <th>Description</th>
          <th class="pcs" style="width:14%">PCS / MTR</th>
          <th class="total" style="width:16%">TOTAL (kg)</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join("\n")}
        <tr class="totalRow">
          <td></td>
          <td>TOTAL = ${totalBags} BAG${totalBags === 1 ? "" : "S"}</td>
          <td class="pcs"></td>
          <td class="total">${fmtWeight(totalWeight)}</td>
        </tr>
      </tbody>
    </table>
    <div class="footer">Generated ${new Date().toLocaleString("en-GB")} · JARVIS Aura</div>
  </body>
</html>`;
}

/** Generate + share/download the packing list PDF. */
export async function generatePackingListPdf(args: {
  shipment: Shipment;
  bags: ShipmentBag[];
  parties: Party[];
}): Promise<void> {
  const html = buildPackingListHtml(args);
  const filename = `PackingList_${args.shipment.consignment_no || "shipment"}.pdf`;

  if (Platform.OS === "web") {
    // On web, expo-print falls back to window.print via a data URI —
    // easier UX is to open the HTML in a new tab so the user can review
    // then hit "Print → Save as PDF".
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      // Small delay so the DOM finishes rendering before the print dialog.
      setTimeout(() => {
        try { win.focus(); win.print(); } catch (_e) { /* ignore */ }
      }, 250);
    }
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: filename,
      UTI: "com.adobe.pdf",
    });
  }
}
