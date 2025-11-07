import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from "../../auth/AuthContext";
import * as XLSX from 'xlsx';
import Select from 'react-select';
import type { Ruta, SelectOption, TipoOperacion, Provider } from './HelpersLCL/Types';
import { getPriceForComparison } from './HelpersLCL/Types';
import {
  parseMSLIMPORT,
  parseMSLEXPORT,
  parseCRAFT,
  parseECU,
  parseCTL,
  parseOVERSEAS,
  parsePLUSCARGO,
} from './HelpersLCL/Parsers';
import {
  calcularOceanFreight,
  getChargeableVolume,
  kgToTons,
  getCurrency,
  getTransitTime,
  getFrequency,
  getViaInfo,
  getRutaInfo,
  validarCommodity,
  formatPrice,
  getProviderColor,
  type TarifaCalculada
} from './HelpersLCL/LCLHelpers';
import { packageTypeOptions } from './PackageTypes/PiecestypesLCL';

interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

function QuoteLCL() {
  const { accessToken } = useOutletContext<OutletContext>();
  const { user } = useAuth();
  
  // Estados de API
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // ESTADOS PARA RUTAS LCL
  // ============================================================================
  
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loadingRutas, setLoadingRutas] = useState(true);
  const [errorRutas, setErrorRutas] = useState<string | null>(null);
  
  const [tipoOperacion, setTipoOperacion] = useState<TipoOperacion>('IMPORTACION');
  const [polSeleccionado, setPolSeleccionado] = useState<SelectOption | null>(null);
  const [podSeleccionado, setPodSeleccionado] = useState<SelectOption | null>(null);
  const [rutaSeleccionada, setRutaSeleccionada] = useState<Ruta | null>(null);
  
  const [opcionesPOL, setOpcionesPOL] = useState<SelectOption[]>([]);
  const [opcionesPOD, setOpcionesPOD] = useState<SelectOption[]>([]);
  
  const [proveedoresActivos, setProveedoresActivos] = useState<Set<Provider>>(new Set());
  const [proveedoresDisponibles, setProveedoresDisponibles] = useState<Provider[]>([]);

  // ============================================================================
  // ESTADOS PARA COMMODITY
  // ============================================================================
  
  const [overallDimsAndWeight, setOverallDimsAndWeight] = useState(false);
  const [pieces, setPieces] = useState(1);
  const [description, setDescription] = useState("LCL Cargo - Test");
  const [selectedPackageType, setSelectedPackageType] = useState(97);
  
  // Modo Normal
  const [length, setLength] = useState(100); // cm
  const [width, setWidth] = useState(80); // cm
  const [height, setHeight] = useState(60); // cm
  const [weight, setWeight] = useState(500); // kg
  
  // Modo Overall
  const [manualVolume, setManualVolume] = useState(0.48); // m³
  const [manualWeight, setManualWeight] = useState(500); // kg

  // ============================================================================
  // CÁLCULOS
  // ============================================================================

  const calculateVolume = () => {
    return (length * width * height) / 1000000;
  };

  const volume = calculateVolume();
  const totalVolume = overallDimsAndWeight ? manualVolume : volume * pieces;
  const totalWeight = overallDimsAndWeight ? manualWeight : weight * pieces;
  const totalWeightTons = kgToTons(totalWeight);
  
  // W/M Chargeable: Mayor entre peso (en toneladas) y volumen (en m³)
  const chargeableVolume = getChargeableVolume(totalWeightTons, totalVolume);

  // ============================================================================
  // CARGA DE RUTAS LCL
  // ============================================================================

  const cargarArchivos = async (tipo: TipoOperacion) => {
    setLoadingRutas(true);
    setErrorRutas(null);

    try {
      const todasLasRutas: Ruta[] = [];

      if (tipo === 'IMPORTACION') {
        const archivos = [
          { nombre: 'MSL-IMPORT.xlsx', parser: parseMSLIMPORT },
          { nombre: 'CRAFT.xlsx', parser: parseCRAFT },
          { nombre: 'ECU.xlsx', parser: parseECU },
          { nombre: 'CTL.xlsx', parser: parseCTL },
          { nombre: 'OVERSEAS.xlsx', parser: parseOVERSEAS },
          { nombre: 'PLUSCARGO.xlsx', parser: parsePLUSCARGO },
        ];

        for (const archivo of archivos) {
          try {
            const response = await fetch(`/assets/${archivo.nombre}`);
            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const worksheet = workbook.Sheets['TARIFARIO'];
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
            
            const rutasParsed = archivo.parser(data as any);
            todasLasRutas.push(...rutasParsed);
          } catch (err) {
            console.error(`Error cargando ${archivo.nombre}:`, err);
          }
        }
      } else {
        const response = await fetch('/assets/MSL-EXPORT.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const worksheet = workbook.Sheets['TARIFARIO'];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
        
        const rutasParsed = parseMSLEXPORT(data as any);
        todasLasRutas.push(...rutasParsed);
      }

      setRutas(todasLasRutas);

      // Extraer POLs únicos
      const polsUnicos = Array.from(new Set(todasLasRutas.map(r => r.pol))).sort();
      setOpcionesPOL(polsUnicos.map(pol => ({ value: pol, label: pol })));

      // Extraer providers únicos
      const providersSet = new Set(todasLasRutas.map(r => r.provider)) as Set<Provider>;
      const providersArray = Array.from(providersSet);
      setProveedoresDisponibles(providersArray);
      setProveedoresActivos(providersSet);

      setLoadingRutas(false);
    } catch (err) {
      console.error('Error al cargar archivos:', err);
      setErrorRutas('No se pudo cargar las rutas. Verifica que los archivos estén en /assets/');
      setLoadingRutas(false);
    }
  };

  // ============================================================================
  // EFECTOS
  // ============================================================================

  useEffect(() => {
    cargarArchivos(tipoOperacion);
  }, [tipoOperacion]);

  useEffect(() => {
    if (polSeleccionado) {
      const rutasDelPOL = rutas.filter(r => r.pol === polSeleccionado.value);
      const podsUnicos = Array.from(new Set(rutasDelPOL.map(r => r.pod))).sort();
      setOpcionesPOD(podsUnicos.map(pod => ({ value: pod, label: pod })));
    } else {
      setOpcionesPOD([]);
    }
    setPodSeleccionado(null);
    setRutaSeleccionada(null);
  }, [polSeleccionado, rutas]);

  useEffect(() => {
    setRutaSeleccionada(null);
  }, [podSeleccionado]);

  // ============================================================================
  // FILTRAR Y ORDENAR RUTAS
  // ============================================================================

  const rutasFiltradas = rutas
    .filter(ruta => {
      if (!polSeleccionado || !podSeleccionado) return false;
      
      const matchPOL = ruta.pol === polSeleccionado.value;
      const matchPOD = ruta.pod === podSeleccionado.value;
      const matchProvider = proveedoresActivos.has(ruta.provider);
      
      return matchPOL && matchPOD && matchProvider;
    })
    .sort((a, b) => getPriceForComparison(a) - getPriceForComparison(b));

  // ============================================================================
  // CALCULAR TARIFA PARA LA RUTA SELECCIONADA
  // ============================================================================

  const tarifaCalculada: TarifaCalculada | null = rutaSeleccionada 
    ? calcularOceanFreight(rutaSeleccionada, chargeableVolume)
    : null;

  // ============================================================================
  // FUNCIÓN PARA GENERAR PAYLOAD
  // ============================================================================

  const getTestPayload = () => {
    if (!rutaSeleccionada || !tarifaCalculada) return null;

    const divisa = tarifaCalculada.divisa;
    const oceanFreightExpense = tarifaCalculada.precio;
    const oceanFreightIncome = tarifaCalculada.precioConMarkup;
    
    const charges = [];

    // ========== 1. BL ==========
    charges.push({
      service: {
        id: 168,
        code: "B"
      },
      income: {
        quantity: 1,
        unit: "BL",
        rate: 60,
        payment: "Prepaid",
        billApplyTo: "Other",
        billTo: {
          name: user?.username
        },
        currency: {
          abbr: divisa
        },
        reference: "LCL-BL-REF",
        showOnDocument: true,
        notes: "BL charge created via API"
      },
      expense: {
        currency: {
          abbr: divisa
        }
      }
    });

    // ========== 2. HANDLING ==========
    charges.push({
      service: {
        id: 162,
        code: "H"
      },
      income: {
        quantity: 1,
        unit: "HL",
        rate: 45,
        payment: "Prepaid",
        billApplyTo: "Other",
        billTo: {
          name: user?.username
        },
        currency: {
          abbr: divisa
        },
        reference: "LCL-HANDLING-REF",
        showOnDocument: true,
        notes: "Handling charge created via API"
      },
      expense: {
        currency: {
          abbr: divisa
        }
      }
    });

    // ========== 3. EXW CHARGES ==========
    charges.push({
      service: {
        id: 271,
        code: "EC"
      },
      income: {
        quantity: 1,
        unit: "EXW CHARGES",
        rate: 100,
        payment: "Prepaid",
        billApplyTo: "Other",
        billTo: {
          name: user?.username
        },
        currency: {
          abbr: divisa
        },
        reference: "LCL-EXW-REF",
        showOnDocument: true,
        notes: "EXW charge created via API"
      },
      expense: {
        currency: {
          abbr: divisa
        }
      }
    });

    // ========== 4. OCEAN FREIGHT ==========
    charges.push({
      service: {
        id: 106,
        code: "OF"
      },
      income: {
        quantity: chargeableVolume,
        unit: "OCEAN FREIGHT",
        rate: oceanFreightIncome / chargeableVolume,
        payment: "Prepaid",
        billApplyTo: "Other",
        billTo: {
          name: user?.username
        },
        currency: {
          abbr: divisa
        },
        reference: "LCL-OCEANFREIGHT-REF",
        showOnDocument: true,
        notes: `OCEAN FREIGHT charge - ${rutaSeleccionada.provider} - W/M: ${chargeableVolume.toFixed(2)} - Rango: ${tarifaCalculada.rangoAplicado}${tarifaCalculada.minimoAplicado ? ' (Mínimo aplicado)' : ''} - Tarifa: ${formatPrice(oceanFreightExpense, divisa)} + 15%`
      },
      expense: {
        quantity: chargeableVolume,
        unit: "OCEAN FREIGHT",
        rate: oceanFreightExpense / chargeableVolume,
        payment: "Prepaid",
        billApplyTo: "Other",
        billTo: {
          name: user?.username
        },
        currency: {
          abbr: divisa
        },
        reference: "LCL-OCEANFREIGHT-REF",
        showOnDocument: true,
        notes: `OCEAN FREIGHT expense - ${rutaSeleccionada.provider} - W/M: ${chargeableVolume.toFixed(2)} - Rango: ${tarifaCalculada.rangoAplicado}${tarifaCalculada.minimoAplicado ? ' (Mínimo aplicado)' : ''} - Tarifa: ${formatPrice(oceanFreightExpense, divisa)}`
      }
    });

    // ========== CARGO ADICIONAL (COMENTADO - EJEMPLO) ==========
    /*
    charges.push({
      service: {
        id: XXX,  // ID del servicio adicional
        code: "XX"
      },
      income: {
        quantity: 1,
        unit: "UNIDAD",
        rate: 50,
        payment: "Prepaid",
        billApplyTo: "Other",
        billTo: {
          name: user?.username
        },
        currency: {
          abbr: divisa
        },
        reference: "LCL-ADICIONAL-REF",
        showOnDocument: true,
        notes: "Cargo adicional"
      },
      expense: {
        currency: {
          abbr: divisa
        }
      }
    });
    */

    // ========== COMMODITY ==========
    const commodity: any = {
      commodityType: "Standard",
      packageType: {
        id: selectedPackageType
      },
      pieces: pieces,
      description: description
    };

    // Modo Normal - Con dimensiones
    if (!overallDimsAndWeight) {
      commodity.weightPerUnitValue = weight;
      commodity.weightPerUnitUOM = "kg";
      commodity.totalWeightValue = totalWeight;
      commodity.totalWeightUOM = "kg";
      commodity.lengthValue = length;
      commodity.lengthUOM = "cm";
      commodity.widthValue = width;
      commodity.widthUOM = "cm";
      commodity.heightValue = height;
      commodity.heightUOM = "cm";
      commodity.volumeValue = volume;
      commodity.volumeUOM = "m3";
      commodity.totalVolumeValue = totalVolume;
      commodity.totalVolumeUOM = "m3";
    } 
    // Modo Overall - Sin dimensiones individuales
    else {
      commodity.totalWeightValue = manualWeight;
      commodity.totalWeightUOM = "kg";
      commodity.totalVolumeValue = manualVolume;
      commodity.totalVolumeUOM = "m3";
    }

    // ========== INFORMACIÓN ADICIONAL DE LA RUTA (COMENTADO) ==========
    // Esta información puede agregarse a commodities o en otro campo según necesites:
    /*
    const rutaInfo = getRutaInfo(rutaSeleccionada);
    
    // Ejemplos de campos que podrías agregar:
    // commodity.provider = rutaInfo.provider;
    // commodity.region = rutaInfo.region;
    // commodity.country = rutaInfo.country;
    // commodity.via = rutaInfo.via;
    // commodity.transitTime = rutaInfo.transitTime;
    // commodity.frequency = rutaInfo.frequency;
    // commodity.service = rutaInfo.service;
    // commodity.agente = rutaInfo.agente;
    // commodity.observaciones = rutaInfo.observaciones;
    // commodity.remarks = rutaInfo.remarks;
    // commodity.firstleg = rutaInfo.firstleg;
    // commodity.servicio = rutaInfo.servicio;
    */

    return {
      id: 14184,
      date: new Date().toISOString(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      transitDays: 5,
      customerReference: "LCL-TEST-REF",
      contact: {
        name: user?.username
      },
      origin: {
        name: rutaSeleccionada.pol
      },
      destination: {
        name: rutaSeleccionada.pod
      },
      modeOfTransportation: {
        id: 1
      },
      rateCategoryId: 2,
      portOfReceipt: {
        name: rutaSeleccionada.pol
      },
      shipper: {
        name: "SEEMANN Y CIA LTDA"
      },
      consignee: {
        name: user?.username
      },
      issuingCompany: {
        name: "MUELLER-GYSIN LIMITED"
      },
      salesRep: {
        name: "Ignacio Maldonado"
      },
      commodities: [commodity],
      charges
    };
  };

  // ============================================================================
  // FUNCIÓN DE TEST API
  // ============================================================================

  const testAPI = async () => {
    if (!rutaSeleccionada) {
      setError('Debes seleccionar una ruta antes de generar la cotización');
      return;
    }

    const validacion = validarCommodity(totalWeight, totalVolume, pieces);
    if (!validacion.valid) {
      setError(validacion.error || 'Error de validación');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const payload = getTestPayload();
      
      const res = await fetch('https://api.linbis.com/Quotes/update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      setResponse(data);
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSeleccionarRuta = (ruta: Ruta) => {
    setRutaSeleccionada(ruta);
    setError(null);
    setResponse(null);
  };

  const toggleProveedor = (provider: Provider) => {
    const newSet = new Set(proveedoresActivos);
    if (newSet.has(provider)) {
      newSet.delete(provider);
    } else {
      newSet.add(provider);
    }
    setProveedoresActivos(newSet);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col">
          <h2 className="mb-1">🚢 Cotizador LCL</h2>
          <p className="text-muted mb-0">Genera cotizaciones para envíos Less than Container Load</p>
        </div>
      </div>

      {/* ============================================================================ */}
      {/* PASO 1: TIPO DE OPERACIÓN */}
      {/* ============================================================================ */}

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">📋 Paso 1: Tipo de Operación</h5>
          <div className="btn-group w-100" role="group">
            <input
              type="radio"
              className="btn-check"
              name="tipoOperacion"
              id="tipo-importacion"
              checked={tipoOperacion === 'IMPORTACION'}
              onChange={() => setTipoOperacion('IMPORTACION')}
            />
            <label className="btn btn-outline-primary" htmlFor="tipo-importacion">
              📥 IMPORTACIÓN
            </label>

            <input
              type="radio"
              className="btn-check"
              name="tipoOperacion"
              id="tipo-exportacion"
              checked={tipoOperacion === 'EXPORTACION'}
              onChange={() => setTipoOperacion('EXPORTACION')}
            />
            <label className="btn btn-outline-primary" htmlFor="tipo-exportacion">
              📤 EXPORTACIÓN
            </label>
          </div>
        </div>
      </div>

      {/* ============================================================================ */}
      {/* PASO 2: SELECCIÓN DE RUTA */}
      {/* ============================================================================ */}

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h5 className="card-title mb-4">📍 Paso 2: Selecciona Ruta</h5>

          {loadingRutas ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
              <p className="mt-3 text-muted">Cargando rutas disponibles...</p>
            </div>
          ) : errorRutas ? (
            <div className="alert alert-danger">
              ❌ {errorRutas}
            </div>
          ) : (
            <>
              {/* Selectores de POL y POD */}
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Puerto de Origen (POL)</label>
                  <Select
                    value={polSeleccionado}
                    onChange={setPolSeleccionado}
                    options={opcionesPOL}
                    placeholder="Selecciona puerto de origen..."
                    isClearable
                    isSearchable
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderColor: '#dee2e6',
                        '&:hover': { borderColor: '#0d6efd' }
                      })
                    }}
                  />
                  <small className="text-muted">{opcionesPOL.length} puertos disponibles</small>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">Puerto de Destino (POD)</label>
                  <Select
                    value={podSeleccionado}
                    onChange={setPodSeleccionado}
                    options={opcionesPOD}
                    placeholder={polSeleccionado ? "Selecciona puerto de destino..." : "Primero selecciona origen"}
                    isClearable
                    isSearchable
                    isDisabled={!polSeleccionado}
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderColor: '#dee2e6',
                        '&:hover': { borderColor: '#0d6efd' }
                      })
                    }}
                  />
                  <small className="text-muted">
                    {polSeleccionado ? `${opcionesPOD.length} destinos disponibles` : 'Selecciona POL primero'}
                  </small>
                </div>
              </div>

              {/* Filtro de Proveedores */}
              {polSeleccionado && podSeleccionado && (
                <div className="border-top pt-3 mb-4">
                  <label className="form-label fw-semibold mb-2">Proveedores</label>
                  <div className="d-flex flex-wrap gap-2">
                    {proveedoresDisponibles.map(provider => (
                      <button
                        key={provider}
                        type="button"
                        className={`btn btn-sm ${
                          proveedoresActivos.has(provider)
                            ? `btn-${getProviderColor(provider)}`
                            : 'btn-outline-secondary'
                        }`}
                        onClick={() => toggleProveedor(provider)}
                      >
                        {provider}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Rutas Disponibles */}
              {polSeleccionado && podSeleccionado && (
                <div className="mt-4">
                  <h6 className="mb-3">
                    Rutas Disponibles ({rutasFiltradas.length})
                  </h6>

                  {rutasFiltradas.length === 0 ? (
                    <div className="alert alert-warning">
                      No se encontraron rutas con los filtros seleccionados
                    </div>
                  ) : (
                    <div className="row g-3">
                      {rutasFiltradas.map(ruta => {
                        const via = getViaInfo(ruta);
                        const transitTime = getTransitTime(ruta);
                        const frequency = getFrequency(ruta);
                        const currency = getCurrency(ruta);
                        const isSelected = rutaSeleccionada?.id === ruta.id;
                        
                        return (
                          <div key={ruta.id} className="col-12">
                            <div 
                              className={`card border ${isSelected ? 'border-success border-2' : ''}`}
                              style={{ cursor: 'pointer' }}
                              onClick={() => handleSeleccionarRuta(ruta)}
                            >
                              <div className="card-body">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                  <div>
                                    <span className={`badge bg-${getProviderColor(ruta.provider)} me-2`}>
                                      {ruta.provider}
                                    </span>
                                    {'country' in ruta && ruta.country && (
                                      <span className="badge bg-secondary me-2">{ruta.country}</span>
                                    )}
                                    <span className="badge bg-light text-dark">{ruta.region}</span>
                                  </div>
                                  {isSelected && (
                                    <span className="badge bg-success">✓ Seleccionada</span>
                                  )}
                                </div>
                                
                                <div className="row g-2 small">
                                  {via && (
                                    <div className="col-md-6">
                                      <strong>Vía:</strong> {via}
                                    </div>
                                  )}
                                  <div className="col-md-6">
                                    <strong>Transit Time:</strong> {transitTime}
                                  </div>
                                  {frequency !== 'N/A' && (
                                    <div className="col-md-6">
                                      <strong>Frecuencia:</strong> {frequency}
                                    </div>
                                  )}
                                  <div className="col-md-6">
                                    <strong>Divisa:</strong> {currency}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Confirmación de selección */}
              {rutaSeleccionada && tarifaCalculada && (
                <div className="alert alert-success mt-4 mb-0">
                  <h6 className="alert-heading">✓ Ruta Seleccionada</h6>
                  <p className="mb-2">
                    <strong>Ruta:</strong> {rutaSeleccionada.pol} → {rutaSeleccionada.pod}
                  </p>
                  <p className="mb-2">
                    <strong>Proveedor:</strong> {rutaSeleccionada.provider}
                  </p>
                  <p className="mb-0">
                    <strong>Divisa:</strong> {tarifaCalculada.divisa}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ============================================================================ */}
      {/* PASO 3: DETALLES DEL COMMODITY */}
      {/* ============================================================================ */}

      {rutaSeleccionada && (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="card-title mb-4">📦 Paso 3: Detalles del Envío</h5>

            {/* Overall Dimensions Toggle */}
            <div className="form-check form-switch mb-4">
              <input
                className="form-check-input"
                type="checkbox"
                id="overallToggle"
                checked={overallDimsAndWeight}
                onChange={(e) => setOverallDimsAndWeight(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="overallToggle">
                <strong>Overall Dimensions & Weight</strong>
                <br />
                <small className="text-muted">
                  {overallDimsAndWeight 
                    ? 'Ingresa peso y volumen total directamente'
                    : 'Calcula automáticamente desde dimensiones individuales'}
                </small>
              </label>
            </div>

            <div className="row g-3">
              {/* Campos comunes */}
              <div className="col-md-4">
                <label className="form-label">Número de piezas</label>
                <input
                  type="number"
                  className="form-control"
                  value={pieces}
                  onChange={(e) => setPieces(Number(e.target.value))}
                  min="1"
                />
              </div>

              <div className="col-md-8">
                <label className="form-label">Descripción</label>
                <input
                  type="text"
                  className="form-control"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="col-12">
                <label className="form-label">Tipo de Paquete</label>
                <select
                  className="form-select"
                  value={selectedPackageType}
                  onChange={(e) => setSelectedPackageType(Number(e.target.value))}
                >
                  {packageTypeOptions.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Modo Normal - Con dimensiones */}
              {!overallDimsAndWeight && (
                <>
                  <div className="col-md-3">
                    <label className="form-label">Largo (cm)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={length}
                      onChange={(e) => setLength(Number(e.target.value))}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Ancho (cm)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={width}
                      onChange={(e) => setWidth(Number(e.target.value))}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Alto (cm)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value))}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Peso por pieza (kg)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={weight}
                      onChange={(e) => setWeight(Number(e.target.value))}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </>
              )}

              {/* Modo Overall */}
              {overallDimsAndWeight && (
                <>
                  <div className="col-md-6">
                    <label className="form-label">Peso Total (kg)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={manualWeight}
                      onChange={(e) => setManualWeight(Number(e.target.value))}
                      min="0"
                      step="0.01"
                    />
                    <small className="text-muted">Peso total de todas las piezas</small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Volumen Total (m³)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={manualVolume}
                      onChange={(e) => setManualVolume(Number(e.target.value))}
                      min="0"
                      step="0.0001"
                    />
                    <small className="text-muted">Volumen total de todas las piezas</small>
                  </div>
                </>
              )}
            </div>

            {/* Cálculos */}
            <div className="mt-4 p-3 border rounded" style={{ backgroundColor: '#e7f5ff' }}>
              <h6 className="mb-3">🧮 Cálculos W/M {overallDimsAndWeight ? '(Modo Overall)' : '(Modo Normal)'}</h6>
              <div className="row g-2" style={{ fontSize: '0.9rem' }}>
                <div className="col-md-4">
                  <strong>Volumen Total:</strong> {totalVolume.toFixed(4)} m³
                </div>
                <div className="col-md-4">
                  <strong>Peso Total:</strong> {totalWeight.toFixed(2)} kg ({totalWeightTons.toFixed(3)} ton)
                </div>
                <div className="col-md-4">
                  <strong className="text-primary">W/M Chargeable:</strong>{' '}
                  <span className="text-primary fw-bold">{chargeableVolume.toFixed(3)}</span>
                  {' '}({chargeableVolume === totalWeightTons ? 'PESO' : 'VOLUMEN'})
                </div>
                
                {tarifaCalculada && (
                  <>
                    <div className="col-12 mt-3 pt-3 border-top">
                      <h6 className="mb-2">💰 Tarifa OCEAN FREIGHT</h6>
                    </div>
                    <div className="col-md-6">
                      <strong>Rango aplicado:</strong> {tarifaCalculada.rangoAplicado}
                    </div>
                    <div className="col-md-6">
                      <strong>Expense:</strong> {formatPrice(tarifaCalculada.precio, tarifaCalculada.divisa)}
                    </div>
                    <div className="col-md-6">
                      {tarifaCalculada.minimoAplicado && (
                        <span className="badge bg-warning text-dark">Mínimo Aplicado</span>
                      )}
                    </div>
                    <div className="col-md-6">
                      <strong className="text-success">Income (+15%):</strong>{' '}
                      <span className="text-success fw-bold">
                        {formatPrice(tarifaCalculada.precioConMarkup, tarifaCalculada.divisa)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* PASO 4: GENERAR COTIZACIÓN */}
      {/* ============================================================================ */}

      {rutaSeleccionada && tarifaCalculada && (
        <>
          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <h5 className="card-title mb-4">🚀 Paso 4: Generar Cotización</h5>

              <button
                onClick={testAPI}
                disabled={loading || !accessToken}
                className="btn btn-lg btn-success w-100"
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Generando...
                  </>
                ) : (
                  <>✨ Generar Cotización LCL</>
                )}
              </button>

              {!accessToken && (
                <div className="alert alert-danger mt-3 mb-0">
                  ⚠️ No hay token de acceso. Asegúrate de estar autenticado.
                </div>
              )}
            </div>
          </div>

          {/* Payload */}
          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <h5 className="card-title">📤 Payload que se enviará</h5>
              <pre style={{
                backgroundColor: '#f8f9fa',
                padding: '15px',
                borderRadius: '5px',
                maxHeight: '300px',
                overflow: 'auto',
                fontSize: '0.85rem'
              }}>
                {JSON.stringify(getTestPayload(), null, 2)}
              </pre>
            </div>
          </div>
        </>
      )}

      {/* ============================================================================ */}
      {/* RESULTADOS */}
      {/* ============================================================================ */}

      {/* Error */}
      {error && (
        <div className="card shadow-sm mb-4 border-danger">
          <div className="card-body">
            <h5 className="card-title text-danger">❌ Error en la llamada</h5>
            <pre style={{
              backgroundColor: '#fff5f5',
              padding: '15px',
              borderRadius: '5px',
              maxHeight: '400px',
              overflow: 'auto',
              fontSize: '0.85rem',
              color: '#c53030'
            }}>
              {error}
            </pre>
          </div>
        </div>
      )}

      {/* Respuesta exitosa */}
      {response && (
        <div className="card shadow-sm mb-4 border-success">
          <div className="card-body">
            <h5 className="card-title text-success">✅ ¡Éxito! Respuesta de la API</h5>
            <pre style={{
              backgroundColor: '#f0fdf4',
              padding: '15px',
              borderRadius: '5px',
              maxHeight: '400px',
              overflow: 'auto',
              fontSize: '0.85rem',
              color: '#15803d'
            }}>
              {JSON.stringify(response, null, 2)}
            </pre>
            <div className="alert alert-success mt-3 mb-0">
              🎉 <strong>¡Perfecto!</strong> Cotización LCL creada exitosamente.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuoteLCL;