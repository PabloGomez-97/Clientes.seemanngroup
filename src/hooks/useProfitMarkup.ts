import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  DEFAULT_PROFIT_MARKUP,
  normalizeProfitMarkup,
  profitMultiplier,
  resolveEffectiveProfitMarkup,
  type IClientProfitOverride,
  type IClientProfitOverrideFields,
  type IEffectiveProfitMarkup,
  type IProfitMarkupConfig,
  type ProfitMode,
} from "../types/profitMarkup";

type UseEffectiveProfitMarkupOpts = {
  /** Mongo User _id del cliente (modo ejecutivo). Si null y forSelf=false → solo global. */
  clientUserId?: string | null;
  /** Portal cliente: resuelve override del usuario autenticado */
  forSelf?: boolean;
  /** Si false, no hace fetch (p. ej. ejecutivo sin cliente aún) */
  enabled?: boolean;
};

type FetchEffectiveOptions = {
  /** Si true, no limpia el markup a solo-global mientras carga (focus / ensureFresh) */
  preserveMarkup?: boolean;
};

export type EnsureFreshProfitResult =
  | {
      ok: true;
      markup: IEffectiveProfitMarkup;
      multipliers: { air: number; fcl: number; lcl: number };
    }
  | { ok: false; error: string };

async function fetchJson<T>(
  url: string,
  token: string | null,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error || `Error ${res.status}`,
    );
  }
  return data as T;
}

function buildMultipliers(m: IEffectiveProfitMarkup) {
  return {
    air: profitMultiplier(m.air),
    fcl: profitMultiplier(m.fcl),
    lcl: profitMultiplier(m.lcl),
  };
}

export function useEffectiveProfitMarkup(
  opts: UseEffectiveProfitMarkupOpts = {},
) {
  const { token } = useAuth();
  const {
    clientUserId = null,
    forSelf = false,
    enabled = true,
  } = opts;

  const [markup, setMarkup] = useState<IEffectiveProfitMarkup>(() =>
    resolveEffectiveProfitMarkup(DEFAULT_PROFIT_MARKUP, null),
  );
  const [globalMarkup, setGlobalMarkup] =
    useState<IProfitMarkupConfig>(DEFAULT_PROFIT_MARKUP);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const globalMarkupRef = useRef(globalMarkup);
  globalMarkupRef.current = globalMarkup;

  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const fetchEffective = useCallback(
    async (
      fetchOpts: FetchEffectiveOptions = {},
    ): Promise<EnsureFreshProfitResult> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const requestId = ++requestIdRef.current;
      const preserveMarkup = fetchOpts.preserveMarkup === true;

      if (!enabled) {
        const next = resolveEffectiveProfitMarkup(globalMarkupRef.current, null);
        setLoading(false);
        setError(null);
        setMarkup(next);
        setHasLoadedOnce(true);
        return { ok: true, markup: next, multipliers: buildMultipliers(next) };
      }

      setLoading(true);
      setError(null);
      if (!preserveMarkup) {
        // Cambio de cliente: quitar override anterior de inmediato
        setMarkup(resolveEffectiveProfitMarkup(globalMarkupRef.current, null));
      }

      try {
        const qs =
          !forSelf && clientUserId
            ? `?clientUserId=${encodeURIComponent(clientUserId)}`
            : "";
        const data = await fetchJson<{
          global: IProfitMarkupConfig;
          override?: IClientProfitOverrideFields | null;
          effective: IEffectiveProfitMarkup;
        }>(`/api/profit-markup/effective${qs}`, token, {
          signal: controller.signal,
        });

        if (requestId !== requestIdRef.current) {
          return { ok: false, error: "Solicitud de profit cancelada" };
        }

        const global = normalizeProfitMarkup(data.global);
        const next =
          data.effective ??
          resolveEffectiveProfitMarkup(global, data.override ?? null);
        setGlobalMarkup(global);
        setMarkup(next);
        setError(null);
        setHasLoadedOnce(true);
        return { ok: true, markup: next, multipliers: buildMultipliers(next) };
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          return { ok: false, error: "Solicitud de profit cancelada" };
        }
        if (requestId !== requestIdRef.current) {
          return { ok: false, error: "Solicitud de profit cancelada" };
        }
        console.error("[useEffectiveProfitMarkup]", e);
        const message = (e as Error).message;
        setError(message);
        setMarkup(resolveEffectiveProfitMarkup(globalMarkupRef.current, null));
        setHasLoadedOnce(true);
        return { ok: false, error: message };
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [token, clientUserId, forSelf, enabled],
  );

  useEffect(() => {
    void fetchEffective();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchEffective]);

  // Refetch al volver a la pestaña / ventana (profit pudo cambiar en otra pantalla)
  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState !== "visible") return;
      void fetchEffective({ preserveMarkup: true });
    };
    const onFocus = () => {
      void fetchEffective({ preserveMarkup: true });
    };
    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchEffective]);

  const multipliers = useMemo(() => buildMultipliers(markup), [markup]);

  /** Seguro para UI: cargó bien y no hay error activo */
  const ready = hasLoadedOnce && !loading && !error;

  /**
   * Refetch obligatorio antes de crear cotización.
   * Devuelve el markup fresco del servidor para comparar con el de pantalla.
   */
  const ensureFresh = useCallback(async (): Promise<EnsureFreshProfitResult> => {
    return fetchEffective({ preserveMarkup: true });
  }, [fetchEffective]);

  return {
    markup,
    globalMarkup,
    multipliers,
    loading,
    error,
    ready,
    refetch: fetchEffective,
    ensureFresh,
  };
}

