import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Select from 'react-select';
import Modal from './Modal';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface RutaAerea {
  id: string;
  origin: string;
  originNormalized: string;
  destination: string;
  destinationNormalized: string;
  
  // 5 rangos de peso (pueden ser null)
  kg45: string | null;
  kg100: string | null;
  kg300: string | null;
  kg500: string | null;
  kg1000: string | null;
  
  carrier: string | null;
  carrierNormalized: string | null;
  frequency: string | null;
  transitTime: string | null;
  routing: string | null;
  remark1: string | null;
  remark2: string | null;
  
  row_number: number;
  
  // Para comparación y ordenamiento
  priceForComparison: number;
  currency: 'USD' | 'EUR' | 'GBP';
}

interface SelectOption {
  value: string;
  label: string;
}

type Currency = 'USD' | 'EUR' | 'GBP';

// ============================================================================
// FUNCIONES HELPER
// ============================================================================

/**
 * Extrae el precio numérico de un string como "USD 2,45" o "EUR 3,85"
 * IMPORTANTE: Este archivo usa COMA como decimal (estilo europeo)
 */
const extractPrice = (priceStr: string | null): number => {
  if (!priceStr) return 0;
  
  // Remover todo excepto números, comas y puntos
  const cleaned = priceStr.toString().replace(/[^\d,\.]/g, '');
  
  // Convertir coma a punto (formato europeo → formato JS)
  const normalized = cleaned.replace(',', '.');
  
  const price = parseFloat(normalized);
  return isNaN(price) ? 0 : price;
};

/**
 * Extrae la moneda de un string como "USD 2,45" o "EUR 3,85"
 */
