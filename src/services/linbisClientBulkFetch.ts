import { normalizeInvoicesFromApi } from "@/components/administrador/reporteria/financiera/invoiceUtils";
import { LINBIS_PAGE_SIZE } from "@/services/linbisListFetch";
import { linbisFetch } from "@/services/linbisFetch";
import {
  filterRecordsForConsignee,
  matchesConsigneeName,
  normalizeShipmentKey,
} from "@/utils/linbisClientFilter";
import {
  lookupQuoteFromProfitIndex,
  parseQuoteProfitPayload,
  type LinbisFetchOptions,
  type QuoteProfitIndex,
} from "@/services/linbisQuoteLookup";

const LINBIS_JSON_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
} as const;

const INVOICES_ALL_URL = "https://api.linbis.com/invoices/all";
const SHIPMENTS_ALL_URL = "https://api.linbis.com/shipments/all";

export type ClientInvoiceEnrichment = {
  amountPaid: number;
  paymentDate: string | null;
  homeTotalAmount: number;
  moduleNumber: string;
  moduleType: string;
};

type CacheEntry<T> = {
  fetchedAt: number;
  data: T;
};

const CACHE_TTL_MS = 60 * 60 * 1000;
const invoiceEnrichmentCache = new Map<
  string,
  CacheEntry<Map<string, ClientInvoiceEnrichment>>
>();
const shipmentIndexCache = new Map<
  string,
  CacheEntry<Map<string, Record<string, unknown>>>
>();
const profitIndexCache = new Map<
  string,
  CacheEntry<QuoteProfitIndex>
>();

function buildUnfilteredListParams(page: number): URLSearchParams {
  return new URLSearchParams({
    Page: page.toString(),
    ItemsPerPage: LINBIS_PAGE_SIZE.toString(),
    SortBy: "newest",
  });
}

/** Pagina un endpoint listado SIN ConsigneeName; devuelve todas las páginas crudas. */
export async function fetchAllPaginatedUnfiltered(
  baseUrl: string,
  options: LinbisFetchOptions,
  maxPages = 40,
): Promise<Record<string, unknown>[]> {
  const { accessToken, refreshAccessToken, signal } = options;
  const all: Record<string, unknown>[] = [];
  let page = 1;

  while (page <= maxPages) {
    if (signal?.aborted) break;

    const url = `${baseUrl}?${buildUnfilteredListParams(page)}`;
    const response = await linbisFetch(
      url,
      { method: "GET", headers: LINBIS_JSON_HEADERS, signal },
      accessToken,
      refreshAccessToken,
    );

    if (!response.ok) {
      if (page === 1) return [];
      break;
    }

    const data = await response.json();
    const batch = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
    if (!batch.length) break;

    all.push(...batch);
    if (batch.length < LINBIS_PAGE_SIZE) break;
    page += 1;
  }

  return all;
}

/**
 * GET /invoices/all → filtra por billToName === consignatario activo.
 * Solo se expone el subconjunto del cliente (nunca el array completo).
 */
export async function fetchClientInvoiceEnrichmentMap(
  consigneeName: string,
  options: LinbisFetchOptions,
): Promise<Map<string, ClientInvoiceEnrichment>> {
  const cached = invoiceEnrichmentCache.get(consigneeName);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const response = await linbisFetch(
    INVOICES_ALL_URL,
    { method: "GET", headers: LINBIS_JSON_HEADERS, signal: options.signal },
    options.accessToken,
    options.refreshAccessToken,
  );

  const map = new Map<string, ClientInvoiceEnrichment>();
  if (!response.ok) {
    invoiceEnrichmentCache.set(consigneeName, { fetchedAt: Date.now(), data: map });
    return map;
  }

  const raw = await response.json();
  const allInvoices = normalizeInvoicesFromApi(raw);
  const clientInvoices = allInvoices.filter((invoice) =>
    matchesConsigneeName(invoice.billToName, consigneeName),
  );

  for (const invoice of clientInvoices) {
    const key = String(invoice.number ?? "").trim();
    if (!key) continue;
    map.set(key, {
      amountPaid: invoice.amountPaid ?? 0,
      paymentDate: invoice.paymentDate ?? null,
      homeTotalAmount: invoice.homeTotalAmount ?? 0,
      moduleNumber: invoice.moduleNumber ?? "",
      moduleType: invoice.moduleType ?? "",
    });
  }

  invoiceEnrichmentCache.set(consigneeName, {
    fetchedAt: Date.now(),
    data: map,
  });
  return map;
}

