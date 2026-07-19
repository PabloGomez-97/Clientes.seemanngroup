import React from "react";
import { useTranslation } from "react-i18next";
import {
  Compass,
  Eye,
  Heart,
  Sparkles,
  Shield,
  MessageCircle,
  Zap,
  RefreshCw,
} from "lucide-react";
import { COMPANY_VALUE_KEYS } from "./constants";

const VALUE_ICONS = {
  empathy: Heart,
  personalization: Sparkles,
  responsibility: Shield,
  sincerity: MessageCircle,
  commitment: Zap,
  flexibility: RefreshCw,
} as const;

const PromesasCompanyTab: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="pr-company">
      {/* Historia: número gigante + 3 hitos editoriales */}
      <section className="pr-story">
        <div className="pr-story__lead">
          <span className="pr-story__giant" aria-hidden>
            35<span className="pr-story__giant-plus">+</span>
          </span>
          <div className="pr-story__lead-copy">
            <span className="pr-kicker">
              {t("promesas.company.history.title")}
            </span>
            <h3 className="pr-story__headline">
              {t("promesas.company.storyHeadline")}
            </h3>
          </div>
        </div>

        <div className="pr-story__beats">
          {(["p1", "p2", "p3"] as const).map((key, i) => (
            <article key={key} className="pr-story__beat">
              <span className="pr-story__beat-num" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="pr-story__beat-text">
                {t(`promesas.company.history.${key}`)}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Misión y visión */}
      <section className="pr-dual">
        <article className="pr-dual__card">
          <span className="pr-dual__icon" aria-hidden>
            <Compass size={20} strokeWidth={1.75} />
          </span>
          <h3 className="pr-dual__title">
            {t("promesas.company.mission.title")}
          </h3>
          <p className="pr-dual__text">{t("promesas.company.mission.p1")}</p>
          <p className="pr-dual__text pr-dual__text--muted">
            {t("promesas.company.mission.p2")}
          </p>
        </article>

        <article className="pr-dual__card pr-dual__card--accent">
          <span className="pr-dual__icon" aria-hidden>
            <Eye size={20} strokeWidth={1.75} />
          </span>
          <h3 className="pr-dual__title">
            {t("promesas.company.vision.title")}
          </h3>
          <p className="pr-dual__text">{t("promesas.company.vision.p1")}</p>
          <p className="pr-dual__text pr-dual__text--muted">
            {t("promesas.company.vision.p2")}
          </p>
        </article>
      </section>

      {/* Valores en bento */}
      <section className="pr-values">
        <div className="pr-values__head">
          <span className="pr-kicker">
            {t("promesas.company.values.title")}
          </span>
          <p className="pr-values__intro">
            {t("promesas.company.values.intro")}
          </p>
        </div>

        <ul className="pr-values__grid">
          {COMPANY_VALUE_KEYS.map((key, index) => {
            const Icon = VALUE_ICONS[key];
            const wide = index === 0 || index === 3;
            return (
              <li
                key={key}
                className={`pr-values__tile${wide ? " pr-values__tile--wide" : ""}`}
              >
                <span className="pr-values__icon" aria-hidden>
                  <Icon size={17} strokeWidth={1.75} />
                </span>
                <h4 className="pr-values__title">
                  {t(`promesas.company.values.${key}.title`)}
                </h4>
                <p className="pr-values__desc">
                  {t(`promesas.company.values.${key}.description`)}
                </p>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
};

export default PromesasCompanyTab;