const extractCurrency = (priceStr: string | null): Currency => {
  if (!priceStr) return 'USD';
  const str = priceStr.toString().toUpperCase();
  
  if (str.includes('EUR')) return 'EUR';
  if (str.includes('GBP')) return 'GBP';
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
 * Capitaliza la primera letra de cada palabra
 */
const capitalize = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Obtiene el precio más bajo disponible de los 5 rangos
 * Para ordenamiento según especificación: usar el rango más bajo disponible
 */
const getLowestPrice = (ruta: RutaAerea): { price: number; currency: Currency } => {
  const tarifas = [
    ruta.kg45,
    ruta.kg100,
    ruta.kg300,
    ruta.kg500,
    ruta.kg1000
  ];
  
  // Encontrar la primera tarifa no-null
  for (const tarifa of tarifas) {
    if (tarifa) {
      return {
        price: extractPrice(tarifa),
        currency: extractCurrency(tarifa)
      };
    }
  }
  
  return { price: 0, currency: 'USD' };
};

// ============================================================================
// FUNCIÓN DE PARSEO
// ============================================================================

const parseAEREO = (data: any[]): RutaAerea[] => {
  const rutas: RutaAerea[] = [];
  let idCounter = 1;

  // Los datos empiezan en la fila 3 (índice 2 en el array)
  // Headers están en fila 2 (índice 1)
  for (let i = 2; i < data.length; i++) {
    const row: any = data[i];
    if (!row) continue;

    const origin = row[1];      // Columna B
    const destination = row[2]; // Columna C
    const kg45 = row[3];        // Columna D
    const kg100 = row[4];       // Columna E
    const kg300 = row[5];       // Columna F
    const kg500 = row[6];       // Columna G
    const kg1000 = row[7];      // Columna H
    const carrier = row[8];     // Columna I
    const frequency = row[9];   // Columna J
    const tt = row[10];         // Columna K
    const routing = row[11];    // Columna L
    const remark1 = row[12];    // Columna M
    const remark2 = row[13];    // Columna N

    // Solo agregar si tiene Origin y Destination
    if (origin && destination && typeof origin === 'string' && typeof destination === 'string') {
      const lowestPrice = getLowestPrice({
        kg45: kg45 ? kg45.toString().trim() : null,
        kg100: kg100 ? kg100.toString().trim() : null,
        kg300: kg300 ? kg300.toString().trim() : null,
        kg500: kg500 ? kg500.toString().trim() : null,
        kg1000: kg1000 ? kg1000.toString().trim() : null,
      } as RutaAerea);

      rutas.push({
        id: `AEREO-${idCounter++}`,
        origin: origin.trim(),
        originNormalized: normalize(origin),
        destination: destination.trim(),
        destinationNormalized: normalize(destination),
        kg45: kg45 ? kg45.toString().trim() : null,
        kg100: kg100 ? kg100.toString().trim() : null,
        kg300: kg300 ? kg300.toString().trim() : null,
        kg500: kg500 ? kg500.toString().trim() : null,
        kg1000: kg1000 ? kg1000.toString().trim() : null,
        carrier: carrier ? carrier.toString().trim() : null,
        carrierNormalized: carrier ? normalize(carrier) : null,
        frequency: frequency ? frequency.toString().trim() : null,
        transitTime: tt ? tt.toString().trim() : null,
        routing: routing ? routing.toString().trim() : null,
        remark1: remark1 ? remark1.toString().trim() : null,
        remark2: remark2 ? remark2.toString().trim() : null,
        row_number: i + 1,
        priceForComparison: lowestPrice.price,
        currency: lowestPrice.currency
      });
    }
  }

  return rutas;
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const CotizadorAereo: React.FC = () => {
  // Estados principales
  const [rutas, setRutas] = useState<RutaAerea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de selección
  const [originSeleccionado, setOriginSeleccionado] = useState<SelectOption | null>(null);
  const [destinationSeleccionado, setDestinationSeleccionado] = useState<SelectOption | null>(null);
  
  // Opciones de dropdowns
  const [opcionesOrigin, setOpcionesOrigin] = useState<SelectOption[]>([]);
  const [opcionesDestination, setOpcionesDestination] = useState<SelectOption[]>([]);
  
  // Filtros
  const [rutasFiltradas, setRutasFiltradas] = useState<RutaAerea[]>([]);
  const [carriersSeleccionados, setCarriersSeleccionados] = useState<Set<string>>(new Set());
  const [monedasSeleccionadas, setMonedasSeleccionadas] = useState<Set<Currency>>(new Set(['USD', 'EUR', 'GBP']));
  const [ordenarPor, setOrdenarPor] = useState<'precio' | 'carrier'>('precio');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [rutaSeleccionada, setRutaSeleccionada] = useState<RutaAerea | null>(null);

  // ============================================================================
  // CARGAR Y PARSEAR EXCEL
  // ============================================================================

  useEffect(() => {
    const cargarArchivo = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/assets/AÉREO.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
        
        const rutasParsed = parseAEREO(data);
        setRutas(rutasParsed);

        // Generar opciones únicas de Origin (normalizadas)
        const originMap = new Map<string, string>();
        rutasParsed.forEach(r => {
          if (!originMap.has(r.originNormalized)) {
            originMap.set(r.originNormalized, r.origin);
          }
        });
        const originsUnicos = Array.from(originMap.entries())
          .map(([normalized, original]) => ({
            value: normalized,
            label: original.toUpperCase() // Mostrar códigos IATA en mayúsculas
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setOpcionesOrigin(originsUnicos);

        // Inicializar todos los carriers como seleccionados (incluyendo "Por Confirmar")
        const carriersSet = new Set<string>();
        rutasParsed.forEach(r => {
          if (r.carrierNormalized) {
            carriersSet.add(r.carrierNormalized);
          } else {
            carriersSet.add('por_confirmar'); // Placeholder para carriers null
          }
        });
        setCarriersSeleccionados(carriersSet);

        setLoading(false);
      } catch (err) {
        console.error('Error al cargar archivo AÉREO:', err);
        setError('Error al cargar el archivo AÉREO.xlsx. Verifica que esté en src/assets/');
        setLoading(false);
      }
    };

    cargarArchivo();
  }, []);

  // ============================================================================
  // EFECTOS
  // ============================================================================

  useEffect(() => {
    if (originSeleccionado) {
      const rutasDelOrigin = rutas.filter(r => r.originNormalized === originSeleccionado.value);
      
      const destMap = new Map<string, string>();
      rutasDelOrigin.forEach(r => {
        if (!destMap.has(r.destinationNormalized)) {
          destMap.set(r.destinationNormalized, r.destination);
        }
      });
      const destinationsUnicos = Array.from(destMap.entries())
        .map(([normalized, original]) => ({
          value: normalized,
          label: original.toUpperCase()
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
      setOpcionesDestination(destinationsUnicos);
    } else {
      setOpcionesDestination([]);
    }
  }, [originSeleccionado, rutas]);

  useEffect(() => {
    if (originSeleccionado && destinationSeleccionado) {
      // Filtrar por Origin, Destination, Carriers y Monedas
      let resultados = rutas.filter(r => {
        const matchOrigin = r.originNormalized === originSeleccionado.value;
        const matchDestination = r.destinationNormalized === destinationSeleccionado.value;
        
        // Match carrier (considerar null como "por_confirmar")
        const carrierKey = r.carrierNormalized || 'por_confirmar';
        const matchCarrier = carriersSeleccionados.has(carrierKey);
        
        // Match moneda
        const matchMoneda = monedasSeleccionadas.has(r.currency);
        
        return matchOrigin && matchDestination && matchCarrier && matchMoneda;
      });

      // Ordenar resultados
      if (ordenarPor === 'precio') {
        resultados.sort((a, b) => {
          // Primero por moneda (USD, EUR, GBP)
          const currencyOrder = { 'USD': 1, 'EUR': 2, 'GBP': 3 };
          const currencyCompare = currencyOrder[a.currency] - currencyOrder[b.currency];
          if (currencyCompare !== 0) return currencyCompare;
          
          // Luego por precio
          return a.priceForComparison - b.priceForComparison;
        });
      } else {
        // Ordenar por carrier (null al final)
        resultados.sort((a, b) => {
          if (!a.carrier && !b.carrier) return 0;
          if (!a.carrier) return 1;
          if (!b.carrier) return -1;
          return a.carrier.localeCompare(b.carrier);
        });
      }

      setRutasFiltradas(resultados);
    } else {
      setRutasFiltradas([]);
    }
  }, [originSeleccionado, destinationSeleccionado, rutas, carriersSeleccionados, monedasSeleccionadas, ordenarPor]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleOriginChange = (option: SelectOption | null) => {
    setOriginSeleccionado(option);
    setDestinationSeleccionado(null);
    setRutasFiltradas([]);
  };

  const handleDestinationChange = (option: SelectOption | null) => {
    setDestinationSeleccionado(option);
  };

  const toggleCarrier = (carrierKey: string) => {
    const newSet = new Set(carriersSeleccionados);
    if (newSet.has(carrierKey)) {
      newSet.delete(carrierKey);
    } else {
      newSet.add(carrierKey);
    }
    setCarriersSeleccionados(newSet);
  };

  const toggleMoneda = (moneda: Currency) => {
    const newSet = new Set(monedasSeleccionadas);
    if (newSet.has(moneda)) {
      newSet.delete(moneda);
    } else {
      newSet.add(moneda);
    }
    setMonedasSeleccionadas(newSet);
  };

  const handleCotizar = (ruta: RutaAerea) => {
    setRutaSeleccionada(ruta);
    setModalAbierto(true);
  };

  const handleCerrarModal = () => {
    setModalAbierto(false);
  };

  // Obtener carriers únicos disponibles (incluyendo null como "Por Confirmar")
  const carriersDisponibles = (() => {
    const carrierMap = new Map<string, string>();
    rutas.forEach(r => {
      if (r.carrier) {
        carrierMap.set(r.carrierNormalized!, r.carrier);
      } else {
        carrierMap.set('por_confirmar', 'Por Confirmar');
      }
    });
    return Array.from(carrierMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  })();

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="container mt-4 mb-5">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="fw-light">Cotizador Aéreo ✈️</h1>
        <p className="text-muted">Tarifas de Carga Aérea por Kilogramo</p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center mt-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3">Cargando tarifas aéreas...</p>
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
            <strong>✈️ Rutas cargadas:</strong> {rutas.length} rutas aéreas disponibles
          </div>

          {/* Selección Origin y Destination */}
          <div className="card shadow-sm mb-4">
            <div className="card-body p-4">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    Aeropuerto de Origen
                  </label>
                  <Select
                    options={opcionesOrigin}
                    value={originSeleccionado}
                    onChange={handleOriginChange}
                    placeholder="Selecciona origen (ej: MIA, SCL)..."
                    isClearable
                    isSearchable
                    noOptionsMessage={() => 'No se encontraron aeropuertos'}
                    styles={{
                      control: (base) => ({
                        ...base,
                        minHeight: '45px',
                        borderColor: '#dee2e6',
                      })
                    }}
                  />
                  <small className="text-muted">
                    {opcionesOrigin.length} aeropuertos disponibles
                  </small>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    Aeropuerto de Destino
                  </label>
                  <Select
                    options={opcionesDestination}
                    value={destinationSeleccionado}
                    onChange={handleDestinationChange}
                    placeholder={
                      originSeleccionado
                        ? 'Selecciona destino...'
                        : 'Primero selecciona origen'
                    }
                    isClearable
                    isSearchable
                    isDisabled={!originSeleccionado}
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
                    {originSeleccionado
                      ? `${opcionesDestination.length} destino(s) disponible(s)`
                      : 'Selecciona origen primero'}
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* Filtros */}
          {originSeleccionado && destinationSeleccionado && (
            <div className="card shadow-sm mb-4">
              <div className="card-body p-4">
                <div className="row g-3">
                  {/* Filtro de Carriers */}
                  <div className="col-md-6">
                    <label className="form-label fw-semibold mb-3">
                      Filtrar por Carrier:
                    </label>
                    <div className="row g-2">
                      {carriersDisponibles.map(([normalized, original]) => (
                        <div key={normalized} className="col-md-6 col-12">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`check-carrier-${normalized}`}
                              checked={carriersSeleccionados.has(normalized)}
                              onChange={() => toggleCarrier(normalized)}
                            />
                            <label
                              className="form-check-label"
                              htmlFor={`check-carrier-${normalized}`}
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

                  {/* Filtro de Monedas */}
                  <div className="col-md-3">
                    <label className="form-label fw-semibold mb-3">
                      Filtrar por Moneda:
                    </label>
                    <div className="d-flex flex-column gap-2">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="check-usd"
                          checked={monedasSeleccionadas.has('USD')}
                          onChange={() => toggleMoneda('USD')}
                        />
                        <label className="form-check-label" htmlFor="check-usd">
                          <span className="badge bg-success">💵 USD</span>
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="check-eur"
                          checked={monedasSeleccionadas.has('EUR')}
                          onChange={() => toggleMoneda('EUR')}
                        />
                        <label className="form-check-label" htmlFor="check-eur">
                          <span className="badge bg-info">💶 EUR</span>
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="check-gbp"
                          checked={monedasSeleccionadas.has('GBP')}
                          onChange={() => toggleMoneda('GBP')}
                        />
                        <label className="form-check-label" htmlFor="check-gbp">
                          <span className="badge bg-warning text-dark">💷 GBP</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Ordenamiento */}
                  <div className="col-md-3">
                    <label className="form-label fw-semibold mb-3">
                      Ordenar por:
                    </label>
                    <div className="btn-group-vertical w-100" role="group">
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
                        ✈️ Carrier
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
                          ✈️ {ruta.origin.toUpperCase()} → {ruta.destination.toUpperCase()}
                        </h5>
                        <span className="badge bg-light text-dark">
                          {ruta.carrier || 'Por Confirmar'}
                        </span>
                      </div>

                      {/* Body */}
                      <div className="card-body">
                        {/* Tarifas por Peso */}
                        <div className="mb-3 pb-3 border-bottom">
                          <h6 className="text-primary mb-3">💰 Tarifas por Kilogramo</h6>
                          
                          <div className="d-flex flex-column gap-2">
                            {/* 45kg */}
                            {ruta.kg45 && (
                              <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded">
                                <span className="fw-semibold">📦 45kg</span>
                                <span className="badge bg-success fs-6">{ruta.kg45}</span>
                              </div>
                            )}

                            {/* 100kg */}
                            {ruta.kg100 && (
                              <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded">
                                <span className="fw-semibold">📦 100kg</span>
                                <span className="badge bg-success fs-6">{ruta.kg100}</span>
                              </div>
                            )}

                            {/* 300kg */}
                            {ruta.kg300 && (
                              <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded">
                                <span className="fw-semibold">📦 300kg</span>
                                <span className="badge bg-success fs-6">{ruta.kg300}</span>
                              </div>
                            )}

                            {/* 500kg */}
                            {ruta.kg500 && (
                              <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded">
                                <span className="fw-semibold">📦 500kg</span>
                                <span className="badge bg-success fs-6">{ruta.kg500}</span>
                              </div>
                            )}

                            {/* 1000kg */}
                            {ruta.kg1000 && (
                              <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded">
                                <span className="fw-semibold">📦 1000kg</span>
                                <span className="badge bg-success fs-6">{ruta.kg1000}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Información de Vuelo */}
                        <div className="mb-3 pb-3 border-bottom">
                          <h6 className="text-primary mb-2">✈️ Información de Vuelo</h6>
                          
                          <p className="mb-2">
                            <strong>Carrier:</strong>{' '}
                            <span className="badge bg-primary">
                              {ruta.carrier || 'Por Confirmar'}
                            </span>
                          </p>

                          {ruta.frequency && (
                            <p className="mb-2">
                              <strong>Frecuencia:</strong>{' '}
                              <span className="badge bg-info text-dark">{ruta.frequency}</span>
                            </p>
                          )}

                          {ruta.transitTime && (
                            <p className="mb-0">
                              <strong>Tiempo de Tránsito:</strong>{' '}
                              <span className="badge bg-warning text-dark">{ruta.transitTime}</span>
                            </p>
                          )}
                        </div>

                        {/* Routing - solo si tiene contenido */}
                        {ruta.routing && (
                          <div className="mb-3 pb-3 border-bottom">
                            <h6 className="text-primary mb-2">🗺️ Ruta</h6>
                            <p className="mb-0 small">{ruta.routing}</p>
                          </div>
                        )}

                        {/* Observaciones - solo si tienen contenido */}
                        {(ruta.remark1 || ruta.remark2) && (
                          <div>
                            <h6 className="text-primary mb-2">📝 Observaciones</h6>
                            {ruta.remark1 && (
                              <p className="mb-1 small text-muted">• {ruta.remark1}</p>
                            )}
                            {ruta.remark2 && (
                              <p className="mb-0 small text-muted">• {ruta.remark2}</p>
                            )}
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
          {originSeleccionado && destinationSeleccionado && rutasFiltradas.length === 0 && (
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
              <small>Intenta activar más carriers o monedas</small>
            </div>
          )}

          {/* Mensaje inicial */}
          {!originSeleccionado && (
            <div className="text-center text-muted mt-5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="64"
                height="64"
                fill="currentColor"
                className="bi bi-airplane mb-3"
                viewBox="0 0 16 16"
              >
                <path d="M6.428 1.151C6.708.591 7.213 0 8 0s1.292.592 1.572 1.151C9.861 1.73 10 2.431 10 3v3.691l5.17 2.585a1.5 1.5 0 0 1 .83 1.342V12a.5.5 0 0 1-.582.493l-5.507-.918-.375 2.253 1.318 1.318A.5.5 0 0 1 10.5 16h-5a.5.5 0 0 1-.354-.854l1.319-1.318-.376-2.253-5.507.918A.5.5 0 0 1 0 12v-1.382a1.5 1.5 0 0 1 .83-1.342L6 6.691V3c0-.568.14-1.271.428-1.849Zm.894.448C7.111 2.02 7 2.569 7 3v4a.5.5 0 0 1-.276.447l-5.448 2.724a.5.5 0 0 0-.276.447v.792l5.418-.903a.5.5 0 0 1 .575.41l.5 3a.5.5 0 0 1-.14.437L6.708 15h2.586l-.647-.646a.5.5 0 0 1-.14-.436l.5-3a.5.5 0 0 1 .576-.411L15 11.41v-.792a.5.5 0 0 0-.276-.447L9.276 7.447A.5.5 0 0 1 9 7V3c0-.432-.11-.979-.322-1.401C8.458 1.159 8.213 1 8 1c-.213 0-.458.158-.678.599Z"/>
              </svg>
              <p>Selecciona un aeropuerto de origen para comenzar</p>
            </div>
          )}
        </>
      )}

      {/* Modal de Cotización */}
      <Modal
        isOpen={modalAbierto}
        onClose={handleCerrarModal}
        title={`Cotización Aérea: ${rutaSeleccionada?.origin} → ${rutaSeleccionada?.destination}`}
      >
        {rutaSeleccionada && (
          <div className="cotizacion-detalle">
            {/* Header */}
            <div className="mb-4 pb-3 border-bottom">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  {rutaSeleccionada.origin.toUpperCase()} → {rutaSeleccionada.destination.toUpperCase()}
                </h5>
                <span className="badge bg-primary">
                  {rutaSeleccionada.carrier || 'Por Confirmar'}
                </span>
              </div>
            </div>

            {/* Tarifas por Peso */}
            <div className="mb-4 pb-3 border-bottom">
              <h6 className="fw-semibold mb-3">Tarifas por Kilogramo</h6>
              <div className="d-flex flex-column gap-2">
                {rutaSeleccionada.kg45 && (
                  <div className="d-flex justify-content-between p-2 bg-light rounded">
                    <span className="fw-semibold">45kg</span>
                    <span className="badge bg-success fs-6">{rutaSeleccionada.kg45}</span>
                  </div>
                )}
                {rutaSeleccionada.kg100 && (
                  <div className="d-flex justify-content-between p-2 bg-light rounded">
                    <span className="fw-semibold">100kg</span>
                    <span className="badge bg-success fs-6">{rutaSeleccionada.kg100}</span>
                  </div>
                )}
                {rutaSeleccionada.kg300 && (
                  <div className="d-flex justify-content-between p-2 bg-light rounded">
                    <span className="fw-semibold">300kg</span>
                    <span className="badge bg-success fs-6">{rutaSeleccionada.kg300}</span>
                  </div>
                )}
                {rutaSeleccionada.kg500 && (
                  <div className="d-flex justify-content-between p-2 bg-light rounded">
                    <span className="fw-semibold">500kg</span>
                    <span className="badge bg-success fs-6">{rutaSeleccionada.kg500}</span>
                  </div>
                )}
                {rutaSeleccionada.kg1000 && (
                  <div className="d-flex justify-content-between p-2 bg-light rounded">
                    <span className="fw-semibold">1000kg</span>
                    <span className="badge bg-success fs-6">{rutaSeleccionada.kg1000}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Información de Vuelo */}
            <div className="mb-4 pb-3 border-bottom">
              <h6 className="fw-semibold mb-3">Información de Vuelo</h6>
              <div className="row g-3">
                <div className="col-6">
                  <small className="text-muted d-block">Carrier</small>
                  <span className="fw-semibold">{rutaSeleccionada.carrier || 'Por Confirmar'}</span>
                </div>
                {rutaSeleccionada.frequency && (
                  <div className="col-6">
                    <small className="text-muted d-block">Frecuencia</small>
                    <span className="fw-semibold">{rutaSeleccionada.frequency}</span>
                  </div>
                )}
                {rutaSeleccionada.transitTime && (
                  <div className="col-6">
                    <small className="text-muted d-block">Tiempo de Tránsito</small>
                    <span className="fw-semibold">{rutaSeleccionada.transitTime}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Routing */}
            {rutaSeleccionada.routing && (
              <div className="mb-4 pb-3 border-bottom">
                <h6 className="fw-semibold mb-2">Ruta</h6>
                <p className="mb-0 text-muted">{rutaSeleccionada.routing}</p>
              </div>
            )}

            {/* Observaciones */}
            {(rutaSeleccionada.remark1 || rutaSeleccionada.remark2) && (
              <div>
                <h6 className="fw-semibold mb-2">Observaciones</h6>
                {rutaSeleccionada.remark1 && (
                  <p className="mb-1 text-muted small">• {rutaSeleccionada.remark1}</p>
                )}
                {rutaSeleccionada.remark2 && (
                  <p className="mb-0 text-muted small">• {rutaSeleccionada.remark2}</p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CotizadorAereo;