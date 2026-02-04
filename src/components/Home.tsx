import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./Home.css";

const Home: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [trackingNumber, setTrackingNumber] = useState("");

  const slides = [
    {
      image: "/placeholder1.png",
      title: "Tu carga, nuestra promesa.",
      subtitle: "Por qué tratamos cada carga como si significara el mundo.",
      button: { text: "Descubra nuestras promesas", link: "/newquotes" },
    },
    {
      image: "/placeholder2.png",
      title: "Mejor planificación con datos en tiempo real",
      subtitle: "",
      button: { text: "Más información", link: "/new-tracking" },
    },
    {
      image: "/placeholder3.png",
      title: "Innovación en logística",
      subtitle: "Soluciones inteligentes para un mundo conectado",
      button: { text: "Conocer más", link: "/newquotes" },
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
              <p className="hal-h4">Seemann Group</p>
              <h1 className="hal-h1">Hacemos que el comercio global ocurra</h1>
            </div>
          </div>
        </div>

        {/* Quick Access Tools Section */}
        <div className="containermodule parbase">
          <div className="hal-page-container-content">
            <div className="hal-container hal-container--plain hal-module--light">
              <div className="hal-container-content">
                {/* First Row: Schedule & Tracking */}
                <div className="hal-columns hal-columns--2">
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
                              Encontrar un itinerario
                            </label>
                          </span>
                          <div className="hal-schedule-body">
                            <div className="hal-input-wrapper">
                              <label className="hal-input-label">De</label>
                              <input
                                type="text"
                                className="hal-input"
                                placeholder="Ubicación de origen"
                              />
                            </div>
                            <div className="hal-input-wrapper">
                              <label className="hal-input-label">Para</label>
                              <input
                                type="text"
                                className="hal-input"
                                placeholder="Ubicación de destino"
                              />
                            </div>
                            <div className="hal-input-wrapper">
                              <label className="hal-input-label">Fecha</label>
                              <input type="date" className="hal-input" />
                            </div>
                            <div className="hal-button-wrapper">
                              <button className="hal-button hal-button--primary">
                                ¡Proximamente!
                              </button>
                            </div>
                          </div>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="hal-column">
                    <div className="hal-column-content">
                      <div className="hal-container-tracing">
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
                            <label className="hal-label">Tracking</label>
                          </div>
                          <div className="hal-container-tracing-body">
                            <div className="hal-input-wrapper">
                              <label className="hal-input-label">
                                Ingresar número de Contenedor / Booking o B/L
                              </label>
                              <input
                                type="text"
                                className="hal-input-tracking"
                                placeholder="Número de Contenedor / Booking o B/L"
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
                                Rastrear
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Second Row: Quote & Booking */}
                <div className="hal-columns hal-columns--2">
                  <div className="hal-column">
                    <div className="hal-column-content">
                      <div className="hal-contentqat hal-module--space-sm">
                        <span className="hal-contentqat-panel">
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
                            <label className="hal-label">Cotización</label>
                          </span>
                          <span className="hal-contentqat-body">
                            <span className="hal-contentqat-text-wrapper">
                              <p className="hal-contentqat-text">
                                Su cotización de embarque de contenedores en 30
                                segundos.
                              </p>
                            </span>
                            <span className="hal-contentqat-button-wrapper">
                              <Link
                                to="/newquotes"
                                className="hal-button hal-button--primary"
                              >
                                Obtenga una cotización
                              </Link>
                            </span>
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="hal-column">
                    <div className="hal-column-content">
                      <div className="hal-contentqat hal-module--space-sm">
                        <span className="hal-contentqat-panel">
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
                            <label className="hal-label">Booking</label>
                          </span>
                          <span className="hal-contentqat-body">
                            <span className="hal-contentqat-text-wrapper">
                              <p className="hal-contentqat-text">
                                Su solicitud de reserva guiada.
                              </p>
                            </span>
                            <span className="hal-contentqat-button-wrapper">
                              <button className="hal-button hal-button--primary">
                                Reserve ahora
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
              <h2 className="hal-h4">Alrededor del mundo</h2>
              <h3 className="hal-h1">
                Encuentre su oficina más cercana &amp; información local
              </h3>
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
                        <img src="/oficinas.png" alt="Oficinas" />
                      </picture>
                      <div className="hal-stagenews-content hal-stagenews-content--left">
                        <div>
                          <h3 className="hal-h3">
                            Oficinas &amp; información local
                          </h3>
                          <div className="hal-button-container">
                            <a
                              className="hal-button hal-button--primary"
                              href="https://seemanngroup.com/seemanngroup/nuestra_empresa.php#historia-section1"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Descubrir más
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
              <h2 className="hal-h4">News &amp; Insights</h2>
              <h3 className="hal-h1">Top News: A solo un clic</h3>
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
                    <p className="hal-teaser-text">
                      Nueva ruta Asia‑América acelera entregas
                    </p>
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
                    <p className="hal-teaser-text">
                      Puertos digitales reducen demoras
                    </p>
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
                    <p className="hal-teaser-text">
                      Robots en almacenes: picking 24/7
                    </p>
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
                    <p className="hal-teaser-text">
                      Transporte verde: biocombustibles en aviación
                    </p>
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
                <h3 className="hal-h3">
                  Suscríbete para obtener las últimas noticias y tarifas
                </h3>
                <div className="hal-richtext">
                  <p>
                    ¿Te gusta el transporte marítimo tanto como a nosotros? Ya
                    sean historias emocionantes sobre nuestros empleados en
                    tierra o en el mar, reportajes sobre nuestros clientes de
                    todo el mundo o la información más reciente sobre nuestros
                    servicios: con nuestro boletín siempre le mantenemos al día
                    de las últimas novedades.
                  </p>
                </div>
                <div className="hal-button-container">
                  <button className="hal-button hal-button--primary">
                    ¡Proximamente!
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
              <h2 className="hal-h4">Nuestra compañía</h2>
              <h3 className="hal-h1">Seemann Group en números</h3>
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
                              Años de experiencia
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
                              Clientes satisfechos
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
                              Empleados
                            </p>
                          </span>
                        </a>
                      </div>
                      <div className="hal-image-with-tiles-box hal-image-with-tiles-box--light-grey">
                        <a href="#" onClick={(e) => e.preventDefault()}>
                          <span>
                            <p className="hal-image-with-tiles-headline">15+</p>
                            <p className="hal-image-with-tiles-subline">
                              Países
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
