import { Suspense } from "react";
import NewTransportPage from "./NewTransportClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="text-[var(--muted)]">Loading…</div>}>
      <NewTransportPage />
    </Suspense>
  );
}
