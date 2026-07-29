import { MOBILE_API_BASE } from "../../src/auth/authApi";
import { linbisFetch } from "../../src/services/linbisFetch";
import {
  buildAirConnectLinbisPayload,
  buildAirLinbisPayload,
  type SalesRepPayload,
} from "../../src/components/quotes/Handlers/Air/airQuoteLinbisPayload";
import {
  buildAirPdfCharges,
  calculateAirBaseWithoutSeguro,
  calculateSeguroAmount,
  calculateUltimaMillaAmount,
  computeAirFreightQuoteValues,
  getCargoWeightTotals,
  resolveAirFreightWeights,
  type AirAddonsState,
} from "../../src/components/quotes/Handlers/Air/airQuotePricingShared";
import {
  DEFAULT_AIR_CONNECT_SPAIN_CONFIG,
  getAirConnectProfitMarkupPct,
} from "../../src/types/airConnectSpainConfig";
import {
  DEFAULT_GESTION_COTIZADOR_CONFIG,
  getVespucioExtendedMultiplier,
  type IAereoCotizadorConfig,
} from "../../src/types/gestionCotizador";
import {
  DEFAULT_CONFIG as DEFAULT_ADUANA_CONFIG,
  type IAgenciaAduanaConfig,
} from "../../src/types/agenciaAduana";
import {
  buildAirConnectExwCalculateInput,
  buildAirConnectFcaCalculateInput,
  buildAirConnectPricedOffers,
  type AirConnectPricedOffer,
} from "../../src/services/airConnectSpainQuote";
import { calculateAirConnectStep3Extras, calculateAirConnectStep3ExtrasBreakdown } from "../../src/components/quotes/AirConnectSpain/step3Extras";
import { buildAirAduanaPdfBreakdown } from "../../src/components/quotes/pdf-template/pdfAduanaBreakdown";
import {
  formatValidUntilDisplay,
  getValidityClass,
} from "../../src/components/quotes/Handlers/handlerFechas";
import {
  DEFAULT_OVERALL_AIR_DESCRIPTION,
  FIXED_AIR_PACKAGE_TYPE_NAME,
} from "../../src/components/quotes/Handlers/Air/airQuoteCargoShared";
import { capitalize } from "../../src/components/quotes/Handlers/Air/HandlerQuoteAir";
import { buildAirQuotePdfHtml } from "./buildAirQuotePdfHtml";
import type { AirStep1Result } from "../screens/cotizador/air/QuoteAirStep1";
import type {
  AirStep2Result,
  AirStep3Result,
} from "../screens/cotizador/air/airWizardTypes";

export type SubmitAirQuoteParams = {
  step1: AirStep1Result;
  step2: AirStep2Result;
  step3: AirStep3Result;
  effectiveUsername: string;
  clientName?: string;
  salesRep: SalesRepPayload;
  /** Nombre visible del ejecutivo en el PDF */
  salesRepName?: string;
  /** Para notificación al ejecutivo (modo staff / cliente) */
  ejecutivoEmail?: string;
  ejecutivoNombre?: string;
  portalToken: string;
  accessToken: string | null;
  refreshAccessToken: () => Promise<string>;
  profitMarkupPct: number;
  airConnectOffer?: AirConnectPricedOffer | null;
  airConnectStep3Extra?: number;
};

export type SubmitAirQuoteResult = {
  quoteNumber: string;
  pdfUri: string | null;
};

async function fetchConfigs(portalToken: string): Promise<{
  aereo: IAereoCotizadorConfig;
  aduana: IAgenciaAduanaConfig;
}> {
  let aereo = DEFAULT_GESTION_COTIZADOR_CONFIG.aereo;
  let aduana = DEFAULT_ADUANA_CONFIG;
  try {
    const [g, a] = await Promise.all([
      fetch(`${MOBILE_API_BASE}/api/gestion-cotizador/config`, {
        headers: { Authorization: `Bearer ${portalToken}` },
      }),
      fetch(`${MOBILE_API_BASE}/api/agencia-aduana/config`),
    ]);
    if (g.ok) {
      const data = await g.json();
      if (data.aereo) aereo = data.aereo;
    }
    if (a.ok) {
      const data = await a.json();
      aduana = {
        exchangeRates: data.exchangeRates,
        charges: data.charges,
        updatedBy: data.updatedBy,
      };
    }
  } catch {
    // defaults
  }
  return { aereo, aduana };
}

