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
import { apiPatch } from "@/lib/client-api";
import { FileDown, Mail, MessageCircle, Share2 } from "lucide-react";
import { format } from "date-fns";

function phoneToWhatsApp(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function LedgerStatementModal({
  open,
  onClose,
  party,
  entries,
  onMarkedShared,
}: {
  open: boolean;
  onClose: () => void;
  party: StatementParty & { id: string };
  entries: StatementEntry[];
  onMarkedShared?: (until: string) => void;
}) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [askMark, setAskMark] = useState(false);
  const [markUntil, setMarkUntil] = useState(todayISO());
  const [marking, setMarking] = useState(false);

  const options = useMemo(
    () => ({
      party,
      entries,
      fromDate: fromDate || null,
      toDate: toDate || null,
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

  function afterPdfSent() {
    setAskMark(true);
    setMarkUntil(toDate || todayISO());
  }

  async function download() {
    setBusy(true);
    setHint(null);
    try {
      const name = downloadLedgerStatement(options);
      setHint(`Saved ${name}`);
      afterPdfSent();
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
        afterPdfSent();
      } else {
        downloadLedgerStatement(options);
        setHint("Share not supported here — PDF downloaded instead.");
        afterPdfSent();
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
        `Namaste ${party.name},\n\nPlease find your account statement.\n\n${summary}`
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
      afterPdfSent();
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
      afterPdfSent();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Email share failed");
    } finally {
      setBusy(false);
    }
  }

  async function confirmMarkShared() {
    if (!markUntil) return;
    setMarking(true);
    try {
      await apiPatch(`/api/parties/${party.id}`, {
        booksSharedUntil: markUntil,
      });
      onMarkedShared?.(markUntil);
      setAskMark(false);
      setHint(
        `Marked: books discussed till ${format(new Date(markUntil), "dd MMM yyyy")}`
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to mark");
    } finally {
      setMarking(false);
    }
  }

  function handleClose() {
    setAskMark(false);
    setHint(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Send PDF statement" wide>
      <p className="mb-4 text-sm text-[var(--muted)]">
        Statement for{" "}
        <strong className="text-[var(--ink)]">{party.name}</strong>. Exchange rate
        appears only on entries where currency was converted (e.g. entered THB,
        saved as INR).
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

      {askMark && (
        <div className="mt-4 rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] p-4">
          <div className="font-medium text-[var(--accent-ink)]">
            Mark books as shared?
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Reminder for yourself: bookkeeping discussed with this party up to
            this date.
          </p>
          <div className="mt-3 max-w-xs">
            <Input
              label="Shared till"
              type="date"
              value={markUntil}
              onChange={(e) => setMarkUntil(e.target.value)}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={confirmMarkShared} disabled={marking || !markUntil}>
              {marking ? "Saving…" : "Yes, mark till this date"}
            </Button>
            <Button variant="ghost" onClick={() => setAskMark(false)}>
              Skip
            </Button>
          </div>
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <Button variant="ghost" onClick={handleClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
