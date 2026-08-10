/**
 * Query-invalidation bus — simple pub/sub so any component can trigger
 * a global refresh after a mutation (create/edit/delete of a shipment,
 * ledger entry, invoice, trip, etc). Every `useApi(...)`-backed hook
 * subscribes and refetches when it sees a bump.
 *
 * Usage:
 *   import { invalidateAll } from "@/src/api/invalidation";
 *   after POST/PUT/DELETE succeeded → invalidateAll();
 *
 *   // Inside a hook that owns cached data:
 *   const gen = useInvalidationGen();
 *   useEffect(() => { refetch(); }, [gen]);
 */
import { useEffect, useState } from "react";

type Listener = () => void;
const listeners = new Set<Listener>();
let generation = 0;

/** Bump the generation counter and notify every subscribed hook. */
export function invalidateAll(): void {
  generation += 1;
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      /* ignore listener errors — shouldn't break the bus */
    }
  });
}

export function getInvalidationGen(): number {
  return generation;
}

/** React hook that returns a re-render-triggering counter. */
export function useInvalidationGen(): number {
  const [gen, setGen] = useState(generation);
  useEffect(() => {
    const l: Listener = () => setGen(generation);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return gen;
}
