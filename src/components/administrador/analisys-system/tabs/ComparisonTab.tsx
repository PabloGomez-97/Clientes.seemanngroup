import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
import {
  buildComparisonInsightData,
  buildRepComparison,
  listSalesRepsFromReport,
} from "../commissionAnalytics";
import type { CommissionAnalysisReport } from "../types";
import { formatCommissionAmount, formatReportDateRange } from "../commissionAnalysisService";
import {
  AnalyticsSectionHeader,
  ComparisonModeBanner,
  InsightPanel,
  ShareBar,
  computeMarginPct,
  type InsightItem,
} from "../analyticsUi";
import {
  C,
  base,
  styles,
} from "@/components/administrador/reporteria/financiera/executiveReportingUi";

type Props = {
  report: CommissionAnalysisReport;
  comparisonSuggestion?: AppliedComparisonSuggestion | null;
  comparisonBundle?: ComparisonReportsBundle | null;
};

const CHART_COLORS = [C.primary, "#3b82f6", "#8b5cf6", "#06b6d4", "#f59e0b", "#64748b"];

export default function ComparisonTab({
  report,
  comparisonSuggestion,
  comparisonBundle,
}: Props) {
  const { t } = useTranslation();

  const repPeriodRows = useMemo(
    () =>
      comparisonBundle?.reps ??
      (comparisonSuggestion
        ? buildRepPeriodComparison(report, comparisonSuggestion)
        : []),
    [comparisonBundle, report, comparisonSuggestion],
  );

  const comparisonChartData = useMemo(
    () =>
      repPeriodRows.map((row) => ({
        name: row.salesRep,
        profitA: row.periodA.profit,
        profitB: row.periodB.profit,
      })),
    [repPeriodRows],
  );

  const allReps = useMemo(() => listSalesRepsFromReport(report), [report]);
  const [selectedReps, setSelectedReps] = useState<string[]>([]);
  const [includeTotal, setIncludeTotal] = useState(true);
  const rangeLabel = useMemo(
    () => formatReportDateRange(report.startDate, report.endDate),
    [report.startDate, report.endDate],
  );

  useEffect(() => {
    setSelectedReps((prev) => {
      if (prev.length === 0) return allReps.slice(0, 3);
      const valid = prev.filter((rep) => allReps.includes(rep));
      return valid.length > 0 ? valid : allReps.slice(0, 3);
    });
  }, [allReps]);

  const rows = useMemo(
    () => buildRepComparison(report, selectedReps, includeTotal),
    [report, selectedReps, includeTotal],
  );

  const repRows = useMemo(() => rows.filter((r) => !r.isTotal), [rows]);

  const insightData = useMemo(
    () => buildComparisonInsightData(rows, report),
    [rows, report],
  );

  const chartData = useMemo(
    () =>
      repRows.map((row) => ({
        name: row.salesRep,
        income: row.income,
        profit: row.profit,
        share: row.incomeSharePct ?? 0,
      })),
    [repRows],
  );

  const insights = useMemo((): InsightItem[] => {
    const items: InsightItem[] = [];

    if (insightData.leaderIncome) {
      items.push({
        id: "leader-income",
        tone: "positive",
        text: t("analisysSystem.analytics.comparison.insights.leaderIncome", {
          range: rangeLabel,
          name: insightData.leaderIncome.salesRep,
          amount: formatCommissionAmount(insightData.leaderIncome.income),
          share: insightData.leaderIncome.incomeSharePct?.toFixed(1) ?? "0",
        }),
      });
    }

    if (insightData.leaderProfit) {
      items.push({
        id: "leader-profit",
        text: t("analisysSystem.analytics.comparison.insights.leaderProfit", {
          range: rangeLabel,
          name: insightData.leaderProfit.salesRep,
          amount: formatCommissionAmount(insightData.leaderProfit.profit),
          share: insightData.leaderProfit.profitSharePct?.toFixed(1) ?? "0",
        }),
      });
    }

    if (insightData.leaderMargin) {
      items.push({
        id: "leader-margin",
        text: t("analisysSystem.analytics.comparison.insights.leaderMargin", {
          range: rangeLabel,
          name: insightData.leaderMargin.salesRep,
          margin: insightData.leaderMargin.marginPct,
        }),
      });
    }

    if (selectedReps.length >= 2 && insightData.topThreeIncomeShare > 0) {
      items.push({
        id: "concentration",
        tone: insightData.topThreeIncomeShare >= 70 ? "warning" : "neutral",
        text: t("analisysSystem.analytics.comparison.insights.concentration", {
          range: rangeLabel,
          share: insightData.topThreeIncomeShare.toFixed(1),
          count: Math.min(3, selectedReps.length),
        }),
      });
    }

    if (insightData.leaderIncome && insightData.leaderMargin) {
      const samePerson =
        insightData.leaderIncome.salesRep === insightData.leaderMargin.salesRep;
      items.push({
        id: "volume-vs-margin",
        tone: samePerson ? "positive" : "neutral",
        text: samePerson
          ? t("analisysSystem.analytics.comparison.insights.volumeAndMargin", {
              range: rangeLabel,
              name: insightData.leaderIncome.salesRep,
            })
          : t("analisysSystem.analytics.comparison.insights.volumeVsMargin", {
              range: rangeLabel,
              volumeLeader: insightData.leaderIncome.salesRep,
              marginLeader: insightData.leaderMargin.salesRep,
            }),
      });
    }

    return items;
  }, [insightData, selectedReps.length, rangeLabel, t]);

  const toggleRep = (rep: string) => {
    setSelectedReps((prev) =>
      prev.includes(rep) ? prev.filter((r) => r !== rep) : [...prev, rep],
    );
  };

  if (comparisonSuggestion) {
    return (
      <div>
        <AnalyticsSectionHeader
          title={t("analisysSystem.sections.comparison.title")}
          description={t("analisysSystem.analytics.comparisonMode.teamDescription")}
        />
        <ComparisonModeBanner
          label={t(comparisonSuggestion.labelKey)}
          periodALabel={comparisonSuggestion.periodA.label}
          periodBLabel={comparisonSuggestion.periodB.label}
        />
        <div style={{ ...styles.card, overflowX: "auto", marginBottom: 20 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 880 }}>
            <thead>
              <tr>
                <th style={styles.th}>{t("analisysSystem.filters.salesRep")}</th>
                <th style={{ ...styles.th, textAlign: "right" }}>
                  {t("analisysSystem.analytics.comparisonMode.incomeA")}
                </th>
                <th style={{ ...styles.th, textAlign: "right" }}>
                  {t("analisysSystem.analytics.comparisonMode.incomeB")}
                </th>
                <th style={{ ...styles.th, textAlign: "right" }}>
                  {t("analisysSystem.analytics.comparisonMode.profitA")}
                </th>
                <th style={{ ...styles.th, textAlign: "right" }}>
                  {t("analisysSystem.analytics.comparisonMode.profitB")}
                </th>
                <th style={{ ...styles.th, textAlign: "right" }}>
                  {t("analisysSystem.analytics.comparisonMode.deltaProfit")}
                </th>
                <th style={{ ...styles.th, textAlign: "right" }}>
                  {t("analisysSystem.analytics.comparison.marginPct")} A
                </th>
                <th style={{ ...styles.th, textAlign: "right" }}>
                  {t("analisysSystem.analytics.comparison.marginPct")} B
                </th>
              </tr>
            </thead>
            <tbody>
              {repPeriodRows.map((row) => (
                <tr key={row.salesRep}>
                  <td style={styles.td}>{row.salesRep}</td>
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    {formatCommissionAmount(row.periodA.income)}
                  </td>
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    {formatCommissionAmount(row.periodB.income)}
                  </td>
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    {formatCommissionAmount(row.periodA.profit)}
                  </td>
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    {formatCommissionAmount(row.periodB.profit)}
                  </td>
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    {formatComparisonDelta(row.deltas.profitPct)}
                  </td>
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    {row.periodA.marginPct != null ? `${row.periodA.marginPct}%` : "—"}
                  </td>
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    {row.periodB.marginPct != null ? `${row.periodB.marginPct}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ ...styles.card, padding: 16 }}>
          <div style={{ ...styles.sectionTitle, marginBottom: 12 }}>
            {t("analisysSystem.analytics.comparisonMode.profitChartTitle")}
          </div>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={comparisonChartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCommissionAmount(v)} width={88} />
                <Tooltip formatter={(value) => formatCommissionAmount(Number(value))} />
                <Legend />
                <Bar
                  dataKey="profitA"
                  name={comparisonSuggestion.periodA.label}
                  fill={C.primary}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="profitB"
                  name={comparisonSuggestion.periodB.label}
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

  return (
    <div>
      <AnalyticsSectionHeader
        title={t("analisysSystem.sections.comparison.title")}
        description={t("analisysSystem.analytics.comparison.lead")}
      />

      <div style={{ ...styles.card, padding: 16, marginBottom: 16 }}>
        <div style={{ ...styles.label, marginBottom: 8 }}>
          {t("analisysSystem.analytics.comparison.selectReps")}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {allReps.map((rep) => (
            <label
              key={rep}
              style={{
                ...base,
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={selectedReps.includes(rep)}
                onChange={() => toggleRep(rep)}
              />
              {rep}
            </label>
          ))}
        </div>
        <label
          style={{
            ...base,
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            marginTop: 12,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={includeTotal}
            onChange={(e) => setIncludeTotal(e.target.checked)}
          />
          {t("analisysSystem.analytics.comparison.includeTotal")}
        </label>
      </div>

      <InsightPanel title={t("analisysSystem.analytics.insightsTitle")} items={insights} />

      {chartData.length > 0 && (
        <div style={{ ...styles.card, padding: 16, marginBottom: 16 }}>
          <div style={{ ...styles.sectionTitle, marginBottom: 8 }}>
            {t("analisysSystem.analytics.comparison.chartTitle")}
          </div>
          <p style={{ ...base, fontSize: 12, color: C.textMuted, margin: "0 0 12px" }}>
            {t("analisysSystem.analytics.comparison.chartDescription")}
          </p>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-18} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCommissionAmount(v)} width={88} />
                <Tooltip formatter={(value) => formatCommissionAmount(Number(value))} />
                <Legend />
                <Bar dataKey="income" name={t("analisysSystem.operations.columns.income")} radius={[3, 3, 0, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div style={{ ...styles.card, overflowX: "auto" }}>
        <div style={{ ...styles.sectionTitle, padding: "12px 16px 0" }}>
          {t("analisysSystem.analytics.comparison.tableTitle")}
        </div>
        <p style={{ ...base, fontSize: 12, color: C.textMuted, margin: "4px 16px 12px" }}>
          {t("analisysSystem.analytics.comparison.tableDescription")}
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr>
              <th style={styles.th}>{t("analisysSystem.executives.columns.name")}</th>
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
                {t("analisysSystem.analytics.comparison.marginPct")}
              </th>
              <th style={{ ...styles.th, textAlign: "right" }}>
                {t("analisysSystem.analytics.comparison.incomeShare")}
              </th>
              <th style={{ ...styles.th, textAlign: "right" }}>
                {t("analisysSystem.analytics.comparison.profitShare")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const margin = computeMarginPct(row.income, row.profit);
              return (
                <tr
                  key={row.salesRep}
                  style={row.isTotal ? { backgroundColor: C.borderLight } : undefined}
                >
                  <td style={{ ...styles.td, fontWeight: row.isTotal ? 700 : 400 }}>
                    {row.isTotal
                      ? t("analisysSystem.analytics.total")
                      : row.salesRep}
                  </td>
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
                    {margin != null ? `${margin}%` : "—"}
                  </td>
                  <td style={styles.td}>
                    {row.incomeSharePct != null ? (
                      <ShareBar pct={row.incomeSharePct} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={styles.td}>
                    {row.profitSharePct != null ? (
                      <ShareBar pct={row.profitSharePct} color={C.positive} />
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
