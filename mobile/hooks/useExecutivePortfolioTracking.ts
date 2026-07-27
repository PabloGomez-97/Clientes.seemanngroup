import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useRequestGate } from "./useRequestGate";

export type ClientTrackingCounts = {
  air: number;
  ocean: number;
};

function emptyCounts(usernames: string[]): Map<string, ClientTrackingCounts> {
  const map = new Map<string, ClientTrackingCounts>();
  for (const username of usernames) {
    map.set(username, { air: 0, ocean: 0 });
  }
  return map;
}

/**
 * Cartera (o directorio global) + conteos de seguimiento por `reference`.
 * `inMotion*`: En tránsito (EN_ROUTE) + Navegando (SAILING) para Home ejecutivo.
 */
export function useExecutivePortfolioTracking() {
  const { token } = useAuth();
  const clientsSource = useStaffClientsSource();
  const { next, isLatest } = useRequestGate();
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const requestId = next();
    if (!token) {
      if (!isLatest(requestId)) return;
      setClients([]);
      setCounts(new Map());
      setActiveCounts(new Map());
      setTotalAir(0);
      setTotalOcean(0);
      setInMotionAir(0);
      setInMotionOcean(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [portfolio, airShipments, oceanShipments] = await Promise.all([
        clientsSource === "global"
          ? fetchTodosClientes(token)
          : fetchMisClientes(token),
        fetchAirShipments().catch(() => []),
        fetchOceanShipments().catch(() => []),
      ]);

      if (!isLatest(requestId)) return;

      const names = new Set(portfolio.map((c) => c.username));
      const map = emptyCounts([...names]);
      const activeMap = emptyCounts([...names]);

      let airTotal = 0;
      let oceanTotal = 0;
      let airInMotion = 0;
      let oceanInMotion = 0;

      for (const shipment of airShipments) {
        const ref = shipment.reference?.trim();
        if (!ref || !names.has(ref)) continue;
        const entry = map.get(ref) ?? { air: 0, ocean: 0 };
        entry.air += 1;
        map.set(ref, entry);
        airTotal += 1;
        if (matchesAirFilter(shipment, "inTransit")) {
          airInMotion += 1;
          const active = activeMap.get(ref) ?? { air: 0, ocean: 0 };
          active.air += 1;
          activeMap.set(ref, active);
        }
      }

      for (const shipment of oceanShipments) {
        const ref = shipment.reference?.trim();
        if (!ref || !names.has(ref)) continue;
        const entry = map.get(ref) ?? { air: 0, ocean: 0 };
        entry.ocean += 1;
        map.set(ref, entry);
        oceanTotal += 1;
        if (matchesOceanFilter(shipment, "sailing")) {
          oceanInMotion += 1;
          const active = activeMap.get(ref) ?? { air: 0, ocean: 0 };
          active.ocean += 1;
          activeMap.set(ref, active);
        }
      }

      setClients(portfolio);
      setCounts(map);
      setActiveCounts(activeMap);
      setTotalAir(airTotal);
      setTotalOcean(oceanTotal);
      setInMotionAir(airInMotion);
      setInMotionOcean(oceanInMotion);
    } catch (e) {
      if (!isLatest(requestId)) return;
      setError(
        e instanceof Error
          ? e.message
          : "No se pudieron cargar los seguimientos.",
      );
    } finally {
      if (isLatest(requestId)) setLoading(false);
    }
  }, [token, clientsSource, next, isLatest]);

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
    loading,
    error,
    refresh: load,
  };
}
