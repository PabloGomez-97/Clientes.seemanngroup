import { buildOperationsSummary, filterReportByIsoDateRange } from "./commissionAnalysisService";
import type { AppliedComparisonSuggestion } from "./comparisonSuggestions";
import { buildPeriodComparison, type PeriodMetricsSummary } from "./periodComparisonAnalytics";
import type { CommissionAnalysisInvoiceRow, CommissionAnalysisReport } from "./types";

export type PeriodDeltas = {
  incomePct: number | null;
  expensePct: number | null;
  profitPct: number | null;
  marginPts: number | null;
  invoiceCountPct: number | null;
  operationCountPct: number | null;
};

export type RepPeriodComparisonRow = {
  salesRep: string;
  periodA: PeriodMetricsSummary;
  periodB: PeriodMetricsSummary;
  deltas: PeriodDeltas;
};

export type CustomerPeriodComparisonRow = {
  consignee: string;
  periodA: PeriodMetricsSummary;
  periodB: PeriodMetricsSummary;
  deltas: PeriodDeltas;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return round2(((current - previous) / Math.abs(previous)) * 100);
}

function buildDeltas(periodA: PeriodMetricsSummary, periodB: PeriodMetricsSummary): PeriodDeltas {
  return {
    incomePct: pctChange(periodA.income, periodB.income),
    expensePct: pctChange(periodA.expense, periodB.expense),
    profitPct: pctChange(periodA.profit, periodB.profit),
    marginPts:
      periodA.marginPct != null && periodB.marginPct != null
        ? round2(periodA.marginPct - periodB.marginPct)
        : null,
    invoiceCountPct: pctChange(periodA.invoiceCount, periodB.invoiceCount),
    operationCountPct: pctChange(periodA.operationCount, periodB.operationCount),
  };
}

function flattenRows(report: CommissionAnalysisReport): CommissionAnalysisInvoiceRow[] {
  return report.groups.flatMap((group) => group.rows);
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
  return iso >= toIsoDate(start) && iso <= toIsoDate(end);
}

function marginPct(income: number, profit: number): number | null {
  if (income <= 0) return null;
  return round2((profit / income) * 100);
}

export function summarizeRowsForPeriod(
  rows: CommissionAnalysisInvoiceRow[],
  period: { startDate: string; endDate: string },
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
    operations.add(row.hawbHbl || row.shipmentRef || row.invoice);
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

export function buildRepPeriodComparison(
  report: CommissionAnalysisReport,
  suggestion: AppliedComparisonSuggestion,
): RepPeriodComparisonRow[] {
  const rows = flattenRows(report);
  const byRep = new Map<string, CommissionAnalysisInvoiceRow[]>();

  for (const row of rows) {
    const list = byRep.get(row.salesRep);
    if (list) list.push(row);
    else byRep.set(row.salesRep, [row]);
  }

  return [...byRep.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "es"))
    .map(([salesRep, repRows]) => {
      const periodA = summarizeRowsForPeriod(repRows, suggestion.periodA);
      const periodB = summarizeRowsForPeriod(repRows, suggestion.periodB);
      return {
        salesRep,
        periodA,
        periodB,
        deltas: buildDeltas(periodA, periodB),
      };
    });
}

export function buildCustomerPeriodComparison(
  report: CommissionAnalysisReport,
  salesRep: string,
  suggestion: AppliedComparisonSuggestion,
): CustomerPeriodComparisonRow[] {
  const byConsignee = new Map<string, CommissionAnalysisInvoiceRow[]>();

  for (const row of flattenRows(report)) {
    if (row.salesRep !== salesRep) continue;
    const consignee = (row.consignee || "—").trim() || "—";
    const list = byConsignee.get(consignee);
    if (list) list.push(row);
    else byConsignee.set(consignee, [row]);
  }

  return [...byConsignee.entries()]
    .map(([consignee, consigneeRows]) => {
      const periodA = summarizeRowsForPeriod(consigneeRows, suggestion.periodA);
      const periodB = summarizeRowsForPeriod(consigneeRows, suggestion.periodB);
      return {
        consignee,
        periodA,
        periodB,
        deltas: buildDeltas(periodA, periodB),
      };
    })
    .filter((row) => row.periodA.invoiceCount > 0 || row.periodB.invoiceCount > 0)
    .sort((a, b) => b.periodA.invoiceCount - a.periodA.invoiceCount);
}

export function getComparisonReports(
  report: CommissionAnalysisReport,
  suggestion: AppliedComparisonSuggestion,
) {
  const periodA = filterReportByIsoDateRange(
    report,
    suggestion.periodA.startDate,
    suggestion.periodA.endDate,
  );
  const periodB = filterReportByIsoDateRange(
    report,
    suggestion.periodB.startDate,
    suggestion.periodB.endDate,
  );
  return {
    periodA,
    periodB,
    summary: buildPeriodComparison(report, suggestion),
    operationsA: buildOperationsSummary(periodA),
    operationsB: buildOperationsSummary(periodB),
    reps: buildRepPeriodComparison(report, suggestion),
  };
}

export type ComparisonReportsBundle = ReturnType<typeof getComparisonReports>;

export function formatComparisonDelta(value: number | null): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function comparisonDeltaTone(
  value: number | null,
): "positive" | "negative" | "neutral" {
  if (value == null || value === 0) return "neutral";
  return value > 0 ? "positive" : "negative";
}
