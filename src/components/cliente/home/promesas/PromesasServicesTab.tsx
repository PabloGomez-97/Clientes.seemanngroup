import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Ship,
  Plane,
  Truck,
  FileCheck2,
  Layers,
  ArrowRight,
} from "lucide-react";
import {
  SERVICE_HERO_IMAGES,
  SERVICE_MODALITIES,
  SERVICE_QUOTE_LINKS,
  type ServiceModality,
} from "./constants";

const SERVICE_ICONS = {
  sea: Ship,
  air: Plane,
  land: Truck,
  customs: FileCheck2,
  multimodal: Layers,
} as const;

type Props = {
  service: ServiceModality;
  onServiceChange: (mod: ServiceModality) => void;
};

const PromesasServicesTab: React.FC<Props> = ({ service, onServiceChange }) => {
  const { t } = useTranslation();

  return (
    <div className="pr-services">
      {/* Selector de modalidad */}
      <div
        className="pr-modes"
        role="tablist"
        aria-label={t("promesas.services.pillsAria")}
      >
        {SERVICE_MODALITIES.map((mod) => {
          const Icon = SERVICE_ICONS[mod];
          const active = service === mod;
          return (
            <button
              key={mod}
              type="button"
              role="tab"
              aria-selected={active}
              className={`pr-mode${active ? " pr-mode--active" : ""}`}
              onClick={() => onServiceChange(mod)}
            >
              <Icon size={16} strokeWidth={1.75} aria-hidden />
              <span>{t(`promesas.services.modalities.${mod}`)}</span>
            </button>
          );
        })}
      </div>

      {/* Panel de la modalidad activa */}
      <article key={service} className="pr-svc pr-svc--enter">
        <header className="pr-svc__hero">
          <img
            src={SERVICE_HERO_IMAGES[service]}
            alt=""
            aria-hidden
            className="pr-svc__hero-img"
          />
          <div className="pr-svc__hero-scrim" aria-hidden />
          <div className="pr-svc__hero-copy">
            <span className="pr-svc__tag">
              {t(`promesas.services.modalities.${service}`)}
            </span>
            <h3 className="pr-svc__title">
              {t(`promesas.services.${service}.hero.title`)}
            </h3>
            <p className="pr-svc__subtitle">
              {t(`promesas.services.${service}.hero.subtitle`)}
            </p>
          </div>
        </header>

        <div className="pr-svc__body">
          <div className="pr-svc__features">
            {[1, 2, 3].map((n) => (
              <div key={n} className="pr-svc__feature">
                <span className="pr-svc__feature-num" aria-hidden>
                  {String(n).padStart(2, "0")}
                </span>
                <div className="pr-svc__feature-copy">
                  <h4 className="pr-svc__feature-title">
                    {t(`promesas.services.${service}.features.f${n}.title`)}
                  </h4>
                  <p className="pr-svc__feature-desc">
                    {t(`promesas.services.${service}.features.f${n}.desc`)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <aside className="pr-svc__overview">
            <p>{t(`promesas.services.${service}.overview`)}</p>
          </aside>

          <div className="pr-svc__promises">
            <span className="pr-kicker">
              {t("promesas.services.promisesTitle")}
            </span>
            <div className="pr-svc__promise-row">
              {[1, 2, 3].map((n) => (
                <div key={n} className="pr-svc__promise">
                  <span className="pr-svc__promise-badge" aria-hidden>
                    {n}
                  </span>
                  <p>{t(`promesas.services.${service}.promises.item${n}`)}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="pr-disclaimer">{t("promesas.disclaimer")}</p>

          <div className="pr-svc__cta">
            <Link
              to={SERVICE_QUOTE_LINKS[service]}
              className="pr-btn pr-btn--primary"
            >
              {t("promesas.cta.quote")}
              <ArrowRight size={16} strokeWidth={2} aria-hidden />
            </Link>
            <Link to="/trackings" className="pr-btn pr-btn--ghost">
              {t("promesas.cta.tracking")}
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
};

export default PromesasServicesTab;
