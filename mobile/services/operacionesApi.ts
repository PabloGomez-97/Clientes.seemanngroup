import type { AirShipment } from "../../src/components/cliente/embarques/Handlers/HandlerAirShipments";
import type { GroundShipment } from "../../src/components/cliente/embarques/Handlers/HandlerGroundShipments";
import {
  buildLinbisListParams,
  consigneeMatches,
  fetchAirShipmentRouteDetail,
  fetchShippingOrderTrackingIndex,
  LINBIS_CLIENT_CONCURRENCY,
  runWithConcurrency,
} from "../../src/services/linbisListFetch";
import { linbisFetch } from "../../src/services/linbisFetch";
import { fetchOceanCommodityTracking } from "../../src/services/linbisQuoteLookup";
import {
  flattenAirShipmentRecords,
  mapLinbisAirToAirShipment,
  mapLinbisGroundToGroundShipment,
  mapLinbisOceanToShippingOrder,
  type OceanListItem,
} from "../../src/services/linbisShipmentMappers";
import {
  sortAirOperaciones,
  sortGroundOperaciones,
  sortOceanOperaciones,
} from "../../src/services/operacionesFiltersLogic";
import { OPERACIONES_PAGE_SIZE } from "../../src/services/operacionesPagination";
import { clearOpsCache } from "./operacionesCache";

const LINBIS_AIR_URL = "https://api.linbis.com/air-shipments";
/** Misma fuente que web ocean: /all + ConsigneeName (paginado). */
const LINBIS_OCEAN_ALL_URL = "https://api.linbis.com/ocean-shipments/all";
const LINBIS_GROUND_ALL_URL = "https://api.linbis.com/ground-shipments/all";

export { OPERACIONES_PAGE_SIZE };

type LinbisOptions = {
  accessToken: string;
  refreshAccessToken: () => Promise<string>;
  signal?: AbortSignal;
};

export type OperacionesPageResult<T> = {
  items: T[];
  page: number;
  hasMore: boolean;
};

export type AirOperacionesPageResult = OperacionesPageResult<AirShipment>;
export type OceanOperacionesPageResult = OperacionesPageResult<OceanListItem>;

export type OceanContainerHint = {
  containerNumber: string | null;
  hbliNumber: string | null;
};

function extractArrayPayload(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items;
  }
  return [];
}

async function fetchLinbisPage(
  baseUrl: string,
  consigneeName: string,
  page: number,
  pageSize: number,
  options: LinbisOptions,
): Promise<unknown[]> {
  const name = consigneeName.trim();
  if (!name) {
    throw new Error(
      "Falta ConsigneeName: no se puede consultar operaciones aéreas/marítimas.",
    );
  }

  const params = buildLinbisListParams(name, page, pageSize);
  if (!params.get("ConsigneeName")?.trim()) {
    throw new Error("ConsigneeName ausente en la consulta a Linbis.");
  }

  const url = `${baseUrl}?${params.toString()}`;

  const response = await linbisFetch(
    url,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      signal: options.signal,
    },
    options.accessToken,
    options.refreshAccessToken,
  );

  if (!response.ok) {
    throw new Error(`Error al obtener operaciones (${response.status})`);
  }

  const data = await response.json();
  return extractArrayPayload(data);
}

/** Completa origen/destino de aéreos en background (no bloquea el listado). */
export async function enrichAirOperacionesRoutes(
  shipments: AirShipment[],
  options: LinbisOptions,
): Promise<AirShipment[]> {
  if (!shipments.length) return [];

  return runWithConcurrency(
    shipments,
    LINBIS_CLIENT_CONCURRENCY,
    async (shipment) => {
      const route = await fetchAirShipmentRouteDetail(shipment, options);
      return {
        ...shipment,
        executedAt: route.executedAt ?? shipment.executedAt ?? null,
        origin: route.executedAt ?? shipment.origin ?? null,
        destination: route.destination ?? shipment.destination ?? null,
      };
    },
    options.signal,
  );
}

export async function fetchAirOperacionesPage(
  consigneeName: string,
  page: number,
  options: LinbisOptions,
  pageSize = OPERACIONES_PAGE_SIZE,
): Promise<AirOperacionesPageResult> {
  const records = await fetchLinbisPage(
    LINBIS_AIR_URL,
    consigneeName,
    page,
    pageSize,
    options,
  );
  const flat = flattenAirShipmentRecords(records);
  const mapped = flat.map((record) => mapLinbisAirToAirShipment(record));
  const items = sortAirOperaciones(mapped);

  return {
    items,
    page,
    hasMore: records.length >= pageSize,
  };
}

