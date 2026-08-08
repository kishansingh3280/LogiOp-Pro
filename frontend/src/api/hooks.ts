import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import { apiGet } from "./client";

interface ApiError extends Error {
  status?: number;
}

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(!!path);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const res = await apiGet<T>(path);
      setData(res);
    } catch (e) {
      const err = e as ApiError;
      setError(err.message);
      if (typeof err.status === "number") setStatus(err.status);
      // On a hard 404 we deliberately drop stale data so the UI cannot
      // silently keep showing a record that no longer exists on the
      // server — this was the root of the "Invoice not found" trap after
      // the data reset.
      if (err.status === 404) setData(null);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    // Reset every field when the path changes so we never render another
    // record's data during the loading transition.
    setData(null);
    setError(null);
    setStatus(null);
    setLoading(!!path);
    if (!path) return;
    refresh();
  }, [path, refresh]);

  // Auto-refresh when screen regains focus (returning from create screens).
  useFocusEffect(
    useCallback(() => {
      if (path) refresh();
    }, [path, refresh]),
  );

  return { data, loading, error, status, refresh, setData };
}
