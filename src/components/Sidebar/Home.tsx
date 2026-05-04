import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { imgUrl } from "../../config/images";
import { getRecentPosts } from "../../services/contentful";
import type { BlogPost } from "../../services/contentful";
import "./styles/Home.css";
import ItineraryFinder from "../ItineraryFinder";
import TestimonialsCarousel from "./TestimonialsCarousel";
import { useAuth } from "../../auth/AuthContext";

// ── Types for the status bar ──────────────────────────────────────────────
const HM_API_BASE =
  import.meta.env.MODE === "development"
    ? "http://localhost:4000"
    : "https://portalclientes.seemanngroup.com";

interface HmAirItem {
  kind: "air";
  id: number;
  awb: string;
  origin: string;
  destination: string;
  delivered: boolean;
}
interface HmOceanItem {
  kind: "ocean";
  id: number;
  container: string;
  origin: string;
  destination: string;
  delivered: boolean;
}
type HmCarouselItem = HmAirItem | HmOceanItem;

const Home: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);

  // ── Status bar data ───────────────────────────────────────────────────
  const { activeUsername } = useAuth();
  const [hmAir, setHmAir] = useState<HmAirItem[]>([]);
  const [hmOcean, setHmOcean] = useState<HmOceanItem[]>([]);
  const [hmLoading, setHmLoading] = useState(true);

  useEffect(() => {
    if (!activeUsername) return;
    let cancelled = false;

    const fetchAll = async () => {
      setHmLoading(true);
      try {
        // Air shipments (en tránsito + aterrizado/entregado)
        const airRes = await fetch(`${HM_API_BASE}/api/shipsgo/shipments`);
        if (airRes.ok) {
          const airData = await airRes.json();
          const ships: Record<string, unknown>[] = Array.isArray(
            airData.shipments,
          )
            ? airData.shipments
            : [];
          const airItems: HmAirItem[] = ships
            .filter(
              (s) =>
                s.reference === activeUsername &&
                (s.status === "EN_ROUTE" ||
                  s.status === "LANDED" ||
                  s.status === "DELIVERED"),
            )
            .map((s) => {
              const route = s.route as {
                origin: { location: { iata: string } };
                destination: { location: { iata: string } };
              } | null;
              return {
                kind: "air" as const,
                id: s.id as number,
                awb: (s.awb_number as string) || "—",
                origin: route?.origin?.location?.iata || "—",
                destination: route?.destination?.location?.iata || "—",
                delivered: s.status === "LANDED" || s.status === "DELIVERED",
              };
            });
          if (!cancelled) setHmAir(airItems);
        }

        // Ocean shipments (navegando + descargado/llegado)
        const oceanRes = await fetch(
          `${HM_API_BASE}/api/shipsgo/ocean/shipments`,
        );
        if (oceanRes.ok) {
          const oceanData = await oceanRes.json();
          const ships2: Record<string, unknown>[] = Array.isArray(
            oceanData.shipments,
          )
            ? oceanData.shipments
            : [];
          const oceanItems: HmOceanItem[] = ships2
            .filter(
              (s) =>
                s.reference === activeUsername &&
                (s.status === "SAILING" ||
                  s.status === "ARRIVED" ||
                  s.status === "DISCHARGED"),
            )
            .map((s) => {
              const route = s.route as {
                port_of_loading: { location: { code: string } };
                port_of_discharge: { location: { code: string } };
              } | null;
              return {
                kind: "ocean" as const,
                id: s.id as number,
                container:
                  (s.container_number as string) ||
                  (s.booking_number as string) ||
                  `#${s.id}`,
                origin: route?.port_of_loading?.location?.code || "—",
                destination: route?.port_of_discharge?.location?.code || "—",
                delivered: s.status === "ARRIVED" || s.status === "DISCHARGED",
              };
            });
          if (!cancelled) setHmOcean(oceanItems);
        }
      } catch {
        // silently ignore — bar just stays hidden
      } finally {
        if (!cancelled) setHmLoading(false);
      }
    };

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [activeUsername]);

  const hmItems = useMemo<HmCarouselItem[]>(
    () => [...hmAir, ...hmOcean],
    [hmAir, hmOcean],
  );
  const hmShowBar = !hmLoading;

  const dateLocale = i18n.language === "es" ? es : enUS;

  useEffect(() => {
    getRecentPosts(4).then(setBlogPosts);
  }, []);

  const formatBlogDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "d MMM yyyy", { locale: dateLocale });
    } catch {
      return dateStr;
    }
  };

  const slides = [
    {
      image: "/placeholder1.png",
      title: t("home.slide1.title"),
      subtitle: t("home.slide1.subtitle"),
      button: { text: t("home.slide1.button"), link: "/newquotes" },
    },
    {
      image: "/placeholder2.png",
      title: t("home.slide2.title"),
      subtitle: t("home.slide2.subtitle"),
      button: { text: t("home.slide2.button"), link: "/new-tracking" },
    },
    {
      image: "/placeholder3.png",
      title: t("home.slide3.title"),
      subtitle: t("home.slide3.subtitle"),
      button: { text: t("home.slide3.button"), link: "/newquotes" },
    },
  ];

  const resolveImage = (p?: string): string => {
    if (!p) return "";
    return p.startsWith("http") ? p : imgUrl(p);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  return (
    <>
      {/* ── Status bar ──────────────────────────────────────────────────── */}
      {hmShowBar && (
        <div className="hm-activity-bar">
          <div className="ej-activity-bar__label">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Actividad Reciente
          </div>
          <div className="hm-activity-bar__carousel">
            <div className="hm-activity-bar__track">
              {hmItems.length === 0
                ? // No activity — show two alternating placeholder messages
                  [
                    {
                      id: 1,
                      text: "No hay Actividad por el momento",
                      icon: "○",
                    },
                    {
                      id: 2,
                      text: "Tus embarques activos aparecerán aquí",
                      icon: "◇",
                    },
                    {
                      id: 3,
                      text: "No hay Actividad por el momento",
                      icon: "○",
                    },
                    {
                      id: 4,
                      text: "Tus embarques activos aparecerán aquí",
                      icon: "◇",
                    },
                    {
                      id: 5,
                      text: "No hay Actividad por el momento",
                      icon: "○",
                    },
                    {
                      id: 6,
                      text: "Tus embarques activos aparecerán aquí",
                      icon: "◇",
                    },
                    {
                      id: 7,
                      text: "No hay Actividad por el momento",
                      icon: "○",
                    },
                    {
                      id: 8,
                      text: "Tus embarques activos aparecerán aquí",
                      icon: "◇",
                    },
                  ].map((item) => (
                    <div
                      key={item.id}
                      className="hm-activity-bar__chip hm-activity-bar__chip--empty"
                    >
                      <span className="hm-activity-bar__empty-icon">
                        {item.icon}
                      </span>
                      <span className="hm-activity-bar__empty-text">
                        {item.text}
                      </span>
                    </div>
                  ))
                : [...hmItems, ...hmItems].map((item, idx) => {
                    if (item.kind === "air") {
                      return (
                        <div
                          key={`air-${item.id}-${idx}`}
                          className={`hm-activity-bar__chip${
                            item.delivered
                              ? " hm-activity-bar__chip--delivered"
                              : ""
                          }`}
                          onClick={() => navigate("/trackings-aereo")}
                        >
                          <span
                            className={`hm-activity-bar__badge hm-activity-bar__badge--${
                              item.delivered ? "landed" : "air"
                            }`}
                          >
                            {item.delivered ? "Aterrizado" : "En tránsito"}
                          </span>
                          <span className="hm-activity-bar__chip-number">
                            {item.awb}
                          </span>
                          <span className="hm-activity-bar__chip-route">
                            {item.origin} → {item.destination}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`ocean-${item.id}-${idx}`}
                        className={`hm-activity-bar__chip${
                          item.delivered
                            ? " hm-activity-bar__chip--delivered"
                            : ""
                        }`}
                        onClick={() => navigate("/trackings-maritimo")}
                      >
                        <span
                          className={`hm-activity-bar__badge hm-activity-bar__badge--${
                            item.delivered ? "discharged" : "ocean"
                          }`}
                        >
                          {item.delivered ? "Descargado" : "Navegando"}
                        </span>
                        <span className="hm-activity-bar__chip-number">
                          {item.container}
                        </span>
                        <span className="hm-activity-bar__chip-route">
                          {item.origin} → {item.destination}
                        </span>
                      </div>
                    );
                  })}
            </div>
          </div>

          {hmItems.length > 5 && (
            <button
              className="hm-activity-bar__see-all"
              onClick={() => navigate("/trackings")}
            >
              Ver más →
            </button>
          )}
        </div>
      )}

      <div className="hal-page-container">
        {/* Carousel Section */}
        <div className="hal-page-container-content">
          <div className="carousel parbase">
            <div className="hal-stage-teaser-carousel">
              <div className="hal-stage-teaser-carousel-container">
                <div className="hal-stage-teaser-carousel-content">
                  {slides.map((slide, index) => (
                    <div
                      key={index}
                      className={`hal-stage-teaser-carousel-item ${index === currentSlide ? "active" : ""}`}
                    >
                      <div className="hal-stage-teaser-img-txt">
                        <div className="hal-stage-teaser-img-txt-scene">
                          <div className="hal-stage-teaser-img-txt-wrapper">
                            <div className="hal-picture-wrapper">
                              <img
                                src={resolveImage(slide.image)}
                                alt={`Slide ${index + 1}`}
                              />
                            </div>
                          </div>
                          <div className="hal-stage-teaser-img-txt-content hal-textcolor--light-desktop">
                            <div className="hal-stage-teaser-img-txt-content-inner">
                              <h2 className="hal-h0">{slide.title}</h2>
                              {slide.subtitle && (
                                <div className="hal-copy">
                                  <p>{slide.subtitle}</p>
                                </div>
                              )}
                              <div className="hal-button-container">
                                <Link
                                  to={slide.button.link}
                                  className="hal-button hal-button--primary"
                                >
                                  {slide.button.text}
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  className="hal-stage-teaser-carousel-prev"
                  onClick={handlePrevSlide}
                  aria-label="Previous"
                ></button>
                <button
                  className="hal-stage-teaser-carousel-next"
                  onClick={handleNextSlide}
                  aria-label="Next"
                ></button>
                <div className="hal-stage-teaser-carousel-dots">
                  {slides.map((_, index) => (
                    <button
                      key={index}
                      className={`hal-stage-teaser-carousel-dot ${index === currentSlide ? "hal-stage-teaser-carousel-dot-active" : ""}`}
                      onClick={() => setCurrentSlide(index)}
                      aria-label={`Go to slide ${index + 1}`}
                    ></button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Section */}
        <div className="hal-page-container-content">
          {/* Section Headline */}
          <div className="sectionheadline">
            <div className="hal-page-container-content">
              <div className="hal-section-headline">
                <p className="hal-h4">{t("home.headline.company")}</p>
                <h1 className="hal-h1">{t("home.headline.title")}</h1>
              </div>
            </div>
          </div>

          {/* Quick Access Tools Section */}
          <div className="containermodule parbase">
            <div className="hal-page-container-content">
              <div className="hal-container hal-container--plain hal-module--light">
                <div className="hal-container-content">
                  {/* ItineraryFinder Row */}
                  <div
                    className="hal-columns hal-columns--1"
                    style={{ gridTemplateColumns: "1fr" }}
                  >
                    <div className="hal-column">
                      <div className="hal-column-content">
                        <div className="hal-contentqat">
                          <span className="hal-schedule-panel">
                            <span className="hal-schedule-head">
                              <span className="hal-schedule-icon">
                                <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H9v6l5.25 3.15.75-1.23-4.5-2.67z" />
                                </svg>
                              </span>
                              <label className="hal-label">
                                {t("home.itinerary.label")}
                              </label>
                            </span>
                            <div className="itinerary-finder-wrapper">
                              <ItineraryFinder />
                            </div>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Three Cards Row */}
                  <div
                    className="hal-columns hal-columns--3"
                    style={{ display: "flex", gap: "20px" }}
                  >
                    <div className="hal-column" style={{ flex: 1 }}>
                      <div
                        className="hal-column-content"
                        style={{ display: "flex", flexDirection: "column" }}
                      >
                        <div
                          className="hal-container-tracing"
                          style={{
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                          }}
                        >
                          <div className="hal-container-tracing-panel">
                            <div className="hal-container-tracing-head">
                              <span className="hal-container-tracing-icon">
                                <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path d="M10 2c-3.31 0-6 2.69-6 6 0 4.5 6 10 6 10s6-5.5 6-10c0-3.31-2.69-6-6-6zm0 8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
                                </svg>
                              </span>
                              <label className="hal-label">
                                {t("home.tracking.label")}
                              </label>
                            </div>
                            <div
                              className="hal-container-tracing-body"
                              style={{
                                flexGrow: 1,
                                display: "flex",
                                flexDirection: "column",
                              }}
                            >
                              <div className="hal-input-wrapper">
                                <label className="hal-input-label">
                                  {t("home.tracking.inputLabel")}
                                </label>
                                <input
                                  type="text"
                                  className="hal-input-tracking"
                                  placeholder={t("home.tracking.placeholder")}
                                  value={trackingNumber}
                                  onChange={(e) =>
                                    setTrackingNumber(e.target.value)
                                  }
                                />
                              </div>
                              <div className="hal-button-wrapper">
                                <Link
                                  to={`/new-tracking?awb=${encodeURIComponent(trackingNumber)}`}
                                  className="hal-button hal-button--primary"
                                >
                                  {t("home.tracking.button")}
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="hal-column" style={{ flex: 1 }}>
                      <div
                        className="hal-column-content"
                        style={{ display: "flex", flexDirection: "column" }}
                      >
                        <div className="hal-contentqat">
                          <span
                            className="hal-contentqat-panel"
                            style={{
                              height: "100%",
                              display: "flex",
                              flexDirection: "column",
                            }}
                          >
                            <span className="hal-contentqat-head">
                              <span className="hal-contentqat-icon">
                                <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path d="M17 6h-2V3c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v14c0 .55.45 1 1 1h10c.55 0 1-.45 1-1v-3h2c.55 0 1-.45 1-1V7c0-.55-.45-1-1-1zM4 3h10v3H4V3zm10 14H4V8h10v9zm3-4h-2V9h2v4z" />
                                </svg>
                              </span>
                              <label className="hal-label">
                                {t("home.quote.label")}
                              </label>
                            </span>
                            <span
                              className="hal-contentqat-body"
                              style={{
                                flexGrow: 1,
                                display: "flex",
                                flexDirection: "column",
                              }}
                            >
                              <span
                                className="hal-contentqat-text-wrapper"
                                style={{ flexGrow: 1 }}
                              >
                                <p className="hal-contentqat-text">
                                  {t("home.quote.text")}
                                </p>
                              </span>
                              <span className="hal-contentqat-button-wrapper">
                                <Link
                                  to="/newquotes"
                                  className="hal-button hal-button--primary"
                                >
                                  {t("home.quote.button")}
                                </Link>
                              </span>
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="hal-column" style={{ flex: 1 }}>
                      <div
                        className="hal-column-content"
                        style={{ display: "flex", flexDirection: "column" }}
                      >
                        <div className="hal-contentqat">
                          <span
                            className="hal-contentqat-panel"
                            style={{
                              height: "100%",
                              display: "flex",
                              flexDirection: "column",
                            }}
                          >
                            <span className="hal-contentqat-head">
                              <span className="hal-contentqat-icon">
                                <svg
                                  width="20"
                                  height="20"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path d="M17 2H3c-.55 0-1 .45-1 1v14c0 .55.45 1 1 1h14c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm-1 14H4V4h12v12zM7 11h6v2H7zm0-3h6v2H7z" />
                                </svg>
                              </span>
                              <label className="hal-label">
                                {t("home.booking.label")}
                              </label>
                            </span>
                            <span
                              className="hal-contentqat-body"
                              style={{
                                flexGrow: 1,
                                display: "flex",
                                flexDirection: "column",
                              }}
                            >
                              <span
                                className="hal-contentqat-text-wrapper"
                                style={{ flexGrow: 1 }}
                              >
                                <p className="hal-contentqat-text">
                                  {t("home.booking.text")}
                                </p>
                              </span>
                              <span className="hal-contentqat-button-wrapper">
                                <button className="hal-button hal-button--primary">
                                  {t("home.booking.button")}
                                </button>
                              </span>
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Testimonials (replaces Newsletter) ── */}
          <TestimonialsCarousel />

          {/* News Section */}
          <div className="sectionheadline">
            <div className="hal-page-container-content">
              <div className="hal-section-headline hal-module--border">
                <h2 className="hal-h4">{t("home.news.title")}</h2>
                <h3 className="hal-h1">{t("home.news.subtitle")}</h3>
              </div>
            </div>
          </div>

          <div className="hal-teasers hal-teasers--home">
            <div className="hal-carousel--news">
              {blogPosts.length > 0
                ? blogPosts.map((post) => (
                    <div
                      key={post.id}
                      className="hal-teaser hal-teaser--secondary"
                      onClick={() =>
                        navigate("/novedades", { state: { slug: post.slug } })
                      }
                      style={{ cursor: "pointer" }}
                    >
                      <div className="hal-teaser-content hal-module--grey">
                        <div className="hal-teaser-top">
                          <div
                            className="hal-teaser-img"
                            style={{
                              backgroundImage: post.featuredImageUrl
                                ? `url(${post.featuredImageUrl})`
                                : "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
                            }}
                          ></div>
                          <div className="hal-meta">
                            <time>{formatBlogDate(post.publishDate)}</time>
                          </div>
                        </div>
                        <div className="hal-teaser-bottom">
                          <p className="hal-teaser-text">{post.title}</p>
                        </div>
                      </div>
                    </div>
                  ))
                : [1, 2, 3, 4].map((i) => (
                    <div key={i} className="hal-teaser hal-teaser--secondary">
                      <div className="hal-teaser-content hal-module--grey">
                        <div className="hal-teaser-top">
                          <div
                            className="hal-teaser-img"
                            style={{
                              backgroundImage: `url(${imgUrl(`/insights${i}.png`)})`,
                            }}
                          ></div>
                          <div className="hal-meta">
                            <time>—</time>
                          </div>
                        </div>
                        <div className="hal-teaser-bottom">
                          <p
                            className="hal-teaser-text"
                            style={{ color: "#d1d5db" }}
                          >
                            {t("novedades.loading")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
            </div>
          </div>

          {/* Offices Section */}
          <div className="sectionheadline">
            <div className="hal-page-container-content">
              <div className="hal-section-headline hal-module--border">
                <h2 className="hal-h4">{t("home.offices.title")}</h2>
                <h3 className="hal-h1">{t("home.offices.subtitle")}</h3>
              </div>
            </div>
          </div>

          <div className="containermodule parbase">
            <div className="hal-page-container-content">
              <div className="hal-container hal-container--plain hal-module--light">
                <div className="hal-container-content">
                  <div className="hal-stagenews">
                    <div className="hal-stagenews-scene">
                      <div className="hal-carousel-item hal-carousel-item--left">
                        <picture>
                          <img src={imgUrl("/oficinas.jpg")} alt="Oficinas" />
                        </picture>
                        <div className="hal-stagenews-content hal-stagenews-content--left">
                          <div>
                            <h3 className="hal-h3">
                              {t("home.offices.sectionTitle")}
                            </h3>
                            <div className="hal-button-container">
                              <a
                                className="hal-button hal-button--primary"
                                href="https://seemanngroup.com/seemanngroup/nuestra_empresa.php#historia-section1"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {t("home.offices.button")}
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Company Stats Section */}
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
                          alt="Nuestra Compañía en Números"
                          className="hal-image-with-tiles-image"
                        />
                      </div>
                      <div className="hal-image-with-tiles-content">
                        <div className="hal-image-with-tiles-box hal-image-with-tiles-box--dark-grey">
                          <a href="#" onClick={(e) => e.preventDefault()}>
                            <span>
                              <p className="hal-image-with-tiles-headline">
                                50+
                              </p>
                              <p className="hal-image-with-tiles-subline">
                                {t("home.company.stats.experience")}
                              </p>
                            </span>
                          </a>
                        </div>
                        <div className="hal-image-with-tiles-box hal-image-with-tiles-box--orange">
                          <a href="#" onClick={(e) => e.preventDefault()}>
                            <span>
                              <p className="hal-image-with-tiles-headline">
                                200+
                              </p>
                              <p className="hal-image-with-tiles-subline">
                                {t("home.company.stats.clients")}
                              </p>
                            </span>
                          </a>
                        </div>
                        <div className="hal-image-with-tiles-box hal-image-with-tiles-box--grey">
                          <a href="#" onClick={(e) => e.preventDefault()}>
                            <span>
                              <p className="hal-image-with-tiles-headline">
                                100+
                              </p>
                              <p className="hal-image-with-tiles-subline">
                                {t("home.company.stats.employees")}
                              </p>
                            </span>
                          </a>
                        </div>
                        <div className="hal-image-with-tiles-box hal-image-with-tiles-box--light-grey">
                          <a href="#" onClick={(e) => e.preventDefault()}>
                            <span>
                              <p className="hal-image-with-tiles-headline">
                                15+
                              </p>
                              <p className="hal-image-with-tiles-subline">
                                {t("home.company.stats.countries")}
                              </p>
                            </span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
