import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "react-bootstrap";
import {
  fetchBrowsableRatesCached,
  listCountriesFromRows,
  listDestinationsFromRows,
  listOriginCitiesFromRows,
  type BrowsableRateRow,
  type BrowsableRatesSnapshot,
} from "../../quotes/Handlers/shared/buildBrowsableRates";
import { clearCachedBrowsableRates } from "../../quotes/Handlers/shared/browsableRatesCache";
import {
  filterBrowsableRows,
  findMatchingRateRow,
  locationNormsMatch,
  type BrowsableRateFilters,
} from "../../quotes/Handlers/shared/popularRouteMatching";
import {
  computeAirPopularRoutes,
  computeOceanPopularRoutes,
  popularRouteKey,
  type PopularRouteStat,
} from "../../quotes/Handlers/shared/popularRouteStats";
import {
  COUNTRY_RATE_COLUMNS_AIR,
  COUNTRY_RATE_COLUMNS_FCL,
  COUNTRY_RATE_COLUMNS_LCL,
  getCountryRateCellValue,
  type CountryRateColumn,
  type CountryRateService,
} from "../../quotes/Handlers/shared/countryRatesTypes";
import { CountryRatesDownloadButton } from "../../quotes/Handlers/shared/CountryRatesDownloadButton";
import {
  fetchHistoricalExplorerSnapshot,
  type HistoricalExplorerSnapshot,
} from "../../quotes/Handlers/shared/historicalExplorerParse";
import type { AirResponse, OceanResponse } from "../shipsgo/types";
import { PriceHistoryExplorerChart } from "../priceHistory/PriceHistoryExplorerChart";
import "../../quotes/QuoteAIR.css";
import "../../quotes/Handlers/shared/CountryRatesDownload.css";
import "../styles/ConsultaTarifas.css";

const MODES: CountryRateService[] = ["air", "fcl", "lcl"];
const DEFAULT_ROWS_PER_PAGE = 15;
const ROWS_PER_PAGE_OPTIONS = [15, 25, 50] as const;

const API_BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:4000"
    : "https://portalclientes.seemanngroup.com";

const COLUMNS_BY_MODE: Record<CountryRateService, CountryRateColumn[]> = {
  air: COUNTRY_RATE_COLUMNS_AIR,
  fcl: COUNTRY_RATE_COLUMNS_FCL,
  lcl: COUNTRY_RATE_COLUMNS_LCL,
};

const TRANSLATION_NS_BY_MODE: Record<
  CountryRateService,
  "QuoteAIR" | "Quotefcl" | "Quotelcl"
> = {
  air: "QuoteAIR",
  fcl: "Quotefcl",
  lcl: "Quotelcl",
};

function isActiveRow(row: BrowsableRateRow): boolean {
  return row.validityState !== "expired";
}

