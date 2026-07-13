import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AppliedComparisonSuggestion } from "../comparisonSuggestions";
import {
  buildRepPeriodComparison,
  formatComparisonDelta,
  type ComparisonReportsBundle,
} from "../comparisonModeAnalytics";
import { buildPeriodComparison } from "../periodComparisonAnalytics";
import { formatCommissionAmount, formatReportDateRange } from "../commissionAnalysisService";
import {
  TOTAL_SERIES_KEY,
  TIME_GRANULARITIES,
  buildTimeSeries,
  enrichSeriesWithDeltas,
  getCoherentGranularities,
  listSalesRepsFromReport,
  pickDefaultTrendGranularity,
  summarizeTrendSeries,
  type TimeGranularity,
} from "../commissionAnalytics";
import type { CommissionAnalysisReport } from "../types";
import {
  AnalyticsSectionHeader,
  ChartGuide,
  ComparisonModeBanner,
  InsightPanel,
  KpiCard,
  KpiGrid,
  type InsightItem,
} from "../analyticsUi";
import {
  C,
  base,
  inputStyle,
  styles,
} from "@/components/administrador/reporteria/financiera/executiveReportingUi";

type Props = {
  report: CommissionAnalysisReport;
  comparisonSuggestion?: AppliedComparisonSuggestion | null;
  comparisonBundle?: ComparisonReportsBundle | null;
};

function formatDelta(value: number | null): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function deltaTone(value: number | null): "positive" | "negative" | "neutral" {
  if (value == null || value === 0) return "neutral";
  return value > 0 ? "positive" : "negative";
}

