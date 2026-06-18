import type { AirShipment } from "@/types/shipments";
import { linbisFetch } from "./linbisFetch";
import { mergeAirShipmentRouteFromDetail } from "./linbisShipmentMappers";

/** Tamaño de página aceptado por la API Linbis (ItemsPerPage=100 devuelve 400). */
export const LINBIS_PAGE_SIZE = 50;

/** Concurrencia máxima al consultar varios clientes en paralelo. */
export const LINBIS_CLIENT_CONCURRENCY = 5;

export function buildLinbisListParams(
  consigneeName: string,
  page: number,
  itemsPerPage = LINBIS_PAGE_SIZE,
): URLSearchParams {
  return new URLSearchParams({
    ConsigneeName: consigneeName,
    Page: page.toString(),
    ItemsPerPage: itemsPerPage.toString(),
    SortBy: "newest",
  });
}

function extractArrayPayload(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items;
  }
  return [];
}

type LinbisFetchOptions = {
  accessToken: string;
  refreshAccessToken?: () => Promise<string>;
  signal?: AbortSignal;
  maxPages?: number;
};

/**
 * Obtiene todos los registros paginados de un endpoint Linbis con ConsigneeName.
 * Devuelve array vacío si la primera página falla (cliente inexistente en Linbis).
 */
export async function fetchAllLinbisByConsignee(
  baseUrl: string,
  consigneeName: string,
  options: LinbisFetchOptions,
): Promise<unknown[]> {
  const { accessToken, refreshAccessToken, signal, maxPages = 40 } = options;
  const all: unknown[] = [];
  let page = 1;

  while (page <= maxPages) {
    if (signal?.aborted) return all;

    const params = buildLinbisListParams(consigneeName, page);
    const url = `${baseUrl}?${params}`;

    const response = refreshAccessToken
      ? await linbisFetch(
          url,
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
        )
      : await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          signal,
        });

    if (!response.ok) {
      if (page === 1) return [];
      break;
    }

    const data = await response.json();
    const batch = extractArrayPayload(data);
    if (!batch.length) break;

    all.push(...batch);
    if (batch.length < LINBIS_PAGE_SIZE) break;
    page++;
  }

  return all;
}

/** Ejecuta una tarea por elemento con concurrencia limitada. */
export async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<R>,
  signal?: AbortSignal,
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += concurrency) {
    if (signal?.aborted) break;
    const batch = items.slice(i, i + concurrency);
    const settled = await Promise.allSettled(batch.map(task));
    for (const entry of settled) {
      if (entry.status === "fulfilled") results.push(entry.value);
    }
  }

  return results;
}

export function getConsigneeName(
  consignee: unknown,
  fallback = "",
): string {
  if (typeof consignee === "string") return consignee;
  if (consignee && typeof consignee === "object") {
    const name = (consignee as Record<string, unknown>).name;
    if (typeof name === "string") return name;
  }
  return fallback;
}

export function consigneeMatches(
  consignee: unknown,
  username: string,
): boolean {
  if (!username) return false;
  const name = getConsigneeName(consignee);
  return name.toLowerCase() === username.toLowerCase();
}

export type AirRouteLocations = {
  executedAt: { code?: string; name?: string } | null;
  destination: { code?: string; name?: string } | null;
};

function airShipmentHasRoute(shipment: AirShipment): boolean {
  return !!(
    shipment.executedAt?.name?.trim() || shipment.destination?.name?.trim()
  );
}

/** Aeropuertos de un envío vía /air-shipments/details/{id} (el listado no los incluye). */
export async function fetchAirShipmentRouteDetail(
  shipment: AirShipment,
  options: LinbisFetchOptions,
): Promise<AirRouteLocations> {
  const fallback: AirRouteLocations = {
    executedAt: shipment.executedAt ?? shipment.origin ?? null,
    destination: shipment.destination ?? null,
  };

  if (!shipment.id || airShipmentHasRoute(shipment)) return fallback;

  const { accessToken, refreshAccessToken, signal } = options;
  const response = refreshAccessToken
    ? await linbisFetch(
        `https://api.linbis.com/air-shipments/details/${shipment.id}`,
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
      )
    : await fetch(
        `https://api.linbis.com/air-shipments/details/${shipment.id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          signal,
        },
      );

  if (!response.ok) return fallback;

  const detail = await response.json();
  const enriched = mergeAirShipmentRouteFromDetail(shipment, detail);
  return {
    executedAt: enriched.executedAt ?? null,
    destination: enriched.destination ?? null,
  };
}

/** Índice number → trackingNumber desde /api/shipping-orders (ids distintos a /air-shipments). */
export async function fetchShippingOrderTrackingIndex(
  consigneeName: string,
  options: LinbisFetchOptions,
): Promise<Record<string, string>> {
  const { accessToken, refreshAccessToken, signal, maxPages = 40 } = options;
  const index: Record<string, string> = {};
  let page = 1;
  const pageSize = 100;

  while (page <= maxPages) {
    if (signal?.aborted) break;

    const params = new URLSearchParams({
      ConsigneeName: consigneeName,
      PageNumber: page.toString(),
      PageSize: pageSize.toString(),
    });
    const url = `https://api.linbis.com/api/shipping-orders?${params}`;

    const response = refreshAccessToken
      ? await linbisFetch(
          url,
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
        )
      : await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          signal,
        });

    if (!response.ok) {
      if (page === 1) return index;
      break;
    }

    const data = (await response.json()) as {
      shippingOrders?: { items?: Array<Record<string, unknown>> };
    };
    const items = data.shippingOrders?.items ?? [];
    if (!items.length) break;

    for (const order of items) {
      const number =
        typeof order.number === "string" ? order.number.trim() : "";
      const trackingNumber =
        typeof order.trackingNumber === "string"
          ? order.trackingNumber.trim()
          : "";
      if (number && trackingNumber) {
        index[number] = trackingNumber;
      }
    }

    if (items.length < pageSize) break;
    page++;
  }

  return index;
}
