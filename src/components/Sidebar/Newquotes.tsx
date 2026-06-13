import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CotizadorAereo from "../quotes/QuoteAIR";
import CotizadorFCL from "../quotes/QuoteFCL";
import CotizadorLCL from "../quotes/QuoteLCL";
import CotizadorLastMile from "../quotes/QuoteLASTMILE";
import ActivityBar from "./ActivityBar";
import {
  AirCotizadorSidebarProvider,
  AirCotizadorSidebarSlot,
  useAirCotizadorSidebarOptional,
} from "../quotes/Handlers/Air/AirCotizadorSidebarContext";
import "./styles/Cotizador.css";

function CotizadorFormLayout({ children }: { children: React.ReactNode }) {
  const sidebarCtx = useAirCotizadorSidebarOptional();
  const hasSidebar = sidebarCtx?.hasSidebar ?? false;

  return (
    <div
      className={`cotizador-container cotizador-container--form${hasSidebar ? " cotizador-container--with-sidebar" : ""}`}
    >
      <div
        className={`cotizador-split${hasSidebar ? " cotizador-split--active" : ""}`}
      >
        <div className="cotizador-split__main">
          <div className="cotizador-quote-container cotizador-quote-container--form">
            {children}
          </div>
        </div>
        <AirCotizadorSidebarSlot />
      </div>
    </div>
  );
}

type TipoCotizacion = "AEREO" | "FCL" | "LCL" | "LASTMILE" | null;

interface ServiceType {
  key: "AEREO" | "FCL" | "LCL" | "LASTMILE" | "TERRESTRE";
  icon: string;
  inDevelopment?: boolean;
}

interface ItineraryState {
  tipoEnvio: "AEREO" | "FCL" | "LCL" | "LASTMILE";
  origin: { value: string; label: string };
  destination: { value: string; label: string };
  fecha?: string;
}

const serviceTypes: ServiceType[] = [
  { key: "AEREO", icon: "fa fa-plane" },
  { key: "FCL", icon: "fa fa-ship" },
  { key: "LCL", icon: "fa fa-cubes" },
  { key: "LASTMILE", icon: "fa fa-truck" },
  { key: "TERRESTRE", icon: "fa fa-road", inDevelopment: true },
];

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

  const handleSeleccionTipo = (tipo: Exclude<TipoCotizacion, null>) => {
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
      <>
        <ActivityBar />
        <div className="cotizador-page">
          <div className="cotizador-container">
            {/* Header */}
            <div className="cotizador-header">
              <h1>{t("home.cotizador.title")}</h1>
              <p>{t("home.cotizador.subtitle")}</p>
            </div>

            {/* Service Cards */}
            <div className="cotizador-grid">
              {serviceTypes.map(({ key, icon, inDevelopment }) => {
                const k = key.toLowerCase();
                return (
                  <div
                    key={key}
                    className={`cotizador-card${inDevelopment ? " cotizador-card--disabled" : ""}`}
                    onClick={
                      inDevelopment
                        ? undefined
                        : () => handleSeleccionTipo(key as Exclude<TipoCotizacion, null>)
                    }
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
                      className={`cotizador-card__btn${inDevelopment ? " cotizador-card__btn--disabled" : ""}`}
                      disabled={inDevelopment}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!inDevelopment) {
                          handleSeleccionTipo(key as Exclude<TipoCotizacion, null>);
                        }
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
      </>
    );
  }

  return (
    <>
      <ActivityBar />
      <div className="cotizador-page cotizador-page--form">
        <AirCotizadorSidebarProvider>
          <CotizadorFormLayout>
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
            {tipoCotizacion === "LASTMILE" && (
              <CotizadorLastMile
                key="lastmile"
                preselectedOrigin={preselectedData?.origin}
                preselectedDestination={preselectedData?.destination}
              />
            )}
          </CotizadorFormLayout>
        </AirCotizadorSidebarProvider>
      </div>
    </>
  );
};

export default Cotizador;
