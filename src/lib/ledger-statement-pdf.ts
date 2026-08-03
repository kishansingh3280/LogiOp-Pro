import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { format } from "date-fns";
import {
  computeBalance,
  formatBalanceLabel,
  formatMoney,
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
  fxRate: number | null;
  fxAmount: number | null;
  fxCurrency: Currency | null;
  isAutoSynced?: boolean;
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
  businessName?: string;
  businessNote?: string;
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
  if (balance > 0) return `Receivable ${moneyPlain(abs, currency)}`;
  return `Payable ${moneyPlain(abs, currency)}`;
}

export function statementFileName(partyName: string): string {
  const safe = partyName.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_");
  return `LogiOp_Statement_${safe}_${format(new Date(), "yyyyMMdd")}.pdf`;
}

export function buildStatementSummaryText(options: StatementOptions): string {
  const entries = filterEntries(
    options.entries,
    options.fromDate,
    options.toDate
  );
  const totals = computeTotals(entries);
  const lines = [
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
    "",
    "PDF statement attached / shared separately.",
    "— LogiOp Pro",
  ];
  return lines.join("\n");
}

/** Build a clean account-statement PDF (client-side). */
export function buildLedgerStatementPdf(options: StatementOptions): jsPDF {
  const businessName = options.businessName || "LogiOp Pro";
  const entries = filterEntries(
    options.entries,
    options.fromDate,
    options.toDate
  );
  const totals = computeTotals(entries);
  const generatedAt = format(new Date(), "dd MMM yyyy, HH:mm");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header band
  doc.setFillColor(20, 48, 48);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(businessName, margin, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Account Statement", margin, 19);
  doc.setFontSize(8);
  doc.text(`Generated ${generatedAt}`, pageW - margin, 12, { align: "right" });
  doc.text(periodLabel(options.fromDate, options.toDate), pageW - margin, 19, {
    align: "right",
  });

  let y = 36;

  // Party block
  doc.setTextColor(20, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Party", margin, y);
  y += 6;
  doc.setFontSize(14);
  doc.text(options.party.name, margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
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
  if (options.party.email) meta.push(options.party.email);
  if (meta.length) {
    doc.text(meta.join("  ·  "), margin, y);
    y += 7;
  } else {
    y += 2;
  }

  if (options.businessNote) {
    doc.setTextColor(70, 80, 80);
    doc.setFontSize(8);
    const noteLines = doc.splitTextToSize(options.businessNote, pageW - margin * 2);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4 + 2;
  }

  // Summary
  y += 2;
  doc.setDrawColor(220, 225, 225);
  doc.setFillColor(247, 249, 248);
  doc.roundedRect(margin, y, pageW - margin * 2, 28, 2, 2, "FD");

  doc.setTextColor(20, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Closing balance", margin + 4, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const inrBal = computeBalance(totals.INR.gave, totals.INR.got);
  const thbBal = computeBalance(totals.THB.gave, totals.THB.got);

  doc.text(`INR  ${balanceWords(inrBal, "INR")}`, margin + 4, y + 15);
  doc.setTextColor(110, 120, 120);
  doc.setFontSize(8);
  doc.text(
    `Gave ${moneyPlain(totals.INR.gave, "INR")}   ·   Received ${moneyPlain(
      totals.INR.got,
      "INR"
    )}`,
    margin + 4,
    y + 20
  );

  doc.setTextColor(20, 40, 40);
  doc.setFontSize(9);
  doc.text(`THB  ${balanceWords(thbBal, "THB")}`, pageW / 2 + 2, y + 15);
  doc.setTextColor(110, 120, 120);
  doc.setFontSize(8);
  doc.text(
    `Gave ${moneyPlain(totals.THB.gave, "THB")}   ·   Received ${moneyPlain(
      totals.THB.got,
      "THB"
    )}`,
    pageW / 2 + 2,
    y + 20
  );

  y += 34;

  // Legend
  doc.setTextColor(90, 100, 100);
  doc.setFontSize(7.5);
  doc.text(
    "Debit = amount given / paid for this party.   Credit = amount received from this party.   Receivable = they owe you.   Payable = you owe them.",
    margin,
    y
  );
  y += 6;

  // Running balances while building rows
  const run: Totals = emptyTotals();
  const body = entries.map((e) => {
    if (e.direction === "YOU_GAVE") run[e.currency].gave += e.amount;
    else run[e.currency].got += e.amount;
    const bal = computeBalance(run[e.currency].gave, run[e.currency].got);
    const debit =
      e.direction === "YOU_GAVE" ? moneyPlain(e.amount, e.currency) : "";
    const credit =
      e.direction === "YOU_GOT" ? moneyPlain(e.amount, e.currency) : "";
    let particulars = e.description?.trim() || "—";
    if (e.fxAmount != null && e.fxCurrency) {
      particulars += `  (FX ≈ ${moneyPlain(e.fxAmount, e.fxCurrency)}`;
      if (e.fxRate != null) particulars += ` @ ${e.fxRate}`;
      particulars += ")";
    }
    if (e.isAutoSynced) particulars += "  [auto]";
    return [
      format(new Date(e.entryDate), "dd MMM yy"),
      particulars,
      e.currency,
      debit,
      credit,
      moneyPlain(Math.abs(bal), e.currency) +
        (Math.abs(bal) < 0.005 ? " ✓" : bal > 0 ? " Dr" : " Cr"),
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
      doc.setTextColor(130, 140, 140);
      doc.text(
        `${businessName} · Confidential account statement`,
        margin,
        pageH - 8
      );
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageW - margin,
        pageH - 8,
        { align: "right" }
      );
    },
  });

  // Closing note after table
  const finalY =
    (
      doc as unknown as {
        lastAutoTable?: { finalY: number };
      }
    ).lastAutoTable?.finalY ?? y;
  let footerY = finalY + 10;
  const pageH = doc.internal.pageSize.getHeight();
  if (footerY > pageH - 30) {
    doc.addPage();
    footerY = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(20, 40, 40);
  doc.text("Closing summary", margin, footerY);
  footerY += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(60, 70, 70);
  doc.text(
    `INR: ${balanceWords(inrBal, "INR")}    |    THB: ${balanceWords(
      thbBal,
      "THB"
    )}`,
    margin,
    footerY
  );
  footerY += 6;
  doc.setFontSize(7.5);
  doc.setTextColor(120, 130, 130);
  doc.text(
    "This statement is computer-generated from LogiOp Pro ledger entries. Please contact us if any figure looks incorrect.",
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
