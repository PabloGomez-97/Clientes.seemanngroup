import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useAuth } from "@/auth/AuthContext";
import { useHomeShipments, type HmShipmentItem } from "@/hooks/useHomeShipments";
import { useHomeQuotesSummary } from "@/hooks/useHomeQuotesSummary";
import { useLinbisToken } from "@/hooks/useLinbisToken";

function ShipmentBadge({ item }: { item: HmShipmentItem }) {
  const { t } = useTranslation();
  if (item.kind === "air") {
    return (
      <span
        className={`hm-activity-panel__badge hm-activity-panel__badge--${
          item.delivered ? "muted" : "air"
        }`}
      >
        {item.delivered
          ? t("home.activityPanel.airLanded")
          : t("home.activityPanel.airTransit")}
      </span>
    );
  }
  return (
    <span
      className={`hm-activity-panel__badge hm-activity-panel__badge--${
        item.delivered ? "muted" : "ocean"
      }`}
    >
      {item.delivered
        ? t("home.activityPanel.oceanDischarged")
        : t("home.activityPanel.oceanSailing")}
    </span>
  );
}

const HomeActivityPanel: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { activeUsername } = useAuth();
  const { accessToken, refreshAccessToken } = useLinbisToken();
  const { items, loading: shipmentsLoading } = useHomeShipments(activeUsername);
  const { recent: quotes, loading: quotesLoading } = useHomeQuotesSummary(
    activeUsername,
    accessToken,
    refreshAccessToken,
  );

  const dateLocale = i18n.language === "es" ? es : enUS;
  const recentShipments = items.slice(0, 3);

  const formatQuoteDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "d MMM yyyy", { locale: dateLocale });
    } catch {
      return dateStr;
    }
  };

  return (
    <section className="hm-activity-panel" aria-label={t("home.activityPanel.title")}>
      <h2 className="hm-section-title">{t("home.activityPanel.title")}</h2>
      <div className="hm-activity-panel__card">
        <div className="hm-activity-panel__grid">
        {/* Shipments column */}
        <div className="hm-activity-panel__col">
          <h3 className="hm-activity-panel__col-title">
            {t("home.activityPanel.shipmentsTitle")}
          </h3>
          {shipmentsLoading ? (
            <div className="hm-activity-panel__skeletons">
              {[1, 2, 3].map((i) => (
                <div key={i} className="hm-skeleton hm-skeleton--row" />
              ))}
            </div>
          ) : recentShipments.length === 0 ? (
            <div className="hm-activity-panel__empty">
              <p>{t("home.activityPanel.noShipments")}</p>
              <button
                type="button"
                className="hal-button hal-button--primary"
                onClick={() => navigate("/new-tracking")}
              >
                {t("home.activityPanel.trackFirst")}
              </button>
            </div>
          ) : (
            <ul className="hm-activity-panel__list">
              {recentShipments.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <button
                    type="button"
                    className="hm-activity-panel__item"
                    onClick={() =>
                      navigate(
                        item.kind === "air"
                          ? "/trackings-aereo"
                          : "/trackings-maritimo",
                      )
                    }
                  >
                    <ShipmentBadge item={item} />
                    <span className="hm-activity-panel__ref">
                      {item.kind === "air" ? item.awb : item.container}
                    </span>
                    <span className="hm-activity-panel__route">
                      {item.origin} → {item.destination}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!shipmentsLoading && items.length > 0 && (
            <button
              type="button"
              className="hm-activity-panel__see-all"
              onClick={() => navigate("/trackings")}
            >
              {t("home.activityPanel.viewAllShipments")} →
            </button>
          )}
        </div>

        {/* Quotes column */}
        <div className="hm-activity-panel__col">
          <h3 className="hm-activity-panel__col-title">
            {t("home.activityPanel.quotesTitle")}
          </h3>
          {quotesLoading ? (
            <div className="hm-activity-panel__skeletons">
              {[1, 2, 3].map((i) => (
                <div key={i} className="hm-skeleton hm-skeleton--row" />
              ))}
            </div>
          ) : quotes.length === 0 ? (
            <div className="hm-activity-panel__empty">
              <p>{t("home.activityPanel.noQuotes")}</p>
              <button
                type="button"
                className="hal-button hal-button--primary"
                onClick={() => navigate("/newquotes")}
              >
                {t("home.activityPanel.quoteFirst")}
              </button>
            </div>
          ) : (
            <ul className="hm-activity-panel__list">
              {quotes.map((quote) => (
                <li key={quote.id ?? quote.number}>
                  <button
                    type="button"
                    className="hm-activity-panel__item"
                    onClick={() => navigate("/quotes")}
                  >
                    <span className="hm-activity-panel__ref">
                      #{quote.number || "—"}
                    </span>
                    <span className="hm-activity-panel__route">
                      {quote.origin || "—"} → {quote.destination || "—"}
                    </span>
                    <span className="hm-activity-panel__date">
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
              className="hm-activity-panel__see-all"
              onClick={() => navigate("/quotes")}
            >
              {t("home.activityPanel.viewAllQuotes")} →
            </button>
          )}
        </div>
      </div>
      </div>
    </section>
  );
};

export default HomeActivityPanel;
