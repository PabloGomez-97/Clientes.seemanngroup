import { MOBILE_API_BASE } from "../../src/auth/authApi";
import { linbisFetch } from "../../src/services/linbisFetch";
import {
  buildAirConnectLinbisPayload,
  buildAirLinbisPayload,
  type SalesRepPayload,
} from "../../src/components/quotes/Handlers/Air/airQuoteLinbisPayload";
import {
  buildAirPdfCharges,
  calculateUltimaMillaAmount,
  computeAirFreightQuoteValues,
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
import { calculateAirConnectStep3Extras } from "../../src/components/quotes/AirConnectSpain/step3Extras";
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
  salesRep: SalesRepPayload;
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

function buildPdfHtml(params: {
  quoteNumber: string;
  step1: AirStep1Result;
  username: string;
  charges: ReturnType<typeof buildAirPdfCharges>;
  pending: boolean;
}): string {
  const rows = params.charges
    .map(
      (c) =>
        `<tr><td>${c.code}</td><td>${c.description}</td><td>${c.quantity}</td><td>${c.unit}</td><td>${c.rate.toFixed(2)}</td><td>${c.amount.toFixed(2)}</td></tr>`,
    )
    .join("");
  const total = params.charges.reduce((s, c) => s + c.amount, 0);
  const currency = params.step1.ruta.currency || "USD";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <style>
    body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#0f172a;padding:24px}
    h1{font-size:20px;margin:0 0 4px} h2{font-size:14px;color:#475569;font-weight:500;margin:0 0 16px}
    .badge{display:inline-block;background:#0b1f3a;color:#fff;padding:4px 8px;border-radius:6px;font-size:12px;margin-bottom:12px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{border-bottom:1px solid #e2e8f0;padding:8px;text-align:left}
    th{background:#f8fafc} .total{font-weight:700;font-size:14px;margin-top:12px}
    .pending{background:#fef3c7;padding:10px;border-radius:8px;margin-bottom:12px;font-size:12px}
  </style></head><body>
  <div class="badge">Seemann Group · Cotización Aérea</div>
  <h1>${params.quoteNumber || "Cotización"}</h1>
  <h2>${params.step1.ruta.origin} → ${params.step1.ruta.destination} · ${params.step1.incoterm} · ${params.username}</h2>
  ${params.pending ? `<div class="pending">Cotización pendiente de tarifa — montos referenciales en $0 hasta confirmación del ejecutivo.</div>` : ""}
  <table><thead><tr><th>Código</th><th>Descripción</th><th>Cant.</th><th>Unidad</th><th>Tarifa</th><th>Monto</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <div class="total">Total: ${currency} ${total.toFixed(2)}</div>
  <p style="font-size:11px;color:#64748b;margin-top:24px">Generado desde Portal Clientes Seemann Group (App móvil)</p>
  </body></html>`;
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

async function uploadAndSharePdf(params: {
  quoteNumber: string;
  html: string;
  portalToken: string;
  step1: AirStep1Result;
  username: string;
}): Promise<string | null> {
  // Lazy: evita cargar ExpoPrint / Sharing al arranque (requireNativeModule).
  const Print = await import("expo-print");
  const Sharing = await import("expo-sharing");
  const FileSystem = await import("expo-file-system/legacy");
  const printed = await Print.printToFileAsync({ html: params.html });
  const filename = `Cotizacion_AIR_${params.quoteNumber}.pdf`;
  const cacheDir = FileSystem.cacheDirectory;
  const destUri = cacheDir
    ? `${cacheDir}${filename}`
    : printed.uri;

  try {
    const base64 = await FileSystem.readAsStringAsync(printed.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await fetch(`${MOBILE_API_BASE}/api/quote-pdf/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.portalToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        quoteNumber: params.quoteNumber,
        nombreArchivo: filename,
        contenidoBase64: base64,
        tipoServicio: "AIR",
        origen: params.step1.ruta.origin,
        destino: params.step1.ruta.destination,
        usuarioId: params.username,
        subidoPor: params.username,
      }),
    });
  } catch (e) {
    console.warn("[airQuoteSubmit] PDF upload failed:", e);
  }

  try {
    if (cacheDir && destUri !== printed.uri) {
      await FileSystem.copyAsync({ from: printed.uri, to: destUri });
    }
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(destUri, {
        mimeType: "application/pdf",
        dialogTitle: "Compartir cotización",
        UTI: "com.adobe.pdf",
      });
    }
    return destUri;
  } catch {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(printed.uri, {
        mimeType: "application/pdf",
        dialogTitle: "Compartir cotización",
      });
    }
    return printed.uri;
  }
}

export async function submitAirQuote(
  params: SubmitAirQuoteParams,
): Promise<SubmitAirQuoteResult> {
  const {
    step1,
    step2,
    step3,
    effectiveUsername,
    salesRep,
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
        code: "AF",
        description: `AIR FREIGHT - ${airlineLabel}`,
        quantity: step2.chargeableWeight || 1,
        unit: "kg",
        rate: offer.incomeRate,
        amount: offer.incomeFreight,
      },
    ];
    if (offer.fuelAmount > 0) {
      pdfCharges.push({
        code: "FS",
        description: "FUEL SURCHARGE",
        quantity: 1,
        unit: "Shipment",
        rate: offer.fuelAmount,
        amount: offer.fuelAmount,
      });
    }
    if (offer.feesAmount > 0) {
      pdfCharges.push({
        code: "CF",
        description: "CARRIER FEES",
        quantity: 1,
        unit: "Shipment",
        rate: offer.feesAmount,
        amount: offer.feesAmount,
      });
    }
    if (offer.landAmount > 0) {
      pdfCharges.push({
        code: "LC",
        description: "LAND CHARGES (FCA/PNS/THC)",
        quantity: 1,
        unit: "Shipment",
        rate: offer.landAmount,
        amount: offer.landAmount,
      });
    }
    const extra = params.airConnectStep3Extra || 0;
    if (extra > 0) {
      pdfCharges.push({
        code: "XT",
        description: "SERVICIOS ADICIONALES",
        quantity: 1,
        unit: "Shipment",
        rate: extra,
        amount: extra,
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

  if (step1.sinTarifa) {
    try {
      await fetch(`${MOBILE_API_BASE}/api/send-no-rate-quote-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${portalToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quoteNumber,
          origen: step1.ruta.origin,
          destino: step1.ruta.destination,
          carrier: step1.ruta.carrier || "",
          incoterm: step1.incoterm,
          clienteNombre: effectiveUsername,
          tipoServicio: "AIR",
        }),
      });
    } catch (e) {
      console.warn("[airQuoteSubmit] no-rate email:", e);
    }
  }

  const html = buildPdfHtml({
    quoteNumber,
    step1,
    username: effectiveUsername,
    charges: pdfCharges,
    pending: step1.sinTarifa,
  });

  const pdfUri = await uploadAndSharePdf({
    quoteNumber,
    html,
    portalToken,
    step1,
    username: effectiveUsername,
  });

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
