import {
  extractHbliFromCharges,
  fetchQuoteProfitIndex,
  fetchQuoteTrackingByNumber,
  lookupQuoteFromProfitIndex,
  lookupTrackingFromQuoteIndex,
  normalizeQuoteNumber,
  type QuoteProfitIndex,
} from "../../src/services/linbisQuoteLookup";

type LinbisAuth = {
  accessToken: string;
  refreshAccessToken: () => Promise<string>;
};

type ShipmentQuoteKeys = {
  number?: string | null;
  id?: number | string | null;
  charges?: unknown;
};

const emptyProfit = (): QuoteProfitIndex => ({
  byHbli: {},
  bySog: {},
  byShipmentId: {},
  byQuote: {},
});

let cacheUsername = "";
let profitIndex: QuoteProfitIndex = emptyProfit();
let profitFetched = false;
let profitInflight: Promise<QuoteProfitIndex> | null = null;
/** QUO → tracking (CF 17), llenado bajo demanda. */
let quoteTrackingByQuote: Record<string, string> = {};
const quoteTrackingInflight = new Map<string, Promise<string | null>>();

function resetIfUsernameChanged(username: string) {
  const next = username.trim();
  if (cacheUsername === next) return;
  cacheUsername = next;
  profitIndex = emptyProfit();
  profitFetched = false;
  profitInflight = null;
  quoteTrackingByQuote = {};
  quoteTrackingInflight.clear();
}

export function clearOperacionQuoteTrackingCache() {
  cacheUsername = "";
  profitIndex = emptyProfit();
  profitFetched = false;
  profitInflight = null;
  quoteTrackingByQuote = {};
  quoteTrackingInflight.clear();
}

export function getCachedQuoteTrackingIndex(): Record<string, string> {
  return quoteTrackingByQuote;
}

export function getCachedProfitIndex(): QuoteProfitIndex {
  return profitIndex;
}

export function isProfitIndexFetched(): boolean {
  return profitFetched;
}

export async function ensureProfitIndex(
  username: string,
  auth: LinbisAuth,
): Promise<QuoteProfitIndex> {
  resetIfUsernameChanged(username);
  if (profitFetched) return profitIndex;
  if (profitInflight) return profitInflight;

  profitInflight = (async () => {
    const index = await fetchQuoteProfitIndex(auth);
    profitIndex = index;
    profitFetched = true;
    profitInflight = null;
    return index;
  })().catch((err) => {
    profitInflight = null;
    profitFetched = true;
    profitIndex = emptyProfit();
    throw err;
  });

  return profitInflight;
}

export function resolveShipmentQuoteNumber(
  shipment: ShipmentQuoteKeys,
  index: QuoteProfitIndex = profitIndex,
): string | null {
  const sogNumber = shipment.number?.trim() || null;
  const shipmentId =
    typeof shipment.id === "number"
      ? shipment.id
      : Number(shipment.id) || null;
  const fromCharges = extractHbliFromCharges(shipment.charges);
  const hbli =
    fromCharges ||
    (sogNumber && sogNumber.toUpperCase().startsWith("HBLI")
      ? sogNumber
      : null);

  return lookupQuoteFromProfitIndex(index, {
    hbli,
    sogNumber,
    shipmentId,
  });
}

/**
 * Misma cascada que web ocean: Profit (si falta) → CF 17 de ESA QUO
 * (pagina /Quotes y corta al encontrar), sin bajar todo el catálogo.
 */
export async function ensureQuoteTrackingForShipment(
  username: string,
  shipment: ShipmentQuoteKeys,
  auth: LinbisAuth,
): Promise<{
  quoteNumber: string | null;
  trackingNumber: string | null;
  quoteTrackingIndex: Record<string, string>;
  profitIndex: QuoteProfitIndex;
}> {
  resetIfUsernameChanged(username);

  let profit = profitIndex;
  try {
    profit = await ensureProfitIndex(username, auth);
  } catch {
    profit = emptyProfit();
  }

  const quoteNumber = resolveShipmentQuoteNumber(shipment, profit);
  if (!quoteNumber) {
    return {
      quoteNumber: null,
      trackingNumber: null,
      quoteTrackingIndex: quoteTrackingByQuote,
      profitIndex: profit,
    };
  }

  const cached = lookupTrackingFromQuoteIndex(
    quoteTrackingByQuote,
    quoteNumber,
  );
  if (cached) {
    return {
      quoteNumber,
      trackingNumber: cached,
      quoteTrackingIndex: quoteTrackingByQuote,
      profitIndex: profit,
    };
  }

  const quoteKey =
    normalizeQuoteNumber(quoteNumber)?.toUpperCase() ??
    quoteNumber.trim().toUpperCase();

  let inflight = quoteTrackingInflight.get(quoteKey);
  if (!inflight) {
    inflight = fetchQuoteTrackingByNumber(username, quoteNumber, auth)
      .then((tracking) => {
        if (tracking) {
          quoteTrackingByQuote = {
            ...quoteTrackingByQuote,
            [quoteKey]: tracking,
          };
        }
        return tracking;
      })
      .finally(() => {
        quoteTrackingInflight.delete(quoteKey);
      });
    quoteTrackingInflight.set(quoteKey, inflight);
  }

  const trackingNumber = await inflight;
  return {
    quoteNumber,
    trackingNumber,
    quoteTrackingIndex: quoteTrackingByQuote,
    profitIndex: profit,
  };
}