export function useClientProfitOverrides() {
  const { token } = useAuth();
  const [overrides, setOverrides] = useState<
    Record<string, IClientProfitOverrideFields>
  >({});
  const [globalMarkup, setGlobalMarkup] =
    useState<IProfitMarkupConfig>(DEFAULT_PROFIT_MARKUP);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const fetchAll = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;

    try {
      setLoading(true);
      setError(null);
      const data = await fetchJson<{
        global: IProfitMarkupConfig;
        overrides: Array<
          IClientProfitOverrideFields & { clientUserId: string }
        >;
      }>("/api/client-profit-overrides", token, {
        signal: controller.signal,
      });

      if (requestId !== requestIdRef.current) return;

      setGlobalMarkup(normalizeProfitMarkup(data.global));
      const map: Record<string, IClientProfitOverrideFields> = {};
      for (const row of data.overrides || []) {
        map[row.clientUserId] = {
          air: row.air ?? null,
          fcl: row.fcl ?? null,
          lcl: row.lcl ?? null,
        };
      }
      setOverrides(map);
      setHasLoadedOnce(true);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      if (requestId !== requestIdRef.current) return;
      console.error("[useClientProfitOverrides]", e);
      setError((e as Error).message);
      setHasLoadedOnce(true);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [token]);

  useEffect(() => {
    void fetchAll();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchAll]);

  // Refresco al volver a la pestaña del directorio
  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState !== "visible") return;
      void fetchAll();
    };
    const onFocus = () => {
      void fetchAll();
    };
    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchAll]);

  const getEffectiveForClient = useCallback(
    (clientUserId: string): IEffectiveProfitMarkup =>
      resolveEffectiveProfitMarkup(globalMarkup, overrides[clientUserId] ?? null),
    [globalMarkup, overrides],
  );

  const saveOverride = useCallback(
    async (
      clientUserId: string,
      fields: Partial<IClientProfitOverrideFields>,
    ) => {
      setSaving(true);
      setError(null);
      try {
        const data = await fetchJson<{
          override: IClientProfitOverride | null;
          effective: IEffectiveProfitMarkup;
          global: IProfitMarkupConfig;
        }>(`/api/client-profit-overrides/${encodeURIComponent(clientUserId)}`, token, {
          method: "PUT",
          body: JSON.stringify(fields),
        });
        setGlobalMarkup(normalizeProfitMarkup(data.global));
        if (!data.override) {
          setOverrides((prev) => {
            const next = { ...prev };
            delete next[clientUserId];
            return next;
          });
        } else {
          setOverrides((prev) => ({
            ...prev,
            [clientUserId]: {
              air: data.override!.air,
              fcl: data.override!.fcl,
              lcl: data.override!.lcl,
            },
          }));
        }
        return data;
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [token],
  );

  const clearOverride = useCallback(
    async (clientUserId: string, mode?: ProfitMode) => {
      setSaving(true);
      setError(null);
      try {
        const suffix = mode ? `/${mode}` : "";
        const data = await fetchJson<{
          override: IClientProfitOverride | null;
          global: IProfitMarkupConfig;
        }>(
          `/api/client-profit-overrides/${encodeURIComponent(clientUserId)}${suffix}`,
          token,
          { method: "DELETE" },
        );
        setGlobalMarkup(normalizeProfitMarkup(data.global));
        if (!data.override) {
          setOverrides((prev) => {
            const next = { ...prev };
            delete next[clientUserId];
            return next;
          });
        } else {
          setOverrides((prev) => ({
            ...prev,
            [clientUserId]: {
              air: data.override!.air,
              fcl: data.override!.fcl,
              lcl: data.override!.lcl,
            },
          }));
        }
        return data;
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [token],
  );

  const ready = hasLoadedOnce && !loading && !error;

  return {
    overrides,
    globalMarkup,
    loading,
    error,
    ready,
    saving,
    refetch: fetchAll,
    getEffectiveForClient,
    saveOverride,
    clearOverride,
  };
}
