import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/auth/AuthContext";
import { useHomeShipments } from "@/hooks/useHomeShipments";
import "@/components/cliente/styles/Home.css";

const EMPTY_PLACEHOLDERS = [
  { id: 1, key: "empty1" as const, icon: "○" },
  { id: 2, key: "empty2" as const, icon: "◇" },
  { id: 3, key: "empty1" as const, icon: "○" },
  { id: 4, key: "empty2" as const, icon: "◇" },
  { id: 5, key: "empty1" as const, icon: "○" },
  { id: 6, key: "empty2" as const, icon: "◇" },
  { id: 7, key: "empty1" as const, icon: "○" },
  { id: 8, key: "empty2" as const, icon: "◇" },
];

const ActivityBar: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { activeUsername } = useAuth();
  const { items, loading } = useHomeShipments(activeUsername);

  return (
    <div className="hm-activity-bar">
      <div className="ej-activity-bar__label">
        <svg
          width="14"
          height="14"
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

      <div className="hm-activity-bar__carousel">
        {loading ? (
          <div className="hm-activity-bar__skeleton-track">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className="hm-skeleton hm-skeleton--chip" />
            ))}
          </div>
        ) : (
          <div className="hm-activity-bar__track">
            {items.length === 0
              ? EMPTY_PLACEHOLDERS.map((item) => (
                  <div
                    key={item.id}
                    className="hm-activity-bar__chip hm-activity-bar__chip--empty"
                  >
                    <span className="hm-activity-bar__empty-icon">
                      {item.icon}
                    </span>
                    <span className="hm-activity-bar__empty-text">
                      {t(`home.activityBar.${item.key}`)}
                    </span>
                  </div>
                ))
              : [...items, ...items].map((item, idx) => {
                  if (item.kind === "air") {
                    return (
                      <div
                        key={`air-${item.id}-${idx}`}
                        className={`hm-activity-bar__chip${
                          item.delivered
                            ? " hm-activity-bar__chip--delivered"
                            : ""
                        }`}
                        onClick={() => navigate("/trackings-aereo")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            navigate("/trackings-aereo");
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <span
                          className={`hm-activity-bar__badge hm-activity-bar__badge--${
                            item.delivered ? "landed" : "air"
                          }`}
                        >
                          {item.delivered
                            ? t("home.activityBar.airLanded")
                            : t("home.activityBar.airTransit")}
                        </span>
                        <span className="hm-activity-bar__chip-number">
                          {item.awb}
                        </span>
                        <span className="hm-activity-bar__chip-route">
                          {item.origin} → {item.destination}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={`ocean-${item.id}-${idx}`}
                      className={`hm-activity-bar__chip${
                        item.delivered ? " hm-activity-bar__chip--delivered" : ""
                      }`}
                      onClick={() => navigate("/trackings-maritimo")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          navigate("/trackings-maritimo");
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <span
                        className={`hm-activity-bar__badge hm-activity-bar__badge--${
                          item.delivered ? "discharged" : "ocean"
                        }`}
                      >
                        {item.delivered
                          ? t("home.activityBar.oceanDischarged")
                          : t("home.activityBar.oceanSailing")}
                      </span>
                      <span className="hm-activity-bar__chip-number">
                        {item.container}
                      </span>
                      <span className="hm-activity-bar__chip-route">
                        {item.origin} → {item.destination}
                      </span>
                    </div>
                  );
                })}
          </div>
        )}
      </div>

      <button
        type="button"
        className="hm-activity-bar__see-all"
        onClick={() => navigate("/trackings")}
      >
        {t("home.activityBar.seeAll")} →
      </button>
    </div>
  );
};

export default ActivityBar;
