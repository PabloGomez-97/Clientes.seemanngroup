import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Select from 'react-select';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

// Interfaz base común
interface RutaBase {
  id: number;
  region: string;
  country: string;
  firstleg: string;
  pol: string;
  ruta: string;
  pod: string;
  servicio: string;
  currency: string;
  tonm3: number | string;
  row_number: number;
}

// Interfaz específica para EUROPA
interface RutaEuropa extends RutaBase {
  tariff_type: 'EUROPA';
  bl_remarks: string;
  tt_estimado: number | string;
  validity_etd: string;
}

// Interfaz específica para ASIA
interface RutaAsia extends RutaBase {
  tariff_type: 'ASIA';
  tt_estimado: number | string;
  validity_etd: string;
}

// Interfaz específica para USA CAN
interface RutaUSACAN extends RutaBase {
  tariff_type: 'USA_CAN';
  final_tt: string;
}

// Interfaz específica para LATAM
interface RutaLATAM extends RutaBase {
  tariff_type: 'LATAM';
  bl: string;
  final_tt: number | string;
}

// Union type - TypeScript sabrá qué propiedades están disponibles según tariff_type
type Ruta = RutaEuropa | RutaAsia | RutaUSACAN | RutaLATAM;

interface SelectOption {
  value: string;
  label: string;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const CotizadorECU: React.FC = () => {
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
        const response = await fetch('/src/assets/ECU.xlsx');
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
          { nombre: 'EUROPA', inicio: 2, fin: 31, type: 'EUROPA' as const },
          { nombre: 'ASIA', inicio: 34, fin: 82, type: 'ASIA' as const },
          { nombre: 'USA_CAN', inicio: 85, fin: 109, type: 'USA_CAN' as const },
          { nombre: 'LATAM', inicio: 112, fin: 116, type: 'LATAM' as const },
        ];
        
