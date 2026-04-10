import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useAuditLog } from "../../hooks/useAuditLog";
import { packageTypeOptions } from "./PackageTypes/PiecestypesAIR";
import * as XLSX from "xlsx";
import Select from "react-select";
import { Modal, Button, OverlayTrigger, Tooltip } from "react-bootstrap";
import { PDFTemplateAIR } from "./Pdftemplate/Pdftemplateair";
import {
  generatePDF,
  generatePDFBase64,
  formatDateForFilename,
} from "./Pdftemplate/Pdfutils";
import { useTranslation } from "react-i18next";
import ReactDOM from "react-dom/client";
import * as bootstrap from "bootstrap";
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
  getWeightRangeValidation,
  type QuoteAIRProps,
  type PieceData,
  type ClienteAsignado,
} from "./Handlers/Air/HandlerQuoteAir";
import { PieceAccordion } from "./Handlers/Air/PieceAccordion";
import { WeightRangeAlert } from "./Handlers/Air/WeightRangeAlert";
import {
  OversizeNotifyExecutive,
  type OversizeReason,
} from "./Handlers/Air/OversizeNotifyExecutive";
import { AduanaSection } from "./Handlers/Air/AduanaSection";
import { useAgenciaAduanas } from "../../hooks/useAgenciaAduanas";
import {
  calculateAduanaCharges,
  type SupportedCurrency,
} from "../../types/agenciaAduana";
import {
  fetchExpandedRoutesAir,
  type ExpandedRoutesAirData,
} from "./Handlers/Air/ExpandedRoutesAir";
import "./QuoteAIR.css";
import CotizadorAddressMap from "../Map/CotizadorAddressMap";
import type { DestinationCoords } from "../Map/CotizadorAddressMap";
import { getAirportByOrigin } from "../../config/airportCoordinates";
import { linbisFetch } from "../../services/linbisFetch";

// ============================================================================
// MARKUP CONFIGURABLE PARA COBROS FCA (Local Charges & Gastos x kg)
// Modificar este valor para ajustar el porcentaje de markup sobre los cobros FCA.
// Ejemplo: 1.20 = 20% adicional, 1.30 = 30% adicional
// ============================================================================
const FCA_MARKUP = 1.2;

/** Expande cuentas multi-empresa: una entrada por empresa en el selector */
function expandClientesPorEmpresa(
  clientes: ClienteAsignado[],
): ClienteAsignado[] {
  const expanded: ClienteAsignado[] = [];
  for (const cliente of clientes) {
    const names =
      cliente.usernames && cliente.usernames.length > 1
        ? cliente.usernames
        : [cliente.username];
    for (const name of names) {
      expanded.push({ ...cliente, username: name });
    }
  }
  return expanded;
}

