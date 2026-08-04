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
import {
  clearOpsCache,
  readOpsCache,
  writeOpsCache,
} from "./operacionesCache";

const LINBIS_AIR_URL = "https://api.linbis.com/air-shipments";
const LINBIS_OCEAN_URL = "https://api.linbis.com/ocean-shipments";
/** Fallback / ground: paginado con ConsigneeName hace timeout 400. */
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
  const cacheParts = ["air", consigneeName.trim().toLowerCase(), String(page)];
  const cached = await readOpsCache<AirOperacionesPageResult>(cacheParts);
  if (cached) return cached;

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

  const result: AirOperacionesPageResult = {
    items,
    page,
    hasMore: records.length >= pageSize,
  };
  await writeOpsCache(cacheParts, result);
  return result;
}

function mapOceanRecords(records: unknown[]): OceanListItem[] {
  return sortOceanOperaciones(
    records
      .map((record) =>
        mapLinbisOceanToShippingOrder(record as Record<string, unknown>),
      )
      .filter((order) => order.id && order.number),
  );
}

/**
 * Marítimo paginado (mismo patrón que aéreo).
 * Si Linbis devuelve vacío, fallback a /all filtrado (cache 1h).
 */
export async function fetchOceanOperacionesPage(
  consigneeName: string,
  page: number,
  options: LinbisOptions,
  pageSize = OPERACIONES_PAGE_SIZE,
): Promise<OceanOperacionesPageResult> {
  const name = consigneeName.trim();
  const cacheParts = ["ocean-page", name.toLowerCase(), String(page)];
  const cached = await readOpsCache<OceanOperacionesPageResult>(cacheParts);
  if (cached) return cached;

  try {
    const records = await fetchLinbisPage(
      LINBIS_OCEAN_URL,
      name,
      page,
      pageSize,
      options,
    );
    if (records.length > 0) {
      const result: OceanOperacionesPageResult = {
        items: mapOceanRecords(records),
        page,
        hasMore: records.length >= pageSize,
      };
      await writeOpsCache(cacheParts, result);
      return result;
    }
  } catch {
    // Continúa a fallback /all
  }

  const catalog = await fetchOceanOperacionesCatalogFallback(name, options);
  const start = (page - 1) * pageSize;
  const slice = catalog.slice(start, start + pageSize);
  const result: OceanOperacionesPageResult = {
    items: slice,
    page,
    hasMore: start + pageSize < catalog.length,
  };
  await writeOpsCache(cacheParts, result);
  return result;
}

/** /all + filtro local; cache 1h por consignatario. */
async function fetchOceanOperacionesCatalogFallback(
  consigneeName: string,
  options: LinbisOptions,
): Promise<OceanListItem[]> {
  const cacheParts = ["ocean-all", consigneeName.trim().toLowerCase()];
  const cached = await readOpsCache<OceanListItem[]>(cacheParts);
  if (cached) return cached;

  const response = await linbisFetch(
    LINBIS_OCEAN_ALL_URL,
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
      `Error al obtener operaciones marítimas (${response.status})`,
    );
  }

  const data = await response.json();
  const records = Array.isArray(data) ? data : [];
  const mapped = records
    .filter((record) => {
      if (!record || typeof record !== "object") return false;
      const raw = record as Record<string, unknown>;
      return consigneeMatches(raw.consignee, consigneeName);
    })
    .map((record) =>
      mapLinbisOceanToShippingOrder(record as Record<string, unknown>),
    )
    .filter((order) => order.id && order.number);

  const sorted = sortOceanOperaciones(mapped);
  await writeOpsCache(cacheParts, sorted);
  return sorted;
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
 * Usa /all + filtro local, con cache 1h.
 */
export async function fetchGroundOperacionesCatalog(
  consigneeName: string,
  options: LinbisOptions,
): Promise<GroundShipment[]> {
  const cacheParts = ["ground-all", consigneeName.trim().toLowerCase()];
  const cached = await readOpsCache<GroundShipment[]>(cacheParts);
  if (cached) return cached;

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
  const sorted = sortGroundOperaciones(filtered);
  await writeOpsCache(cacheParts, sorted);
  return sorted;
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

export async function invalidateOperacionesCache(
  consigneeName?: string,
): Promise<void> {
  if (consigneeName?.trim()) {
    const n = consigneeName.trim().toLowerCase();
    await Promise.all([
      clearOpsCache(["air", n]),
      clearOpsCache(["ocean-page", n]),
      clearOpsCache(["ocean-all", n]),
      clearOpsCache(["ground-all", n]),
    ]);
    return;
  }
  await clearOpsCache([]);
}

export type { OceanListItem };
