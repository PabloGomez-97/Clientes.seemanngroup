import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  classifyAnalysisError,
  fetchOperationInvoiceDetails,
  formatCommissionAmount,
} from "./commissionAnalysisService";
import type { CommissionAnalysisInvoiceRow, CommissionAnalysisOperation, CommissionAnalysisReport } from "./types";
import {
  C,
  base,
  btnOutline,
  styles,
} from "@/components/administrador/reporteria/financiera/executiveReportingUi";

type Props = {
  operation: CommissionAnalysisOperation;
  startDate: string;
  endDate: string;
  accessToken: string;
  refreshAccessToken: () => Promise<string>;
  existingReport?: CommissionAnalysisReport | null;
  onClose: () => void;
};

export default function OperationInvoiceModal({
  operation,
  startDate,
  endDate,
  accessToken,
  refreshAccessToken,
  existingReport,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<CommissionAnalysisInvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const details = await fetchOperationInvoiceDetails(
          accessToken,
          refreshAccessToken,
          {
            invoiceNumbers: operation.invoices,
            moduleId: operation.moduleId,
            startDate,
            endDate,
            existingReport,
            signal: controller.signal,
          },
        );
        if (!controller.signal.aborted) setRows(details);
      } catch (err) {
        if (controller.signal.aborted) return;
        const classified = classifyAnalysisError(err);
        if (classified.code === "aborted") return;
        setError(
          classified.code === "timeout"
            ? t("analisysSystem.errors.timeout")
            : classified.message || t("analisysSystem.errors.generic"),
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [
    accessToken,
    refreshAccessToken,
    operation.invoices,
    operation.moduleId,
    startDate,
    endDate,
    existingReport,
    t,
  ]);

  const totals = rows.reduce(
    (acc, row) => {
      acc.income += row.income;
      acc.expense += row.expense ?? 0;
      acc.profit += row.profit ?? 0;
      return acc;
    },
    { income: 0, expense: 0, profit: 0 },
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        backgroundColor: "rgba(17, 24, 39, 0.45)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(1200px, 100%)",
          maxHeight: "85vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          backgroundColor: C.white,
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          boxShadow: "0 20px 40px rgba(0,0,0,0.12)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <div>
            <div style={{ ...base, fontSize: 18, fontWeight: 700, color: C.secondary }}>
              {t("analisysSystem.modal.title", { operation: operation.operationRef })}
            </div>
            <div style={{ ...base, fontSize: 13, color: C.textMuted, marginTop: 4 }}>
              {operation.salesRep} · {operation.invoices.length}{" "}
              {t("analisysSystem.modal.invoiceCountLabel")}
            </div>
          </div>
          <button type="button" style={btnOutline} onClick={onClose}>
            {t("analisysSystem.modal.close")}
          </button>
        </div>

        <div style={{ padding: 20, overflow: "auto" }}>
          {loading && (
            <p style={{ ...base, textAlign: "center", color: C.textMuted, padding: 32 }}>
              {t("analisysSystem.modal.loading")}
            </p>
          )}

          {error && (
            <p style={{ ...base, color: C.negative, textAlign: "center", padding: 24 }}>
              {error}
            </p>
          )}

          {!loading && !error && (
            <div style={{ ...styles.card, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
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
                  {rows.map((row) => {
                    const incomplete = row.reconciliationStatus === "incomplete";
                    return (
                      <tr key={row.invoice}>
                        <td style={styles.td}>{row.invoice}</td>
                        <td style={styles.td}>{row.date}</td>
                        <td style={styles.td}>{row.status}</td>
                        <td style={styles.td}>{row.division}</td>
                        <td style={styles.td}>{row.type}</td>
                        <td style={styles.td}>{row.hawbHbl}</td>
                        <td style={styles.td}>{row.billTo}</td>
                        <td style={styles.td}>{row.consignee}</td>
                        <td style={styles.td}>{row.destination}</td>
                        <td style={{ ...styles.td, textAlign: "right" }}>
                          {formatCommissionAmount(row.income)}
                        </td>
                        <td
                          style={{
                            ...styles.td,
                            textAlign: "right",
                            color: incomplete ? C.textMuted : undefined,
                          }}
                        >
                          {formatCommissionAmount(row.expense)}
                        </td>
                        <td
                          style={{
                            ...styles.td,
                            textAlign: "right",
                            color: incomplete ? C.textMuted : undefined,
                          }}
                        >
                          {formatCommissionAmount(row.profit)}
                        </td>
                        <td style={{ ...styles.td, textAlign: "right" }}>
                          {formatCommissionAmount(row.commission)}
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length > 0 && (
                    <tr style={{ backgroundColor: C.borderLight }}>
                      <td colSpan={9} style={{ ...styles.td, fontWeight: 700 }}>
                        {t("analisysSystem.operations.total")}
                      </td>
                      <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>
                        {formatCommissionAmount(totals.income)}
                      </td>
                      <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>
                        {formatCommissionAmount(totals.expense)}
                      </td>
                      <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>
                        {formatCommissionAmount(totals.profit)}
                      </td>
                      <td style={styles.td} />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
