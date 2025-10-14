import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Select from 'react-select';
import Modal from './Modal';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface RutaFCL {
  id: string;
  pol: string;
  polNormalized: string;
  pod: string;
  podNormalized: string;
  gp20: string;
  hq40: string;
  nor40: string | null;
  carrier: string;
  carrierNormalized: string;
  tt: string | null;
  remarks: string;
  company: string;
  companyNormalized: string;
  row_number: number;
  
  // Para comparación y ordenamiento
  priceForComparison: number;
  currency: 'USD' | 'EUR';
}

interface SelectOption {
  value: string;
  label: string;
}

// ============================================================================
// FUNCIONES HELPER
// ============================================================================

/**
 * Extrae el precio numérico de un string como "EUR 1846" o "USD 1800"
 */
const extractPrice = (priceStr: string | null): number => {
  if (!priceStr) return 0;
  const match = priceStr.toString().match(/[\d,]+\.?\d*/);
  if (!match) return 0;
  return parseFloat(match[0].replace(/,/g, ''));
};

/**
 * Extrae la moneda de un string como "EUR 1846" o "USD 1800"
 */
const extractCurrency = (priceStr: string | null): 'USD' | 'EUR' => {
  if (!priceStr) return 'USD';
  const str = priceStr.toString().toUpperCase();
  if (str.includes('EUR')) return 'EUR';
  return 'USD';
};

/**
 * Normaliza un string para comparación case-insensitive
 */
const normalize = (str: string | null): string => {
  if (!str) return '';
  return str.toString().toLowerCase().trim();
};

/**
 * Capitaliza la primera letra de cada palabra (para mostrar bonito)
 */
const capitalize = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// ============================================================================
// FUNCIÓN DE PARSEO
// ============================================================================

