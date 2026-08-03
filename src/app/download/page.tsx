"use client";

import Link from "next/link";

export default function DownloadPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="font-display text-3xl tracking-tight">Web first</h1>
      <p className="mt-3 text-[var(--muted)] leading-relaxed">
        We are focusing on the <strong>Chrome web app</strong> (PC + phone browser)
        until every feature is perfect. The Android APK will be rebuilt after that.
      </p>

      <Link
        href="/"
        className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-[var(--accent)] px-5 py-4 text-lg font-semibold text-white"
      >
        Open LogiOp Pro web app
      </Link>

      <div className="mt-8 space-y-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 text-sm leading-relaxed text-[var(--muted)]">
        <p className="font-semibold text-[var(--ink)]">How to use on phone</p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Run the app on your PC (`npm run dev`).</li>
          <li>On phone Chrome, open <code>http://YOUR-PC-IP:3000</code>.</li>
          <li>Use bottom tabs just like the Android app.</li>
          <li>Chrome menu → Add to Home screen (optional).</li>
        </ol>
        <p className="pt-2">
          Use <strong>Chrome</strong> or Edge — not Internet Explorer.
        </p>
      </div>
    </div>
  );
}
