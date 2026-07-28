import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import GerencialKpiGrid, {
  GerencialDeltaText,
} from "../../components/reporteriaGerencial/GerencialKpiGrid";
import GerencialScreenHeader, {
  GerencialNotice,
  GerencialPrimaryButton,
} from "../../components/reporteriaGerencial/GerencialScreenHeader";
import GerencialSegmentedTabs from "../../components/reporteriaGerencial/GerencialSegmentedTabs";
import GerencialSimpleTable from "../../components/reporteriaGerencial/GerencialSimpleTable";
import { useLinbisToken } from "../../hooks/useLinbisToken";
import {
  buildCommissionAnalysisReport,
  buildOperationsSummary,
  classifyAnalysisError,
  filterCommissionAnalysisReport,
  formatCommissionAmount,
  formatReportDateRange,
} from "../../../src/components/administrador/analisys-system/commissionAnalysisService";
import type {
  AnalisysSectionId,
  CommissionAnalysisReport,
} from "../../../src/components/administrador/analisys-system/types";
import {
  REPORT_MODE_CUSTOM_COMPARISON,
  REPORT_MODE_CUSTOM_RANGE,
  SUGGESTION_CATEGORY_ORDER,
  buildComparisonSuggestions,
  buildCustomComparisonSuggestion,
  findSuggestionById,
  type AppliedComparisonSuggestion,
  type DateRange,
} from "../../../src/components/administrador/analisys-system/comparisonSuggestions";
import { buildPeriodComparison } from "../../../src/components/administrador/analisys-system/periodComparisonAnalytics";
import {
  TOTAL_SERIES_KEY,
  buildRepComparison,
  buildTimeSeries,
  getCoherentGranularities,
  listSalesRepsFromReport,
  pickDefaultTrendGranularity,
  summarizeTrendSeries,
  type TimeGranularity,
} from "../../../src/components/administrador/analisys-system/commissionAnalytics";
import { getPeriodRange } from "../../../src/components/administrador/reporteria/financiera/quoteUtils";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";

type AnalysisTab = "summary" | "periodComparison" | "trends" | "teamComparison";
type FilterPicker = "exec" | "consignee" | "granularity" | null;

const GRANULARITY_LABELS: Record<TimeGranularity, string> = {
  week: "Semana",
  month: "Mes",
  quarter: "Trimestre",
  semester: "Semestre",
  year: "Año",
};

const MODE_LABELS: Record<string, string> = {
  [REPORT_MODE_CUSTOM_RANGE]: "Rango personalizado",
  [REPORT_MODE_CUSTOM_COMPARISON]: "Comparativa entre dos rangos",
  "month-to-today-vs-prev-closed":
    "Mes en curso (hasta hoy) vs mes anterior completo",
  "closed-month-vs-prev": "Mes cerrado vs mes anterior cerrado",
  "last-30-vs-prev-30": "Últimos 30 días vs 30 días anteriores",
  "quarter-to-today-vs-prev-closed":
    "Trimestre en curso (hasta hoy) vs trimestre anterior completo",
  "closed-quarter-vs-prev": "Trimestre cerrado vs trimestre anterior cerrado",
  "semester-to-today-vs-prev-closed":
    "Semestre en curso (hasta hoy) vs semestre anterior completo",
  "closed-semester-vs-prev": "Semestre cerrado vs semestre anterior cerrado",
  "year-to-today-vs-prev-closed":
    "Año en curso (hasta hoy) vs año anterior completo",
  "closed-year-vs-prev": "Año cerrado vs año anterior cerrado",
  "trend-12-months": "Tendencia últimos 12 meses",
  "team-comparison-ytd": "Comparar ejecutivos — año en curso (hasta hoy)",
  "team-comparison-closed-month":
    "Comparar ejecutivos — último mes cerrado",
};

const CATEGORY_LABELS: Record<string, string> = {
  month: "Mes a mes",
  quarterSemester: "Trimestre y semestre",
  year: "Año",
  teamTrends: "Equipo y tendencias",
};

function modeLabel(id: string): string {
  return MODE_LABELS[id] || id;
}

function tabFromTarget(target: AnalisysSectionId): AnalysisTab {
  if (target === "periodComparison") return "periodComparison";
  if (target === "trends") return "trends";
  if (target === "comparison") return "teamComparison";
  if (target === "topCustomers") return "teamComparison";
  return "summary";
}

function formatDeltaPct(value: number | null): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function computeMarginPct(income: number, profit: number): number | null {
  if (income <= 0) return null;
  return Math.round((profit / income) * 1000) / 10;
}

