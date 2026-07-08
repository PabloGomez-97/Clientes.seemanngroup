import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router-dom";
import {
  buildCommissionAnalysisReport,
  clearCommissionAnalysisCache,
  filterCommissionAnalysisReport,
  formatReportDateRange,
} from "./commissionAnalysisService";
import type { AnalisysSectionId } from "./AnalisysSectionNav";
import AnalisysSectionNav from "./AnalisysSectionNav";
import type { CommissionAnalysisOperation, CommissionAnalysisReport } from "./types";
import ComparisonTab from "./tabs/ComparisonTab";
import SummaryTab from "./tabs/SummaryTab";
import TopCustomersTab from "./tabs/TopCustomersTab";
import TrendsTab from "./tabs/TrendsTab";
import {
  AnalisysLoadingBanner,
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
  const [activeSection, setActiveSection] = useState<AnalisysSectionId>("summary");
  const [visitedSections, setVisitedSections] = useState<Set<AnalisysSectionId>>(
    () => new Set(["summary"]),
  );
  const [selectedOperation, setSelectedOperation] =
    useState<CommissionAnalysisOperation | null>(null);

  const sections = useMemo(
    () => [
      {
        id: "summary" as const,
        label: t("analisysSystem.sections.summary.title"),
        description: t("analisysSystem.sections.summary.description"),
      },
      {
        id: "trends" as const,
        label: t("analisysSystem.sections.trends.title"),
        description: t("analisysSystem.sections.trends.description"),
      },
      {
        id: "comparison" as const,
        label: t("analisysSystem.sections.comparison.title"),
        description: t("analisysSystem.sections.comparison.description"),
      },
      {
        id: "topCustomers" as const,
        label: t("analisysSystem.sections.topCustomers.title"),
        description: t("analisysSystem.sections.topCustomers.description"),
      },
    ],
    [t],
  );

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

  const filteredReport = useMemo(() => {
    if (!baseReport) return null;
    if (!salesRepFilter && !consigneeFilter.trim()) return baseReport;
    return filterCommissionAnalysisReport(baseReport, {
      salesRep: salesRepFilter || undefined,
      consignee: consigneeFilter.trim() || undefined,
    });
  }, [baseReport, salesRepFilter, consigneeFilter]);

  const report = useMemo(() => {
    if (!baseReport) return null;
    // Los filtros "Filtrar resultados" solo aplican al Resumen Operativo.
    if (activeSection !== "summary") return baseReport;
    return filteredReport;
  }, [baseReport, filteredReport, activeSection]);

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

  const handleSectionChange = (section: AnalisysSectionId) => {
    setActiveSection(section);
    setVisitedSections((prev) => new Set(prev).add(section));
  };

  const handleGenerate = async (
    forceRefresh = false,
    overrideRange?: { startDate: string; endDate: string },
  ) => {
    if (!accessToken) {
      setError(t("analisysSystem.errors.noToken"));
      return;
    }

    const effectiveStart = overrideRange?.startDate ?? startDate;
    const effectiveEnd = overrideRange?.endDate ?? endDate;

    setLoading(true);
    setEnriching(false);
    setError(null);
    setActiveSection("summary");
    setVisitedSections(new Set(["summary"]));

    try {
      if (forceRefresh) clearCommissionAnalysisCache();
      await buildCommissionAnalysisReport(accessToken, refreshAccessToken, {
        startDate: effectiveStart,
        endDate: effectiveEnd,
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

  const analyticsReport = baseReport;

  const applySuggestionRange = (range: { startDate: string; endDate: string }) => {
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    void handleGenerate(false, range);
  };

  const suggestionRanges = useMemo(() => {
    const thisMonth = getPeriodRange("this-month");
    const lastMonth = getPeriodRange("last-month");
    const thisYear = getPeriodRange("this-year");
    const last12 = getPeriodRange("last-12-months");

    const now = new Date();
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const quarterStart = new Date(now.getFullYear(), quarterStartMonth, 1);
    const quarterStartIso = quarterStart.toISOString().slice(0, 10);
    const todayIso = now.toISOString().slice(0, 10);

    // Rango que cubre mes anterior + mes actual (hasta hoy).
    const lastVsThis = {
      startDate: lastMonth.startDate,
      endDate: thisMonth.endDate,
    };

    return {
      annualidad: last12,
      trimestre: { startDate: quarterStartIso, endDate: todayIso },
      mesAnterior: lastMonth,
      mesActual: thisMonth,
      mesAnteriorVsActual: lastVsThis,
      esteAno: thisYear,
    } as const;
  }, []);

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

      {baseReport && !loading && activeSection === "summary" && (
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
            {activeSection === "summary" && (salesRepFilter || consigneeFilter.trim()) && (
              <p style={{ ...base, fontSize: 12, color: C.textMuted, margin: "12px 0 0" }}>
                {t("analisysSystem.analytics.filtersSummaryOnly")}
              </p>
            )}
          </CardSection>
        </div>
      )}

      {!loading && fetchedAt && baseReport && report && analyticsReport && report.invoiceCount > 0 && (
        <div style={{ marginTop: 12 }}>
          <AnalisysSectionNav
            layout="horizontal"
            sections={sections}
            activeSection={activeSection}
            onChange={handleSectionChange}
          />
        </div>
      )}

      {error && (
        <div style={{ marginTop: 16 }}>
          <ErrorBanner message={error} />
        </div>
      )}

      {loading && <AnalisysSystemSkeleton message={loadingMessage} />}

      {!loading && fetchedAt && baseReport && report && analyticsReport && (
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
            <AnalisysLoadingBanner message={t("analisysSystem.loading.enriching")} />
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
              {visitedSections.has("summary") && (
                <div style={{ display: activeSection === "summary" ? "block" : "none" }}>
                  <SummaryTab
                    report={report}
                    accessToken={accessToken}
                    refreshAccessToken={refreshAccessToken}
                    selectedOperation={selectedOperation}
                    onSelectOperation={setSelectedOperation}
                  />
                </div>
              )}

              {visitedSections.has("trends") && analyticsReport && (
                <div style={{ display: activeSection === "trends" ? "block" : "none" }}>
                  <TrendsTab report={analyticsReport} />
                </div>
              )}

              {visitedSections.has("comparison") && analyticsReport && (
                <div style={{ display: activeSection === "comparison" ? "block" : "none" }}>
                  <ComparisonTab report={analyticsReport} />
                </div>
              )}

              {visitedSections.has("topCustomers") && analyticsReport && (
                <div style={{ display: activeSection === "topCustomers" ? "block" : "none" }}>
                  <TopCustomersTab report={analyticsReport} />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!baseReport && !loading && !error && (
        <div style={{ marginTop: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <CardSection title={t("analisysSystem.empty.suggestionsTitle")}>
              <p style={{ ...base, fontSize: 13, color: C.textMuted, margin: "0 0 12px" }}>
                {t("analisysSystem.empty.suggestionsLead")}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <button
                  type="button"
                  style={btnOutline}
                  onClick={() => applySuggestionRange(suggestionRanges.annualidad)}
                >
                  {t("analisysSystem.empty.suggestions.annualidad")}
                </button>
                <button
                  type="button"
                  style={btnOutline}
                  onClick={() => applySuggestionRange(suggestionRanges.trimestre)}
                >
                  {t("analisysSystem.empty.suggestions.trimestre")}
                </button>
                <button
                  type="button"
                  style={btnOutline}
                  onClick={() => applySuggestionRange(suggestionRanges.mesAnterior)}
                >
                  {t("analisysSystem.empty.suggestions.mesAnterior")}
                </button>
                <button
                  type="button"
                  style={btnOutline}
                  onClick={() => applySuggestionRange(suggestionRanges.mesActual)}
                >
                  {t("analisysSystem.empty.suggestions.mesActual")}
                </button>
                <button
                  type="button"
                  style={btnOutline}
                  onClick={() => applySuggestionRange(suggestionRanges.mesAnteriorVsActual)}
                >
                  {t("analisysSystem.empty.suggestions.mesAnteriorVsActual")}
                </button>
                <button
                  type="button"
                  style={btnOutline}
                  onClick={() => applySuggestionRange(suggestionRanges.esteAno)}
                >
                  {t("analisysSystem.empty.suggestions.esteAno")}
                </button>
              </div>
            </CardSection>
          </div>

          <EmptyState
            title={t("analisysSystem.empty.title")}
            sub={t("analisysSystem.empty.description")}
          />
        </div>
      )}
    </div>
  );
}
