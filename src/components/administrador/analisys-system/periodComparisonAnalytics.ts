import type { CommissionAnalysisInvoiceRow, CommissionAnalysisReport } from "./types";
import type { AppliedComparisonSuggestion, ComparisonPeriod } from "./comparisonSuggestions";

export type PeriodMetricsSummary = {
  income: number;
  expense: number;
  profit: number;
  marginPct: number | null;
  invoiceCount: number;
  operationCount: number;
};

export type PeriodComparisonDeltas = {
  incomePct: number | null;
  expensePct: number | null;
  profitPct: number | null;
  marginPts: number | null;
  invoiceCountPct: number | null;
  operationCountPct: number | null;
};

export type PeriodComparisonResult = {
  suggestionId: string;
  periodA: PeriodMetricsSummary & ComparisonPeriod;
  periodB: PeriodMetricsSummary & ComparisonPeriod;
  deltas: PeriodComparisonDeltas;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
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

function parseIsoDate(dateStr: string): Date | null {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return null;
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function isDateInRange(rowDate: Date, start: Date, end: Date): boolean {
  const iso = toIsoDate(rowDate);
  const startIso = toIsoDate(start);
  const endIso = toIsoDate(end);
  return iso >= startIso && iso <= endIso;
}

function marginPct(income: number, profit: number): number | null {
  if (income <= 0) return null;
  return round2((profit / income) * 100);
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return round2(((current - previous) / Math.abs(previous)) * 100);
}

function flattenRows(report: CommissionAnalysisReport): CommissionAnalysisInvoiceRow[] {
  return report.groups.flatMap((group) => group.rows);
}

function summarizePeriod(
  rows: CommissionAnalysisInvoiceRow[],
  period: ComparisonPeriod,
): PeriodMetricsSummary {
  const start = parseIsoDate(period.startDate);
  const end = parseIsoDate(period.endDate);
  if (!start || !end) {
    return {
      income: 0,
      expense: 0,
      profit: 0,
      marginPct: null,
      invoiceCount: 0,
      operationCount: 0,
    };
  }

  const invoices = new Set<string>();
  const operations = new Set<string>();
  let income = 0;
  let expense = 0;
  let profit = 0;

  for (const row of rows) {
    const parsed = parseUsDate(row.date);
    if (!parsed || !isDateInRange(parsed, start, end)) continue;

    invoices.add(row.invoice);
    const opKey = row.hawbHbl || row.shipmentRef || row.invoice;
    operations.add(opKey);
    income = round2(income + row.income);
    expense = round2(expense + (row.expense ?? 0));
    profit = round2(profit + (row.profit ?? 0));
  }

  return {
    income,
    expense,
    profit,
    marginPct: marginPct(income, profit),
    invoiceCount: invoices.size,
    operationCount: operations.size,
  };
}

export function buildPeriodComparison(
  report: CommissionAnalysisReport,
  suggestion: AppliedComparisonSuggestion,
): PeriodComparisonResult {
  const rows = flattenRows(report);
  const periodAMetrics = summarizePeriod(rows, suggestion.periodA);
  const periodBMetrics = summarizePeriod(rows, suggestion.periodB);

  return {
    suggestionId: suggestion.id,
    periodA: { ...suggestion.periodA, ...periodAMetrics },
    periodB: { ...suggestion.periodB, ...periodBMetrics },
    deltas: {
      incomePct: pctChange(periodAMetrics.income, periodBMetrics.income),
      expensePct: pctChange(periodAMetrics.expense, periodBMetrics.expense),
      profitPct: pctChange(periodAMetrics.profit, periodBMetrics.profit),
      marginPts:
        periodAMetrics.marginPct != null && periodBMetrics.marginPct != null
          ? round2(periodAMetrics.marginPct - periodBMetrics.marginPct)
          : null,
      invoiceCountPct: pctChange(periodAMetrics.invoiceCount, periodBMetrics.invoiceCount),
      operationCountPct: pctChange(periodAMetrics.operationCount, periodBMetrics.operationCount),
    },
  };
}