function isValidRange(range: DateRange): boolean {
  return Boolean(
    range.startDate && range.endDate && range.startDate <= range.endDate,
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.dateField}>
      <Text style={styles.dateLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="AAAA-MM-DD"
        placeholderTextColor={brand.mutedLight}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.dateInput}
      />
    </View>
  );
}

function SelectField({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.selectField}>
      <Text style={styles.dateLabel}>{label}</Text>
      <Pressable style={styles.selectBox} onPress={onPress}>
        <Text style={styles.selectText} numberOfLines={1}>
          {value}
        </Text>
        <Ionicons name="chevron-down" size={16} color={brand.muted} />
      </Pressable>
    </View>
  );
}

export default function CommissionAnalysisReportScreen() {
  const navigation = useNavigation();
  const { accessToken, loading: tokenLoading, refreshAccessToken } =
    useLinbisToken();

  const defaultMonth = useMemo(() => getPeriodRange("this-month"), []);
  const [reportMode, setReportMode] = useState("");
  const [customStart, setCustomStart] = useState(defaultMonth.startDate);
  const [customEnd, setCustomEnd] = useState(defaultMonth.endDate);
  const [periodAStart, setPeriodAStart] = useState(defaultMonth.startDate);
  const [periodAEnd, setPeriodAEnd] = useState(defaultMonth.endDate);
  const [periodBStart, setPeriodBStart] = useState(
    () => getPeriodRange("last-month").startDate,
  );
  const [periodBEnd, setPeriodBEnd] = useState(
    () => getPeriodRange("last-month").endDate,
  );

  const [tab, setTab] = useState<AnalysisTab>("summary");
  const [trendGranularity, setTrendGranularity] =
    useState<TimeGranularity>("month");
  const [baseReport, setBaseReport] = useState<CommissionAnalysisReport | null>(
    null,
  );
  const [hasGenerated, setHasGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReps, setSelectedReps] = useState<string[]>([]);
  const [selectedConsignees, setSelectedConsignees] = useState<string[]>([]);
  const [filterPicker, setFilterPicker] = useState<FilterPicker>(null);
  const [activeSuggestion, setActiveSuggestion] =
    useState<AppliedComparisonSuggestion | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const genRef = useRef(0);

  const suggestions = useMemo(() => buildComparisonSuggestions("es"), []);

  const salesRepOptions = useMemo(() => {
    if (!baseReport) return [];
    return baseReport.groups
      .map((g) => g.salesRep)
      .sort((a, b) => a.localeCompare(b, "es"));
  }, [baseReport]);

  const consigneeOptions = useMemo(() => {
    if (!baseReport) return [];
    const set = new Set<string>();
    for (const group of baseReport.groups) {
      for (const row of group.rows) {
        if (row.consignee?.trim()) set.add(row.consignee.trim());
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [baseReport]);

  const report = useMemo(() => {
    if (!baseReport) return null;
    const salesReps = selectedReps.length > 0 ? selectedReps : undefined;
    const consignees =
      selectedConsignees.length > 0 ? selectedConsignees : undefined;
    if (!salesReps && !consignees) return baseReport;
    return filterCommissionAnalysisReport(baseReport, { salesReps, consignees });
  }, [baseReport, selectedConsignees, selectedReps]);

  const needsCustomRange = reportMode === REPORT_MODE_CUSTOM_RANGE;
  const needsCustomComparison = reportMode === REPORT_MODE_CUSTOM_COMPARISON;
  const canGenerateCustom =
    Boolean(accessToken) &&
    !tokenLoading &&
    !loading &&
    ((needsCustomRange &&
      isValidRange({ startDate: customStart, endDate: customEnd })) ||
      (needsCustomComparison &&
        isValidRange({ startDate: periodAStart, endDate: periodAEnd }) &&
        isValidRange({ startDate: periodBStart, endDate: periodBEnd })));

  const cancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    genRef.current += 1;
    setLoading(false);
    setEnriching(false);
    setError("Consulta cancelada.");
  };

  const resetToModeSelection = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    genRef.current += 1;
    setHasGenerated(false);
    setBaseReport(null);
    setActiveSuggestion(null);
    setSelectedReps([]);
    setSelectedConsignees([]);
    setReportMode("");
    setError(null);
    setEnriching(false);
    setLoading(false);
  };

  const generate = useCallback(
    async (modeOverride?: string) => {
      const mode = modeOverride || reportMode;
      if (!accessToken || !mode) return;

      let loadRange: DateRange;
      let suggestion: AppliedComparisonSuggestion | null = null;
      let initialTab: AnalysisTab = "summary";

      if (mode === REPORT_MODE_CUSTOM_RANGE) {
        loadRange = { startDate: customStart, endDate: customEnd };
        if (!isValidRange(loadRange)) {
          setError("Revisa las fechas: desde debe ser menor o igual que hasta.");
          return;
        }
        suggestion = null;
        initialTab = "summary";
      } else if (mode === REPORT_MODE_CUSTOM_COMPARISON) {
        const periodA = { startDate: periodAStart, endDate: periodAEnd };
        const periodB = { startDate: periodBStart, endDate: periodBEnd };
        if (!isValidRange(periodA) || !isValidRange(periodB)) {
          setError("Revisa ambas fechas: cada período necesita desde ≤ hasta.");
          return;
        }
        const built = buildCustomComparisonSuggestion(periodA, periodB, "es");
        suggestion = { ...built, appliedAt: Date.now() };
        loadRange = built.loadRange;
        initialTab = "periodComparison";
      } else {
        const found = findSuggestionById(mode, "es");
        if (!found) {
          setError("Modo de reporte no válido.");
          return;
        }
        suggestion = { ...found, appliedAt: Date.now() };
        loadRange = found.loadRange;
        initialTab = tabFromTarget(found.targetSection);
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const gen = ++genRef.current;

      setReportMode(mode);
      setActiveSuggestion(suggestion);
      setTab(initialTab);
      setHasGenerated(true);
      setLoading(true);
      setEnriching(false);
      setError(null);
      setBaseReport(null);
      setSelectedReps([]);
      setSelectedConsignees([]);

      try {
        const result = await buildCommissionAnalysisReport(
          accessToken,
          refreshAccessToken,
          {
            startDate: loadRange.startDate,
            endDate: loadRange.endDate,
            forceRefresh: false,
            signal: controller.signal,
            onProgress: (partial, nextPhase) => {
              if (gen !== genRef.current) return;
              if (partial) {
                setBaseReport(partial);
                setLoading(false);
                setEnriching(nextPhase !== "complete");
              }
            },
          },
        );
        if (gen !== genRef.current) return;
        setBaseReport(result);
        setEnriching(false);
        setLoading(false);
      } catch (err) {
        if (gen !== genRef.current) return;
        const classified = classifyAnalysisError(err);
        if (classified.code === "aborted") {
          setError("Consulta cancelada.");
        } else if (classified.code === "timeout") {
          setError("Timeout al consultar Linbis. Podés reintentar.");
        } else {
          setError(classified.message || "Error al generar el análisis.");
        }
        setLoading(false);
        setEnriching(false);
      }
    },
    [
      accessToken,
      customEnd,
      customStart,
      periodAEnd,
      periodAStart,
      periodBEnd,
      periodBStart,
      refreshAccessToken,
      reportMode,
    ],
  );

  const selectMode = (modeId: string) => {
    setReportMode(modeId);
    setError(null);
    if (
      modeId === REPORT_MODE_CUSTOM_RANGE ||
      modeId === REPORT_MODE_CUSTOM_COMPARISON
    ) {
      return;
    }
    void generate(modeId);
  };

  const operations = useMemo(
    () =>
      report && report.invoiceCount > 0 ? buildOperationsSummary(report) : [],
    [report],
  );

  const totalOperations = useMemo(
    () =>
      operations.reduce((sum, group) => sum + group.subtotal.operationCount, 0),
    [operations],
  );

  const periodComparison = useMemo(() => {
    if (!report || !activeSuggestion) return null;
    if (activeSuggestion.targetSection !== "periodComparison") return null;
    return buildPeriodComparison(report, activeSuggestion);
  }, [activeSuggestion, report]);

  const availableGranularities = useMemo(() => {
    if (!report) return ["month" as TimeGranularity];
    return getCoherentGranularities(report.startDate, report.endDate);
  }, [report]);

  useEffect(() => {
    setTrendGranularity((current) => {
      if (availableGranularities.includes(current)) return current;
      return pickDefaultTrendGranularity(availableGranularities);
    });
  }, [availableGranularities]);

  const trends = useMemo(() => {
    if (!report) return null;
    const seriesResult = buildTimeSeries(report, trendGranularity, "es");
    const raw = seriesResult.byRep.get(TOTAL_SERIES_KEY) ?? [];
    return {
      summary: summarizeTrendSeries(raw),
      granularityLabel: GRANULARITY_LABELS[trendGranularity],
    };
  }, [report, trendGranularity]);

  const teamComparisonRows = useMemo(() => {
    if (!report) return [];
    const reps = listSalesRepsFromReport(report);
    return buildRepComparison(report, reps, false);
  }, [report]);

  const teamByProfitDesc = useMemo(
    () => [...teamComparisonRows].sort((a, b) => b.profit - a.profit),
    [teamComparisonRows],
  );

  const teamBySaleShareDesc = useMemo(
    () =>
      [...teamComparisonRows].sort(
        (a, b) => (b.incomeSharePct ?? 0) - (a.incomeSharePct ?? 0),
      ),
    [teamComparisonRows],
  );

  const teamOpsCards = useMemo(() => {
    if (selectedReps.length === 0) return [];
    return [...operations]
      .sort(
        (a, b) => b.subtotal.operationCount - a.subtotal.operationCount,
      )
      .map((group) => ({
        label: group.salesRep,
        value: String(group.subtotal.operationCount),
        sub: "Ops cerradas",
        tone: "accent" as const,
      }));
  }, [operations, selectedReps.length]);

  const trendKpis = useMemo(() => {
    if (!trends) return [];
    const { summary, granularityLabel } = trends;
    const granularityWord = granularityLabel.toLowerCase();
    return [
      {
        label: "Ingreso",
        value: formatCommissionAmount(summary.totalIncome),
        sub: `En ${summary.periodCount} ${granularityWord}(s) con actividad`,
        tone: "accent" as const,
      },
      {
        label: "Profit",
        value: formatCommissionAmount(summary.totalProfit),
        sub:
          summary.marginPct != null
            ? `Margen global del período: ${summary.marginPct}%`
            : undefined,
        tone:
          summary.totalProfit >= 0
            ? ("positive" as const)
            : ("negative" as const),
      },
      {
        label: "Último período",
        value: summary.lastPeriod
          ? formatCommissionAmount(summary.lastPeriod.profit)
          : "—",
        sub:
          summary.profitChangePct != null
            ? `vs período anterior: ${formatDeltaPct(summary.profitChangePct)}`
            : summary.lastPeriod?.periodLabel,
        tone:
          summary.profitChangePct == null
            ? ("default" as const)
            : summary.profitChangePct >= 0
              ? ("positive" as const)
              : ("negative" as const),
      },
      {
        label: "Mejor período (margen)",
        value: summary.bestProfitPeriod?.periodLabel ?? "—",
        sub: summary.bestProfitPeriod
          ? formatCommissionAmount(summary.bestProfitPeriod.profit)
          : undefined,
        tone: "positive" as const,
      },
    ];
  }, [trends]);

  const summaryKpis = useMemo(() => {
    if (!report) return [];
    return [
      {
        label: "Ingreso",
        value: formatCommissionAmount(report.totals.income),
        tone: "accent" as const,
      },
      {
        label: "Gasto",
        value: formatCommissionAmount(report.totals.expense),
      },
      {
        label: "Profit",
        value: formatCommissionAmount(report.totals.profit),
        tone:
          (report.totals.profit ?? 0) >= 0
            ? ("positive" as const)
            : ("negative" as const),
      },
      {
        label: "Operaciones totales",
        value: String(totalOperations),
      },
    ];
  }, [report, totalOperations]);

  const showResults = hasGenerated;
  const isBusy = loading || enriching;

  const modeSections = useMemo(() => {
    const sections: { title: string; items: { id: string; label: string }[] }[] =
      [
        {
          title: "Rango",
          items: [
            {
              id: REPORT_MODE_CUSTOM_RANGE,
              label: modeLabel(REPORT_MODE_CUSTOM_RANGE),
            },
            {
              id: REPORT_MODE_CUSTOM_COMPARISON,
              label: modeLabel(REPORT_MODE_CUSTOM_COMPARISON),
            },
          ],
        },
      ];

    for (const category of SUGGESTION_CATEGORY_ORDER) {
      const items = suggestions
        .filter((item) => item.category === category)
        .map((item) => ({ id: item.id, label: modeLabel(item.id) }));
      if (!items.length) continue;
      sections.push({
        title: CATEGORY_LABELS[category] || category,
        items,
      });
    }
    return sections;
  }, [suggestions]);

  const filterOptions =
    filterPicker === "exec"
      ? salesRepOptions
      : filterPicker === "consignee"
        ? consigneeOptions
        : filterPicker === "granularity"
          ? availableGranularities.map((g) => GRANULARITY_LABELS[g])
          : [];

  const execFilterLabel =
    selectedReps.length === 0
      ? "Todos"
      : selectedReps.length === 1
        ? selectedReps[0]
        : `${selectedReps.length} seleccionados`;

  const consigneeFilterLabel =
    selectedConsignees.length === 0
      ? "Todos"
      : selectedConsignees.length === 1
        ? selectedConsignees[0]
        : `${selectedConsignees.length} seleccionados`;

  const toggleFilterOption = (option: string) => {
    if (filterPicker === "exec") {
      setSelectedReps((prev) =>
        prev.includes(option)
          ? prev.filter((item) => item !== option)
          : [...prev, option],
      );
      return;
    }
    if (filterPicker === "consignee") {
      setSelectedConsignees((prev) =>
        prev.includes(option)
          ? prev.filter((item) => item !== option)
          : [...prev, option],
      );
      return;
    }
    if (filterPicker === "granularity") {
      const match = (Object.keys(GRANULARITY_LABELS) as TimeGranularity[]).find(
        (key) => GRANULARITY_LABELS[key] === option,
      );
      if (match && availableGranularities.includes(match)) {
        setTrendGranularity(match);
        setFilterPicker(null);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <GerencialScreenHeader
        title="Commission Analysis Report"
        subtitle={
          report
            ? formatReportDateRange(report.startDate, report.endDate)
            : "Modo del reporte"
        }
        onBack={() => navigation.goBack()}
        right={
          isBusy ? (
            <Pressable onPress={cancel} hitSlop={8}>
              <Text style={styles.cancel}>Cancelar</Text>
            </Pressable>
          ) : showResults ? (
            <Pressable onPress={resetToModeSelection} hitSlop={8}>
              <Text style={styles.cancel}>Cambiar</Text>
            </Pressable>
          ) : null
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        {!showResults ? (
          needsCustomRange || needsCustomComparison ? (
            <>
              <Pressable
                style={styles.backToModes}
                onPress={() => {
                  setReportMode("");
                  setError(null);
                }}
              >
                <Ionicons name="chevron-back" size={18} color={brand.navy} />
                <Text style={styles.backToModesText}>Volver a modos</Text>
              </Pressable>

              {needsCustomRange ? (
                <View style={styles.dateBlock}>
                  <Text style={styles.sectionLabel}>Rango personalizado</Text>
                  <Text style={styles.hint}>
                    Indicá el rango de facturas (AAAA-MM-DD) y generá el análisis.
                  </Text>
                  <DateField
                    label="Desde"
                    value={customStart}
                    onChange={setCustomStart}
                  />
                  <DateField
                    label="Hasta"
                    value={customEnd}
                    onChange={setCustomEnd}
                  />
                  <GerencialPrimaryButton
                    label="Generar análisis"
                    onPress={() => void generate(REPORT_MODE_CUSTOM_RANGE)}
                    disabled={!canGenerateCustom}
                  />
                </View>
              ) : null}

              {needsCustomComparison ? (
                <View style={styles.dateBlock}>
                  <Text style={styles.sectionLabel}>
                    Comparativa entre dos rangos
                  </Text>
                  <Text style={styles.hint}>
                    Período A (reciente) y período B (comparación). Formato
                    AAAA-MM-DD.
                  </Text>
                  <Text style={styles.subSection}>Período A</Text>
                  <DateField
                    label="Desde"
                    value={periodAStart}
                    onChange={setPeriodAStart}
                  />
                  <DateField
                    label="Hasta"
                    value={periodAEnd}
                    onChange={setPeriodAEnd}
                  />
                  <Text style={styles.subSection}>Período B</Text>
                  <DateField
                    label="Desde"
                    value={periodBStart}
                    onChange={setPeriodBStart}
                  />
                  <DateField
                    label="Hasta"
                    value={periodBEnd}
                    onChange={setPeriodBEnd}
                  />
                  <GerencialPrimaryButton
                    label="Generar comparativa"
                    onPress={() => void generate(REPORT_MODE_CUSTOM_COMPARISON)}
                    disabled={!canGenerateCustom}
                  />
                </View>
              ) : null}

              {error ? <GerencialNotice text={error} tone="error" /> : null}
            </>
          ) : (
            <>
              {modeSections.map((section) => (
                <View key={section.title} style={styles.menuSection}>
                  <Text style={styles.menuSectionTitle}>{section.title}</Text>
                  <View style={styles.menuCard}>
                    {section.items.map((item, index) => (
                      <Pressable
                        key={item.id}
                        style={({ pressed }) => [
                          styles.menuRow,
                          index < section.items.length - 1 &&
                          styles.menuRowBorder,
                          pressed && styles.menuRowPressed,
                        ]}
                        onPress={() => selectMode(item.id)}
                      >
                        <Text style={styles.menuRowLabel}>{item.label}</Text>
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={brand.mutedLight}
                        />
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
              {error ? <GerencialNotice text={error} tone="error" /> : null}
            </>
          )
        ) : (
          <>
            <View style={styles.modeSummary}>
              <Text style={styles.modeSummaryLabel}>Modo</Text>
              <Text style={styles.modeSummaryValue} numberOfLines={2}>
                {modeLabel(reportMode)}
              </Text>
            </View>

            {isBusy ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={brand.primary} />
                <Text style={styles.loadingText}>
                  Cargando información, puede tardar unos segundos
                </Text>
              </View>
            ) : null}

            {error ? <GerencialNotice text={error} tone="error" /> : null}

            {report && !loading ? (
              <>
                <GerencialSegmentedTabs
                  tabs={[
                    { key: "summary", label: "Resumen" },
                    { key: "periodComparison", label: "Comparativa" },
                    { key: "trends", label: "Tendencias" },
                    { key: "teamComparison", label: "Comp. Equipo" },
                  ]}
                  active={tab}
                  onChange={setTab}
                />

                {tab === "summary" ? (
                  <>
                    <View style={styles.filtersRow}>
                      <SelectField
                        label="Ejecutivo"
                        value={execFilterLabel}
                        onPress={() => setFilterPicker("exec")}
                      />
                      <SelectField
                        label="Consignee"
                        value={consigneeFilterLabel}
                        onPress={() => setFilterPicker("consignee")}
                      />
                    </View>

                    <View style={styles.filterDivider} />

                    <GerencialKpiGrid items={summaryKpis} />

                    <Text style={styles.sectionLabel}>
                      Operaciones por ejecutivo
                    </Text>
                    <GerencialSimpleTable
                      columns={[
                        { key: "rep", label: "Ejecutivo", flex: 1.4 },
                        { key: "ops", label: "Ops", flex: 0.6, align: "right" },
                      ]}
                      rows={operations.map((group) => ({
                        rep: group.salesRep,
                        ops: group.subtotal.operationCount,
                      }))}
                      footer={{
                        rep: "Total",
                        ops: totalOperations,
                      }}
                    />

                    <Text style={styles.sectionLabel}>
                      Resultados por ejecutivo
                    </Text>
                    <GerencialSimpleTable
                      columns={[
                        { key: "rep", label: "Ejecutivo", flex: 1.2 },
                        {
                          key: "income",
                          label: "Ingreso",
                          flex: 1,
                          align: "right",
                        },
                        {
                          key: "profit",
                          label: "Profit",
                          flex: 1,
                          align: "right",
                        },
                      ]}
                      rows={operations.map((group) => ({
                        rep: group.salesRep,
                        income: formatCommissionAmount(group.subtotal.income),
                        profit: formatCommissionAmount(group.subtotal.profit),
                      }))}
                      footer={{
                        rep: "Total",
                        income: formatCommissionAmount(
                          operations.reduce(
                            (sum, group) => sum + group.subtotal.income,
                            0,
                          ),
                        ),
                        profit: formatCommissionAmount(
                          operations.reduce(
                            (sum, group) => sum + group.subtotal.profit,
                            0,
                          ),
                        ),
                      }}
                    />
                  </>
                ) : null}

                {tab === "periodComparison" ? (
                  periodComparison ? (
                    <>
                      <GerencialNotice
                        text={`${periodComparison.periodA.label} → ${periodComparison.periodB.label}`}
                      />
                      <GerencialDeltaText
                        label="Ingreso"
                        current={periodComparison.periodB.income}
                        previous={periodComparison.periodA.income}
                        format="money"
                      />
                      <GerencialDeltaText
                        label="Gasto"
                        current={periodComparison.periodB.expense}
                        previous={periodComparison.periodA.expense}
                        format="money"
                      />
                      <GerencialDeltaText
                        label="Profit"
                        current={periodComparison.periodB.profit}
                        previous={periodComparison.periodA.profit}
                        format="money"
                      />
                      <GerencialDeltaText
                        label="Facturas"
                        current={periodComparison.periodB.invoiceCount}
                        previous={periodComparison.periodA.invoiceCount}
                      />
                      <GerencialDeltaText
                        label="Operaciones"
                        current={periodComparison.periodB.operationCount}
                        previous={periodComparison.periodA.operationCount}
                      />
                    </>
                  ) : (
                    <GerencialNotice text="No hay una comparación entre periodos, prueba otro modo" />
                  )
                ) : null}

                {tab === "trends" && trends ? (
                  <>
                    <SelectField
                      label="Agrupar por"
                      value={GRANULARITY_LABELS[trendGranularity]}
                      onPress={() => setFilterPicker("granularity")}
                    />
                    <GerencialKpiGrid items={trendKpis} />
                  </>
                ) : null}

                {tab === "teamComparison" ? (
                  <>
                    <SelectField
                      label="Ejecutivo"
                      value={execFilterLabel}
                      onPress={() => setFilterPicker("exec")}
                    />

                    <View style={styles.filterDivider} />

                    {teamOpsCards.length > 0 ? (
                      <>
                        <Text style={styles.sectionLabel}>
                          Operaciones por ejecutivo
                        </Text>
                        <GerencialKpiGrid items={teamOpsCards} />
                      </>
                    ) : null}

                    <Text style={styles.sectionLabel}>
                      Profit y margen por ejecutivo
                    </Text>
                    <GerencialSimpleTable
                      columns={[
                        { key: "rep", label: "Ejecutivo", flex: 1.3 },
                        {
                          key: "profit",
                          label: "Profit",
                          flex: 1,
                          align: "right",
                        },
                        {
                          key: "margin",
                          label: "Margen %",
                          flex: 0.8,
                          align: "right",
                        },
                      ]}
                      rows={teamByProfitDesc.map((row) => {
                        const margin = computeMarginPct(row.income, row.profit);
                        return {
                          rep: row.salesRep,
                          profit: formatCommissionAmount(row.profit),
                          margin: margin != null ? `${margin}%` : "—",
                        };
                      })}
                      footer={{
                        rep: "Total",
                        profit: formatCommissionAmount(
                          teamComparisonRows.reduce(
                            (sum, row) => sum + row.profit,
                            0,
                          ),
                        ),
                        margin: (() => {
                          const income = teamComparisonRows.reduce(
                            (sum, row) => sum + row.income,
                            0,
                          );
                          const profit = teamComparisonRows.reduce(
                            (sum, row) => sum + row.profit,
                            0,
                          );
                          const margin = computeMarginPct(income, profit);
                          return margin != null ? `${margin}%` : "—";
                        })(),
                      }}
                    />

                    <Text style={styles.sectionLabel}>
                      Participación en venta y margen
                    </Text>
                    <GerencialSimpleTable
                      columns={[
                        { key: "rep", label: "Ejecutivo", flex: 1.3 },
                        {
                          key: "saleShare",
                          label: "% venta",
                          flex: 0.9,
                          align: "right",
                        },
                        {
                          key: "marginShare",
                          label: "% margen",
                          flex: 0.9,
                          align: "right",
                        },
                      ]}
                      rows={teamBySaleShareDesc.map((row) => ({
                        rep: row.salesRep,
                        saleShare:
                          row.incomeSharePct != null
                            ? `${row.incomeSharePct.toFixed(1)}%`
                            : "—",
                        marginShare:
                          row.profitSharePct != null
                            ? `${row.profitSharePct.toFixed(1)}%`
                            : "—",
                      }))}
                      footer={{
                        rep: "Total",
                        saleShare: (() => {
                          const sum = teamComparisonRows.reduce(
                            (acc, row) => acc + (row.incomeSharePct ?? 0),
                            0,
                          );
                          return `${sum.toFixed(1)}%`;
                        })(),
                        marginShare: (() => {
                          const sum = teamComparisonRows.reduce(
                            (acc, row) => acc + (row.profitSharePct ?? 0),
                            0,
                          );
                          return `${sum.toFixed(1)}%`;
                        })(),
                      }}
                    />

                    <Text style={styles.sectionLabel}>
                      Ingreso y profit por ejecutivo
                    </Text>
                    <GerencialSimpleTable
                      columns={[
                        { key: "rep", label: "Ejecutivo", flex: 1.2 },
                        {
                          key: "income",
                          label: "Ingreso",
                          flex: 1,
                          align: "right",
                        },
                        {
                          key: "profit",
                          label: "Profit",
                          flex: 1,
                          align: "right",
                        },
                      ]}
                      rows={teamByProfitDesc.map((row) => ({
                        rep: row.salesRep,
                        income: formatCommissionAmount(row.income),
                        profit: formatCommissionAmount(row.profit),
                      }))}
                      footer={{
                        rep: "Total",
                        income: formatCommissionAmount(
                          teamComparisonRows.reduce(
                            (sum, row) => sum + row.income,
                            0,
                          ),
                        ),
                        profit: formatCommissionAmount(
                          teamComparisonRows.reduce(
                            (sum, row) => sum + row.profit,
                            0,
                          ),
                        ),
                      }}
                    />
                  </>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      <Modal
        visible={filterPicker != null}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterPicker(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {filterPicker === "exec"
                  ? "Ejecutivos"
                  : filterPicker === "consignee"
                    ? "Consignees"
                    : "Agrupar por"}
              </Text>
              <Pressable onPress={() => setFilterPicker(null)} hitSlop={12}>
                <Ionicons name="close" size={22} color={brand.navy} />
              </Pressable>
            </View>
            {filterPicker !== "granularity" ? (
              <Text style={styles.modalHint}>Podés elegir uno o varios</Text>
            ) : null}
            <ScrollView contentContainerStyle={styles.modalContent}>
              {filterPicker !== "granularity" ? (
                <Pressable
                  style={[
                    styles.modalOption,
                    (filterPicker === "exec"
                      ? selectedReps.length === 0
                      : selectedConsignees.length === 0) &&
                    styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    if (filterPicker === "exec") setSelectedReps([]);
                    else setSelectedConsignees([]);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      (filterPicker === "exec"
                        ? selectedReps.length === 0
                        : selectedConsignees.length === 0) &&
                      styles.modalOptionTextActive,
                    ]}
                  >
                    Todos
                  </Text>
                </Pressable>
              ) : null}

              {filterOptions.map((option) => {
                const active =
                  filterPicker === "exec"
                    ? selectedReps.includes(option)
                    : filterPicker === "consignee"
                      ? selectedConsignees.includes(option)
                      : GRANULARITY_LABELS[trendGranularity] === option;
                return (
                  <Pressable
                    key={option}
                    style={[
                      styles.modalOption,
                      active && styles.modalOptionActive,
                    ]}
                    onPress={() => toggleFilterOption(option)}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        active && styles.modalOptionTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                    {active ? (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={brand.navy}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            {filterPicker !== "granularity" ? (
              <View style={styles.modalFooter}>
                <GerencialPrimaryButton
                  label="Listo"
                  onPress={() => setFilterPicker(null)}
                />
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: brand.canvas },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2,
    gap: 12,
  },
  sectionLabel: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  hint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
  subSection: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: brand.ink,
  },
  backToModes: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  backToModesText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  menuSection: { marginBottom: 4 },
  menuSectionTitle: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: brand.muted,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  menuCard: {
    backgroundColor: brand.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: brand.border,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  menuRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brand.border,
  },
  menuRowPressed: {
    backgroundColor: brand.canvasAlt,
  },
  menuRowLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.medium,
    color: brand.ink,
  },
  dateBlock: {
    gap: 8,
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    padding: 12,
  },
  dateField: { gap: 4 },
  dateLabel: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: brand.muted,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: fonts.medium,
    color: brand.ink,
    backgroundColor: brand.canvas,
  },
  selectField: {
    flex: 1,
    gap: 4,
  },
  selectBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  selectText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.medium,
    color: brand.ink,
  },
  filtersRow: {
    flexDirection: "row",
    gap: 10,
  },
  filterDivider: {
    height: 1,
    backgroundColor: brand.border,
    marginTop: 6,
    marginBottom: 10,
  },
  loadingBox: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 28,
  },
  loadingText: {
    textAlign: "center",
    color: brand.muted,
    fontSize: 13,
    fontFamily: fonts.medium,
    paddingHorizontal: 24,
  },
  cancel: {
    color: brand.primary,
    fontFamily: fonts.semiBold,
    fontSize: 12,
  },
  modeSummary: {
    backgroundColor: brand.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  modeSummaryLabel: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: brand.muted,
    textTransform: "uppercase",
  },
  modeSummaryValue: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: brand.ink,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "70%",
    backgroundColor: brand.canvas,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brand.border,
    backgroundColor: brand.surface,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  modalHint: {
    paddingHorizontal: 16,
    paddingTop: 10,
    fontSize: 12,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
  modalContent: {
    padding: 16,
    paddingBottom: 16,
    gap: 6,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    backgroundColor: brand.surface,
  },
  modalOptionActive: {
    backgroundColor: "#e8eef5",
    borderColor: brand.navy,
  },
  modalOptionText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.medium,
    color: brand.ink,
  },
  modalOptionTextActive: {
    color: brand.navy,
    fontFamily: fonts.semiBold,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: brand.border,
    backgroundColor: brand.surface,
  },
});
