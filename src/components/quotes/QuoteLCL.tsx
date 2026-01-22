import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from "../../auth/AuthContext";
import * as XLSX from 'xlsx';
import Select from 'react-select';
import { packageTypeOptions } from './PackageTypes/PiecestypesLCL';
import { Modal, Button } from 'react-bootstrap';
import { PDFTemplateLCL } from './Pdftemplate/Pdftemplatelcl';
import { generatePDF, formatDateForFilename } from './Pdftemplate/Pdfutils';
import ReactDOM from 'react-dom/client';
import { PieceAccordionLCL } from './Handlers/LCL/PieceAccordionLCL.tsx';
import type { PieceData } from './Handlers/LCL/HandlerQuoteLCL.tsx';

// URL del Google Sheet publicado como CSV
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT5T29WmDAI_z4RxlPtY3GoB3pm7NyBBiWZGc06cYRR1hg5fdFx7VEr3-i2geKxgw/pub?output=csv';

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

// ============================================================================
// FUNCIÓN PARA PARSEAR CSV CORRECTAMENTE
// ============================================================================

const parseCSV = (csvText: string): any[] => {
  const lines = csvText.split('\n');
  const result: any[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const row: any[] = [];
    let currentField = '';
    let insideQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const nextChar = line[j + 1];
      
      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // Escaped quote
          currentField += '"';
          j++; // Skip next quote
        } else {
          // Toggle quote state
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        // End of field
        row.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    
    // Add last field
    row.push(currentField.trim());
    result.push(row);
  }
  
  return result;
};

// ============================================================================
// NORMALIZACIÓN ESPECIAL PARA PODs - MAPEO DE VARIANTES
// ============================================================================

/**
 * Normaliza los nombres de PODs agrupando variantes del mismo puerto
 * bajo un nombre canónico único
 */
const normalizePOD = (pod: string): string => {
  if (!pod) return '';
  
  const podLower = pod.toLowerCase().trim();
  
  // Definir mapeo de variantes a nombres canónicos
  const podMapping: { [key: string]: string } = {
    // Grupo: San Antonio - Valparaíso
    'san antonio - valparaiso': 'san antonio - valparaiso',
    'san antonio / valparaiso': 'san antonio - valparaiso',
    'vap / sai': 'san antonio - valparaiso',
    'sai / vap': 'san antonio - valparaiso',
    'valparaiso - san antonio': 'san antonio - valparaiso',
    'valparaiso / san antonio': 'san antonio - valparaiso',
    
    // Puertos individuales (mantener por si acaso)
    'valparaiso': 'valparaiso',
    'san antonio': 'san antonio',
    'iquique': 'iquique',
    'iquique via san antonio': 'iquique via san antonio',
    'santos': 'santos',
    'callao': 'callao',
    'tbc': 'tbc',
  };
  
  // Buscar coincidencia en el mapeo
  if (podMapping[podLower]) {
    return podMapping[podLower];
  }
  
  // Si no hay coincidencia específica, devolver normalizado estándar
  return podLower;
};

/**
 * Obtiene el nombre de display preferido para un POD normalizado
 */
