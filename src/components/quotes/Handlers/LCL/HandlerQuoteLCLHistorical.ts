import {
  extractPrice,
  normalize,
  splitCombinedPOD,
} from "./HandlerQuoteLCL";
import { buildPriceHistoryMarketMinSeries, historicalPodMatchesSelection } from "../shared/buildPriceHistorySeries";
import type {
  HistoricalOceanRow,
  PriceHistorySeriesResult,
} from "../shared/priceHistoryTypes";

export const GOOGLE_SHEET_LCL_HISTORICAL_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQYi3-CA6itt2SBNYumE3fuxpE0SSAtMMPn7K2LaqRPmduRvU3hSu11Vznn8NtG2yuDriuuL2E8VvOG/pub?gid=321196959&single=true&output=csv";

export const LCL_PRICE_HISTORY_MARKUP = 1.35;

export type LclPriceTier = "ofWM";

export const LCL_PRICE_TIERS: LclPriceTier[] = ["ofWM"];

export type LclPriceHistorySeriesResult = PriceHistorySeriesResult<LclPriceTier>;

function parseLclCurrency(raw: string | null | undefined): "USD" | "EUR" {
  if (raw && raw.toString().trim().toUpperCase() === "EUR") return "EUR";
  return "USD";
}

export function parseHistoricalLCL(data: string[][]): HistoricalOceanRow<LclPriceTier>[] {
  const rows: HistoricalOceanRow<LclPriceTier>[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    const pol = row[1];
    const pod = row[3];
    if (!pol || !pod || typeof pol !== "string" || typeof pod !== "string") {
      continue;
    }

    const validUntil = row[10]?.toString().trim() || "";
    if (!validUntil) continue;

    const ofWM = row[4];
    if (!ofWM) continue;

    rows.push({
      polNorm: normalize(pol),
      podRaw: pod,
      validUntil,
      currency: parseLclCurrency(row[5]),
      prices: {
        ofWM: ofWM.toString().trim(),
      },
    });
  }

  return rows;
}

export function buildLclMarketMinSeries(
  rows: HistoricalOceanRow<LclPriceTier>[],
  polNorm: string,
  podNorm: string,
  markup: number = LCL_PRICE_HISTORY_MARKUP,
): LclPriceHistorySeriesResult {
  return buildPriceHistoryMarketMinSeries(
    rows,
    LCL_PRICE_TIERS,
    polNorm,
    podNorm,
    markup,
    (row) =>
      row.polNorm === polNorm &&
      historicalPodMatchesSelection(row.podRaw, podNorm, splitCombinedPOD),
    extractPrice,
  );
}
