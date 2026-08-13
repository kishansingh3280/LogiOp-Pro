/**
 * Shared report generators for reports/pick-party, /pick-shipment, /pick-invoice
 * routes.
 *
 * Each function:
 *   • Fetches the fresh detail for the picked entity (best-effort)
 *   • Builds a plain-text PDF-ready report
 *   • Hands it to React Native `Share.share()` for the OS share sheet
 *
 * Extracted from app/reports.tsx so both the reports hub and the new
 * full-page picker routes can call the same code without duplication.
 */
import { Share } from "react-native";

import { apiGet } from "@/src/lib/api";
import { fmtCurrency, longDate, shortDate, titleCase } from "@/src/lib/format";

export type Party = {
  id: string;
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  opening_balance_inr?: number;
  opening_balance_thb?: number;
};

export type Shipment = {
  id: string;
  consignment_no: string;
  direction: "IN_TO_TH" | "TH_TO_IN";
  mode?: string;
  origin?: string;
  destination?: string;
  goods?: string;
  status: string;
  weight_kg: number;
  bag_count: number;
  freight: number;
  freight_currency: "INR" | "THB";
  party_id?: string;
  carrier_party_id?: string;
  dispatch_date?: string;
  created_at: string;
  notes?: string;
  bags?: {
    id: string;
    weight_kg?: number;
    contents?: string | null;
    carrier_party_id?: string | null;
    status?: string;
  }[];
};

export type InvoiceItem = { description: string; quantity: number; rate: number; unit?: string };
export type Invoice = {
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
  notes?: string;
};

export type LedgerEntry = {
  id: string;
  party_id: string;
  date?: string;
  description: string;
  currency: "INR" | "THB";
  debit: number;
  credit: number;
  ref_type?: string;
};

export async function runPartyStatement(party: Party): Promise<void> {
  const entries = await apiGet<LedgerEntry[]>(
    `/api/ledger/entries?party_id=${party.id}`,
  );
  const sorted = (entries || [])
    .slice()
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  let balInr = party.opening_balance_inr ?? 0;
  let balThb = party.opening_balance_thb ?? 0;
  const lines: string[] = [];
  lines.push(`LEDGER STATEMENT — ${party.name}`);
  if (party.role) lines.push(`Role: ${titleCase(party.role)}`);
  if (party.phone) lines.push(`Phone: ${party.phone}`);
  if (party.email) lines.push(`Email: ${party.email}`);
  if (party.gstin) lines.push(`GSTIN: ${party.gstin}`);
  lines.push(`Generated: ${longDate(new Date().toISOString())}`);
  lines.push("─────────────────────────────────────────");
  if (balInr) lines.push(`Opening (INR): ${fmtCurrency(balInr, "INR")}`);
  if (balThb) lines.push(`Opening (THB): ${fmtCurrency(balThb, "THB")}`);
  lines.push("");
  lines.push("DATE       | DESCRIPTION                        |    DEBIT |   CREDIT |  BALANCE");
  lines.push("─────────────────────────────────────────────────────────────────────────");
  for (const e of sorted) {
    const cur = e.currency;
    if (cur === "THB") balThb += (e.debit || 0) - (e.credit || 0);
    else balInr += (e.debit || 0) - (e.credit || 0);
    const bal = cur === "THB" ? balThb : balInr;
    const dr = e.debit ? fmtCurrency(e.debit, cur) : "—";
    const cr = e.credit ? fmtCurrency(e.credit, cur) : "—";
    lines.push(
      `${shortDate(e.date).padEnd(10)} | ${(e.description || "").slice(0, 34).padEnd(34)} | ${dr.padStart(8)} | ${cr.padStart(8)} | ${fmtCurrency(bal, cur)}`,
    );
  }
  lines.push("─────────────────────────────────────────");
  lines.push(`Closing (INR): ${fmtCurrency(balInr, "INR")}`);
  lines.push(`Closing (THB): ${fmtCurrency(balThb, "THB")}`);
  const status =
    balInr > 0 || balThb > 0
      ? "INSE LENA HAI"
      : balInr < 0 || balThb < 0
        ? "INHE DENA HAI"
        : "SETTLED";
  lines.push(`Status: ${status}`);
  await Share.share(
    { title: `Statement — ${party.name}`, message: lines.join("\n") },
    { dialogTitle: `Share statement for ${party.name}` },
  );
}

