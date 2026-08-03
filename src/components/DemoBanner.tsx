"use client";

import { useEffect, useState } from "react";
import {
  getDemoMode,
  setDemoMode,
  resetDemoData,
} from "@/lib/client-api";

export function DemoBanner() {
  const [demo, setDemo] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDemo(getDemoMode());
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <div
      className={`border-b px-4 py-2 text-sm lg:px-8 ${
        demo
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-emerald-200 bg-emerald-50 text-emerald-900"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          {demo ? (
            <>
              <strong>Demo mode ON</strong> — sample data, works without a
              database. Safe to explore.
            </>
          ) : (
            <>
              <strong>Live server mode</strong> — using your database API.
            </>
          )}
        </span>
        <div className="flex flex-wrap gap-2">
          {demo && (
            <button
              className="rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium"
              onClick={() => {
                resetDemoData();
                window.location.reload();
              }}
            >
              Reset demo data
            </button>
          )}
          <button
            className="rounded-md border border-current/20 bg-white px-2.5 py-1 text-xs font-medium"
            onClick={() => {
              setDemoMode(!demo);
              window.location.reload();
            }}
          >
            {demo ? "Switch to live server" : "Switch to demo mode"}
          </button>
        </div>
      </div>
    </div>
  );
}