/**
 * Marítimo paginado — misma fuente que web: `/ocean-shipments/all?ConsigneeName=`.
 * Una sola página por request (no baja el catálogo completo).
 *
 * Nota: `/ocean-shipments` (sin /all) a menudo viene vacío o tarda mucho y el
 * fallback antiguo a `fetchAllLinbisByConsignee` re-descargaba TODO el /all
 * (decenas de segundos). Por eso se va directo a /all paginado.
 */
export async function fetchOceanOperacionesPage(
  consigneeName: string,
  page: number,
  options: LinbisOptions,
  pageSize = OPERACIONES_PAGE_SIZE,
): Promise<OceanOperacionesPageResult> {
  const name = consigneeName.trim();

  const records = await fetchLinbisPage(
    LINBIS_OCEAN_ALL_URL,
    name,
    page,
    pageSize,
    options,
  );

  const mapped = sortOceanOperaciones(
    records
      .filter((record) => {
        if (!record || typeof record !== "object") return false;
        const raw = record as Record<string, unknown>;
        return consigneeMatches(raw.consignee, name);
      })
      .map((record) =>
        mapLinbisOceanToShippingOrder(record as Record<string, unknown>),
      )
      .filter((order) => order.id && order.number),
  );

  return {
    items: mapped,
    page,
    hasMore: records.length >= pageSize,
  };
}

/** Resuelve contenedor/HBLI via commodities (igual que web). */
export async function fetchOceanContainerHint(
  sogNumber: string,
  options: LinbisOptions & { moduleId?: number | null },
): Promise<OceanContainerHint> {
  const number = sogNumber.trim();
  if (!number) {
    return { containerNumber: null, hbliNumber: null };
  }

  return fetchOceanCommodityTracking({
    accessToken: options.accessToken,
    refreshAccessToken: options.refreshAccessToken,
    signal: options.signal,
    shipmentNumber: number,
    moduleId: options.moduleId,
  });
}

/**
 * Terrestre: Linbis /ground-shipments?ConsigneeName hace timeout 400.
 * Usa /all + filtro local; siempre fresco desde Linbis.
 */
export async function fetchGroundOperacionesCatalog(
  consigneeName: string,
  options: LinbisOptions,
): Promise<GroundShipment[]> {
  const response = await linbisFetch(
    LINBIS_GROUND_ALL_URL,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      signal: options.signal,
    },
    options.accessToken,
    options.refreshAccessToken,
  );

  if (!response.ok) {
    throw new Error(
      `Error al obtener operaciones terrestres (${response.status})`,
    );
  }

  const data = await response.json();
  const records = Array.isArray(data) ? data : [];
  const mapped = records.map((record) => {
    if (!record || typeof record !== "object") {
      return {} as GroundShipment;
    }
    const raw = record as Record<string, unknown>;
    if ("from" in raw || "to" in raw || typeof raw.consignee === "string") {
      return {
        ...(raw as GroundShipment),
        consignee: getConsigneeNameFallback(raw.consignee) ?? undefined,
      };
    }
    return mapLinbisGroundToGroundShipment(raw) as GroundShipment;
  });

  const filtered = mapped.filter((record) =>
    consigneeMatches(record.consignee, consigneeName),
  );
  return sortGroundOperaciones(filtered);
}

function getConsigneeNameFallback(consignee: unknown): string | undefined {
  if (typeof consignee === "string") return consignee;
  if (consignee && typeof consignee === "object") {
    const name = (consignee as { name?: unknown }).name;
    if (typeof name === "string") return name;
  }
  return undefined;
}

export async function fetchOperacionesTrackingIndex(
  consigneeName: string,
  options: LinbisOptions,
): Promise<Record<string, string>> {
  return fetchShippingOrderTrackingIndex(consigneeName, options);
}

/**
 * Wipes leftover FileSystem `ops_cache_v1/` once (legacy TTL removed).
 * Kept for useOperaciones refresh callers; no list-data cache remains.
 */
export async function invalidateOperacionesCache(
  _consigneeName?: string,
): Promise<void> {
  await clearOpsCache([]);
}

export type { OceanListItem };
