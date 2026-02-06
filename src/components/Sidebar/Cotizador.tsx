import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CotizadorAereo from "../quotes/QuoteAIR";
import CotizadorFCL from "../quotes/QuoteFCL";
import CotizadorLCL from "../quotes/QuoteLCL";
import "./Cotizador.css";

type TipoCotizacion = "AEREO" | "FCL" | "LCL" | null;

interface ItineraryState {
  tipoEnvio: "AEREO" | "FCL" | "LCL";
  origin: { value: string; label: string };
  destination: { value: string; label: string };
  fecha?: string;
}

const serviceTypes = [
  { key: "AEREO" as const, icon: "fa fa-plane" },
  { key: "FCL" as const, icon: "fa fa-ship" },
  { key: "LCL" as const, icon: "fa fa-cubes" },
] as const;

const Cotizador: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [tipoCotizacion, setTipoCotizacion] = useState<TipoCotizacion>(null);
  const [preselectedData, setPreselectedData] = useState<ItineraryState | null>(
    null,
  );

  // Detectar si viene con datos pre-seleccionados desde ItineraryFinder
  useEffect(() => {
    const state = location.state as ItineraryState | null;
    if (state?.tipoEnvio && state?.origin && state?.destination) {
      setTipoCotizacion(state.tipoEnvio);
      setPreselectedData(state);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, navigate, location.pathname]);

  const handleSeleccionTipo = (tipo: TipoCotizacion) => {
    setTipoCotizacion(tipo);
    setPreselectedData(null);
  };

  const handleVolver = () => {
    setTipoCotizacion(null);
    setPreselectedData(null);
  };

  // ── Selection View ──
  if (tipoCotizacion === null) {
    return (
      <div className="cotizador-page">
        <div className="cotizador-container">
          {/* Header */}
          <div className="cotizador-header">
            <h1>{t("home.cotizador.title")}</h1>
            <p>{t("home.cotizador.subtitle")}</p>
          </div>

          {/* Service Cards */}
          <div className="cotizador-grid">
            {serviceTypes.map(({ key, icon }) => {
              const k = key.toLowerCase();
              return (
                <div
                  key={key}
                  className="cotizador-card"
                  onClick={() => handleSeleccionTipo(key)}
                >
                  <span className="cotizador-card__indicator" />

                  <div className="cotizador-card__header">
                    <div className="cotizador-card__icon">
                      <i className={icon} />
                    </div>
                    <h2 className="cotizador-card__title">
                      {t(`home.cotizador.${k}.title`)}
                    </h2>
                    <span className="cotizador-card__badge">
                      {t(`home.cotizador.${k}.badge`)}
                    </span>
                  </div>

                  <p className="cotizador-card__desc">
                    {t(`home.cotizador.${k}.description`)}
                  </p>

                  <ul className="cotizador-card__features">
                    <li>{t(`home.cotizador.${k}.description1`)}</li>
                    <li>{t(`home.cotizador.${k}.description2`)}</li>
                    <li>{t(`home.cotizador.${k}.description3`)}</li>
                  </ul>

                  <button
                    className="cotizador-card__btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSeleccionTipo(key);
                    }}
                  >
                    {t(`home.cotizador.${k}.button`)}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Quote Form View ──
  const activeLabel =
    tipoCotizacion === "AEREO"
      ? t("home.cotizador.aereo.title")
      : tipoCotizacion === "FCL"
        ? t("home.cotizador.fcl.title")
        : t("home.cotizador.lcl.title");

  return (
    <div className="cotizador-page cotizador-page--form">
      <div className="cotizador-container cotizador-container--form">
        <button
          className="cotizador-back cotizador-back--form"
          onClick={handleVolver}
        >
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
            <path
              fillRule="evenodd"
              d="M12 8a.5.5 0 0 1-.5.5H5.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L5.707 7.5H11.5a.5.5 0 0 1 .5.5z"
            />
          </svg>
          {t("home.cotizador.volver")}
        </button>

        <div className="cotizador-quote-container cotizador-quote-container--form">
          {tipoCotizacion === "AEREO" && (
            <CotizadorAereo
              key="aereo"
              preselectedOrigin={preselectedData?.origin}
              preselectedDestination={preselectedData?.destination}
            />
          )}
          {tipoCotizacion === "FCL" && (
            <CotizadorFCL
              key="fcl"
              preselectedPOL={preselectedData?.origin}
              preselectedPOD={preselectedData?.destination}
            />
          )}
          {tipoCotizacion === "LCL" && (
            <CotizadorLCL
              key="lcl"
              preselectedPOL={preselectedData?.origin}
              preselectedPOD={preselectedData?.destination}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Cotizador;
