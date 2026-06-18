// src/components/administrador/Facturaciones-Ejecutivos/Facturaciones.tsx
// Facturación por Ejecutivo — Seemann Group
import { useEffect, useState, useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useOutletContext } from "react-router-dom";
import i18n from "@/i18n";
import { useAuth } from "@/auth/AuthContext";
import { Modal } from "react-bootstrap";
import {
  type InvoiceData,
  type InvoiceStats,
  type ExecutiveInvoiceComparison,
  type PeriodPreset,
  getPeriodRange,
  filterInvoices,
  calculateInvoiceStats,
  groupInvoicesByMonth,
  formatInvoiceCurrency,
  formatFetchedAt,
  fetchLinbisInvoicesAll,
  buildExecutiveComparisons,
} from "./invoiceUtils";
import {
  C,
  FONT,
  base,
  styles,
  pageWrap,
  btnPrimary,
  btnOutline,
  inputStyle,
  selectStyle,
  tabBase,
  tabActive,
  Metric,
  PeriodPresetSelect,
  DataSourceBanner,
  EmptyState,
  ErrorBanner,
  InvoiceStatusDot,
  StatusBar,
  CardSection,
  SortableTh,
  InvoiceIndividualSkeleton,
  ComparativeSkeleton,
  DoubleComparisonSkeleton,
} from "./executiveReportingUi";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
);

interface OutletContext {
  accessToken: string;
  refreshAccessToken: () => Promise<string>;
  onLogout: () => void;
}

type Ejecutivo = {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
};

type ExecutiveComparison = ExecutiveInvoiceComparison;

type TabType = "individual" | "comparativa" | "doble";
type SortField =
  | "nombre"
  | "totalInvoices"
  | "invoicedCount"
  | "postedCount"
  | "totalAmount"
  | "totalHomeTotalAmount"
  | "totalBalanceDue"
  | "totalAmountPaid"
  | "averagePerInvoice"
  | "uniqueClients";
type SortDirection = "asc" | "desc";

interface MonthlyInvoiceBreakdown {
  month: string;
  label: string;
  invoices: number;
  invoiced: number;
  posted: number;
  homeTotal: number;
  balanceDue: number;
  amountPaid: number;
  clients: number;
}

const fmt = (n: number) => formatInvoiceCurrency(n);

const monthLabel = (month: string, year: string) =>
  `${i18n.t(`executiveReporting.shared.months.${month}`)} ${year}`;

const chartPrimary = "rgba(255, 98, 0, 0.85)";
const chartNegative = "rgba(220, 38, 38, 0.85)";

const makeBarChartOptions = (showLegend = true) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: showLegend,
      labels: { font: { family: FONT }, color: C.textMuted },
    },
    tooltip: {
      callbacks: {
        label: (context: { dataset: { label?: string }; parsed: { y: number | null } }) => {
          const y = context.parsed.y ?? 0;
          return `${context.dataset.label}: ${fmt(y)}`;
        },
      },
    },
  },
  scales: {
    x: { ticks: { font: { family: FONT }, color: C.textMuted } },
    y: {
      beginAtZero: true,
      ticks: {
        font: { family: FONT },
        color: C.textMuted,
        callback: (value: string | number) => fmt(Number(value)),
      },
    },
  },
});

const getMonthlyInvoiceBreakdown = (
  arr: InvoiceData[],
): MonthlyInvoiceBreakdown[] => {
  const monthMap = groupInvoicesByMonth(arr);
  return Object.keys(monthMap)
    .sort()
    .map((month) => {
      const items = monthMap[month];
      const st = calculateInvoiceStats(items);
      const [year, m] = month.split("-");
      return {
        month,
        label: monthLabel(m, year),
        invoices: st.totalInvoices,
        invoiced: st.invoicedCount,
        posted: st.postedCount,
        homeTotal: st.totalHomeTotalAmount,
        balanceDue: st.totalBalanceDue,
        amountPaid: st.totalAmountPaid,
        clients: st.uniqueClients,
      };
    });
};

const getTopInvoiceClients = (arr: InvoiceData[], limit = 10) => {
  const map = new Map<string, { count: number; homeTotal: number }>();
  arr.forEach((inv) => {
    const c = inv.billToName?.trim();
    if (!c) return;
    const ex = map.get(c) || { count: 0, homeTotal: 0 };
    map.set(c, {
      count: ex.count + 1,
      homeTotal: ex.homeTotal + inv.homeTotalAmount,
    });
  });
  return Array.from(map.entries())
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.homeTotal - a.homeTotal)
    .slice(0, limit);
};

