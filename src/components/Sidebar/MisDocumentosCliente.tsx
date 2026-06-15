// src/components/Sidebar/MisDocumentosCliente.tsx
// Vista de documentos para el cliente — solo ve los suyos, acceso completo
import { useAuth } from "../../auth/AuthContext";
import { DocumentosUnificadosView } from "./Documents/DocumentosUnificadosView";
import PageBannerHeader from "../PageBannerHeader";

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
      <PageBannerHeader variant="myDocuments" />

      <DocumentosUnificadosView
        ownerUsername={activeUsername}
        canDelete={true}
      />
    </div>
  );
}

export default MisDocumentosCliente;
