import { Fragment, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router-dom";
import {
  buildCommissionAnalysisReport,
  buildOperationsSummary,
  clearCommissionAnalysisCache,
  filterCommissionAnalysisReport,
  formatCommissionAmount,
  formatReportDateRange,
} from "./commissionAnalysisService";
import type { CommissionAnalysisOperation, CommissionAnalysisReport } from "./types";
import OperationInvoiceModal from "./OperationInvoiceModal";
import {
  AnalisysSystemSkeleton,
  C,
  base,
  btnOutline,
  btnPrimary,
  CardSection,
  EmptyState,
  ErrorBanner,
  inputStyle,
  pageWrap,
  styles,
} from "@/components/administrador/reporteria/financiera/executiveReportingUi";
import { getPeriodRange } from "@/components/administrador/reporteria/financiera/quoteUtils";

interface OutletContext {
  accessToken: string;
  refreshAccessToken: () => Promise<string>;
  onLogout: () => void;
}

// Colores de filas en tablas de operaciones
const REP_HEADER_BG = C.primaryLight;
const REP_TOTAL_BG = "#f1f5f9";
const GRAND_TOTAL_BG = C.borderLight;

export default function AnalisysSystem() {
  const { t } = useTranslation();
  const { accessToken, refreshAccessToken } = useOutletContext<OutletContext>();

  const defaultRange = useMemo(() => getPeriodRange("this-month"), []);
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [salesRepFilter, setSalesRepFilter] = useState("");
  const [consigneeFilter, setConsigneeFilter] = useState("");
  const [baseReport, setBaseReport] = useState<CommissionAnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [loadingMessagePhase, setLoadingMessagePhase] = useState<0 | 1>(0);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [selectedOperation, setSelectedOperation] =
    useState<CommissionAnalysisOperation | null>(null);

  useEffect(() => {
    if (!loading) {
      setLoadingMessagePhase(0);
      return;
    }

    setLoadingMessagePhase(0);
    const timer = window.setTimeout(() => setLoadingMessagePhase(1), 2000);
    return () => window.clearTimeout(timer);
  }, [loading]);

  const loadingMessage =
    loadingMessagePhase === 0
      ? t("analisysSystem.loading.initial")
      : t("analisysSystem.loading.wait");

  const report = useMemo(() => {
    if (!baseReport) return null;
    if (!salesRepFilter && !consigneeFilter.trim()) return baseReport;
    return filterCommissionAnalysisReport(baseReport, {
      salesRep: salesRepFilter || undefined,
      consignee: consigneeFilter.trim() || undefined,
    });
  }, [baseReport, salesRepFilter, consigneeFilter]);

  const salesRepOptions = useMemo(() => {
    if (!baseReport) return [];
    return baseReport.groups.map((group) => group.salesRep);
  }, [baseReport]);

  const consigneeOptions = useMemo(() => {
    if (!baseReport) return [];
    const set = new Set<string>();
    for (const group of baseReport.groups) {
      for (const row of group.rows) {
        if (row.consignee) set.add(row.consignee);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [baseReport]);

  const operationsSummary = useMemo(
    () => (report && report.invoiceCount > 0 ? buildOperationsSummary(report) : []),
    [report],
  );

  const totalOperations = useMemo(
    () => operationsSummary.reduce((sum, group) => sum + group.subtotal.operationCount, 0),
    [operationsSummary],
  );

  const handleGenerate = async (forceRefresh = false) => {
    if (!accessToken) {
      setError(t("analisysSystem.errors.noToken"));
      return;
    }

    setLoading(true);
    setEnriching(false);
    setError(null);

    try {
      if (forceRefresh) clearCommissionAnalysisCache();
      await buildCommissionAnalysisReport(accessToken, refreshAccessToken, {
        startDate,
        endDate,
        forceRefresh,
        onProgress: (nextReport, phase) => {
          if (phase === "preview") {
            setBaseReport(nextReport);
            setFetchedAt(Date.now());
            setLoading(false);
            setEnriching(true);
          } else {
            setBaseReport(nextReport);
            setEnriching(false);
          }
        },
      });
      setSalesRepFilter("");
      setConsigneeFilter("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("analisysSystem.errors.generic");
      setError(message);
      setEnriching(false);
    } finally {
      setLoading(false);
    }
  };

  const printedRange = report
    ? formatReportDateRange(report.startDate, report.endDate)
    : "";

  return (
    <div style={pageWrap}>
      <div style={{ ...base, marginBottom: 20 }}>
        <h1 style={{ ...base, fontSize: 24, fontWeight: 700, color: C.secondary, marginBottom: 4 }}>
          {t("analisysSystem.title")}
        </h1>
        <p style={{ ...base, fontSize: 14, color: C.textMuted, margin: 0 }}>
          {t("analisysSystem.subtitle")}
        </p>
      </div>

      <CardSection title={t("analisysSystem.filters.title")}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            alignItems: "flex-end",
          }}
        >
          <div>
            <label style={styles.label}>{t("analisysSystem.filters.from")}</label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              style={inputStyle}
              disabled={loading || enriching}
            />
          </div>
          <div>
            <label style={styles.label}>{t("analisysSystem.filters.to")}</label>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              style={inputStyle}
              disabled={loading || enriching}
            />
          </div>

          <button
            type="button"
            style={{ ...btnPrimary, opacity: loading ? 0.7 : 1 }}
            disabled={loading || enriching}
            onClick={() => handleGenerate(false)}
          >
            {loading ? t("analisysSystem.actions.generating") : t("analisysSystem.actions.generate")}
          </button>
          <button
            type="button"
            style={{ ...btnOutline, opacity: loading ? 0.7 : 1 }}
            disabled={loading || enriching || !baseReport}
            onClick={() => handleGenerate(true)}
          >
            {t("analisysSystem.actions.refresh")}
          </button>
        </div>
      </CardSection>

      {baseReport && !loading && (
        <div style={{ marginTop: 16 }}>
          <CardSection title={t("analisysSystem.filters.resultsTitle")}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
                alignItems: "flex-end",
              }}
            >
              <div>
                <label style={styles.label}>{t("analisysSystem.filters.salesRep")}</label>
                <select
                  value={salesRepFilter}
                  onChange={(event) => setSalesRepFilter(event.target.value)}
                  style={inputStyle}
                >
                  <option value="">{t("analisysSystem.filters.all")}</option>
                  {salesRepOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.label}>{t("analisysSystem.filters.consignee")}</label>
                <input
                  list="analisys-consignee-options"
                  value={consigneeFilter}
                  onChange={(event) => setConsigneeFilter(event.target.value)}
                  placeholder={t("analisysSystem.filters.consigneePlaceholder")}
                  style={inputStyle}
                />
                <datalist id="analisys-consignee-options">
                  {consigneeOptions.map((value) => (
                    <option key={value} value={value} />
                  ))}
                </datalist>
              </div>

              {(salesRepFilter || consigneeFilter.trim()) && (
                <button
                  type="button"
                  style={btnOutline}
                  onClick={() => {
                    setSalesRepFilter("");
                    setConsigneeFilter("");
                  }}
                >
                  {t("analisysSystem.filters.clear")}
                </button>
              )}
            </div>
          </CardSection>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 16 }}>
          <ErrorBanner message={error} />
        </div>
      )}

      {loading && <AnalisysSystemSkeleton message={loadingMessage} />}

      {!loading && fetchedAt && baseReport && report && (
        <div style={{ marginTop: 16 }}>
          <p style={{ ...base, fontSize: 13, color: C.textMuted, margin: "0 0 12px" }}>
            {t("analisysSystem.meta.showing", {
              shown: report.invoiceCount,
              total: baseReport.invoiceCount,
            })}
            {printedRange ? ` · ${printedRange}` : ""}
            {" · "}
            {new Date(fetchedAt).toLocaleString("es-CL")}
          </p>

          {enriching && (
            <p
              style={{
                ...base,
                fontSize: 13,
                color: C.textMuted,
                margin: "0 0 12px",
                fontStyle: "italic",
              }}
            >
              {t("analisysSystem.loading.enriching")}
            </p>
          )}

          {report.invoiceCount === 0 ? (
            <div style={{ marginTop: 24 }}>
              <EmptyState
                title={t("analisysSystem.empty.noResultsTitle")}
                sub={t("analisysSystem.empty.noResultsDescription")}
              />
            </div>
          ) : (
            <>
              <div style={{ marginTop: 16 }}>
                <div style={{ ...styles.sectionTitle, marginBottom: 8 }}>
                  {t("analisysSystem.executives.title")}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 16,
                  }}
                >
                  <div style={{ ...styles.card, overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={styles.th}>{t("analisysSystem.executives.columns.name")}</th>
                          <th style={{ ...styles.th, textAlign: "right" }}>
                            {t("analisysSystem.executives.columns.operationCount")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {operationsSummary.map((group) => (
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
                          <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>
                            {totalOperations}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

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
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ ...styles.sectionTitle, marginBottom: 8 }}>
                  {t("analisysSystem.operations.title")}
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
                      {operationsSummary.map((group) => (
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
                              onClick={() => setSelectedOperation(operation)}
                              style={{ cursor: "pointer" }}
                              title={t("analisysSystem.operations.openDetail")}
                            >
                              <td style={{ ...styles.td, fontWeight: 600 }}>
                                {operation.operationRef}
                              </td>
                              <td style={styles.td}>{operation.invoices.join(", ")}</td>
                              <td style={{ ...styles.td, textAlign: "right" }}>
                                {operation.invoiceCount}
                              </td>
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
                          {formatCommissionAmount(report.totals.income)}
                        </td>
                        <td style={{ ...styles.td, textAlign: "right", fontWeight: 800 }}>
                          {formatCommissionAmount(report.totals.expense)}
                        </td>
                        <td style={{ ...styles.td, textAlign: "right", fontWeight: 800 }}>
                          {formatCommissionAmount(report.totals.profit)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {!baseReport && !loading && !error && (
        <div style={{ marginTop: 24 }}>
          <EmptyState
            title={t("analisysSystem.empty.title")}
            sub={t("analisysSystem.empty.description")}
          />
        </div>
      )}

      {selectedOperation && baseReport && (
        <OperationInvoiceModal
          operation={selectedOperation}
          startDate={baseReport.startDate}
          endDate={baseReport.endDate}
          accessToken={accessToken}
          refreshAccessToken={refreshAccessToken}
          onClose={() => setSelectedOperation(null)}
        />
      )}
    </div>
  );
}
