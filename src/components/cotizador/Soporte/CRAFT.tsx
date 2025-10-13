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
  pol: string;
  servicio_via: string;
  pod: string;
  currency: string;
  frecuencia: string;
  agente: string;
  tt_aprox: string;
  row_number: number;
}

// Interfaz específica para AMERICA
interface RutaAmerica extends RutaBase {
  tariff_type: 'AMERICA';
  of_wm: number | string;
  others_wm: number | string;
  bl: string;
  solas: string;
}

// Interfaz específica para EUROPA
interface RutaEuropa extends RutaBase {
  tariff_type: 'EUROPA';
  wm_1_15: number | string;
}

// Interfaz específica para ASIA
interface RutaAsia extends RutaBase {
  tariff_type: 'ASIA';
  wm_1_5: number | string;
  wm_5_10: number | string;
  wm_10_15: number | string;
}

// Union type - TypeScript sabrá qué propiedades están disponibles según tariff_type
type Ruta = RutaAmerica | RutaEuropa | RutaAsia;

interface SelectOption {
  value: string;
  label: string;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const CotizadorCRAFT: React.FC = () => {
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
        const response = await fetch('/src/assets/CRAFT.xlsx');
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
          { nombre: 'AMERICA', inicio: 2, fin: 40, type: 'AMERICA' as const },
          { nombre: 'EUROPA', inicio: 43, fin: 145, type: 'EUROPA' as const },
          { nombre: 'ASIA', inicio: 149, fin: 240, type: 'ASIA' as const },
        ];
        