function toAddons(step2: AirStep2Result, step3: AirStep3Result): AirAddonsState {
  return {
    seguroActivo: step3.seguroActivo,
    valorMercaderia: step3.valorMercaderia,
    gastolocal: step3.gastolocal,
    liveTrackingActivo: step3.liveTrackingActivo,
    ultimaMillaActivo: step3.ultimaMillaActivo,
    ultimaMillaDireccion: step3.ultimaMillaDireccion,
    ultimaMillaZone: step3.ultimaMillaZone,
    ultimaMillaBracket: step3.ultimaMillaBracket,
    aduanaActivo: step3.aduanaActivo,
    valorProductoAduana: step3.valorProductoAduana,
    noApilableActivo: step2.noApilableActivo,
  };
}

function formatPdfDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function buildPdfHtmlFromQuote(params: {
  quoteNumber: string;
  step1: AirStep1Result;
  step2: AirStep2Result;
  step3: AirStep3Result;
  username: string;
  salesRepName: string;
  charges: ReturnType<typeof buildAirPdfCharges>;
  freight: ReturnType<typeof computeAirFreightQuoteValues>;
  aduana: IAgenciaAduanaConfig;
  pending: boolean;
  profitMarkupPct: number;
}): string {
  const { step1, step2, step3, charges, freight } = params;
  const overallMode = step2.mode === "overall";
  const cargo = {
    mode: step2.mode,
    pieces: step2.pieces,
    overallPieces: step2.overallPieces,
  };
  const totals = getCargoWeightTotals(cargo);
  const { pesoAirFreight } = resolveAirFreightWeights(
    step1.ruta,
    totals.chargeableWeight,
    step1.sinTarifa,
  );
  const airFreightMinWeight =
    !params.pending && pesoAirFreight !== totals.chargeableWeight
      ? pesoAirFreight
      : undefined;

  const baseWithoutSeguro =
    freight != null
      ? calculateAirBaseWithoutSeguro(
          {
            ruta: step1.ruta,
            incoterm: step1.incoterm,
            sinTarifa: step1.sinTarifa,
            cargo,
            profitMarkupPct: params.profitMarkupPct,
            noApilableActivo: step2.noApilableActivo,
          },
          freight.incomeAmount,
        )
      : 0;
  const seguroMonto = calculateSeguroAmount({
    activo: step3.seguroActivo,
    valorMercaderia: step3.valorMercaderia,
    baseWithoutSeguro,
  });

  const aduanaBreakdown =
    !params.pending && step3.aduanaActivo
      ? buildAirAduanaPdfBreakdown({
          activo: step3.aduanaActivo,
          valorProducto: step3.valorProductoAduana,
          costoTransporte: baseWithoutSeguro,
          seguroActivo: step3.seguroActivo,
          seguroMonto,
          currency: step1.ruta.currency || freight?.currency || "USD",
          config: params.aduana,
        })
      : undefined;

  const validUntilDisplay = step1.sinTarifa
    ? undefined
    : formatValidUntilDisplay(step1.ruta.validUntil) ||
      step1.ruta.validUntil ||
      undefined;

  const expirationDate = step1.sinTarifa
    ? formatPdfDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
    : validUntilDisplay ||
      formatPdfDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  const totalCharges = charges.reduce((s, c) => s + c.amount, 0);

  return buildAirQuotePdfHtml({
    quoteNumber: params.quoteNumber,
    customerName: params.username || "Customer",
    origin: step1.ruta.origin,
    destination: step1.ruta.destination,
    effectiveDate: formatPdfDate(new Date()),
    expirationDate,
    incoterm: step1.incoterm,
    pickupFromAddress:
      step1.incoterm === "EXW" ? step1.pickupAddress : undefined,
    deliveryToAddress:
      step1.incoterm === "EXW" && !step3.ultimaMillaActivo
        ? step1.ruta.destination
        : undefined,
    ultimaMillaDeliveryAddress: step3.ultimaMillaActivo
      ? step3.ultimaMillaDireccion || undefined
      : undefined,
    salesRep: params.salesRepName || "—",
    pieces: overallMode ? step2.overallPieces.length : step2.pieces.length,
    packageTypeName: FIXED_AIR_PACKAGE_TYPE_NAME,
    description: DEFAULT_OVERALL_AIR_DESCRIPTION,
    totalWeight: totals.totalRealWeight,
    totalVolume: totals.totalVolume,
    chargeableWeight: totals.chargeableWeight,
    charges,
    totalCharges,
    currency: freight?.currency || step1.ruta.currency || "USD",
    overallMode,
    piecesData: !overallMode
      ? step2.pieces.map((piece) => ({
          id: piece.id,
          packageTypeName: FIXED_AIR_PACKAGE_TYPE_NAME,
          length: piece.length,
          width: piece.width,
          height: piece.height,
          description: DEFAULT_OVERALL_AIR_DESCRIPTION,
          weight: piece.weight,
          volume: piece.totalVolume,
          volumeWeight: piece.volumeWeight,
        }))
      : undefined,
    overallPiecesData: overallMode
      ? step2.overallPieces.map((piece) => ({
          id: piece.id,
          packageTypeName: FIXED_AIR_PACKAGE_TYPE_NAME,
          description: DEFAULT_OVERALL_AIR_DESCRIPTION,
          weight: piece.weight,
          volume: piece.volume,
          chargeableWeight: Math.max(piece.weight, piece.volumeWeight),
        }))
      : undefined,
    carrier: step1.sinTarifa ? "—" : step1.ruta.carrier || undefined,
    transitTime: step1.sinTarifa ? "—" : step1.ruta.transitTime || undefined,
    frequency: step1.sinTarifa ? "—" : step1.ruta.frequency || undefined,
    routing: step1.sinTarifa ? "—" : step1.ruta.routing || undefined,
    validUntil: validUntilDisplay,
    isPendingQuote: params.pending,
    company: params.pending
      ? undefined
      : capitalize(step1.ruta.company || "") || undefined,
    assignedAirport:
      step1.incoterm === "EXW" ? step1.origin.label : undefined,
    airFreightMinWeight,
    isExpiringSoon:
      !step1.sinTarifa &&
      getValidityClass(step1.ruta.validUntil) === "expiring-soon",
    aduanaBreakdown,
  });
}

