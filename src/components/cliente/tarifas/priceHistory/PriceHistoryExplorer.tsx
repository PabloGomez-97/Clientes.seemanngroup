import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PriceHistoryExplorerSkeleton } from "./PriceHistoryExplorerSkeleton";
import {
  filterRoutesByCountryAndMode,
  filterRoutesByOriginCity,
  filterRoutesByTierKey,
  listOriginCitiesFromRoutes,
  listTierOptionsFromRoutes,
  pickRandomFeatured,
  type ExplorerMode,
  type HistoricalExplorerSnapshot,
  type HistoricalRouteBundle,
  type HistoricalTierSeries,
} from "@/components/quotes/Handlers/shared/historicalExplorerParse";
import {
  fetchHistoricalExplorerSnapshotCached,
  getCachedHistoricalExplorer,
} from "@/components/quotes/Handlers/shared/historicalExplorerCache";
import { PriceHistoryExplorerChart } from "./PriceHistoryExplorerChart";
import "@/components/cliente/styles/PriceHistoryExplorer.css";

const MODES: ExplorerMode[] = ["air", "fcl", "lcl"];
const CHARTS_INITIAL_VISIBLE = 6;
const CHARTS_LOAD_MORE_STEP = 6;

interface ExplorerChartItem {
  key: string;
  route: HistoricalRouteBundle;
  tier: HistoricalTierSeries;
}

function buildChartItems(routes: HistoricalRouteBundle[]): ExplorerChartItem[] {
  const items: ExplorerChartItem[] = [];
  for (const route of routes) {
    for (const tier of route.tiers) {
      items.push({
        key: `${route.routeKey}-${tier.tierKey}`,
        route,
        tier,
      });
    }
  }
  return items;
}

export default function PriceHistoryExplorer() {
  const { t } = useTranslation();
  const loadPromiseRef = useRef<Promise<void> | null>(null);

  const [snapshot, setSnapshot] = useState<HistoricalExplorerSnapshot | null>(
    () => getCachedHistoricalExplorer(),
  );
  const [loading, setLoading] = useState(() => getCachedHistoricalExplorer() === null);
  const [error, setError] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState("");
  const [activeMode, setActiveMode] = useState<ExplorerMode>("fcl");
  const [originCityNorm, setOriginCityNorm] = useState("");
  const [tierKey, setTierKey] = useState("");
  const [visibleChartLimit, setVisibleChartLimit] = useState(
    CHARTS_INITIAL_VISIBLE,
  );

  const loadSnapshot = useCallback(
    async (forceRefresh = false) => {
      if (loadPromiseRef.current) {
        await loadPromiseRef.current;
        return;
      }

      const promise = (async () => {
        if (!snapshot) setLoading(true);
        setError(null);
        try {
          const data = await fetchHistoricalExplorerSnapshotCached(forceRefresh);
          setSnapshot(data);
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : t("priceHistoryExplorer.loadError"),
          );
        } finally {
          setLoading(false);
          loadPromiseRef.current = null;
        }
      })();

      loadPromiseRef.current = promise;
      await promise;
    },
    [snapshot, t],
  );

  useEffect(() => {
    if (snapshot) return;
    void loadSnapshot(false);
  }, [snapshot, loadSnapshot]);

  const featured = useMemo(
    () => (snapshot ? pickRandomFeatured(snapshot) : null),
    [snapshot],
  );

  const routesForTab = useMemo(() => {
    if (!snapshot || !countryCode) return [];
    return filterRoutesByCountryAndMode(snapshot, countryCode, activeMode);
  }, [snapshot, countryCode, activeMode]);

  const originCities = useMemo(
    () => listOriginCitiesFromRoutes(routesForTab),
    [routesForTab],
  );

  const routesAfterCity = useMemo(
    () => filterRoutesByOriginCity(routesForTab, originCityNorm),
    [routesForTab, originCityNorm],
  );

  const tierOptions = useMemo(
    () =>
      activeMode === "air" || activeMode === "fcl"
        ? listTierOptionsFromRoutes(routesAfterCity, activeMode)
        : [],
    [routesAfterCity, activeMode],
  );

  const displayedRoutes = useMemo(
    () => filterRoutesByTierKey(routesAfterCity, tierKey),
    [routesAfterCity, tierKey],
  );

  const chartItems = useMemo(
    () => buildChartItems(displayedRoutes),
    [displayedRoutes],
  );

  const visibleChartItems = useMemo(
    () => chartItems.slice(0, visibleChartLimit),
    [chartItems, visibleChartLimit],
  );

  const hasMoreCharts = chartItems.length > visibleChartLimit;
  const showLoadMoreCharts = chartItems.length > CHARTS_INITIAL_VISIBLE;

  useEffect(() => {
    setVisibleChartLimit(CHARTS_INITIAL_VISIBLE);
  }, [countryCode, activeMode, originCityNorm, tierKey]);

  const handleCountryChange = (code: string) => {
    setCountryCode(code);
    setOriginCityNorm("");
    setTierKey("");
  };

  const handleModeChange = (mode: ExplorerMode) => {
    setActiveMode(mode);
    setOriginCityNorm("");
    setTierKey("");
  };

  const handleLoadMoreCharts = () => {
    setVisibleChartLimit((prev) =>
      Math.min(prev + CHARTS_LOAD_MORE_STEP, chartItems.length),
    );
  };

  const entityLabel = useMemo(() => {
    if (activeMode === "lcl") return t("priceHistoryExplorer.agent");
    return t("priceHistoryExplorer.carrier");
  }, [activeMode, t]);

  if (loading && !snapshot) {
    return <PriceHistoryExplorerSkeleton />;
  }

  if (error && !snapshot) {
    return (
      <div className="rhp-container">
        <div className="rhp-header">
          <h1 className="rhp-header__title">{t("priceHistoryExplorer.title")}</h1>
          <p className="rhp-header__subtitle">
            {t("priceHistoryExplorer.subtitle")}
          </p>
        </div>
        <p className="rhp-error">{error}</p>
        <button
          type="button"
          className="rhp-btn"
          onClick={() => void loadSnapshot(true)}
        >
          {t("priceHistoryExplorer.retry")}
        </button>
      </div>
    );
  }

  if (!snapshot) {
    return null;
  }

  return (
    <div className="rhp-container">
      <div className="rhp-header">
        <div>
          <h1 className="rhp-header__title">{t("priceHistoryExplorer.title")}</h1>
          <p className="rhp-header__subtitle">
            {t("priceHistoryExplorer.subtitle")}
          </p>
        </div>
      </div>

      <div className="rhp-filters">
        <span className="rhp-filters__label">
          {t("priceHistoryExplorer.countryFilter")}
        </span>
        <select
          className="rhp-select rhp-select--country"
          value={countryCode}
          onChange={(e) => handleCountryChange(e.target.value)}
        >
          <option value="">{t("priceHistoryExplorer.allCountries")}</option>
          {snapshot.countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.label}
            </option>
          ))}
        </select>
      </div>

      {!countryCode && featured && (
            <section className="rhp-featured">
              <h2 className="rhp-section-title">
                {t("priceHistoryExplorer.featuredTitle")}
              </h2>
              <p className="rhp-section-desc">
                {t("priceHistoryExplorer.featuredDesc")}
              </p>
              <div className="rhp-card">
                <PriceHistoryExplorerChart
                  chartResetKey={`featured-${featured.route.routeKey}-${featured.tier.tierKey}`}
                  tier={featured.tier}
                  routeLabel={`${featured.route.originLabel} → ${featured.route.destLabel}`}
                  entityColumnLabel={
                    featured.route.mode === "lcl"
                      ? t("priceHistoryExplorer.agent")
                      : t("priceHistoryExplorer.carrier")
                  }
                  compact
                />
                <div className="rhp-card__meta">
                  <span className="rhp-badge">
                    {t(`priceHistoryExplorer.mode.${featured.route.mode}`)}
                  </span>
                  <span className="rhp-card__country">
                    {t("priceHistoryExplorer.originCountry", {
                      country: featured.route.countryLabel,
                    })}
                  </span>
                </div>
              </div>
            </section>
          )}

          {countryCode ? (
            <section className="rhp-country-section">
              <h2 className="rhp-section-title">
                {t("priceHistoryExplorer.byCountryTitle")}
              </h2>

              <div className="rhp-tabs">
                {MODES.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`rhp-tab${activeMode === mode ? " rhp-tab--active" : ""}`}
                    onClick={() => handleModeChange(mode)}
                  >
                    {t(`priceHistoryExplorer.mode.${mode}`)}
                  </button>
                ))}
              </div>

              <div className="rhp-filters-row">
                <div className="rhp-filters rhp-filters--inline">
                  <span className="rhp-filters__label">
                    {t("priceHistoryExplorer.cityFilter")}
                  </span>
                  <select
                    className="rhp-select rhp-select--city"
                    value={originCityNorm}
                    disabled={originCities.length === 0}
                    onChange={(e) => {
                      setOriginCityNorm(e.target.value);
                      setTierKey("");
                    }}
                  >
                    <option value="">{t("priceHistoryExplorer.allCities")}</option>
                    {originCities.map((city) => (
                      <option key={city.originNorm} value={city.originNorm}>
                        {city.originLabel}
                      </option>
                    ))}
                  </select>
                </div>

                {(activeMode === "air" || activeMode === "fcl") && (
                  <div className="rhp-filters rhp-filters--inline">
                    <span className="rhp-filters__label">
                      {activeMode === "air"
                        ? t("priceHistoryExplorer.airTierFilter")
                        : t("priceHistoryExplorer.fclTierFilter")}
                    </span>
                    <select
                      className="rhp-select rhp-select--tier"
                      value={tierKey}
                      disabled={tierOptions.length === 0}
                      onChange={(e) => setTierKey(e.target.value)}
                    >
                      <option value="">
                        {activeMode === "air"
                          ? t("priceHistoryExplorer.allAirTiers")
                          : t("priceHistoryExplorer.allFclTiers")}
                      </option>
                      {tierOptions.map((tier) => (
                        <option key={tier.tierKey} value={tier.tierKey}>
                          {tier.tierLabel}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {routesForTab.length === 0 ? (
                <p className="rhp-empty">{t("priceHistoryExplorer.noRoutesInTab")}</p>
              ) : displayedRoutes.length === 0 ? (
                <p className="rhp-empty">
                  {tierKey
                    ? t("priceHistoryExplorer.noRoutesForTier")
                    : t("priceHistoryExplorer.noRoutesForCity")}
                </p>
              ) : (
                <>
                  <div className="rhp-grid">
                    {visibleChartItems.map(({ key, route, tier }) => (
                      <article key={key} className="rhp-card">
                        <PriceHistoryExplorerChart
                          chartResetKey={key}
                          tier={tier}
                          routeLabel={`${route.originLabel} → ${route.destLabel}`}
                          entityColumnLabel={entityLabel}
                        />
                      </article>
                    ))}
                  </div>
                  {showLoadMoreCharts && hasMoreCharts && (
                    <div className="rhp-load-more">
                      <button
                        type="button"
                        className="rhp-btn"
                        onClick={handleLoadMoreCharts}
                      >
                        {t("priceHistoryExplorer.showMoreCharts")}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          ) : (
            <p className="rhp-hint">{t("priceHistoryExplorer.pickCountryHint")}</p>
          )}
    </div>
  );
}
