import { Fragment, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCommissionAmount } from "../commissionAnalysisService";
import {
  buildTopCustomerInsightData,
  buildTopCustomersByConsignee,
  listSalesRepsFromReport,
  type TopCustomerRow,
} from "../commissionAnalytics";
import type { CommissionAnalysisReport } from "../types";
import { formatReportDateRange } from "../commissionAnalysisService";
import {
  AnalyticsSectionHeader,
  InsightPanel,
  KpiCard,
  KpiGrid,
  ShareBar,
  SortableTh,
  sortRows,
  computeMarginPct,
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
};

type SortKey = keyof Pick<
  TopCustomerRow,
  "consignee" | "invoiceCount" | "income" | "expense" | "profit" | "incomeSharePct" | "profitSharePct"
>;

type SortDir = "asc" | "desc";

export default function TopCustomersTab({ report }: Props) {
  const { t } = useTranslation();
  const reps = useMemo(() => listSalesRepsFromReport(report), [report]);
  const [salesRep, setSalesRep] = useState(reps[0] ?? "");
  const [expandedConsignee, setExpandedConsignee] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("invoiceCount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const rangeLabel = useMemo(
    () => formatReportDateRange(report.startDate, report.endDate),
    [report.startDate, report.endDate],
  );

  useEffect(() => {
    if (!salesRep && reps[0]) setSalesRep(reps[0]);
    if (salesRep && !reps.includes(salesRep) && reps[0]) setSalesRep(reps[0]);
  }, [reps, salesRep]);

  const rawRows = useMemo(
    () => (salesRep ? buildTopCustomersByConsignee(report, salesRep, 100) : []),
    [report, salesRep],
  );

  const rows = useMemo(
    () => sortRows(rawRows, sortKey, sortDir),
    [rawRows, sortKey, sortDir],
  );

  const insightData = useMemo(() => buildTopCustomerInsightData(rawRows), [rawRows]);

  const chartData = useMemo(() => {
    const top = sortRows(rawRows, "invoiceCount", "desc").slice(0, 8);
    return top.map((row) => ({
      name: row.consignee.length > 22 ? `${row.consignee.slice(0, 20)}…` : row.consignee,
      fullName: row.consignee,
      invoices: row.invoiceCount,
      income: row.income,
    }));
  }, [rawRows]);

  const insights = useMemo((): InsightItem[] => {
    const items: InsightItem[] = [];

    if (insightData.topByInvoices) {
      items.push({
        id: "top-invoices",
        tone: "positive",
        text: t("analisysSystem.analytics.topCustomers.insights.topInvoices", {
          range: rangeLabel,
          name: insightData.topByInvoices.consignee,
          count: insightData.topByInvoices.invoiceCount,
        }),
      });
    }

    if (insightData.topByIncome && insightData.topByIncome.consignee !== insightData.topByInvoices?.consignee) {
      items.push({
        id: "top-income",
        text: t("analisysSystem.analytics.topCustomers.insights.topIncome", {
          range: rangeLabel,
          name: insightData.topByIncome.consignee,
          amount: formatCommissionAmount(insightData.topByIncome.income),
          share: insightData.topByIncome.incomeSharePct.toFixed(1),
        }),
      });
    }

    if (insightData.clientCount > 0) {
      items.push({
        id: "concentration",
        tone: insightData.topThreeIncomeShare >= 60 ? "warning" : "neutral",
        text: t("analisysSystem.analytics.topCustomers.insights.concentration", {
          range: rangeLabel,
          share: insightData.topThreeIncomeShare.toFixed(1),
          rep: salesRep,
        }),
      });
    }

    if (insightData.clientCount > 0) {
      items.push({
        id: "portfolio",
        text: t("analisysSystem.analytics.topCustomers.insights.portfolio", {
          range: rangeLabel,
          clients: insightData.clientCount,
          invoices: insightData.totalInvoices,
        }),
      });
    }

    return items;
  }, [insightData, salesRep, rangeLabel, t]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "consignee" ? "asc" : "desc");
    }
  };

  if (!salesRep && reps.length === 0) return null;

  return (
    <div>
      <AnalyticsSectionHeader
        title={t("analisysSystem.sections.topCustomers.title")}
        description={t("analisysSystem.analytics.topCustomers.lead")}
      />

      <div style={{ marginBottom: 16, maxWidth: 360 }}>
        <label style={styles.label}>{t("analisysSystem.filters.salesRep")}</label>
        <select
          value={salesRep}
          onChange={(e) => {
            setSalesRep(e.target.value);
            setExpandedConsignee(null);
          }}
          style={inputStyle}
        >
          {reps.map((rep) => (
            <option key={rep} value={rep}>
              {rep}
            </option>
          ))}
        </select>
      </div>

      <KpiGrid>
        <KpiCard
          label={t("analisysSystem.analytics.topCustomers.kpi.clients")}
          value={String(insightData.clientCount)}
          hint={t("analisysSystem.analytics.topCustomers.kpi.clientsHint")}
        />
        <KpiCard
          label={t("analisysSystem.analytics.topCustomers.invoices")}
          value={String(insightData.totalInvoices)}
          hint={t("analisysSystem.analytics.topCustomers.kpi.invoicesHint")}
          accent="primary"
        />
        <KpiCard
          label={t("analisysSystem.analytics.topCustomers.kpi.topClient")}
          value={insightData.topByInvoices?.consignee ?? "—"}
          hint={
            insightData.topByInvoices
              ? t("analisysSystem.analytics.topCustomers.kpi.topClientHint", {
                  count: insightData.topByInvoices.invoiceCount,
                })
              : undefined
          }
        />
        <KpiCard
          label={t("analisysSystem.analytics.topCustomers.kpi.concentration")}
          value={`${insightData.topThreeIncomeShare.toFixed(1)}%`}
          hint={t("analisysSystem.analytics.topCustomers.kpi.concentrationHint")}
        />
      </KpiGrid>

      <InsightPanel title={t("analisysSystem.analytics.insightsTitle")} items={insights} />

      {chartData.length > 0 && (
        <div style={{ ...styles.card, padding: 16, marginBottom: 16 }}>
          <div style={{ ...styles.sectionTitle, marginBottom: 8 }}>
            {t("analisysSystem.analytics.topCustomers.chartTitle")}
          </div>
          <p style={{ ...base, fontSize: 12, color: C.textMuted, margin: "0 0 12px" }}>
            {t("analisysSystem.analytics.topCustomers.chartDescription")}
          </p>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
                <Tooltip
                  formatter={(value, _name, payload) => {
                    const item = payload?.payload as { fullName?: string } | undefined;
                    return [
                      String(value),
                      item?.fullName ?? t("analisysSystem.analytics.topCustomers.invoices"),
                    ];
                  }}
                />
                <Bar dataKey="invoices" name={t("analisysSystem.analytics.topCustomers.invoices")} radius={[0, 3, 3, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={index} fill={index === 0 ? C.primary : "#fdba74"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div style={{ ...styles.card, overflowX: "auto" }}>
        <div style={{ ...styles.sectionTitle, padding: "12px 16px 0" }}>
          {t("analisysSystem.analytics.topCustomers.tableTitle")}
        </div>
        <p style={{ ...base, fontSize: 12, color: C.textMuted, margin: "4px 16px 12px" }}>
          {t("analisysSystem.analytics.topCustomers.tableDescription")}
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 960 }}>
          <thead>
            <tr>
              <SortableTh
                label={t("analisysSystem.operations.columns.consignee")}
                active={sortKey === "consignee"}
                direction={sortDir}
                onClick={() => handleSort("consignee")}
              />
              <SortableTh
                label={t("analisysSystem.analytics.topCustomers.invoices")}
                active={sortKey === "invoiceCount"}
                direction={sortDir}
                onClick={() => handleSort("invoiceCount")}
                align="right"
              />
              <SortableTh
                label={t("analisysSystem.operations.columns.income")}
                active={sortKey === "income"}
                direction={sortDir}
                onClick={() => handleSort("income")}
                align="right"
              />
              <SortableTh
                label={t("analisysSystem.operations.columns.expense")}
                active={sortKey === "expense"}
                direction={sortDir}
                onClick={() => handleSort("expense")}
                align="right"
              />
              <SortableTh
                label={t("analisysSystem.operations.columns.profit")}
                active={sortKey === "profit"}
                direction={sortDir}
                onClick={() => handleSort("profit")}
                align="right"
              />
              <SortableTh
                label={t("analisysSystem.analytics.comparison.incomeShare")}
                active={sortKey === "incomeSharePct"}
                direction={sortDir}
                onClick={() => handleSort("incomeSharePct")}
                align="right"
              />
              <SortableTh
                label={t("analisysSystem.analytics.comparison.profitShare")}
                active={sortKey === "profitSharePct"}
                direction={sortDir}
                onClick={() => handleSort("profitSharePct")}
                align="right"
              />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isOpen = expandedConsignee === row.consignee;
              const margin = computeMarginPct(row.income, row.profit);
              return (
                <Fragment key={row.consignee}>
                  <tr
                    onClick={() => setExpandedConsignee(isOpen ? null : row.consignee)}
                    style={{ cursor: "pointer" }}
                    title={t("analisysSystem.analytics.topCustomers.expand")}
                  >
                    <td style={{ ...styles.td, fontWeight: 600 }}>{row.consignee}</td>
                    <td style={{ ...styles.td, textAlign: "right", fontWeight: 600 }}>{row.invoiceCount}</td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      {formatCommissionAmount(row.income)}
                    </td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      {formatCommissionAmount(row.expense)}
                    </td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      {formatCommissionAmount(row.profit)}
                      {margin != null && (
                        <span style={{ ...base, fontSize: 11, color: C.textMuted, marginLeft: 6 }}>
                          ({margin}%)
                        </span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <ShareBar pct={row.incomeSharePct} />
                    </td>
                    <td style={styles.td}>
                      <ShareBar pct={row.profitSharePct} color={C.positive} />
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={7} style={{ ...styles.td, backgroundColor: C.bg }}>
                        <span style={{ ...base, fontSize: 12, color: C.textMuted }}>
                          {t("analisysSystem.operations.columns.invoices")}: {row.invoices.join(", ")}
                        </span>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