async function fetchPopularRouteStats(): Promise<{
  air: PopularRouteStat[];
  ocean: PopularRouteStat[];
}> {
  try {
    const [airRes, oceanRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/shipsgo/shipments`),
      fetch(`${API_BASE_URL}/api/shipsgo/ocean/shipments`),
    ]);
    const air: PopularRouteStat[] = [];
    const ocean: PopularRouteStat[] = [];
    if (airRes.ok) {
      const data = (await airRes.json()) as AirResponse;
      air.push(...computeAirPopularRoutes(data.shipments ?? []));
    }
    if (oceanRes.ok) {
      const data = (await oceanRes.json()) as OceanResponse;
      ocean.push(...computeOceanPopularRoutes(data.shipments ?? []));
    }
    return { air, ocean };
  } catch {
    return { air: [], ocean: [] };
  }
}

function buildDownloadContext(
  downloadRows: BrowsableRateRow[],
  countries: { code: string; label: string }[],
  countryCode: string,
  destNorm: string,
  destinations: { norm: string; label: string }[],
  cities: { norm: string; label: string }[],
  originNorm: string,
) {
  if (downloadRows.length === 0) return null;
  const first = downloadRows[0];
  const country =
    countries.find((c) => c.code === (countryCode || first.countryCode)) ??
    (first.countryCode
      ? { code: first.countryCode, label: first.countryLabel }
      : null);
  const resolvedDestNorm = destNorm || first.destNorm;
  const destLabel =
    destinations.find((d) => d.norm === resolvedDestNorm)?.label ??
    downloadRows.find((r) => r.destNorm === resolvedDestNorm)?.destination;
  const originLabel =
    cities.find((c) => c.norm === originNorm)?.label ??
    downloadRows.find((r) => r.originNorm === originNorm)?.origin;
  if (!country || !resolvedDestNorm) return null;
  return {
    country,
    destNorm: resolvedDestNorm,
    destLabel,
    originLabel,
    rows: downloadRows,
  };
}

interface RatesTablePanelProps {
  mode: CountryRateService;
  title?: string;
  rows: BrowsableRateRow[];
  rowsPerPage: number;
  tablePage: number;
  onRowsPerPageChange: (n: number) => void;
  onTablePageChange: (page: number) => void;
  downloadContext: ReturnType<typeof buildDownloadContext>;
  onViewHistory: (row: BrowsableRateRow) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function RatesTablePanel({
  mode,
  title,
  rows,
  rowsPerPage,
  tablePage,
  onRowsPerPageChange,
  onTablePageChange,
  downloadContext,
  onViewHistory,
  t,
}: RatesTablePanelProps) {
  const columns = COLUMNS_BY_MODE[mode];
  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const paginatedRows = rows.slice(
    (tablePage - 1) * rowsPerPage,
    tablePage * rowsPerPage,
  );
  const rangeText =
    rows.length === 0
      ? "0 de 0"
      : `${(tablePage - 1) * rowsPerPage + 1}-${Math.min(tablePage * rowsPerPage, rows.length)} de ${rows.length}`;

  return (
    <div className="ct-maritime-section">
      {title ? <h3 className="ct-maritime-section__title">{title}</h3> : null}
      <div className="ct-toolbar">
        <span className="ct-results">
          {t("consultaTarifas.resultsCount", { count: rows.length })}
        </span>
        {downloadContext ? (
          <CountryRatesDownloadButton
            service={mode}
            countryCode={downloadContext.country.code}
            countryLabel={downloadContext.country.label}
            destinationLabel={downloadContext.destLabel}
            destinationCode={downloadContext.destNorm}
            selectedOriginLabel={downloadContext.originLabel}
            columns={columns}
            rows={downloadContext.rows}
            translationNs={TRANSLATION_NS_BY_MODE[mode]}
          />
        ) : null}
      </div>
      {rows.length === 0 ? (
        <div className="ct-empty ct-empty--inline">
          <p className="ct-empty__desc">{t("consultaTarifas.empty.title")}</p>
        </div>
      ) : (
        <div className="ct-table-panel">
          <div className="ct-table-wrap" role="region" tabIndex={0}>
            <table className="ct-table">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} className={`ct-th ct-th--${col.type}`}>
                      {col.label}
                    </th>
                  ))}
                  <th className="ct-th ct-th--actions">
                    {t("consultaTarifas.colActions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row) => {
                  const expired = row.validityState === "expired";
                  const expiringSoon = row.validityState === "expiring-soon";
                  return (
                    <tr
                      key={row.id}
                      className={`ct-tr${expired ? " ct-tr--expired" : ""}`}
                    >
                      {columns.map((col) => {
                        const value = getCountryRateCellValue(row, col);
                        if (col.key === "validUntil") {
                          return (
                            <td key={col.key} className="ct-td ct-td--validity">
                              <span className="ct-validity-date">{value}</span>
                              {expired && (
                                <span className="ct-badge ct-badge--expired">
                                  {t("consultaTarifas.expiredBadge")}
                                </span>
                              )}
                              {expiringSoon && (
                                <span className="ct-badge ct-badge--soon">
                                  {t("consultaTarifas.expiringSoonBadge")}
                                </span>
                              )}
                            </td>
                          );
                        }
                        return (
                          <td
                            key={col.key}
                            className={`ct-td ct-td--${col.type}`}
                          >
                            {value}
                          </td>
                        );
                      })}
                      <td className="ct-td ct-td--actions">
                        <button
                          type="button"
                          className="ct-link-btn"
                          onClick={() => onViewHistory(row)}
                        >
                          <i className="bi bi-graph-up-arrow me-1" aria-hidden />
                          {t("consultaTarifas.viewHistory")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="ct-table-footer">
            <div className="ct-table-footer__left" />
            <div className="ct-table-footer__right">
              <span className="ct-pagination-label">
                {t("consultaTarifas.rowsPerPage")}
              </span>
              <select
                className="ct-pagination-select"
                value={rowsPerPage}
                onChange={(e) => {
                  onRowsPerPageChange(Number(e.target.value));
                  onTablePageChange(1);
                }}
              >
                {ROWS_PER_PAGE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span className="ct-pagination-range">{rangeText}</span>
              <button
                type="button"
                className="ct-pagination-btn"
                disabled={tablePage <= 1}
                onClick={() => onTablePageChange(tablePage - 1)}
                aria-label={t("consultaTarifas.prevPage")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                className="ct-pagination-btn"
                disabled={tablePage >= totalPages}
                onClick={() => onTablePageChange(tablePage + 1)}
                aria-label={t("consultaTarifas.nextPage")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConsultaTarifas() {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<BrowsableRatesSnapshot | null>(null);
  const [history, setHistory] = useState<HistoricalExplorerSnapshot | null>(null);
  const [airPopularRoutes, setAirPopularRoutes] = useState<PopularRouteStat[]>([]);
  const [oceanPopularRoutes, setOceanPopularRoutes] = useState<PopularRouteStat[]>([]);

  const [activeMode, setActiveMode] = useState<CountryRateService>("air");
  const [countryCode, setCountryCode] = useState("");
  const [originNorm, setOriginNorm] = useState("");
  const [destNorm, setDestNorm] = useState("");
  const [tierKey, setTierKey] = useState("");
  const [includeExpired, setIncludeExpired] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [tablePage, setTablePage] = useState(1);
  const [fclTablePage, setFclTablePage] = useState(1);
  const [lclTablePage, setLclTablePage] = useState(1);
  const [selectedPopularRoute, setSelectedPopularRoute] =
    useState<PopularRouteStat | null>(null);
  const [popularPanelOpen, setPopularPanelOpen] = useState(false);
  const [chartRow, setChartRow] = useState<BrowsableRateRow | null>(null);

  const showDualMaritime = selectedPopularRoute?.mode === "ocean";

  const loadData = useCallback(
    async (forceRefresh = false) => {
      setLoading(true);
      setError(null);
      try {
        if (forceRefresh) clearCachedBrowsableRates();
        const [rates, hist, popular] = await Promise.all([
          fetchBrowsableRatesCached(forceRefresh),
          fetchHistoricalExplorerSnapshot().catch(() => null),
          fetchPopularRouteStats(),
        ]);
        setSnapshot(rates);
        setHistory(hist);
        setAirPopularRoutes(popular.air);
        setOceanPopularRoutes(popular.ocean);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("consultaTarifas.error"),
        );
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  const showTierFilter =
    activeMode !== "lcl" &&
    COLUMNS_BY_MODE[activeMode].filter((c) => c.type === "price").length > 1;

  const effectiveFilters: BrowsableRateFilters = useMemo(
    () => ({
      countryCode,
      originNorm,
      destNorm,
      includeExpired,
      tierKey,
      showTierFilter,
    }),
    [countryCode, originNorm, destNorm, includeExpired, tierKey, showTierFilter],
  );

  const modeRows = useMemo<BrowsableRateRow[]>(
    () => (snapshot ? snapshot[activeMode] : []),
    [snapshot, activeMode],
  );

  const rowsForFilterOptions = useMemo(() => {
    if (showDualMaritime && snapshot) return snapshot.fcl;
    return modeRows;
  }, [showDualMaritime, snapshot, modeRows]);

  const countries = useMemo(
    () => listCountriesFromRows(rowsForFilterOptions),
    [rowsForFilterOptions],
  );

  const rowsForCityOptions = useMemo(
    () =>
      countryCode
        ? rowsForFilterOptions.filter((r) => r.countryCode === countryCode)
        : rowsForFilterOptions,
    [rowsForFilterOptions, countryCode],
  );

  const cities = useMemo(
    () => listOriginCitiesFromRows(rowsForCityOptions),
    [rowsForCityOptions],
  );

  const rowsForDestOptions = useMemo(() => {
    let rows = rowsForCityOptions;
    if (originNorm) {
      rows = rows.filter((r) =>
        locationNormsMatch(
          showDualMaritime ? "fcl" : activeMode,
          r.originNorm,
          originNorm,
        ),
      );
    }
    return rows;
  }, [rowsForCityOptions, originNorm, activeMode, showDualMaritime]);

  const destinations = useMemo(
    () => listDestinationsFromRows(rowsForDestOptions),
    [rowsForDestOptions],
  );

  const filteredRows = useMemo(
    () => filterBrowsableRows(modeRows, activeMode, effectiveFilters),
    [modeRows, activeMode, effectiveFilters],
  );

  const filteredFclRows = useMemo(
    () =>
      snapshot
        ? filterBrowsableRows(snapshot.fcl, "fcl", {
          ...effectiveFilters,
          showTierFilter: true,
        })
        : [],
    [snapshot, effectiveFilters],
  );

  const filteredLclRows = useMemo(
    () =>
      snapshot
        ? filterBrowsableRows(snapshot.lcl, "lcl", {
          ...effectiveFilters,
          tierKey: "",
          showTierFilter: false,
        })
        : [],
    [snapshot, effectiveFilters],
  );

  const totalTablePages = Math.max(
    1,
    Math.ceil(filteredRows.length / rowsPerPage),
  );

  const paginatedRows = useMemo(() => {
    const start = (tablePage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, tablePage, rowsPerPage]);

  const paginationRangeText = useMemo(() => {
    if (filteredRows.length === 0) return "0 de 0";
    const start = (tablePage - 1) * rowsPerPage + 1;
    const end = Math.min(tablePage * rowsPerPage, filteredRows.length);
    return `${start}-${end} de ${filteredRows.length}`;
  }, [tablePage, rowsPerPage, filteredRows.length]);

  useEffect(() => {
    setTablePage(1);
    setFclTablePage(1);
    setLclTablePage(1);
  }, [
    activeMode,
    countryCode,
    originNorm,
    destNorm,
    tierKey,
    includeExpired,
    rowsPerPage,
    selectedPopularRoute,
  ]);

  useEffect(() => {
    if (tablePage > totalTablePages) setTablePage(totalTablePages);
  }, [tablePage, totalTablePages]);

  const clearPopularFilter = () => {
    setSelectedPopularRoute(null);
    setOriginNorm("");
    setDestNorm("");
    setCountryCode("");
  };

  const handleModeChange = (mode: CountryRateService) => {
    setActiveMode(mode);
    setCountryCode("");
    setOriginNorm("");
    setDestNorm("");
    setTierKey("");
    setSelectedPopularRoute(null);
  };

  const handleCountryChange = (code: string) => {
    setCountryCode(code);
    setOriginNorm("");
    setDestNorm("");
    setSelectedPopularRoute(null);
  };

  const handleCityChange = (norm: string) => {
    setOriginNorm(norm);
    setDestNorm("");
    setSelectedPopularRoute(null);
  };

  const handleDestChange = (norm: string) => {
    setDestNorm(norm);
    setSelectedPopularRoute(null);
  };

  const syncFiltersFromMatch = useCallback(
    (route: PopularRouteStat, match: BrowsableRateRow | undefined) => {
      if (match) {
        setCountryCode(match.countryCode);
        setOriginNorm(match.originNorm);
        setDestNorm(match.destNorm);
      } else {
        setOriginNorm(route.originNorm);
        setDestNorm(route.destNorm);
      }
    },
    [],
  );

  const selectPopularRoute = useCallback(
    (route: PopularRouteStat) => {
      setSelectedPopularRoute(route);
      setTierKey("");

      if (route.mode === "air") {
        setActiveMode("air");
        const match = snapshot
          ? findMatchingRateRow(snapshot.air, "air", route.originNorm, route.destNorm)
          : undefined;
        syncFiltersFromMatch(route, match);
      } else {
        const fclMatch = snapshot
          ? findMatchingRateRow(snapshot.fcl, "fcl", route.originNorm, route.destNorm)
          : undefined;
        const lclMatch = snapshot
          ? findMatchingRateRow(snapshot.lcl, "lcl", route.originNorm, route.destNorm)
          : undefined;
        syncFiltersFromMatch(route, fclMatch ?? lclMatch);
      }
    },
    [snapshot, syncFiltersFromMatch],
  );

  const handlePopularRouteFromPanel = useCallback(
    (route: PopularRouteStat) => {
      selectPopularRoute(route);
      setPopularPanelOpen(false);
    },
    [selectPopularRoute],
  );

  const closePopularPanel = useCallback(() => {
    setPopularPanelOpen(false);
  }, []);

  useEffect(() => {
    if (!popularPanelOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePopularPanel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [popularPanelOpen, closePopularPanel]);

  const downloadRows = useMemo(
    () => filteredRows.filter(isActiveRow),
    [filteredRows],
  );

  const downloadContext = useMemo(
    () =>
      buildDownloadContext(
        downloadRows,
        countries,
        countryCode,
        destNorm,
        destinations,
        cities,
        originNorm,
      ),
    [downloadRows, countries, countryCode, destNorm, destinations, cities, originNorm],
  );

  const fclDownloadContext = useMemo(
    () =>
      buildDownloadContext(
        filteredFclRows.filter(isActiveRow),
        listCountriesFromRows(snapshot?.fcl ?? []),
        countryCode,
        destNorm,
        listDestinationsFromRows(filteredFclRows),
        listOriginCitiesFromRows(filteredFclRows),
        originNorm,
      ),
    [filteredFclRows, snapshot, countryCode, destNorm, originNorm],
  );

  const lclDownloadContext = useMemo(
    () =>
      buildDownloadContext(
        filteredLclRows.filter(isActiveRow),
        listCountriesFromRows(snapshot?.lcl ?? []),
        countryCode,
        destNorm,
        listDestinationsFromRows(filteredLclRows),
        listOriginCitiesFromRows(filteredLclRows),
        originNorm,
      ),
    [filteredLclRows, snapshot, countryCode, destNorm, originNorm],
  );

  const chartBundle = useMemo(() => {
    if (!chartRow || !history) return null;
    return history.routes.find((r) => r.routeKey === chartRow.routeKey) ?? null;
  }, [chartRow, history]);

  const chartEntityLabel =
    chartRow?.mode === "lcl"
      ? t("priceHistoryExplorer.agent")
      : t("priceHistoryExplorer.carrier");

  const renderPopularRouteList = (
    routes: PopularRouteStat[],
    accent: string,
    emptyKey: string,
    onRouteClick: (route: PopularRouteStat) => void,
  ) => {
    if (routes.length === 0) {
      return <p className="ct-popular__empty">{t(emptyKey)}</p>;
    }
    const maxCount = routes[0]?.count ?? 1;
    return routes.map((route, i) => {
      const key = popularRouteKey(route);
      const pct = maxCount > 0 ? (route.count / maxCount) * 100 : 0;
      const isSelected =
        !!selectedPopularRoute && popularRouteKey(selectedPopularRoute) === key;
      return (
        <button
          key={key}
          type="button"
          className={`ct-popular-item${isSelected ? " ct-popular-item--active" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            onRouteClick(route);
          }}
          title={t("consultaTarifas.popularRoutes.clickHint")}
        >
          <span className="ct-popular-item__name">
            {i === 0 ? "1° " : `${i + 1}. `}
            {route.label}
          </span>
          <div className="ct-popular-item__bar-wrap">
            <div
              className="ct-popular-item__bar"
              style={{ width: `${pct}%`, background: accent }}
            />
          </div>
        </button>
      );
    });
  };

  if (loading) {
    return (
      <div className="ct-container">
        <header className="ct-header">
          <h1 className="ct-title">{t("consultaTarifas.title")}</h1>
          <p className="ct-subtitle">{t("consultaTarifas.subtitle")}</p>
        </header>
        <div className="ct-state" role="status" aria-live="polite">
          <span className="spinner-border" aria-hidden />
          <p className="ct-state__text">{t("consultaTarifas.loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="ct-container">
        <header className="ct-header">
          <h1 className="ct-title">{t("consultaTarifas.title")}</h1>
          <p className="ct-subtitle">{t("consultaTarifas.subtitle")}</p>
        </header>
        <div className="ct-state ct-state--error" role="alert">
          <i className="bi bi-exclamation-triangle" aria-hidden />
          <p className="ct-state__text">{error ?? t("consultaTarifas.error")}</p>
          <button
            type="button"
            className="qa-btn qa-btn-primary"
            onClick={() => void loadData(true)}
          >
            <i className="bi bi-arrow-clockwise me-1" aria-hidden />
            {t("consultaTarifas.retry")}
          </button>
        </div>
      </div>
    );
  }

  const columns = COLUMNS_BY_MODE[activeMode];

  return (
    <div className="ct-container">
      <header className="ct-header">
        <div className="ct-header__row">
          <div className="ct-header__text">
            <h1 className="ct-title">{t("consultaTarifas.title")}</h1>
            <p className="ct-subtitle">{t("consultaTarifas.subtitle")}</p>
          </div>
          <button
            type="button"
            className="ct-popular-trigger"
            aria-expanded={popularPanelOpen}
            aria-controls="ct-popular-accordion"
            onClick={(event) => {
              event.stopPropagation();
              setPopularPanelOpen(true);
            }}
          >
            <i className="bi bi-signpost-split" aria-hidden />
            {t("consultaTarifas.popularRoutes.openButton")}
          </button>
        </div>
      </header>

      {popularPanelOpen ? (
        <>
          <div
            className="ct-popular-overlay"
            aria-hidden
            onClick={closePopularPanel}
          />
          <div
            id="ct-popular-accordion"
            className="ct-popular-accordion"
            role="dialog"
            aria-modal="true"
            aria-label={t("consultaTarifas.popularRoutes.title")}
            onClick={closePopularPanel}
          >
            <div className="ct-popular-accordion__intro">
              <h2 className="ct-popular-accordion__title">
                {t("consultaTarifas.popularRoutes.title")}
              </h2>
              <p className="ct-popular-accordion__desc">
                {t("consultaTarifas.popularRoutes.desc")}
              </p>
            </div>
            <details open className="ct-popular-accordion__section">
              <summary className="ct-popular-accordion__summary ct-popular-accordion__summary--air">
                {t("consultaTarifas.popularRoutes.air")}
              </summary>
              <div className="ct-popular-accordion__body">
                {renderPopularRouteList(
                  airPopularRoutes,
                  "#0891b2",
                  "consultaTarifas.popularRoutes.emptyAir",
                  handlePopularRouteFromPanel,
                )}
              </div>
            </details>
            <details open className="ct-popular-accordion__section">
              <summary className="ct-popular-accordion__summary ct-popular-accordion__summary--ocean">
                {t("consultaTarifas.popularRoutes.ocean")}
              </summary>
              <div className="ct-popular-accordion__body">
                {renderPopularRouteList(
                  oceanPopularRoutes,
                  "#ff6200",
                  "consultaTarifas.popularRoutes.emptyOcean",
                  handlePopularRouteFromPanel,
                )}
              </div>
            </details>
          </div>
        </>
      ) : null}

      {!showDualMaritime && (
        <div className="ct-tabs" role="tablist">
          {MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={activeMode === mode}
              className={`ct-tab${activeMode === mode ? " ct-tab--active" : ""}`}
              onClick={() => handleModeChange(mode)}
            >
              {t(`consultaTarifas.mode.${mode}`)}
            </button>
          ))}
        </div>
      )}

      <div className="ct-filters">
        <label className="ct-field">
          <span className="ct-field__label">
            {t("consultaTarifas.filters.country")}
          </span>
          <select
            className="ct-select"
            value={countryCode}
            onChange={(e) => handleCountryChange(e.target.value)}
          >
            <option value="">{t("consultaTarifas.filters.allCountries")}</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="ct-field">
          <span className="ct-field__label">
            {t("consultaTarifas.filters.city")}
          </span>
          <select
            className="ct-select"
            value={originNorm}
            disabled={cities.length === 0}
            onChange={(e) => handleCityChange(e.target.value)}
          >
            <option value="">{t("consultaTarifas.filters.allCities")}</option>
            {cities.map((c) => (
              <option key={c.norm} value={c.norm}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="ct-field">
          <span className="ct-field__label">
            {t("consultaTarifas.filters.destination")}
          </span>
          <select
            className="ct-select"
            value={destNorm}
            disabled={destinations.length === 0}
            onChange={(e) => handleDestChange(e.target.value)}
          >
            <option value="">
              {t("consultaTarifas.filters.allDestinations")}
            </option>
            {destinations.map((d) => (
              <option key={d.norm} value={d.norm}>
                {d.label}
              </option>
            ))}
          </select>
        </label>

        {!showDualMaritime && showTierFilter && (
          <label className="ct-field">
            <span className="ct-field__label">
              {activeMode === "air"
                ? t("consultaTarifas.filters.weightTier")
                : t("consultaTarifas.filters.container")}
            </span>
            <select
              className="ct-select"
              value={tierKey}
              onChange={(e) => setTierKey(e.target.value)}
            >
              <option value="">{t("consultaTarifas.filters.allTiers")}</option>
              {COLUMNS_BY_MODE[activeMode]
                .filter((c) => c.type === "price")
                .map((col) => (
                  <option key={col.key} value={col.key}>
                    {col.label}
                  </option>
                ))}
            </select>
          </label>
        )}

        <label className="ct-toggle">
          <input
            type="checkbox"
            checked={includeExpired}
            onChange={(e) => setIncludeExpired(e.target.checked)}
          />
          <span>{t("consultaTarifas.includeExpired")}</span>
        </label>
      </div>

      {selectedPopularRoute ? (
        <p className="ct-popular__active ct-popular__active--inline">
          <i className="bi bi-funnel-fill me-1" aria-hidden />
          {t("consultaTarifas.popularRoutes.activeFilter")}
          <button type="button" className="ct-popular__clear" onClick={clearPopularFilter}>
            {t("consultaTarifas.popularRoutes.clearFilter")}
          </button>
        </p>
      ) : null}

      {showDualMaritime ? (
        <div className="ct-maritime-stack">
          <RatesTablePanel
            mode="fcl"
            title={t("consultaTarifas.mode.fcl")}
            rows={filteredFclRows}
            rowsPerPage={rowsPerPage}
            tablePage={fclTablePage}
            onRowsPerPageChange={setRowsPerPage}
            onTablePageChange={setFclTablePage}
            downloadContext={fclDownloadContext}
            onViewHistory={setChartRow}
            t={t}
          />
          <RatesTablePanel
            mode="lcl"
            title={t("consultaTarifas.mode.lcl")}
            rows={filteredLclRows}
            rowsPerPage={rowsPerPage}
            tablePage={lclTablePage}
            onRowsPerPageChange={setRowsPerPage}
            onTablePageChange={setLclTablePage}
            downloadContext={lclDownloadContext}
            onViewHistory={setChartRow}
            t={t}
          />
        </div>
      ) : (
        <>
          <div className="ct-toolbar">
            <span className="ct-results">
              {t("consultaTarifas.resultsCount", { count: filteredRows.length })}
            </span>
            {downloadContext ? (
              <CountryRatesDownloadButton
                service={activeMode}
                countryCode={downloadContext.country.code}
                countryLabel={downloadContext.country.label}
                destinationLabel={downloadContext.destLabel}
                destinationCode={downloadContext.destNorm}
                selectedOriginLabel={downloadContext.originLabel}
                columns={columns}
                rows={downloadContext.rows}
                translationNs={TRANSLATION_NS_BY_MODE[activeMode]}
              />
            ) : (
              <span className="ct-download-hint">
                <i className="bi bi-info-circle me-1" aria-hidden />
                {t("consultaTarifas.downloadHint")}
              </span>
            )}
          </div>

          {filteredRows.length === 0 ? (
            <div className="ct-empty">
              <i className="bi bi-search" aria-hidden />
              <h2 className="ct-empty__title">{t("consultaTarifas.empty.title")}</h2>
              <p className="ct-empty__desc">{t("consultaTarifas.empty.desc")}</p>
              {!includeExpired && (
                <button
                  type="button"
                  className="qa-btn qa-btn-outline"
                  onClick={() => setIncludeExpired(true)}
                >
                  <i className="bi bi-clock-history me-1" aria-hidden />
                  {t("consultaTarifas.empty.tryExpired")}
                </button>
              )}
            </div>
          ) : (
            <div className="ct-table-panel">
              <div className="ct-table-wrap" role="region" tabIndex={0}>
                <table className="ct-table">
                  <thead>
                    <tr>
                      {columns.map((col) => (
                        <th key={col.key} className={`ct-th ct-th--${col.type}`}>
                          {col.label}
                        </th>
                      ))}
                      <th className="ct-th ct-th--actions">
                        {t("consultaTarifas.colActions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row) => {
                      const expired = row.validityState === "expired";
                      const expiringSoon = row.validityState === "expiring-soon";
                      return (
                        <tr
                          key={row.id}
                          className={`ct-tr${expired ? " ct-tr--expired" : ""}`}
                        >
                          {columns.map((col) => {
                            const value = getCountryRateCellValue(row, col);
                            if (col.key === "validUntil") {
                              return (
                                <td key={col.key} className="ct-td ct-td--validity">
                                  <span className="ct-validity-date">{value}</span>
                                  {expired && (
                                    <span className="ct-badge ct-badge--expired">
                                      {t("consultaTarifas.expiredBadge")}
                                    </span>
                                  )}
                                  {expiringSoon && (
                                    <span className="ct-badge ct-badge--soon">
                                      {t("consultaTarifas.expiringSoonBadge")}
                                    </span>
                                  )}
                                </td>
                              );
                            }
                            return (
                              <td key={col.key} className={`ct-td ct-td--${col.type}`}>
                                {value}
                              </td>
                            );
                          })}
                          <td className="ct-td ct-td--actions">
                            <button
                              type="button"
                              className="ct-link-btn"
                              onClick={() => setChartRow(row)}
                            >
                              <i className="bi bi-graph-up-arrow me-1" aria-hidden />
                              {t("consultaTarifas.viewHistory")}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="ct-table-footer">
                <div className="ct-table-footer__left" />
                <div className="ct-table-footer__right">
                  <span className="ct-pagination-label">
                    {t("consultaTarifas.rowsPerPage")}
                  </span>
                  <select
                    className="ct-pagination-select"
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setTablePage(1);
                    }}
                  >
                    {ROWS_PER_PAGE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <span className="ct-pagination-range">{paginationRangeText}</span>
                  <button
                    type="button"
                    className="ct-pagination-btn"
                    disabled={tablePage <= 1}
                    onClick={() => setTablePage((p) => p - 1)}
                    aria-label={t("consultaTarifas.prevPage")}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="ct-pagination-btn"
                    disabled={tablePage >= totalTablePages}
                    onClick={() => setTablePage((p) => p + 1)}
                    aria-label={t("consultaTarifas.nextPage")}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        show={!!chartRow}
        onHide={() => setChartRow(null)}
        size="xl"
        centered
        scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title className="ct-modal-title">
            {chartRow
              ? `${chartRow.origin} → ${chartRow.destination}`
              : t("consultaTarifas.historyModalTitle")}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {chartBundle ? (
            <div className="ct-charts ct-charts--grid">
              {chartBundle.tiers.map((tier) => (
                <div key={tier.tierKey} className="ct-chart-card">
                  <PriceHistoryExplorerChart
                    chartResetKey={`${chartBundle.routeKey}-${tier.tierKey}`}
                    tier={tier}
                    routeLabel={`${chartBundle.originLabel} → ${chartBundle.destLabel}`}
                    entityColumnLabel={chartEntityLabel}
                    compact
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="ct-empty ct-empty--modal">
              <i className="bi bi-graph-up" aria-hidden />
              <p className="ct-empty__desc">{t("consultaTarifas.noHistory")}</p>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}
