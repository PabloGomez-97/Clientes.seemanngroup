import { Fragment, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  buildOperationsSummary,
  formatCommissionAmount,
} from "../commissionAnalysisService";
import type { AppliedComparisonSuggestion } from "../comparisonSuggestions";
import {
  formatComparisonDelta,
  getComparisonReports,
} from "../comparisonModeAnalytics";
import type { CommissionAnalysisOperation, CommissionAnalysisReport } from "../types";
import OperationInvoiceModal from "../OperationInvoiceModal";
import { AnalyticsSectionHeader, ComparisonModeBanner } from "../analyticsUi";
import {
  C,
  base,
  btnOutline,
  btnPrimary,
  styles,
} from "@/components/administrador/reporteria/financiera/executiveReportingUi";

const REP_HEADER_BG = C.primaryLight;
const REP_TOTAL_BG = "#f1f5f9";
const GRAND_TOTAL_BG = C.borderLight;

type Props = {
  report: CommissionAnalysisReport;
  accessToken: string;
  refreshAccessToken: () => Promise<string>;
  selectedOperation: CommissionAnalysisOperation | null;
  onSelectOperation: (operation: CommissionAnalysisOperation | null) => void;
  comparisonSuggestion?: AppliedComparisonSuggestion | null;
};

export default function SummaryTab({
  report,
  accessToken,
  refreshAccessToken,
  selectedOperation,
  onSelectOperation,
  comparisonSuggestion,
}: Props) {
  const { t } = useTranslation();
  const [operationsPeriod, setOperationsPeriod] = useState<"A" | "B">("A");

  const comparisonData = useMemo(
    () => (comparisonSuggestion ? getComparisonReports(report, comparisonSuggestion) : null),
    [report, comparisonSuggestion],
  );

  const operationsSummary = useMemo(
    () => (report.invoiceCount > 0 ? buildOperationsSummary(report) : []),
    [report],
  );

  const activeOperationsSummary = useMemo(() => {
    if (!comparisonData) return operationsSummary;
    return operationsPeriod === "A" ? comparisonData.operationsA : comparisonData.operationsB;
  }, [comparisonData, operationsPeriod, operationsSummary]);

  const activeReportForModal = useMemo(() => {
    if (!comparisonData) return report;
    return operationsPeriod === "A" ? comparisonData.periodA : comparisonData.periodB;
  }, [comparisonData, operationsPeriod, report]);

  const totalOperations = useMemo(
    () => operationsSummary.reduce((sum, group) => sum + group.subtotal.operationCount, 0),
    [operationsSummary],
  );

  if (report.invoiceCount === 0) return null;

  return (
    <>
      <AnalyticsSectionHeader
        title={t("analisysSystem.sections.summary.title")}
        description={
          comparisonSuggestion
            ? t("analisysSystem.analytics.comparisonMode.summaryDescription")
            : t("analisysSystem.sections.summary.description")
        }
      />

      {comparisonSuggestion && comparisonData && (
        <ComparisonModeBanner
          label={t(comparisonSuggestion.labelKey)}
          periodALabel={comparisonSuggestion.periodA.label}
          periodBLabel={comparisonSuggestion.periodB.label}
        />
      )}

      <div style={{ marginTop: 8 }}>
        <div style={{ ...styles.sectionTitle, marginBottom: 8 }}>
          {t("analisysSystem.executives.title")}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: comparisonData
              ? "1fr"
              : "repeat(2, minmax(0, 1fr))",
            gap: 16,
          }}
        >
          <div style={{ ...styles.card, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: comparisonData ? 720 : undefined }}>
              <thead>
                <tr>
                  <th style={styles.th}>{t("analisysSystem.executives.columns.name")}</th>
                  {comparisonData ? (
                    <>
                      <th style={{ ...styles.th, textAlign: "right" }}>
                        {t("analisysSystem.analytics.comparisonMode.opsA", {
                          period: comparisonSuggestion!.periodA.label,
                        })}
                      </th>
                      <th style={{ ...styles.th, textAlign: "right" }}>
                        {t("analisysSystem.analytics.comparisonMode.opsB", {
                          period: comparisonSuggestion!.periodB.label,
                        })}
                      </th>
                      <th style={{ ...styles.th, textAlign: "right" }}>
                        {t("analisysSystem.analytics.comparisonMode.delta")}
                      </th>
                    </>
                  ) : (
                    <th style={{ ...styles.th, textAlign: "right" }}>
                      {t("analisysSystem.executives.columns.operationCount")}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {comparisonData
                  ? comparisonData.reps.map((row) => (
                      <tr key={`exec-ops-${row.salesRep}`}>
                        <td style={styles.td}>{row.salesRep}</td>
                        <td style={{ ...styles.td, textAlign: "right" }}>
                          {row.periodA.operationCount}
                        </td>
                        <td style={{ ...styles.td, textAlign: "right" }}>
                          {row.periodB.operationCount}
                        </td>
                        <td style={{ ...styles.td, textAlign: "right" }}>
                          {formatComparisonDelta(row.deltas.operationCountPct)}
                        </td>
                      </tr>
                    ))
                  : operationsSummary.map((group) => (
                      <tr key={`exec-ops-${group.salesRep}`}>
                        <td style={styles.td}>{group.salesRep}</td>
                        <td style={{ ...styles.td, textAlign: "right" }}>
                          {group.subtotal.operationCount}
                        </td>
                      </tr>
                    ))}
                <tr style={{ backgroundColor: GRAND_TOTAL_BG }}>
                  <td style={{ ...styles.td, fontWeight: 700 }}>
                    {t("analisysSystem.executives.total")}
                  </td>
                  {comparisonData ? (
                    <>
                      <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>
                        {comparisonData.summary.periodA.operationCount}
                      </td>
                      <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>
                        {comparisonData.summary.periodB.operationCount}
                      </td>
                      <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>
                        {formatComparisonDelta(comparisonData.summary.deltas.operationCountPct)}
                      </td>
                    </>
                  ) : (
                    <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>
                      {totalOperations}
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>

          {!comparisonData && (
          <div style={{ ...styles.card, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
                </tr>
              </thead>
              <tbody>
                {operationsSummary.map((group) => (
                  <tr key={`exec-fin-${group.salesRep}`}>
                    <td style={styles.td}>{group.salesRep}</td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      {formatCommissionAmount(group.subtotal.income)}
                    </td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      {formatCommissionAmount(group.subtotal.expense)}
                    </td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      {formatCommissionAmount(group.subtotal.profit)}
                    </td>
                  </tr>
                ))}
                <tr style={{ backgroundColor: GRAND_TOTAL_BG }}>
                  <td style={{ ...styles.td, fontWeight: 700 }}>
                    {t("analisysSystem.executives.total")}
                  </td>
                  <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>
                    {formatCommissionAmount(report.totals.income)}
                  </td>
                  <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>
                    {formatCommissionAmount(report.totals.expense)}
                  </td>
                  <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>
                    {formatCommissionAmount(report.totals.profit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          )}

          {comparisonData && (
            <div style={{ ...styles.card, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 960 }}>
                <thead>
                  <tr>
                    <th style={styles.th}>{t("analisysSystem.executives.columns.name")}</th>
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
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.reps.map((row) => (
                    <tr key={`exec-cmp-${row.salesRep}`}>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 8 }}>
          <div style={{ ...styles.sectionTitle, marginBottom: 0 }}>
            {t("analisysSystem.operations.title")}
          </div>
          {comparisonData && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                style={{
                  ...(operationsPeriod === "A" ? btnPrimary : btnOutline),
                  padding: "6px 12px",
                  fontSize: 12,
                }}
                onClick={() => setOperationsPeriod("A")}
              >
                {comparisonSuggestion!.periodA.label}
              </button>
              <button
                type="button"
                style={{
                  ...(operationsPeriod === "B" ? btnPrimary : btnOutline),
                  padding: "6px 12px",
                  fontSize: 12,
                }}
                onClick={() => setOperationsPeriod("B")}
              >
                {comparisonSuggestion!.periodB.label}
              </button>
            </div>
          )}
        </div>
        <p style={{ ...base, fontSize: 13, color: C.textMuted, margin: "0 0 12px" }}>
          {t("analisysSystem.operations.subtitle")}
        </p>
        <div style={{ ...styles.card, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 960 }}>
            <thead>
              <tr>
                {[
                  t("analisysSystem.operations.columns.operation"),
                  t("analisysSystem.operations.columns.invoices"),
                  t("analisysSystem.operations.columns.invoiceCount"),
                  t("analisysSystem.operations.columns.consignee"),
                  t("analisysSystem.operations.columns.destination"),
                  t("analisysSystem.operations.columns.income"),
                  t("analisysSystem.operations.columns.expense"),
                  t("analisysSystem.operations.columns.profit"),
                ].map((header) => (
                  <th key={header} style={styles.th}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeOperationsSummary.map((group) => (
                <Fragment key={`op-group-${group.salesRep}`}>
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        ...styles.td,
                        fontWeight: 700,
                        backgroundColor: REP_HEADER_BG,
                      }}
                    >
                      {group.salesRep}
                    </td>
                  </tr>
                  {group.operations.map((operation) => (
                    <tr
                      key={`${group.salesRep}-${operation.operationRef}-${operation.moduleId ?? "na"}`}
                      onClick={() => onSelectOperation(operation)}
                      style={{ cursor: "pointer" }}
                      title={t("analisysSystem.operations.openDetail")}
                    >
                      <td style={{ ...styles.td, fontWeight: 600 }}>{operation.operationRef}</td>
                      <td style={styles.td}>{operation.invoices.join(", ")}</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>{operation.invoiceCount}</td>
                      <td style={styles.td}>{operation.consignee}</td>
                      <td style={styles.td}>{operation.destination}</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>
                        {formatCommissionAmount(operation.income)}
                      </td>
                      <td style={{ ...styles.td, textAlign: "right" }}>
                        {formatCommissionAmount(operation.expense)}
                      </td>
                      <td style={{ ...styles.td, textAlign: "right" }}>
                        {formatCommissionAmount(operation.profit)}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: REP_TOTAL_BG }}>
                    <td colSpan={5} style={{ ...styles.td, fontWeight: 700 }}>
                      {t("analisysSystem.operations.repTotal", { name: group.salesRep })}
                    </td>
                    <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>
                      {formatCommissionAmount(group.subtotal.income)}
                    </td>
                    <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>
                      {formatCommissionAmount(group.subtotal.expense)}
                    </td>
                    <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>
                      {formatCommissionAmount(group.subtotal.profit)}
                    </td>
                  </tr>
                </Fragment>
              ))}
              <tr style={{ backgroundColor: GRAND_TOTAL_BG }}>
                <td colSpan={5} style={{ ...styles.td, fontWeight: 800 }}>
                  {t("analisysSystem.operations.total")}
                </td>
                <td style={{ ...styles.td, textAlign: "right", fontWeight: 800 }}>
                  {formatCommissionAmount(activeReportForModal.totals.income)}
                </td>
                <td style={{ ...styles.td, textAlign: "right", fontWeight: 800 }}>
                  {formatCommissionAmount(activeReportForModal.totals.expense)}
                </td>
                <td style={{ ...styles.td, textAlign: "right", fontWeight: 800 }}>
                  {formatCommissionAmount(activeReportForModal.totals.profit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {selectedOperation && (
        <OperationInvoiceModal
          operation={selectedOperation}
          startDate={activeReportForModal.startDate}
          endDate={activeReportForModal.endDate}
          accessToken={accessToken}
          refreshAccessToken={refreshAccessToken}
          onClose={() => onSelectOperation(null)}
        />
      )}
    </>
  );
}
