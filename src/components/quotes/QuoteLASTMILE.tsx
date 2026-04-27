import { useState, useEffect, useMemo, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useAuditLog } from "../../hooks/useAuditLog";
import Select from "react-select";
import ReactDOM from "react-dom/client";
import { PDFTemplateLastMile } from "./Pdftemplate/Pdftemplatelastmile";
import {
  generatePDF,
  generatePDFBase64,
  downloadPDFFromBase64,
  formatDateForFilename,
} from "./Pdftemplate/Pdfutils";
import CotizadorAddressMapDual from "../Map/CotizadorAddressMapDual";
import {
  GOOGLE_SHEET_LASTMILE_CSV_URL,
  parseCSV,
  parseLastMile,
  type LastMileSelectOption,
  type RutaLastMile,
  type ClienteAsignadoLM,
  type QuoteLastMileProps,
} from "./Handlers/LASTMILE/HandlerQuoteLASTMILE";
import { linbisFetch } from "../../services/linbisFetch";
import { useQuoteTracking } from "../../hooks/useQuoteTracking";
import { imgUrl } from "../../config/images";
import "flag-icons/css/flag-icons.min.css";
import "./QuoteLASTMILE.css";

interface OutletContext {
  accessToken: string;
  refreshAccessToken: () => Promise<string>;
  onLogout: () => void;
}

const MAX_CARGO_DESC = 2000;
const VALIDITY_DAYS = 5;

