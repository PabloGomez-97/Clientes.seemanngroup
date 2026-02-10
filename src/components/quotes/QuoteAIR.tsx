import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { packageTypeOptions } from "./PackageTypes/PiecestypesAIR";
import * as XLSX from "xlsx";
import Select from "react-select";
import { Modal, Button } from "react-bootstrap";
import { PDFTemplateAIR } from "./Pdftemplate/Pdftemplateair";
import {
  generatePDF,
  generatePDFBase64,
  formatDateForFilename,
} from "./Pdftemplate/Pdfutils";
import { useTranslation } from "react-i18next";
import ReactDOM from "react-dom/client";
import {
  GOOGLE_SHEET_CSV_URL,
  type RutaAerea,
  type SelectOption,
  type OutletContext,
  type Currency,
  extractPrice,
  normalize,
  parseCSV,
  capitalize,
  parseAEREO,
  seleccionarTarifaPorPeso,
  type QuoteAIRProps,
  type PieceData,
} from "./Handlers/Air/HandlerQuoteAir";
import { PieceAccordion } from "./Handlers/Air/PieceAccordion";
import "./QuoteAIR.css";

// Props para pre-selección desde ItineraryFinder

function QuoteAPITester({
  preselectedOrigin,
  preselectedDestination,
}: QuoteAIRProps = {}) {
  const { accessToken } = useOutletContext<OutletContext>();
  const { user, token } = useAuth();
  const ejecutivo = user?.ejecutivo;
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Estados para validaciones
  const [weightError, setWeightError] = useState<string | null>(null);
  const [dimensionError, setDimensionError] = useState<string | null>(null);
  const [oversizeError, setOversizeError] = useState<string | null>(null);
  const [heightError, setHeightError] = useState<string | null>(null);
  const [cargoFlightWarning, setCargoFlightWarning] = useState<string | null>(
    null,
  );
  const [lowHeightWarning, setLowHeightWarning] = useState<string | null>(null);

  // Estados para el commodity
  const [overallDimsAndWeight, setOverallDimsAndWeight] = useState(false);
  const [description, setDescription] = useState("Cargamento Aéreo");
  const [incoterm, setIncoterm] = useState<"EXW" | "FCA" | "">("");
  const [pickupFromAddress, setPickupFromAddress] = useState("");
  const [deliveryToAddress, setDeliveryToAddress] = useState("");
  const [manualVolume, setManualVolume] = useState(0.48);
  const [manualWeight, setManualWeight] = useState(100);
  const [selectedPackageType, setSelectedPackageType] = useState(97);
  const [piecesData, setPiecesData] = useState<PieceData[]>([
    {
      id: "1",
      packageType: "",
      description: "",
      length: 0,
      width: 0,
      height: 0,
      weight: 0,
      noApilable: false,
      volume: 0,
      totalVolume: 0,
      volumeWeight: 0,
      totalVolumeWeight: 0,
      totalWeight: 0,
    },
  ]);
  const [openAccordions, setOpenAccordions] = useState<string[]>(["1"]);
  const [showMaxPiecesModal, setShowMaxPiecesModal] = useState(false);
  const [openSection, setOpenSection] = useState<number>(1);

  // Estado para el tipo de acción: cotización u operación
  const [tipoAccion, setTipoAccion] = useState<"cotizacion" | "operacion">(
    "cotizacion",
  );

  // ============================================================================
  // ESTADOS PARA RUTAS AÉREAS
  // ============================================================================

  const [rutas, setRutas] = useState<RutaAerea[]>([]);
  const [loadingRutas, setLoadingRutas] = useState(true);
  const [errorRutas, setErrorRutas] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const [originSeleccionado, setOriginSeleccionado] =
    useState<SelectOption | null>(null);
  const [destinationSeleccionado, setDestinationSeleccionado] =
    useState<SelectOption | null>(null);
  const [rutaSeleccionada, setRutaSeleccionada] = useState<RutaAerea | null>(
    null,
  );

  const [opcionesOrigin, setOpcionesOrigin] = useState<SelectOption[]>([]);
  const [opcionesDestination, setOpcionesDestination] = useState<
    SelectOption[]
  >([]);

  const [carriersActivos, setCarriersActivos] = useState<Set<string>>(
    new Set(),
  );
  const [monedasActivas, setMonedasActivas] = useState<Set<Currency>>(
    new Set(["USD", "EUR", "GBP", "CAD", "CHF", "CLP", "SEK"]),
  );
  const [carriersDisponibles, setCarriersDisponibles] = useState<string[]>([]);

  // Estado para modal de precio 0
  const [showPriceZeroModal, setShowPriceZeroModal] = useState(false);

  // Estado para el seguro opcional
  const [seguroActivo, setSeguroActivo] = useState(false);
  const [valorMercaderia, setValorMercaderia] = useState<string>("");

  // Calcular si hay alguna pieza no apilable
  const noApilableActivo = useMemo(
    () => piecesData.some((piece) => piece.noApilable),
    [piecesData],
  );

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
          throw new Error(
            `Error al cargar datos: ${response.status} ${response.statusText}`,
          );
        }

        const csvText = await response.text();

        // Parsear CSV a array de arrays (similar al formato de XLSX)
        const data = parseCSV(csvText);

        const rutasParsed = parseAEREO(data);
        setRutas(rutasParsed);

        // Extraer origins únicos
        const originsUnicos = Array.from(
          new Set(rutasParsed.map((r) => r.origin)),
        )
          .sort()
          .map((origin) => ({
            value: normalize(origin),
            label: capitalize(origin),
          }));
        setOpcionesOrigin(originsUnicos);

        // Extraer carriers únicos
        const carriersUnicos = Array.from(
          new Set(rutasParsed.map((r) => r.carrier).filter((c) => c !== null)),
        ).sort() as string[];
        setCarriersDisponibles(carriersUnicos);
        setCarriersActivos(new Set(carriersUnicos));

        setLoadingRutas(false);
        setLastUpdate(new Date());
        console.log(
          "Tarifas cargadas exitosamente desde Google Sheets:",
          rutasParsed.length,
          "rutas",
        );
      } catch (err) {
        console.error("Error al cargar datos desde Google Sheets:", err);
        setErrorRutas(
          "No se pudieron cargar las tarifas desde Google Sheets. " +
            "Por favor, verifica tu conexión a internet o contacta al administrador.",
        );
        setLoadingRutas(false);
      }
    };
    cargarRutas();
  }, []);

  // Aplicar preselección cuando se cargan las rutas y hay datos pre-seleccionados
  useEffect(() => {
    if (!loadingRutas && opcionesOrigin.length > 0 && preselectedOrigin) {
      // Buscar el origen en las opciones disponibles
      const originOption = opcionesOrigin.find(
        (opt) => opt.value === preselectedOrigin.value,
      );
      if (originOption) {
        setOriginSeleccionado(originOption);
      }
    }
  }, [loadingRutas, opcionesOrigin, preselectedOrigin]);

  // Aplicar destino pre-seleccionado cuando cambia el origen y hay opciones de destino
  useEffect(() => {
    if (
      originSeleccionado &&
      preselectedDestination &&
      opcionesDestination.length > 0
    ) {
      const destOption = opcionesDestination.find(
        (opt) => opt.value === preselectedDestination.value,
      );
      if (destOption) {
        setDestinationSeleccionado(destOption);
      }
    }
  }, [originSeleccionado, opcionesDestination, preselectedDestination]);

  // Auto-abrir sección 2 cuando se seleccione una ruta
  useEffect(() => {
    if (rutaSeleccionada && openSection === 1) {
      setOpenSection(2);
    }
  }, [rutaSeleccionada]);

  // Función para manejar el toggle de secciones
  const handleSectionToggle = (section: number) => {
    setOpenSection(openSection === section ? 0 : section);
  };

  // ============================================================================
  // FUNCIÓN PARA REFRESCAR TARIFAS MANUALMENTE
  // ============================================================================

  const refrescarTarifas = async () => {
    try {
      setLoadingRutas(true);
      setErrorRutas(null);

      // Fetch del CSV desde Google Sheets con timestamp para evitar caché
      const timestamp = new Date().getTime();
      const response = await fetch(
        `${GOOGLE_SHEET_CSV_URL}&timestamp=${timestamp}`,
      );

      if (!response.ok) {
        throw new Error(
          `Error al cargar datos: ${response.status} ${response.statusText}`,
        );
      }

      const csvText = await response.text();
      const data = parseCSV(csvText);
      const rutasParsed = parseAEREO(data);
      setRutas(rutasParsed);

      // Extraer origins únicos
      const originsUnicos = Array.from(
        new Set(rutasParsed.map((r) => r.origin)),
      )
        .sort()
        .map((origin) => ({
          value: normalize(origin),
          label: capitalize(origin),
        }));
      setOpcionesOrigin(originsUnicos);

      // Extraer carriers únicos
      const carriersUnicos = Array.from(
        new Set(rutasParsed.map((r) => r.carrier).filter((c) => c !== null)),
      ).sort() as string[];
      setCarriersDisponibles(carriersUnicos);
      setCarriersActivos(new Set(carriersUnicos));

      setLoadingRutas(false);
      setLastUpdate(new Date());
      console.log(
        "Tarifas actualizadas exitosamente:",
        rutasParsed.length,
        "rutas",
      );
    } catch (err) {
      console.error("Error al actualizar tarifas:", err);
      setErrorRutas(
        "No se pudieron actualizar las tarifas. Por favor, intenta nuevamente.",
      );
      setLoadingRutas(false);
    }
  };

  // Agregar nueva pieza
  const handleAddPiece = () => {
    if (piecesData.length >= 10) {
      setShowMaxPiecesModal(true);
      return;
    }

    const newId = (piecesData.length + 1).toString();
    const newPiece: PieceData = {
      id: newId,
      packageType: "",
      description: "",
      length: 0,
      width: 0,
      height: 0,
      weight: 0,
      noApilable: false,
      volume: 0,
      totalVolume: 0,
      volumeWeight: 0,
      totalVolumeWeight: 0,
      totalWeight: 0,
    };

    setPiecesData([...piecesData, newPiece]);

    // Abrir la nueva pieza y cerrar otras si ya hay 2 abiertas
    setOpenAccordions((prev) => {
      const newOpen = [...prev, newId];
      return newOpen.length > 2 ? newOpen.slice(-2) : newOpen;
    });
  };

  // Eliminar pieza
  const handleRemovePiece = (id: string) => {
    const filtered = piecesData.filter((p) => p.id !== id);

    // Renumerar las piezas
    const renumbered = filtered.map((piece, index) => ({
      ...piece,
      id: (index + 1).toString(),
    }));

    setPiecesData(renumbered);

    // Actualizar accordions abiertos
    setOpenAccordions((prev) =>
      prev
        .filter((openId) => openId !== id)
        .map((openId, index) => {
          const oldIndex = parseInt(openId) - 1;
          const newIndex = renumbered.findIndex((_, i) => i === oldIndex);
          return newIndex !== -1 ? (newIndex + 1).toString() : openId;
        }),
    );
  };

  // Toggle accordion
  const handleToggleAccordion = (id: string) => {
    setOpenAccordions((prev) => {
      const isOpen = prev.includes(id);

      if (isOpen) {
        // Cerrar
        return prev.filter((openId) => openId !== id);
      } else {
        // Abrir (máximo 2)
        const newOpen = [...prev, id];
        return newOpen.length > 2 ? newOpen.slice(-2) : newOpen;
      }
    });
  };

  // Actualizar campo de una pieza
  const handleUpdatePiece = (
    id: string,
    field: keyof PieceData,
    value: any,
  ) => {
    setPiecesData((prev) =>
      prev.map((piece) =>
        piece.id === id ? { ...piece, [field]: value } : piece,
      ),
    );
  };

  // Calcular totales de todas las piezas
  const calculateTotals = () => {
    const totalRealWeight = piecesData.reduce(
      (sum, piece) => sum + piece.weight,
      0,
    );
    const totalVolumetricWeight = piecesData.reduce(
      (sum, piece) => sum + piece.volumeWeight,
      0,
    );
    const chargeableWeight = Math.max(totalRealWeight, totalVolumetricWeight);

    return {
      totalRealWeight,
      totalVolumetricWeight,
      chargeableWeight,
    };
  };

  // ============================================================================
  // VALIDACIONES DE DIMENSIONES PARA TRANSPORTE AÉREO
  // ============================================================================

  useEffect(() => {
    if (overallDimsAndWeight) {
      // En modo overall, no hay dimensiones específicas, así que limpiamos errores
      setOversizeError(null);
      setHeightError(null);
      setCargoFlightWarning(null);
      setLowHeightWarning(null);
      return;
    }

    let hasOversize = false;
    let hasHeightError = false;
    let hasCargoWarning = false;
    let hasLowHeight = false;

    piecesData.forEach((piece) => {
      // Validar largo o ancho > 300 cm (3m)
      if (piece.length > 300 || piece.width > 300) {
        hasOversize = true;
      }

      // Validar alto > 240 cm (2.4m)
      if (piece.height > 240) {
        hasHeightError = true;
      }

      // Validar alto > 160 cm (1.6m) para vuelos cargueros
      if (piece.height > 160) {
        hasCargoWarning = true;
      }

      // Validar alto < 160 cm para alerta de ejecutivo
      if (piece.height > 0 && piece.height < 160) {
        hasLowHeight = true;
      }
    });

    setOversizeError(hasOversize ? t("QuoteAIR.oversize") : null);
    setHeightError(
      hasHeightError
        ? "El alto supera los 240 cm. Esta carga no puede ser manejada vía aérea."
        : null,
    );
    setCargoFlightWarning(
      hasCargoWarning
        ? "El alto supera los 160 cm. Esta carga requiere vuelos cargueros. Verifique con su ejecutivo si la tarifa seleccionada corresponde a vuelos cargueros."
        : null,
    );
    setLowHeightWarning(
      hasLowHeight
        ? "Para cargas con alto mayor a 160 cm, comuníquese con su ejecutivo para verificar la cotización en vuelo carguero."
        : null,
    );
  }, [piecesData, overallDimsAndWeight]);

  // ============================================================================
  // ACTUALIZAR DESTINATIONS CUANDO CAMBIA ORIGIN
  // ============================================================================

  useEffect(() => {
    if (originSeleccionado) {
      const destinationsParaOrigin = rutas
        .filter((r) => r.originNormalized === originSeleccionado.value)
        .map((r) => r.destination);

      const destinationsUnicos = Array.from(new Set(destinationsParaOrigin))
        .sort()
        .map((dest) => ({
          value: normalize(dest),
          label: capitalize(dest),
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

  const rutasFiltradas = rutas
    .filter((ruta) => {
      if (!originSeleccionado || !destinationSeleccionado) return false;

      const matchOrigin = ruta.originNormalized === originSeleccionado.value;
      const matchDestination =
        ruta.destinationNormalized === destinationSeleccionado.value;

      const matchCarrier = !ruta.carrier || carriersActivos.has(ruta.carrier);
      const matchMoneda = monedasActivas.has(ruta.currency);

      return matchOrigin && matchDestination && matchCarrier && matchMoneda;
    })
    .sort((a, b) => a.priceForComparison - b.priceForComparison);

  // ============================================================================
  // CÁLCULOS AUTOMÁTICOS
  // ============================================================================

  // Cálculo del peso chargeable (para ambos modos)
  const getPesoChargeable = () => {
    if (overallDimsAndWeight) {
      const pesoVolumetricoOverall = manualVolume * 167;
      return Math.max(manualWeight, pesoVolumetricoOverall);
    } else {
      const { chargeableWeight } = calculateTotals();
      return chargeableWeight;
    }
  };

  const pesoChargeable = getPesoChargeable();

  // Calcular peso volumétrico para determinar la unidad de cobro en modo Overall
  const pesoVolumetricoOverall = overallDimsAndWeight ? manualVolume * 167 : 0;

  // Determinar si se cobra por peso o volumen en modo Overall
  const chargeableUnit = overallDimsAndWeight
    ? manualWeight >= pesoVolumetricoOverall
      ? "kg"
      : "kg"
    : "kg";

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
    const valorCarga = parseFloat(valorMercaderia.replace(",", ".")) || 0;

    // Si no hay valor de mercadería ingresado, retornar 0
    if (valorCarga === 0) return 0;

    const { totalRealWeight } = calculateTotals();

    const totalSinSeguro =
      45 + // Handling
      (incoterm === "EXW"
        ? calculateEXWRate(totalRealWeight, pesoChargeable)
        : 0) + // EXW
      30 + // AWB
      Math.max(pesoChargeable * 0.15, 50) + // Airport Transfer
      tarifaAirFreight.precioConMarkup * pesoChargeable; // Air Freight

    return Math.max((valorCarga + totalSinSeguro) * 1.1 * 0.0025, 25);
  };

  // Función para calcular el cobro de no apilable (TOTAL SIN MARKUP * 0.6)
  const calculateNoApilable = (): number => {
    if (!noApilableActivo || !tarifaAirFreight) return 0;

    const { totalRealWeight } = calculateTotals();

    const totalSinMarkup =
      45 + // Handling
      (incoterm === "EXW"
        ? calculateEXWRate(totalRealWeight, pesoChargeable)
        : 0) + // EXW
      30 + // AWB
      Math.max(pesoChargeable * 0.15, 50) + // Airport Transfer
      tarifaAirFreight.precioConMarkup * pesoChargeable + // Air Freight
      (seguroActivo ? calculateSeguro() : 0); // Seguro (si está activo)

    return totalSinMarkup * 0.6;
  };

  // ============================================================================
  // FUNCIÓN DE TEST API
  // ============================================================================

  const testAPI = async (
    tipoAccion: "cotizacion" | "operacion" = "cotizacion",
  ) => {
    if (!rutaSeleccionada) {
      setError("Debes seleccionar una ruta antes de generar la cotización");
      return;
    }

    if (!incoterm) {
      setError("Debes seleccionar un Incoterm antes de generar la cotización");
      return;
    }

    // Validar que todas las piezas tengan tipo de paquete seleccionado
    if (!overallDimsAndWeight) {
      // Modo por piezas: validar que cada pieza tenga packageType
      const piezasSinTipo = piecesData.filter((piece) => !piece.packageType);
      if (piezasSinTipo.length > 0) {
        setError(
          "Debes seleccionar un Tipo de Paquete para todas las piezas antes de generar la cotización",
        );
        return;
      }
    } else {
      // Modo overall: validar que se haya seleccionado un packageType
      if (!selectedPackageType) {
        setError(
          "Debes seleccionar un Tipo de Paquete antes de generar la cotización",
        );
        return;
      }
    }

    if (incoterm === "EXW" && (!pickupFromAddress || !deliveryToAddress)) {
      setError(
        "Debes completar las direcciones de Pickup y Delivery para el Incoterm EXW",
      );
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Obtener el ID máximo de cotización ANTES de crear la nueva
      let previousMaxId = 0;
      try {
        const preRes = await fetch(
          `https://api.linbis.com/Quotes?ConsigneeName=${encodeURIComponent(user?.username || "")}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
          },
        );
        if (preRes.ok) {
          const preData = await preRes.json();
          if (Array.isArray(preData)) {
            previousMaxId = Math.max(
              0,
              ...preData.map((q: any) => Number(q.id) || 0),
            );
          }
          console.log("[QuoteAIR] ID máximo ANTES de crear:", previousMaxId);
        }
      } catch (e) {
        console.warn("[QuoteAIR] No se pudo obtener cotizaciones previas:", e);
      }

      const payload = getTestPayload();

      const res = await fetch("https://api.linbis.com/Quotes/create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      console.log(
        "[QuoteAIR] Respuesta CREATE de Linbis:",
        JSON.stringify(data),
      );
      setResponse(data);

      // Generar PDF después de cotización exitosa
      await generateQuotePDF(tipoAccion, data, previousMaxId);
    } catch (err: any) {
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const generateQuotePDF = async (
    tipoAccionParam: "cotizacion" | "operacion",
    apiResponse?: any,
    previousMaxId?: number,
  ) => {
    try {
      if (!rutaSeleccionada || !tarifaAirFreight) return;

      // Obtener el nombre del packageType
      const packageType = packageTypeOptions.find(
        (opt) => opt.id === selectedPackageType,
      );
      const packageTypeName = packageType ? packageType.name : "CARGA GENERAL";

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
        code: "H",
        description: "HANDLING",
        quantity: 1,
        unit: "Each",
        rate: 45,
        amount: 45,
      });

      // EXW (solo si incoterm es EXW)
      if (incoterm === "EXW") {
        const { totalRealWeight } = calculateTotals();
        // Calcular peso chargeable correctamente
        const chargeableWeightCalc = overallDimsAndWeight
          ? Math.max(manualWeight, manualVolume * 167)
          : Math.max(totalRealWeight, calculateTotals().totalVolumetricWeight);
        const exwRate = calculateEXWRate(totalRealWeight, chargeableWeightCalc);
        pdfCharges.push({
          code: "EC",
          description: "EXW CHARGES",
          quantity: 1,
          unit: "Shipment",
          rate: exwRate,
          amount: exwRate,
        });
      }

      // AWB (Air Waybill)
      pdfCharges.push({
        code: "AWB",
        description: "AWB",
        quantity: 1,
        unit: "Each",
        rate: 30,
        amount: 30,
      });

      // Airport Transfer - Obligatorio
      const chargeableWeightForTransfer = overallDimsAndWeight
        ? Math.max(manualWeight, manualVolume * 167)
        : calculateTotals().chargeableWeight;

      const airportTransferAmount = Math.max(
        50,
        chargeableWeightForTransfer * 0.15,
      );

      pdfCharges.push({
        code: "A/T",
        description: "AIRPORT TRANSFER",
        quantity: chargeableWeightForTransfer,
        unit: "kg",
        rate: 0.15,
        amount: airportTransferAmount,
      });

      // Air Freight - Usar el mismo cálculo que pesoChargeable
      const chargeableWeight = overallDimsAndWeight
        ? Math.max(manualWeight, manualVolume * 167)
        : calculateTotals().chargeableWeight;

      pdfCharges.push({
        code: "AF",
        description: "AIR FREIGHT",
        quantity: chargeableWeight,
        unit: "kg",
        rate: tarifaAirFreight.precioConMarkup,
        amount: tarifaAirFreight.precioConMarkup * chargeableWeight,
      });

      // Seguro (solo si está activo)
      if (seguroActivo) {
        const seguroAmount = calculateSeguro();
        pdfCharges.push({
          code: "S",
          description: "SEGURO",
          quantity: 1,
          unit: "Shipment",
          rate: seguroAmount,
          amount: seguroAmount,
        });
      }

      // No Apilable (solo si está activo)
      if (noApilableActivo) {
        const noApilableAmount = calculateNoApilable();
        pdfCharges.push({
          code: "NA",
          description: "NO APILABLE",
          quantity: 1,
          unit: "Shipment",
          rate: noApilableAmount,
          amount: noApilableAmount,
        });
      }

      // Calcular total
      const totalCharges = pdfCharges.reduce(
        (sum, charge) => sum + charge.amount,
        0,
      );

      // Crear un contenedor temporal para renderizar el PDF
      const tempDiv = document.createElement("div");
      tempDiv.style.position = "absolute";
      tempDiv.style.left = "-9999px";
      document.body.appendChild(tempDiv);

      // Renderizar el template del PDF
      const root = ReactDOM.createRoot(tempDiv);

      await new Promise<void>((resolve) => {
        const { totalRealWeight, chargeableWeight } = calculateTotals();
        const totalVolumePieces = piecesData.reduce(
          (sum, piece) => sum + piece.totalVolume,
          0,
        );

        root.render(
          <PDFTemplateAIR
            customerName={user?.username || "Customer"}
            origin={rutaSeleccionada.origin}
            destination={rutaSeleccionada.destination}
            effectiveDate={new Date().toLocaleDateString()}
            expirationDate={new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000,
            ).toLocaleDateString()}
            incoterm={incoterm}
            pickupFromAddress={
              incoterm === "EXW" ? pickupFromAddress : undefined
            }
            deliveryToAddress={
              incoterm === "EXW" ? deliveryToAddress : undefined
            }
            salesRep={ejecutivo?.nombre || "Ignacio Maldonado"}
            pieces={piecesData.length}
            packageTypeName={packageTypeName}
            length={overallDimsAndWeight ? 0 : piecesData[0]?.length || 0}
            width={overallDimsAndWeight ? 0 : piecesData[0]?.width || 0}
            height={overallDimsAndWeight ? 0 : piecesData[0]?.height || 0}
            description={description}
            totalWeight={overallDimsAndWeight ? manualWeight : totalRealWeight}
            totalVolume={
              overallDimsAndWeight ? manualVolume : totalVolumePieces
            }
            chargeableWeight={chargeableWeight}
            weightUnit="kg"
            volumeUnit="m³"
            charges={pdfCharges}
            totalCharges={totalCharges}
            currency={rutaSeleccionada.currency}
            overallMode={overallDimsAndWeight}
            piecesData={overallDimsAndWeight ? [] : piecesData}
          />,
        );

        // Esperar a que el DOM se actualice
        setTimeout(resolve, 500);
      });

      // Generar el PDF
      const pdfElement = tempDiv.querySelector("#pdf-content") as HTMLElement;
      console.log("[QuoteAIR] pdfElement encontrado:", !!pdfElement);
      if (pdfElement) {
        const filename = `Cotizacion_${user?.username || "Cliente"}_${formatDateForFilename(new Date())}.pdf`;

        // Generar base64 del PDF para guardarlo en MongoDB
        console.log("[QuoteAIR] Generando base64...");
        const pdfBase64 = await generatePDFBase64(pdfElement);
        console.log("[QuoteAIR] Base64 generado, longitud:", pdfBase64?.length);

        // Descargar el PDF localmente
        await generatePDF({ filename, element: pdfElement });
        console.log("[QuoteAIR] PDF descargado localmente");

        // Subir el PDF a MongoDB usando el quoteNumber de Linbis
        if (pdfBase64) {
          try {
            console.log(
              "[QuoteAIR] Buscando cotización recién creada (id mayor a",
              previousMaxId,
              ")...",
            );
            let quoteNumber = "";

            // Esperar 2s y buscar la cotización con id más alto
            await new Promise((r) => setTimeout(r, 2000));

            const linbisRes = await fetch(
              `https://api.linbis.com/Quotes?ConsigneeName=${encodeURIComponent(user?.username || "")}`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  Accept: "application/json",
                },
              },
            );

            if (linbisRes.ok) {
              const linbisData = await linbisRes.json();
              if (Array.isArray(linbisData) && linbisData.length > 0) {
                // Encontrar la cotización con el id más alto (la más nueva)
                const newestQuote = linbisData.reduce(
                  (max: any, q: any) =>
                    (Number(q.id) || 0) > (Number(max.id) || 0) ? q : max,
                  linbisData[0],
                );

                console.log(
                  `[QuoteAIR] Cotización con ID más alto: number=${newestQuote.number}, id=${newestQuote.id}`,
                );

                if (Number(newestQuote.id) > (previousMaxId || 0)) {
                  quoteNumber = newestQuote.number;
                  console.log(
                    `✅ [QuoteAIR] NUEVA COTIZACIÓN CONFIRMADA: ${quoteNumber}`,
                  );
                } else {
                  console.warn(
                    "[QuoteAIR] No se encontró cotización con id mayor a",
                    previousMaxId,
                  );
                }
              }
            }

            if (quoteNumber) {
              const uploadRes = await fetch("/api/quote-pdf/upload", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  quoteNumber,
                  nombreArchivo: filename,
                  contenidoBase64: pdfBase64,
                  tipoServicio: "AIR",
                  origen: rutaSeleccionada.origin,
                  destino: rutaSeleccionada.destination,
                }),
              });
              const uploadData = await uploadRes.json();
              console.log(
                "[QuoteAIR] PDF guardado en MongoDB:",
                uploadRes.status,
                uploadData,
              );
            } else {
              console.warn(
                "[QuoteAIR] No se pudo detectar cotización nueva, PDF no subido",
              );
            }
          } catch (uploadErr) {
            console.error("Error subiendo PDF a MongoDB:", uploadErr);
          }
        } else {
          console.warn("[QuoteAIR] No se generó base64 del PDF");
        }
      }

      // Limpiar
      root.unmount();
      document.body.removeChild(tempDiv);

      // Enviar notificación por email al ejecutivo
      try {
        const total = rutaSeleccionada.currency + " " + totalCharges.toFixed(2);
        const emailRes = await fetch("/api/send-operation-email", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ejecutivoEmail: ejecutivo?.email,
            ejecutivoNombre: ejecutivo?.nombre,
            clienteNombre: user?.nombreuser,
            tipoServicio: "Aéreo",
            origen: rutaSeleccionada.origin,
            destino: rutaSeleccionada.destination,
            carrier: rutaSeleccionada.carrier,
            precio: tarifaAirFreight.precioConMarkup * chargeableWeight,
            currency: rutaSeleccionada.currency,
            total: total,
            tipoAccion: tipoAccionParam,
            quoteId: (apiResponse || response)?.quote?.id,
          }),
        });
        if (!emailRes.ok) {
          console.error("Error sending email");
        }
      } catch (emailErr) {
        console.error("Error enviando notificación por correo:", emailErr);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
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
          code: "H",
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
            name: user?.username,
          },
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any,
          },
          reference: "Amount to Handling",
          showOnDocument: true,
          notes: "Handling charge created via Client Portal",
        },
        expense: {
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any,
          },
        },
      });

      // Cobro de EXW (solo si incoterm es EXW)
      if (incoterm === "EXW") {
        const { totalRealWeight, totalVolumetricWeight } = calculateTotals();
        charges.push({
          service: {
            id: 271,
            code: "EC",
          },
          income: {
            quantity: 1,
            unit: "EXW CHARGES",
            rate: calculateEXWRate(totalRealWeight, totalVolumetricWeight),
            amount: calculateEXWRate(totalRealWeight, totalVolumetricWeight),
            showamount: calculateEXWRate(
              totalRealWeight,
              totalVolumetricWeight,
            ),
            payment: "Prepaid",
            billApplyTo: "Other",
            billTo: {
              name: user?.username,
            },
            currency: {
              abbr: (rutaSeleccionada.currency || "USD") as any,
            },
            reference: "Amount to EXW Charges",
            showOnDocument: true,
            notes: "EXW charge created via Client Portal",
          },
          expense: {
            currency: {
              abbr: (rutaSeleccionada.currency || "USD") as any,
            },
          },
        });
      }

      // Cobro de AWB
      charges.push({
        service: {
          id: 335,
          code: "AWB",
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
            name: user?.username,
          },
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any,
          },
          reference: "Amount to AWB",
          showOnDocument: true,
          notes: "AWB charge created via Client Portal",
        },
        expense: {
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any,
          },
        },
      });

      // Cobro de Airport Transfer (mínimo 50)
      const airportTransferAmount = Math.max(pesoChargeable * 0.15, 50);
      charges.push({
        service: {
          id: 110936,
          code: "A/T",
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
            name: user?.username,
          },
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any,
          },
          reference: "Amount to AirPort Transfer",
          showOnDocument: true,
          notes: `Airport Transfer charge - 0.15/kg (minimum ${rutaSeleccionada.currency} 50)`,
        },
        expense: {
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any,
          },
        },
      });

      // Cobro de AIR FREIGHT
      charges.push({
        service: {
          id: 4,
          code: "AF",
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
            name: user?.username,
          },
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any,
          },
          reference: "Amount to Air Freight",
          showOnDocument: true,
          notes: `AIR FREIGHT charge - Tarifa: ${tarifaAirFreight.moneda} ${tarifaAirFreight.precio.toFixed(2)}/kg + 15%`,
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
            name: user?.username,
          },
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any,
          },
          reference: "TEST-REF-AIRFREIGHT",
          showOnDocument: true,
          notes: `AIR FREIGHT expense - Tarifa: ${tarifaAirFreight.moneda} ${tarifaAirFreight.precio.toFixed(2)}/kg`,
        },
      });

      // Cobro de SEGURO (solo si está activo)
      if (seguroActivo) {
        const seguroAmount = calculateSeguro();
        charges.push({
          service: {
            id: 111361,
            code: "S",
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
              name: user?.username,
            },
            currency: {
              abbr: (rutaSeleccionada.currency || "USD") as any,
            },
            reference: "Amount to Insurrance",
            showOnDocument: true,
            notes: "Seguro opcional - Protección adicional para la carga",
          },
          expense: {
            currency: {
              abbr: (rutaSeleccionada.currency || "USD") as any,
            },
          },
        });
      }

      // Cobro de NO APILABLE (solo si está activo)
      if (noApilableActivo) {
        const noApilableAmount = calculateNoApilable();
        charges.push({
          service: {
            id: 115954,
            code: "NA",
            description: "NO APILABLE",
          },
          income: {
            quantity: 1,
            unit: "NO APILABLE",
            rate: noApilableAmount,
            amount: noApilableAmount,
            showamount: noApilableAmount,
            payment: "Prepaid",
            billApplyTo: "Other",
            billTo: {
              name: user?.username,
            },
            currency: {
              abbr: (rutaSeleccionada.currency || "USD") as any,
            },
            reference: "Amount to NO STACKEABLE",
            showOnDocument: true,
            notes: "Cargo adicional por carga no apilable",
          },
          expense: {
            currency: {
              abbr: (rutaSeleccionada.currency || "USD") as any,
            },
          },
        });
      }

      return {
        date: new Date().toISOString(),
        validUntil: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        transitDays: 5,
        project: {
          name: "AIR",
        },
        customerReference: "Portal Created [AIR]",
        contact: {
          name: user?.username,
        },
        origin: {
          name: rutaSeleccionada.origin,
        },
        destination: {
          name: rutaSeleccionada.destination,
        },
        modeOfTransportation: {
          id: 8,
        },
        rateCategoryId: 2,
        incoterm: {
          code: incoterm,
          name: incoterm,
        },
        ...(incoterm === "EXW" && {
          pickupFromAddress: pickupFromAddress,
          deliveryToAddress: deliveryToAddress,
        }),
        portOfReceipt: {
          name: rutaSeleccionada.origin,
        },
        shipper: {
          name: user?.username,
        },
        consignee: {
          name: user?.username,
        },
        issuingCompany: {
          name: rutaSeleccionada?.carrier || "Por Confirmar",
        },
        serviceType: {
          name: "Normal",
        },
        salesRep: {
          name: ejecutivo?.nombre || "Ignacio Maldonado",
        },
        commodities: piecesData.map((piece) => ({
          commodityType: "Standard",
          packageType: {
            id: piece.packageType,
          },
          pieces: 1, // Siempre 1 ahora
          description: piece.description,
          weightPerUnitValue: piece.weight,
          weightPerUnitUOM: "kg",
          totalWeightValue: piece.totalWeight,
          totalWeightUOM: "kg",
          lengthValue: piece.length,
          lengthUOM: "cm",
          widthValue: piece.width,
          widthUOM: "cm",
          heightValue: piece.height,
          heightUOM: "cm",
          volumeValue: piece.volume,
          volumeUOM: "m3",
          totalVolumeValue: piece.totalVolume,
          totalVolumeUOM: "m3",
          volumeWeightValue: piece.volumeWeight,
          volumeWeightUOM: "kg",
          totalVolumeWeightValue: piece.totalVolumeWeight,
          totalVolumeWeightUOM: "kg",
        })),
        charges,
      };
    }
    // MODO OVERALL
    else {
      // En modo Overall: el chargeable es el mayor numéricamente entre peso y volumen

      // Cobro de Handling
      charges.push({
        service: {
          id: 162,
          code: "H",
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
            name: user?.username,
          },
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any,
          },
          reference: "Amount to HANDLING to OVERALL",
          showOnDocument: true,
          notes: "Handling charge created via API (Overall mode)",
        },
        expense: {
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any,
          },
        },
      });

      // Cobro de EXW - Usar peso real y volumen sin conversións (solo si incoterm es EXW)
      if (incoterm === "EXW") {
        charges.push({
          service: {
            id: 271,
            code: "EC",
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
              name: user?.username,
            },
            currency: {
              abbr: (rutaSeleccionada.currency || "USD") as any,
            },
            reference: "Amount to EXW CHARGES to OVERALL",
            showOnDocument: true,
            notes: "EXW charge created via API (Overall mode)",
          },
          expense: {
            currency: {
              abbr: (rutaSeleccionada.currency || "USD") as any,
            },
          },
        });
      }

      // Cobro de AWB - Usar peso real y volumen sin conversión
      charges.push({
        service: {
          id: 335,
          code: "AWB",
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
            name: user?.username,
          },
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any,
          },
          reference: "Amount to AWB to OVERALL",
          showOnDocument: true,
          notes: "AWB charge created via API (Overall mode)",
        },
        expense: {
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any,
          },
        },
      });

      // Cobro de Airport Transfer (modo overall) - Mínimo 50
      const pesoChargeableOverall = Math.max(manualWeight, manualVolume * 167);
      const airportTransferAmountOverall = Math.max(
        pesoChargeableOverall * 0.15,
        50,
      );

      charges.push({
        service: {
          id: 110936,
          code: "A/T",
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
            name: user?.username,
          },
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any,
          },
          reference: "Amount to AIRPORT TRANSFER to OVERALL",
          showOnDocument: true,
          notes: "Airport Transfer charge",
        },
        expense: {
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any,
          },
        },
      });

      // Cobro de AIR FREIGHT - NUEVO
      charges.push({
        service: {
          id: 4,
          code: "AF",
        },
        income: {
          quantity: pesoChargeable,
          unit: chargeableUnit === "kg" ? "AIR FREIGHT" : "AIR FREIGHT (CBM)",
          rate: tarifaAirFreight.precioConMarkup,
          amount: pesoChargeable * tarifaAirFreight.precioConMarkup,
          showamount: pesoChargeable * tarifaAirFreight.precioConMarkup,
          payment: "Prepaid",
          billApplyTo: "Other",
          billTo: {
            name: user?.username,
          },
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any,
          },
          reference: "Amount to AIRFREIGHT to OVERALL",
          showOnDocument: true,
          notes: `AIR FREIGHT charge (Overall) - Tarifa: ${tarifaAirFreight.moneda} ${tarifaAirFreight.precio.toFixed(2)}/${chargeableUnit} + 15% - Cobrado por ${chargeableUnit === "kg" ? "peso" : "volumen"}`,
        },
        expense: {
          quantity: pesoChargeable,
          unit: chargeableUnit === "kg" ? "AIR FREIGHT" : "AIR FREIGHT (CBM)",
          rate: tarifaAirFreight.precio,
          amount: pesoChargeable * tarifaAirFreight.precio,
          showamount: pesoChargeable * tarifaAirFreight.precio,
          payment: "Prepaid",
          billApplyTo: "Other",
          billTo: {
            name: user?.username,
          },
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any,
          },
          reference: "Amount to AIRFREIGHT to OVERALL",
          showOnDocument: true,
          notes: `AIR FREIGHT expense (Overall) - Tarifa: ${tarifaAirFreight.moneda} ${tarifaAirFreight.precio.toFixed(2)}/${chargeableUnit} - Cobrado por ${chargeableUnit === "kg" ? "peso" : "volumen"}`,
        },
      });

      // Cobro de SEGURO (solo si está activo) - Overall mode
      if (seguroActivo) {
        const seguroAmount = calculateSeguro();
        charges.push({
          service: {
            id: 111361,
            code: "S",
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
              name: user?.username,
            },
            currency: {
              abbr: (rutaSeleccionada.currency || "USD") as any,
            },
            reference: "Amount to Insurrance to OVERALL",
            showOnDocument: true,
            notes: "Seguro opcional - Protección adicional para la carga",
          },
          expense: {
            currency: {
              abbr: (rutaSeleccionada.currency || "USD") as any,
            },
          },
        });
      }

      return {
        date: new Date().toISOString(),
        validUntil: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        transitDays: 5,
        customerReference: "Portal-Created [AIR-OVERALL]",
        contact: {
          name: user?.username,
        },
        origin: {
          name: rutaSeleccionada.origin,
        },
        destination: {
          name: rutaSeleccionada.destination,
        },
        modeOfTransportation: {
          id: 8,
        },
        rateCategoryId: 2,
        incoterm: {
          code: incoterm,
          name: incoterm,
        },
        ...(incoterm === "EXW" && {
          pickupFromAddress: pickupFromAddress,
          deliveryToAddress: deliveryToAddress,
        }),
        portOfReceipt: {
          name: rutaSeleccionada.origin,
        },
        shipper: {
          name: user?.username,
        },
        consignee: {
          name: user?.username,
        },
        issuingCompany: {
          name: rutaSeleccionada?.carrier || "Por Confirmar",
        },
        serviceType: {
          name: "Overall Dims & Weight",
        },
        salesRep: {
          name: ejecutivo?.nombre || "Ignacio Maldonado",
        },
        commodities: [
          {
            commodityType: "Standard",
            packageType: {
              id: selectedPackageType,
            },
            pieces: 1,
            description: description,
            overallDimsAndWeight: true,
            totalWeightValue: manualWeight,
            totalWeightUOM: "kg",
            totalVolumeValue: manualVolume,
            totalVolumeUOM: "m3",
          },
        ],
        charges,
      };
    }
  };

  // Primero: Rutas SOLO filtradas por origen y destino (sin carriers ni monedas)
  const rutasPorOrigenDestino = useMemo(() => {
    if (!originSeleccionado || !destinationSeleccionado) return [];

    return rutas.filter((ruta) => {
      const matchOrigin = ruta.originNormalized === originSeleccionado.value;
      const matchDestination =
        ruta.destinationNormalized === destinationSeleccionado.value;
      return matchOrigin && matchDestination;
    });
  }, [rutas, originSeleccionado, destinationSeleccionado]);

  // Extraer TODOS los carriers disponibles para origen-destino
  const carriersDisponiblesEnRutas = useMemo(() => {
    const carriers = new Set<string>();
    rutasPorOrigenDestino.forEach((ruta) => {
      if (ruta.carrier) {
        carriers.add(ruta.carrier);
      }
    });
    return Array.from(carriers).sort();
  }, [rutasPorOrigenDestino]);

  // Extraer TODAS las monedas disponibles para origen-destino
  const monedasDisponiblesEnRutas = useMemo(() => {
    const monedas = new Set<Currency>();
    rutasPorOrigenDestino.forEach((ruta) => {
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

    rutasFiltradas.forEach((ruta, index) => {
      // ✅ CORRECTO
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
  }, [rutasFiltradas]); // ✅ CORRECTO

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
    <div className="qa-container">
      <div className="qa-section-header">
        <div>
          <h2 className="qa-title">{t("QuoteAIR.title")}</h2>
          <p className="qa-subtitle">{t("QuoteAIR.subtitle")}</p>
        </div>
      </div>

      {/* ============================================================================ */}
      {/* SECCIÓN 1: SELECCIÓN DE RUTA */}
      {/* ============================================================================ */}

      <div className="qa-card">
        <div
          className={`qa-card-header ${openSection === 1 ? "open" : ""}`}
          onClick={() => handleSectionToggle(1)}
        >
          <div className="d-flex align-items-center">
            <h3>
              <i
                className="bi bi-geo-alt me-2"
                style={{ color: "var(--qa-primary)" }}
              ></i>
              Paso 1: Seleccionar Ruta
            </h3>
            {rutaSeleccionada && (
              <span
                className="qa-badge ms-3"
                style={{
                  backgroundColor: "#d1e7dd",
                  color: "#0f5132",
                  borderColor: "transparent",
                }}
              >
                <i className="bi bi-check-circle-fill me-1"></i>
                Completado
              </span>
            )}
          </div>
          <div className="d-flex align-items-center gap-2">
            {!rutaSeleccionada && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  refrescarTarifas();
                }}
                disabled={loadingRutas}
                className="qa-btn qa-btn-sm qa-btn-outline"
                title="Actualizar tarifas"
              >
                {loadingRutas ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-1"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    {t("QuoteAIR.actualizando")}
                  </>
                ) : (
                  <>
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    {t("QuoteAIR.actualizaciontarifa")}
                  </>
                )}
              </button>
            )}
            <i
              className={`bi bi-chevron-${openSection === 1 ? "up" : "down"}`}
              style={{ color: "var(--qa-text-secondary)" }}
            ></i>
          </div>
        </div>

        {openSection === 1 && (
          <div className="mt-4">
            {lastUpdate && !loadingRutas && !errorRutas && (
              <div
                className="alert alert-light py-2 px-3 mb-3 d-flex align-items-center justify-content-between"
                style={{ fontSize: "0.85rem" }}
              >
                <span className="text-muted">
                  <i className="bi bi-clock-history me-1"></i>
                  {t("QuoteAIR.actualizacion")}{" "}
                  {lastUpdate.toLocaleTimeString("es-CL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="qa-badge bg-success text-white">
                  {rutas.length} {t("QuoteAIR.rutasdisponibles")}
                </span>
              </div>
            )}

            {loadingRutas ? (
              <div className="text-center py-5">
                <div
                  className="spinner-border text-primary"
                  role="status"
                ></div>
                <p className="mt-3 text-muted">{t("QuoteAIR.cargandorutas")}</p>
              </div>
            ) : errorRutas ? (
              <div className="qa-alert qa-alert-danger">
                <i className="bi bi-exclamation-circle-fill mt-1"></i>
                {errorRutas}
              </div>
            ) : (
              <>
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="qa-label">{t("QuoteAIR.Origen")}</label>
                    <Select
                      value={originSeleccionado}
                      onChange={setOriginSeleccionado}
                      options={opcionesOrigin}
                      placeholder={t("QuoteAIR.seleccionaorigen")}
                      isClearable
                      classNamePrefix="qa-react-select"
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderColor: "#e0e0e0",
                          boxShadow: "none",
                          "&:hover": { borderColor: "#b0b0b0" },
                        }),
                      }}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="qa-label">{t("QuoteAIR.Destino")}</label>
                    <Select
                      value={destinationSeleccionado}
                      onChange={setDestinationSeleccionado}
                      options={opcionesDestination}
                      placeholder={
                        originSeleccionado
                          ? t("QuoteAIR.seleccionadestino")
                          : t("QuoteAIR.seleccionaprimerorigen")
                      }
                      isClearable
                      isDisabled={!originSeleccionado}
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderColor: "#e0e0e0",
                          boxShadow: "none",
                          "&:hover": { borderColor: "#b0b0b0" },
                        }),
                      }}
                    />
                  </div>
                </div>

                {originSeleccionado && destinationSeleccionado && (
                  <div className="mt-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0 fw-bold">
                        {t("QuoteAIR.rutasdisponibles1")} (
                        {rutasFiltradas.length})
                      </h6>
                      {rutasFiltradas.length > 0 && (
                        <small className="text-muted">
                          {t("QuoteAIR.seleccionamejor")}
                        </small>
                      )}
                    </div>

                    {rutasFiltradas.length === 0 ? (
                      <div className="text-center py-4 bg-light rounded text-muted">
                        <i className="bi bi-search fs-3 d-block mb-2"></i>
                        <p className="mb-1">{t("QuoteAIR.norutas")}</p>
                        <small>{t("QuotesAIR.intenta")}</small>
                      </div>
                    ) : (
                      <div className="qa-table-container">
                        <table className="qa-table">
                          <thead>
                            <tr>
                              <th style={{ width: "50px" }}></th>
                              <th>Carrier</th>
                              <th className="text-center">1-99kg</th>
                              <th className="text-center">100-299kg</th>
                              <th className="text-center">300-499kg</th>
                              <th className="text-center">500-999kg</th>
                              <th className="text-center">+1000kg</th>
                              <th className="text-center">
                                {t("QuoteAIR.salidas")}
                              </th>
                              <th className="text-center">Válido Hasta</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rutasFiltradas.map((ruta, index) => {
                              const precioKg45 = extractPrice(ruta.kg45);
                              const precioKg100 = extractPrice(ruta.kg100);
                              const precioKg300 = extractPrice(ruta.kg300);
                              const precioKg500 = extractPrice(ruta.kg500);
                              const precioKg1000 = extractPrice(ruta.kg1000);
                              const isSelected =
                                rutaSeleccionada?.id === ruta.id;

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
                                  className={isSelected ? "selected" : ""}
                                >
                                  <td className="text-center">
                                    {isSelected ? (
                                      <i className="bi bi-check-circle-fill text-primary"></i>
                                    ) : (
                                      <i className="bi bi-circle text-muted"></i>
                                    )}
                                    {index === bestPriceRouteIndex && (
                                      <div className="mt-1">
                                        <span
                                          className="qa-badge qa-badge-primary"
                                          title="Mejor precio"
                                        >
                                          <i className="bi bi-star-fill"></i>
                                        </span>
                                      </div>
                                    )}
                                  </td>
                                  <td>
                                    <div className="d-flex align-items-center gap-2">
                                      {ruta.carrier &&
                                      ruta.carrier !== "Por Confirmar" ? (
                                        <img
                                          src={`/logoscarrierair/${ruta.carrier.toLowerCase()}.png`}
                                          alt={ruta.carrier}
                                          style={{
                                            width: "24px",
                                            height: "24px",
                                            objectFit: "contain",
                                          }}
                                          onError={(e) => {
                                            e.currentTarget.style.display =
                                              "none";
                                          }}
                                        />
                                      ) : (
                                        <i className="bi bi-airplane"></i>
                                      )}
                                      <span className="fw-medium">
                                        {ruta.carrier ||
                                          t("QuoteAIR.porconfirmar")}
                                      </span>
                                    </div>
                                  </td>
                                  {[
                                    precioKg45,
                                    precioKg100,
                                    precioKg300,
                                    precioKg500,
                                    precioKg1000,
                                  ].map((price, idx) => (
                                    <td key={idx} className="text-center">
                                      {price > 0 ? (
                                        <div>
                                          <div className="fw-bold fs-7">
                                            {ruta.currency}{" "}
                                            {(price * 1.15).toFixed(2)}
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="text-muted">—</span>
                                      )}
                                    </td>
                                  ))}
                                  <td className="text-center text-muted small">
                                    {ruta.frequency || "—"}
                                  </td>
                                  <td className="text-center text-muted small">
                                    {ruta.validUntil || "—"}
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
              </>
            )}
          </div>
        )}
      </div>

      {/* ============================================================================ */}
      {/* SECCIÓN 2: DATOS DEL CARGAMENTO */}
      {/* ============================================================================ */}

      {rutaSeleccionada && (
        <div className="qa-card">
          <div className="qa-card-header">
            <div>
              <h3>{t("QuoteAIR.datoscargamento")}</h3>
              <p className="qa-subtitle">{t("QuoteAIR.configuredetalles")}</p>
            </div>
          </div>

          <div className="mb-4">
            <div className="qa-switch-container">
              <input
                className="qa-switch-input"
                type="checkbox"
                id="overallSwitch"
                checked={overallDimsAndWeight}
                onChange={(e) => setOverallDimsAndWeight(e.target.checked)}
              />
              <label
                className="qa-label mb-0"
                htmlFor="overallSwitch"
                style={{ cursor: "pointer", flexGrow: 1 }}
              >
                <div className="d-flex align-items-center">
                  <i
                    className="bi bi-calculator me-2"
                    style={{ fontSize: "1.2rem" }}
                  ></i>
                  <div>
                    <span className="d-block text-dark">
                      {t("QuoteAIR.overall")}
                    </span>
                    <small className="text-muted fw-normal">
                      {t("QuoteAIR.ingresomanual")}
                    </small>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="qa-form-group mb-4">
            <label className="qa-label">
              <i className="bi bi-flag me-2"></i>
              Incoterm <span className="text-danger">*</span>
            </label>
            <select
              className="qa-select"
              value={incoterm}
              onChange={(e) =>
                setIncoterm(e.target.value as "EXW" | "FCA" | "")
              }
              style={{ maxWidth: "300px" }}
            >
              <option value="">{t("QuoteAIR.incoterm")}</option>
              <option value="EXW">Ex Works [EXW]</option>
              <option value="FCA">Free Carrier [FCA]</option>
            </select>
          </div>

          {incoterm === "EXW" && (
            <div className="qa-grid-2 mb-4 bg-light p-3 rounded border">
              <div>
                <label className="qa-label">
                  <i className="bi bi-geo-alt me-1"></i>
                  {t("QuoteAIR.pickup")}
                </label>
                <textarea
                  className="qa-input"
                  value={pickupFromAddress}
                  onChange={(e) => setPickupFromAddress(e.target.value)}
                  placeholder="Ingrese dirección de recogida"
                  rows={2}
                />
              </div>
              <div>
                <label className="qa-label">
                  <i className="bi bi-geo-alt me-1"></i>
                  {t("QuoteAIR.delivery")}
                </label>
                <textarea
                  className="qa-input"
                  value={deliveryToAddress}
                  onChange={(e) => setDeliveryToAddress(e.target.value)}
                  placeholder="Ingrese dirección de entrega"
                  rows={2}
                />
              </div>
            </div>
          )}

          {!overallDimsAndWeight && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="fs-6 fw-bold mb-0">
                  <i className="bi bi-boxes me-2"></i>
                  {t("QuoteAIR.detalles")}
                </h4>
                <span className="qa-badge">
                  {piecesData.length}{" "}
                  {piecesData.length === 1
                    ? t("QuoteAIR.pieza")
                    : t("QuoteAIR.piezas")}
                </span>
              </div>

              <div className="mb-3">
                {piecesData.map((piece, index) => (
                  <PieceAccordion
                    key={piece.id}
                    piece={piece}
                    index={index}
                    isOpen={openAccordions.includes(piece.id)}
                    onToggle={() => handleToggleAccordion(piece.id)}
                    onRemove={() => handleRemovePiece(piece.id)}
                    onUpdate={(field, value) =>
                      handleUpdatePiece(piece.id, field, value)
                    }
                    packageTypes={packageTypeOptions.map((opt) => ({
                      id: String(opt.id),
                      name: opt.name,
                    }))}
                    canRemove={piecesData.length > 1}
                  />
                ))}
              </div>

              <div className="d-flex justify-content-end">
                <button
                  type="button"
                  className="qa-btn qa-btn-primary"
                  onClick={handleAddPiece}
                >
                  <i className="bi bi-plus-lg"></i>
                  {t("QuoteAIR.agregarpieza")}
                </button>
              </div>

              {/* Alertas de restricciones */}
              <div className="mt-4">
                {oversizeError && (
                  <div className="qa-alert qa-alert-warning">
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    <div>
                      <strong>{t("QuoteAIR.cargaoversize")}:</strong>{" "}
                      {oversizeError}
                    </div>
                  </div>
                )}
                {heightError && (
                  <div className="qa-alert qa-alert-danger">
                    <i className="bi bi-x-circle-fill"></i>
                    <div>
                      <strong>{t("QuoteAIR.noaptaparaereo")}:</strong>{" "}
                      {heightError}
                    </div>
                  </div>
                )}
                {cargoFlightWarning && (
                  <div className="qa-alert qa-alert-warning">
                    <i className="bi bi-airplane-fill"></i>
                    <div>
                      <strong>
                        {t("QuoteAIR.vueloscarguerosrequeridos")}:
                      </strong>{" "}
                      {cargoFlightWarning}
                    </div>
                  </div>
                )}
                {lowHeightWarning && (
                  <div className="qa-alert qa-alert-warning">
                    <i className="bi bi-info-circle-fill"></i>
                    <div>
                      <strong>{t("QuoteAIR.verificacion")}</strong>{" "}
                      {lowHeightWarning}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {overallDimsAndWeight && (
            <div className="qa-grid-2 mt-3 p-3 bg-light rounded border">
              <div>
                <label className="qa-label">
                  <i className="bi bi-box-seam me-1"></i>
                  {t("QuoteAIR.pesototal")}
                </label>
                <input
                  type="number"
                  className={`qa-input ${weightError ? "is-invalid" : ""}`} // Keep is-invalid for helper text if needed, or style it
                  value={manualWeight}
                  onChange={(e) => {
                    const newManualWeight = Number(e.target.value);
                    setManualWeight(newManualWeight);
                    if (newManualWeight > 2000) {
                      setWeightError("El peso total no puede exceder 2000 kg");
                    } else {
                      setWeightError(null);
                    }
                  }}
                  min="0"
                  step="0.01"
                />
                <small className="text-muted d-block mt-1">
                  {t("QuoteAIR.descripcionpeso")}
                </small>
                {weightError && (
                  <div className="text-danger small mt-1">{weightError}</div>
                )}
              </div>

              <div>
                <label className="qa-label">
                  <i className="bi bi-rulers me-1"></i>
                  {t("QuoteAIR.volumentotal")}
                </label>
                <input
                  type="number"
                  className="qa-input"
                  value={manualVolume}
                  onChange={(e) => setManualVolume(Number(e.target.value))}
                  min="0"
                  step="0.0001"
                />
                <small className="text-muted d-block mt-1">
                  {t("QuoteAIR.descripcionvolumen")}
                </small>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================================ */}
      {/* SECCIÓN 3: REVISIÓN DE PIEZAS Y COSTOS */}
      {/* ============================================================================ */}

      {rutaSeleccionada && (
        <div className="qa-card">
          <div className="qa-card-header">
            <h3>{t("QuoteAIR.revision")}</h3>
          </div>

          <div className="qa-grid-2 mb-4">
            {/* Resumen de Pesos/Volumen */}
            <div className="p-3 bg-light rounded border">
              <h6 className="fw-bold mb-3">
                <i className="bi bi-box-seam me-2"></i>
                {t("QuoteAIR.resumen")}
              </h6>
              {!overallDimsAndWeight ? (
                (() => {
                  const {
                    totalRealWeight: totalWeight,
                    totalVolumetricWeight: totalVolumeWeight,
                  } = calculateTotals();
                  const totalVolume = piecesData.reduce(
                    (sum, piece) => sum + piece.totalVolume,
                    0,
                  );
                  return (
                    <div className="row g-2 small">
                      <div className="col-6 text-muted">
                        {t("QuoteAIR.volumenpieza")}:
                      </div>
                      <div className="col-6 text-end fw-bold">
                        {(piecesData[0]?.volume ?? 0).toFixed(4)} m³
                      </div>

                      <div className="col-6 text-muted">
                        {t("QuoteAIR.volumenvolpieza")}:
                      </div>
                      <div className="col-6 text-end fw-bold">
                        {(piecesData[0]?.volumeWeight ?? 0).toFixed(2)} kg
                      </div>

                      <div className="col-12 border-top my-2"></div>

                      <div className="col-6 text-muted">
                        {t("QuoteAIR.volumentotal1")}:
                      </div>
                      <div className="col-6 text-end fw-bold">
                        {totalVolume.toFixed(4)} m³
                      </div>

                      <div className="col-6 text-muted">
                        {t("QuoteAIR.pesototal1")}:
                      </div>
                      <div className="col-6 text-end fw-bold">
                        {totalWeight.toFixed(2)} kg
                      </div>

                      <div className="col-6 text-muted">
                        {t("QuoteAIR.pesovoltotal")}:
                      </div>
                      <div className="col-6 text-end fw-bold">
                        {totalVolumeWeight.toFixed(2)} kg
                      </div>

                      <div className="col-6 text-dark fw-bold">
                        {t("QuoteAIR.pesochargeable")}:
                      </div>
                      <div className="col-6 text-end fw-bolder text-primary fs-6">
                        {pesoChargeable.toFixed(2)} kg
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="row g-2 small">
                  <div className="col-6 text-muted">
                    {t("QuoteAIR.volumentotal1")}:
                  </div>
                  <div className="col-6 text-end fw-bold">
                    {manualVolume.toFixed(4)} m³
                  </div>

                  <div className="col-6 text-muted">
                    {t("QuoteAIR.pesototal1")}:
                  </div>
                  <div className="col-6 text-end fw-bold">
                    {manualWeight.toFixed(2)} kg
                  </div>

                  <div className="col-12 border-top my-2"></div>

                  <div className="col-6 text-dark fw-bold">
                    {t("QuoteAIR.chargeable")}:
                  </div>
                  <div className="col-6 text-end fw-bolder text-primary fs-6">
                    {pesoChargeable.toFixed(2)} kg
                  </div>

                  <div
                    className="col-12 text-muted fst-italic mt-1"
                    style={{ fontSize: "0.75rem" }}
                  >
                    ({t("QuoteAIR.cobropor")} {manualWeight.toFixed(2)} kg vs{" "}
                    {(manualVolume * 167).toFixed(2)} kg)
                  </div>
                </div>
              )}
            </div>

            {/* Resumen de Cargos */}
            {tarifaAirFreight && (
              <div className="p-3 bg-light rounded border">
                <h6 className="fw-bold mb-3">
                  <i className="bi bi-cash-coin me-2"></i>
                  {t("QuoteAIR.resumencargos")}
                </h6>

                <div className="d-flex flex-column gap-2 small">
                  <div className="d-flex justify-content-between">
                    <span>Handling:</span>
                    <strong>{rutaSeleccionada.currency} 45.00</strong>
                  </div>

                  {incoterm === "EXW" &&
                    (() => {
                      const { totalRealWeight: totalWeight } =
                        calculateTotals();
                      return (
                        <div className="d-flex justify-content-between">
                          <span>EXW Charges:</span>
                          <strong>
                            {rutaSeleccionada.currency}{" "}
                            {calculateEXWRate(
                              totalWeight,
                              pesoChargeable,
                            ).toFixed(2)}
                          </strong>
                        </div>
                      );
                    })()}

                  <div className="d-flex justify-content-between">
                    <span>AWB:</span>
                    <strong>{rutaSeleccionada.currency} 30.00</strong>
                  </div>

                  <div className="d-flex justify-content-between">
                    <span>Airport Transfer:</span>
                    <strong>
                      {rutaSeleccionada.currency}{" "}
                      {Math.max(pesoChargeable * 0.15, 50).toFixed(2)}
                    </strong>
                  </div>

                  <div className="d-flex justify-content-between pb-2 border-bottom">
                    <span>Air Freight:</span>
                    <strong>
                      {rutaSeleccionada.currency}{" "}
                      {(
                        tarifaAirFreight.precioConMarkup * pesoChargeable
                      ).toFixed(2)}
                    </strong>
                  </div>

                  {/* Seguro opcional */}
                  <div className="mt-2">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="seguroCheckbox"
                        checked={seguroActivo}
                        onChange={(e) => setSeguroActivo(e.target.checked)}
                      />
                      <label
                        className="form-check-label small"
                        htmlFor="seguroCheckbox"
                      >
                        {t("QuoteAIR.agregar")} ({t("QuoteAIR.protection")})
                      </label>
                    </div>
                    {seguroActivo && (
                      <div className="mt-2 ps-4">
                        <input
                          type="text"
                          className="qa-input py-1"
                          style={{ fontSize: "0.85rem" }}
                          placeholder="Valor Mercadería"
                          value={valorMercaderia}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "" || /^[\d,\.]+$/.test(value)) {
                              setValorMercaderia(value);
                            }
                          }}
                        />
                        {calculateSeguro() > 0 && (
                          <div className="d-flex justify-content-between mt-1 text-primary">
                            <span>{t("QuoteAIR.seguro")}:</span>
                            <strong>
                              {rutaSeleccionada.currency}{" "}
                              {calculateSeguro().toFixed(2)}
                            </strong>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {noApilableActivo && calculateNoApilable() > 0 && (
                    <div className="d-flex justify-content-between mt-2 pt-2 border-top text-warning-emphasis">
                      <span>{t("QuoteAIR.noapilable")}:</span>
                      <strong>
                        {rutaSeleccionada.currency}{" "}
                        {calculateNoApilable().toFixed(2)}
                      </strong>
                    </div>
                  )}

                  <div className="d-flex justify-content-between mt-3 pt-2 border-top fs-6">
                    <span className="fw-bold">TOTAL:</span>
                    <span className="fw-bold text-primary">
                      {(() => {
                        const { totalRealWeight: totalWeight } =
                          calculateTotals();
                        const totalBase =
                          45 +
                          (incoterm === "EXW"
                            ? calculateEXWRate(totalWeight, pesoChargeable)
                            : 0) +
                          30 +
                          Math.max(pesoChargeable * 0.15, 50) +
                          tarifaAirFreight.precioConMarkup * pesoChargeable +
                          (seguroActivo ? calculateSeguro() : 0);
                        const totalFinal =
                          totalBase +
                          (noApilableActivo ? calculateNoApilable() : 0);
                        return (
                          rutaSeleccionada.currency +
                          " " +
                          totalFinal.toFixed(2)
                        );
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {(weightError || dimensionError) && (
            <div className="qa-alert qa-alert-warning mt-3">
              <i className="bi bi-exclamation-triangle-fill"></i>
              <div>
                <strong>{t("QuoteAIR.correccion")}</strong>{" "}
                {weightError || dimensionError}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sección de acciones */}
      {rutaSeleccionada && (
        <div className="qa-grid-2 mb-5">
          <div
            className={`qa-card h-100 d-flex flex-column ${!accessToken || weightError || dimensionError || oversizeError || heightError ? "opacity-50" : ""}`}
          >
            <div className="mb-3 text-primary">
              <i className="bi bi-file-earmark-pdf fs-1"></i>
            </div>
            <h5 className="fw-bold">{t("QuoteAIR.generarcotizacion")}</h5>
            <p className="text-muted small mb-4">
              {t("QuoteAIR.cotizaciongenerada")}
            </p>
            <button
              onClick={() => {
                setTipoAccion("cotizacion");
                testAPI("cotizacion");
              }}
              disabled={
                loading ||
                !accessToken ||
                weightError !== null ||
                dimensionError !== null ||
                oversizeError !== null ||
                heightError !== null ||
                !rutaSeleccionada
              }
              className="qa-btn qa-btn-outline w-100 mt-auto"
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm"></span>
              ) : (
                t("QuoteAIR.generarcotizacion")
              )}
            </button>
          </div>

          <div
            className={`qa-card h-100 d-flex flex-column ${!accessToken || weightError || dimensionError || oversizeError || heightError ? "opacity-50" : ""}`}
          >
            <div className="mb-3 text-dark">
              <i className="bi bi-gear fs-1"></i>
            </div>
            <h5 className="fw-bold">{t("QuoteAIR.generaroperacion")}</h5>
            <p className="text-muted small mb-4">
              {t("QuoteAIR.operaciongenerada")}
            </p>
            <button
              onClick={() => {
                setTipoAccion("operacion");
                testAPI("operacion");
              }}
              disabled={
                loading ||
                !accessToken ||
                weightError !== null ||
                dimensionError !== null ||
                oversizeError !== null ||
                heightError !== null ||
                !rutaSeleccionada
              }
              className="qa-btn qa-btn-primary w-100 mt-auto"
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm"></span>
              ) : (
                t("QuoteAIR.generaroperacion")
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error / Success Display (Simplified) */}
      {error && (
        <div className="qa-alert qa-alert-danger mb-4">
          <i className="bi bi-x-circle-fill"></i>
          <div className="w-100">
            <strong>{t("QuoteAIR.error")}</strong>
            <pre
              className="mt-2 bg-white p-2 rounded small text-danger border"
              style={{ maxHeight: "200px", overflow: "auto" }}
            >
              {error}
            </pre>
          </div>
        </div>
      )}

      {response && (
        <div
          className="qa-alert qa-alert-success mb-4"
          style={{
            backgroundColor: "#d4edda",
            color: "#155724",
            borderColor: "#c3e6cb",
          }}
        >
          <i className="bi bi-check-circle-fill"></i>
          <div>
            <strong>{t("QuoteAIR.exito")}</strong>
            <div className="mt-1">{t("QuoteAIR.generarpdf")}</div>
          </div>
        </div>
      )}

      <Modal
        show={showPriceZeroModal}
        onHide={() => setShowPriceZeroModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>{t("QuoteAIR.cotiperso")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">
            <strong>{t("QuoteAIR.rutaanalisis")}</strong>
          </p>
          <p className="mb-0">{t("QuoteAIR.comunicacioneje")}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="primary"
            onClick={() => setShowPriceZeroModal(false)}
          >
            {t("QuoteAIR.entendido")}
          </Button>
        </Modal.Footer>
      </Modal>

      {showMaxPiecesModal && (
        <Modal
          show={showMaxPiecesModal}
          onHide={() => setShowMaxPiecesModal(false)}
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>{t("QuoteAIR.limite")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>{t("QuoteAIR.limitemaximo")}</p>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="primary"
              onClick={() => setShowMaxPiecesModal(false)}
            >
              {t("QuoteAIR.entendido")}
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}

export default QuoteAPITester;