function QuoteAPITester({
  preselectedOrigin,
  preselectedDestination,
  isEjecutivoMode = false,
}: QuoteAIRProps = {}) {
  const { accessToken, refreshAccessToken } = useOutletContext<OutletContext>();
  const {
    user,
    token,
    activeUsername,
    getMisClientes,
    getTodosClientes,
    loading: authLoading,
  } = useAuth();
  const ejecutivo = user?.ejecutivo;
  const { t } = useTranslation();
  const { registrarEvento } = useAuditLog();

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

  // Estados para selección de cliente (modo ejecutivo)
  const [clientesAsignados, setClientesAsignados] = useState<ClienteAsignado[]>(
    [],
  );
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<ClienteAsignado | null>(null);
  const [loadingClientes, setLoadingClientes] = useState(isEjecutivoMode);
  const [errorClientes, setErrorClientes] = useState<string | null>(null);

  // Username efectivo: en modo ejecutivo usa el cliente seleccionado, en modo normal usa activeUsername
  const effectiveUsername = isEjecutivoMode
    ? clienteSeleccionado?.username || user?.username || ""
    : activeUsername || "";
  const salesRepName = isEjecutivoMode
    ? user?.nombreuser || user?.username || ""
    : ejecutivo?.nombre?.trim() || "";

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

  // Delivery computed after NR states below
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

  // Estado para sinTarifa (ruta expandida sin tarifa en el sheet aéreo)
  const [sinTarifa, setSinTarifa] = useState(false);

  // ============================================================================
  // ESTADOS PARA RUTAS EXPANDIDAS Y SELECTOR DUAL
  // ============================================================================
  const [expandedRoutesAir, setExpandedRoutesAir] =
    useState<ExpandedRoutesAirData | null>(null);
  const [routeMode, setRouteMode] = useState<
    "recurrente" | "noRecurrente" | null
  >(null);
  const [originNR, setOriginNR] = useState<SelectOption | null>(null);
  const [destNR, setDestNR] = useState<SelectOption | null>(null);
  const [opcionesOrigin_NR, setOpcionesOrigin_NR] = useState<SelectOption[]>(
    [],
  );
  const [opcionesDest_NR, setOpcionesDest_NR] = useState<SelectOption[]>([]);

  // Delivery is derived from the selected Destination and is not editable by the user
  const deliveryToAddressDerived = destinationSeleccionado
    ? destinationSeleccionado.label
    : destNR
      ? destNR.label
      : "";

  // Estado para modal de precio 0
  const [showPriceZeroModal, setShowPriceZeroModal] = useState(false);

  // Estado para notificación oversize al ejecutivo
  const [loadingOversizeNotify, setLoadingOversizeNotify] = useState(false);

  // Estado para el seguro opcional
  const [seguroActivo, setSeguroActivo] = useState(false);
  const [valorMercaderia, setValorMercaderia] = useState<string>("");
  // Estado para Gastos Locales (Desconsolidación)
  const [gastolocal, setGastolocal] = useState(false);

  // Estado para Agencia de Aduanas y Nacionalización
  const [aduanaActivo, setAduanaActivo] = useState(false);
  const [valorProductoAduana, setValorProductoAduana] = useState<string>("");
  /**
   * aduanaMaster controla qué input es la "fuente de verdad" cuando ambos están activos:
   *   true  → aduana fue activada primero → valorProductoAduana es editable, valorMercaderia está bloqueado
   *   false → seguro fue activado primero  → valorMercaderia es editable, valorProductoAduana está bloqueado
   *   null  → solo uno está activo (sin bloqueos)
   */
  const [aduanaMaster, setAduanaMaster] = useState<boolean | null>(null);
  const { config: aduanaConfig, loading: aduanaConfigLoading } =
    useAgenciaAduanas();

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

        // Fetch del CSV desde Google Sheets (tarifas aéreas)
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

        // Extraer origins únicos del sheet de tarifas (solo rutas con tarifa)
        const originsMap = new Map<string, string>();
        rutasParsed.forEach((r) => {
          const norm = normalize(r.origin);
          if (norm && !originsMap.has(norm)) {
            originsMap.set(norm, capitalize(r.origin));
          }
        });

        const originsUnicos = Array.from(originsMap.entries())
          .map(([value, label]) => ({ value, label }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setOpcionesOrigin(originsUnicos);

        // Cargar y guardar rutas expandidas para selector no recurrente
        try {
          const expanded = await fetchExpandedRoutesAir();
          setExpandedRoutesAir(expanded);
          setOpcionesOrigin_NR(expanded.origins);
        } catch (expandErr) {
          console.warn("Error cargando rutas aéreas expandidas:", expandErr);
        }

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

  // Cargar clientes asignados al ejecutivo (solo en modo ejecutivo)
  const isPricingRole = user?.roles?.pricing === true;
  useEffect(() => {
    if (!isEjecutivoMode) {
      setLoadingClientes(false);
      return;
    }

    const cargarClientes = async () => {
      if (user?.username !== "Ejecutivo" && !isPricingRole) {
        setLoadingClientes(false);
        return;
      }

      try {
        setLoadingClientes(true);
        // Pricing role obtiene TODOS los clientes, ejecutivo solo sus asignados
        const clientes = isPricingRole
          ? await getTodosClientes()
          : await getMisClientes();
        const expanded = expandClientesPorEmpresa(clientes);
        setClientesAsignados(expanded);

        if (expanded.length === 1) {
          setClienteSeleccionado(expanded[0]);
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
  }, [user, getMisClientes, getTodosClientes, isEjecutivoMode, isPricingRole]);

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

  // Auto-completar valor producto de aduana con valorMercaderia del seguro
  // REEMPLAZADO POR handleToggleSeguro / handleToggleAduana

  /**
   * Toggle del seguro.
   * Caso 3: si aduana ya está activo → copia valorProductoAduana → valorMercaderia y bloquea aduana (aduanaMaster=false).
   * Al desactivar: libera el bloqueo si aduana era master.
   */
  const handleToggleSeguro = (checked: boolean) => {
    setSeguroActivo(checked);
    if (checked) {
      if (aduanaActivo) {
        // Aduana ya activo → seguro es el esclavo, aduana es master
        // Copia valorProductoAduana → valorMercaderia y bloquea valorMercaderia
        setValorMercaderia(valorProductoAduana);
        setAduanaMaster(true); // aduana es master
      } else {
        // Solo seguro se activa → seguro es master
        setAduanaMaster(null);
      }
    } else {
      // Se desactiva el seguro
      if (aduanaActivo) {
        // Solo aduana queda activo → sin bloqueo
        setAduanaMaster(null);
      } else {
        setAduanaMaster(null);
      }
    }
  };

  /**
   * Toggle de aduana.
   * Caso 2: si seguro ya está activo → copia valorMercaderia → valorProductoAduana y bloquea aduana (aduanaMaster=false).
   * Caso 3 inverso: si seguro ya NO está activo → aduana es master.
   * Al desactivar: limpia el estado de bloqueo.
   */
  const handleToggleAduana = (checked: boolean) => {
    setAduanaActivo(checked);
    if (checked) {
      if (seguroActivo) {
        // Seguro ya activo → seguro es master, aduana es esclavo
        setValorProductoAduana(valorMercaderia);
        setAduanaMaster(false); // seguro es master
      } else {
        // Aduana se activa primero → aduana es master
        setAduanaMaster(null); // sin bloqueo todavía (solo aduana activo)
      }
    } else {
      // Se desactiva aduana
      setAduanaActivo(false);
      setAduanaMaster(null);
    }
  };

  /**
   * Cambio en el input de valorMercaderia (seguro).
   * Si aduana es esclavo (aduanaMaster=false), sincronizar valorProductoAduana.
   */
  const handleValorMercaderiaChange = (value: string) => {
    setValorMercaderia(value);
    if (aduanaMaster === false && aduanaActivo) {
      setValorProductoAduana(value);
    }
  };

  /**
   * Cambio en el input de valorProductoAduana (aduana).
   * Si seguro es esclavo (aduanaMaster=true), sincronizar valorMercaderia.
   */
  const handleValorProductoAduanaChange = (value: string) => {
    setValorProductoAduana(value);
    if (aduanaMaster === true && seguroActivo) {
      setValorMercaderia(value);
    }
  };

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

  // Duplicar pieza: clona la pieza indicada (por id) o la última abierta/última pieza
  const handleDuplicatePiece = (fromId?: string) => {
    if (piecesData.length >= 10) {
      setShowMaxPiecesModal(true);
      return;
    }

    setPiecesData((prev) => {
      if (prev.length === 0) return prev;

      // Determinar id origen: desde argumento, o última abierta, o última pieza
      let sourceId: string | undefined = fromId;
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
        // id será renumerada más abajo
        id: "",
        packageType: sourcePiece.packageType,
        description: sourcePiece.description,
        length: sourcePiece.length,
        width: sourcePiece.width,
        height: sourcePiece.height,
        weight: sourcePiece.weight,
        noApilable: sourcePiece.noApilable,
        volume: sourcePiece.volume,
        totalVolume: sourcePiece.totalVolume,
        volumeWeight: sourcePiece.volumeWeight,
        totalVolumeWeight: sourcePiece.totalVolumeWeight,
        totalWeight: sourcePiece.totalWeight,
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
    });

    setOversizeError(hasOversize ? t("QuoteAIR.oversize") : null);
    setHeightError(hasHeightError ? t("QuoteAIR.altura") : null);
    setCargoFlightWarning(hasCargoWarning ? t("QuoteAIR.alturasupera") : null);
  }, [piecesData, overallDimsAndWeight]);

  // ============================================================================
  // ACTUALIZAR DESTINATIONS CUANDO CAMBIA ORIGIN
  // ============================================================================

  useEffect(() => {
    if (originSeleccionado) {
      // Destinations del sheet de tarifas (solo rutas con tarifa)
      const destsMap = new Map<string, string>();
      rutas
        .filter((r) => r.originNormalized === originSeleccionado.value)
        .forEach((r) => {
          const norm = normalize(r.destination);
          if (norm && !destsMap.has(norm)) {
            destsMap.set(norm, capitalize(r.destination));
          }
        });

      const destinationsUnicos = Array.from(destsMap.entries())
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label));
      setOpcionesDestination(destinationsUnicos);

      setDestinationSeleccionado(null);
      setRutaSeleccionada(null);
      setSinTarifa(false);
    } else {
      setOpcionesDestination([]);
      setDestinationSeleccionado(null);
      setRutaSeleccionada(null);
      setSinTarifa(false);
    }
  }, [originSeleccionado, rutas]);

  // ============================================================================
  // ACTUALIZAR DESTINATIONS NO RECURRENTES CUANDO CAMBIA ORIGIN NR
  // ============================================================================
  useEffect(() => {
    if (originNR && expandedRoutesAir) {
      const destsForOrigin = expandedRoutesAir.rows
        .filter((r) => r.originNorm === originNR.value)
        .reduce((map, r) => {
          if (!map.has(r.destNorm)) map.set(r.destNorm, r.destLabel);
          return map;
        }, new Map<string, string>());
      const destsUnicos = Array.from(destsForOrigin.entries())
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label));
      setOpcionesDest_NR(destsUnicos);
      setDestNR(null);
    } else {
      setOpcionesDest_NR([]);
      setDestNR(null);
    }
  }, [originNR, expandedRoutesAir]);

  // Auto-activar sinTarifa cuando se selecciona ruta no recurrente aérea
  // Si la ruta coincide con una recurrente, se trata como recurrente (smart routing)
  useEffect(() => {
    if (!originNR || !destNR || loadingRutas) return;

    // Smart routing: check if combination exists in recurring routes
    const matchingRoutes = rutas.filter((r) => {
      const validityState = getValidityClass(r.validUntil);
      if (validityState === "expired") return false;
      return (
        r.originNormalized === originNR.value &&
        r.destinationNormalized === destNR.value &&
        (!r.carrier || carriersActivos.has(r.carrier)) &&
        monedasActivas.has(r.currency)
      );
    });

    if (matchingRoutes.length > 0) {
      // This NR route is actually a recurring route — upgrade seamlessly
      setOriginSeleccionado({ value: originNR.value, label: originNR.label });
      setDestinationSeleccionado({ value: destNR.value, label: destNR.label });
      setRouteMode("recurrente");
      setOriginNR(null);
      setDestNR(null);
      setSinTarifa(false);
      return;
    }

    const mockRuta: RutaAerea = {
      id: "AIR-PENDING",
      origin: originNR.label,
      originNormalized: originNR.value,
      destination: destNR.label,
      destinationNormalized: destNR.value,
      kg45: null,
      kg100: null,
      kg300: null,
      kg500: null,
      kg1000: null,
      carrier: "X",
      carrierNormalized: "x",
      frequency: null,
      transitTime: "X",
      routing: null,
      remark1: null,
      remark2: null,
      validUntil: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toLocaleDateString("es-CL"),
      localCharges: 0,
      gastosXKg: 0,
      minGastosXKg: 0,
      row_number: 0,
      priceForComparison: 0,
      currency: "USD",
    };
    setRutaSeleccionada(mockRuta);
    setSinTarifa(true);
  }, [originNR, destNR, loadingRutas, rutas, carriersActivos, monedasActivas]);

  // ============================================================================
  // Auto-activar sinTarifa cuando no hay rutas con tarifa para Origin+Destination
  // ============================================================================
  useEffect(() => {
    if (!originSeleccionado || !destinationSeleccionado || loadingRutas) return;

    const hayRutas = rutas.some((r) => {
      const validityState = getValidityClass(r.validUntil);
      if (validityState === "expired") return false;
      const matchOrigin = r.originNormalized === originSeleccionado.value;
      const matchDestination =
        r.destinationNormalized === destinationSeleccionado.value;
      const matchCarrier = !r.carrier || carriersActivos.has(r.carrier);
      return matchOrigin && matchDestination && matchCarrier;
    });

    if (!hayRutas && !rutaSeleccionada) {
      const mockRuta: RutaAerea = {
        id: "AIR-PENDING",
        origin: originSeleccionado.label,
        originNormalized: originSeleccionado.value,
        destination: destinationSeleccionado.label,
        destinationNormalized: destinationSeleccionado.value,
        kg45: null,
        kg100: null,
        kg300: null,
        kg500: null,
        kg1000: null,
        carrier: "X",
        carrierNormalized: "x",
        frequency: null,
        transitTime: "X",
        routing: null,
        remark1: null,
        remark2: null,
        validUntil: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toLocaleDateString("es-CL"),
        localCharges: 0,
        gastosXKg: 0,
        minGastosXKg: 0,
        row_number: 0,
        priceForComparison: 0,
        currency: "USD",
      };
      setRutaSeleccionada(mockRuta);
      setSinTarifa(true);
    } else if (hayRutas) {
      setSinTarifa(false);
    }
  }, [
    originSeleccionado,
    destinationSeleccionado,
    rutas,
    carriersActivos,
    loadingRutas,
  ]);

  useEffect(() => {
    const tooltipTriggerList = document.querySelectorAll(
      '[data-bs-toggle="tooltip"]',
    );
    tooltipTriggerList.forEach((tooltipTriggerEl) => {
      new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }, []);

  // ============================================================================
  // VALIDITY PARSER (moved here): determina si la fecha "Válido Hasta" está vigente
  // Soporta: DD/MM/YYYY, serial GSheets, texto español ("28 marzo" o "28 febrero 2026")
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
      const epoch = new Date(1899, 11, 30);
      expiry = new Date(epoch.getTime() + serial * 86400000);
    }

    // 2) Intentar formato ISO YYYY-MM-DD (ej: 2026-03-10)
    if (!expiry) {
      const match = txt.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);
        expiry = new Date(year, month - 1, day, 23, 59, 59, 999);
      }
    }

    // 3) Intentar formato DD/MM/YYYY o DD/M/YYYY
    if (!expiry) {
      const match = txt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (match) {
        const part1 = parseInt(match[1], 10);
        const part2 = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);

        if (part1 > 12) {
          expiry = new Date(year, part2 - 1, part1, 23, 59, 59, 999);
        } else if (part2 > 12) {
          expiry = new Date(year, part1 - 1, part2, 23, 59, 59, 999);
        } else {
          expiry = new Date(year, part2 - 1, part1, 23, 59, 59, 999);
        }
      }
    }

    // 4) Intentar formato texto español (ej: "28 febrero 2026" o "28 marzo")
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
  // CONVERTIR validUntil A ISO 8601 (soporta DD/M/YYYY, serial GSheets, texto español)
  // ============================================================================
  const parseValidUntilToISO = (validUntil?: string | null): string => {
    // Fallback: 7 días desde hoy si no se puede parsear
    const fallback = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    if (!validUntil) return fallback;

    const txt = String(validUntil).trim();
    if (!txt) return fallback;

    let expiry: Date | null = null;

    // 1) Serial de Google Sheets (ej: 46072)
    if (/^\d{5}$/.test(txt)) {
      const serial = parseInt(txt, 10);
      const epoch = new Date(Date.UTC(1899, 11, 30));
      expiry = new Date(epoch.getTime() + serial * 86400000);
    }

    // 2) Formato ISO YYYY-MM-DD (ej: 2026-03-10)
    if (!expiry) {
      const match = txt.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);
        expiry = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
      }
    }

    // 3) Formato DD/MM/YYYY o DD/M/YYYY
    if (!expiry) {
      const match = txt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (match) {
        const part1 = parseInt(match[1], 10);
        const part2 = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        if (part1 > 12) {
          expiry = new Date(Date.UTC(year, part2 - 1, part1, 23, 59, 59, 999));
        } else if (part2 > 12) {
          expiry = new Date(Date.UTC(year, part1 - 1, part2, 23, 59, 59, 999));
        } else {
          expiry = new Date(Date.UTC(year, part2 - 1, part1, 23, 59, 59, 999));
        }
      }
    }

    // 4) Texto español ("28 febrero 2026" o "28 marzo")
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
          expiry = new Date(Date.UTC(year, monthIndex, day, 23, 59, 59, 999));
        }
      }
    }

    if (!expiry || isNaN(expiry.getTime())) return fallback;
    return expiry.toISOString();
  };

  // ============================================================================
  // FILTRAR RUTAS (ahora excluye rutas con fecha vencida)
  // ============================================================================

  const rutasFiltradas = rutas
    .filter((ruta) => {
      if (!originSeleccionado || !destinationSeleccionado) return false;

      // Excluir rutas cuya validez haya expirado
      const validityState = getValidityClass(ruta.validUntil);
      if (validityState === "expired") return false;

      const matchOrigin = ruta.originNormalized === originSeleccionado.value;
      const matchDestination =
        ruta.destinationNormalized === destinationSeleccionado.value;

      const matchCarrier = !ruta.carrier || carriersActivos.has(ruta.carrier);
      const matchMoneda = monedasActivas.has(ruta.currency);

      return matchOrigin && matchDestination && matchCarrier && matchMoneda;
    })
    .sort((a, b) => a.priceForComparison - b.priceForComparison);

  // ============================================================================
  // HANDLERS PARA SELECTOR DUAL (RECURRENTES / NO RECURRENTES)
  // ============================================================================

  const handleOriginRecurrenteChange = (option: SelectOption | null) => {
    setOriginSeleccionado(option);
    setDestinationSeleccionado(null);
    setRutaSeleccionada(null);
    setSinTarifa(false);
  };

  const handleOriginNRChange = (option: SelectOption | null) => {
    setOriginNR(option);
    setDestNR(null);
    setRutaSeleccionada(null);
    setSinTarifa(false);
  };

  const handleDestNRChange = (option: SelectOption | null) => {
    setDestNR(option);
    if (!option) {
      setRutaSeleccionada(null);
      setSinTarifa(false);
    }
  };

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

  // Validar si el peso chargeable cae en un rango con precio disponible
  const weightRangeValidation = rutaSeleccionada
    ? getWeightRangeValidation(rutaSeleccionada, pesoChargeable)
    : null;

  // Error de rango de peso: true cuando la ruta no tiene precio en el rango actual
  const weightRangeError =
    weightRangeValidation !== null && !weightRangeValidation.tienePrecio;

  //calculo de exw
  const calculateEXWRate = (weightKg: number, volumeWeightKg: number) => {
    const chargeableWeight = Math.max(weightKg, volumeWeightKg);

    let ratePerKg = 0;

    if (chargeableWeight >= 500) {
      ratePerKg = 0.8;
    } else if (chargeableWeight >= 300) {
      ratePerKg = 1.2;
    } else {
      ratePerKg = 1.6;
    }

    const calculatedRate = chargeableWeight * ratePerKg;
    return Math.max(calculatedRate, 250);
  };

  // Función para calcular el seguro (TOTAL * 1.1 * 0.002)
  const calculateSeguro = (): number => {
    if (!seguroActivo || (!tarifaAirFreight && !sinTarifa)) return 0;

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
      (tarifaAirFreight?.precioConMarkup ?? 0) * pesoChargeable + // Air Freight
      (incoterm === "FCA" && rutaSeleccionada
        ? (rutaSeleccionada.localCharges > 0
            ? rutaSeleccionada.localCharges * FCA_MARKUP
            : 0) +
          (rutaSeleccionada.gastosXKg > 0
            ? Math.max(
                rutaSeleccionada.gastosXKg * pesoChargeable * FCA_MARKUP,
                rutaSeleccionada.minGastosXKg > 0
                  ? rutaSeleccionada.minGastosXKg
                  : 0,
              )
            : 0)
        : 0); // FCA charges

    return Math.max((valorCarga + totalSinSeguro) * 1.1 * 0.0025, 25);
  };

  // Función para calcular el cobro de no apilable (80% adicional del EXW, solo si incoterm es EXW)
  const calculateNoApilable = (): number => {
    if (!noApilableActivo || incoterm !== "EXW") return 0;

    const { totalRealWeight } = calculateTotals();
    const chargeableWeightCalc = overallDimsAndWeight
      ? Math.max(manualWeight, manualVolume * 167)
      : Math.max(totalRealWeight, calculateTotals().totalVolumetricWeight);
    const exwRate = calculateEXWRate(totalRealWeight, chargeableWeightCalc);

    return exwRate * 0.6;
  };

  // Función para calcular FCA Local Charges (solo si incoterm es FCA y la ruta tiene localCharges > 0)
  const calculateFCALocalCharges = (): number => {
    if (incoterm !== "FCA" || !rutaSeleccionada) return 0;
    const base = rutaSeleccionada.localCharges;
    if (base <= 0) return 0;
    return base * FCA_MARKUP;
  };

  // Función para calcular Gastos x kg (solo si incoterm es FCA)
  // Aplica: gastosXKg * pesoChargeable * markup, con mínimo de minGastosXKg
  const calculateGastosXKg = (): number => {
    if (incoterm !== "FCA" || !rutaSeleccionada) return 0;
    const ratePerKg = rutaSeleccionada.gastosXKg;
    if (ratePerKg <= 0) return 0;
    const calculated = ratePerKg * pesoChargeable * FCA_MARKUP;
    const minimo = rutaSeleccionada.minGastosXKg;
    return minimo > 0 ? Math.max(calculated, minimo) : calculated;
  };

  // Función para calcular el costo de transporte base (sin opcionales)
  const calculateCostoTransporteBase = (): number => {
    if (!tarifaAirFreight && !sinTarifa) return 0;
    const { totalRealWeight } = calculateTotals();
    return (
      45 + // Handling
      (incoterm === "EXW"
        ? calculateEXWRate(totalRealWeight, pesoChargeable)
        : 0) +
      30 + // AWB
      Math.max(pesoChargeable * 0.15, 50) + // Airport Transfer
      (tarifaAirFreight?.precioConMarkup ?? 0) * pesoChargeable + // Air Freight
      (incoterm === "FCA" && rutaSeleccionada
        ? (rutaSeleccionada.localCharges > 0
            ? rutaSeleccionada.localCharges * FCA_MARKUP
            : 0) +
          (rutaSeleccionada.gastosXKg > 0
            ? Math.max(
                rutaSeleccionada.gastosXKg * pesoChargeable * FCA_MARKUP,
                rutaSeleccionada.minGastosXKg > 0
                  ? rutaSeleccionada.minGastosXKg
                  : 0,
              )
            : 0)
        : 0)
    );
  };

  // Función para calcular el monto de Agencia de Aduanas
  const calculateAduana = (): number => {
    if (!aduanaActivo || (!tarifaAirFreight && !sinTarifa)) return 0;
    const valorProd = parseFloat(valorProductoAduana.replace(",", ".")) || 0;
    if (valorProd === 0) return 0;

    const costoTransporte = calculateCostoTransporteBase();

    // Determinar el seguro para CIF
    let seguroParaCIF: number;
    if (seguroActivo) {
      seguroParaCIF = calculateSeguro();
    } else {
      // Seguro teórico: ((valor producto + valor transporte) * 1.1) * 0.02
      seguroParaCIF = (valorProd + costoTransporte) * 1.1 * 0.02;
    }

    const result = calculateAduanaCharges(
      valorProd,
      costoTransporte,
      seguroParaCIF,
      (rutaSeleccionada?.currency || "USD") as SupportedCurrency,
      aduanaConfig,
    );

    return result.total;
  };

  // ============================================================================
  // FUNCIÓN DE TEST API
  // ============================================================================

  const testAPI = async (
    tipoAccion: "cotizacion" | "operacion" = "cotizacion",
  ) => {
    if (authLoading) {
      setError(
        "Espera a que termine de cargarse la sesión antes de generar la cotización",
      );
      return;
    }

    if (!rutaSeleccionada) {
      setError("Debes seleccionar una ruta antes de generar la cotización");
      return;
    }

    // Validar que el peso chargeable tenga precio en la ruta seleccionada
    if (weightRangeError && !sinTarifa) {
      setError(
        `Esta ruta no tiene tarifa para el rango ${weightRangeValidation?.rangoActual}. ` +
          (weightRangeValidation?.pesoMinimoRequerido
            ? `Necesitas un mínimo de ${weightRangeValidation.pesoMinimoRequerido} kg.`
            : "No hay rangos disponibles para esta ruta."),
      );
      return;
    }

    if (!incoterm) {
      setError(t("QuoteAIR.seleccionarincoterm"));
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

    if (
      incoterm === "EXW" &&
      (!pickupFromAddress || !destinationSeleccionado)
    ) {
      setError(
        "Debes completar la dirección de Pickup y seleccionar Destination para el Incoterm EXW",
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
        const preRes = await linbisFetch(
          `https://api.linbis.com/Quotes?ConsigneeName=${encodeURIComponent(effectiveUsername)}`,
          {
            headers: {
              Accept: "application/json",
            },
          },
          accessToken,
          refreshAccessToken,
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

      const res = await linbisFetch(
        "https://api.linbis.com/Quotes/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
        accessToken,
        refreshAccessToken,
      );

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

      // Registrar auditoría
      registrarEvento({
        accion: isEjecutivoMode
          ? "COTIZACION_AIR_EJECUTIVO"
          : "COTIZACION_AIR_CREADA",
        categoria: "COTIZACION",
        descripcion: isEjecutivoMode
          ? `Cotización aérea creada por ejecutivo ${ejecutivo?.nombre || ""} para cliente ${effectiveUsername}`
          : `Cotización aérea creada: ${originSeleccionado?.label || ""} → ${destinationSeleccionado?.label || ""}`,
        detalles: {
          tipo: tipoAccion,
          origen: originSeleccionado?.label || "",
          destino: destinationSeleccionado?.label || "",
          carrier: rutaSeleccionada?.carrier || "",
          incoterm,
        },
        ...(isEjecutivoMode && { clienteAfectado: effectiveUsername }),
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
      if (!rutaSeleccionada || (!tarifaAirFreight && !sinTarifa)) return;

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
        rate: tarifaAirFreight?.precioConMarkup ?? 0,
        amount: (tarifaAirFreight?.precioConMarkup ?? 0) * chargeableWeight,
      });

      // FCA Local Charges (solo si incoterm es FCA y la ruta tiene localCharges)
      if (incoterm === "FCA") {
        const fcaLocalAmount = calculateFCALocalCharges();
        if (fcaLocalAmount > 0) {
          pdfCharges.push({
            code: "FC",
            description: "FCA CHARGES",
            quantity: 1,
            unit: "Shipment",
            rate: fcaLocalAmount,
            amount: fcaLocalAmount,
          });
        }

        // Gastos x kg (solo si incoterm es FCA y la ruta tiene gastosXKg)
        const gastosXKgAmount = calculateGastosXKg();
        if (gastosXKgAmount > 0) {
          pdfCharges.push({
            code: "Gxk",
            description: "Gastos x kg",
            quantity: chargeableWeight,
            unit: "kg",
            rate: rutaSeleccionada.gastosXKg * FCA_MARKUP,
            amount: gastosXKgAmount,
          });
        }
      }

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

      // Gastos Locales (Desconsolidación) - cargo fijo
      if (gastolocal) {
        const gastoLocalAmount = 190.4;
        pdfCharges.push({
          code: "D",
          description: "GASTOS LOCALES (Desconsolidación)",
          quantity: 1,
          unit: "Shipment",
          rate: gastoLocalAmount,
          amount: gastoLocalAmount,
        });
      }

      // No Apilable (solo si incoterm es EXW y hay piezas no apilables)
      if (noApilableActivo && incoterm === "EXW") {
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

      // Agencia de Aduanas y Nacionalización (solo si está activo)
      if (aduanaActivo) {
        const aduanaAmount = calculateAduana();
        if (aduanaAmount > 0) {
          pdfCharges.push({
            code: "ADA",
            description: "AGENCIA DE ADUANA",
            quantity: 1,
            unit: "Shipment",
            rate: aduanaAmount,
            amount: aduanaAmount,
          });
        }
      }

      // Si sinTarifa, poner todos los montos en 0
      const finalPdfCharges = sinTarifa
        ? pdfCharges.map((c) => ({ ...c, rate: 0, amount: 0 }))
        : pdfCharges;

      // Calcular total
      const totalCharges = finalPdfCharges.reduce(
        (sum, charge) => sum + charge.amount,
        0,
      );

      // ── 1. Obtener el quoteNumber real de Linbis ANTES de renderizar el PDF ──
      let quoteNumber = "";
      try {
        console.log(
          "[QuoteAIR] Buscando cotización recién creada (id mayor a",
          previousMaxId,
          ")...",
        );
        await new Promise((r) => setTimeout(r, 2000));

        const linbisRes = await linbisFetch(
          `https://api.linbis.com/Quotes?ConsigneeName=${encodeURIComponent(effectiveUsername)}`,
          {
            headers: {
              Accept: "application/json",
            },
          },
          accessToken,
          refreshAccessToken,
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
      } catch (e) {
        console.warn("[QuoteAIR] Error obteniendo quoteNumber:", e);
      }

      // ── 2. Renderizar el PDF con quoteNumber real ──
      const tempDiv = document.createElement("div");
      tempDiv.style.position = "absolute";
      tempDiv.style.left = "-9999px";
      document.body.appendChild(tempDiv);

      const root = ReactDOM.createRoot(tempDiv);

      await new Promise<void>((resolve) => {
        const { totalRealWeight, chargeableWeight } = calculateTotals();
        const totalVolumePieces = piecesData.reduce(
          (sum, piece) => sum + piece.totalVolume,
          0,
        );

        root.render(
          <PDFTemplateAIR
            quoteNumber={quoteNumber}
            customerName={effectiveUsername || "Customer"}
            origin={rutaSeleccionada.origin}
            destination={rutaSeleccionada.destination}
            effectiveDate={new Date().toLocaleDateString()}
            expirationDate={
              sinTarifa
                ? new Date(
                    Date.now() + 7 * 24 * 60 * 60 * 1000,
                  ).toLocaleDateString()
                : rutaSeleccionada.validUntil ||
                  new Date(
                    Date.now() + 7 * 24 * 60 * 60 * 1000,
                  ).toLocaleDateString()
            }
            incoterm={incoterm}
            pickupFromAddress={
              incoterm === "EXW" ? pickupFromAddress : undefined
            }
            deliveryToAddress={
              incoterm === "EXW" ? deliveryToAddressDerived : undefined
            }
            salesRep={salesRepName}
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
            charges={finalPdfCharges}
            totalCharges={totalCharges}
            currency={rutaSeleccionada.currency}
            overallMode={overallDimsAndWeight}
            piecesData={overallDimsAndWeight ? [] : piecesData}
            carrier={sinTarifa ? "X" : rutaSeleccionada.carrier || undefined}
            transitTime={
              sinTarifa ? "X" : rutaSeleccionada.transitTime || undefined
            }
            frequency={
              sinTarifa ? undefined : rutaSeleccionada.frequency || undefined
            }
            routing={
              sinTarifa ? undefined : rutaSeleccionada.routing || undefined
            }
            validUntil={rutaSeleccionada.validUntil || undefined}
            isPendingQuote={sinTarifa}
          />,
        );

        setTimeout(resolve, 500);
      });

      // ── 3. Generar base64 + subir a MongoDB ANTES de descargar ──
      const pdfElement = tempDiv.querySelector("#pdf-content") as HTMLElement;
      console.log("[QuoteAIR] pdfElement encontrado:", !!pdfElement);

      if (pdfElement) {
        const customerClean = (effectiveUsername || "Cliente").replace(
          /[^a-zA-Z0-9]/g,
          "_",
        );
        const filename = quoteNumber
          ? `${quoteNumber}_${customerClean}.pdf`
          : `Cotizacion_${customerClean}_${formatDateForFilename(new Date())}.pdf`;

        // Generar base64 del PDF para guardarlo en MongoDB
        console.log("[QuoteAIR] Generando base64...");
        const pdfBase64 = await generatePDFBase64(pdfElement);
        console.log("[QuoteAIR] Base64 generado, longitud:", pdfBase64?.length);

        // Subir el PDF a MongoDB
        if (pdfBase64 && quoteNumber) {
          try {
            const bodyPayload: any = {
              quoteNumber,
              nombreArchivo: filename,
              contenidoBase64: pdfBase64,
              tipoServicio: "AIR",
              origen: rutaSeleccionada.origin,
              destino: rutaSeleccionada.destination,
            };

            if (isEjecutivoMode && clienteSeleccionado) {
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
              "[QuoteAIR] PDF guardado en MongoDB:",
              uploadRes.status,
              uploadData,
            );
          } catch (uploadErr) {
            console.error("Error subiendo PDF a MongoDB:", uploadErr);
          }
        }

        // ── 4. Descargar el PDF localmente (ÚLTIMO) ──
        await generatePDF({ filename, element: pdfElement });
        console.log("[QuoteAIR] PDF descargado localmente");
      }

      // Limpiar
      root.unmount();
      document.body.removeChild(tempDiv);

      // Enviar notificación por email al ejecutivo
      try {
        const total = sinTarifa
          ? "PENDIENTE"
          : rutaSeleccionada.currency + " " + totalCharges.toFixed(2);
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
            carrier: sinTarifa ? "PENDIENTE" : rutaSeleccionada.carrier,
            precio: sinTarifa
              ? 0
              : (tarifaAirFreight?.precioConMarkup ?? 0) * chargeableWeight,
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
    }
  };

  const getTestPayload = () => {
    if (!rutaSeleccionada || (!tarifaAirFreight && !sinTarifa)) {
      return null;
    }

    // Safe access for sinTarifa (tarifaAirFreight may be null)
    const afPrecio = tarifaAirFreight?.precio ?? 0;
    const afPrecioConMarkup = tarifaAirFreight?.precioConMarkup ?? 0;
    const afMoneda = tarifaAirFreight?.moneda ?? "USD";

    const charges = [];

    // Parse transitTime from rutaSeleccionada (formats like "X-Y DAYS" or "X días").
    const parseTransitDays = (
      transit?: string | number | null,
    ): number | null => {
      // If field is missing or an empty string, return null (no transit time)
      if (transit === undefined || transit === null) return null;
      const raw = String(transit);
      if (raw.trim() === "") return null;
      if (typeof transit === "number") return Math.max(1, Math.floor(transit));

      const txt = raw.trim().toLowerCase();

      // Try range like "2-3 days" -> take the upper value (3)
      const rangeMatch = txt.match(
        /(\d+)\s*[-–—]\s*(\d+)\s*(?:days?|d[ií]as?)?/i,
      );
      if (rangeMatch) {
        const hi = parseInt(rangeMatch[2], 10);
        if (!isNaN(hi)) return Math.max(1, hi);
      }

      // Try single day like "3 days" or "3 días"
      const singleMatch = txt.match(/(\d{1,4})\s*(?:days?|d[ií]as?)/i);
      if (singleMatch) {
        const v = parseInt(singleMatch[1], 10);
        if (!isNaN(v)) return Math.max(1, v);
      }

      // Fallback: try to extract any number present
      const anyNum = txt.match(/(\d{1,4})/);
      if (anyNum) {
        const v = parseInt(anyNum[1], 10);
        if (!isNaN(v)) return Math.max(1, v);
      }

      // Default to null if cannot parse
      return null;
    };

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
            name: effectiveUsername,
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
              name: effectiveUsername,
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
            name: effectiveUsername,
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
            name: effectiveUsername,
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
          rate: afPrecioConMarkup,
          amount: pesoChargeable * afPrecioConMarkup,
          showamount: pesoChargeable * afPrecioConMarkup,
          payment: "Prepaid",
          billApplyTo: "Other",
          billTo: {
            name: effectiveUsername,
          },
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any,
          },
          reference: "Amount to Air Freight",
          showOnDocument: true,
          notes: `AIR FREIGHT charge - Tarifa: ${afMoneda} ${afPrecio.toFixed(2)}/kg + 15%`,
        },
        expense: {
          quantity: pesoChargeable,
          unit: "AIR FREIGHT",
          rate: afPrecio,
          amount: pesoChargeable * afPrecio,
          showamount: pesoChargeable * afPrecio,
          payment: "Prepaid",
          billApplyTo: "Other",
          billTo: {
            name: effectiveUsername,
          },
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any,
          },
          reference: "TEST-REF-AIRFREIGHT",
          showOnDocument: true,
          notes: `AIR FREIGHT expense - Tarifa: ${afMoneda} ${afPrecio.toFixed(2)}/kg`,
        },
      });

      // Cobro de FCA CHARGES (solo si incoterm es FCA y la ruta tiene localCharges)
      if (incoterm === "FCA") {
        const fcaLocalAmount = calculateFCALocalCharges();
        if (fcaLocalAmount > 0) {
          charges.push({
            service: {
              id: 125539,
              code: "FC",
            },
            income: {
              quantity: 1,
              unit: "FCA CHARGES",
              rate: fcaLocalAmount,
              amount: fcaLocalAmount,
              showamount: fcaLocalAmount,
              payment: "Prepaid",
              billApplyTo: "Other",
              billTo: {
                name: effectiveUsername,
              },
              currency: {
                abbr: (rutaSeleccionada.currency || "USD") as any,
              },
              reference: "Amount to FCA Charges",
              showOnDocument: true,
              notes: `FCA Local Charges - Base: ${rutaSeleccionada.localCharges} + ${((FCA_MARKUP - 1) * 100).toFixed(0)}% markup`,
            },
            expense: {
              currency: {
                abbr: (rutaSeleccionada.currency || "USD") as any,
              },
            },
          });
        }

        // Cobro de Gastos x kg (solo si incoterm es FCA y la ruta tiene gastosXKg)
        const gastosXKgAmount = calculateGastosXKg();
        if (gastosXKgAmount > 0) {
          charges.push({
            service: {
              id: 125595,
              code: "Gxk",
            },
            income: {
              quantity: pesoChargeable,
              unit: "kg",
              rate: rutaSeleccionada.gastosXKg * FCA_MARKUP,
              amount: gastosXKgAmount,
              showamount: gastosXKgAmount,
              payment: "Prepaid",
              billApplyTo: "Other",
              billTo: {
                name: effectiveUsername,
              },
              currency: {
                abbr: (rutaSeleccionada.currency || "USD") as any,
              },
              reference: "Amount to Gastos x kg",
              showOnDocument: true,
              notes: `Gastos x kg - Rate: ${rutaSeleccionada.gastosXKg}/kg + ${((FCA_MARKUP - 1) * 100).toFixed(0)}% markup${rutaSeleccionada.minGastosXKg > 0 ? ` (min: ${rutaSeleccionada.minGastosXKg})` : ""}`,
            },
            expense: {
              currency: {
                abbr: (rutaSeleccionada.currency || "USD") as any,
              },
            },
          });
        }
      }

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
              name: effectiveUsername,
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

      // Cobro de GASTOS LOCALES / Desconsolidación (cargo fijo)
      if (gastolocal) {
        const gastoLocalAmount = 194.4;
        charges.push({
          service: {
            id: 121127,
            code: "D",
          },
          income: {
            quantity: 1,
            unit: "DESCONSOLIDACIÓN",
            rate: gastoLocalAmount,
            amount: gastoLocalAmount,
            showamount: gastoLocalAmount,
            payment: "Prepaid",
            billApplyTo: "Other",
            billTo: {
              name: effectiveUsername,
            },
            currency: {
              abbr: (rutaSeleccionada.currency || "USD") as any,
            },
            reference: "Gastos Locales - Desconsolidación",
            showOnDocument: true,
            notes:
              "Cargo por Gastos Locales (Desconsolidación) agregado desde portal",
          },
          expense: {
            currency: {
              abbr: (rutaSeleccionada.currency || "USD") as any,
            },
          },
        });
      }

      // Cobro de NO APILABLE (solo si incoterm es EXW y hay piezas no apilables)
      if (noApilableActivo && incoterm === "EXW") {
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
              name: effectiveUsername,
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

      // Cobro de AGENCIA DE ADUANA (solo si está activo y hay valor producto)
      if (aduanaActivo) {
        const aduanaAmount = calculateAduana();
        if (aduanaAmount > 0) {
          charges.push({
            service: {
              id: 127954,
              code: "ADA",
              description: "AGENCIA DE ADUANA",
            },
            income: {
              quantity: 1,
              unit: "AGENCIA DE ADUANA",
              rate: aduanaAmount,
              amount: aduanaAmount,
              showamount: aduanaAmount,
              payment: "Prepaid",
              billApplyTo: "Other",
              billTo: {
                name: effectiveUsername,
              },
              currency: {
                abbr: (rutaSeleccionada.currency || "USD") as any,
              },
              reference: "Amount to Agencia de Aduana",
              showOnDocument: true,
              notes:
                "Agencia de Aduana y Nacionalización - incluye honorarios, gastos despacho, tramitación, mensajería, IVA aduanero y derechos",
            },
            expense: {
              currency: {
                abbr: (rutaSeleccionada.currency || "USD") as any,
              },
            },
          });
        }
      }

      // Si sinTarifa, poner todos los montos en 0
      const finalCharges = sinTarifa
        ? charges.map((ch: any) => ({
            ...ch,
            income: {
              ...ch.income,
              rate: 0,
              amount: 0,
              ...(ch.income.showamount !== undefined ? { showamount: 0 } : {}),
            },
            expense: {
              ...ch.expense,
              ...(ch.expense.rate !== undefined ? { rate: 0 } : {}),
              ...(ch.expense.amount !== undefined ? { amount: 0 } : {}),
            },
          }))
        : charges;

      const oneWeekFromNow = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString();

      return {
        date: new Date().toISOString(),
        validUntil: sinTarifa
          ? oneWeekFromNow
          : parseValidUntilToISO(rutaSeleccionada.validUntil),
        transitDays: sinTarifa
          ? null
          : parseTransitDays(rutaSeleccionada.transitTime),
        project: {
          name: "AIR",
        },
        customerReference: sinTarifa
          ? "Portal Created [AIR] - PENDIENTE TARIFA"
          : "Portal Created [AIR]",
        contact: {
          name: effectiveUsername,
        },
        origin: {
          name: rutaSeleccionada.origin,
        },
        carrierBroker: {
          name: rutaSeleccionada.carrier,
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
          deliveryToAddress: deliveryToAddressDerived,
        }),
        portOfReceipt: {
          name: rutaSeleccionada.origin,
        },
        shipper: {
          name: effectiveUsername,
        },
        consignee: {
          name: effectiveUsername,
        },
        issuingCompany: {
          name: rutaSeleccionada?.carrier || "Por Confirmar",
        },
        serviceType: {
          name: "Normal",
        },
        salesRep: {
          name: salesRepName,
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
        charges: finalCharges,
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
            name: effectiveUsername,
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
              name: effectiveUsername,
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
            name: effectiveUsername,
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
            name: effectiveUsername,
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
          rate: afPrecioConMarkup,
          amount: pesoChargeable * afPrecioConMarkup,
          showamount: pesoChargeable * afPrecioConMarkup,
          payment: "Prepaid",
          billApplyTo: "Other",
          billTo: {
            name: effectiveUsername,
          },
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any,
          },
          reference: "Amount to AIRFREIGHT to OVERALL",
          showOnDocument: true,
          notes: `AIR FREIGHT charge (Overall) - Tarifa: ${afMoneda} ${afPrecio.toFixed(2)}/${chargeableUnit} + 15% - Cobrado por ${chargeableUnit === "kg" ? "peso" : "volumen"}`,
        },
        expense: {
          quantity: pesoChargeable,
          unit: chargeableUnit === "kg" ? "AIR FREIGHT" : "AIR FREIGHT (CBM)",
          rate: afPrecio,
          amount: pesoChargeable * afPrecio,
          showamount: pesoChargeable * afPrecio,
          payment: "Prepaid",
          billApplyTo: "Other",
          billTo: {
            name: effectiveUsername,
          },
          currency: {
            abbr: (rutaSeleccionada.currency || "USD") as any,
          },
          reference: "Amount to AIRFREIGHT to OVERALL",
          showOnDocument: true,
          notes: `AIR FREIGHT expense (Overall) - Tarifa: ${afMoneda} ${afPrecio.toFixed(2)}/${chargeableUnit} - Cobrado por ${chargeableUnit === "kg" ? "peso" : "volumen"}`,
        },
      });

      // Cobro de FCA CHARGES (solo si incoterm es FCA y la ruta tiene localCharges) - Overall mode
      if (incoterm === "FCA") {
        const fcaLocalAmount = calculateFCALocalCharges();
        if (fcaLocalAmount > 0) {
          charges.push({
            service: {
              id: 125539,
              code: "FC",
            },
            income: {
              quantity: 1,
              unit: "FCA CHARGES",
              rate: fcaLocalAmount,
              amount: fcaLocalAmount,
              showamount: fcaLocalAmount,
              payment: "Prepaid",
              billApplyTo: "Other",
              billTo: {
                name: effectiveUsername,
              },
              currency: {
                abbr: (rutaSeleccionada.currency || "USD") as any,
              },
              reference: "Amount to FCA Charges to OVERALL",
              showOnDocument: true,
              notes: `FCA Local Charges (Overall) - Base: ${rutaSeleccionada.localCharges} + ${((FCA_MARKUP - 1) * 100).toFixed(0)}% markup`,
            },
            expense: {
              currency: {
                abbr: (rutaSeleccionada.currency || "USD") as any,
              },
            },
          });
        }

        // Cobro de Gastos x kg (solo si incoterm es FCA y la ruta tiene gastosXKg) - Overall mode
        const gastosXKgAmount = calculateGastosXKg();
        if (gastosXKgAmount > 0) {
          charges.push({
            service: {
              id: 125595,
              code: "Gxk",
            },
            income: {
              quantity: pesoChargeable,
              unit: "kg",
              rate: rutaSeleccionada.gastosXKg * FCA_MARKUP,
              amount: gastosXKgAmount,
              showamount: gastosXKgAmount,
              payment: "Prepaid",
              billApplyTo: "Other",
              billTo: {
                name: effectiveUsername,
              },
              currency: {
                abbr: (rutaSeleccionada.currency || "USD") as any,
              },
              reference: "Amount to Gastos x kg to OVERALL",
              showOnDocument: true,
              notes: `Gastos x kg (Overall) - Rate: ${rutaSeleccionada.gastosXKg}/kg + ${((FCA_MARKUP - 1) * 100).toFixed(0)}% markup${rutaSeleccionada.minGastosXKg > 0 ? ` (min: ${rutaSeleccionada.minGastosXKg})` : ""}`,
            },
            expense: {
              currency: {
                abbr: (rutaSeleccionada.currency || "USD") as any,
              },
            },
          });
        }
      }

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
              name: effectiveUsername,
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

      // Cobro de GASTOS LOCALES / Desconsolidación (cargo fijo) - Overall mode
      if (gastolocal) {
        const gastoLocalAmount = 194.4;
        charges.push({
          service: {
            id: 121127,
            code: "D",
          },
          income: {
            quantity: 1,
            unit: "DESCONSOLIDACIÓN",
            rate: gastoLocalAmount,
            amount: gastoLocalAmount,
            showamount: gastoLocalAmount,
            payment: "Prepaid",
            billApplyTo: "Other",
            billTo: {
              name: effectiveUsername,
            },
            currency: {
              abbr: (rutaSeleccionada.currency || "USD") as any,
            },
            reference: "Gastos Locales - Desconsolidación to OVERALL",
            showOnDocument: true,
            notes:
              "Cargo por Gastos Locales (Desconsolidación) agregado desde portal (Overall)",
          },
          expense: {
            currency: {
              abbr: (rutaSeleccionada.currency || "USD") as any,
            },
          },
        });
      }

      // Cobro de AGENCIA DE ADUANA (solo si está activo) - Overall mode
      if (aduanaActivo) {
        const aduanaAmount = calculateAduana();
        if (aduanaAmount > 0) {
          charges.push({
            service: {
              id: 127954,
              code: "ADA",
              description: "AGENCIA DE ADUANA",
            },
            income: {
              quantity: 1,
              unit: "AGENCIA DE ADUANA",
              rate: aduanaAmount,
              amount: aduanaAmount,
              showamount: aduanaAmount,
              payment: "Prepaid",
              billApplyTo: "Other",
              billTo: {
                name: effectiveUsername,
              },
              currency: {
                abbr: (rutaSeleccionada.currency || "USD") as any,
              },
              reference: "Amount to Agencia de Aduana to OVERALL",
              showOnDocument: true,
              notes:
                "Agencia de Aduana y Nacionalización - incluye honorarios, gastos despacho, tramitación, mensajería, IVA aduanero y derechos (Overall)",
            },
            expense: {
              currency: {
                abbr: (rutaSeleccionada.currency || "USD") as any,
              },
            },
          });
        }
      }

      // Si sinTarifa, poner todos los montos en 0
      const finalChargesOverall = sinTarifa
        ? charges.map((ch: any) => ({
            ...ch,
            income: {
              ...ch.income,
              rate: 0,
              amount: 0,
              ...(ch.income.showamount !== undefined ? { showamount: 0 } : {}),
            },
            expense: {
              ...ch.expense,
              ...(ch.expense.rate !== undefined ? { rate: 0 } : {}),
              ...(ch.expense.amount !== undefined ? { amount: 0 } : {}),
            },
          }))
        : charges;

      const oneWeekFromNowOverall = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString();

      return {
        date: new Date().toISOString(),
        validUntil: sinTarifa
          ? oneWeekFromNowOverall
          : parseValidUntilToISO(rutaSeleccionada.validUntil),
        transitDays: sinTarifa
          ? null
          : parseTransitDays(rutaSeleccionada.transitTime),
        customerReference: sinTarifa
          ? "Portal Created [AIR-OVERALL] - PENDIENTE TARIFA"
          : "Portal-Created [AIR-OVERALL]",
        contact: {
          name: effectiveUsername,
        },
        origin: {
          name: rutaSeleccionada.origin,
        },
        carrierBroker: {
          name: rutaSeleccionada.carrier,
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
          deliveryToAddress: deliveryToAddressDerived,
        }),
        portOfReceipt: {
          name: rutaSeleccionada.origin,
        },
        shipper: {
          name: effectiveUsername,
        },
        consignee: {
          name: effectiveUsername,
        },
        issuingCompany: {
          name: rutaSeleccionada?.carrier || "Por Confirmar",
        },
        serviceType: {
          name: "Overall Dims & Weight",
        },
        salesRep: {
          name: salesRepName,
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
        charges: finalChargesOverall,
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
      if (ruta.priceForComparison > 0 && ruta.priceForComparison < minPrice) {
        minPrice = ruta.priceForComparison;
        bestIndex = index;
      }
    });

    return bestIndex;
  }, [rutasFiltradas]);

  // getValidityClass moved earlier to be usable during filtering
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

      {/* Selector de Cliente (Solo para modo ejecutivo) */}
      {isEjecutivoMode && (
        <div
          className="card shadow-sm mb-4"
          style={{
            background: "linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)",
          }}
        >
          <div className="card-body">
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
                <strong>Sin clientes asignados</strong>
                <p className="mb-0 mt-2 small">
                  No tienes clientes asignados. Contacta al administrador.
                </p>
              </div>
            ) : (
              <div className="row g-3">
                <div className="col-md-8">
                  <label className="form-label fw-semibold">
                    Cliente para esta cotización{" "}
                  </label>
                  <Select
                    value={
                      clienteSeleccionado
                        ? {
                            value: clienteSeleccionado.username,
                            label: `${clienteSeleccionado.username} (${clienteSeleccionado.email})`,
                          }
                        : null
                    }
                    onChange={(option) => {
                      const cliente = clientesAsignados.find(
                        (c) => c.username === option?.value,
                      );
                      setClienteSeleccionado(cliente || null);
                    }}
                    options={clientesAsignados.map((c) => ({
                      value: c.username,
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
                      Debes seleccionar un cliente antes de generar la
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
                {/* ======== SELECTOR DE TIPO DE RUTA (CARD TOGGLE) ======== */}
                <div className="row g-3 mb-4">
                  {/* Card: Rutas con tarifa */}
                  <div className="col-6">
                    <div
                      onClick={() => {
                        setRouteMode("recurrente");
                        setOriginNR(null);
                        setDestNR(null);
                        setRutaSeleccionada(null);
                        setSinTarifa(false);
                      }}
                      className={`route-card-toggle${routeMode === "recurrente" ? " selected" : ""}`}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <div className="d-flex align-items-center gap-2">
                          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                            Rutas Recurrentes
                          </span>
                          <i
                            className="bi bi-question-circle-fill"
                            data-bs-toggle="tooltip"
                            data-bs-placement="top"
                            title="Esta ruta tiene tarifa vigente."
                            style={{
                              color: "#ff6200",
                              fontSize: "0.85rem",
                              cursor: "help",
                            }}
                          ></i>
                        </div>
                        <span
                          className="badge"
                          style={{
                            fontSize: "0.7rem",
                            backgroundColor:
                              routeMode === "recurrente"
                                ? "var(--qa-primary)"
                                : "#6c757d",
                            color: "white",
                          }}
                        >
                          Solicitar Cotización
                        </span>
                      </div>
                      <p
                        className="mb-0"
                        style={{
                          fontSize: "0.78rem",
                          color: "var(--qa-text-secondary)",
                        }}
                      >
                        Rutas comunes entre los clientes
                      </p>
                    </div>
                  </div>

                  {/* Card: Rutas sin tarifa */}
                  <div className="col-6">
                    <div
                      onClick={() => {
                        setRouteMode("noRecurrente");
                        setOriginSeleccionado(null);
                        setDestinationSeleccionado(null);
                        setRutaSeleccionada(null);
                        setSinTarifa(false);
                      }}
                      className={`route-card-toggle${routeMode === "noRecurrente" ? " selected" : ""}`}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <div className="d-flex align-items-center gap-2">
                          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                            Rutas No Recurrentes
                          </span>
                          <i
                            className="bi bi-question-circle-fill"
                            data-bs-toggle="tooltip"
                            data-bs-placement="top"
                            title="Rutas no encontradas en Recurrentes"
                            style={{
                              color: "#ff6200",
                              fontSize: "0.85rem",
                              cursor: "help",
                            }}
                          ></i>
                        </div>
                        <span
                          className="badge"
                          style={{
                            fontSize: "0.7rem",
                            backgroundColor:
                              routeMode === "noRecurrente"
                                ? "var(--qa-primary)"
                                : "#6c757d",
                            color: "white",
                          }}
                        >
                          Solicitar cotización
                        </span>
                      </div>
                      <p
                        className="mb-0"
                        style={{
                          fontSize: "0.78rem",
                          color: "var(--qa-text-secondary)",
                        }}
                      >
                        ¿No encuentras tu ruta? Encuéntrala aquí
                      </p>
                    </div>
                  </div>
                </div>

                {/* ======== RUTAS CON TARIFA ======== */}
                {routeMode === "recurrente" && (
                  <div className="mb-4">
                    <div className="row g-3 mb-4">
                      <div className="col-md-6">
                        <label className="qa-label">
                          {t("QuoteAIR.Origen")}
                        </label>
                        <Select
                          value={originSeleccionado}
                          onChange={handleOriginRecurrenteChange}
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
                        <label className="qa-label">
                          {t("QuoteAIR.Destino")}
                        </label>
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
                            <small>{t("QuoteAIR.intenta")}</small>
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
                                    {t("QuoteAIR.tiempoenruta")}
                                  </th>
                                  <th className="text-center">
                                    {t("QuoteAIR.valido")}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {rutasFiltradas.map((ruta, index) => {
                                  const precioKg45 = extractPrice(ruta.kg45);
                                  const precioKg100 = extractPrice(ruta.kg100);
                                  const precioKg300 = extractPrice(ruta.kg300);
                                  const precioKg500 = extractPrice(ruta.kg500);
                                  const precioKg1000 = extractPrice(
                                    ruta.kg1000,
                                  );
                                  const isSelected =
                                    rutaSeleccionada?.id === ruta.id;

                                  const validityState = getValidityClass(
                                    ruta.validUntil,
                                  );

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
                                            <span className="text-muted">
                                              —
                                            </span>
                                          )}
                                        </td>
                                      ))}
                                      <td className="text-center text-muted small">
                                        {ruta.transitTime ? (
                                          ruta.transitTime
                                        ) : (
                                          <OverlayTrigger
                                            placement="top"
                                            overlay={
                                              <Tooltip
                                                id={`tt-transit-${ruta.id}`}
                                              >
                                                To Be Confirmed
                                              </Tooltip>
                                            }
                                          >
                                            <span
                                              style={{
                                                textDecoration: "underline",
                                                color: "var(--qa-primary)",
                                                cursor: "help",
                                              }}
                                            >
                                              TBC
                                            </span>
                                          </OverlayTrigger>
                                        )}
                                      </td>
                                      <td className="text-center text-muted small">
                                        {ruta.validUntil ? (
                                          <span
                                            className={`qa-validity ${
                                              validityState === "valid"
                                                ? "valid"
                                                : validityState === "expired"
                                                  ? "expired"
                                                  : ""
                                            }`}
                                          >
                                            {ruta.validUntil}
                                          </span>
                                        ) : (
                                          "—"
                                        )}
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
                  </div>
                )}

                {/* ======== RUTAS SIN TARIFA ======== */}
                {routeMode === "noRecurrente" && expandedRoutesAir && (
                  <div>
                    <div className="row g-3 mb-4">
                      <div className="col-md-6">
                        <label className="qa-label">
                          {t("QuoteAIR.Origen")}
                        </label>
                        <Select
                          value={originNR}
                          onChange={handleOriginNRChange}
                          options={opcionesOrigin_NR}
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
                        <label className="qa-label">
                          {t("QuoteAIR.Destino")}
                        </label>
                        <Select
                          value={destNR}
                          onChange={handleDestNRChange}
                          options={opcionesDest_NR}
                          placeholder={
                            originNR
                              ? t("QuoteAIR.seleccionadestino")
                              : t("QuoteAIR.seleccionaprimerorigen")
                          }
                          isClearable
                          isDisabled={!originNR}
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
                <CotizadorAddressMap
                  value={pickupFromAddress}
                  onChange={setPickupFromAddress}
                  placeholder="Ingrese dirección de recogida"
                  rows={2}
                  destinationCoords={
                    originSeleccionado
                      ? (() => {
                          const ap = getAirportByOrigin(
                            originSeleccionado.value,
                          );
                          if (!ap) return null;
                          return {
                            lat: ap.lat,
                            lng: ap.lng,
                            name: ap.name,
                            code: ap.iata,
                          } as DestinationCoords;
                        })()
                      : null
                  }
                />
              </div>

              <div>
                <label className="qa-label">
                  <i className="bi bi-geo-alt me-1"></i>
                  {t("QuoteAIR.delivery")}
                </label>
                <textarea
                  className="qa-input"
                  value={deliveryToAddressDerived}
                  readOnly
                  disabled
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

          {/* Alerta de rango de peso sin precio */}
          {weightRangeValidation &&
            !weightRangeValidation.tienePrecio &&
            rutaSeleccionada &&
            !sinTarifa && (
              <WeightRangeAlert
                validation={weightRangeValidation}
                pesoChargeable={pesoChargeable}
              />
            )}

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

            {/* Opciones Adicionales */}
            {(tarifaAirFreight || sinTarifa) && (
              <div className="p-3 bg-light rounded border">
                <h6 className="fw-bold mb-3">
                  <i className="bi bi-shield-check me-2"></i>
                  {t("QuoteAIR.resumencargos")}
                </h6>

                <div className="d-flex flex-column gap-2 small">
                  {/* Seguro opcional */}
                  <div className="mt-2">
                    <div
                      className="qa-switch-container"
                      style={{
                        width: "fit-content",
                        padding: "0.4rem 0.8rem",
                      }}
                    >
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="seguroCheckbox"
                        checked={seguroActivo}
                        onChange={(e) => handleToggleSeguro(e.target.checked)}
                      />
                      <label
                        className="form-check-label small"
                        htmlFor="seguroCheckbox"
                      >
                        {t("QuoteAIR.agregar")}
                      </label>
                    </div>
                    {seguroActivo && (
                      <div className="mt-2 ps-4">
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
                          disabled={aduanaMaster === true}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "" || /^[\d,\.]+$/.test(value)) {
                              handleValorMercaderiaChange(value);
                            }
                          }}
                          style={{
                            maxWidth: "300px",
                            backgroundColor:
                              aduanaMaster === true ? "#f0f0f0" : undefined,
                            cursor:
                              aduanaMaster === true ? "not-allowed" : undefined,
                          }}
                        />
                        {aduanaMaster === true && (
                          <small className="text-muted ms-1">
                            <i className="bi bi-lock-fill me-1"></i>
                            {t("QuoteAIR.sincronizadoConAduana")}
                          </small>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Gastos Locales - Desconsolidación (cargo fijo) */}
                  <div className="mt-2">
                    <div
                      className="qa-switch-container"
                      style={{
                        width: "fit-content",
                        padding: "0.4rem 0.8rem",
                      }}
                    >
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="gastolocalCheckbox"
                        checked={gastolocal}
                        onChange={(e) => setGastolocal(e.target.checked)}
                      />
                      <label
                        className="form-check-label small"
                        htmlFor="gastolocalCheckbox"
                      >
                        {t("QuoteAIR.desconsolidacion")}
                      </label>
                    </div>
                  </div>

                  {/* Agencia de Aduanas y Nacionalización */}
                  <AduanaSection
                    activo={aduanaActivo}
                    onToggle={handleToggleAduana}
                    valorProducto={valorProductoAduana}
                    onValorProductoChange={(value) =>
                      handleValorProductoAduanaChange(value)
                    }
                    costoTransporte={calculateCostoTransporteBase()}
                    seguroActivo={seguroActivo}
                    seguroMonto={calculateSeguro()}
                    currency={
                      (rutaSeleccionada.currency || "USD") as SupportedCurrency
                    }
                    config={aduanaConfig}
                    configLoading={aduanaConfigLoading}
                    valorProductoDisabled={aduanaMaster === false}
                  />

                  {/* Nota informativa */}
                  <div
                    className="mt-2 p-2 rounded"
                    style={{
                      backgroundColor: "rgba(255, 98, 0, 0.05)",
                      border: "1px solid rgba(255, 98, 0, 0.15)",
                    }}
                  >
                    <small className="text-muted">
                      <i className="bi bi-info-circle me-1"></i>
                      {t("QuoteAIR.desglose")}
                    </small>
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
        <div className="qa-grid-1 mb-5">
          <div
            className={`qa-card h-100 d-flex flex-column ${!accessToken || weightError || dimensionError || oversizeError || heightError || (weightRangeError && !sinTarifa) ? "opacity-50" : ""}`}
          >
            <div className="mb-3 text-dark">
              <i
                className="bi bi-file-earmark-pdf fs-1"
                style={{ fontSize: "2rem", color: "var(--qf-primary)" }}
              ></i>
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
                authLoading ||
                !accessToken ||
                weightError !== null ||
                dimensionError !== null ||
                oversizeError !== null ||
                heightError !== null ||
                (weightRangeError && !sinTarifa) ||
                !rutaSeleccionada
              }
              className="qa-btn qa-btn-primary w-100 mt-auto"
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm"></span>
              ) : (
                t("QuoteAIR.generarcotizacion")
              )}
            </button>
          </div>

          {/* <div
            className={`qa-card h-100 d-flex flex-column ${!accessToken || weightError || dimensionError || oversizeError || heightError || weightRangeError ? "opacity-50" : ""}`}
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
                authLoading ||
                !accessToken ||
                weightError !== null ||
                dimensionError !== null ||
                oversizeError !== null ||
                heightError !== null ||
                weightRangeError ||
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
          </div> */}
        </div>
      )}

      {/* ============================================================================ */}
      {/* SECCIÓN: NOTIFICAR AL EJECUTIVO PARA CARGAS ESPECIALES */}
      {/* ============================================================================ */}
      {rutaSeleccionada &&
        (oversizeError || heightError || cargoFlightWarning) &&
        (() => {
          const reasons: OversizeReason[] = [];
          if (oversizeError) reasons.push("oversize");
          if (heightError) reasons.push("no-apta-aereo");
          if (cargoFlightWarning && !heightError)
            reasons.push("vuelo-carguero");

          const hasMinData =
            !!originSeleccionado &&
            !!destinationSeleccionado &&
            piecesData.some((p) => p.weight > 0);

          const handleOversizeNotify = async () => {
            setLoadingOversizeNotify(true);
            try {
              // Build pieces summary
              const piezasResumen = piecesData.map((p, i) => ({
                pieza: i + 1,
                largo: p.length,
                ancho: p.width,
                alto: p.height,
                peso: p.weight,
                noApilable: p.noApilable,
              }));

              // Build charges summary if tarifa is available
              let cargos:
                | {
                    currency: string;
                    items: { label: string; amount: number }[];
                    total: number;
                  }
                | undefined;

              if (tarifaAirFreight && rutaSeleccionada) {
                const { totalRealWeight: tw } = calculateTotals();
                const items: { label: string; amount: number }[] = [];

                items.push({ label: "Handling", amount: 45 });
                if (incoterm === "EXW") {
                  items.push({
                    label: "EXW Charges",
                    amount: calculateEXWRate(tw, pesoChargeable),
                  });
                }
                items.push({ label: "AWB", amount: 30 });
                items.push({
                  label: "Airport Transfer",
                  amount: Math.max(pesoChargeable * 0.15, 50),
                });
                items.push({
                  label: "Air Freight",
                  amount:
                    (tarifaAirFreight?.precioConMarkup ?? 0) * pesoChargeable,
                });
                if (seguroActivo && calculateSeguro() > 0) {
                  items.push({
                    label: "Seguro",
                    amount: calculateSeguro(),
                  });
                }
                if (
                  noApilableActivo &&
                  incoterm === "EXW" &&
                  calculateNoApilable() > 0
                ) {
                  items.push({
                    label: "No Apilable",
                    amount: calculateNoApilable(),
                  });
                }

                const total = items.reduce((s, i) => s + i.amount, 0);
                cargos = {
                  currency: rutaSeleccionada.currency,
                  items,
                  total,
                };
              }

              const res = await fetch("/api/send-oversize-email", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  origen:
                    rutaSeleccionada?.origin || originSeleccionado?.label || "",
                  destino:
                    rutaSeleccionada?.destination ||
                    destinationSeleccionado?.label ||
                    "",
                  carrier: rutaSeleccionada?.carrier || "",
                  validUntil: rutaSeleccionada?.validUntil || "",
                  motivos: reasons,
                  descripcion: description,
                  incoterm: incoterm || "N/A",
                  piezas: piezasResumen,
                  clienteNombre: user?.nombreuser || user?.username || "",
                  clienteEmail: user?.email || "",
                  cargos,
                }),
              });

              if (!res.ok) throw new Error("Error sending notification");
            } finally {
              setLoadingOversizeNotify(false);
            }
          };

          return (
            <OversizeNotifyExecutive
              reasons={reasons}
              loading={loadingOversizeNotify}
              onNotify={handleOversizeNotify}
              hasMinimumData={hasMinData}
            />
          );
        })()}

      {/* Error / Success Display (Simplified) */}
      {error && (
        <div className="qa-alert qa-alert-danger mb-4">
          <i className="bi bi-x-circle-fill"></i>
          <div className="w-100">
            <strong>
              Haz permanecido inactivo mucho tiempo, actualiza la página e
              intenta nuevamente.
            </strong>
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
