import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCommissionAmount } from "../commissionAnalysisService";
import type { AppliedComparisonSuggestion } from "../comparisonSuggestions";
import {
  buildPeriodComparison,
  type PeriodComparisonResult,
} from "../periodComparisonAnalytics";
import type { CommissionAnalysisReport } from "../types";
import {
  AnalyticsSectionHeader,
  ComparisonModeBanner,
  InsightPanel,
  KpiCard,
  KpiGrid,
  type InsightItem,
} from "../analyticsUi";
import {
  C,
  base,
  styles,
} from "@/components/administrador/reporteria/financiera/executiveReportingUi";

type Props = {
  report: CommissionAnalysisReport;
  suggestion: AppliedComparisonSuggestion;
  comparisonSummary?: PeriodComparisonResult | null;
};

function formatDelta(value: number | null): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatPts(value: number | null): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} pp`;
}

function deltaTone(value: number | null): "positive" | "negative" | "neutral" {
  if (value == null || value === 0) return "neutral";
  return value > 0 ? "positive" : "negative";
}

function PeriodColumn({
  title,
  subtitle,
  metrics,
}: {
  title: string;
  subtitle: string;
  metrics: PeriodComparisonResult["periodA"];
}) {
  const { t } = useTranslation();

  return (
    <div style={{ ...styles.card, padding: 16, flex: "1 1 300px", minWidth: 0 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ ...styles.sectionTitle, marginBottom: 4 }}>{title}</div>
        <div style={{ ...base, fontSize: 12, color: C.textMuted }}>{subtitle}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <KpiCard
          compact
          label={t("analisysSystem.operations.columns.income")}
          value={formatCommissionAmount(metrics.income)}
          accent="primary"
        />
        <KpiCard
          compact
          label={t("analisysSystem.operations.columns.expense")}
          value={formatCommissionAmount(metrics.expense)}
        />
        <KpiCard
          compact
          label={t("analisysSystem.operations.columns.profit")}
          value={formatCommissionAmount(metrics.profit)}
          accent="positive"
        />
        <KpiCard
          compact
          label={t("analisysSystem.analytics.comparison.marginPct")}
          value={metrics.marginPct != null ? `${metrics.marginPct}%` : "—"}
        />
        <KpiCard
          compact
          label={t("analisysSystem.analytics.periodComparison.invoices")}
          value={String(metrics.invoiceCount)}
          hint={t("analisysSystem.analytics.periodComparison.operations", {
            count: metrics.operationCount,
          })}
        />
      </div>
    </div>
  );
}

export default function PeriodComparisonTab({
  report,
  suggestion,
  comparisonSummary,
}: Props) {
  const { t } = useTranslation();

  const result = useMemo(
    () => comparisonSummary ?? buildPeriodComparison(report, suggestion),
    [comparisonSummary, report, suggestion],
  );

  const chartData = useMemo(
    () => [
      {
        metric: t("analisysSystem.operations.columns.income"),
        periodA: result.periodA.income,
        periodB: result.periodB.income,
      },
      {
        metric: t("analisysSystem.operations.columns.expense"),
        periodA: result.periodA.expense,
        periodB: result.periodB.expense,
      },
      {
        metric: t("analisysSystem.operations.columns.profit"),
        periodA: result.periodA.profit,
        periodB: result.periodB.profit,
      },
    ],
    [result, t],
  );

  const insights = useMemo((): InsightItem[] => {
    const items: InsightItem[] = [];
    const { periodA, periodB, deltas } = result;

    items.push({
      id: "headline",
      tone: deltaTone(deltas.profitPct),
      text: t("analisysSystem.analytics.periodComparison.insights.headline", {
        periodA: periodA.label,
        periodB: periodB.label,
        profitA: formatCommissionAmount(periodA.profit),
        profitB: formatCommissionAmount(periodB.profit),
        change: formatDelta(deltas.profitPct),
      }),
    });

    if (deltas.incomePct != null) {
      items.push({
        id: "income",
        tone: deltaTone(deltas.incomePct),
        text: t("analisysSystem.analytics.periodComparison.insights.income", {
          periodA: periodA.label,
          periodB: periodB.label,
          incomeA: formatCommissionAmount(periodA.income),
          incomeB: formatCommissionAmount(periodB.income),
          change: formatDelta(deltas.incomePct),
        }),
      });
    }

    if (deltas.marginPts != null) {
      items.push({
        id: "margin",
        tone: deltaTone(deltas.marginPts),
        text: t("analisysSystem.analytics.periodComparison.insights.margin", {
          marginA: periodA.marginPct ?? 0,
          marginB: periodB.marginPct ?? 0,
          changePts: formatPts(deltas.marginPts),
        }),
      });
    }

    if (periodA.invoiceCount > 0 || periodB.invoiceCount > 0) {
      items.push({
        id: "activity",
        tone: "neutral",
        text: t("analisysSystem.analytics.periodComparison.insights.activity", {
          invoicesA: periodA.invoiceCount,
          invoicesB: periodB.invoiceCount,
          operationsA: periodA.operationCount,
          operationsB: periodB.operationCount,
          change: formatDelta(deltas.invoiceCountPct),
        }),
      });
    }

    if (deltas.expensePct != null && Math.abs(deltas.expensePct) >= 5) {
      items.push({
        id: "expense",
        tone: deltas.expensePct > 0 ? "warning" : "positive",
        text: t("analisysSystem.analytics.periodComparison.insights.expense", {
          expenseA: formatCommissionAmount(periodA.expense),
          expenseB: formatCommissionAmount(periodB.expense),
          change: formatDelta(deltas.expensePct),
        }),
      });
    }

    return items;
  }, [result, t]);

  return (
    <div>
      <AnalyticsSectionHeader
        title={t("analisysSystem.sections.periodComparison.title")}
        description={t("analisysSystem.analytics.periodComparison.lead")}
      />

      <ComparisonModeBanner
        label={t(suggestion.labelKey)}
        periodALabel={suggestion.periodA.label}
        periodBLabel={suggestion.periodB.label}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <KpiCard
          label={t("analisysSystem.analytics.periodComparison.deltaProfit")}
          value={formatDelta(result.deltas.profitPct)}
          hint={t("analisysSystem.analytics.periodComparison.deltaProfitHint", {
            periodA: result.periodA.label,
            periodB: result.periodB.label,
          })}
          accent={deltaTone(result.deltas.profitPct) === "positive" ? "positive" : "neutral"}
        />
        <KpiCard
          label={t("analisysSystem.analytics.periodComparison.deltaIncome")}
          value={formatDelta(result.deltas.incomePct)}
          hint={t("analisysSystem.analytics.periodComparison.deltaIncomeHint")}
        />
        <KpiCard
          label={t("analisysSystem.analytics.periodComparison.deltaMargin")}
          value={formatPts(result.deltas.marginPts)}
          hint={t("analisysSystem.analytics.periodComparison.deltaMarginHint")}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <PeriodColumn
          title={t("analisysSystem.analytics.periodComparison.periodA")}
          subtitle={result.periodA.label}
          metrics={result.periodA}
        />
        <PeriodColumn
          title={t("analisysSystem.analytics.periodComparison.periodB")}
          subtitle={result.periodB.label}
          metrics={result.periodB}
        />
      </div>

      <InsightPanel
        title={t("analisysSystem.analytics.insightsTitle")}
        items={insights}
      />

      <div style={{ ...styles.card, padding: 16 }}>
        <div style={{ ...styles.sectionTitle, marginBottom: 8 }}>
          {t("analisysSystem.analytics.periodComparison.chartTitle")}
        </div>
        <p style={{ ...base, fontSize: 12, color: C.textMuted, margin: "0 0 16px" }}>
          {t("analisysSystem.analytics.periodComparison.chartDescription")}
        </p>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCommissionAmount(v)} width={88} />
              <Tooltip formatter={(value) => formatCommissionAmount(Number(value))} />
              <Legend />
              <Bar
                dataKey="periodA"
                name={result.periodA.label}
                fill={C.primary}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="periodB"
                name={result.periodB.label}
                fill={C.textMuted}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
