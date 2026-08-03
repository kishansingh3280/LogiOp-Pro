"use client";

import { useMemo, useState } from "react";
import { Button, Input, Modal } from "@/components/ui";
import {
  buildStatementSummaryText,
  downloadLedgerStatement,
  getLedgerStatementBlob,
  type StatementEntry,
  type StatementParty,
} from "@/lib/ledger-statement-pdf";
import { FileDown, Mail, MessageCircle, Share2 } from "lucide-react";

function phoneToWhatsApp(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits;
}

export function LedgerStatementModal({
  open,
  onClose,
  party,
  entries,
}: {
  open: boolean;
  onClose: () => void;
  party: StatementParty;
  entries: StatementEntry[];
}) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const options = useMemo(
    () => ({
      party,
      entries,
      fromDate: fromDate || null,
      toDate: toDate || null,
      businessNote:
        "India ↔ Thailand cargo & FX ledger. Debit increases receivable; credit reduces it.",
    }),
    [party, entries, fromDate, toDate]
  );

  const filteredCount = useMemo(() => {
    return entries.filter((e) => {
      const d = e.entryDate.slice(0, 10);
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    }).length;
  }, [entries, fromDate, toDate]);

  async function download() {
    setBusy(true);
    setHint(null);
    try {
      const name = downloadLedgerStatement(options);
      setHint(`Saved ${name}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to create PDF");
    } finally {
      setBusy(false);
    }
  }

  async function shareNative() {
    setBusy(true);
    setHint(null);
    try {
      const { blob, fileName } = await getLedgerStatementBlob(options);
      const file = new File([blob], fileName, { type: "application/pdf" });
      const summary = buildStatementSummaryText(options);
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Statement — ${party.name}`,
          text: summary,
        });
        setHint("Shared");
      } else {
        downloadLedgerStatement(options);
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
    setBusy(true);
    setHint(null);
    try {
      downloadLedgerStatement(options);
      const summary = buildStatementSummaryText(options);
      const wa = party.phone ? phoneToWhatsApp(party.phone) : null;
      const text = encodeURIComponent(
        `Namaste ${party.name},\n\nPlease find your account statement from LogiOp Pro.\n\n${summary}`
      );
      if (wa) {
        window.open(`https://wa.me/${wa}?text=${text}`, "_blank");
        setHint(
          "PDF downloaded — attach that file in the WhatsApp chat that opened."
        );
      } else {
        window.open(`https://wa.me/?text=${text}`, "_blank");
        setHint(
          "No phone on this party. PDF downloaded — pick the chat and attach the file."
        );
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "WhatsApp share failed");
    } finally {
      setBusy(false);
    }
  }

  async function sendEmail() {
    setBusy(true);
    setHint(null);
    try {
      downloadLedgerStatement(options);
      const summary = buildStatementSummaryText(options);
      const subject = encodeURIComponent(`Account statement — ${party.name}`);
      const body = encodeURIComponent(
        `${summary}\n\n(Please attach the downloaded PDF before sending.)`
      );
      const to = party.email ? encodeURIComponent(party.email) : "";
      window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
      setHint("PDF downloaded — attach it in your email draft.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Email share failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Send PDF statement" wide>
      <p className="mb-4 text-sm text-[var(--muted)]">
        Clean account statement for <strong className="text-[var(--ink)]">{party.name}</strong>{" "}
        — debit / credit, dual-currency closing balance, and running balance per
        currency.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="From date (optional)"
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />
        <Input
          label="To date (optional)"
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">
        {filteredCount} entr{filteredCount === 1 ? "y" : "ies"} in this period
        {party.phone ? ` · WhatsApp: ${party.phone}` : " · No phone on file"}
        {party.email ? ` · Email: ${party.email}` : ""}
      </p>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Button onClick={download} disabled={busy}>
          <FileDown className="h-4 w-4" />
          Download PDF
        </Button>
        <Button variant="secondary" onClick={shareNative} disabled={busy}>
          <Share2 className="h-4 w-4" />
          Share…
        </Button>
        <Button variant="secondary" onClick={sendWhatsApp} disabled={busy}>
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </Button>
        <Button variant="secondary" onClick={sendEmail} disabled={busy}>
          <Mail className="h-4 w-4" />
          Email
        </Button>
      </div>

      {hint && (
        <p className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--muted)]">
          {hint}
        </p>
      )}

      <div className="mt-5 flex justify-end">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
