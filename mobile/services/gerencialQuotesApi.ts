import type { QuoteStats } from "../../src/components/administrador/reporteria/financiera/types";
import {
  type ExecutiveQuote,
  type PeriodPreset,
  buildGlobalMonthlySummary,
  buildMonthlyComparison,
  extractQuotesFromResponse,
  filterQuotesByDateRange,
  filterQuotesBySalesRep,
  getPeriodRange,
  isAirMode,
  isQuoteCompleted,
  isSeaMode,
  isTruckMode,
  normalizeExecutiveQuote,
} from "../../src/components/administrador/reporteria/financiera/quoteUtils";
import { linbisFetch } from "../../src/services/linbisFetch";
import { fetchAdminEjecutivos, type AdminEjecutivoRow } from "./adminApi";

export type { PeriodPreset, ExecutiveQuote, QuoteStats };
export { getPeriodRange, buildMonthlyComparison, buildGlobalMonthlySummary };

export const PERIOD_OPTIONS: { key: PeriodPreset; label: string }[] = [
  { key: "this-month", label: "Este mes" },
  { key: "last-month", label: "Mes anterior" },
  { key: "this-year", label: "Este año" },
  { key: "last-year", label: "Año anterior" },
  { key: "last-12-months", label: "Últimos 12 meses" },
  { key: "custom", label: "Rango personalizado" },
];

export type RangeMode = PeriodPreset | "two-ranges";

export const RANGE_MODE_OPTIONS: { key: RangeMode; label: string }[] = [
  ...PERIOD_OPTIONS,
  { key: "two-ranges", label: "Comparativa entre dos rangos" },
];

export function labelForRangeMode(mode: RangeMode): string {
  return RANGE_MODE_OPTIONS.find((opt) => opt.key === mode)?.label ?? mode;
}

type LinbisOptions = {
  accessToken: string;
  refreshAccessToken: () => Promise<string>;
};

export function calculateQuoteStats(arr: ExecutiveQuote[]): QuoteStats {
  const n = arr.length;
  const completed = arr.filter((q) => isQuoteCompleted(q.status)).length;
  const air = arr.filter((q) => isAirMode(q.modeOfTransportation)).length;
  const sea = arr.filter((q) => isSeaMode(q.modeOfTransportation)).length;
  const truck = arr.filter((q) => isTruckMode(q.modeOfTransportation)).length;
  const income = arr.reduce((s, q) => s + (q.totalIncome || 0), 0);
  const expense = arr.reduce((s, q) => s + (q.totalExpense || 0), 0);
  const profit = arr.reduce((s, q) => s + (q.profit || 0), 0);
  const clients = new Set(
    arr
      .map((q) => q.consignee?.trim())
      .filter((c): c is string => !!c && c.length > 0),
  ).size;

  return {
    totalQuotes: n,
    completedQuotes: completed,
    pendingQuotes: n - completed,
    airQuotes: air,
    seaQuotes: sea,
    truckQuotes: truck,
    totalIncome: income,
    totalExpense: expense,
    totalProfit: profit,
    profitMargin: income > 0 ? (profit / income) * 100 : 0,
    averagePerQuote: n > 0 ? income / n : 0,
    averageProfitPerQuote: n > 0 ? profit / n : 0,
    completionRate: n > 0 ? (completed / n) * 100 : 0,
    uniqueConsignees: clients,
  };
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export async function fetchGerencialEjecutivos(
  portalToken: string,
): Promise<AdminEjecutivoRow[]> {
  const rows = await fetchAdminEjecutivos(portalToken);
  return rows.filter((row) => row.activo !== false && Boolean(row.nombre?.trim()));
}

export async function fetchQuotesForExecutive(
  salesRepName: string,
  rangeStart: string,
  rangeEnd: string,
  options: LinbisOptions,
): Promise<ExecutiveQuote[]> {
  const params = new URLSearchParams({ SalesRepName: salesRepName });
  if (rangeStart) params.append("StartDate", rangeStart);
  if (rangeEnd) params.append("EndDate", rangeEnd);

  const res = await linbisFetch(
    `https://api.linbis.com/Quotes/filter?${params}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    },
    options.accessToken,
    options.refreshAccessToken,
  );

  if (!res.ok) {
    throw new Error(`Error al obtener cotizaciones (${res.status})`);
  }

  const data = await res.json();
  const normalized = extractQuotesFromResponse(data).map(normalizeExecutiveQuote);
  const byRep = filterQuotesBySalesRep(normalized, salesRepName);
  return filterQuotesByDateRange(byRep, rangeStart, rangeEnd).sort(
    (a, b) =>
      new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(),
  );
}

export async function fetchQuotesComparative(
  executives: string[],
  rangeStart: string,
  rangeEnd: string,
  options: LinbisOptions,
): Promise<{ nombre: string; stats: QuoteStats; quotes: ExecutiveQuote[] }[]> {
  const results = await Promise.all(
    executives.map(async (nombre) => {
      const quotes = await fetchQuotesForExecutive(
        nombre,
        rangeStart,
        rangeEnd,
        options,
      );
      return { nombre, quotes, stats: calculateQuoteStats(quotes) };
    }),
  );
  return results.sort((a, b) => b.stats.totalProfit - a.stats.totalProfit);
}
