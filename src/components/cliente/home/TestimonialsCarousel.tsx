import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import "@/components/cliente/styles/TestimonialsCarousel.css";

interface Testimonial {
  id: number;
  name: string;
  company: string;
  role: string;
  quote_es: string;
  quote_en: string;
  rating: number;
  initials: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: 1,
    name: "M Vargas",
    company: "Bioled",
    role: "NA",
    quote_es:
      "La comunicación con nuestra ejecutiva es excelente, sumamente profesional y resolutiva en su rol",
    quote_en:
      "The communication with our executive is excellent, extremely professional and resourceful in her role",
    rating: 5,
    initials: "MV",
  },
  {
    id: 2,
    name: "Rafa Banduc",
    company: "No especificada",
    role: "NA",
    quote_es:
      "Excelentes ejecutivos. La gente encargada de la información de las cargas también excelente. Me gustó que uno pueda editar la información de las cargas, en mi caso agregando el proveedor a esa información.",
    quote_en:
      "Excellent executives. The people in charge of the cargo information are also excellent. I liked that one can edit the cargo information, in my case adding the supplier to that information.",
    rating: 5,
    initials: "RB",
  },
  {
    id: 3,
    name: "S. Santos",
    company: "Andover",
    role: "NA",
    quote_es: "Rápida comunicación, y siempre la información disponible",
    quote_en: "Quick communication, and always the information available",
    rating: 5,
    initials: "SS",
  },
  {
    id: 4,
    name: "Vicente Soza",
    company: "REISACHILE",
    role: "NA",
    quote_es: "Buenos precios, cotización rápida.",
    quote_en: "Good prices, quick quotation.",
    rating: 5,
    initials: "VS",
  },
];

const StarIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15" aria-hidden="true">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const TestimonialsCarousel: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [current, setCurrent] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const total = TESTIMONIALS.length;
  const isEs = i18n.language === "es";

  const goTo = useCallback((index: number) => {
    setCurrent(index);
    setAnimKey((k) => k + 1);
  }, []);

  const next = useCallback(
    () => goTo((current + 1) % total),
    [current, total, goTo],
  );

  const prev = useCallback(
    () => goTo((current - 1 + total) % total),
    [current, total, goTo],
  );

  useEffect(() => {
    const interval = setInterval(next, 10000);
    return () => clearInterval(interval);
  }, [next]);

  const item = TESTIMONIALS[current];
  const quote = isEs ? item.quote_es : item.quote_en;
  const showCompany = item.company && item.company !== "No especificada";
  const showRole = item.role && item.role !== "NA";

  const tabLabel = (testimonial: Testimonial) =>
    testimonial.company !== "No especificada"
      ? testimonial.company
      : testimonial.name;

  return (
    <section
      className="hal-testimonials-section"
      aria-label={t("home.testimonials.title")}
    >
      <header className="hal-testimonials-header">
        <p className="hal-testimonials-eyebrow">{t("home.testimonials.label")}</p>
        <h2 className="hal-testimonials-heading">{t("home.testimonials.title")}</h2>
      </header>

      <div className="hal-testimonials-stage">
        <button
          type="button"
          className="hal-testimonials-nav"
          onClick={prev}
          aria-label={t("home.hero.prevSlide")}
        >
          ‹
        </button>

        <article
          key={animKey}
          className="hal-testimonials-panel"
          aria-live="polite"
        >
          <div
            className="hal-testimonial-stars"
            aria-label={`${item.rating} de 5 estrellas`}
          >
            {Array.from({ length: item.rating }).map((_, i) => (
              <span key={i} className="hal-testimonial-star">
                <StarIcon />
              </span>
            ))}
          </div>

          <blockquote className="hal-testimonial-quote">{quote}</blockquote>

          <div className="hal-testimonials-divider" aria-hidden="true" />

          <footer className="hal-testimonial-author">
            <div className="hal-testimonial-avatar" aria-hidden="true">
              {item.initials}
            </div>
            <div className="hal-testimonial-meta">
              <strong>{item.name}</strong>
              {showRole && <span>{item.role}</span>}
              {showCompany && (
                <span className="hal-testimonial-company">{item.company}</span>
              )}
            </div>
          </footer>
        </article>

        <button
          type="button"
          className="hal-testimonials-nav"
          onClick={next}
          aria-label={t("home.hero.nextSlide")}
        >
          ›
        </button>
      </div>

      <nav className="hal-testimonials-tabs" aria-label={t("home.testimonials.title")}>
        {TESTIMONIALS.map((testimonial, index) => (
          <button
            key={testimonial.id}
            type="button"
            className={`hal-testimonials-tab${index === current ? " is-active" : ""}`}
            onClick={() => goTo(index)}
            aria-current={index === current ? "true" : undefined}
          >
            {tabLabel(testimonial)}
          </button>
        ))}
      </nav>
    </section>
  );
};

export default TestimonialsCarousel;
