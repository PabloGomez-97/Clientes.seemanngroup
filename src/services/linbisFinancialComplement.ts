import {
  extractQuotesFromResponse,
  getQuoteDate,
  getQuoteStatus,
  parseLinbisAmount,
  toIsoDate,
} from "@/components/administrador/reporteria/financiera/quoteUtils";
import {
  fetchQuoteProfitIndex,
  lookupQuoteFromProfitIndex,
  type LinbisFetchOptions,
} from "@/services/linbisQuoteLookup";
import { linbisFetch } from "@/services/linbisFetch";

const LINBIS_JSON_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
} as const;

export type ClientFinancialPeriod =
  | "month"
  | "3months"
  | "6months"
  | "year"
  | "all";

export type ShipmentAccountingInfo = {
  accountingStatus: string | null;
  accountingParcial: string | null;
  currentFlow: string | null;
};

export type QuoteComplementSummary = {
  number: string;
  date: string;
  status: string;
  origin: string;
  destination: string;
  totalIncome: number;
  totalExpense: number;
  profit: number;
};

export type InvoiceComplementData = {
  shipmentAccounting: ShipmentAccountingInfo | null;
  quote: QuoteComplementSummary | null;
  quoteNumber: string | null;
};

type ProfitCacheEntry = {
  fetchedAt: number;
  promise: Promise<Awaited<ReturnType<typeof fetchQuoteProfitIndex>>>;
};

let profitIndexCache: ProfitCacheEntry | null = null;
const PROFIT_CACHE_TTL_MS = 60 * 60 * 1000;

const complementCache = new Map<string, InvoiceComplementData>();

export function getClientPeriodRange(period: ClientFinancialPeriod): {
  startDate: string | null;
  endDate: string | null;
} {
  if (period === "all") {
    return { startDate: null, endDate: null };
  }

  const end = new Date();
  const start = new Date();

  switch (period) {
    case "month":
      start.setMonth(end.getMonth() - 1);
      break;
    case "3months":
      start.setMonth(end.getMonth() - 3);
      break;
    case "6months":
      start.setMonth(end.getMonth() - 6);
      break;
    case "year":
      start.setFullYear(end.getFullYear() - 1);
      break;
  }

  return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
}

function normalizeQuoteSummary(
  raw: Record<string, unknown>,
): QuoteComplementSummary {
  const income = parseLinbisAmount(
    raw.totalIncome ??
      raw.totalCharge_IncomeValue ??
      raw.totalCharge_IncomeDisplayValue,
  );
  const expense = parseLinbisAmount(
    raw.totalExpense ??
      raw.totalCharge_ExpenseValue ??
      raw.totalCharge_ExpenseDisplayValue,
  );
  let profit = parseLinbisAmount(
    raw.profit ??
      raw.totalCharge_ProfitValue ??
      raw.totalCharge_ProfitDisplayValue,
  );
  if (!profit && (income || expense)) {
    profit = income - expense;
  }

  return {
    number: String(raw.number ?? ""),
    date: getQuoteDate(raw),
    status: getQuoteStatus(raw),
    origin: String(raw.origin ?? ""),
    destination: String(raw.destination ?? ""),
    totalIncome: income,
    totalExpense: expense,
    profit,
  };
}

function resolveShipmentDetailUrl(shipmentNumber: string): string | null {
  const normalized = shipmentNumber.trim().toUpperCase();
  if (normalized.startsWith("SOG")) {
    return "https://api.linbis.com/air-shipments/number";
  }
  if (normalized.startsWith("HBLI")) {
    return "https://api.linbis.com/ocean-shipments/number";
  }
  return null;
}

async function getProfitIndex(options: LinbisFetchOptions) {
  const now = Date.now();
  if (
    profitIndexCache &&
    now - profitIndexCache.fetchedAt < PROFIT_CACHE_TTL_MS
  ) {
    return profitIndexCache.promise;
  }

  const promise = fetchQuoteProfitIndex(options);
  profitIndexCache = { fetchedAt: now, promise };
  return promise;
}

