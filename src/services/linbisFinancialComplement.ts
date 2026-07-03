import {
  extractQuotesFromResponse,
  getQuoteDate,
  getQuoteStatus,
  parseLinbisAmount,
  toIsoDate,
} from "@/components/administrador/reporteria/financiera/quoteUtils";
import {
  fetchClientQuoteProfitIndex,
  fetchClientShipmentIndex,
  lookupClientQuoteNumber,
} from "@/services/linbisClientBulkFetch";
import { linbisFetch } from "@/services/linbisFetch";
import { type LinbisFetchOptions } from "@/services/linbisQuoteLookup";
import {
  buildShipmentNumberSet,
  normalizeShipmentKey,
} from "@/utils/linbisClientFilter";
import {
  extractQuoteNumberFromInvoice,
  parseQuoteCurrency,
  type InvoiceLike,
} from "@/utils/invoiceFinancial";

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
  masterNumber: string | null;
  waybillNumber: string | null;
  customerReference: string | null;
  currentFlow: string | null;
};

export type QuoteChargeDetail = {
  description: string;
  amount: number;
};

export type QuoteComplementSummary = {
  number: string;
  date: string;
  status: string;
  origin: string;
  destination: string;
  modeOfTransportation: string;
  currency: string | null;
  totalIncome: number;
  chargeDetails: QuoteChargeDetail[];
};

export type InvoiceComplementData = {
  shipmentAccounting: ShipmentAccountingInfo | null;
  quote: QuoteComplementSummary | null;
  quoteNumber: string | null;
};

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

function normalizeShipmentRecord(
  raw: Record<string, unknown>,
): ShipmentAccountingInfo {
  return {
    accountingStatus:
      typeof raw.accountingStatus === "string" ? raw.accountingStatus : null,
    masterNumber:
      typeof raw.masterNumber === "string" ? raw.masterNumber : null,
    waybillNumber:
      typeof raw.waybillNumber === "string" ? raw.waybillNumber : null,
    customerReference:
      typeof raw.customerReference === "string" ? raw.customerReference : null,
    currentFlow:
      typeof raw.currentFlow === "string" ? raw.currentFlow : null,
  };
}

function normalizeQuoteSummary(
  raw: Record<string, unknown>,
): QuoteComplementSummary {
  const chargeDetails = Array.isArray(raw.chargeDetails)
    ? raw.chargeDetails
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const charge = item as Record<string, unknown>;
          const description = String(charge.description ?? "").trim();
          const amount = parseLinbisAmount(charge.amount);
          if (!description) return null;
          return { description, amount };
        })
        .filter((item): item is QuoteChargeDetail => item !== null)
    : [];

  const mode =
    typeof raw.modeOfTransportation === "string"
      ? raw.modeOfTransportation
      : raw.modeOfTransportation &&
          typeof raw.modeOfTransportation === "object" &&
          "name" in raw.modeOfTransportation
        ? String(
            (raw.modeOfTransportation as { name?: unknown }).name ?? "",
          )
        : "";

  return {
    number: String(raw.number ?? ""),
    date: getQuoteDate(raw),
    status: getQuoteStatus(raw),
    origin: String(raw.origin ?? ""),
    destination: String(raw.destination ?? ""),
    modeOfTransportation: mode,
    currency: parseQuoteCurrency(raw),
    totalIncome: parseLinbisAmount(
      raw.totalIncome ??
        raw.totalCharge_IncomeValue ??
        raw.totalCharge_IncomeDisplayValue,
    ),
    chargeDetails,
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
  invoice: InvoiceLike,
  consigneeName: string,
  clientShipmentNumbers: Set<string>,
  options: LinbisFetchOptions,
): Promise<InvoiceComplementData> {
  const cacheKey = buildComplementCacheKey(consigneeName, invoiceKey);
  const cached = complementCache.get(cacheKey);
  if (cached) return cached;

  const shipmentNumber = invoice.shipment?.number?.trim() || null;
  let quoteNumber = extractQuoteNumberFromInvoice(invoice);

  let shipmentAccounting: ShipmentAccountingInfo | null = null;
  if (shipmentNumber) {
    const normalizedShipment = normalizeShipmentKey(shipmentNumber);
    const shipmentIndex = await fetchClientShipmentIndex(
      consigneeName,
      options,
    );
    const record = shipmentIndex.get(normalizedShipment);
    shipmentAccounting = record ? normalizeShipmentRecord(record) : null;

    if (
      !quoteNumber &&
      normalizedShipment &&
      clientShipmentNumbers.has(normalizedShipment)
    ) {
      const profitIndex = await fetchClientQuoteProfitIndex(
        consigneeName,
        clientShipmentNumbers,
        options,
      );
      quoteNumber = lookupClientQuoteNumber(profitIndex, normalizedShipment);
    }
  }

  const quote = quoteNumber
    ? await fetchQuoteByNumber(consigneeName, quoteNumber, options)
    : null;

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

  if (startDate) params.set("StartDate", `${startDate}T00:00:00`);
  if (endDate) params.set("EndDate", `${endDate}T23:59:59`);

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
    return;
  }

  for (const key of complementCache.keys()) {
    if (key.startsWith(`${consigneeName}::`)) {
      complementCache.delete(key);
    }
  }
}

export { buildShipmentNumberSet };
