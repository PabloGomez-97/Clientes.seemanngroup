import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useAuth } from "../../auth/AuthContext";
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
  RANGE_MODE_OPTIONS,
  calculateQuoteStats,
  fetchGerencialEjecutivos,
  fetchQuotesComparative,
  fetchQuotesForExecutive,
  formatMoney,
  formatPct,
  getPeriodRange,
  labelForRangeMode,
  type ExecutiveQuote,
  type QuoteStats,
  type RangeMode,
  buildMonthlyComparison,
} from "../../services/gerencialQuotesApi";
import { brand, radii, spacing } from "../../theme/brand";
import { fonts } from "../../theme/typography";
import { OPERACIONES_PAGE_SIZE } from "../../../src/services/operacionesPagination";

type ModeTab = "individual" | "comparativa" | "doble";
type PickerKind = "range" | "exec" | "execA" | "execB" | null;

function isValidRange(startDate: string, endDate: string): boolean {
  return Boolean(startDate && endDate && startDate <= endDate);
}

function formatSignedNumber(value: number): string {
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded.toLocaleString("es-CL")}`;
}

function formatSignedMoney(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatMoney(Math.abs(value))}`;
}

function formatSignedPctPts(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)} pts`;
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
      <Text style={styles.fieldLabel}>{label}</Text>
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
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable style={styles.selectBox} onPress={onPress}>
        <Text style={styles.selectText} numberOfLines={1}>
          {value || "Seleccionar"}
        </Text>
        <Ionicons name="chevron-down" size={16} color={brand.muted} />
      </Pressable>
    </View>
  );
}

export default function CotizacionesPorEjecutivoScreen() {
  const navigation = useNavigation();
  const { token } = useAuth();
  const { accessToken, loading: tokenLoading, refreshAccessToken } =
    useLinbisToken();

  const defaultMonth = useMemo(() => getPeriodRange("this-month"), []);
  const defaultPrevMonth = useMemo(() => getPeriodRange("last-month"), []);

  const [mode, setMode] = useState<ModeTab>("individual");
  const [rangeMode, setRangeMode] = useState<RangeMode>("this-month");
  const [customStart, setCustomStart] = useState(defaultMonth.startDate);
  const [customEnd, setCustomEnd] = useState(defaultMonth.endDate);
  const [periodAStart, setPeriodAStart] = useState(defaultMonth.startDate);
  const [periodAEnd, setPeriodAEnd] = useState(defaultMonth.endDate);
  const [periodBStart, setPeriodBStart] = useState(defaultPrevMonth.startDate);
  const [periodBEnd, setPeriodBEnd] = useState(defaultPrevMonth.endDate);

  const [ejecutivos, setEjecutivos] = useState<string[]>([]);
  const [selectedExec, setSelectedExec] = useState("");
  const [execA, setExecA] = useState("");
  const [execB, setExecB] = useState("");
  const [picker, setPicker] = useState<PickerKind>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<ExecutiveQuote[]>([]);
  const [stats, setStats] = useState<QuoteStats | null>(null);
  const [prevStats, setPrevStats] = useState<QuoteStats | null>(null);
  const [comparative, setComparative] = useState<
    { nombre: string; stats: QuoteStats; prevStats?: QuoteStats }[]
  >([]);
  const [doubleQuotes, setDoubleQuotes] = useState<
    [ExecutiveQuote[], ExecutiveQuote[]] | null
  >(null);
  const [doublePrevStats, setDoublePrevStats] = useState<
    [QuoteStats, QuoteStats] | null
  >(null);
  const [appliedRangeLabel, setAppliedRangeLabel] = useState("");
  const [page, setPage] = useState(1);

  const primaryRange = useMemo(() => {
    if (rangeMode === "custom") {
      return { startDate: customStart, endDate: customEnd };
    }
    if (rangeMode === "two-ranges") {
      return { startDate: periodAStart, endDate: periodAEnd };
    }
    return getPeriodRange(rangeMode);
  }, [
    customEnd,
    customStart,
    periodAEnd,
    periodAStart,
    rangeMode,
  ]);

  const compareRange = useMemo(() => {
    if (rangeMode !== "two-ranges") return null;
    return { startDate: periodBStart, endDate: periodBEnd };
  }, [periodBEnd, periodBStart, rangeMode]);

  const rangeLabel = useMemo(() => {
    if (rangeMode === "two-ranges") {
      return `${periodAStart} → ${periodAEnd}  vs  ${periodBStart} → ${periodBEnd}`;
    }
    if (rangeMode === "custom") {
      return `${customStart} → ${customEnd}`;
    }
    return `${primaryRange.startDate} → ${primaryRange.endDate}`;
  }, [
    customEnd,
    customStart,
    periodAEnd,
    periodAStart,
    periodBEnd,
    periodBStart,
    primaryRange.endDate,
    primaryRange.startDate,
    rangeMode,
  ]);

  useEffect(() => {
    if (!token) return;
    void fetchGerencialEjecutivos(token)
      .then((rows) => {
        const names = rows.map((r) => r.nombre.trim()).filter(Boolean);
        setEjecutivos(names);
        if (names[0]) {
          setSelectedExec((prev) => prev || names[0]);
          setExecA((prev) => prev || names[0]);
          setExecB((prev) => prev || names[1] || names[0]);
        }
      })
      .catch(() => setError("No se pudieron cargar los ejecutivos."));
  }, [token]);

  const linbisOptions = useMemo(
    () => ({ accessToken, refreshAccessToken }),
    [accessToken, refreshAccessToken],
  );

  const canConsult = useMemo(() => {
    if (!accessToken || tokenLoading || loading) return false;
    if (rangeMode === "custom") {
      if (!isValidRange(customStart, customEnd)) return false;
    }
    if (rangeMode === "two-ranges") {
      if (
        !isValidRange(periodAStart, periodAEnd) ||
        !isValidRange(periodBStart, periodBEnd)
      ) {
        return false;
      }
    }
    if (mode === "individual" && !selectedExec) return false;
    if (mode === "doble" && (!execA || !execB)) return false;
    return true;
  }, [
    accessToken,
    customEnd,
    customStart,
    execA,
    execB,
    loading,
    mode,
    periodAEnd,
    periodAStart,
    periodBEnd,
    periodBStart,
    rangeMode,
    selectedExec,
    tokenLoading,
  ]);

  const runSearch = useCallback(async () => {
    if (!accessToken || !canConsult) return;
    setLoading(true);
    setError(null);
    setPage(1);
    setPrevStats(null);
    setDoublePrevStats(null);
    setAppliedRangeLabel(rangeLabel);

    const start = primaryRange.startDate;
    const end = primaryRange.endDate;

    try {
      if (mode === "individual") {
        const data = await fetchQuotesForExecutive(
          selectedExec,
          start,
          end,
          linbisOptions,
        );
        setQuotes(data);
        setStats(calculateQuoteStats(data));
        setComparative([]);
        setDoubleQuotes(null);

        if (compareRange) {
          const prevData = await fetchQuotesForExecutive(
            selectedExec,
            compareRange.startDate,
            compareRange.endDate,
            linbisOptions,
          );
          setPrevStats(calculateQuoteStats(prevData));
        }
      } else if (mode === "comparativa") {
        const data = await fetchQuotesComparative(
          ejecutivos,
          start,
          end,
          linbisOptions,
        );

        if (compareRange) {
          const prevData = await fetchQuotesComparative(
            ejecutivos,
            compareRange.startDate,
            compareRange.endDate,
            linbisOptions,
          );
          const prevByName = new Map(
            prevData.map((row) => [row.nombre, row.stats]),
          );
          setComparative(
            data.map(({ nombre, stats: st }) => ({
              nombre,
              stats: st,
              prevStats: prevByName.get(nombre),
            })),
          );
        } else {
          setComparative(
            data.map(({ nombre, stats: st }) => ({ nombre, stats: st })),
          );
        }

        setQuotes([]);
        setStats(null);
        setDoubleQuotes(null);
      } else {
        const [q1, q2] = await Promise.all([
          fetchQuotesForExecutive(execA, start, end, linbisOptions),
          fetchQuotesForExecutive(execB, start, end, linbisOptions),
        ]);
        setDoubleQuotes([q1, q2]);
        setQuotes([]);
        setStats(null);
        setComparative([]);

        if (compareRange) {
          const [p1, p2] = await Promise.all([
            fetchQuotesForExecutive(
              execA,
              compareRange.startDate,
              compareRange.endDate,
              linbisOptions,
            ),
            fetchQuotesForExecutive(
              execB,
              compareRange.startDate,
              compareRange.endDate,
              linbisOptions,
            ),
          ]);
          setDoublePrevStats([
            calculateQuoteStats(p1),
            calculateQuoteStats(p2),
          ]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al consultar.");
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    canConsult,
    compareRange,
    ejecutivos,
    execA,
    execB,
    linbisOptions,
    mode,
    primaryRange.endDate,
    primaryRange.startDate,
    rangeLabel,
    selectedExec,
  ]);

  const pagedQuotes = useMemo(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(quotes.length / OPERACIONES_PAGE_SIZE),
    );
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * OPERACIONES_PAGE_SIZE;
    return {
      items: quotes.slice(start, start + OPERACIONES_PAGE_SIZE),
      page: safePage,
      totalPages,
      total: quotes.length,
    };
  }, [page, quotes]);

  const individualKpis = useMemo(() => {
    if (!stats) return [];
    return [
      { label: "Cotizaciones", value: String(stats.totalQuotes) },
      {
        label: "Cierre",
        value: formatPct(stats.completionRate),
        sub: `${stats.completedQuotes} cerradas`,
      },
      {
        label: "Ingreso",
        value: formatMoney(stats.totalIncome),
        tone: "accent" as const,
      },
      {
        label: "Profit",
        value: formatMoney(stats.totalProfit),
        tone:
          stats.totalProfit >= 0
            ? ("positive" as const)
            : ("negative" as const),
        sub: `Margen ${formatPct(stats.profitMargin)}`,
      },
      { label: "Aéreo", value: String(stats.airQuotes) },
      { label: "Marítimo", value: String(stats.seaQuotes) },
      { label: "Terrestre", value: String(stats.truckQuotes) },
      { label: "Clientes", value: String(stats.uniqueConsignees) },
    ];
  }, [stats]);

  const doubleStats = useMemo(() => {
    if (!doubleQuotes) return null;
    return [
      calculateQuoteStats(doubleQuotes[0]),
      calculateQuoteStats(doubleQuotes[1]),
    ] as const;
  }, [doubleQuotes]);

  const monthlyDouble = useMemo(() => {
    if (!doubleQuotes) return [];
    return buildMonthlyComparison(doubleQuotes[0], doubleQuotes[1]);
  }, [doubleQuotes]);

  const pickerTitle =
    picker === "range"
      ? "Periodo"
      : picker === "exec"
        ? "Ejecutivo"
        : picker === "execA"
          ? "Ejecutivo A"
          : picker === "execB"
            ? "Ejecutivo B"
            : "";

  const pickerOptions =
    picker === "range"
      ? RANGE_MODE_OPTIONS.map((opt) => ({
          key: opt.key,
          label: opt.label,
        }))
      : ejecutivos.map((name) => ({ key: name, label: name }));

  const onPickOption = (key: string) => {
    if (picker === "range") {
      setRangeMode(key as RangeMode);
      if (key !== "custom" && key !== "two-ranges") {
        const next = getPeriodRange(key as Exclude<RangeMode, "two-ranges">);
        setCustomStart(next.startDate);
        setCustomEnd(next.endDate);
      }
    } else if (picker === "exec") {
      setSelectedExec(key);
    } else if (picker === "execA") {
      setExecA(key);
    } else if (picker === "execB") {
      setExecB(key);
    }
    setPicker(null);
  };

  const isOptionActive = (key: string) => {
    if (picker === "range") return rangeMode === key;
    if (picker === "exec") return selectedExec === key;
    if (picker === "execA") return execA === key;
    if (picker === "execB") return execB === key;
    return false;
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <GerencialScreenHeader
        title="Cotizaciones por Ejecutivo"
        subtitle={appliedRangeLabel || rangeLabel}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <GerencialSegmentedTabs
          tabs={[
            { key: "individual", label: "Individual" },
            { key: "comparativa", label: "Comparativa" },
            { key: "doble", label: "Doble" },
          ]}
          active={mode}
          onChange={setMode}
        />

        <SelectField
          label="Periodo"
          value={labelForRangeMode(rangeMode)}
          onPress={() => setPicker("range")}
        />

        {rangeMode === "custom" ? (
          <View style={styles.dateBlock}>
            <Text style={styles.hint}>Formato AAAA-MM-DD</Text>
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
          </View>
        ) : null}

        {rangeMode === "two-ranges" ? (
          <View style={styles.dateBlock}>
            <Text style={styles.hint}>
              Período A (reciente) vs período B (comparación). Formato
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
          </View>
        ) : null}

        {mode === "individual" ? (
          <SelectField
            label="Ejecutivo"
            value={selectedExec}
            onPress={() => setPicker("exec")}
          />
        ) : null}

        {mode === "doble" ? (
          <>
            <SelectField
              label="Ejecutivo A"
              value={execA}
              onPress={() => setPicker("execA")}
            />
            <SelectField
              label="Ejecutivo B"
              value={execB}
              onPress={() => setPicker("execB")}
            />
          </>
        ) : null}

        {mode === "comparativa" ? (
          <GerencialNotice text="Compara a todos los ejecutivos activos en el periodo seleccionado." />
        ) : null}

        <View style={styles.filterDivider} />

        <GerencialPrimaryButton
          label={loading || tokenLoading ? "Consultando…" : "Consultar"}
          onPress={() => void runSearch()}
          disabled={!canConsult}
        />

        {error ? <GerencialNotice text={error} tone="error" /> : null}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={brand.primary} />
            <Text style={styles.loadingText}>Cargando cotizaciones…</Text>
          </View>
        ) : null}

        {mode === "individual" && stats ? (
          <>
            {prevStats ? (
              <>
                <Text style={styles.sectionLabel}>
                  Variación período A vs B
                </Text>
                <GerencialDeltaText
                  label="Cotizaciones"
                  current={stats.totalQuotes}
                  previous={prevStats.totalQuotes}
                />
                <GerencialDeltaText
                  label="Ingreso"
                  current={stats.totalIncome}
                  previous={prevStats.totalIncome}
                  format="money"
                />
                <GerencialDeltaText
                  label="Profit"
                  current={stats.totalProfit}
                  previous={prevStats.totalProfit}
                  format="money"
                />
                <GerencialDeltaText
                  label="Cierre"
                  current={stats.completionRate}
                  previous={prevStats.completionRate}
                  format="percent"
                />
              </>
            ) : null}
            <GerencialKpiGrid items={individualKpis} />
            <Text style={styles.sectionLabel}>
              Detalle ({pagedQuotes.total} cotizaciones)
            </Text>
            <GerencialSimpleTable
              columns={[
                { key: "date", label: "Fecha", flex: 0.9 },
                { key: "consignee", label: "Cliente", flex: 1.2 },
                { key: "mode", label: "Modo", flex: 0.7 },
                { key: "profit", label: "Profit", flex: 1, align: "right" },
              ]}
              rows={pagedQuotes.items.map((q) => ({
                date: q.date?.slice(0, 10) || "—",
                consignee: q.consignee || "—",
                mode: q.modeOfTransportation || "—",
                profit: formatMoney(q.profit || 0),
              }))}
            />
            {pagedQuotes.totalPages > 1 ? (
              <View style={styles.pager}>
                <Pressable
                  disabled={pagedQuotes.page <= 1}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <Text style={styles.pagerBtn}>Anterior</Text>
                </Pressable>
                <Text style={styles.pagerMeta}>
                  {pagedQuotes.page}/{pagedQuotes.totalPages}
                </Text>
                <Pressable
                  disabled={pagedQuotes.page >= pagedQuotes.totalPages}
                  onPress={() => setPage((p) => p + 1)}
                >
                  <Text style={styles.pagerBtn}>Siguiente</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        ) : null}

        {mode === "comparativa" && comparative.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>Ranking por profit</Text>
            <GerencialSimpleTable
              columns={[
                { key: "nombre", label: "Ejecutivo", flex: 1.2 },
                { key: "quotes", label: "Cot.", flex: 0.55, align: "right" },
                { key: "cierre", label: "Cierre", flex: 0.7, align: "right" },
                { key: "profit", label: "Profit", flex: 1, align: "right" },
                ...(comparative.some((row) => row.prevStats)
                  ? [
                      {
                        key: "delta",
                        label: "Δ Profit",
                        flex: 0.8,
                        align: "right" as const,
                      },
                    ]
                  : []),
              ]}
              rows={comparative.map((row) => {
                const delta =
                  row.prevStats != null
                    ? row.stats.totalProfit - row.prevStats.totalProfit
                    : null;
                return {
                  nombre: row.nombre,
                  quotes: row.stats.totalQuotes,
                  cierre: formatPct(row.stats.completionRate),
                  profit: formatMoney(row.stats.totalProfit),
                  ...(delta != null
                    ? {
                        delta: `${delta > 0 ? "+" : ""}${formatMoney(delta)}`,
                      }
                    : {}),
                };
              })}
            />
          </>
        ) : null}

        {mode === "doble" && doubleStats ? (
          <>
            <GerencialNotice
              text={`Comparando ${execA} (A) vs ${execB} (B) en el periodo consultado.`}
            />

            <Text style={styles.sectionLabel}>{execA}</Text>
            <GerencialKpiGrid
              items={[
                {
                  label: "Cotizaciones",
                  value: String(doubleStats[0].totalQuotes),
                },
                {
                  label: "Cierre",
                  value: formatPct(doubleStats[0].completionRate),
                  sub: `${doubleStats[0].completedQuotes} cerradas`,
                },
                {
                  label: "Ingreso",
                  value: formatMoney(doubleStats[0].totalIncome),
                  tone: "accent",
                },
                {
                  label: "Profit",
                  value: formatMoney(doubleStats[0].totalProfit),
                  tone:
                    doubleStats[0].totalProfit >= 0 ? "positive" : "negative",
                  sub: `Margen ${formatPct(doubleStats[0].profitMargin)}`,
                },
                {
                  label: "Clientes",
                  value: String(doubleStats[0].uniqueConsignees),
                },
                {
                  label: "Aéreo / Marít. / Terr.",
                  value: `${doubleStats[0].airQuotes} / ${doubleStats[0].seaQuotes} / ${doubleStats[0].truckQuotes}`,
                },
              ]}
            />

            <Text style={styles.sectionLabel}>{execB}</Text>
            <GerencialKpiGrid
              items={[
                {
                  label: "Cotizaciones",
                  value: String(doubleStats[1].totalQuotes),
                },
                {
                  label: "Cierre",
                  value: formatPct(doubleStats[1].completionRate),
                  sub: `${doubleStats[1].completedQuotes} cerradas`,
                },
                {
                  label: "Ingreso",
                  value: formatMoney(doubleStats[1].totalIncome),
                  tone: "accent",
                },
                {
                  label: "Profit",
                  value: formatMoney(doubleStats[1].totalProfit),
                  tone:
                    doubleStats[1].totalProfit >= 0 ? "positive" : "negative",
                  sub: `Margen ${formatPct(doubleStats[1].profitMargin)}`,
                },
                {
                  label: "Clientes",
                  value: String(doubleStats[1].uniqueConsignees),
                },
                {
                  label: "Aéreo / Marít. / Terr.",
                  value: `${doubleStats[1].airQuotes} / ${doubleStats[1].seaQuotes} / ${doubleStats[1].truckQuotes}`,
                },
              ]}
            />

            <Text style={styles.sectionLabel}>
              Tabla cara a cara (A − B)
            </Text>
            <GerencialSimpleTable
              columns={[
                { key: "metric", label: "Métrica", flex: 1.2 },
                { key: "a", label: "A", flex: 1, align: "right" },
                { key: "b", label: "B", flex: 1, align: "right" },
                { key: "diff", label: "Dif.", flex: 1, align: "right" },
              ]}
              rows={[
                {
                  metric: "Cotizaciones",
                  a: String(doubleStats[0].totalQuotes),
                  b: String(doubleStats[1].totalQuotes),
                  diff: formatSignedNumber(
                    doubleStats[0].totalQuotes - doubleStats[1].totalQuotes,
                  ),
                },
                {
                  metric: "Cerradas",
                  a: String(doubleStats[0].completedQuotes),
                  b: String(doubleStats[1].completedQuotes),
                  diff: formatSignedNumber(
                    doubleStats[0].completedQuotes -
                      doubleStats[1].completedQuotes,
                  ),
                },
                {
                  metric: "% Cierre",
                  a: formatPct(doubleStats[0].completionRate),
                  b: formatPct(doubleStats[1].completionRate),
                  diff: formatSignedPctPts(
                    doubleStats[0].completionRate -
                      doubleStats[1].completionRate,
                  ),
                },
                {
                  metric: "Ingreso",
                  a: formatMoney(doubleStats[0].totalIncome),
                  b: formatMoney(doubleStats[1].totalIncome),
                  diff: formatSignedMoney(
                    doubleStats[0].totalIncome - doubleStats[1].totalIncome,
                  ),
                },
                {
                  metric: "Gasto",
                  a: formatMoney(doubleStats[0].totalExpense),
                  b: formatMoney(doubleStats[1].totalExpense),
                  diff: formatSignedMoney(
                    doubleStats[0].totalExpense - doubleStats[1].totalExpense,
                  ),
                },
                {
                  metric: "Profit",
                  a: formatMoney(doubleStats[0].totalProfit),
                  b: formatMoney(doubleStats[1].totalProfit),
                  diff: formatSignedMoney(
                    doubleStats[0].totalProfit - doubleStats[1].totalProfit,
                  ),
                },
                {
                  metric: "Margen %",
                  a: formatPct(doubleStats[0].profitMargin),
                  b: formatPct(doubleStats[1].profitMargin),
                  diff: formatSignedPctPts(
                    doubleStats[0].profitMargin - doubleStats[1].profitMargin,
                  ),
                },
                {
                  metric: "Clientes",
                  a: String(doubleStats[0].uniqueConsignees),
                  b: String(doubleStats[1].uniqueConsignees),
                  diff: formatSignedNumber(
                    doubleStats[0].uniqueConsignees -
                      doubleStats[1].uniqueConsignees,
                  ),
                },
                {
                  metric: "Prom. profit/cot",
                  a: formatMoney(doubleStats[0].averageProfitPerQuote),
                  b: formatMoney(doubleStats[1].averageProfitPerQuote),
                  diff: formatSignedMoney(
                    doubleStats[0].averageProfitPerQuote -
                      doubleStats[1].averageProfitPerQuote,
                  ),
                },
              ]}
            />

            <GerencialNotice
              text={
                doubleStats[0].totalProfit === doubleStats[1].totalProfit
                  ? "Empate en profit entre ambos ejecutivos."
                  : doubleStats[0].totalProfit > doubleStats[1].totalProfit
                    ? `Mayor profit: ${execA} (${formatSignedMoney(doubleStats[0].totalProfit - doubleStats[1].totalProfit)} vs B).`
                    : `Mayor profit: ${execB} (${formatSignedMoney(doubleStats[1].totalProfit - doubleStats[0].totalProfit)} vs A).`
              }
            />

            {doublePrevStats ? (
              <>
                <Text style={styles.sectionLabel}>
                  Variación período A vs B (por ejecutivo)
                </Text>
                <GerencialSimpleTable
                  columns={[
                    { key: "exec", label: "Ejecutivo", flex: 1.2 },
                    {
                      key: "profitNow",
                      label: "Profit A",
                      flex: 1,
                      align: "right",
                    },
                    {
                      key: "profitPrev",
                      label: "Profit B",
                      flex: 1,
                      align: "right",
                    },
                    {
                      key: "delta",
                      label: "Dif.",
                      flex: 1,
                      align: "right",
                    },
                  ]}
                  rows={[
                    {
                      exec: execA,
                      profitNow: formatMoney(doubleStats[0].totalProfit),
                      profitPrev: formatMoney(doublePrevStats[0].totalProfit),
                      delta: formatSignedMoney(
                        doubleStats[0].totalProfit -
                          doublePrevStats[0].totalProfit,
                      ),
                    },
                    {
                      exec: execB,
                      profitNow: formatMoney(doubleStats[1].totalProfit),
                      profitPrev: formatMoney(doublePrevStats[1].totalProfit),
                      delta: formatSignedMoney(
                        doubleStats[1].totalProfit -
                          doublePrevStats[1].totalProfit,
                      ),
                    },
                  ]}
                />
              </>
            ) : null}

            <Text style={styles.sectionLabel}>
              Cotizaciones por mes (A vs B)
            </Text>
            <GerencialSimpleTable
              columns={[
                { key: "label", label: "Mes", flex: 1.1 },
                { key: "q1", label: "Cot A", flex: 0.8, align: "right" },
                { key: "q2", label: "Cot B", flex: 0.8, align: "right" },
                { key: "qd", label: "Dif.", flex: 0.8, align: "right" },
              ]}
              rows={monthlyDouble.map((row) => ({
                label: row.label,
                q1: row.executive1Quotes,
                q2: row.executive2Quotes,
                qd: formatSignedNumber(
                  row.executive1Quotes - row.executive2Quotes,
                ),
              }))}
            />

            <Text style={styles.sectionLabel}>Profit por mes (A vs B)</Text>
            <GerencialSimpleTable
              columns={[
                { key: "label", label: "Mes", flex: 1 },
                { key: "p1", label: "Profit A", flex: 1.1, align: "right" },
                { key: "p2", label: "Profit B", flex: 1.1, align: "right" },
              ]}
              rows={monthlyDouble.map((row) => ({
                label: row.label,
                p1: formatMoney(row.executive1Profit),
                p2: formatMoney(row.executive2Profit),
              }))}
            />
          </>
        ) : null}
      </ScrollView>

      <Modal
        visible={picker != null}
        animationType="slide"
        transparent
        onRequestClose={() => setPicker(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{pickerTitle}</Text>
              <Pressable onPress={() => setPicker(null)} hitSlop={12}>
                <Ionicons name="close" size={22} color={brand.navy} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent}>
              {pickerOptions.map((option) => {
                const active = isOptionActive(option.key);
                return (
                  <Pressable
                    key={option.key}
                    style={[
                      styles.modalOption,
                      active && styles.modalOptionActive,
                    ]}
                    onPress={() => onPickOption(option.key)}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        active && styles.modalOptionTextActive,
                      ]}
                    >
                      {option.label}
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
  subSection: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: brand.navy,
    marginTop: 4,
  },
  hint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: brand.muted,
  },
  dateBlock: {
    gap: 10,
  },
  dateField: { gap: 6 },
  selectField: { gap: 6 },
  fieldLabel: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.md,
    backgroundColor: brand.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: fonts.medium,
    color: brand.navy,
  },
  selectBox: {
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.md,
    backgroundColor: brand.surface,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  selectText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.medium,
    color: brand.navy,
  },
  filterDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: brand.border,
    marginVertical: 4,
  },
  loadingBox: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  loadingText: { color: brand.muted, fontSize: 13 },
  pager: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  pagerBtn: {
    color: brand.navy,
    fontFamily: fonts.semiBold,
    fontSize: 13,
  },
  pagerMeta: {
    color: brand.muted,
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "70%",
    backgroundColor: brand.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingBottom: spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: brand.navy,
  },
  modalContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: 6,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    backgroundColor: brand.canvas,
  },
  modalOptionActive: {
    backgroundColor: "#E8F1FB",
  },
  modalOptionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.medium,
    color: brand.navy,
  },
  modalOptionTextActive: {
    fontFamily: fonts.semiBold,
  },
});
