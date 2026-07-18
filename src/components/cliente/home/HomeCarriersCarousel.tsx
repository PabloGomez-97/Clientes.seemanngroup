import React from "react";
import { useTranslation } from "react-i18next";
import { imgUrl } from "../../../config/images";

/** Nombre del archivo en R2 = nombre exacto + .png */
const CARRIER_LOGOS = [
  "Maersk",
  "MSC",
  "CMA CGM",
  "Hapag-Lloyd",
  "ONE",
  "LATAM Cargo",
  "Iberia",
  "Air France",
  "Copa Airlines",
  "Evergreen",
] as const;

const LOGO_BASE = "/logoscarriercarrusel";

function carrierLogoUrl(name: string): string {
  return imgUrl(`${LOGO_BASE}/${name}.png`);
}

const HomeCarriersCarousel: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="hme-carriers" aria-label={t("home.carriers.label")}>
      <p className="hme-carriers__label">{t("home.carriers.label")}</p>
      <div className="hme-carriers__viewport">
        <div className="hme-carriers__track">
          {[...CARRIER_LOGOS, ...CARRIER_LOGOS].map((name, idx) => (
            <div
              key={`${name}-${idx}`}
              className="hme-carriers__item"
              title={name}
              aria-hidden={idx >= CARRIER_LOGOS.length}
            >
              <img
                src={carrierLogoUrl(name)}
                alt={name}
                loading="lazy"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeCarriersCarousel;
