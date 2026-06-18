import { useTranslation } from "react-i18next";

function Bone({ className = "" }: { className?: string }) {
  return <span className={`rhp-skeleton-bone ${className}`.trim()} aria-hidden />;
}

export function PriceHistoryExplorerSkeleton() {
  const { t } = useTranslation();

  return (
    <div className="rhp-container rhp-container--loading" aria-busy="true">
      <div className="rhp-header">
        <h1 className="rhp-header__title">{t("priceHistoryExplorer.title")}</h1>
        <p className="rhp-header__subtitle">
          {t("priceHistoryExplorer.subtitle")}
        </p>
      </div>

      <div className="rhp-filters rhp-filters--skeleton">
        <Bone className="rhp-skeleton-bone--filter-label" />
        <Bone className="rhp-skeleton-bone--select" />
      </div>

      <section className="rhp-featured">
        <h2 className="rhp-section-title">
          {t("priceHistoryExplorer.featuredTitle")}
        </h2>
        <p className="rhp-section-desc">
          {t("priceHistoryExplorer.featuredDesc")}
        </p>

        <article className="rhp-card rhp-card--skeleton">
          <div className="rhp-chart-block rhp-chart-block--skeleton">
            <div className="rhp-chart-block__head">
              <div>
                <Bone className="rhp-skeleton-bone--route" />
                <Bone className="rhp-skeleton-bone--tier" />
              </div>
              <div className="rhp-insight rhp-insight--skeleton">
                <Bone className="rhp-skeleton-bone--trend" />
                <Bone className="rhp-skeleton-bone--range" />
              </div>
            </div>

            <div className="rhp-legend rhp-legend--skeleton">
              <span className="rhp-legend__item">
                <Bone className="rhp-skeleton-bone--swatch" />
                <Bone className="rhp-skeleton-bone--legend-text" />
              </span>
            </div>

            <div className="rhp-skeleton-chart" aria-hidden>
              <div className="rhp-skeleton-chart__y-axis">
                <Bone className="rhp-skeleton-bone--axis-tick" />
                <Bone className="rhp-skeleton-bone--axis-tick" />
                <Bone className="rhp-skeleton-bone--axis-tick" />
                <Bone className="rhp-skeleton-bone--axis-tick" />
                <Bone className="rhp-skeleton-bone--axis-tick" />
              </div>
              <div className="rhp-skeleton-chart__plot">
                <div className="rhp-skeleton-chart__grid">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <Bone className="rhp-skeleton-bone--chart-dot" />
              </div>
              <Bone className="rhp-skeleton-bone--x-label" />
            </div>

            <Bone className="rhp-skeleton-bone--chart-note" />
          </div>

          <div className="rhp-card__meta">
            <Bone className="rhp-skeleton-bone--badge" />
            <Bone className="rhp-skeleton-bone--meta-country" />
          </div>
        </article>
      </section>

      <p className="rhp-hint">{t("priceHistoryExplorer.pickCountryHint")}</p>

      <p className="rhp-skeleton-status">
        {t("priceHistoryExplorer.loading")}
      </p>
    </div>
  );
}
