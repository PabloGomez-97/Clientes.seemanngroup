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

  const handleTabChange = useCallback((tab: TrackingTab) => {
    setActiveTab(tab);
    if (tab === "air") setOceanStatusFilter(null);
    else setAirStatusFilter(null);
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

  return {
    activeUsername,
    activeTab,
    setActiveTab: handleTabChange,
    userAir,
    userOcean,
    filteredUserAir,
    filteredUserOcean,
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
    refreshAll,
    fetchAir,
    fetchOcean,
    removeAirShipment,
    removeOceanShipment,
  };
}