export async function runShipmentManifest(
  sh: Shipment,
  partyMap: Record<string, Party>,
): Promise<void> {
  const full = await apiGet<Shipment>(`/api/shipments/${sh.id}`).catch(() => sh);
  const lines: string[] = [];
  lines.push(`SHIPMENT MANIFEST — ${full.consignment_no}`);
  lines.push(`Generated: ${longDate(new Date().toISOString())}`);
  lines.push("─────────────────────────────────────────");
  lines.push(`Direction: ${full.direction === "IN_TO_TH" ? "India → Thailand" : "Thailand → India"}`);
  lines.push(`Mode: ${titleCase(full.mode || "")}`);
  lines.push(`Origin: ${full.origin || "—"}`);
  lines.push(`Destination: ${full.destination || "—"}`);
  lines.push(`Status: ${(full.status || "").toUpperCase()}`);
  lines.push(`Dispatch: ${shortDate(full.dispatch_date)}`);
  lines.push("");
  lines.push(`Customer: ${partyMap[full.party_id || ""]?.name || "—"}`);
  lines.push(`Carrier: ${partyMap[full.carrier_party_id || ""]?.name || "—"}`);
  lines.push(`Goods: ${full.goods || "—"}`);
  lines.push(`Freight: ${fmtCurrency(full.freight, full.freight_currency)}`);
  lines.push(`Total weight: ${full.weight_kg} kg`);
  lines.push(`Bag count: ${full.bag_count}`);
  lines.push("");
  if ((full.bags || []).length) {
    lines.push("BAGS · PER-CARRIER");
    lines.push("BAG ID  | WEIGHT |  CARRIER              | CONTENTS");
    lines.push("──────────────────────────────────────────────────────");
    for (const b of full.bags!) {
      const carrier =
        (b.carrier_party_id && partyMap[b.carrier_party_id]?.name) ||
        partyMap[full.carrier_party_id || ""]?.name ||
        "—";
      lines.push(
        `${(b.id || "").slice(0, 6).padEnd(7)} | ${String(b.weight_kg ?? 0).padStart(5)}kg | ${carrier.slice(0, 20).padEnd(21)} | ${b.contents || "—"}`,
      );
    }
    lines.push("");
  }
  if (full.notes) {
    lines.push("NOTES");
    lines.push(full.notes);
  }
  await Share.share(
    { title: `Manifest — ${full.consignment_no}`, message: lines.join("\n") },
    { dialogTitle: `Share manifest for ${full.consignment_no}` },
  );
}

export async function runInvoicePdf(
  inv: Invoice,
  partyMap: Record<string, Party>,
): Promise<void> {
  const party = partyMap[inv.party_id];
  const cur = inv.currency || "INR";
  const sub = inv.items.reduce(
    (s, it) => s + Number(it.quantity ?? 0) * Number(it.rate ?? 0),
    0,
  );
  const tax = sub * (Number(inv.tax_percent ?? 0) / 100);
  const total = sub + tax;
  const lines: string[] = [];
  lines.push(`INVOICE ${inv.number}`);
  lines.push(`Date: ${longDate(inv.date)}`);
  if (inv.due_date) lines.push(`Due: ${longDate(inv.due_date)}`);
  lines.push(`Status: ${(inv.status || "draft").toUpperCase()}`);
  lines.push("─────────────────────────────────────────");
  lines.push(`Bill To: ${party?.name || inv.party_id}`);
  if (party?.address) lines.push(`Address: ${party.address}`);
  if (party?.phone) lines.push(`Phone: ${party.phone}`);
  if (party?.gstin) lines.push(`GSTIN: ${party.gstin}`);
  lines.push("");
  lines.push("DESCRIPTION                       |  QTY |    RATE |    AMOUNT");
  lines.push("───────────────────────────────────────────────────────────────");
  for (const it of inv.items) {
    const amt = Number(it.quantity ?? 0) * Number(it.rate ?? 0);
    lines.push(
      `${(it.description || "").slice(0, 32).padEnd(33)} | ${String(it.quantity ?? 0).padStart(4)} | ${fmtCurrency(it.rate, cur).padStart(8)} | ${fmtCurrency(amt, cur).padStart(10)}`,
    );
  }
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push(`Subtotal:  ${fmtCurrency(sub, cur)}`);
  if (inv.tax_percent) lines.push(`Tax (${inv.tax_percent}%):  ${fmtCurrency(tax, cur)}`);
  lines.push(`GRAND TOTAL:  ${fmtCurrency(total, cur)}`);
  if (inv.notes) {
    lines.push("");
    lines.push(`Notes: ${inv.notes}`);
  }
  await Share.share(
    { title: `Invoice ${inv.number}`, message: lines.join("\n") },
    { dialogTitle: `Share invoice ${inv.number}` },
  );
}
