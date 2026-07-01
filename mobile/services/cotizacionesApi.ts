import { buildLinbisListParams } from "../../src/services/linbisListFetch";
import { linbisFetch } from "../../src/services/linbisFetch";
import {
  normalizeClientQuote,
  sortQuotesByNumber,
  type ClientQuote,
} from "../../src/services/cotizacionesLogic";
import { OPERACIONES_PAGE_SIZE } from "../../src/services/operacionesPagination";

const LINBIS_QUOTES_URL = "https://api.linbis.com/Quotes";

type LinbisOptions = {
  accessToken: string;
  refreshAccessToken: () => Promise<string>;
  signal?: AbortSignal;
};

export type CotizacionesFetchMode = "client" | "server";

export type CotizacionesPageResult = {
  mode: CotizacionesFetchMode;
  /** Lista completa cuando la API ignora la paginación y devuelve todo de una vez. */
  catalog: ClientQuote[] | null;
  items: ClientQuote[];
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

export async function fetchCotizacionesPage(
  consigneeName: string,
  page: number,
  options: LinbisOptions,
  pageSize = OPERACIONES_PAGE_SIZE,
): Promise<CotizacionesPageResult> {
  const params = buildLinbisListParams(consigneeName, page, pageSize);
  const url = `${LINBIS_QUOTES_URL}?${params}`;

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
    if (response.status === 400 && page === 1) {
      return {
        mode: "server",
        catalog: null,
        items: [],
        page,
        hasMore: false,
      };
    }
    throw new Error(`Error al obtener cotizaciones (${response.status})`);
  }

  const data = await response.json();
  const records = extractArrayPayload(data);
  const mapped = sortQuotesByNumber(
    records.map((record) => normalizeClientQuote(record as ClientQuote)),
  );

  // La API de Quotes suele ignorar ItemsPerPage y devolver el catálogo completo.
  if (page === 1 && mapped.length > pageSize) {
    return {
      mode: "client",
      catalog: mapped,
      items: mapped.slice(0, pageSize),
      page: 1,
      hasMore: mapped.length > pageSize,
    };
  }

  return {
    mode: "server",
    catalog: null,
    items: mapped,
    page,
    hasMore: mapped.length >= pageSize,
  };
}
