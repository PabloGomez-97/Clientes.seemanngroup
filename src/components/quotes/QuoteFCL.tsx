import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from "../../auth/AuthContext";
import * as XLSX from 'xlsx';
import Select from 'react-select';

interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

// ============================================================================
// TIPOS E INTERFACES PARA RUTAS FCL
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
  priceForComparison: number;
  currency: Currency;
}

interface SelectOption {
  value: string;
  label: string;
}

type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'CHF' | 'CLP' | 'SEK';

type ContainerType = '20GP' | '40HQ' | '40NOR';

interface ContainerSelection {
  type: ContainerType;
  packageTypeId: number;
  price: number;
  priceString: string;
}

// ============================================================================
// MAPEO DE CONTENEDORES
// ============================================================================

const CONTAINER_MAPPING = {
  '20GP': { id: 40, name: '20 FT. STANDARD CONTAINER' },
  '40HQ': { id: 27, name: '40 FT. HIGH CUBE' },
  '40NOR': { id: 25, name: '40 FT. REFRIGERATED (ALUMINIUM)' }
};

// ============================================================================
// FUNCIONES HELPER PARA RUTAS FCL
// ============================================================================

const extractPrice = (priceStr: string | null): number => {
  if (!priceStr) return 0;
  const match = priceStr.toString().match(/[\d,]+\.?\d*/);
  if (!match) return 0;
  return parseFloat(match[0].replace(/,/g, ''));
};

