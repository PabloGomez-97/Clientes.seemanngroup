import { useCallback, useEffect, useRef, useState } from "react";
import { MOBILE_API_BASE } from "../../src/auth/authApi";

const REFRESH_INTERVAL_MS = 45 * 60 * 1000;

export function useLinbisToken() {
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedAt = useRef(0);
  const isFetching = useRef(false);
  const tokenRef = useRef("");

  const fetchToken = useCallback(async (isInitial = false): Promise<string> => {
    if (isFetching.current && !isInitial) {
      return tokenRef.current;
    }
    isFetching.current = true;

    try {
      const response = await fetch(`${MOBILE_API_BASE}/api/linbis-token`);
      if (!response.ok) {
        throw new Error("No se pudo obtener el token de Linbis");
      }
      const data = (await response.json()) as { token?: string };
      if (!data.token) {
        throw new Error("Respuesta inválida del servidor Linbis");
      }
      tokenRef.current = data.token;
      setAccessToken(data.token);
      setError(null);
      lastFetchedAt.current = Date.now();
      return data.token;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      throw err;
    } finally {
      isFetching.current = false;
    }
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<string> => {
    return fetchToken(false);
  }, [fetchToken]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await fetchToken(true);
      } catch {
        // error state already set
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchToken]);

  useEffect(() => {
    const interval = setInterval(() => {
      void fetchToken(false).catch(() => {});
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchToken]);

  return { accessToken, loading, error, refreshAccessToken };
}
