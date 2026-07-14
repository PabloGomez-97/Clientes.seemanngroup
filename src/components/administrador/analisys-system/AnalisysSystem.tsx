import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router-dom";
import {
  buildCommissionAnalysisReport,
  classifyAnalysisError,
  clearCommissionAnalysisCache,
  filterCommissionAnalysisReport,
  formatReportDateRange,
  prewarmCommissionCoreDataset,
  type AnalysisBuildPhase,
} from "./commissionAnalysisService";
import type { AnalisysSectionId } from "./AnalisysSectionNav";
import AnalisysSectionNav from "./AnalisysSectionNav";
import AnalisysSimpleModal from "./AnalisysSimpleModal";
import QuickSuggestionsPanel from "./QuickSuggestionsPanel";
import type { CommissionAnalysisOperation, CommissionAnalysisReport } from "./types";
import ComparisonTab from "./tabs/ComparisonTab";
import PeriodComparisonTab from "./tabs/PeriodComparisonTab";
import SummaryTab from "./tabs/SummaryTab";
import TopCustomersTab from "./tabs/TopCustomersTab";
import TrendsTab from "./tabs/TrendsTab";
import {
  type AppliedComparisonSuggestion,
  buildComparisonSuggestions,
  findSuggestionById,
} from "./comparisonSuggestions";
import {
  getComparisonReports,
  type ComparisonReportsBundle,
} from "./comparisonModeAnalytics";
import { LINBIS_TOKEN_STALE_MS } from "@/hooks/useLinbisToken";
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
  ensureFreshToken: (force?: boolean) => Promise<string>;
  getTokenAgeMs: () => number;
  onLogout: () => void;
}

