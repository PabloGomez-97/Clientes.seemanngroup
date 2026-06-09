// src/components/administrador/Facturaciones-Ejecutivos/Facturaciones.tsx
// Facturación por Ejecutivo — Seemann Group
import { useEffect, useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../../auth/AuthContext";
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

const M_NAMES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const fmt = (n: number) => formatInvoiceCurrency(n);

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
        label: `${M_NAMES[parseInt(m, 10) - 1]} ${year}`,
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
      setError("Debes seleccionar un ejecutivo");
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
      setError(err instanceof Error ? err.message : "Error desconocido");
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
        err instanceof Error ? err.message : "Error desconocido",
      );
    } finally {
      setLoadingComparative(false);
    }
  };

  const fetchDoubleData = async () => {
    if (!ejecutivo1 || !ejecutivo2) {
      setErrorDouble("Debes seleccionar dos ejecutivos");
      return;
    }
    if (ejecutivo1 === ejecutivo2) {
      setErrorDouble("Debes seleccionar dos ejecutivos diferentes");
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
      setErrorDouble(err instanceof Error ? err.message : "Error desconocido");
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
      "Ejecutivo",
      "Total Facturas",
      "Invoiced",
      "Posted",
      "Facturado CLP",
      "Saldo Pendiente",
      "Total Pagado",
      "Promedio/Factura",
      "Clientes Únicos",
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

  const doubleMetrics = doubleData.length === 2
    ? [
        {
          label: "Total Facturas",
          v1: doubleData[0].stats.totalInvoices,
          v2: doubleData[1].stats.totalInvoices,
          format: (v: number) => String(v),
        },
        {
          label: "Invoiced",
          v1: doubleData[0].stats.invoicedCount,
          v2: doubleData[1].stats.invoicedCount,
          format: (v: number) => String(v),
        },
        {
          label: "Posted",
          v1: doubleData[0].stats.postedCount,
          v2: doubleData[1].stats.postedCount,
          format: (v: number) => String(v),
        },
        {
          label: "Clientes Únicos",
          v1: doubleData[0].stats.uniqueClients,
          v2: doubleData[1].stats.uniqueClients,
          format: (v: number) => String(v),
        },
        {
          label: "Facturado (CLP)",
          v1: doubleData[0].stats.totalHomeTotalAmount,
          v2: doubleData[1].stats.totalHomeTotalAmount,
          format: fmt,
        },
        {
          label: "Saldo Pendiente",
          v1: doubleData[0].stats.totalBalanceDue,
          v2: doubleData[1].stats.totalBalanceDue,
          format: fmt,
        },
        {
          label: "Total Pagado",
          v1: doubleData[0].stats.totalAmountPaid,
          v2: doubleData[1].stats.totalAmountPaid,
          format: fmt,
        },
        {
          label: "Promedio / Factura",
          v1: doubleData[0].stats.averagePerInvoice,
          v2: doubleData[1].stats.averagePerInvoice,
          format: fmt,
        },
      ]
    : [];

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
          Reportería de Facturación
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
            { key: "individual" as TabType, label: "Análisis Individual" },
            { key: "comparativa" as TabType, label: "Análisis Comparativo" },
            { key: "doble" as TabType, label: "Comparación Doble" },
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
                <label style={styles.label}>Ejecutivo</label>
                <select
                  value={selectedEjecutivo}
                  onChange={(e) => setSelectedEjecutivo(e.target.value)}
                  disabled={loadingEjecutivos}
                  style={selectStyle}
                >
                  <option value="">Seleccionar ejecutivo...</option>
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
                <label style={styles.label}>Desde</label>
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
                <label style={styles.label}>Hasta</label>
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
                  {loading ? "Buscando..." : "Buscar"}
                </button>
              </div>
            </div>
          </div>

          {error && <ErrorBanner message={error} />}

          {loading && <InvoiceIndividualSkeleton />}

          {hasSearched && !loading && invoices.length === 0 && !error && (
            <EmptyState
              title="Sin resultados"
              sub="No se encontraron facturas para los filtros seleccionados"
            />
          )}

          {hasSearched && !loading && invoices.length > 0 && (
            <>
              <DataSourceBanner>
                {selectedEjecutivo ? `Ejecutivo: ${selectedEjecutivo} · ` : ""}
                {invoices.length} facturas
                {rawInvoiceCount > 0
                  ? ` · ${rawInvoiceCount} en origen (invoices/all)`
                  : ""}
                {formatFetchedAt(individualFetchedAt)
                  ? ` · Actualizado ${formatFetchedAt(individualFetchedAt)}`
                  : ""}
                <br />
                Montos en <strong>CLP</strong> vía <code>homeTotalAmount</code>.
                Esta vista es <strong>facturación</strong>, no profit de
                cotizaciones.
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
                  label="Total Facturas"
                  value={stats.totalInvoices}
                  sub={`${stats.invoicedCount} invoiced · ${stats.postedCount} posted`}
                />
                <Metric
                  label="Facturado (CLP)"
                  value={fmt(stats.totalHomeTotalAmount)}
                  sub={`Promedio ${fmt(stats.averagePerInvoice)} / factura`}
                  color={C.positive}
                />
                <Metric
                  label="Saldo Pendiente"
                  value={fmt(stats.totalBalanceDue)}
                  color={C.negative}
                />
                <Metric
                  label="Total Pagado"
                  value={fmt(stats.totalAmountPaid)}
                  color={C.primary}
                />
                <Metric
                  label="Clientes Únicos"
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
                <CardSection title="Desglose Mensual">
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Mes</th>
                          <th style={{ ...styles.th, textAlign: "center" }}>Facturas</th>
                          <th style={{ ...styles.th, textAlign: "center" }}>Invoiced</th>
                          <th style={{ ...styles.th, textAlign: "center" }}>Posted</th>
                          <th style={{ ...styles.th, textAlign: "right" }}>Facturado</th>
                          <th style={{ ...styles.th, textAlign: "right" }}>Saldo</th>
                          <th style={{ ...styles.th, textAlign: "right" }}>Pagado</th>
                          <th style={{ ...styles.th, textAlign: "center" }}>Clientes</th>
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
                  <div style={{ ...styles.label, marginBottom: 12 }}>Facturación Mensual</div>
                  <div style={{ height: 260 }}>
                    <Bar
                      data={{
                        labels: monthlyData.map((m) => m.label),
                        datasets: [
                          {
                            label: "Facturado (CLP)",
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
                  <div style={{ ...styles.label, marginBottom: 12 }}>Status</div>
                  <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Doughnut
                      data={{
                        labels: ["Invoiced", "Posted"],
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
                <CardSection title={`Detalle de Facturas (${invoices.length})`}>
                  <div style={{ overflowX: "auto", maxHeight: 480, overflowY: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={styles.th}>N° Factura</th>
                          <th style={styles.th}>Ref. Embarque</th>
                          <th style={styles.th}>Cliente</th>
                          <th style={styles.th}>Fecha</th>
                          <th style={styles.th}>Status</th>
                          <th style={{ ...styles.th, textAlign: "right" }}>Total CLP</th>
                          <th style={{ ...styles.th, textAlign: "right" }}>Saldo</th>
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
                  <CardSection title="Top Clientes">
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            <th style={{ ...styles.th, width: 32 }}>#</th>
                            <th style={styles.th}>Cliente</th>
                            <th style={{ ...styles.th, textAlign: "center" }}>Fact.</th>
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
              title="Selecciona un ejecutivo para comenzar"
              sub="Filtra por ejecutivo y rango de fechas para ver la facturación"
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
                <label style={styles.label}>Desde</label>
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
                <label style={styles.label}>Hasta</label>
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
                  {loadingComparative ? "Cargando..." : "Comparar todos"}
                </button>
              </div>
            </div>
          </div>

          {errorComparative && <ErrorBanner message={errorComparative} />}

          {loadingComparative && <ComparativeSkeleton />}

          {hasSearchedComparative && !loadingComparative && comparativeData.length > 0 && (
            <>
              <DataSourceBanner>
                {allComparativeInvoices.length} facturas en el período
                {formatFetchedAt(compFetchedAt)
                  ? ` · Actualizado ${formatFetchedAt(compFetchedAt)}`
                  : ""}
                <br />
                Montos en CLP (<code>homeTotalAmount</code>). Incluye ejecutivos
                con 0 facturas en el período.
              </DataSourceBanner>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <Metric label="Total Facturas" value={globalStats.totalInvoices} />
                <Metric
                  label="Facturado Global"
                  value={fmt(globalStats.totalHomeTotalAmount)}
                  color={C.positive}
                />
                <Metric
                  label="Saldo Global"
                  value={fmt(globalStats.totalBalanceDue)}
                  color={C.negative}
                />
                <Metric
                  label="Pagado Global"
                  value={fmt(globalStats.totalAmountPaid)}
                  color={C.primary}
                />
                <Metric
                  label="Promedio / Factura"
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
                  Export CSV
                </button>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ ...styles.cardPad, padding: 16 }}>
                  <div style={{ ...styles.label, marginBottom: 12 }}>
                    Comparación por Ejecutivo
                  </div>
                  <div style={{ height: 280 }}>
                    <Bar
                      data={{
                        labels: sortedComparativeData.map((d) => d.nombre),
                        datasets: [
                          {
                            label: "Facturado (CLP)",
                            data: sortedComparativeData.map(
                              (d) => d.stats.totalHomeTotalAmount,
                            ),
                            backgroundColor: chartPrimary,
                            borderColor: C.primary,
                            borderWidth: 1,
                          },
                          {
                            label: "Saldo Pendiente",
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

              <CardSection title={`Ranking de Ejecutivos (${comparativeData.length})`}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <SortableTh
                          label="Ejecutivo"
                          active={sortField === "nombre"}
                          direction={sortDirection}
                          onClick={() => handleSort("nombre")}
                        />
                        <SortableTh
                          label="Facturas"
                          align="center"
                          active={sortField === "totalInvoices"}
                          direction={sortDirection}
                          onClick={() => handleSort("totalInvoices")}
                        />
                        <SortableTh
                          label="Invoiced"
                          align="center"
                          active={sortField === "invoicedCount"}
                          direction={sortDirection}
                          onClick={() => handleSort("invoicedCount")}
                        />
                        <SortableTh
                          label="Posted"
                          align="center"
                          active={sortField === "postedCount"}
                          direction={sortDirection}
                          onClick={() => handleSort("postedCount")}
                        />
                        <SortableTh
                          label="Facturado CLP"
                          align="right"
                          active={sortField === "totalHomeTotalAmount"}
                          direction={sortDirection}
                          onClick={() => handleSort("totalHomeTotalAmount")}
                        />
                        <SortableTh
                          label="Saldo"
                          align="right"
                          active={sortField === "totalBalanceDue"}
                          direction={sortDirection}
                          onClick={() => handleSort("totalBalanceDue")}
                        />
                        <SortableTh
                          label="Pagado"
                          align="right"
                          active={sortField === "totalAmountPaid"}
                          direction={sortDirection}
                          onClick={() => handleSort("totalAmountPaid")}
                        />
                        <SortableTh
                          label="Clientes"
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
              title="Compara el desempeño de todos los ejecutivos"
              sub='Haz clic en "Comparar todos" para ver el ranking de facturación'
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
                <label style={styles.label}>Ejecutivo 1</label>
                <select
                  value={ejecutivo1}
                  onChange={(e) => setEjecutivo1(e.target.value)}
                  disabled={loadingEjecutivos}
                  style={selectStyle}
                >
                  <option value="">Seleccionar...</option>
                  {ejecutivos.map((ej) => (
                    <option key={ej.id} value={ej.nombre}>
                      {ej.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: "1 1 180px" }}>
                <label style={styles.label}>Ejecutivo 2</label>
                <select
                  value={ejecutivo2}
                  onChange={(e) => setEjecutivo2(e.target.value)}
                  disabled={loadingEjecutivos}
                  style={selectStyle}
                >
                  <option value="">Seleccionar...</option>
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
                <label style={styles.label}>Desde</label>
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
                <label style={styles.label}>Hasta</label>
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
                  {loadingDouble ? "Comparando..." : "Comparar"}
                </button>
              </div>
            </div>
          </div>

          {errorDouble && <ErrorBanner message={errorDouble} />}

          {loadingDouble && <DoubleComparisonSkeleton />}

          {hasSearchedDouble && !loadingDouble && doubleData.length === 2 && (
            <>
              <DataSourceBanner>
                {allDoubleInvoices.length} facturas ·{" "}
                {doubleData[0].nombre} vs {doubleData[1].nombre}
                {formatFetchedAt(doubleFetchedAt)
                  ? ` · Actualizado ${formatFetchedAt(doubleFetchedAt)}`
                  : ""}
              </DataSourceBanner>

              <CardSection title={`${doubleData[0].nombre} vs ${doubleData[1].nombre}`}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Métrica</th>
                        <th style={{ ...styles.th, textAlign: "right" }}>
                          {doubleData[0].nombre}
                        </th>
                        <th style={{ ...styles.th, textAlign: "right" }}>
                          {doubleData[1].nombre}
                        </th>
                        <th style={{ ...styles.th, textAlign: "right" }}>Delta</th>
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
                <div style={{ ...styles.label, marginBottom: 12 }}>Comparación Visual</div>
                <div style={{ height: 280 }}>
                  <Bar
                    data={{
                      labels: doubleData.map((d) => d.nombre),
                      datasets: [
                        {
                          label: "Facturado (CLP)",
                          data: doubleData.map((d) => d.stats.totalHomeTotalAmount),
                          backgroundColor: chartPrimary,
                          borderColor: C.primary,
                          borderWidth: 1,
                        },
                        {
                          label: "Saldo Pendiente",
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
                    <Metric label={`${exec.nombre} — Facturas`} value={exec.stats.totalInvoices} />
                    <Metric
                      label="Facturado"
                      value={fmt(exec.stats.totalHomeTotalAmount)}
                      color={C.positive}
                    />
                    <Metric
                      label="Saldo"
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
              title="Compara dos ejecutivos directamente"
              sub="Selecciona dos ejecutivos y haz clic en Comparar"
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
            Detalle de Facturas
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ ...base, padding: 0 }}>
          {invoicesDetalle.length === 0 ? (
            <p style={{ ...base, textAlign: "center", padding: 24, color: C.textMuted }}>
              No hay facturas para mostrar
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={styles.th}>N° Factura</th>
                    <th style={styles.th}>Ref. Embarque</th>
                    <th style={styles.th}>Cliente</th>
                    <th style={styles.th}>Fecha</th>
                    <th style={styles.th}>Status</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>Total CLP</th>
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