        regiones.forEach(region => {
          for (let i = region.inicio; i <= region.fin; i++) {
            const row: any = data[i];
            
            if (!row) continue;
            
            // Columnas comunes para todas las regiones
            const country = row[1];   // Columna B
            const firstleg = row[3];  // Columna C
            const pol = row[2];       // Columna D
            const ruta = row[4];      // Columna E
            const pod = row[5];       // Columna F
            const servicio = row[6];  // Columna G
            const currency = row[7];  // Columna H
            const tonm3 = row[8];     // Columna I
            
            // Solo agregar si tiene POL y POD válidos
            if (pol && pod && typeof pol === 'string' && typeof pod === 'string') {
              
              // REGIÓN EUROPA
              if (region.type === 'EUROPA') {
                const bl_remarks = row[9];      // Columna J - BL / REMARKS
                const tt_estimado = row[10];    // Columna K - TT estimado
                const validity_etd = row[11];   // Columna L - Validity ETD
                
                rutasParseadas.push({
                  id: idCounter++,
                  region: region.nombre,
                  country: country || '',
                  firstleg: firstleg || '',
                  pol: pol.trim(),
                  ruta: ruta || '',
                  pod: pod.trim(),
                  servicio: servicio || '',
                  currency: currency || 'EUR',
                  tonm3: tonm3 || 0,
                  tariff_type: 'EUROPA',
                  bl_remarks: bl_remarks || '',
                  tt_estimado: tt_estimado || 0,
                  validity_etd: validity_etd || '',
                  row_number: i + 1
                });
              }
              
              // REGIÓN ASIA
              else if (region.type === 'ASIA') {
                const tt_estimado = row[9];    // Columna J - TT estimado
                const validity_etd = row[10];  // Columna K - Validity ETD
                
                rutasParseadas.push({
                  id: idCounter++,
                  region: region.nombre,
                  country: country || '',
                  firstleg: firstleg || '',
                  pol: pol.trim(),
                  ruta: ruta || '',
                  pod: pod.trim(),
                  servicio: servicio || '',
                  currency: currency || 'USD',
                  tonm3: tonm3 || 0,
                  tariff_type: 'ASIA',
                  tt_estimado: tt_estimado || 0,
                  validity_etd: validity_etd || '',
                  row_number: i + 1
                });
              }
              
              // REGIÓN USA CAN
              else if (region.type === 'USA_CAN') {
                const final_tt = row[9];  // Columna J - Final TT
                
                rutasParseadas.push({
                  id: idCounter++,
                  region: region.nombre,
                  country: country || '',
                  firstleg: firstleg || '',
                  pol: pol.trim(),
                  ruta: ruta || '',
                  pod: pod.trim(),
                  servicio: servicio || '',
                  currency: currency || 'USD',
                  tonm3: tonm3 || 0,
                  tariff_type: 'USA_CAN',
                  final_tt: final_tt || '',
                  row_number: i + 1
                });
              }
              
              // REGIÓN LATAM
              else if (region.type === 'LATAM') {
                const bl = row[9];          // Columna J - BL
                const final_tt = row[10];   // Columna K - Final TT
                
                rutasParseadas.push({
                  id: idCounter++,
                  region: region.nombre,
                  country: country || '',
                  firstleg: firstleg || '',
                  pol: pol.trim(),
                  ruta: ruta || '',
                  pod: pod.trim(),
                  servicio: servicio || '',
                  currency: currency || 'USD',
                  tonm3: tonm3 || 0,
                  tariff_type: 'LATAM',
                  bl: bl || '',
                  final_tt: final_tt || 0,
                  row_number: i + 1
                });
              }
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
        setError('Error al cargar las rutas. Por favor, verifica que el archivo ECU.xlsx esté en src/assets/');
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
        <h1 className="fw-light">Cotizador de Rutas Marítimas - ECU</h1>
        <p className="text-muted">Transporte LCL - Ecuador</p>
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

                    {/* ========== RENDERIZADO ESPECÍFICO PARA EUROPA ========== */}
                    {ruta.tariff_type === 'EUROPA' && (
                      <>
                        {/* Información de Ruta EUROPA */}
                        <div className="mb-3 pb-3 border-bottom">
                          <h6 className="text-primary mb-2">🚢 Información de Ruta</h6>
                          <p className="mb-1">
                            <strong>Ruta:</strong> {ruta.ruta}
                          </p>
                          <p className="mb-0">
                            <strong>Servicio:</strong> {ruta.servicio}
                          </p>
                        </div>

                        {/* Tarifas EUROPA */}
                        <div className="mb-3 pb-3 border-bottom">
                          <h6 className="text-primary mb-2">💰 Tarifas</h6>
                          <div className="mb-2">
                            <strong>TON/M³ (01-15 CBM):</strong> {ruta.tonm3} {ruta.currency}
                          </div>
                          {ruta.bl_remarks && (
                            <div className="mt-2">
                              <strong>BL / Remarks:</strong>{' '}
                              <span className="text-muted">{ruta.bl_remarks}</span>
                            </div>
                          )}
                        </div>

                        {/* Información Adicional EUROPA */}
                        <div>
                          <h6 className="text-primary mb-2">⏱️ Tiempos y Validez</h6>
                          <p className="mb-1">
                            <strong>TT Estimado:</strong>{' '}
                            <span className="badge bg-info text-dark">
                              {ruta.tt_estimado} días
                            </span>
                          </p>
                          {ruta.validity_etd && (
                            <p className="mb-0">
                              <strong>Validity ETD:</strong> {ruta.validity_etd}
                            </p>
                          )}
                        </div>
                      </>
                    )}

                    {/* ========== RENDERIZADO ESPECÍFICO PARA ASIA ========== */}
                    {ruta.tariff_type === 'ASIA' && (
                      <>
                        {/* Información de Ruta ASIA */}
                        <div className="mb-3 pb-3 border-bottom">
                          <h6 className="text-primary mb-2">🚢 Información de Ruta</h6>
                          <p className="mb-1">
                            <strong>Ruta:</strong> {ruta.ruta}
                          </p>
                          <p className="mb-0">
                            <strong>Servicio:</strong> {ruta.servicio}
                          </p>
                        </div>

                        {/* Tarifas ASIA */}
                        <div className="mb-3 pb-3 border-bottom">
                          <h6 className="text-primary mb-2">💰 Tarifas</h6>
                          <div className="mb-2">
                            <strong>TON/M³ (01-15 CBM):</strong> {ruta.tonm3} {ruta.currency}
                          </div>
                        </div>

                        {/* Información Adicional ASIA */}
                        <div>
                          <h6 className="text-primary mb-2">⏱️ Tiempos y Validez</h6>
                          <p className="mb-1">
                            <strong>TT Estimado:</strong>{' '}
                            <span className="badge bg-info text-dark">
                              {ruta.tt_estimado} días
                            </span>
                          </p>
                          {ruta.validity_etd && (
                            <p className="mb-0">
                              <strong>Validity ETD:</strong> {ruta.validity_etd}
                            </p>
                          )}
                        </div>
                      </>
                    )}

                    {/* ========== RENDERIZADO ESPECÍFICO PARA USA CAN ========== */}
                    {ruta.tariff_type === 'USA_CAN' && (
                      <>
                        {/* Información de Ruta USA CAN */}
                        <div className="mb-3 pb-3 border-bottom">
                          <h6 className="text-primary mb-2">🚢 Información de Ruta</h6>
                          <p className="mb-1">
                            <strong>Ruta:</strong> {ruta.ruta}
                          </p>
                          <p className="mb-0">
                            <strong>Servicio:</strong> {ruta.servicio}
                          </p>
                        </div>

                        {/* Tarifas USA CAN */}
                        <div className="mb-3 pb-3 border-bottom">
                          <h6 className="text-primary mb-2">💰 Tarifas</h6>
                          <div className="mb-2">
                            <strong>TON/M³ (01-15 M³):</strong> {ruta.tonm3} {ruta.currency}
                          </div>
                        </div>

                        {/* Información Adicional USA CAN */}
                        <div>
                          <h6 className="text-primary mb-2">⏱️ Tiempo de Tránsito</h6>
                          <p className="mb-0">
                            <strong>Final TT:</strong>{' '}
                            <span className="badge bg-info text-dark">
                              {ruta.final_tt}
                            </span>
                          </p>
                        </div>
                      </>
                    )}

                    {/* ========== RENDERIZADO ESPECÍFICO PARA LATAM ========== */}
                    {ruta.tariff_type === 'LATAM' && (
                      <>
                        {/* Información de Ruta LATAM */}
                        <div className="mb-3 pb-3 border-bottom">
                          <h6 className="text-primary mb-2">🚢 Información de Ruta</h6>
                          <p className="mb-1">
                            <strong>Ruta:</strong> {ruta.ruta}
                          </p>
                          <p className="mb-0">
                            <strong>Servicio:</strong> {ruta.servicio}
                          </p>
                        </div>

                        {/* Tarifas LATAM */}
                        <div className="mb-3 pb-3 border-bottom">
                          <h6 className="text-primary mb-2">💰 Tarifas</h6>
                          <div className="mb-2">
                            <strong>TON/M³ (01-15 M³):</strong> {ruta.tonm3} {ruta.currency}
                          </div>
                          {ruta.bl && (
                            <div className="mt-2">
                              <strong>BL:</strong>{' '}
                              <span className="text-muted">{ruta.bl}</span>
                            </div>
                          )}
                        </div>

                        {/* Información Adicional LATAM */}
                        <div>
                          <h6 className="text-primary mb-2">⏱️ Tiempo de Tránsito</h6>
                          <p className="mb-0">
                            <strong>Final TT:</strong>{' '}
                            <span className="badge bg-info text-dark">
                              {ruta.final_tt} días
                            </span>
                          </p>
                        </div>
                      </>
                    )}
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

export default CotizadorECU;