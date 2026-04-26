// src/components/Sidebar/MisDocumentosCliente.tsx
// Vista de documentos para el cliente — solo ve los suyos, acceso completo
import { useAuth } from "../../auth/AuthContext";
import { DocumentosUnificadosView } from "./Documents/DocumentosUnificadosView";

const FONT =
  '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function MisDocumentosCliente() {
  const { activeUsername } = useAuth();

  if (!activeUsername) {
    return (
      <div
        style={{
          fontFamily: FONT,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 400,
        }}
      >
        <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
          <div style={{ marginBottom: 8 }}>
            No se pudo identificar tu cuenta.
          </div>
          <div style={{ fontSize: 12 }}>Vuelve a iniciar sesión.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "#1e40af",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </div>
        <div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#0f172a",
              margin: 0,
            }}
          >
            Mis Documentos
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "2px 0 0" }}>
            Todos los documentos de tus operaciones en un solo lugar.
          </p>
        </div>
      </div>

      {/* Hint sobre subida de documentos */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: "10px 14px",
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: 8,
          marginBottom: 20,
          fontSize: 12,
          color: "#1d4ed8",
          lineHeight: 1.5,
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ marginTop: 1, flexShrink: 0 }}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
          <line x1="12" y1="12" x2="12" y2="16" />
        </svg>
        <span>
          Para <strong>subir nuevos documentos</strong>, ve a la sección de
          operaciones correspondiente (Aérea, Marítima o Terrestre) y ábrelos
          desde allí.
        </span>
      </div>

      <DocumentosUnificadosView
        ownerUsername={activeUsername}
        canDelete={true}
      />
    </div>
  );
}

export default MisDocumentosCliente;
