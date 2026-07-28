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
  buildExecutiveComparisons,
  buildInvoiceMonthlyComparison,
  calculateInvoiceStats,
  filterInvoices,
  formatInvoiceCurrency,
  getPeriodRange,
  loadAllInvoices,
  type InvoiceData,
  type InvoiceStats,
} from "../../services/gerencialInvoicesApi";
import {
  RANGE_MODE_OPTIONS,
  fetchGerencialEjecutivos,
  labelForRangeMode,
  type RangeMode,
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
  return `${sign}${formatInvoiceCurrency(Math.abs(value))}`;
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

export default function FacturacionesPorEjecutivoScreen() {
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
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [prevStats, setPrevStats] = useState<InvoiceStats | null>(null);
  const [comparative, setComparative] = useState<
    { nombre: string; stats: InvoiceStats; prevStats?: InvoiceStats }[]
  >([]);
  const [doubleStats, setDoubleStats] = useState<
    [InvoiceStats, InvoiceStats] | null
  >(null);
  const [doubleInvoices, setDoubleInvoices] = useState<
    [InvoiceData[], InvoiceData[]] | null
  >(null);
  const [doublePrevStats, setDoublePrevStats] = useState<
    [InvoiceStats, InvoiceStats] | null
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
  }, [customEnd, customStart, periodAEnd, periodAStart, rangeMode]);

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
    if (rangeMode === "custom" && !isValidRange(customStart, customEnd)) {
      return false;
    }
    if (
      rangeMode === "two-ranges" &&
      (!isValidRange(periodAStart, periodAEnd) ||
        !isValidRange(periodBStart, periodBEnd))
    ) {
      return false;
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
    setDoubleInvoices(null);
    setAppliedRangeLabel(rangeLabel);

    const start = primaryRange.startDate;
    const end = primaryRange.endDate;

    try {
      const { invoices: all } = await loadAllInvoices(linbisOptions);

      if (mode === "individual") {
        const data = filterInvoices(all, {
          salesRep: selectedExec,
          startDate: start,
          endDate: end,
        });
        setInvoices(data);
        setStats(calculateInvoiceStats(data));
        setComparative([]);
        setDoubleStats(null);

        if (compareRange) {
          const prevData = filterInvoices(all, {
            salesRep: selectedExec,
            startDate: compareRange.startDate,
            endDate: compareRange.endDate,
          });
          setPrevStats(calculateInvoiceStats(prevData));
        }
      } else if (mode === "comparativa") {
        const filtered = filterInvoices(all, {
          startDate: start,
          endDate: end,
        });
        const rows = buildExecutiveComparisons(filtered, ejecutivos);

        if (compareRange) {
          const prevFiltered = filterInvoices(all, {
            startDate: compareRange.startDate,
            endDate: compareRange.endDate,
          });
          const prevRows = buildExecutiveComparisons(prevFiltered, ejecutivos);
          const prevByName = new Map(
            prevRows.map((row) => [row.nombre, row.stats]),
          );
          setComparative(
            rows.map(({ nombre, stats: st }) => ({
              nombre,
              stats: st,
              prevStats: prevByName.get(nombre),
            })),
          );
        } else {
          setComparative(
            rows.map(({ nombre, stats: st }) => ({ nombre, stats: st })),
          );
        }

        setInvoices([]);
        setStats(null);
        setDoubleStats(null);
      } else {
        const a = filterInvoices(all, {
          salesRep: execA,
          startDate: start,
          endDate: end,
        });
        const b = filterInvoices(all, {
          salesRep: execB,
          startDate: start,
          endDate: end,
        });
        setDoubleInvoices([a, b]);
        setDoubleStats([calculateInvoiceStats(a), calculateInvoiceStats(b)]);
        setInvoices([]);
        setStats(null);
        setComparative([]);

        if (compareRange) {
          const prevA = filterInvoices(all, {
            salesRep: execA,
            startDate: compareRange.startDate,
            endDate: compareRange.endDate,
          });
          const prevB = filterInvoices(all, {
            salesRep: execB,
            startDate: compareRange.startDate,
            endDate: compareRange.endDate,
          });
          setDoublePrevStats([
            calculateInvoiceStats(prevA),
            calculateInvoiceStats(prevB),
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

  const paged = useMemo(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(invoices.length / OPERACIONES_PAGE_SIZE),
    );
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * OPERACIONES_PAGE_SIZE;
    return {
      items: invoices.slice(start, start + OPERACIONES_PAGE_SIZE),
      page: safePage,
      totalPages,
      total: invoices.length,
    };
  }, [invoices, page]);

  const individualKpis = useMemo(() => {
    if (!stats) return [];
    return [
      { label: "Facturas", value: String(stats.totalInvoices) },
      { label: "Invoiced", value: String(stats.invoicedCount) },
      { label: "Posted", value: String(stats.postedCount) },
      { label: "Clientes", value: String(stats.uniqueClients) },
      {
        label: "Total casa",
        value: formatInvoiceCurrency(stats.totalHomeTotalAmount),
        tone: "accent" as const,
      },
      {
        label: "Saldo",
        value: formatInvoiceCurrency(stats.totalBalanceDue),
        tone:
          stats.totalBalanceDue > 0
            ? ("negative" as const)
            : ("positive" as const),
      },
      {
        label: "Pagado",
        value: formatInvoiceCurrency(stats.totalAmountPaid),
        tone: "positive" as const,
      },
      {
        label: "Promedio",
        value: formatInvoiceCurrency(stats.averagePerInvoice),
      },
    ];
  }, [stats]);

  const monthlyDouble = useMemo(() => {
    if (!doubleInvoices) return [];
    return buildInvoiceMonthlyComparison(doubleInvoices[0], doubleInvoices[1]);
  }, [doubleInvoices]);

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
        title="Facturaciones por Ejecutivo"
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
          <GerencialNotice text="Compara a todos los ejecutivos activos en el periodo seleccionado. La primera carga puede tardar unos segundos." />
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
            <Text style={styles.loadingText}>Cargando facturaciones…</Text>
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
                  label="Facturas"
                  current={stats.totalInvoices}
                  previous={prevStats.totalInvoices}
                />
                <GerencialDeltaText
                  label="Total casa"
                  current={stats.totalHomeTotalAmount}
                  previous={prevStats.totalHomeTotalAmount}
                  format="money"
                />
                <GerencialDeltaText
                  label="Saldo"
                  current={stats.totalBalanceDue}
                  previous={prevStats.totalBalanceDue}
                  format="money"
                />
                <GerencialDeltaText
                  label="Pagado"
                  current={stats.totalAmountPaid}
                  previous={prevStats.totalAmountPaid}
                  format="money"
                />
              </>
            ) : null}
            <GerencialKpiGrid items={individualKpis} />
            <Text style={styles.sectionLabel}>
              Detalle ({paged.total} facturas)
            </Text>
            <GerencialSimpleTable
              columns={[
                { key: "number", label: "Factura", flex: 1 },
                { key: "client", label: "Cliente", flex: 1.2 },
                { key: "status", label: "Estado", flex: 0.8 },
                { key: "amount", label: "Monto", flex: 1, align: "right" },
              ]}
              rows={paged.items.map((inv) => ({
                number: inv.invoiceNumber || "—",
                client: inv.billToName || "—",
                status: inv.status || "—",
                amount: formatInvoiceCurrency(inv.homeTotalAmount || 0),
              }))}
            />
            {paged.totalPages > 1 ? (
              <View style={styles.pager}>
                <Pressable
                  disabled={paged.page <= 1}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <Text style={styles.pagerBtn}>Anterior</Text>
                </Pressable>
                <Text style={styles.pagerMeta}>
                  {paged.page}/{paged.totalPages}
                </Text>
                <Pressable
                  disabled={paged.page >= paged.totalPages}
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
            <Text style={styles.sectionLabel}>Ranking por facturación</Text>
            <GerencialSimpleTable
              columns={[
                { key: "nombre", label: "Ejecutivo", flex: 1.2 },
                { key: "inv", label: "Fact.", flex: 0.55, align: "right" },
                { key: "total", label: "Total", flex: 1, align: "right" },
                { key: "saldo", label: "Saldo", flex: 1, align: "right" },
                ...(comparative.some((row) => row.prevStats)
                  ? [
                      {
                        key: "delta",
                        label: "Δ Total",
                        flex: 0.9,
                        align: "right" as const,
                      },
                    ]
                  : []),
              ]}
              rows={comparative.map((row) => {
                const delta =
                  row.prevStats != null
                    ? row.stats.totalHomeTotalAmount -
                      row.prevStats.totalHomeTotalAmount
                    : null;
                return {
                  nombre: row.nombre,
                  inv: row.stats.totalInvoices,
                  total: formatInvoiceCurrency(row.stats.totalHomeTotalAmount),
                  saldo: formatInvoiceCurrency(row.stats.totalBalanceDue),
                  ...(delta != null
                    ? { delta: formatSignedMoney(delta) }
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
                  label: "Facturas",
                  value: String(doubleStats[0].totalInvoices),
                },
                {
                  label: "Invoiced",
                  value: String(doubleStats[0].invoicedCount),
                },
                {
                  label: "Posted",
                  value: String(doubleStats[0].postedCount),
                },
                {
                  label: "Clientes",
                  value: String(doubleStats[0].uniqueClients),
                },
                {
                  label: "Total casa",
                  value: formatInvoiceCurrency(
                    doubleStats[0].totalHomeTotalAmount,
                  ),
                  tone: "accent",
                },
                {
                  label: "Saldo",
                  value: formatInvoiceCurrency(doubleStats[0].totalBalanceDue),
                  tone:
                    doubleStats[0].totalBalanceDue > 0
                      ? "negative"
                      : "positive",
                },
                {
                  label: "Pagado",
                  value: formatInvoiceCurrency(doubleStats[0].totalAmountPaid),
                  tone: "positive",
                },
                {
                  label: "Promedio",
                  value: formatInvoiceCurrency(
                    doubleStats[0].averagePerInvoice,
                  ),
                },
              ]}
            />

            <Text style={styles.sectionLabel}>{execB}</Text>
            <GerencialKpiGrid
              items={[
                {
                  label: "Facturas",
                  value: String(doubleStats[1].totalInvoices),
                },
                {
                  label: "Invoiced",
                  value: String(doubleStats[1].invoicedCount),
                },
                {
                  label: "Posted",
                  value: String(doubleStats[1].postedCount),
                },
                {
                  label: "Clientes",
                  value: String(doubleStats[1].uniqueClients),
                },
                {
                  label: "Total casa",
                  value: formatInvoiceCurrency(
                    doubleStats[1].totalHomeTotalAmount,
                  ),
                  tone: "accent",
                },
                {
                  label: "Saldo",
                  value: formatInvoiceCurrency(doubleStats[1].totalBalanceDue),
                  tone:
                    doubleStats[1].totalBalanceDue > 0
                      ? "negative"
                      : "positive",
                },
                {
                  label: "Pagado",
                  value: formatInvoiceCurrency(doubleStats[1].totalAmountPaid),
                  tone: "positive",
                },
                {
                  label: "Promedio",
                  value: formatInvoiceCurrency(
                    doubleStats[1].averagePerInvoice,
                  ),
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
                  metric: "Facturas",
                  a: String(doubleStats[0].totalInvoices),
                  b: String(doubleStats[1].totalInvoices),
                  diff: formatSignedNumber(
                    doubleStats[0].totalInvoices - doubleStats[1].totalInvoices,
                  ),
                },
                {
                  metric: "Invoiced",
                  a: String(doubleStats[0].invoicedCount),
                  b: String(doubleStats[1].invoicedCount),
                  diff: formatSignedNumber(
                    doubleStats[0].invoicedCount - doubleStats[1].invoicedCount,
                  ),
                },
                {
                  metric: "Posted",
                  a: String(doubleStats[0].postedCount),
                  b: String(doubleStats[1].postedCount),
                  diff: formatSignedNumber(
                    doubleStats[0].postedCount - doubleStats[1].postedCount,
                  ),
                },
                {
                  metric: "Clientes",
                  a: String(doubleStats[0].uniqueClients),
                  b: String(doubleStats[1].uniqueClients),
                  diff: formatSignedNumber(
                    doubleStats[0].uniqueClients - doubleStats[1].uniqueClients,
                  ),
                },
                {
                  metric: "Total casa",
                  a: formatInvoiceCurrency(doubleStats[0].totalHomeTotalAmount),
                  b: formatInvoiceCurrency(doubleStats[1].totalHomeTotalAmount),
                  diff: formatSignedMoney(
                    doubleStats[0].totalHomeTotalAmount -
                      doubleStats[1].totalHomeTotalAmount,
                  ),
                },
                {
                  metric: "Saldo",
                  a: formatInvoiceCurrency(doubleStats[0].totalBalanceDue),
                  b: formatInvoiceCurrency(doubleStats[1].totalBalanceDue),
                  diff: formatSignedMoney(
                    doubleStats[0].totalBalanceDue -
                      doubleStats[1].totalBalanceDue,
                  ),
                },
                {
                  metric: "Pagado",
                  a: formatInvoiceCurrency(doubleStats[0].totalAmountPaid),
                  b: formatInvoiceCurrency(doubleStats[1].totalAmountPaid),
                  diff: formatSignedMoney(
                    doubleStats[0].totalAmountPaid -
                      doubleStats[1].totalAmountPaid,
                  ),
                },
                {
                  metric: "Promedio",
                  a: formatInvoiceCurrency(doubleStats[0].averagePerInvoice),
                  b: formatInvoiceCurrency(doubleStats[1].averagePerInvoice),
                  diff: formatSignedMoney(
                    doubleStats[0].averagePerInvoice -
                      doubleStats[1].averagePerInvoice,
                  ),
                },
              ]}
            />

            <GerencialNotice
              text={
                doubleStats[0].totalHomeTotalAmount ===
                doubleStats[1].totalHomeTotalAmount
                  ? "Empate en facturación total entre ambos ejecutivos."
                  : doubleStats[0].totalHomeTotalAmount >
                      doubleStats[1].totalHomeTotalAmount
                    ? `Mayor facturación: ${execA} (${formatSignedMoney(doubleStats[0].totalHomeTotalAmount - doubleStats[1].totalHomeTotalAmount)} vs B).`
                    : `Mayor facturación: ${execB} (${formatSignedMoney(doubleStats[1].totalHomeTotalAmount - doubleStats[0].totalHomeTotalAmount)} vs A).`
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
                      key: "now",
                      label: "Total A",
                      flex: 1,
                      align: "right",
                    },
                    {
                      key: "prev",
                      label: "Total B",
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
                      now: formatInvoiceCurrency(
                        doubleStats[0].totalHomeTotalAmount,
                      ),
                      prev: formatInvoiceCurrency(
                        doublePrevStats[0].totalHomeTotalAmount,
                      ),
                      delta: formatSignedMoney(
                        doubleStats[0].totalHomeTotalAmount -
                          doublePrevStats[0].totalHomeTotalAmount,
                      ),
                    },
                    {
                      exec: execB,
                      now: formatInvoiceCurrency(
                        doubleStats[1].totalHomeTotalAmount,
                      ),
                      prev: formatInvoiceCurrency(
                        doublePrevStats[1].totalHomeTotalAmount,
                      ),
                      delta: formatSignedMoney(
                        doubleStats[1].totalHomeTotalAmount -
                          doublePrevStats[1].totalHomeTotalAmount,
                      ),
                    },
                  ]}
                />
              </>
            ) : null}

            <Text style={styles.sectionLabel}>
              Facturas por mes (A vs B)
            </Text>
            <GerencialSimpleTable
              columns={[
                { key: "label", label: "Mes", flex: 1.1 },
                { key: "q1", label: "Fact A", flex: 0.8, align: "right" },
                { key: "q2", label: "Fact B", flex: 0.8, align: "right" },
                { key: "qd", label: "Dif.", flex: 0.8, align: "right" },
              ]}
              rows={monthlyDouble.map((row) => ({
                label: row.label,
                q1: row.executive1Invoices,
                q2: row.executive2Invoices,
                qd: formatSignedNumber(
                  row.executive1Invoices - row.executive2Invoices,
                ),
              }))}
            />

            <Text style={styles.sectionLabel}>
              Total casa por mes (A vs B)
            </Text>
            <GerencialSimpleTable
              columns={[
                { key: "label", label: "Mes", flex: 1 },
                { key: "p1", label: "Total A", flex: 1.1, align: "right" },
                { key: "p2", label: "Total B", flex: 1.1, align: "right" },
              ]}
              rows={monthlyDouble.map((row) => ({
                label: row.label,
                p1: formatInvoiceCurrency(row.executive1Amount),
                p2: formatInvoiceCurrency(row.executive2Amount),
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
  dateBlock: { gap: 10 },
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
