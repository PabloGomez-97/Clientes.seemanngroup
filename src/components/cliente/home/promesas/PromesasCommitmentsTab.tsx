import React from "react";
import { useTranslation } from "react-i18next";
import { Check, Globe2, Radar, Award, Headset } from "lucide-react";
import { VALUE_PILLAR_KEYS } from "./constants";

const PILLAR_ICONS = {
  global: Globe2,
  anticipate: Radar,
  experience: Award,
  support: Headset,
} as const;

const PromesasCommitmentsTab: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="pr-commit">
      <p className="pr-commit__intro">{t("promesas.commitments.intro")}</p>

      <div className="pr-commit__pillars">
        {VALUE_PILLAR_KEYS.map((key, index) => {
          const Icon = PILLAR_ICONS[key];
          return (
            <article key={key} className="pr-commit__pillar">
              <div className="pr-commit__pillar-top">
                <span className="pr-commit__pillar-num" aria-hidden>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="pr-commit__pillar-icon" aria-hidden>
                  <Icon size={19} strokeWidth={1.75} />
                </span>
              </div>
              <h3 className="pr-commit__pillar-title">
                {t(`promesas.commitments.pillars.${key}.title`)}
              </h3>
              <p className="pr-commit__pillar-desc">
                {t(`promesas.commitments.pillars.${key}.desc`)}
              </p>
            </article>
          );
        })}
      </div>

      <section className="pr-commit__pact">
        <span className="pr-kicker pr-kicker--dark">
          {t("promesas.commitments.clientTitle")}
        </span>

        <ol className="pr-commit__list">
          {[1, 2, 3, 4, 5].map((n) => (
            <li key={n} className="pr-commit__item">
              <span className="pr-commit__mark" aria-hidden>
                <Check size={13} strokeWidth={2.5} />
              </span>
              <span className="pr-commit__text">
                {t(`promesas.commitments.clientItems.item${n}`)}
              </span>
            </li>
          ))}
        </ol>

        <p className="pr-disclaimer pr-disclaimer--dark">
          {t("promesas.disclaimer")}
        </p>
      </section>
    </div>
  );
};

export default PromesasCommitmentsTab;