const extractCurrency = (priceStr: string | null): Currency => {
  if (!priceStr) return 'USD';
  const str = priceStr.toString().toUpperCase();
  
  if (str.includes('EUR')) return 'EUR';
  if (str.includes('GBP')) return 'GBP';
  if (str.includes('CAD')) return 'CAD';
  if (str.includes('CHF')) return 'CHF';
  if (str.includes('CLP')) return 'CLP';
  if (str.includes('SEK')) return 'SEK';
  return 'USD';
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

const parseFCL = (data: any[]): RutaFCL[] => {
  const rutas: RutaFCL[] = [];
  let idCounter = 1;

  for (let i = 2; i < data.length; i++) {
    const row: any = data[i];
    if (!row) continue;

    const pol = row[1];
    const pod = row[2];
    const gp20 = row[3];
    const hq40 = row[4];
    const nor40 = row[5];
    const carrier = row[6];
    const tt = row[7];
    const remarks = row[8];
    const company = row[10];

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

function QuoteFCL() {
  const { accessToken } = useOutletContext<OutletContext>();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // ESTADOS PARA RUTAS FCL
  // ============================================================================
  
  const [rutas, setRutas] = useState<RutaFCL[]>([]);
  const [loadingRutas, setLoadingRutas] = useState(true);
  const [errorRutas, setErrorRutas] = useState<string | null>(null);
  
  const [polSeleccionado, setPolSeleccionado] = useState<SelectOption | null>(null);
  const [podSeleccionado, setPodSeleccionado] = useState<SelectOption | null>(null);
  const [rutaSeleccionada, setRutaSeleccionada] = useState<RutaFCL | null>(null);
  const [containerSeleccionado, setContainerSeleccionado] = useState<ContainerSelection | null>(null);
  
  const [opcionesPOL, setOpcionesPOL] = useState<SelectOption[]>([]);
  const [opcionesPOD, setOpcionesPOD] = useState<SelectOption[]>([]);
  
  const [carriersActivos, setCarriersActivos] = useState<Set<string>>(new Set());
  const [carriersDisponibles, setCarriersDisponibles] = useState<string[]>([]);

  // ============================================================================
  // CARGA DE DATOS FCL.XLSX
  // ============================================================================

  useEffect(() => {
    const cargarRutas = async () => {
      try {
        setLoadingRutas(true);
        const response = await fetch('/assets/FCL.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const rutasParsed = parseFCL(data);
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

        // Extraer carriers únicos
        const carriersUnicos = Array.from(
          new Set(
            rutasParsed
              .map(r => r.carrier)
              .filter(c => c && c !== 'N/A')
          )
        ).sort() as string[];
        setCarriersDisponibles(carriersUnicos);
        setCarriersActivos(new Set(carriersUnicos));

        setLoadingRutas(false);
      } catch (err) {
        console.error('Error al cargar FCL.xlsx:', err);
        setErrorRutas('No se pudo cargar el archivo FCL.xlsx');
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
      setContainerSeleccionado(null);
    } else {
      setOpcionesPOD([]);
      setPodSeleccionado(null);
      setRutaSeleccionada(null);
      setContainerSeleccionado(null);
    }
  }, [polSeleccionado, rutas]);

  // ============================================================================
  // FILTRAR RUTAS
  // ============================================================================

  const rutasFiltradas = rutas.filter(ruta => {
    if (!polSeleccionado || !podSeleccionado) return false;
    
    const matchPOL = ruta.polNormalized === polSeleccionado.value;
    const matchPOD = ruta.podNormalized === podSeleccionado.value;
    const matchCarrier = !ruta.carrier || ruta.carrier === 'N/A' || carriersActivos.has(ruta.carrier);
    
    return matchPOL && matchPOD && matchCarrier;
  }).sort((a, b) => a.priceForComparison - b.priceForComparison);

  // ============================================================================
  // FUNCIÓN PARA SELECCIONAR CONTENEDOR
  // ============================================================================

  const handleSeleccionarContainer = (ruta: RutaFCL, containerType: ContainerType) => {
    let price = 0;
    let priceString = '';

    switch (containerType) {
      case '20GP':
        price = extractPrice(ruta.gp20);
        priceString = ruta.gp20;
        break;
      case '40HQ':
        price = extractPrice(ruta.hq40);
        priceString = ruta.hq40;
        break;
      case '40NOR':
        if (ruta.nor40) {
          price = extractPrice(ruta.nor40);
          priceString = ruta.nor40;
        } else {
          setError('Este contenedor no está disponible para esta ruta');
          return;
        }
        break;
    }

    const containerSelection: ContainerSelection = {
      type: containerType,
      packageTypeId: CONTAINER_MAPPING[containerType].id,
      price,
      priceString
    };

    setRutaSeleccionada(ruta);
    setContainerSeleccionado(containerSelection);
    setError(null);
    setResponse(null);
  };

  // ============================================================================
  // FUNCIÓN DE TEST API
  // ============================================================================

  const testAPI = async () => {
    if (!rutaSeleccionada || !containerSeleccionado) {
      setError('Debes seleccionar una ruta y un contenedor antes de generar la cotización');
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
    if (!rutaSeleccionada || !containerSeleccionado) {
      return null;
    }

    const charges = [];

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
        payment: "Prepaid",
        billApplyTo: "Other",
        billTo: {
          name: user?.username
        },
        currency: {
          abbr: rutaSeleccionada.currency
        },
        reference: "TEST-REF-FCL",
        showOnDocument: true,
        notes: "BL charge created via API"
      },
      expense: {
        currency: {
          abbr: rutaSeleccionada.currency
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
        payment: "Prepaid",
        billApplyTo: "Other",
        billTo: {
          name: user?.username
        },
        currency: {
          abbr: rutaSeleccionada.currency
        },
        reference: "TEST-REF-HANDLING-FCL",
        showOnDocument: true,
        notes: "Handling charge created via API"
      },
      expense: {
        currency: {
          abbr: rutaSeleccionada.currency
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
        payment: "Prepaid",
        billApplyTo: "Other",
        billTo: {
          name: user?.username
        },
        currency: {
          abbr: rutaSeleccionada.currency
        },
        reference: "TEST-REF-EXW-FCL",
        showOnDocument: true,
        notes: "EXW charge created via API"
      },
      expense: {
        currency: {
          abbr: rutaSeleccionada.currency
        }
      }
    });

    // Cobro de OCEAN FREIGHT
    const oceanFreightRate = containerSeleccionado.price;
    const oceanFreightRateIncome = oceanFreightRate * 1.15;

    charges.push({
      service: {
        id: 106,
        code: "OF"
      },
      income: {
        quantity: 1,
        unit: "CONTAINER",
        rate: oceanFreightRateIncome,
        payment: "Prepaid",
        billApplyTo: "Other",
        billTo: {
          name: user?.username
        },
        currency: {
          abbr: rutaSeleccionada.currency
        },
        reference: "TEST-REF-OCEANFREIGHT",
        showOnDocument: true,
        notes: `OCEAN FREIGHT charge - Container: ${containerSeleccionado.type} - Tarifa: ${containerSeleccionado.priceString} + 15%`
      },
      expense: {
        quantity: 1,
        unit: "CONTAINER",
        rate: oceanFreightRate,
        payment: "Prepaid",
        billApplyTo: "Other",
        billTo: {
          name: user?.username
        },
        currency: {
          abbr: rutaSeleccionada.currency
        },
        reference: "TEST-REF-OCEANFREIGHT",
        showOnDocument: true,
        notes: `OCEAN FREIGHT expense - Container: ${containerSeleccionado.type} - Tarifa: ${containerSeleccionado.priceString}`
      }
    });

    return {
      date: new Date().toISOString(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      transitDays: 5,
      customerReference: "TEST-REF-CLAUDE-FCL",
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
      commodities: [
        {
          commodityType: "Container",
          packageType: {
            id: containerSeleccionado.packageTypeId
          }
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
          <h2 className="mb-1">🚢 Cotizador FCL</h2>
          <p className="text-muted mb-0">Genera cotizaciones para envíos Full Container Load</p>
        </div>
      </div>

      {/* ============================================================================ */}
      {/* SECCIÓN 1: SELECCIÓN DE RUTA Y CONTENEDOR */}
      {/* ============================================================================ */}

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h5 className="card-title mb-4">📍 Paso 1: Selecciona Ruta y Contenedor</h5>

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

              {/* Filtro de Carriers */}
              {polSeleccionado && podSeleccionado && (
                <div className="border-top pt-3 mb-4">
                  <label className="form-label fw-semibold mb-2">Carriers</label>
                  <div className="d-flex flex-wrap gap-2">
                    {carriersDisponibles.map(carrier => (
                      <button
                        key={carrier}
                        type="button"
                        className={`btn btn-sm ${
                          carriersActivos.has(carrier)
                            ? 'btn-primary'
                            : 'btn-outline-secondary'
                        }`}
                        onClick={() => {
                          const newSet = new Set(carriersActivos);
                          if (newSet.has(carrier)) {
                            newSet.delete(carrier);
                          } else {
                            newSet.add(carrier);
                          }
                          setCarriersActivos(newSet);
                        }}
                      >
                        {carrier}
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
                        <div key={ruta.id} className="col-12">
                          <div className="card border">
                            <div className="card-body">
                              <div className="row align-items-center">
                                {/* Información de la Ruta */}
                                <div className="col-md-4">
                                  <h6 className="mb-2">
                                    <span className="badge bg-primary">{ruta.carrier}</span>
                                  </h6>
                                  {ruta.tt && (
                                    <p className="small mb-1">
                                      <strong>Transit Time:</strong> {ruta.tt}
                                    </p>
                                  )}
                                  {ruta.company && (
                                    <p className="small mb-0 text-muted">{ruta.company}</p>
                                  )}
                                </div>

                                {/* Botones de Contenedores */}
                                <div className="col-md-8">
                                  <div className="row g-2">
                                    {/* 20GP */}
                                    <div className="col-md-4">
                                      <button
                                        type="button"
                                        className={`btn w-100 ${
                                          rutaSeleccionada?.id === ruta.id && containerSeleccionado?.type === '20GP'
                                            ? 'btn-success'
                                            : 'btn-outline-primary'
                                        }`}
                                        onClick={() => handleSeleccionarContainer(ruta, '20GP')}
                                      >
                                        <div className="d-flex flex-column">
                                          <span className="fw-bold">20GP</span>
                                          <span className="small">{ruta.gp20}</span>
                                        </div>
                                      </button>
                                    </div>

                                    {/* 40HQ */}
                                    <div className="col-md-4">
                                      <button
                                        type="button"
                                        className={`btn w-100 ${
                                          rutaSeleccionada?.id === ruta.id && containerSeleccionado?.type === '40HQ'
                                            ? 'btn-success'
                                            : 'btn-outline-primary'
                                        }`}
                                        onClick={() => handleSeleccionarContainer(ruta, '40HQ')}
                                      >
                                        <div className="d-flex flex-column">
                                          <span className="fw-bold">40HQ</span>
                                          <span className="small">{ruta.hq40}</span>
                                        </div>
                                      </button>
                                    </div>

                                    {/* 40NOR */}
                                    <div className="col-md-4">
                                      <button
                                        type="button"
                                        className={`btn w-100 ${
                                          rutaSeleccionada?.id === ruta.id && containerSeleccionado?.type === '40NOR'
                                            ? 'btn-success'
                                            : ruta.nor40
                                            ? 'btn-outline-primary'
                                            : 'btn-outline-secondary'
                                        }`}
                                        onClick={() => handleSeleccionarContainer(ruta, '40NOR')}
                                        disabled={!ruta.nor40}
                                      >
                                        <div className="d-flex flex-column">
                                          <span className="fw-bold">40NOR</span>
                                          <span className="small">{ruta.nor40 || 'N/A'}</span>
                                        </div>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Información de selección */}
              {rutaSeleccionada && containerSeleccionado && (
                <div className="alert alert-success mt-4 mb-0">
                  <h6 className="alert-heading">✓ Selección Confirmada</h6>
                  <p className="mb-2">
                    <strong>Ruta:</strong> {rutaSeleccionada.pol} → {rutaSeleccionada.pod}
                  </p>
                  <p className="mb-2">
                    <strong>Carrier:</strong> {rutaSeleccionada.carrier}
                  </p>
                  <p className="mb-2">
                    <strong>Contenedor:</strong> {containerSeleccionado.type} ({CONTAINER_MAPPING[containerSeleccionado.type].name})
                  </p>
                  <p className="mb-0">
                    <strong>Tarifa:</strong> {containerSeleccionado.priceString}
                  </p>
                  
                  <div className="mt-3 pt-3 border-top">
                    <h6 className="mb-2">💰 Cargos a Generar</h6>
                    <div className="row g-2 small">
                      <div className="col-md-6">
                        <strong>BL:</strong> {rutaSeleccionada.currency} 60.00
                      </div>
                      <div className="col-md-6">
                        <strong>Handling:</strong> {rutaSeleccionada.currency} 45.00
                      </div>
                      <div className="col-md-6">
                        <strong>EXW Charges:</strong> {rutaSeleccionada.currency} 100.00
                      </div>
                      <div className="col-md-6">
                        <strong>Ocean Freight (Expense):</strong> {rutaSeleccionada.currency} {containerSeleccionado.price.toFixed(2)}
                      </div>
                      <div className="col-md-12">
                        <strong className="text-success">Ocean Freight (Income):</strong>{' '}
                        <span className="text-success fw-bold">
                          {rutaSeleccionada.currency} {(containerSeleccionado.price * 1.15).toFixed(2)}
                        </span>
                        {' '}(+15%)
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ============================================================================ */}
      {/* SECCIÓN 2: GENERAR COTIZACIÓN */}
      {/* ============================================================================ */}

      {rutaSeleccionada && containerSeleccionado && (
        <>
          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <h5 className="card-title mb-4">🚀 Paso 2: Generar Cotización</h5>

              <button
                onClick={testAPI}
                disabled={loading || !accessToken || !rutaSeleccionada || !containerSeleccionado}
                className="btn btn-lg btn-success w-100"
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Generando...
                  </>
                ) : (
                  <>✨ Generar Cotización FCL</>
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
      {/* SECCIÓN 3: RESULTADOS */}
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
              🎉 <strong>¡Perfecto!</strong> Cotización FCL creada exitosamente.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuoteFCL;