import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import LoadingTips from "@/components/cliente/embarques/LoadingTips";
import { useTranslation } from "react-i18next";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "@/components/cliente/styles/ReporteriaOperacional.css";
import { linbisFetch } from "@/services/linbisFetch";
import { buildLinbisListParams } from "@/services/linbisListFetch";
import {
  matchesConsigneeName,
  normalizeShipmentKey,
} from "@/utils/linbisClientFilter";

/* ============================================================
   TYPES
   ============================================================ */
interface OutletContext {
  accessToken: string;
  refreshAccessToken: () => Promise<string>;
  onLogout: () => void;
}

interface Shipment {
  id?: number;
  number?: string;
  createdOn?: string;
  updateOn?: string;
  departure?: string;
  arrival?: string;
  origin?: string;
  destination?: string;
  modeOfTransportation?: string;
  currentFlow?: string;
  totalCargo_Pieces?: number;
  totalCargo_WeightValue?: number;
  totalCargo_VolumeWeightValue?: number;
  shipper?: string;
  consignee?: string;
  moduleType?: string;
}

type TransportMode = "air" | "sea" | "ground" | "other";

/* ============================================================
   CONSTANTS
   ============================================================ */
const SHIPMENTS_ALL_URL = "https://api.linbis.com/shipments/all";
/** v2: el endpoint /shipments/all ignora Page e ItemsPerPage; no paginar. */
const CACHE_KEY_PREFIX = "shipmentsCache_v2_";
const LEGACY_CACHE_PREFIX = "shipmentsCache_";
const CACHE_TTL_MS = 60 * 60 * 1000;
const CHART_STROKE = "#374151";
const CHART_FILL = "#9ca3af";

/* ============================================================
   HELPERS
   ============================================================ */
function isAirShipment(mode?: string): boolean {
  if (!mode) return false;
  const m = mode.toLowerCase();
  return m.includes("40 - air") || m.includes("41 - air");
}

function isSeaShipment(mode?: string): boolean {
  if (!mode) return false;
  const m = mode.toLowerCase();
  return m.includes("10 - vessel") || m.includes("11 - vessel");
}

function isGroundShipment(mode?: string): boolean {
  if (!mode) return false;
  const m = mode.toLowerCase();
  return m.includes("30 - truck") || m.includes("terrestre");
}

function getTransportMode(mode?: string): TransportMode {
  if (isAirShipment(mode)) return "air";
  if (isSeaShipment(mode)) return "sea";
  if (isGroundShipment(mode)) return "ground";
  return "other";
}

function getModeLabelI18n(
  mode: TransportMode,
  t: (key: string) => string,
): string {
  const map: Record<TransportMode, string> = {
    air: t("reportOperational.modeAir"),
    sea: t("reportOperational.modeSea"),
    ground: t("reportOperational.modeGround"),
    other: t("reportOperational.modeOther"),
  };
  return map[mode];
}

function fmtNumber(n: number, decimals = 0): string {
  return new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(n);
}

