import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { format } from "date-fns";
import { BAG_STATUS_LABELS, formatMoney, type Currency } from "@/lib/utils";

export type PackingListBag = {
  bagNumber: string;
  weightKg: number | null;
  status: string;
  customerName: string | null;
  shippingCharge?: number | null;
  items: Array<{ name: string; quantity: number; unit?: string }>;
  description?: string | null;
};

export type PackingListShipment = {
  lotNumber: string;
  batchNumber?: string | null;
  direction: string;
  shipDate?: string | null;
  notes?: string | null;
  originCity?: string | null;
  destCity?: string | null;
  ownerName?: string | null;
  shippingCurrency?: Currency;
  shippingChargeTotal?: number | null;
  bags: PackingListBag[];
};

export type PackingListOptions = {
  shipment: PackingListShipment;
  /** Who the PDF is addressed to (goods owner / customer) */
  recipientName: string;
  recipientPhone?: string | null;
  recipientEmail?: string | null;
};

function moneyPlain(amount: number, currency: Currency): string {
  const symbol = currency === "INR" ? "Rs." : "THB ";
  return `${symbol}${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function buildPackingListPdf(options: PackingListOptions) {
  const { shipment, recipientName, recipientPhone, recipientEmail } = options;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 14;
  const pageW = doc.internal.pageSize.getWidth();
  let y = 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 40, 40);
  doc.text("Packing list", margin, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 70, 70);
  doc.text(`Lot ${shipment.lotNumber}`, margin, y);
  if (shipment.batchNumber) {
    doc.text(`Batch ${shipment.batchNumber}`, margin + 55, y);
  }
  y += 5;

  const route = `${shipment.originCity || "?"} → ${shipment.destCity || "?"}`;
  const dir =
    shipment.direction === "IN_TO_TH" ? "India → Thailand" : "Thailand → India";
  doc.text(`${dir} · ${route}`, margin, y);
  y += 5;

  if (shipment.shipDate) {
    doc.text(
      `Ship date: ${format(new Date(shipment.shipDate), "dd MMM yyyy")}`,
      margin,
      y
    );
    y += 5;
  }

  y += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("For", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(recipientName, margin + 12, y);
  y += 5;
  const contact = [recipientPhone, recipientEmail].filter(Boolean).join(" · ");
  if (contact) {
    doc.setFontSize(9);
    doc.setTextColor(100, 110, 110);
    doc.text(contact, margin, y);
    y += 5;
    doc.setTextColor(60, 70, 70);
  }
  if (shipment.ownerName && shipment.ownerName !== recipientName) {
    doc.setFontSize(9);
    doc.text(`Goods owner: ${shipment.ownerName}`, margin, y);
    y += 5;
  }

  const totalWeight = shipment.bags.reduce(
    (s, b) => s + (b.weightKg != null ? b.weightKg : 0),
    0
  );

  y += 2;
  doc.setFontSize(9);
  doc.text(
    `${shipment.bags.length} bag${shipment.bags.length === 1 ? "" : "s"} · Total weight ${totalWeight.toLocaleString(
      "en-IN",
      { maximumFractionDigits: 2 }
    )} kg`,
    margin,
    y
  );
  if (shipment.shippingChargeTotal != null) {
    doc.text(
      `Shipping: ${moneyPlain(
        shipment.shippingChargeTotal,
        shipment.shippingCurrency || "INR"
      )}`,
      pageW - margin,
      y,
      { align: "right" }
    );
  }
  y += 4;

  const body = shipment.bags.map((b) => {
    const items =
      b.items.length > 0
        ? b.items
            .map((it) => `${it.name} x ${it.quantity} ${it.unit || "pcs"}`)
            .join("; ")
        : b.description || "—";
    return [
      `#${b.bagNumber}`,
      b.weightKg != null ? `${b.weightKg} kg` : "—",
      items,
      b.customerName || "—",
      BAG_STATUS_LABELS[b.status] || b.status,
    ];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Bag", "Weight", "Contents", "Deliver to", "Status"]],
    body: body.length > 0 ? body : [["—", "—", "No bags", "—", "—"]],
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [30, 40, 40],
      lineColor: [220, 225, 225],
      lineWidth: 0.2,
      valign: "top",
    },
    headStyles: {
      fillColor: [20, 48, 48],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [250, 251, 250] },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 20 },
      2: { cellWidth: "auto" },
      3: { cellWidth: 36 },
      4: { cellWidth: 24 },
    },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setTextColor(140, 150, 150);
      doc.text(`Packing list · Lot ${shipment.lotNumber}`, margin, pageH - 8);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageW - margin,
        pageH - 8,
        { align: "right" }
      );
    },
  });

  if (shipment.notes) {
    const finalY =
      (
        doc as unknown as {
          lastAutoTable?: { finalY: number };
        }
      ).lastAutoTable?.finalY ?? y;
    let notesY = finalY + 8;
    const pageH = doc.internal.pageSize.getHeight();
    if (notesY > pageH - 24) {
      doc.addPage();
      notesY = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(20, 40, 40);
    doc.text("Notes", margin, notesY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(60, 70, 70);
    const lines = doc.splitTextToSize(shipment.notes, pageW - margin * 2);
    doc.text(lines, margin, notesY + 5);
  }

  return doc;
}

export function packingListFileName(lotNumber: string) {
  return `packing-list-${lotNumber}.pdf`;
}

export function downloadPackingList(options: PackingListOptions) {
  const doc = buildPackingListPdf(options);
  const name = packingListFileName(options.shipment.lotNumber);
  doc.save(name);
  return name;
}

export async function getPackingListBlob(options: PackingListOptions) {
  const doc = buildPackingListPdf(options);
  const fileName = packingListFileName(options.shipment.lotNumber);
  const blob = doc.output("blob");
  return { blob, fileName };
}

export function buildPackingListSummaryText(options: PackingListOptions) {
  const { shipment, recipientName } = options;
  const weight = shipment.bags.reduce(
    (s, b) => s + (b.weightKg != null ? b.weightKg : 0),
    0
  );
  const ship =
    shipment.shippingChargeTotal != null
      ? ` · Shipping ${formatMoney(
          shipment.shippingChargeTotal,
          shipment.shippingCurrency || "INR"
        )}`
      : "";
  return `Packing list for ${recipientName} — Lot ${shipment.lotNumber}: ${shipment.bags.length} bags, ${weight} kg${ship}.`;
}
