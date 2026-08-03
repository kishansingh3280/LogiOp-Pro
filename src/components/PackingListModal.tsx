"use client";

import { useMemo, useState } from "react";
import { Button, Modal, Select } from "@/components/ui";
import {
  buildPackingListSummaryText,
  downloadPackingList,
  getPackingListBlob,
  type PackingListOptions,
  type PackingListShipment,
} from "@/lib/packing-list-pdf";
import { FileDown, Mail, MessageCircle, Share2 } from "lucide-react";

function phoneToWhatsApp(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits;
}

type Recipient = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  role: string;
};

export function PackingListModal({
  open,
  onClose,
  shipment,
  recipients,
}: {
  open: boolean;
  onClose: () => void;
  shipment: PackingListShipment;
  recipients: Recipient[];
}) {
  const [recipientId, setRecipientId] = useState(recipients[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const recipient = useMemo(
    () => recipients.find((r) => r.id === recipientId) || recipients[0],
    [recipients, recipientId]
  );

  const options: PackingListOptions | null = useMemo(() => {
    if (!recipient) return null;
    return {
      shipment,
      recipientName: recipient.name,
      recipientPhone: recipient.phone,
      recipientEmail: recipient.email,
    };
  }, [shipment, recipient]);

  async function download() {
    if (!options) return;
    setBusy(true);
    setHint(null);
    try {
      const name = downloadPackingList(options);
      setHint(`Saved ${name}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to create PDF");
    } finally {
      setBusy(false);
    }
  }

  async function shareNative() {
    if (!options || !recipient) return;
    setBusy(true);
    setHint(null);
    try {
      const { blob, fileName } = await getPackingListBlob(options);
      const file = new File([blob], fileName, { type: "application/pdf" });
      const summary = buildPackingListSummaryText(options);
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Packing list — Lot ${shipment.lotNumber}`,
          text: summary,
        });
        setHint("Shared");
      } else {
        downloadPackingList(options);
        setHint("Share not supported here — PDF downloaded instead.");
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      alert(e instanceof Error ? e.message : "Share failed");
    } finally {
      setBusy(false);
    }
  }

  async function sendWhatsApp() {
    if (!options || !recipient) return;
    setBusy(true);
    setHint(null);
    try {
      downloadPackingList(options);
      const summary = buildPackingListSummaryText(options);
      const wa = recipient.phone ? phoneToWhatsApp(recipient.phone) : null;
      const text = encodeURIComponent(
        `Namaste ${recipient.name},\n\nPlease find the packing list for Lot ${shipment.lotNumber}.\n\n${summary}`
      );
      if (wa) {
        window.open(`https://wa.me/${wa}?text=${text}`, "_blank");
        setHint(
          "PDF downloaded — attach that file in the WhatsApp chat that opened."
        );
      } else {
        window.open(`https://wa.me/?text=${text}`, "_blank");
        setHint(
          "No phone on this contact. PDF downloaded — pick the chat and attach the file."
        );
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "WhatsApp share failed");
    } finally {
      setBusy(false);
    }
  }

  async function sendEmail() {
    if (!options || !recipient) return;
    setBusy(true);
    setHint(null);
    try {
      downloadPackingList(options);
      const summary = buildPackingListSummaryText(options);
      const subject = encodeURIComponent(
        `Packing list — Lot ${shipment.lotNumber}`
      );
      const body = encodeURIComponent(
        `Dear ${recipient.name},\n\n${summary}\n\n(Please attach the downloaded PDF before sending.)`
      );
      const to = recipient.email ? encodeURIComponent(recipient.email) : "";
      window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
      setHint("PDF downloaded — attach it in your email draft.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Email share failed");
    } finally {
      setBusy(false);
    }
  }

  function handleClose() {
    setHint(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Packing list PDF" wide>
      <p className="mb-4 text-sm text-[var(--muted)]">
        Download or send a packing list for{" "}
        <strong className="text-[var(--ink)]">Lot {shipment.lotNumber}</strong>{" "}
        ({shipment.bags.length} bags). Customer receives bag contents, weights,
        and deliver-to details.
      </p>

      {recipients.length > 0 ? (
        <Select
          label="Send to"
          value={recipientId || recipients[0].id}
          onChange={(e) => setRecipientId(e.target.value)}
        >
          {recipients.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.role})
              {r.phone ? ` · ${r.phone}` : ""}
            </option>
          ))}
        </Select>
      ) : (
        <p className="text-sm text-red-700">
          No customer on this shipment — add a goods owner or deliver-to party
          first.
        </p>
      )}

      {recipient && (
        <p className="mt-2 text-xs text-[var(--muted)]">
          {recipient.phone
            ? `WhatsApp: ${recipient.phone}`
            : "No phone on file"}
          {recipient.email ? ` · Email: ${recipient.email}` : ""}
        </p>
      )}

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Button onClick={download} disabled={busy || !options}>
          <FileDown className="h-4 w-4" />
          Download PDF
        </Button>
        <Button
          variant="secondary"
          onClick={shareNative}
          disabled={busy || !options}
        >
          <Share2 className="h-4 w-4" />
          Share…
        </Button>
        <Button
          variant="secondary"
          onClick={sendWhatsApp}
          disabled={busy || !options}
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </Button>
        <Button
          variant="secondary"
          onClick={sendEmail}
          disabled={busy || !options}
        >
          <Mail className="h-4 w-4" />
          Email
        </Button>
      </div>

      {hint && (
        <p className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--muted)]">
          {hint}
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <Button variant="ghost" onClick={handleClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
