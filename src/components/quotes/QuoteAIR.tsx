import { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from "../../auth/AuthContext";
import { packageTypeOptions } from './PackageTypes/PiecestypesAIR';
import * as XLSX from 'xlsx';
import Select from 'react-select';
import { Modal, Button } from 'react-bootstrap';
import { PDFTemplateAIR } from './Pdftemplate/Pdftemplateair';
import { generatePDF, formatDateForFilename } from './Pdftemplate/Pdfutils';
import ReactDOM from 'react-dom/client';
import {GOOGLE_SHEET_CSV_URL, type RutaAerea, type SelectOption, type OutletContext, type Currency, extractPrice, normalize, parseCSV, capitalize, parseAEREO, seleccionarTarifaPorPeso} from "./Handlers/HandlerQuoteAir";

function QuoteAPITester() {
  const { accessToken } = useOutletContext<OutletContext>();
  const { user } = useAuth();
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
  const [incoterm, setIncoterm] = useState<'EXW' | 'FCA' | ''>('');
  const [pickupFromAddress, setPickupFromAddress] = useState('');
  const [deliveryToAddress, setDeliveryToAddress] = useState('');
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
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
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
  
  // Estado para el seguro opcional
  const [seguroActivo, setSeguroActivo] = useState(false);
   const [valorMercaderia, setValorMercaderia] = useState<string>('');

  // ============================================================================
  // CARGA DE DATOS DESDE GOOGLE SHEETS (CSV)
  // ============================================================================

  useEffect(() => {
    const cargarRutas = async () => {
      try {
        setLoadingRutas(true);
        setErrorRutas(null);
        
        // Fetch del CSV desde Google Sheets
        const response = await fetch(GOOGLE_SHEET_CSV_URL);
        
        if (!response.ok) {
          throw new Error(`Error al cargar datos: ${response.status} ${response.statusText}`);
        }
        
        const csvText = await response.text();
        
        // Parsear CSV a array de arrays (similar al formato de XLSX)
        const data = parseCSV(csvText);
        
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
        setLastUpdate(new Date());
        console.log('✅ Tarifas cargadas exitosamente desde Google Sheets:', rutasParsed.length, 'rutas');
      } catch (err) {
        console.error('❌ Error al cargar datos desde Google Sheets:', err);
        setErrorRutas(
          'No se pudieron cargar las tarifas desde Google Sheets. ' +
          'Por favor, verifica tu conexión a internet o contacta al administrador.'
        );
        setLoadingRutas(false);
      }
    };

    cargarRutas();
  }, []);

  // ============================================================================
  // FUNCIÓN PARA REFRESCAR TARIFAS MANUALMENTE
  // ============================================================================
  
  const refrescarTarifas = async () => {
    try {
      setLoadingRutas(true);
      setErrorRutas(null);
      
      // Fetch del CSV desde Google Sheets con timestamp para evitar caché
      const timestamp = new Date().getTime();
      const response = await fetch(`${GOOGLE_SHEET_CSV_URL}&timestamp=${timestamp}`);
      
      if (!response.ok) {
        throw new Error(`Error al cargar datos: ${response.status} ${response.statusText}`);
      }
      
      const csvText = await response.text();
      const data = parseCSV(csvText);
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
      setLastUpdate(new Date());
      console.log('✅ Tarifas actualizadas exitosamente:', rutasParsed.length, 'rutas');
    } catch (err) {
      console.error('❌ Error al actualizar tarifas:', err);
      setErrorRutas('No se pudieron actualizar las tarifas. Por favor, intenta nuevamente.');
      setLoadingRutas(false);
    }
  };

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
    return Math.max(calculatedRate, 190);
  };

  // Función para calcular el seguro (TOTAL * 1.1 * 0.002)
  const calculateSeguro = (): number => {
    if (!seguroActivo || !tarifaAirFreight) return 0;

    // Convertir valorMercaderia a número (reemplazar coma por punto)
    const valorCarga = parseFloat(valorMercaderia.replace(',', '.')) || 0;
    
    // Si no hay valor de mercadería ingresado, retornar 0
    if (valorCarga === 0) return 0;
    
    const totalSinSeguro = 
      45 + // Handling
      (incoterm === 'EXW' ? calculateEXWRate(totalWeight, pesoChargeable) : 0) + // EXW
      30 + // AWB
      Math.max(pesoChargeable * 0.15, 50) + // Airport Transfer
      (tarifaAirFreight.precioConMarkup * pesoChargeable); // Air Freight
    
    return Math.max((valorCarga + totalSinSeguro) * 1.1 * 0.0025, 25);
  };

  // ============================================================================
  // FUNCIÓN DE TEST API
  // ============================================================================

  const testAPI = async () => {
    if (!rutaSeleccionada) {
      setError('Debes seleccionar una ruta antes de generar la cotización');
      return;
    }

    if (!incoterm) {
      setError('Debes seleccionar un Incoterm antes de generar la cotización');
      return;
    }

    if (incoterm === 'EXW' && (!pickupFromAddress || !deliveryToAddress)) {
      setError('Debes completar las direcciones de Pickup y Delivery para el Incoterm EXW');
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
      
      // Generar PDF después de cotización exitosa
      await generateQuotePDF();
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const generateQuotePDF = async () => {
    try {
      if (!rutaSeleccionada || !tarifaAirFreight) return;

      // Obtener el nombre del packageType
      const packageType = packageTypeOptions.find(opt => opt.id === selectedPackageType);
      const packageTypeName = packageType ? packageType.name : 'CARGA GENERAL';

      // Preparar los charges para el PDF
      const pdfCharges: Array<{
        code: string;
        description: string;
        quantity: number;
        unit: string;
        rate: number;
        amount: number;
      }> = [];

      // Handling
      pdfCharges.push({
        code: 'H',
        description: 'HANDLING',
        quantity: 1,
        unit: 'Each',
        rate: 45,
        amount: 45
      });

      // EXW (solo si incoterm es EXW)
      if (incoterm === 'EXW') {
        // Calcular peso chargeable correctamente
        const chargeableWeight = overallDimsAndWeight 
          ? Math.max(manualWeight, manualVolume * 167) 
          : Math.max(totalWeight, totalVolumeWeight);
        const exwRate = calculateEXWRate(totalWeight, chargeableWeight);
        pdfCharges.push({
          code: 'EC',
          description: 'EXW CHARGES',
          quantity: 1,
          unit: 'Shipment',
          rate: exwRate,
          amount: exwRate
        });
      }

      // AWB (Air Waybill)
      pdfCharges.push({
        code: 'AWB',
        description: 'AWB',
        quantity: 1,
        unit: 'Each',
        rate: 30,
        amount: 30
      });

      // Airport Transfer - Obligatorio
      const chargeableWeightForTransfer = overallDimsAndWeight 
        ? Math.max(manualWeight, manualVolume * 167) 
        : Math.max(totalWeight, totalVolumeWeight);

      const airportTransferAmount = Math.max(50, chargeableWeightForTransfer * 0.15);

      pdfCharges.push({
        code: 'A/T',
        description: 'AIRPORT TRANSFER',
        quantity: chargeableWeightForTransfer,
        unit: 'kg',
        rate: 0.15,
        amount: airportTransferAmount
      });

      // Air Freight - Usar el mismo cálculo que pesoChargeable
      const chargeableWeight = overallDimsAndWeight 
        ? Math.max(manualWeight, manualVolume * 167) 
        : Math.max(totalWeight, totalVolumeWeight);
      
      pdfCharges.push({
        code: 'AF',
        description: 'AIR FREIGHT',
        quantity: chargeableWeight,
        unit: 'kg',
        rate: tarifaAirFreight.precioConMarkup,
        amount: tarifaAirFreight.precioConMarkup * chargeableWeight
      });

      // Seguro (solo si está activo)
      if (seguroActivo) {
        const seguroAmount = calculateSeguro();
        pdfCharges.push({
          code: 'S',
          description: 'SEGURO',
          quantity: 1,
          unit: 'Shipment',
          rate: seguroAmount,
          amount: seguroAmount
        });
      }

      // Calcular total
      const totalCharges = pdfCharges.reduce((sum, charge) => sum + charge.amount, 0);

      // Crear un contenedor temporal para renderizar el PDF
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      document.body.appendChild(tempDiv);

      // Renderizar el template del PDF
      const root = ReactDOM.createRoot(tempDiv);
      
      await new Promise<void>((resolve) => {
        root.render(
          <PDFTemplateAIR
            customerName={user?.username || 'Customer'}
            origin={rutaSeleccionada.origin}
            destination={rutaSeleccionada.destination}
            effectiveDate={new Date().toLocaleDateString()}
            expirationDate={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
            incoterm={incoterm}
            pickupFromAddress={incoterm === 'EXW' ? pickupFromAddress : undefined}
            deliveryToAddress={incoterm === 'EXW' ? deliveryToAddress : undefined}
            salesRep={ejecutivo?.nombre || 'Ignacio Maldonado'}
            pieces={pieces}
            packageTypeName={packageTypeName}
            length={overallDimsAndWeight ? 0 : length}
            width={overallDimsAndWeight ? 0 : width}
            height={overallDimsAndWeight ? 0 : height}
            description={description}
            totalWeight={overallDimsAndWeight ? manualWeight : totalWeight}
            totalVolume={overallDimsAndWeight ? manualVolume : totalVolume}
            chargeableWeight={chargeableWeight}
            weightUnit="kg"
            volumeUnit="m³"
            charges={pdfCharges}
            totalCharges={totalCharges}
            currency={rutaSeleccionada.currency}
            overallMode={overallDimsAndWeight}
          />
        );
        
        // Esperar a que el DOM se actualice
        setTimeout(resolve, 500);
      });

      // Generar el PDF
      const pdfElement = tempDiv.querySelector('#pdf-content') as HTMLElement;
      if (pdfElement) {
        const filename = `Cotizacion_${user?.username || 'Cliente'}_${formatDateForFilename(new Date())}.pdf`;
        await generatePDF({ filename, element: pdfElement });
      }

      // Limpiar
      root.unmount();
      document.body.removeChild(tempDiv);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // No mostramos error al usuario, el PDF es opcional
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

      // Cobro de EXW (solo si incoterm es EXW)
      if (incoterm === 'EXW') {
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
      }

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

      // Cobro de Airport Transfer (mínimo 50)
      const airportTransferAmount = Math.max(pesoChargeable * 0.15, 50);
      charges.push({
        service: {
          id: 110936,
          code: "A/T"
        },
        income: {
          quantity: pesoChargeable,
          unit: "kg",
          rate: 0.15,
          amount: airportTransferAmount,
          showamount: airportTransferAmount,
          payment: "Prepaid",
          billApplyTo: "Other",
          billTo: {
            name: user?.username
          },
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any
          },
          reference: "TEST-REF-AIRPORTTRANSFER",
          showOnDocument: true,
          notes: `Airport Transfer charge - 0.15/kg (minimum ${rutaSeleccionada.currency} 50)`
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
          amount: pesoChargeable * tarifaAirFreight.precio,
          showamount: pesoChargeable * tarifaAirFreight.precio,
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

      // Cobro de SEGURO (solo si está activo)
      if (seguroActivo) {
        const seguroAmount = calculateSeguro();
        charges.push({
          service: {
            id: 111361,
            code: "S"
          },
          income: {
            quantity: 1,
            unit: "SEGURO",
            rate: seguroAmount,
            amount: seguroAmount,
            showamount: seguroAmount,
            payment: "Prepaid",
            billApplyTo: "Other",
            billTo: {
              name: user?.username
            },
            currency: {
              abbr: (rutaSeleccionada.currency || "USD") as any
            },
            reference: "TEST-REF-SEGURO",
            showOnDocument: true,
            notes: "Seguro opcional - Protección adicional para la carga"
          },
          expense: {
            currency: {
              abbr: (rutaSeleccionada.currency || "USD") as any
            }
          }
        });
      }

      return {
        date: new Date().toISOString(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        transitDays: 5,
        project: {
        name: "AIR"
      },
        customerReference: "Portal Created [AIR]",
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
        incoterm: {
          code: incoterm,
          name: incoterm
        },
        ...(incoterm === 'EXW' && {
          pickupFromAddress: pickupFromAddress,
          deliveryToAddress: deliveryToAddress
        }),
        portOfReceipt: {
          name: rutaSeleccionada.origin
        },
        shipper: {
          name: user?.username
        },
        consignee: {
          name: user?.username
        },
        issuingCompany: {
          name: rutaSeleccionada?.carrier || "Por Confirmar"
        },
        serviceType: {
          name: "Normal"
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

      // Cobro de EXW - Usar peso real y volumen sin conversións (solo si incoterm es EXW)
      if (incoterm === 'EXW') {
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
      }

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
      
// Cobro de Airport Transfer (modo overall) - Mínimo 50
      const pesoChargeableOverall = Math.max(manualWeight, manualVolume * 167);
      const airportTransferAmountOverall = Math.max(pesoChargeableOverall * 0.15, 50);
      
      charges.push({
        service: {
          id: 110936,
          code: "A/T"
        },
        income: {
          quantity: pesoChargeableOverall,
          unit: "kg",
          rate: 0.15,
          amount: airportTransferAmountOverall,
          showamount: airportTransferAmountOverall,
          payment: "Prepaid",
          billApplyTo: "Other",
          billTo: {
            name: user?.username
          },
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any
          },
          reference: "TEST-REF-AIRPORTTRANSFER-OVERALL",
          showOnDocument: true,
          notes: "Airport Transfer charge - 0.15/kg (min 50, Overall mode)"
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
          amount: pesoChargeable * tarifaAirFreight.precio,
          showamount: pesoChargeable * tarifaAirFreight.precio,
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

      // Cobro de SEGURO (solo si está activo) - Overall mode
      if (seguroActivo) {
        const seguroAmount = calculateSeguro();
        charges.push({
          service: {
            id: 111361,
            code: "S"
          },
          income: {
            quantity: 1,
            unit: "SEGURO",
            rate: seguroAmount,
            amount: seguroAmount,
            showamount: seguroAmount,
            payment: "Prepaid",
            billApplyTo: "Other",
            billTo: {
              name: user?.username
            },
            currency: {
              abbr: (rutaSeleccionada.currency || "USD") as any
            },
            reference: "TEST-REF-SEGURO-OVERALL",
            showOnDocument: true,
            notes: "Seguro opcional - Protección adicional para la carga (0.22% del total) - Overall mode"
          },
          expense: {
            currency: {
              abbr: (rutaSeleccionada.currency || "USD") as any
            }
          }
        });
      }

      return {
        date: new Date().toISOString(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        transitDays: 5,
        customerReference: "Portal-Created [AIR-OVERALL]",
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
        incoterm: {
          code: incoterm,
          name: incoterm
        },
        ...(incoterm === 'EXW' && {
          pickupFromAddress: pickupFromAddress,
          deliveryToAddress: deliveryToAddress
        }),
        portOfReceipt: {
          name: rutaSeleccionada.origin
        },
        shipper: {
          name: user?.username
        },
        consignee: {
          name: user?.username
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
      {/* SECCIÓN 1: SELECCIÓN DE RUTA */}
      {/* ============================================================================ */}

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="card-title mb-0">📍 Paso 1: Selecciona Ruta</h5>
            <button
              onClick={refrescarTarifas}
              disabled={loadingRutas}
              className="btn btn-sm btn-outline-primary"
              title="Actualizar tarifas desde Google Sheets"
            >
              {loadingRutas ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                  Actualizando...
                </>
              ) : (
                <>
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Actualizar Tarifas
                </>
              )}
            </button>
          </div>

          {lastUpdate && !loadingRutas && !errorRutas && (
            <div className="alert alert-light py-2 px-3 mb-3 d-flex align-items-center justify-content-between" style={{ fontSize: '0.85rem' }}>
              <span className="text-muted">
                <i className="bi bi-clock-history me-1"></i>
                Última actualización: {lastUpdate.toLocaleTimeString('es-CL', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
              <span className="badge bg-success">
                {rutas.length} rutas disponibles
              </span>
            </div>
          )}

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
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.875rem' }}>
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: '5%' }}></th>
                            <th style={{ width: '20%' }}>Carrier</th>
                            <th className="text-center" style={{ width: '12%' }}>1-99kg</th>
                            <th className="text-center" style={{ width: '12%' }}>100-299kg</th>
                            <th className="text-center" style={{ width: '12%' }}>300-499kg</th>
                            <th className="text-center" style={{ width: '12%' }}>500-999kg</th>
                            <th className="text-center" style={{ width: '12%' }}>+1000kg</th>
                            <th className="text-center" style={{ width: '15%' }}>Salidas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rutasFiltradas.map((ruta, index) => {
                            const precioKg45 = extractPrice(ruta.kg45);
                            const precioKg100 = extractPrice(ruta.kg100);
                            const precioKg300 = extractPrice(ruta.kg300);
                            const precioKg500 = extractPrice(ruta.kg500);
                            const precioKg1000 = extractPrice(ruta.kg1000);

                            return (
                              <tr 
                                key={ruta.id}
                                onClick={() => {
                                  if (ruta.priceForComparison === 0) {
                                    setShowPriceZeroModal(true);
                                    return;
                                  }
                                  setRutaSeleccionada(ruta);
                                }}
                                className={rutaSeleccionada?.id === ruta.id ? 'table-success' : ''}
                                style={{ 
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                {/* Indicador de selección y badges */}
                                <td className="text-center">
                                  {rutaSeleccionada?.id === ruta.id ? (
                                    <i className="bi bi-check-circle-fill text-success fs-5"></i>
                                  ) : (
                                    <div style={{ width: '20px', height: '20px' }}></div>
                                  )}
                                  
                                  {/* Badges verticales */}
                                  <div className="d-flex flex-column gap-1 mt-2">
                                    {index === bestPriceRouteIndex && (
                                      <span 
                                        className="badge bg-warning text-dark" 
                                        style={{ fontSize: '0.6rem', padding: '0.15rem 0.3rem' }}
                                        title="Mejor precio"
                                      >
                                        <i className="bi bi-star-fill"></i>
                                      </span>
                                    )}
                                    {index === fastestRouteIndex && (
                                      <span 
                                        className="badge bg-success" 
                                        style={{ fontSize: '0.6rem', padding: '0.15rem 0.3rem' }}
                                        title="Menor tiempo"
                                      >
                                        <i className="bi bi-lightning-fill"></i>
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Carrier con logo */}
                                <td>
                                  <div className="d-flex align-items-center gap-2">
                                    {ruta.carrier && ruta.carrier !== 'Por Confirmar' ? (
                                      <div 
                                        className="rounded bg-white border d-flex align-items-center justify-content-center flex-shrink-0"
                                        style={{ 
                                          width: '35px', 
                                          height: '35px',
                                          overflow: 'hidden',
                                          padding: '4px'
                                        }}
                                      >
                                        <img 
                                          src={`/logoscarrierair/${ruta.carrier.toLowerCase()}.png`}
                                          alt={ruta.carrier}
                                          style={{ 
                                            maxWidth: '100%', 
                                            maxHeight: '100%',
                                            objectFit: 'contain'
                                          }}
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            if (e.currentTarget.parentElement) {
                                              e.currentTarget.parentElement.innerHTML = `
                                              <i class="bi bi-box-seam text-muted"></i>
                                            `;
                                            }
                                          }}
                                        />
                                      </div>
                                    ) : (
                                      <div 
                                        className="rounded bg-light d-flex align-items-center justify-content-center flex-shrink-0"
                                        style={{ width: '35px', height: '35px' }}
                                      >
                                        <i className="bi bi-box-seam text-muted"></i>
                                      </div>
                                    )}
                                    <span className="fw-semibold text-truncate" style={{ fontSize: '0.8rem' }}>
                                      {ruta.carrier || 'Por Confirmar'}
                                    </span>
                                  </div>
                                </td>

                                {/* Precios por rango (CON 15% incluido) */}
                                <td className="text-center">
                                  {precioKg45 > 0 ? (
                                    <div>
                                      <div className="fw-semibold text-success">
                                        {ruta.currency} {(precioKg45 * 1.15).toFixed(2)}
                                      </div>
                                      <small className="text-muted" style={{ fontSize: '0.7rem' }}>/kg</small>
                                    </div>
                                  ) : (
                                    <span className="text-muted">—</span>
                                  )}
                                </td>

                                <td className="text-center">
                                  {precioKg100 > 0 ? (
                                    <div>
                                      <div className="fw-semibold text-success">
                                        {ruta.currency} {(precioKg100 * 1.15).toFixed(2)}
                                      </div>
                                      <small className="text-muted" style={{ fontSize: '0.7rem' }}>/kg</small>
                                    </div>
                                  ) : (
                                    <span className="text-muted">—</span>
                                  )}
                                </td>

                                <td className="text-center">
                                  {precioKg300 > 0 ? (
                                    <div>
                                      <div className="fw-semibold text-success">
                                        {ruta.currency} {(precioKg300 * 1.15).toFixed(2)}
                                      </div>
                                      <small className="text-muted" style={{ fontSize: '0.7rem' }}>/kg</small>
                                    </div>
                                  ) : (
                                    <span className="text-muted">—</span>
                                  )}
                                </td>

                                <td className="text-center">
                                  {precioKg500 > 0 ? (
                                    <div>
                                      <div className="fw-semibold text-success">
                                        {ruta.currency} {(precioKg500 * 1.15).toFixed(2)}
                                      </div>
                                      <small className="text-muted" style={{ fontSize: '0.7rem' }}>/kg</small>
                                    </div>
                                  ) : (
                                    <span className="text-muted">—</span>
                                  )}
                                </td>

                                <td className="text-center">
                                  {precioKg1000 > 0 ? (
                                    <div>
                                      <div className="fw-semibold text-success">
                                        {ruta.currency} {(precioKg1000 * 1.15).toFixed(2)}
                                      </div>
                                      <small className="text-muted" style={{ fontSize: '0.7rem' }}>/kg</small>
                                    </div>
                                  ) : (
                                    <span className="text-muted">—</span>
                                  )}
                                </td>

                                {/* Detalles adicionales */}
                                <td className="text-center">
                                  <div style={{ fontSize: '0.75rem' }}>
                                    {ruta.transitTime && (
                                      <div className="text-muted mb-1">
                                        <i className="bi bi-clock"></i> {ruta.transitTime}
                                      </div>
                                    )}
                                    {ruta.frequency && (
                                      <div className="text-muted">
                                        <i className="bi bi-calendar-check"></i> {ruta.frequency}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
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
                          45kg: {rutaSeleccionada.currency} {(extractPrice(rutaSeleccionada.kg45) * 1.15).toFixed(2)}
                        </span>
                      )}
                      {rutaSeleccionada.kg100 && (
                        <span className="badge bg-white text-success border border-success" style={{ fontSize: '0.7rem' }}>
                          100kg: {rutaSeleccionada.currency} {(extractPrice(rutaSeleccionada.kg100) * 1.15).toFixed(2)}
                        </span>
                      )}
                      {rutaSeleccionada.kg300 && (
                        <span className="badge bg-white text-success border border-success" style={{ fontSize: '0.7rem' }}>
                          300kg: {rutaSeleccionada.currency} {(extractPrice(rutaSeleccionada.kg300) * 1.15).toFixed(2)}
                        </span>
                      )}
                      {rutaSeleccionada.kg500 && (
                        <span className="badge bg-white text-success border border-success" style={{ fontSize: '0.7rem' }}>
                          500kg: {rutaSeleccionada.currency} {(extractPrice(rutaSeleccionada.kg500) * 1.15).toFixed(2)}
                        </span>
                      )}
                      {rutaSeleccionada.kg1000 && (
                        <span className="badge bg-white text-success border border-success" style={{ fontSize: '0.7rem' }}>
                          1000kg: {rutaSeleccionada.currency} {(extractPrice(rutaSeleccionada.kg1000) * 1.15).toFixed(2)}
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
                      {(opt as any).code ? `${(opt as any).code} - ${opt.name}` : opt.name}
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

              <div className="col-6">
                <label className="form-label">Descripción</label>
                <input
                  type="text"
                  className="form-control"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="col-6">
                <label className="form-label">Incoterm</label>
                <select
                  className="form-select"
                  value={incoterm}
                  onChange={(e) => setIncoterm(e.target.value as 'EXW' | 'FCA' | '')}
                >
                  <option value="">Seleccione un Incoterm</option>
                  <option value="EXW">Ex Works [EXW]</option>
                  <option value="FCA">FCA</option>
                </select>
              </div>

               {/* Campos condicionales solo para EXW */}
              {incoterm === 'EXW' && (
                <>
                  <div className="col-md-6">
                    <label className="form-label">Pickup From Address</label>
                    <textarea
                      className="form-control"
                      value={pickupFromAddress}
                      onChange={(e) => setPickupFromAddress(e.target.value)}
                      placeholder="Ingrese dirección de recogida"
                      rows={3}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Delivery To Address</label>
                    <textarea
                      className="form-control"
                      value={deliveryToAddress}
                      onChange={(e) => setDeliveryToAddress(e.target.value)}
                      placeholder="Ingrese dirección de entrega"
                      rows={3}
                    />
                  </div>
                </>
              )}

              {/* Modo Normal */}
              {!overallDimsAndWeight && (
                <>
                  <div className="col-md-3">
                    <label className="form-label">Largo (cm)</label>
                    <input
                      type="number"
                      className={`form-control ${
                        dimensionError && dimensionError.includes('Largo') ? 'is-invalid' : ''
                      }`}
                      value={length}
                      onChange={(e) => {
                        const newLength = Number(e.target.value);
                        setLength(newLength);

                        if (newLength > 290) {
                          setDimensionError('El Largo no puede exceder 290 cm');
                        } else if (width > 290) {
                          setDimensionError('El Ancho no puede exceder 290 cm');
                        } else if (height > 160) {
                          setDimensionError('El Alto no puede exceder 160 cm');
                        } else {
                          setDimensionError(null);
                        }
                      }}
                      min="0"
                      step="0.01"
                    />
                    {dimensionError && dimensionError.includes('Largo') && (
                      <div className="invalid-feedback">{dimensionError}</div>
                    )}
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Ancho (cm)</label>
                    <input
                      type="number"
                      className={`form-control ${
                        dimensionError && dimensionError.includes('Ancho') ? 'is-invalid' : ''
                      }`}
                      value={width}
                      onChange={(e) => {
                        const newWidth = Number(e.target.value);
                        setWidth(newWidth);

                        if (newWidth > 290) {
                          setDimensionError('El Ancho no puede exceder 290 cm');
                        } else if (length > 290) {
                          setDimensionError('El Largo no puede exceder 290 cm');
                        } else if (height > 160) {
                          setDimensionError('El Alto no puede exceder 160 cm');
                        } else {
                          setDimensionError(null);
                        }
                      }}
                      min="0"
                      step="0.01"
                    />
                    {dimensionError && dimensionError.includes('Ancho') && (
                      <div className="invalid-feedback">{dimensionError}</div>
                    )}
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Alto (cm)</label>
                    <input
                      type="number"
                      className={`form-control ${
                        dimensionError && dimensionError.includes('Alto') ? 'is-invalid' : ''
                      }`}
                      value={height}
                      onChange={(e) => {
                        const newHeight = Number(e.target.value);
                        setHeight(newHeight);

                        if (newHeight > 160) {
                          setDimensionError('El Alto no puede exceder 160 cm');
                        } else if (length > 290) {
                          setDimensionError('El Largo no puede exceder 290 cm');
                        } else if (width > 290) {
                          setDimensionError('El Ancho no puede exceder 290 cm');
                        } else {
                          setDimensionError(null);
                        }
                      }}
                      min="0"
                      step="0.01"
                    />
                    {dimensionError && dimensionError.includes('Alto') && (
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
              <h6 className="mb-3">Cálculos {overallDimsAndWeight ? '(Modo Overall)' : '(Modo Normal)'}</h6>
              <div className="row g-3">
                {!overallDimsAndWeight ? (
                  <>
                    <div className="col-md-4">
                      <strong>Volumen por pieza:</strong> {volume.toFixed(4)} m³
                    </div>
                    <div className="col-md-4">
                      <strong>Peso volumétrico por pieza:</strong> {volumeWeight.toFixed(2)} kg
                    </div>
                    <div className="col-md-4">
                      <strong>Volumen total:</strong> {totalVolume.toFixed(4)} m³
                    </div>
                    <div className="col-md-4">
                      <strong>Peso total:</strong> {totalWeight.toFixed(2)} kg
                    </div>
                    <div className="col-md-4">
                      <strong>Peso volumétrico total:</strong> {totalVolumeWeight.toFixed(2)} kg
                    </div>
                    <div className="col-md-4">
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

              {/* Versión compacta */}
              {tarifaAirFreight && (
                <div className="mt-3 pt-3 border-top">
                  <h6 className="mb-2">Breakdown de Costos</h6>
                  
                  <div className="bg-light rounded p-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span>Handling:</span>
                      <strong>{rutaSeleccionada.currency} 45.00</strong>
                    </div>
                    
                    {incoterm === 'EXW' && (
                      <div className="d-flex justify-content-between mb-2">
                        <span>EXW Charges:</span>
                        <strong>{rutaSeleccionada.currency} {calculateEXWRate(totalWeight, pesoChargeable).toFixed(2)}</strong>
                      </div>
                    )}
                    
                    <div className="d-flex justify-content-between mb-2">
                      <span>AWB:</span>
                      <strong>{rutaSeleccionada.currency} 30.00</strong>
                    </div>

                    <div className="d-flex justify-content-between mb-2">
                      <span>Airport Transfer:</span>
                      <strong>{rutaSeleccionada.currency} {Math.max(pesoChargeable * 0.15, 50).toFixed(2)}</strong>
                    </div>
                    
                    <div className="d-flex justify-content-between mb-3 pb-3 border-bottom">
                      <span>Air Freight:</span>
                      <strong>{rutaSeleccionada.currency} {(tarifaAirFreight.precioConMarkup * pesoChargeable).toFixed(2)}</strong>
                    </div>

                    {/* Sección de Opcionales */}
                    <div className="mb-3 pb-3 border-bottom">
                      <h6 className="mb-3 text-muted">🔧 Opcionales</h6>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="seguroCheckbox"
                          checked={seguroActivo}
                          onChange={(e) => setSeguroActivo(e.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="seguroCheckbox">
                          Agregar Seguro
                        </label>
                        <small className="text-muted d-block ms-4">
                          Protección adicional para tu carga
                        </small>
                      </div>

                      {/* Input para Valor de Mercadería - Solo visible si seguro está activo */}
                       {seguroActivo && (
                         <div className="mt-3 ms-4">
                           <label htmlFor="valorMercaderia" className="form-label small">
                               Valor de la Mercadería ({rutaSeleccionada.currency}) <span className="text-danger">*</span>
                                 </label>
                                 <input
                                   type="text"
                                   className="form-control"
                                   id="valorMercaderia"
                                   placeholder="Ej: 10000 o 10000,50"
                                   value={valorMercaderia}
                                   onChange={(e) => {
                                     // Permitir solo números, punto y coma
                                     const value = e.target.value;
                                     if (value === '' || /^[\d,\.]+$/.test(value)) {
                                       setValorMercaderia(value);
                                     }
                                   }}
                                 />
                                 <small className="text-muted">
                                   Ingresa el valor total de tu carga
                                 </small>
                               </div>
                             )}


                    </div>

                    {/* Mostrar el cargo del seguro si está activo */}
                    {seguroActivo && calculateSeguro() > 0 && (
                      <div className="d-flex justify-content-between mb-3 pb-3 border-bottom">
                        <span>Seguro:</span>
                        <strong className="text-info">{rutaSeleccionada.currency} {calculateSeguro().toFixed(2)}</strong>
                      </div>
                    )}

                    {/* Mensaje de advertencia si el seguro está activo pero no hay valor de mercadería */}
                            {seguroActivo && !valorMercaderia && (
                              <div className="alert alert-warning py-2 mb-3" role="alert">
                                <small>⚠️ Debes ingresar el valor de la mercadería para calcular el seguro</small>
                              </div>
                            )}
                    
                    <div className="d-flex justify-content-between">
                      <span className="fs-5 fw-bold">TOTAL:</span>
                      <span className="fs-5 fw-bold text-success">
                        {rutaSeleccionada.currency}{' '}
                        {(
                          45 + // Handling
                          (incoterm === 'EXW' ? calculateEXWRate(totalWeight, pesoChargeable) : 0) + // EXW
                          30 + // AWB
                          Math.max(pesoChargeable * 0.15, 50) + // Airport Transfer
                          (tarifaAirFreight.precioConMarkup * pesoChargeable) + // Air Freight
                          (seguroActivo ? calculateSeguro() : 0) // Seguro (si está activo)
                        ).toFixed(2)}
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
                <>Generar Cotización</>
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

      {/* Payload*/}
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
            <h5 className="card-title text-danger">❌ Hubo un error en la cotización</h5>
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
            <h5 className="card-title text-success">✅ Tu cotización se ha generado exitosamente</h5>
            {/*<pre style={{
              backgroundColor: '#f0fdf4',
              padding: '15px',
              borderRadius: '5px',
              maxHeight: '400px',
              overflow: 'auto',
              fontSize: '0.85rem',
              color: '#15803d'
            }}>
              {JSON.stringify(response, null, 2)}
            </pre>*/}
            <div className="alert alert-success mt-3 mb-0">
               En unos momentos se descargará automáticamente el PDF de la cotización.
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

export default QuoteAPITester;