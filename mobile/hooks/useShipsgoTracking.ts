import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AirShipment,
  OceanShipment,
} from "../../src/components/cliente/tracking/shipsgo/types";
import {
  type AirFilterKey,
  type OceanFilterKey,
  type TrackingTab,
  buildAirStatusChips,
  buildOceanStatusChips,
  computeAirStats,
  computeOceanStats,
  filterShipmentsByUsername,
  matchesAirFilter,
  matchesOceanFilter,
  sortShipmentsActiveFirst,
  isAirTrackingComplete,
  isOceanTrackingComplete,
} from "../../src/services/shipsgoTrackingLogic";
import {
  OPERACIONES_PAGE_SIZE,
  paginateList,
} from "../../src/services/operacionesPagination";
import {
  deleteAirShipment,
  deleteOceanShipment,
  fetchAirShipments,
  fetchOceanShipments,
} from "../services/shipsgoApi";
import { useAuth } from "../auth/AuthContext";

export function useShipsgoTracking() {
  const { token, activeUsername } = useAuth();
  const [activeTab, setActiveTab] = useState<TrackingTab>("air");
  const [allAirShipments, setAllAirShipments] = useState<AirShipment[]>([]);
  const [allOceanShipments, setAllOceanShipments] = useState<OceanShipment[]>(
    [],
  );
  const [airLoading, setAirLoading] = useState(true);
  const [oceanLoading, setOceanLoading] = useState(true);
  const [airError, setAirError] = useState<string | null>(null);
  const [oceanError, setOceanError] = useState<string | null>(null);
  const [airStatusFilter, setAirStatusFilter] = useState<AirFilterKey | null>(
    null,
  );
  const [oceanStatusFilter, setOceanStatusFilter] =
    useState<OceanFilterKey | null>(null);
  const [airPage, setAirPage] = useState(1);
  const [oceanPage, setOceanPage] = useState(1);

  const userAir = useMemo(
    () =>
      sortShipmentsActiveFirst(
        filterShipmentsByUsername(allAirShipments, activeUsername),
        isAirTrackingComplete,
      ),
    [allAirShipments, activeUsername],
  );

  const userOcean = useMemo(
    () =>
      sortShipmentsActiveFirst(
        filterShipmentsByUsername(allOceanShipments, activeUsername),
        isOceanTrackingComplete,
      ),
    [allOceanShipments, activeUsername],
  );

  const airStats = useMemo(() => computeAirStats(userAir), [userAir]);
  const oceanStats = useMemo(() => computeOceanStats(userOcean), [userOcean]);

  const filteredUserAir = useMemo(() => {
    if (!airStatusFilter) return userAir;
    return userAir.filter((shipment) =>
      matchesAirFilter(shipment, airStatusFilter),
    );
  }, [userAir, airStatusFilter]);

  const filteredUserOcean = useMemo(() => {
    if (!oceanStatusFilter) return userOcean;
    return userOcean.filter((shipment) =>
      matchesOceanFilter(shipment, oceanStatusFilter),
    );
  }, [userOcean, oceanStatusFilter]);

  const airPagination = useMemo(
    () => paginateList(filteredUserAir, airPage, OPERACIONES_PAGE_SIZE),
    [airPage, filteredUserAir],
  );

  const oceanPagination = useMemo(
    () => paginateList(filteredUserOcean, oceanPage, OPERACIONES_PAGE_SIZE),
    [filteredUserOcean, oceanPage],
  );

  const fetchAir = useCallback(async () => {
    setAirLoading(true);
    setAirError(null);
    try {
      const shipments = await fetchAirShipments();
      setAllAirShipments(shipments);
    } catch (error) {
      setAirError(
        error instanceof Error ? error.message : "Error al obtener envíos aéreos",
      );
    } finally {
      setAirLoading(false);
    }
  }, []);

  const fetchOcean = useCallback(async () => {
    setOceanLoading(true);
    setOceanError(null);
    try {
      const shipments = await fetchOceanShipments();
      setAllOceanShipments(shipments);
    } catch (error) {
      setOceanError(
        error instanceof Error
          ? error.message
          : "Error al obtener envíos marítimos",
      );
    } finally {
      setOceanLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchAir(), fetchOcean()]);
  }, [fetchAir, fetchOcean]);

  useEffect(() => {
    if (!activeUsername) {
      setAllAirShipments([]);
      setAllOceanShipments([]);
      setAirLoading(false);
      setOceanLoading(false);
      return;
    }
    void fetchAir();
    void fetchOcean();
  }, [activeUsername, fetchAir, fetchOcean]);

  useEffect(() => {
    setAirPage(1);
  }, [activeUsername, airStatusFilter]);

  useEffect(() => {
    setOceanPage(1);
  }, [activeUsername, oceanStatusFilter]);

  const handleTabChange = useCallback((tab: TrackingTab) => {
    setActiveTab(tab);
    if (tab === "air") {
      setOceanStatusFilter(null);
      setAirPage(1);
    } else {
      setAirStatusFilter(null);
      setOceanPage(1);
    }
  }, []);

  const toggleAirFilter = useCallback((key: string) => {
    setAirStatusFilter((prev) =>
      prev === key ? null : (key as AirFilterKey),
    );
  }, []);

  const toggleOceanFilter = useCallback((key: string) => {
    setOceanStatusFilter((prev) =>
      prev === key ? null : (key as OceanFilterKey),
    );
  }, []);

  const goToNextAirPage = useCallback(() => {
    if (!airPagination.hasNext) return;
    setAirPage((page) => page + 1);
  }, [airPagination.hasNext]);

  const goToPreviousAirPage = useCallback(() => {
    if (!airPagination.hasPrevious) return;
    setAirPage((page) => Math.max(1, page - 1));
  }, [airPagination.hasPrevious]);

  const goToNextOceanPage = useCallback(() => {
    if (!oceanPagination.hasNext) return;
    setOceanPage((page) => page + 1);
  }, [oceanPagination.hasNext]);

  const goToPreviousOceanPage = useCallback(() => {
    if (!oceanPagination.hasPrevious) return;
    setOceanPage((page) => Math.max(1, page - 1));
  }, [oceanPagination.hasPrevious]);

  const removeAirShipment = useCallback(
    async (shipmentId: number) => {
      if (!token) throw new Error("No hay sesión activa.");
      await deleteAirShipment(token, shipmentId);
      setAllAirShipments((prev) =>
        prev.filter((shipment) => shipment.id !== shipmentId),
      );
    },
    [token],
  );

  const removeOceanShipment = useCallback(
    async (shipmentId: number) => {
      if (!token) throw new Error("No hay sesión activa.");
      await deleteOceanShipment(token, shipmentId);
      setAllOceanShipments((prev) =>
        prev.filter((shipment) => shipment.id !== shipmentId),
      );
    },
    [token],
  );

  const pagination =
    activeTab === "air"
      ? {
          page: airPagination.page,
          totalPages: airPagination.totalPages,
          totalItems: airPagination.totalItems,
          hasPrevious: airPagination.hasPrevious,
          hasNext: airPagination.hasNext,
          goNext: goToNextAirPage,
          goPrevious: goToPreviousAirPage,
        }
      : {
          page: oceanPagination.page,
          totalPages: oceanPagination.totalPages,
          totalItems: oceanPagination.totalItems,
          hasPrevious: oceanPagination.hasPrevious,
          hasNext: oceanPagination.hasNext,
          goNext: goToNextOceanPage,
          goPrevious: goToPreviousOceanPage,
        };

  return {
    activeUsername,
    activeTab,
    setActiveTab: handleTabChange,
    userAir,
    userOcean,
    filteredUserAir,
    filteredUserOcean,
    displayedAir: airPagination.items,
    displayedOcean: oceanPagination.items,
    airLoading,
    oceanLoading,
    airError,
    oceanError,
    airStats,
    oceanStats,
    airStatusChips: buildAirStatusChips(airStats),
    oceanStatusChips: buildOceanStatusChips(oceanStats),
    airStatusFilter,
    oceanStatusFilter,
    toggleAirFilter,
    toggleOceanFilter,
    clearAirFilter: () => setAirStatusFilter(null),
    clearOceanFilter: () => setOceanStatusFilter(null),
    pagination,
    refreshAll,
    fetchAir,
    fetchOcean,
    removeAirShipment,
    removeOceanShipment,
  };
}
