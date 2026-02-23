import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useAuditLog } from "../../hooks/useAuditLog";
import * as XLSX from "xlsx";
import Select from "react-select";
import { PDFTemplateFCL } from "./Pdftemplate/Pdftemplatefcl";
import {
  generatePDF,
  generatePDFBase64,
  formatDateForFilename,
} from "./Pdftemplate/Pdfutils";
import { useTranslation } from "react-i18next";
import ReactDOM from "react-dom/client";
import {
  GOOGLE_SHEET_CSV_URL,
  type OutletContext,
  type RutaFCL,
  type SelectOption,
  type Currency,
  type ContainerType,
  type ContainerSelection,
  CONTAINER_MAPPING,
  extractPrice,
  parseCurrency,
  normalize,
  parseCSV,
  capitalize,
  parseFCL,
  type QuoteFCLProps,
  type ClienteAsignado,
} from "./Handlers/FCL/HandlerQuoteFCL";
import "./QuoteFCL.css";

function QuoteFCL({
  preselectedPOL,
  preselectedPOD,
  isEjecutivoMode = false,
}: QuoteFCLProps = {}) {
  const { accessToken } = useOutletContext<OutletContext>();
  const { user, token, activeUsername, getMisClientes } = useAuth();
  const ejecutivo = user?.ejecutivo;
  const { t } = useTranslation();
  const { registrarEvento } = useAuditLog();

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Estados para selección de cliente (solo en modo ejecutivo)
  const [clientesAsignados, setClientesAsignados] = useState<ClienteAsignado[]>(
    [],
  );
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<ClienteAsignado | null>(null);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [errorClientes, setErrorClientes] = useState<string | null>(null);

  // effectiveUsername: en modo ejecutivo usa el cliente seleccionado, en modo normal usa activeUsername
  const effectiveUsername = isEjecutivoMode
    ? clienteSeleccionado?.username || user?.username || ""
    : activeUsername || "";

  // ============================================================================
  // ESTADOS PARA RUTAS FCL
  // ============================================================================

  const [rutas, setRutas] = useState<RutaFCL[]>([]);
  const [loadingRutas, setLoadingRutas] = useState(true);
  const [errorRutas, setErrorRutas] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const [polSeleccionado, setPolSeleccionado] = useState<SelectOption | null>(
    null,
  );
  const [podSeleccionado, setPodSeleccionado] = useState<SelectOption | null>(
    null,
  );
  const [rutaSeleccionada, setRutaSeleccionada] = useState<RutaFCL | null>(
    null,
  );
  const [containerSeleccionado, setContainerSeleccionado] =
    useState<ContainerSelection | null>(null);

  // Estados para cantidad, incoterm y direcciones
  const [cantidadContenedores, setCantidadContenedores] = useState(1);
  const [incoterm, setIncoterm] = useState<"EXW" | "FOB" | "">("");
  const [pickupFromAddress, setPickupFromAddress] = useState("");
  const [deliveryToAddress, setDeliveryToAddress] = useState("");

  const [opcionesPOL, setOpcionesPOL] = useState<SelectOption[]>([]);
  const [opcionesPOD, setOpcionesPOD] = useState<SelectOption[]>([]);

  const [carriersActivos, setCarriersActivos] = useState<Set<string>>(
    new Set(),
  );
  const [carriersDisponibles, setCarriersDisponibles] = useState<string[]>([]);

  // Estado para el seguro opcional
  const [seguroActivo, setSeguroActivo] = useState(false);
  const [valorMercaderia, setValorMercaderia] = useState<string>("");

  // Estado para controlar el accordion del Paso 1
  const [openSection, setOpenSection] = useState<number>(1);

  // Estado para el tipo de acción: cotización u operación
  const [tipoAccion, setTipoAccion] = useState<"cotizacion" | "operacion">(
    "cotizacion",
  );

  // Cargar clientes asignados al ejecutivo (solo en modo ejecutivo)
  useEffect(() => {
    const cargarClientes = async () => {
      if (!isEjecutivoMode || user?.username !== "Ejecutivo") {
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
        console.error("Error cargando clientes:", err);
        setErrorClientes(
          err instanceof Error ? err.message : "Error al cargar clientes",
        );
      } finally {
        setLoadingClientes(false);
      }
    };

    cargarClientes();
  }, [user, getMisClientes, isEjecutivoMode]);

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

        const rutasParsed = parseFCL(data);
        // Debug: mostrar formato de validUntil que llega del CSV
        const conValidez = rutasParsed.filter((r) => r.validUntil);
        if (conValidez.length > 0) {
          console.log(
            "📅 Formato validUntil del CSV (primeras 5):",
            conValidez
              .slice(0, 5)
              .map((r) => ({ carrier: r.carrier, validUntil: r.validUntil })),
          );
        }
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

        // Extraer carriers únicos
        const carriersUnicos = Array.from(
          new Set(
            rutasParsed.map((r) => r.carrier).filter((c) => c && c !== "N/A"),
          ),
        ).sort() as string[];
        setCarriersDisponibles(carriersUnicos);
        setCarriersActivos(new Set(carriersUnicos));

        setLoadingRutas(false);
        setLastUpdate(new Date());
        console.log(
          "✅ Tarifas FCL cargadas exitosamente desde Google Sheets:",
          rutasParsed.length,
          "rutas",
        );
      } catch (err) {
        console.error("❌ Error al cargar datos FCL desde Google Sheets:", err);
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
      const rutasParsed = parseFCL(data);
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

      // Extraer carriers únicos
      const carriersUnicos = Array.from(
        new Set(
          rutasParsed.map((r) => r.carrier).filter((c) => c && c !== "N/A"),
        ),
      ).sort() as string[];
      setCarriersDisponibles(carriersUnicos);
      setCarriersActivos(new Set(carriersUnicos));

      setLoadingRutas(false);
      setLastUpdate(new Date());
      console.log(
        "✅ Tarifas FCL actualizadas exitosamente:",
        rutasParsed.length,
        "rutas",
      );
    } catch (err) {
      console.error("❌ Error al actualizar tarifas FCL:", err);
      setErrorRutas(
        "No se pudieron actualizar las tarifas. Por favor, intenta nuevamente.",
      );
      setLoadingRutas(false);
    }
  };

  // ============================================================================
  // ACTUALIZAR PODs CUANDO CAMBIA POL
  // ============================================================================

  useEffect(() => {
    if (polSeleccionado) {
      // Filtrar rutas por POL y crear un Map con valores normalizados
      const podMap = new Map<string, string>();

      rutas
        .filter((r) => r.polNormalized === polSeleccionado.value)
        .forEach((r) => {
          const normalized = normalize(r.pod);
          if (!podMap.has(normalized)) {
            podMap.set(normalized, r.pod);
          }
        });

      // Crear opciones únicas y ordenadas
      const podsUnicos = Array.from(podMap.entries())
        .map(([normalized, original]) => ({
          value: normalized,
          label: capitalize(original),
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

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

  const handleSectionToggle = (section: number) => {
    setOpenSection(openSection === section ? 0 : section);
  };

  // Cerrar Paso 1 cuando se selecciona un contenedor
  useEffect(() => {
    if (containerSeleccionado) {
      setOpenSection(2); // Cambiar al Paso 2
    }
  }, [containerSeleccionado]);

  // ============================================================================
  // VALIDITY PARSER: determina si la fecha "Validez" está vigente
  // Formato esperado: DD/M/YYYY (ej: 28/2/2026)
  // ============================================================================
  const getValidityClass = (
    validUntil?: string | null,
  ): "valid" | "expired" | null => {
    if (!validUntil) return null;

    const txt = String(validUntil).trim();
    if (!txt) return null;

    let expiry: Date | null = null;

    // 1) Intentar formato numérico serial de Google Sheets (ej: 46072)
    if (/^\d{5}$/.test(txt)) {
      const serial = parseInt(txt, 10);
      // Google Sheets usa epoch 30/12/1899
      const epoch = new Date(1899, 11, 30);
      expiry = new Date(epoch.getTime() + serial * 86400000);
    }

    // 2) Intentar formato DD/MM/YYYY o DD/M/YYYY
    if (!expiry) {
      const match = txt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (match) {
        const part1 = parseInt(match[1], 10);
        const part2 = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);

        // Si part1 > 12, es definitivamente DD/M/YYYY
        // Si part2 > 12, es definitivamente M/D/YYYY
        // Si ambos <= 12, asumimos DD/M/YYYY (formato latino)
        if (part1 > 12) {
          // DD/M/YYYY → part1=día, part2=mes
          expiry = new Date(year, part2 - 1, part1, 23, 59, 59, 999);
        } else if (part2 > 12) {
          // M/D/YYYY → part1=mes, part2=día
          expiry = new Date(year, part1 - 1, part2, 23, 59, 59, 999);
        } else {
          // Ambos <= 12: asumimos DD/M/YYYY (formato del Excel en español)
          expiry = new Date(year, part2 - 1, part1, 23, 59, 59, 999);
        }
      }
    }

    // 3) Intentar formato texto español (ej: "28 febrero 2026" o "28 febrero")
    if (!expiry) {
      const matchText = txt.match(/(\d{1,2})\s+([a-zñáéíóú]+)(?:\s+(\d{4}))?/i);
      if (matchText) {
        const day = parseInt(matchText[1], 10);
        const monthName = matchText[2].toLowerCase();
        const year = matchText[3]
          ? parseInt(matchText[3], 10)
          : new Date().getFullYear();

        const monthMap: Record<string, number> = {
          enero: 0,
          febrero: 1,
          marzo: 2,
          abril: 3,
          mayo: 4,
          junio: 5,
          julio: 6,
          agosto: 7,
          septiembre: 8,
          octubre: 9,
          noviembre: 10,
          diciembre: 11,
          ene: 0,
          feb: 1,
          mar: 2,
          abr: 3,
          may: 4,
          jun: 5,
          jul: 6,
          ago: 7,
          sep: 8,
          oct: 9,
          nov: 10,
          dic: 11,
        };

        const monthIndex = monthMap[monthName];
        if (monthIndex !== undefined) {
          expiry = new Date(year, monthIndex, day, 23, 59, 59, 999);
        }
      }
    }

    if (!expiry || isNaN(expiry.getTime())) return null;

    const now = new Date();
    return expiry >= now ? "valid" : "expired";
  };

  // ============================================================================
  // FILTRAR RUTAS (excluye rutas con fecha vencida)
  // ============================================================================

  const rutasFiltradas = rutas
    .filter((ruta) => {
      if (!polSeleccionado || !podSeleccionado) return false;

      // Excluir rutas cuya validez haya expirado
      const validityState = getValidityClass(ruta.validUntil);
      if (validityState === "expired") return false;

      const matchPOL = ruta.polNormalized === polSeleccionado.value;
      const matchPOD = ruta.podNormalized === podSeleccionado.value;
      const matchCarrier =
        !ruta.carrier ||
        ruta.carrier === "N/A" ||
        carriersActivos.has(ruta.carrier);

      return matchPOL && matchPOD && matchCarrier;
    })
    .sort((a, b) => a.priceForComparison - b.priceForComparison);

  // ============================================================================
  // FUNCIÓN PARA SELECCIONAR CONTENEDOR
  // ============================================================================

  const handleSeleccionarContainer = (
    ruta: RutaFCL,
    containerType: ContainerType,
  ) => {
    let price = 0;
    let priceString = "";

    switch (containerType) {
      case "20GP":
        price = extractPrice(ruta.gp20);
        priceString = ruta.gp20;
        break;
      case "40HQ":
        price = extractPrice(ruta.hq40);
        priceString = ruta.hq40;
        break;
      case "40NOR":
        if (!ruta.nor40) return;
        price = extractPrice(ruta.nor40);
        priceString = ruta.nor40;
        break;
    }

    const containerSelection: ContainerSelection = {
      type: containerType,
      packageTypeId: CONTAINER_MAPPING[containerType].id,
      price,
      priceString,
    };

    setRutaSeleccionada(ruta);
    setContainerSeleccionado(containerSelection);
    setError(null);
    setResponse(null);
  };

  // ============================================================================
  // FUNCIÓN PARA CALCULAR EXW SEGÚN TIPO DE CONTENEDOR
  // ============================================================================

  const calculateEXWRate = (
    containerType: ContainerType,
    cantidad: number,
  ): number => {
    const ratePerContainer = containerType === "20GP" ? 900 : 1090; // 40HQ y 40NOR cobran 1090
    return ratePerContainer * cantidad;
  };

  // ============================================================================
  // FUNCIÓN PARA CALCULAR EL SEGURO (TOTAL * 1.1 * 0.002) CON MÍNIMO DE 25
  // ============================================================================

  const calculateSeguro = (): number => {
    if (!seguroActivo || !rutaSeleccionada || !containerSeleccionado) return 0;

    // Convertir valorMercaderia a número (reemplazar coma por punto)
    const valorCarga = parseFloat(valorMercaderia.replace(",", ".")) || 0;

    // Si no hay valor de mercadería ingresado, retornar 0
    if (valorCarga === 0) return 0;

    const totalSinSeguro =
      60 + // BL
      45 + // Handling
      (incoterm === "EXW"
        ? calculateEXWRate(containerSeleccionado.type, cantidadContenedores)
        : 0) + // EXW
      containerSeleccionado.price * 1.15 * cantidadContenedores; // Ocean Freight

    return Math.max((valorCarga + totalSinSeguro) * 1.1 * 0.0025, 25);
  };

  // ============================================================================
  // FUNCIÓN DE TEST API
  // ============================================================================

  const testAPI = async (
    tipoAccion: "cotizacion" | "operacion" = "cotizacion",
  ) => {
    if (!rutaSeleccionada || !containerSeleccionado) {
      setError(
        "Debes seleccionar una ruta y un contenedor antes de generar la cotización",
      );
      return;
    }

    if (!incoterm) {
      setError("Debes seleccionar un Incoterm antes de generar la cotización");
      return;
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
          `https://api.linbis.com/Quotes?ConsigneeName=${encodeURIComponent(effectiveUsername)}`,
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
          console.log("[QuoteFCL] ID máximo ANTES de crear:", previousMaxId);
        }
      } catch (e) {
        console.warn("[QuoteFCL] No se pudo obtener cotizaciones previas:", e);
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
        "[QuoteFCL] Respuesta CREATE de Linbis:",
        JSON.stringify(data),
      );
      setResponse(data);

      // Registrar auditoría
      registrarEvento({
        accion: isEjecutivoMode
          ? "COTIZACION_FCL_EJECUTIVO"
          : "COTIZACION_FCL_CREADA",
        categoria: "COTIZACION",
        descripcion: isEjecutivoMode
          ? `Cotización FCL creada por ejecutivo ${ejecutivo?.nombre || ""} para cliente ${clienteSeleccionado?.username || ""}`
          : `Cotización FCL creada: ${polSeleccionado?.label || ""} → ${podSeleccionado?.label || ""}`,
        detalles: {
          tipo: tipoAccion,
          pol: polSeleccionado?.label || "",
          pod: podSeleccionado?.label || "",
          carrier: rutaSeleccionada?.carrier || "",
          container: containerSeleccionado?.type || "",
          cantidad: cantidadContenedores,
          incoterm,
        },
        ...(isEjecutivoMode && {
          clienteAfectado: clienteSeleccionado?.username || "",
        }),
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
      if (!rutaSeleccionada || !containerSeleccionado) return;

      // Calcular total para el email
      const totalAmount =
        60 + // BL
        45 + // Handling
        (incoterm === "EXW"
          ? calculateEXWRate(containerSeleccionado.type, cantidadContenedores)
          : 0) + // EXW
        containerSeleccionado.price * 1.15 * cantidadContenedores + // Ocean Freight
        (seguroActivo ? calculateSeguro() : 0); // Seguro
      const total = rutaSeleccionada.currency + " " + totalAmount.toFixed(2);

      // Obtener el nombre completo del contenedor
      const containerName = CONTAINER_MAPPING[containerSeleccionado.type].name;

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
        const exwRate = calculateEXWRate(
          containerSeleccionado.type,
          cantidadContenedores,
        );
        const ratePerContainer = exwRate / cantidadContenedores;
        pdfCharges.push({
          code: "EC",
          description: "EXW CHARGES",
          quantity: cantidadContenedores,
          unit: "Container",
          rate: ratePerContainer,
          amount: exwRate,
        });
      }

      // Ocean Freight
      const oceanFreightRate = containerSeleccionado.price;
      const oceanFreightIncome = oceanFreightRate * 1.15;
      pdfCharges.push({
        code: "OF",
        description: "OCEAN FREIGHT",
        quantity: cantidadContenedores,
        unit: "Container",
        rate: oceanFreightIncome / cantidadContenedores,
        amount: oceanFreightIncome * cantidadContenedores,
      });

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

      // Calcular total
      const totalCharges = pdfCharges.reduce(
        (sum, charge) => sum + charge.amount,
        0,
      );

      // ── 1. Obtener el quoteNumber real de Linbis ANTES de renderizar el PDF ──
      let quoteNumber = "";
      try {
        console.log(
          "[QuoteFCL] Buscando cotización recién creada (id mayor a",
          previousMaxId,
          ")...",
        );
        await new Promise((r) => setTimeout(r, 2000));

        const linbisRes = await fetch(
          `https://api.linbis.com/Quotes?ConsigneeName=${encodeURIComponent(effectiveUsername)}`,
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
              `[QuoteFCL] Cotización con ID más alto: number=${newestQuote.number}, id=${newestQuote.id}`,
            );
            if (Number(newestQuote.id) > (previousMaxId || 0)) {
              quoteNumber = newestQuote.number;
              console.log(
                `✅ [QuoteFCL] NUEVA COTIZACIÓN CONFIRMADA: ${quoteNumber}`,
              );
            } else {
              console.warn(
                "[QuoteFCL] No se encontró cotización con id mayor a",
                previousMaxId,
              );
            }
          }
        }
      } catch (e) {
        console.warn("[QuoteFCL] Error obteniendo quoteNumber:", e);
      }

      // ── 2. Renderizar el PDF con quoteNumber real ──
      const tempDiv = document.createElement("div");
      tempDiv.style.position = "absolute";
      tempDiv.style.left = "-9999px";
      document.body.appendChild(tempDiv);

      const root = ReactDOM.createRoot(tempDiv);

      await new Promise<void>((resolve) => {
        root.render(
          <PDFTemplateFCL
            quoteNumber={quoteNumber}
            customerName={effectiveUsername || "Customer"}
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
            containerType={containerName}
            containerQuantity={cantidadContenedores}
            description={"Cargamento Marítimo FCL"}
            charges={pdfCharges}
            totalCharges={totalCharges}
            currency={rutaSeleccionada.currency}
            carrier={rutaSeleccionada.carrier}
            transitTime={rutaSeleccionada?.tt ?? undefined}
            remarks={rutaSeleccionada.remarks}
          />,
        );

        setTimeout(resolve, 500);
      });

      // ── 3. Generar base64 + subir a MongoDB ANTES de descargar ──
      const pdfElement = tempDiv.querySelector("#pdf-content") as HTMLElement;
      if (pdfElement) {
        const customerClean = (effectiveUsername || "Cliente").replace(
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
            const bodyPayload: any = {
              quoteNumber,
              nombreArchivo: filename,
              contenidoBase64: pdfBase64,
              tipoServicio: "FCL",
              origen: rutaSeleccionada.pol,
              destino: rutaSeleccionada.pod,
            };

            if (
              isEjecutivoMode &&
              user?.username === "Ejecutivo" &&
              clienteSeleccionado
            ) {
              bodyPayload.usuarioId = clienteSeleccionado.username;
              bodyPayload.subidoPor = clienteSeleccionado.email;
            }

            const uploadRes = await fetch("/api/quote-pdf/upload", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(bodyPayload),
            });
            const uploadData = await uploadRes.json();
            console.log(
              "[QuoteFCL] PDF guardado en MongoDB:",
              uploadRes.status,
              uploadData,
            );
          } catch (uploadErr) {
            console.error("Error subiendo PDF a MongoDB:", uploadErr);
          }
        }

        // ── 4. Descargar el PDF localmente (ÚLTIMO) ──
        await generatePDF({ filename, element: pdfElement });
        console.log("[QuoteFCL] PDF descargado localmente");
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
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ejecutivoEmail: ejecutivo?.email,
            ejecutivoNombre: ejecutivo?.nombre,
            clienteNombre: user?.nombreuser,
            tipoServicio: "Marítimo FCL",
            origen: rutaSeleccionada.pol,
            destino: rutaSeleccionada.pod,
            carrier: rutaSeleccionada.carrier,
            precio: containerSeleccionado.price * cantidadContenedores,
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
    if (!rutaSeleccionada || !containerSeleccionado) {
      return null;
    }

    const charges = [];

    // Parse transit time from rutaSeleccionada.tt (formats like "X-Y days" or "Y days" or Spanish "días").
    const parseTransitDays = (transit?: string | number | null): number => {
      // If missing or empty, return 999 per requirement
      if (transit === undefined || transit === null) return 999;
      const raw = String(transit);
      if (raw.trim() === "") return 999;
      if (typeof transit === "number") return Math.max(1, Math.floor(transit));

      const txt = raw.trim().toLowerCase();

      // Match range like "2-3 days" or "2 – 3 days" -> take upper value
      const rangeMatch = txt.match(
        /(\d+)\s*[-–—]\s*(\d+)\s*(?:days?|d[ií]as?)?/i,
      );
      if (rangeMatch) {
        const hi = parseInt(rangeMatch[2], 10);
        if (!isNaN(hi)) return Math.max(1, hi);
      }

      // Match single like "3 days" or "3 días"
      const singleMatch = txt.match(/(\d{1,4})\s*(?:days?|d[ií]as?)/i);
      if (singleMatch) {
        const v = parseInt(singleMatch[1], 10);
        if (!isNaN(v)) return Math.max(1, v);
      }

      // Fallback: extract any number
      const anyNum = txt.match(/(\d{1,4})/);
      if (anyNum) {
        const v = parseInt(anyNum[1], 10);
        if (!isNaN(v)) return Math.max(1, v);
      }

      return 999;
    };

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
        payment: "Prepaid",
        billApplyTo: "Other",
        billTo: {
          name: effectiveUsername,
        },
        currency: {
          abbr: rutaSeleccionada.currency,
        },
        reference: "TEST-REF-FCL",
        showOnDocument: true,
        notes: "BL charge created via API",
      },
      expense: {
        currency: {
          abbr: rutaSeleccionada.currency,
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
        payment: "Prepaid",
        billApplyTo: "Other",
        billTo: {
          name: effectiveUsername,
        },
        currency: {
          abbr: rutaSeleccionada.currency,
        },
        reference: "TEST-REF-FCL",
        showOnDocument: true,
        notes: "Handling charge created via API",
      },
      expense: {
        currency: {
          abbr: rutaSeleccionada.currency,
        },
      },
    });

    // Cobro de EXW (solo si incoterm es EXW)
    if (incoterm === "EXW") {
      const exwRate = calculateEXWRate(
        containerSeleccionado.type,
        cantidadContenedores,
      );
      charges.push({
        service: {
          id: 121,
          code: "EC",
        },
        income: {
          quantity: cantidadContenedores,
          unit: "Container",
          rate: exwRate / cantidadContenedores,
          amount: exwRate,
          payment: "Prepaid",
          billApplyTo: "Other",
          billTo: {
            name: effectiveUsername,
          },
          currency: {
            abbr: rutaSeleccionada.currency,
          },
          reference: "TEST-REF-FCL",
          showOnDocument: true,
          notes: "EXW charge created via API",
        },
        expense: {
          currency: {
            abbr: rutaSeleccionada.currency,
          },
        },
      });
    }

    // Cobro de Ocean Freight
    const oceanFreightRate = containerSeleccionado.price;
    const oceanFreightIncome = oceanFreightRate * 1.15;
    charges.push({
      service: {
        id: 163,
        code: "OF",
      },
      income: {
        quantity: cantidadContenedores,
        unit: "Container",
        rate: oceanFreightIncome / cantidadContenedores,
        amount: oceanFreightIncome * cantidadContenedores,
        payment: "Prepaid",
        billApplyTo: "Other",
        billTo: {
          name: effectiveUsername,
        },
        currency: {
          abbr: rutaSeleccionada.currency,
        },
        reference: "TEST-REF-FCL",
        showOnDocument: true,
        notes: "Ocean Freight charge created via API",
      },
      expense: {
        quantity: cantidadContenedores,
        unit: "Container",
        rate: oceanFreightRate,
        amount: oceanFreightRate * cantidadContenedores,
        payment: "Collect",
        billApplyTo: "Other",
        currency: {
          abbr: rutaSeleccionada.currency,
        },
        reference: "TEST-REF-FCL",
        notes: "Ocean Freight expense",
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
            name: effectiveUsername,
          },
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any,
          },
          reference: "SEGURO",
          showOnDocument: true,
          notes: "Seguro opcional - Protección adicional para la carga",
        },
        expense: {
          currency: {
            abbr: rutaSeleccionada.currency,
          },
        },
      });
    }

    return {
      date: new Date().toISOString(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      transitDays: parseTransitDays(rutaSeleccionada.tt),
      project: {
        name: "FCL",
      },
      customerReference: "Portal Created [FCL]",
      contact: {
        name: effectiveUsername,
      },
      origin: {
        name: rutaSeleccionada.pol,
      },
      destination: {
        name: rutaSeleccionada.pod,
      },
      modeOfTransportation: {
        id: 2,
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
        name: effectiveUsername,
      },
      consignee: {
        name: effectiveUsername,
      },
      issuingCompany: {
        name: rutaSeleccionada?.carrier || "",
      },
      serviceType: {
        name: "FCL",
      },
      salesRep: {
        name: ejecutivo?.nombre || "Ignacio Maldonado",
      },
      PaymentTerms: {
        name: "Prepaid",
      },
      commodities: Array.from({ length: cantidadContenedores }, () => ({
        commodityType: "Container",
        packageType: {
          id: containerSeleccionado.packageTypeId,
        },
      })),
      charges,
    };
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="qf-container">
      {/* Selector de Cliente (Solo para modo ejecutivo) */}
      {isEjecutivoMode && (
        <div
          className="card shadow-sm mb-4"
          style={{
            borderLeft: "4px solid #0d6efd",
            background: "linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)",
          }}
        >
          <div className="card-body">
            <h5 className="card-title mb-3">
              <svg
                width="20"
                height="20"
                fill="currentColor"
                className="me-2"
                viewBox="0 0 16 16"
              >
                <path d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm.256 7a4.474 4.474 0 0 1-.229-1.004H3c.001-.246.154-.986.832-1.664C4.484 10.68 5.711 10 8 10c.26 0 .507.009.74.025.226-.341.496-.65.804-.918C9.077 9.038 8.564 9 8 9c-5 0-6 3-6 4s1 1 1 1h5.256Z" />
              </svg>
              Seleccionar Cliente
            </h5>

            {loadingClientes ? (
              <div className="text-center py-3">
                <div
                  className="spinner-border spinner-border-sm text-primary"
                  role="status"
                >
                  <span className="visually-hidden">Cargando clientes...</span>
                </div>
                <span className="ms-2 text-muted">
                  Cargando clientes asignados...
                </span>
              </div>
            ) : errorClientes ? (
              <div className="alert alert-danger mb-0">
                <strong>Error:</strong> {errorClientes}
              </div>
            ) : clientesAsignados.length === 0 ? (
              <div className="alert alert-warning mb-0">
                <strong>⚠️ Sin clientes asignados</strong>
                <p className="mb-0 mt-2 small">
                  No tienes clientes asignados. Contacta al administrador.
                </p>
              </div>
            ) : (
              <div className="row g-3">
                <div className="col-md-8">
                  <label className="form-label fw-semibold">
                    Cliente para esta cotización{" "}
                    <span className="text-danger">*</span>
                  </label>
                  <Select
                    value={
                      clienteSeleccionado
                        ? {
                            value: clienteSeleccionado.id,
                            label: `${clienteSeleccionado.username} (${clienteSeleccionado.email})`,
                          }
                        : null
                    }
                    onChange={(option) => {
                      const cliente = clientesAsignados.find(
                        (c) => c.id === option?.value,
                      );
                      setClienteSeleccionado(cliente || null);
                    }}
                    options={clientesAsignados.map((c) => ({
                      value: c.id,
                      label: `${c.username} (${c.email})`,
                    }))}
                    placeholder="Selecciona un cliente..."
                    isClearable={false}
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        borderColor: clienteSeleccionado
                          ? "#198754"
                          : state.isFocused
                            ? "#0d6efd"
                            : "#dee2e6",
                        boxShadow: state.isFocused
                          ? "0 0 0 0.25rem rgba(13, 110, 253, 0.25)"
                          : "none",
                        "&:hover": { borderColor: "#0d6efd" },
                      }),
                      option: (base, state) => ({
                        ...base,
                        backgroundColor: state.isSelected
                          ? "#0d6efd"
                          : state.isFocused
                            ? "#e7f1ff"
                            : "white",
                        color: state.isSelected ? "white" : "#212529",
                      }),
                    }}
                  />
                  {!clienteSeleccionado && (
                    <small className="text-danger d-block mt-1">
                      ⚠️ Debes seleccionar un cliente antes de generar la
                      cotización
                    </small>
                  )}
                </div>

                {clienteSeleccionado && (
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">
                      Cliente Seleccionado
                    </label>
                    <div className="p-3 bg-success bg-opacity-10 border border-success rounded">
                      <div className="d-flex align-items-center">
                        <svg
                          width="24"
                          height="24"
                          fill="#198754"
                          className="me-2"
                          viewBox="0 0 16 16"
                        >
                          <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z" />
                        </svg>
                        <div>
                          <div className="fw-semibold text-success">
                            {clienteSeleccionado.username}
                          </div>
                          <small className="text-muted">
                            {clienteSeleccionado.email}
                          </small>
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

      <div className="qf-section-header">
        <div>
          <h2 className="qf-title">Cotizador FCL</h2>
          <p className="qf-subtitle">
            Genera cotizaciones para envíos Full Container Load
          </p>
        </div>
      </div>

      {/* ============================================================================ */}
      {/* SECCIÓN 1: SELECCIÓN DE RUTA Y CONTENEDOR */}
      {/* ============================================================================ */}

      <div className="qf-card">
        <div
          className={`qf-card-header ${openSection === 1 ? "open" : ""}`}
          onClick={() => handleSectionToggle(1)}
        >
          <div className="d-flex align-items-center">
            <h3>
              <i
                className="bi bi-geo-alt me-2"
                style={{ color: "var(--qf-primary)" }}
              ></i>
              Paso 1: Selecciona Ruta y Contenedor
            </h3>
            {containerSeleccionado && (
              <span
                className="qf-badge ms-3"
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
            {!containerSeleccionado && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  refrescarTarifas();
                }}
                disabled={loadingRutas}
                className="qf-btn qf-btn-sm qf-btn-outline"
                title="Actualizar tarifas desde Google Sheets"
              >
                {loadingRutas ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-1"
                      role="status"
                      aria-hidden="true"
                    ></span>
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
            <i
              className={`bi bi-chevron-${openSection === 1 ? "up" : "down"}`}
              style={{ color: "var(--qf-text-secondary)" }}
            ></i>
          </div>
        </div>

        {openSection === 1 && (
          <div>
            {lastUpdate && !loadingRutas && !errorRutas && (
              <div
                className="alert alert-light py-2 px-3 mb-3 d-flex align-items-center justify-content-between"
                style={{ fontSize: "0.85rem" }}
              >
                <span className="text-muted">
                  <i className="bi bi-clock-history me-1"></i>
                  Última actualización:{" "}
                  {lastUpdate.toLocaleTimeString("es-CL", {
                    hour: "2-digit",
                    minute: "2-digit",
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
              <div className="alert alert-danger">❌ {errorRutas}</div>
            ) : (
              <>
                {/* Selectores de POL y POD */}
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="qf-label">Puerto de Origen (POL)</label>
                    <Select
                      value={polSeleccionado}
                      onChange={setPolSeleccionado}
                      options={opcionesPOL}
                      placeholder="Selecciona puerto de origen..."
                      isClearable
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderColor: "var(--qf-border-color)",
                          "&:hover": { borderColor: "var(--qf-primary)" },
                          boxShadow: "none",
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isSelected
                            ? "var(--qf-primary)"
                            : state.isFocused
                              ? "var(--qf-bg-light)"
                              : "white",
                        }),
                      }}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="qf-label">Puerto de Destino (POD)</label>
                    <Select
                      value={podSeleccionado}
                      onChange={setPodSeleccionado}
                      options={opcionesPOD}
                      placeholder={
                        polSeleccionado
                          ? "Selecciona puerto de destino..."
                          : "Selecciona origen primero"
                      }
                      isClearable
                      isDisabled={!polSeleccionado}
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderColor: "var(--qf-border-color)",
                          "&:hover": { borderColor: "var(--qf-primary)" },
                          backgroundColor: !polSeleccionado
                            ? "var(--qf-bg-light)"
                            : "white",
                          boxShadow: "none",
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isSelected
                            ? "var(--qf-primary)"
                            : state.isFocused
                              ? "var(--qf-bg-light)"
                              : "white",
                        }),
                      }}
                    />
                  </div>
                </div>

                {/* Rutas Disponibles */}
                {polSeleccionado && podSeleccionado && (
                  <div className="mt-4">
                    {/* Header mejorado */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0 d-flex align-items-center gap-2">
                        <i className="bi bi-ship"></i>
                        Rutas Disponibles
                        <span className="badge bg-light text-dark border">
                          {rutasFiltradas.length}
                        </span>
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
                            <p className="mb-1 fw-semibold">
                              {t("Quotelcl.norutas")}
                            </p>
                            <small className="text-muted">
                              {t("Quotelcl.intenta")}
                            </small>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="row g-3">
                        {rutasFiltradas.map((ruta, index) => (
                          <div key={ruta.id} className="col-md-6 col-lg-4">
                            <div
                              className={`qf-card h-100 position-relative`}
                              style={{
                                transition: "all 0.3s ease",
                                transform:
                                  rutaSeleccionada?.id === ruta.id
                                    ? "translateY(-4px)"
                                    : "none",
                                borderColor:
                                  rutaSeleccionada?.id === ruta.id
                                    ? "var(--qf-primary)"
                                    : "var(--qf-border-color)",
                                borderWidth:
                                  rutaSeleccionada?.id === ruta.id
                                    ? "2px"
                                    : "1px",
                                boxShadow:
                                  rutaSeleccionada?.id === ruta.id
                                    ? "0 4px 12px rgba(255, 98, 0, 0.15)"
                                    : "none",
                              }}
                            >
                              {/* Badge de "Mejor Opción" (solo en modo ejecutivo) */}
                              {isEjecutivoMode && index === 0 && (
                                <div
                                  className="position-absolute top-0 end-0 badge bg-warning text-dark"
                                  style={{
                                    borderTopRightRadius: "0.375rem",
                                    borderBottomLeftRadius: "0.375rem",
                                    fontSize: "0.7rem",
                                    zIndex: 1,
                                  }}
                                >
                                  <i className="bi bi-star-fill"></i> Mejor
                                  Opción
                                </div>
                              )}

                              <div>
                                {/* Header del carrier con logo */}
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                  <div className="d-flex align-items-center gap-2">
                                    {/* Logo del carrier */}
                                    <div
                                      className="rounded bg-white border p-2 d-flex align-items-center justify-content-center"
                                      style={{
                                        width: "50px",
                                        height: "50px",
                                        minWidth: "50px",
                                        overflow: "hidden",
                                      }}
                                    >
                                      <img
                                        src={`/logoscarrierfcl/${ruta.carrier.toLowerCase()}.png`}
                                        alt={ruta.carrier}
                                        style={{
                                          maxWidth: "150%",
                                          maxHeight: "150%",
                                          objectFit: "contain",
                                        }}
                                        onError={(e) => {
                                          const target = e.currentTarget;
                                          target.style.display = "none";
                                          const parent = target.parentElement;
                                          if (parent) {
                                            parent.innerHTML =
                                              '<i class="bi bi-box-seam text-primary fs-4"></i>';
                                          }
                                        }}
                                      />
                                    </div>

                                    <div>
                                      <span className="qf-badge qf-badge-primary">
                                        {ruta.carrier}
                                      </span>
                                    </div>
                                  </div>

                                  {rutaSeleccionada?.id === ruta.id && (
                                    <span className="badge bg-success">
                                      <i className="bi bi-check-circle-fill"></i>{" "}
                                      Seleccionada
                                    </span>
                                  )}
                                </div>

                                {/* Transit Time y Company */}
                                {ruta.tt && (
                                  <div className="mb-3">
                                    <div
                                      className="d-flex align-items-center gap-2 p-2 rounded"
                                      style={{
                                        backgroundColor: "var(--qf-bg-light)",
                                      }}
                                    >
                                      <i
                                        className="bi bi-clock"
                                        style={{ color: "var(--qf-primary)" }}
                                      ></i>
                                      <div className="flex-grow-1">
                                        <small
                                          className="d-block"
                                          style={{
                                            fontSize: "0.7rem",
                                            color: "var(--qf-text-secondary)",
                                          }}
                                        >
                                          Tiempo de tránsito
                                        </small>
                                        <small className="fw-semibold">
                                          {ruta.tt}
                                        </small>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {ruta.company && (
                                  <p className="small text-muted mb-3">
                                    <i className="bi bi-building"></i>{" "}
                                    {ruta.company}
                                  </p>
                                )}

                                {/* Validez */}
                                <div className="mb-3">
                                  <div
                                    className="d-flex align-items-center gap-2 p-2 rounded"
                                    style={{
                                      backgroundColor: ruta.validUntil
                                        ? "rgba(25, 135, 84, 0.08)"
                                        : "var(--qf-bg-light)",
                                    }}
                                  >
                                    <i
                                      className="bi bi-calendar-check"
                                      style={{
                                        color: ruta.validUntil
                                          ? "#198754"
                                          : "var(--qf-text-secondary)",
                                      }}
                                    ></i>
                                    <div className="flex-grow-1">
                                      <small
                                        className="d-block"
                                        style={{
                                          fontSize: "0.7rem",
                                          color: "var(--qf-text-secondary)",
                                        }}
                                      >
                                        Validez
                                      </small>
                                      <small
                                        className="fw-semibold"
                                        style={{
                                          color: ruta.validUntil
                                            ? "#198754"
                                            : "var(--qf-text-secondary)",
                                        }}
                                      >
                                        {ruta.validUntil
                                          ? `Válido hasta ${ruta.validUntil}`
                                          : "Sin validez"}
                                      </small>
                                    </div>
                                  </div>
                                </div>

                                {/* Botones de Contenedores */}
                                <div className="d-flex flex-column gap-2">
                                  {/* 20GP */}
                                  {ruta.gp20 &&
                                    ruta.gp20 !== "N/A" &&
                                    ruta.gp20 !== "-" && (
                                      <button
                                        type="button"
                                        className={`qf-btn w-100 justify-content-between ${
                                          rutaSeleccionada?.id === ruta.id &&
                                          containerSeleccionado?.type === "20GP"
                                            ? "qf-btn-primary"
                                            : "qf-btn-outline"
                                        }`}
                                        onClick={() =>
                                          handleSeleccionarContainer(
                                            ruta,
                                            "20GP",
                                          )
                                        }
                                      >
                                        <div className="d-flex justify-content-between align-items-center">
                                          <span className="fw-bold">
                                            <i className="bi bi-box me-2"></i>{" "}
                                            20GP
                                          </span>
                                          <span className="badge bg-light text-dark">
                                            {ruta.currency}{" "}
                                            {(
                                              extractPrice(ruta.gp20) * 1.15
                                            ).toFixed(0)}
                                          </span>
                                        </div>
                                      </button>
                                    )}

                                  {/* 40HQ */}
                                  {ruta.hq40 &&
                                    ruta.hq40 !== "N/A" &&
                                    ruta.hq40 !== "-" && (
                                      <button
                                        type="button"
                                        className={`qf-btn w-100 justify-content-between ${
                                          rutaSeleccionada?.id === ruta.id &&
                                          containerSeleccionado?.type === "40HQ"
                                            ? "qf-btn-primary"
                                            : "qf-btn-outline"
                                        }`}
                                        onClick={() =>
                                          handleSeleccionarContainer(
                                            ruta,
                                            "40HQ",
                                          )
                                        }
                                      >
                                        <div className="d-flex justify-content-between align-items-center">
                                          <span className="fw-bold">
                                            <i className="bi bi-box me-2"></i>{" "}
                                            40HQ
                                          </span>
                                          <span className="badge bg-light text-dark">
                                            {ruta.currency}{" "}
                                            {(
                                              extractPrice(ruta.hq40) * 1.15
                                            ).toFixed(0)}
                                          </span>
                                        </div>
                                      </button>
                                    )}

                                  {/* 40NOR */}
                                  {ruta.nor40 &&
                                    ruta.nor40 !== "N/A" &&
                                    ruta.nor40 !== "-" && (
                                      <button
                                        type="button"
                                        className={`qf-btn w-100 justify-content-between ${
                                          rutaSeleccionada?.id === ruta.id &&
                                          containerSeleccionado?.type ===
                                            "40NOR"
                                            ? "qf-btn-primary"
                                            : "qf-btn-outline"
                                        }`}
                                        onClick={() =>
                                          handleSeleccionarContainer(
                                            ruta,
                                            "40NOR",
                                          )
                                        }
                                      >
                                        <div className="d-flex justify-content-between align-items-center">
                                          <span className="fw-bold">
                                            <i className="bi bi-box me-2"></i>{" "}
                                            40NOR
                                          </span>
                                          <span className="badge bg-light text-dark">
                                            {ruta.currency}{" "}
                                            {(
                                              extractPrice(ruta.nor40) * 1.15
                                            ).toFixed(0)}
                                          </span>
                                        </div>
                                      </button>
                                    )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Resumen colapsado cuando está cerrado */}
        {openSection !== 1 && containerSeleccionado && rutaSeleccionada && (
          <div
            style={{ padding: "1rem", backgroundColor: "var(--qf-bg-light)" }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <small className="text-muted d-block">Ruta seleccionada:</small>
                <strong>
                  {rutaSeleccionada.pol} → {rutaSeleccionada.pod}
                </strong>
                <span className="ms-3 text-muted">|</span>
                <span className="qf-badge qf-badge-primary ms-2">
                  {rutaSeleccionada.carrier}
                </span>
              </div>
              <div className="d-flex align-items-center gap-3">
                <div>
                  <small className="text-muted d-block">Contenedor:</small>
                  <strong>{containerSeleccionado.type}</strong>
                </div>
                <div>
                  <span
                    className="badge bg-success"
                    style={{ fontSize: "0.9rem" }}
                  >
                    {rutaSeleccionada.currency}{" "}
                    {(containerSeleccionado.price * 1.15).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detalles de la ruta seleccionada */}
      {rutaSeleccionada && containerSeleccionado && (
        <>
          {/* Nuevos campos: Cantidad, Incoterm y Direcciones - CARD 1: DATOS */}
          <div className="qf-card mt-4">
            <div className="qf-card-header">
              <h3>Datos del Cargamento</h3>
            </div>
            <div className="row g-3">
              {/* Incoterm */}
              <div className="col-12 mb-3">
                <label className="qf-label">
                  <i
                    className="bi bi-flag me-2"
                    style={{ color: "var(--qf-primary)" }}
                  ></i>
                  Incoterm
                  <span
                    className="qf-badge ms-2"
                    style={{ fontSize: "0.7rem", fontWeight: 400 }}
                  >
                    Obligatorio
                  </span>
                </label>
                <select
                  className="qf-select"
                  value={incoterm}
                  onChange={(e) =>
                    setIncoterm(e.target.value as "EXW" | "FOB" | "")
                  }
                  style={{ maxWidth: 400 }}
                >
                  <option value="">Seleccione un Incoterm</option>
                  <option value="EXW">Ex Works [EXW]</option>
                  <option value="FOB">FOB</option>
                </select>
              </div>
              {/* Cantidad de Contenedores */}
              <div className="col-md-4">
                <label className="qf-label">Cantidad de Contenedores</label>
                <input
                  type="number"
                  className="qf-input"
                  value={cantidadContenedores}
                  onChange={(e) =>
                    setCantidadContenedores(
                      Math.max(1, Math.floor(Number(e.target.value) || 1)),
                    )
                  }
                  min="1"
                  step="1"
                />
                <small className="text-muted">
                  Ingrese la cantidad de contenedores que desea cotizar
                </small>
              </div>

              {/* Campos condicionales solo para EXW */}
              {incoterm === "EXW" && (
                <>
                  <div className="col-md-4">
                    <label className="qf-label">
                      Pickup From Address <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="qf-textarea"
                      value={pickupFromAddress}
                      onChange={(e) => setPickupFromAddress(e.target.value)}
                      placeholder="Ingrese dirección de recogida"
                      rows={3}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="qf-label">
                      Delivery To Address <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="qf-textarea"
                      value={deliveryToAddress}
                      onChange={(e) => setDeliveryToAddress(e.target.value)}
                      placeholder="Ingrese dirección de entrega"
                      rows={3}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* CARD 2: REVISIÓN / RESUMEN */}
          <div className="qf-card mt-4">
            <div className="qf-card-header">
              <h3>Revisión</h3>
            </div>

            <div className="qf-grid-2 mb-4">
              {/* COLUMNA 1: Resumen del Cargamento (Info Ruta/Contenedor) */}
              <div
                className="p-3 rounded border"
                style={{ backgroundColor: "var(--qf-bg-light)" }}
              >
                <h6 className="fw-bold mb-3">
                  <i className="bi bi-box-seam me-2"></i>Resumen del Cargamento
                </h6>
                <div className="d-flex flex-column gap-3 small">
                  <div>
                    <span className="text-muted d-block">Ruta:</span>
                    <div className="fw-bold d-flex align-items-center gap-2">
                      <span>{rutaSeleccionada.pol}</span>
                      <i className="bi bi-arrow-right text-primary"></i>
                      <span>{rutaSeleccionada.pod}</span>
                    </div>
                  </div>

                  <div className="row g-2">
                    <div className="col-6">
                      <span className="text-muted d-block">Carrier:</span>
                      <strong>{rutaSeleccionada.carrier}</strong>
                    </div>
                    <div className="col-6">
                      <span className="text-muted d-block">
                        Tiempo Tránsito:
                      </span>
                      <strong>{rutaSeleccionada.tt || "N/A"}</strong>
                    </div>
                  </div>

                  <div className="border-top my-1"></div>

                  <div className="row g-2">
                    <div className="col-6">
                      <span className="text-muted d-block">Contenedor:</span>
                      <strong>{containerSeleccionado.type}</strong>
                    </div>
                    <div className="col-6">
                      <span className="text-muted d-block">Cantidad:</span>
                      <strong>{cantidadContenedores} u.</strong>
                    </div>
                  </div>

                  {incoterm && (
                    <div className="mt-2 text-primary fw-bold text-center p-1 border border-primary rounded bg-white">
                      Incoterm: {incoterm}
                    </div>
                  )}
                </div>
              </div>

              {/* COLUMNA 2: Resumen de Cargos */}
              <div
                className="p-3 rounded border"
                style={{ backgroundColor: "var(--qf-bg-light)" }}
              >
                <h6 className="fw-bold mb-3">
                  <i className="bi bi-cash-coin me-2"></i>Resumen de Cargos
                </h6>

                <div className="d-flex flex-column gap-2 small">
                  {/* BL */}
                  <div className="d-flex justify-content-between">
                    <span>BL:</span>
                    <strong>{rutaSeleccionada.currency} 60.00</strong>
                  </div>

                  {/* Handling */}
                  <div className="d-flex justify-content-between">
                    <span>Handling:</span>
                    <strong>{rutaSeleccionada.currency} 45.00</strong>
                  </div>

                  {/* EXW - Solo si aplica */}
                  {incoterm === "EXW" && (
                    <div className="d-flex justify-content-between">
                      <span>
                        EXW Charges ({cantidadContenedores} ×{" "}
                        {containerSeleccionado.type}):
                      </span>
                      <strong>
                        {rutaSeleccionada.currency}{" "}
                        {calculateEXWRate(
                          containerSeleccionado.type,
                          cantidadContenedores,
                        ).toLocaleString()}
                      </strong>
                    </div>
                  )}

                  {/* Ocean Freight */}
                  <div className="d-flex justify-content-between pb-2 border-bottom">
                    <span>
                      Ocean Freight ({cantidadContenedores} ×{" "}
                      {containerSeleccionado.type}):
                    </span>
                    <strong className="text-success">
                      {rutaSeleccionada.currency}{" "}
                      {(
                        containerSeleccionado.price *
                        1.15 *
                        cantidadContenedores
                      ).toFixed(2)}
                    </strong>
                  </div>

                  {/* Seguro opcional */}
                  <div className="mt-2">
                    <div className="qf-switch-container p-2 mb-2">
                      <input
                        className="qf-switch-input"
                        type="checkbox"
                        id="seguroCheckbox"
                        checked={seguroActivo}
                        onChange={(e) => setSeguroActivo(e.target.checked)}
                      />
                      <label
                        className="qf-label mb-0 ms-2 small"
                        htmlFor="seguroCheckbox"
                        style={{ cursor: "pointer" }}
                      >
                        Agregar Seguro
                      </label>
                    </div>

                    {/* Input para Valor de Mercadería - Solo visible si seguro está activo */}
                    {seguroActivo && (
                      <div className="mb-2">
                        <label
                          htmlFor="valorMercaderia"
                          className="qf-label small"
                        >
                          Valor Mercadería ({rutaSeleccionada.currency}){" "}
                          <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="qf-input py-1"
                          id="valorMercaderia"
                          placeholder="Ej: 10000"
                          value={valorMercaderia}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "" || /^[\d,\.]+$/.test(value)) {
                              setValorMercaderia(value);
                            }
                          }}
                        />
                      </div>
                    )}

                    {/* Mostrar el cargo del seguro si está activo */}
                    {seguroActivo && calculateSeguro() > 0 && (
                      <div className="d-flex justify-content-between text-info small">
                        <span>Seguro:</span>
                        <strong>
                          {rutaSeleccionada.currency}{" "}
                          {calculateSeguro().toFixed(2)}
                        </strong>
                      </div>
                    )}
                  </div>

                  {/* Total */}
                  <div className="d-flex justify-content-between mt-3 pt-2 border-top">
                    <span className="fs-6 fw-bold">TOTAL:</span>
                    <span
                      className="fs-6 fw-bold"
                      style={{ color: "var(--qf-primary)" }}
                    >
                      {rutaSeleccionada.currency}{" "}
                      {(
                        60 + // BL
                        45 + // Handling
                        (incoterm === "EXW"
                          ? calculateEXWRate(
                              containerSeleccionado.type,
                              cantidadContenedores,
                            )
                          : 0) + // EXW
                        containerSeleccionado.price *
                          1.15 *
                          cantidadContenedores + // Ocean Freight
                        (seguroActivo ? calculateSeguro() : 0)
                      ) // Seguro (si está activo)
                        .toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* SECCIÓN 2: GENERAR COTIZACIÓN */}
          <div className="qf-card mb-4">
            <div className="qf-card-header">
              <h3>{t("QuoteAIR.generador")}</h3>
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <div
                  className="h-100 p-4 rounded border text-center"
                  style={{
                    backgroundColor: "transparent",
                    borderColor: "var(--qf-border-color)",
                    transition: "all 0.2s",
                  }}
                >
                  <div className="mb-3">
                    <i
                      className="bi bi-file-earmark-pdf"
                      style={{ fontSize: "2rem", color: "var(--qf-primary)" }}
                    ></i>
                  </div>
                  <h5 className="mb-2" style={{ fontWeight: 600 }}>
                    {t("QuoteAIR.generarcotizacion")}
                  </h5>
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
                      !rutaSeleccionada ||
                      !containerSeleccionado ||
                      !incoterm ||
                      (incoterm === "EXW" &&
                        (!pickupFromAddress || !deliveryToAddress))
                    }
                    className="qf-btn qf-btn-outline w-100"
                    style={{
                      color: "var(--qf-primary)",
                      borderColor: "var(--qf-primary)",
                    }}
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

              <div className="col-md-6">
                <div
                  className="h-100 p-4 rounded border text-center"
                  style={{
                    backgroundColor: "transparent",
                    borderColor: "var(--qf-border-color)",
                    transition: "all 0.2s",
                  }}
                >
                  <div className="mb-3">
                    <i
                      className="bi bi-gear"
                      style={{ fontSize: "2rem", color: "var(--qf-primary)" }}
                    ></i>
                  </div>
                  <h5 className="mb-2" style={{ fontWeight: 600 }}>
                    {t("QuoteAIR.generaroperacion")}
                  </h5>
                  <p className="text-muted small mb-4">
                    <strong className="text-muted">
                      {t("QuoteAIR.accionirreversible")}
                    </strong>{" "}
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
                      !rutaSeleccionada ||
                      !containerSeleccionado ||
                      !incoterm ||
                      (incoterm === "EXW" &&
                        (!pickupFromAddress || !deliveryToAddress))
                    }
                    className="qf-btn qf-btn-outline w-100"
                    style={{
                      color: "var(--qf-primary)",
                      borderColor: "var(--qf-primary)",
                    }}
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
        </>
      )}

      {/* ============================================================================ */}
      {/* SECCIÓN 3: RESULTADOS */}
      {/* ============================================================================ */}

      {/* Error */}
      {error && (
        <div className="qf-alert qf-alert-danger mb-4">
          <div>
            <h5 className="alert-heading h6 fw-bold">
              ❌ Error en la Cotización
            </h5>
            <p className="mb-0">{error}</p>
          </div>
        </div>
      )}

      {/* Respuesta exitosa */}
      {response && (
        <div className="qf-card mb-4" style={{ borderColor: "#28a745" }}>
          <div className="qf-card-header bg-success text-white">
            <h5 className="mb-0">
              ✅ Tu cotización se ha generado exitosamente
            </h5>
          </div>
          <div style={{ padding: "1.5rem" }}>
            <div className="alert alert-success mb-0">
              En unos momentos se descargará automáticamente el PDF de la
              cotización.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuoteFCL;
