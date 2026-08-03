import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Download LogiOp Pro Android APK",
  description: "Download the LogiOp Pro Android app APK",
};

export default function DownloadPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="font-display text-3xl tracking-tight">Download Android app</h1>
      <p className="mt-3 text-[var(--muted)]">
        LogiOp Pro for Android — works offline in Demo mode (no server needed).
      </p>

      <a
        href="/downloads/LogiOp-Pro.apk"
        className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-[var(--accent)] px-5 py-4 text-lg font-semibold text-white hover:bg-[var(--accent-hover)]"
        download
      >
        Download LogiOp-Pro.apk
      </a>

      <div className="mt-8 space-y-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 text-sm leading-relaxed">
        <p className="font-semibold">How to install (beginner):</p>
        <ol className="list-decimal space-y-2 pl-5 text-[var(--muted)]">
          <li>On your Android phone, open this page and tap Download.</li>
          <li>If Chrome warns “file may be harmful”, tap <strong>Download anyway</strong>.</li>
          <li>Open the downloaded file.</li>
          <li>If asked, allow <strong>Install unknown apps</strong> for Chrome/Files.</li>
          <li>Tap Install → Open.</li>
          <li>App opens with Demo mode ON — sample ledger & bags ready to explore.</li>
        </ol>
      </div>

      <p className="mt-6 text-sm text-[var(--muted)]">
        <Link href="/" className="text-[var(--accent)]">
          ← Back to web app
        </Link>
      </p>
    </div>
  );
}
