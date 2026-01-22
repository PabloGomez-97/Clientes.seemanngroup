import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import * as XLSX from "xlsx";
import Select from "react-select";
import { PDFTemplateFCL } from "./Pdftemplate/Pdftemplatefcl";
import { generatePDF, formatDateForFilename } from "./Pdftemplate/Pdfutils";
import ReactDOM from "react-dom/client";

// URL del Google Sheet publicado como CSV
const GOOGLE_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSWzBbNU6lsWnVEhRgzTPNEjtq-eH59rGSQf3QS6UGiRHT98A-g3LumdtuFHKb5lcGmERT4nZjAbMhm/pub?output=csv";

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

type Currency = "USD" | "EUR" | "GBP" | "CAD" | "CHF" | "CLP" | "SEK";

type ContainerType = "20GP" | "40HQ" | "40NOR";

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
  "20GP": { id: 40, name: "20 FT. STANDARD CONTAINER" },
  "40HQ": { id: 27, name: "40 FT. HIGH CUBE" },
  "40NOR": { id: 25, name: "40 FT. REFRIGERATED (ALUMINIUM)" },
};

// ============================================================================
// FUNCIONES HELPER PARA RUTAS FCL
// ============================================================================

const extractPrice = (priceStr: string | null): number => {
  if (!priceStr) return 0;
  const cleaned = priceStr.toString().replace(/[^\d,\.]/g, "");
  const normalized = cleaned.replace(",", ".");
  const price = parseFloat(normalized);
  return isNaN(price) ? 0 : price;
};

const parseCurrency = (currencyStr: string | null): Currency => {
  if (!currencyStr) return "USD";
  const str = currencyStr.toString().trim().toUpperCase();

  if (str === "EUR") return "EUR";
  if (str === "GBP") return "GBP";
  if (str === "CAD") return "CAD";
  if (str === "CHF") return "CHF";
  if (str === "CLP") return "CLP";
  if (str === "SEK") return "SEK";
  if (str === "USD") return "USD";

  return "USD"; // Default fallback
};

const normalize = (str: string | null): string => {
  if (!str) return "";
  return str.toString().toLowerCase().trim();
};

// ============================================================================
// FUNCIÓN PARA PARSEAR CSV CORRECTAMENTE
// ============================================================================

const parseCSV = (csvText: string): any[] => {
  const lines = csvText.split("\n");
  const result: any[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const row: any[] = [];
    let currentField = "";
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
      } else if (char === "," && !insideQuotes) {
        // End of field
        row.push(currentField.trim());
        currentField = "";
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

const capitalize = (str: string): string => {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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
    const currency = row[11]; // 🆕 Nueva columna de moneda

    if (pol && pod && typeof pol === "string" && typeof pod === "string") {
      // Parsear la moneda desde la columna [11]
      const parsedCurrency = parseCurrency(currency);
      const price = extractPrice(hq40);

      rutas.push({
        id: `FCL-${idCounter++}`,
        pol: pol.trim(),
        polNormalized: normalize(pol),
        pod: pod.trim(),
        podNormalized: normalize(pod),
        gp20: gp20 ? gp20.toString().trim() : "N/A",
        hq40: hq40 ? hq40.toString().trim() : "N/A",
        nor40: nor40 ? nor40.toString().trim() : null,
        carrier: carrier ? carrier.toString().trim() : "N/A",
        carrierNormalized: normalize(carrier),
        tt: tt ? tt.toString().trim() : null,
        remarks: remarks ? remarks.toString().trim() : "",
        company: company ? company.toString().trim() : "",
        companyNormalized: normalize(company),
        row_number: i + 1,
        priceForComparison: price,
        currency: parsedCurrency, // 🆕 Usar la moneda parseada desde columna [11]
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
  const ejecutivo = user?.ejecutivo;

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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
  // FILTRAR RUTAS
  // ============================================================================

  const rutasFiltradas = rutas
    .filter((ruta) => {
      if (!polSeleccionado || !podSeleccionado) return false;

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

  const testAPI = async () => {
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
      setResponse(data);

      // Generar PDF después de cotización exitosa
      await generateQuotePDF();
    } catch (err: any) {
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const generateQuotePDF = async () => {
    try {
      if (!rutaSeleccionada || !containerSeleccionado) return;

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

      // Crear un contenedor temporal para renderizar el PDF
      const tempDiv = document.createElement("div");
      tempDiv.style.position = "absolute";
      tempDiv.style.left = "-9999px";
      document.body.appendChild(tempDiv);

      // Renderizar el template del PDF
      const root = ReactDOM.createRoot(tempDiv);

      await new Promise<void>((resolve) => {
        root.render(
          <PDFTemplateFCL
            customerName={user?.username || "Customer"}
            pol={rutaSeleccionada.pol}
            pod={rutaSeleccionada.pod}
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
            containerType={containerName}
            containerQuantity={cantidadContenedores}
            description={"Cargamento Marítimo FCL"}
            charges={pdfCharges}
            totalCharges={totalCharges}
            currency={rutaSeleccionada.currency}
          />,
        );

        // Esperar a que el DOM se actualice
        setTimeout(resolve, 500);
      });

      // Generar el PDF
      const pdfElement = tempDiv.querySelector("#pdf-content") as HTMLElement;
      if (pdfElement) {
        const filename = `Cotizacion_${user?.username || "Cliente"}_${formatDateForFilename(new Date())}.pdf`;
        await generatePDF({ filename, element: pdfElement });
      }

      // Limpiar
      root.unmount();
      document.body.removeChild(tempDiv);
    } catch (error) {
      console.error("Error generating PDF:", error);
      // No mostramos error al usuario, el PDF es opcional
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
          name: user?.username,
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
          name: user?.username,
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
            name: user?.username,
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
          name: user?.username,
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
            name: user?.username,
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
      transitDays: 5,
      project: {
        name: "FCL",
      },
      customerReference: "Portal Created [FCL]",
      contact: {
        name: user?.username,
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
        name: user?.username,
      },
      consignee: {
        name: user?.username,
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
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col">
          <h2 className="mb-1">Cotizador FCL</h2>
          <p className="text-muted mb-0">
            Genera cotizaciones para envíos Full Container Load
          </p>
        </div>
      </div>

      {/* ============================================================================ */}
      {/* SECCIÓN 1: SELECCIÓN DE RUTA Y CONTENEDOR */}
      {/* ============================================================================ */}

      <div className="card shadow-sm mb-4">
        <div
          className="card-header d-flex justify-content-between align-items-center"
          style={{
            cursor: "pointer",
            backgroundColor: openSection === 1 ? "#f8f9fa" : "white",
            borderBottom: openSection === 1 ? "1px solid #dee2e6" : "none",
          }}
          onClick={() => handleSectionToggle(1)}
        >
          <h5 className="mb-0">
            <i className="bi bi-geo-alt me-2" style={{ color: "#0d6efd" }}></i>
            Paso 1: Selecciona Ruta y Contenedor
            {containerSeleccionado && (
              <span className="badge bg-success ms-3">
                <i className="bi bi-check-circle-fill me-1"></i>
                Completado
              </span>
            )}
          </h5>
          <div className="d-flex align-items-center gap-2">
            {!containerSeleccionado && (
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
            <button
              type="button"
              className="btn btn-link text-decoration-none p-0"
              style={{ fontSize: "1.5rem" }}
            >
              <i
                className={`bi bi-chevron-${openSection === 1 ? "up" : "down"}`}
              ></i>
            </button>
          </div>
        </div>

        {openSection === 1 && (
          <div className="card-body">
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
                    <label className="form-label fw-semibold">
                      Puerto de Origen (POL)
                    </label>
                    <Select
                      value={polSeleccionado}
                      onChange={setPolSeleccionado}
                      options={opcionesPOL}
                      placeholder="Selecciona puerto de origen..."
                      isClearable
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderColor: "#dee2e6",
                          "&:hover": { borderColor: "#0d6efd" },
                        }),
                      }}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      Puerto de Destino (POD)
                    </label>
                    <Select
                      value={podSeleccionado}
                      onChange={setPodSeleccionado}
                      options={opcionesPOD}
                      placeholder={
                        polSeleccionado
                          ? "Selecciona puerto de destino..."
                          : "Primero selecciona origen"
                      }
                      isClearable
                      isDisabled={!polSeleccionado}
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderColor: "#dee2e6",
                          "&:hover": { borderColor: "#0d6efd" },
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
                              No se encontraron rutas
                            </p>
                            <small className="text-muted">
                              Intenta ajustar los filtros o seleccionar otras
                              ubicaciones
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
                                  ? "border-primary border-2 shadow-lg"
                                  : "border-0 shadow-sm"
                              }`}
                              style={{
                                transition: "all 0.3s ease",
                                transform:
                                  rutaSeleccionada?.id === ruta.id
                                    ? "translateY(-4px)"
                                    : "none",
                              }}
                            >
                              {/* Badge de "Mejor Opción" */}
                              {index === 0 && (
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

                              <div className="card-body">
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
                                      <span className="badge bg-primary bg-opacity-10 text-primary border border-primary">
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
                                    <div className="d-flex align-items-center gap-2 p-2 bg-light rounded">
                                      <i className="bi bi-clock text-primary"></i>
                                      <div className="flex-grow-1">
                                        <small
                                          className="text-muted d-block"
                                          style={{ fontSize: "0.7rem" }}
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

                                {/* Botones de Contenedores */}
                                <div className="d-flex flex-column gap-2">
                                  {/* 20GP */}
                                  {ruta.gp20 &&
                                    ruta.gp20 !== "N/A" &&
                                    ruta.gp20 !== "-" && (
                                      <button
                                        type="button"
                                        className={`btn ${
                                          rutaSeleccionada?.id === ruta.id &&
                                          containerSeleccionado?.type === "20GP"
                                            ? "btn-success"
                                            : "btn-outline-primary"
                                        }`}
                                        onClick={() =>
                                          handleSeleccionarContainer(
                                            ruta,
                                            "20GP",
                                          )
                                        }
                                        style={{ transition: "all 0.2s" }}
                                      >
                                        <div className="d-flex justify-content-between align-items-center">
                                          <span className="fw-bold">
                                            <i className="bi bi-box"></i> 20GP
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
                                        className={`btn ${
                                          rutaSeleccionada?.id === ruta.id &&
                                          containerSeleccionado?.type === "40HQ"
                                            ? "btn-success"
                                            : "btn-outline-primary"
                                        }`}
                                        onClick={() =>
                                          handleSeleccionarContainer(
                                            ruta,
                                            "40HQ",
                                          )
                                        }
                                        style={{ transition: "all 0.2s" }}
                                      >
                                        <div className="d-flex justify-content-between align-items-center">
                                          <span className="fw-bold">
                                            <i className="bi bi-box"></i> 40HQ
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
                                        className={`btn ${
                                          rutaSeleccionada?.id === ruta.id &&
                                          containerSeleccionado?.type ===
                                            "40NOR"
                                            ? "btn-success"
                                            : "btn-outline-primary"
                                        }`}
                                        onClick={() =>
                                          handleSeleccionarContainer(
                                            ruta,
                                            "40NOR",
                                          )
                                        }
                                        style={{ transition: "all 0.2s" }}
                                      >
                                        <div className="d-flex justify-content-between align-items-center">
                                          <span className="fw-bold">
                                            <i className="bi bi-box"></i> 40NOR
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
          <div className="card-body py-2 bg-light">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <small className="text-muted d-block">Ruta seleccionada:</small>
                <strong>
                  {rutaSeleccionada.pol} → {rutaSeleccionada.pod}
                </strong>
                <span className="ms-3 text-muted">|</span>
                <span className="ms-2 badge bg-primary">
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

        {/* Detalles de la ruta seleccionada */}
        {rutaSeleccionada && containerSeleccionado && (
          <>
            {/* Nuevos campos: Cantidad, Incoterm y Direcciones */}
            <div className="card shadow-sm mt-4">
              <div className="card-body">
                <h5 className="card-title mb-4">Detalles de la Cotización</h5>

                <div className="row g-3">
                  {/* Incoterm */}
                  <div className="col-12 mb-3">
                    <label
                      className="form-label mb-2"
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 500,
                        color: "#1a1a1a",
                      }}
                    >
                      <i
                        className="bi bi-flag me-2"
                        style={{ color: "#185abc" }}
                      ></i>
                      Incoterm
                      <span
                        className="badge bg-light text-dark ms-2"
                        style={{ fontSize: "0.7rem", fontWeight: 400 }}
                      >
                        Obligatorio
                      </span>
                    </label>
                    <select
                      className="form-select"
                      value={incoterm}
                      onChange={(e) =>
                        setIncoterm(e.target.value as "EXW" | "FOB" | "")
                      }
                      style={{
                        maxWidth: 400,
                        borderRadius: "8px",
                        border: "1px solid #ced4da",
                        padding: "0.625rem 0.75rem",
                        fontSize: "0.95rem",
                        transition: "all 0.2s ease",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#185abc")}
                      onBlur={(e) => (e.target.style.borderColor = "#ced4da")}
                    >
                      <option value="">Seleccione un Incoterm</option>
                      <option value="EXW">Ex Works [EXW]</option>
                      <option value="FOB">FOB</option>
                    </select>
                  </div>
                  {/* Cantidad de Contenedores */}
                  <div className="col-md-4">
                    <label className="form-label">
                      Cantidad de Contenedores
                    </label>
                    <input
                      type="number"
                      className="form-control"
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
                        <label className="form-label">
                          Pickup From Address{" "}
                          <span className="text-danger">*</span>
                        </label>
                        <textarea
                          className="form-control"
                          value={pickupFromAddress}
                          onChange={(e) => setPickupFromAddress(e.target.value)}
                          placeholder="Ingrese dirección de recogida"
                          rows={3}
                        />
                      </div>

                      <div className="col-md-4">
                        <label className="form-label">
                          Delivery To Address{" "}
                          <span className="text-danger">*</span>
                        </label>
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

                {/* Resumen de cargos - Versión compacta mejorada */}
                {incoterm && (
                  <div className="mt-4 pt-3 border-top">
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
                      {incoterm === "EXW" && (
                        <div className="d-flex justify-content-between mb-2">
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
                      <div className="d-flex justify-content-between mb-3 pb-3 border-bottom">
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
                          <label
                            className="form-check-label"
                            htmlFor="seguroCheckbox"
                          >
                            Agregar Seguro
                          </label>
                          <small className="text-muted d-block ms-4">
                            Protección adicional para tu carga
                          </small>
                        </div>

                        {/* Input para Valor de Mercadería - Solo visible si seguro está activo */}
                        {seguroActivo && (
                          <div className="mt-3 ms-4">
                            <label
                              htmlFor="valorMercaderia"
                              className="form-label small"
                            >
                              Valor de la Mercadería (
                              {rutaSeleccionada.currency}){" "}
                              <span className="text-danger">*</span>
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
                                if (value === "" || /^[\d,\.]+$/.test(value)) {
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
                          <strong className="text-info">
                            {rutaSeleccionada.currency}{" "}
                            {calculateSeguro().toFixed(2)}
                          </strong>
                        </div>
                      )}

                      {/* Mensaje de advertencia si el seguro está activo pero no hay valor de mercadería */}
                      {seguroActivo && !valorMercaderia && (
                        <div
                          className="alert alert-warning py-2 mb-3"
                          role="alert"
                        >
                          <small>
                            ⚠️ Debes ingresar el valor de la mercadería para
                            calcular el seguro
                          </small>
                        </div>
                      )}

                      {/* Total */}
                      <div className="d-flex justify-content-between">
                        <span className="fs-5 fw-bold">TOTAL:</span>
                        <span className="fs-5 fw-bold text-success">
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
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ============================================================================ */}
      {/* SECCIÓN 2: GENERAR COTIZACIÓN */}
      {/* ============================================================================ */}

      {rutaSeleccionada && containerSeleccionado && (
        <>
          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <h5 className="card-title mb-4">Paso 2: Generar Cotización</h5>

              <button
                onClick={testAPI}
                disabled={
                  loading ||
                  !accessToken ||
                  !rutaSeleccionada ||
                  !containerSeleccionado ||
                  !incoterm ||
                  (incoterm === "EXW" &&
                    (!pickupFromAddress || !deliveryToAddress))
                }
                className="btn btn-lg btn-success w-100"
              >
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Generando...
                  </>
                ) : (
                  <>🚀 Generar Cotización FCL</>
                )}
              </button>

              {!accessToken && (
                <div className="alert alert-danger mt-3 mb-0">
                  ⚠️ No hay token de acceso. Asegúrate de estar autenticado.
                </div>
              )}

              {!incoterm && rutaSeleccionada && containerSeleccionado && (
                <div className="alert alert-info mt-3 mb-0">
                  ℹ️ Debes seleccionar un Incoterm antes de generar la
                  cotización
                </div>
              )}

              {incoterm === "EXW" &&
                (!pickupFromAddress || !deliveryToAddress) && (
                  <div className="alert alert-warning mt-3 mb-0">
                    ⚠️ Debes completar las direcciones de Pickup y Delivery para
                    el Incoterm EXW
                  </div>
                )}
            </div>
          </div>

          {/* Payload de prueba
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
          </div>*/}
        </>
      )}

      {/* ============================================================================ */}
      {/* SECCIÓN 3: RESULTADOS */}
      {/* ============================================================================ */}

      {/* Error */}
      {error && (
        <div className="card shadow-sm mb-4 border-danger">
          <div className="card-body">
            <h5 className="card-title text-danger">
              ❌ Error en la Cotización
            </h5>
            <pre
              style={{
                backgroundColor: "#fff5f5",
                padding: "15px",
                borderRadius: "5px",
                maxHeight: "400px",
                overflow: "auto",
                fontSize: "0.85rem",
                color: "#c53030",
              }}
            >
              {error}
            </pre>
          </div>
        </div>
      )}

      {/* Respuesta exitosa */}
      {response && (
        <div className="card shadow-sm mb-4 border-success">
          <div className="card-body">
            <h5 className="card-title text-success">
              ✅ Tu cotización se ha generado exitosamente
            </h5>
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
