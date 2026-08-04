import { linbisFetch } from "./linbisFetch";

const LINBIS_JSON_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
} as const;

export interface QuoteProfitShipmentLink {
  shipmentNumber: string;
  shippingOrderNumber: string | null;
}

export interface QuoteProfitIndex {
  byHbli: Record<string, string>;
  bySog: Record<string, string>;
  byShipmentId: Record<string, string>;
  /** QUO normalizado → datos de operación vinculada */
  byQuote: Record<string, QuoteProfitShipmentLink>;
}

export type LinbisFetchOptions = {
  accessToken: string;
  refreshAccessToken: () => Promise<string>;
  signal?: AbortSignal;
};

function normalizeLookupKey(value?: string | null): string {
  return (value ?? "").trim().toUpperCase();
}

function isQuoteNumber(value: unknown): value is string {
  return typeof value === "string" && value.trim().toUpperCase().startsWith("QUO");
}

/** Muestra y filtra solo la parte base: QUO0006526-000847-006 → QUO0006526 */
export function normalizeQuoteNumber(
  value: string | null | undefined,
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const base = trimmed.split("-")[0]?.trim() ?? "";
  return isQuoteNumber(base) ? base : null;
}

function isHbliNumber(value: unknown): value is string {
  return typeof value === "string" && value.trim().toUpperCase().startsWith("HBLI");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChargeLike = { income?: { reference?: string } };

/** HBLI en charges[].income.reference. */
export function extractHbliFromCharges(charges: unknown): string | null {
  if (!Array.isArray(charges)) return null;
  for (const charge of charges as ChargeLike[]) {
    const ref = charge.income?.reference;
    if (isHbliNumber(ref)) return ref.trim();
  }
  return null;
}

const OCEAN_CONTAINER_NUMBER_RE = /^[A-Z]{4}[0-9]{7}$/i;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CommodityLike = {
  number?: string | null;
  description?: string | null;
  trackingNumber?: string | null;
  containerNumber?: string | null;
};

function extractOceanContainerCandidate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toUpperCase();
  return OCEAN_CONTAINER_NUMBER_RE.test(trimmed) ? trimmed : null;
}

function extractContainerFromCommodity(item: CommodityLike): string | null {
  const fromFields =
    extractOceanContainerCandidate(item.trackingNumber) ??
    extractOceanContainerCandidate(item.containerNumber);
  if (fromFields) return fromFields;

  if (typeof item.description !== "string") return null;
  for (const line of item.description.split("\n")) {
    const fromLine = extractOceanContainerCandidate(line);
    if (fromLine) return fromLine;
  }
  return null;
}

/**
 * Extrae HBLI y número de contenedor desde commodities.
 * El contenedor puede venir en trackingNumber/containerNumber/description
 * aunque el commodity.number sea un SOG (no HBLI).
 */
export function extractHbliFromCommodities(items: unknown): {
  hbliNumber: string | null;
  containerNumber: string | null;
} {
  if (!Array.isArray(items)) {
    return { hbliNumber: null, containerNumber: null };
  }

  const commodities = items as CommodityLike[];
  const hbliItem = commodities.find((item) => isHbliNumber(item.number));
  const hbliNumber = hbliItem?.number?.trim() || null;

  const ordered = hbliItem
    ? [hbliItem, ...commodities.filter((item) => item !== hbliItem)]
    : commodities;

  let containerNumber: string | null = null;
  for (const item of ordered) {
    containerNumber = extractContainerFromCommodity(item);
    if (containerNumber) break;
  }

  return { hbliNumber, containerNumber };
}

/** Carga commodities del módulo ocean y resuelve contenedor/HBLI. */
export async function fetchOceanCommodityTracking(
  options: LinbisFetchOptions & {
    shipmentNumber: string;
    moduleId?: number | null;
  },
): Promise<{ hbliNumber: string | null; containerNumber: string | null }> {
  const empty = { hbliNumber: null, containerNumber: null };
  const shipmentNumber = options.shipmentNumber.trim();
  const moduleId =
    typeof options.moduleId === "number" && options.moduleId > 0
      ? options.moduleId
      : null;

  const loadByModule = async (id: number | string) => {
    const response = await linbisFetch(
      `https://api.linbis.com/commodities/by-module/${id}?pageNumber=1&pageSize=50`,
      {
        method: "GET",
        headers: LINBIS_JSON_HEADERS,
        signal: options.signal,
      },
      options.accessToken,
      options.refreshAccessToken,
    );
    if (!response.ok) return [] as unknown[];
    const data = (await response.json()) as { items?: unknown[] };
    return data.items || [];
  };

  try {
    let items: unknown[] = [];

    // /ocean-shipments/all no trae commodities; moduleId (= shipment.id) sí resuelve.
    if (moduleId) {
      items = await loadByModule(moduleId);
    }

    // Fallback legacy: commodities?Number=… (sirve para SOG, no para HBLI puro).
    if (!items.length && shipmentNumber) {
      const resp1 = await linbisFetch(
        `https://api.linbis.com/commodities?Number=${encodeURIComponent(shipmentNumber)}&PageNumber=1&PageSize=5`,
        {
          method: "GET",
          headers: LINBIS_JSON_HEADERS,
          signal: options.signal,
        },
        options.accessToken,
        options.refreshAccessToken,
      );
      if (resp1.ok) {
        const data1 = (await resp1.json()) as {
          items?: Array<{ moduleId?: number | string }>;
        };
        const firstModuleId = data1.items?.[0]?.moduleId;
        if (firstModuleId) {
          items = await loadByModule(firstModuleId);
        }
      }
    }

    if (!items.length) return empty;

    const extracted = extractHbliFromCommodities(items);
    return {
      hbliNumber:
        extracted.hbliNumber ??
        (isHbliNumber(shipmentNumber) ? shipmentNumber : null),
      containerNumber: extracted.containerNumber,
    };
  } catch {
    return empty;
  }
}

