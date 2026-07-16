import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ClientQuote } from "../../src/services/cotizacionesLogic";
import {
  OPERACIONES_PAGE_SIZE,
  paginateList,
} from "../../src/services/operacionesPagination";
import { useAuth } from "../auth/AuthContext";
import { useLinbisToken } from "./useLinbisToken";
import { fetchCotizacionesPage } from "../services/cotizacionesApi";

export function useCotizaciones() {
  const { activeUsername } = useAuth();
  const {
    accessToken,
    loading: tokenLoading,
    error: tokenError,
    refreshAccessToken,
  } = useLinbisToken();

  const [page, setPage] = useState(1);
  const [catalog, setCatalog] = useState<ClientQuote[] | null>(null);
  const [serverItems, setServerItems] = useState<ClientQuote[]>([]);
  const [serverHasMore, setServerHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const catalogRef = useRef<ClientQuote[] | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    catalogRef.current = catalog;
  }, [catalog]);

  const loadPage = useCallback(
    async (
      targetPage: number,
      options?: { showLoading?: boolean; force?: boolean },
    ) => {
      if (!accessToken || !activeUsername) {
        setCatalog(null);
        catalogRef.current = null;
        setServerItems([]);
        setServerHasMore(false);
        setPage(1);
        setLoading(false);
        return;
      }

      if (!options?.force && catalogRef.current) {
        setPage(targetPage);
        setLoading(false);
        return;
      }

      const showLoading = options?.showLoading ?? targetPage === 1;
      const requestId = ++requestIdRef.current;
      if (showLoading) setLoading(true);
      setError(null);

      try {
        const result = await fetchCotizacionesPage(
          activeUsername,
          targetPage,
          {
            accessToken,
            refreshAccessToken,
          },
        );

        if (requestId !== requestIdRef.current) return;

        if (result.mode === "client" && result.catalog) {
          catalogRef.current = result.catalog;
          setCatalog(result.catalog);
          setServerItems([]);
          setServerHasMore(false);
          setPage(1);
          return;
        }

        catalogRef.current = null;
        setCatalog(null);
        setPage(result.page);
        setServerItems(result.items);
        setServerHasMore(result.hasMore);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        catalogRef.current = null;
        setCatalog(null);
        setServerItems([]);
        setServerHasMore(false);
        setPage(1);
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar las cotizaciones.",
        );
      } finally {
        if (requestId === requestIdRef.current && showLoading) {
          setLoading(false);
        }
      }
    },
    [accessToken, activeUsername, refreshAccessToken],
  );

  useEffect(() => {
    if (tokenLoading) return;
    if (!accessToken || !activeUsername) {
      setLoading(false);
      return;
    }
    catalogRef.current = null;
    setCatalog(null);
    setServerItems([]);
    setServerHasMore(false);
    setPage(1);
    void loadPage(1, { force: true, showLoading: true });
  }, [accessToken, activeUsername, loadPage, tokenLoading]);

  const paginated = useMemo(() => {
    if (catalog) {
      return paginateList(catalog, page, OPERACIONES_PAGE_SIZE);
    }
    return {
      items: serverItems,
      page,
      totalPages: undefined as number | undefined,
      totalItems: undefined as number | undefined,
      hasPrevious: page > 1,
      hasNext: serverHasMore,
    };
  }, [catalog, page, serverHasMore, serverItems]);

  const goToNextPage = useCallback(() => {
    if (!paginated.hasNext || loading) return;
    if (catalogRef.current) {
      setPage((current) => current + 1);
      return;
    }
    void loadPage(page + 1, { showLoading: false });
  }, [loadPage, loading, page, paginated.hasNext]);

  const goToPreviousPage = useCallback(() => {
    if (!paginated.hasPrevious || loading) return;
    if (catalogRef.current) {
      setPage((current) => current - 1);
      return;
    }
    void loadPage(page - 1, { showLoading: false });
  }, [loadPage, loading, page, paginated.hasPrevious]);

  const refresh = useCallback(async () => {
    catalogRef.current = null;
    setCatalog(null);
    setPage(1);
    setError(null);
    setLoading(true);
    try {
      await refreshAccessToken();
    } catch {
      setLoading(false);
      return;
    }
    await loadPage(1, { force: true, showLoading: true });
  }, [loadPage, refreshAccessToken]);

  return {
    activeUsername,
    items: paginated.items,
    loading,
    error: tokenError ?? error,
    pagination: {
      page: paginated.page,
      totalPages: paginated.totalPages,
      totalItems: paginated.totalItems,
      hasPrevious: paginated.hasPrevious,
      hasNext: paginated.hasNext,
      goNext: goToNextPage,
      goPrevious: goToPreviousPage,
    },
    refresh,
  };
}