export default function TrendsTab({
  report,
  comparisonSuggestion,
  comparisonBundle,
}: Props) {
  const { t, i18n } = useTranslation();
  const reps = useMemo(() => listSalesRepsFromReport(report), [report]);
  const [granularity, setGranularity] = useState<TimeGranularity>("month");
  const [selectedRep, setSelectedRep] = useState<string>(TOTAL_SERIES_KEY);
  const rangeLabel = useMemo(
    () => formatReportDateRange(report.startDate, report.endDate),
    [report.startDate, report.endDate],
  );

  const availableGranularities = useMemo(
    () => getCoherentGranularities(report.startDate, report.endDate),
    [report.startDate, report.endDate],
  );

  useEffect(() => {
    setGranularity((current) => {
      if (availableGranularities.includes(current)) return current;
      return pickDefaultTrendGranularity(availableGranularities);
    });
  }, [availableGranularities]);

  const seriesResult = useMemo(
    () => buildTimeSeries(report, granularity, i18n.language),
    [report, granularity, i18n.language],
  );

  const activeSeries = useMemo(() => {
    return seriesResult.byRep.get(selectedRep) ?? [];
  }, [seriesResult, selectedRep]);

  const enrichedSeries = useMemo(
    () => enrichSeriesWithDeltas(activeSeries),
    [activeSeries],
  );

  const summary = useMemo(() => summarizeTrendSeries(activeSeries), [activeSeries]);

  const chartData = useMemo(
    () =>
      enrichedSeries.map((point) => ({
        label: point.periodLabel,
        income: point.income,
        expense: point.expense,
        profit: point.profit,
      })),
    [enrichedSeries],
  );

  const repLabel =
    selectedRep === TOTAL_SERIES_KEY
      ? t("analisysSystem.analytics.total")
      : selectedRep;

  const granularityLabel = t(`analisysSystem.analytics.granularityOptions.${granularity}`);

  const insights = useMemo((): InsightItem[] => {
    const items: InsightItem[] = [];

    items.push({
      id: "total",
      text: t("analisysSystem.analytics.trends.insights.total", {
        rep: repLabel,
        range: rangeLabel,
        income: formatCommissionAmount(summary.totalIncome),
        profit: formatCommissionAmount(summary.totalProfit),
        margin: summary.marginPct != null ? `${summary.marginPct}%` : "—",
      }),
    });

    if (summary.bestProfitPeriod) {
      items.push({
        id: "best",
        tone: "positive",
        text: t("analisysSystem.analytics.trends.insights.bestPeriod", {
          range: rangeLabel,
          period: summary.bestProfitPeriod.periodLabel,
          profit: formatCommissionAmount(summary.bestProfitPeriod.profit),
        }),
      });
    }

    if (summary.lastPeriod && summary.previousPeriod && summary.profitChangePct != null) {
      items.push({
        id: "change",
        tone: deltaTone(summary.profitChangePct),
        text: t("analisysSystem.analytics.trends.insights.periodChange", {
          range: rangeLabel,
          current: summary.lastPeriod.periodLabel,
          previous: summary.previousPeriod.periodLabel,
          change: formatDelta(summary.profitChangePct),
        }),
      });
    }

    if (summary.periodCount > 0) {
      items.push({
        id: "avg",
        text: t("analisysSystem.analytics.trends.insights.average", {
          range: rangeLabel,
          granularity: granularityLabel.toLowerCase(),
          income: formatCommissionAmount(summary.avgIncomePerPeriod),
          profit: formatCommissionAmount(summary.avgProfitPerPeriod),
        }),
      });
    }

    return items;
  }, [summary, repLabel, granularityLabel, rangeLabel, t]);

  const periodComparison = useMemo(
    () =>
      comparisonBundle?.summary ??
      (comparisonSuggestion ? buildPeriodComparison(report, comparisonSuggestion) : null),
    [comparisonBundle, report, comparisonSuggestion],
  );

  const repPeriodRows = useMemo(
    () =>
      comparisonBundle?.reps ??
      (comparisonSuggestion
        ? buildRepPeriodComparison(report, comparisonSuggestion)
        : []),
    [comparisonBundle, report, comparisonSuggestion],
  );

  const comparisonChartData = useMemo(() => {
    if (!periodComparison) return [];
    return [
      {
        label: periodComparison.periodA.label,
        income: periodComparison.periodA.income,
        expense: periodComparison.periodA.expense,
        profit: periodComparison.periodA.profit,
      },
      {
        label: periodComparison.periodB.label,
        income: periodComparison.periodB.income,
        expense: periodComparison.periodB.expense,
        profit: periodComparison.periodB.profit,
      },
    ];
  }, [periodComparison]);

  if (comparisonSuggestion && periodComparison) {
    return (
      <div>
        <AnalyticsSectionHeader
          title={t("analisysSystem.sections.trends.title")}
          description={t("analisysSystem.analytics.comparisonMode.trendsDescription")}
        />
        <ComparisonModeBanner
          label={t(comparisonSuggestion.labelKey)}
          periodALabel={comparisonSuggestion.periodA.label}
          periodBLabel={comparisonSuggestion.periodB.label}
        />
        <div style={{ ...styles.card, padding: 16, marginBottom: 20 }}>
          <div style={{ ...styles.sectionTitle, marginBottom: 12 }}>
            {t("analisysSystem.analytics.comparisonMode.teamTrendTitle")}
          </div>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <ComposedChart data={comparisonChartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCommissionAmount(v)} width={88} />
                <Tooltip formatter={(value) => formatCommissionAmount(Number(value))} />
                <Legend />
                <Bar dataKey="income" name={t("analisysSystem.operations.columns.income")} fill={C.primary} />
                <Bar dataKey="expense" name={t("analisysSystem.operations.columns.expense")} fill={C.textMuted} />
                <Line type="monotone" dataKey="profit" name={t("analisysSystem.operations.columns.profit")} stroke={C.positive} strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ ...styles.card, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead>
              <tr>
                <th style={styles.th}>{t("analisysSystem.filters.salesRep")}</th>
                <th style={{ ...styles.th, textAlign: "right" }}>
                  {t("analisysSystem.analytics.comparisonMode.profitA")}
                </th>
                <th style={{ ...styles.th, textAlign: "right" }}>
                  {t("analisysSystem.analytics.comparisonMode.profitB")}
                </th>
                <th style={{ ...styles.th, textAlign: "right" }}>
                  {t("analisysSystem.analytics.comparisonMode.deltaProfit")}
                </th>
              </tr>
            </thead>
            <tbody>
              {repPeriodRows.map((row) => (
                <tr key={row.salesRep}>
                  <td style={styles.td}>{row.salesRep}</td>
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    {formatCommissionAmount(row.periodA.profit)}
                  </td>
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    {formatCommissionAmount(row.periodB.profit)}
                  </td>
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    {formatComparisonDelta(row.deltas.profitPct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AnalyticsSectionHeader
        title={t("analisysSystem.sections.trends.title")}
        description={t("analisysSystem.analytics.trends.lead")}
      />

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 20,
          alignItems: "flex-end",
        }}
      >
        <div>
          <label style={styles.label}>{t("analisysSystem.analytics.granularity")}</label>
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value as TimeGranularity)}
            style={inputStyle}
          >
            {availableGranularities.map((value) => (
              <option key={value} value={value}>
                {t(`analisysSystem.analytics.granularityOptions.${value}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={styles.label}>{t("analisysSystem.filters.salesRep")}</label>
          <select
            value={selectedRep}
            onChange={(e) => setSelectedRep(e.target.value)}
            style={{ ...inputStyle, minWidth: 220 }}
          >
            <option value={TOTAL_SERIES_KEY}>{t("analisysSystem.analytics.total")}</option>
            {reps.map((rep) => (
              <option key={rep} value={rep}>
                {rep}
              </option>
            ))}
          </select>
        </div>
      </div>

      <KpiGrid>
        <KpiCard
          label={t("analisysSystem.operations.columns.income")}
          value={formatCommissionAmount(summary.totalIncome)}
          hint={t("analisysSystem.analytics.trends.kpi.incomeHint", {
            count: summary.periodCount,
            granularity: granularityLabel.toLowerCase(),
          })}
          accent="primary"
        />
        <KpiCard
          label={t("analisysSystem.operations.columns.profit")}
          value={formatCommissionAmount(summary.totalProfit)}
          hint={
            summary.marginPct != null
              ? t("analisysSystem.analytics.trends.kpi.marginHint", { margin: summary.marginPct })
              : undefined
          }
          accent="positive"
        />
        <KpiCard
          label={t("analisysSystem.analytics.trends.kpi.lastPeriod")}
          value={summary.lastPeriod ? formatCommissionAmount(summary.lastPeriod.profit) : "—"}
          hint={
            summary.profitChangePct != null
              ? t("analisysSystem.analytics.trends.kpi.vsPrevious", {
                change: formatDelta(summary.profitChangePct),
              })
              : undefined
          }
        />
        <KpiCard
          label={t("analisysSystem.analytics.trends.kpi.bestPeriod")}
          value={summary.bestProfitPeriod?.periodLabel ?? "—"}
          hint={
            summary.bestProfitPeriod
              ? formatCommissionAmount(summary.bestProfitPeriod.profit)
              : undefined
          }
        />
      </KpiGrid>

      <InsightPanel title={t("analisysSystem.analytics.insightsTitle")} items={insights} />

      <div style={{ ...styles.card, padding: 16, marginBottom: 16 }}>
        <div style={{ ...styles.sectionTitle, marginBottom: 8 }}>
          {t("analisysSystem.analytics.trends.chartTitle", { rep: repLabel })}
        </div>
        <p style={{ ...base, fontSize: 12, color: C.textMuted, margin: "0 0 12px" }}>
          {t("analisysSystem.analytics.trends.chartDescription")}
        </p>
        <ChartGuide
          items={[
            {
              color: C.primary,
              label: t("analisysSystem.operations.columns.income"),
              description: t("analisysSystem.analytics.trends.guide.income"),
            },
            {
              color: "#94a3b8",
              label: t("analisysSystem.operations.columns.expense"),
              description: t("analisysSystem.analytics.trends.guide.expense"),
            },
            {
              color: C.positive,
              label: t("analisysSystem.operations.columns.profit"),
              description: t("analisysSystem.analytics.trends.guide.profit"),
            },
          ]}
        />
        <div style={{ height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => formatCommissionAmount(v)}
                width={88}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatCommissionAmount(Number(value)),
                  String(name),
                ]}
              />
              <Legend />
              <Bar
                dataKey="income"
                name={t("analisysSystem.operations.columns.income")}
                fill={C.primary}
                radius={[3, 3, 0, 0]}
                maxBarSize={36}
              />
              <Bar
                dataKey="expense"
                name={t("analisysSystem.operations.columns.expense")}
                fill="#94a3b8"
                radius={[3, 3, 0, 0]}
                maxBarSize={36}
              />
              <Line
                type="monotone"
                dataKey="profit"
                name={t("analisysSystem.operations.columns.profit")}
                stroke={C.positive}
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ ...styles.card, overflowX: "auto" }}>
        <div style={{ ...styles.sectionTitle, padding: "12px 16px 0" }}>
          {t("analisysSystem.analytics.trends.tableTitle", { rep: repLabel })}
        </div>
        <p style={{ ...base, fontSize: 12, color: C.textMuted, margin: "4px 16px 12px" }}>
          {t("analisysSystem.analytics.trends.tableDescription")}
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
          <thead>
            <tr>
              <th style={styles.th}>{t("analisysSystem.analytics.period")}</th>
              <th style={{ ...styles.th, textAlign: "right" }}>
                {t("analisysSystem.operations.columns.income")}
              </th>
              <th style={{ ...styles.th, textAlign: "right" }}>
                {t("analisysSystem.operations.columns.expense")}
              </th>
              <th style={{ ...styles.th, textAlign: "right" }}>
                {t("analisysSystem.operations.columns.profit")}
              </th>
              <th style={{ ...styles.th, textAlign: "right" }}>
                {t("analisysSystem.analytics.trends.marginPct")}
              </th>
              <th style={{ ...styles.th, textAlign: "right" }}>
                {t("analisysSystem.analytics.trends.profitVsPrev")}
              </th>
            </tr>
          </thead>
          <tbody>
            {enrichedSeries.map((row) => (
              <tr key={row.periodKey}>
                <td style={styles.td}>{row.periodLabel}</td>
                <td style={{ ...styles.td, textAlign: "right" }}>
                  {formatCommissionAmount(row.income)}
                </td>
                <td style={{ ...styles.td, textAlign: "right" }}>
                  {formatCommissionAmount(row.expense)}
                </td>
                <td style={{ ...styles.td, textAlign: "right", fontWeight: 600 }}>
                  {formatCommissionAmount(row.profit)}
                </td>
                <td style={{ ...styles.td, textAlign: "right" }}>
                  {row.marginPct != null ? `${row.marginPct}%` : "—"}
                </td>
                <td
                  style={{
                    ...styles.td,
                    textAlign: "right",
                    color:
                      row.profitDeltaPct == null
                        ? C.textMuted
                        : row.profitDeltaPct >= 0
                          ? C.positive
                          : C.negative,
                  }}
                >
                  {formatDelta(row.profitDeltaPct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
