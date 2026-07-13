import { useState, useEffect, useRef, useCallback } from "react";
import {
  createTimeoutSignal,
  LINBIS_TOKEN_ENDPOINT_TIMEOUT_MS,
} from "@/services/linbisFetch";

/**
 * Manages the Linbis *access* token for the SPA.
 *
 * Architecture (two different TTLs):
 * - Access token: typically ~1h (from OAuth expires_in). Served by GET /api/linbis-token.
 * - Refresh token: ~24h, renewed by Vercel cron `/api/cron/renew-linbis-token` every 23h.
 *
 * This hook never talks to Linbis OAuth directly — it only asks our backend for a
 * usable access token, shares concurrent refreshes, and times out so the UI never hangs.
 */

/** Fallback proactive refresh when the API does not return expiresAt. */
const FALLBACK_REFRESH_INTERVAL_MS = 45 * 60 * 1000;
/** Consider client copy stale if we have no expiresAt and last fetch older than this. */
export const LINBIS_TOKEN_STALE_MS = 30 * 60 * 1000;
/** Refresh this many ms before server-reported expiry. */
const EXPIRY_SAFETY_MS = 2 * 60 * 1000;

export type LinbisTokenResponse = {
  token: string;
  expiresAt?: number;
  expiresIn?: number;
};

export function useLinbisToken() {
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedAt = useRef<number>(0);
  const expiresAtRef = useRef<number>(0);
  const tokenRef = useRef("");
  const inflightPromise = useRef<Promise<string> | null>(null);

  const applyToken = useCallback((data: LinbisTokenResponse) => {
    tokenRef.current = data.token;
    setAccessToken(data.token);
    setError(null);
    lastFetchedAt.current = Date.now();

    if (typeof data.expiresAt === "number" && data.expiresAt > 0) {
      expiresAtRef.current = data.expiresAt;
    } else if (typeof data.expiresIn === "number" && data.expiresIn > 0) {
      expiresAtRef.current = Date.now() + data.expiresIn * 1000;
    } else {
      // Unknown lifetime — assume ~1h like typical Azure B2C access tokens
      expiresAtRef.current = Date.now() + 60 * 60 * 1000;
    }
  }, []);

  const fetchToken = useCallback(async (): Promise<string> => {
    if (inflightPromise.current) {
      return inflightPromise.current;
    }

    const promise = (async () => {
      try {
        const response = await fetch("/api/linbis-token", {
          signal: createTimeoutSignal(LINBIS_TOKEN_ENDPOINT_TIMEOUT_MS),
        });
        if (!response.ok) {
          throw new Error("No se pudo obtener el token de Linbis");
        }
        const data = (await response.json()) as LinbisTokenResponse;
        if (!data?.token) {
          throw new Error("Respuesta de token Linbis inválida");
        }
        applyToken(data);
        return data.token;
      } catch (err) {
        console.error("Error obteniendo token de Linbis:", err);
        const isTimeout =
          (err instanceof DOMException &&
            (err.name === "AbortError" || err.name === "TimeoutError")) ||
          (err instanceof Error &&
            (err.name === "TimeoutError" || /timeout/i.test(err.message)));
        const message = isTimeout
          ? "Tiempo de espera agotado al obtener el token de Linbis"
          : err instanceof Error
            ? err.message
            : "Error desconocido";
        setError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        inflightPromise.current = null;
      }
    })();

    inflightPromise.current = promise;
    return promise;
  }, [applyToken]);

  /**
   * Call this when a Linbis API call returns 401.
   * Concurrent callers share the same in-flight refresh promise.
   */
  const refreshAccessToken = useCallback(async (): Promise<string> => {
    return fetchToken();
  }, [fetchToken]);

  /** Age of the current token in ms (Infinity if never fetched). */
  const getTokenAgeMs = useCallback((): number => {
    if (!lastFetchedAt.current) return Number.POSITIVE_INFINITY;
    return Date.now() - lastFetchedAt.current;
  }, []);

  const isTokenStale = useCallback((): boolean => {
    if (!tokenRef.current) return true;
    if (expiresAtRef.current > 0) {
      return Date.now() >= expiresAtRef.current - EXPIRY_SAFETY_MS;
    }
    return getTokenAgeMs() >= LINBIS_TOKEN_STALE_MS;
  }, [getTokenAgeMs]);

  /**
   * Ensure token is fresh before a long-running Linbis batch.
   */
  const ensureFreshToken = useCallback(
    async (force = false): Promise<string> => {
      if (force || isTokenStale()) {
        return fetchToken();
      }
      return tokenRef.current;
    },
    [fetchToken, isTokenStale],
  );

  // Initial fetch — always clears loading (never leave the portal stuck)
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const startTime = Date.now();
      try {
        await fetchToken();
      } catch {
        // error state already set
      } finally {
        if (cancelled) return;
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, 500 - elapsedTime);
        setTimeout(() => {
          if (!cancelled) setLoading(false);
        }, remainingTime);
      }
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, [fetchToken]);

  // Proactive refresh based on known expiry (or fallback every 45 min)
  useEffect(() => {
    let timeoutId: number | undefined;

    const scheduleNext = () => {
      const now = Date.now();
      let delay = FALLBACK_REFRESH_INTERVAL_MS;
      if (expiresAtRef.current > now) {
        delay = Math.max(
          30_000,
          expiresAtRef.current - EXPIRY_SAFETY_MS - now,
        );
      }
      timeoutId = window.setTimeout(() => {
        console.log("[useLinbisToken] Proactive token refresh");
        fetchToken()
          .catch(() => {})
          .finally(() => scheduleNext());
      }, delay);
    };

    scheduleNext();
    return () => {
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, [fetchToken, accessToken]);

  // Refresh when the user returns to a stale tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (!isTokenStale()) return;
      console.log("[useLinbisToken] Tab visible with stale token — refreshing");
      fetchToken().catch(() => {});
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchToken, isTokenStale]);

  return {
    accessToken,
    loading,
    error,
    refreshAccessToken,
    ensureFreshToken,
    getTokenAgeMs,
    isTokenStale,
  };
}
