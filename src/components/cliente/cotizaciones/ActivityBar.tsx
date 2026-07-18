import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/auth/AuthContext";
import { useHomeShipments, type HmShipmentItem } from "@/hooks/useHomeShipments";
import "@/components/cliente/styles/Home.css";

interface ActivityBarProps {
  /**
   * Optional preloaded shipments. When provided, the bar renders these instead
   * of fetching again (used by Home, which already calls useHomeShipments).
   * When omitted, the bar stays standalone (used by Newquotes).
   */
  items?: HmShipmentItem[];
  loading?: boolean;
}

const ActivityBar: React.FC<ActivityBarProps> = ({
  items: itemsProp,
  loading: loadingProp,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { activeUsername } = useAuth();

  const usingProps = itemsProp !== undefined;
  // Skip the fetch when the parent already provides the data.
  const hook = useHomeShipments(usingProps ? undefined : activeUsername);

  const items = usingProps ? itemsProp : hook.items;
  const loading = usingProps ? loadingProp ?? false : hook.loading;

  if (!loading && items.length === 0) {
    return null;
  }

  return (
    <div className="hme-activity">
      <div className="hme-activity__label">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        {t("home.activityBar.label")}
      </div>

      <div className="hme-activity__viewport">
        {loading ? (
          <div className="hme-activity__skeletons">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className="hme-skeleton hme-skeleton--chip" />
            ))}
          </div>
        ) : (
          <div className="hme-activity__track">
            {[...items, ...items].map((item, idx) => {
              const isAir = item.kind === "air";
              const ref = isAir ? item.awb : item.container;
              const badgeClass = item.delivered
                ? "hme-activity__badge--done"
                : isAir
                  ? "hme-activity__badge--air"
                  : "hme-activity__badge--ocean";
              const badgeText = item.delivered
                ? isAir
                  ? t("home.activityBar.airLanded")
                  : t("home.activityBar.oceanDischarged")
                : isAir
                  ? t("home.activityBar.airTransit")
                  : t("home.activityBar.oceanSailing");
              const target = isAir
                ? "/trackings-aereo"
                : "/trackings-maritimo";
              return (
                <div
                  key={`${item.kind}-${item.id}-${idx}`}
                  className={`hme-activity__chip${
                    item.delivered ? " hme-activity__chip--done" : ""
                  }`}
                  onClick={() => navigate(target)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") navigate(target);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <span className={`hme-activity__badge ${badgeClass}`}>
                    {badgeText}
                  </span>
                  <span className="hme-activity__ref">{ref}</span>
                  <span className="hme-activity__route">
                    {item.origin} <span aria-hidden>→</span> {item.destination}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        className="hme-activity__all"
        onClick={() => navigate("/trackings")}
      >
        {t("home.activityBar.seeAll")}
        <span aria-hidden>→</span>
      </button>
    </div>
  );
};

export default ActivityBar;
