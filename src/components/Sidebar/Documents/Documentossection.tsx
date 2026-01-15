import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../auth/AuthContext';
import './DocumentosSection.css';

// ============================================================
// TIPOS
// ============================================================

type TipoDocumento = 
  | 'Certificado de Origen' 
  | 'Póliza de seguro' 
  | 'Guía de Despacho' 
  | 'Declaración de Ingreso' 
  | 'Packing List';

interface Documento {
  id: string;
  quoteId: string;
  tipo: TipoDocumento;
  nombreArchivo: string;
  tipoArchivo: string;
  tamanoMB: string;
  fechaSubida: string;
}

interface DocumentosSectionProps {
  quoteId: string;
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export const DocumentosSection: React.FC<DocumentosSectionProps> = ({ quoteId }) => {
  const { token } = useAuth();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Referencias para los inputs de archivo (uno por cada tipo)
  const fileInputRefs = {
    'Certificado de Origen': useRef<HTMLInputElement>(null),
    'Póliza de seguro': useRef<HTMLInputElement>(null),
    'Guía de Despacho': useRef<HTMLInputElement>(null),
    'Declaración de Ingreso': useRef<HTMLInputElement>(null),
    'Packing List': useRef<HTMLInputElement>(null),
  };

  // ============================================================
  // CARGAR DOCUMENTOS AL MONTAR
  // ============================================================

  useEffect(() => {
    loadDocumentos();
  }, [quoteId]);

  const loadDocumentos = async () => {
    if (!token || !quoteId) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/documentos/${quoteId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar documentos');
      }

      const data = await response.json();
      setDocumentos(data.documentos || []);
    } catch (err: any) {
      console.error('Error cargando documentos:', err);
      setError(err.message || 'Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // SUBIR DOCUMENTO
  // ============================================================

  const handleFileSelect = async (tipo: TipoDocumento, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) return;

    // Validar tamaño (5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError(`El archivo "${file.name}" excede el tamaño máximo de 5MB`);
      event.target.value = ''; // Limpiar input
      return;
    }

    // Validar tipo de archivo
    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Solo se permiten archivos PDF, Excel (.xls, .xlsx) y Word (.doc, .docx)');
      event.target.value = '';
      return;
    }

    // Convertir a base64
    setUploading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const base64 = await fileToBase64(file);
      
      // Subir al backend
      const response = await fetch('/api/documentos/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quoteId,
          tipo,
          nombreArchivo: file.name,
          contenidoBase64: base64
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al subir documento');
      }

      const data = await response.json();
      
      // Mostrar mensaje de éxito
      setSuccessMessage(`✅ "${file.name}" subido exitosamente`);
      
      // Recargar lista de documentos
      await loadDocumentos();
      
      // Limpiar input
      event.target.value = '';
      
      // Limpiar mensaje después de 5 segundos
      setTimeout(() => setSuccessMessage(null), 5000);

    } catch (err: any) {
      console.error('Error subiendo documento:', err);
      setError(err.message || 'Error al subir documento');
      event.target.value = '';
    } finally {
      setUploading(false);
    }
  };

  // ============================================================
  // DESCARGAR DOCUMENTO
  // ============================================================

  const handleDownload = async (documentoId: string, nombreArchivo: string) => {
    if (!token) return;

    try {
      const response = await fetch(`/api/documentos/download/${documentoId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al descargar documento');
      }

      const data = await response.json();
      
      // Descargar archivo desde base64
      const link = document.createElement('a');
      link.href = data.documento.contenidoBase64;
      link.download = nombreArchivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err: any) {
      console.error('Error descargando documento:', err);
      setError(err.message || 'Error al descargar documento');
    }
  };

  // ============================================================
  // ELIMINAR DOCUMENTO
  // ============================================================

  const handleDelete = async (documentoId: string, nombreArchivo: string) => {
    if (!token) return;

    const confirmed = window.confirm(`¿Estás seguro de eliminar "${nombreArchivo}"?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/documentos/${documentoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al eliminar documento');
      }

      setSuccessMessage(`✅ "${nombreArchivo}" eliminado exitosamente`);
      await loadDocumentos();
      
      setTimeout(() => setSuccessMessage(null), 5000);

    } catch (err: any) {
      console.error('Error eliminando documento:', err);
      setError(err.message || 'Error al eliminar documento');
    }
  };

  // ============================================================
  // UTILIDADES
  // ============================================================

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const getDocumentosPorTipo = (tipo: TipoDocumento): Documento[] => {
    return documentos.filter(doc => doc.tipo === tipo);
  };

  const formatFecha = (fechaISO: string): string => {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getIconoPorTipo = (tipoArchivo: string): string => {
    if (tipoArchivo.includes('pdf')) return '📄';
    if (tipoArchivo.includes('excel') || tipoArchivo.includes('spreadsheet')) return '📊';
    if (tipoArchivo.includes('word') || tipoArchivo.includes('document')) return '📝';
    return '📎';
  };

  // ============================================================
  // RENDER
  // ============================================================

  const tiposDocumento: TipoDocumento[] = [
    'Certificado de Origen',
    'Póliza de seguro',
    'Guía de Despacho',
    'Declaración de Ingreso',
    'Packing List'
  ];

  return (
    <div className="documentos-section">
      {/* Mensajes */}
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

      {/* Loading */}
      {loading && (
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      )}

      {/* Lista de tipos de documentos */}
      {!loading && (
        <div className="documentos-grid">
          {tiposDocumento.map((tipo) => {
            const docsDelTipo = getDocumentosPorTipo(tipo);
            
            return (
              <div key={tipo} className="documento-card">
                <div className="documento-header">
                  <h6 className="documento-titulo">{tipo}</h6>
                  <span className="badge bg-secondary">{docsDelTipo.length}</span>
                </div>

                {/* Botón de subir */}
                <div className="upload-section">
                  <input
                    ref={fileInputRefs[tipo]}
                    type="file"
                    accept=".pdf,.xls,.xlsx,.doc,.docx"
                    onChange={(e) => handleFileSelect(tipo, e)}
                    style={{ display: 'none' }}
                    disabled={uploading}
                  />
                  
                  <button
                    className="btn btn-sm btn-outline-primary w-100"
                    onClick={() => fileInputRefs[tipo].current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        📤 Subir archivo
                      </>
                    )}
                  </button>
                </div>

                {/* Lista de documentos subidos */}
                {docsDelTipo.length > 0 && (
                  <div className="documentos-lista">
                    {docsDelTipo.map((doc) => (
                      <div key={doc.id} className="documento-item">
                        <div className="documento-info">
                          <span className="documento-icono">
                            {getIconoPorTipo(doc.tipoArchivo)}
                          </span>
                          <div className="documento-detalles">
                            <div className="documento-nombre">{doc.nombreArchivo}</div>
                            <div className="documento-meta">
                              {doc.tamanoMB} MB • {formatFecha(doc.fechaSubida)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="documento-acciones">
                          <button
                            className="btn btn-sm btn-link text-primary p-0 me-2"
                            onClick={() => handleDownload(doc.id, doc.nombreArchivo)}
                            title="Descargar"
                          >
                            ⬇️
                          </button>
                          <button
                            className="btn btn-sm btn-link text-danger p-0"
                            onClick={() => handleDelete(doc.id, doc.nombreArchivo)}
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Mensaje cuando no hay documentos */}
                {docsDelTipo.length === 0 && (
                  <div className="sin-documentos">
                    <small className="text-muted">Sin documentos</small>
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