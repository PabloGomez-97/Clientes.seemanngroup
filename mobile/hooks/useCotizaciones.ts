import { useCallback, useEffect, useMemo, useState } from "react";
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

  const linbisOptions = useMemo(
    () => ({
      accessToken: accessToken ?? "",
      refreshAccessToken,
    }),
    [accessToken, refreshAccessToken],
  );

  const loadPage = useCallback(
    async (targetPage: number, options?: { showLoading?: boolean }) => {
      if (!accessToken || !activeUsername) {
        setCatalog(null);
        setServerItems([]);
        setServerHasMore(false);
        setPage(1);
        setLoading(false);
        return;
      }

      if (catalog) {
        setPage(targetPage);
        return;
      }

      const showLoading = options?.showLoading ?? targetPage === 1;
      if (showLoading) setLoading(true);
      setError(null);

      try {
        const result = await fetchCotizacionesPage(
          activeUsername,
          targetPage,
          linbisOptions,
        );

        if (result.mode === "client" && result.catalog) {
          setCatalog(result.catalog);
          setServerItems([]);
          setServerHasMore(false);
          setPage(1);
          return;
        }

        setCatalog(null);
        setPage(result.page);
        setServerItems(result.items);
        setServerHasMore(result.hasMore);
      } catch (err) {
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
        if (showLoading) setLoading(false);
      }
    },
    [accessToken, activeUsername, catalog, linbisOptions],
  );

  useEffect(() => {
    if (tokenLoading) return;
    if (!accessToken || !activeUsername) {
      setLoading(false);
      return;
    }
    void loadPage(1);
  }, [accessToken, activeUsername, loadPage, tokenLoading]);

  useEffect(() => {
    setPage(1);
    setCatalog(null);
    setServerItems([]);
    setServerHasMore(false);
  }, [activeUsername]);

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
    if (catalog) {
      setPage((current) => current + 1);
      return;
    }
    void loadPage(page + 1, { showLoading: false });
  }, [catalog, loadPage, loading, page, paginated.hasNext]);

  const goToPreviousPage = useCallback(() => {
    if (!paginated.hasPrevious || loading) return;
    if (catalog) {
      setPage((current) => current - 1);
      return;
    }
    void loadPage(page - 1, { showLoading: false });
  }, [catalog, loadPage, loading, page, paginated.hasPrevious]);

  const refresh = useCallback(async () => {
    setCatalog(null);
    setPage(1);
    await loadPage(1);
  }, [loadPage]);

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
