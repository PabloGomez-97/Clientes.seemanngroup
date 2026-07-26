import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AirShipment,
  OceanShipment,
} from "../../src/components/cliente/tracking/shipsgo/types";
import {
  matchesAirFilter,
  matchesOceanFilter,
} from "../../src/services/shipsgoTrackingLogic";
import type { Cliente } from "../services/ejecutivoClientesApi";
import {
  fetchMisClientes,
  fetchTodosClientes,
} from "../services/ejecutivoClientesApi";
import {
  fetchAirShipments,
  fetchOceanShipments,
} from "../services/shipsgoApi";
import { useAuth } from "../auth/AuthContext";
import { useStaffClientsSource } from "../navigation/StaffClientsSourceContext";
import type { ClientTrackingCounts } from "./useExecutivePortfolioTracking";

function isAirCompleted(s: AirShipment): boolean {
  return s.status === "LANDED" || s.status === "DELIVERED";
}

function isOceanCompleted(s: OceanShipment): boolean {
  return s.status === "ARRIVED" || s.status === "DISCHARGED";
}

function isAirDelayed(s: AirShipment): boolean {
  if (!s.route) return false;
  const { transit_percentage } = s.route;
  const eta = s.route.destination.date_of_rcf;
  if (!eta || transit_percentage >= 100) return false;
  if (s.status === "LANDED" || s.status === "DELIVERED") return false;
  return new Date(s.updated_at) >= new Date(eta) && transit_percentage < 100;
}

function isOceanDelayed(s: OceanShipment): boolean {
  if (!s.route) return false;
  const { transit_percentage } = s.route;
  const eta = s.route.port_of_discharge.date_of_discharge;
  if (!eta || transit_percentage >= 100) return false;
  if (s.status === "ARRIVED" || s.status === "DISCHARGED") return false;
  return new Date(s.updated_at) >= new Date(eta) && transit_percentage < 100;
}

function emptyCounts(usernames: string[]): Map<string, ClientTrackingCounts> {
  const map = new Map<string, ClientTrackingCounts>();
  for (const username of usernames) {
    map.set(username, { air: 0, ocean: 0 });
  }
  return map;
}

/**
 * Directorio global + seguimientos (Home operaciones).
 * "En movimiento" = En tránsito (EN_ROUTE) + Navegando (SAILING).
 */
export function useOperacionesGlobalTracking() {
  const { token } = useAuth();
  const source = useStaffClientsSource();
  const [clients, setClients] = useState<Cliente[]>([]);
  const [counts, setCounts] = useState<Map<string, ClientTrackingCounts>>(
    () => new Map(),
  );
  const [activeCounts, setActiveCounts] = useState<
    Map<string, ClientTrackingCounts>
  >(() => new Map());
  const [totalAir, setTotalAir] = useState(0);
  const [totalOcean, setTotalOcean] = useState(0);
  const [inMotionAir, setInMotionAir] = useState(0);
  const [inMotionOcean, setInMotionOcean] = useState(0);
  const [completedAir, setCompletedAir] = useState(0);
  const [completedOcean, setCompletedOcean] = useState(0);
  const [delayedAir, setDelayedAir] = useState(0);
  const [delayedOcean, setDelayedOcean] = useState(0);
  const [clientsWithTracking, setClientsWithTracking] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setClients([]);
      setCounts(new Map());
      setActiveCounts(new Map());
      setTotalAir(0);
      setTotalOcean(0);
      setInMotionAir(0);
      setInMotionOcean(0);
      setCompletedAir(0);
      setCompletedOcean(0);
      setDelayedAir(0);
      setDelayedOcean(0);
      setClientsWithTracking(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [portfolio, airShipments, oceanShipments] = await Promise.all([
        source === "global"
          ? fetchTodosClientes(token)
          : fetchMisClientes(token),
        fetchAirShipments().catch(() => [] as AirShipment[]),
        fetchOceanShipments().catch(() => [] as OceanShipment[]),
      ]);

      const names = new Set(portfolio.map((c) => c.username));
      const map = emptyCounts([...names]);
      const activeMap = emptyCounts([...names]);
      const withTracking = new Set<string>();

      let airTotal = 0;
      let oceanTotal = 0;
      let airMotion = 0;
      let oceanMotion = 0;
      let airDone = 0;
      let oceanDone = 0;
      let airDelay = 0;
      let oceanDelay = 0;

      for (const shipment of airShipments) {
        const ref = shipment.reference?.trim();
        if (!ref || !names.has(ref)) continue;
        const entry = map.get(ref) ?? { air: 0, ocean: 0 };
        entry.air += 1;
        map.set(ref, entry);
        airTotal += 1;
        withTracking.add(ref);
        if (matchesAirFilter(shipment, "inTransit")) {
          airMotion += 1;
          const active = activeMap.get(ref) ?? { air: 0, ocean: 0 };
          active.air += 1;
          activeMap.set(ref, active);
        }
        if (isAirCompleted(shipment)) airDone += 1;
        if (isAirDelayed(shipment)) airDelay += 1;
      }

      for (const shipment of oceanShipments) {
        const ref = shipment.reference?.trim();
        if (!ref || !names.has(ref)) continue;
        const entry = map.get(ref) ?? { air: 0, ocean: 0 };
        entry.ocean += 1;
        map.set(ref, entry);
        oceanTotal += 1;
        withTracking.add(ref);
        if (matchesOceanFilter(shipment, "sailing")) {
          oceanMotion += 1;
          const active = activeMap.get(ref) ?? { air: 0, ocean: 0 };
          active.ocean += 1;
          activeMap.set(ref, active);
        }
        if (isOceanCompleted(shipment)) oceanDone += 1;
        if (isOceanDelayed(shipment)) oceanDelay += 1;
      }

      setClients(portfolio);
      setCounts(map);
      setActiveCounts(activeMap);
      setTotalAir(airTotal);
      setTotalOcean(oceanTotal);
      setInMotionAir(airMotion);
      setInMotionOcean(oceanMotion);
      setCompletedAir(airDone);
      setCompletedOcean(oceanDone);
      setDelayedAir(airDelay);
      setDelayedOcean(oceanDelay);
      setClientsWithTracking(withTracking.size);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudieron cargar los datos de operaciones.",
      );
    } finally {
      setLoading(false);
    }
  }, [token, source]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalTrackings = useMemo(
    () => totalAir + totalOcean,
    [totalAir, totalOcean],
  );
  const inMotionTrackings = useMemo(
    () => inMotionAir + inMotionOcean,
    [inMotionAir, inMotionOcean],
  );
  const completedTrackings = useMemo(
    () => completedAir + completedOcean,
    [completedAir, completedOcean],
  );
  const delayedTrackings = useMemo(
    () => delayedAir + delayedOcean,
    [delayedAir, delayedOcean],
  );

  return {
    clients,
    counts,
    activeCounts,
    totalAir,
    totalOcean,
    totalTrackings,
    inMotionAir,
    inMotionOcean,
    inMotionTrackings,
    completedAir,
    completedOcean,
    completedTrackings,
    delayedAir,
    delayedOcean,
    delayedTrackings,
    clientsWithTracking,
    clientsWithoutTracking: Math.max(0, clients.length - clientsWithTracking),
    loading,
    error,
    refresh: load,
  };
}