/**
 * GET /shipments/all sin ConsigneeName → filtra por campo consignee del registro.
 */
export async function fetchClientShipmentIndex(
  consigneeName: string,
  options: LinbisFetchOptions,
): Promise<Map<string, Record<string, unknown>>> {
  const cached = shipmentIndexCache.get(consigneeName);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const allShipments = await fetchAllPaginatedUnfiltered(
    SHIPMENTS_ALL_URL,
    options,
  );
  const clientShipments = filterRecordsForConsignee(allShipments, consigneeName);

  const index = new Map<string, Record<string, unknown>>();
  for (const record of clientShipments) {
    const number =
      typeof record.number === "string" ? normalizeShipmentKey(record.number) : "";
    if (number) index.set(number, record);
  }

  shipmentIndexCache.set(consigneeName, {
    fetchedAt: Date.now(),
    data: index,
  });
  return index;
}

/**
 * GET /Quotes/Profit sin filtro → conserva solo filas cuyo embarque pertenece al cliente.
 */
export async function fetchClientQuoteProfitIndex(
  consigneeName: string,
  clientShipmentNumbers: Set<string>,
  options: LinbisFetchOptions,
): Promise<QuoteProfitIndex> {
  const cacheKey = `${consigneeName}::${[...clientShipmentNumbers].sort().join("|")}`;
  const cached = profitIndexCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const response = await linbisFetch(
    "https://api.linbis.com/Quotes/Profit",
    { method: "GET", headers: LINBIS_JSON_HEADERS, signal: options.signal },
    options.accessToken,
    options.refreshAccessToken,
  );

  if (!response.ok) {
    const empty = parseQuoteProfitPayload([]);
    profitIndexCache.set(cacheKey, { fetchedAt: Date.now(), data: empty });
    return empty;
  }

  const data = await response.json();
  const rows = Array.isArray(data) ? data : [];
  const filteredRows = rows.filter((row) => {
    if (!row || typeof row !== "object") return false;
    const record = row as Record<string, unknown>;
    const shipmentNumber = normalizeShipmentKey(
      typeof record.shipmentNumber === "string" ? record.shipmentNumber : null,
    );
    const shippingOrderNumber = normalizeShipmentKey(
      typeof record.shippingOrderNumber === "string"
        ? record.shippingOrderNumber
        : null,
    );
    return (
      (shipmentNumber && clientShipmentNumbers.has(shipmentNumber)) ||
      (shippingOrderNumber && clientShipmentNumbers.has(shippingOrderNumber))
    );
  });

  const index = parseQuoteProfitPayload(filteredRows);
  profitIndexCache.set(cacheKey, { fetchedAt: Date.now(), data: index });
  return index;
}

export function lookupClientQuoteNumber(
  profitIndex: QuoteProfitIndex,
  shipmentNumber: string | null | undefined,
): string | null {
  const normalized = normalizeShipmentKey(shipmentNumber);
  if (!normalized) return null;

  const isAir = normalized.startsWith("SOG");
  return lookupQuoteFromProfitIndex(profitIndex, {
    hbli: isAir ? null : normalized,
    sogNumber: isAir ? normalized : null,
  });
}

export function clearClientBulkFetchCache(consigneeName?: string) {
  if (!consigneeName) {
    invoiceEnrichmentCache.clear();
    shipmentIndexCache.clear();
    profitIndexCache.clear();
    return;
  }

  invoiceEnrichmentCache.delete(consigneeName);
  shipmentIndexCache.delete(consigneeName);
  for (const key of profitIndexCache.keys()) {
    if (key.startsWith(`${consigneeName}::`)) {
      profitIndexCache.delete(key);
    }
  }
}
