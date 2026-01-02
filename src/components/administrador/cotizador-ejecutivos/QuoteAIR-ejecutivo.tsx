// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from "../../../auth/AuthContext";
import { packageTypeOptions } from '../../quotes/PackageTypes/PiecestypesAIR';
import * as XLSX from 'xlsx';
import Select from 'react-select';
import { Modal, Button } from 'react-bootstrap';

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

// ✅ NUEVO: Interface para clientes asignados
interface ClienteAsignado {
  id: string;
  email: string;
  username: string;
  nombreuser: string;
  createdAt: string;
}

function QuoteAIR() {
  const { accessToken } = useOutletContext<OutletContext>();
  const { user, getMisClientes } = useAuth();
  const ejecutivo = user?.ejecutivo;
  
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Estados para validaciones
  const [weightError, setWeightError] = useState<string | null>(null);
  const [dimensionError, setDimensionError] = useState<string | null>(null);

  // Estados para el commodity
  const [overallDimsAndWeight, setOverallDimsAndWeight] = useState(false);
  const [pieces, setPieces] = useState(1);
  const [description, setDescription] = useState("Cargamento Aéreo");
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
  
  // Estado para modal de precio 0
  const [showPriceZeroModal, setShowPriceZeroModal] = useState(false);

  // ✅ NUEVO: Estados para selección de cliente
  const [clientesAsignados, setClientesAsignados] = useState<ClienteAsignado[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteAsignado | null>(null);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [errorClientes, setErrorClientes] = useState<string | null>(null);

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

  // ✅ NUEVO: Cargar clientes asignados al ejecutivo
  useEffect(() => {
    const cargarClientes = async () => {
      if (user?.username !== 'Administrador') {
        setLoadingClientes(false);
        return;
      }

      try {
        setLoadingClientes(true);
        const clientes = await getMisClientes();
        setClientesAsignados(clientes);
        
        if (clientes.length === 1) {
          setClienteSeleccionado(clientes[0]);
        }
      } catch (err) {
        console.error('Error cargando clientes:', err);
        setErrorClientes(err instanceof Error ? err.message : 'Error al cargar clientes');
      } finally {
        setLoadingClientes(false);
      }
    };

    cargarClientes();
  }, [user, getMisClientes]);

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
      const pesoVolumetricoOverall = manualVolume * 167;
      return Math.max(manualWeight, pesoVolumetricoOverall);
    } else {
      return Math.max(totalWeight, totalVolumeWeight);
    }
  };

  const pesoChargeable = getPesoChargeable();
  
  // Calcular peso volumétrico para determinar la unidad de cobro en modo Overall
  const pesoVolumetricoOverall = overallDimsAndWeight ? manualVolume * 167 : 0;
  
  // Determinar si se cobra por peso o volumen en modo Overall
  const chargeableUnit = overallDimsAndWeight 
    ? (manualWeight >= pesoVolumetricoOverall ? 'kg' : 'kg')
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
          amount: 45,
          showamount: 45,
          payment: "Prepaid",
          billApplyTo: "Other",
          billTo: {
            name: clienteSeleccionado?.username || user?.username
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
          amount: calculateEXWRate(totalWeight, totalVolumeWeight),
          showamount: calculateEXWRate(totalWeight, totalVolumeWeight),
          payment: "Prepaid",
          billApplyTo: "Other",
          billTo: {
            name: clienteSeleccionado?.username || user?.username
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
          amount: 30,
          showamount: 30,
          payment: "Prepaid",
          billApplyTo: "Other",
          billTo: {
            name: clienteSeleccionado?.username || user?.username
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

      // Cobro de AIR FREIGHT
      charges.push({
        service: {
          id: 4,
          code: "AF"
        },
        income: {
          quantity: pesoChargeable,
          unit: "AIR FREIGHT",
          rate: tarifaAirFreight.precioConMarkup,
          amount: pesoChargeable * tarifaAirFreight.precioConMarkup,
          showamount: pesoChargeable * tarifaAirFreight.precioConMarkup,
          payment: "Prepaid",
          billApplyTo: "Other",
          billTo: {
            name: clienteSeleccionado?.username || user?.username
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
          amount: pesoChargeable * tarifaAirFreight.precio,
          showamount: pesoChargeable * tarifaAirFreight.precio,
          payment: "Prepaid",
          billApplyTo: "Other",
          billTo: {
            name: clienteSeleccionado?.username || user?.username
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
        customerReference: "Portal Created [AIR]",
        contact: {
          name: clienteSeleccionado?.username || user?.username
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
          name: clienteSeleccionado?.username || user?.username
        },
        consignee: {
          name: clienteSeleccionado?.username || user?.username
        },
        issuingCompany: {
          name: rutaSeleccionada?.carrier || "Por Confirmar"
        },
        serviceType: {
          name: "Overall Dims & Weight"
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
          amount: 45,
          showamount: 45,
          payment: "Prepaid",
          billApplyTo: "Other",
          billTo: {
            name: clienteSeleccionado?.username || user?.username
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
          amount: calculateEXWRate(manualWeight, manualVolume),
          showamount: calculateEXWRate(manualWeight, manualVolume),
          payment: "Prepaid",
          billApplyTo: "Other",
          billTo: {
            name: clienteSeleccionado?.username || user?.username
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
          amount: 30,
          showamount: 30,
          payment: "Prepaid",
          billApplyTo: "Other",
          billTo: {
            name: clienteSeleccionado?.username || user?.username
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
          amount: pesoChargeable * tarifaAirFreight.precioConMarkup,
          showamount: pesoChargeable * tarifaAirFreight.precioConMarkup,
          payment: "Prepaid",
          billApplyTo: "Other",
          billTo: {
            name: clienteSeleccionado?.username || user?.username
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
          amount: pesoChargeable * tarifaAirFreight.precio,
          showamount: pesoChargeable * tarifaAirFreight.precio,
          payment: "Prepaid",
          billApplyTo: "Other",
          billTo: {
            name: clienteSeleccionado?.username || user?.username
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
        customerReference: "Portal-Created [AIR-OVERALL]",
        contact: {
          name: clienteSeleccionado?.username || user?.username
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
          name: clienteSeleccionado?.username || user?.username
        },
        consignee: {
          name: clienteSeleccionado?.username || user?.username
        },
        issuingCompany: {
          name: rutaSeleccionada?.carrier || "Por Confirmar"
        },
        serviceType: {
          name: "Overall Dims & Weight"
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

  // Primero: Rutas SOLO filtradas por origen y destino (sin carriers ni monedas)
  const rutasPorOrigenDestino = useMemo(() => {
    if (!originSeleccionado || !destinationSeleccionado) return [];
    
    return rutas.filter(ruta => {
      const matchOrigin = ruta.originNormalized === originSeleccionado.value;
      const matchDestination = ruta.destinationNormalized === destinationSeleccionado.value;
      return matchOrigin && matchDestination;
    });
  }, [rutas, originSeleccionado, destinationSeleccionado]);

  // Extraer TODOS los carriers disponibles para origen-destino
  const carriersDisponiblesEnRutas = useMemo(() => {
    const carriers = new Set<string>();
    rutasPorOrigenDestino.forEach(ruta => {
      if (ruta.carrier) {
        carriers.add(ruta.carrier);
      }
    });
    return Array.from(carriers).sort();
  }, [rutasPorOrigenDestino]);

  // Extraer TODAS las monedas disponibles para origen-destino
  const monedasDisponiblesEnRutas = useMemo(() => {
    const monedas = new Set<Currency>();
    rutasPorOrigenDestino.forEach(ruta => {
      if (ruta.currency) {
        monedas.add(ruta.currency as Currency);
      }
    });
    return Array.from(monedas).sort();
  }, [rutasPorOrigenDestino]);

  // Función para encontrar el índice de la ruta con menor tiempo de tránsito
  const fastestRouteIndex = useMemo(() => {
    let fastestIndex = -1;
    let minDays = Infinity;

    rutasFiltradas.forEach((ruta, index) => {  // ✅ CORRECTO
      if (ruta.transitTime) {
        // Extraer los días del string (ej: "15-20 días" -> toma 15)
        const match = ruta.transitTime.match(/(\d+)/);
        if (match) {
          const days = parseInt(match[1]);
          if (days < minDays) {
            minDays = days;
            fastestIndex = index;
          }
        }
      }
    });

    return fastestIndex;
  }, [rutasFiltradas]);  // ✅ CORRECTO

  // Función para encontrar el índice de la ruta con menor precio (excluyendo precio 0)
  const bestPriceRouteIndex = useMemo(() => {
    let bestIndex = -1;
    let minPrice = Infinity;

    rutasFiltradas.forEach((ruta, index) => {
      // Solo considerar rutas con precio mayor a 0
      if (ruta.priceForComparison > 0 && ruta.priceForComparison < minPrice) {
        minPrice = ruta.priceForComparison;
        bestIndex = index;
      }
    });

    return bestIndex;
  }, [rutasFiltradas]);

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
      {/* SELECTOR DE CLIENTE (Solo para ejecutivos) */}
      {/* ============================================================================ */}
      
      {user?.username === 'Administrador' && (
        <div className="card shadow-sm mb-4" style={{
          borderLeft: '4px solid #0d6efd',
          background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)'
        }}>
          <div className="card-body">
            <h5 className="card-title mb-3">
              <svg width="20" height="20" fill="currentColor" className="me-2" viewBox="0 0 16 16">
                <path d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm.256 7a4.474 4.474 0 0 1-.229-1.004H3c.001-.246.154-.986.832-1.664C4.484 10.68 5.711 10 8 10c.26 0 .507.009.74.025.226-.341.496-.65.804-.918C9.077 9.038 8.564 9 8 9c-5 0-6 3-6 4s1 1 1 1h5.256Z"/>
              </svg>
              Seleccionar Cliente
            </h5>

            {loadingClientes ? (
              <div className="text-center py-3">
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                  <span className="visually-hidden">Cargando clientes...</span>
                </div>
                <span className="ms-2 text-muted">Cargando clientes asignados...</span>
              </div>
            ) : errorClientes ? (
              <div className="alert alert-danger mb-0">
                <strong>Error:</strong> {errorClientes}
              </div>
            ) : clientesAsignados.length === 0 ? (
              <div className="alert alert-warning mb-0">
                <strong>⚠️ Sin clientes asignados</strong>
                <p className="mb-0 mt-2 small">No tienes clientes asignados. Contacta al administrador.</p>
              </div>
            ) : (
              <div className="row g-3">
                <div className="col-md-8">
                  <label className="form-label fw-semibold">
                    Cliente para esta cotización <span className="text-danger">*</span>
                  </label>
                  <Select
                    value={clienteSeleccionado ? {
                      value: clienteSeleccionado.id,
                      label: `${clienteSeleccionado.username} (${clienteSeleccionado.email})`
                    } : null}
                    onChange={(option) => {
                      const cliente = clientesAsignados.find(c => c.id === option?.value);
                      setClienteSeleccionado(cliente || null);
                    }}
                    options={clientesAsignados.map(c => ({
                      value: c.id,
                      label: `${c.username} (${c.email})`
                    }))}
                    placeholder="Selecciona un cliente..."
                    isClearable={false}
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        borderColor: clienteSeleccionado ? '#198754' : (state.isFocused ? '#0d6efd' : '#dee2e6'),
                        boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none',
                        '&:hover': { borderColor: '#0d6efd' }
                      }),
                      option: (base, state) => ({
                        ...base,
                        backgroundColor: state.isSelected ? '#0d6efd' : (state.isFocused ? '#e7f1ff' : 'white'),
                        color: state.isSelected ? 'white' : '#212529'
                      })
                    }}
                  />
                  {!clienteSeleccionado && (
                    <small className="text-danger d-block mt-1">
                      ⚠️ Debes seleccionar un cliente antes de generar la cotización
                    </small>
                  )}
                </div>
                
                {clienteSeleccionado && (
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Cliente Seleccionado</label>
                    <div className="p-3 bg-success bg-opacity-10 border border-success rounded">
                      <div className="d-flex align-items-center">
                        <svg width="24" height="24" fill="#198754" className="me-2" viewBox="0 0 16 16">
                          <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
                        </svg>
                        <div>
                          <div className="fw-semibold text-success">{clienteSeleccionado.username}</div>
                          <small className="text-muted">{clienteSeleccionado.email}</small>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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
                      <label className="form-label fw-semibold mb-2">Carriers Disponibles</label>
                      <div className="d-flex flex-wrap gap-2">
                        {carriersDisponiblesEnRutas.map(carrier => (
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
                        {monedasDisponiblesEnRutas.map(moneda => (
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
                  {/* Header mejorado */}
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0 d-flex align-items-center gap-2">
                      <i className="bi bi-airplane"></i>
                      Rutas Disponibles 
                      <span className="badge bg-light text-dark border">{rutasFiltradas.length}</span>
                    </h6>
                    
                    {rutasFiltradas.length > 0 && (
                      <small className="text-muted">
                        Selecciona la mejor opción para tu envío
                      </small>
                    )}
                  </div>

                  {rutasFiltradas.length === 0 ? (
                    <div className="alert alert-light border-0 shadow-sm">
                      <div className="d-flex align-items-center gap-3">
                        <i className="bi bi-search text-muted fs-3"></i>
                        <div>
                          <p className="mb-1 fw-semibold">No se encontraron rutas</p>
                          <small className="text-muted">
                            Intenta ajustar los filtros o seleccionar otras ubicaciones
                          </small>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="row g-3">
                      {rutasFiltradas.map((ruta, index) => (
                        <div key={ruta.id} className="col-md-6 col-lg-4">
                          <div 
                            className={`card h-100 position-relative ${
                              rutaSeleccionada?.id === ruta.id 
                                ? 'border-primary border-2 shadow-lg' 
                                : 'border-0 shadow-sm'
                            }`}
                            style={{ 
                              cursor: 'pointer', 
                              transition: 'all 0.3s ease',
                              transform: rutaSeleccionada?.id === ruta.id ? 'translateY(-4px)' : 'none'
                            }}
                            onClick={() => {
                              // Verificar si la ruta tiene precio 0
                              if (ruta.priceForComparison === 0) {
                                setShowPriceZeroModal(true);
                                return;
                              }
                              setRutaSeleccionada(ruta);
                            }}
                            onMouseEnter={(e) => {
                              if (rutaSeleccionada?.id !== ruta.id) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.classList.add('shadow');
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (rutaSeleccionada?.id !== ruta.id) {
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.classList.remove('shadow');
                              }
                            }}
                          >
                            {/* Badge de "Mejor Opción" para la ruta más barata (excluyendo precio 0) */}
                            {index === bestPriceRouteIndex && (
                              <div 
                                className="position-absolute top-0 end-0 badge bg-warning text-dark"
                                style={{ 
                                  borderTopRightRadius: '0.375rem',
                                  borderBottomLeftRadius: '0.375rem',
                                  fontSize: '0.7rem'
                                }}
                              >
                                <i className="bi bi-star-fill"></i> Mejor Opción
                              </div>
                            )}

                            {/* Badge de "Menor tiempo" para la ruta más rápida */}
                            {index === fastestRouteIndex && index !== 0 && (
                              <div 
                                className="position-absolute badge bg-success text-white"
                                style={{ 
                                  top: '0',
                                  right: '0',
                                  borderTopRightRadius: '0.375rem',
                                  borderBottomLeftRadius: '0.375rem',
                                  fontSize: '0.7rem'
                                }}
                              >
                                <i className="bi bi-lightning-fill"></i> Menor tiempo
                              </div>
                            )}

                            {/* Si la ruta es tanto la mejor opción como la más rápida */}
                            {index === 0 && index === fastestRouteIndex && (
                              <div 
                                className="position-absolute badge bg-success text-white"
                                style={{ 
                                  top: '2rem',
                                  right: '0',
                                  borderTopRightRadius: '0.375rem',
                                  borderBottomLeftRadius: '0.375rem',
                                  fontSize: '0.7rem'
                                }}
                              >
                                <i className="bi bi-lightning-fill"></i> Menor tiempo
                              </div>
                            )}

                            <div className="card-body">
                              {/* Header del carrier con logo */}
                              <div className="d-flex justify-content-between align-items-start mb-3">
                                <div className="d-flex align-items-center gap-2">
                                  {/* Logo del carrier */}
                                  {ruta.carrier && ruta.carrier !== 'Por Confirmar' ? (
                                    <div 
                                      className="rounded bg-white border p-2 d-flex align-items-center justify-content-center"
                                      style={{ 
                                        width: '50px', 
                                        height: '50px',
                                        overflow: 'hidden'
                                      }}
                                    >
                                      <img 
                                        src={`/logoscarrierair/${ruta.carrier.toLowerCase()}.png`}
                                        alt={ruta.carrier}
                                        style={{ 
                                          maxWidth: '150%', 
                                          maxHeight: '150%',
                                          objectFit: 'contain'
                                        }}
                                        onError={(e) => {
                                          // Fallback si la imagen no carga
                                          e.currentTarget.style.display = 'none';
                                          e.currentTarget.parentElement.innerHTML = `
                                            <i class="bi bi-box-seam text-primary fs-4"></i>
                                          `;
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div 
                                      className="rounded-circle bg-primary bg-opacity-10 p-2 d-flex align-items-center justify-content-center"
                                      style={{ width: '50px', height: '50px' }}
                                    >
                                      <i className="bi bi-box-seam text-primary fs-5"></i>
                                    </div>
                                  )}
                                  
                                  <div>
                                    <span className="badge bg-primary bg-opacity-10 text-primary border border-primary">
                                      {ruta.carrier || 'Por Confirmar'}
                                    </span>
                                  </div>
                                </div>
                                
                                {rutaSeleccionada?.id === ruta.id && (
                                  <div className="position-relative">
                                    <span className="badge bg-success">
                                      <i className="bi bi-check-circle-fill"></i> Seleccionada
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Precio destacado */}
                              <div className="mb-3 p-3 bg-light rounded">
                                <small className="text-muted text-uppercase d-block mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                                  Precio desde
                                </small>
                                <div className="d-flex align-items-baseline gap-1">
                                  <h4 className="mb-0 text-primary fw-bold">
                                    {ruta.currency} {(ruta.priceForComparison * 1.15).toFixed(2)}
                                  </h4>
                                  <small className="text-muted">/kg</small>
                                </div>
                              </div>

                              {/* Detalles en grid */}
                              <div className="row g-2">
                                {ruta.transitTime && (
                                  <div className="col-12">
                                    <div className="d-flex align-items-center gap-2 p-2 bg-white rounded border">
                                      <i className="bi bi-clock text-primary"></i>
                                      <div className="flex-grow-1">
                                        <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>
                                          Tiempo de tránsito
                                        </small>
                                        <small className="fw-semibold">{ruta.transitTime}</small>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {ruta.frequency && (
                                  <div className="col-12">
                                    <div className="d-flex align-items-center gap-2 p-2 bg-white rounded border">
                                      <i className="bi bi-calendar-check text-primary"></i>
                                      <div className="flex-grow-1">
                                        <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>
                                          Frecuencia
                                        </small>
                                        <small className="fw-semibold">{ruta.frequency}</small>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Call to action sutil */}
                              {rutaSeleccionada?.id !== ruta.id && (
                                <div className="mt-3 text-center">
                                  <small className="text-muted">
                                    <i className="bi bi-hand-index"></i> Click para seleccionar
                                  </small>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Footer informativo si hay rutas */}
                  {rutasFiltradas.length > 0 && (
                    <div className="alert alert-light border-0 mt-3">
                      <small className="text-muted">
                        <i className="bi bi-info-circle"></i> Los precios son referenciales y pueden variar según dimensiones y servicios adicionales
                      </small>
                    </div>
                  )}
                </div>
              )}

              {/* Información de ruta seleccionada */}
              {rutaSeleccionada && (
                <div className="alert alert-success mt-4 mb-0 border-0 shadow-sm">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-check-circle-fill"></i>
                      <strong>✓ Ruta Seleccionada</strong>
                    </div>
                    <button 
                      className="btn btn-sm btn-outline-success"
                      onClick={() => setRutaSeleccionada(null)}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                    >
                      Cambiar
                    </button>
                  </div>
                  
                  <div className="small">
                    <strong>Origen:</strong> {rutaSeleccionada.origin} → <strong>Destino:</strong> {rutaSeleccionada.destination}
                  </div>
                  
                  <div className="small mt-1">
                    <strong>Carrier:</strong> {rutaSeleccionada.carrier || 'Por Confirmar'}
                  </div>
                  
                  {(rutaSeleccionada.transitTime || rutaSeleccionada.frequency) && (
                    <div className="small mt-1 text-success-emphasis">
                      {rutaSeleccionada.transitTime && `⏱️ ${rutaSeleccionada.transitTime}`}
                      {rutaSeleccionada.transitTime && rutaSeleccionada.frequency && ' • '}
                      {rutaSeleccionada.frequency && `📅 ${rutaSeleccionada.frequency}`}
                    </div>
                  )}
                  
                  <div className="mt-2">
                    <strong className="small">Tarifas disponibles:</strong>
                    <div className="d-flex flex-wrap gap-1 mt-1">
                      {rutaSeleccionada.kg45 && (
                        <span className="badge bg-white text-success border border-success" style={{ fontSize: '0.7rem' }}>
                          45kg: {rutaSeleccionada.kg45}
                        </span>
                      )}
                      {rutaSeleccionada.kg100 && (
                        <span className="badge bg-white text-success border border-success" style={{ fontSize: '0.7rem' }}>
                          100kg: {rutaSeleccionada.kg100}
                        </span>
                      )}
                      {rutaSeleccionada.kg300 && (
                        <span className="badge bg-white text-success border border-success" style={{ fontSize: '0.7rem' }}>
                          300kg: {rutaSeleccionada.kg300}
                        </span>
                      )}
                      {rutaSeleccionada.kg500 && (
                        <span className="badge bg-white text-success border border-success" style={{ fontSize: '0.7rem' }}>
                          500kg: {rutaSeleccionada.kg500}
                        </span>
                      )}
                      {rutaSeleccionada.kg1000 && (
                        <span className="badge bg-white text-success border border-success" style={{ fontSize: '0.7rem' }}>
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
                        {pesoChargeable.toFixed(2)} kg
                      </span>
                      <small className="text-muted d-block mt-1">
                        (Se cobra por el mayor entre: {manualWeight.toFixed(2)} kg vs {(manualVolume * 167).toFixed(2)} kg [peso volumétrico = {manualVolume.toFixed(2)} m³ × 167])
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

      {/* Modal para rutas con precio 0 */}
      <Modal show={showPriceZeroModal} onHide={() => setShowPriceZeroModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>📋 Cotización Personalizada Requerida</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">
            <strong>Esta ruta requiere análisis caso a caso.</strong>
          </p>
          <p className="mb-0">
            Por favor, contacta a tu ejecutivo comercial para obtener una cotización personalizada 
            que se ajuste a las características específicas de tu envío.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowPriceZeroModal(false)}>
            Entendido
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default QuoteAIR;