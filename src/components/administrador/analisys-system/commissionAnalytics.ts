import type { CommissionAnalysisInvoiceRow, CommissionAnalysisReport } from "./types";

export type TimeGranularity = "week" | "month" | "quarter" | "semester" | "year";

export const TIME_GRANULARITIES: TimeGranularity[] = [
  "week",
  "month",
  "quarter",
  "semester",
  "year",
];

export type PeriodMetrics = {
  periodKey: string;
  periodLabel: string;
  income: number;
  expense: number;
  profit: number;
};

export type TimeSeriesResult = {
  granularity: TimeGranularity;
  periods: string[];
  byRep: Map<string, PeriodMetrics[]>;
};

export type RepComparisonRow = {
  salesRep: string;
  income: number;
  expense: number;
  profit: number;
  incomeSharePct: number | null;
  profitSharePct: number | null;
  isTotal?: boolean;
};

export type TopCustomerRow = {
  consignee: string;
  invoiceCount: number;
  invoices: string[];
  income: number;
  expense: number;
  profit: number;
  incomeSharePct: number;
  profitSharePct: number;
};

const TOTAL_KEY = "__TOTAL__";

const DERIVATIVES_CACHE_MAX = 40;
const derivativesCache = new Map<string, unknown>();

export function clearCommissionAnalyticsDerivatives(): void {
  derivativesCache.clear();
}

function reportFingerprint(report: CommissionAnalysisReport): string {
  return `${report.startDate}|${report.endDate}|${report.invoiceCount}|${report.generatedAt.getTime()}`;
}

function getCached<T>(key: string, compute: () => T): T {
  if (derivativesCache.has(key)) {
    const value = derivativesCache.get(key) as T;
    // Refresh LRU order
    derivativesCache.delete(key);
    derivativesCache.set(key, value);
    return value;
  }
  const value = compute();
  derivativesCache.set(key, value);
  while (derivativesCache.size > DERIVATIVES_CACHE_MAX) {
    const oldest = derivativesCache.keys().next().value;
    if (oldest == null) break;
    derivativesCache.delete(oldest);
  }
  return value;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function sumNullAsZero(values: Array<number | null>): number {
  return round2(values.reduce<number>((sum, value) => sum + (value ?? 0), 0));
}

function parseUsDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const month = parseInt(parts[0], 10);
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  if (Number.isNaN(month) || Number.isNaN(day) || Number.isNaN(year)) return null;
  return new Date(year, month - 1, day);
}

function flattenRows(report: CommissionAnalysisReport): CommissionAnalysisInvoiceRow[] {
  return report.groups.flatMap((group) => group.rows);
}

function getISOWeekKey(date: Date): string {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function parseIsoDate(dateStr: string): Date | null {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return null;
  return new Date(year, month - 1, day);
}

function countPeriodBucketsInRange(
  startDate: string,
  endDate: string,
  granularity: TimeGranularity,
): number {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  if (!start || !end) return 0;

  const keys = new Set<string>();
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);

  const from = cursor <= endDay ? cursor : endDay;
  const to = cursor <= endDay ? endDay : cursor;
  const walk = new Date(from);

  while (walk <= to) {
    keys.add(getPeriodKey(walk, granularity));
    walk.setDate(walk.getDate() + 1);
  }

  return keys.size;
}

export function getCoherentGranularities(
  startDate: string,
  endDate: string,
): TimeGranularity[] {
  const coherent = TIME_GRANULARITIES.filter(
    (granularity) => countPeriodBucketsInRange(startDate, endDate, granularity) >= 2,
  );
  return coherent.length > 0 ? coherent : ["week"];
}

export function pickDefaultTrendGranularity(
  available: TimeGranularity[],
): TimeGranularity {
  if (available.includes("month")) return "month";
  return available[0] ?? "week";
}

