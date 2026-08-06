import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AirShipment } from "../../src/components/cliente/embarques/Handlers/HandlerAirShipments";
import type { GroundShipment } from "../../src/components/cliente/embarques/Handlers/HandlerGroundShipments";
import {
  applyAirOperacionesFilters,
  applyGroundOperacionesFilters,
  applyOceanOperacionesFilters,
  type AirOceanOperacionesFilters,
  type GroundOperacionesFilters,
  type OperacionesTab,
} from "../../src/services/operacionesFiltersLogic";
import { OPERACIONES_PAGE_SIZE, paginateList } from "../../src/services/operacionesPagination";
import {
  fetchQuoteProfitIndex,
  fetchQuoteTrackingIndex,
  lookupQuoteFromProfitIndex,
  type QuoteProfitIndex,
} from "../../src/services/linbisQuoteLookup";
import {
  buildTrackedAwbSet,
  buildTrackedOceanKeySet,
  getAirOperacionTrackingStatus,
  getOceanOperacionTrackingStatus,
  getOceanOperacionContainerNumber,
  resolveOceanOperacionTrackingNumber,
} from "../../src/services/operacionesTrackingLink";
import {
  getDemoAirShipments,
  getDemoAirTrackings,
  getDemoGroundShipments,
  getDemoOceanListItems,
  getDemoOceanTrackings,
} from "../../src/mocks/demoAccounts";
import { useAuth } from "../auth/AuthContext";
import { useLinbisToken } from "./useLinbisToken";
import {
  enrichAirOperacionesRoutes,
  fetchAirOperacionesPage,
  fetchGroundOperacionesCatalog,
  fetchOceanContainerHint,
  fetchOceanOperacionesPage,
  fetchOperacionesTrackingIndex,
  invalidateOperacionesCache,
  type OceanListItem,
} from "../services/operacionesApi";
import {
  fetchAirShipments,
  fetchOceanShipments,
} from "../services/shipsgoApi";
import {
  LINBIS_CLIENT_CONCURRENCY,
  runWithConcurrency,
} from "../../src/services/linbisListFetch";

const EMPTY_AIR_FILTERS: AirOceanOperacionesFilters = {};
const EMPTY_GROUND_FILTERS: GroundOperacionesFilters = {};

function airNeedsRouteEnrichment(shipment: AirShipment): boolean {
  return !(
    shipment.executedAt?.name?.trim() ||
    shipment.origin?.name?.trim() ||
    shipment.destination?.name?.trim()
  );
}

