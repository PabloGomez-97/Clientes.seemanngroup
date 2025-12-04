import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from "../../auth/AuthContext";
import * as XLSX from 'xlsx';
import Select from 'react-select';
import { packageTypeOptions } from './PackageTypes/PiecestypesLCL';

interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

// ============================================================================
// TIPOS E INTERFACES PARA RUTAS LCL
// ============================================================================

interface RutaLCL {
  id: string;
  pol: string;
  polNormalized: string;
  pod: string;
  podNormalized: string;
  servicio: string | null;
  ofWM: number;
  ofWMString: string;
  currency: 'USD' | 'EUR';
  frecuencia: string | null;
  agente: string | null;
  ttAprox: string | null;
  operador: string;
  operadorNormalized: string;
  row_number: number;
}

interface SelectOption {
  value: string;
  label: string;
}

type Currency = 'USD' | 'EUR';
type Operador = string;

// ============================================================================
// FUNCIONES HELPER PARA RUTAS LCL
// ============================================================================

const extractPrice = (priceValue: any): number => {
  if (!priceValue) return 0;
  if (typeof priceValue === 'number') return priceValue;
  const match = priceValue.toString().match(/[\d,]+\.?\d*/);
  if (!match) return 0;
  return parseFloat(match[0].replace(/,/g, ''));
};

const normalize = (str: string | null): string => {
  if (!str) return '';
  return str.toString().toLowerCase().trim();
};

const capitalize = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const parseLCL = (data: any[]): RutaLCL[] => {
  const rutas: RutaLCL[] = [];
  let idCounter = 1;

  for (let i = 2; i < data.length; i++) {
    const row: any = data[i];
    if (!row) continue;

    const pol = row[1];
    const servicio = row[2];
    const pod = row[3];
    const ofWM = row[4];
    const currency = row[5];
    const frecuencia = row[6];
    const agente = row[7];
    const ttAprox = row[8];
    const operador = row[9];

    if (pol && pod && typeof pol === 'string' && typeof pod === 'string' && ofWM && operador) {
      const ofWMNumber = extractPrice(ofWM);
      
      rutas.push({
        id: `LCL-${idCounter++}`,
        pol: pol.trim(),
        polNormalized: normalize(pol),
        pod: pod.trim(),
        podNormalized: normalize(pod),
        servicio: servicio ? servicio.toString().trim() : null,
        ofWM: ofWMNumber,
        ofWMString: ofWM.toString().trim(),
        currency: currency && currency.toString().toUpperCase() === 'EUR' ? 'EUR' : 'USD',
        frecuencia: frecuencia ? frecuencia.toString().trim() : null,
        agente: agente ? agente.toString().trim() : null,
        ttAprox: ttAprox ? ttAprox.toString().trim() : null,
        operador: operador.toString().trim(),
        operadorNormalized: normalize(operador),
        row_number: i + 1
      });
    }
  }

  return rutas;
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

function QuoteLCL() {
  const { accessToken } = useOutletContext<OutletContext>();
  const { user } = useAuth();
  const ejecutivo = user?.ejecutivo;
  
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // ESTADOS PARA RUTAS LCL
  // ============================================================================
  
  const [rutas, setRutas] = useState<RutaLCL[]>([]);
  const [loadingRutas, setLoadingRutas] = useState(true);
  const [errorRutas, setErrorRutas] = useState<string | null>(null);
  
  const [polSeleccionado, setPolSeleccionado] = useState<SelectOption | null>(null);
  const [podSeleccionado, setPodSeleccionado] = useState<SelectOption | null>(null);
  const [rutaSeleccionada, setRutaSeleccionada] = useState<RutaLCL | null>(null);
  
  const [opcionesPOL, setOpcionesPOL] = useState<SelectOption[]>([]);
  const [opcionesPOD, setOpcionesPOD] = useState<SelectOption[]>([]);
  
  const [operadoresActivos, setOperadoresActivos] = useState<Set<Operador>>(new Set());
  const [operadoresDisponibles, setOperadoresDisponibles] = useState<Operador[]>([]);

  // ============================================================================
  // ESTADOS PARA COMMODITY
  // ============================================================================
  
  const [pieces, setPieces] = useState(1);
  const [description, setDescription] = useState("Cargamento Marítimo LCL");
  const [selectedPackageType, setSelectedPackageType] = useState(97);
  
  const [length, setLength] = useState(100); // cm
  const [width, setWidth] = useState(80); // cm
  const [height, setHeight] = useState(60); // cm
  const [weight, setWeight] = useState(500); // kg

  // ============================================================================
  // CARGA DE DATOS LCL.XLSX
  // ============================================================================

  useEffect(() => {
    const cargarRutas = async () => {
      try {
        setLoadingRutas(true);
        const response = await fetch('/assets/LCL.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const rutasParsed = parseLCL(data);
        setRutas(rutasParsed);

        // Extraer POLs únicos
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

        // Extraer operadores únicos
        const operadoresUnicos = Array.from(
          new Set(
            rutasParsed
              .map(r => r.operador)
              .filter(o => o)
          )
        ).sort() as string[];
        setOperadoresDisponibles(operadoresUnicos);
        setOperadoresActivos(new Set(operadoresUnicos));

        setLoadingRutas(false);
      } catch (err) {
        console.error('Error al cargar LCL.xlsx:', err);
        setErrorRutas('No se pudo cargar el archivo LCL.xlsx');
        setLoadingRutas(false);
      }
    };

    cargarRutas();
  }, []);

  // ============================================================================
  // ACTUALIZAR PODs CUANDO CAMBIA POL
  // ============================================================================

  useEffect(() => {
    if (polSeleccionado) {
      const podsParaPOL = rutas
        .filter(r => r.polNormalized === polSeleccionado.value)
        .map(r => r.pod);
      
      const podsUnicos = Array.from(new Set(podsParaPOL))
        .sort()
        .map(pod => ({
          value: normalize(pod),
          label: capitalize(pod)
        }));
      
      setOpcionesPOD(podsUnicos);
      setPodSeleccionado(null);
      setRutaSeleccionada(null);
    } else {
      setOpcionesPOD([]);
      setPodSeleccionado(null);
      setRutaSeleccionada(null);
    }
  }, [polSeleccionado, rutas]);

  // ============================================================================
  // CÁLCULOS
  // ============================================================================

  const calculateVolume = () => {
    return (length * width * height) / 1000000; // m³
  };

  const volume = calculateVolume();
  const totalVolume = volume * pieces;
  const totalWeight = weight * pieces;
  const totalWeightTons = totalWeight / 1000; // Convertir kg a toneladas
  
  // W/M Chargeable: Mayor entre peso (en toneladas) y volumen (en m³)
  const chargeableVolume = Math.max(totalWeightTons, totalVolume);

  // ============================================================================
  // FILTRAR RUTAS
  // ============================================================================

  const rutasFiltradas = rutas.filter(ruta => {
    if (!polSeleccionado || !podSeleccionado) return false;
    
    const matchPOL = ruta.polNormalized === polSeleccionado.value;
    const matchPOD = ruta.podNormalized === podSeleccionado.value;
    const matchOperador = operadoresActivos.has(ruta.operador);
    
    return matchPOL && matchPOD && matchOperador;
  }).sort((a, b) => a.ofWM - b.ofWM);

  // ============================================================================
  // CALCULAR TARIFA OCEAN FREIGHT
  // ============================================================================

  const calcularOceanFreight = () => {
    if (!rutaSeleccionada) return null;

    const expense = rutaSeleccionada.ofWM * chargeableVolume;
    const income = expense * 1.15;

    return {
      expense,
      income,
      currency: rutaSeleccionada.currency
    };
  };

  const tarifaOceanFreight = calcularOceanFreight();

  // ============================================================================
  // FUNCIÓN DE TEST API
  // ============================================================================

  const testAPI = async () => {
    if (!rutaSeleccionada) {
      setError('Debes seleccionar una ruta antes de generar la cotización');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const payload = getTestPayload();
      
      const res = await fetch('https://api.linbis.com/Quotes/create', {
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

  const getTestPayload = () => {
    if (!rutaSeleccionada || !tarifaOceanFreight) {
      return null;
    }

    const charges = [];
    const divisa = rutaSeleccionada.currency;

    // Cobro de BL
    charges.push({
      service: {
        id: 168,
        code: "B"
      },
      income: {
        quantity: 1,
        unit: "BL",
        rate: 60,
        amount: 60,
        showamount: 60,
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

    // Cobro de Handling
    charges.push({
      service: {
        id: 162,
        code: "H"
      },
      income: {
        quantity: 1,
        unit: "HL",
        rate: 45,
        amount: 45,
        showamount: 45,
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

    // Cobro de EXW
    charges.push({
      service: {
        id: 271,
        code: "EC"
      },
      income: {
        quantity: 1,
        unit: "EXW CHARGES",
        rate: 100,
        amount: 100,
        showamount: 100,
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

    // Cobro de OCEAN FREIGHT
    charges.push({
      service: {
        id: 106,
        code: "OF"
      },
      income: {
        quantity: chargeableVolume,
        unit: "OCEAN FREIGHT",
        rate: rutaSeleccionada.ofWM * 1.15,
        amount: tarifaOceanFreight.income,
        showamount: tarifaOceanFreight.income,
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
        notes: `OCEAN FREIGHT charge - ${rutaSeleccionada.operador} - W/M: ${chargeableVolume.toFixed(3)} - Tarifa: ${divisa} ${rutaSeleccionada.ofWM}/W/M - Total: ${divisa} ${tarifaOceanFreight.expense.toFixed(2)} + 15%`
      },
      expense: {
        quantity: chargeableVolume,
        unit: "OCEAN FREIGHT",
        rate: rutaSeleccionada.ofWM,
        amount: tarifaOceanFreight.expense,
        showamount: tarifaOceanFreight.expense,
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
        notes: `OCEAN FREIGHT expense - ${rutaSeleccionada.operador} - W/M: ${chargeableVolume.toFixed(3)} - Tarifa: ${divisa} ${rutaSeleccionada.ofWM}/W/M - Total: ${divisa} ${tarifaOceanFreight.expense.toFixed(2)}`
      }
    });

    return {
      date: new Date().toISOString(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      transitDays: 5,
      customerReference: "Portal Created [LCL]",
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
        name: user?.username
      },
      consignee: {
        name: user?.username
      },
      issuingCompany: {
        name: rutaSeleccionada?.operador || "Por Confirmar"
      },
      serviceType: {
        name: "LCL"
      },
      PaymentTerms: {
        name: "Prepaid"
      },
      salesRep: {
        name: ejecutivo?.nombre || "Ignacio Maldonado"
      },
      commodities: [
        {
          commodityType: "Standard",
          packageType: {
            id: selectedPackageType
          },
          pieces: pieces,
          description: description,
          weightPerUnitValue: weight,
          weightPerUnitUOM: "kg",
          totalWeightValue: totalWeight,
          totalWeightUOM: "kg",
          lengthValue: length,
          lengthUOM: "cm",
          widthValue: width,
          widthUOM: "cm",
          heightValue: height,
          heightUOM: "cm",
          volumeValue: volume,
          volumeUOM: "m3",
          totalVolumeValue: totalVolume,
          totalVolumeUOM: "m3"
        }
      ],
      charges
    };
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col">
          <h2 className="mb-1">📦 Cotizador LCL</h2>
          <p className="text-muted mb-0">Genera cotizaciones para envíos Less than Container Load</p>
        </div>
      </div>

      {/* ============================================================================ */}
      {/* SECCIÓN 1: SELECCIÓN DE RUTA */}
      {/* ============================================================================ */}

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h5 className="card-title mb-4">📍 Paso 1: Selecciona Ruta</h5>

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
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderColor: '#dee2e6',
                        '&:hover': { borderColor: '#0d6efd' }
                      })
                    }}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">Puerto de Destino (POD)</label>
                  <Select
                    value={podSeleccionado}
                    onChange={setPodSeleccionado}
                    options={opcionesPOD}
                    placeholder={polSeleccionado ? "Selecciona puerto de destino..." : "Primero selecciona origen"}
                    isClearable
                    isDisabled={!polSeleccionado}
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderColor: '#dee2e6',
                        '&:hover': { borderColor: '#0d6efd' }
                      })
                    }}
                  />
                </div>
              </div>

              {/* Filtro de Operadores */}
              {polSeleccionado && podSeleccionado && (
                <div className="border-top pt-3 mb-4">
                  <label className="form-label fw-semibold mb-2">Operadores</label>
                  <div className="d-flex flex-wrap gap-2">
                    {operadoresDisponibles.map(operador => (
                      <button
                        key={operador}
                        type="button"
                        className={`btn btn-sm ${
                          operadoresActivos.has(operador)
                            ? 'btn-primary'
                            : 'btn-outline-secondary'
                        }`}
                        onClick={() => {
                          const newSet = new Set(operadoresActivos);
                          if (newSet.has(operador)) {
                            newSet.delete(operador);
                          } else {
                            newSet.add(operador);
                          }
                          setOperadoresActivos(newSet);
                        }}
                      >
                        {operador}
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
                      {rutasFiltradas.map(ruta => (
                        <div key={ruta.id} className="col-md-6 col-lg-4">
                          <div 
                            className={`card h-100 ${
                              rutaSeleccionada?.id === ruta.id 
                                ? 'border-success border-2 shadow' 
                                : 'border'
                            }`}
                            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                            onClick={() => {
                              setRutaSeleccionada(ruta);
                              setError(null);
                              setResponse(null);
                            }}
                          >
                            <div className="card-body">
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <span className="badge bg-primary">
                                  {ruta.operador}
                                </span>
                                {rutaSeleccionada?.id === ruta.id && (
                                  <span className="badge bg-success">✓ Seleccionada</span>
                                )}
                              </div>

                              <div className="mb-3">
                                <small className="text-muted d-block mb-1">Tarifa OF W/M:</small>
                                <h5 className="mb-0 text-success">
                                  {ruta.currency} {ruta.ofWM}
                                  <small className="text-muted">/W/M</small>
                                </h5>
                              </div>

                              {ruta.servicio && (
                                <p className="small mb-2">
                                  <strong>Servicio:</strong> {ruta.servicio}
                                </p>
                              )}

                              {ruta.ttAprox && (
                                <p className="small mb-2">
                                  <strong>Transit Time:</strong> {ruta.ttAprox}
                                </p>
                              )}

                              {ruta.frecuencia && (
                                <p className="small mb-2">
                                  <strong>Frecuencia:</strong> {ruta.frecuencia}
                                </p>
                              )}

                              {ruta.agente && (
                                <p className="small mb-0 text-muted">
                                  <strong>Agente:</strong> {ruta.agente}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Información de ruta seleccionada */}
              {rutaSeleccionada && (
                <div className="alert alert-success mt-4 mb-0">
                  <h6 className="alert-heading">✓ Ruta Seleccionada</h6>
                  <p className="mb-2">
                    <strong>Ruta:</strong> {rutaSeleccionada.pol} → {rutaSeleccionada.pod}
                  </p>
                  <p className="mb-2">
                    <strong>Operador:</strong> {rutaSeleccionada.operador}
                  </p>
                  {rutaSeleccionada.servicio && (
                    <p className="mb-2">
                      <strong>Servicio:</strong> {rutaSeleccionada.servicio}
                    </p>
                  )}
                  <p className="mb-0">
                    <strong>Tarifa:</strong> {rutaSeleccionada.currency} {rutaSeleccionada.ofWM}/W/M
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ============================================================================ */}
      {/* SECCIÓN 2: DATOS DEL COMMODITY */}
      {/* ============================================================================ */}

      {rutaSeleccionada && (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="card-title mb-4">📦 Paso 2: Datos del Commodity</h5>

            {/* Formulario */}
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Tipo de Paquete</label>
                <select
                  className="form-select"
                  value={selectedPackageType}
                  onChange={(e) => setSelectedPackageType(Number(e.target.value))}
                >
                  {packageTypeOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">Número de Piezas</label>
                <input
                  type="number"
                  className="form-control"
                  value={pieces}
                  onChange={(e) => setPieces(Number(e.target.value))}
                  min="1"
                  step="1"
                />
              </div>

              <div className="col-12">
                <label className="form-label">Descripción</label>
                <input
                  type="text"
                  className="form-control"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción de la carga"
                />
              </div>

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
            </div>

            {/* Cálculos */}
            <div className="mt-4 p-3 border rounded" style={{ backgroundColor: '#e7f5ff' }}>
              <h6 className="mb-3">🧮 Cálculos W/M</h6>
              <div className="row g-2" style={{ fontSize: '0.9rem' }}>
                <div className="col-md-4">
                  <strong>Volumen por pieza:</strong> {volume.toFixed(4)} m³
                </div>
                <div className="col-md-4">
                  <strong>Volumen total:</strong> {totalVolume.toFixed(4)} m³
                </div>
                <div className="col-md-4">
                  <strong>Peso total:</strong> {totalWeight.toFixed(2)} kg ({totalWeightTons.toFixed(3)} ton)
                </div>
                <div className="col-12 mt-3 pt-3 border-top">
                  <strong className="text-primary">W/M Chargeable:</strong>{' '}
                  <span className="text-primary fw-bold fs-5">{chargeableVolume.toFixed(3)}</span>
                  {' '}({chargeableVolume === totalWeightTons ? 'PESO' : 'VOLUMEN'})
                </div>
                
                {tarifaOceanFreight && (
                  <>
                    <div className="col-12 mt-3 pt-3 border-top">
                      <h6 className="mb-2">💰 Tarifa OCEAN FREIGHT</h6>
                    </div>
                    <div className="col-md-6">
                      <strong>Tarifa base:</strong> {rutaSeleccionada.currency} {rutaSeleccionada.ofWM}/W/M
                    </div>
                    <div className="col-md-6">
                      <strong>W/M Chargeable:</strong> {chargeableVolume.toFixed(3)}
                    </div>
                    <div className="col-md-6">
                      <strong>Expense:</strong>{' '}
                      <span className="text-info">
                        {rutaSeleccionada.currency} {tarifaOceanFreight.expense.toFixed(2)}
                      </span>
                    </div>
                    <div className="col-md-6">
                      <strong className="text-success">Income (+15%):</strong>{' '}
                      <span className="text-success fw-bold">
                        {rutaSeleccionada.currency} {tarifaOceanFreight.income.toFixed(2)}
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
      {/* PASO 3: GENERAR COTIZACIÓN */}
      {/* ============================================================================ */}

      {rutaSeleccionada && tarifaOceanFreight && (
        <>
          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <h5 className="card-title mb-4">🚀 Paso 3: Generar Cotización</h5>

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
      {/* SECCIÓN 4: RESULTADOS */}
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