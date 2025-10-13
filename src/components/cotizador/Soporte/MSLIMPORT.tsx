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
  pol: string;
  pod: string;
  row_number: number;
}

// Interfaz específica para ASIA
interface RutaAsia extends RutaBase {
  tariff_type: 'ASIA';
  of_wm: number | string;
  of_min: number | string;
  frequency: string;
  transit_time: number | string;
  via: string;
  currency: string;
}

// Interfaz específica para EUROPA
interface RutaEuropa extends RutaBase {
  tariff_type: 'EUROPA';
  of_wm: number | string;
  of_min: number | string;
  currency: string;
  frequency: string;
  transit_time: number | string;
  otros: string;
  service: string;
  agente: string;
  observaciones: string;
}

// Interfaz específica para NORTEAMERICA (NORTEAMERICA)
interface RutaNorteAmerica extends RutaBase {
  tariff_type: 'NORTEAMERICA';
  of_wm: number | string;
  of_min: number | string;
  currency: string;
  frequency: string;
  transit_time: number | string;
  otros: string;
  service: string;
  agente: string;
}

// Interfaz específica para AMERICA
interface RutaAmerica extends RutaBase {
  tariff_type: 'AMERICA';
  of_wm: number | string;
  of_min: number | string;
  currency: string;
  frequency: string;
  transit_time: number | string;
  otros: string;
  service: string;
  agente: string;
  observaciones: string;
}

