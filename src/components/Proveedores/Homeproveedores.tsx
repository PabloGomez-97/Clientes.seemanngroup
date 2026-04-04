// src/components/Proveedores/Homeproveedores.tsx
import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const FONT =
  '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const tariffCards = [
  {
    key: "air",
    title: "Aéreo",
    description: "Tarifas de carga aérea por peso",
    path: "/proveedor/tarifario-aereo",
    accent: "var(--primary-color, #ff6200)",
    bgHover: "#fff7ed",
  },
  {
    key: "fcl",
    title: "FCL",
    description: "Tarifas de contenedor completo",
    path: "/proveedor/tarifario-fcl",
    accent: "#2563eb",
    bgHover: "#eff6ff",
  },
  {
    key: "lcl",
    title: "LCL",
    description: "Tarifas de carga consolidada",
    path: "/proveedor/tarifario-lcl",
    accent: "#059669",
    bgHover: "#f0fdf4",
  },
];

export default function HomeProveedores() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const nombreUsuario = user?.nombreuser || user?.email || "Proveedor";

  return (
    <div style={{ fontFamily: FONT, maxWidth: 840, margin: "0 auto" }}>
      {/* Greeting */}
      <div style={{ marginBottom: 40 }}>
        <p style={{ fontSize: 14, color: "#9ca3af", margin: "0 0 4px" }}>
          {t("proveedor.home.greeting")}
        </p>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#1f2937",
            margin: 0,
            letterSpacing: "-0.4px",
          }}
        >
          {nombreUsuario}
        </h1>
        <div
          style={{
            width: 36,
            height: 3,
            backgroundColor: "var(--primary-color, #ff6200)",
            borderRadius: 2,
            marginTop: 12,
          }}
        />
      </div>

      {/* Quick Access */}
      <p
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#9ca3af",
          textTransform: "uppercase",
          letterSpacing: 0.6,
          marginBottom: 16,
        }}
      >
        {t("proveedor.home.quickAccess", "Subir tarifas")}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          marginBottom: 40,
        }}
      >
        {tariffCards.map((card) => {
          const isHovered = hoveredCard === card.key;
          return (
            <div
              key={card.key}
              onClick={() => navigate(card.path)}
              onMouseEnter={() => setHoveredCard(card.key)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                backgroundColor: isHovered ? card.bgHover : "#fff",
                border: `1px solid ${isHovered ? card.accent : "#e5e7eb"}`,
                borderRadius: 12,
                padding: "28px 24px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 3,
                  backgroundColor: card.accent,
                  borderRadius: 2,
                  marginBottom: 16,
                  transition: "width 0.15s ease",
                  ...(isHovered ? { width: 48 } : {}),
                }}
              />
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#1f2937",
                  margin: "0 0 6px",
                }}
              >
                {card.title}
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: "#6b7280",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {card.description}
              </p>
              <span
                style={{
                  display: "block",
                  marginTop: 16,
                  fontSize: 13,
                  fontWeight: 500,
                  color: card.accent,
                  opacity: isHovered ? 1 : 0,
                  transition: "opacity 0.15s ease",
                }}
              >
                Ir al tarifario →
              </span>
            </div>
          );
        })}
      </div>

      {/* Welcome message */}
      <div
        style={{
          backgroundColor: "#f9fafb",
          borderRadius: 10,
          padding: "20px 24px",
          border: "1px solid #e5e7eb",
        }}
      >
        <p
          style={{
            fontSize: 14,
            color: "#374151",
            margin: "0 0 4px",
            fontWeight: 500,
          }}
        >
          {t("proveedor.home.infoTitle")}
        </p>
        <p
          style={{ fontSize: 13, color: "#6b7280", margin: 0, lineHeight: 1.6 }}
        >
          {t("proveedor.home.infoMessage")}
        </p>
      </div>
    </div>
  );
}
