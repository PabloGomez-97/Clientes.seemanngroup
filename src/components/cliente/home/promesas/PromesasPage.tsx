import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Building2, Handshake, LayoutGrid } from "lucide-react";
import type { PromesasSection, ServiceModality } from "./constants";
import PromesasCompanyTab from "./PromesasCompanyTab";
import PromesasCommitmentsTab from "./PromesasCommitmentsTab";
import PromesasServicesTab from "./PromesasServicesTab";
import "./Promesas.css";

const CHAPTER_ICONS = {
  company: Building2,
  commitments: Handshake,
  services: LayoutGrid,
} as const;

const CHAPTER_IDS: PromesasSection[] = ["company", "commitments", "services"];

const PromesasPage: React.FC = () => {
  const { t } = useTranslation();
  const [active, setActive] = useState<PromesasSection>("company");
  const [service, setService] = useState<ServiceModality>("sea");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const id = visible[0]?.target.getAttribute("data-chapter");
        if (id) setActive(id as PromesasSection);
      },
      { rootMargin: "-35% 0px -45% 0px", threshold: [0, 0.1, 0.5] },
    );
    CHAPTER_IDS.forEach((id) => {
      const el = sectionRefs.current[id];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollToChapter = (id: PromesasSection) => {
    sectionRefs.current[id]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const chapters = CHAPTER_IDS.map((id, index) => ({
    id,
    index,
    label: t(`promesas.tabs.${id}`),
    Icon: CHAPTER_ICONS[id],
  }));

  return (
    <div className="pr-page">
      {/* ── Encabezado editorial claro ── */}
      <header className="pr-hero">
        <div className="pr-hero__inner">
          <div className="pr-hero__copy">
            <span className="pr-hero__eyebrow">
              {t("promesas.hero.eyebrow")}
            </span>
            <h1 className="pr-hero__title">{t("promesas.hero.title")}</h1>
            <p className="pr-hero__subtitle">{t("promesas.hero.subtitle")}</p>
          </div>

          <dl className="pr-hero__stats">
            <div className="pr-hero__stat">
              <dt className="pr-hero__stat-value">35+</dt>
              <dd className="pr-hero__stat-label">
                {t("promesas.hero.stats.experience")}
              </dd>
            </div>
            <div className="pr-hero__stat">
              <dt className="pr-hero__stat-value">5</dt>
              <dd className="pr-hero__stat-label">
                {t("promesas.hero.stats.modalities")}
              </dd>
            </div>
            <div className="pr-hero__stat">
              <dt className="pr-hero__stat-value">1</dt>
              <dd className="pr-hero__stat-label">
                {t("promesas.hero.stats.contact")}
              </dd>
            </div>
          </dl>
        </div>
      </header>

      {/* ── Nav de capítulos: chips sticky en móvil/tablet ── */}
      <nav className="pr-chips" aria-label={t("promesas.tabs.aria")}>
        {chapters.map(({ id, index, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`pr-chip${active === id ? " pr-chip--active" : ""}`}
            aria-current={active === id ? "true" : undefined}
            onClick={() => scrollToChapter(id)}
          >
            <Icon size={14} strokeWidth={1.75} aria-hidden />
            <span className="pr-chip__num" aria-hidden>
              {String(index + 1).padStart(2, "0")}
            </span>
            {label}
          </button>
        ))}
      </nav>

      <div className="pr-body">
        {/* ── Nav lateral fija (desktop) ── */}
        <aside className="pr-rail" aria-label={t("promesas.tabs.aria")}>
          <div className="pr-rail__inner">
            {chapters.map(({ id, index, label, Icon }) => (
              <button
                key={id}
                type="button"
                className={`pr-rail__item${
                  active === id ? " pr-rail__item--active" : ""
                }`}
                aria-current={active === id ? "true" : undefined}
                onClick={() => scrollToChapter(id)}
              >
                <span className="pr-rail__num" aria-hidden>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="pr-rail__label">
                  <Icon size={15} strokeWidth={1.75} aria-hidden />
                  {label}
                </span>
              </button>
            ))}
            <div className="pr-rail__track" aria-hidden>
              <div
                className="pr-rail__progress"
                style={{
                  height: `${((CHAPTER_IDS.indexOf(active) + 1) / CHAPTER_IDS.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </aside>

        {/* ── Capítulos ── */}
        <main className="pr-chapters">
          <section
            ref={(el) => {
              sectionRefs.current.company = el;
            }}
            data-chapter="company"
            className="pr-chapter pr-chapter--light"
            aria-labelledby="pr-ch-company"
          >
            <header className="pr-chapter__head">
              <span className="pr-chapter__num" aria-hidden>
                01
              </span>
              <h2 id="pr-ch-company" className="pr-chapter__title">
                {t("promesas.tabs.company")}
              </h2>
            </header>
            <PromesasCompanyTab />
          </section>

          <section
            ref={(el) => {
              sectionRefs.current.commitments = el;
            }}
            data-chapter="commitments"
            className="pr-chapter pr-chapter--dark"
            aria-labelledby="pr-ch-commitments"
          >
            <header className="pr-chapter__head">
              <span className="pr-chapter__num" aria-hidden>
                02
              </span>
              <h2 id="pr-ch-commitments" className="pr-chapter__title">
                {t("promesas.tabs.commitments")}
              </h2>
            </header>
            <PromesasCommitmentsTab />
          </section>

          <section
            ref={(el) => {
              sectionRefs.current.services = el;
            }}
            data-chapter="services"
            className="pr-chapter pr-chapter--light"
            aria-labelledby="pr-ch-services"
          >
            <header className="pr-chapter__head">
              <span className="pr-chapter__num" aria-hidden>
                03
              </span>
              <h2 id="pr-ch-services" className="pr-chapter__title">
                {t("promesas.tabs.services")}
              </h2>
            </header>
            <PromesasServicesTab
              service={service}
              onServiceChange={setService}
            />
          </section>
        </main>
      </div>
    </div>
  );
};

export default PromesasPage;
