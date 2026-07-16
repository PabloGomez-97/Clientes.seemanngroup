import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useLinbisToken } from "./useLinbisToken";
import {
  fetchClientInvoices,
  fetchAllClientShipments,
  computeOperationalDashboard,
  moneyLabel,
  type InvoiceRow,
  type OperationalDashboard,
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
    refresh: async () => {
      try {
        await refreshAccessToken();
        await load(1, false);
      } catch {
        // token error already set in context
      }
    },
    loadMore: () => {
      if (!loadingMore && hasMore) void load(page + 1, true);
    },
    moneyLabel,
  };
}

const EMPTY_DASHBOARD: OperationalDashboard = {
  total: 0,
  air: 0,
  sea: 0,
  ground: 0,
  pieces: 0,
  weightKg: 0,
  volumeM3: 0,
  avgTransitDays: 0,
  year: {
    current: 0,
    previous: 0,
    growthPct: 0,
    currentYear: new Date().getFullYear(),
    previousYear: new Date().getFullYear() - 1,
  },
  modeShare: [],
  perfByMode: [],
  topRoutes: [],
  topDestinations: [],
  monthly: [],
};

export function useReporteriaOperacional() {
  const { activeUsername } = useAuth();
  const { accessToken, loading: tokenLoading, error: tokenError, refreshAccessToken } =
    useLinbisToken();
  const [dashboard, setDashboard] =
    useState<OperationalDashboard>(EMPTY_DASHBOARD);
  const [sampleSize, setSampleSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !activeUsername) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const shipments = await fetchAllClientShipments(
        activeUsername,
        { accessToken, refreshAccessToken },
        20,
      );
      setSampleSize(shipments.length);
      setDashboard(computeOperationalDashboard(shipments));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
      setDashboard(EMPTY_DASHBOARD);
      setSampleSize(0);
    } finally {
      setLoading(false);
    }
  }, [accessToken, activeUsername, refreshAccessToken]);

  useEffect(() => {
    if (!tokenLoading && accessToken) {
      void load();
    } else if (!tokenLoading && tokenError) {
      setError(tokenError);
      setLoading(false);
    }
  }, [accessToken, load, tokenError, tokenLoading]);

  return {
    activeUsername,
    dashboard,
    sampleSize,
    loading: loading || tokenLoading,
    error,
    refresh: async () => {
      try {
        await refreshAccessToken();
        await load();
      } catch {
        // token error already set in context
      }
    },
  };
}
