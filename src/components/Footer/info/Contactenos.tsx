import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail, MapPin, Phone, ExternalLink } from "lucide-react";
import InfoPageShell from "./InfoPageShell";

const Contactenos: React.FC = () => {
  const { t } = useTranslation();

  return (
    <InfoPageShell
      title={t("contactenos.title")}
      subtitle={t("contactenos.subtitle")}
    >
      <div className="info-contact__grid info-contact__grid--two">
        <section className="info-contact__card info-contact__card--primary">
          <h2 className="info-contact__card-title">
            {t("contactenos.generalTitle")}
          </h2>
          <ul className="info-contact__list">
            <li>
              <Mail size={18} strokeWidth={1.75} aria-hidden />
              <a href="mailto:contacto@seemanngroup.com">
                contacto@seemanngroup.com
              </a>
            </li>
            <li>
              <Phone size={18} strokeWidth={1.75} aria-hidden />
              <a href="tel:+56226048386">+56 2 2604 8386</a>
            </li>
            <li>
              <MapPin size={18} strokeWidth={1.75} aria-hidden />
              <span>
                Av. Libertad 1405, Of. 1203
                <br />
                Viña del Mar, Chile
              </span>
            </li>
          </ul>
          <a
            href="https://www.seemanngroup.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="info-contact__external"
          >
            {t("contactenos.visitWebsite")}
            <ExternalLink size={14} aria-hidden />
          </a>
        </section>

        <section className="info-contact__card info-contact__card--accent">
          <h2 className="info-contact__card-title">
            {t("contactenos.portalTitle")}
          </h2>
          <p className="info-contact__text">{t("contactenos.portalText")}</p>
          <Link to="/settings" className="info-contact__link">
            {t("contactenos.portalLink")} →
          </Link>
        </section>
      </div>
    </InfoPageShell>
  );
};

export default Contactenos;
