// @ts-nocheck
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from "../../auth/AuthContext";
import { packageTypeOptions } from './PackageTypes/PiecestypesAIR';
import * as XLSX from 'xlsx';
import Select from 'react-select';

interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

// ============================================================================
// TIPOS E INTERFACES PARA RUTAS AÉREAS
// ============================================================================

interface RutaAerea {
  id: string;
  origin: string;
  originNormalized: string;
  destination: string;
  destinationNormalized: string;
  
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
  priceForComparison: number;
  currency: 'USD' | 'EUR' | 'GBP';
}

interface SelectOption {
  value: string;
  label: string;
}

type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'CHF' | 'CLP' | 'SEK';

// ============================================================================
// FUNCIONES HELPER PARA RUTAS AÉREAS
// ============================================================================

const extractPrice = (priceStr: string | null): number => {
  if (!priceStr) return 0;
  const cleaned = priceStr.toString().replace(/[^\d,\.]/g, '');
  const normalized = cleaned.replace(',', '.');
  const price = parseFloat(normalized);
  return isNaN(price) ? 0 : price;
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

const getLowestPrice = (ruta: RutaAerea): { price: number; currency: Currency } => {
  const tarifas = [
    ruta.kg45,
    ruta.kg100,
    ruta.kg300,
    ruta.kg500,
    ruta.kg1000
  ];
  
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

const parseAEREO = (data: any[]): RutaAerea[] => {
  const rutas: RutaAerea[] = [];
  let idCounter = 1;

  for (let i = 2; i < data.length; i++) {
    const row: any = data[i];
    if (!row) continue;

    const origin = row[1];
    const destination = row[2];
    const kg45 = row[3];
    const kg100 = row[4];
    const kg300 = row[5];
    const kg500 = row[6];
    const kg1000 = row[7];
    const carrier = row[8];
    const frequency = row[9];
    const tt = row[10];
    const routing = row[11];
    const remark1 = row[12];
    const remark2 = row[13];

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
// FUNCIÓN PARA SELECCIONAR TARIFA SEGÚN PESO CHARGEABLE
// ============================================================================

interface TarifaSeleccionada {
  precio: number;
  moneda: Currency;
  rango: string;
  precioConMarkup: number;
}

const seleccionarTarifaPorPeso = (ruta: RutaAerea, pesoChargeable: number): TarifaSeleccionada | null => {
  // Definir los rangos en orden ascendente
  const rangos = [
    { limite: 45, tarifa: ruta.kg45, nombre: '45kg' },
    { limite: 100, tarifa: ruta.kg100, nombre: '100kg' },
    { limite: 300, tarifa: ruta.kg300, nombre: '300kg' },
    { limite: 500, tarifa: ruta.kg500, nombre: '500kg' },
    { limite: 1000, tarifa: ruta.kg1000, nombre: '1000kg' }
  ];

  // Encontrar el rango adecuado: el más alto que sea <= al peso chargeable
  let rangoSeleccionado = null;
  
  for (const rango of rangos) {
    if (rango.tarifa && pesoChargeable >= rango.limite) {
      rangoSeleccionado = rango;
    }
  }

  // Si el peso es menor que 45kg, usar kg45 si existe
  if (!rangoSeleccionado && pesoChargeable < 45 && rangos[0].tarifa) {
    rangoSeleccionado = rangos[0];
  }

  if (!rangoSeleccionado) {
    return null;
  }

  const precio = extractPrice(rangoSeleccionado.tarifa);
  const moneda = extractCurrency(rangoSeleccionado.tarifa);
  const precioConMarkup = precio * 1.15; // 15% adicional para income

  return {
    precio,
    moneda,
    rango: rangoSeleccionado.nombre,
    precioConMarkup
  };
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

function QuoteAPITester() {
  const { accessToken } = useOutletContext<OutletContext>();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Estados para validaciones
  const [weightError, setWeightError] = useState<string | null>(null);
  const [dimensionError, setDimensionError] = useState<string | null>(null);

  // Estados para el commodity
  const [overallDimsAndWeight, setOverallDimsAndWeight] = useState(false);
  const [pieces, setPieces] = useState(1);
  const [description, setDescription] = useState("Test Cargo - Claude Tester");
  const [length, setLength] = useState(100);
  const [width, setWidth] = useState(80);
  const [height, setHeight] = useState(60);
  const [weight, setWeight] = useState(50);
  const [manualVolume, setManualVolume] = useState(0.48);
  const [manualWeight, setManualWeight] = useState(100);
  const [selectedPackageType, setSelectedPackageType] = useState(97);

  // ============================================================================
  // ESTADOS PARA RUTAS AÉREAS
  // ============================================================================
  
  const [rutas, setRutas] = useState<RutaAerea[]>([]);
  const [loadingRutas, setLoadingRutas] = useState(true);
  const [errorRutas, setErrorRutas] = useState<string | null>(null);
  
  const [originSeleccionado, setOriginSeleccionado] = useState<SelectOption | null>(null);
  const [destinationSeleccionado, setDestinationSeleccionado] = useState<SelectOption | null>(null);
  const [rutaSeleccionada, setRutaSeleccionada] = useState<RutaAerea | null>(null);
  
  const [opcionesOrigin, setOpcionesOrigin] = useState<SelectOption[]>([]);
  const [opcionesDestination, setOpcionesDestination] = useState<SelectOption[]>([]);
  
  const [carriersActivos, setCarriersActivos] = useState<Set<string>>(new Set());
  const [monedasActivas, setMonedasActivas] = useState<Set<Currency>>(new Set(['USD', 'EUR', 'GBP', 'CAD', 'CHF', 'CLP', 'SEK']));
  const [carriersDisponibles, setCarriersDisponibles] = useState<string[]>([]);

  // ============================================================================
  // CARGA DE DATOS AEREO.XLSX
  // ============================================================================

  useEffect(() => {
    const cargarRutas = async () => {
      try {
        setLoadingRutas(true);
        const response = await fetch('/assets/AÉREO.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const rutasParsed = parseAEREO(data);
        setRutas(rutasParsed);

        // Extraer origins únicos
        const originsUnicos = Array.from(new Set(rutasParsed.map(r => r.origin)))
          .sort()
          .map(origin => ({
            value: normalize(origin),
            label: capitalize(origin)
          }));
        setOpcionesOrigin(originsUnicos);

        // Extraer carriers únicos
        const carriersUnicos = Array.from(
          new Set(
            rutasParsed
              .map(r => r.carrier)
              .filter(c => c !== null)
          )
        ).sort() as string[];
        setCarriersDisponibles(carriersUnicos);
        setCarriersActivos(new Set(carriersUnicos));

        setLoadingRutas(false);
      } catch (err) {
        console.error('Error al cargar AEREO.xlsx:', err);
        setErrorRutas('No se pudo cargar el archivo AEREO.xlsx');
        setLoadingRutas(false);
      }
    };

    cargarRutas();
  }, []);

  // ============================================================================
  // ACTUALIZAR DESTINATIONS CUANDO CAMBIA ORIGIN
  // ============================================================================

  useEffect(() => {
    if (originSeleccionado) {
      const destinationsParaOrigin = rutas
        .filter(r => r.originNormalized === originSeleccionado.value)
        .map(r => r.destination);
      
      const destinationsUnicos = Array.from(new Set(destinationsParaOrigin))
        .sort()
        .map(dest => ({
          value: normalize(dest),
          label: capitalize(dest)
        }));
      
      setOpcionesDestination(destinationsUnicos);
      setDestinationSeleccionado(null);
      setRutaSeleccionada(null);
    } else {
      setOpcionesDestination([]);
      setDestinationSeleccionado(null);
      setRutaSeleccionada(null);
    }
  }, [originSeleccionado, rutas]);

  // ============================================================================
  // FILTRAR RUTAS
  // ============================================================================

  const rutasFiltradas = rutas.filter(ruta => {
    if (!originSeleccionado || !destinationSeleccionado) return false;
    
    const matchOrigin = ruta.originNormalized === originSeleccionado.value;
    const matchDestination = ruta.destinationNormalized === destinationSeleccionado.value;
    
    const matchCarrier = !ruta.carrier || carriersActivos.has(ruta.carrier);
    const matchMoneda = monedasActivas.has(ruta.currency);
    
    return matchOrigin && matchDestination && matchCarrier && matchMoneda;
  }).sort((a, b) => a.priceForComparison - b.priceForComparison);

  // ============================================================================
  // CÁLCULOS AUTOMÁTICOS
  // ============================================================================

  const calculateVolume = () => {
    return (length * width * height) / 1000000;
  };

  const calculateVolumeWeight = () => {
    return calculateVolume() * 167;
  };

  const volume = calculateVolume();
  const volumeWeight = calculateVolumeWeight();
  const totalVolume = volume * pieces;
  const totalWeight = weight * pieces;
  const totalVolumeWeight = volumeWeight * pieces;

  // Cálculo del peso chargeable (para ambos modos)
  const getPesoChargeable = () => {
    if (overallDimsAndWeight) {
      // En modo Overall: comparar numéricamente peso vs volumen (sin conversión)
      return Math.max(manualWeight, manualVolume);
    } else {
      return Math.max(totalWeight, totalVolumeWeight);
    }
  };

  const pesoChargeable = getPesoChargeable();
  
  // Determinar si se cobra por peso o volumen en modo Overall
  const chargeableUnit = overallDimsAndWeight 
    ? (manualWeight >= manualVolume ? 'kg' : 'm³')
    : 'kg';

  // Calcular tarifa AIR FREIGHT si hay ruta seleccionada
  const tarifaAirFreight = rutaSeleccionada 
    ? seleccionarTarifaPorPeso(rutaSeleccionada, pesoChargeable)
    : null;

  // ============================================================================
  // FUNCIONES DE CÁLCULO EXISTENTES
  // ============================================================================

  const calculateEXWRate = (weightKg: number, volumeWeightKg: number) => {
    const chargeableWeight = Math.max(weightKg, volumeWeightKg);
    
    let ratePerKg = 0;
    
    if (chargeableWeight >= 1000) {
      ratePerKg = 0.6;
    } else if (chargeableWeight >= 500) {
      ratePerKg = 0.65;
    } else if (chargeableWeight >= 250) {
      ratePerKg = 0.75;
    } else {
      ratePerKg = 0.8;
    }
    
    const calculatedRate = chargeableWeight * ratePerKg;
    return Math.max(calculatedRate, 150);
  };

  const calculateAWBRate = (weightKg: number, volumeWeightKg: number) => {
    const chargeableWeight = Math.max(weightKg, volumeWeightKg);
    return chargeableWeight * 0.15;
  };

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
    if (!rutaSeleccionada || !tarifaAirFreight) {
      return null;
    }

    const charges = [];

    // MODO NORMAL
    if (!overallDimsAndWeight) {

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
            abbr: (rutaSeleccionada.currency || "USD") as any
          },
          reference: "TEST-REF-HANDLING",
          showOnDocument: true,
          notes: "Handling charge created via API"
        },
        expense: {
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any
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
          rate: calculateEXWRate(totalWeight, totalVolumeWeight),
          payment: "Prepaid",
          billApplyTo: "Other",
          billTo: {
            name: user?.username
          },
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any
          },
          reference: "TEST-REF-EXW",
          showOnDocument: true,
          notes: "EXW charge created via API"
        },
        expense: {
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any
          }
        }
      });

      // Cobro de AWB
      charges.push({
        service: {
          id: 335,
          code: "AWB"
        },
        income: {
          quantity: 1,
          unit: "AWB",
          rate: 30,
          payment: "Prepaid",
          billApplyTo: "Other",
          billTo: {
            name: user?.username
          },
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any
          },
          reference: "TEST-REF-AWB",
          showOnDocument: true,
          notes: "AWB charge created via API"
        },
        expense: {
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any
          }
        }
      });

      // Cobro de AIR FREIGHT - NUEVO
      charges.push({
        service: {
          id: 4,
          code: "AF"
        },
        income: {
          quantity: pesoChargeable,
          unit: "AIR FREIGHT",
          rate: tarifaAirFreight.precioConMarkup,
          payment: "Prepaid",
          billApplyTo: "Other",
          billTo: {
            name: user?.username
          },
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any
          },
          reference: "TEST-REF-AIRFREIGHT",
          showOnDocument: true,
          notes: `AIR FREIGHT charge - Tarifa: ${tarifaAirFreight.moneda} ${tarifaAirFreight.precio.toFixed(2)}/kg + 15%`
        },
        expense: {
          quantity: pesoChargeable,
          unit: "AIR FREIGHT",
          rate: tarifaAirFreight.precio,
          payment: "Prepaid",
          billApplyTo: "Other",
          billTo: {
            name: user?.username
          },
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any
          },
          reference: "TEST-REF-AIRFREIGHT",
          showOnDocument: true,
          notes: `AIR FREIGHT expense - Tarifa: ${tarifaAirFreight.moneda} ${tarifaAirFreight.precio.toFixed(2)}/kg`
        }
      });

      return {
        date: new Date().toISOString(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        transitDays: 5,
        customerReference: "TEST-REF-CLAUDE",
        contact: {
          name: user?.username
        },
        origin: {
          name: rutaSeleccionada.origin
        },
        destination: {
          name: rutaSeleccionada.destination
        },
        modeOfTransportation: {
          id: 8
        },
        rateCategoryId: 2,
        portOfReceipt: {
          name: rutaSeleccionada.origin
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
            totalVolumeUOM: "m3",
            volumeWeightValue: volumeWeight,
            volumeWeightUOM: "kg",
            totalVolumeWeightValue: totalVolumeWeight,
            totalVolumeWeightUOM: "kg"
          }
        ],
        charges
      };
    } 
    // MODO OVERALL
    else {
      // En modo Overall: el chargeable es el mayor numéricamente entre peso y volumen

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
            abbr: (rutaSeleccionada.currency || "USD") as any
          },
          reference: "TEST-REF-HANDLING-OVERALL",
          showOnDocument: true,
          notes: "Handling charge created via API (Overall mode)"
        },
        expense: {
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any
          }
        }
      });

      // Cobro de EXW - Usar peso real y volumen sin conversións
      charges.push({
        service: {
          id: 271,
          code: "EC"
        },
        income: {
          quantity: 1,
          unit: "EXW CHARGES",
          rate: calculateEXWRate(manualWeight, manualVolume),
          payment: "Prepaid",
          billApplyTo: "Other",
          billTo: {
            name: user?.username
          },
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any
          },
          reference: "TEST-REF-EXW-OVERALL",
          showOnDocument: true,
          notes: "EXW charge created via API (Overall mode)"
        },
        expense: {
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any
          }
        }
      });

      // Cobro de AWB - Usar peso real y volumen sin conversión
      charges.push({
        service: {
          id: 335,
          code: "AWB"
        },
        income: {
          quantity: 1,
          unit: "AWB",
          rate: 30,
          payment: "Prepaid",
          billApplyTo: "Other",
          billTo: {
            name: user?.username
          },
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any
          },
          reference: "TEST-REF-AWB-OVERALL",
          showOnDocument: true,
          notes: "AWB charge created via API (Overall mode)"
        },
        expense: {
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any
          }
        }
      });

      // Cobro de AIR FREIGHT - NUEVO
      charges.push({
        service: {
          id: 4,
          code: "AF"
        },
        income: {
          quantity: pesoChargeable,
          unit: chargeableUnit === 'kg' ? "AIR FREIGHT" : "AIR FREIGHT (CBM)",
          rate: tarifaAirFreight.precioConMarkup,
          payment: "Prepaid",
          billApplyTo: "Other",
          billTo: {
            name: user?.username
          },
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any
          },
          reference: "TEST-REF-AIRFREIGHT-OVERALL",
          showOnDocument: true,
          notes: `AIR FREIGHT charge (Overall) - Tarifa: ${tarifaAirFreight.moneda} ${tarifaAirFreight.precio.toFixed(2)}/${chargeableUnit} + 15% - Cobrado por ${chargeableUnit === 'kg' ? 'peso' : 'volumen'}`
        },
        expense: {
          quantity: pesoChargeable,
          unit: chargeableUnit === 'kg' ? "AIR FREIGHT" : "AIR FREIGHT (CBM)",
          rate: tarifaAirFreight.precio,
          payment: "Prepaid",
          billApplyTo: "Other",
          billTo: {
            name: user?.username
          },
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any
          },
          reference: "TEST-REF-AIRFREIGHT-OVERALL",
          showOnDocument: true,
          notes: `AIR FREIGHT expense (Overall) - Tarifa: ${tarifaAirFreight.moneda} ${tarifaAirFreight.precio.toFixed(2)}/${chargeableUnit} - Cobrado por ${chargeableUnit === 'kg' ? 'peso' : 'volumen'}`
        }
      });

      return {
        date: new Date().toISOString(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        transitDays: 5,
        customerReference: "TEST-REF-CLAUDE-OVERALL",
        contact: {
          name: user?.username
        },
        origin: {
          name: rutaSeleccionada.origin
        },
        destination: {
          name: rutaSeleccionada.destination
        },
        modeOfTransportation: {
          id: 1
        },
        rateCategoryId: 2,
        portOfReceipt: {
          name: rutaSeleccionada.origin
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
            commodityType: "Standard",
            packageType: {
              id: selectedPackageType
            },
            pieces: pieces,
            description: description,
            overallDimsAndWeight: true,
            totalWeightValue: manualWeight,
            totalWeightUOM: "kg",
            totalVolumeValue: manualVolume,
            totalVolumeUOM: "m3"
          }
        ],
        charges
      };
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col">
          <h2 className="mb-1">✈️ Cotizador Aéreo</h2>
          <p className="text-muted mb-0">Genera cotizaciones para envíos aéreos</p>
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
              {/* Selectores de Origen y Destino */}
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Origen</label>
                  <Select
                    value={originSeleccionado}
                    onChange={setOriginSeleccionado}
                    options={opcionesOrigin}
                    placeholder="Selecciona origen..."
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
                  <label className="form-label fw-semibold">Destino</label>
                  <Select
                    value={destinationSeleccionado}
                    onChange={setDestinationSeleccionado}
                    options={opcionesDestination}
                    placeholder={originSeleccionado ? "Selecciona destino..." : "Primero selecciona origen"}
                    isClearable
                    isDisabled={!originSeleccionado}
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

              {/* Filtros de Carriers y Monedas */}
              {originSeleccionado && destinationSeleccionado && (
                <div className="border-top pt-3">
                  <div className="row g-3">
                    {/* Filtro de Carriers */}
                    <div className="col-md-6">
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

                    {/* Filtro de Monedas */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold mb-2">Monedas</label>
                      <div className="d-flex flex-wrap gap-2">
                        {(['USD', 'EUR', 'GBP', 'CAD', 'CHF', 'CLP', 'SEK'] as Currency[]).map(moneda => (
                          <button
                            key={moneda}
                            type="button"
                            className={`btn btn-sm ${
                              monedasActivas.has(moneda)
                                ? 'btn-success'
                                : 'btn-outline-secondary'
                            }`}
                            onClick={() => {
                              const newSet = new Set(monedasActivas);
                              if (newSet.has(moneda)) {
                                newSet.delete(moneda);
                              } else {
                                newSet.add(moneda);
                              }
                              setMonedasActivas(newSet);
                            }}
                          >
                            {moneda}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Rutas Disponibles */}
              {originSeleccionado && destinationSeleccionado && (
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
                                ? 'border-primary border-2 shadow' 
                                : 'border'
                            }`}
                            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                            onClick={() => setRutaSeleccionada(ruta)}
                          >
                            <div className="card-body">
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <span className="badge bg-primary">
                                  {ruta.carrier || 'Por Confirmar'}
                                </span>
                                {rutaSeleccionada?.id === ruta.id && (
                                  <span className="badge bg-success">✓ Seleccionada</span>
                                )}
                              </div>

                              <div className="mb-3">
                                <small className="text-muted d-block mb-1">Precio desde:</small>
                                <h5 className="mb-0 text-primary">
                                  {ruta.currency} {ruta.priceForComparison.toFixed(2)}
                                  <small className="text-muted">/kg</small>
                                </h5>
                              </div>

                              {ruta.transitTime && (
                                <p className="small mb-2">
                                  <strong>Tiempo:</strong> {ruta.transitTime}
                                </p>
                              )}

                              {ruta.frequency && (
                                <p className="small mb-0">
                                  <strong>Frecuencia:</strong> {ruta.frequency}
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
                    <strong>Origen:</strong> {rutaSeleccionada.origin} →{' '}
                    <strong>Destino:</strong> {rutaSeleccionada.destination}
                  </p>
                  <p className="mb-2">
                    <strong>Carrier:</strong> {rutaSeleccionada.carrier || 'Por Confirmar'}
                  </p>
                  
                  <div className="mt-3">
                    <strong className="d-block mb-2">Tarifas disponibles:</strong>
                    <div className="d-flex flex-wrap gap-2">
                      {rutaSeleccionada.kg45 && (
                        <span className="badge bg-light text-dark border">
                          45kg: {rutaSeleccionada.kg45}
                        </span>
                      )}
                      {rutaSeleccionada.kg100 && (
                        <span className="badge bg-light text-dark border">
                          100kg: {rutaSeleccionada.kg100}
                        </span>
                      )}
                      {rutaSeleccionada.kg300 && (
                        <span className="badge bg-light text-dark border">
                          300kg: {rutaSeleccionada.kg300}
                        </span>
                      )}
                      {rutaSeleccionada.kg500 && (
                        <span className="badge bg-light text-dark border">
                          500kg: {rutaSeleccionada.kg500}
                        </span>
                      )}
                      {rutaSeleccionada.kg1000 && (
                        <span className="badge bg-light text-dark border">
                          1000kg: {rutaSeleccionada.kg1000}
                        </span>
                      )}
                    </div>
                  </div>
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

            {/* Switch Overall */}
            <div className="form-check form-switch mb-4">
              <input
                className="form-check-input"
                type="checkbox"
                id="overallSwitch"
                checked={overallDimsAndWeight}
                onChange={(e) => setOverallDimsAndWeight(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="overallSwitch">
                <strong>Overall Dims and Weight</strong>
                <small className="d-block text-muted">
                  Activa esta opción si deseas ingresar el peso y volumen total manualmente
                </small>
              </label>
            </div>

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
                      {opt.code} - {opt.name}
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
                />
              </div>

              <div className="col-12">
                <label className="form-label">Descripción</label>
                <input
                  type="text"
                  className="form-control"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Modo Normal */}
              {!overallDimsAndWeight && (
                <>
                  <div className="col-md-3">
                    <label className="form-label">Largo (cm)</label>
                    <input
                      type="number"
                      className={`form-control ${dimensionError && dimensionError.includes('Largo') ? 'is-invalid' : ''}`}
                      value={length}
                      onChange={(e) => {
                        const newLength = Number(e.target.value);
                        setLength(newLength);
                        if (newLength > 290) {
                          setDimensionError('El largo no puede exceder 290 cm');
                        } else if (width > 290 || height > 160) {
                          // Mantener error si hay otros problemas
                        } else {
                          setDimensionError(null);
                        }
                      }}
                      min="0"
                      step="0.01"
                    />
                    {dimensionError && dimensionError.includes('largo') && (
                      <div className="invalid-feedback">{dimensionError}</div>
                    )}
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Ancho (cm)</label>
                    <input
                      type="number"
                      className={`form-control ${dimensionError && dimensionError.includes('Ancho') ? 'is-invalid' : ''}`}
                      value={width}
                      onChange={(e) => {
                        const newWidth = Number(e.target.value);
                        setWidth(newWidth);
                        if (newWidth > 290) {
                          setDimensionError('El ancho no puede exceder 290 cm');
                        } else if (length > 290 || height > 160) {
                          // Mantener error si hay otros problemas
                        } else {
                          setDimensionError(null);
                        }
                      }}
                      min="0"
                      step="0.01"
                    />
                    {dimensionError && dimensionError.includes('ancho') && (
                      <div className="invalid-feedback">{dimensionError}</div>
                    )}
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Alto (cm)</label>
                    <input
                      type="number"
                      className={`form-control ${dimensionError && dimensionError.includes('Alto') ? 'is-invalid' : ''}`}
                      value={height}
                      onChange={(e) => {
                        const newHeight = Number(e.target.value);
                        setHeight(newHeight);
                        if (newHeight > 160) {
                          setDimensionError('El alto no puede exceder 160 cm');
                        } else if (length > 290 || width > 290) {
                          // Mantener error si hay otros problemas
                        } else {
                          setDimensionError(null);
                        }
                      }}
                      min="0"
                      step="0.01"
                    />
                    {dimensionError && dimensionError.includes('alto') && (
                      <div className="invalid-feedback">{dimensionError}</div>
                    )}
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Peso por pieza (kg)</label>
                    <input
                      type="number"
                      className={`form-control ${weightError ? 'is-invalid' : ''}`}
                      value={weight}
                      onChange={(e) => {
                        const newWeight = Number(e.target.value);
                        setWeight(newWeight);
                        const newTotalWeight = newWeight * pieces;
                        if (newTotalWeight > 2000) {
                          setWeightError('El peso total no puede exceder 2000 kg');
                        } else {
                          setWeightError(null);
                        }
                      }}
                      min="0"
                      step="0.01"
                    />
                    {weightError && <div className="invalid-feedback">{weightError}</div>}
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
                      className={`form-control ${weightError ? 'is-invalid' : ''}`}
                      value={manualWeight}
                      onChange={(e) => {
                        const newManualWeight = Number(e.target.value);
                        setManualWeight(newManualWeight);
                        if (newManualWeight > 2000) {
                          setWeightError('El peso total no puede exceder 2000 kg');
                        } else {
                          setWeightError(null);
                        }
                      }}
                      min="0"
                      step="0.01"
                    />
                    <small className="text-muted">Este es el peso total de todas las piezas</small>
                    {weightError && <div className="invalid-feedback">{weightError}</div>}
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
                    <small className="text-muted">Este es el volumen total de todas las piezas</small>
                  </div>
                </>
              )}
            </div>

            {/* Cálculos Automáticos */}
            <div className="mt-4 p-3 border rounded bg-light">
              <h6 className="mb-3">🧮 Cálculos {overallDimsAndWeight ? '(Modo Overall)' : '(Modo Normal)'}</h6>
              <div className="row g-3">
                {!overallDimsAndWeight ? (
                  <>
                    <div className="col-md-6">
                      <strong>Volumen por pieza:</strong> {volume.toFixed(4)} m³
                    </div>
                    <div className="col-md-6">
                      <strong>Peso volumétrico por pieza:</strong> {volumeWeight.toFixed(2)} kg
                    </div>
                    <div className="col-md-6">
                      <strong>Volumen total:</strong> {totalVolume.toFixed(4)} m³
                    </div>
                    <div className="col-md-6">
                      <strong>Peso total:</strong> {totalWeight.toFixed(2)} kg
                    </div>
                    <div className="col-md-6">
                      <strong>Peso volumétrico total:</strong> {totalVolumeWeight.toFixed(2)} kg
                    </div>
                    <div className="col-md-6">
                      <strong className="text-primary">Peso Chargeable:</strong>{' '}
                      <span className="text-primary fw-bold">{pesoChargeable.toFixed(2)} kg</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="col-md-6">
                      <strong>Volumen total:</strong> {manualVolume.toFixed(4)} m³
                    </div>
                    <div className="col-md-6">
                      <strong>Peso total:</strong> {manualWeight.toFixed(2)} kg
                    </div>
                    <div className="col-12">
                      <strong className="text-primary">Chargeable:</strong>{' '}
                      <span className="text-primary fw-bold">
                        {pesoChargeable.toFixed(2)} {chargeableUnit}
                      </span>
                      <small className="text-muted d-block mt-1">
                        (Se cobra por el mayor numéricamente: {manualWeight.toFixed(2)} kg vs {manualVolume.toFixed(2)} m³)
                      </small>
                    </div>
                  </>
                )}
              </div>

              {/* Tarifa AIR FREIGHT calculada */}
              {tarifaAirFreight && (
                <div className="mt-3 pt-3 border-top">
                  <h6 className="mb-2 text-success">✈️ Tarifa AIR FREIGHT</h6>
                  <div className="row g-2">
                    <div className="col-md-6">
                      <strong>Rango aplicable:</strong> {tarifaAirFreight.rango}
                    </div>
                    <div className="col-md-6">
                      <strong>Tarifa base:</strong>{' '}
                      <span className="text-success">
                        {tarifaAirFreight.moneda} {tarifaAirFreight.precio.toFixed(2)}/kg
                      </span>
                    </div>
                    <div className="col-md-6">
                      <strong>Expense (tarifa × peso):</strong>{' '}
                      <span className="text-info">
                        {rutaSeleccionada.currency} {(tarifaAirFreight.precio * pesoChargeable).toFixed(2)}
                      </span>
                    </div>
                    <div className="col-md-6">
                      <strong>Income (tarifa + 15% × peso):</strong>{' '}
                      <span className="text-success fw-bold">
                        {rutaSeleccionada.currency} {(tarifaAirFreight.precioConMarkup * pesoChargeable).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={testAPI}
              disabled={loading || !accessToken || weightError !== null || dimensionError !== null || !rutaSeleccionada}
              className="btn btn-lg btn-success w-100 mt-4"
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Generando...
                </>
              ) : (
                <>✨ Generar Cotización</>
              )}
            </button>

            {(weightError || dimensionError) && (
              <div className="alert alert-warning mt-3 mb-0">
                ⚠️ <strong>Corrección necesaria:</strong> {weightError || dimensionError}
              </div>
            )}

            {!rutaSeleccionada && (
              <div className="alert alert-info mt-3 mb-0">
                ℹ️ Debes seleccionar una ruta antes de generar la cotización
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* SECCIÓN 3: PAYLOAD Y RESULTADOS */}
      {/* ============================================================================ */}

      {/* Payload */}
      {rutaSeleccionada && (
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
      )}

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
              🎉 <strong>¡Perfecto!</strong> Cotización creada exitosamente.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuoteAPITester;