import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { MOBILE_API_BASE } from "../../src/auth/authApi";

const REFRESH_INTERVAL_MS = 45 * 60 * 1000;
const TOKEN_ENDPOINT_TIMEOUT_MS = 15_000;
const EXPIRY_SAFETY_MS = 2 * 60 * 1000;

type LinbisTokenResponse = {
  token?: string;
  expiresAt?: number;
  expiresIn?: number;
};

type LinbisTokenContextValue = {
  accessToken: string;
  loading: boolean;
  error: string | null;
  refreshAccessToken: () => Promise<string>;
};

const LinbisTokenContext = createContext<LinbisTokenContextValue | null>(null);

function createTimeoutSignal(timeoutMs: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return AbortSignal.timeout(timeoutMs);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

export function LinbisTokenProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedAt = useRef(0);
  const expiresAtRef = useRef(0);
  const tokenRef = useRef("");
  const inflightPromise = useRef<Promise<string> | null>(null);

  const fetchToken = useCallback(async (): Promise<string> => {
    if (inflightPromise.current) {
      return inflightPromise.current;
    }

    const promise = (async () => {
      try {
        const response = await fetch(`${MOBILE_API_BASE}/api/linbis-token`, {
          signal: createTimeoutSignal(TOKEN_ENDPOINT_TIMEOUT_MS),
        });
        if (!response.ok) {
          throw new Error(
            `No se pudo obtener el token de Linbis (${response.status})`,
          );
        }
        const data = (await response.json()) as LinbisTokenResponse;
        if (!data.token) {
          throw new Error("Respuesta inválida del servidor Linbis");
        }
        tokenRef.current = data.token;
        setAccessToken(data.token);
        setError(null);
        lastFetchedAt.current = Date.now();
        if (typeof data.expiresAt === "number" && data.expiresAt > 0) {
          expiresAtRef.current = data.expiresAt;
        } else if (typeof data.expiresIn === "number" && data.expiresIn > 0) {
          expiresAtRef.current = Date.now() + data.expiresIn * 1000;
        } else {
          expiresAtRef.current = Date.now() + 60 * 60 * 1000;
        }
        return data.token;
      } catch (err) {
        const isTimeout =
          (err instanceof Error &&
            (err.name === "AbortError" ||
              err.name === "TimeoutError" ||
              /timeout/i.test(err.message))) ||
          (typeof DOMException !== "undefined" &&
            err instanceof DOMException &&
            (err.name === "AbortError" || err.name === "TimeoutError"));
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
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<string> => {
    return fetchToken();
  }, [fetchToken]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await fetchToken();
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
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const scheduleNext = () => {
      const now = Date.now();
      let delay = REFRESH_INTERVAL_MS;
      if (expiresAtRef.current > now) {
        delay = Math.max(30_000, expiresAtRef.current - EXPIRY_SAFETY_MS - now);
      }
      timeoutId = setTimeout(() => {
        void fetchToken()
          .catch(() => {})
          .finally(() => scheduleNext());
      }, delay);
    };

    scheduleNext();
    return () => {
      if (timeoutId != null) clearTimeout(timeoutId);
    };
  }, [fetchToken, accessToken]);

  const value = useMemo(
    () => ({ accessToken, loading, error, refreshAccessToken }),
    [accessToken, loading, error, refreshAccessToken],
  );

  return (
    <LinbisTokenContext.Provider value={value}>
      {children}
    </LinbisTokenContext.Provider>
  );
}

export function useLinbisToken() {
  const ctx = useContext(LinbisTokenContext);
  if (!ctx) {
    throw new Error("useLinbisToken debe usarse dentro de LinbisTokenProvider");
  }
  return ctx;
}
