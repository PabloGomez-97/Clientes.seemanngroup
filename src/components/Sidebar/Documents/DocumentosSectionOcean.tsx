import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../../auth/AuthContext";
import "./DocumentosSection.css";

type TipoDocumentoOcean =
  | "Bill of Lading (BL)"
  | "Facturas asociadas al servicio"
  | "Endoso"
  | "Invoice"
  | "Packing List"
  | "Certificado de Origen"
  | "Póliza de Seguro"
  | "Declaración de ingreso (DIN)"
  | "Guía de despacho / Delivery Order"
  | "SDA"
  | "Papeleta"
  | "Transporte local"
  | "Warehouse Receipt"
  | "Mate's Receipt / Received for shipment"
  | "Otros Documentos";

interface DocumentoOcean {
  id: string;
  shipmentId: string;
  tipo: TipoDocumentoOcean;
  nombreArchivo: string;
  tipoArchivo: string;
  tamanoMB: string;
  fechaSubida: string;
}

interface Props {
  shipmentId: string | number;
}

export const DocumentosSectionOcean: React.FC<Props> = ({ shipmentId }) => {
  const { token } = useAuth();

  const [documentos, setDocumentos] = useState<DocumentoOcean[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [carpetasAbiertas, setCarpetasAbiertas] = useState<
    Set<TipoDocumentoOcean>
  >(new Set());

  const fileInputRefs: Record<
    TipoDocumentoOcean,
    React.RefObject<HTMLInputElement | null>
  > = {
    "Bill of Lading (BL)": useRef<HTMLInputElement>(null),
    "Facturas asociadas al servicio": useRef<HTMLInputElement>(null),
    Endoso: useRef<HTMLInputElement>(null),
    Invoice: useRef<HTMLInputElement>(null),
    "Packing List": useRef<HTMLInputElement>(null),
    "Certificado de Origen": useRef<HTMLInputElement>(null),
    "Póliza de Seguro": useRef<HTMLInputElement>(null),
    "Declaración de ingreso (DIN)": useRef<HTMLInputElement>(null),
    "Guía de despacho / Delivery Order": useRef<HTMLInputElement>(null),
    SDA: useRef<HTMLInputElement>(null),
    Papeleta: useRef<HTMLInputElement>(null),
    "Transporte local": useRef<HTMLInputElement>(null),
    "Warehouse Receipt": useRef<HTMLInputElement>(null),
    "Mate's Receipt / Received for shipment": useRef<HTMLInputElement>(null),
    "Otros Documentos": useRef<HTMLInputElement>(null),
  };

  const tiposDocumento: TipoDocumentoOcean[] = [
    "Bill of Lading (BL)",
    "Facturas asociadas al servicio",
    "Endoso",
    "Invoice",
    "Packing List",
    "Certificado de Origen",
    "Póliza de Seguro",
    "Declaración de ingreso (DIN)",
    "Guía de despacho / Delivery Order",
    "SDA",
    "Papeleta",
    "Transporte local",
    "Warehouse Receipt",
    "Mate's Receipt / Received for shipment",
    "Otros Documentos",
  ];

  useEffect(() => {
    loadDocumentos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipmentId]);

  const loadDocumentos = async () => {
    if (!token || !shipmentId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/ocean-shipments/documentos/${shipmentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) throw new Error("Error al cargar documentos");

      const data = await response.json();
      setDocumentos(data.documentos || []);
    } catch (err: any) {
      console.error("Error cargando documentos:", err);
      setError(err.message || "Error al cargar documentos");
    } finally {
      setLoading(false);
    }
  };

  const toggleCarpeta = (tipo: TipoDocumentoOcean) => {
    setCarpetasAbiertas((prev) => {
      const newSet = new Set(prev);
      newSet.has(tipo) ? newSet.delete(tipo) : newSet.add(tipo);
      return newSet;
    });
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const getDocumentosPorTipo = (tipo: TipoDocumentoOcean) =>
    documentos.filter((d) => d.tipo === tipo);

  const formatFecha = (fechaISO: string) => {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getIconoPorTipo = (tipoArchivo: string) => {
    if (tipoArchivo.includes("pdf")) return "📄";
    if (tipoArchivo.includes("excel") || tipoArchivo.includes("spreadsheet"))
      return "📊";
    if (tipoArchivo.includes("word") || tipoArchivo.includes("document"))
      return "📝";
    return "📎";
  };

  const handleFileSelect = async (
    tipo: TipoDocumentoOcean,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError(`El archivo "${file.name}" excede el tamaño máximo de 5MB`);
      event.target.value = "";
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      setError(
        "Solo se permiten archivos PDF, Excel (.xls, .xlsx) y Word (.doc, .docx)",
      );
      event.target.value = "";
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const base64 = await fileToBase64(file);

      const response = await fetch("/api/ocean-shipments/documentos/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shipmentId: String(shipmentId),
          tipo,
          nombreArchivo: file.name,
          contenidoBase64: base64,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al subir documento");
      }

      setSuccessMessage(`✅ "${file.name}" subido exitosamente`);
      await loadDocumentos();
      event.target.value = "";

      setCarpetasAbiertas((prev) => new Set(prev).add(tipo));
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error("Error subiendo documento:", err);
      setError(err.message || "Error al subir documento");
      event.target.value = "";
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (documentoId: string, nombreArchivo: string) => {
    if (!token) return;

    try {
      const response = await fetch(
        `/api/ocean-shipments/documentos/download/${documentoId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) throw new Error("Error al descargar documento");

      const data = await response.json();

      const link = document.createElement("a");
      link.href = data.documento.contenidoBase64;
      link.download = nombreArchivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error("Error descargando documento:", err);
      setError(err.message || "Error al descargar documento");
    }
  };

  const handleDelete = async (documentoId: string, nombreArchivo: string) => {
    if (!token) return;

    const confirmed = window.confirm(
      `¿Estás seguro de eliminar "${nombreArchivo}"?`,
    );
    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/ocean-shipments/documentos/${documentoId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) throw new Error("Error al eliminar documento");

      setSuccessMessage(`✅ "${nombreArchivo}" eliminado exitosamente`);
      await loadDocumentos();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error("Error eliminando documento:", err);
      setError(err.message || "Error al eliminar documento");
    }
  };

  return (
    <div className="documentos-section-folder">
      {error && (
        <div className="alert alert-danger" role="alert">
          ❌ {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError(null)}
          />
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success" role="alert">
          {successMessage}
          <button
            type="button"
            className="btn-close"
            onClick={() => setSuccessMessage(null)}
          />
        </div>
      )}

      {loading && (
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando.</span>
          </div>
        </div>
      )}

      {!loading && (
        <div className="folder-explorer">
          {tiposDocumento.map((tipo) => {
            const docsDelTipo = getDocumentosPorTipo(tipo);
            const isOpen = carpetasAbiertas.has(tipo);

            return (
              <div key={tipo} className="folder-item">
                <div
                  className="folder-header"
                  onClick={() => toggleCarpeta(tipo)}
                >
                  <div className="folder-left">
                    <span className="folder-icon">🗀</span>
                    <span className="folder-name">{tipo}</span>
                  </div>
                  <div className="folder-right">
                    <span className="folder-count">({docsDelTipo.length})</span>
                    <span className={`folder-arrow ${isOpen ? "open" : ""}`}>
                      ▶
                    </span>
                  </div>
                </div>

                {isOpen && (
                  <div className="folder-content">
                    {docsDelTipo.length > 0 ? (
                      <div className="files-list">
                        {docsDelTipo.map((doc) => (
                          <div key={doc.id} className="file-item">
                            <div className="file-info">
                              <span className="file-icon">
                                {getIconoPorTipo(doc.tipoArchivo)}
                              </span>
                              <div className="file-details">
                                <div className="file-name">
                                  {doc.nombreArchivo}
                                </div>
                                <div className="file-meta">
                                  {doc.tamanoMB} MB •{" "}
                                  {formatFecha(doc.fechaSubida)}
                                </div>
                              </div>
                            </div>

                            <div className="file-actions">
                              <button
                                className="btn-file-action"
                                onClick={() =>
                                  handleDownload(doc.id, doc.nombreArchivo)
                                }
                                title="Descargar"
                              >
                                ⬇️
                              </button>
                              <button
                                className="btn-file-action delete"
                                onClick={() =>
                                  handleDelete(doc.id, doc.nombreArchivo)
                                }
                                title="Eliminar"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-folder">
                        <small className="text-muted">Sin documentos</small>
                      </div>
                    )}

                    <div className="upload-area">
                      <input
                        ref={fileInputRefs[tipo]}
                        type="file"
                        accept=".pdf,.xls,.xlsx,.doc,.docx"
                        onChange={(e) => handleFileSelect(tipo, e)}
                        style={{ display: "none" }}
                        disabled={uploading}
                      />

                      <button
                        className="btn-upload-folder"
                        onClick={() => fileInputRefs[tipo].current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" />
                            Subiendo...
                          </>
                        ) : (
                          <>📤 Subir archivo</>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