const getPODDisplayName = (podNormalized: string): string => {
  const displayNames: { [key: string]: string } = {
    'san antonio - valparaiso': 'SAN ANTONIO - VALPARAISO',
    'valparaiso': 'VALPARAISO',
    'san antonio': 'SAN ANTONIO',
    'iquique': 'IQUIQUE',
    'iquique via san antonio': 'IQUIQUE VIA SAN ANTONIO',
    'santos': 'SANTOS',
    'callao': 'CALLAO',
    'tbc': 'TBC',
  };
  
  return displayNames[podNormalized] || capitalize(podNormalized);
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
        podNormalized: normalizePOD(pod),
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
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const [polSeleccionado, setPolSeleccionado] = useState<SelectOption | null>(null);
  const [podSeleccionado, setPodSeleccionado] = useState<SelectOption | null>(null);
  const [rutaSeleccionada, setRutaSeleccionada] = useState<RutaLCL | null>(null);
  
  const [opcionesPOL, setOpcionesPOL] = useState<SelectOption[]>([]);
  const [opcionesPOD, setOpcionesPOD] = useState<SelectOption[]>([]);
  
  const [operadoresActivos, setOperadoresActivos] = useState<Set<Operador>>(new Set());
  const [operadoresDisponibles, setOperadoresDisponibles] = useState<Operador[]>([]);
  
  // Estado para modal de precio 0
  const [showPriceZeroModal, setShowPriceZeroModal] = useState(false);

  // ============================================================================
  // ESTADOS PARA COMMODITY
  // ============================================================================

  const [description, setDescription] = useState("Cargamento Marítimo LCL");
  const [selectedPackageType, setSelectedPackageType] = useState(97);

  // Estados para incoterm y direcciones
  const [incoterm, setIncoterm] = useState<'EXW' | 'FOB' | ''>('');
  const [pickupFromAddress, setPickupFromAddress] = useState('');
  const [deliveryToAddress, setDeliveryToAddress] = useState('');

  // Estados para sistema de piezas
  const [piecesData, setPiecesData] = useState<PieceData[]>([
    {
      id: '1',
      packageType: '',
      description: '',
      length: 0,
      width: 0,
      height: 0,
      weight: 0,
      volume: 0,
      totalVolume: 0,
      weightTons: 0,
      totalWeightTons: 0,
      wmChargeable: 0
    }
  ]);
  const [openAccordions, setOpenAccordions] = useState<string[]>(['1']);
  const [showMaxPiecesModal, setShowMaxPiecesModal] = useState(false);
  const [openSection, setOpenSection] = useState<number>(1); // Controla qué paso está abierto

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
        
        // Parsear CSV a array de arrays
        const data = parseCSV(csvText);
        
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
        setLastUpdate(new Date());
        console.log('✅ Tarifas LCL cargadas exitosamente desde Google Sheets:', rutasParsed.length, 'rutas');
      } catch (err) {
        console.error('❌ Error al cargar datos LCL desde Google Sheets:', err);
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
      setLastUpdate(new Date());
      console.log('✅ Tarifas LCL actualizadas exitosamente:', rutasParsed.length, 'rutas');
    } catch (err) {
      console.error('❌ Error al actualizar tarifas LCL:', err);
      setErrorRutas('No se pudieron actualizar las tarifas. Por favor, intenta nuevamente.');
      setLoadingRutas(false);
    }
  };

  // ============================================================================
  // FUNCIONES DE MANEJO DE PIEZAS
  // ============================================================================

  // Agregar nueva pieza
  const handleAddPiece = () => {
    if (piecesData.length >= 10) {
      setShowMaxPiecesModal(true);
      return;
    }

    const newId = (piecesData.length + 1).toString();
    const newPiece: PieceData = {
      id: newId,
      packageType: '',
      description: '',
      length: 0,
      width: 0,
      height: 0,
      weight: 0,
      volume: 0,
      totalVolume: 0,
      weightTons: 0,
      totalWeightTons: 0,
      wmChargeable: 0
    };

    setPiecesData([...piecesData, newPiece]);

    // Abrir la nueva pieza y cerrar otras si ya hay 2 abiertas
    setOpenAccordions(prev => {
      const newOpen = [...prev, newId];
      return newOpen.length > 2 ? newOpen.slice(-2) : newOpen;
    });
  };

  // Eliminar pieza
  const handleRemovePiece = (id: string) => {
    const filtered = piecesData.filter(p => p.id !== id);

    // Renumerar las piezas
    const renumbered = filtered.map((piece, index) => ({
      ...piece,
      id: (index + 1).toString()
    }));

    setPiecesData(renumbered);

    // Actualizar accordions abiertos
    setOpenAccordions(prev =>
      prev.filter(openId => openId !== id).map((openId) => {
        const oldIndex = parseInt(openId) - 1;
        const newIndex = renumbered.findIndex((_, i) => i === oldIndex);
        return newIndex !== -1 ? (newIndex + 1).toString() : openId;
      })
    );
  };

  // Toggle accordion
  const handleToggleAccordion = (id: string) => {
    setOpenAccordions(prev => {
      const isOpen = prev.includes(id);

      if (isOpen) {
        // Cerrar
        return prev.filter(openId => openId !== id);
      } else {
        // Abrir (máximo 2)
        const newOpen = [...prev, id];
        return newOpen.length > 2 ? newOpen.slice(-2) : newOpen;
      }
    });
  };

  // Actualizar campo de una pieza
  const handleUpdatePiece = (id: string, field: keyof PieceData, value: any) => {
    setPiecesData(prev =>
      prev.map(piece =>
        piece.id === id ? { ...piece, [field]: value } : piece
      )
    );
  };

  // Calcular totales de todas las piezas
  const calculateTotals = () => {
    const totalWeightKg = piecesData.reduce((sum, piece) => sum + piece.weight, 0);
    const totalWeightTons = totalWeightKg / 1000; // Convertir kg a toneladas
    const totalVolume = piecesData.reduce((sum, piece) => sum + piece.volume, 0);
    const chargeableVolume = Math.max(totalWeightTons, totalVolume); // W/M Chargeable

    return {
      totalWeightKg,
      totalWeightTons,
      totalVolume,
      chargeableVolume
    };
  };

  const handleSectionToggle = (section: number) => {
    setOpenSection(openSection === section ? 0 : section);
  };

  // ============================================================================
  // ACTUALIZAR PODs CUANDO CAMBIA POL
  // ============================================================================

  useEffect(() => {
    if (polSeleccionado) {
      // Filtrar rutas por POL seleccionado
      const rutasParaPOL = rutas.filter(r => r.polNormalized === polSeleccionado.value);
      
      // Agrupar por podNormalized y obtener el nombre de display preferido
      const podMap = new Map<string, string>();
      
      rutasParaPOL.forEach(r => {
        if (!podMap.has(r.podNormalized)) {
          // Usar el nombre de display preferido basado en la normalización
          podMap.set(r.podNormalized, getPODDisplayName(r.podNormalized));
        }
      });
      
      // Crear opciones únicas ordenadas alfabéticamente
      const podsUnicos = Array.from(podMap.entries())
        .map(([normalized, displayName]) => ({
          value: normalized,
          label: displayName
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
      
      setOpcionesPOD(podsUnicos);
      setPodSeleccionado(null);
      setRutaSeleccionada(null);
    } else {
      setOpcionesPOD([]);
      setPodSeleccionado(null);
      setRutaSeleccionada(null);
    }
  }, [polSeleccionado, rutas]);

  // Cerrar Paso 1 y abrir Paso 2 cuando se selecciona una ruta
  useEffect(() => {
    if (rutaSeleccionada) {
      setOpenSection(2); // Abrir automáticamente el Paso 2
    }
  }, [rutaSeleccionada]);
  
  // ============================================================================
  // CÁLCULOS
  // ============================================================================

  // Calcular totales usando el nuevo sistema de piezas
  const { totalWeightKg, totalWeightTons, totalVolume, chargeableVolume } = calculateTotals();
  const totalVolumeWeight = chargeableVolume;

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
  // FUNCIÓN PARA CALCULAR EXW SEGÚN NÚMERO DE PIEZAS
  // ============================================================================

  const calculateEXWRate = (): number => {
    return 170 * piecesData.length;
  };

  // ============================================================================
  // FUNCIÓN PARA CALCULAR EL SEGURO (TOTAL * 1.1 * 0.002) CON MÍNIMO DE 25
  // ============================================================================

  const calculateSeguro = (): number => {
    if (!seguroActivo || !rutaSeleccionada || !tarifaOceanFreight) return 0;

    // Convertir valorMercaderia a número (reemplazar coma por punto)
    const valorCarga = parseFloat(valorMercaderia.replace(',', '.')) || 0;
    
    // Si no hay valor de mercadería ingresado, retornar 0
    if (valorCarga === 0) return 0;
    
    const totalSinSeguro = 
      60 + // BL
      45 + // Handling
      (incoterm === 'EXW' ? calculateEXWRate() : 0) + // EXW
      tarifaOceanFreight.income; // Ocean Freight
    
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

    // Validar que todas las piezas tengan tipo de paquete seleccionado
    const piezasSinTipo = piecesData.filter(piece => !piece.packageType);
    if (piezasSinTipo.length > 0) {
      setError('Debes seleccionar un Tipo de Paquete para todas las piezas antes de generar la cotización');
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
      if (!rutaSeleccionada) {
        console.error('No ruta seleccionada para generar PDF');
        return;
      }

      // Obtener el nombre del packageType
      const packageType = packageTypeOptions.find(opt => opt.id === selectedPackageType);
      const packageTypeName = packageType ? `${packageType.code} - ${packageType.name}` : 'Standard';

      // Preparar los charges para el PDF
      const pdfCharges: { code: string; description: string; quantity: number; unit: string; rate: number; amount: number; }[] = [];

      // BL
      pdfCharges.push({
        code: 'B',
        description: 'BL',
        quantity: 1,
        unit: 'Each',
        rate: 60,
        amount: 60
      });

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
        const exwRate = calculateEXWRate();
        pdfCharges.push({
          code: 'EC',
          description: 'EXW CHARGES',
          quantity: piecesData.length,
          unit: 'Piece',
          rate: 170,
          amount: exwRate
        });
      }

      // Ocean Freight
      if (tarifaOceanFreight) {
        pdfCharges.push({
          code: 'OF',
          description: 'OCEAN FREIGHT',
          quantity: chargeableVolume,
          unit: 'W/M',
          rate: rutaSeleccionada.ofWM * 1.15,
          amount: tarifaOceanFreight.income
        });
      }

      // Seguro (si está activo)
      if (seguroActivo) {
        const seguroAmount = calculateSeguro();
        pdfCharges.push({
          code: 'S',
          description: 'SEGURO',
          quantity: 1,
          unit: 'Each',
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
          <PDFTemplateLCL
            customerName={user?.username || 'Customer'}
            pol={rutaSeleccionada.pol}
            pod={rutaSeleccionada.pod}
            effectiveDate={new Date().toLocaleDateString()}
            expirationDate={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
            incoterm={incoterm}
            pickupFromAddress={incoterm === 'EXW' ? pickupFromAddress : undefined}
            deliveryToAddress={incoterm === 'EXW' ? deliveryToAddress : undefined}
            salesRep={ejecutivo?.nombre || 'Ignacio Maldonado'}
            pieces={piecesData.length}
            packageTypeName={packageTypeName}
            length={piecesData[0]?.length || 0}
            width={piecesData[0]?.width || 0}
            height={piecesData[0]?.height || 0}
            description={description}
            totalWeight={totalWeightKg}
            totalVolume={totalVolume}
            totalVolumeWeight={totalVolumeWeight}
            weightUnit="kg"
            volumeUnit="m³"
            charges={pdfCharges}
            totalCharges={totalCharges}
            currency={rutaSeleccionada.currency}
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

    // Cobro de EXW (solo si incoterm es EXW)
    if (incoterm === 'EXW') {
      const exwRate = calculateEXWRate();
      charges.push({
        service: {
          id: 271,
          code: "EC"
        },
        income: {
          quantity: piecesData.length,
          unit: "EXW CHARGES",
          rate: 170,
          amount: exwRate,
          showamount: exwRate,
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
          notes: `EXW charge - ${piecesData.length} piece(s) × 170`
        },
        expense: {
          currency: {
            abbr: divisa
          }
        }
      });
    }

    // Cobro de OCEAN FREIGHT
    charges.push({
      service: {
        id: 106,
        code: "OF"
      },
      income: {
        quantity: chargeableVolume,
        unit: "OCEAN FREIGHT",
        rate: (rutaSeleccionada?.ofWM ?? 0) * 1.15,
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
        notes: `OCEAN FREIGHT charge - ${rutaSeleccionada?.operador} - W/M: ${chargeableVolume.toFixed(3)} - Tarifa: ${divisa} ${rutaSeleccionada?.ofWM}/W/M - Total: ${divisa} ${tarifaOceanFreight.expense.toFixed(2)} + 15%`
      },
      expense: {
        quantity: chargeableVolume,
        unit: "OCEAN FREIGHT",
        rate: rutaSeleccionada?.ofWM ?? 0,
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
        notes: `OCEAN FREIGHT expense - ${rutaSeleccionada?.operador} - W/M: ${chargeableVolume.toFixed(3)} - Tarifa: ${divisa} ${rutaSeleccionada?.ofWM}/W/M - Total: ${divisa} ${tarifaOceanFreight.expense.toFixed(2)}`
      }
    });

    // Cobro de Seguro (solo si está activo)
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
            abbr: divisa
          },
          reference: "LCL-SEGURO-REF",
          showOnDocument: true,
          notes: "Seguro charge created via API"
        },
        expense: {
          currency: {
            abbr: divisa
          }
        }
      });
    }

    return {
      date: new Date().toISOString(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      transitDays: 5,
      project: {
        name: "LCL"
      },
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
      incoterm: {
        code: incoterm,
        name: incoterm
      },
      ...(incoterm === 'EXW' && {
        pickupFromAddress: pickupFromAddress,
        deliveryToAddress: deliveryToAddress
      }),
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
      commodities: piecesData.map(piece => ({
        commodityType: "Standard",
        packageType: {
          id: piece.packageType
        },
        pieces: 1, // Siempre 1 ahora
        description: piece.description,
        weightPerUnitValue: piece.weight,
        weightPerUnitUOM: "kg",
        totalWeightValue: piece.weight,
        totalWeightUOM: "kg",
        lengthValue: piece.length,
        lengthUOM: "cm",
        widthValue: piece.width,
        widthUOM: "cm",
        heightValue: piece.height,
        heightUOM: "cm",
        volumeValue: piece.volume,
        volumeUOM: "m3",
        totalVolumeValue: piece.volume,
        totalVolumeUOM: "m3"
      })),
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
          <h2 className="mb-1">Cotizador LCL</h2>
          <p className="text-muted mb-0">Genera cotizaciones para envíos Less than Container Load</p>
        </div>
      </div>

      {/* ============================================================================ */}
      {/* SECCIÓN 1: SELECCIÓN DE RUTA */}
      {/* ============================================================================ */}

      <div className="card shadow-sm mb-4">
      <div 
        className="card-header d-flex justify-content-between align-items-center"
        style={{ 
          cursor: 'pointer',
          backgroundColor: openSection === 1 ? '#f8f9fa' : 'white',
          borderBottom: openSection === 1 ? '1px solid #dee2e6' : 'none'
        }}
        onClick={() => handleSectionToggle(1)}
      >
        <h5 className="mb-0">
          <i className="bi bi-geo-alt me-2" style={{ color: '#0d6efd' }}></i>
          Paso 1: Selecciona Ruta
          {rutaSeleccionada && (
            <span className="badge bg-success ms-3">
              <i className="bi bi-check-circle-fill me-1"></i>
              Completado
            </span>
          )}
        </h5>
        <div className="d-flex align-items-center gap-2">
          {!rutaSeleccionada && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                refrescarTarifas();
              }}
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
          )}
          <button
            type="button"
            className="btn btn-link text-decoration-none p-0"
            style={{ fontSize: '1.5rem' }}
          >
            <i className={`bi bi-chevron-${openSection === 1 ? 'up' : 'down'}`}></i>
          </button>
        </div>
      </div>

      {openSection === 1 && (
        <div className="card-body">
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
                  {/* Header mejorado */}
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0 d-flex align-items-center gap-2">
                      <i className="bi bi-boxes"></i>
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
                                ? 'border-success border-2 shadow-lg' 
                                : 'border-0 shadow-sm'
                            }`}
                            style={{ 
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              transform: rutaSeleccionada?.id === ruta.id ? 'translateY(-4px)' : 'none'
                            }}
                            onClick={() => {
                              // Verificar si la tarifa OF W/M es 0
                              if (ruta.ofWM === 0) {
                                setShowPriceZeroModal(true);
                                return;
                              }
                              setRutaSeleccionada(ruta);
                              setError(null);
                              setResponse(null);
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
                            {/* Badge de "Mejor Opción" */}
                            {index === 0 && (
                              <div 
                                className="position-absolute top-0 end-0 badge bg-warning text-dark"
                                style={{ 
                                  borderTopRightRadius: '0.375rem',
                                  borderBottomLeftRadius: '0.375rem',
                                  fontSize: '0.7rem',
                                  zIndex: 1
                                }}
                              >
                                <i className="bi bi-star-fill"></i> Mejor Opción
                              </div>
                            )}

                            <div className="card-body">
                              {/* Header del operador con logo */}
                              <div className="d-flex justify-content-between align-items-start mb-3">
                                <div className="d-flex align-items-center gap-2">
                                  {/* Logo del operador */}
                                  <div 
                                    className="rounded bg-white border p-2 d-flex align-items-center justify-content-center"
                                    style={{ 
                                      width: '50px', 
                                      height: '50px',
                                      minWidth: '50px',
                                      overflow: 'hidden'
                                    }}
                                  >
                                    <img 
                                      src={`/logoscarrierlcl/${ruta.operador.toLowerCase().replace(/\s+/g, '_')}.png`}
                                      alt={ruta.operador}
                                      style={{ 
                                        maxWidth: '150%', 
                                        maxHeight: '150%',
                                        objectFit: 'contain'
                                      }}
                                      onError={(e) => {
                                        const target = e.currentTarget;
                                        target.style.display = 'none';
                                        const parent = target.parentElement;
                                        if (parent) {
                                          parent.innerHTML = '<i class="bi bi-boxes text-primary fs-4"></i>';
                                        }
                                      }}
                                    />
                                  </div>
                                  
                                  <div>
                                    <span className="badge bg-primary bg-opacity-10 text-primary border border-primary">
                                      {ruta.operador}
                                    </span>
                                  </div>
                                </div>
                                
                                {rutaSeleccionada?.id === ruta.id && (
                                  <span className="badge bg-success">
                                    <i className="bi bi-check-circle-fill"></i> Seleccionada
                                  </span>
                                )}
                              </div>

                              {/* Precio destacado */}
                              <div className="mb-3 p-3 bg-light rounded">
                                <small className="text-muted text-uppercase d-block mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                                  Tarifa OF W/M
                                </small>
                                <div className="d-flex align-items-baseline gap-1">
                                  <h4 className="mb-0 text-success fw-bold">
                                    {ruta.currency} {(ruta.ofWM * 1.15).toFixed(2)}
                                  </h4>
                                  <small className="text-muted">/W/M</small>
                                </div>
                              </div>

                              {/* Detalles en grid */}
                              <div className="row g-2">
                                {ruta.servicio && (
                                  <div className="col-12">
                                    <div className="d-flex align-items-center gap-2 p-2 bg-white rounded border">
                                      <i className="bi bi-truck text-primary"></i>
                                      <div className="flex-grow-1">
                                        <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>
                                          Servicio
                                        </small>
                                        <small className="fw-semibold">{ruta.servicio}</small>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {ruta.ttAprox && (
                                  <div className="col-12">
                                    <div className="d-flex align-items-center gap-2 p-2 bg-white rounded border">
                                      <i className="bi bi-clock text-primary"></i>
                                      <div className="flex-grow-1">
                                        <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>
                                          Transit Time
                                        </small>
                                        <small className="fw-semibold">{ruta.ttAprox}</small>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {ruta.frecuencia && (
                                  <div className="col-12">
                                    <div className="d-flex align-items-center gap-2 p-2 bg-white rounded border">
                                      <i className="bi bi-calendar-check text-primary"></i>
                                      <div className="flex-grow-1">
                                        <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>
                                          Frecuencia
                                        </small>
                                        <small className="fw-semibold">{ruta.frecuencia}</small>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {ruta.agente && (
                                  <div className="col-12">
                                    <div className="d-flex align-items-center gap-2 p-2 bg-white rounded border">
                                      <i className="bi bi-building text-primary"></i>
                                      <div className="flex-grow-1">
                                        <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>
                                          Agente
                                        </small>
                                        <small className="fw-semibold">{ruta.agente}</small>
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

                  {/* Footer informativo */}
                  {rutasFiltradas.length > 0 && (
                    <div className="alert alert-light border-0 mt-3">
                      <small className="text-muted">
                        <i className="bi bi-info-circle"></i> Las tarifas son referenciales y pueden variar según volumen y servicios adicionales
                      </small>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Resumen colapsado cuando está cerrado */}
      {openSection !== 1 && rutaSeleccionada && (
        <div className="card-body py-2 bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <small className="text-muted d-block">Ruta seleccionada:</small>
              <strong>{rutaSeleccionada.pol} → {rutaSeleccionada.pod}</strong>
              <span className="ms-3 text-muted">|</span>
              <span className="ms-2 badge bg-primary">{rutaSeleccionada.operador}</span>
            </div>
            <div>
              <span className="badge bg-success" style={{ fontSize: '0.9rem' }}>
                {rutaSeleccionada.currency} {(rutaSeleccionada.ofWM * 1.15).toFixed(2)}/W/M
              </span>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* ============================================================================ */}
      {/* SECCIÓN 2: DATOS DEL COMMODITY */}
      {/* ============================================================================ */}

      {rutaSeleccionada && (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="card-title mb-4">Paso 2: Datos del Commodity</h5>

            {/* Formulario */}
            <div className="row g-3">
              {/* Sección de Piezas */}
              <div className="col-12">
                <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                  <h6 className="mb-0" style={{ fontSize: '1.05rem', fontWeight: 500, color: '#1a1a1a' }}>
                    <i className="bi bi-boxes me-2" style={{ color: '#0d6efd' }}></i>
                    Detalles de las Piezas
                  </h6>
                  <span className="badge bg-light text-dark" style={{ fontSize: '0.8rem' }}>
                    {piecesData.length} {piecesData.length === 1 ? 'pieza' : 'piezas'}
                  </span>
                </div>

                <div className="mb-3">
                  {piecesData.map((piece, index) => (
                    <PieceAccordionLCL
                      key={piece.id}
                      piece={piece}
                      index={index}
                      isOpen={openAccordions.includes(piece.id)}
                      onToggle={() => handleToggleAccordion(piece.id)}
                      onRemove={() => handleRemovePiece(piece.id)}
                      onUpdate={(field, value) => handleUpdatePiece(piece.id, field, value)}
                      packageTypes={packageTypeOptions.map(opt => ({ id: String(opt.id), name: opt.name }))}
                      canRemove={piecesData.length > 1}
                    />
                  ))}
                </div>

                <div className="d-flex justify-content-end">
                  <button
                    type="button"
                    className="btn"
                    style={{
                      backgroundColor: '#0d6efd',
                      borderColor: '#0d6efd',
                      color: 'white',
                      borderRadius: '8px',
                      padding: '0.5rem 1.25rem',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0b5ed7'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0d6efd'}
                    onClick={handleAddPiece}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Agregar Pieza Adicional
                  </button>
                </div>
              </div>

              {/* Resumen de Totales - Solo cuando hay múltiples piezas */}
              {piecesData.length > 1 && (
                <div className="col-12">
                  <div className="alert alert-secondary">
                    <h6 className="mb-2">Resumen Total de Carga</h6>
                    <div className="row">
                      <div className="col-md-3">
                        <small><strong>Peso Total:</strong> {totalWeightKg.toFixed(2)} kg</small>
                      </div>
                      <div className="col-md-3">
                        <small><strong>Peso (Toneladas):</strong> {totalWeightTons.toFixed(4)} t</small>
                      </div>
                      <div className="col-md-3">
                        <small><strong>Volumen Total:</strong> {totalVolume.toFixed(4)} m³</small>
                      </div>
                      <div className="col-md-3">
                        <small><strong>W/M Chargeable:</strong> {chargeableVolume.toFixed(4)}</small>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="col-md-6">
                <label className="form-label">Incoterm</label>
                <select
                  className="form-select"
                  value={incoterm}
                  onChange={(e) => setIncoterm(e.target.value as 'EXW' | 'FOB' | '')}
                >
                  <option value="">Seleccione un Incoterm</option>
                  <option value="EXW">Ex Works [EXW]</option>
                  <option value="FOB">FOB</option>
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
            </div>

            {/* Cálculos */}
            <div className="mt-4 p-3 border rounded" style={{ backgroundColor: '#f8f9fa' }}>
              <h6 className="mb-3">Cálculos y resumen total</h6>
              <div className="row g-2" style={{ fontSize: '0.9rem' }}>
                <div className="col-md-3">
                  <strong>Peso Total:</strong> {totalWeightKg.toFixed(2)} kg ({totalWeightTons.toFixed(4)} t)
                </div>
                <div className="col-md-3">
                  <strong>Volumen Total:</strong> {totalVolume.toFixed(4)} m³
                </div>
                <div className="col-md-3">
                  <strong>W/M Chargeable:</strong> {chargeableVolume.toFixed(4)}
                </div>
                <div className="col-md-3">
                  <strong>Cobro por:</strong> {totalWeightTons > totalVolume ? 'Peso' : 'Volumen'}
                </div>
                <div className="col-12 mt-3 pt-3 border-top">
                  <strong className="text-primary">W/M Chargeable:</strong>{' '}
                  <span className="text-primary fw-bold fs-5">{chargeableVolume.toFixed(3)}</span>
                  {' '}({chargeableVolume === totalWeightTons ? 'PESO' : 'VOLUMEN'})
                </div>
                
                {tarifaOceanFreight && (
                <div className="col-12 mt-3 pt-3 border-top">
                  <h6 className="mb-3">Resumen de Cargos</h6>
                  
                  <div className="bg-light rounded p-3">
                    {/* BL */}
                    <div className="d-flex justify-content-between mb-2">
                      <span>BL:</span>
                      <strong>{rutaSeleccionada.currency} 60.00</strong>
                    </div>
                    
                    {/* Handling */}
                    <div className="d-flex justify-content-between mb-2">
                      <span>Handling:</span>
                      <strong>{rutaSeleccionada.currency} 45.00</strong>
                    </div>
                    
                    {/* EXW - Solo si aplica */}
                    {incoterm === 'EXW' && (
                      <div className="d-flex justify-content-between mb-2">
                        <span>EXW Charges ({piecesData.length} piezas):</span>
                        <strong>{rutaSeleccionada.currency} {calculateEXWRate().toFixed(2)}</strong>
                      </div>
                    )}
                    
                    {/* Ocean Freight */}
                    <div className="d-flex justify-content-between mb-3 pb-3 border-bottom">
                      <span>
                        Ocean Freight ({chargeableVolume.toFixed(2)} m³):
                      </span>
                      <strong className="text-success">
                        {rutaSeleccionada.currency} {tarifaOceanFreight.income.toFixed(2)}
                      </strong>
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
                    
                    {/* Total */}
                    <div className="d-flex justify-content-between">
                      <span className="fs-5 fw-bold">TOTAL:</span>
                      <span className="fs-5 fw-bold text-success">
                        {rutaSeleccionada.currency}{' '}
                        {(
                          60 + // BL
                          45 + // Handling
                          (incoterm === 'EXW' ? calculateEXWRate() : 0) + // EXW
                          tarifaOceanFreight.income + // Ocean Freight
                          (seguroActivo ? calculateSeguro() : 0) // Seguro (si está activo)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
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
              <h5 className="card-title mb-4">Generar Cotización</h5>

              <button
                onClick={testAPI}
                disabled={loading || !accessToken || !incoterm || (incoterm === 'EXW' && (!pickupFromAddress || !deliveryToAddress))}
                className="btn btn-lg btn-success w-100"
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Generando...
                  </>
                ) : (
                  <>Generar Cotización LCL</>
                )}
              </button>

              {!accessToken && (
                <div className="alert alert-danger mt-3 mb-0">
                  ⚠️ No hay token de acceso. Asegúrate de estar autenticado.
                </div>
              )}

              {!incoterm && rutaSeleccionada && (
                <div className="alert alert-info mt-3 mb-0">
                  ℹ️ Debes seleccionar un Incoterm antes de generar la cotización
                </div>
              )}

              {incoterm === 'EXW' && (!pickupFromAddress || !deliveryToAddress) && (
                <div className="alert alert-warning mt-3 mb-0">
                  ⚠️ Debes completar las direcciones de Pickup y Delivery para el Incoterm EXW
                </div>
              )}
            </div>
          </div>

          {/* Payload
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
          </div> */}
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

      {/* Modal para rutas con tarifa OF W/M en 0 */}
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

      {/* Modal de advertencia - Máximo 10 piezas */}
      <Modal show={showMaxPiecesModal} onHide={() => setShowMaxPiecesModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Límite de Piezas Alcanzado</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>El sistema permite un máximo de 10 piezas por cotización.</p>
          <p className="mb-0">Si necesita cotizar más de 10 piezas, por favor contacte a su ejecutivo para un análisis personalizado.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowMaxPiecesModal(false)}>
            Entendido
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default QuoteLCL;