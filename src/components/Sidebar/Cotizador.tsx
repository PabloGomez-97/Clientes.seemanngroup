import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CotizadorAereo from "../quotes/QuoteAIR";
import CotizadorFCL from "../quotes/QuoteFCL";
import CotizadorLCL from "../quotes/QuoteLCL";

type TipoCotizacion = "AEREO" | "FCL" | "LCL" | null;

interface ItineraryState {
  tipoEnvio: "AEREO" | "FCL" | "LCL";
  origin: { value: string; label: string };
  destination: { value: string; label: string };
  fecha?: string;
}

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
      // Limpiar el state de la URL para evitar que se reaplique al navegar
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, navigate, location.pathname]);

  const handleSeleccionTipo = (tipo: TipoCotizacion) => {
    setTipoCotizacion(tipo);
    setPreselectedData(null); // Limpiar datos preseleccionados al seleccionar manualmente
  };

  const handleVolver = () => {
    setTipoCotizacion(null);
    setPreselectedData(null); // Limpiar datos preseleccionados al volver
  };

  if (tipoCotizacion === null) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
          padding: "60px 20px",
          margin: "-24px",
          marginBottom: "0",
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          {/* Header Premium */}
          <div
            style={{
              textAlign: "center",
              marginBottom: "60px",
              animation: "fadeIn 0.6s ease",
            }}
          >
            <h1
              style={{
                fontSize: "48px",
                fontWeight: "800",
                color: "#1f2937",
                marginBottom: "16px",
                letterSpacing: "-1px",
              }}
            >
              {t("home.cotizador.title")}
            </h1>

            <p
              style={{
                fontSize: "18px",
                color: "#6b7280",
                maxWidth: "600px",
                margin: "0 auto",
                lineHeight: "1.6",
              }}
            >
              {t("home.cotizador.subtitle")}
            </p>
          </div>

          {/* Cards Premium */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              gap: "32px",
              marginBottom: "60px",
            }}
          >
            {/* Card AEREO - Azul */}
            <div
              onClick={() => handleSeleccionTipo("AEREO")}
              style={{
                background: "white",
                borderRadius: "24px",
                padding: "40px",
                cursor: "pointer",
                border: "2px solid transparent",
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                position: "relative",
                overflow: "hidden",
                animation: "fadeInUp 0.6s ease 0.1s backwards",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform =
                  "translateY(-12px) scale(1.02)";
                e.currentTarget.style.borderColor = "#3b82f6";
                e.currentTarget.style.boxShadow =
                  "0 30px 60px -12px rgba(59, 130, 246, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.borderColor = "transparent";
                e.currentTarget.style.boxShadow =
                  "0 10px 30px -10px rgba(0, 0, 0, 0.1)";
              }}
            >
              {/* Badge "Más Rápido" */}
              <div
                style={{
                  position: "absolute",
                  top: "20px",
                  right: "20px",
                  padding: "6px 14px",
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                  borderRadius: "20px",
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "white",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  boxShadow: "0 4px 12px rgba(59, 130, 246, 0.4)",
                  animation: "pulse 2s ease infinite",
                }}
              >
                {t("home.cotizador.aereo.badge")}
              </div>

              {/* Icono Premium */}
              <div
                style={{
                  width: "100px",
                  height: "100px",
                  borderRadius: "20px",
                  background:
                    "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "24px",
                  boxShadow: "0 8px 16px rgba(59, 130, 246, 0.2)",
                }}
              >
                <svg width="50" height="50" fill="#3b82f6" viewBox="0 0 16 16">
                  <path d="M6.428 1.151C6.708.591 7.213 0 8 0s1.292.592 1.572 1.151C9.861 1.73 10 2.431 10 3v3.691l5.17 2.585a1.5 1.5 0 0 1 .83 1.342V12a.5.5 0 0 1-.582.493l-5.507-.918-.375 2.253 1.318 1.318A.5.5 0 0 1 10.5 16h-5a.5.5 0 0 1-.354-.854l1.319-1.318-.376-2.253-5.507.918A.5.5 0 0 1 0 12v-1.382a1.5 1.5 0 0 1 .83-1.342L6 6.691V3c0-.568.14-1.271.428-1.849Zm.894.448C7.111 2.02 7 2.569 7 3v4a.5.5 0 0 1-.276.447l-5.448 2.724a.5.5 0 0 0-.276.447v.792l5.418-.903a.5.5 0 0 1 .575.41l.5 3a.5.5 0 0 1-.14.437L6.708 15h2.586l-.647-.646a.5.5 0 0 1-.14-.436l.5-3a.5.5 0 0 1 .576-.411L15 11.41v-.792a.5.5 0 0 0-.276-.447L9.276 7.447A.5.5 0 0 1 9 7V3c0-.432-.11-.979-.322-1.401C8.458 1.159 8.213 1 8 1c-.213 0-.458.158-.678.599Z" />
                </svg>
              </div>

              {/* Título */}
              <h2
                style={{
                  fontSize: "32px",
                  fontWeight: "700",
                  color: "#1f2937",
                  marginBottom: "12px",
                  letterSpacing: "-0.5px",
                }}
              >
                {t("home.cotizador.aereo.title")}
              </h2>

              {/* Descripción */}
              <p
                style={{
                  fontSize: "15px",
                  color: "#6b7280",
                  lineHeight: "1.6",
                  marginBottom: "24px",
                }}
              >
                {t("home.cotizador.aereo.description")}
              </p>

              {/* Features */}
              <div style={{ marginBottom: "28px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "#3b82f6",
                    }}
                  />
                  <span style={{ fontSize: "14px", color: "#4b5563" }}>
                    {t("home.cotizador.aereo.description1")}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "#3b82f6",
                    }}
                  />
                  <span style={{ fontSize: "14px", color: "#4b5563" }}>
                    {t("home.cotizador.aereo.description2")}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "#3b82f6",
                    }}
                  />
                  <span style={{ fontSize: "14px", color: "#4b5563" }}>
                    {t("home.cotizador.aereo.description3")}
                  </span>
                </div>
              </div>

              {/* Botón */}
              <button
                onClick={() => handleSeleccionTipo("AEREO")}
                style={{
                  width: "100%",
                  padding: "16px",
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                  border: "none",
                  borderRadius: "12px",
                  color: "white",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 20px rgba(59, 130, 246, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(59, 130, 246, 0.3)";
                }}
              >
                {t("home.cotizador.aereo.button")}
              </button>
            </div>

            {/* Card FCL - Verde */}
            <div
              onClick={() => handleSeleccionTipo("FCL")}
              style={{
                background: "white",
                borderRadius: "24px",
                padding: "40px",
                cursor: "pointer",
                border: "2px solid transparent",
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                position: "relative",
                overflow: "hidden",
                animation: "fadeInUp 0.6s ease 0.2s backwards",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform =
                  "translateY(-12px) scale(1.02)";
                e.currentTarget.style.borderColor = "#10b981";
                e.currentTarget.style.boxShadow =
                  "0 30px 60px -12px rgba(16, 185, 129, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.borderColor = "transparent";
                e.currentTarget.style.boxShadow =
                  "0 10px 30px -10px rgba(0, 0, 0, 0.1)";
              }}
            >
              {/* Badge "Popular" */}
              <div
                style={{
                  position: "absolute",
                  top: "20px",
                  right: "20px",
                  padding: "6px 14px",
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  borderRadius: "20px",
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "white",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  boxShadow: "0 4px 12px rgba(16, 185, 129, 0.4)",
                  animation: "pulse 2s ease infinite",
                }}
              >
                {t("home.cotizador.fcl.badge")}
              </div>

              {/* Icono Premium */}
              <div
                style={{
                  width: "100px",
                  height: "100px",
                  borderRadius: "20px",
                  background:
                    "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "24px",
                  boxShadow: "0 8px 16px rgba(16, 185, 129, 0.2)",
                }}
              >
                <svg width="50" height="50" fill="#10b981" viewBox="0 0 16 16">
                  <path d="M0 3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3zm1.5.5A.5.5 0 0 0 1 4v1.528l7.614 4.57a.5.5 0 0 0 .772-.416V4a.5.5 0 0 0-.5-.5H1.5zm13 .5h-6v1.528l6 3.6V4a.5.5 0 0 0-.5-.5zM15 8.528l-6 3.6v2.372a.5.5 0 0 0 .772.416L15 10.472v-1.944zm-13 1.944 6 3.6a.5.5 0 0 0 .772-.416v-2.372l-6-3.6v2.388z" />
                </svg>
              </div>

              {/* Título */}
              <h2
                style={{
                  fontSize: "32px",
                  fontWeight: "700",
                  color: "#1f2937",
                  marginBottom: "12px",
                  letterSpacing: "-0.5px",
                }}
              >
                {t("home.cotizador.fcl.title")}
              </h2>

              {/* Descripción */}
              <p
                style={{
                  fontSize: "15px",
                  color: "#6b7280",
                  lineHeight: "1.6",
                  marginBottom: "24px",
                }}
              >
                {t("home.cotizador.fcl.description")}
              </p>

              {/* Features */}
              <div style={{ marginBottom: "28px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "#10b981",
                    }}
                  />
                  <span style={{ fontSize: "14px", color: "#4b5563" }}>
                    {t("home.cotizador.fcl.description1")}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "#10b981",
                    }}
                  />
                  <span style={{ fontSize: "14px", color: "#4b5563" }}>
                    {t("home.cotizador.fcl.description2")}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "#10b981",
                    }}
                  />
                  <span style={{ fontSize: "14px", color: "#4b5563" }}>
                    {t("home.cotizador.fcl.description3")}
                  </span>
                </div>
              </div>

              {/* Botón */}
              <button
                onClick={() => handleSeleccionTipo("FCL")}
                style={{
                  width: "100%",
                  padding: "16px",
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  border: "none",
                  borderRadius: "12px",
                  color: "white",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 20px rgba(16, 185, 129, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(16, 185, 129, 0.3)";
                }}
              >
                {t("home.cotizador.fcl.button")}
              </button>
            </div>

            {/* Card LCL - Morado */}
            <div
              onClick={() => handleSeleccionTipo("LCL")}
              style={{
                background: "white",
                borderRadius: "24px",
                padding: "40px",
                cursor: "pointer",
                border: "2px solid transparent",
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                position: "relative",
                overflow: "hidden",
                animation: "fadeInUp 0.6s ease 0.3s backwards",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform =
                  "translateY(-12px) scale(1.02)";
                e.currentTarget.style.borderColor = "#a855f7";
                e.currentTarget.style.boxShadow =
                  "0 30px 60px -12px rgba(168, 85, 247, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.borderColor = "transparent";
                e.currentTarget.style.boxShadow =
                  "0 10px 30px -10px rgba(0, 0, 0, 0.1)";
              }}
            >
              {/* Badge "Económico" */}
              <div
                style={{
                  position: "absolute",
                  top: "20px",
                  right: "20px",
                  padding: "6px 14px",
                  background:
                    "linear-gradient(135deg, #a855f7 0%, #9333ea 100%)",
                  borderRadius: "20px",
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "white",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  boxShadow: "0 4px 12px rgba(168, 85, 247, 0.4)",
                  animation: "pulse 2s ease infinite",
                }}
              >
                {t("home.cotizador.lcl.badge")}
              </div>

              {/* Icono Premium */}
              <div
                style={{
                  width: "100px",
                  height: "100px",
                  borderRadius: "20px",
                  background:
                    "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "24px",
                  boxShadow: "0 8px 16px rgba(168, 85, 247, 0.2)",
                }}
              >
                <svg width="50" height="50" fill="#a855f7" viewBox="0 0 16 16">
                  <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3z" />
                </svg>
              </div>

              {/* Título */}
              <h2
                style={{
                  fontSize: "32px",
                  fontWeight: "700",
                  color: "#1f2937",
                  marginBottom: "12px",
                  letterSpacing: "-0.5px",
                }}
              >
                {t("home.cotizador.lcl.title")}
              </h2>

              {/* Descripción */}
              <p
                style={{
                  fontSize: "15px",
                  color: "#6b7280",
                  lineHeight: "1.6",
                  marginBottom: "24px",
                }}
              >
                {t("home.cotizador.lcl.description")}
              </p>

              {/* Features */}
              <div style={{ marginBottom: "28px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "#a855f7",
                    }}
                  />
                  <span style={{ fontSize: "14px", color: "#4b5563" }}>
                    {t("home.cotizador.lcl.description1")}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "#a855f7",
                    }}
                  />
                  <span style={{ fontSize: "14px", color: "#4b5563" }}>
                    {t("home.cotizador.lcl.description2")}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "#a855f7",
                    }}
                  />
                  <span style={{ fontSize: "14px", color: "#4b5563" }}>
                    {t("home.cotizador.lcl.description3")}
                  </span>
                </div>
              </div>

              {/* Botón */}
              <button
                onClick={() => handleSeleccionTipo("LCL")}
                style={{
                  width: "100%",
                  padding: "16px",
                  background:
                    "linear-gradient(135deg, #a855f7 0%, #9333ea 100%)",
                  border: "none",
                  borderRadius: "12px",
                  color: "white",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 12px rgba(168, 85, 247, 0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 20px rgba(168, 85, 247, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(168, 85, 247, 0.3)";
                }}
              >
                {t("home.cotizador.lcl.button")}
              </button>
            </div>
          </div>

          {/* Comparison Card */}
          <div
            style={{
              background: "white",
              borderRadius: "24px",
              padding: "48px",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.08)",
              animation: "fadeInUp 0.6s ease 0.4s backwards",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "32px",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background:
                    "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
                }}
              >
                <svg width="24" height="24" fill="white" viewBox="0 0 16 16">
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                  <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
                </svg>
              </div>
              <h3
                style={{
                  fontSize: "28px",
                  fontWeight: "700",
                  color: "#1f2937",
                  margin: 0,
                }}
              >
                {t("home.cotizador.comparison.title")}
              </h3>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "32px",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background:
                        "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      fill="#3b82f6"
                      viewBox="0 0 16 16"
                    >
                      <path d="M6.428 1.151C6.708.591 7.213 0 8 0s1.292.592 1.572 1.151C9.861 1.73 10 2.431 10 3v3.691l5.17 2.585a1.5 1.5 0 0 1 .83 1.342V12a.5.5 0 0 1-.582.493l-5.507-.918-.375 2.253 1.318 1.318A.5.5 0 0 1 10.5 16h-5a.5.5 0 0 1-.354-.854l1.319-1.318-.376-2.253-5.507.918A.5.5 0 0 1 0 12v-1.382a1.5 1.5 0 0 1 .83-1.342L6 6.691V3c0-.568.14-1.271.428-1.849Z" />
                    </svg>
                  </div>
                  <h4
                    style={{
                      fontSize: "18px",
                      fontWeight: "600",
                      color: "#1f2937",
                      margin: 0,
                    }}
                  >
                    {t("home.cotizador.aereo.title")}
                  </h4>
                </div>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    lineHeight: "1.6",
                    margin: 0,
                  }}
                >
                  {t("home.cotizador.aereo.comparisonDescription")}
                </p>
              </div>

              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background:
                        "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      fill="#10b981"
                      viewBox="0 0 16 16"
                    >
                      <path d="M0 3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3z" />
                    </svg>
                  </div>
                  <h4
                    style={{
                      fontSize: "18px",
                      fontWeight: "600",
                      color: "#1f2937",
                      margin: 0,
                    }}
                  >
                    {t("home.cotizador.fcl.title")}
                  </h4>
                </div>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    lineHeight: "1.6",
                    margin: 0,
                  }}
                >
                  {t("home.cotizador.fcl.comparisonDescription")}
                </p>
              </div>

              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background:
                        "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      fill="#a855f7"
                      viewBox="0 0 16 16"
                    >
                      <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z" />
                    </svg>
                  </div>
                  <h4
                    style={{
                      fontSize: "18px",
                      fontWeight: "600",
                      color: "#1f2937",
                      margin: 0,
                    }}
                  >
                    {t("home.cotizador.lcl.title")}
                  </h4>
                </div>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    lineHeight: "1.6",
                    margin: 0,
                  }}
                >
                  {t("home.cotizador.lcl.comparisonDescription")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes pulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.8;
              transform: scale(0.98);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        padding: "40px 20px",
        margin: "-24px",
        marginBottom: "0",
      }}
    >
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <button
          onClick={handleVolver}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 24px",
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            color: "#6b7280",
            fontSize: "15px",
            fontWeight: "500",
            cursor: "pointer",
            marginBottom: "24px",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f9fafb";
            e.currentTarget.style.borderColor = "#d1d5db";
            e.currentTarget.style.transform = "translateX(-4px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "white";
            e.currentTarget.style.borderColor = "#e5e7eb";
            e.currentTarget.style.transform = "translateX(0)";
          }}
        >
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
            <path
              fillRule="evenodd"
              d="M12 8a.5.5 0 0 1-.5.5H5.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L5.707 7.5H11.5a.5.5 0 0 1 .5.5z"
            />
          </svg>
          {t("home.cotizador.volver")}
        </button>

        <div
          style={{
            backgroundColor: "white",
            borderRadius: "24px",
            padding: "40px",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.08)",
          }}
        >
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