/** Linbis dataset dates often arrive as MM/DD/YYYY. */
function parseLinbisDate(value?: string | null): Date | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  if (us) {
    const month = Number(us[1]);
    const day = Number(us[2]);
    const year = Number(us[3]);
    const d = new Date(year, month - 1, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function shipmentTimestamp(s: Shipment): number {
  return (
    parseLinbisDate(s.createdOn)?.getTime() ??
    parseLinbisDate(s.updateOn)?.getTime() ??
    parseLinbisDate(s.departure)?.getTime() ??
    0
  );
}

function fmtDate(d?: string): string {
  const date = parseLinbisDate(d);
  if (!date) return "\u2014";
  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function shortenLocation(loc: string): string {
  let s = loc
    .replace(/International Airport/gi, "")
    .replace(/Airport/gi, "")
    .replace(/Arturo Merino Benitez/gi, "")
    .replace(/Executive\/Airport/gi, "")
    .trim();
  if (s.length > 32) s = `${s.substring(0, 32)}\u2026`;
  return s;
}

function cacheKey(username: string): string {
  return `${CACHE_KEY_PREFIX}${username}`;
}

function clearLegacyCache(username: string) {
  const legacy = `${LEGACY_CACHE_PREFIX}${username}`;
  localStorage.removeItem(legacy);
  localStorage.removeItem(`${legacy}_ts`);
  localStorage.removeItem(`${legacy}_page`);
}

function parseCachedShipments(raw: string): Shipment[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as Shipment[];
  } catch {
    return null;
  }
}

function endOfDay(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d;
}

function isValidDateInput(value: string): boolean {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

function shipmentIdentity(s: Shipment): string | null {
  if (typeof s.id === "number" && Number.isFinite(s.id)) return `id:${s.id}`;
  const number = normalizeShipmentKey(s.number);
  return number ? `num:${number}` : null;
}

/** Una sola respuesta: /shipments/all ignora Page/ItemsPerPage y repite el set completo. */
function normalizeShipmentsForConsignee(
  records: unknown[],
  consigneeName: string,
): Shipment[] {
  const seen = new Set<string>();
  const list: Shipment[] = [];

  for (const record of records) {
    if (!record || typeof record !== "object") continue;
    const raw = record as Shipment;
    if (!matchesConsigneeName(raw.consignee, consigneeName)) continue;

    const key = shipmentIdentity(raw);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    list.push(raw);
  }

  return list.sort((a, b) => shipmentTimestamp(b) - shipmentTimestamp(a));
}

async function fetchAllShipmentsByConsignee(
  consigneeName: string,
  accessToken: string,
  refreshAccessToken: () => Promise<string>,
  signal?: AbortSignal,
): Promise<Shipment[]> {
  const name = consigneeName.trim();
  if (!name) {
    throw new Error("ConsigneeName es obligatorio para consultar operaciones.");
  }

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  // Page=1 solo por compatibilidad con el contrato OpenAPI; Linbis devuelve el set completo.
  const params = buildLinbisListParams(name, 1);
  const res = await linbisFetch(
    `${SHIPMENTS_ALL_URL}?${params}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      signal,
    },
    accessToken,
    refreshAccessToken,
  );

  if (!res.ok) {
    throw new Error(`Error ${res.status}: ${res.statusText}`);
  }

  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("Respuesta inesperada de Linbis (se esperaba un listado).");
  }

  return normalizeShipmentsForConsignee(data, name);
}

/* ============================================================
   COMPONENT
   ============================================================ */
function ShipmentsView() {
  const { accessToken, refreshAccessToken } = useOutletContext<OutletContext>();
  const { activeUsername } = useAuth();
  const { t } = useTranslation();

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateFilterError, setDateFilterError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const persistCache = useCallback(
    (list: Shipment[], username: string) => {
      const ck = cacheKey(username);
      try {
        localStorage.setItem(ck, JSON.stringify(list));
        localStorage.setItem(`${ck}_ts`, Date.now().toString());
      } catch {
        // Quota / private mode: continue without cache.
      }
    },
    [],
  );

  const clearCache = useCallback((username: string) => {
    const ck = cacheKey(username);
    localStorage.removeItem(ck);
    localStorage.removeItem(`${ck}_ts`);
    clearLegacyCache(username);
  }, []);

  const loadShipments = useCallback(
    async (opts?: { force?: boolean }) => {
      if (!accessToken || !activeUsername) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      clearLegacyCache(activeUsername);

      try {
        if (!opts?.force) {
          const ck = cacheKey(activeUsername);
          const cached = localStorage.getItem(ck);
          const ts = localStorage.getItem(`${ck}_ts`);
          if (cached && ts) {
            const age = Date.now() - Number.parseInt(ts, 10);
            if (!Number.isNaN(age) && age < CACHE_TTL_MS) {
              const parsed = parseCachedShipments(cached);
              if (parsed) {
                // Re-normalize por si el cache quedó con duplicados.
                const cleaned = normalizeShipmentsForConsignee(
                  parsed,
                  activeUsername,
                );
                setShipments(cleaned);
                setLoading(false);
                return;
              }
            }
            clearCache(activeUsername);
          }
        }

        const list = await fetchAllShipmentsByConsignee(
          activeUsername,
          accessToken,
          refreshAccessToken,
          controller.signal,
        );
        setShipments(list);
        persistCache(list, activeUsername);
      } catch (err) {
        if (
          (err instanceof DOMException && err.name === "AbortError") ||
          (err instanceof Error && err.name === "AbortError")
        ) {
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : t("reportOperational.unknownError"),
        );
      } finally {
        if (abortRef.current === controller) {
          setLoading(false);
        }
      }
    },
    [
      accessToken,
      activeUsername,
      refreshAccessToken,
      clearCache,
      persistCache,
      t,
    ],
  );

  useEffect(() => {
    void loadShipments();
    return () => {
      abortRef.current?.abort();
    };
  }, [loadShipments]);

  const refresh = () => {
    if (!activeUsername) return;
    clearCache(activeUsername);
    void loadShipments({ force: true });
  };

  const onStartDateChange = (value: string) => {
    if (!isValidDateInput(value)) {
      setDateFilterError(t("reportOperational.invalidDate"));
      return;
    }
    if (endDate && value && value > endDate) {
      setDateFilterError(t("reportOperational.invalidDateRange"));
      return;
    }
    setDateFilterError(null);
    setStartDate(value);
  };

  const onEndDateChange = (value: string) => {
    if (!isValidDateInput(value)) {
      setDateFilterError(t("reportOperational.invalidDate"));
      return;
    }
    if (startDate && value && value < startDate) {
      setDateFilterError(t("reportOperational.invalidDateRange"));
      return;
    }
    setDateFilterError(null);
    setEndDate(value);
  };

  const filtered = useMemo(() => {
    if (!startDate && !endDate) return shipments;
    return shipments.filter((s) => {
      const d = parseLinbisDate(s.createdOn) ?? parseLinbisDate(s.departure);
      if (!d) return false;
      if (startDate && endDate) {
        return d >= new Date(startDate) && d <= endOfDay(endDate);
      }
      if (startDate) return d >= new Date(startDate);
      if (endDate) return d <= endOfDay(endDate);
      return true;
    });
  }, [shipments, startDate, endDate]);

  const kpis = useMemo(() => {
    let air = 0;
    let sea = 0;
    let ground = 0;
    let pieces = 0;
    let weight = 0;
    let transitSum = 0;
    let transitCount = 0;

    for (const s of filtered) {
      const m = getTransportMode(s.modeOfTransportation);
      if (m === "air") air += 1;
      else if (m === "sea") sea += 1;
      else if (m === "ground") ground += 1;

      pieces += s.totalCargo_Pieces || 0;
      weight += s.totalCargo_WeightValue || 0;

      const dep = parseLinbisDate(s.departure);
      const arr = parseLinbisDate(s.arrival);
      if (dep && arr) {
        const days = (arr.getTime() - dep.getTime()) / 86400000;
        if (days > 0) {
          transitSum += days;
          transitCount += 1;
        }
      }
    }

    return {
      total: filtered.length,
      air,
      sea,
      ground,
      pieces,
      weight,
      avgTransit: transitCount > 0 ? transitSum / transitCount : 0,
    };
  }, [filtered]);

  const yearComp = useMemo(() => {
    const cy = new Date().getFullYear();
    const py = cy - 1;
    let curr = 0;
    let prev = 0;
    for (const s of filtered) {
      const d = parseLinbisDate(s.createdOn) ?? parseLinbisDate(s.departure);
      if (!d) continue;
      const y = d.getFullYear();
      if (y === cy) curr += 1;
      else if (y === py) prev += 1;
    }
    const growth = prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;
    return { curr, prev, growth, cy, py };
  }, [filtered]);

  const monthlyData = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of filtered) {
      const d = parseLinbisDate(s.createdOn) ?? parseLinbisDate(s.departure);
      if (!d) continue;
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(k, (map.get(k) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({
        month: new Date(`${month}-01`).toLocaleDateString("es-CL", {
          month: "short",
          year: "2-digit",
        }),
        Total: total,
      }));
  }, [filtered]);

  const modeShare = useMemo(() => {
    const rows: { mode: TransportMode; count: number }[] = [
      { mode: "air", count: kpis.air },
      { mode: "sea", count: kpis.sea },
      { mode: "ground", count: kpis.ground },
    ];
    return rows
      .filter((r) => r.count > 0)
      .map((r) => ({
        ...r,
        pct: kpis.total > 0 ? (r.count / kpis.total) * 100 : 0,
      }));
  }, [kpis]);

  const topRoutes = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of filtered) {
      if (s.origin && s.destination) {
        const r = `${s.origin} \u2192 ${s.destination}`;
        map.set(r, (map.get(r) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([route, count]) => ({
        route: `${shortenLocation(route.split(" \u2192 ")[0])} \u2192 ${shortenLocation(route.split(" \u2192 ")[1])}`,
        fullRoute: route,
        count,
      }));
  }, [filtered]);

  const topDestinations = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of filtered) {
      if (s.destination) {
        map.set(s.destination, (map.get(s.destination) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }, [filtered]);

  const recent = useMemo(() => filtered.slice(0, 10), [filtered]);

  const exportCSV = useCallback(() => {
    const h = [
      t("reportOperational.csvNumber"),
      t("reportOperational.csvDate"),
      t("reportOperational.csvOrigin"),
      t("reportOperational.csvDestination"),
      t("reportOperational.csvMode"),
      t("reportOperational.csvPieces"),
      t("reportOperational.csvWeightKg"),
      t("reportOperational.csvVolume"),
    ];
    const rows = filtered.map((s) => [
      s.number || s.id || "",
      fmtDate(s.createdOn),
      s.origin || "",
      s.destination || "",
      getModeLabelI18n(getTransportMode(s.modeOfTransportation), t),
      s.totalCargo_Pieces || 0,
      s.totalCargo_WeightValue || 0,
      s.totalCargo_VolumeWeightValue || 0,
    ]);
    const csv = [
      h.join(","),
      ...rows.map((r) =>
        r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `reporte_operacional_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [filtered, t]);

  return (
    <div className="rop-container">
      <div className="rop-header">
        <div>
          <h1 className="rop-header__title">{t("reportOperational.title")}</h1>
          <p className="rop-header__subtitle">
            {t("reportOperational.subtitle")}
          </p>
        </div>
        <div className="rop-header__actions">
          <button
            type="button"
            className="rop-btn"
            onClick={exportCSV}
            disabled={filtered.length === 0 || loading}
          >
            {t("reportOperational.exportCSV")}
          </button>
          <button
            type="button"
            className="rop-btn rop-btn--primary"
            onClick={refresh}
            disabled={loading}
          >
            {loading
              ? t("reportOperational.loading")
              : t("reportOperational.refresh")}
          </button>
        </div>
      </div>

      <div className="rop-filters">
        <span className="rop-filters__label">
          {t("reportOperational.period")}
        </span>
        <input
          className="rop-filters__input"
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          aria-label={t("reportOperational.periodStart")}
        />
        <span className="rop-filters__sep">{"\u2014"}</span>
        <input
          className="rop-filters__input"
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          aria-label={t("reportOperational.periodEnd")}
        />
        {(startDate || endDate) && (
          <button
            type="button"
            className="rop-btn"
            onClick={() => {
              setStartDate("");
              setEndDate("");
              setDateFilterError(null);
            }}
          >
            {t("reportOperational.clear")}
          </button>
        )}
      </div>

      {dateFilterError && (
        <div className="rop-error" role="alert">
          <strong>{t("reportOperational.error")}</strong> {dateFilterError}
        </div>
      )}

      {error && (
        <div className="rop-error" role="alert">
          <strong>{t("reportOperational.error")}</strong> {error}
        </div>
      )}

      {loading && <LoadingTips variant="operational" />}

      {!loading && shipments.length > 0 && (
        <>
          <div className="rop-kpi-grid">
            <div className="rop-kpi">
              <div className="rop-kpi__label">
                {t("reportOperational.kpiTotalShipments")}
              </div>
              <div className="rop-kpi__value">{fmtNumber(kpis.total)}</div>
              {(yearComp.prev > 0 || yearComp.curr > 0) && (
                <div className="rop-kpi__change">
                  {yearComp.prev > 0 ? (
                    <>
                      {yearComp.growth >= 0 ? "+" : ""}
                      {yearComp.growth.toFixed(1)}%{" "}
                      {t("reportOperational.vsYearWithCount", {
                        year: yearComp.py,
                        count: fmtNumber(yearComp.prev),
                      })}
                    </>
                  ) : (
                    t("reportOperational.noPriorYearShipments", {
                      year: yearComp.py,
                    })
                  )}
                </div>
              )}
              <div className="rop-kpi__sub">
                {t("reportOperational.kpiTotalShipmentsHint", {
                  year: yearComp.cy,
                  count: fmtNumber(yearComp.curr),
                })}
              </div>
            </div>
            <div className="rop-kpi">
              <div className="rop-kpi__label">
                {t("reportOperational.kpiAir")}
              </div>
              <div className="rop-kpi__value">{fmtNumber(kpis.air)}</div>
              <div className="rop-kpi__sub">
                {kpis.total > 0
                  ? ((kpis.air / kpis.total) * 100).toFixed(1)
                  : 0}
                % {t("reportOperational.ofTotal")}
              </div>
            </div>
            <div className="rop-kpi">
              <div className="rop-kpi__label">
                {t("reportOperational.kpiSea")}
              </div>
              <div className="rop-kpi__value">{fmtNumber(kpis.sea)}</div>
              <div className="rop-kpi__sub">
                {kpis.total > 0
                  ? ((kpis.sea / kpis.total) * 100).toFixed(1)
                  : 0}
                % {t("reportOperational.ofTotal")}
              </div>
            </div>
            <div className="rop-kpi">
              <div className="rop-kpi__label">
                {t("reportOperational.kpiGround")}
              </div>
              <div className="rop-kpi__value">{fmtNumber(kpis.ground)}</div>
              <div className="rop-kpi__sub">
                {kpis.total > 0
                  ? ((kpis.ground / kpis.total) * 100).toFixed(1)
                  : 0}
                % {t("reportOperational.ofTotal")}
              </div>
            </div>
            <div className="rop-kpi">
              <div className="rop-kpi__label">
                {t("reportOperational.kpiTotalPieces")}
              </div>
              <div className="rop-kpi__value">{fmtNumber(kpis.pieces)}</div>
              <div className="rop-kpi__sub">
                {t("reportOperational.kpiTotalPiecesHint")}
              </div>
            </div>
            <div className="rop-kpi">
              <div className="rop-kpi__label">
                {t("reportOperational.kpiTotalWeight")}
              </div>
              <div className="rop-kpi__value">
                {fmtNumber(Math.round(kpis.weight))}
              </div>
              <div className="rop-kpi__sub">
                {t("reportOperational.kpiTotalWeightHint")}
              </div>
            </div>
            <div className="rop-kpi">
              <div className="rop-kpi__label">
                {t("reportOperational.kpiAvgTransit")}
              </div>
              <div className="rop-kpi__value">
                {kpis.avgTransit > 0
                  ? fmtNumber(kpis.avgTransit, 1)
                  : "\u2014"}
              </div>
              <div className="rop-kpi__sub">
                {t("reportOperational.kpiAvgTransitHint")}
              </div>
            </div>
            <div className="rop-kpi">
              <div className="rop-kpi__label">
                {t("reportOperational.panelYearComparison")}
              </div>
              <div className="rop-kpi__value">
                {fmtNumber(yearComp.curr)}
                <span className="rop-kpi__muted">
                  {" "}
                  / {fmtNumber(yearComp.prev)}
                </span>
              </div>
              <div className="rop-kpi__sub">
                {t("reportOperational.panelYearComparisonHint", {
                  currentYear: yearComp.cy,
                  previousYear: yearComp.py,
                })}
              </div>
            </div>
          </div>

          <div className="rop-panel">
            <div className="rop-panel__title">
              {t("reportOperational.panelMonthlyTrend")}
            </div>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={monthlyData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f3f4f6"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 6,
                      fontSize: "0.8125rem",
                    }}
                    formatter={(value) => [
                      value,
                      t("reportOperational.tooltipShipments"),
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="Total"
                    name={t("reportOperational.tooltipShipments")}
                    stroke={CHART_STROKE}
                    fill={CHART_FILL}
                    fillOpacity={0.18}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="rop-empty__subtitle">
                {t("reportOperational.emptyNoRecent")}
              </p>
            )}
          </div>

          <div className="rop-panel__row">
            <div className="rop-panel">
              <div className="rop-panel__title">
                {t("reportOperational.panelModeDistribution")}
              </div>
              {modeShare.length > 0 ? (
                <ul className="rop-share-list">
                  {modeShare.map((row) => (
                    <li key={row.mode} className="rop-share-item">
                      <div className="rop-share-item__head">
                        <span>{getModeLabelI18n(row.mode, t)}</span>
                        <span>
                          {fmtNumber(row.count)} ({row.pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="rop-share-item__track">
                        <div
                          className="rop-share-item__fill"
                          style={{ width: `${Math.min(row.pct, 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rop-empty__subtitle">
                  {t("reportOperational.emptyNoRecent")}
                </p>
              )}
            </div>

            <div className="rop-panel">
              <div className="rop-panel__title">
                {t("reportOperational.panelTop5Destinations")}
              </div>
              {topDestinations.length > 0 ? (
                <ul className="rop-rank-list">
                  {topDestinations.map(([dest, count], i) => (
                    <li key={dest} className="rop-rank-item">
                      <div className="rop-rank-item__left">
                        <span className="rop-rank-item__pos">{i + 1}</span>
                        <span className="rop-rank-item__name" title={dest}>
                          {shortenLocation(dest)}
                        </span>
                      </div>
                      <span className="rop-rank-item__count">{count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rop-empty__subtitle">
                  {t("reportOperational.emptyNoRecent")}
                </p>
              )}
            </div>
          </div>

          <div className="rop-panel">
            <div className="rop-panel__title">
              {t("reportOperational.panelTopRoutes")}
            </div>
            {topRoutes.length > 0 ? (
              <ul className="rop-rank-list">
                {topRoutes.map((r, i) => (
                  <li key={r.fullRoute} className="rop-rank-item">
                    <div className="rop-rank-item__left">
                      <span className="rop-rank-item__pos">{i + 1}</span>
                      <span className="rop-rank-item__name" title={r.fullRoute}>
                        {r.route}
                      </span>
                    </div>
                    <span className="rop-rank-item__count">{r.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rop-empty__subtitle">
                {t("reportOperational.emptyNoRecent")}
              </p>
            )}
          </div>

          <div className="rop-panel">
            <div className="rop-panel__title">
              {t("reportOperational.panelLast10")}
            </div>
            <div className="rop-table-wrap">
              <table className="rop-table">
                <thead>
                  <tr>
                    <th>{t("reportOperational.thOpNumber")}</th>
                    <th>{t("reportOperational.thOrigin")}</th>
                    <th>{t("reportOperational.thDestination")}</th>
                    <th>{t("reportOperational.thMode")}</th>
                    <th>{t("reportOperational.thPieces")}</th>
                    <th>{t("reportOperational.thWeightKg")}</th>
                    <th>{t("reportOperational.thDate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((s, i) => {
                    const mode = getTransportMode(s.modeOfTransportation);
                    return (
                      <tr key={s.id ?? `${s.number ?? "op"}-${i}`}>
                        <td className="rop-table__number">
                          {s.number || `OP-${s.id ?? i}`}
                        </td>
                        <td>{s.origin || "\u2014"}</td>
                        <td>{s.destination || "\u2014"}</td>
                        <td>
                          <span className="rop-table__badge">
                            {getModeLabelI18n(mode, t)}
                          </span>
                        </td>
                        <td>{s.totalCargo_Pieces || "\u2014"}</td>
                        <td>
                          {s.totalCargo_WeightValue
                            ? fmtNumber(s.totalCargo_WeightValue, 1)
                            : "\u2014"}
                        </td>
                        <td>{fmtDate(s.createdOn)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {recent.length === 0 && (
              <p className="rop-empty__subtitle">
                {t("reportOperational.emptyNoRecent")}
              </p>
            )}
          </div>

          <div className="rop-footer">
            <span className="rop-footer__count">
              <strong>{fmtNumber(shipments.length)}</strong>{" "}
              {t("reportOperational.footerOpsLoaded")}{" "}
              {t("reportOperational.footerAll")}
              {(startDate || endDate) && (
                <>
                  {" · "}
                  <strong>{fmtNumber(filtered.length)}</strong>{" "}
                  {t("reportOperational.footerInPeriod")}
                </>
              )}
            </span>
          </div>
        </>
      )}

      {!loading && shipments.length === 0 && !error && (
        <div className="rop-empty">
          <p className="rop-empty__title">
            {t("reportOperational.emptyTitle")}
          </p>
          <p className="rop-empty__subtitle">
            {t("reportOperational.emptySubtitle")}
          </p>
        </div>
      )}
    </div>
  );
}

export default ShipmentsView;
