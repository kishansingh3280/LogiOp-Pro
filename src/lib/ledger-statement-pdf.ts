import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { format } from "date-fns";
import {
  computeBalance,
  formatBalanceLabel,
  PARTY_TYPE_LABELS,
  type Currency,
} from "@/lib/utils";

export type StatementEntry = {
  id: string;
  direction: "YOU_GAVE" | "YOU_GOT";
  amount: number;
  currency: Currency;
  description: string | null;
  entryDate: string;
  /** Present only when entry was converted (entered currency ≠ saved currency). */
  fxRate?: number | null;
  fxAmount?: number | null;
  fxCurrency?: Currency | null;
};

export type StatementParty = {
  id: string;
  name: string;
  type: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  country?: string | null;
  defaultCurrency?: Currency;
};

export type StatementOptions = {
  party: StatementParty;
  entries: StatementEntry[];
  fromDate?: string | null;
  toDate?: string | null;
};

type Totals = Record<Currency, { gave: number; got: number }>;

function emptyTotals(): Totals {
  return {
    INR: { gave: 0, got: 0 },
    THB: { gave: 0, got: 0 },
  };
}

function moneyPlain(amount: number, currency: Currency): string {
  const symbol = currency === "INR" ? "Rs." : "THB ";
  return `${symbol}${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** True only when the entry was saved in a different currency than entered. */
function wasCurrencyConverted(e: StatementEntry): boolean {
  return (
    e.fxAmount != null &&
    e.fxCurrency != null &&
    e.fxCurrency !== e.currency
  );
}

function conversionNote(e: StatementEntry): string | null {
  if (!wasCurrencyConverted(e) || e.fxAmount == null || e.fxCurrency == null) {
    return null;
  }
  const amount = e.fxAmount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const cur = e.fxCurrency;
  if (e.fxRate != null) {
    return `${cur} ${amount} @ ${e.fxRate}`;
  }
  return `${cur} ${amount}`;
}

function filterEntries(
  entries: StatementEntry[],
  fromDate?: string | null,
  toDate?: string | null
): StatementEntry[] {
  return [...entries]
    .filter((e) => {
      const d = e.entryDate.slice(0, 10);
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    })
    .sort(
      (a, b) =>
        new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
    );
}

function computeTotals(entries: StatementEntry[]): Totals {
  const totals = emptyTotals();
  for (const e of entries) {
    if (e.direction === "YOU_GAVE") totals[e.currency].gave += e.amount;
    else totals[e.currency].got += e.amount;
  }
  return totals;
}

function periodLabel(fromDate?: string | null, toDate?: string | null): string {
  if (fromDate && toDate) {
    return `${format(new Date(fromDate), "dd MMM yyyy")} – ${format(
      new Date(toDate),
      "dd MMM yyyy"
    )}`;
  }
  if (fromDate) return `From ${format(new Date(fromDate), "dd MMM yyyy")}`;
  if (toDate) return `Until ${format(new Date(toDate), "dd MMM yyyy")}`;
  return "All entries";
}

function balanceWords(balance: number, currency: Currency): string {
  const abs = Math.abs(balance);
  if (Math.abs(balance) < 0.005) return `Settled (${moneyPlain(0, currency)})`;
  if (balance > 0) return `To receive ${moneyPlain(abs, currency)}`;
  return `To pay ${moneyPlain(abs, currency)}`;
}

export function statementFileName(partyName: string): string {
  const safe = partyName.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_");
  return `Statement_${safe}_${format(new Date(), "yyyyMMdd")}.pdf`;
}

export function buildStatementSummaryText(options: StatementOptions): string {
  const entries = filterEntries(
    options.entries,
    options.fromDate,
    options.toDate
  );
  const totals = computeTotals(entries);
  return [
    `Account statement — ${options.party.name}`,
    `Period: ${periodLabel(options.fromDate, options.toDate)}`,
    `INR: ${formatBalanceLabel(
      computeBalance(totals.INR.gave, totals.INR.got),
      "INR"
    )}`,
    `THB: ${formatBalanceLabel(
      computeBalance(totals.THB.gave, totals.THB.got),
      "THB"
    )}`,
  ].join("\n");
}

/** Simple dual-currency account statement PDF (no app branding, no FX notes). */
export function buildLedgerStatementPdf(options: StatementOptions): jsPDF {
  const entries = filterEntries(
    options.entries,
    options.fromDate,
    options.toDate
  );
  const totals = computeTotals(entries);
  const generatedAt = format(new Date(), "dd MMM yyyy");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header
  doc.setFillColor(20, 48, 48);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Account Statement", margin, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(generatedAt, pageW - margin, 10, { align: "right" });
  doc.text(periodLabel(options.fromDate, options.toDate), pageW - margin, 16, {
    align: "right",
  });

  let y = 32;

  // Party
  doc.setTextColor(20, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(options.party.name, margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(90, 100, 100);
  const meta: string[] = [];
  if (options.party.type) {
    meta.push(PARTY_TYPE_LABELS[options.party.type] || options.party.type);
  }
  const loc = [options.party.city, options.party.country]
    .filter(Boolean)
    .join(", ");
  if (loc) meta.push(loc);
  if (options.party.phone) meta.push(options.party.phone);
  if (meta.length) {
    doc.text(meta.join("  ·  "), margin, y);
    y += 8;
  } else {
    y += 4;
  }

  // Closing balance box
  const inrBal = computeBalance(totals.INR.gave, totals.INR.got);
  const thbBal = computeBalance(totals.THB.gave, totals.THB.got);

  doc.setDrawColor(220, 225, 225);
  doc.setFillColor(247, 249, 248);
  doc.roundedRect(margin, y, pageW - margin * 2, 22, 2, 2, "FD");

  doc.setTextColor(20, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Balance", margin + 4, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`INR  ${balanceWords(inrBal, "INR")}`, margin + 4, y + 15);
  doc.text(`THB  ${balanceWords(thbBal, "THB")}`, pageW / 2 + 2, y + 15);

  y += 28;

  doc.setTextColor(110, 120, 120);
  doc.setFontSize(7);
  doc.text(
    "Debit = given / paid.  Credit = received.  Exchange rate shown only when currency was converted.",
    margin,
    y
  );
  y += 5;

  const run: Totals = emptyTotals();
  const body = entries.map((e) => {
    if (e.direction === "YOU_GAVE") run[e.currency].gave += e.amount;
    else run[e.currency].got += e.amount;
    const bal = computeBalance(run[e.currency].gave, run[e.currency].got);
    const note = conversionNote(e);
    const desc = e.description?.trim();
    const particulars =
      desc && note ? `${desc} — ${note}` : desc || note || "—";
    return [
      format(new Date(e.entryDate), "dd MMM yy"),
      particulars,
      e.currency,
      e.direction === "YOU_GAVE" ? moneyPlain(e.amount, e.currency) : "",
      e.direction === "YOU_GOT" ? moneyPlain(e.amount, e.currency) : "",
      moneyPlain(Math.abs(bal), e.currency) +
        (Math.abs(bal) < 0.005 ? "" : bal > 0 ? " Dr" : " Cr"),
    ];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Date", "Particulars", "Cur", "Debit", "Credit", "Balance"]],
    body:
      body.length > 0
        ? body
        : [["—", "No entries in this period", "", "", "", ""]],
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [30, 40, 40],
      lineColor: [220, 225, 225],
      lineWidth: 0.2,
      valign: "middle",
    },
    headStyles: {
      fillColor: [20, 48, 48],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [250, 251, 250],
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 12, halign: "center" },
      3: { cellWidth: 28, halign: "right" },
      4: { cellWidth: 28, halign: "right" },
      5: { cellWidth: 30, halign: "right" },
    },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setTextColor(140, 150, 150);
      doc.text("Account statement", margin, pageH - 8);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageW - margin,
        pageH - 8,
        { align: "right" }
      );
    },
  });

  const finalY =
    (
      doc as unknown as {
        lastAutoTable?: { finalY: number };
      }
    ).lastAutoTable?.finalY ?? y;
  let footerY = finalY + 8;
  const pageH = doc.internal.pageSize.getHeight();
  if (footerY > pageH - 20) {
    doc.addPage();
    footerY = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(20, 40, 40);
  doc.text(
    `Closing — INR: ${balanceWords(inrBal, "INR")}   |   THB: ${balanceWords(
      thbBal,
      "THB"
    )}`,
    margin,
    footerY
  );

  return doc;
}

export function downloadLedgerStatement(options: StatementOptions): string {
  const doc = buildLedgerStatementPdf(options);
  const fileName = statementFileName(options.party.name);
  doc.save(fileName);
  return fileName;
}

export async function getLedgerStatementBlob(
  options: StatementOptions
): Promise<{ blob: Blob; fileName: string }> {
  const doc = buildLedgerStatementPdf(options);
  const fileName = statementFileName(options.party.name);
  const blob = doc.output("blob");
  return { blob, fileName };
}
