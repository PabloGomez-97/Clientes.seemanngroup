import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useAuditLog } from "../../hooks/useAuditLog";
import * as XLSX from "xlsx";
import Select from "react-select";
import { packageTypeOptions } from "./PackageTypes/PiecestypesLCL";
import { Modal, Button } from "react-bootstrap";
import { PDFTemplateLCL } from "./Pdftemplate/Pdftemplatelcl";
import {
  generatePDF,
  generatePDFBase64,
  formatDateForFilename,
} from "./Pdftemplate/Pdfutils";
import ReactDOM from "react-dom/client";
import { PieceAccordionLCL } from "./Handlers/LCL/PieceAccordionLCL.tsx";
import { useTranslation } from "react-i18next";
import {
  type PieceData,
  type OutletContext,
  type RutaLCL,
  type SelectOption,
  GOOGLE_SHEET_CSV_URL,
  type Operador,
  capitalize,
  parseCSV,
  getPODDisplayName,
  parseLCL,
} from "./Handlers/LCL/HandlerQuoteLCL.tsx";

interface QuoteLCLProps {
  preselectedPOL?: { value: string; label: string } | null;
  preselectedPOD?: { value: string; label: string } | null;
}

function QuoteLCL({ preselectedPOL, preselectedPOD }: QuoteLCLProps = {}) {
  const { accessToken } = useOutletContext<OutletContext>();
  const token = accessToken;
  const { user, token: jwtToken, activeUsername } = useAuth();
  const ejecutivo = user?.ejecutivo;
  const { t } = useTranslation();
  const { registrarEvento } = useAuditLog();

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

  const [polSeleccionado, setPolSeleccionado] = useState<SelectOption | null>(
    null,
  );
  const [podSeleccionado, setPodSeleccionado] = useState<SelectOption | null>(
    null,
  );
  const [rutaSeleccionada, setRutaSeleccionada] = useState<RutaLCL | null>(
    null,
  );

  const [opcionesPOL, setOpcionesPOL] = useState<SelectOption[]>([]);
  const [opcionesPOD, setOpcionesPOD] = useState<SelectOption[]>([]);

  const [operadoresActivos, setOperadoresActivos] = useState<Set<Operador>>(
    new Set(),
  );
  const [operadoresDisponibles, setOperadoresDisponibles] = useState<
    Operador[]
  >([]);

  // Estado para modal de precio 0
  const [showPriceZeroModal, setShowPriceZeroModal] = useState(false);

  // ============================================================================
  // ESTADOS PARA COMMODITY
  // ============================================================================

  const [description, setDescription] = useState("Cargamento Marítimo LCL");
  const [selectedPackageType, setSelectedPackageType] = useState(97);

  // Estados para incoterm y direcciones
  const [incoterm, setIncoterm] = useState<"EXW" | "FOB" | "">("");
  const [pickupFromAddress, setPickupFromAddress] = useState("");
  const [deliveryToAddress, setDeliveryToAddress] = useState("");

  // Estado para tipo de acción (cotización u operación)
  const [tipoAccion, setTipoAccion] = useState<"cotizacion" | "operacion">(
    "cotizacion",
  );

  // Estados para sistema de piezas
  const [piecesData, setPiecesData] = useState<PieceData[]>([
    {
      id: "1",
      packageType: "",
      description: "",
      length: 0,
      width: 0,
      height: 0,
      weight: 0,
      isNotApilable: false,
      volume: 0,
      totalVolume: 0,
      weightTons: 0,
      totalWeightTons: 0,
      wmChargeable: 0,
    },
  ]);
  const [openAccordions, setOpenAccordions] = useState<string[]>(["1"]);
  const [showMaxPiecesModal, setShowMaxPiecesModal] = useState(false);
  const [openSection, setOpenSection] = useState<number>(1); // Controla qué paso está abierto

  // Estado para el seguro opcional
  const [seguroActivo, setSeguroActivo] = useState(false);
  const [valorMercaderia, setValorMercaderia] = useState<string>("");

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

        // Parsear CSV a array de arrays
        const data = parseCSV(csvText);

        const rutasParsed = parseLCL(data);
        setRutas(rutasParsed);

        // Extraer POLs únicos
        const polMap = new Map<string, string>();
        rutasParsed.forEach((r) => {
          if (!polMap.has(r.polNormalized)) {
            polMap.set(r.polNormalized, r.pol);
          }
        });
        const polsUnicos = Array.from(polMap.entries())
          .map(([normalized, original]) => ({
            value: normalized,
            label: capitalize(original),
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setOpcionesPOL(polsUnicos);

        // Extraer operadores únicos
        const operadoresUnicos = Array.from(
          new Set(rutasParsed.map((r) => r.operador).filter((o) => o)),
        ).sort() as string[];
        setOperadoresDisponibles(operadoresUnicos);
        setOperadoresActivos(new Set(operadoresUnicos));

        setLoadingRutas(false);
        setLastUpdate(new Date());
        console.log(
          "Tarifas LCL cargadas exitosamente desde Google Sheets:",
          rutasParsed.length,
          "rutas",
        );
      } catch (err) {
        console.error("Error al cargar datos LCL desde Google Sheets:", err);
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
    if (!loadingRutas && opcionesPOL.length > 0 && preselectedPOL) {
      // Buscar el POL en las opciones disponibles
      const polOption = opcionesPOL.find(
        (opt) => opt.value === preselectedPOL.value,
      );
      if (polOption) {
        setPolSeleccionado(polOption);
      }
    }
  }, [loadingRutas, opcionesPOL, preselectedPOL]);

  // Aplicar POD pre-seleccionado cuando cambia el POL y hay opciones de POD
  useEffect(() => {
    if (polSeleccionado && preselectedPOD && opcionesPOD.length > 0) {
      const podOption = opcionesPOD.find(
        (opt) => opt.value === preselectedPOD.value,
      );
      if (podOption) {
        setPodSeleccionado(podOption);
      }
    }
  }, [polSeleccionado, opcionesPOD, preselectedPOD]);

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
      const rutasParsed = parseLCL(data);
      setRutas(rutasParsed);

      // Extraer POLs únicos
      const polMap = new Map<string, string>();
      rutasParsed.forEach((r) => {
        if (!polMap.has(r.polNormalized)) {
          polMap.set(r.polNormalized, r.pol);
        }
      });
      const polsUnicos = Array.from(polMap.entries())
        .map(([normalized, original]) => ({
          value: normalized,
          label: capitalize(original),
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
      setOpcionesPOL(polsUnicos);

      // Extraer operadores únicos
      const operadoresUnicos = Array.from(
        new Set(rutasParsed.map((r) => r.operador).filter((o) => o)),
      ).sort() as string[];
      setOperadoresDisponibles(operadoresUnicos);
      setOperadoresActivos(new Set(operadoresUnicos));

      setLoadingRutas(false);
      setLastUpdate(new Date());
      console.log(
        "Tarifas LCL actualizadas exitosamente:",
        rutasParsed.length,
        "rutas",
      );
    } catch (err) {
      console.error("Error al actualizar tarifas LCL:", err);
      setErrorRutas(
        "No se pudieron actualizar las tarifas. Por favor, intenta nuevamente.",
      );
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
      packageType: "",
      description: "",
      length: 0,
      width: 0,
      height: 0,
      weight: 0,
      isNotApilable: false,
      volume: 0,
      totalVolume: 0,
      weightTons: 0,
      totalWeightTons: 0,
      wmChargeable: 0,
    };

    setPiecesData([...piecesData, newPiece]);

    // Abrir la nueva pieza y cerrar otras si ya hay 2 abiertas
    setOpenAccordions((prev) => {
      const newOpen = [...prev, newId];
      return newOpen.length > 2 ? newOpen.slice(-2) : newOpen;
    });
  };

  // Duplicar pieza: clona la pieza indicada (por id) o la última abierta/última pieza
  const handleDuplicatePiece = (fromId?: string) => {
    if (piecesData.length >= 10) {
      setShowMaxPiecesModal(true);
      return;
    }

    setPiecesData((prev) => {
      if (prev.length === 0) return prev;

      // Determinar id origen: desde argumento, o última abierta, o última pieza
      let sourceId = fromId;
      if (!sourceId) {
        sourceId =
          openAccordions.length > 0
            ? openAccordions[openAccordions.length - 1]
            : undefined;
      }
      if (!sourceId) {
        sourceId = prev[prev.length - 1].id;
      }

      const sourceIndex = prev.findIndex((p) => p.id === sourceId);
      const idx = sourceIndex === -1 ? prev.length - 1 : sourceIndex;

      const sourcePiece = prev[idx];
      const newPieceRaw: PieceData = {
        id: "",
        packageType: sourcePiece.packageType,
        description: sourcePiece.description,
        length: sourcePiece.length,
        width: sourcePiece.width,
        height: sourcePiece.height,
        weight: sourcePiece.weight,
        isNotApilable: sourcePiece.isNotApilable,
        volume: sourcePiece.volume,
        totalVolume: sourcePiece.totalVolume,
        weightTons: sourcePiece.weightTons,
        totalWeightTons: sourcePiece.totalWeightTons,
        wmChargeable: sourcePiece.wmChargeable,
      };

      // Insertar nueva pieza justo después de la fuente
      const before = prev.slice(0, idx + 1);
      const after = prev.slice(idx + 1);
      const inserted = [...before, newPieceRaw, ...after];

      // Renumerar IDs
      const renumbered = inserted.map((piece, i) => ({
        ...piece,
        id: (i + 1).toString(),
      }));

      // Actualizar openAccordions para abrir la nueva pieza (limitando a 2 abiertas)
      const newIdStr = (idx + 2).toString(); // posición nueva pieza después de renumeración
      setOpenAccordions((prevOpen) => {
        const newOpen = [...prevOpen, newIdStr];
        return newOpen.length > 2 ? newOpen.slice(-2) : newOpen;
      });

      return renumbered;
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
        .map((openId) => {
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
    const totalWeightKg = piecesData.reduce(
      (sum, piece) => sum + piece.weight,
      0,
    );
    const totalWeightTons = totalWeightKg / 1000; // Convertir kg a toneladas
    const totalVolume = piecesData.reduce(
      (sum, piece) => sum + piece.volume,
      0,
    );
    const chargeableVolume = Math.max(totalWeightTons, totalVolume); // W/M Chargeable

    return {
      totalWeightKg,
      totalWeightTons,
      totalVolume,
      chargeableVolume,
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
      const rutasParaPOL = rutas.filter(
        (r) => r.polNormalized === polSeleccionado.value,
      );

      // Agrupar por podNormalized y obtener el nombre de display preferido
      const podMap = new Map<string, string>();

      rutasParaPOL.forEach((r) => {
        if (!podMap.has(r.podNormalized)) {
          // Usar el nombre de display preferido basado en la normalización
          podMap.set(r.podNormalized, getPODDisplayName(r.podNormalized));
        }
      });

      // Crear opciones únicas ordenadas alfabéticamente
      const podsUnicos = Array.from(podMap.entries())
        .map(([normalized, displayName]) => ({
          value: normalized,
          label: displayName,
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
  const { totalWeightKg, totalWeightTons, totalVolume, chargeableVolume } =
    calculateTotals();
  const totalVolumeWeight = chargeableVolume;

  // Verificar si hay alguna pieza no apilable
  const hasNotApilable = piecesData.some((piece) => piece.isNotApilable);

  // ============================================================================
  // FILTRAR RUTAS
  // ============================================================================

  const rutasFiltradas = rutas
    .filter((ruta) => {
      if (!polSeleccionado || !podSeleccionado) return false;

      const matchPOL = ruta.polNormalized === polSeleccionado.value;
      const matchPOD = ruta.podNormalized === podSeleccionado.value;
      const matchOperador = operadoresActivos.has(ruta.operador);

      return matchPOL && matchPOD && matchOperador;
    })
    .sort((a, b) => a.ofWM - b.ofWM);

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
      currency: rutaSeleccionada.currency,
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
    const valorCarga = parseFloat(valorMercaderia.replace(",", ".")) || 0;

    // Si no hay valor de mercadería ingresado, retornar 0
    if (valorCarga === 0) return 0;

    const totalSinSeguro =
      60 + // BL
      45 + // Handling
      (incoterm === "EXW" ? calculateEXWRate() : 0) + // EXW
      tarifaOceanFreight.income; // Ocean Freight

    return Math.max((valorCarga + totalSinSeguro) * 1.1 * 0.0025, 25);
  };

  // ============================================================================
  // FUNCIÓN DE TEST API
  // ============================================================================

  const testAPI = async (
    tipoAccion: "cotizacion" | "operacion" = "cotizacion",
  ) => {
    if (!rutaSeleccionada) {
      setError(t("QuoteLCL.inforuta"));
      return;
    }

    if (!incoterm) {
      setError(t("QuoteLCL.inforuta1"));
      return;
    }

    if (incoterm === "EXW" && (!pickupFromAddress || !deliveryToAddress)) {
      setError(t("QuoteLCL.inforuta2"));
      return;
    }

    // Validar que todas las piezas tengan tipo de paquete seleccionado
    const piezasSinTipo = piecesData.filter((piece) => !piece.packageType);
    if (piezasSinTipo.length > 0) {
      setError(t("QuoteLCL.inforuta3"));
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
          `https://api.linbis.com/Quotes?ConsigneeName=${encodeURIComponent(activeUsername || "")}`,
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
          console.log("[QuoteLCL] ID máximo ANTES de crear:", previousMaxId);
        }
      } catch (e) {
        console.warn("[QuoteLCL] No se pudo obtener cotizaciones previas:", e);
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
        "[QuoteLCL] Respuesta CREATE de Linbis:",
        JSON.stringify(data),
      );
      setResponse(data);

      // Registrar auditoría
      registrarEvento({
        accion: "COTIZACION_LCL_CREADA",
        categoria: "COTIZACION",
        descripcion: `Cotización LCL creada: ${polSeleccionado?.label || ""} → ${podSeleccionado?.label || ""}`,
        detalles: {
          tipo: tipoAccion,
          pol: polSeleccionado?.label || "",
          pod: podSeleccionado?.label || "",
          operador: rutaSeleccionada?.operador || "",
          incoterm,
        },
      });

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
      if (!rutaSeleccionada) {
        console.error(t("QuoteLCL.inforuta4"));
        return;
      }

      if (!tarifaOceanFreight) {
        console.error(t("QuoteLCL.inforuta5"));
        return;
      }

      // Calcular total para el email
      const subtotalAmount =
        60 + // BL
        45 + // Handling
        (incoterm === "EXW" ? calculateEXWRate() : 0) + // EXW
        tarifaOceanFreight.income + // Ocean Freight
        (seguroActivo ? calculateSeguro() : 0); // Seguro
      const totalAmount = hasNotApilable
        ? subtotalAmount * 1.8
        : subtotalAmount;
      const total = rutaSeleccionada.currency + " " + totalAmount.toFixed(2);

      // Obtener el nombre del packageType
      const packageType = packageTypeOptions.find(
        (opt) => opt.id === selectedPackageType,
      );
      const packageTypeName = packageType
        ? `${packageType.code} - ${packageType.name}`
        : "Standard";

      // Preparar los charges para el PDF
      const pdfCharges: {
        code: string;
        description: string;
        quantity: number;
        unit: string;
        rate: number;
        amount: number;
      }[] = [];

      // BL
      pdfCharges.push({
        code: "B",
        description: "BL",
        quantity: 1,
        unit: "Each",
        rate: 60,
        amount: 60,
      });

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
        const exwRate = calculateEXWRate();
        pdfCharges.push({
          code: "EC",
          description: "EXW CHARGES",
          quantity: piecesData.length,
          unit: "Piece",
          rate: 170,
          amount: exwRate,
        });
      }

      // Ocean Freight
      if (tarifaOceanFreight) {
        pdfCharges.push({
          code: "OF",
          description: "OCEAN FREIGHT",
          quantity: chargeableVolume,
          unit: "W/M",
          rate: rutaSeleccionada.ofWM * 1.15,
          amount: tarifaOceanFreight.income,
        });
      }

      // Seguro (si está activo)
      if (seguroActivo) {
        const seguroAmount = calculateSeguro();
        pdfCharges.push({
          code: "S",
          description: "SEGURO",
          quantity: 1,
          unit: "Each",
          rate: seguroAmount,
          amount: seguroAmount,
        });
      }

      // No Apilable (si hay alguna pieza no apilable)
      if (hasNotApilable) {
        const subtotal =
          60 + // BL
          45 + // Handling
          (incoterm === "EXW" ? calculateEXWRate() : 0) + // EXW
          tarifaOceanFreight.income + // Ocean Freight
          (seguroActivo ? calculateSeguro() : 0); // Seguro
        const adicionalAmount = subtotal * 0.8;
        pdfCharges.push({
          code: "NA",
          description: "NO APILABLE",
          quantity: 1,
          unit: "Each",
          rate: adicionalAmount,
          amount: adicionalAmount,
        });
      }

      // Calcular total
      const totalCharges = pdfCharges.reduce(
        (sum, charge) => sum + charge.amount,
        0,
      );

      // ── 1. Obtener el quoteNumber real de Linbis ANTES de renderizar el PDF ──
      let quoteNumber = "";
      try {
        console.log(
          "[QuoteLCL] Buscando cotización recién creada (id mayor a",
          previousMaxId,
          ")...",
        );
        await new Promise((r) => setTimeout(r, 2000));

        const linbisRes = await fetch(
          `https://api.linbis.com/Quotes?ConsigneeName=${encodeURIComponent(activeUsername || "")}`,
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
            const newestQuote = linbisData.reduce(
              (max: any, q: any) =>
                (Number(q.id) || 0) > (Number(max.id) || 0) ? q : max,
              linbisData[0],
            );
            console.log(
              `[QuoteLCL] Cotización con ID más alto: number=${newestQuote.number}, id=${newestQuote.id}`,
            );
            if (Number(newestQuote.id) > (previousMaxId || 0)) {
              quoteNumber = newestQuote.number;
              console.log(
                `✅ [QuoteLCL] NUEVA COTIZACIÓN CONFIRMADA: ${quoteNumber}`,
              );
            } else {
              console.warn(
                "[QuoteLCL] No se encontró cotización con id mayor a",
                previousMaxId,
              );
            }
          }
        }
      } catch (e) {
        console.warn("[QuoteLCL] Error obteniendo quoteNumber:", e);
      }

      // ── 2. Renderizar el PDF con quoteNumber real ──
      const tempDiv = document.createElement("div");
      tempDiv.style.position = "absolute";
      tempDiv.style.left = "-9999px";
      document.body.appendChild(tempDiv);

      const root = ReactDOM.createRoot(tempDiv);

      await new Promise<void>((resolve) => {
        root.render(
          <PDFTemplateLCL
            quoteNumber={quoteNumber}
            customerName={activeUsername || "Customer"}
            pol={rutaSeleccionada.pol}
            pod={rutaSeleccionada.pod}
            effectiveDate={new Date().toLocaleDateString()}
            expirationDate={new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000,
            ).toLocaleDateString()}
            incoterm={incoterm}
            pickupFromAddress={
              incoterm === "EXW" ? (pickupFromAddress ?? undefined) : undefined
            }
            deliveryToAddress={
              incoterm === "EXW" ? (deliveryToAddress ?? undefined) : undefined
            }
            salesRep={ejecutivo?.nombre ?? "Ignacio Maldonado"}
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
            carrier={rutaSeleccionada.operador}
            transitTime={rutaSeleccionada?.ttAprox ?? undefined}
            frequency={rutaSeleccionada?.frecuencia ?? undefined}
            service={rutaSeleccionada?.servicio ?? undefined}
          />,
        );

        setTimeout(resolve, 500);
      });

      // ── 3. Generar base64 + subir a MongoDB ANTES de descargar ──
      const pdfElement = tempDiv.querySelector("#pdf-content") as HTMLElement;
      if (pdfElement) {
        const customerClean = (activeUsername || "Cliente").replace(
          /[^a-zA-Z0-9]/g,
          "_",
        );
        const filename = quoteNumber
          ? `${quoteNumber}_${customerClean}.pdf`
          : `Cotizacion_${customerClean}_${formatDateForFilename(new Date())}.pdf`;

        const pdfBase64 = await generatePDFBase64(pdfElement);

        // Subir el PDF a MongoDB
        if (pdfBase64 && quoteNumber) {
          try {
            const uploadRes = await fetch("/api/quote-pdf/upload", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${jwtToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                quoteNumber,
                nombreArchivo: filename,
                contenidoBase64: pdfBase64,
                tipoServicio: "LCL",
                origen: rutaSeleccionada.pol,
                destino: rutaSeleccionada.pod,
              }),
            });
            const uploadData = await uploadRes.json();
            console.log(
              "[QuoteLCL] PDF guardado en MongoDB:",
              uploadRes.status,
              uploadData,
            );
          } catch (uploadErr) {
            console.error("Error subiendo PDF a MongoDB:", uploadErr);
          }
        }

        // ── 4. Descargar el PDF localmente (ÚLTIMO) ──
        await generatePDF({ filename, element: pdfElement });
        console.log("[QuoteLCL] PDF descargado localmente");
      }

      // Limpiar
      root.unmount();
      document.body.removeChild(tempDiv);

      // Enviar notificación por email al ejecutivo
      try {
        const emailResponse = await fetch("/api/send-operation-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwtToken}`,
          },
          body: JSON.stringify({
            ejecutivoEmail: ejecutivo?.email,
            ejecutivoNombre: ejecutivo?.nombre,
            clienteNombre: user?.nombreuser,
            tipoServicio: "Marítimo LCL",
            origen: rutaSeleccionada.pol,
            destino: rutaSeleccionada.pod,
            carrier: rutaSeleccionada.operador,
            precio: tarifaOceanFreight.income,
            currency: rutaSeleccionada.currency,
            total: total,
            tipoAccion: tipoAccionParam,
            quoteId: (apiResponse || response)?.quote?.id,
          }),
        });
        if (!emailResponse.ok) {
          console.error("Error sending email");
        }
      } catch (error) {
        console.error("Error enviando notificación por correo:", error);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
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
        code: "B",
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
          name: activeUsername,
        },
        currency: {
          abbr: divisa,
        },
        reference: "LCL-BL",
        showOnDocument: true,
        notes: "BL charge created via API",
      },
      expense: {
        currency: {
          abbr: divisa,
        },
      },
    });

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
          name: activeUsername,
        },
        currency: {
          abbr: divisa,
        },
        reference: "LCL-HANDLING",
        showOnDocument: true,
        notes: "Handling charge created via API",
      },
      expense: {
        currency: {
          abbr: divisa,
        },
      },
    });

    // Cobro de EXW (solo si incoterm es EXW)
    if (incoterm === "EXW") {
      const exwRate = calculateEXWRate();
      charges.push({
        service: {
          id: 271,
          code: "EC",
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
            name: activeUsername,
          },
          currency: {
            abbr: divisa,
          },
          reference: "LCL-EXW",
          showOnDocument: true,
          notes: `EXW charge - ${piecesData.length} piece(s) × 170`,
        },
        expense: {
          currency: {
            abbr: divisa,
          },
        },
      });
    }

    // Cobro de OCEAN FREIGHT
    charges.push({
      service: {
        id: 106,
        code: "OF",
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
          name: activeUsername,
        },
        currency: {
          abbr: divisa,
        },
        reference: "LCL-OCEANFREIGHT",
        showOnDocument: true,
        notes: `OCEAN FREIGHT charge - ${rutaSeleccionada?.operador} - W/M: ${chargeableVolume.toFixed(3)} - Tarifa: ${divisa} ${rutaSeleccionada?.ofWM}/W/M - Total: ${divisa} ${tarifaOceanFreight.expense.toFixed(2)} + 15%`,
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
          name: activeUsername,
        },
        currency: {
          abbr: divisa,
        },
        reference: "LCL-OCEANFREIGHT",
        showOnDocument: true,
        notes: `OCEAN FREIGHT expense - ${rutaSeleccionada?.operador} - W/M: ${chargeableVolume.toFixed(3)} - Tarifa: ${divisa} ${rutaSeleccionada?.ofWM}/W/M - Total: ${divisa} ${tarifaOceanFreight.expense.toFixed(2)}`,
      },
    });

    // Cobro de Seguro (solo si está activo)
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
            name: activeUsername,
          },
          currency: {
            abbr: divisa,
          },
          reference: "LCL-SEGURO",
          showOnDocument: true,
          notes: "Seguro charge created via API",
        },
        expense: {
          currency: {
            abbr: divisa,
          },
        },
      });
    }

    // Cobro adicional por No Apilable (solo si hay alguna pieza no apilable)
    if (hasNotApilable) {
      const subtotal =
        60 + // BL
        45 + // Handling
        (incoterm === "EXW" ? calculateEXWRate() : 0) + // EXW
        tarifaOceanFreight.income + // Ocean Freight
        (seguroActivo ? calculateSeguro() : 0); // Seguro
      const adicionalAmount = subtotal * 0.8;
      charges.push({
        service: {
          id: 115954,
          code: "NA",
        },
        income: {
          quantity: 1,
          unit: "NO APILABLE",
          rate: adicionalAmount,
          amount: adicionalAmount,
          showamount: adicionalAmount,
          payment: "Prepaid",
          billApplyTo: "Other",
          billTo: {
            name: activeUsername,
          },
          currency: {
            abbr: divisa,
          },
          reference: "LCL-NOAPILABLE",
          showOnDocument: true,
          notes: "No Apilable charge created via Client Portal",
        },
        expense: {
          currency: {
            abbr: divisa,
          },
        },
      });
    }

    return {
      date: new Date().toISOString(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      transitDays: 5,
      project: {
        name: "LCL",
      },
      customerReference: "Portal Created [LCL]",
      contact: {
        name: activeUsername,
      },
      origin: {
        name: rutaSeleccionada.pol,
      },
      destination: {
        name: rutaSeleccionada.pod,
      },
      modeOfTransportation: {
        id: 1,
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
        name: rutaSeleccionada.pol,
      },
      shipper: {
        name: activeUsername,
      },
      consignee: {
        name: activeUsername,
      },
      issuingCompany: {
        name: rutaSeleccionada?.operador || "Por Confirmar",
      },
      serviceType: {
        name: "LCL",
      },
      PaymentTerms: {
        name: "Prepaid",
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
        totalVolumeUOM: "m3",
      })),
      charges,
    };
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="qa-container">
      <div className="qa-section-header">
        <div>
          <h2 className="qa-title">{t("Quotelcl.title")}</h2>
          <p className="qa-subtitle">{t("Quotelcl.subtitle")}</p>
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
            <h3>{t("Quotelcl.ruta")}</h3>
            {rutaSeleccionada && (
              <span
                className="qa-badge ms-3"
                style={{
                  backgroundColor: "#d1e7dd",
                  color: "#0f5132",
                  borderColor: "transparent",
                }}
              >
                {t("Quotelcl.completado")}
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
                    {t("Quotelcl.actualizando")}
                  </>
                ) : (
                  <>
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    {t("Quotelcl.actualizaciontarifa")}
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
                  {t("Quotelcl.actualizacion")}{" "}
                  {lastUpdate.toLocaleTimeString("es-CL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="qa-badge bg-success text-white">
                  {rutas.length} {t("Quotelcl.rutasdisponibles")}
                </span>
              </div>
            )}

            {loadingRutas ? (
              <div className="text-center py-5">
                <div
                  className="spinner-border text-primary"
                  role="status"
                ></div>
                <p className="mt-3 text-muted">{t("Quotelcl.cargandorutas")}</p>
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
                    <label className="qa-label">
                      {t("Quotelcl.puertoorigen")}
                    </label>
                    <Select
                      value={polSeleccionado}
                      onChange={setPolSeleccionado}
                      options={opcionesPOL}
                      placeholder={t("Quotelcl.selectpuerto")}
                      isClearable
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
                    <label className="qa-label">
                      {t("Quotelcl.puertodest")}
                    </label>
                    <Select
                      value={podSeleccionado}
                      onChange={setPodSeleccionado}
                      options={opcionesPOD}
                      placeholder={
                        polSeleccionado
                          ? t("Quotelcl.selectdest")
                          : t("Quotelcl.primeropol")
                      }
                      isClearable
                      isDisabled={!polSeleccionado}
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

                {/* Filtro de Operadores */}
                {polSeleccionado && podSeleccionado && (
                  <div
                    style={{
                      borderTop: "1px solid var(--qa-border-color)",
                      paddingTop: "1rem",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <label className="qa-label mb-2">
                      {t("Quotelcl.operador")}
                    </label>
                    <div className="d-flex flex-wrap gap-2">
                      {operadoresDisponibles.map((operador) => (
                        <button
                          key={operador}
                          type="button"
                          className={`qa-btn qa-btn-sm ${
                            operadoresActivos.has(operador)
                              ? "qa-btn-primary"
                              : "qa-btn-outline"
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

                {polSeleccionado && podSeleccionado && (
                  <div className="mt-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0 fw-bold">
                        {t("Quotelcl.rutasdisponibles")} (
                        {rutasFiltradas.length})
                      </h6>
                      {rutasFiltradas.length > 0 && (
                        <small className="text-muted">
                          {t("Quotelcl.seleccionamejor")}
                        </small>
                      )}
                    </div>

                    {rutasFiltradas.length === 0 ? (
                      <div className="text-center py-4 bg-light rounded text-muted">
                        <p className="mb-1">{t("Quotelcl.norutas")}</p>
                        <small>{t("Quotelcl.intenta")}</small>
                      </div>
                    ) : (
                      <div className="qa-table-container">
                        <table className="qa-table">
                          <thead>
                            <tr>
                              <th style={{ width: "50px" }}></th>
                              <th>{t("Quotelcl.operador")}</th>
                              <th className="text-center">OF W/M</th>
                              <th className="text-center">
                                {t("Quotelcl.servicio")}
                              </th>
                              <th className="text-center">
                                {t("Quotelcl.tt")}
                              </th>
                              <th className="text-center">
                                {t("Quotelcl.frecuencia")}
                              </th>
                              <th className="text-center">
                                {t("Quotelcl.agente")}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {rutasFiltradas.map((ruta, index) => {
                              const isSelected =
                                rutaSeleccionada?.id === ruta.id;

                              return (
                                <tr
                                  key={ruta.id}
                                  onClick={() => {
                                    if (ruta.ofWM === 0) {
                                      setShowPriceZeroModal(true);
                                      return;
                                    }
                                    setRutaSeleccionada(ruta);
                                    setError(null);
                                    setResponse(null);
                                  }}
                                  className={isSelected ? "selected" : ""}
                                >
                                  <td className="text-center">
                                    {isSelected ? (
                                      <i
                                        className="bi bi-check-circle-fill"
                                        style={{ color: "var(--qa-primary)" }}
                                      ></i>
                                    ) : (
                                      <i className="bi bi-circle text-muted"></i>
                                    )}
                                    {index === 0 && (
                                      <div className="mt-1">
                                        <span
                                          className="qa-badge qa-badge-primary"
                                          title={t("Quotelcl.mejoropcion")}
                                        >
                                          <i className="bi bi-star-fill"></i>
                                        </span>
                                      </div>
                                    )}
                                  </td>
                                  <td>
                                    <div className="d-flex align-items-center gap-2">
                                      <img
                                        src={`/logoscarrierlcl/${ruta.operador.toLowerCase().replace(/\s+/g, "_")}.png`}
                                        alt={ruta.operador}
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
                                      <span className="fw-medium">
                                        {ruta.operador}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="text-center">
                                    {ruta.ofWM > 0 ? (
                                      <div className="fw-bold">
                                        {ruta.currency}{" "}
                                        {(ruta.ofWM * 1.15).toFixed(2)}
                                      </div>
                                    ) : (
                                      <span className="text-muted">—</span>
                                    )}
                                  </td>
                                  <td className="text-center text-muted small">
                                    {ruta.servicio || "—"}
                                  </td>
                                  <td className="text-center text-muted small">
                                    {ruta.ttAprox || "—"}
                                  </td>
                                  <td className="text-center text-muted small">
                                    {ruta.frecuencia || "—"}
                                  </td>
                                  <td className="text-center text-muted small">
                                    {ruta.agente || "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {rutasFiltradas.length > 0 && (
                      <div className="mt-3">
                        <small className="qa-text-muted">
                          {t("Quotelcl.tarifasreferenciales")}
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
          <div
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "var(--qa-bg-light)",
              borderTop: "1px solid var(--qa-border-color)",
            }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <small className="qa-text-muted d-block">
                  {t("Quotelcl.rutaselect")}
                </small>
                <strong>
                  {rutaSeleccionada.pol} → {rutaSeleccionada.pod}
                </strong>
                <span className="ms-3 qa-text-muted">|</span>
                <span className="qa-badge qa-badge-primary ms-2">
                  {rutaSeleccionada.operador}
                </span>
              </div>
              <div>
                <span
                  className="qa-badge"
                  style={{
                    fontSize: "0.9rem",
                    backgroundColor: "rgba(255, 98, 0, 0.1)",
                    color: "var(--qa-primary)",
                    borderColor: "rgba(255, 98, 0, 0.2)",
                  }}
                >
                  {rutaSeleccionada.currency}{" "}
                  {(rutaSeleccionada.ofWM * 1.15).toFixed(2)}/W/M
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
        <div className="qa-card">
          <div className="qa-card-header">
            <div>
              <h3>{t("Quotelcl.datoscommodity")}</h3>
              <p className="qa-subtitle">{t("Quotelcl.subtitle")}</p>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12 mb-3">
              <label className="qa-label">
                Incoterm <span className="text-danger">*</span>
              </label>
              <select
                className="qa-select"
                value={incoterm}
                onChange={(e) =>
                  setIncoterm(e.target.value as "EXW" | "FOB" | "")
                }
                style={{ maxWidth: "300px" }}
              >
                <option value="">{t("Quotelcl.selectincoterm")}</option>
                <option value="EXW">Ex Works [EXW]</option>
                <option value="FOB">FOB</option>
              </select>
            </div>

            <div className="col-12">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="fs-6 fw-bold mb-0">{t("Quotelcl.detalles")}</h4>
                <span className="qa-badge">
                  {piecesData.length}{" "}
                  {piecesData.length === 1 ? "pieza" : "piezas"}
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
                  className="qa-btn qa-btn-outline qa-btn-sm me-2"
                  onClick={() => handleDuplicatePiece()}
                >
                  <i className="bi bi-files"></i>
                  Duplicar pieza
                </button>
                <button
                  type="button"
                  className="qa-btn qa-btn-primary"
                  onClick={handleAddPiece}
                >
                  <i className="bi bi-plus-lg"></i>
                  {t("Quotelcl.agregarpieza")}
                </button>
              </div>
            </div>

            {/* Campos condicionales solo para EXW */}
            {incoterm === "EXW" && (
              <>
                <div className="col-md-6">
                  <label className="qa-label">{t("Quotelcl.pickup")}</label>
                  <textarea
                    className="qa-textarea"
                    value={pickupFromAddress}
                    onChange={(e) => setPickupFromAddress(e.target.value)}
                    placeholder="Ingrese dirección de recogida"
                    rows={3}
                  />
                </div>

                <div className="col-md-6">
                  <label className="qa-label">{t("Quotelcl.delivery")}</label>
                  <textarea
                    className="qa-textarea"
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
          <div className="row g-3">
            <div className="col-md-6">
              <div
                className="p-3 rounded border d-flex flex-column h-100"
                style={{ backgroundColor: "var(--qa-bg-light)" }}
              >
                <h4 className="fs-6 fw-bold mb-3">{t("Quotelcl.resumen")}</h4>
                <div className="qa-grid-4" style={{ fontSize: "0.9rem" }}>
                  <div>
                    <span className="qa-text-muted d-block">
                      {t("Quotelcl.pesototal1")}
                    </span>
                    <strong>
                      {totalWeightKg.toFixed(2)} kg (
                      {totalWeightTons.toFixed(4)} t)
                    </strong>
                  </div>
                  <div>
                    <span className="qa-text-muted d-block">
                      {t("Quotelcl.volumentotal1")}
                    </span>
                    <strong>{totalVolume.toFixed(4)} m³</strong>
                  </div>
                  <div>
                    <span className="qa-text-muted d-block">
                      {t("Quotelcl.chargeable")}
                    </span>
                    <strong>{chargeableVolume.toFixed(4)}</strong>
                  </div>
                  <div>
                    <span className="qa-text-muted d-block">
                      {t("Quotelcl.cobropor")}
                    </span>
                    <strong>
                      {totalWeightTons > totalVolume
                        ? t("Quotelcl.peso")
                        : t("Quotelcl.volumen")}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {tarifaOceanFreight && (
              <div className="col-md-6">
                <div
                  className="p-3 rounded border d-flex flex-column h-100"
                  style={{ backgroundColor: "var(--qa-bg-light)" }}
                >
                  <h4 className="fs-6 fw-bold mb-3">
                    {t("Quotelcl.resumencargos")}
                  </h4>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                      flex: 1,
                    }}
                  >
                    <div className="d-flex justify-content-between">
                      <span>BL:</span>
                      <strong>{rutaSeleccionada.currency} 60.00</strong>
                    </div>

                    <div className="d-flex justify-content-between">
                      <span>Handling:</span>
                      <strong>{rutaSeleccionada.currency} 45.00</strong>
                    </div>

                    {incoterm === "EXW" && (
                      <div className="d-flex justify-content-between">
                        <span>EXW Charges ({piecesData.length} piezas):</span>
                        <strong>
                          {rutaSeleccionada.currency}{" "}
                          {calculateEXWRate().toFixed(2)}
                        </strong>
                      </div>
                    )}

                    <div
                      className="d-flex justify-content-between"
                      style={{
                        borderBottom: "1px solid var(--qa-border-color)",
                        paddingBottom: "0.5rem",
                      }}
                    >
                      <span>
                        Ocean Freight ({chargeableVolume.toFixed(2)} m³):
                      </span>
                      <strong>
                        {rutaSeleccionada.currency}{" "}
                        {tarifaOceanFreight.income.toFixed(2)}
                      </strong>
                    </div>

                    {/* Sección de Opcionales */}
                    <div
                      style={{
                        borderBottom: "1px solid var(--qa-border-color)",
                        paddingBottom: "0.75rem",
                      }}
                    >
                      <h6 className="qa-text-muted mb-2 mt-2">
                        {t("Quotelcl.opcional")}
                      </h6>
                      <div
                        className="qa-switch-container"
                        style={{
                          width: "fit-content",
                          padding: "0.4rem 0.8rem",
                        }}
                      >
                        <input
                          className="qa-switch-input"
                          type="checkbox"
                          id="seguroCheckbox"
                          checked={seguroActivo}
                          onChange={(e) => setSeguroActivo(e.target.checked)}
                        />
                        <label
                          className="qa-label mb-0 ms-2"
                          htmlFor="seguroCheckbox"
                          style={{ cursor: "pointer" }}
                        >
                          {t("Quotelcl.agregar")}
                        </label>
                      </div>
                      <small className="qa-text-muted d-block mt-1 ms-1">
                        {t("Quotelcl.protection")}
                      </small>

                      {seguroActivo && (
                        <div className="mt-3 ms-1">
                          <label htmlFor="valorMercaderia" className="qa-label">
                            {t("Quotelcl.valormercaderia")} (
                            {rutaSeleccionada.currency}){" "}
                            <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className="qa-input"
                            id="valorMercaderia"
                            placeholder="Ej: 10000 o 10000,50"
                            value={valorMercaderia}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || /^[\d,\.]+$/.test(value)) {
                                setValorMercaderia(value);
                              }
                            }}
                            style={{ maxWidth: "300px" }}
                          />
                          <small className="qa-text-muted">
                            {t("Quotelcl.ingresavalor")}
                          </small>
                        </div>
                      )}
                    </div>

                    {seguroActivo && calculateSeguro() > 0 && (
                      <div className="d-flex justify-content-between">
                        <span>{t("Quotelcl.seguro")}</span>
                        <strong>
                          {rutaSeleccionada.currency}{" "}
                          {calculateSeguro().toFixed(2)}
                        </strong>
                      </div>
                    )}

                    {hasNotApilable && (
                      <div className="d-flex justify-content-between">
                        <span>{t("Quotelcl.noapilable")}</span>
                        <strong>
                          {rutaSeleccionada.currency}{" "}
                          {(() => {
                            const subtotal =
                              60 +
                              45 +
                              (incoterm === "EXW" ? calculateEXWRate() : 0) +
                              tarifaOceanFreight!.income +
                              (seguroActivo ? calculateSeguro() : 0);
                            return (subtotal * 0.8).toFixed(2);
                          })()}
                        </strong>
                      </div>
                    )}

                    {seguroActivo && !valorMercaderia && (
                      <div className="qa-alert qa-alert-warning">
                        <small>{t("Pieceaccordionlcl.segurocargo")}</small>
                      </div>
                    )}

                    {/* Total */}
                    <div
                      className="d-flex justify-content-between"
                      style={{
                        borderTop: "1px solid var(--qa-border-color)",
                        paddingTop: "0.75rem",
                        marginTop: "0.5rem",
                      }}
                    >
                      <span className="fs-5 fw-bold">TOTAL:</span>
                      <span
                        className="fs-5 fw-bold"
                        style={{ color: "var(--qa-primary)" }}
                      >
                        {rutaSeleccionada.currency}{" "}
                        {(() => {
                          const subtotal =
                            60 +
                            45 +
                            (incoterm === "EXW" ? calculateEXWRate() : 0) +
                            tarifaOceanFreight!.income +
                            (seguroActivo ? calculateSeguro() : 0);
                          const total = hasNotApilable
                            ? subtotal * 1.8
                            : subtotal;
                          return total.toFixed(2);
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* PASO 3: GENERAR COTIZACIÓN */}
      {/* ============================================================================ */}

      {rutaSeleccionada && tarifaOceanFreight && (
        <>
          <div className="qa-card">
            <div className="qa-card-header">
              <div>
                <h3>{t("QuoteAIR.generador")}</h3>
              </div>
            </div>
            <div className="qa-grid-2" style={{ marginTop: "1rem" }}>
              {/* Generar Cotización */}
              <div
                style={{
                  border: "1px solid var(--qa-border-color)",
                  borderRadius: "var(--qa-radius)",
                  padding: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <h4 className="fs-6 fw-bold mb-1">
                  {t("QuoteAIR.generarcotizacion")}
                </h4>
                <p className="qa-text-muted small mb-3">
                  {t("QuoteAIR.cotizaciongenerada")}
                </p>
                <div style={{ marginTop: "auto" }}>
                  <button
                    onClick={() => {
                      setTipoAccion("cotizacion");
                      testAPI("cotizacion");
                    }}
                    disabled={
                      loading ||
                      !accessToken ||
                      !incoterm ||
                      (incoterm === "EXW" &&
                        (!pickupFromAddress || !deliveryToAddress))
                    }
                    className="qa-btn qa-btn-outline w-100"
                  >
                    {loading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        {t("QuoteAIR.generando")}
                      </>
                    ) : (
                      <>{t("QuoteAIR.generarcotizacion")}</>
                    )}
                  </button>
                </div>
              </div>

              {/* Generar Operación */}
              <div
                style={{
                  border: "1px solid var(--qa-border-color)",
                  borderRadius: "var(--qa-radius)",
                  padding: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <h4 className="fs-6 fw-bold mb-1">
                  {t("QuoteAIR.generaroperacion")}
                </h4>
                <p className="qa-text-muted small mb-3">
                  <strong>{t("QuoteAIR.accionirreversible")}</strong>{" "}
                  {t("QuoteAIR.operaciongenerada")}
                </p>
                <div style={{ marginTop: "auto" }}>
                  <button
                    onClick={() => {
                      setTipoAccion("operacion");
                      testAPI("operacion");
                    }}
                    disabled={
                      loading ||
                      !accessToken ||
                      !incoterm ||
                      (incoterm === "EXW" &&
                        (!pickupFromAddress || !deliveryToAddress))
                    }
                    className="qa-btn qa-btn-outline w-100"
                  >
                    {loading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        {t("QuoteAIR.generandocotizacion")}
                      </>
                    ) : (
                      <>{t("QuoteAIR.generaroperacion")}</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {!accessToken && (
            <div className="qa-alert qa-alert-danger">
              <i className="bi bi-exclamation-circle-fill mt-1"></i>
              No hay token de acceso. Asegúrate de estar autenticado.
            </div>
          )}

          {!incoterm && rutaSeleccionada && (
            <div className="qa-alert qa-alert-warning">
              <i className="bi bi-info-circle mt-1"></i>
              {t("Pieceaccordionlcl.ingresoinco")}
            </div>
          )}

          {incoterm === "EXW" && (!pickupFromAddress || !deliveryToAddress) && (
            <div className="qa-alert qa-alert-warning">
              <i className="bi bi-exclamation-triangle mt-1"></i>
              {t("Pieceaccordionlcl.debescompl")}
            </div>
          )}
        </>
      )}

      {/* ============================================================================ */}
      {/* SECCIÓN 4: RESULTADOS */}
      {/* ============================================================================ */}

      {error && (
        <div className="qa-alert qa-alert-danger">
          <div>
            <strong>Error en la llamada</strong>
            <pre
              style={{
                backgroundColor: "transparent",
                padding: "0.5rem 0",
                margin: 0,
                fontSize: "0.85rem",
                whiteSpace: "pre-wrap",
              }}
            >
              {error}
            </pre>
          </div>
        </div>
      )}

      {response && (
        <div className="qa-alert qa-alert-success">
          <div>
            <strong>Tu cotización se ha generado exitosamente</strong>
            <p className="mb-0 mt-1 small">
              En unos momentos se descargará automáticamente el PDF de la
              cotización.
            </p>
          </div>
        </div>
      )}

      {/* Modal para rutas con tarifa OF W/M en 0 */}
      <Modal
        show={showPriceZeroModal}
        onHide={() => setShowPriceZeroModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Cotización Personalizada Requerida</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">
            <strong>Esta ruta requiere análisis caso a caso.</strong>
          </p>
          <p className="mb-0">
            Por favor, contacta a tu ejecutivo comercial para obtener una
            cotización personalizada que se ajuste a las características
            específicas de tu envío.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="primary"
            onClick={() => setShowPriceZeroModal(false)}
          >
            Entendido
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de advertencia - Máximo 10 piezas */}
      <Modal
        show={showMaxPiecesModal}
        onHide={() => setShowMaxPiecesModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Límite de Piezas Alcanzado</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>El sistema permite un máximo de 10 piezas por cotización.</p>
          <p className="mb-0">
            Si necesita cotizar más de 10 piezas, por favor contacte a su
            ejecutivo para un análisis personalizado.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="primary"
            onClick={() => setShowMaxPiecesModal(false)}
          >
            Entendido
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default QuoteLCL;
