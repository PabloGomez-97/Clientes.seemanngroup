import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useLinbisToken } from "./useLinbisToken";
import {
  fetchClientInvoices,
  fetchClientShipmentsAll,
  moneyLabel,
  classifyMode,
  type InvoiceRow,
  type ShipmentRow,
} from "../services/reporteriaApi";

export function useReporteriaFinanciera() {
  const { activeUsername } = useAuth();
  const { accessToken, loading: tokenLoading, error: tokenError, refreshAccessToken } =
    useLinbisToken();
  const [items, setItems] = useState<InvoiceRow[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (nextPage = 1, append = false) => {
      if (!accessToken || !activeUsername) {
        setLoading(false);
        return;
      }
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await fetchClientInvoices(activeUsername, nextPage, {
          accessToken,
          refreshAccessToken,
        });
        setItems((prev) => (append ? [...prev, ...result.items] : result.items));
        setHasMore(result.hasMore);
        setPage(nextPage);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [accessToken, activeUsername, refreshAccessToken],
  );

  useEffect(() => {
    if (!tokenLoading && accessToken) {
      void load(1, false);
    } else if (!tokenLoading && tokenError) {
      setError(tokenError);
      setLoading(false);
    }
  }, [accessToken, load, tokenError, tokenLoading]);

  const kpis = useMemo(() => {
    const total = items.length;
    let amountSum = 0;
    let pending = 0;
    for (const inv of items) {
      const val = inv.balanceDue?.value ?? inv.totalAmount?.value ?? 0;
      amountSum += typeof val === "number" ? val : 0;
      const balance = inv.balanceDue?.value ?? 0;
      if (balance > 0) pending += 1;
    }
    return {
      total,
      pending,
      amountLabel:
        items[0]?.currency?.abbr
          ? `${items[0].currency.abbr} ${Math.round(amountSum).toLocaleString("es-CL")}`
          : String(Math.round(amountSum)),
    };
  }, [items]);

  return {
    activeUsername,
    items,
    kpis,
    loading: loading || tokenLoading,
    loadingMore,
    error,
    hasMore,
    refresh: () => load(1, false),
    loadMore: () => {
      if (!loadingMore && hasMore) void load(page + 1, true);
    },
    moneyLabel,
  };
}

export function useReporteriaOperacional() {
  const { activeUsername } = useAuth();
  const { accessToken, loading: tokenLoading, error: tokenError, refreshAccessToken } =
    useLinbisToken();
  const [items, setItems] = useState<ShipmentRow[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (nextPage = 1, append = false) => {
      if (!accessToken || !activeUsername) {
        setLoading(false);
        return;
      }
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await fetchClientShipmentsAll(activeUsername, nextPage, {
          accessToken,
          refreshAccessToken,
        });
        setItems((prev) => (append ? [...prev, ...result.items] : result.items));
        setHasMore(result.hasMore);
        setPage(nextPage);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [accessToken, activeUsername, refreshAccessToken],
  );

  useEffect(() => {
    if (!tokenLoading && accessToken) {
      void load(1, false);
    } else if (!tokenLoading && tokenError) {
      setError(tokenError);
      setLoading(false);
    }
  }, [accessToken, load, tokenError, tokenLoading]);

  const kpis = useMemo(() => {
    let air = 0;
    let sea = 0;
    let ground = 0;
    for (const s of items) {
      const mode = classifyMode(s.modeOfTransportation);
      if (mode === "air") air += 1;
      else if (mode === "sea") sea += 1;
      else if (mode === "ground") ground += 1;
    }
    return { total: items.length, air, sea, ground };
  }, [items]);

  return {
    activeUsername,
    items,
    kpis,
    loading: loading || tokenLoading,
    loadingMore,
    error,
    hasMore,
    refresh: () => load(1, false),
    loadMore: () => {
      if (!loadingMore && hasMore) void load(page + 1, true);
    },
    classifyMode,
  };
}
