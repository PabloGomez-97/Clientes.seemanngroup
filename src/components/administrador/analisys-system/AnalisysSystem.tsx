import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router-dom";
import {
  buildCommissionAnalysisReport,
  clearCommissionAnalysisCache,
  formatCommissionAmount,
  formatReportDateRange,
} from "./commissionAnalysisService";
import type {
  CommissionAnalysisInvoiceRow,
  CommissionAnalysisReport,
} from "./types";
import {
  C,
  base,
  btnOutline,
  btnPrimary,
  CardSection,
  DataSourceBanner,
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

type DisplayRow =
  | { kind: "rep-header"; salesRep: string }
  | { kind: "shipment-header"; label: string }
  | { kind: "invoice"; row: CommissionAnalysisInvoiceRow }
  | {
      kind: "rep-subtotal";
      salesRep: string;
      income: number;
      expense: number | null;
      profit: number | null;
      commission: number;
    }
  | {
      kind: "grand-total";
      income: number;
      expense: number | null;
      profit: number | null;
      commission: number;
    };

function buildDisplayRows(report: CommissionAnalysisReport): DisplayRow[] {
  const displayRows: DisplayRow[] = [];

  for (const group of report.groups) {
    displayRows.push({ kind: "rep-header", salesRep: group.salesRep });
    displayRows.push({ kind: "shipment-header", label: "SHIPMENT" });

    let lastShipmentRef = "";

    for (const row of group.rows) {
      if (row.shipmentRef && row.shipmentRef !== lastShipmentRef) {
        displayRows.push({ kind: "shipment-header", label: row.shipmentRef });
        lastShipmentRef = row.shipmentRef;
      }
      displayRows.push({ kind: "invoice", row });
    }

    displayRows.push({
      kind: "rep-subtotal",
      salesRep: group.salesRep,
      income: group.subtotal.income,
      expense: group.subtotal.expense,
      profit: group.subtotal.profit,
      commission: group.subtotal.commission,
    });
  }

  displayRows.push({
    kind: "grand-total",
    income: report.totals.income,
    expense: report.totals.expense,
    profit: report.totals.profit,
    commission: report.totals.commission,
  });

  return displayRows;
}

function amountCell(value: number | null): string {
  return formatCommissionAmount(value);
}

export default function AnalisysSystem() {
  const { t } = useTranslation();
  const { accessToken, refreshAccessToken } = useOutletContext<OutletContext>();

  const defaultRange = useMemo(() => getPeriodRange("this-month"), []);
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [report, setReport] = useState<CommissionAnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);

  const displayRows = useMemo(
    () => (report ? buildDisplayRows(report) : []),
    [report],
  );

  const salesRepOptions = useMemo(() => {
    if (!report) return [];
    return report.groups.map((group) => group.salesRep);
  }, [report]);

  const handleGenerate = async (forceRefresh = false) => {
    if (!accessToken) {
      setError(t("analisysSystem.errors.noToken"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (forceRefresh) clearCommissionAnalysisCache();
      const nextReport = await buildCommissionAnalysisReport(
        accessToken,
        refreshAccessToken,
        { startDate, endDate, forceRefresh },
      );
      setReport(nextReport);
      setFetchedAt(Date.now());
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("analisysSystem.errors.generic");
      setError(message);
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
            />
          </div>
          <div>
            <label style={styles.label}>{t("analisysSystem.filters.to")}</label>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              style={inputStyle}
            />
          </div>
          <button
            type="button"
            style={{ ...btnPrimary, opacity: loading ? 0.7 : 1 }}
            disabled={loading}
            onClick={() => handleGenerate(false)}
          >
            {loading ? t("analisysSystem.actions.generating") : t("analisysSystem.actions.generate")}
          </button>
          <button
            type="button"
            style={{ ...btnOutline, opacity: loading ? 0.7 : 1 }}
            disabled={loading || !report}
            onClick={() => handleGenerate(true)}
          >
            {t("analisysSystem.actions.refresh")}
          </button>
        </div>
      </CardSection>

      {error && (
        <div style={{ marginTop: 16 }}>
          <ErrorBanner message={error} />
        </div>
      )}

      {fetchedAt && report && (
        <div style={{ marginTop: 16 }}>
          <DataSourceBanner>
            {t("analisysSystem.dataSource")} ·{" "}
            {t("analisysSystem.meta.invoices")}: {report.invoiceCount} ·{" "}
            {new Date(fetchedAt).toLocaleString("es-CL")}
          </DataSourceBanner>
          {!report.reconciliation.isFullyReconciled && (
            <div
              style={{
                marginTop: 12,
                padding: "12px 16px",
                borderRadius: 8,
                border: "1px solid #f59e0b",
                backgroundColor: "#fffbeb",
                color: C.text,
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              <strong>{t("analisysSystem.reconciliation.title")}</strong>
              <div style={{ marginTop: 4 }}>
                {t("analisysSystem.reconciliation.body", {
                  complete: report.reconciliation.completeRows,
                  incomplete: report.reconciliation.incompleteRows,
                  unallocated: formatCommissionAmount(
                    report.reconciliation.unallocatedExpenseTotal,
                  ),
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {!report && !loading && !error && (
        <div style={{ marginTop: 24 }}>
          <EmptyState
            title={t("analisysSystem.empty.title")}
            sub={t("analisysSystem.empty.description")}
          />
        </div>
      )}

      {report && (
        <div style={{ marginTop: 24 }}>
          <div style={{ ...styles.cardPad, marginBottom: 16 }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ ...styles.sectionTitle, fontSize: 16, textTransform: "none" }}>
                  Seemann y Compañia Limitada
                </div>
                <div style={{ ...base, fontSize: 14, fontWeight: 600, color: C.secondary }}>
                  Commision Analysis Report
                </div>
              </div>
              <div style={{ ...base, fontSize: 12, color: C.textMuted, textAlign: "right" }}>
                <div>
                  {t("analisysSystem.meta.printedOn")}:{" "}
                  {report.generatedAt.toLocaleDateString("es-CL")}
                </div>
                <div>{printedRange}</div>
                <div>
                  {t("analisysSystem.meta.invoices")}: {report.invoiceCount}
                </div>
              </div>
            </div>
          </div>

          <div style={{ ...styles.card, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1200 }}>
              <thead>
                <tr>
                  {[
                    "INVOICE",
                    "DATE",
                    "STATUS",
                    "DIVISION",
                    "TYPE",
                    "HAWB/HBL",
                    "BILL TO",
                    "CONSIGNEE",
                    "DESTINATION",
                    "INCOME",
                    "EXPENSE",
                    "PROFIT",
                    "COMMISION",
                  ].map((header) => (
                    <th key={header} style={styles.th}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((entry, index) => {
                  if (entry.kind === "rep-header") {
                    return (
                      <tr key={`rep-${entry.salesRep}-${index}`}>
                        <td colSpan={13} style={{ ...styles.td, fontWeight: 700, backgroundColor: C.bg }}>
                          {entry.salesRep}
                        </td>
                      </tr>
                    );
                  }

                  if (entry.kind === "shipment-header") {
                    return (
                      <tr key={`ship-${entry.label}-${index}`}>
                        <td style={{ ...styles.td, fontWeight: 600 }}>{entry.label}</td>
                        <td colSpan={12} style={styles.td} />
                      </tr>
                    );
                  }

                  if (entry.kind === "invoice") {
                    const row = entry.row;
                    const incomplete = row.reconciliationStatus === "incomplete";
                    return (
                      <tr key={`${row.invoice}-${index}`}>
                        <td style={styles.td}>{row.invoice}</td>
                        <td style={styles.td}>{row.date}</td>
                        <td style={styles.td}>{row.status}</td>
                        <td style={styles.td}>{row.division}</td>
                        <td style={styles.td}>{row.type}</td>
                        <td style={styles.td}>{row.hawbHbl}</td>
                        <td style={styles.td}>{row.billTo}</td>
                        <td style={styles.td}>{row.consignee}</td>
                        <td style={styles.td}>{row.destination}</td>
                        <td style={{ ...styles.td, textAlign: "right" }}>{amountCell(row.income)}</td>
                        <td
                          style={{
                            ...styles.td,
                            textAlign: "right",
                            color: incomplete ? C.textMuted : undefined,
                          }}
                          title={incomplete ? t("analisysSystem.reconciliation.incompleteRow") : undefined}
                        >
                          {amountCell(row.expense)}
                        </td>
                        <td
                          style={{
                            ...styles.td,
                            textAlign: "right",
                            color: incomplete ? C.textMuted : undefined,
                          }}
                          title={incomplete ? t("analisysSystem.reconciliation.incompleteRow") : undefined}
                        >
                          {amountCell(row.profit)}
                        </td>
                        <td style={{ ...styles.td, textAlign: "right" }}>{amountCell(row.commission)}</td>
                      </tr>
                    );
                  }

                  if (entry.kind === "rep-subtotal") {
                    return (
                      <tr key={`subtotal-${entry.salesRep}-${index}`} style={{ backgroundColor: C.primaryLight }}>
                        <td colSpan={9} style={{ ...styles.td, fontWeight: 700 }}>
                          {entry.salesRep}
                        </td>
                        <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>
                          {amountCell(entry.income)}
                        </td>
                        <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>
                          {amountCell(entry.expense)}
                        </td>
                        <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>
                          {amountCell(entry.profit)}
                        </td>
                        <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>
                          {amountCell(entry.commission)}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={`total-${index}`} style={{ backgroundColor: C.borderLight }}>
                      <td colSpan={9} style={{ ...styles.td, fontWeight: 800 }}>
                        TOTALS
                      </td>
                      <td style={{ ...styles.td, textAlign: "right", fontWeight: 800 }}>
                        {amountCell(entry.income)}
                      </td>
                      <td style={{ ...styles.td, textAlign: "right", fontWeight: 800 }}>
                        {amountCell(entry.expense)}
                      </td>
                      <td style={{ ...styles.td, textAlign: "right", fontWeight: 800 }}>
                        {amountCell(entry.profit)}
                      </td>
                      <td style={{ ...styles.td, textAlign: "right", fontWeight: 800 }}>
                        {amountCell(entry.commission)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {salesRepOptions.length > 0 && (
            <p style={{ ...base, fontSize: 12, color: C.textMuted, marginTop: 12 }}>
              {t("analisysSystem.meta.reps")}: {salesRepOptions.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
