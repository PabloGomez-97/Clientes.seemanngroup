import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { imgUrl } from "../../../config/images";

type ServiceKey = "aereo" | "fcl" | "lcl" | "lastmile";

const SERVICE_KEYS: { key: ServiceKey; tipo: string; image: string }[] = [
  { key: "aereo", tipo: "AEREO", image: "/dashboard/aereo.png" },
  { key: "fcl", tipo: "FCL", image: "/dashboard/fcl.png" },
  { key: "lcl", tipo: "LCL", image: "/dashboard/lcl.png" },
  {
    key: "lastmile",
    tipo: "LASTMILE",
    image: "/dashboard/terrestre.png",
  },
];

const HomeServicesGrid: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section
      className="hme-section"
      aria-label={t("home.servicesSection.title")}
    >
      <header className="hme-section__head">
        <span className="hme-section__eyebrow">
          {t("home.servicesSection.eyebrow")}
        </span>
        <h2 className="hme-section__title">
          {t("home.servicesSection.title")}
        </h2>
      </header>

      <div className="hme-services">
        {SERVICE_KEYS.map(({ key, tipo, image }) => (
          <Link
            key={key}
            to={`/newquotes?tipo=${tipo}`}
            className="hme-service-card"
          >
            <div className="hme-service-card__media">
              <img
                src={imgUrl(image)}
                alt={t(`home.services.${key}.title`)}
                width={298}
                height={166}
                loading="lazy"
                draggable={false}
              />
            </div>
            <div className="hme-service-card__body">
              <h3 className="hme-service-card__title">
                {t(`home.services.${key}.title`)}
              </h3>
              <p className="hme-service-card__desc">
                {t(`home.services.${key}.desc`)}
              </p>
              <span className="hme-service-card__cta">
                {t(`home.services.${key}.cta`)}
                <span aria-hidden>→</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default HomeServicesGrid;