/** Expande cuentas multi-empresa: una entrada por empresa en el selector */
function expandClientesPorEmpresa(
  clientes: ClienteAsignadoLM[],
): ClienteAsignadoLM[] {
  const expanded: ClienteAsignadoLM[] = [];
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

const getValidityDate = (): Date =>
  new Date(Date.now() + VALIDITY_DAYS * 24 * 60 * 60 * 1000);

function QuoteLASTMILE({
  preselectedOrigin,
  preselectedDestination,
  isEjecutivoMode = false,
}: QuoteLastMileProps = {}) {
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
  const { registrarEvento } = useAuditLog();
  const { trackStart, trackStep, trackRouteSelected, trackComplete } =
    useQuoteTracking("LASTMILE" as any);

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Modo ejecutivo
  const [clientesAsignados, setClientesAsignados] = useState<
    ClienteAsignadoLM[]
  >([]);
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<ClienteAsignadoLM | null>(null);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [errorClientes, setErrorClientes] = useState<string | null>(null);

  const effectiveUsername = isEjecutivoMode
    ? clienteSeleccionado?.username || user?.username || ""
    : activeUsername || "";
  const salesRepName = isEjecutivoMode
    ? user?.nombreuser || user?.username || ""
    : ejecutivo?.nombre?.trim() || "";

  // Rutas
  const [rutas, setRutas] = useState<RutaLastMile[]>([]);
  const [loadingRutas, setLoadingRutas] = useState(true);
  const [errorRutas, setErrorRutas] = useState<string | null>(null);

  const [origenSel, setOrigenSel] = useState<LastMileSelectOption | null>(null);
  const [destinoSel, setDestinoSel] = useState<LastMileSelectOption | null>(
    null,
  );

  const [opcionesOrigen, setOpcionesOrigen] = useState<LastMileSelectOption[]>(
    [],
  );
  const [opcionesDestino, setOpcionesDestino] = useState<
    LastMileSelectOption[]
  >([]);

  // Datos del cargamento
  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [cargoDescription, setCargoDescription] = useState("");
  // Valores siempre almacenados en SI (cm / kg). El toggle solo afecta la visualización/entrada.
  const [peso, setPeso] = useState("");
  const [alto, setAlto] = useState("");
  const [ancho, setAncho] = useState("");
  const [largo, setLargo] = useState("");
  const [useUSCustomary, setUseUSCustomary] = useState(false);

  // Helpers de conversión SI ↔ US Customary
  const displayDim = (cmStr: string): string => {
    if (!cmStr) return "";
    const cm = parseFloat(cmStr);
    if (!Number.isFinite(cm) || cm === 0) return "";
    return useUSCustomary
      ? (cm / 2.54).toFixed(3).replace(/\.?0+$/, "")
      : cmStr;
  };
  const displayWeight = (kgStr: string): string => {
    if (!kgStr) return "";
    const kg = parseFloat(kgStr);
    if (!Number.isFinite(kg) || kg === 0) return "";
    return useUSCustomary
      ? (kg / 0.453592).toFixed(3).replace(/\.?0+$/, "")
      : kgStr;
  };
  const handleDimInput = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    raw: string,
  ) => {
    if (raw === "") {
      setter("");
      return;
    }
    const num = parseFloat(raw);
    if (!Number.isFinite(num)) {
      setter("");
      return;
    }
    const cm = useUSCustomary ? num * 2.54 : num;
    setter(String(cm));
  };
  const handleWeightInput = (raw: string) => {
    if (raw === "") {
      setPeso("");
      return;
    }
    const num = parseFloat(raw);
    if (!Number.isFinite(num)) {
      setPeso("");
      return;
    }
    const kg = useUSCustomary ? num * 0.453592 : num;
    setPeso(String(kg));
  };

  // Servicios adicionales
  const [seguroActivo, setSeguroActivo] = useState(false);

  // Acordeón
  const [openSection, setOpenSection] = useState<number>(1);
  const [step2Completed, setStep2Completed] = useState<boolean>(false);
  const [step3Completed, setStep3Completed] = useState<boolean>(false);
  const [tipoAccion] = useState<"cotizacion" | "operacion">("cotizacion");

  const section2Ref = useRef<HTMLDivElement>(null);
  const section3Ref = useRef<HTMLDivElement>(null);
  const section4Ref = useRef<HTMLDivElement>(null);

  // Permisos
  const isPricingRole = user?.roles?.pricing === true;

  useEffect(() => {
    trackStart();
  }, [trackStart]);

  // Cargar clientes asignados (modo ejecutivo)
  useEffect(() => {
    const cargarClientes = async () => {
      if (
        !isEjecutivoMode ||
        (user?.username !== "Ejecutivo" && !isPricingRole)
      ) {
        setLoadingClientes(false);
        return;
      }
      try {
        setLoadingClientes(true);
        setErrorClientes(null);
        const clientes = isPricingRole
          ? await getTodosClientes()
          : await getMisClientes();
        const expanded = expandClientesPorEmpresa(clientes || []);
        setClientesAsignados(expanded);
      } catch (err: any) {
        setErrorClientes(err?.message || "Error cargando clientes");
      } finally {
        setLoadingClientes(false);
      }
    };
    cargarClientes();
  }, [user, getMisClientes, getTodosClientes, isEjecutivoMode, isPricingRole]);

  // Cargar rutas desde el sheet
  useEffect(() => {
    const cargarRutas = async () => {
      try {
        setLoadingRutas(true);
        setErrorRutas(null);
        const ts = Date.now();
        const res = await fetch(`${GOOGLE_SHEET_LASTMILE_CSV_URL}&ts=${ts}`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const csvText = await res.text();
        const data = parseCSV(csvText);
        const parsed = parseLastMile(data);
        setRutas(parsed);

        // Origenes únicos
        const orgMap = new Map<string, string>();
        parsed.forEach((r) => {
          if (!orgMap.has(r.origenNormalized)) {
            orgMap.set(r.origenNormalized, r.origen);
          }
        });
        const orgs = Array.from(orgMap.entries())
          .map(([value, label]) => ({ value, label }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setOpcionesOrigen(orgs);
      } catch (err: any) {
        console.error("[QuoteLASTMILE] Error cargando rutas:", err);
        setErrorRutas(
          "No se pudieron cargar las rutas de Última Milla. Intenta nuevamente.",
        );
      } finally {
        setLoadingRutas(false);
      }
    };
    cargarRutas();
  }, []);

  // Actualizar destinos cuando cambia origen
  useEffect(() => {
    if (!origenSel) {
      setOpcionesDestino([]);
      setDestinoSel(null);
      return;
    }
    const destMap = new Map<string, string>();
    rutas
      .filter((r) => r.origenNormalized === origenSel.value)
      .forEach((r) => {
        if (!destMap.has(r.destinoNormalized)) {
          destMap.set(r.destinoNormalized, r.destino);
        }
      });
    const dests = Array.from(destMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
    setOpcionesDestino(dests);
    // Auto-seleccionar si solo hay una opción
    if (dests.length === 1) setDestinoSel(dests[0]);
    else setDestinoSel(null);
  }, [origenSel, rutas]);

  // Aplicar preselección
  useEffect(() => {
    if (loadingRutas || !preselectedOrigin) return;
    const opt = opcionesOrigen.find((o) => o.value === preselectedOrigin.value);
    if (opt) setOrigenSel(opt);
  }, [loadingRutas, opcionesOrigen, preselectedOrigin]);
  useEffect(() => {
    if (!preselectedDestination || !origenSel || opcionesDestino.length === 0)
      return;
    const opt = opcionesDestino.find(
      (o) => o.value === preselectedDestination.value,
    );
    if (opt) setDestinoSel(opt);
  }, [opcionesDestino, preselectedDestination, origenSel]);

  // Track ruta seleccionada
  useEffect(() => {
    if (origenSel && destinoSel) {
      trackRouteSelected(origenSel.label, destinoSel.label, {
        servicio: "LASTMILE",
      });
    }
  }, [origenSel, destinoSel, trackRouteSelected]);

  // Auto avanzar al paso 2 cuando ambos están seleccionados
  useEffect(() => {
    if (origenSel && destinoSel && openSection === 1) {
      const t = setTimeout(() => setOpenSection(2), 250);
      return () => clearTimeout(t);
    }
  }, [origenSel, destinoSel, openSection]);

  // Auto-scroll al cambiar sección
  useEffect(() => {
    const t = setTimeout(() => {
      if (openSection === 2)
        section2Ref.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      else if (openSection === 3)
        section3Ref.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      else if (openSection === 4)
        section4Ref.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 150);
    return () => clearTimeout(t);
  }, [openSection]);

  const canProceedFromStep1 = !!(origenSel && destinoSel);
  const canProceedFromStep2 = useMemo(() => {
    return (
      pickupAddress.trim().length > 0 &&
      deliveryAddress.trim().length > 0 &&
      cargoDescription.trim().length > 0
    );
  }, [pickupAddress, deliveryAddress, cargoDescription]);

  const visibleProgressSteps = useMemo(
    () => [
      {
        number: 1,
        label: "Ruta",
        active: openSection === 1,
        complete: canProceedFromStep1,
      },
      ...(canProceedFromStep1
        ? [
            {
              number: 2,
              label: "Cargamento",
              active: openSection === 2,
              complete: step2Completed,
            },
          ]
        : []),
      ...(step2Completed
        ? [
            {
              number: 3,
              label: "Servicios",
              active: openSection === 3,
              complete: step3Completed,
            },
          ]
        : []),
      ...(step3Completed
        ? [
            {
              number: 4,
              label: "Revisión",
              active: openSection === 4,
              complete: false,
            },
          ]
        : []),
    ],
    [canProceedFromStep1, openSection, step2Completed, step3Completed],
  );

  const dimensionsSummary = useMemo(
    () =>
      [
        peso && `Peso: ${peso} kg`,
        largo && `Largo: ${largo} cm`,
        ancho && `Ancho: ${ancho} cm`,
        alto && `Alto: ${alto} cm`,
      ]
        .filter(Boolean)
        .join(" · "),
    [peso, largo, ancho, alto],
  );

  // Totales (volumen, peso real/volumétrico/chargeable) para LASTMILE.
  // Factor volumétrico estándar terrestre/courier internacional: 167 kg/m³ (5000 cm³/kg).
  const cargoTotals = useMemo(() => {
    const l = parseFloat(largo) || 0;
    const w = parseFloat(ancho) || 0;
    const h = parseFloat(alto) || 0;
    const realWeight = parseFloat(peso) || 0;
    const volume = l && w && h ? (l * w * h) / 1_000_000 : 0; // m³
    const volumetricWeight = volume * 167;
    const chargeableWeight = Math.max(realWeight, volumetricWeight);
    return { volume, realWeight, volumetricWeight, chargeableWeight };
  }, [largo, ancho, alto, peso]);

  const cargoDescriptionPreview = useMemo(() => {
    const trimmedDescription = cargoDescription.trim();
    if (trimmedDescription.length <= 120) return trimmedDescription;
    return `${trimmedDescription.slice(0, 117)}...`;
  }, [cargoDescription]);

  useEffect(() => {
    if (!canProceedFromStep1) {
      if (step2Completed) {
        setStep2Completed(false);
      }
      if (step3Completed) {
        setStep3Completed(false);
      }
      if (openSection !== 1) {
        setOpenSection(1);
      }
    }
  }, [canProceedFromStep1, openSection, step2Completed, step3Completed]);

  useEffect(() => {
    if (step2Completed && !canProceedFromStep2) {
      setStep2Completed(false);
      if (step3Completed) {
        setStep3Completed(false);
      }
      setOpenSection(2);
    }
  }, [canProceedFromStep2, step2Completed, step3Completed]);

  const handleSectionToggle = (section: number) => {
    if (section === 2 && !canProceedFromStep1) return;
    if (section === 3 && !step2Completed) return;
    if (section === 4 && !step3Completed) return;
    setOpenSection(openSection === section ? 0 : section);
    if (section === 2)
      trackStep({ step: "datos_cargamento", stepNumber: 2, totalSteps: 4 });
    if (section === 3)
      trackStep({
        step: "servicios_adicionales",
        stepNumber: 3,
        totalSteps: 4,
      });
    if (section === 4)
      trackStep({ step: "revision", stepNumber: 4, totalSteps: 4 });
  };

  // ============================================================================
  // PAYLOAD LINBIS
  // ============================================================================

  const buildPayload = () => {
    if (!origenSel || !destinoSel) return null;

    const validUntil = getValidityDate().toISOString();

    // Charges con monto 0 (cotización sin valor)
    const charges = [
      {
        service: { id: 168, code: "B" },
        income: {
          quantity: 1,
          unit: "Each",
          rate: 0,
          amount: 0,
          payment: "Prepaid",
          billApplyTo: "Other",
          billTo: { name: effectiveUsername },
          currency: { abbr: "USD" },
          reference: "TEST-REF-LM",
          showOnDocument: true,
          notes: "Última Milla - Pendiente tarifa",
        },
        expense: { currency: { abbr: "USD" } },
      },
    ];

    // Commodity con dimensiones detalladas (mismo formato que QuoteAIR)
    const pesoNum = parseFloat(peso) || 0;
    const largoNum = parseFloat(largo) || 0;
    const anchoNum = parseFloat(ancho) || 0;
    const altoNum = parseFloat(alto) || 0;
    const commodity = {
      commodityType: "Standard",
      pieces: 1,
      description: cargoDescription.slice(0, 500),
      weightPerUnitValue: pesoNum,
      weightPerUnitUOM: "kg",
      totalWeightValue: pesoNum,
      totalWeightUOM: "kg",
      lengthValue: largoNum,
      lengthUOM: "cm",
      widthValue: anchoNum,
      widthUOM: "cm",
      heightValue: altoNum,
      heightUOM: "cm",
      volumeValue: cargoTotals.volume,
      volumeUOM: "m3",
      totalVolumeValue: cargoTotals.volume,
      totalVolumeUOM: "m3",
      volumeWeightValue: cargoTotals.volumetricWeight,
      volumeWeightUOM: "kg",
      totalVolumeWeightValue: cargoTotals.volumetricWeight,
      totalVolumeWeightUOM: "kg",
    };

    return {
      date: new Date().toISOString(),
      validUntil,
      transitDays: null as number | null,
      project: { name: "GROUND" },
      customerReference: "Portal Created [LASTMILE] - PENDIENTE TARIFA",
      contact: { name: effectiveUsername },
      origin: { name: origenSel.label },
      carrierBroker: { name: "X" },
      destination: { name: destinoSel.label },
      modeOfTransportation: { id: 6 },
      rateCategoryId: 2,
      pickupFromAddress: pickupAddress,
      deliveryToAddress: deliveryAddress,
      portOfReceipt: { name: origenSel.label },
      shipper: { name: effectiveUsername },
      consignee: { name: effectiveUsername },
      issuingCompany: { name: "X" },
      serviceType: { name: "GROUND" },
      salesRep: { name: salesRepName },
      PaymentTerms: { name: "Prepaid" },
      commodities: [commodity],
      charges,
    };
  };

  const submitQuote = async () => {
    if (authLoading) {
      setError(
        "Cargando datos de autenticación. Por favor espera un momento e intenta nuevamente.",
      );
      return;
    }
    if (!canProceedFromStep1) {
      setError("Debes seleccionar origen y destino.");
      return;
    }
    if (!canProceedFromStep2) {
      setError(
        "Debes ingresar dirección de recogida, dirección de entrega e información del cargamento.",
      );
      return;
    }
    if (isEjecutivoMode && !clienteSeleccionado) {
      setError("Selecciona un cliente para esta cotización.");
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Obtener id máximo previo
      let previousMaxId = 0;
      try {
        const preRes = await linbisFetch(
          `https://api.linbis.com/Quotes?ConsigneeName=${encodeURIComponent(effectiveUsername)}`,
          { headers: { Accept: "application/json" } },
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
        }
      } catch {
        /* ignore */
      }

      const payload = buildPayload();
      if (!payload) throw new Error("No se pudo construir el payload");

      const res = await linbisFetch(
        "https://api.linbis.com/Quotes/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        accessToken,
        refreshAccessToken,
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }

      const data = await res.json();
      setResponse(data);

      if (isEjecutivoMode) {
        registrarEvento({
          accion: "COTIZACION_LASTMILE_EJECUTIVO",
          categoria: "COTIZACION",
          descripcion: `Cotización Última Milla creada por ejecutivo ${ejecutivo?.nombre || ""} para cliente ${clienteSeleccionado?.username || ""}`,
          detalles: {
            tipo: tipoAccion,
            origen: origenSel?.label || "",
            destino: destinoSel?.label || "",
            seguro: seguroActivo,
          },
          clienteAfectado: clienteSeleccionado?.username || "",
        });
      }

      trackComplete({
        pol: origenSel?.label || "",
        pod: destinoSel?.label || "",
        carrier: "X",
        tipo: tipoAccion,
        isRecurring: false,
      } as any);

      await generateQuotePDF(data, previousMaxId);
    } catch (err: any) {
      setError(err?.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const generateQuotePDF = async (
    apiResponse?: any,
    previousMaxId?: number,
  ) => {
    try {
      if (!origenSel || !destinoSel) return;

      // Obtener quoteNumber real con polling
      let quoteNumber = "";
      try {
        const pollDelays = [500, 1000, 1000];
        for (
          let attempt = 0;
          attempt < pollDelays.length && !quoteNumber;
          attempt++
        ) {
          await new Promise((r) => setTimeout(r, pollDelays[attempt]));
          const linbisRes = await linbisFetch(
            `https://api.linbis.com/Quotes?ConsigneeName=${encodeURIComponent(effectiveUsername)}`,
            { headers: { Accept: "application/json" } },
            accessToken,
            refreshAccessToken,
          );
          if (linbisRes.ok) {
            const linbisData = await linbisRes.json();
            if (Array.isArray(linbisData) && linbisData.length > 0) {
              const newest = linbisData.reduce(
                (max: any, q: any) =>
                  (Number(q.id) || 0) > (Number(max.id) || 0) ? q : max,
                linbisData[0],
              );
              if (Number(newest.id) > (previousMaxId || 0)) {
                quoteNumber = newest.number;
              }
            }
          }
        }
      } catch {
        /* ignore */
      }

      if (quoteNumber) {
        trackComplete({ quoteNumber, isRecurring: false } as any);
      }

      // Notificar al ejecutivo de cotización sin tarifa (siempre, last mile no tiene tarifa)
      if (!isEjecutivoMode) {
        fetch(`/api/send-no-rate-quote-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            quoteType: "LASTMILE",
            cargoDetails: {
              pol: origenSel.label,
              pod: destinoSel.label,
              pickupFromAddress: pickupAddress,
              deliveryToAddress: deliveryAddress,
              cargoDescription,
              peso: peso || undefined,
              largo: largo || undefined,
              ancho: ancho || undefined,
              alto: alto || undefined,
            },
            quoteNumber: quoteNumber || undefined,
          }),
          keepalive: true,
        }).catch(() => {});
      }

      // Renderizar PDF
      const tempDiv = document.createElement("div");
      tempDiv.style.position = "absolute";
      tempDiv.style.left = "-9999px";
      document.body.appendChild(tempDiv);

      const root = ReactDOM.createRoot(tempDiv);
      const validUntilDisplay = getValidityDate().toLocaleDateString("es-CL");

      await new Promise<void>((resolve) => {
        root.render(
          <PDFTemplateLastMile
            quoteNumber={quoteNumber}
            customerName={effectiveUsername || "Customer"}
            origen={origenSel.label}
            destino={destinoSel.label}
            effectiveDate={new Date().toLocaleDateString("es-CL")}
            expirationDate={validUntilDisplay}
            pickupFromAddress={pickupAddress}
            deliveryToAddress={deliveryAddress}
            salesRep={salesRepName}
            cargoDescription={cargoDescription}
            peso={peso || undefined}
            alto={alto || undefined}
            ancho={ancho || undefined}
            largo={largo || undefined}
            seguroActivo={seguroActivo}
            validUntil={validUntilDisplay}
            logoSrc="/logo.png"
          />,
        );
        setTimeout(resolve, 500);
      });

      const pdfElement = tempDiv.querySelector("#pdf-content") as HTMLElement;
      if (pdfElement) {
        const customerClean = (effectiveUsername || "Cliente").replace(
          /[^a-zA-Z0-9]/g,
          "_",
        );
        const filename = quoteNumber
          ? `${quoteNumber}_${customerClean}_LM.pdf`
          : `Cotizacion_LM_${customerClean}_${formatDateForFilename(new Date())}.pdf`;

        const pdfBase64 = await generatePDFBase64(pdfElement);

        if (pdfBase64 && quoteNumber) {
          try {
            const bodyPayload: any = {
              quoteNumber,
              nombreArchivo: filename,
              contenidoBase64: pdfBase64,
              tipoServicio: "LASTMILE",
              origen: origenSel.label,
              destino: destinoSel.label,
            };
            if (
              isEjecutivoMode &&
              (user?.username === "Ejecutivo" || isPricingRole) &&
              clienteSeleccionado
            ) {
              bodyPayload.usuarioId = clienteSeleccionado.username;
              bodyPayload.subidoPor = clienteSeleccionado.email;
            }
            await fetch("/api/quote-pdf/upload", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(bodyPayload),
            });
          } catch (err) {
            console.error("[QuoteLASTMILE] Error subiendo PDF:", err);
          }
        }

        if (pdfBase64) {
          downloadPDFFromBase64(pdfBase64, filename);
        } else {
          await generatePDF({ filename, element: pdfElement });
        }
      }

      root.unmount();
      document.body.removeChild(tempDiv);
    } catch (err) {
      console.error("[QuoteLASTMILE] Error generando PDF:", err);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="qf-container">
        <div className="qa-section-header">
          <div>
            <h2 className="qa-title">Cotizador Última Milla</h2>
            <p className="qa-subtitle">
              Genera cotizaciones para transporte terrestre de última milla
            </p>
          </div>
        </div>

        {/* Selector de cliente (modo ejecutivo) */}
        {isEjecutivoMode && (
          <div className="card shadow-sm mb-4 lm-client-card">
            <div className="card-body">
              {loadingClientes ? (
                <div className="text-center py-3">
                  <div
                    className="spinner-border spinner-border-sm text-primary"
                    role="status"
                  >
                    <span className="visually-hidden">Cargando...</span>
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
                </div>
              ) : (
                <div className="row g-3">
                  <div className="col-md-8">
                    <label className="form-label fw-semibold">
                      Cliente para esta cotización
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
                    />
                    {!clienteSeleccionado && (
                      <small className="text-danger d-block mt-1">
                        Debes seleccionar un cliente antes de generar la
                        cotización
                      </small>
                    )}
                  </div>
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
                  style={{ color: "var(--qf-primary)" }}
                ></i>
                Paso 1: Seleccionar Ruta
              </h3>
              {openSection !== 1 && canProceedFromStep1 && (
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
              {openSection !== 1 && canProceedFromStep1 ? (
                <button
                  type="button"
                  className="qa-btn qa-btn-sm qa-btn-outline"
                  onClick={(event) => {
                    event.stopPropagation();
                    // Reset route and all downstream state so auto-advance doesn't retrigger
                    setOrigenSel(null);
                    setDestinoSel(null);
                    setPickupAddress("");
                    setDeliveryAddress("");
                    setCargoDescription("");
                    setPeso("");
                    setAlto("");
                    setAncho("");
                    setLargo("");
                    setSeguroActivo(false);
                    setStep2Completed(false);
                    setStep3Completed(false);
                    setOpenSection(1);
                  }}
                >
                  Cambiar
                </button>
              ) : (
                <i
                  className={`bi bi-chevron-${openSection === 1 ? "up" : "down"}`}
                  style={{ color: "var(--qf-text-secondary)" }}
                ></i>
              )}
            </div>
          </div>

          {openSection !== 1 && canProceedFromStep1 && (
            <div className="qa-route-summary">
              <div className="qa-route-summary-cards">
                <div
                  className="qa-route-summary-card"
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <small>Origen</small>
                    <div className="qa-route-summary-iata">
                      {origenSel?.label.substring(0, 3).toUpperCase()}
                    </div>
                    <div className="qa-route-summary-city">
                      {origenSel?.label}
                    </div>
                  </div>
                  <span
                    className="fi fi-cl"
                    style={{ fontSize: "2.2em", flexShrink: 0 }}
                  />
                </div>
                <div className="qa-route-summary-arrow">
                  <i className="bi bi-arrow-right"></i>
                </div>
                <div
                  className="qa-route-summary-card"
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <small>Destino</small>
                    <div className="qa-route-summary-iata">
                      {destinoSel?.label.substring(0, 3).toUpperCase()}
                    </div>
                    <div className="qa-route-summary-city">
                      {destinoSel?.label}
                    </div>
                  </div>
                  <span
                    className="fi fi-cl"
                    style={{ fontSize: "2.2em", flexShrink: 0 }}
                  />
                </div>
              </div>
              <div className="qa-route-summary-meta">
                <span className="qa-route-meta-pill">
                  <i className="bi bi-truck"></i>
                  Última Milla
                </span>
              </div>
            </div>
          )}

          {openSection === 1 && (
            <div>
              {loadingRutas ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                  <p className="mt-3 text-muted">
                    Cargando rutas disponibles...
                  </p>
                </div>
              ) : errorRutas ? (
                <div className="alert alert-danger">❌ {errorRutas}</div>
              ) : (
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="qf-label">Origen</label>
                    <Select
                      value={origenSel}
                      onChange={(option) =>
                        setOrigenSel(option as LastMileSelectOption | null)
                      }
                      options={opcionesOrigen}
                      placeholder="Selecciona origen..."
                      isClearable
                      menuPlacement="auto"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="qf-label">Destino</label>
                    <Select
                      value={destinoSel}
                      onChange={(option) =>
                        setDestinoSel(option as LastMileSelectOption | null)
                      }
                      options={opcionesDestino}
                      placeholder={
                        origenSel
                          ? "Selecciona destino..."
                          : "Selecciona origen primero"
                      }
                      isClearable
                      isDisabled={!origenSel}
                      menuPlacement="auto"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* PASO 2 */}
        {canProceedFromStep1 && (
          <div className="qa-card lm-step-card" ref={section2Ref}>
            <div
              className={`qf-card-header lm-step-header ${openSection === 2 ? "open" : ""}`}
              onClick={() => handleSectionToggle(2)}
            >
              <div className="d-flex align-items-center">
                <h3>
                  <i
                    className="bi bi-box-seam me-2"
                    style={{ color: "var(--qf-primary)" }}
                  ></i>
                  Paso 2: Datos del Cargamento
                </h3>
                {openSection !== 2 && step2Completed && (
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
                {openSection !== 2 && step2Completed ? (
                  <button
                    type="button"
                    className="qa-btn qa-btn-sm qa-btn-outline"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenSection(2);
                    }}
                  >
                    Cambiar
                  </button>
                ) : (
                  <i
                    className={`bi bi-chevron-${openSection === 2 ? "up" : "down"}`}
                    style={{ color: "var(--qf-text-secondary)" }}
                  ></i>
                )}
              </div>
            </div>

            {openSection !== 2 && step2Completed && (
              <div className="qa-grid-1 mb-4 bg-light p-3 rounded border">
                <div className="qa-totals-bar">
                  <div className="qa-totals-bar-item">
                    <span className="qa-totals-bar-label">
                      <i
                        className="bi bi-geo-alt-fill me-1"
                        style={{ color: "#ff6200" }}
                      ></i>
                      Dirección de Recogida
                    </span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                      {pickupAddress || "—"}
                    </span>
                  </div>
                  <div className="qa-totals-bar-item">
                    <span className="qa-totals-bar-label">
                      <i
                        className="bi bi-flag-fill me-1"
                        style={{ color: "#ff6200" }}
                      ></i>
                      Dirección de Entrega
                    </span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                      {deliveryAddress || "—"}
                    </span>
                  </div>
                </div>
                {(cargoDescriptionPreview || dimensionsSummary) && (
                  <div className="qa-route-summary-meta mt-3">
                    {cargoDescriptionPreview && (
                      <span className="qa-route-meta-pill">
                        <i className="bi bi-card-text"></i>
                        {cargoDescriptionPreview}
                      </span>
                    )}
                    {dimensionsSummary && (
                      <span className="qa-route-meta-pill">
                        <i className="bi bi-box"></i>
                        {dimensionsSummary}
                      </span>
                    )}
                  </div>
                )}
                <div className="qa-totals-bar mt-3">
                  <div className="qa-totals-bar-item">
                    <span className="qa-totals-bar-value">
                      {cargoTotals.volume.toFixed(3)} m³
                    </span>
                    <span className="qa-totals-bar-label">Volumen total</span>
                  </div>
                  <div className="qa-totals-bar-item">
                    <span className="qa-totals-bar-value">
                      {cargoTotals.realWeight.toFixed(2)} kg
                    </span>
                    <span className="qa-totals-bar-label">Peso real</span>
                  </div>
                  <div className="qa-totals-bar-item">
                    <span className="qa-totals-bar-value">
                      {cargoTotals.volumetricWeight.toFixed(2)} kg
                    </span>
                    <span className="qa-totals-bar-label">
                      Peso volumétrico
                    </span>
                  </div>
                  <div className="qa-totals-bar-item">
                    <span className="qa-totals-bar-value">
                      {cargoTotals.chargeableWeight.toFixed(2)} kg
                    </span>
                    <span className="qa-totals-bar-label">Peso chargeable</span>
                  </div>
                </div>
              </div>
            )}

            {openSection === 2 && (
              <div>
                {/* Mapa con autocompletado de direcciones */}
                <CotizadorAddressMapDual
                  pickupValue={pickupAddress}
                  onPickupChange={setPickupAddress}
                  deliveryValue={deliveryAddress}
                  onDeliveryChange={setDeliveryAddress}
                />

                {/* Información del cargamento — estilo PieceAccordion */}
                <div
                  className="qa-accordion open mt-4"
                  style={{ borderRadius: 8 }}
                >
                  <div
                    className="qa-accordion-header open"
                    style={{ cursor: "default" }}
                  >
                    <div style={{ flexGrow: 1 }}>
                      <strong>Pieza/s</strong>
                      {cargoDescription.trim() && (
                        <span className="qa-text-muted ms-3">
                          ({cargoDescription.length}/{MAX_CARGO_DESC}{" "}
                          caracteres)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="qa-accordion-content">
                    <div className="row g-3">
                      {/* Descripción libre */}
                      <div className="col-md-12 mb-3">
                        <label className="qa-label">
                          Descripción{" "}
                          <span
                            className="qa-text-muted"
                            style={{ fontWeight: 400 }}
                          >
                            ({cargoDescription.length}/{MAX_CARGO_DESC})
                          </span>
                        </label>
                        <textarea
                          className="qa-input"
                          rows={2}
                          maxLength={MAX_CARGO_DESC}
                          placeholder="Describe tu cargamento: paletas, cajas, mercadería suelta, tipo de producto, etc."
                          value={cargoDescription}
                          onChange={(e) => setCargoDescription(e.target.value)}
                          style={{ resize: "vertical" }}
                        />
                      </div>

                      {/* Toggle Sistema de Unidades */}
                      <div className="col-12">
                        <div className="d-flex align-items-center gap-2">
                          <small className="qa-text-muted fw-semibold">
                            Unidades:
                          </small>
                          <div
                            className="d-flex"
                            style={{
                              border: "1px solid var(--qa-border)",
                              borderRadius: "6px",
                              overflow: "hidden",
                            }}
                          >
                            <button
                              type="button"
                              className={`qa-btn qa-btn-sm ${!useUSCustomary ? "qa-btn-primary" : ""}`}
                              style={{
                                borderRadius: 0,
                                border: "none",
                                padding: "0.2rem 0.8rem",
                                fontSize: "0.78rem",
                              }}
                              onClick={() => setUseUSCustomary(false)}
                            >
                              Métrico
                            </button>
                            <button
                              type="button"
                              className={`qa-btn qa-btn-sm ${useUSCustomary ? "qa-btn-primary" : ""}`}
                              style={{
                                borderRadius: 0,
                                border: "none",
                                borderLeft: "1px solid var(--qa-border)",
                                padding: "0.2rem 0.8rem",
                                fontSize: "0.78rem",
                              }}
                              onClick={() => setUseUSCustomary(true)}
                            >
                              US Customary
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Grid de dimensiones */}
                      <div className="col-12">
                        <div className="qa-grid-4">
                          <div>
                            <label className="qa-label">
                              {useUSCustomary ? "Largo (in)" : "Largo (cm)"}
                            </label>
                            <input
                              type="number"
                              className="qa-input"
                              value={displayDim(largo)}
                              onChange={(e) =>
                                handleDimInput(setLargo, e.target.value)
                              }
                              min="0"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <label className="qa-label">
                              {useUSCustomary ? "Ancho (in)" : "Ancho (cm)"}
                            </label>
                            <input
                              type="number"
                              className="qa-input"
                              value={displayDim(ancho)}
                              onChange={(e) =>
                                handleDimInput(setAncho, e.target.value)
                              }
                              min="0"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <label className="qa-label">
                              {useUSCustomary ? "Alto (in)" : "Alto (cm)"}
                            </label>
                            <input
                              type="number"
                              className="qa-input"
                              value={displayDim(alto)}
                              onChange={(e) =>
                                handleDimInput(setAlto, e.target.value)
                              }
                              min="0"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <label className="qa-label">
                              {useUSCustomary ? "Peso (lbs)" : "Peso (kg)"}
                            </label>
                            <input
                              type="number"
                              className="qa-input"
                              value={displayWeight(peso)}
                              onChange={(e) =>
                                handleWeightInput(e.target.value)
                              }
                              min="0"
                              step="0.01"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Totals summary bar */}
                      <div className="col-12">
                        <div className="qa-totals-bar">
                          <div className="qa-totals-bar-item">
                            <span className="qa-totals-bar-value">
                              {cargoTotals.volume.toFixed(3)} m³
                            </span>
                            <span className="qa-totals-bar-label">
                              Volumen total
                            </span>
                          </div>
                          <div className="qa-totals-bar-item">
                            <span className="qa-totals-bar-value">
                              {cargoTotals.realWeight.toFixed(2)} kg
                            </span>
                            <span className="qa-totals-bar-label">
                              Peso real
                            </span>
                          </div>
                          <div className="qa-totals-bar-item">
                            <span className="qa-totals-bar-value">
                              {cargoTotals.volumetricWeight.toFixed(2)} kg
                            </span>
                            <span className="qa-totals-bar-label">
                              Peso volumétrico
                            </span>
                          </div>
                          <div className="qa-totals-bar-item">
                            <span className="qa-totals-bar-value">
                              {cargoTotals.chargeableWeight.toFixed(2)} kg
                            </span>
                            <span className="qa-totals-bar-label">
                              Peso chargeable
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 d-flex justify-content-end">
                  <button
                    className="qf-btn qf-btn-primary"
                    disabled={!canProceedFromStep2}
                    onClick={() => {
                      if (!canProceedFromStep2) return;
                      setStep2Completed(true);
                      setOpenSection(3);
                      trackStep({
                        step: "servicios_adicionales",
                        stepNumber: 3,
                        totalSteps: 4,
                      });
                    }}
                  >
                    Siguiente
                    <i className="bi bi-arrow-right ms-1"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PASO 3 */}
        {step2Completed && (
          <div className="qf-card lm-step-card" ref={section3Ref}>
            <div
              className={`qf-card-header lm-step-header ${openSection === 3 ? "open" : ""}`}
              onClick={() => handleSectionToggle(3)}
            >
              <div className="d-flex align-items-center">
                <h3>
                  <i
                    className="bi bi-bag-plus-fill me-2"
                    style={{ color: "var(--qf-primary)" }}
                  ></i>
                  Paso 3: Servicios Adicionales
                </h3>
                {openSection !== 3 && step3Completed && (
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
                {openSection !== 3 ? (
                  <button
                    type="button"
                    className="qa-btn qa-btn-sm qa-btn-outline"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenSection(3);
                    }}
                  >
                    Cambiar
                  </button>
                ) : (
                  <i
                    className={`bi bi-chevron-${openSection === 3 ? "up" : "down"}`}
                    style={{ color: "var(--qf-text-secondary)" }}
                  ></i>
                )}
              </div>
            </div>

            {openSection !== 3 && (
              <div className="qa-route-summary">
                <span className="qa-text-muted" style={{ fontSize: "0.85rem" }}>
                  {seguroActivo
                    ? "Seguro de carga solicitado"
                    : "Sin servicios adicionales seleccionados"}
                </span>
              </div>
            )}

            {openSection === 3 && (
              <div>
                <div className="qf-addons-list">
                  {/* Card: Seguro de Carga */}
                  <div
                    className={`qf-addon-card${seguroActivo ? " is-active" : ""}`}
                  >
                    <div className="qf-addon-card__image">
                      <img
                        src={imgUrl("addcargos/seguro.png")}
                        alt="Seguro de carga"
                        loading="lazy"
                      />
                    </div>
                    <div className="qf-addon-card__body">
                      <h4>Agregar Seguro de Carga</h4>
                      <p>
                        Protege tu cargamento contra daños, pérdidas y robos
                        durante el transporte. Tu ejecutivo te contactará con la
                        cotización del seguro.
                      </p>
                    </div>
                    <div className="qf-addon-card__action">
                      {!seguroActivo ? (
                        <button
                          className="qf-addon-btn-add"
                          onClick={() => setSeguroActivo(true)}
                        >
                          <i className="bi bi-plus-lg"></i>Agregar
                        </button>
                      ) : (
                        <button
                          className="qf-addon-btn-remove"
                          onClick={() => setSeguroActivo(false)}
                        >
                          <i className="bi bi-x-lg"></i>Remover
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 d-flex justify-content-end">
                  <button
                    className="qf-btn qf-btn-primary"
                    onClick={() => {
                      setStep3Completed(true);
                      setOpenSection(4);
                      trackStep({
                        step: "revision",
                        stepNumber: 4,
                        totalSteps: 4,
                      });
                    }}
                  >
                    Siguiente
                    <i className="bi bi-arrow-right ms-1"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PASO 4 */}
        {step2Completed && step3Completed && (
          <div className="qf-card lm-step-card" ref={section4Ref}>
            <div
              className={`qf-card-header lm-step-header ${openSection === 4 ? "open" : ""}`}
              onClick={() => handleSectionToggle(4)}
            >
              <div className="d-flex align-items-center">
                <h3>
                  <i
                    className="bi bi-clipboard-check me-2"
                    style={{ color: "var(--qf-primary)" }}
                  ></i>
                  Paso 4: Revisión
                </h3>
              </div>
              <div className="d-flex align-items-center gap-2">
                <i
                  className={`bi bi-chevron-${openSection === 4 ? "up" : "down"}`}
                  style={{ color: "var(--qf-text-secondary)" }}
                ></i>
              </div>
            </div>

            {openSection === 4 && (
              <>
                <div className="qa-grid-1 mb-4">
                  {/* Resumen de Ruta */}
                  <div className="p-3 bg-light rounded border mb-3">
                    <h6 className="fw-bold mb-3">
                      <i className="bi bi-geo-alt me-2"></i>
                      Ruta Seleccionada
                    </h6>
                    <div className="row g-2 small">
                      <div className="col-6 text-muted">Origen:</div>
                      <div className="col-6 text-end fw-bold">
                        {origenSel?.label || "—"}
                      </div>
                      <div className="col-6 text-muted">Destino:</div>
                      <div className="col-6 text-end fw-bold">
                        {destinoSel?.label || "—"}
                      </div>
                      <div className="col-12 border-top my-2"></div>
                      <div className="col-6 text-muted">
                        <i className="bi bi-geo-alt-fill me-1"></i>
                        Dirección de recogida:
                      </div>
                      <div className="col-6 text-end fw-bold">
                        {pickupAddress || "—"}
                      </div>
                      <div className="col-6 text-muted">
                        <i className="bi bi-flag-fill me-1"></i>
                        Dirección de entrega:
                      </div>
                      <div className="col-6 text-end fw-bold">
                        {deliveryAddress || "—"}
                      </div>
                    </div>
                  </div>

                  {/* Resumen de Cargamento */}
                  <div className="p-3 bg-light rounded border mb-3">
                    <h6 className="fw-bold mb-3">
                      <i className="bi bi-box-seam me-2"></i>
                      Datos del Cargamento
                    </h6>
                    <div className="row g-2 small">
                      <div className="col-6 text-muted">Descripción:</div>
                      <div className="col-6 text-end fw-bold">
                        {cargoDescriptionPreview || "—"}
                      </div>
                      {peso && (
                        <>
                          <div className="col-6 text-muted">Peso:</div>
                          <div className="col-6 text-end fw-bold">
                            {peso} kg
                          </div>
                        </>
                      )}
                      {(largo || ancho || alto) && (
                        <>
                          <div className="col-12 border-top my-2"></div>
                          <div className="col-6 text-muted">
                            Dimensiones (L × A × H):
                          </div>
                          <div className="col-6 text-end fw-bold">
                            {[largo, ancho, alto]
                              .map((v) => v || "0")
                              .join(" × ")}{" "}
                            cm
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Servicios Adicionales */}
                  <div className="p-3 bg-light rounded border mb-3">
                    <h6 className="fw-bold mb-3">
                      <i className="bi bi-shield-plus me-2"></i>
                      Servicios Adicionales
                    </h6>
                    <div className="small">
                      {seguroActivo ? (
                        <span>
                          <i
                            className="bi bi-shield-check me-1"
                            style={{ color: "var(--qa-primary)" }}
                          ></i>
                          <strong>Seguro de carga solicitado</strong>
                        </span>
                      ) : (
                        <span className="text-muted">
                          <i className="bi bi-info-circle me-1"></i>
                          Sin servicios adicionales seleccionados
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="qa-alert qa-alert-danger mb-3">
                    <i className="bi bi-x-circle-fill"></i>
                    <div>{error}</div>
                  </div>
                )}

                <div className="d-flex justify-content-end mt-4">
                  <button
                    className="qa-btn qa-btn-primary"
                    disabled={
                      loading ||
                      !canProceedFromStep1 ||
                      !canProceedFromStep2 ||
                      (isEjecutivoMode && !clienteSeleccionado)
                    }
                    onClick={submitQuote}
                  >
                    {loading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        Generando cotización...
                      </>
                    ) : (
                      <>
                        Generar Cotización
                        <i className="bi bi-arrow-right ms-1"></i>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        {/* Respuesta exitosa */}
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
              <strong>Tu cotización se ha generado exitosamente</strong>
              <div className="mt-1">
                En unos momentos se descargará automáticamente el PDF de la
                cotización.
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default QuoteLASTMILE;