export function useOperaciones() {
  const { activeUsername } = useAuth();
  const {
    accessToken,
    loading: tokenLoading,
    error: tokenError,
    refreshAccessToken,
  } = useLinbisToken();

  const [activeTab, setActiveTab] = useState<OperacionesTab>("air");

  const [airPage, setAirPage] = useState(1);
  const [airPageItems, setAirPageItems] = useState<AirShipment[]>([]);
  const [airHasMore, setAirHasMore] = useState(false);
  const [airLoading, setAirLoading] = useState(true);
  const [airRoutesLoading, setAirRoutesLoading] = useState(false);
  const [airError, setAirError] = useState<string | null>(null);
  const airLoadedRef = useRef(false);
  const airEnrichGenRef = useRef(0);
  const airPageRef = useRef(1);

  const [oceanPage, setOceanPage] = useState(1);
  const [oceanPageItems, setOceanPageItems] = useState<OceanListItem[]>([]);
  const [oceanHasMore, setOceanHasMore] = useState(false);
  const [oceanLoading, setOceanLoading] = useState(false);
  const [oceanError, setOceanError] = useState<string | null>(null);
  const [oceanLoaded, setOceanLoaded] = useState(false);
  const oceanLoadedRef = useRef(false);
  const oceanPageRef = useRef(1);
  const oceanHintGenRef = useRef(0);
  const [oceanContainerHints, setOceanContainerHints] = useState<
    Record<string, string>
  >({});

  const [groundPage, setGroundPage] = useState(1);
  const [groundCatalog, setGroundCatalog] = useState<GroundShipment[] | null>(
    null,
  );
  const [groundLoading, setGroundLoading] = useState(false);
  const [groundError, setGroundError] = useState<string | null>(null);
  const [groundLoaded, setGroundLoaded] = useState(false);
  const groundLoadedRef = useRef(false);

  const [trackingIndex, setTrackingIndex] = useState<Record<string, string>>(
    {},
  );
  const [quoteTrackingIndex, setQuoteTrackingIndex] = useState<
    Record<string, string>
  >({});
  const [profitIndex, setProfitIndex] = useState<QuoteProfitIndex>({
    byHbli: {},
    bySog: {},
    byShipmentId: {},
    byQuote: {},
  });
  const [trackedAwbs, setTrackedAwbs] = useState<Set<string>>(new Set());
  const [trackedOceanKeys, setTrackedOceanKeys] = useState<Set<string>>(
    new Set(),
  );
  const [trackingLoading, setTrackingLoading] = useState(false);
  const trackingLoadedRef = useRef(false);

  const [airFilters, setAirFilters] =
    useState<AirOceanOperacionesFilters>(EMPTY_AIR_FILTERS);
  const [oceanFilters, setOceanFilters] =
    useState<AirOceanOperacionesFilters>(EMPTY_AIR_FILTERS);
  const [groundFilters, setGroundFilters] =
    useState<GroundOperacionesFilters>(EMPTY_GROUND_FILTERS);

  const linbisOptions = useMemo(
    () => ({
      accessToken,
      refreshAccessToken,
    }),
    [accessToken, refreshAccessToken],
  );

  const quoteOptionsForShipment = useCallback(
    (shipment: { number?: string | null; id?: number | string | null }) => {
      const shipmentId =
        typeof shipment.id === "number" ? shipment.id : null;
      const quoteNumber = lookupQuoteFromProfitIndex(profitIndex, {
        hbli: shipment.number,
        sogNumber: shipment.number,
        shipmentId,
      });
      return {
        quoteNumber,
        quoteTrackingIndex,
      };
    },
    [profitIndex, quoteTrackingIndex],
  );

  const loadTrackingData = useCallback(async () => {
    if (!accessToken || !activeUsername) {
      setTrackingIndex({});
      setQuoteTrackingIndex({});
      setProfitIndex({
        byHbli: {},
        bySog: {},
        byShipmentId: {},
        byQuote: {},
      });
      setTrackedAwbs(new Set());
      setTrackedOceanKeys(new Set());
      trackingLoadedRef.current = false;
      return;
    }

    setTrackingLoading(true);
    try {
      const demoAir = getDemoAirTrackings(activeUsername);
      const demoOcean = getDemoOceanTrackings(activeUsername);
      if (demoAir || demoOcean) {
        setTrackingIndex({});
        setQuoteTrackingIndex({});
        setProfitIndex({
          byHbli: {},
          bySog: {},
          byShipmentId: {},
          byQuote: {},
        });
        setTrackedAwbs(buildTrackedAwbSet(demoAir ?? [], activeUsername));
        setTrackedOceanKeys(
          buildTrackedOceanKeySet(demoOcean ?? [], activeUsername),
        );
        trackingLoadedRef.current = true;
        return;
      }

      const [index, quoteIndex, profit, airTrackings, oceanTrackings] =
        await Promise.all([
          fetchOperacionesTrackingIndex(activeUsername, linbisOptions),
          fetchQuoteTrackingIndex(activeUsername, linbisOptions),
          fetchQuoteProfitIndex(linbisOptions),
          fetchAirShipments(),
          fetchOceanShipments(),
        ]);
      setTrackingIndex(index);
      setQuoteTrackingIndex(quoteIndex);
      setProfitIndex(profit);
      setTrackedAwbs(buildTrackedAwbSet(airTrackings, activeUsername));
      setTrackedOceanKeys(
        buildTrackedOceanKeySet(oceanTrackings, activeUsername),
      );
      trackingLoadedRef.current = true;
    } catch {
      setTrackingIndex({});
      setQuoteTrackingIndex({});
      setProfitIndex({
        byHbli: {},
        bySog: {},
        byShipmentId: {},
        byQuote: {},
      });
      setTrackedAwbs(new Set());
      setTrackedOceanKeys(new Set());
    } finally {
      setTrackingLoading(false);
    }
  }, [accessToken, activeUsername, linbisOptions]);

  const enrichAirRoutesInBackground = useCallback(
    async (page: number, shipments: AirShipment[]) => {
      const needsEnrichment = shipments.some(airNeedsRouteEnrichment);
      if (!needsEnrichment || !accessToken) {
        setAirRoutesLoading(false);
        return;
      }

      const gen = ++airEnrichGenRef.current;
      setAirRoutesLoading(true);
      try {
        const enriched = await enrichAirOperacionesRoutes(
          shipments,
          linbisOptions,
        );
        if (gen !== airEnrichGenRef.current || airPageRef.current !== page) {
          return;
        }
        setAirPageItems(enriched);
      } catch {
        // Silencioso: el listado ya se mostró sin rutas enriquecidas.
      } finally {
        if (gen === airEnrichGenRef.current) {
          setAirRoutesLoading(false);
        }
      }
    },
    [accessToken, linbisOptions],
  );

  const loadAirPage = useCallback(
    async (page: number, opts?: { silent?: boolean }) => {
      if (!accessToken || !activeUsername) {
        setAirPageItems([]);
        setAirHasMore(false);
        setAirLoading(false);
        setAirRoutesLoading(false);
        airLoadedRef.current = false;
        return;
      }

      const silent = Boolean(opts?.silent);
      airEnrichGenRef.current += 1;
      if (!silent) {
        setAirLoading(true);
      }
      setAirRoutesLoading(false);
      setAirError(null);

      try {
        const demoAir = getDemoAirShipments(activeUsername);
        if (demoAir) {
          const start = (page - 1) * OPERACIONES_PAGE_SIZE;
          const items = demoAir.slice(start, start + OPERACIONES_PAGE_SIZE);
          airPageRef.current = page;
          setAirPage(page);
          setAirPageItems(items as AirShipment[]);
          setAirHasMore(start + OPERACIONES_PAGE_SIZE < demoAir.length);
          airLoadedRef.current = true;
          setAirLoading(false);
          return;
        }

        const result = await fetchAirOperacionesPage(
          activeUsername,
          page,
          linbisOptions,
        );
        airPageRef.current = page;
        setAirPage(page);
        setAirPageItems(result.items);
        setAirHasMore(result.hasMore);
        airLoadedRef.current = true;
        setAirLoading(false);
        void enrichAirRoutesInBackground(page, result.items);
      } catch (error) {
        setAirPageItems([]);
        setAirHasMore(false);
        airLoadedRef.current = true;
        setAirRoutesLoading(false);
        setAirError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las operaciones aéreas.",
        );
        setAirLoading(false);
      }
    },
    [accessToken, activeUsername, enrichAirRoutesInBackground, linbisOptions],
  );

  const enrichOceanHintsInBackground = useCallback(
    async (page: number, shipments: OceanListItem[]) => {
      if (!accessToken || !shipments.length) return;

      const needs = shipments.filter((shipment) => {
        const number = shipment.number?.trim();
        if (!number) return false;
        if (
          resolveOceanOperacionTrackingNumber(
            shipment,
            trackingIndex,
            quoteOptionsForShipment(shipment),
          )
        ) {
          return false;
        }
        if (shipment.bookingNumber?.trim()) return false;
        if (getOceanOperacionContainerNumber(shipment)) return false;
        return true;
      });
      if (!needs.length) return;

      const gen = ++oceanHintGenRef.current;
      try {
        const hints = await runWithConcurrency(
          needs,
          LINBIS_CLIENT_CONCURRENCY,
          async (shipment) => {
            const number = shipment.number!.trim();
            const hint = await fetchOceanContainerHint(number, {
              ...linbisOptions,
              moduleId: shipment.id,
            });
            return { number, containerNumber: hint.containerNumber };
          },
        );
        if (gen !== oceanHintGenRef.current || oceanPageRef.current !== page) {
          return;
        }
        setOceanContainerHints((prev) => {
          const next = { ...prev };
          let changed = false;
          for (const row of hints) {
            if (row.containerNumber && next[row.number] !== row.containerNumber) {
              next[row.number] = row.containerNumber;
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      } catch {
        // Silencioso: badges pueden quedar sin contenedor.
      }
    },
    [accessToken, linbisOptions, quoteOptionsForShipment, trackingIndex],
  );

  const loadOceanPage = useCallback(
    async (page: number, opts?: { silent?: boolean }) => {
      if (!accessToken || !activeUsername) {
        setOceanPageItems([]);
        setOceanHasMore(false);
        setOceanLoading(false);
        oceanLoadedRef.current = false;
        setOceanLoaded(false);
        return;
      }

      const silent = Boolean(opts?.silent);
      oceanHintGenRef.current += 1;
      if (!silent) {
        setOceanLoading(true);
      }
      setOceanError(null);

      try {
        const demoOcean = getDemoOceanListItems(activeUsername);
        if (demoOcean) {
          const start = (page - 1) * OPERACIONES_PAGE_SIZE;
          const items = demoOcean.slice(
            start,
            start + OPERACIONES_PAGE_SIZE,
          ) as OceanListItem[];
          oceanPageRef.current = page;
          setOceanPage(page);
          setOceanPageItems(items);
          setOceanHasMore(start + OPERACIONES_PAGE_SIZE < demoOcean.length);
          oceanLoadedRef.current = true;
          setOceanLoaded(true);
          setOceanLoading(false);
          return;
        }

        const result = await fetchOceanOperacionesPage(
          activeUsername,
          page,
          linbisOptions,
        );
        oceanPageRef.current = page;
        setOceanPage(page);
        setOceanPageItems(result.items);
        setOceanHasMore(result.hasMore);
        oceanLoadedRef.current = true;
        setOceanLoaded(true);
        setOceanLoading(false);
        void enrichOceanHintsInBackground(page, result.items);
      } catch (error) {
        setOceanPageItems([]);
        setOceanHasMore(false);
        oceanLoadedRef.current = true;
        setOceanLoaded(true);
        setOceanError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las operaciones marítimas.",
        );
        setOceanLoading(false);
      }
    },
    [
      accessToken,
      activeUsername,
      enrichOceanHintsInBackground,
      linbisOptions,
    ],
  );

  const loadOceanCatalog = useCallback(async () => {
    // Compat: refrescos históricos; ahora carga página 1 paginada.
    await loadOceanPage(1);
  }, [loadOceanPage]);

  const loadGroundCatalog = useCallback(async () => {
    if (!accessToken || !activeUsername) {
      setGroundCatalog([]);
      setGroundLoading(false);
      groundLoadedRef.current = false;
      setGroundLoaded(false);
      return;
    }

    setGroundLoading(true);
    setGroundError(null);

    try {
      const demoGround = getDemoGroundShipments(activeUsername);
      if (demoGround) {
        setGroundCatalog(demoGround as GroundShipment[]);
        setGroundPage(1);
        groundLoadedRef.current = true;
        setGroundLoaded(true);
        return;
      }

      const catalog = await fetchGroundOperacionesCatalog(
        activeUsername,
        linbisOptions,
      );
      setGroundCatalog(catalog);
      setGroundPage(1);
      groundLoadedRef.current = true;
      setGroundLoaded(true);
    } catch (error) {
      setGroundCatalog([]);
      groundLoadedRef.current = true;
      setGroundLoaded(true);
      setGroundError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las operaciones terrestres.",
      );
    } finally {
      setGroundLoading(false);
    }
  }, [accessToken, activeUsername, linbisOptions]);

  const ensureTabData = useCallback(
    (tab: OperacionesTab) => {
      if (!accessToken || !activeUsername || tokenLoading) return;

      if (tab === "air") {
        if (!airLoadedRef.current && !airLoading) {
          void loadAirPage(1);
        }
        return;
      }

      if (tab === "ocean" && !oceanLoadedRef.current && !oceanLoading) {
        void loadOceanPage(1);
        return;
      }

      if (tab === "ground" && !groundLoadedRef.current && !groundLoading) {
        void loadGroundCatalog();
      }
    },
    [
      accessToken,
      activeUsername,
      airLoading,
      groundLoading,
      loadAirPage,
      loadGroundCatalog,
      loadOceanPage,
      oceanLoading,
      tokenLoading,
    ],
  );

  const refreshActiveTab = useCallback(
    async (opts?: { hard?: boolean }) => {
      const hard = Boolean(opts?.hard);

      if (hard) {
        try {
          await refreshAccessToken();
        } catch {
          return;
        }
        if (activeUsername) {
          await invalidateOperacionesCache(activeUsername);
        }
      }

      trackingLoadedRef.current = false;
      void loadTrackingData();

      if (activeTab === "air") {
        if (hard) airLoadedRef.current = false;
        await loadAirPage(airPage, { silent: !hard && airPageItems.length > 0 });
        return;
      }
      if (activeTab === "ocean") {
        if (hard) oceanLoadedRef.current = false;
        await loadOceanPage(oceanPage, {
          silent: !hard && oceanPageItems.length > 0,
        });
        return;
      }
      if (hard) groundLoadedRef.current = false;
      await loadGroundCatalog();
    },
    [
      activeTab,
      activeUsername,
      airPage,
      airPageItems.length,
      loadAirPage,
      loadGroundCatalog,
      loadOceanPage,
      loadTrackingData,
      oceanPage,
      oceanPageItems.length,
      refreshAccessToken,
    ],
  );

  const refreshAll = useCallback(async () => {
    try {
      await refreshAccessToken();
    } catch {
      return;
    }
    if (activeUsername) {
      await invalidateOperacionesCache(activeUsername);
    }
    airLoadedRef.current = false;
    oceanLoadedRef.current = false;
    groundLoadedRef.current = false;
    trackingLoadedRef.current = false;

    if (activeTab === "air") {
      await loadAirPage(1);
    } else if (activeTab === "ocean") {
      await loadOceanPage(1);
    } else {
      await loadGroundCatalog();
    }
    void loadTrackingData();
  }, [
    activeTab,
    activeUsername,
    loadAirPage,
    loadGroundCatalog,
    loadOceanPage,
    loadTrackingData,
    refreshAccessToken,
  ]);

  // Carga inicial / cambio de usuario o token. No depender de la identidad
  // de loadAirPage para evitar re-fetch por recreación del callback.
  const loadAirPageRef = useRef(loadAirPage);
  loadAirPageRef.current = loadAirPage;

  useEffect(() => {
    if (tokenLoading) return;
    if (!accessToken || !activeUsername) {
      setAirLoading(false);
      airLoadedRef.current = false;
      return;
    }
    airLoadedRef.current = false;
    void loadAirPageRef.current(1);
  }, [accessToken, activeUsername, tokenLoading]);

  // Tracking en background, sin bloquear el listado.
  useEffect(() => {
    if (tokenLoading || !accessToken || !activeUsername) return;
    if (trackingLoadedRef.current || trackingLoading) return;
    void loadTrackingData();
  }, [
    accessToken,
    activeUsername,
    loadTrackingData,
    tokenLoading,
    trackingLoading,
  ]);

  useEffect(() => {
    ensureTabData(activeTab);
  }, [activeTab, ensureTabData]);

  useEffect(() => {
    airLoadedRef.current = false;
    oceanLoadedRef.current = false;
    groundLoadedRef.current = false;
    trackingLoadedRef.current = false;
    airEnrichGenRef.current += 1;
    airPageRef.current = 1;
    oceanPageRef.current = 1;
    setAirPage(1);
    setOceanPage(1);
    setGroundPage(1);
    setAirPageItems([]);
    setOceanPageItems([]);
    setGroundCatalog(null);
    setAirHasMore(false);
    setOceanHasMore(false);
    setOceanLoaded(false);
    setGroundLoaded(false);
    setOceanContainerHints({});
    setTrackingIndex({});
    setTrackedAwbs(new Set());
    setTrackedOceanKeys(new Set());
  }, [activeUsername]);

  const filteredAirPage = useMemo(
    () => applyAirOperacionesFilters(airPageItems, airFilters),
    [airFilters, airPageItems],
  );

  const filteredOceanPage = useMemo(
    () => applyOceanOperacionesFilters(oceanPageItems, oceanFilters),
    [oceanFilters, oceanPageItems],
  );

  const filteredGroundAll = useMemo(
    () => applyGroundOperacionesFilters(groundCatalog ?? [], groundFilters),
    [groundCatalog, groundFilters],
  );

  const groundPagination = useMemo(
    () => paginateList(filteredGroundAll, groundPage),
    [filteredGroundAll, groundPage],
  );

  const goToNextAirPage = useCallback(() => {
    if (!airHasMore || airLoading) return;
    void loadAirPage(airPage + 1);
  }, [airHasMore, airLoading, airPage, loadAirPage]);

  const goToPreviousAirPage = useCallback(() => {
    if (airPage <= 1 || airLoading) return;
    void loadAirPage(airPage - 1);
  }, [airLoading, airPage, loadAirPage]);

  const goToNextOceanPage = useCallback(() => {
    if (!oceanHasMore || oceanLoading) return;
    void loadOceanPage(oceanPage + 1);
  }, [loadOceanPage, oceanHasMore, oceanLoading, oceanPage]);

  const goToPreviousOceanPage = useCallback(() => {
    if (oceanPage <= 1 || oceanLoading) return;
    void loadOceanPage(oceanPage - 1);
  }, [loadOceanPage, oceanLoading, oceanPage]);

  const goToNextGroundPage = useCallback(() => {
    if (!groundPagination.hasNext) return;
    setGroundPage((page) => page + 1);
  }, [groundPagination.hasNext]);

  const goToPreviousGroundPage = useCallback(() => {
    if (!groundPagination.hasPrevious) return;
    setGroundPage((page) => Math.max(1, page - 1));
  }, [groundPagination.hasPrevious]);

  const getAirTrackingStatus = useCallback(
    (shipment: AirShipment) =>
      getAirOperacionTrackingStatus(
        shipment,
        trackingIndex,
        trackedAwbs,
        quoteOptionsForShipment(shipment),
      ),
    [quoteOptionsForShipment, trackedAwbs, trackingIndex],
  );

  const getOceanTrackingStatus = useCallback(
    (shipment: OceanListItem) => {
      const number = shipment.number?.trim() || "";
      return getOceanOperacionTrackingStatus(
        shipment,
        trackingIndex,
        trackedOceanKeys,
        oceanContainerHints[number] ?? null,
        quoteOptionsForShipment(shipment),
      );
    },
    [
      oceanContainerHints,
      quoteOptionsForShipment,
      trackedOceanKeys,
      trackingIndex,
    ],
  );

  const clearAirFilters = useCallback(() => {
    setAirFilters(EMPTY_AIR_FILTERS);
    setAirPage(1);
    void loadAirPage(1);
  }, [loadAirPage]);

  const clearOceanFilters = useCallback(() => {
    setOceanFilters(EMPTY_AIR_FILTERS);
    setOceanPage(1);
    void loadOceanPage(1);
  }, [loadOceanPage]);

  const clearGroundFilters = useCallback(() => {
    setGroundFilters(EMPTY_GROUND_FILTERS);
    setGroundPage(1);
  }, []);

  const handleSetActiveTab = useCallback((tab: OperacionesTab) => {
    setActiveTab(tab);
  }, []);

  const handleSetAirFilters = useCallback(
    (filters: AirOceanOperacionesFilters) => {
      setAirFilters(filters);
      setAirPage(1);
      void loadAirPage(1);
    },
    [loadAirPage],
  );

  const handleSetOceanFilters = useCallback(
    (filters: AirOceanOperacionesFilters) => {
      setOceanFilters(filters);
      setOceanPage(1);
      void loadOceanPage(1);
    },
    [loadOceanPage],
  );

  const handleSetGroundFilters = useCallback(
    (filters: GroundOperacionesFilters) => {
      setGroundFilters(filters);
      setGroundPage(1);
    },
    [],
  );

  const pagination = useMemo(() => {
    if (activeTab === "air") {
      return {
        page: airPage,
        totalPages: undefined as number | undefined,
        totalItems: undefined as number | undefined,
        hasPrevious: airPage > 1,
        hasNext: airHasMore,
        goNext: goToNextAirPage,
        goPrevious: goToPreviousAirPage,
      };
    }
    if (activeTab === "ocean") {
      return {
        page: oceanPage,
        totalPages: undefined as number | undefined,
        totalItems: undefined as number | undefined,
        hasPrevious: oceanPage > 1,
        hasNext: oceanHasMore,
        goNext: goToNextOceanPage,
        goPrevious: goToPreviousOceanPage,
      };
    }
    return {
      page: groundPagination.page,
      totalPages: groundPagination.totalPages,
      totalItems: groundPagination.totalItems,
      hasPrevious: groundPagination.hasPrevious,
      hasNext: groundPagination.hasNext,
      goNext: goToNextGroundPage,
      goPrevious: goToPreviousGroundPage,
    };
  }, [
    activeTab,
    airHasMore,
    airPage,
    goToNextAirPage,
    goToNextGroundPage,
    goToNextOceanPage,
    goToPreviousAirPage,
    goToPreviousGroundPage,
    goToPreviousOceanPage,
    groundPagination,
    oceanHasMore,
    oceanPage,
  ]);

  const tabTotals = useMemo(
    () => ({
      air: null as number | null,
      ocean: null as number | null,
      ground: groundCatalog?.length ?? null,
    }),
    [groundCatalog],
  );

  return {
    activeUsername,
    activeTab,
    setActiveTab: handleSetActiveTab,
    tokenLoading,
    tokenError,
    displayedAir: filteredAirPage,
    displayedOcean: filteredOceanPage,
    displayedGround: groundPagination.items,
    filteredAir: filteredAirPage,
    filteredOcean: filteredOceanPage,
    filteredGround: groundPagination.items,
    airShipments: airPageItems,
    oceanShipments: oceanPageItems,
    groundShipments: groundCatalog ?? [],
    airLoading: tokenLoading || airLoading,
    airRoutesLoading,
    oceanLoading: tokenLoading || oceanLoading,
    groundLoading: tokenLoading || groundLoading,
    trackingLoading,
    airError,
    oceanError,
    groundError,
    airFilters,
    setAirFilters: handleSetAirFilters,
    oceanFilters,
    setOceanFilters: handleSetOceanFilters,
    groundFilters,
    setGroundFilters: handleSetGroundFilters,
    clearAirFilters,
    clearOceanFilters,
    clearGroundFilters,
    pagination,
    tabTotals,
    refreshActiveTab,
    refreshAll,
    getAirTrackingStatus,
    getOceanTrackingStatus,
    oceanContainerHints,
    oceanCatalogLoaded: oceanLoaded,
    groundCatalogLoaded: groundLoaded,
  };
}