function unwrapProfitRows(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];

  const record = data as Record<string, unknown>;
  for (const key of ["items", "data", "results", "value"] as const) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }

  return [];
}

export function parseQuoteProfitPayload(data: unknown): QuoteProfitIndex {
  const rows = unwrapProfitRows(data);
  const byHbli: Record<string, string> = {};
  const bySog: Record<string, string> = {};
  const byShipmentId: Record<string, string> = {};
  const byQuote: Record<string, QuoteProfitShipmentLink> = {};

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const quoteNumber = normalizeQuoteNumber(
      typeof record.quoteNumber === "string" ? record.quoteNumber : null,
    );
    if (!quoteNumber) continue;

    const hbli =
      typeof record.shipmentNumber === "string"
        ? record.shipmentNumber.trim()
        : "";
    const sog =
      typeof record.shippingOrderNumber === "string"
        ? record.shippingOrderNumber.trim()
        : "";
    const shipmentId = record.shipmentId;

    if (hbli) byHbli[normalizeLookupKey(hbli)] = quoteNumber;
    if (sog) bySog[normalizeLookupKey(sog)] = quoteNumber;
    if (typeof shipmentId === "number" && shipmentId > 0) {
      byShipmentId[String(shipmentId)] = quoteNumber;
    }
    if (hbli || sog) {
      byQuote[normalizeLookupKey(quoteNumber)] = {
        shipmentNumber: hbli,
        shippingOrderNumber: sog || null,
      };
    }
  }

  return { byHbli, bySog, byShipmentId, byQuote };
}

/** Única fuente de verdad para QUO: GET /Quotes/Profit */
export async function fetchQuoteProfitIndex(
  options: LinbisFetchOptions,
): Promise<QuoteProfitIndex> {
  const { accessToken, refreshAccessToken, signal } = options;
  const response = await linbisFetch(
    "https://api.linbis.com/Quotes/Profit",
    { method: "GET", headers: LINBIS_JSON_HEADERS, signal },
    accessToken,
    refreshAccessToken,
  );

  if (!response.ok) {
    return { byHbli: {}, bySog: {}, byShipmentId: {}, byQuote: {} };
  }

  const data = await response.json();
  return parseQuoteProfitPayload(data);
}

/** Resuelve QUO desde índice Profit: HBLI, SOG, shipmentId (cruza ambos mapas). */
export function lookupQuoteFromProfitIndex(
  index: QuoteProfitIndex | undefined,
  keys: {
    hbli?: string | null;
    sogNumber?: string | null;
    shipmentId?: number | null;
  },
): string | null {
  if (!index) return null;

  if (keys.shipmentId && keys.shipmentId > 0) {
    const byId = index.byShipmentId[String(keys.shipmentId)];
    if (byId) return byId;
  }

  const uniqueKeys = [
    normalizeLookupKey(keys.hbli),
    normalizeLookupKey(keys.sogNumber),
  ].filter((key, index, arr) => key && arr.indexOf(key) === index);

  for (const key of uniqueKeys) {
    if (index.byHbli[key]) return index.byHbli[key];
    if (index.bySog[key]) return index.bySog[key];
  }

  return null;
}

/** Resuelve vínculo cotización → operación desde índice Profit por número QUO. */
export function lookupShipmentLinkFromProfitIndex(
  index: QuoteProfitIndex | undefined,
  quoteNumber: string | null | undefined,
): QuoteProfitShipmentLink | null {
  if (!index) return null;

  const normalized = normalizeQuoteNumber(quoteNumber);
  if (!normalized) return null;

  return index.byQuote[normalizeLookupKey(normalized)] ?? null;
}

/** Resuelve shipmentNumber (HBLI, etc.) desde índice Profit por número de cotización QUO. */
export function lookupShipmentNumberFromProfitIndex(
  index: QuoteProfitIndex | undefined,
  quoteNumber: string | null | undefined,
): string | null {
  const link = lookupShipmentLinkFromProfitIndex(index, quoteNumber);
  return link?.shipmentNumber?.trim() || null;
}

/** Número con el que filtran air/ocean-shipments. Marítimo: HBLI; aéreo: SOG. */
export function getShipmentFilterNumberFromProfitLink(
  link: QuoteProfitShipmentLink | null | undefined,
  shipmentType?: "air" | "ocean" | null,
): string | null {
  if (!link) return null;

  if (shipmentType === "ocean") {
    const hbli = link.shipmentNumber?.trim() || "";
    return hbli || link.shippingOrderNumber?.trim() || null;
  }

  const sog = link.shippingOrderNumber?.trim() || "";
  return sog || link.shipmentNumber?.trim() || null;
}