async function resolveQuoteNumber(
  username: string,
  accessToken: string | null,
  refreshAccessToken: () => Promise<string>,
  previousMaxId: number,
): Promise<string> {
  const delays = [500, 1000, 1000];
  for (const delay of delays) {
    await new Promise((r) => setTimeout(r, delay));
    try {
      const res = await linbisFetch(
        `https://api.linbis.com/Quotes?ConsigneeName=${encodeURIComponent(username)}`,
        { headers: { Accept: "application/json" } },
        accessToken || "",
        refreshAccessToken,
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) continue;
      const newest = data.reduce(
        (
          max: { id?: number; number?: string },
          q: { id?: number; number?: string },
        ) => ((Number(q.id) || 0) > (Number(max.id) || 0) ? q : max),
        data[0],
      );
      if (Number(newest.id) > previousMaxId && newest.number) {
        return String(newest.number);
      }
    } catch {
      // retry
    }
  }
  return `AIR-${Date.now()}`;
}

async function generateAndUploadPdf(params: {
  quoteNumber: string;
  html: string;
  portalToken: string;
  step1: AirStep1Result;
  username: string;
  subidoPor?: string;
}): Promise<string | null> {
  // Lazy: evita cargar ExpoPrint al arranque (requireNativeModule).
  const Print = await import("expo-print");
  const FileSystem = await import("expo-file-system/legacy");
  const printed = await Print.printToFileAsync({
    html: params.html,
    base64: true,
  });
  const customerClean = params.username.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `${params.quoteNumber}_${customerClean}.pdf`;
  const cacheDir = FileSystem.cacheDirectory;
  const destUri = cacheDir ? `${cacheDir}${filename}` : printed.uri;

  const base64 =
    typeof printed.base64 === "string" && printed.base64.length > 0
      ? printed.base64
      : await FileSystem.readAsStringAsync(printed.uri, {
          encoding: "base64",
        });

  try {
    // Campos de ownership al inicio: si el body se trunca, igual fallará el JSON,
    // pero dejamos usuarioId explícito y claro para staff → cliente.
    const uploadBody = {
      quoteNumber: params.quoteNumber,
      usuarioId: params.username,
      subidoPor: params.subidoPor || params.username,
      nombreArchivo: filename,
      tipoServicio: "AIR" as const,
      origen: params.step1.ruta.origin,
      destino: params.step1.ruta.destination,
      contenidoBase64: base64,
    };
    const uploadRes = await fetch(`${MOBILE_API_BASE}/api/quote-pdf/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.portalToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(uploadBody),
    });
    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => "");
      console.warn(
        `[airQuoteSubmit] PDF upload HTTP ${uploadRes.status}:`,
        errText.slice(0, 400),
      );
    } else {
      console.log(
        `[airQuoteSubmit] PDF subido a Cloudflare para usuarioId=${params.username} quote=${params.quoteNumber}`,
      );
    }
  } catch (e) {
    console.warn("[airQuoteSubmit] PDF upload failed:", e);
  }

  try {
    if (cacheDir && destUri !== printed.uri) {
      await FileSystem.copyAsync({ from: printed.uri, to: destUri });
    }
    return destUri;
  } catch {
    return printed.uri;
  }
}

/** Comparte un PDF ya generado (p. ej. tras "Compartir PDF"). */
export async function shareAirQuotePdf(pdfUri: string): Promise<void> {
  const Sharing = await import("expo-sharing");
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Compartir no está disponible en este dispositivo");
  }
  await Sharing.shareAsync(pdfUri, {
    mimeType: "application/pdf",
    dialogTitle: "Compartir cotización",
    UTI: "com.adobe.pdf",
  });
}

export async function submitAirQuote(
  params: SubmitAirQuoteParams,
): Promise<SubmitAirQuoteResult> {
  const {
    step1,
    step2,
    step3,
    effectiveUsername,
    clientName,
    salesRep,
    salesRepName,
    ejecutivoEmail,
    ejecutivoNombre,
    portalToken,
    accessToken,
    refreshAccessToken,
    profitMarkupPct,
  } = params;

  const { aereo, aduana } = await fetchConfigs(portalToken);
  const vespucioMult = getVespucioExtendedMultiplier(
    aereo.vespucioExtendedSurchargePct,
  );
  const addons = toAddons(step2, step3);
  const base = {
    ruta: step1.ruta,
    incoterm: step1.incoterm,
    sinTarifa: step1.sinTarifa,
    cargo: {
      mode: step2.mode,
      pieces: step2.pieces,
      overallPieces: step2.overallPieces,
    },
    profitMarkupPct,
    noApilableActivo: step2.noApilableActivo,
  };
  const freight = computeAirFreightQuoteValues(base);
  if (!freight && !step1.airConnect) {
    throw new Error("No hay tarifa de air freight para este peso/ruta");
  }

  let previousMaxId = 0;
  try {
    const preRes = await linbisFetch(
      `https://api.linbis.com/Quotes?ConsigneeName=${encodeURIComponent(effectiveUsername)}`,
      { headers: { Accept: "application/json" } },
      accessToken || "",
      refreshAccessToken,
    );
    if (preRes.ok) {
      const preData = await preRes.json();
      if (Array.isArray(preData)) {
        previousMaxId = Math.max(
          0,
          ...preData.map((q: { id?: number }) => Number(q.id) || 0),
        );
      }
    }
  } catch {
    // continue
  }

  let payload: unknown;
  let pdfCharges = freight
    ? buildAirPdfCharges({
        base,
        freight,
        addons,
        aduanaConfig: aduana,
        vespucioExtendedMultiplier: vespucioMult,
        zeroAmounts: step1.sinTarifa,
      })
    : [];

  if (step1.airConnect && params.airConnectOffer) {
    const offer = params.airConnectOffer;
    const airlineLabel = offer.via
      ? `${offer.airline} (${offer.via})`
      : offer.airline;
    pdfCharges = [
      {
        code: "GT",
        description: `GASTOS TOTALES - ${airlineLabel}`,
        quantity: 1,
        unit: "Shipment",
        rate: offer.incomeWithLand,
        amount: offer.incomeWithLand,
      },
    ];

    const extrasBreakdown = calculateAirConnectStep3ExtrasBreakdown({
      transportBaseline: offer.apiWithLand,
      ultimaMillaActivo: addons.ultimaMillaActivo,
      calculateUltimaMilla: () =>
        calculateUltimaMillaAmount({
          activo: addons.ultimaMillaActivo,
          bracket: addons.ultimaMillaBracket,
          zone: addons.ultimaMillaZone,
          extendedMultiplier: vespucioMult,
        }),
      seguroActivo: addons.seguroActivo,
      valorMercaderia: addons.valorMercaderia,
      aduanaActivo: addons.aduanaActivo,
      valorProductoAduana: addons.valorProductoAduana,
      aduanaConfig: aduana,
      gastolocal: addons.gastolocal,
    });

    if (extrasBreakdown.seguro > 0) {
      pdfCharges.push({
        code: "S",
        description: "SEGURO",
        quantity: 1,
        unit: "Shipment",
        rate: extrasBreakdown.seguro,
        amount: extrasBreakdown.seguro,
      });
    }
    if (extrasBreakdown.gastolocal > 0) {
      pdfCharges.push({
        code: "D",
        description: "GASTOS LOCALES (Desconsolidación)",
        quantity: 1,
        unit: "Shipment",
        rate: extrasBreakdown.gastolocal,
        amount: extrasBreakdown.gastolocal,
      });
    }
    if (extrasBreakdown.ultimaMilla > 0) {
      pdfCharges.push({
        code: "TT",
        description: "TRANSPORTE TERRESTRE",
        quantity: 1,
        unit: "Shipment",
        rate: extrasBreakdown.ultimaMilla,
        amount: extrasBreakdown.ultimaMilla,
      });
    }
    if (extrasBreakdown.aduana > 0) {
      pdfCharges.push({
        code: "ADA",
        description: "AGENCIA DE ADUANA",
        quantity: 1,
        unit: "Shipment",
        rate: extrasBreakdown.aduana,
        amount: extrasBreakdown.aduana,
      });
    }
    if (addons.liveTrackingActivo) {
      pdfCharges.push({
        code: "LT",
        description: "LIVE TRACKING (Free)",
        quantity: 1,
        unit: "Shipment",
        rate: 0,
        amount: 0,
      });
    }
  }

  if (step1.airConnect && params.airConnectOffer) {
    const commoditiesPayload = buildAirLinbisPayload({
      ruta: step1.ruta,
      incoterm: step1.incoterm,
      sinTarifa: false,
      effectiveUsername,
      salesRep,
      pickupFromAddress: step1.pickupAddress,
      deliveryToAddress: step1.ruta.destination,
      base,
      freight: freight || {
        expenseRate: 0,
        incomeRate: 0,
        currency: "EUR",
        incomeAmount: 0,
        expenseAmount: 0,
        rango: null,
      },
      addons,
      aduanaConfig: aduana,
      aereoTtConfig: aereo,
      vespucioExtendedMultiplier: vespucioMult,
    });
    payload = buildAirConnectLinbisPayload({
      ruta: step1.ruta,
      offer: params.airConnectOffer,
      step3Extra: params.airConnectStep3Extra || 0,
      incoterm: step1.incoterm,
      effectiveUsername,
      salesRep,
      commodities: commoditiesPayload.commodities,
    });
  } else {
    if (!freight) throw new Error("Sin tarifa de flete");
    payload = buildAirLinbisPayload({
      ruta: step1.ruta,
      incoterm: step1.incoterm,
      sinTarifa: step1.sinTarifa,
      effectiveUsername,
      salesRep,
      pickupFromAddress: step1.pickupAddress,
      deliveryToAddress: step1.ruta.destination,
      base,
      freight,
      addons,
      aduanaConfig: aduana,
      aereoTtConfig: aereo,
      vespucioExtendedMultiplier: vespucioMult,
    });
  }

  const res = await linbisFetch(
    "https://api.linbis.com/Quotes/create",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    accessToken || "",
    refreshAccessToken,
  );

  if (!res.ok) {
    throw new Error(`Linbis HTTP ${res.status}: ${await res.text()}`);
  }

  const quoteNumber = await resolveQuoteNumber(
    effectiveUsername,
    accessToken,
    refreshAccessToken,
    previousMaxId,
  );

  const html = buildPdfHtmlFromQuote({
    quoteNumber,
    step1,
    step2,
    step3,
    username: effectiveUsername,
    salesRepName:
      salesRepName ||
      ("name" in salesRep ? salesRep.name : "") ||
      "—",
    charges: pdfCharges,
    freight,
    aduana,
    pending: step1.sinTarifa,
    profitMarkupPct,
  });

  const pdfUri = await generateAndUploadPdf({
    quoteNumber,
    html,
    portalToken,
    step1,
    username: effectiveUsername,
    subidoPor: ejecutivoEmail || effectiveUsername,
  });

  // Correos después del upload para que Brevo pueda adjuntar el PDF de R2.
  if (step1.sinTarifa) {
    try {
      const emailRes = await fetch(
        `${MOBILE_API_BASE}/api/send-no-rate-quote-email`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${portalToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            quoteType: "AIR",
            quoteNumber,
            cargoDetails: {
              origen: step1.ruta.origin,
              destino: step1.ruta.destination,
              carrier: step1.ruta.carrier || "",
              incoterm: step1.incoterm,
            },
            clienteUsername: effectiveUsername,
            clienteNombre: clientName || effectiveUsername,
            ejecutivoEmail,
            ejecutivoNombre,
          }),
        },
      );
      if (!emailRes.ok) {
        console.warn(
          "[airQuoteSubmit] no-rate email HTTP",
          emailRes.status,
          await emailRes.text().catch(() => ""),
        );
      }
    } catch (e) {
      console.warn("[airQuoteSubmit] no-rate email:", e);
    }
  } else {
    const totalCharges = pdfCharges.reduce((s, c) => s + c.amount, 0);
    const currency = freight?.currency || step1.ruta.currency || "USD";
    try {
      const emailRes = await fetch(
        `${MOBILE_API_BASE}/api/send-operation-email`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${portalToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ejecutivoEmail,
            ejecutivoNombre,
            clienteUsername: effectiveUsername,
            clienteNombre: clientName || effectiveUsername,
            tipoServicio: "Aéreo",
            origen: step1.ruta.origin,
            destino: step1.ruta.destination,
            carrier: step1.ruta.carrier || "",
            description: "Cargamento Aéreo",
            chargeableWeight: step2.chargeableWeight,
            incoterm: step1.incoterm,
            pickupFromAddress:
              step1.incoterm === "EXW" ? step1.pickupAddress : undefined,
            deliveryToAddress:
              step1.incoterm === "EXW" ? step1.ruta.destination : undefined,
            ...(step3.ultimaMillaActivo
              ? {
                  ultimaMilla: true,
                  ultimaMillaDireccion: step3.ultimaMillaDireccion,
                  ultimaMillaMonto: `${currency} ${calculateUltimaMillaAmount(
                    {
                      activo: true,
                      bracket: step3.ultimaMillaBracket,
                      zone: step3.ultimaMillaZone,
                      extendedMultiplier: vespucioMult,
                    },
                  ).toFixed(2)}`,
                  ultimaMillaZonaExtendida:
                    step3.ultimaMillaZone === "extended",
                }
              : {}),
            currency,
            total: `${currency} ${totalCharges.toFixed(2)}`,
            tipoAccion: "cotizacion",
            agente: step1.ruta.company || undefined,
            quoteNumber,
          }),
        },
      );
      if (!emailRes.ok) {
        console.warn(
          "[airQuoteSubmit] operation email HTTP",
          emailRes.status,
          await emailRes.text().catch(() => ""),
        );
      }
    } catch (e) {
      console.warn("[airQuoteSubmit] operation email:", e);
    }
  }

  return { quoteNumber, pdfUri };
}

