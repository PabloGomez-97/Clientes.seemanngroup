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

const LINBIS_AIR_URL = "https://api.linbis.com/air-shipments";
const LINBIS_OCEAN_URL = "https://api.linbis.com/ocean-shipments";
const LINBIS_GROUND_URL = "https://api.linbis.com/ground-shipments";

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
export type GroundOperacionesPageResult = OperacionesPageResult<GroundShipment>;

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
  const params = buildLinbisListParams(consigneeName, page, pageSize);
  const url = `${baseUrl}?${params}`;

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

export async function fetchOceanOperacionesPage(
  consigneeName: string,
  page: number,
  options: LinbisOptions,
  pageSize = OPERACIONES_PAGE_SIZE,
): Promise<OceanOperacionesPageResult> {
  const records = await fetchLinbisPage(
    LINBIS_OCEAN_URL,
    consigneeName,
    page,
    pageSize,
    options,
  );
  const mapped = records.map((record) =>
    mapLinbisOceanToShippingOrder(record as Record<string, unknown>),
  );
  // SortBy=newest en API + refuerzo local (más nuevo → más viejo).
  const items = sortOceanOperaciones(mapped);

  return {
    items,
    page,
    hasMore: records.length >= pageSize,
  };
}

export async function fetchGroundOperacionesPage(
  consigneeName: string,
  page: number,
  options: LinbisOptions,
  pageSize = OPERACIONES_PAGE_SIZE,
): Promise<GroundOperacionesPageResult> {
  const records = await fetchLinbisPage(
    LINBIS_GROUND_URL,
    consigneeName,
    page,
    pageSize,
    options,
  );
  const mapped = records
    .map((record) =>
      mapLinbisGroundToGroundShipment(record as Record<string, unknown>),
    )
    .filter((record) => consigneeMatches(record.consignee, consigneeName));
  const items = sortGroundOperaciones(mapped as GroundShipment[]);

  return {
    items,
    page,
    // hasMore según respuesta cruda de Linbis (antes del filtro local).
    hasMore: records.length >= pageSize,
  };
}

export async function fetchOperacionesTrackingIndex(
  consigneeName: string,
  options: LinbisOptions,
): Promise<Record<string, string>> {
  return fetchShippingOrderTrackingIndex(consigneeName, options);
}

export type { OceanListItem };
