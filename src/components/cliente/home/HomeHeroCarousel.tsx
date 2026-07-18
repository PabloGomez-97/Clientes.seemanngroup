import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { imgUrl } from "../../../config/images";

export interface HeroSlide {
  image: string;
  title: string;
  subtitle: string;
  button: { text: string; link: string };
  dynamic?: boolean;
}

interface HomeHeroCarouselProps {
  slides: HeroSlide[];
  activeShipmentsCount: number;
}

const SLIDE_DURATION_MS = 20000;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  return reduced;
}

const HomeHeroCarousel: React.FC<HomeHeroCarouselProps> = ({
  slides,
  activeShipmentsCount,
}) => {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const resolvedSlides = useMemo(() => {
    if (activeShipmentsCount <= 0) {
      return slides.filter((s) => !s.dynamic);
    }
    return slides.map((s) =>
      s.dynamic
        ? {
            ...s,
            title: t("home.slideDynamic.title", {
              count: activeShipmentsCount,
            }),
            subtitle: t("home.slideDynamic.subtitle"),
            button: {
              text: t("home.slideDynamic.button"),
              link: "/trackings",
            },
          }
        : s,
    );
  }, [slides, activeShipmentsCount, t]);

  const resolveImage = (p?: string): string => {
    if (!p) return "";
    return p.startsWith("http") ? p : imgUrl(p);
  };

  const autoplay = resolvedSlides.length > 1 && !paused && !reducedMotion;

  useEffect(() => {
    if (!autoplay) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % resolvedSlides.length);
    }, SLIDE_DURATION_MS);
    return () => clearInterval(interval);
  }, [autoplay, resolvedSlides.length, currentSlide]);

  useEffect(() => {
    setCurrentSlide(0);
  }, [resolvedSlides.length]);

  const goPrev = () =>
    setCurrentSlide(
      (prev) => (prev - 1 + resolvedSlides.length) % resolvedSlides.length,
    );
  const goNext = () =>
    setCurrentSlide((prev) => (prev + 1) % resolvedSlides.length);

  const activeRef = useRef<number>(currentSlide);
  activeRef.current = currentSlide;

  if (resolvedSlides.length === 0) return null;

  const multiple = resolvedSlides.length > 1;

  return (
    <div
      className="hme-hero"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="hme-hero__stage">
        {resolvedSlides.map((slide, index) => (
          <div
            key={index}
            className={`hme-hero__slide${
              index === currentSlide ? " is-active" : ""
            }`}
            aria-hidden={index !== currentSlide}
          >
            <img
              className="hme-hero__img"
              src={resolveImage(slide.image)}
              alt=""
              draggable={false}
            />
            <div className="hme-hero__overlay" />
            <div className="hme-hero__content">
              <div className="hme-hero__content-inner">
                {slide.dynamic && (
                  <span className="hme-hero__eyebrow">
                    <span className="hme-hero__eyebrow-dot" />
                    {t("home.hero.liveEyebrow")}
                  </span>
                )}
                <h2 className="hme-hero__title">{slide.title}</h2>
                {slide.subtitle && (
                  <p className="hme-hero__subtitle">{slide.subtitle}</p>
                )}
                {slide.button.text && (
                  <Link to={slide.button.link} className="hme-hero__cta">
                    {slide.button.text}
                    <span aria-hidden>→</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {multiple && (
        <div className="hme-hero__controls">
          <button
            type="button"
            className="hme-hero__nav hme-hero__nav--prev"
            onClick={goPrev}
            aria-label={t("home.hero.prevSlide")}
          >
            <span aria-hidden>‹</span>
          </button>
          <div className="hme-hero__dots">
            {resolvedSlides.map((_, index) => (
              <button
                key={index}
                type="button"
                className={`hme-hero__dot${
                  index === currentSlide ? " is-active" : ""
                }`}
                onClick={() => setCurrentSlide(index)}
                aria-label={t("home.hero.goToSlide", { n: index + 1 })}
              >
                {index === currentSlide && autoplay && (
                  <span
                    key={currentSlide}
                    className="hme-hero__dot-progress"
                    style={{ animationDuration: `${SLIDE_DURATION_MS}ms` }}
                  />
                )}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="hme-hero__nav hme-hero__nav--next"
            onClick={goNext}
            aria-label={t("home.hero.nextSlide")}
          >
            <span aria-hidden>›</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default HomeHeroCarousel;