        regiones.forEach(region => {
          for (let i = region.inicio; i <= region.fin; i++) {
            const row: any = data[i];
            
            if (!row) continue;
            
            // Columnas comunes para todas las regiones
            const pol = row[1];          // Columna B
            const servicio_via = row[2]; // Columna C
            const pod = row[3];          // Columna D
            
            // Solo agregar si tiene POL y POD válidos
            if (pol && pod && typeof pol === 'string' && typeof pod === 'string') {
              
              // REGIÓN AMERICA
              if (region.type === 'AMERICA') {
                const of_wm = row[4];        // Columna E - OF W/M
                const others_wm = row[5];    // Columna F - OTHERS(*) W/M
                const currency = row[6];     // Columna G - CURRENCY
                const bl = row[7];           // Columna H - BL
                const solas = row[8];        // Columna I - SOLAS
                const frecuencia = row[9];   // Columna J - FRECUENCIA
                const agente = row[10];      // Columna K - AGENTE
                const tt_aprox = row[11];    // Columna L - TT APROX
                
                rutasParseadas.push({
                  id: idCounter++,
                  region: region.nombre,
                  pol: pol.trim(),
                  servicio_via: servicio_via || '',
                  pod: pod.trim(),
                  tariff_type: 'AMERICA',
                  of_wm: of_wm || 0,
                  others_wm: others_wm || 0,
                  currency: currency || 'USD',
                  bl: bl || '',
                  solas: solas || '',
                  frecuencia: frecuencia || '',
                  agente: agente || '',
                  tt_aprox: tt_aprox || '',
                  row_number: i + 1
                });
              }
              
              // REGIÓN EUROPA
              else if (region.type === 'EUROPA') {
                const wm_1_15 = row[4];      // Columna E - 1-15 w/m (EUR/USD)
                const currency = row[5];     // Columna F - CURRENCY
                const frecuencia = row[6];   // Columna G - FRECUENCIA
                const agente = row[7];       // Columna H - AGENTE
                const tt_aprox = row[8];     // Columna I - TT APROX
                
                rutasParseadas.push({
                  id: idCounter++,
                  region: region.nombre,
                  pol: pol.trim(),
                  servicio_via: servicio_via || '',
                  pod: pod.trim(),
                  tariff_type: 'EUROPA',
                  wm_1_15: wm_1_15 || 0,
                  currency: currency || 'EUR',
                  frecuencia: frecuencia || '',
                  agente: agente || '',
                  tt_aprox: tt_aprox || '',
                  row_number: i + 1
                });
              }
              
              // REGIÓN ASIA
              else if (region.type === 'ASIA') {
                const wm_1_5 = row[4];       // Columna E - 1-5 w/m (USD)
                const wm_5_10 = row[5];      // Columna F - 5.01-10 w/m (USD)
                const wm_10_15 = row[6];     // Columna G - 10.01-15 w/m (USD)
                const currency = row[7];     // Columna H - CURRENCY
                const frecuencia = row[8];   // Columna I - FRECUENCIA
                const agente = row[9];       // Columna J - AGENTE
                const tt_aprox = row[10];    // Columna K - TT APROX
                
                rutasParseadas.push({
                  id: idCounter++,
                  region: region.nombre,
                  pol: pol.trim(),
                  servicio_via: servicio_via || '',
                  pod: pod.trim(),
                  tariff_type: 'ASIA',
                  wm_1_5: wm_1_5 || 0,
                  wm_5_10: wm_5_10 || 0,
                  wm_10_15: wm_10_15 || 0,
                  currency: currency || 'USD',
                  frecuencia: frecuencia || '',
                  agente: agente || '',
                  tt_aprox: tt_aprox || '',
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
        setError('Error al cargar las rutas. Por favor, verifica que el archivo CRAFT.xlsx esté en src/assets/');
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
        <h1 className="fw-light">Cotizador de Rutas Marítimas - CRAFT</h1>
        <p className="text-muted">Transporte LCL - Craft Worldwide</p>
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
                        <strong>Región:</strong>{' '}
                        <span className="badge bg-secondary">{ruta.region}</span>
                      </p>
                      <p className="mb-0">
                        <strong>Servicio - Vía:</strong> {ruta.servicio_via}
                      </p>
                    </div>

                    {/* ========== RENDERIZADO ESPECÍFICO PARA AMERICA ========== */}
                    {ruta.tariff_type === 'AMERICA' && (
                      <>
                        {/* Tarifas AMERICA */}
                        <div className="mb-3 pb-3 border-bottom">
                          <h6 className="text-primary mb-2">💰 Tarifas</h6>
                          <div className="mb-2">
                            <strong>OF W/M:</strong> {ruta.of_wm} {ruta.currency}
                          </div>
                          <div className="mb-2">
                            <strong>OTHERS(*) W/M:</strong> {ruta.others_wm} {ruta.currency}
                          </div>
                        </div>

                        {/* Información Adicional AMERICA */}
                        <div className="mb-3 pb-3 border-bottom">
                          <h6 className="text-primary mb-2">📋 Información Adicional</h6>
                          {ruta.bl && (
                            <p className="mb-1">
                              <strong>BL:</strong> {ruta.bl}
                            </p>
                          )}
                          {ruta.solas && (
                            <p className="mb-0">
                              <strong>SOLAS:</strong> {ruta.solas}
                            </p>
                          )}
                        </div>

                        {/* Servicio AMERICA */}
                        <div>
                          <h6 className="text-primary mb-2">⏱️ Servicio</h6>
                          <p className="mb-1">
                            <strong>Frecuencia:</strong>{' '}
                            <span className="badge bg-info text-dark">
                              {ruta.frecuencia}
                            </span>
                          </p>
                          {ruta.agente && (
                            <p className="mb-1">
                              <strong>Agente:</strong> {ruta.agente}
                            </p>
                          )}
                          {ruta.tt_aprox && (
                            <p className="mb-0">
                              <strong>TT Aprox:</strong> {ruta.tt_aprox}
                            </p>
                          )}
                        </div>
                      </>
                    )}

                    {/* ========== RENDERIZADO ESPECÍFICO PARA EUROPA ========== */}
                    {ruta.tariff_type === 'EUROPA' && (
                      <>
                        {/* Tarifas EUROPA */}
                        <div className="mb-3 pb-3 border-bottom">
                          <h6 className="text-primary mb-2">💰 Tarifas</h6>
                          <div className="mb-2">
                            <strong>1-15 W/M:</strong> {ruta.wm_1_15} {ruta.currency}
                          </div>
                          <div className="mt-2">
                            <small className="text-info">
                              <i className="bi bi-info-circle"></i> Región EUROPA - Tarifa única
                            </small>
                          </div>
                        </div>

                        {/* Servicio EUROPA */}
                        <div>
                          <h6 className="text-primary mb-2">⏱️ Servicio</h6>
                          <p className="mb-1">
                            <strong>Frecuencia:</strong>{' '}
                            <span className="badge bg-info text-dark">
                              {ruta.frecuencia}
                            </span>
                          </p>
                          {ruta.agente && (
                            <p className="mb-1">
                              <strong>Agente:</strong> {ruta.agente}
                            </p>
                          )}
                          {ruta.tt_aprox && (
                            <p className="mb-0">
                              <strong>TT Aprox:</strong> {ruta.tt_aprox}
                            </p>
                          )}
                        </div>
                      </>
                    )}

                    {/* ========== RENDERIZADO ESPECÍFICO PARA ASIA ========== */}
                    {ruta.tariff_type === 'ASIA' && (
                      <>
                        {/* Tarifas ASIA */}
                        <div className="mb-3 pb-3 border-bottom">
                          <h6 className="text-primary mb-2">💰 Tarifas por Rango</h6>
                          <div className="mb-2">
                            <strong>1-5 W/M:</strong> {ruta.wm_1_5} {ruta.currency}
                          </div>
                          <div className="mb-2">
                            <strong>5.01-10 W/M:</strong> {ruta.wm_5_10} {ruta.currency}
                          </div>
                          <div className="mb-2">
                            <strong>10.01-15 W/M:</strong> {ruta.wm_10_15} {ruta.currency}
                          </div>
                          <div className="mt-2">
                            <small className="text-info">
                              <i className="bi bi-info-circle"></i> Región ASIA - Tarifas por rango de volumen
                            </small>
                          </div>
                        </div>

                        {/* Servicio ASIA */}
                        <div>
                          <h6 className="text-primary mb-2">⏱️ Servicio</h6>
                          <p className="mb-1">
                            <strong>Frecuencia:</strong>{' '}
                            <span className="badge bg-info text-dark">
                              {ruta.frecuencia}
                            </span>
                          </p>
                          {ruta.agente && (
                            <p className="mb-1">
                              <strong>Agente:</strong> {ruta.agente}
                            </p>
                          )}
                          {ruta.tt_aprox && (
                            <p className="mb-0">
                              <strong>TT Aprox:</strong> {ruta.tt_aprox}
                            </p>
                          )}
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

export default CotizadorCRAFT;