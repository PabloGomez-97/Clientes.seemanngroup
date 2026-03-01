// src/components/Proveedores/Homeproveedores.tsx
import { useAuth } from "../../auth/AuthContext";
import { useTranslation } from "react-i18next";

const FONT =
  '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export default function HomeProveedores() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const nombreUsuario = user?.nombreuser || user?.email || "Proveedor";
  // user?.username = ejecutivo
  // user?.email = email del proveedor
  // user?.nombreuser = nombre completo del proveedor (si está disponible)

  return (
    <div
      style={{
        fontFamily: FONT,
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      {/* Welcome Card */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          padding: "40px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
          border: "1px solid #e5e7eb",
          marginBottom: "24px",
        }}
      >
        {/* Greeting */}
        <div style={{ marginBottom: "32px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "10px",
                backgroundColor: "rgba(var(--primary-rgb, 255, 98, 0), 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="24"
                height="24"
                fill="var(--primary-color, #ff6200)"
                viewBox="0 0 16 16"
              >
                <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4Zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10Z" />
              </svg>
            </div>
            <div>
              <p
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  margin: "0 0 2px 0",
                }}
              >
                {t("proveedor.home.greeting")}
              </p>
              <h1
                style={{
                  fontSize: "24px",
                  fontWeight: "700",
                  color: "#1f2937",
                  margin: 0,
                  letterSpacing: "-0.3px",
                }}
              >
                {nombreUsuario}
              </h1>
            </div>
          </div>

          <div
            style={{
              width: "40px",
              height: "3px",
              backgroundColor: "var(--primary-color, #ff6200)",
              borderRadius: "2px",
              marginBottom: "16px",
            }}
          />

          <p
            style={{
              fontSize: "15px",
              color: "#6b7280",
              margin: 0,
              lineHeight: "1.6",
            }}
          >
            {t("proveedor.home.welcomeMessage")}
          </p>
        </div>

        {/* Info card */}
        <div
          style={{
            backgroundColor: "#f9fafb",
            borderRadius: "8px",
            padding: "20px 24px",
            border: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "8px",
            }}
          >
            <svg
              width="18"
              height="18"
              fill="var(--primary-color, #ff6200)"
              viewBox="0 0 16 16"
            >
              <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.399l-.202.024.057-.422 1.065-.16Zm.684-2.956a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
            </svg>
            <span
              style={{
                fontSize: "14px",
                fontWeight: "600",
                color: "#374151",
              }}
            >
              {t("proveedor.home.infoTitle")}
            </span>
          </div>
          <p
            style={{
              fontSize: "13px",
              color: "#6b7280",
              margin: 0,
              lineHeight: "1.5",
            }}
          >
            {t("proveedor.home.infoMessage")}
          </p>
        </div>
      </div>
    </div>
  );
}
