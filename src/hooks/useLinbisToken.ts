import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Hook that manages the Linbis access token with:
 * 1. Initial fetch on mount
 * 2. Periodic refresh every REFRESH_INTERVAL_MS (proactive, before expiry)
 * 3. Refresh on visibility change (user returns to tab after being away)
 * 4. Manual refresh function (reactive, for 401 retry) with shared in-flight promise
 */

const REFRESH_INTERVAL_MS = 45 * 60 * 1000; // 45 minutes
export const LINBIS_TOKEN_STALE_MS = 30 * 60 * 1000; // 30 minutes — consider token stale after this

export function useLinbisToken() {
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedAt = useRef<number>(0);
  const tokenRef = useRef("");
  const inflightPromise = useRef<Promise<string> | null>(null);

  const fetchToken = useCallback(async (isInitial = false): Promise<string> => {
    if (inflightPromise.current && !isInitial) {
      return inflightPromise.current;
    }

    const promise = (async () => {
      try {
        const response = await fetch("/api/linbis-token");
        if (!response.ok) {
          throw new Error("No se pudo obtener el token de Linbis");
        }
        const data = await response.json();
        tokenRef.current = data.token;
        setAccessToken(data.token);
        setError(null);
        lastFetchedAt.current = Date.now();
        return data.token as string;
      } catch (err) {
        console.error("Error obteniendo token de Linbis:", err);
        const message = err instanceof Error ? err.message : "Error desconocido";
        setError(message);
        throw err;
      } finally {
        inflightPromise.current = null;
      }
    })();

    inflightPromise.current = promise;
    return promise;
  }, []);

  /**
   * Call this when a Linbis API call returns 401.
   * Concurrent callers share the same in-flight refresh promise.
   */
  const refreshAccessToken = useCallback(async (): Promise<string> => {
    return fetchToken(false);
  }, [fetchToken]);

  /** Age of the current token in ms (Infinity if never fetched). */
  const getTokenAgeMs = useCallback((): number => {
    if (!lastFetchedAt.current) return Number.POSITIVE_INFINITY;
    return Date.now() - lastFetchedAt.current;
  }, []);

  /**
   * Ensure token is fresh before a long-running Linbis batch.
   * Refreshes when stale or when force=true.
   */
  const ensureFreshToken = useCallback(
    async (force = false): Promise<string> => {
      if (
        force ||
        !tokenRef.current ||
        getTokenAgeMs() >= LINBIS_TOKEN_STALE_MS
      ) {
        return fetchToken(false);
      }
      return tokenRef.current;
    },
    [fetchToken, getTokenAgeMs],
  );

  // Initial fetch
  useEffect(() => {
    const init = async () => {
      const startTime = Date.now();
      try {
        await fetchToken(true);
      } finally {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, 500 - elapsedTime);
        setTimeout(() => setLoading(false), remainingTime);
      }
    };
    init();
  }, [fetchToken]);

  // Periodic refresh (proactive — every 45 min)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log("[useLinbisToken] Proactive token refresh");
      fetchToken(false).catch(() => {
        // Silently handle — the error state is already set
      });
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchToken]);

  // Refresh on visibility change (user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const elapsed = Date.now() - lastFetchedAt.current;
        if (elapsed >= LINBIS_TOKEN_STALE_MS) {
          console.log(
            `[useLinbisToken] Tab visible after ${Math.round(elapsed / 60000)}min — refreshing token`,
          );
          fetchToken(false).catch(() => {});
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchToken]);

  return {
    accessToken,
    loading,
    error,
    refreshAccessToken,
    ensureFreshToken,
    getTokenAgeMs,
  };
}
