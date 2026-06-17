import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { useHomeShipments } from "../../../hooks/useHomeShipments";
import { useHomeQuotesSummary } from "../../../hooks/useHomeQuotesSummary";
import { useHomeDocumentsCount } from "../../../hooks/useHomeDocumentsCount";
import { useLinbisToken } from "../../../hooks/useLinbisToken";

const WelcomeHeader: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, activeUsername } = useAuth();
  const { accessToken, refreshAccessToken } = useLinbisToken();
  const { activeCount, loading: shipmentsLoading } =
    useHomeShipments(activeUsername);
  void useHomeQuotesSummary(activeUsername, accessToken, refreshAccessToken);
  const { count: docsCount, loading: docsLoading } =
    useHomeDocumentsCount(activeUsername);

  const displayName =
    user?.nombreuser?.trim() || activeUsername || user?.username || "";

  const kpis = [
    {
      key: "shipments",
      label: t("home.welcome.kpiShipments"),
      value: activeCount,
      loading: shipmentsLoading,
      path: "/trackings",
    },
    {
      key: "documents",
      label: t("home.welcome.kpiDocuments"),
      value: docsCount,
      loading: docsLoading,
      path: "/mis-documentos",
    },
  ];

  return (
    <div className="hm-welcome-header">
      <div className="hm-welcome-header__inner hal-page-container-content">
        <div className="hm-welcome-header__greeting">
          <h2 className="hm-welcome-header__title">
            {t("home.welcome.greeting", { name: displayName })}
          </h2>
          {activeUsername && (
            <span className="hm-welcome-header__account">
              {t("home.welcome.account", { account: activeUsername })}
            </span>
          )}
        </div>
        <div className="hm-welcome-header__kpis">
          {kpis.map((kpi) => (
            <button
              key={kpi.key}
              type="button"
              className="hm-welcome-kpi"
              onClick={() => navigate(kpi.path)}
            >
              {kpi.loading ? (
                <span className="hm-skeleton hm-skeleton--sm" />
              ) : (
                <span className="hm-welcome-kpi__value">{kpi.value}</span>
              )}
              <span className="hm-welcome-kpi__label">{kpi.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WelcomeHeader;