export default function AnalisysSystem() {
  const { t, i18n } = useTranslation();
  const {
    accessToken,
    refreshAccessToken,
    ensureFreshToken,
    getTokenAgeMs,
  } = useOutletContext<OutletContext>();

  const defaultRange = useMemo(() => getPeriodRange("this-month"), []);
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [salesRepsFilter, setSalesRepsFilter] = useState<string[]>([]);
  const [consigneeFilter, setConsigneeFilter] = useState("");
  const [baseReport, setBaseReport] = useState<CommissionAnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [buildPhase, setBuildPhase] = useState<AnalysisBuildPhase | null>(null);
  const [heartbeatTick, setHeartbeatTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [partialEnrichError, setPartialEnrichError] = useState(false);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<AnalisysSectionId>("summary");
  const [visitedSections, setVisitedSections] = useState<Set<AnalisysSectionId>>(
    () => new Set(["summary"]),
  );
  const [selectedOperation, setSelectedOperation] =
    useState<CommissionAnalysisOperation | null>(null);
  const [activeSuggestion, setActiveSuggestion] =
    useState<AppliedComparisonSuggestion | null>(null);
  const [suggestionsModalOpen, setSuggestionsModalOpen] = useState(false);
  const [resultsFilterModalOpen, setResultsFilterModalOpen] = useState(false);

  const generationIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const prewarmDoneRef = useRef(false);

  const sections = useMemo(
    () => [
      {
        id: "summary" as const,
        label: t("analisysSystem.sections.summary.title"),
        description: t("analisysSystem.sections.summary.description"),
      },
      {
        id: "periodComparison" as const,
        label: t("analisysSystem.sections.periodComparison.title"),
        description: t("analisysSystem.sections.periodComparison.description"),
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

  const isPeriodComparisonMode =
    activeSuggestion?.targetSection === "periodComparison";

  const visibleSections = useMemo(() => {
    if (isPeriodComparisonMode) return sections;
    if (activeSuggestion) {
      return sections.filter((section) => section.id === activeSuggestion.targetSection);
    }
    return sections;
  }, [sections, activeSuggestion, isPeriodComparisonMode]);

  const comparisonSuggestion = isPeriodComparisonMode ? activeSuggestion : null;

  useEffect(() => {
    if (!loading && !enriching) {
      setHeartbeatTick(0);
      return;
    }
    const timer = window.setInterval(() => {
      setHeartbeatTick((tick) => tick + 1);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [loading, enriching]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!accessToken || prewarmDoneRef.current) return;
    prewarmDoneRef.current = true;
    // Do not abort on cleanup: aborting a shared warm request was being
    // misread as a timeout by later generate calls that joined the same inflight.
    void prewarmCommissionCoreDataset(accessToken, refreshAccessToken);
  }, [accessToken, refreshAccessToken]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (!accessToken) return;
      if (getTokenAgeMs() < LINBIS_TOKEN_STALE_MS) return;
      void ensureFreshToken(true).catch(() => {});
      if (!loading && !enriching) {
        void prewarmCommissionCoreDataset(accessToken, refreshAccessToken);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [
    accessToken,
    refreshAccessToken,
    ensureFreshToken,
    getTokenAgeMs,
    loading,
    enriching,
  ]);

  const phaseMessage = useMemo(() => {
    switch (buildPhase) {
      case "loadingCore":
        return t("analisysSystem.loading.loadingCore");
      case "preview":
        return t("analisysSystem.loading.previewReady");
      case "loadingCharges":
        return t("analisysSystem.loading.loadingCharges");
      case "computing":
        return t("analisysSystem.loading.computing");
      default:
        return t("analisysSystem.loading.initial");
    }
  }, [buildPhase, t]);

  const loadingMessage =
    heartbeatTick > 0
      ? `${phaseMessage} ${t("analisysSystem.loading.stillWorking")}`
      : phaseMessage;

  const scopedReport = useMemo(() => {
    if (!baseReport) return null;
    if (salesRepsFilter.length === 0 && !consigneeFilter.trim()) return baseReport;
    return filterCommissionAnalysisReport(baseReport, {
      salesReps: salesRepsFilter.length > 0 ? salesRepsFilter : undefined,
      consignee: consigneeFilter.trim() || undefined,
    });
  }, [baseReport, salesRepsFilter, consigneeFilter]);

  const report = scopedReport;

  const comparisonBundle: ComparisonReportsBundle | null = useMemo(() => {
    if (!scopedReport || !comparisonSuggestion) return null;
    return getComparisonReports(scopedReport, comparisonSuggestion);
  }, [scopedReport, comparisonSuggestion]);

  const salesRepOptions = useMemo(() => {
    if (!baseReport) return [];
    return [...baseReport.groups.map((group) => group.salesRep)].sort((a, b) =>
      a.localeCompare(b, "es"),
    );
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

  const comparisonSuggestions = useMemo(
    () => buildComparisonSuggestions(i18n.language),
    [i18n.language],
  );

  const mapErrorMessage = (err: unknown): string => {
    const classified = classifyAnalysisError(err);
    switch (classified.code) {
      case "timeout":
        return t("analisysSystem.errors.timeout");
      case "aborted":
        return t("analisysSystem.errors.cancelled");
      case "unauthorized":
        return t("analisysSystem.errors.unauthorized");
      case "invalidPayload":
        return t("analisysSystem.errors.invalidPayload");
      case "network":
        return t("analisysSystem.errors.network");
      default:
        return classified.message || t("analisysSystem.errors.generic");
    }
  };

  const cancelGenerate = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    generationIdRef.current += 1;
    setLoading(false);
    setEnriching(false);
    setBuildPhase(null);
    setError(t("analisysSystem.errors.cancelled"));
  };

  const handleGenerate = async (
    forceRefresh = false,
    options?: {
      overrideRange?: { startDate: string; endDate: string };
      suggestion?: AppliedComparisonSuggestion;
      enrichOnly?: boolean;
    },
  ) => {
    if (!accessToken) {
      setError(t("analisysSystem.errors.noToken"));
      return;
    }

    const effectiveStart = options?.overrideRange?.startDate ?? startDate;
    const effectiveEnd = options?.overrideRange?.endDate ?? endDate;
    const suggestion = options?.suggestion ?? null;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const generationId = ++generationIdRef.current;

    if (suggestion) {
      setActiveSuggestion(suggestion);
    } else if (!options?.enrichOnly) {
      setActiveSuggestion(null);
    }

    setLoading(true);
    setEnriching(false);
    setPartialEnrichError(false);
    setError(null);
    setBuildPhase("loadingCore");
    setSessionNotice(null);

    const targetSection =
      suggestion?.targetSection ??
      (options?.enrichOnly ? activeSection : "summary");
    if (!options?.enrichOnly) {
      setActiveSection(targetSection);
      setVisitedSections(new Set([targetSection]));
    }

    let sawPreview = Boolean(options?.enrichOnly && baseReport);

    try {
      const wasStale = getTokenAgeMs() >= LINBIS_TOKEN_STALE_MS;
      const freshToken = await ensureFreshToken(wasStale);
      if (generationId !== generationIdRef.current) return;

      if (wasStale) {
        setSessionNotice(t("analisysSystem.notices.sessionRefreshed"));
      }

      if (forceRefresh) clearCommissionAnalysisCache();

      await buildCommissionAnalysisReport(freshToken, refreshAccessToken, {
        startDate: effectiveStart,
        endDate: effectiveEnd,
        forceRefresh,
        signal: controller.signal,
        onProgress: (nextReport, phase) => {
          if (generationId !== generationIdRef.current) return;
          setBuildPhase(phase);
          if (phase === "preview" && nextReport) {
            sawPreview = true;
            setBaseReport(nextReport);
            setFetchedAt(Date.now());
            setLoading(false);
            setEnriching(true);
          } else if (phase === "loadingCharges" || phase === "computing") {
            setEnriching(true);
            setLoading(false);
          } else if (phase === "complete" && nextReport) {
            setBaseReport(nextReport);
            setEnriching(false);
            setPartialEnrichError(false);
          }
        },
      });

      if (generationId !== generationIdRef.current) return;

      setSalesRepsFilter([]);
      setConsigneeFilter("");
      setSelectedOperation(null);
      setBuildPhase("complete");
      setPartialEnrichError(false);
    } catch (err) {
      if (generationId !== generationIdRef.current) return;
      const classified = classifyAnalysisError(err);
      if (classified.code === "aborted") {
        setError(t("analisysSystem.errors.cancelled"));
        setPartialEnrichError(false);
        return;
      }

      setError(mapErrorMessage(err));
      setPartialEnrichError(sawPreview);
    } finally {
      if (generationId === generationIdRef.current) {
        setLoading(false);
        setEnriching(false);
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    }
  };

  const applySuggestion = (suggestionId: string) => {
    const suggestion = findSuggestionById(suggestionId, i18n.language);
    if (!suggestion) return;

    setSuggestionsModalOpen(false);
    setStartDate(suggestion.loadRange.startDate);
    setEndDate(suggestion.loadRange.endDate);

    const applied: AppliedComparisonSuggestion = {
      ...suggestion,
      appliedAt: Date.now(),
    };

    setActiveSuggestion(applied);

    void handleGenerate(false, {
      overrideRange: suggestion.loadRange,
      suggestion: applied,
    });
  };

  const hasResultsFilters = Boolean(salesRepsFilter.length > 0 || consigneeFilter.trim());
  const showResultsFilterButton = Boolean(baseReport) && !loading;

  useEffect(() => {
    if (!showResultsFilterButton) setResultsFilterModalOpen(false);
  }, [showResultsFilterButton]);

  useEffect(() => {
    const available = new Set(salesRepOptions);
    setSalesRepsFilter((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.filter((rep) => available.has(rep));
      return next.length === prev.length ? prev : next;
    });
  }, [salesRepOptions]);

  const printedRange = report
    ? formatReportDateRange(report.startDate, report.endDate)
    : "";

  const analyticsReport = scopedReport;
  const busy = loading || enriching;

  const toggleSalesRepFilter = (rep: string) => {
    setSalesRepsFilter((prev) =>
      prev.includes(rep) ? prev.filter((value) => value !== rep) : [...prev, rep],
    );
  };

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
              disabled={busy}
            />
          </div>
          <div>
            <label style={styles.label}>{t("analisysSystem.filters.to")}</label>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              style={inputStyle}
              disabled={busy}
            />
          </div>

          <button
            type="button"
            style={{ ...btnPrimary, opacity: loading ? 0.7 : 1 }}
            disabled={busy}
            onClick={() => handleGenerate(false)}
          >
            {loading ? t("analisysSystem.actions.generating") : t("analisysSystem.actions.generate")}
          </button>
          <button
            type="button"
            style={{ ...btnOutline, opacity: loading ? 0.7 : 1 }}
            disabled={busy || !baseReport}
            onClick={() => {
              void handleGenerate(true, activeSuggestion ? { suggestion: activeSuggestion } : undefined);
            }}
          >
            {t("analisysSystem.actions.refresh")}
          </button>
          <button
            type="button"
            style={{
              ...btnOutline,
              borderColor: activeSuggestion ? C.primary : C.border,
              color: activeSuggestion ? C.primary : undefined,
            }}
            disabled={busy}
            onClick={() => setSuggestionsModalOpen(true)}
          >
            {t("analisysSystem.suggestions.title")}
          </button>
          {showResultsFilterButton && (
            <button
              type="button"
              style={{
                ...btnOutline,
                borderColor: hasResultsFilters ? C.primary : C.border,
                color: hasResultsFilters ? C.primary : undefined,
              }}
              onClick={() => setResultsFilterModalOpen(true)}
            >
              {t("analisysSystem.filters.resultsTitle")}
              {hasResultsFilters
                ? ` (${t("analisysSystem.filters.active")})`
                : ""}
            </button>
          )}
          {busy && (
            <button type="button" style={btnOutline} onClick={cancelGenerate}>
              {t("analisysSystem.actions.cancel")}
            </button>
          )}
        </div>

        {activeSuggestion && (
          <p style={{ ...base, fontSize: 12, color: C.textMuted, margin: "12px 0 0" }}>
            {t("analisysSystem.analytics.periodComparison.activeSuggestion", {
              label: t(activeSuggestion.labelKey),
            })}
          </p>
        )}
        {hasResultsFilters && (
          <p style={{ ...base, fontSize: 12, color: C.textMuted, margin: "12px 0 0" }}>
            {t("analisysSystem.analytics.filtersActiveHint", {
              reps:
                salesRepsFilter.length > 0
                  ? salesRepsFilter.join(", ")
                  : t("analisysSystem.filters.all"),
              consignee: consigneeFilter.trim() || t("analisysSystem.filters.all"),
            })}
          </p>
        )}
      </CardSection>

      {sessionNotice && (
        <div style={{ marginTop: 12 }}>
          <AnalisysLoadingBanner message={sessionNotice} />
        </div>
      )}

      {suggestionsModalOpen && (
        <AnalisysSimpleModal
          title={t("analisysSystem.suggestions.title")}
          onClose={() => setSuggestionsModalOpen(false)}
        >
          <QuickSuggestionsPanel
            suggestions={comparisonSuggestions}
            activeSuggestion={activeSuggestion}
            onSelect={applySuggestion}
            disabled={busy}
          />
        </AnalisysSimpleModal>
      )}

      {resultsFilterModalOpen && showResultsFilterButton && (
        <AnalisysSimpleModal
          title={t("analisysSystem.filters.resultsTitle")}
          description={t("analisysSystem.analytics.filtersScopeHint")}
          onClose={() => setResultsFilterModalOpen(false)}
          maxWidth={720}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 8,
                }}
              >
                <label style={{ ...styles.label, marginBottom: 0 }}>
                  {t("analisysSystem.filters.multipleSalesReps")}
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    style={{ ...btnOutline, padding: "4px 10px", fontSize: 12 }}
                    onClick={() => setSalesRepsFilter([...salesRepOptions])}
                  >
                    {t("analisysSystem.filters.selectAll")}
                  </button>
                  <button
                    type="button"
                    style={{ ...btnOutline, padding: "4px 10px", fontSize: 12 }}
                    onClick={() => setSalesRepsFilter([])}
                  >
                    {t("analisysSystem.filters.clearReps")}
                  </button>
                </div>
              </div>
              <p style={{ ...base, fontSize: 12, color: C.textMuted, margin: "0 0 12px" }}>
                {t("analisysSystem.filters.multipleSalesRepsHint")}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {salesRepOptions.map((rep) => {
                  const checked = salesRepsFilter.includes(rep);
                  return (
                    <label
                      key={rep}
                      style={{
                        ...base,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 13,
                        cursor: "pointer",
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: `1px solid ${checked ? C.primary : C.border}`,
                        backgroundColor: checked ? C.primaryLight : C.white,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSalesRepFilter(rep)}
                      />
                      {rep}
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={styles.label}>{t("analisysSystem.filters.consignee")}</label>
              <input
                list="analisys-consignee-options"
                value={consigneeFilter}
                onChange={(event) => setConsigneeFilter(event.target.value)}
                placeholder={t("analisysSystem.filters.consigneePlaceholder")}
                style={{ ...inputStyle, width: "100%", maxWidth: "100%" }}
              />
              <datalist id="analisys-consignee-options">
                {consigneeOptions.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {hasResultsFilters && (
                <button
                  type="button"
                  style={btnOutline}
                  onClick={() => {
                    setSalesRepsFilter([]);
                    setConsigneeFilter("");
                  }}
                >
                  {t("analisysSystem.filters.clear")}
                </button>
              )}
              <button
                type="button"
                style={btnPrimary}
                onClick={() => setResultsFilterModalOpen(false)}
              >
                {t("analisysSystem.filters.apply")}
              </button>
            </div>
          </div>
        </AnalisysSimpleModal>
      )}

      {!loading && fetchedAt && baseReport && report && analyticsReport && report.invoiceCount > 0 && (
        <div style={{ marginTop: 12 }}>
          <AnalisysSectionNav
            layout="horizontal"
            sections={visibleSections}
            activeSection={activeSection}
            onChange={handleSectionChange}
          />
        </div>
      )}

      {error && (
        <div style={{ marginTop: 16 }}>
          <ErrorBanner message={error} />
          {partialEnrichError && baseReport && (
            <div style={{ marginTop: 8 }}>
              <p style={{ ...base, fontSize: 13, color: C.textMuted, marginBottom: 8 }}>
                {t("analisysSystem.errors.partialEnrich")}
              </p>
              <button
                type="button"
                style={btnOutline}
                disabled={busy}
                onClick={() => {
                  void handleGenerate(false, {
                    enrichOnly: true,
                    suggestion: activeSuggestion ?? undefined,
                  });
                }}
              >
                {t("analisysSystem.actions.retryEnrich")}
              </button>
            </div>
          )}
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
            <AnalisysLoadingBanner
              message={
                heartbeatTick > 0
                  ? `${t("analisysSystem.loading.enriching")} ${t("analisysSystem.loading.stillWorking")}`
                  : t("analisysSystem.loading.enriching")
              }
            />
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
                    comparisonSuggestion={comparisonSuggestion}
                    comparisonBundle={comparisonBundle}
                    existingReport={baseReport}
                  />
                </div>
              )}

              {visitedSections.has("periodComparison") && analyticsReport && (
                <div
                  style={{ display: activeSection === "periodComparison" ? "block" : "none" }}
                >
                  {comparisonSuggestion && comparisonBundle ? (
                    <PeriodComparisonTab
                      report={analyticsReport}
                      suggestion={comparisonSuggestion}
                      comparisonSummary={comparisonBundle.summary}
                    />
                  ) : (
                    <EmptyState
                      title={t("analisysSystem.analytics.periodComparison.emptyTitle")}
                      sub={t("analisysSystem.analytics.periodComparison.emptyDescription")}
                    />
                  )}
                </div>
              )}

              {visitedSections.has("trends") && analyticsReport && (
                <div style={{ display: activeSection === "trends" ? "block" : "none" }}>
                  <TrendsTab
                    report={analyticsReport}
                    comparisonSuggestion={comparisonSuggestion}
                    comparisonBundle={comparisonBundle}
                  />
                </div>
              )}

              {visitedSections.has("comparison") && analyticsReport && (
                <div style={{ display: activeSection === "comparison" ? "block" : "none" }}>
                  <ComparisonTab
                    report={analyticsReport}
                    comparisonSuggestion={comparisonSuggestion}
                    comparisonBundle={comparisonBundle}
                  />
                </div>
              )}

              {visitedSections.has("topCustomers") && analyticsReport && (
                <div style={{ display: activeSection === "topCustomers" ? "block" : "none" }}>
                  <TopCustomersTab
                    report={analyticsReport}
                    comparisonSuggestion={comparisonSuggestion}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!baseReport && !loading && !error && (
        <EmptyState
          title={t("analisysSystem.empty.title")}
          sub={t("analisysSystem.empty.description")}
        />
      )}
    </div>
  );
}