const parseFCL = (data: any[]): RutaFCL[] => {
  const rutas: RutaFCL[] = [];
  let idCounter = 1;

  // Los datos empiezan en la fila 3 (índice 2 en el array)
  // Headers están en fila 2 (índice 1)
  for (let i = 2; i < data.length; i++) {
    const row: any = data[i];
    if (!row) continue;

    const pol = row[1]; // Columna B (índice 1)
    const pod = row[2]; // Columna C (índice 2)
    const gp20 = row[3]; // Columna D
    const hq40 = row[4]; // Columna E
    const nor40 = row[5]; // Columna F
    const carrier = row[6]; // Columna G
    const tt = row[7]; // Columna H
    const remarks = row[8]; // Columna I
    const company = row[10]; // Columna K

    // Solo agregar si tiene POL y POD
    if (pol && pod && typeof pol === 'string' && typeof pod === 'string') {
      const currency = extractCurrency(hq40);
      const price = extractPrice(hq40);

      rutas.push({
        id: `FCL-${idCounter++}`,
        pol: pol.trim(),
        polNormalized: normalize(pol),
        pod: pod.trim(),
        podNormalized: normalize(pod),
        gp20: gp20 ? gp20.toString().trim() : 'N/A',
        hq40: hq40 ? hq40.toString().trim() : 'N/A',
        nor40: nor40 ? nor40.toString().trim() : null,
        carrier: carrier ? carrier.toString().trim() : 'N/A',
        carrierNormalized: normalize(carrier),
        tt: tt ? tt.toString().trim() : null,
        remarks: remarks ? remarks.toString().trim() : '',
        company: company ? company.toString().trim() : '',
        companyNormalized: normalize(company),
        row_number: i + 1,
        priceForComparison: price,
        currency: currency
      });
    }
  }

  return rutas;
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const CotizadorFCL: React.FC = () => {
  // Estados principales
  const [rutas, setRutas] = useState<RutaFCL[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de selección
  const [polSeleccionado, setPolSeleccionado] = useState<SelectOption | null>(null);
  const [podSeleccionado, setPodSeleccionado] = useState<SelectOption | null>(null);
  
  // Opciones de dropdowns
  const [opcionesPOL, setOpcionesPOL] = useState<SelectOption[]>([]);
  const [opcionesPOD, setOpcionesPOD] = useState<SelectOption[]>([]);
  
  // Filtros
  const [rutasFiltradas, setRutasFiltradas] = useState<RutaFCL[]>([]);
  const [carriersSeleccionados, setCarriersSeleccionados] = useState<Set<string>>(new Set());
  const [ordenarPor, setOrdenarPor] = useState<'precio' | 'carrier'>('precio');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [rutaSeleccionada, setRutaSeleccionada] = useState<RutaFCL | null>(null);

  // ============================================================================
  // CARGAR Y PARSEAR EXCEL
  // ============================================================================

  useEffect(() => {
    const cargarArchivo = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/assets/FCL.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]; // Primera hoja
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
        
        const rutasParsed = parseFCL(data);
        setRutas(rutasParsed);

        // Generar opciones únicas de POL (normalizadas)
        const polMap = new Map<string, string>();
        rutasParsed.forEach(r => {
          if (!polMap.has(r.polNormalized)) {
            polMap.set(r.polNormalized, r.pol);
          }
        });
        const polsUnicos = Array.from(polMap.entries())
          .map(([normalized, original]) => ({
            value: normalized,
            label: capitalize(original)
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setOpcionesPOL(polsUnicos);

        // Inicializar todos los carriers como seleccionados
        const carriersSet = new Set(rutasParsed.map(r => r.carrierNormalized));
        setCarriersSeleccionados(carriersSet);

        setLoading(false);
      } catch (err) {
        console.error('Error al cargar archivo FCL:', err);
        setError('Error al cargar el archivo FCL.xlsx. Verifica que esté en src/assets/');
        setLoading(false);
      }
    };

    cargarArchivo();
  }, []);

  // ============================================================================
  // EFECTOS
  // ============================================================================

  useEffect(() => {
    if (polSeleccionado) {
      // Filtrar rutas por POL normalizado
      const rutasDelPOL = rutas.filter(r => r.polNormalized === polSeleccionado.value);
      
      // Generar opciones únicas de POD (normalizadas)
      const podMap = new Map<string, string>();
      rutasDelPOL.forEach(r => {
        if (!podMap.has(r.podNormalized)) {
          podMap.set(r.podNormalized, r.pod);
        }
      });
      const podsUnicos = Array.from(podMap.entries())
        .map(([normalized, original]) => ({
          value: normalized,
          label: capitalize(original)
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
      setOpcionesPOD(podsUnicos);
    } else {
      setOpcionesPOD([]);
    }
  }, [polSeleccionado, rutas]);

  useEffect(() => {
    if (polSeleccionado && podSeleccionado) {
      // Filtrar por POL, POD y carriers seleccionados (todo normalizado)
      let resultados = rutas.filter(
        r => r.polNormalized === polSeleccionado.value && 
             r.podNormalized === podSeleccionado.value &&
             carriersSeleccionados.has(r.carrierNormalized)
      );

      // Ordenar resultados
      if (ordenarPor === 'precio') {
        resultados.sort((a, b) => {
          // Comparar por moneda primero, luego por precio
          if (a.currency !== b.currency) {
            return a.currency === 'USD' ? -1 : 1; // USD primero
          }
          return a.priceForComparison - b.priceForComparison;
        });
      } else {
        resultados.sort((a, b) => a.carrier.localeCompare(b.carrier));
      }

      setRutasFiltradas(resultados);
    } else {
      setRutasFiltradas([]);
    }
  }, [polSeleccionado, podSeleccionado, rutas, carriersSeleccionados, ordenarPor]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handlePOLChange = (option: SelectOption | null) => {
    setPolSeleccionado(option);
    setPodSeleccionado(null);
    setRutasFiltradas([]);
  };

  const handlePODChange = (option: SelectOption | null) => {
    setPodSeleccionado(option);
  };

  const toggleCarrier = (carrierNormalized: string) => {
    const newSet = new Set(carriersSeleccionados);
    if (newSet.has(carrierNormalized)) {
      newSet.delete(carrierNormalized);
    } else {
      newSet.add(carrierNormalized);
    }
    setCarriersSeleccionados(newSet);
  };

  const handleCotizar = (ruta: RutaFCL) => {
    setRutaSeleccionada(ruta);
    setModalAbierto(true);
  };

  const handleCerrarModal = () => {
    setModalAbierto(false);
  };

  // Obtener carriers únicos disponibles
  const carriersDisponibles = Array.from(
    new Map(
      rutas.map(r => [r.carrierNormalized, r.carrier])
    ).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="container mt-4 mb-5">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="fw-light">Cotizador FCL - Full Container Load</h1>
        <p className="text-muted">Tarifas por Contenedor Completo</p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center mt-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3">Cargando tarifas FCL...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error</h4>
          <p>{error}</p>
        </div>
      )}

      {/* Formulario Principal */}
      {!loading && !error && (
        <>
          {/* Información del archivo cargado */}
          <div className="alert alert-info mb-4" role="alert">
            <strong>📦 Rutas cargadas:</strong> {rutas.length} rutas FCL disponibles
          </div>

          {/* Selección POL y POD */}
          <div className="card shadow-sm mb-4">
            <div className="card-body p-4">
              <div className="row g-3">
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

          {/* Filtros y Ordenamiento */}
          {polSeleccionado && podSeleccionado && (
            <div className="card shadow-sm mb-4">
              <div className="card-body p-4">
                <div className="row g-3">
                  {/* Filtro de Carriers */}
                  <div className="col-md-8">
                    <label className="form-label fw-semibold mb-3">
                      Filtrar por Carrier:
                    </label>
                    <div className="row g-2">
                      {carriersDisponibles.map(([normalized, original]) => (
                        <div key={normalized} className="col-md-4 col-6">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`check-${normalized}`}
                              checked={carriersSeleccionados.has(normalized)}
                              onChange={() => toggleCarrier(normalized)}
                            />
                            <label
                              className="form-check-label"
                              htmlFor={`check-${normalized}`}
                            >
                              <span className="badge bg-primary">
                                {original}
                              </span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ordenamiento */}
                  <div className="col-md-4">
                    <label className="form-label fw-semibold mb-3">
                      Ordenar por:
                    </label>
                    <div className="btn-group w-100" role="group">
                      <input
                        type="radio"
                        className="btn-check"
                        name="ordenar"
                        id="orden-precio"
                        checked={ordenarPor === 'precio'}
                        onChange={() => setOrdenarPor('precio')}
                      />
                      <label className="btn btn-outline-primary" htmlFor="orden-precio">
                        💰 Precio
                      </label>

                      <input
                        type="radio"
                        className="btn-check"
                        name="ordenar"
                        id="orden-carrier"
                        checked={ordenarPor === 'carrier'}
                        onChange={() => setOrdenarPor('carrier')}
                      />
                      <label className="btn btn-outline-primary" htmlFor="orden-carrier">
                        🚢 Carrier
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Resultados */}
          {rutasFiltradas.length > 0 && (
            <div>
              <h4 className="mb-3">
                Opciones Disponibles ({rutasFiltradas.length})
              </h4>

              <div className="row g-4">
                {rutasFiltradas.map((ruta) => (
                  <div key={ruta.id} className="col-12 col-lg-6">
                    <div className="card h-100 shadow-sm">
                      {/* Header */}
                      <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                        <h5 className="card-title mb-0">
                          {capitalize(ruta.pol)} → {capitalize(ruta.pod)}
                        </h5>
                        <span className="badge bg-light text-dark">
                          {ruta.carrier}
                        </span>
                      </div>

                      {/* Body */}
                      <div className="card-body">
                        {/* Tarifas de Contenedores */}
                        <div className="mb-3 pb-3 border-bottom">
                          <h6 className="text-primary mb-3">📦 Tarifas por Contenedor</h6>
                          
                          <div className="row g-2">
                            {/* 20GP */}
                            <div className="col-12">
                              <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded">
                                <span className="fw-semibold">
                                  <i className="bi bi-box-seam"></i> 20GP
                                </span>
                                <span className="badge bg-success fs-6">
                                  {ruta.gp20}
                                </span>
                              </div>
                            </div>

                            {/* 40HQ */}
                            <div className="col-12">
                              <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded">
                                <span className="fw-semibold">
                                  <i className="bi bi-boxes"></i> 40HQ
                                </span>
                                <span className="badge bg-success fs-6">
                                  {ruta.hq40}
                                </span>
                              </div>
                            </div>

                            {/* 40NOR */}
                            <div className="col-12">
                              <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded">
                                <span className="fw-semibold">
                                  <i className="bi bi-box"></i> 40NOR
                                </span>
                                <span className={`badge ${ruta.nor40 ? 'bg-success' : 'bg-secondary'} fs-6`}>
                                  {ruta.nor40 || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Información de Servicio */}
                        <div className="mb-3 pb-3 border-bottom">
                          <h6 className="text-primary mb-2">🚢 Información de Servicio</h6>
                          
                          <p className="mb-2">
                            <strong>Carrier:</strong>{' '}
                            <span className="badge bg-primary">{ruta.carrier}</span>
                          </p>

                          {ruta.tt && (
                            <p className="mb-2">
                              <strong>Transit Time:</strong>{' '}
                              <span className="badge bg-info text-dark">{ruta.tt}</span>
                            </p>
                          )}

                          {ruta.company && (
                            <p className="mb-0">
                              <strong>Compañía:</strong> {ruta.company}
                            </p>
                          )}
                        </div>

                        {/* Remarks */}
                        {ruta.remarks && (
                          <div>
                            <h6 className="text-primary mb-2">📝 Observaciones</h6>
                            <p className="mb-0 small text-muted">
                              {ruta.remarks}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="card-footer">
                        <button
                          type="button"
                          className="btn btn-primary w-100"
                          onClick={() => handleCotizar(ruta)}
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

          {/* Sin resultados */}
          {polSeleccionado && podSeleccionado && rutasFiltradas.length === 0 && (
            <div className="text-center text-muted mt-5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="64"
                height="64"
                fill="currentColor"
                className="bi bi-search mb-3"
                viewBox="0 0 16 16"
              >
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
              </svg>
              <p>No se encontraron rutas con los filtros seleccionados</p>
              <small>Intenta activar más carriers</small>
            </div>
          )}

          {/* Mensaje inicial */}
          {!polSeleccionado && (
            <div className="text-center text-muted mt-5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="64"
                height="64"
                fill="currentColor"
                className="bi bi-box-seam mb-3"
                viewBox="0 0 16 16"
              >
                <path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5l2.404.961L10.404 2l-2.218-.887zm3.564 1.426L5.596 5 8 5.961 14.154 3.5l-2.404-.961zm3.25 1.7-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923l6.5 2.6zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464L7.443.184z"/>
              </svg>
              <p>Selecciona un puerto de origen para comenzar</p>
            </div>
          )}
        </>
      )}

      {/* Modal de Cotización */}
      <Modal
        isOpen={modalAbierto}
        onClose={handleCerrarModal}
        title={`Cotización FCL: ${rutaSeleccionada?.pol} → ${rutaSeleccionada?.pod}`}
      >
        {rutaSeleccionada && (
          <div className="cotizacion-detalle">
            {/* Header */}
            <div className="mb-4 pb-3 border-bottom">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  {capitalize(rutaSeleccionada.pol)} → {capitalize(rutaSeleccionada.pod)}
                </h5>
                <span className="badge bg-primary">{rutaSeleccionada.carrier}</span>
              </div>
            </div>

            {/* Tarifas de Contenedores */}
            <div className="mb-4 pb-3 border-bottom">
              <h6 className="fw-semibold mb-3">Tarifas por Contenedor</h6>
              <div className="row g-2">
                <div className="col-12">
                  <div className="d-flex justify-content-between p-2 bg-light rounded">
                    <span className="fw-semibold">20GP</span>
                    <span className="badge bg-success fs-6">{rutaSeleccionada.gp20}</span>
                  </div>
                </div>
                <div className="col-12">
                  <div className="d-flex justify-content-between p-2 bg-light rounded">
                    <span className="fw-semibold">40HQ</span>
                    <span className="badge bg-success fs-6">{rutaSeleccionada.hq40}</span>
                  </div>
                </div>
                <div className="col-12">
                  <div className="d-flex justify-content-between p-2 bg-light rounded">
                    <span className="fw-semibold">40NOR</span>
                    <span className={`badge ${rutaSeleccionada.nor40 ? 'bg-success' : 'bg-secondary'} fs-6`}>
                      {rutaSeleccionada.nor40 || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Información de Servicio */}
            <div className="mb-4 pb-3 border-bottom">
              <h6 className="fw-semibold mb-3">Información de Servicio</h6>
              <div className="row g-3">
                <div className="col-6">
                  <small className="text-muted d-block">Carrier</small>
                  <span className="fw-semibold">{rutaSeleccionada.carrier}</span>
                </div>
                {rutaSeleccionada.tt && (
                  <div className="col-6">
                    <small className="text-muted d-block">Transit Time</small>
                    <span className="fw-semibold">{rutaSeleccionada.tt}</span>
                  </div>
                )}
                {rutaSeleccionada.company && (
                  <div className="col-12">
                    <small className="text-muted d-block">Compañía</small>
                    <span className="fw-semibold">{rutaSeleccionada.company}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Remarks */}
            {rutaSeleccionada.remarks && (
              <div>
                <h6 className="fw-semibold mb-2">Observaciones</h6>
                <p className="mb-0 text-muted">{rutaSeleccionada.remarks}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CotizadorFCL;