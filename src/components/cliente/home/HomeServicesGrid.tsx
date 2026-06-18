import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

type ServiceKey = "aereo" | "fcl" | "lcl" | "lastmile";

const SERVICE_KEYS: { key: ServiceKey; tipo: string; icon: React.ReactNode }[] =
  [
    {
      key: "aereo",
      tipo: "AEREO",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
          <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
        </svg>
      ),
    },
    {
      key: "fcl",
      tipo: "FCL",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
          <path d="M20 21H4V10l8-5 8 5v11zm-2-2V11.5l-6-3.75-6 3.75V19h12z" />
        </svg>
      ),
    },
    {
      key: "lcl",
      tipo: "LCL",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
          <path d="M4 8h16v2H4V8zm0 4h10v2H4v-2zm0 4h16v2H4v-2z" />
        </svg>
      ),
    },
    {
      key: "lastmile",
      tipo: "LASTMILE",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
          <path d="M18 18.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm-9 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2a3 3 0 0 0 6 0h6a3 3 0 0 0 6 0h2v-5l-3-4z" />
        </svg>
      ),
    },
  ];

const HomeServicesGrid: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="hal-services-section" aria-label={t("home.servicesSection.title")}>
      <h2 className="hm-section-title">{t("home.servicesSection.title")}</h2>
      <div className="hal-services-grid">
        {SERVICE_KEYS.map(({ key, tipo, icon }) => (
          <Link
            key={key}
            to={`/newquotes?tipo=${tipo}`}
            className="hal-service-card"
          >
            <div className="hal-service-icon">{icon}</div>
            <h3 className="hal-service-title">
              {t(`home.services.${key}.title`)}
            </h3>
            <p className="hal-service-desc">
              {t(`home.services.${key}.desc`)}
            </p>
            <span className="hal-service-cta">
              {t(`home.services.${key}.cta`)} →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default HomeServicesGrid;