function InvoicesXEjecutivo() {
  const { t } = useTranslation();
  const { accessToken, refreshAccessToken } = useOutletContext<OutletContext>();
  const { user, getEjecutivos } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>("individual");
  const [ejecutivos, setEjecutivos] = useState<Ejecutivo[]>([]);
  const [loadingEjecutivos, setLoadingEjecutivos] = useState(true);

  const [selectedEjecutivo, setSelectedEjecutivo] = useState("");
  const [individualPreset, setIndividualPreset] =
    useState<PeriodPreset>("this-year");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [individualFetchedAt, setIndividualFetchedAt] = useState<string | null>(
    null,
  );
  const [rawInvoiceCount, setRawInvoiceCount] = useState(0);

  const [compPreset, setCompPreset] = useState<PeriodPreset>("this-year");
  const [compStartDate, setCompStartDate] = useState("");
  const [compEndDate, setCompEndDate] = useState("");
  const [comparativeData, setComparativeData] = useState<ExecutiveComparison[]>(
    [],
  );
  const [allComparativeInvoices, setAllComparativeInvoices] = useState<
    InvoiceData[]
  >([]);
  const [loadingComparative, setLoadingComparative] = useState(false);
  const [errorComparative, setErrorComparative] = useState<string | null>(null);
  const [hasSearchedComparative, setHasSearchedComparative] = useState(false);
  const [compFetchedAt, setCompFetchedAt] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("totalHomeTotalAmount");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [showInvoicesModal, setShowInvoicesModal] = useState(false);
  const [invoicesDetalle, setInvoicesDetalle] = useState<InvoiceData[]>([]);

  const [ejecutivo1, setEjecutivo1] = useState("");
  const [ejecutivo2, setEjecutivo2] = useState("");
  const [doublePreset, setDoublePreset] = useState<PeriodPreset>("this-year");
  const [doubleStartDate, setDoubleStartDate] = useState("");
  const [doubleEndDate, setDoubleEndDate] = useState("");
  const [doubleData, setDoubleData] = useState<ExecutiveComparison[]>([]);
  const [allDoubleInvoices, setAllDoubleInvoices] = useState<InvoiceData[]>([]);
  const [loadingDouble, setLoadingDouble] = useState(false);
  const [errorDouble, setErrorDouble] = useState<string | null>(null);
  const [hasSearchedDouble, setHasSearchedDouble] = useState(false);
  const [doubleFetchedAt, setDoubleFetchedAt] = useState<string | null>(null);

  const applyPeriodPreset = (
    preset: PeriodPreset,
    setStart: (v: string) => void,
    setEnd: (v: string) => void,
  ) => {
    if (preset === "custom") return;
    const range = getPeriodRange(preset);
    setStart(range.startDate);
    setEnd(range.endDate);
  };

  useEffect(() => {
    applyPeriodPreset(individualPreset, setStartDate, setEndDate);
  }, [individualPreset]);

  useEffect(() => {
    applyPeriodPreset(compPreset, setCompStartDate, setCompEndDate);
  }, [compPreset]);

  useEffect(() => {
    applyPeriodPreset(doublePreset, setDoubleStartDate, setDoubleEndDate);
  }, [doublePreset]);

  useEffect(() => {
    const fetchEjecutivos = async () => {
      try {
        setLoadingEjecutivos(true);
        const data = await getEjecutivos();
        setEjecutivos(data.filter((e): e is Ejecutivo => e !== null));
      } catch (err) {
        console.error("Error cargando ejecutivos:", err);
      } finally {
        setLoadingEjecutivos(false);
      }
    };
    fetchEjecutivos();
  }, []);

  const fetchIndividualData = async () => {
    if (!selectedEjecutivo) {
      setError(t("executiveReporting.shared.errors.selectExecutive"));
      return;
    }

    const cacheKey = `invoicesExecutive_${selectedEjecutivo}_${startDate}_${endDate}`;
    const cached = localStorage.getItem(cacheKey);
    const timestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (cached && timestamp && now - parseInt(timestamp) < fiveMinutes) {
      const parsedData = JSON.parse(cached);
      const cachedInvoices = Array.isArray(parsedData)
        ? parsedData
        : parsedData.invoices;
      setInvoices(cachedInvoices || []);
      setRawInvoiceCount(
        Array.isArray(parsedData) ? 0 : parsedData.rawCount || 0,
      );
      setIndividualFetchedAt(timestamp);
      setHasSearched(true);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { mapped, fetchedAt, raw } = await fetchLinbisInvoicesAll(
        accessToken,
        refreshAccessToken,
      );
      setRawInvoiceCount(raw.length);
      const filteredInvoices = filterInvoices(mapped, {
        salesRep: selectedEjecutivo,
        startDate,
        endDate,
      });
      setInvoices(filteredInvoices);
      setIndividualFetchedAt(String(fetchedAt));
      setHasSearched(true);
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ invoices: filteredInvoices, rawCount: raw.length }),
      );
      localStorage.setItem(`${cacheKey}_timestamp`, now.toString());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("executiveReporting.shared.errors.unknown"),
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchComparativeData = async () => {
    const cacheKey = `invoicesComparative_${compStartDate}_${compEndDate}`;
    const cached = localStorage.getItem(cacheKey);
    const timestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (cached && timestamp && now - parseInt(timestamp) < fiveMinutes) {
      const parsedData = JSON.parse(cached);
      setComparativeData(parsedData.comparativeData);
      setAllComparativeInvoices(parsedData.allInvoices);
      setCompFetchedAt(timestamp);
      setHasSearchedComparative(true);
      setErrorComparative(null);
      return;
    }

    try {
      setLoadingComparative(true);
      setErrorComparative(null);
      const { mapped, fetchedAt } = await fetchLinbisInvoicesAll(
        accessToken,
        refreshAccessToken,
      );
      const filteredInvoices = filterInvoices(mapped, {
        startDate: compStartDate,
        endDate: compEndDate,
      });
      const comparativeResults = buildExecutiveComparisons(
        filteredInvoices,
        ejecutivos.map((e) => e.nombre),
      );
      setComparativeData(comparativeResults);
      setAllComparativeInvoices(filteredInvoices);
      setCompFetchedAt(String(fetchedAt));
      setHasSearchedComparative(true);
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          comparativeData: comparativeResults,
          allInvoices: filteredInvoices,
        }),
      );
      localStorage.setItem(`${cacheKey}_timestamp`, now.toString());
    } catch (err) {
      setErrorComparative(
        err instanceof Error
          ? err.message
          : t("executiveReporting.shared.errors.unknown"),
      );
    } finally {
      setLoadingComparative(false);
    }
  };

  const fetchDoubleData = async () => {
    if (!ejecutivo1 || !ejecutivo2) {
      setErrorDouble(t("executiveReporting.shared.errors.selectTwoExecutives"));
      return;
    }
    if (ejecutivo1 === ejecutivo2) {
      setErrorDouble(
        t("executiveReporting.shared.errors.selectDifferentExecutives"),
      );
      return;
    }

    const cacheKey = `invoicesDouble_${ejecutivo1}_${ejecutivo2}_${doubleStartDate}_${doubleEndDate}`;
    const cached = localStorage.getItem(cacheKey);
    const timestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (cached && timestamp && now - parseInt(timestamp) < fiveMinutes) {
      const parsedData = JSON.parse(cached);
      setDoubleData(parsedData.doubleData);
      setAllDoubleInvoices(parsedData.allInvoices);
      setDoubleFetchedAt(timestamp);
      setHasSearchedDouble(true);
      setErrorDouble(null);
      return;
    }

    try {
      setLoadingDouble(true);
      setErrorDouble(null);
      const { mapped, fetchedAt } = await fetchLinbisInvoicesAll(
        accessToken,
        refreshAccessToken,
      );
      const exec1Invoices = filterInvoices(mapped, {
        salesRep: ejecutivo1,
        startDate: doubleStartDate,
        endDate: doubleEndDate,
      });
      const exec2Invoices = filterInvoices(mapped, {
        salesRep: ejecutivo2,
        startDate: doubleStartDate,
        endDate: doubleEndDate,
      });
      const doubleResults: ExecutiveComparison[] = [
        {
          nombre: ejecutivo1,
          stats: calculateInvoiceStats(exec1Invoices),
        },
        {
          nombre: ejecutivo2,
          stats: calculateInvoiceStats(exec2Invoices),
        },
      ];
      setDoubleData(doubleResults);
      setAllDoubleInvoices([...exec1Invoices, ...exec2Invoices]);
      setDoubleFetchedAt(String(fetchedAt));
      setHasSearchedDouble(true);
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          doubleData: doubleResults,
          allInvoices: [...exec1Invoices, ...exec2Invoices],
        }),
      );
      localStorage.setItem(`${cacheKey}_timestamp`, now.toString());
    } catch (err) {
      setErrorDouble(
        err instanceof Error
          ? err.message
          : t("executiveReporting.shared.errors.unknown"),
      );
    } finally {
      setLoadingDouble(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedComparativeData = useMemo(() => {
    return [...comparativeData].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;
      if (sortField === "nombre") {
        aValue = a.nombre;
        bValue = b.nombre;
      } else {
        aValue = a.stats[sortField as keyof InvoiceStats];
        bValue = b.stats[sortField as keyof InvoiceStats];
      }
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      return sortDirection === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [comparativeData, sortField, sortDirection]);

  const stats = useMemo(() => calculateInvoiceStats(invoices), [invoices]);
  const monthlyData = useMemo(
    () => getMonthlyInvoiceBreakdown(invoices),
    [invoices],
  );
  const topClients = useMemo(
    () => getTopInvoiceClients(invoices),
    [invoices],
  );

  const globalStats = useMemo(
    () => calculateInvoiceStats(allComparativeInvoices),
    [allComparativeInvoices],
  );

  const handleShowInvoicesDetail = (list: InvoiceData[]) => {
    setInvoicesDetalle(list);
    setShowInvoicesModal(true);
  };

  const exportComparativeToCSV = (
    data: ExecutiveComparison[],
    filename: string,
  ) => {
    const headers = [
      t("executiveReporting.billing.csvExecutive"),
      t("executiveReporting.billing.csvTotalInvoices"),
      t("executiveReporting.shared.thInvoiced"),
      t("executiveReporting.shared.thPosted"),
      t("executiveReporting.billing.thBilledClp"),
      t("executiveReporting.billing.thBalanceClp"),
      t("executiveReporting.billing.thPaidClp"),
      t("executiveReporting.billing.csvAvgInvoice"),
      t("executiveReporting.billing.kpiUniqueClients"),
    ];
    const rows = data.map((ex) => [
      ex.nombre,
      ex.stats.totalInvoices,
      ex.stats.invoicedCount,
      ex.stats.postedCount,
      ex.stats.totalHomeTotalAmount,
      ex.stats.totalBalanceDue,
      ex.stats.totalAmountPaid,
      ex.stats.averagePerInvoice,
      ex.stats.uniqueClients,
    ]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(",")),
    ].join("\n");
    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const doubleMetrics = useMemo(
    () =>
      doubleData.length === 2
        ? [
            {
              label: t("executiveReporting.billing.metricTotalInvoices"),
              v1: doubleData[0].stats.totalInvoices,
              v2: doubleData[1].stats.totalInvoices,
              format: (v: number) => String(v),
            },
            {
              label: t("executiveReporting.billing.metricInvoiced"),
              v1: doubleData[0].stats.invoicedCount,
              v2: doubleData[1].stats.invoicedCount,
              format: (v: number) => String(v),
            },
            {
              label: t("executiveReporting.billing.metricPosted"),
              v1: doubleData[0].stats.postedCount,
              v2: doubleData[1].stats.postedCount,
              format: (v: number) => String(v),
            },
            {
              label: t("executiveReporting.billing.metricUniqueClients"),
              v1: doubleData[0].stats.uniqueClients,
              v2: doubleData[1].stats.uniqueClients,
              format: (v: number) => String(v),
            },
            {
              label: t("executiveReporting.billing.metricBilledClp"),
              v1: doubleData[0].stats.totalHomeTotalAmount,
              v2: doubleData[1].stats.totalHomeTotalAmount,
              format: fmt,
            },
            {
              label: t("executiveReporting.billing.metricBalance"),
              v1: doubleData[0].stats.totalBalanceDue,
              v2: doubleData[1].stats.totalBalanceDue,
              format: fmt,
            },
            {
              label: t("executiveReporting.billing.metricPaid"),
              v1: doubleData[0].stats.totalAmountPaid,
              v2: doubleData[1].stats.totalAmountPaid,
              format: fmt,
            },
            {
              label: t("executiveReporting.billing.metricAvgInvoice"),
              v1: doubleData[0].stats.averagePerInvoice,
              v2: doubleData[1].stats.averagePerInvoice,
              format: fmt,
            },
          ]
        : [],
    [doubleData, t],
  );

  return (
    <div style={pageWrap}>
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            ...base,
            fontSize: 22,
            fontWeight: 700,
            color: C.secondary,
            margin: 0,
            letterSpacing: "-0.3px",
          }}
        >
          {t("executiveReporting.billing.title")}
        </h1>
        <p style={{ ...base, fontSize: 13, color: C.textMuted, margin: "4px 0 0" }}>
          {user?.nombreuser || ""}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          borderBottom: `1px solid ${C.border}`,
          marginBottom: 24,
        }}
      >
        {(
          [
            {
              key: "individual" as TabType,
              label: t("executiveReporting.shared.tabs.individual"),
            },
            {
              key: "comparativa" as TabType,
              label: t("executiveReporting.shared.tabs.comparative"),
            },
            {
              key: "doble" as TabType,
              label: t("executiveReporting.shared.tabs.double"),
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={activeTab === tab.key ? tabActive : tabBase}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── INDIVIDUAL ── */}
      {activeTab === "individual" && (
        <>
          <div style={{ ...styles.cardPad, marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "end",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: "1 1 200px" }}>
                <label style={styles.label}>
                  {t("executiveReporting.shared.filters.executive")}
                </label>
                <select
                  value={selectedEjecutivo}
                  onChange={(e) => setSelectedEjecutivo(e.target.value)}
                  disabled={loadingEjecutivos}
                  style={selectStyle}
                >
                  <option value="">
                    {t("executiveReporting.shared.filters.selectExecutive")}
                  </option>
                  {ejecutivos.map((ej) => (
                    <option key={ej.id} value={ej.nombre}>
                      {ej.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <PeriodPresetSelect
                value={individualPreset}
                onChange={setIndividualPreset}
              />
              <div style={{ flex: "0 1 160px" }}>
                <label style={styles.label}>
                  {t("executiveReporting.shared.filters.from")}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setIndividualPreset("custom");
                    setStartDate(e.target.value);
                  }}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: "0 1 160px" }}>
                <label style={styles.label}>
                  {t("executiveReporting.shared.filters.to")}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setIndividualPreset("custom");
                    setEndDate(e.target.value);
                  }}
                  style={inputStyle}
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={fetchIndividualData}
                  disabled={loading || !selectedEjecutivo}
                  style={{
                    ...btnPrimary,
                    opacity: loading || !selectedEjecutivo ? 0.5 : 1,
                  }}
                >
                  {loading
                    ? t("executiveReporting.shared.buttons.searching")
                    : t("executiveReporting.shared.buttons.search")}
                </button>
              </div>
            </div>
          </div>

          {error && <ErrorBanner message={error} />}

          {loading && <InvoiceIndividualSkeleton />}

          {hasSearched && !loading && invoices.length === 0 && !error && (
            <EmptyState
              title={t("executiveReporting.shared.noResultsTitle")}
              sub={t("executiveReporting.billing.emptyNoInvoices")}
            />
          )}

          {hasSearched && !loading && invoices.length > 0 && (
            <>
              <DataSourceBanner>
                {selectedEjecutivo
                  ? `${t("executiveReporting.shared.executiveLabel", { name: selectedEjecutivo })} · `
                  : ""}
                {t("executiveReporting.shared.countInvoices", {
                  count: invoices.length,
                })}
                {rawInvoiceCount > 0
                  ? ` · ${t("executiveReporting.shared.inOrigin", { count: rawInvoiceCount })}`
                  : ""}
                {formatFetchedAt(individualFetchedAt)
                  ? ` · ${t("executiveReporting.shared.updatedAt", { date: formatFetchedAt(individualFetchedAt) })}`
                  : ""}
                <br />
                <Trans
                  i18nKey="executiveReporting.billing.bannerNote"
                  components={{ strong: <strong />, code: <code /> }}
                />
              </DataSourceBanner>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <Metric
                  label={t("executiveReporting.billing.kpiTotalInvoices")}
                  value={stats.totalInvoices}
                  sub={t("executiveReporting.billing.kpiInvoicesSub", {
                    invoiced: stats.invoicedCount,
                    posted: stats.postedCount,
                  })}
                />
                <Metric
                  label={t("executiveReporting.billing.kpiBilledClp")}
                  value={fmt(stats.totalHomeTotalAmount)}
                  sub={t("executiveReporting.billing.kpiAvgPerInvoice", {
                    amount: fmt(stats.averagePerInvoice),
                  })}
                  color={C.positive}
                />
                <Metric
                  label={t("executiveReporting.billing.kpiBalanceDue")}
                  value={fmt(stats.totalBalanceDue)}
                  color={C.negative}
                />
                <Metric
                  label={t("executiveReporting.billing.kpiTotalPaid")}
                  value={fmt(stats.totalAmountPaid)}
                  color={C.primary}
                />
                <Metric
                  label={t("executiveReporting.billing.kpiUniqueClients")}
                  value={stats.uniqueClients}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <StatusBar
                  invoiced={stats.invoicedCount}
                  posted={stats.postedCount}
                  total={stats.totalInvoices}
                />
              </div>

              {monthlyData.length > 0 && (
                <CardSection title={t("executiveReporting.billing.sectionMonthly")}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={styles.th}>{t("executiveReporting.shared.thMonth")}</th>
                          <th style={{ ...styles.th, textAlign: "center" }}>{t("executiveReporting.shared.thInvoices")}</th>
                          <th style={{ ...styles.th, textAlign: "center" }}>{t("executiveReporting.shared.thInvoiced")}</th>
                          <th style={{ ...styles.th, textAlign: "center" }}>{t("executiveReporting.shared.thPosted")}</th>
                          <th style={{ ...styles.th, textAlign: "right" }}>{t("executiveReporting.shared.thBilled")}</th>
                          <th style={{ ...styles.th, textAlign: "right" }}>{t("executiveReporting.shared.thBalance")}</th>
                          <th style={{ ...styles.th, textAlign: "right" }}>{t("executiveReporting.shared.thPaid")}</th>
                          <th style={{ ...styles.th, textAlign: "center" }}>{t("executiveReporting.shared.thClients")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyData.map((m) => (
                          <tr key={m.month}>
                            <td style={{ ...styles.td, fontWeight: 600 }}>{m.label}</td>
                            <td style={{ ...styles.td, textAlign: "center" }}>{m.invoices}</td>
                            <td style={{ ...styles.td, textAlign: "center" }}>{m.invoiced}</td>
                            <td style={{ ...styles.td, textAlign: "center" }}>{m.posted}</td>
                            <td style={{ ...styles.td, textAlign: "right", color: C.positive, fontWeight: 600 }}>
                              {fmt(m.homeTotal)}
                            </td>
                            <td style={{ ...styles.td, textAlign: "right", color: C.negative }}>
                              {fmt(m.balanceDue)}
                            </td>
                            <td style={{ ...styles.td, textAlign: "right" }}>{fmt(m.amountPaid)}</td>
                            <td style={{ ...styles.td, textAlign: "center" }}>{m.clients}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardSection>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div style={{ ...styles.cardPad, padding: 16 }}>
                  <div style={{ ...styles.label, marginBottom: 12 }}>
                    {t("executiveReporting.billing.chartMonthly")}
                  </div>
                  <div style={{ height: 260 }}>
                    <Bar
                      data={{
                        labels: monthlyData.map((m) => m.label),
                        datasets: [
                          {
                            label: t("executiveReporting.billing.kpiBilledClp"),
                            data: monthlyData.map((m) => m.homeTotal),
                            backgroundColor: chartPrimary,
                            borderColor: C.primary,
                            borderWidth: 1,
                          },
                        ],
                      }}
                      options={makeBarChartOptions(false)}
                    />
                  </div>
                </div>
                <div style={{ ...styles.cardPad, padding: 16 }}>
                  <div style={{ ...styles.label, marginBottom: 12 }}>
                    {t("executiveReporting.billing.chartStatus")}
                  </div>
                  <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Doughnut
                      data={{
                        labels: [
                          t("executiveReporting.shared.invoiceStatus.Invoiced"),
                          t("executiveReporting.shared.invoiceStatus.Posted"),
                        ],
                        datasets: [
                          {
                            data: [stats.invoicedCount, stats.postedCount],
                            backgroundColor: [C.warning, C.positive],
                            borderWidth: 0,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: "bottom", labels: { font: { family: FONT } } } },
                      }}
                    />
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 320px",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <CardSection
                  title={t("executiveReporting.billing.sectionInvoiceDetail", {
                    count: invoices.length,
                  })}
                >
                  <div style={{ overflowX: "auto", maxHeight: 480, overflowY: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={styles.th}>{t("executiveReporting.shared.thInvoiceNumber")}</th>
                          <th style={styles.th}>{t("executiveReporting.shared.thShipmentRef")}</th>
                          <th style={styles.th}>{t("executiveReporting.shared.thClient")}</th>
                          <th style={styles.th}>{t("executiveReporting.shared.thDate")}</th>
                          <th style={styles.th}>{t("executiveReporting.shared.thStatus")}</th>
                          <th style={{ ...styles.th, textAlign: "right" }}>{t("executiveReporting.shared.thTotalClp")}</th>
                          <th style={{ ...styles.th, textAlign: "right" }}>{t("executiveReporting.shared.thBalance")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((inv) => (
                          <tr key={inv.id}>
                            <td style={{ ...styles.td, fontWeight: 600 }}>{inv.invoiceNumber}</td>
                            <td style={styles.td}>{inv.shipmentRef || inv.moduleNumber}</td>
                            <td style={{ ...styles.td, fontSize: 12 }}>{inv.billToName}</td>
                            <td style={styles.td}>{inv.date}</td>
                            <td style={styles.td}>
                              <InvoiceStatusDot status={inv.status} />
                            </td>
                            <td style={{ ...styles.td, textAlign: "right", color: C.positive, fontWeight: 600 }}>
                              {fmt(inv.homeTotalAmount)}
                            </td>
                            <td style={{ ...styles.td, textAlign: "right", color: C.negative }}>
                              {fmt(inv.balanceDue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardSection>

                {topClients.length > 0 && (
                  <CardSection title={t("executiveReporting.billing.sectionTopClients")}>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            <th style={{ ...styles.th, width: 32 }}>{t("executiveReporting.shared.thCount")}</th>
                            <th style={styles.th}>{t("executiveReporting.shared.thClient")}</th>
                            <th style={{ ...styles.th, textAlign: "center" }}>{t("executiveReporting.shared.thFactShort")}</th>
                            <th style={{ ...styles.th, textAlign: "right" }}>CLP</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topClients.map((c, i) => (
                            <tr key={c.name}>
                              <td style={{ ...styles.td, color: C.textLight }}>{i + 1}</td>
                              <td style={{ ...styles.td, fontWeight: 500, fontSize: 12 }}>{c.name}</td>
                              <td style={{ ...styles.td, textAlign: "center" }}>{c.count}</td>
                              <td style={{ ...styles.td, textAlign: "right", fontWeight: 600, color: C.positive }}>
                                {fmt(c.homeTotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardSection>
                )}
              </div>
            </>
          )}

          {!hasSearched && !loading && (
            <EmptyState
              title={t("executiveReporting.billing.emptyStart")}
              sub={t("executiveReporting.billing.emptyStartSub")}
            />
          )}
        </>
      )}

      {/* ── COMPARATIVA ── */}
      {activeTab === "comparativa" && (
        <>
          <div style={{ ...styles.cardPad, marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "end",
                flexWrap: "wrap",
              }}
            >
              <PeriodPresetSelect value={compPreset} onChange={setCompPreset} />
              <div style={{ flex: "0 1 160px" }}>
                <label style={styles.label}>
                  {t("executiveReporting.shared.filters.from")}
                </label>
                <input
                  type="date"
                  value={compStartDate}
                  onChange={(e) => {
                    setCompPreset("custom");
                    setCompStartDate(e.target.value);
                  }}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: "0 1 160px" }}>
                <label style={styles.label}>
                  {t("executiveReporting.shared.filters.to")}
                </label>
                <input
                  type="date"
                  value={compEndDate}
                  onChange={(e) => {
                    setCompPreset("custom");
                    setCompEndDate(e.target.value);
                  }}
                  style={inputStyle}
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={fetchComparativeData}
                  disabled={loadingComparative || ejecutivos.length === 0}
                  style={{
                    ...btnPrimary,
                    opacity: loadingComparative || ejecutivos.length === 0 ? 0.5 : 1,
                  }}
                >
                  {loadingComparative
                    ? t("executiveReporting.shared.buttons.loading")
                    : t("executiveReporting.shared.buttons.compareAll")}
                </button>
              </div>
            </div>
          </div>

          {errorComparative && <ErrorBanner message={errorComparative} />}

          {loadingComparative && <ComparativeSkeleton />}

          {hasSearchedComparative && !loadingComparative && comparativeData.length > 0 && (
            <>
              <DataSourceBanner>
                {t("executiveReporting.shared.inPeriod", {
                  count: allComparativeInvoices.length,
                })}
                {formatFetchedAt(compFetchedAt)
                  ? ` · ${t("executiveReporting.shared.updatedAt", { date: formatFetchedAt(compFetchedAt) })}`
                  : ""}
                <br />
                {t("executiveReporting.billing.bannerComparativeNote")}
              </DataSourceBanner>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <Metric
                  label={t("executiveReporting.billing.kpiTotalInvoices")}
                  value={globalStats.totalInvoices}
                />
                <Metric
                  label={t("executiveReporting.billing.kpiGlobalBilled")}
                  value={fmt(globalStats.totalHomeTotalAmount)}
                  color={C.positive}
                />
                <Metric
                  label={t("executiveReporting.billing.kpiGlobalBalance")}
                  value={fmt(globalStats.totalBalanceDue)}
                  color={C.negative}
                />
                <Metric
                  label={t("executiveReporting.billing.kpiGlobalPaid")}
                  value={fmt(globalStats.totalAmountPaid)}
                  color={C.primary}
                />
                <Metric
                  label={t("executiveReporting.billing.kpiAvgPerInvoiceShort")}
                  value={fmt(globalStats.averagePerInvoice)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={() =>
                    exportComparativeToCSV(
                      comparativeData,
                      `facturacion_comparativa_${new Date().toISOString().split("T")[0]}`,
                    )
                  }
                  style={btnOutline}
                >
                  {t("executiveReporting.shared.buttons.exportCsv")}
                </button>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ ...styles.cardPad, padding: 16 }}>
                  <div style={{ ...styles.label, marginBottom: 12 }}>
                    {t("executiveReporting.billing.chartCompareExecutives")}
                  </div>
                  <div style={{ height: 280 }}>
                    <Bar
                      data={{
                        labels: sortedComparativeData.map((d) => d.nombre),
                        datasets: [
                          {
                            label: t("executiveReporting.billing.kpiBilledClp"),
                            data: sortedComparativeData.map(
                              (d) => d.stats.totalHomeTotalAmount,
                            ),
                            backgroundColor: chartPrimary,
                            borderColor: C.primary,
                            borderWidth: 1,
                          },
                          {
                            label: t("executiveReporting.billing.metricBalance"),
                            data: sortedComparativeData.map(
                              (d) => d.stats.totalBalanceDue,
                            ),
                            backgroundColor: chartNegative,
                            borderColor: C.negative,
                            borderWidth: 1,
                          },
                        ],
                      }}
                      options={makeBarChartOptions(true)}
                    />
                  </div>
                </div>
              </div>

              <CardSection
                title={t("executiveReporting.billing.sectionRanking", {
                  count: comparativeData.length,
                })}
              >
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <SortableTh
                          label={t("executiveReporting.shared.thExecutive")}
                          active={sortField === "nombre"}
                          direction={sortDirection}
                          onClick={() => handleSort("nombre")}
                        />
                        <SortableTh
                          label={t("executiveReporting.shared.thInvoices")}
                          align="center"
                          active={sortField === "totalInvoices"}
                          direction={sortDirection}
                          onClick={() => handleSort("totalInvoices")}
                        />
                        <SortableTh
                          label={t("executiveReporting.shared.thInvoiced")}
                          align="center"
                          active={sortField === "invoicedCount"}
                          direction={sortDirection}
                          onClick={() => handleSort("invoicedCount")}
                        />
                        <SortableTh
                          label={t("executiveReporting.shared.thPosted")}
                          align="center"
                          active={sortField === "postedCount"}
                          direction={sortDirection}
                          onClick={() => handleSort("postedCount")}
                        />
                        <SortableTh
                          label={t("executiveReporting.billing.thBilledClp")}
                          align="right"
                          active={sortField === "totalHomeTotalAmount"}
                          direction={sortDirection}
                          onClick={() => handleSort("totalHomeTotalAmount")}
                        />
                        <SortableTh
                          label={t("executiveReporting.billing.metricBalanceShort")}
                          align="right"
                          active={sortField === "totalBalanceDue"}
                          direction={sortDirection}
                          onClick={() => handleSort("totalBalanceDue")}
                        />
                        <SortableTh
                          label={t("executiveReporting.billing.metricPaidShort")}
                          align="right"
                          active={sortField === "totalAmountPaid"}
                          direction={sortDirection}
                          onClick={() => handleSort("totalAmountPaid")}
                        />
                        <SortableTh
                          label={t("executiveReporting.shared.thClients")}
                          align="center"
                          active={sortField === "uniqueClients"}
                          direction={sortDirection}
                          onClick={() => handleSort("uniqueClients")}
                        />
                      </tr>
                    </thead>
                    <tbody>
                      {sortedComparativeData.map((exec) => (
                        <tr key={exec.nombre}>
                          <td style={{ ...styles.td, fontWeight: 600 }}>{exec.nombre}</td>
                          <td style={{ ...styles.td, textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() =>
                                handleShowInvoicesDetail(
                                  allComparativeInvoices.filter(
                                    (i) =>
                                      i.salesRep.toLowerCase() ===
                                      exec.nombre.toLowerCase(),
                                  ),
                                )
                              }
                              style={{
                                ...base,
                                background: "none",
                                border: "none",
                                color: C.primary,
                                cursor: "pointer",
                                textDecoration: "underline",
                                fontSize: 13,
                                padding: 0,
                              }}
                            >
                              {exec.stats.totalInvoices}
                            </button>
                          </td>
                          <td style={{ ...styles.td, textAlign: "center" }}>
                            {exec.stats.invoicedCount}
                          </td>
                          <td style={{ ...styles.td, textAlign: "center" }}>
                            {exec.stats.postedCount}
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              textAlign: "right",
                              fontWeight: 600,
                              color: C.positive,
                            }}
                          >
                            {fmt(exec.stats.totalHomeTotalAmount)}
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              textAlign: "right",
                              color: C.negative,
                            }}
                          >
                            {fmt(exec.stats.totalBalanceDue)}
                          </td>
                          <td style={{ ...styles.td, textAlign: "right" }}>
                            {fmt(exec.stats.totalAmountPaid)}
                          </td>
                          <td style={{ ...styles.td, textAlign: "center" }}>
                            {exec.stats.uniqueClients}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardSection>
            </>
          )}

          {!hasSearchedComparative && !loadingComparative && (
            <EmptyState
              title={t("executiveReporting.billing.emptyComparativeTitle")}
              sub={t("executiveReporting.billing.emptyComparativeSub")}
            />
          )}
        </>
      )}

      {/* ── DOBLE ── */}
      {activeTab === "doble" && (
        <>
          <div style={{ ...styles.cardPad, marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "end",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: "1 1 180px" }}>
                <label style={styles.label}>
                  {t("executiveReporting.shared.filters.executive1")}
                </label>
                <select
                  value={ejecutivo1}
                  onChange={(e) => setEjecutivo1(e.target.value)}
                  disabled={loadingEjecutivos}
                  style={selectStyle}
                >
                  <option value="">
                    {t("executiveReporting.shared.filters.select")}
                  </option>
                  {ejecutivos.map((ej) => (
                    <option key={ej.id} value={ej.nombre}>
                      {ej.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: "1 1 180px" }}>
                <label style={styles.label}>
                  {t("executiveReporting.shared.filters.executive2")}
                </label>
                <select
                  value={ejecutivo2}
                  onChange={(e) => setEjecutivo2(e.target.value)}
                  disabled={loadingEjecutivos}
                  style={selectStyle}
                >
                  <option value="">
                    {t("executiveReporting.shared.filters.select")}
                  </option>
                  {ejecutivos
                    .filter((e) => e.nombre !== ejecutivo1)
                    .map((ej) => (
                      <option key={ej.id} value={ej.nombre}>
                        {ej.nombre}
                      </option>
                    ))}
                </select>
              </div>
              <PeriodPresetSelect value={doublePreset} onChange={setDoublePreset} />
              <div style={{ flex: "0 1 150px" }}>
                <label style={styles.label}>
                  {t("executiveReporting.shared.filters.from")}
                </label>
                <input
                  type="date"
                  value={doubleStartDate}
                  onChange={(e) => {
                    setDoublePreset("custom");
                    setDoubleStartDate(e.target.value);
                  }}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: "0 1 150px" }}>
                <label style={styles.label}>
                  {t("executiveReporting.shared.filters.to")}
                </label>
                <input
                  type="date"
                  value={doubleEndDate}
                  onChange={(e) => {
                    setDoublePreset("custom");
                    setDoubleEndDate(e.target.value);
                  }}
                  style={inputStyle}
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={fetchDoubleData}
                  disabled={loadingDouble || !ejecutivo1 || !ejecutivo2}
                  style={{
                    ...btnPrimary,
                    opacity: loadingDouble || !ejecutivo1 || !ejecutivo2 ? 0.5 : 1,
                  }}
                >
                  {loadingDouble
                    ? t("executiveReporting.shared.buttons.comparing")
                    : t("executiveReporting.shared.buttons.compare")}
                </button>
              </div>
            </div>
          </div>

          {errorDouble && <ErrorBanner message={errorDouble} />}

          {loadingDouble && <DoubleComparisonSkeleton />}

          {hasSearchedDouble && !loadingDouble && doubleData.length === 2 && (
            <>
              <DataSourceBanner>
                {t("executiveReporting.billing.bannerDouble", {
                  count: allDoubleInvoices.length,
                  name1: doubleData[0].nombre,
                  name2: doubleData[1].nombre,
                })}
                {formatFetchedAt(doubleFetchedAt)
                  ? ` · ${t("executiveReporting.shared.updatedAt", { date: formatFetchedAt(doubleFetchedAt) })}`
                  : ""}
              </DataSourceBanner>

              <CardSection title={`${doubleData[0].nombre} vs ${doubleData[1].nombre}`}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={styles.th}>{t("executiveReporting.shared.metric")}</th>
                        <th style={{ ...styles.th, textAlign: "right" }}>
                          {doubleData[0].nombre}
                        </th>
                        <th style={{ ...styles.th, textAlign: "right" }}>
                          {doubleData[1].nombre}
                        </th>
                        <th style={{ ...styles.th, textAlign: "right" }}>
                          {t("executiveReporting.shared.delta")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {doubleMetrics.map((row) => {
                        const delta = row.v1 - row.v2;
                        const deltaColor =
                          delta > 0 ? C.positive : delta < 0 ? C.negative : C.textMuted;
                        return (
                          <tr key={row.label}>
                            <td style={{ ...styles.td, fontWeight: 600 }}>{row.label}</td>
                            <td style={{ ...styles.td, textAlign: "right" }}>
                              {row.format(row.v1)}
                            </td>
                            <td style={{ ...styles.td, textAlign: "right" }}>
                              {row.format(row.v2)}
                            </td>
                            <td
                              style={{
                                ...styles.td,
                                textAlign: "right",
                                fontWeight: 600,
                                color: deltaColor,
                              }}
                            >
                              {delta > 0 ? "+" : ""}
                              {row.format(delta)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardSection>

              <div style={{ ...styles.cardPad, padding: 16, marginBottom: 20 }}>
                <div style={{ ...styles.label, marginBottom: 12 }}>
                  {t("executiveReporting.billing.chartVisualCompare")}
                </div>
                <div style={{ height: 280 }}>
                  <Bar
                    data={{
                      labels: doubleData.map((d) => d.nombre),
                      datasets: [
                        {
                          label: t("executiveReporting.billing.kpiBilledClp"),
                          data: doubleData.map((d) => d.stats.totalHomeTotalAmount),
                          backgroundColor: chartPrimary,
                          borderColor: C.primary,
                          borderWidth: 1,
                        },
                        {
                          label: t("executiveReporting.billing.metricBalance"),
                          data: doubleData.map((d) => d.stats.totalBalanceDue),
                          backgroundColor: chartNegative,
                          borderColor: C.negative,
                          borderWidth: 1,
                        },
                      ],
                    }}
                    options={makeBarChartOptions(true)}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                {doubleData.map((exec) => (
                  <div
                    key={exec.nombre}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                      gap: 12,
                    }}
                  >
                    <Metric
                      label={`${exec.nombre} — ${t("executiveReporting.shared.thInvoices")}`}
                      value={exec.stats.totalInvoices}
                    />
                    <Metric
                      label={t("executiveReporting.billing.metricBilled")}
                      value={fmt(exec.stats.totalHomeTotalAmount)}
                      color={C.positive}
                    />
                    <Metric
                      label={t("executiveReporting.billing.metricBalanceShort")}
                      value={fmt(exec.stats.totalBalanceDue)}
                      color={C.negative}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {!hasSearchedDouble && !loadingDouble && (
            <EmptyState
              title={t("executiveReporting.billing.emptyDoubleTitle")}
              sub={t("executiveReporting.billing.emptyDoubleSub")}
            />
          )}
        </>
      )}

      <Modal
        show={showInvoicesModal}
        onHide={() => setShowInvoicesModal(false)}
        size="xl"
        centered
      >
        <Modal.Header
          closeButton
          style={{ ...base, borderBottom: `1px solid ${C.border}` }}
        >
          <Modal.Title style={{ ...base, fontSize: 16, fontWeight: 600, color: C.secondary }}>
            {t("executiveReporting.shared.modalInvoiceDetail")}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ ...base, padding: 0 }}>
          {invoicesDetalle.length === 0 ? (
            <p style={{ ...base, textAlign: "center", padding: 24, color: C.textMuted }}>
              {t("executiveReporting.shared.modalNoInvoices")}
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={styles.th}>{t("executiveReporting.shared.thInvoiceNumber")}</th>
                    <th style={styles.th}>{t("executiveReporting.shared.thShipmentRef")}</th>
                    <th style={styles.th}>{t("executiveReporting.shared.thClient")}</th>
                    <th style={styles.th}>{t("executiveReporting.shared.thDate")}</th>
                    <th style={styles.th}>{t("executiveReporting.shared.thStatus")}</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>{t("executiveReporting.shared.thTotalClp")}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoicesDetalle.map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ ...styles.td, fontWeight: 600 }}>{inv.invoiceNumber}</td>
                      <td style={styles.td}>{inv.shipmentRef || inv.moduleNumber}</td>
                      <td style={{ ...styles.td, fontSize: 12 }}>{inv.billToName}</td>
                      <td style={styles.td}>{inv.date}</td>
                      <td style={styles.td}>
                        <InvoiceStatusDot status={inv.status} />
                      </td>
                      <td
                        style={{
                          ...styles.td,
                          textAlign: "right",
                          fontWeight: 600,
                          color: C.positive,
                        }}
                      >
                        {fmt(inv.homeTotalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default InvoicesXEjecutivo;
