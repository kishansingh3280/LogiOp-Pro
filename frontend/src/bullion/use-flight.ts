import { useEffect, useState } from "react";

import { fetchFlight, type FlightSnapshot } from "./api-flight";

/**
 * React hook that resolves an AviationStack flight snapshot for the given
 * IATA flight code (e.g. `TG317`). Handles polling and mount guarding.
 */
export function useFlight(
  flightIata?: string | null,
  hint?: { fromIata?: string; toIata?: string; date?: string },
  { pollMs }: { pollMs?: number } = {},
): { data: FlightSnapshot | null; loading: boolean; error: string | null; refresh: () => void } {
  const [data, setData] = useState<FlightSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!flightIata) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchFlight(flightIata, hint)
      .then((snap) => {
        if (!cancelled) setData(snap);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    let interval: ReturnType<typeof setInterval> | null = null;
    if (pollMs && pollMs > 0) {
      interval = setInterval(() => setRefreshKey((k) => k + 1), pollMs);
    }
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flightIata, refreshKey, hint?.fromIata, hint?.toIata, hint?.date, pollMs]);

  return { data, loading, error, refresh: () => setRefreshKey((k) => k + 1) };
}
