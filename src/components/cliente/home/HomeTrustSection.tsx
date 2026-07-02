import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { imgUrl } from "../../../config/images";
import { AnimatedStat } from "./useAnimatedCounter";

const STATS = [
  { value: 50, key: "experience", color: "dark-grey" as const },
  { value: 200, key: "clients", color: "orange" as const },
  { value: 100, key: "employees", color: "grey" as const },
  { value: 15, key: "countries", color: "light-grey" as const },
];

const HomeTrustSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="hm-trust-section" aria-label={t("home.company.subtitle")}>
      <header className="hal-section-header">
        <p className="hal-section-eyebrow">{t("home.company.title")}</p>
        <h2 className="hal-section-heading">{t("home.company.subtitle")}</h2>
      </header>

      <div className="hm-trust-section__body">
        <div className="hal-image-with-tiles hal-module--space-sm">
          <div className="hal-image-with-tiles-container">
            <div className="hal-picture-wrapper">
              <img
                src={imgUrl("/confianza.png")}
                alt={t("home.company.subtitle")}
                className="hal-image-with-tiles-image"
              />
            </div>
            <div className="hal-image-with-tiles-content">
              {STATS.map((stat) => (
                <div
                  key={stat.key}
                  className={`hal-image-with-tiles-box hal-image-with-tiles-box--${stat.color}`}
                >
                  <span>
                    <AnimatedStat value={stat.value} />
                    <p className="hal-image-with-tiles-subline">
                      {t(`home.company.stats.${stat.key}`)}
                    </p>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="hm-trust-section__about">
        <Link to="/promesas" className="hm-trust-section__about-link">
          {t("home.trust.learnMore")} →
        </Link>
      </p>
    </section>
  );
};

export default HomeTrustSection;
