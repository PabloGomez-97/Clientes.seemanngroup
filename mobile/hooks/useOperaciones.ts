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
import { paginateList } from "../../src/services/operacionesPagination";
import {
  buildTrackedAwbSet,
  buildTrackedOceanKeySet,
  getAirOperacionTrackingStatus,
  getOceanOperacionTrackingStatus,
} from "../../src/services/operacionesTrackingLink";
import { useAuth } from "../auth/AuthContext";
import { useLinbisToken } from "./useLinbisToken";
import {
  fetchAirOperacionesPage,
  fetchGroundOperacionesCatalog,
  fetchOceanOperacionesCatalog,
  fetchOperacionesTrackingIndex,
  type OceanListItem,
} from "../services/operacionesApi";
import {
  fetchAirShipments,
  fetchOceanShipments,
} from "../services/shipsgoApi";

const EMPTY_AIR_FILTERS: AirOceanOperacionesFilters = {};
const EMPTY_GROUND_FILTERS: GroundOperacionesFilters = {};

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
  const [airError, setAirError] = useState<string | null>(null);
  const airLoadedRef = useRef(false);

  const [oceanCatalog, setOceanCatalog] = useState<OceanListItem[] | null>(
    null,
  );
  const [oceanPage, setOceanPage] = useState(1);
  const [oceanLoading, setOceanLoading] = useState(false);
  const [oceanError, setOceanError] = useState<string | null>(null);
  const oceanLoadedRef = useRef(false);

  const [groundCatalog, setGroundCatalog] = useState<GroundShipment[] | null>(
    null,
  );
  const [groundPage, setGroundPage] = useState(1);
  const [groundLoading, setGroundLoading] = useState(false);
  const [groundError, setGroundError] = useState<string | null>(null);
  const groundLoadedRef = useRef(false);

  const [trackingIndex, setTrackingIndex] = useState<Record<string, string>>(
    {},
  );
  const [trackedAwbs, setTrackedAwbs] = useState<Set<string>>(new Set());
  const [trackedOceanKeys, setTrackedOceanKeys] = useState<Set<string>>(
    new Set(),
  );

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

  const loadTrackingData = useCallback(async () => {
    if (!accessToken || !activeUsername) {
      setTrackingIndex({});
      setTrackedAwbs(new Set());
      setTrackedOceanKeys(new Set());
      return;
    }

    try {
      const [index, airTrackings, oceanTrackings] = await Promise.all([
        fetchOperacionesTrackingIndex(activeUsername, linbisOptions),
        fetchAirShipments(),
        fetchOceanShipments(),
      ]);
      setTrackingIndex(index);
      setTrackedAwbs(buildTrackedAwbSet(airTrackings, activeUsername));
      setTrackedOceanKeys(
        buildTrackedOceanKeySet(oceanTrackings, activeUsername),
      );
    } catch {
      setTrackingIndex({});
      setTrackedAwbs(new Set());
      setTrackedOceanKeys(new Set());
    }
  }, [accessToken, activeUsername, linbisOptions]);

  const loadAirPage = useCallback(
    async (page: number) => {
      if (!accessToken || !activeUsername) {
        setAirPageItems([]);
        setAirHasMore(false);
        setAirLoading(false);
        airLoadedRef.current = false;
        return;
      }

      setAirLoading(true);
      setAirError(null);

      try {
        const result = await fetchAirOperacionesPage(
          activeUsername,
          page,
          linbisOptions,
        );
        setAirPage(page);
        setAirPageItems(result.items);
        setAirHasMore(result.hasMore);
        airLoadedRef.current = true;
      } catch (error) {
        setAirPageItems([]);
        setAirHasMore(false);
        airLoadedRef.current = true;
        setAirError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las operaciones aéreas.",
        );
      } finally {
        setAirLoading(false);
      }
    },
    [accessToken, activeUsername, linbisOptions],
  );

  const loadOceanCatalog = useCallback(async () => {
    if (!accessToken || !activeUsername) {
      setOceanCatalog([]);
      setOceanLoading(false);
      return;
    }

    setOceanLoading(true);
    setOceanError(null);

    try {
      const catalog = await fetchOceanOperacionesCatalog(
        activeUsername,
        linbisOptions,
      );
      setOceanCatalog(catalog);
      oceanLoadedRef.current = true;
    } catch (error) {
      setOceanCatalog([]);
      setOceanError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las operaciones marítimas.",
      );
    } finally {
      setOceanLoading(false);
    }
  }, [accessToken, activeUsername, linbisOptions]);

  const loadGroundCatalog = useCallback(async () => {
    if (!accessToken || !activeUsername) {
      setGroundCatalog([]);
      setGroundLoading(false);
      return;
    }

    setGroundLoading(true);
    setGroundError(null);

    try {
      const catalog = await fetchGroundOperacionesCatalog(
        activeUsername,
        linbisOptions,
      );
      setGroundCatalog(catalog);
      groundLoadedRef.current = true;
    } catch (error) {
      setGroundCatalog([]);
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
        void loadOceanCatalog();
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
      loadOceanCatalog,
      oceanLoading,
      tokenLoading,
    ],
  );

  const refreshActiveTab = useCallback(async () => {
    if (activeTab === "air") {
      airLoadedRef.current = false;
      await loadAirPage(airPage);
      return;
    }
    if (activeTab === "ocean") {
      oceanLoadedRef.current = false;
      setOceanPage(1);
      await loadOceanCatalog();
      return;
    }
    groundLoadedRef.current = false;
    setGroundPage(1);
    await loadGroundCatalog();
  }, [activeTab, airPage, loadAirPage, loadGroundCatalog, loadOceanCatalog]);

  const refreshAll = useCallback(async () => {
    airLoadedRef.current = false;
    oceanLoadedRef.current = false;
    groundLoadedRef.current = false;
    setOceanPage(1);
    setGroundPage(1);
    await Promise.all([loadAirPage(1), loadTrackingData()]);
    if (activeTab === "ocean") await loadOceanCatalog();
    if (activeTab === "ground") await loadGroundCatalog();
  }, [
    activeTab,
    loadAirPage,
    loadGroundCatalog,
    loadOceanCatalog,
    loadTrackingData,
  ]);

  useEffect(() => {
    if (tokenLoading) return;
    if (!accessToken || !activeUsername) {
      setAirLoading(false);
      airLoadedRef.current = false;
      return;
    }
    airLoadedRef.current = false;
    void loadAirPage(1);
    void loadTrackingData();
  }, [accessToken, activeUsername, loadAirPage, loadTrackingData, tokenLoading]);

  useEffect(() => {
    ensureTabData(activeTab);
  }, [activeTab, ensureTabData]);

  useEffect(() => {
    airLoadedRef.current = false;
    oceanLoadedRef.current = false;
    groundLoadedRef.current = false;
    setAirPage(1);
    setOceanPage(1);
    setGroundPage(1);
    setAirPageItems([]);
    setOceanCatalog(null);
    setGroundCatalog(null);
  }, [activeUsername]);

  const filteredAirPage = useMemo(
    () => applyAirOperacionesFilters(airPageItems, airFilters),
    [airFilters, airPageItems],
  );

  const filteredOceanAll = useMemo(
    () => applyOceanOperacionesFilters(oceanCatalog ?? [], oceanFilters),
    [oceanCatalog, oceanFilters],
  );

  const filteredGroundAll = useMemo(
    () => applyGroundOperacionesFilters(groundCatalog ?? [], groundFilters),
    [groundCatalog, groundFilters],
  );

  const oceanPagination = useMemo(
    () => paginateList(filteredOceanAll, oceanPage),
    [filteredOceanAll, oceanPage],
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
    if (!oceanPagination.hasNext) return;
    setOceanPage((page) => page + 1);
  }, [oceanPagination.hasNext]);

  const goToPreviousOceanPage = useCallback(() => {
    if (!oceanPagination.hasPrevious) return;
    setOceanPage((page) => Math.max(1, page - 1));
  }, [oceanPagination.hasPrevious]);

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
      getAirOperacionTrackingStatus(shipment, trackingIndex, trackedAwbs),
    [trackedAwbs, trackingIndex],
  );

  const getOceanTrackingStatus = useCallback(
    (shipment: OceanListItem) =>
      getOceanOperacionTrackingStatus(
        shipment,
        trackingIndex,
        trackedOceanKeys,
      ),
    [trackedOceanKeys, trackingIndex],
  );

  const clearAirFilters = useCallback(() => {
    setAirFilters(EMPTY_AIR_FILTERS);
    setAirPage(1);
    void loadAirPage(1);
  }, [loadAirPage]);

  const clearOceanFilters = useCallback(() => {
    setOceanFilters(EMPTY_AIR_FILTERS);
    setOceanPage(1);
  }, []);

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
    },
    [],
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
        totalPages: undefined,
        totalItems: undefined,
        hasPrevious: airPage > 1,
        hasNext: airHasMore,
        goNext: goToNextAirPage,
        goPrevious: goToPreviousAirPage,
      };
    }
    if (activeTab === "ocean") {
      return {
        page: oceanPagination.page,
        totalPages: oceanPagination.totalPages,
        totalItems: oceanPagination.totalItems,
        hasPrevious: oceanPagination.hasPrevious,
        hasNext: oceanPagination.hasNext,
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
    oceanPagination,
  ]);

  const displayedAir = filteredAirPage;
  const displayedOcean = oceanPagination.items;
  const displayedGround = groundPagination.items;

  const tabTotals = useMemo(
    () => ({
      air: airPageItems.length > 0 || airHasMore ? "4+" : airPageItems.length,
      ocean: oceanCatalog?.length ?? null,
      ground: groundCatalog?.length ?? null,
    }),
    [airHasMore, airPageItems.length, groundCatalog, oceanCatalog],
  );

  return {
    activeUsername,
    activeTab,
    setActiveTab: handleSetActiveTab,
    tokenLoading,
    tokenError,
    displayedAir,
    displayedOcean,
    displayedGround,
    filteredAir: displayedAir,
    filteredOcean: displayedOcean,
    filteredGround: displayedGround,
    airShipments: airPageItems,
    oceanShipments: oceanCatalog ?? [],
    groundShipments: groundCatalog ?? [],
    airLoading,
    oceanLoading,
    groundLoading,
    airError: tokenError ?? airError,
    oceanError: tokenError ?? oceanError,
    groundError: tokenError ?? groundError,
    airFilters,
    oceanFilters,
    groundFilters,
    setAirFilters: handleSetAirFilters,
    setOceanFilters: handleSetOceanFilters,
    setGroundFilters: handleSetGroundFilters,
    clearAirFilters,
    clearOceanFilters,
    clearGroundFilters,
    getAirTrackingStatus,
    getOceanTrackingStatus,
    refreshAll,
    refreshActiveTab,
    pagination,
    tabTotals,
    oceanCatalogLoaded: oceanCatalog != null,
    groundCatalogLoaded: groundCatalog != null,
  };
}
