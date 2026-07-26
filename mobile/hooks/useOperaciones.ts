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
import {
  buildTrackedAwbSet,
  buildTrackedOceanKeySet,
  getAirOperacionTrackingStatus,
  getOceanOperacionTrackingStatus,
} from "../../src/services/operacionesTrackingLink";
import { useAuth } from "../auth/AuthContext";
import { useLinbisToken } from "./useLinbisToken";
import {
  enrichAirOperacionesRoutes,
  fetchAirOperacionesPage,
  fetchGroundOperacionesPage,
  fetchOceanOperacionesPage,
  fetchOperacionesTrackingIndex,
  type OceanListItem,
} from "../services/operacionesApi";
import {
  fetchAirShipments,
  fetchOceanShipments,
} from "../services/shipsgoApi";

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

  const [groundPage, setGroundPage] = useState(1);
  const [groundPageItems, setGroundPageItems] = useState<GroundShipment[]>([]);
  const [groundHasMore, setGroundHasMore] = useState(false);
  const [groundLoading, setGroundLoading] = useState(false);
  const [groundError, setGroundError] = useState<string | null>(null);
  const [groundLoaded, setGroundLoaded] = useState(false);
  const groundLoadedRef = useRef(false);

  const [trackingIndex, setTrackingIndex] = useState<Record<string, string>>(
    {},
  );
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

  const loadTrackingData = useCallback(async () => {
    if (!accessToken || !activeUsername) {
      setTrackingIndex({});
      setTrackedAwbs(new Set());
      setTrackedOceanKeys(new Set());
      trackingLoadedRef.current = false;
      return;
    }

    setTrackingLoading(true);
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
      trackingLoadedRef.current = true;
    } catch {
      setTrackingIndex({});
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
    async (page: number) => {
      if (!accessToken || !activeUsername) {
        setAirPageItems([]);
        setAirHasMore(false);
        setAirLoading(false);
        setAirRoutesLoading(false);
        airLoadedRef.current = false;
        return;
      }

      airEnrichGenRef.current += 1;
      setAirLoading(true);
      setAirRoutesLoading(false);
      setAirError(null);

      try {
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

  const loadOceanPage = useCallback(
    async (page: number) => {
      if (!accessToken || !activeUsername) {
        setOceanPageItems([]);
        setOceanHasMore(false);
        setOceanLoading(false);
        oceanLoadedRef.current = false;
        return;
      }

      setOceanLoading(true);
      setOceanError(null);

      try {
        const result = await fetchOceanOperacionesPage(
          activeUsername,
          page,
          linbisOptions,
        );
        setOceanPage(page);
        setOceanPageItems(result.items);
        setOceanHasMore(result.hasMore);
        oceanLoadedRef.current = true;
        setOceanLoaded(true);
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
      } finally {
        setOceanLoading(false);
      }
    },
    [accessToken, activeUsername, linbisOptions],
  );

  const loadGroundPage = useCallback(
    async (page: number) => {
      if (!accessToken || !activeUsername) {
        setGroundPageItems([]);
        setGroundHasMore(false);
        setGroundLoading(false);
        groundLoadedRef.current = false;
        return;
      }

      setGroundLoading(true);
      setGroundError(null);

      try {
        const result = await fetchGroundOperacionesPage(
          activeUsername,
          page,
          linbisOptions,
        );
        setGroundPage(page);
        setGroundPageItems(result.items);
        setGroundHasMore(result.hasMore);
        groundLoadedRef.current = true;
        setGroundLoaded(true);
      } catch (error) {
        setGroundPageItems([]);
        setGroundHasMore(false);
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
    },
    [accessToken, activeUsername, linbisOptions],
  );

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
        void loadGroundPage(1);
      }
    },
    [
      accessToken,
      activeUsername,
      airLoading,
      groundLoading,
      loadAirPage,
      loadGroundPage,
      loadOceanPage,
      oceanLoading,
      tokenLoading,
    ],
  );

  const refreshActiveTab = useCallback(async () => {
    try {
      await refreshAccessToken();
    } catch {
      return;
    }
    trackingLoadedRef.current = false;
    void loadTrackingData();

    if (activeTab === "air") {
      airLoadedRef.current = false;
      await loadAirPage(airPage);
      return;
    }
    if (activeTab === "ocean") {
      oceanLoadedRef.current = false;
      await loadOceanPage(oceanPage);
      return;
    }
    groundLoadedRef.current = false;
    await loadGroundPage(groundPage);
  }, [
    activeTab,
    airPage,
    groundPage,
    loadAirPage,
    loadGroundPage,
    loadOceanPage,
    loadTrackingData,
    oceanPage,
    refreshAccessToken,
  ]);

  const refreshAll = useCallback(async () => {
    try {
      await refreshAccessToken();
    } catch {
      return;
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
      await loadGroundPage(1);
    }
    void loadTrackingData();
  }, [
    activeTab,
    loadAirPage,
    loadGroundPage,
    loadOceanPage,
    loadTrackingData,
    refreshAccessToken,
  ]);

  // Solo la pestaña activa (aéreo por defecto). Sin pedir océano/terrestre.
  useEffect(() => {
    if (tokenLoading) return;
    if (!accessToken || !activeUsername) {
      setAirLoading(false);
      airLoadedRef.current = false;
      return;
    }
    airLoadedRef.current = false;
    void loadAirPage(1);
  }, [accessToken, activeUsername, loadAirPage, tokenLoading]);

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
    setAirPage(1);
    setOceanPage(1);
    setGroundPage(1);
    setAirPageItems([]);
    setOceanPageItems([]);
    setGroundPageItems([]);
    setAirHasMore(false);
    setOceanHasMore(false);
    setGroundHasMore(false);
    setOceanLoaded(false);
    setGroundLoaded(false);
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

  const filteredGroundPage = useMemo(
    () => applyGroundOperacionesFilters(groundPageItems, groundFilters),
    [groundFilters, groundPageItems],
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
    if (!groundHasMore || groundLoading) return;
    void loadGroundPage(groundPage + 1);
  }, [groundHasMore, groundLoading, groundPage, loadGroundPage]);

  const goToPreviousGroundPage = useCallback(() => {
    if (groundPage <= 1 || groundLoading) return;
    void loadGroundPage(groundPage - 1);
  }, [groundLoading, groundPage, loadGroundPage]);

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
    void loadOceanPage(1);
  }, [loadOceanPage]);

  const clearGroundFilters = useCallback(() => {
    setGroundFilters(EMPTY_GROUND_FILTERS);
    setGroundPage(1);
    void loadGroundPage(1);
  }, [loadGroundPage]);

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
      void loadGroundPage(1);
    },
    [loadGroundPage],
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
      page: groundPage,
      totalPages: undefined as number | undefined,
      totalItems: undefined as number | undefined,
      hasPrevious: groundPage > 1,
      hasNext: groundHasMore,
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
    groundHasMore,
    groundPage,
    oceanHasMore,
    oceanPage,
  ]);

  const tabTotals = useMemo(
    () => ({
      air: null as number | null,
      ocean: null as number | null,
      ground: null as number | null,
    }),
    [],
  );

  return {
    activeUsername,
    activeTab,
    setActiveTab: handleSetActiveTab,
    tokenLoading,
    tokenError,
    displayedAir: filteredAirPage,
    displayedOcean: filteredOceanPage,
    displayedGround: filteredGroundPage,
    filteredAir: filteredAirPage,
    filteredOcean: filteredOceanPage,
    filteredGround: filteredGroundPage,
    airShipments: airPageItems,
    oceanShipments: oceanPageItems,
    groundShipments: groundPageItems,
    airLoading,
    oceanLoading,
    groundLoading,
    airRoutesLoading,
    trackingLoading,
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
    oceanCatalogLoaded: oceanLoaded,
    groundCatalogLoaded: groundLoaded,
  };
}
