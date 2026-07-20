// src/components/administrador/Facturaciones-Ejecutivos/Reporteriaexecutivo.tsx
// Executive Reporting Dashboard — Seemann Group
import { useEffect, useState, useMemo, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import i18n from "@/i18n";
import { linbisFetch } from "@/services/linbisFetch";
import ChartExecutivo from "./Chartexecutivo.tsx";
import {
  QuotesIndividualSkeleton,
  ComparativeSkeleton,
  DoubleComparisonSkeleton,
  PeriodPresetSelect,
} from "./executiveReportingUi";
import type { QuoteStats, ExecutiveComparison } from "./types";
import {
  type ExecutiveQuote,
  type PeriodPreset,
  normalizeExecutiveQuote,
  extractQuotesFromResponse,
  filterQuotesBySalesRep,
  filterQuotesByDateRange,
  getPeriodRange,
  isQuoteCompleted,
  isAirMode,
  isSeaMode,
  isTruckMode,
  getTransportShortLabel,
  buildMonthlyComparison,
  buildGlobalMonthlySummary,
  formatExecutiveAmount,
} from "./quoteUtils";
export type { QuoteStats, ExecutiveComparison };

// ════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════
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

type Quote = ExecutiveQuote;

interface MonthlyBreakdown {
  month: string;
  label: string;
  quotes: number;
  completed: number;
  air: number;
  sea: number;
  truck: number;
  income: number;
  expense: number;
  profit: number;
  margin: number;
  clients: number;
}

interface TransportRow {
  type: string;
  quotes: number;
  income: number;
  expense: number;
  profit: number;
  margin: number;
}

type TabType = "individual" | "comparativa" | "doble";
type SortField =
  | "nombre"
  | "totalQuotes"
  | "completedQuotes"
  | "completionRate"
  | "airQuotes"
  | "seaQuotes"
  | "truckQuotes"
  | "totalIncome"
  | "totalExpense"
  | "totalProfit"
  | "profitMargin"
  | "averagePerQuote"
  | "uniqueConsignees";
type SortDirection = "asc" | "desc";

// ════════════════════════════════════════════
// DESIGN SYSTEM
// ════════════════════════════════════════════
const FONT =
  'var(--portal-font)';

const C = {
  primary: "#ff6200",
  primaryLight: "#fff7ed",
  secondary: "#1a1a1a",
  text: "#111827",
  textMuted: "#6b7280",
  textLight: "#9ca3af",
  border: "#e5e7eb",
  borderLight: "#f3f4f6",
  bg: "#f8f9fa",
  white: "#ffffff",
  positive: "#059669",
  positiveLight: "#ecfdf5",
  negative: "#dc2626",
  negativeLight: "#fef2f2",
  warning: "#d97706",
};

const base: CSSProperties = { fontFamily: FONT };

const styles = {
  card: {
    ...base,
    backgroundColor: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
  } as CSSProperties,
  cardPad: {
    ...base,
    backgroundColor: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    padding: 20,
  } as CSSProperties,
  label: {
    ...base,
    fontSize: 11,
    fontWeight: 600,
    color: C.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    marginBottom: 4,
  } as CSSProperties,
  bigVal: {
    ...base,
    fontSize: 26,
    fontWeight: 700,
    color: C.secondary,
    lineHeight: 1.2,
  } as CSSProperties,
  sub: {
    ...base,
    fontSize: 12,
    color: C.textMuted,
    marginTop: 4,
  } as CSSProperties,
  th: {
    ...base,
    padding: "10px 12px",
    fontSize: 11,
    fontWeight: 600,
    color: C.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    borderBottom: `2px solid ${C.border}`,
    whiteSpace: "nowrap" as const,
    backgroundColor: C.bg,
  } as CSSProperties,
  td: {
    ...base,
    padding: "10px 12px",
    fontSize: 13,
    color: C.text,
    borderBottom: `1px solid ${C.borderLight}`,
  } as CSSProperties,
  sectionTitle: {
    ...base,
    fontSize: 13,
    fontWeight: 600,
    color: C.secondary,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    marginBottom: 16,
  } as CSSProperties,
};

// ════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════
const fmt = (n: number, currency?: string | null) =>
  formatExecutiveAmount(n, currency);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const fmtPct = (v: number) => `${v.toFixed(1)}%`;

const formatFetchedAt = (value: string | null): string | null => {
  if (!value) return null;
  const asNumber = Number(value);
  const date = Number.isFinite(asNumber)
    ? new Date(asNumber)
    : new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleString("es-CL");
};

const calculateStats = (arr: Quote[]): QuoteStats => {
  const n = arr.length;
  const completed = arr.filter((q) => isQuoteCompleted(q.status)).length;
  const air = arr.filter((q) => isAirMode(q.modeOfTransportation)).length;
  const sea = arr.filter((q) => isSeaMode(q.modeOfTransportation)).length;
  const truck = arr.filter((q) => isTruckMode(q.modeOfTransportation)).length;
  const income = arr.reduce((s, q) => s + (q.totalIncome || 0), 0);
  const expense = arr.reduce((s, q) => s + (q.totalExpense || 0), 0);
  const profit = arr.reduce((s, q) => s + (q.profit || 0), 0);
  const clients = new Set(
    arr
      .map((q) => q.consignee?.trim())
      .filter((c): c is string => !!c && c.length > 0),
  ).size;

  return {
    totalQuotes: n,
    completedQuotes: completed,
    pendingQuotes: n - completed,
    airQuotes: air,
    seaQuotes: sea,
    truckQuotes: truck,
    totalIncome: income,
    totalExpense: expense,
    totalProfit: profit,
    profitMargin: income > 0 ? (profit / income) * 100 : 0,
    averagePerQuote: n > 0 ? income / n : 0,
    averageProfitPerQuote: n > 0 ? profit / n : 0,
    completionRate: n > 0 ? (completed / n) * 100 : 0,
    uniqueConsignees: clients,
  };
};

const getMonthlyBreakdown = (arr: Quote[]): MonthlyBreakdown[] => {
  const map = new Map<string, Quote[]>();
  arr.forEach((q) => {
    if (!q.date) return;
    const d = new Date(q.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(q);
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, qs]) => {
      const st = calculateStats(qs);
      const [year, m] = month.split("-");
      return {
        month,
        label: `${i18n.t(`executiveReporting.shared.months.${parseInt(m, 10)}`)} ${year}`,
        quotes: st.totalQuotes,
        completed: st.completedQuotes,
        air: st.airQuotes,
        sea: st.seaQuotes,
        truck: st.truckQuotes,
        income: st.totalIncome,
        expense: st.totalExpense,
        profit: st.totalProfit,
        margin: st.profitMargin,
        clients: st.uniqueConsignees,
      };
    });
};

const getTransportBreakdown = (arr: Quote[]): TransportRow[] => {
  const types = [
    { key: "Air", fn: (q: Quote) => isAirMode(q.modeOfTransportation) },
    { key: "Sea", fn: (q: Quote) => isSeaMode(q.modeOfTransportation) },
    { key: "Truck", fn: (q: Quote) => isTruckMode(q.modeOfTransportation) },
    {
      key: "Other",
      fn: (q: Quote) =>
        !isAirMode(q.modeOfTransportation) &&
        !isSeaMode(q.modeOfTransportation) &&
        !isTruckMode(q.modeOfTransportation),
    },
  ];
  return types
    .map((t) => {
      const f = arr.filter(t.fn);
      const st = calculateStats(f);
      return {
        type: t.key,
        quotes: st.totalQuotes,
        income: st.totalIncome,
        expense: st.totalExpense,
        profit: st.totalProfit,
        margin: st.profitMargin,
      };
    })
    .filter((t) => t.quotes > 0);
};

const getTopConsignees = (arr: Quote[], limit = 10) => {
  const map = new Map<
    string,
    { count: number; income: number; profit: number }
  >();
  arr.forEach((q) => {
    const c = q.consignee?.trim();
    if (c && c.length > 0) {
      const ex = map.get(c) || { count: 0, income: 0, profit: 0 };
      map.set(c, {
        count: ex.count + 1,
        income: ex.income + q.totalIncome,
        profit: ex.profit + q.profit,
      });
    }
  });
  return Array.from(map.entries())
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.income - a.income)
    .slice(0, limit);
};

