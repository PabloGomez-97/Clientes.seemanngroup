import { useState, useEffect, useMemo } from "react";

const HM_API_BASE =
  import.meta.env.MODE === "development"
    ? "http://localhost:4000"
    : "https://portalclientes.seemanngroup.com";

export type HmAirStatus = "BOOKED" | "EN_ROUTE" | "LANDED" | "DELIVERED";
export type HmOceanStatus = "SAILING" | "ARRIVED" | "DISCHARGED";

export interface HmAirItem {
  kind: "air";
  id: number;
  awb: string;
  origin: string;
  destination: string;
  status: HmAirStatus;
  delivered: boolean;
}

export interface HmOceanItem {
  kind: "ocean";
  id: number;
  container: string;
  origin: string;
  destination: string;
  status: HmOceanStatus;
  delivered: boolean;
}

export type HmShipmentItem = HmAirItem | HmOceanItem;

const CACHE_TTL_MS = 20 * 60 * 1000;

interface ActivityCache {
  air: HmAirItem[];
  ocean: HmOceanItem[];
  fetchedAt: number;
  username: string;
}

function getCacheKey(username: string) {
  // v2: items now carry the raw status (needed for the active-shipments filter)
  return `activity_bar_cache_v2_${username}`;
}

function readCache(username: string): ActivityCache | null {
  try {
    const raw = localStorage.getItem(getCacheKey(username));
    if (!raw) return null;
    const parsed: ActivityCache = JSON.parse(raw);
    if (parsed.username !== username) return null;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(username: string, air: HmAirItem[], ocean: HmOceanItem[]) {
  try {
    const payload: ActivityCache = {
      air,
      ocean,
      fetchedAt: Date.now(),
      username,
    };
    localStorage.setItem(getCacheKey(username), JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

async function fetchShipments(username: string): Promise<{
  air: HmAirItem[];
  ocean: HmOceanItem[];
}> {
  let freshAir: HmAirItem[] = [];
  let freshOcean: HmOceanItem[] = [];

  const airRes = await fetch(`${HM_API_BASE}/api/shipsgo/shipments`);
  if (airRes.ok) {
    const airData = await airRes.json();
    const ships: Record<string, unknown>[] = Array.isArray(airData.shipments)
      ? airData.shipments
      : [];
    freshAir = ships
      .filter(
        (s) =>
          s.reference === username &&
          (s.status === "BOOKED" ||
            s.status === "EN_ROUTE" ||
            s.status === "LANDED" ||
            s.status === "DELIVERED"),
      )
      .map((s) => {
        const route = s.route as {
          origin: { location: { iata: string } };
          destination: { location: { iata: string } };
        } | null;
        return {
          kind: "air" as const,
          id: s.id as number,
          awb: (s.awb_number as string) || "—",
          origin: route?.origin?.location?.iata || "—",
          destination: route?.destination?.location?.iata || "—",
          status: s.status as HmAirStatus,
          delivered: s.status === "LANDED" || s.status === "DELIVERED",
        };
      });
  }

  const oceanRes = await fetch(`${HM_API_BASE}/api/shipsgo/ocean/shipments`);
  if (oceanRes.ok) {
    const oceanData = await oceanRes.json();
    const ships2: Record<string, unknown>[] = Array.isArray(
      oceanData.shipments,
    )
      ? oceanData.shipments
      : [];
    freshOcean = ships2
      .filter(
        (s) =>
          s.reference === username &&
          (s.status === "SAILING" ||
            s.status === "ARRIVED" ||
            s.status === "DISCHARGED"),
      )
      .map((s) => {
        const route = s.route as {
          port_of_loading: { location: { code: string } };
          port_of_discharge: { location: { code: string } };
        } | null;
        return {
          kind: "ocean" as const,
          id: s.id as number,
          container:
            (s.container_number as string) ||
            (s.booking_number as string) ||
            `#${s.id}`,
          origin: route?.port_of_loading?.location?.code || "—",
          destination: route?.port_of_discharge?.location?.code || "—",
          status: s.status as HmOceanStatus,
          delivered: s.status === "ARRIVED" || s.status === "DISCHARGED",
        };
      });
  }

  writeCache(username, freshAir, freshOcean);
  return { air: freshAir, ocean: freshOcean };
}

export function useHomeShipments(activeUsername: string | undefined) {
  const [air, setAir] = useState<HmAirItem[]>([]);
  const [ocean, setOcean] = useState<HmOceanItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeUsername) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    const cached = readCache(activeUsername);
    if (cached) {
      setAir(cached.air);
      setOcean(cached.ocean);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const result = await fetchShipments(activeUsername);
        if (!cancelled) {
          setAir(result.air);
          setOcean(result.ocean);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeUsername]);

  const items = useMemo<HmShipmentItem[]>(
    () => [...air, ...ocean],
    [air, ocean],
  );

  const activeCount = useMemo(
    () => items.filter((i) => !i.delivered).length,
    [items],
  );

  return { air, ocean, items, activeCount, loading };
}
