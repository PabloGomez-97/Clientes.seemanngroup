import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Plane, Ship, Package, Truck } from "lucide-react";
import CotizadorAereo from "@/components/quotes/QuoteAIR";
import CotizadorFCL from "@/components/quotes/QuoteFCL";
import CotizadorLCL from "@/components/quotes/QuoteLCL";
import CotizadorLastMile from "@/components/quotes/QuoteLASTMILE";
import ActivityBar from "./ActivityBar";
import {
  AirCotizadorSidebarProvider,
  AirCotizadorSidebarSlot,
  useAirCotizadorSidebarOptional,
} from "@/components/quotes/Handlers/Air/AirCotizadorSidebarContext";
import "@/components/cliente/styles/Cotizador.css";

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
type ModalityKey = Exclude<TipoCotizacion, null>;

interface ServiceType {
  key: ModalityKey;
  Icon: typeof Plane;
  inDevelopment?: boolean;
}

interface ItineraryState {
  tipoEnvio: ModalityKey;
  origin: { value: string; label: string };
  destination: { value: string; label: string };
  fecha?: string;
}

const serviceTypes: ServiceType[] = [
  { key: "AEREO", Icon: Plane },
  { key: "FCL", Icon: Ship },
  { key: "LCL", Icon: Package },
  { key: "LASTMILE", Icon: Truck },
];

const Cotizador: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [tipoCotizacion, setTipoCotizacion] = useState<TipoCotizacion>(null);
  const [preselectedData, setPreselectedData] = useState<ItineraryState | null>(
    null,
  );
  const [focusedKey, setFocusedKey] = useState<ModalityKey>("AEREO");
  const quoteAbandonRef = useRef<(() => void) | null>(null);

  // Detectar si viene con datos pre-seleccionados desde ItineraryFinder
  useEffect(() => {
    const state = location.state as ItineraryState | null;
    if (state?.tipoEnvio && state?.origin && state?.destination) {
      setTipoCotizacion(state.tipoEnvio);
      setPreselectedData(state);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, navigate, location.pathname]);

  // Auto-seleccionar tipo desde query param (?tipo=AEREO|FCL|LCL|LASTMILE)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tipo = params.get("tipo")?.toUpperCase();
    const valid = ["AEREO", "FCL", "LCL", "LASTMILE"] as const;
    if (valid.includes(tipo as (typeof valid)[number])) {
      setTipoCotizacion(tipo as ModalityKey);
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, navigate, location.pathname]);

  const handleSeleccionTipo = (tipo: ModalityKey) => {
    setTipoCotizacion(tipo);
    setPreselectedData(null);
  };

  // ── Selection View ──
  if (tipoCotizacion === null) {
    const active =
      serviceTypes.find((s) => s.key === focusedKey) ?? serviceTypes[0];
    const activeKey = active.key.toLowerCase();
    const ActiveIcon = active.Icon;

    return (
      <>
        <ActivityBar />
        <div className="nq-page">
          <div className="nq-shell">
            <header className="nq-hero">
              <p className="nq-hero__eyebrow">
                {t("home.cotizador.eyebrow")}
              </p>
              <h1 className="nq-hero__title">{t("home.cotizador.title")}</h1>
              <p className="nq-hero__subtitle">
                {t("home.cotizador.subtitle")}
              </p>
            </header>

            <div className="nq-panel">
              <div
                className="nq-list"
                role="listbox"
                aria-label={t("home.cotizador.title")}
              >
                {serviceTypes.map(({ key, Icon, inDevelopment }) => {
                  const k = key.toLowerCase();
                  const isActive = focusedKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      disabled={inDevelopment}
                      className={`nq-option${isActive ? " nq-option--active" : ""}${inDevelopment ? " nq-option--disabled" : ""}`}
                      onMouseEnter={() => {
                        if (!inDevelopment) setFocusedKey(key);
                      }}
                      onFocus={() => {
                        if (!inDevelopment) setFocusedKey(key);
                      }}
                      onClick={() => {
                        if (!inDevelopment) handleSeleccionTipo(key);
                      }}
                    >
                      <span className="nq-option__icon" aria-hidden>
                        <Icon size={16} strokeWidth={1.5} />
                      </span>
                      <span className="nq-option__body">
                        <span className="nq-option__title">
                          {t(`home.cotizador.${k}.title`)}
                        </span>
                        <span className="nq-option__hint">
                          {t(`home.cotizador.${k}.description`)}
                        </span>
                      </span>
                      <span className="nq-option__meta">
                        {t(`home.cotizador.${k}.badge`)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <aside className="nq-preview" aria-live="polite">
                <div className="nq-preview__top">
                  <ActiveIcon
                    className="nq-preview__glyph"
                    size={18}
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <p className="nq-preview__label">
                    {t("home.cotizador.previewLabel")}
                  </p>
                </div>
                <h2 className="nq-preview__title">
                  {t(`home.cotizador.${activeKey}.title`)}
                </h2>
                <p className="nq-preview__desc">
                  {t(`home.cotizador.${activeKey}.comparisonDescription`, {
                    defaultValue: t(
                      `home.cotizador.${activeKey}.description`,
                    ),
                  })}
                </p>
                <ul className="nq-preview__points">
                  <li>{t(`home.cotizador.${activeKey}.description1`)}</li>
                  <li>{t(`home.cotizador.${activeKey}.description2`)}</li>
                  <li>{t(`home.cotizador.${activeKey}.description3`)}</li>
                </ul>
                <button
                  type="button"
                  className="nq-preview__cta"
                  disabled={active.inDevelopment}
                  onClick={() => {
                    if (!active.inDevelopment) {
                      handleSeleccionTipo(active.key);
                    }
                  }}
                >
                  {t(`home.cotizador.${activeKey}.button`)}
                  <ArrowRight size={15} strokeWidth={1.75} aria-hidden />
                </button>
              </aside>
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
                abandonRef={quoteAbandonRef}
                preselectedOrigin={preselectedData?.origin}
                preselectedDestination={preselectedData?.destination}
              />
            )}
            {tipoCotizacion === "FCL" && (
              <CotizadorFCL
                key="fcl"
                abandonRef={quoteAbandonRef}
                preselectedPOL={preselectedData?.origin}
                preselectedPOD={preselectedData?.destination}
              />
            )}
            {tipoCotizacion === "LCL" && (
              <CotizadorLCL
                key="lcl"
                abandonRef={quoteAbandonRef}
                preselectedPOL={preselectedData?.origin}
                preselectedPOD={preselectedData?.destination}
              />
            )}
            {tipoCotizacion === "LASTMILE" && (
              <CotizadorLastMile
                key="lastmile"
                abandonRef={quoteAbandonRef}
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
