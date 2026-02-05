import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./Home.css";
import ItineraryFinder from "./ItineraryFinder";

const Home: React.FC = () => {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [trackingNumber, setTrackingNumber] = useState("");

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
                            <img src={slide.image} alt={`Slide ${index + 1}`} />
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
                        <img src="/oficinas.jpg" alt="Oficinas" />
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
            <div className="hal-teaser hal-teaser--secondary">
              <div className="hal-teaser-content hal-module--grey">
                <a href="#" onClick={(e) => e.preventDefault()}>
                  <div className="hal-teaser-top">
                    <div
                      className="hal-teaser-img"
                      style={{
                        backgroundImage: `url(/insights1.png)`,
                      }}
                    ></div>
                    <div className="hal-meta">
                      <time>4 feb 2026</time>
                    </div>
                  </div>
                  <div className="hal-teaser-bottom">
                    <p className="hal-teaser-text">{t("home.news.item1")}</p>
                  </div>
                </a>
              </div>
            </div>
            <div className="hal-teaser hal-teaser--secondary">
              <div className="hal-teaser-content hal-module--grey">
                <a href="#" onClick={(e) => e.preventDefault()}>
                  <div className="hal-teaser-top">
                    <div
                      className="hal-teaser-img"
                      style={{
                        backgroundImage: `url(/insights2.png)`,
                      }}
                    ></div>
                    <div className="hal-meta">
                      <time>4 feb 2026</time>
                    </div>
                  </div>
                  <div className="hal-teaser-bottom">
                    <p className="hal-teaser-text">{t("home.news.item2")}</p>
                  </div>
                </a>
              </div>
            </div>
            <div className="hal-teaser hal-teaser--secondary">
              <div className="hal-teaser-content hal-module--grey">
                <a href="#" onClick={(e) => e.preventDefault()}>
                  <div className="hal-teaser-top">
                    <div
                      className="hal-teaser-img"
                      style={{
                        backgroundImage: `url(/insights3.png)`,
                      }}
                    ></div>
                    <div className="hal-meta">
                      <time>4 feb 2026</time>
                    </div>
                  </div>
                  <div className="hal-teaser-bottom">
                    <p className="hal-teaser-text">{t("home.news.item3")}</p>
                  </div>
                </a>
              </div>
            </div>
            <div className="hal-teaser hal-teaser--secondary">
              <div className="hal-teaser-content hal-module--grey">
                <a href="#" onClick={(e) => e.preventDefault()}>
                  <div className="hal-teaser-top">
                    <div
                      className="hal-teaser-img"
                      style={{
                        backgroundImage: `url(/insights4.png)`,
                      }}
                    ></div>
                    <div className="hal-meta">
                      <time>4 feb 2026</time>
                    </div>
                  </div>
                  <div className="hal-teaser-bottom">
                    <p className="hal-teaser-text">{t("home.news.item4")}</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="containermodule parbase">
          <div className="hal-page-container-content">
            <div className="hal-container hal-container--plain hal-module--light">
              <div className="hal-container-content">
                <h3 className="hal-h3">{t("home.newsletter.title")}</h3>
                <div className="hal-richtext">
                  <p>{t("home.newsletter.text")}</p>
                </div>
                <div className="hal-button-container">
                  <button className="hal-button hal-button--primary">
                    {t("home.newsletter.button")}
                  </button>
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
                        src="/confianza.png"
                        alt="Nuestra Compañía en Números"
                        className="hal-image-with-tiles-image"
                      />
                    </div>
                    <div className="hal-image-with-tiles-content">
                      <div className="hal-image-with-tiles-box hal-image-with-tiles-box--dark-grey">
                        <a href="#" onClick={(e) => e.preventDefault()}>
                          <span>
                            <p className="hal-image-with-tiles-headline">50+</p>
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
                            <p className="hal-image-with-tiles-headline">15+</p>
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
  );
};

export default Home;