const getTopRoutes = (arr: Quote[], limit = 10) => {
  const map = new Map<string, { count: number; income: number }>();
  arr.forEach((q) => {
    const route = `${q.origin || "—"} → ${q.destination || "—"}`;
    const ex = map.get(route) || { count: 0, income: 0 };
    map.set(route, { count: ex.count + 1, income: ex.income + q.totalIncome });
  });
  return Array.from(map.entries())
    .map(([route, d]) => ({ route, ...d }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

// ════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════
const Metric = ({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) => (
  <div style={styles.cardPad}>
    <div style={styles.label}>{label}</div>
    <div style={{ ...styles.bigVal, color: color || C.secondary }}>{value}</div>
    {sub && <div style={styles.sub}>{sub}</div>}
  </div>
);

const TransportBar = ({
  air,
  sea,
  truck,
  total,
}: {
  air: number;
  sea: number;
  truck: number;
  total: number;
}) => {
  const { t } = useTranslation();
  if (total === 0) return null;
  const other = total - air - sea - truck;
  const items = [
    { label: t("executiveReporting.shared.transport.air"), count: air, pct: (air / total) * 100, color: C.primary },
    { label: t("executiveReporting.shared.transport.sea"), count: sea, pct: (sea / total) * 100, color: C.secondary },
    {
      label: t("executiveReporting.shared.transport.truck"),
      count: truck,
      pct: (truck / total) * 100,
      color: C.textMuted,
    },
    ...(other > 0
      ? [
        {
          label: t("executiveReporting.shared.transport.other"),
          count: other,
          pct: (other / total) * 100,
          color: C.textLight,
        },
      ]
      : []),
  ];
  return (
    <div style={styles.cardPad}>
      <div style={styles.label}>{t("executiveReporting.shared.transportDistribution")}</div>
      <div
        style={{
          display: "flex",
          height: 6,
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: C.borderLight,
          marginTop: 12,
          marginBottom: 12,
        }}
      >
        {items.map((it) => (
          <div
            key={it.label}
            style={{
              width: `${it.pct}%`,
              backgroundColor: it.color,
              transition: "width 0.3s",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", ...base }}>
        {items.map((it) => (
          <div
            key={it.label}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                backgroundColor: it.color,
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: 12, color: C.textMuted, ...base }}>
              {it.label}
            </span>
            <span
              style={{ fontSize: 13, fontWeight: 600, color: C.text, ...base }}
            >
              {it.count}
            </span>
            <span style={{ fontSize: 11, color: C.textLight, ...base }}>
              ({it.pct.toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const StatusDot = ({ status }: { status: string }) => {
  const { t } = useTranslation();
  const color = isQuoteCompleted(status) ? C.positive : C.textLight;
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 6, ...base }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: color,
          display: "inline-block",
        }}
      />
      <span style={{ fontSize: 12, color: C.textMuted }}>
        {t(`executiveReporting.shared.quoteFlow.${status}`, { defaultValue: t("executiveReporting.shared.quoteFlow.noStatus") })}
      </span>
    </span>
  );
};

const DataSourceBanner = ({
  count,
  fetchedAt,
  salesRep,
}: {
  count: number;
  fetchedAt: string | null;
  salesRep?: string;
}) => {
  const { t } = useTranslation();
  return (
    <div
      style={{
        ...base,
        padding: "10px 16px",
        backgroundColor: C.primaryLight,
        border: `1px solid #fed7aa`,
        borderRadius: 6,
        fontSize: 12,
        color: C.textMuted,
        marginBottom: 16,
      }}
    >
      {salesRep
        ? `${t("executiveReporting.shared.executiveLabel", { name: salesRep })} · `
        : ""}
      {t("executiveReporting.shared.countQuotes", { count })}
      {formatFetchedAt(fetchedAt)
        ? ` · ${t("executiveReporting.shared.updatedAt", { date: formatFetchedAt(fetchedAt) })}`
        : ""}
      <br />
      {t("executiveReporting.quotes.bannerNote")}
    </div>
  );
};

const EmptyState = ({ title, sub }: { title: string; sub: string }) => (
  <div style={{ ...styles.cardPad, padding: "60px 24px", textAlign: "center" }}>
    <div
      style={{
        fontSize: 16,
        fontWeight: 600,
        color: C.secondary,
        marginBottom: 6,
        ...base,
      }}
    >
      {title}
    </div>
    <div style={{ fontSize: 13, color: C.textMuted, ...base }}>{sub}</div>
  </div>
);

const ErrorBanner = ({ message }: { message: string }) => (
  <div
    style={{
      padding: "14px 20px",
      backgroundColor: C.negativeLight,
      border: "1px solid #fecaca",
      borderRadius: 6,
      color: C.negative,
      fontSize: 13,
      fontWeight: 500,
      marginBottom: 20,
      ...base,
    }}
  >
    {message}
  </div>
);

const PAGE_SIZE = 20;

// ════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════
function ReportExecutive() {
  const { t } = useTranslation();
  const { accessToken, refreshAccessToken } = useOutletContext<OutletContext>();
  const { user, getEjecutivos } = useAuth();

  // ── State ──
  const [activeTab, setActiveTab] = useState<TabType>("individual");
  const [ejecutivos, setEjecutivos] = useState<Ejecutivo[]>([]);
  const [loadingEjecutivos, setLoadingEjecutivos] = useState(true);

  // Individual
  const [selectedEjecutivo, setSelectedEjecutivo] = useState("");
  const [individualPreset, setIndividualPreset] =
    useState<PeriodPreset>("this-year");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [individualFetchedAt, setIndividualFetchedAt] = useState<string | null>(
    null,
  );

  // Comparativa
  const [compPreset, setCompPreset] = useState<PeriodPreset>("this-year");
  const [compStartDate, setCompStartDate] = useState("");
  const [compEndDate, setCompEndDate] = useState("");
  const [comparativeData, setComparativeData] = useState<ExecutiveComparison[]>(
    [],
  );
  const [allComparativeQuotes, setAllComparativeQuotes] = useState<Quote[]>([]);
  const [loadingComparative, setLoadingComparative] = useState(false);
  const [errorComparative, setErrorComparative] = useState<string | null>(null);
  const [hasSearchedComparative, setHasSearchedComparative] = useState(false);
  const [compFetchedAt, setCompFetchedAt] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("totalProfit");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Doble
  const [ejecutivo1, setEjecutivo1] = useState("");
  const [ejecutivo2, setEjecutivo2] = useState("");
  const [doublePreset, setDoublePreset] = useState<PeriodPreset>("this-year");
  const [doubleStartDate, setDoubleStartDate] = useState("");
  const [doubleEndDate, setDoubleEndDate] = useState("");
  const [doubleData, setDoubleData] = useState<ExecutiveComparison[]>([]);
  const [doubleQuotesByExec, setDoubleQuotesByExec] = useState<
    Record<string, Quote[]>
  >({});
  const [allDoubleQuotes, setAllDoubleQuotes] = useState<Quote[]>([]);
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

  // ── Effects ──
  useEffect(() => {
    const load = async () => {
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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived data ──
  const stats = useMemo(() => calculateStats(quotes), [quotes]);
  const monthlyData = useMemo(() => getMonthlyBreakdown(quotes), [quotes]);
  const transportData = useMemo(() => getTransportBreakdown(quotes), [quotes]);
  const totalPages = Math.ceil(quotes.length / PAGE_SIZE);
  const paginatedQuotes = quotes.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const sortedComparativeData = useMemo(
    () =>
      [...comparativeData].sort((a, b) => {
        let aVal: number | string = 0;
        let bVal: number | string = 0;
        if (sortField === "nombre") {
          aVal = a.nombre;
          bVal = b.nombre;
        } else {
          aVal = a.stats[sortField] as number;
          bVal = b.stats[sortField] as number;
        }
        if (typeof aVal === "string" && typeof bVal === "string")
          return sortDirection === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        return sortDirection === "asc"
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      }),
    [comparativeData, sortField, sortDirection],
  );

  const globalStats = useMemo(
    () =>
      comparativeData.reduce(
        (acc, ex) => ({
          totalQuotes: acc.totalQuotes + ex.stats.totalQuotes,
          totalIncome: acc.totalIncome + ex.stats.totalIncome,
          totalExpense: acc.totalExpense + ex.stats.totalExpense,
          totalProfit: acc.totalProfit + ex.stats.totalProfit,
        }),
        { totalQuotes: 0, totalIncome: 0, totalExpense: 0, totalProfit: 0 },
      ),
    [comparativeData],
  );

  const globalMonthlyData = useMemo(
    () => buildGlobalMonthlySummary(allComparativeQuotes),
    [allComparativeQuotes],
  );

  const doubleMonthlyComparison = useMemo(() => {
    if (!ejecutivo1 || !ejecutivo2) return [];
    return buildMonthlyComparison(
      doubleQuotesByExec[ejecutivo1] || [],
      doubleQuotesByExec[ejecutivo2] || [],
    );
  }, [doubleQuotesByExec, ejecutivo1, ejecutivo2]);

  const doubleMetrics = useMemo(
    () =>
      doubleData.length === 2
        ? [
            {
              label: t("executiveReporting.quotes.metricTotalQuotes"),
              v1: doubleData[0].stats.totalQuotes,
              v2: doubleData[1].stats.totalQuotes,
              format: (v: number) => String(v),
            },
            {
              label: t("executiveReporting.quotes.metricCompleted"),
              v1: doubleData[0].stats.completedQuotes,
              v2: doubleData[1].stats.completedQuotes,
              format: (v: number) => String(v),
            },
            {
              label: t("executiveReporting.quotes.metricCompletionRate"),
              v1: doubleData[0].stats.completionRate,
              v2: doubleData[1].stats.completionRate,
              format: fmtPct,
            },
            {
              label: t("executiveReporting.shared.transport.air"),
              v1: doubleData[0].stats.airQuotes,
              v2: doubleData[1].stats.airQuotes,
              format: (v: number) => String(v),
            },
            {
              label: t("executiveReporting.shared.transport.sea"),
              v1: doubleData[0].stats.seaQuotes,
              v2: doubleData[1].stats.seaQuotes,
              format: (v: number) => String(v),
            },
            {
              label: t("executiveReporting.shared.transport.truck"),
              v1: doubleData[0].stats.truckQuotes,
              v2: doubleData[1].stats.truckQuotes,
              format: (v: number) => String(v),
            },
            {
              label: t("executiveReporting.billing.kpiUniqueClients"),
              v1: doubleData[0].stats.uniqueConsignees,
              v2: doubleData[1].stats.uniqueConsignees,
              format: (v: number) => String(v),
            },
            {
              label: t("executiveReporting.quotes.metricIncome"),
              v1: doubleData[0].stats.totalIncome,
              v2: doubleData[1].stats.totalIncome,
              format: fmt,
            },
            {
              label: t("executiveReporting.quotes.metricExpense"),
              v1: doubleData[0].stats.totalExpense,
              v2: doubleData[1].stats.totalExpense,
              format: fmt,
            },
            {
              label: t("executiveReporting.quotes.metricProfit"),
              v1: doubleData[0].stats.totalProfit,
              v2: doubleData[1].stats.totalProfit,
              format: fmt,
            },
            {
              label: t("executiveReporting.quotes.metricMargin"),
              v1: doubleData[0].stats.profitMargin,
              v2: doubleData[1].stats.profitMargin,
              format: fmtPct,
            },
            {
              label: t("executiveReporting.quotes.metricAvgIncomeQuote"),
              v1: doubleData[0].stats.averagePerQuote,
              v2: doubleData[1].stats.averagePerQuote,
              format: fmt,
            },
            {
              label: t("executiveReporting.quotes.metricAvgProfitQuote"),
              v1: doubleData[0].stats.averageProfitPerQuote,
              v2: doubleData[1].stats.averageProfitPerQuote,
              format: fmt,
            },
          ]
        : [],
    [doubleData, t],
  );

  const fetchQuotesForExecutive = async (
    salesRepName: string,
    rangeStart: string,
    rangeEnd: string,
  ): Promise<Quote[]> => {
    const params = new URLSearchParams({ SalesRepName: salesRepName });
    if (rangeStart) params.append("StartDate", rangeStart);
    if (rangeEnd) params.append("EndDate", rangeEnd);

    const res = await linbisFetch(
      `https://api.linbis.com/Quotes/filter?${params}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
      accessToken,
      refreshAccessToken,
    );

    if (!res.ok) {
      if (res.status === 401) throw new Error(t("executiveReporting.shared.errors.unknown"));
      throw new Error(t("executiveReporting.shared.errors.unknown"));
    }

    const data = await res.json();
    const normalized = extractQuotesFromResponse(data).map(normalizeExecutiveQuote);
    const byRep = filterQuotesBySalesRep(normalized, salesRepName);
    const filtered = filterQuotesByDateRange(byRep, rangeStart, rangeEnd);

    return filtered.sort(
      (a, b) =>
        new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(),
    );
  };

  // ── API calls ──
  const fetchQuotes = async () => {
    if (!selectedEjecutivo) {
      setError(t("executiveReporting.shared.errors.selectExecutive"));
      return;
    }
    const cacheKey = `quotesExecutive_${selectedEjecutivo}_${startDate}_${endDate}`;
    const cached = localStorage.getItem(cacheKey);
    const ts = localStorage.getItem(`${cacheKey}_timestamp`);
    if (cached && ts && Date.now() - parseInt(ts) < 5 * 60 * 1000) {
      setQuotes(JSON.parse(cached));
      setIndividualFetchedAt(ts);
      setHasSearched(true);
      setError(null);
      setPage(1);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setHasSearched(true);
      setPage(1);
      const sorted = await fetchQuotesForExecutive(
        selectedEjecutivo,
        startDate,
        endDate,
      );
      const now = Date.now().toString();
      setQuotes(sorted);
      setIndividualFetchedAt(now);
      localStorage.setItem(cacheKey, JSON.stringify(sorted));
      localStorage.setItem(`${cacheKey}_timestamp`, now);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("executiveReporting.shared.errors.unknown"));
    } finally {
      setLoading(false);
    }
  };

  const fetchComparativeData = async () => {
    const cacheKey = `quotesComparative_${compStartDate}_${compEndDate}`;
    const cached = localStorage.getItem(cacheKey);
    const ts = localStorage.getItem(`${cacheKey}_timestamp`);
    if (cached && ts && Date.now() - parseInt(ts) < 5 * 60 * 1000) {
      const parsed = JSON.parse(cached);
      setComparativeData(parsed.comparisons);
      setAllComparativeQuotes(parsed.allQuotes || []);
      setCompFetchedAt(ts);
      setHasSearchedComparative(true);
      setErrorComparative(null);
      return;
    }
    try {
      setLoadingComparative(true);
      setErrorComparative(null);
      setHasSearchedComparative(true);
      const comparisons: ExecutiveComparison[] = [];
      const allQuotes: Quote[] = [];
      const failures: string[] = [];

      for (const ej of ejecutivos) {
        try {
          const arr = await fetchQuotesForExecutive(
            ej.nombre,
            compStartDate,
            compEndDate,
          );
          allQuotes.push(...arr);
          comparisons.push({ nombre: ej.nombre, stats: calculateStats(arr) });
        } catch {
          failures.push(ej.nombre);
          comparisons.push({
            nombre: ej.nombre,
            stats: calculateStats([]),
          });
        }
      }

      comparisons.sort((a, b) => b.stats.totalProfit - a.stats.totalProfit);
      setComparativeData(comparisons);
      setAllComparativeQuotes(allQuotes);
      const now = Date.now().toString();
      setCompFetchedAt(now);
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ comparisons, allQuotes }),
      );
      localStorage.setItem(`${cacheKey}_timestamp`, now);

      if (failures.length > 0) {
        setErrorComparative(
          `${t("executiveReporting.shared.errors.unknown")}: ${failures.join(", ")}`,
        );
      }
    } catch (err) {
      setErrorComparative(
        err instanceof Error ? err.message : t("executiveReporting.shared.errors.unknown"),
      );
    } finally {
      setLoadingComparative(false);
    }
  };

  const fetchDoubleComparison = async () => {
    if (!ejecutivo1 || !ejecutivo2) {
      setErrorDouble(t("executiveReporting.shared.errors.selectTwoExecutives"));
      return;
    }
    const cacheKey = `quotesDouble_${ejecutivo1}_${ejecutivo2}_${doubleStartDate}_${doubleEndDate}`;
    const cached = localStorage.getItem(cacheKey);
    const ts = localStorage.getItem(`${cacheKey}_timestamp`);
    if (cached && ts && Date.now() - parseInt(ts) < 5 * 60 * 1000) {
      const parsed = JSON.parse(cached);
      setDoubleData(parsed.comparisons);
      setDoubleQuotesByExec(parsed.quotesByExec || {});
      setAllDoubleQuotes(parsed.allQuotes || []);
      setDoubleFetchedAt(ts);
      setHasSearchedDouble(true);
      setErrorDouble(null);
      return;
    }
    try {
      setLoadingDouble(true);
      setErrorDouble(null);
      setHasSearchedDouble(true);
      const comparisons: ExecutiveComparison[] = [];
      const allQuotes: Quote[] = [];
      const quotesByExec: Record<string, Quote[]> = {};

      for (const name of [ejecutivo1, ejecutivo2]) {
        const arr = await fetchQuotesForExecutive(
          name,
          doubleStartDate,
          doubleEndDate,
        );
        quotesByExec[name] = arr;
        allQuotes.push(...arr);
        comparisons.push({ nombre: name, stats: calculateStats(arr) });
      }

      setDoubleData(comparisons);
      setDoubleQuotesByExec(quotesByExec);
      setAllDoubleQuotes(allQuotes);
      const now = Date.now().toString();
      setDoubleFetchedAt(now);
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ comparisons, allQuotes, quotesByExec }),
      );
      localStorage.setItem(`${cacheKey}_timestamp`, now);
    } catch (err) {
      setErrorDouble(err instanceof Error ? err.message : t("executiveReporting.shared.errors.unknown"));
    } finally {
      setLoadingDouble(false);
    }
  };

  // ── Sort handler ──
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <span style={{ opacity: 0.3, fontSize: 10 }}>&#8597;</span>;
    return (
      <span style={{ fontSize: 10 }}>
        {sortDirection === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  // ── Export ──
  const exportToCSV = (data: Quote[], filename: string) => {
    const headers = [
      "Número",
      "Fecha",
      "Estado",
      "Tipo",
      "Shipper",
      "Consignee",
      "Origen",
      "Destino",
      "Income",
      "Expense",
      "Profit",
    ];
    const rows = data.map((q) => [
      q.number,
      fmtDate(q.date),
      q.status,
      q.modeOfTransportation,
      q.shipper,
      q.consignee,
      q.origin,
      q.destination,
      q.totalIncome,
      q.totalExpense,
      q.profit,
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

  const exportComparativeToCSV = (
    data: ExecutiveComparison[],
    filename: string,
  ) => {
    const headers = [
      t("executiveReporting.quotes.csvExecutive"),
      t("executiveReporting.quotes.csvTotalQuotes"),
      t("executiveReporting.quotes.csvCompleted"),
      t("executiveReporting.quotes.csvCompletionRate"),
      t("executiveReporting.shared.transport.air"),
      t("executiveReporting.shared.transport.sea"),
      t("executiveReporting.shared.transport.truck"),
      t("executiveReporting.billing.kpiUniqueClients"),
      t("executiveReporting.quotes.metricIncome"),
      t("executiveReporting.quotes.metricExpense"),
      t("executiveReporting.quotes.metricProfit"),
      `${t("executiveReporting.quotes.metricMargin")} %`,
      t("executiveReporting.quotes.thAvgQuote"),
    ];
    const rows = data.map((ex) => [
      ex.nombre,
      ex.stats.totalQuotes,
      ex.stats.completedQuotes,
      fmtPct(ex.stats.completionRate),
      ex.stats.airQuotes,
      ex.stats.seaQuotes,
      ex.stats.truckQuotes,
      ex.stats.uniqueConsignees,
      ex.stats.totalIncome,
      ex.stats.totalExpense,
      ex.stats.totalProfit,
      fmtPct(ex.stats.profitMargin),
      ex.stats.averagePerQuote,
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

  // ── Shared button styles ──
  const btnPrimary: CSSProperties = {
    ...base,
    fontSize: 13,
    fontWeight: 600,
    padding: "8px 20px",
    borderRadius: 4,
    border: "none",
    backgroundColor: C.primary,
    color: C.white,
    cursor: "pointer",
    height: 38,
    transition: "opacity 0.15s",
  };

  const btnOutline: CSSProperties = {
    ...base,
    fontSize: 13,
    fontWeight: 600,
    padding: "8px 20px",
    borderRadius: 4,
    border: `1px solid ${C.border}`,
    backgroundColor: C.white,
    color: C.text,
    cursor: "pointer",
    height: 38,
    transition: "all 0.15s",
  };

  const inputStyle: CSSProperties = {
    ...base,
    fontSize: 13,
    padding: "8px 12px",
    borderRadius: 4,
    border: `1px solid ${C.border}`,
    backgroundColor: C.white,
    color: C.text,
    height: 38,
    width: "100%",
    outline: "none",
  };

  const selectStyle: CSSProperties = {
    ...inputStyle,
    appearance: "auto" as const,
  };

  // tab styles
  const tabBase: CSSProperties = {
    ...base,
    padding: "12px 24px",
    fontSize: 13,
    fontWeight: 600,
    border: "none",
    backgroundColor: "transparent",
    cursor: "pointer",
    borderBottom: "2px solid transparent",
    transition: "all 0.15s",
    color: C.textMuted,
  };

  const tabActive: CSSProperties = {
    ...tabBase,
    color: C.primary,
    borderBottomColor: C.primary,
  };

  // ════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════
  return (
    <div
      style={{
        ...base,
        backgroundColor: C.bg,
        minHeight: "100vh",
        padding: "24px 32px",
      }}
    >
      {/* Header */}
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
          {t("executiveReporting.quotes.title")}
        </h1>
        <p
          style={{
            ...base,
            fontSize: 13,
            color: C.textMuted,
            margin: "4px 0 0",
          }}
        >
          {user?.nombreuser || ""}
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: `1px solid ${C.border}`,
          marginBottom: 24,
          gap: 0,
        }}
      >
        {(
          [
            { key: "individual" as TabType, label: t("executiveReporting.shared.tabs.individual") },
            { key: "comparativa" as TabType, label: t("executiveReporting.shared.tabs.comparative") },
            { key: "doble" as TabType, label: t("executiveReporting.shared.tabs.double") },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={activeTab === tab.key ? tabActive : tabBase}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════
          INDIVIDUAL TAB
         ══════════════════════════════════════ */}
      {activeTab === "individual" && (
        <>
          {/* Filters */}
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
                <label style={styles.label}>{t("executiveReporting.shared.filters.executive")}</label>
                <select
                  value={selectedEjecutivo}
                  onChange={(e) => setSelectedEjecutivo(e.target.value)}
                  disabled={loadingEjecutivos}
                  style={selectStyle}
                >
                  <option value="">{t("executiveReporting.shared.filters.selectExecutive")}</option>
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
                <label style={styles.label}>{t("executiveReporting.shared.filters.from")}</label>
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
                <label style={styles.label}>{t("executiveReporting.shared.filters.to")}</label>
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
                  onClick={fetchQuotes}
                  disabled={loading || !selectedEjecutivo}
                  style={{
                    ...btnPrimary,
                    opacity: loading || !selectedEjecutivo ? 0.5 : 1,
                  }}
                >
                  {loading ? t("executiveReporting.shared.buttons.searching") : t("executiveReporting.shared.buttons.search")}
                </button>
              </div>
            </div>
          </div>

          {error && <ErrorBanner message={error} />}

          {loading && <QuotesIndividualSkeleton />}

          {/* Results */}
          {hasSearched && !loading && quotes.length === 0 && !error && (
            <EmptyState
              title={t("executiveReporting.shared.noResultsTitle")}
              sub={t("executiveReporting.quotes.emptyNoQuotes")}
            />
          )}

          {hasSearched && !loading && quotes.length > 0 && (
            <>
              <DataSourceBanner
                count={quotes.length}
                fetchedAt={individualFetchedAt}
                salesRep={selectedEjecutivo}
              />

              {/* KPI Row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <Metric
                  label={t("executiveReporting.quotes.kpiTotalQuotes")}
                  value={stats.totalQuotes}
                  sub={t("executiveReporting.quotes.kpiCompletedSub", { completed: stats.completedQuotes, rate: fmtPct(stats.completionRate) })}
                />
                <Metric
                  label={t("executiveReporting.quotes.kpiIncomeTotal")}
                  value={fmt(stats.totalIncome)}
                  sub={t("executiveReporting.quotes.kpiAvgPerQuote", { amount: fmt(stats.averagePerQuote) })}
                  color={C.positive}
                />
                <Metric
                  label={t("executiveReporting.quotes.kpiExpenseTotal")}
                  value={fmt(stats.totalExpense)}
                  color={C.negative}
                />
                <Metric
                  label={t("executiveReporting.quotes.kpiProfitTotal")}
                  value={fmt(stats.totalProfit)}
                  sub={t("executiveReporting.quotes.kpiAvgProfitPerQuote", { amount: fmt(stats.averageProfitPerQuote) })}
                  color={C.primary}
                />
                <Metric
                  label={t("executiveReporting.quotes.kpiMargin")}
                  value={fmtPct(stats.profitMargin)}
                  sub={t("executiveReporting.quotes.kpiUniqueClientsSub", { count: stats.uniqueConsignees })}
                />
              </div>

              {/* Transport Distribution Bar */}
              <div style={{ marginBottom: 20 }}>
                <TransportBar
                  air={stats.airQuotes}
                  sea={stats.seaQuotes}
                  truck={stats.truckQuotes}
                  total={stats.totalQuotes}
                />
              </div>

              {/* Revenue by Transport Type */}
              {transportData.length > 0 && (
                <div
                  style={{
                    ...styles.card,
                    marginBottom: 20,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "14px 20px",
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    <div style={styles.sectionTitle}>
                      {t("executiveReporting.quotes.sectionRevenueTransport")}
                    </div>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr>
                          <th style={styles.th}>{t("executiveReporting.shared.thType")}</th>
                          <th style={{ ...styles.th, textAlign: "center" }}>
                            {t("executiveReporting.shared.thQuotes")}
                          </th>
                          <th style={{ ...styles.th, textAlign: "right" }}>
                            {t("executiveReporting.shared.thIncome")}
                          </th>
                          <th style={{ ...styles.th, textAlign: "right" }}>
                            {t("executiveReporting.shared.thExpense")}
                          </th>
                          <th style={{ ...styles.th, textAlign: "right" }}>
                            {t("executiveReporting.shared.thProfit")}
                          </th>
                          <th style={{ ...styles.th, textAlign: "right" }}>
                            {t("executiveReporting.shared.thMargin")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {transportData.map((t) => (
                          <tr key={t.type}>
                            <td style={{ ...styles.td, fontWeight: 600 }}>
                              {t.type}
                            </td>
                            <td style={{ ...styles.td, textAlign: "center" }}>
                              {t.quotes}
                            </td>
                            <td
                              style={{
                                ...styles.td,
                                textAlign: "right",
                                color: C.positive,
                              }}
                            >
                              {fmt(t.income)}
                            </td>
                            <td
                              style={{
                                ...styles.td,
                                textAlign: "right",
                                color: C.negative,
                              }}
                            >
                              {fmt(t.expense)}
                            </td>
                            <td
                              style={{
                                ...styles.td,
                                textAlign: "right",
                                fontWeight: 600,
                              }}
                            >
                              {fmt(t.profit)}
                            </td>
                            <td style={{ ...styles.td, textAlign: "right" }}>
                              {fmtPct(t.margin)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Monthly Breakdown */}
              {monthlyData.length > 0 && (
                <div
                  style={{
                    ...styles.card,
                    marginBottom: 20,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "14px 20px",
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    <div style={styles.sectionTitle}>{t("executiveReporting.quotes.sectionMonthly")}</div>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr>
                          <th style={styles.th}>{t("executiveReporting.shared.thMonth")}</th>
                          <th style={{ ...styles.th, textAlign: "center" }}>
                            {t("executiveReporting.shared.thQuotes")}
                          </th>
                          <th style={{ ...styles.th, textAlign: "center" }}>
                            {t("executiveReporting.quotes.metricCompleted")}
                          </th>
                          <th style={{ ...styles.th, textAlign: "center" }}>
                            {t("executiveReporting.shared.transport.air")}
                          </th>
                          <th style={{ ...styles.th, textAlign: "center" }}>
                            {t("executiveReporting.shared.transport.sea")}
                          </th>
                          <th style={{ ...styles.th, textAlign: "center" }}>
                            {t("executiveReporting.shared.transport.truck")}
                          </th>
                          <th style={{ ...styles.th, textAlign: "center" }}>
                            Clients
                          </th>
                          <th style={{ ...styles.th, textAlign: "right" }}>
                            {t("executiveReporting.shared.thIncome")}
                          </th>
                          <th style={{ ...styles.th, textAlign: "right" }}>
                            {t("executiveReporting.shared.thExpense")}
                          </th>
                          <th style={{ ...styles.th, textAlign: "right" }}>
                            {t("executiveReporting.shared.thProfit")}
                          </th>
                          <th style={{ ...styles.th, textAlign: "right" }}>
                            {t("executiveReporting.shared.thMargin")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyData.map((m) => (
                          <tr key={m.month}>
                            <td style={{ ...styles.td, fontWeight: 600 }}>
                              {m.label}
                            </td>
                            <td style={{ ...styles.td, textAlign: "center" }}>
                              {m.quotes}
                            </td>
                            <td style={{ ...styles.td, textAlign: "center" }}>
                              {m.completed}
                            </td>
                            <td style={{ ...styles.td, textAlign: "center" }}>
                              {m.air}
                            </td>
                            <td style={{ ...styles.td, textAlign: "center" }}>
                              {m.sea}
                            </td>
                            <td style={{ ...styles.td, textAlign: "center" }}>
                              {m.truck}
                            </td>
                            <td style={{ ...styles.td, textAlign: "center" }}>
                              {m.clients}
                            </td>
                            <td
                              style={{
                                ...styles.td,
                                textAlign: "right",
                                color: C.positive,
                              }}
                            >
                              {fmt(m.income)}
                            </td>
                            <td
                              style={{
                                ...styles.td,
                                textAlign: "right",
                                color: C.negative,
                              }}
                            >
                              {fmt(m.expense)}
                            </td>
                            <td
                              style={{
                                ...styles.td,
                                textAlign: "right",
                                fontWeight: 600,
                              }}
                            >
                              {fmt(m.profit)}
                            </td>
                            <td style={{ ...styles.td, textAlign: "right" }}>
                              {fmtPct(m.margin)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Charts */}
              <div style={{ marginBottom: 20 }}>
                <ChartExecutivo type="individual" data={stats} />
              </div>

              {/* Actions bar */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginBottom: 16,
                }}
              >
                <button
                  onClick={() =>
                    exportToCSV(
                      quotes,
                      `reporte_${selectedEjecutivo}_${new Date().toISOString().split("T")[0]}`,
                    )
                  }
                  style={btnOutline}
                >
                  {t("executiveReporting.shared.buttons.exportCsv")}
                </button>
              </div>

              {/* Quotes table */}
              <div
                style={{ ...styles.card, marginBottom: 20, overflow: "hidden" }}
              >
                <div
                  style={{
                    padding: "14px 20px",
                    borderBottom: `1px solid ${C.border}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={styles.sectionTitle}>
                    {t("executiveReporting.quotes.sectionQuoteDetail", { count: quotes.length })}
                  </div>
                  <div style={{ ...base, fontSize: 12, color: C.textMuted }}>
                    {t("executiveReporting.shared.pageOf", { page, total: totalPages })}
                  </div>
                </div>
                <div
                  style={{
                    overflowX: "auto",
                    maxHeight: 600,
                    overflowY: "auto",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={styles.th}>{t("executiveReporting.shared.thNumber")}</th>
                        <th style={styles.th}>{t("executiveReporting.shared.thDate")}</th>
                        <th style={styles.th}>{t("executiveReporting.shared.thStatus")}</th>
                        <th style={styles.th}>{t("executiveReporting.shared.thType")}</th>
                        <th style={styles.th}>{t("executiveReporting.shared.thShipper")}</th>
                        <th style={styles.th}>{t("executiveReporting.shared.thConsignee")}</th>
                        <th style={styles.th}>{t("executiveReporting.shared.thOrigin")}</th>
                        <th style={styles.th}>{t("executiveReporting.shared.thDestination")}</th>
                        <th style={{ ...styles.th, textAlign: "center" }}>
                          {t("executiveReporting.shared.thCurrency")}
                        </th>
                        <th style={{ ...styles.th, textAlign: "right" }}>
                          {t("executiveReporting.shared.thIncome")}
                        </th>
                        <th style={{ ...styles.th, textAlign: "right" }}>
                          {t("executiveReporting.shared.thExpense")}
                        </th>
                        <th style={{ ...styles.th, textAlign: "right" }}>
                          {t("executiveReporting.shared.thProfit")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedQuotes.map((q, i) => (
                        <tr
                          key={i}
                          style={{
                            backgroundColor: i % 2 === 0 ? C.white : C.bg,
                          }}
                        >
                          <td
                            style={{
                              ...styles.td,
                              fontWeight: 600,
                              color: C.primary,
                            }}
                          >
                            {q.number}
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              color: C.textMuted,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {fmtDate(q.date)}
                          </td>
                          <td style={styles.td}>
                            <StatusDot status={q.status} />
                          </td>
                          <td style={{ ...styles.td, fontSize: 12 }}>
                            {getTransportShortLabel(q.modeOfTransportation)}
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              maxWidth: 180,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {q.shipper}
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              maxWidth: 180,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {q.consignee}
                          </td>
                          <td style={{ ...styles.td, color: C.textMuted }}>
                            {q.origin}
                          </td>
                          <td style={{ ...styles.td, color: C.textMuted }}>
                            {q.destination}
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              textAlign: "center",
                              color: C.textMuted,
                              fontSize: 11,
                            }}
                          >
                            {q.currency || "—"}
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              textAlign: "right",
                              color: C.positive,
                              fontWeight: 600,
                            }}
                          >
                            {fmt(q.totalIncome, q.currency)}
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              textAlign: "right",
                              color: C.negative,
                              fontWeight: 600,
                            }}
                          >
                            {fmt(q.totalExpense, q.currency)}
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              textAlign: "right",
                              fontWeight: 700,
                            }}
                          >
                            {fmt(q.profit, q.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                  <div
                    style={{
                      padding: "12px 20px",
                      borderTop: `1px solid ${C.border}`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ ...base, fontSize: 12, color: C.textMuted }}>
                      {t("executiveReporting.shared.showing")} {(page - 1) * PAGE_SIZE + 1}-
                      {Math.min(page * PAGE_SIZE, quotes.length)} {t("executiveReporting.shared.of")}{" "}
                      {quotes.length}
                    </span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        style={{
                          ...btnOutline,
                          padding: "4px 12px",
                          height: 30,
                          fontSize: 12,
                          opacity: page === 1 ? 0.4 : 1,
                        }}
                      >
                        {t("executiveReporting.shared.previous")}
                      </button>
                      <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        style={{
                          ...btnOutline,
                          padding: "4px 12px",
                          height: 30,
                          fontSize: 12,
                          opacity: page === totalPages ? 0.4 : 1,
                        }}
                      >
                        {t("executiveReporting.shared.next")}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Top Clients & Routes */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  marginBottom: 20,
                }}
              >
                {/* Top Clients */}
                <div style={{ ...styles.card, overflow: "hidden" }}>
                  <div
                    style={{
                      padding: "14px 20px",
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    <div style={styles.sectionTitle}>
                      {t("executiveReporting.quotes.sectionTopClients")}
                    </div>
                  </div>
                  <div style={{ overflowY: "auto", maxHeight: 400 }}>
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr>
                          <th style={{ ...styles.th, width: 32 }}>#</th>
                          <th style={styles.th}>{t("executiveReporting.shared.thClient")}</th>
                          <th style={{ ...styles.th, textAlign: "center" }}>
                            {t("executiveReporting.shared.thQuotes")}
                          </th>
                          <th style={{ ...styles.th, textAlign: "right" }}>
                            {t("executiveReporting.shared.thIncome")}
                          </th>
                          <th style={{ ...styles.th, textAlign: "right" }}>
                            {t("executiveReporting.shared.thProfit")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {getTopConsignees(quotes, 10).map((c, i) => (
                          <tr key={i}>
                            <td
                              style={{
                                ...styles.td,
                                color: C.textLight,
                                fontWeight: 600,
                              }}
                            >
                              {i + 1}
                            </td>
                            <td
                              style={{
                                ...styles.td,
                                fontWeight: 500,
                                maxWidth: 200,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {c.name}
                            </td>
                            <td style={{ ...styles.td, textAlign: "center" }}>
                              {c.count}
                            </td>
                            <td
                              style={{
                                ...styles.td,
                                textAlign: "right",
                                color: C.positive,
                              }}
                            >
                              {fmt(c.income)}
                            </td>
                            <td
                              style={{
                                ...styles.td,
                                textAlign: "right",
                                fontWeight: 600,
                              }}
                            >
                              {fmt(c.profit)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top Routes */}
                <div style={{ ...styles.card, overflow: "hidden" }}>
                  <div
                    style={{
                      padding: "14px 20px",
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    <div style={styles.sectionTitle}>
                      {t("executiveReporting.quotes.sectionTopRoutes")}
                    </div>
                  </div>
                  <div style={{ overflowY: "auto", maxHeight: 400 }}>
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr>
                          <th style={{ ...styles.th, width: 32 }}>#</th>
                          <th style={styles.th}>{t("executiveReporting.shared.thRoute")}</th>
                          <th style={{ ...styles.th, textAlign: "center" }}>
                            {t("executiveReporting.shared.thQuotes")}
                          </th>
                          <th style={{ ...styles.th, textAlign: "right" }}>
                            {t("executiveReporting.shared.thIncome")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {getTopRoutes(quotes, 10).map((r, i) => (
                          <tr key={i}>
                            <td
                              style={{
                                ...styles.td,
                                color: C.textLight,
                                fontWeight: 600,
                              }}
                            >
                              {i + 1}
                            </td>
                            <td style={{ ...styles.td, fontWeight: 500 }}>
                              {r.route}
                            </td>
                            <td style={{ ...styles.td, textAlign: "center" }}>
                              {r.count}
                            </td>
                            <td
                              style={{
                                ...styles.td,
                                textAlign: "right",
                                color: C.positive,
                              }}
                            >
                              {fmt(r.income)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Initial state */}
          {!hasSearched && !loading && (
            <EmptyState
              title={t("executiveReporting.quotes.emptyStart")}
              sub={t("executiveReporting.quotes.emptyStartSub")}
            />
          )}
        </>
      )}

      {/* ══════════════════════════════════════
          COMPARATIVA TAB
         ══════════════════════════════════════ */}
      {activeTab === "comparativa" && (
        <>
          {/* Filters */}
          <div style={{ ...styles.cardPad, marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "end",
                flexWrap: "wrap",
              }}
            >
              <PeriodPresetSelect
                value={compPreset}
                onChange={setCompPreset}
              />
              <div style={{ flex: "0 1 160px" }}>
                <label style={styles.label}>{t("executiveReporting.shared.filters.from")}</label>
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
                <label style={styles.label}>{t("executiveReporting.shared.filters.to")}</label>
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
                  onClick={fetchComparativeData}
                  disabled={loadingComparative || ejecutivos.length === 0}
                  style={{
                    ...btnPrimary,
                    opacity: loadingComparative ? 0.5 : 1,
                  }}
                >
                  {loadingComparative ? t("executiveReporting.shared.buttons.loading") : t("executiveReporting.shared.buttons.compareAll")}
                </button>
              </div>
            </div>
          </div>

          {errorComparative && <ErrorBanner message={errorComparative} />}

          {loadingComparative && <ComparativeSkeleton />}

          {hasSearchedComparative &&
            !loadingComparative &&
            comparativeData.length > 0 && (
              <>
                <DataSourceBanner
                  count={allComparativeQuotes.length}
                  fetchedAt={compFetchedAt}
                />

                {/* Global KPIs */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <Metric
                    label={t("executiveReporting.quotes.kpiTotalQuotes")}
                    value={globalStats.totalQuotes}
                  />
                  <Metric
                    label={t("executiveReporting.quotes.kpiGlobalIncome")}
                    value={fmt(globalStats.totalIncome)}
                    color={C.positive}
                  />
                  <Metric
                    label={t("executiveReporting.quotes.kpiGlobalExpense")}
                    value={fmt(globalStats.totalExpense)}
                    color={C.negative}
                  />
                  <Metric
                    label={t("executiveReporting.quotes.kpiGlobalProfit")}
                    value={fmt(globalStats.totalProfit)}
                    color={C.primary}
                  />
                  <Metric
                    label={t("executiveReporting.quotes.kpiGlobalMargin")}
                    value={fmtPct(
                      globalStats.totalIncome > 0
                        ? (globalStats.totalProfit / globalStats.totalIncome) *
                        100
                        : 0,
                    )}
                  />
                </div>

                {/* Export */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginBottom: 16,
                  }}
                >
                  <button
                    onClick={() =>
                      exportComparativeToCSV(
                        comparativeData,
                        `comparativa_${new Date().toISOString().split("T")[0]}`,
                      )
                    }
                    style={btnOutline}
                  >
                    {t("executiveReporting.shared.buttons.exportCsv")}
                  </button>
                </div>

                {/* Ranking Table */}
                <div
                  style={{
                    ...styles.card,
                    marginBottom: 20,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "14px 20px",
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    <div style={styles.sectionTitle}>
                      {t("executiveReporting.quotes.sectionRanking", { count: comparativeData.length })}
                    </div>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr>
                          {[
                            {
                              field: "nombre" as SortField,
                              label: t("executiveReporting.shared.thExecutive"),
                              align: "left",
                            },
                            {
                              field: "totalQuotes" as SortField,
                              label: t("executiveReporting.shared.thQuotes"),
                              align: "center",
                            },
                            {
                              field: "completedQuotes" as SortField,
                              label: t("executiveReporting.quotes.thCompleted"),
                              align: "center",
                            },
                            {
                              field: "completionRate" as SortField,
                              label: t("executiveReporting.quotes.thCompletionRate"),
                              align: "center",
                            },
                            {
                              field: "airQuotes" as SortField,
                              label: t("executiveReporting.shared.transport.air"),
                              align: "center",
                            },
                            {
                              field: "seaQuotes" as SortField,
                              label: t("executiveReporting.shared.transport.sea"),
                              align: "center",
                            },
                            {
                              field: "truckQuotes" as SortField,
                              label: t("executiveReporting.shared.transport.truck"),
                              align: "center",
                            },
                            {
                              field: "uniqueConsignees" as SortField,
                              label: t("executiveReporting.shared.thClients"),
                              align: "center",
                            },
                            {
                              field: "totalIncome" as SortField,
                              label: t("executiveReporting.shared.thIncome"),
                              align: "right",
                            },
                            {
                              field: "totalExpense" as SortField,
                              label: t("executiveReporting.shared.thExpense"),
                              align: "right",
                            },
                            {
                              field: "totalProfit" as SortField,
                              label: t("executiveReporting.shared.thProfit"),
                              align: "right",
                            },
                            {
                              field: "profitMargin" as SortField,
                              label: t("executiveReporting.shared.thMargin"),
                              align: "right",
                            },
                            {
                              field: "averagePerQuote" as SortField,
                              label: t("executiveReporting.quotes.thAvgQuote"),
                              align: "right",
                            },
                          ].map((col) => (
                            <th
                              key={col.field}
                              style={{
                                ...styles.th,
                                textAlign:
                                  col.align as CSSProperties["textAlign"],
                                cursor: "pointer",
                                userSelect: "none",
                              }}
                              onClick={() => handleSort(col.field)}
                            >
                              {col.label} <SortIcon field={col.field} />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedComparativeData.map((ex, i) => (
                          <tr
                            key={ex.nombre}
                            style={{
                              backgroundColor: i % 2 === 0 ? C.white : C.bg,
                            }}
                          >
                            <td style={{ ...styles.td, fontWeight: 600 }}>
                              {ex.nombre}
                            </td>
                            <td style={{ ...styles.td, textAlign: "center" }}>
                              {ex.stats.totalQuotes}
                            </td>
                            <td style={{ ...styles.td, textAlign: "center" }}>
                              {ex.stats.completedQuotes}
                            </td>
                            <td style={{ ...styles.td, textAlign: "center" }}>
                              {fmtPct(ex.stats.completionRate)}
                            </td>
                            <td style={{ ...styles.td, textAlign: "center" }}>
                              {ex.stats.airQuotes}
                            </td>
                            <td style={{ ...styles.td, textAlign: "center" }}>
                              {ex.stats.seaQuotes}
                            </td>
                            <td style={{ ...styles.td, textAlign: "center" }}>
                              {ex.stats.truckQuotes}
                            </td>
                            <td style={{ ...styles.td, textAlign: "center" }}>
                              {ex.stats.uniqueConsignees}
                            </td>
                            <td
                              style={{
                                ...styles.td,
                                textAlign: "right",
                                color: C.positive,
                                fontWeight: 600,
                              }}
                            >
                              {fmt(ex.stats.totalIncome)}
                            </td>
                            <td
                              style={{
                                ...styles.td,
                                textAlign: "right",
                                color: C.negative,
                                fontWeight: 600,
                              }}
                            >
                              {fmt(ex.stats.totalExpense)}
                            </td>
                            <td
                              style={{
                                ...styles.td,
                                textAlign: "right",
                                fontWeight: 700,
                              }}
                            >
                              {fmt(ex.stats.totalProfit)}
                            </td>
                            <td style={{ ...styles.td, textAlign: "right" }}>
                              {fmtPct(ex.stats.profitMargin)}
                            </td>
                            <td style={{ ...styles.td, textAlign: "right" }}>
                              {fmt(ex.stats.averagePerQuote)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Charts */}
                <div style={{ marginBottom: 20 }}>
                  <ChartExecutivo
                    type="comparativa"
                    comparativeData={comparativeData}
                  />
                </div>

                {globalMonthlyData.length > 0 && (
                  <div
                    style={{
                      ...styles.card,
                      marginBottom: 20,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "14px 20px",
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      <div style={styles.sectionTitle}>
                        {t("executiveReporting.quotes.sectionMonthlyCompare")}
                      </div>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{ width: "100%", borderCollapse: "collapse" }}
                      >
                        <thead>
                          <tr>
                            <th style={styles.th}>{t("executiveReporting.shared.thMonth")}</th>
                            <th style={{ ...styles.th, textAlign: "center" }}>
                              {t("executiveReporting.shared.thQuotes")}
                            </th>
                            <th style={{ ...styles.th, textAlign: "center" }}>
                              {t("executiveReporting.shared.thActiveExecutives")}
                            </th>
                            <th style={{ ...styles.th, textAlign: "right" }}>
                              {t("executiveReporting.shared.thIncome")}
                            </th>
                            <th style={{ ...styles.th, textAlign: "right" }}>
                              {t("executiveReporting.shared.thProfit")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {globalMonthlyData.map((m) => (
                            <tr key={m.month}>
                              <td style={{ ...styles.td, fontWeight: 600 }}>
                                {m.label}
                              </td>
                              <td style={{ ...styles.td, textAlign: "center" }}>
                                {m.quotes}
                              </td>
                              <td style={{ ...styles.td, textAlign: "center" }}>
                                {m.executives}
                              </td>
                              <td
                                style={{
                                  ...styles.td,
                                  textAlign: "right",
                                  color: C.positive,
                                }}
                              >
                                {fmt(m.income)}
                              </td>
                              <td
                                style={{
                                  ...styles.td,
                                  textAlign: "right",
                                  fontWeight: 600,
                                }}
                              >
                                {fmt(m.profit)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Top Clients & Routes (global) */}
                {allComparativeQuotes.length > 0 && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 16,
                      marginBottom: 20,
                    }}
                  >
                    <div style={{ ...styles.card, overflow: "hidden" }}>
                      <div
                        style={{
                          padding: "14px 20px",
                          borderBottom: `1px solid ${C.border}`,
                        }}
                      >
                        <div style={styles.sectionTitle}>
                          {t("executiveReporting.quotes.sectionTopClientsGlobal")}
                        </div>
                      </div>
                      <div style={{ overflowY: "auto", maxHeight: 400 }}>
                        <table
                          style={{ width: "100%", borderCollapse: "collapse" }}
                        >
                          <thead>
                            <tr>
                              <th style={{ ...styles.th, width: 32 }}>#</th>
                              <th style={styles.th}>{t("executiveReporting.shared.thClient")}</th>
                              <th style={{ ...styles.th, textAlign: "center" }}>
                                {t("executiveReporting.shared.thQuotes")}
                              </th>
                              <th style={{ ...styles.th, textAlign: "right" }}>
                                {t("executiveReporting.shared.thIncome")}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {getTopConsignees(allComparativeQuotes, 10).map(
                              (c, i) => (
                                <tr key={i}>
                                  <td
                                    style={{
                                      ...styles.td,
                                      color: C.textLight,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {i + 1}
                                  </td>
                                  <td
                                    style={{
                                      ...styles.td,
                                      fontWeight: 500,
                                      maxWidth: 200,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {c.name}
                                  </td>
                                  <td
                                    style={{
                                      ...styles.td,
                                      textAlign: "center",
                                    }}
                                  >
                                    {c.count}
                                  </td>
                                  <td
                                    style={{
                                      ...styles.td,
                                      textAlign: "right",
                                      color: C.positive,
                                    }}
                                  >
                                    {fmt(c.income)}
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div style={{ ...styles.card, overflow: "hidden" }}>
                      <div
                        style={{
                          padding: "14px 20px",
                          borderBottom: `1px solid ${C.border}`,
                        }}
                      >
                        <div style={styles.sectionTitle}>
                          {t("executiveReporting.quotes.sectionTopRoutesGlobal")}
                        </div>
                      </div>
                      <div style={{ overflowY: "auto", maxHeight: 400 }}>
                        <table
                          style={{ width: "100%", borderCollapse: "collapse" }}
                        >
                          <thead>
                            <tr>
                              <th style={{ ...styles.th, width: 32 }}>#</th>
                              <th style={styles.th}>{t("executiveReporting.shared.thRoute")}</th>
                              <th style={{ ...styles.th, textAlign: "center" }}>
                                {t("executiveReporting.shared.thQuotes")}
                              </th>
                              <th style={{ ...styles.th, textAlign: "right" }}>
                                {t("executiveReporting.shared.thIncome")}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {getTopRoutes(allComparativeQuotes, 10).map(
                              (r, i) => (
                                <tr key={i}>
                                  <td
                                    style={{
                                      ...styles.td,
                                      color: C.textLight,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {i + 1}
                                  </td>
                                  <td style={{ ...styles.td, fontWeight: 500 }}>
                                    {r.route}
                                  </td>
                                  <td
                                    style={{
                                      ...styles.td,
                                      textAlign: "center",
                                    }}
                                  >
                                    {r.count}
                                  </td>
                                  <td
                                    style={{
                                      ...styles.td,
                                      textAlign: "right",
                                      color: C.positive,
                                    }}
                                  >
                                    {fmt(r.income)}
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

          {!hasSearchedComparative && !loadingComparative && (
            <EmptyState
              title={t("executiveReporting.quotes.emptyComparativeTitle")}
              sub={t("executiveReporting.quotes.emptyComparativeSub")}
            />
          )}
        </>
      )}

      {/* ══════════════════════════════════════
          DOBLE TAB
         ══════════════════════════════════════ */}
      {activeTab === "doble" && (
        <>
          {/* Filters */}
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
                <label style={styles.label}>{t("executiveReporting.shared.filters.executive1")}</label>
                <select
                  value={ejecutivo1}
                  onChange={(e) => setEjecutivo1(e.target.value)}
                  disabled={loadingEjecutivos}
                  style={selectStyle}
                >
                  <option value="">{t("executiveReporting.shared.filters.select")}</option>
                  {ejecutivos.map((ej) => (
                    <option key={ej.id} value={ej.nombre}>
                      {ej.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: "1 1 180px" }}>
                <label style={styles.label}>{t("executiveReporting.shared.filters.executive2")}</label>
                <select
                  value={ejecutivo2}
                  onChange={(e) => setEjecutivo2(e.target.value)}
                  disabled={loadingEjecutivos}
                  style={selectStyle}
                >
                  <option value="">{t("executiveReporting.shared.filters.select")}</option>
                  {ejecutivos
                    .filter((e) => e.nombre !== ejecutivo1)
                    .map((ej) => (
                      <option key={ej.id} value={ej.nombre}>
                        {ej.nombre}
                      </option>
                    ))}
                </select>
              </div>
              <PeriodPresetSelect
                value={doublePreset}
                onChange={setDoublePreset}
              />
              <div style={{ flex: "0 1 150px" }}>
                <label style={styles.label}>{t("executiveReporting.shared.filters.from")}</label>
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
                <label style={styles.label}>{t("executiveReporting.shared.filters.to")}</label>
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
                  onClick={fetchDoubleComparison}
                  disabled={loadingDouble || !ejecutivo1 || !ejecutivo2}
                  style={{
                    ...btnPrimary,
                    opacity:
                      loadingDouble || !ejecutivo1 || !ejecutivo2 ? 0.5 : 1,
                  }}
                >
                  {loadingDouble ? t("executiveReporting.shared.buttons.comparing") : t("executiveReporting.shared.buttons.compare")}
                </button>
              </div>
            </div>
          </div>

          {errorDouble && <ErrorBanner message={errorDouble} />}

          {loadingDouble && <DoubleComparisonSkeleton />}

          {hasSearchedDouble && !loadingDouble && doubleData.length === 2 && (
            <>
              <DataSourceBanner
                count={allDoubleQuotes.length}
                fetchedAt={doubleFetchedAt}
                salesRep={`${doubleData[0].nombre} vs ${doubleData[1].nombre}`}
              />

              {/* Side-by-side comparison table */}
              <div
                style={{ ...styles.card, marginBottom: 20, overflow: "hidden" }}
              >
                <div
                  style={{
                    padding: "14px 20px",
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  <div style={styles.sectionTitle}>
                    {doubleData[0].nombre} vs {doubleData[1].nombre}
                  </div>
                </div>
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
                      {doubleMetrics.map((row, i) => {
                        const delta = row.v1 - row.v2;
                        const deltaColor =
                          delta > 0
                            ? C.positive
                            : delta < 0
                              ? C.negative
                              : C.textMuted;
                        return (
                          <tr
                            key={row.label}
                            style={{
                              backgroundColor: i % 2 === 0 ? C.white : C.bg,
                            }}
                          >
                            <td style={{ ...styles.td, fontWeight: 600 }}>
                              {row.label}
                            </td>
                            <td
                              style={{
                                ...styles.td,
                                textAlign: "right",
                                fontWeight: 600,
                              }}
                            >
                              {row.format(row.v1)}
                            </td>
                            <td
                              style={{
                                ...styles.td,
                                textAlign: "right",
                                fontWeight: 600,
                              }}
                            >
                              {row.format(row.v2)}
                            </td>
                            <td
                              style={{
                                ...styles.td,
                                textAlign: "right",
                                color: deltaColor,
                                fontWeight: 600,
                                fontSize: 12,
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
              </div>

              {/* Charts */}
              <div style={{ marginBottom: 20 }}>
                <ChartExecutivo type="doble" doubleData={doubleData} />
              </div>

              {doubleMonthlyComparison.length > 0 && (
                <div
                  style={{
                    ...styles.card,
                    marginBottom: 20,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "14px 20px",
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    <div style={styles.sectionTitle}>
                      {t("executiveReporting.quotes.sectionMonthlyCompare")} · {doubleData[0].nombre} vs{" "}
                      {doubleData[1].nombre}
                    </div>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr>
                          <th style={styles.th}>{t("executiveReporting.shared.thMonth")}</th>
                          <th style={{ ...styles.th, textAlign: "center" }}>
                            {doubleData[0].nombre} · {t("executiveReporting.shared.thQuotes")}
                          </th>
                          <th style={{ ...styles.th, textAlign: "center" }}>
                            {doubleData[1].nombre} · {t("executiveReporting.shared.thQuotes")}
                          </th>
                          <th style={{ ...styles.th, textAlign: "right" }}>
                            {doubleData[0].nombre} · {t("executiveReporting.shared.thProfit")}
                          </th>
                          <th style={{ ...styles.th, textAlign: "right" }}>
                            {doubleData[1].nombre} · {t("executiveReporting.shared.thProfit")}
                          </th>
                          <th style={{ ...styles.th, textAlign: "right" }}>
                            Δ {t("executiveReporting.shared.thProfit")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {doubleMonthlyComparison.map((row, i) => {
                          const delta =
                            row.executive1Profit - row.executive2Profit;
                          const deltaColor =
                            delta > 0
                              ? C.positive
                              : delta < 0
                                ? C.negative
                                : C.textMuted;
                          return (
                            <tr
                              key={row.month}
                              style={{
                                backgroundColor: i % 2 === 0 ? C.white : C.bg,
                              }}
                            >
                              <td style={{ ...styles.td, fontWeight: 600 }}>
                                {row.label}
                              </td>
                              <td style={{ ...styles.td, textAlign: "center" }}>
                                {row.executive1Quotes}
                              </td>
                              <td style={{ ...styles.td, textAlign: "center" }}>
                                {row.executive2Quotes}
                              </td>
                              <td
                                style={{
                                  ...styles.td,
                                  textAlign: "right",
                                  fontWeight: 600,
                                }}
                              >
                                {fmt(row.executive1Profit)}
                              </td>
                              <td
                                style={{
                                  ...styles.td,
                                  textAlign: "right",
                                  fontWeight: 600,
                                }}
                              >
                                {fmt(row.executive2Profit)}
                              </td>
                              <td
                                style={{
                                  ...styles.td,
                                  textAlign: "right",
                                  color: deltaColor,
                                  fontWeight: 600,
                                }}
                              >
                                {delta > 0 ? "+" : ""}
                                {fmt(delta)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Top Clients & Routes (combined) */}
              {allDoubleQuotes.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                    marginBottom: 20,
                  }}
                >
                  <div style={{ ...styles.card, overflow: "hidden" }}>
                    <div
                      style={{
                        padding: "14px 20px",
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      <div style={styles.sectionTitle}>
                        {t("executiveReporting.quotes.sectionTopClients")}
                      </div>
                    </div>
                    <div style={{ overflowY: "auto", maxHeight: 400 }}>
                      <table
                        style={{ width: "100%", borderCollapse: "collapse" }}
                      >
                        <thead>
                          <tr>
                            <th style={{ ...styles.th, width: 32 }}>#</th>
                            <th style={styles.th}>{t("executiveReporting.shared.thClient")}</th>
                            <th style={{ ...styles.th, textAlign: "center" }}>
                              {t("executiveReporting.shared.thQuotes")}
                            </th>
                            <th style={{ ...styles.th, textAlign: "right" }}>
                              {t("executiveReporting.shared.thIncome")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {getTopConsignees(allDoubleQuotes, 10).map((c, i) => (
                            <tr key={i}>
                              <td
                                style={{
                                  ...styles.td,
                                  color: C.textLight,
                                  fontWeight: 600,
                                }}
                              >
                                {i + 1}
                              </td>
                              <td
                                style={{
                                  ...styles.td,
                                  fontWeight: 500,
                                  maxWidth: 200,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {c.name}
                              </td>
                              <td style={{ ...styles.td, textAlign: "center" }}>
                                {c.count}
                              </td>
                              <td
                                style={{
                                  ...styles.td,
                                  textAlign: "right",
                                  color: C.positive,
                                }}
                              >
                                {fmt(c.income)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div style={{ ...styles.card, overflow: "hidden" }}>
                    <div
                      style={{
                        padding: "14px 20px",
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      <div style={styles.sectionTitle}>
                        {t("executiveReporting.quotes.sectionTopRoutes")}
                      </div>
                    </div>
                    <div style={{ overflowY: "auto", maxHeight: 400 }}>
                      <table
                        style={{ width: "100%", borderCollapse: "collapse" }}
                      >
                        <thead>
                          <tr>
                            <th style={{ ...styles.th, width: 32 }}>#</th>
                            <th style={styles.th}>{t("executiveReporting.shared.thRoute")}</th>
                            <th style={{ ...styles.th, textAlign: "center" }}>
                              {t("executiveReporting.shared.thQuotes")}
                            </th>
                            <th style={{ ...styles.th, textAlign: "right" }}>
                              {t("executiveReporting.shared.thIncome")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {getTopRoutes(allDoubleQuotes, 10).map((r, i) => (
                            <tr key={i}>
                              <td
                                style={{
                                  ...styles.td,
                                  color: C.textLight,
                                  fontWeight: 600,
                                }}
                              >
                                {i + 1}
                              </td>
                              <td style={{ ...styles.td, fontWeight: 500 }}>
                                {r.route}
                              </td>
                              <td style={{ ...styles.td, textAlign: "center" }}>
                                {r.count}
                              </td>
                              <td
                                style={{
                                  ...styles.td,
                                  textAlign: "right",
                                  color: C.positive,
                                }}
                              >
                                {fmt(r.income)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {!hasSearchedDouble && !loadingDouble && (
            <EmptyState
              title={t("executiveReporting.quotes.emptyDoubleTitle")}
              sub={t("executiveReporting.quotes.emptyDoubleSub")}
            />
          )}
        </>
      )}
    </div>
  );
}

export default ReportExecutive;
