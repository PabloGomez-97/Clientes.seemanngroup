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
const LINBIS_OCEAN_URL = "https://api.linbis.com/ocean-shipments/all";
const LINBIS_GROUND_URL = "https://api.linbis.com/ground-shipments/all";

export { OPERACIONES_PAGE_SIZE };

type LinbisOptions = {
  accessToken: string;
  refreshAccessToken: () => Promise<string>;
  signal?: AbortSignal;
};

export type AirOperacionesPageResult = {
  items: AirShipment[];
  page: number;
  hasMore: boolean;
};

function extractArrayPayload(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items;
  }
  return [];
}

async function enrichAirOperacionesRoutes(
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
  const params = buildLinbisListParams(consigneeName, page, pageSize);
  const url = `${LINBIS_AIR_URL}?${params}`;

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
    throw new Error(`Error al obtener operaciones aéreas (${response.status})`);
  }

  const data = await response.json();
  const records = extractArrayPayload(data);
  const flat = flattenAirShipmentRecords(records);
  const mapped = flat.map((record) => mapLinbisAirToAirShipment(record));
  const withRoutes = await enrichAirOperacionesRoutes(mapped, options);
  const items = sortAirOperaciones(withRoutes);

  return {
    items,
    page,
    hasMore: flat.length >= pageSize,
  };
}

export async function fetchOceanOperacionesCatalog(
  consigneeName: string,
  options: LinbisOptions,
): Promise<OceanListItem[]> {
  const { accessToken, refreshAccessToken, signal } = options;
  const response = await linbisFetch(
    LINBIS_OCEAN_URL,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      signal,
    },
    accessToken,
    refreshAccessToken,
  );

  if (!response.ok) {
    throw new Error(`Error al obtener operaciones marítimas (${response.status})`);
  }

  const data = await response.json();
  const records = Array.isArray(data) ? data : [];
  const filtered = records.filter((record) =>
    consigneeMatches(
      (record as { consignee?: unknown }).consignee,
      consigneeName,
    ),
  );
  const mapped = filtered.map((record) =>
    mapLinbisOceanToShippingOrder(record as Record<string, unknown>),
  );
  return sortOceanOperaciones(mapped);
}

export async function fetchGroundOperacionesCatalog(
  consigneeName: string,
  options: LinbisOptions,
): Promise<GroundShipment[]> {
  const { accessToken, refreshAccessToken, signal } = options;
  const response = await linbisFetch(
    LINBIS_GROUND_URL,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      signal,
    },
    accessToken,
    refreshAccessToken,
  );

  if (!response.ok) {
    throw new Error(
      `Error al obtener operaciones terrestres (${response.status})`,
    );
  }

  const data = await response.json();
  const records = Array.isArray(data) ? (data as GroundShipment[]) : [];
  const filtered = records.filter((record) =>
    consigneeMatches(record.consignee, consigneeName),
  );
  return sortGroundOperaciones(filtered);
}

export async function fetchOperacionesTrackingIndex(
  consigneeName: string,
  options: LinbisOptions,
): Promise<Record<string, string>> {
  return fetchShippingOrderTrackingIndex(consigneeName, options);
}

export type { OceanListItem };
