import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import { apiGet } from "./client";

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(!!path);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<T>(path);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    if (!path) return;
    refresh();
  }, [path, refresh]);

  // Auto-refresh when screen regains focus (returning from create screens).
  useFocusEffect(
    useCallback(() => {
      if (path) refresh();
    }, [path, refresh]),
  );

  return { data, loading, error, refresh, setData };
}
