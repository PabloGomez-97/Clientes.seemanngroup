import React from "react";
import { useTranslation } from "react-i18next";
import { imgUrl } from "../../../config/images";
import { AnimatedStat } from "./useAnimatedCounter";
import HomeCarriersCarousel from "./HomeCarriersCarousel";

const STATS = [
  { value: 50, key: "experience", color: "dark-grey" as const },
  { value: 200, key: "clients", color: "orange" as const },
  { value: 100, key: "employees", color: "grey" as const },
  { value: 15, key: "countries", color: "light-grey" as const },
];

const HomeTrustSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="hm-trust-section" aria-label={t("home.trust.title")}>
      <HomeCarriersCarousel />

      <div className="sectionheadline">
        <div className="hal-page-container-content">
          <div className="hal-section-headline hal-module--border">
            <h2 className="hal-h4">{t("home.company.title")}</h2>
            <h3 className="hal-h1">{t("home.company.subtitle")}</h3>
          </div>
        </div>
      </div>

      <div className="containermodule parbase">
        <div className="hal-page-container-content">
          <div className="hal-container hal-container--plain hal-module--light">
            <div className="hal-container-content">
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
              <p className="hm-trust-section__about">
                <a
                  href="https://seemanngroup.com/seemanngroup/nuestra_empresa.php#historia-section1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hm-trust-section__about-link"
                >
                  {t("home.trust.learnMore")} →
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeTrustSection;
