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
    <div className="hal-carriers-strip">
      <p className="hal-carriers-label">{t("home.carriers.label")}</p>
      <ul className="hm-carriers-grid" aria-label={t("home.carriers.label")}>
        {CARRIER_LOGOS.map((name) => (
          <li key={name} className="hm-carriers-grid__item" title={name}>
            <img
              src={carrierLogoUrl(name)}
              alt={name}
              loading="lazy"
              draggable={false}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HomeCarriersCarousel;