async function fetchShipmentAccounting(
  shipmentNumber: string,
  options: LinbisFetchOptions,
): Promise<ShipmentAccountingInfo | null> {
  const baseUrl = resolveShipmentDetailUrl(shipmentNumber);
  if (!baseUrl) return null;

  const url = `${baseUrl}?number=${encodeURIComponent(shipmentNumber.trim())}`;
  const response = await linbisFetch(
    url,
    { method: "GET", headers: LINBIS_JSON_HEADERS, signal: options.signal },
    options.accessToken,
    options.refreshAccessToken,
  );

  if (!response.ok) return null;

  const data = (await response.json()) as Record<string, unknown>;
  return {
    accountingStatus:
      typeof data.accountingStatus === "string" ? data.accountingStatus : null,
    accountingParcial:
      typeof data.accountingParcial === "string"
        ? data.accountingParcial
        : null,
    currentFlow:
      typeof data.currentFlow === "string" ? data.currentFlow : null,
  };
}

async function fetchQuoteByNumber(
  consigneeName: string,
  quoteNumber: string,
  options: LinbisFetchOptions,
): Promise<QuoteComplementSummary | null> {
  const params = new URLSearchParams({
    ConsigneeName: consigneeName,
    Number: quoteNumber,
    IncludeFreightCharges: "true",
  });

  const response = await linbisFetch(
    `https://api.linbis.com/Quotes/filter?${params}`,
    { method: "GET", headers: LINBIS_JSON_HEADERS, signal: options.signal },
    options.accessToken,
    options.refreshAccessToken,
  );

  if (!response.ok) return null;

  const data = await response.json();
  const quotes = extractQuotesFromResponse(data);
  if (!quotes.length) return null;

  return normalizeQuoteSummary(quotes[0]);
}

function buildComplementCacheKey(
  consigneeName: string,
  invoiceKey: string,
): string {
  return `${consigneeName}::${invoiceKey}`;
}

export async function fetchInvoiceComplement(
  invoiceKey: string,
  shipmentNumber: string | null | undefined,
  consigneeName: string,
  options: LinbisFetchOptions,
): Promise<InvoiceComplementData> {
  const cacheKey = buildComplementCacheKey(consigneeName, invoiceKey);
  const cached = complementCache.get(cacheKey);
  if (cached) return cached;

  const trimmedShipment = shipmentNumber?.trim() || null;
  let quoteNumber: string | null = null;

  const shipmentAccounting = trimmedShipment
    ? await fetchShipmentAccounting(trimmedShipment, options)
    : null;

  let quote: QuoteComplementSummary | null = null;
  if (trimmedShipment) {
    const profitIndex = await getProfitIndex(options);
    const isAir = trimmedShipment.toUpperCase().startsWith("SOG");
    quoteNumber = lookupQuoteFromProfitIndex(profitIndex, {
      hbli: isAir ? null : trimmedShipment,
      sogNumber: isAir ? trimmedShipment : null,
    });

    if (quoteNumber) {
      quote = await fetchQuoteByNumber(consigneeName, quoteNumber, options);
    }
  }

  const result: InvoiceComplementData = {
    shipmentAccounting,
    quote,
    quoteNumber,
  };

  complementCache.set(cacheKey, result);
  return result;
}

export async function fetchQuotesComplementForPeriod(
  consigneeName: string,
  period: ClientFinancialPeriod,
  options: LinbisFetchOptions,
): Promise<QuoteComplementSummary[]> {
  const { startDate, endDate } = getClientPeriodRange(period);
  const params = new URLSearchParams({
    ConsigneeName: consigneeName,
    IncludeFreightCharges: "true",
  });

  if (startDate) {
    params.set("StartDate", `${startDate}T00:00:00`);
  }
  if (endDate) {
    params.set("EndDate", `${endDate}T23:59:59`);
  }

  const response = await linbisFetch(
    `https://api.linbis.com/Quotes/filter?${params}`,
    { method: "GET", headers: LINBIS_JSON_HEADERS, signal: options.signal },
    options.accessToken,
    options.refreshAccessToken,
  );

  if (!response.ok) {
    throw new Error(`Quotes/filter ${response.status}`);
  }

  const data = await response.json();
  const quotes = extractQuotesFromResponse(data)
    .map(normalizeQuoteSummary)
    .filter((quote) => quote.number);

  return quotes.sort(
    (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(),
  );
}

export function clearFinancialComplementCache(consigneeName?: string) {
  if (!consigneeName) {
    complementCache.clear();
    profitIndexCache = null;
    return;
  }

  for (const key of complementCache.keys()) {
    if (key.startsWith(`${consigneeName}::`)) {
      complementCache.delete(key);
    }
  }
}