// Union type - TypeScript sabrá qué propiedades están disponibles según tariff_type
type Ruta = RutaAsia | RutaEuropa | RutaNorteAmerica | RutaAmerica;

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
        const response = await fetch('/src/assets/MSL-IMPORT.xlsx');
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
          { nombre: 'ASIA', inicio: 2, fin: 62, type: 'ASIA' as const },
          { nombre: 'EUROPA', inicio: 65, fin: 100, type: 'EUROPA' as const },
          { nombre: 'NORTEAMERICA', inicio: 104, fin: 122, type: 'NORTEAMERICA' as const },
          { nombre: 'AMERICA', inicio: 125, fin: 134, type: 'AMERICA' as const },
        ];
        
        regiones.forEach(region => {
          for (let i = region.inicio; i <= region.fin; i++) {
            const row: any = data[i];
            
            if (!row) continue;
            
            // Columnas comunes para todas las regiones
            const country = row[1];  // Columna B
            const pol = row[2];      // Columna C
            const pod = row[3];      // Columna D
            const of_wm = row[4];    // Columna E
            const of_min = row[5];   // Columna F
            
            // Solo agregar si tiene POL y POD válidos
            if (pol && pod && typeof pol === 'string' && typeof pod === 'string') {
              
              // REGIÓN ASIA
              if (region.type === 'ASIA') {
                const frequency = row[6];   // Columna G
                const tt = row[7];          // Columna H
                const via = row[8];         // Columna I
                const currency = row[9];    // Columna J
                
                rutasParseadas.push({
                  id: idCounter++,
                  region: region.nombre,
                  country: country || '',
                  pol: pol.trim(),
                  pod: pod.trim(),
                  via: via || '',
                  tariff_type: 'ASIA',
                  of_wm: of_wm || 0,
                  of_min: of_min || 0,
                  currency: currency || 'USD',
                  frequency: frequency || '',
                  transit_time: tt || 0,
                  row_number: i + 1
                });
              }
              
              // REGIÓN EUROPA
              else if (region.type === 'EUROPA') {
                const tt = row[6];          // Columna G - T/T APROX.
                const frequency = row[7];   // Columna H - FREC.
                const otros = row[8];       // Columna I - OTROS
                const service = row[9];     // Columna J - SERVICIO
                const agente = row[10];     // Columna K - AGENTE
                const observaciones = row[11]; // Columna L - OBSERVACIONES
                const currency = row[12];   // Columna M - Currency (nueva)
                
                rutasParseadas.push({
                  id: idCounter++,
                  region: region.nombre,
                  country: country || '',
                  pol: pol.trim(),
                  pod: pod.trim(),
                  tariff_type: 'EUROPA',
                  of_wm: of_wm || 0,
                  of_min: of_min || 0,
                  currency: currency || 'USD',
                  frequency: frequency || '',
                  transit_time: tt || 0,
                  otros: otros || '',
                  service: service || '',
                  agente: agente || '',
                  observaciones: observaciones || '',
                  row_number: i + 1
                });
              }
              
              // REGIÓN NORTEAMERICA
              else if (region.type === 'NORTEAMERICA') {
                const tt = row[6];          // Columna G - T/T APROX.
                const frequency = row[7];   // Columna H - FREC.
                const otros = row[8];       // Columna I - OTROS
                const service = row[9];     // Columna J - SERVICIO
                const agente = row[10];     // Columna K - AGENTE
                const currency = row[11];   // Columna L - Currency (nueva)
                
                rutasParseadas.push({
                  id: idCounter++,
                  region: region.nombre,
                  country: country || '',
                  pol: pol.trim(),
                  pod: pod.trim(),
                  tariff_type: 'NORTEAMERICA',
                  of_wm: of_wm || 0,
                  of_min: of_min || 0,
                  currency: currency || 'USD',
                  frequency: frequency || '',
                  transit_time: tt || 0,
                  otros: otros || '',
                  service: service || '',
                  agente: agente || '',
                  row_number: i + 1
                });
              }
              
              // REGIÓN AMERICA
              else if (region.type === 'AMERICA') {
                const tt = row[6];          // Columna G - T/T APROX.
                const frequency = row[7];   // Columna H - FREC.
                const otros = row[8];       // Columna I - OTROS
                const service = row[9];     // Columna J - SERVICIO
                const agente = row[10];     // Columna K - AGENTE
                const observaciones = row[11]; // Columna L - OBSERVACIONES
                const currency = row[12];   // Columna M - Currency (nueva)
                
                rutasParseadas.push({
                  id: idCounter++,
                  region: region.nombre,
                  country: country || '',
                  pol: pol.trim(),
                  pod: pod.trim(),
                  tariff_type: 'AMERICA',
                  of_wm: of_wm || 0,
                  of_min: of_min || 0,
                  currency: currency || 'USD',
                  frequency: frequency || '',
                  transit_time: tt || 0,
                  otros: otros || '',
                  service: service || '',
                  agente: agente || '',
                  observaciones: observaciones || '',
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
        setError('Error al cargar las rutas. Por favor, verifica que el archivo MSL-IMPORT.xlsx esté en src/assets/');
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

                    {/* ========== RENDERIZADO ESPECÍFICO PARA ASIA ========== */}
                    {ruta.tariff_type === 'ASIA' && (
                      <>
                        {/* Transporte - Solo para ASIA */}
                        <div className="mb-3 pb-3 border-bottom">
                          <p className="mb-1">
                            <strong>Vía/Transbordo:</strong> {ruta.via || 'N/A'}
                          </p>
                        </div>

                        {/* Tarifas ASIA */}
                        <div className="mb-3 pb-3 border-bottom">
                          <h6 className="text-primary mb-2">💰 Tarifas</h6>
                          <div className="mb-2">
                            <strong>Costo W/M:</strong> {ruta.of_wm} {ruta.currency}
                          </div>
                          <div>
                            <strong>Mínimo:</strong> {ruta.of_min} {ruta.currency}
                          </div>
                        </div>

                        {/* Servicio ASIA */}
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
                        </div>

                        {/* Servicio EUROPA */}
                        <div>
                          <h6 className="text-primary mb-2">⏱️ Servicio</h6>
                          <p className="mb-1">
                            <strong>Frecuencia:</strong>{' '}
                            <span className="badge bg-info text-dark">
                              {ruta.frequency}
                            </span>
                          </p>
                          <p className="mb-1">
                            <strong>Tiempo de Tránsito:</strong>{' '}
                            {ruta.transit_time} días
                          </p>
                          {ruta.service && (
                            <p className="mb-1">
                              <strong>Servicio:</strong> {ruta.service}
                            </p>
                          )}
                          {ruta.agente && (
                            <p className="mb-1">
                              <strong>Agente:</strong> {ruta.agente}
                            </p>
                          )}
                          {ruta.otros && (
                            <p className="mb-1">
                              <strong>Otros:</strong> {ruta.otros}
                            </p>
                          )}
                          {ruta.observaciones && (
                            <p className="mb-0">
                              <strong>Observaciones:</strong> {ruta.observaciones}
                            </p>
                          )}
                        </div>
                      </>
                    )}

                    {/* ========== RENDERIZADO ESPECÍFICO PARA NORTEAMERICA ========== */}
                    {ruta.tariff_type === 'NORTEAMERICA' && (
                      <>
                        {/* Tarifas NORTEAMERICA */}
                        <div className="mb-3 pb-3 border-bottom">
                          <h6 className="text-primary mb-2">💰 Tarifas</h6>
                          <div className="mb-2">
                            <strong>Tarifa (0.1 a 15 m³):</strong> {ruta.of_wm} {ruta.currency}
                          </div>
                          <div>
                            <strong>Tarifa Mínima:</strong> {ruta.of_min} {ruta.currency}
                          </div>
                          <div className="mt-2">
                            <small className="text-info">
                              <i className="bi bi-info-circle"></i> Región NORTEAMERICA - Tarifa por volumen
                            </small>
                          </div>
                        </div>

                        {/* Servicio NORTEAMERICA */}
                        <div>
                          <h6 className="text-primary mb-2">⏱️ Servicio</h6>
                          <p className="mb-1">
                            <strong>Frecuencia:</strong>{' '}
                            <span className="badge bg-info text-dark">
                              {ruta.frequency}
                            </span>
                          </p>
                          <p className="mb-1">
                            <strong>Tiempo de Tránsito:</strong>{' '}
                            {ruta.transit_time} días
                          </p>
                          {ruta.service && (
                            <p className="mb-1">
                              <strong>Servicio:</strong> {ruta.service}
                            </p>
                          )}
                          {ruta.agente && (
                            <p className="mb-1">
                              <strong>Agente:</strong> {ruta.agente}
                            </p>
                          )}
                          {ruta.otros && (
                            <p className="mb-0">
                              <strong>Otros:</strong> {ruta.otros}
                            </p>
                          )}
                        </div>
                      </>
                    )}

                    {/* ========== RENDERIZADO ESPECÍFICO PARA AMERICA ========== */}
                    {ruta.tariff_type === 'AMERICA' && (
                      <>
                        {/* Tarifas AMERICA */}
                        <div className="mb-3 pb-3 border-bottom">
                          <h6 className="text-primary mb-2">💰 Tarifas</h6>
                          <div className="mb-2">
                            <strong>Tarifa (0.1 a 15 m³):</strong> {ruta.of_wm} {ruta.currency}
                          </div>
                          <div>
                            <strong>Tarifa Mínima:</strong> {ruta.of_min} {ruta.currency}
                          </div>
                          <div className="mt-2">
                            <small className="text-info">
                              <i className="bi bi-info-circle"></i> Región AMERICA - Tarifa por volumen
                            </small>
                          </div>
                        </div>

                        {/* Servicio AMERICA */}
                        <div>
                          <h6 className="text-primary mb-2">⏱️ Servicio</h6>
                          <p className="mb-1">
                            <strong>Frecuencia:</strong>{' '}
                            <span className="badge bg-info text-dark">
                              {ruta.frequency}
                            </span>
                          </p>
                          <p className="mb-1">
                            <strong>Tiempo de Tránsito:</strong>{' '}
                            {ruta.transit_time} días
                          </p>
                          {ruta.service && (
                            <p className="mb-1">
                              <strong>Servicio:</strong> {ruta.service}
                            </p>
                          )}
                          {ruta.agente && (
                            <p className="mb-1">
                              <strong>Agente:</strong> {ruta.agente}
                            </p>
                          )}
                          {ruta.otros && (
                            <p className="mb-1">
                              <strong>Otros:</strong> {ruta.otros}
                            </p>
                          )}
                          {ruta.observaciones && (
                            <p className="mb-0">
                              <strong>Observaciones:</strong> {ruta.observaciones}
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

export default Cotizador;