function getPeriodKey(date: Date, granularity: TimeGranularity): string {
  const year = date.getFullYear();
  switch (granularity) {
    case "week":
      return getISOWeekKey(date);
    case "month":
      return `${year}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    case "quarter":
      return `${year}-Q${Math.floor(date.getMonth() / 3) + 1}`;
    case "semester":
      return `${year}-S${date.getMonth() < 6 ? 1 : 2}`;
    case "year":
      return `${year}`;
  }
}

export function formatPeriodLabel(
  periodKey: string,
  granularity: TimeGranularity,
  locale: string,
): string {
  if (granularity === "week") {
    const [year, week] = periodKey.split("-W");
    return locale.startsWith("es") ? `Semana ${week} · ${year}` : `Week ${week} · ${year}`;
  }
  if (granularity === "month") {
    const [year, month] = periodKey.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString(locale, { month: "short", year: "numeric" });
  }
  if (granularity === "quarter") {
    const [year, quarter] = periodKey.split("-Q");
    return locale.startsWith("es")
      ? `T${quarter} ${year}`
      : `Q${quarter} ${year}`;
  }
  if (granularity === "semester") {
    const [year, semester] = periodKey.split("-S");
    return locale.startsWith("es")
      ? `S${semester} ${year}`
      : `H${semester} ${year}`;
  }
  return periodKey;
}

function buildSeriesMap(
  rows: CommissionAnalysisInvoiceRow[],
  granularity: TimeGranularity,
  locale: string,
): Map<string, Map<string, PeriodMetrics>> {
  const byRep = new Map<string, Map<string, PeriodMetrics>>();

  const add = (rep: string, periodKey: string, row: CommissionAnalysisInvoiceRow) => {
    if (!byRep.has(rep)) byRep.set(rep, new Map());
    const periods = byRep.get(rep)!;
    if (!periods.has(periodKey)) {
      periods.set(periodKey, {
        periodKey,
        periodLabel: formatPeriodLabel(periodKey, granularity, locale),
        income: 0,
        expense: 0,
        profit: 0,
      });
    }
    const bucket = periods.get(periodKey)!;
    bucket.income = round2(bucket.income + row.income);
    bucket.expense = round2(bucket.expense + (row.expense ?? 0));
    bucket.profit = round2(bucket.profit + (row.profit ?? 0));
  };

  for (const row of rows) {
    const parsed = parseUsDate(row.date);
    if (!parsed) continue;
    const periodKey = getPeriodKey(parsed, granularity);
    add(row.salesRep, periodKey, row);
    add(TOTAL_KEY, periodKey, row);
  }

  return byRep;
}

function sortPeriodKeys(keys: Iterable<string>, granularity: TimeGranularity): string[] {
  return [...keys].sort((a, b) => {
    if (granularity === "week") return a.localeCompare(b);
    if (granularity === "year") return Number(a) - Number(b);
    return a.localeCompare(b);
  });
}

export function buildTimeSeries(
  report: CommissionAnalysisReport,
  granularity: TimeGranularity,
  locale: string,
): TimeSeriesResult {
  const cacheKey = `ts|${reportFingerprint(report)}|${granularity}|${locale}`;
  return getCached(cacheKey, () => {
    const raw = buildSeriesMap(flattenRows(report), granularity, locale);
    const periodSet = new Set<string>();
    for (const periods of raw.values()) {
      for (const key of periods.keys()) periodSet.add(key);
    }
    const periods = sortPeriodKeys(periodSet, granularity);

    const byRep = new Map<string, PeriodMetrics[]>();
    for (const [rep, periodMap] of raw) {
      byRep.set(
        rep,
        periods.map((periodKey) => {
          const hit = periodMap.get(periodKey);
          return (
            hit ?? {
              periodKey,
              periodLabel: formatPeriodLabel(periodKey, granularity, locale),
              income: 0,
              expense: 0,
              profit: 0,
            }
          );
        }),
      );
    }

    return { granularity, periods, byRep };
  });
}

export function listSalesRepsFromReport(report: CommissionAnalysisReport): string[] {
  return report.groups.map((group) => group.salesRep).sort((a, b) => a.localeCompare(b, "es"));
}

export function buildRepComparison(
  report: CommissionAnalysisReport,
  selectedReps: string[],
  includeTotal: boolean,
): RepComparisonRow[] {
  const sortedSelection = [...selectedReps].sort().join("|");
  const cacheKey = `cmp|${reportFingerprint(report)}|${sortedSelection}|${includeTotal}`;
  return getCached(cacheKey, () => {
    const totals = report.totals;
    const rows: RepComparisonRow[] = [];

    for (const rep of selectedReps) {
      const group = report.groups.find((g) => g.salesRep === rep);
      if (!group) continue;
      const income = group.subtotal.income;
      const expense = group.subtotal.expense;
      const profit = group.subtotal.profit;
      rows.push({
        salesRep: rep,
        income,
        expense,
        profit,
        incomeSharePct:
          totals.income > 0 ? round2((income / totals.income) * 100) : null,
        profitSharePct:
          totals.profit !== 0 ? round2((profit / totals.profit) * 100) : null,
      });
    }

    if (includeTotal) {
      rows.push({
        salesRep: TOTAL_KEY,
        income: totals.income,
        expense: totals.expense,
        profit: totals.profit,
        incomeSharePct: totals.income > 0 ? 100 : null,
        profitSharePct: totals.profit !== 0 ? 100 : null,
        isTotal: true,
      });
    }

    return rows;
  });
}

export type TrendSummary = {
  totalIncome: number;
  totalExpense: number;
  totalProfit: number;
  marginPct: number | null;
  periodCount: number;
  avgIncomePerPeriod: number;
  avgProfitPerPeriod: number;
  bestProfitPeriod: PeriodMetrics | null;
  worstProfitPeriod: PeriodMetrics | null;
  lastPeriod: PeriodMetrics | null;
  previousPeriod: PeriodMetrics | null;
  profitChangePct: number | null;
  incomeChangePct: number | null;
};

export type ComparisonInsightData = {
  leaderIncome: RepComparisonRow | null;
  leaderProfit: RepComparisonRow | null;
  leaderMargin: { salesRep: string; marginPct: number } | null;
  topThreeIncomeShare: number;
  repCount: number;
};

export type TopCustomerInsightData = {
  topByInvoices: TopCustomerRow | null;
  topByIncome: TopCustomerRow | null;
  topThreeIncomeShare: number;
  clientCount: number;
  totalInvoices: number;
};

function marginPct(income: number, profit: number): number | null {
  if (income <= 0) return null;
  return round2((profit / income) * 100);
}

export function summarizeTrendSeries(series: PeriodMetrics[]): TrendSummary {
  const active = series.filter((p) => p.income > 0 || p.expense > 0 || p.profit !== 0);
  const totalIncome = round2(active.reduce((s, p) => s + p.income, 0));
  const totalExpense = round2(active.reduce((s, p) => s + p.expense, 0));
  const totalProfit = round2(active.reduce((s, p) => s + p.profit, 0));
  const periodCount = active.length;

  const bestProfitPeriod =
    active.length > 0
      ? active.reduce((best, p) => (p.profit > best.profit ? p : best), active[0])
      : null;
  const worstProfitPeriod =
    active.length > 0
      ? active.reduce((worst, p) => (p.profit < worst.profit ? p : worst), active[0])
      : null;

  const lastPeriod = active.length > 0 ? active[active.length - 1] : null;
  const previousPeriod = active.length > 1 ? active[active.length - 2] : null;

  const profitChangePct =
    lastPeriod && previousPeriod && previousPeriod.profit !== 0
      ? round2(((lastPeriod.profit - previousPeriod.profit) / Math.abs(previousPeriod.profit)) * 100)
      : null;
  const incomeChangePct =
    lastPeriod && previousPeriod && previousPeriod.income !== 0
      ? round2(((lastPeriod.income - previousPeriod.income) / previousPeriod.income) * 100)
      : null;

  return {
    totalIncome,
    totalExpense,
    totalProfit,
    marginPct: marginPct(totalIncome, totalProfit),
    periodCount,
    avgIncomePerPeriod: periodCount > 0 ? round2(totalIncome / periodCount) : 0,
    avgProfitPerPeriod: periodCount > 0 ? round2(totalProfit / periodCount) : 0,
    bestProfitPeriod,
    worstProfitPeriod,
    lastPeriod,
    previousPeriod,
    profitChangePct,
    incomeChangePct,
  };
}

export function enrichSeriesWithDeltas(series: PeriodMetrics[]) {
  return series.map((point, index) => {
    const prev = index > 0 ? series[index - 1] : null;
    const profitDelta =
      prev && prev.profit !== 0
        ? round2(((point.profit - prev.profit) / Math.abs(prev.profit)) * 100)
        : null;
    const incomeDelta =
      prev && prev.income !== 0
        ? round2(((point.income - prev.income) / prev.income) * 100)
        : null;
    return {
      ...point,
      marginPct: marginPct(point.income, point.profit),
      profitDeltaPct: profitDelta,
      incomeDeltaPct: incomeDelta,
    };
  });
}

export function buildComparisonInsightData(
  rows: RepComparisonRow[],
  report: CommissionAnalysisReport,
): ComparisonInsightData {
  const reps = rows.filter((r) => !r.isTotal);
  const leaderIncome =
    reps.length > 0 ? reps.reduce((a, b) => (b.income > a.income ? b : a), reps[0]) : null;
  const leaderProfit =
    reps.length > 0 ? reps.reduce((a, b) => (b.profit > a.profit ? b : a), reps[0]) : null;

  let leaderMargin: ComparisonInsightData["leaderMargin"] = null;
  for (const row of reps) {
    const m = marginPct(row.income, row.profit);
    if (m == null) continue;
    if (!leaderMargin || m > leaderMargin.marginPct) {
      leaderMargin = { salesRep: row.salesRep, marginPct: m };
    }
  }

  const sortedByIncome = [...reps].sort((a, b) => b.income - a.income);
  const topThreeIncomeShare = round2(
    sortedByIncome.slice(0, 3).reduce((s, r) => s + (r.incomeSharePct ?? 0), 0),
  );

  return {
    leaderIncome,
    leaderProfit,
    leaderMargin,
    topThreeIncomeShare,
    repCount: report.groups.length,
  };
}

export function buildTopCustomerInsightData(rows: TopCustomerRow[]): TopCustomerInsightData {
  if (rows.length === 0) {
    return {
      topByInvoices: null,
      topByIncome: null,
      topThreeIncomeShare: 0,
      clientCount: 0,
      totalInvoices: 0,
    };
  }

  const topByInvoices = [...rows].sort((a, b) => b.invoiceCount - a.invoiceCount)[0];
  const topByIncome = [...rows].sort((a, b) => b.income - a.income)[0];
  const topThreeIncomeShare = round2(
    [...rows].sort((a, b) => b.incomeSharePct - a.incomeSharePct).slice(0, 3)
      .reduce((s, r) => s + r.incomeSharePct, 0),
  );
  const totalInvoices = rows.reduce((s, r) => s + r.invoiceCount, 0);

  return {
    topByInvoices,
    topByIncome,
    topThreeIncomeShare,
    clientCount: rows.length,
    totalInvoices,
  };
}

export function buildTopCustomersByConsignee(
  report: CommissionAnalysisReport,
  salesRep: string,
  limit = 100,
): TopCustomerRow[] {
  const cacheKey = `top|${reportFingerprint(report)}|${salesRep}|${limit}`;
  return getCached(cacheKey, () => {
    const group = report.groups.find((g) => g.salesRep === salesRep);
    if (!group) return [];

    const byConsignee = new Map<
      string,
      { invoices: Set<string>; income: number; expenses: Array<number | null>; profits: Array<number | null> }
    >();

    for (const row of group.rows) {
      const consignee = (row.consignee || "—").trim() || "—";
      if (!byConsignee.has(consignee)) {
        byConsignee.set(consignee, {
          invoices: new Set(),
          income: 0,
          expenses: [],
          profits: [],
        });
      }
      const bucket = byConsignee.get(consignee)!;
      bucket.invoices.add(row.invoice);
      bucket.income = round2(bucket.income + row.income);
      bucket.expenses.push(row.expense);
      bucket.profits.push(row.profit);
    }

    const repIncome = group.subtotal.income;
    const repProfit = group.subtotal.profit;

    return [...byConsignee.entries()]
      .map(([consignee, bucket]) => {
        const income = bucket.income;
        const expense = sumNullAsZero(bucket.expenses);
        const profit = sumNullAsZero(bucket.profits);
        return {
          consignee,
          invoiceCount: bucket.invoices.size,
          invoices: [...bucket.invoices].sort((a, b) => a.localeCompare(b, "es")),
          income,
          expense,
          profit,
          incomeSharePct:
            repIncome > 0 ? round2((income / repIncome) * 100) : 0,
          profitSharePct:
            repProfit !== 0 ? round2((profit / repProfit) * 100) : 0,
        };
      })
      .sort((a, b) => b.invoiceCount - a.invoiceCount)
      .slice(0, limit);
  });
}

export const TOTAL_SERIES_KEY = TOTAL_KEY;