export async function fetchMobileAirConnectOffers(params: {
  step1: AirStep1Result;
  step2: AirStep2Result;
  portalToken: string;
  contactCompanyName: string;
}): Promise<AirConnectPricedOffer[]> {
  const cargoInput = {
    overallDimsAndWeight: params.step2.mode === "overall",
    manualWeight: params.step2.totalRealWeight,
    manualVolume:
      params.step2.mode === "overall"
        ? params.step2.overallPieces.reduce((s, p) => s + p.volume, 0)
        : params.step2.pieces.reduce((s, p) => s + p.totalVolume, 0),
    pieces: params.step2.pieces,
  };

  const input =
    params.step1.incoterm === "EXW"
      ? buildAirConnectExwCalculateInput({
          postalCode: params.step1.spainPostalCode || "",
          contactCompanyName: params.contactCompanyName,
          ...cargoInput,
        })
      : buildAirConnectFcaCalculateInput({
          airportOrigin: params.step1.origin.value,
          contactCompanyName: params.contactCompanyName,
          ...cargoInput,
        });

  const response = await fetch(
    `${MOBILE_API_BASE}/api/air-connect-spain/quotation/calculate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.portalToken}`,
      },
      body: JSON.stringify(input),
    },
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      (body && typeof body.error === "string" && body.error) ||
        `Error AirConnect (${response.status})`,
    );
  }
  if (!body || !Array.isArray(body.airFreight)) {
    throw new Error("Respuesta inválida de AirConnect");
  }

  const markup = getAirConnectProfitMarkupPct(
    DEFAULT_AIR_CONNECT_SPAIN_CONFIG,
    params.step1.incoterm,
  );

  return buildAirConnectPricedOffers(
    body,
    params.step2.chargeableWeight,
    markup,
  );
}

export function computeAirConnectStep3Extra(params: {
  offer: AirConnectPricedOffer;
  step3: AirStep3Result;
  aduanaConfig: IAgenciaAduanaConfig;
  vespucioMult: number;
}): number {
  return calculateAirConnectStep3Extras({
    transportBaseline: params.offer.apiWithLand,
    ultimaMillaActivo: params.step3.ultimaMillaActivo,
    calculateUltimaMilla: () =>
      calculateUltimaMillaAmount({
        activo: params.step3.ultimaMillaActivo,
        bracket: params.step3.ultimaMillaBracket,
        zone: params.step3.ultimaMillaZone,
        extendedMultiplier: params.vespucioMult,
      }),
    seguroActivo: params.step3.seguroActivo,
    valorMercaderia: params.step3.valorMercaderia,
    aduanaActivo: params.step3.aduanaActivo,
    valorProductoAduana: params.step3.valorProductoAduana,
    aduanaConfig: params.aduanaConfig,
    gastolocal: params.step3.gastolocal,
  });
}
