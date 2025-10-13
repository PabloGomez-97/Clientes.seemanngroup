import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Select from 'react-select';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface Ruta {
  id: number;
  region: string;
  country: string;
  pol: string;
  pod: string;
  via: string;
  tariff_type: 'W/M' | 'VOLUME_EUROPA';
  of_wm: number | string;
  of_min: number | string;
  currency: string;
  frequency: string;
  transit_time: number | string;
  row_number: number;
  remarks: string;
}

interface SelectOption {
  value: string;
  label: string;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const Cotizador: React.FC = () => {
  // Estados
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [polSeleccionado, setPolSeleccionado] = useState<SelectOption | null>(null);
  const [podSeleccionado, setPodSeleccionado] = useState<SelectOption | null>(null);
  
  const [opcionesPOL, setOpcionesPOL] = useState<SelectOption[]>([]);
  const [opcionesPOD, setOpcionesPOD] = useState<SelectOption[]>([]);
  
  const [rutasFiltradas, setRutasFiltradas] = useState<Ruta[]>([]);

  // ============================================================================
  // CARGAR Y PARSEAR EXCEL
  // ============================================================================

  useEffect(() => {
    const cargarExcel = async () => {
      try {
        setLoading(true);
        
        // Cargar el archivo Excel desde assets
        const response = await fetch('/src/assets/MSL-EXPORT.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        
        // Leer el Excel
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const worksheet = workbook.Sheets['TARIFARIO'];
        
        // Convertir a JSON
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
        
        // Parsear las rutas
        const rutasParseadas: Ruta[] = [];
        let idCounter = 1;
        
        // Definir rangos de regiones (índice base 0, por eso restamos 1)
        const regiones = [
          { nombre: 'AMERICA', inicio: 2, fin: 470, type: 'W/M' as const }
        ];
        
        regiones.forEach(region => {
          for (let i = region.inicio; i <= region.fin; i++) {
            const row: any = data[i];
            
            if (!row) continue;
            
            const country = row[1]; // Columna B
            const pol = row[2];     // Columna C
            const pod = row[3];     // Columna D
            const via = row[4];     // Columna E
            const of_wm = row[5];   // Columna F
            const of_min = row[10];  // Columna G
            const currency = row[7]; // Columna H
            const frequency = row[8]; // Columna I
            const tt = row[9];      // Columna J
            const remarks = row[11]; // Columna K
            
            // Solo agregar si tiene POL y POD válidos
            if (pol && pod && typeof pol === 'string' && typeof pod === 'string') {
              rutasParseadas.push({
                id: idCounter++,
                region: region.nombre,
                country: country || '',
                pol: pol.trim(),
                pod: pod.trim(),
                via: via || '',
                tariff_type: region.type,
                of_wm: of_wm || 0,
                of_min: of_min || 0,
                currency: currency || '',
                frequency: frequency || '',
                transit_time: tt || 0,
                remarks: remarks || '',
                row_number: i + 1 // +1 porque Excel empieza en 1
              });
            }
          }
        });
        
        setRutas(rutasParseadas);
        
        // Generar opciones únicas de POL
        const polsUnicos = Array.from(new Set(rutasParseadas.map(r => r.pol))).sort();
        setOpcionesPOL(polsUnicos.map(pol => ({ value: pol, label: pol })));
        
        setLoading(false);
      } catch (err) {
        console.error('Error al cargar el Excel:', err);
        setError('Error al cargar las rutas. Por favor, verifica que el archivo CTL.xlsx esté en src/assets/');
        setLoading(false);
      }
    };

    cargarExcel();
  }, []);

  // ============================================================================
  // FILTRADO DE POD SEGÚN POL
  // ============================================================================

  useEffect(() => {
    if (polSeleccionado) {
      // Filtrar rutas por POL seleccionado
      const rutasDelPOL = rutas.filter(r => r.pol === polSeleccionado.value);
      
      // Obtener PODs únicos para este POL
      const podsUnicos = Array.from(new Set(rutasDelPOL.map(r => r.pod))).sort();
      setOpcionesPOD(podsUnicos.map(pod => ({ value: pod, label: pod })));
    } else {
      setOpcionesPOD([]);
    }
  }, [polSeleccionado, rutas]);

  // ============================================================================
  // BÚSQUEDA DE RUTAS (automática al seleccionar POD)
  // ============================================================================

  useEffect(() => {
    if (polSeleccionado && podSeleccionado) {
      const resultados = rutas.filter(
        r => r.pol === polSeleccionado.value && r.pod === podSeleccionado.value
      );
      setRutasFiltradas(resultados);
    } else {
      setRutasFiltradas([]);
    }
  }, [polSeleccionado, podSeleccionado, rutas]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handlePOLChange = (option: SelectOption | null) => {
    setPolSeleccionado(option);
    setPodSeleccionado(null); // Limpiar POD al cambiar POL
    setRutasFiltradas([]);
  };

  const handlePODChange = (option: SelectOption | null) => {
    setPodSeleccionado(option);
  };

  // ============================================================================
  // RENDERIZADO DE TARIFA SEGÚN TIPO
  // ============================================================================

  const renderTarifa = (ruta: Ruta) => {
    if (ruta.tariff_type === 'W/M') {
      return (
        <>
          <div className="mb-2">
            <strong>Ocean Freight W/M:</strong> {ruta.of_wm} {ruta.currency}
          </div>
          <div>
            <strong>Consolidation Surcharge W/M:</strong> {ruta.of_min} {ruta.currency}
          </div>
        </>
      );
    } else if (ruta.tariff_type === 'VOLUME_EUROPA') {
      return (
        <>
          <div className="mb-2">
            <strong>Tarifa (0.1 a 15 m³):</strong> {ruta.of_wm} {ruta.currency}
          </div>
          <div>
            <strong>Tarifa Mínima:</strong> {ruta.of_min} {ruta.currency}
          </div>
          <div className="mt-2">
            <small className="text-info">
              <i className="bi bi-info-circle"></i> Región EUROPA - Tarifa por volumen
            </small>
          </div>
        </>
      );
    } else if (ruta.tariff_type === 'VOLUME_ORIENTE') {
      return (
        <>
          <div className="mb-2">
            <strong>Tarifa (0.1 a 10 m³):</strong> {ruta.of_wm} {ruta.currency}
          </div>
          <div>
            <strong>Tarifa (10 a 15 m³):</strong> {ruta.of_min} {ruta.currency}
          </div>
          <div className="mt-2">
            <small className="text-info">
              <i className="bi bi-info-circle"></i> Región ORIENTE - Tarifa por volumen
            </small>
          </div>
        </>
      );
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3">Cargando tarifas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error</h4>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4 mb-5">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="fw-light">Cotizador de Rutas Marítimas</h1>
        <p className="text-muted">Transporte LCL - Seemann Group CTL</p>
      </div>

      {/* Formulario */}
      <div className="card shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="row g-3">
            {/* Dropdown POL */}
            <div className="col-md-6">
              <label className="form-label fw-semibold">
                Puerto de Origen (POL)
              </label>
              <Select
                options={opcionesPOL}
                value={polSeleccionado}
                onChange={handlePOLChange}
                placeholder="Selecciona un puerto de origen..."
                isClearable
                isSearchable
                noOptionsMessage={() => 'No se encontraron puertos'}
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: '45px',
                    borderColor: '#dee2e6',
                  })
                }}
              />
              <small className="text-muted">
                {opcionesPOL.length} puertos disponibles
              </small>
            </div>

            {/* Dropdown POD */}
            <div className="col-md-6">
              <label className="form-label fw-semibold">
                Puerto de Destino (POD)
              </label>
              <Select
                options={opcionesPOD}
                value={podSeleccionado}
                onChange={handlePODChange}
                placeholder={
                  polSeleccionado
                    ? 'Selecciona un puerto de destino...'
                    : 'Primero selecciona un POL'
                }
                isClearable
                isSearchable
                isDisabled={!polSeleccionado}
                noOptionsMessage={() => 'No hay destinos disponibles'}
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: '45px',
                    borderColor: '#dee2e6',
                  })
                }}
              />
              <small className="text-muted">
                {polSeleccionado
                  ? `${opcionesPOD.length} destino(s) disponible(s)`
                  : 'Selecciona un POL primero'}
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Resultados */}
      {rutasFiltradas.length > 0 && (
        <div>
          <h4 className="mb-3">
            Rutas Disponibles ({rutasFiltradas.length})
          </h4>

          <div className="row g-4">
            {rutasFiltradas.map((ruta) => (
              <div key={ruta.id} className="col-12 col-lg-6">
                <div className="card h-100 shadow-sm">
                  <div className="card-header bg-primary text-white">
                    <h5 className="card-title mb-0">
                      {ruta.pol} → {ruta.pod}
                    </h5>
                  </div>
                  <div className="card-body">
                    {/* Info básica */}
                    <div className="mb-3">
                      <p className="mb-1">
                        <strong>País:</strong> {ruta.country}
                      </p>
                      <p className="mb-1">
                        <strong>Región:</strong>{' '}
                        <span className="badge bg-secondary">{ruta.region}</span>
                      </p>
                    </div>

                    {/* Transporte */}
                    <div className="mb-3 pb-3 border-bottom">
                      <p className="mb-1">
                        <strong>Vía/Transbordo:</strong>{' '}
                        {ruta.via.toUpperCase().includes('DIRECT') ? (
                          <span className="badge bg-success">
                            {ruta.via} ✓
                          </span>
                        ) : (
                          <span className="text-warning">{ruta.via}</span>
                        )}
                      </p>
                    </div>

                    {/* Tarifas */}
                    <div className="mb-3 pb-3 border-bottom">
                      <h6 className="text-primary mb-2">💰 Tarifas</h6>
                      {renderTarifa(ruta)}
                    </div>

                    {/* Servicio */}
                    <div>
                      <h6 className="text-primary mb-2">⏱️ Servicio</h6>
                      <p className="mb-1">
                        <strong>Frecuencia:</strong>{' '}
                        <span className="badge bg-info text-dark">
                          {ruta.frequency}
                        </span>
                      </p>
                      <p className="mb-0">
                        <strong>Tiempo de Tránsito:</strong>{' '}
                        {ruta.transit_time} días
                      </p>
                      <p className="mb-0">
                        <strong>Observaciones:</strong>{' '}
                        {ruta.remarks}
                      </p>
                    </div>
                  </div>
                  <div className="card-footer d-flex align-items-center justify-content-between gap-2">
                    <button
                        type="button"
                        className="btn btn-primary w-100 mt-2"
                        onClick={() => {}}
                        aria-label="Cotizar esta ruta"
                    >
                        Cotizar
                    </button>
                    </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mensaje cuando no hay selección completa */}
      {!polSeleccionado && !podSeleccionado && (
        <div className="text-center text-muted mt-5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            fill="currentColor"
            className="bi bi-ship mb-3"
            viewBox="0 0 16 16"
          >
            <path d="M3 5a2 2 0 0 0-2 2v2h2a2 2 0 0 1 2 2 2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 2 2 0 0 1 2-2h2V7a2 2 0 0 0-2-2H3z"/>
            <path d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-2A1.5 1.5 0 0 0 13.5 10h-11A1.5 1.5 0 0 0 1 11.5v2z"/>
          </svg>
          <p>Selecciona un puerto de origen para comenzar</p>
        </div>
      )}

      {/* Mensaje cuando solo POL seleccionado */}
      {polSeleccionado && !podSeleccionado && (
        <div className="text-center text-muted mt-5">
          <p>Ahora selecciona un puerto de destino</p>
        </div>
      )}
    </div>
  );
};

export default Cotizador;