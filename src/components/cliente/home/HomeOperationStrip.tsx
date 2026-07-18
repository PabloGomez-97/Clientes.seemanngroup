import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useAuth } from "@/auth/AuthContext";
import { useLinbisToken } from "@/hooks/useLinbisToken";
import type { HmShipmentItem } from "@/hooks/useHomeShipments";
import { useHomeQuotesSummary } from "@/hooks/useHomeQuotesSummary";

interface HomeOperationStripProps {
  shipments: HmShipmentItem[];
  shipmentsLoading: boolean;
}

const SkeletonRows: React.FC = () => (
  <div className="hme-op__skeletons">
    {[1, 2, 3].map((i) => (
      <div key={i} className="hme-skeleton hme-op__skeleton-row" />
    ))}
  </div>
);

const SHIPMENTS_PER_PAGE = 3;

const HomeOperationStrip: React.FC<HomeOperationStripProps> = ({
  shipments,
  shipmentsLoading,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { activeUsername } = useAuth();
  const { accessToken, refreshAccessToken } = useLinbisToken();
  const { recent: quotes, loading: quotesLoading } = useHomeQuotesSummary(
    activeUsername,
    accessToken,
    refreshAccessToken,
  );

  const dateLocale = i18n.language === "es" ? es : enUS;

  // Solo operaciones en curso: marítimo navegando, aéreo reservado/en tránsito.
  // Aterrizados, entregados, llegados o descargados quedan fuera.
  const activeShipments = useMemo(
    () =>
      shipments.filter((s) =>
        s.kind === "air"
          ? s.status === "BOOKED" || s.status === "EN_ROUTE"
          : s.status === "SAILING",
      ),
    [shipments],
  );

  const [page, setPage] = useState(0);
  const totalPages = Math.max(
    1,
    Math.ceil(activeShipments.length / SHIPMENTS_PER_PAGE),
  );
  const safePage = Math.min(page, totalPages - 1);
  const pagedShipments = activeShipments.slice(
    safePage * SHIPMENTS_PER_PAGE,
    safePage * SHIPMENTS_PER_PAGE + SHIPMENTS_PER_PAGE,
  );
  const activeCount = activeShipments.length;

  const formatQuoteDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "d MMM yyyy", { locale: dateLocale });
    } catch {
      return dateStr;
    }
  };

  return (
    <section className="hme-section" aria-label={t("home.operation.title")}>
      <header className="hme-section__head">
        <span className="hme-section__eyebrow">
          {t("home.operation.eyebrow")}
        </span>
        <h2 className="hme-section__title">{t("home.operation.title")}</h2>
      </header>

      <div className="hme-op">
        {/* Panel embarques */}
        <article className="hme-op__panel">
          <div className="hme-op__panel-head">
            <h3 className="hme-op__panel-title">
              {t("home.operation.shipmentsTitle")}
            </h3>
            {!shipmentsLoading && activeCount > 0 && (
              <span className="hme-op__count">
                <strong>{activeCount}</strong>
                {t("home.operation.activeLabel")}
              </span>
            )}
          </div>

          {shipmentsLoading ? (
            <SkeletonRows />
          ) : activeShipments.length === 0 ? (
            <div className="hme-op__empty">
              <p>{t("home.operation.noShipments")}</p>
              <button
                type="button"
                className="hme-btn hme-btn--primary"
                onClick={() => navigate("/newquotes")}
              >
                {t("home.operation.quoteNow")}
              </button>
            </div>
          ) : (
            <ul className="hme-op__list">
              {pagedShipments.map((item) => {
                const isAir = item.kind === "air";
                const ref = isAir ? item.awb : item.container;
                const target = isAir
                  ? "/trackings-aereo"
                  : "/trackings-maritimo";
                const badgeText = isAir
                  ? item.status === "BOOKED"
                    ? t("home.operation.statusBooked")
                    : t("home.activityBar.airTransit")
                  : t("home.activityBar.oceanSailing");
                const badgeClass = isAir
                  ? "hme-op__badge--air"
                  : "hme-op__badge--ocean";
                return (
                  <li key={`${item.kind}-${item.id}`}>
                    <button
                      type="button"
                      className="hme-op__row"
                      onClick={() => navigate(target)}
                    >
                      <span className={`hme-op__mode hme-op__mode--${item.kind}`}>
                        {isAir
                          ? t("home.operation.modeAir")
                          : t("home.operation.modeOcean")}
                      </span>
                      <span className="hme-op__ref">{ref}</span>
                      <span className="hme-op__route">
                        {item.origin} <span aria-hidden>→</span>{" "}
                        {item.destination}
                      </span>
                      <span className={`hme-op__badge ${badgeClass}`}>
                        {badgeText}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {!shipmentsLoading && activeShipments.length > 0 && (
            <div className="hme-op__foot">
              <button
                type="button"
                className="hme-op__link"
                onClick={() => navigate("/trackings")}
              >
                {t("home.operation.viewTracking")}
                <span aria-hidden>→</span>
              </button>

              {totalPages > 1 && (
                <div
                  className="hme-op__pager"
                  role="group"
                  aria-label={t("home.operation.pagerLabel")}
                >
                  <button
                    type="button"
                    className="hme-op__pager-btn"
                    onClick={() => setPage(Math.max(0, safePage - 1))}
                    disabled={safePage === 0}
                    aria-label={t("home.operation.pagerPrev")}
                  >
                    ‹
                  </button>
                  <span className="hme-op__pager-count" aria-live="polite">
                    {safePage + 1}/{totalPages}
                  </span>
                  <button
                    type="button"
                    className="hme-op__pager-btn"
                    onClick={() =>
                      setPage(Math.min(totalPages - 1, safePage + 1))
                    }
                    disabled={safePage === totalPages - 1}
                    aria-label={t("home.operation.pagerNext")}
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          )}
        </article>

        {/* Panel cotizaciones */}
        <article className="hme-op__panel">
          <div className="hme-op__panel-head">
            <h3 className="hme-op__panel-title">
              {t("home.operation.quotesTitle")}
            </h3>
          </div>

          {quotesLoading ? (
            <SkeletonRows />
          ) : quotes.length === 0 ? (
            <div className="hme-op__empty">
              <p>{t("home.operation.noQuotes")}</p>
              <button
                type="button"
                className="hme-btn hme-btn--primary"
                onClick={() => navigate("/newquotes")}
              >
                {t("home.operation.quoteNow")}
              </button>
            </div>
          ) : (
            <ul className="hme-op__list">
              {quotes.map((quote) => (
                <li key={quote.id ?? quote.number}>
                  <button
                    type="button"
                    className="hme-op__row"
                    onClick={() => navigate("/quotes")}
                  >
                    <span className="hme-op__ref">
                      #{quote.number || "—"}
                    </span>
                    <span className="hme-op__route">
                      {quote.origin || "—"} <span aria-hidden>→</span>{" "}
                      {quote.destination || "—"}
                    </span>
                    <span className="hme-op__date">
                      {formatQuoteDate(quote.date)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!quotesLoading && quotes.length > 0 && (
            <button
              type="button"
              className="hme-op__link"
              onClick={() => navigate("/quotes")}
            >
              {t("home.operation.viewQuotes")}
              <span aria-hidden>→</span>
            </button>
          )}
        </article>
      </div>
    </section>
  );
};

export default HomeOperationStrip;
