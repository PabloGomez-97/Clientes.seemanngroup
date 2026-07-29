import type { RutaAerea } from "../components/quotes/Handlers/Air/HandlerQuoteAir";
import {
  airConnectProfitMultiplier,
  DEFAULT_AIR_CONNECT_SPAIN_CONFIG,
} from "../types/airConnectSpainConfig";

export interface AirConnectCalculateParcel {
  qty: number;
  width: number;
  height: number;
  length: number;
  weight: number;
  nonStackable: boolean;
}

export interface AirConnectFcaCalculateInput {
  airportOrigin: string;
  airportDest: string;
  parcelsInput: {
    incoterm: "FCA";
    awbType: "CONSOLIDATED";
    parcelsOrigin: "AIRPORT";
    parcels: AirConnectCalculateParcel[];
  };
  contactCompanyName?: string;
}

export interface AirConnectExwCalculateInput {
  postalCode: string;
  airportDest: string;
  parcelsInput: {
    incoterm: "EXW";
    parcels: AirConnectCalculateParcel[];
  };
  contactCompanyName?: string;
}

export type AirConnectCalculateQuotationInput =
  | AirConnectFcaCalculateInput
  | AirConnectExwCalculateInput;

export const SPAIN_COUNTRY_CODE = "ES";
export const SANTIAGO_IATA = "SCL";

export const SPAIN_COUNTRY_OPTION = {
  value: SPAIN_COUNTRY_CODE,
  label: "España",
} as const;

export const SANTIAGO_DESTINATION_OPTION = {
  value: SANTIAGO_IATA,
  label: "Aeropuerto Internacional Arturo Merino Benítez",
} as const;

export const SPAIN_AIRCONNECT_ORIGINS = [
  { value: "BCN", label: "Barcelona" },
  { value: "VLC", label: "Valencia" },
  { value: "MAD", label: "Madrid" },
  { value: "BIO", label: "Bilbao" },
] as const;

export const AIR_CONNECT_CURRENCY = "EUR";

export const AIR_CONNECT_EXW_POSTAL_ERROR =
  "El código postal ingresado no es válido o no está disponible. Verifícalo e inténtalo de nuevo.";

export const LINBIS_GASTOS_TOTALES_SERVICE = {
  id: 140869,
  code: "GT",
  description: "GASTOS TOTALES",
} as const;

export interface AirConnectAirFreightOffer {
  airline: string;
  via: string | null;
  freight: string;
  rate: number;
  fuel?: number;
  fuelApplicable?: string;
  fees?: number;
  validity?: string;
  price: number;
  fuelSurcharge?: number;
  fuelIncluded?: number | null;
  total: number;
  risk?: number;
  riskApplicable?: string;
}

export interface AirConnectQuotationResponse {
  quotationId?: string;
  postalCode?: string;
  origin: string;
  destination: string;
  cityName?: string;
  totalLand?: number;
  FCA?: number;
  PNS?: number;
  THC?: number;
  airportTransfer?: number;
  airFreight: AirConnectAirFreightOffer[];
  totalAmount: { airline: string; total: number }[];
  parcelsData?: {
    airChargeableWeight?: number;
    grossWeight?: number;
    volume?: number;
    landChargeableWeight?: number;
  };
}

export type AirConnectCargoInput = {
  overallDimsAndWeight: boolean;
  manualWeight: number;
  manualVolume: number;
  pieces: {
    weight: number;
    totalVolume: number;
    volume: number;
    noApilable: boolean;
  }[];
};

/** Volumen (m³) → lado de cubo equivalente en cm para la API */
export function volumeM3ToCubeSidesCm(volumeM3: number): {
  length: number;
  width: number;
  height: number;
} {
  if (volumeM3 <= 0) {
    return { length: 0, width: 0, height: 0 };
  }
  const sideCm = Math.cbrt(volumeM3) * 100;
  const side = Math.max(1, Math.round(sideCm * 10) / 10);
  return { length: side, width: side, height: side };
}

export function buildAirConnectParcels(params: {
  overallDimsAndWeight: boolean;
  manualWeight: number;
  manualVolume: number;
  pieces: {
    weight: number;
    totalVolume: number;
    volume: number;
    noApilable: boolean;
  }[];
}): AirConnectCalculateParcel[] {
  let grossWeight = 0;
  let volumeM3 = 0;
  let nonStackable = false;

  if (params.overallDimsAndWeight) {
    grossWeight = params.manualWeight;
    volumeM3 = params.manualVolume;
  } else {
    grossWeight = params.pieces.reduce((sum, p) => sum + (p.weight || 0), 0);
    volumeM3 = params.pieces.reduce(
      (sum, p) => sum + (p.totalVolume || p.volume || 0),
      0,
    );
    nonStackable = params.pieces.some((p) => p.noApilable);
  }

  let length: number;
  let width: number;
  let height: number;
  if (volumeM3 > 0) {
    ({ length, width, height } = volumeM3ToCubeSidesCm(volumeM3));
  } else if (grossWeight > 0) {
    // Peso sin volumen declarado: cubo mínimo para que la API acepte el bulto
    length = 10;
    width = 10;
    height = 10;
  } else {
    ({ length, width, height } = { length: 0, width: 0, height: 0 });
  }

  return [
    {
      qty: 1,
      length,
      width,
      height,
      weight: grossWeight,
      nonStackable,
    },
  ];
}

export function buildAirConnectFcaCalculateInput(params: {
  airportOrigin: string;
  contactCompanyName: string;
} & AirConnectCargoInput): AirConnectFcaCalculateInput {
  return {
    airportOrigin: params.airportOrigin,
    airportDest: SANTIAGO_IATA,
    parcelsInput: {
      incoterm: "FCA",
      awbType: "CONSOLIDATED",
      parcelsOrigin: "AIRPORT",
      parcels: buildAirConnectParcels(params),
    },
    contactCompanyName: params.contactCompanyName,
  };
}

export function buildAirConnectExwCalculateInput(params: {
  postalCode: string;
  contactCompanyName: string;
} & AirConnectCargoInput): AirConnectExwCalculateInput {
  return {
    postalCode: params.postalCode.trim(),
    airportDest: SANTIAGO_IATA,
    parcelsInput: {
      incoterm: "EXW",
      parcels: buildAirConnectParcels(params),
    },
    contactCompanyName: params.contactCompanyName,
  };
}

/** @deprecated Usar buildAirConnectFcaCalculateInput */
export const buildAirConnectCalculateInput = buildAirConnectFcaCalculateInput;

export interface AirConnectPricedOffer extends AirConnectAirFreightOffer {
  key: string;
  /** Total de cotización API (sin profit). Base para seguro/aduana. */
  apiWithLand: number;
  /** Precio de venta = Total de cotización × (1 + profit%). */
  incomeWithLand: number;
  /**
   * @deprecated Campos de desglose AirConnect; el PDF/cliente solo usa el total.
   * Se mantienen en 0 para no exponer costos internos.
   */
  incomeRate: number;
  incomeFreight: number;
  fuelAmount: number;
  feesAmount: number;
  incomeAirTotal: number;
  landAmount: number;
}

export function getAirConnectOfferKey(
  offer: AirConnectAirFreightOffer,
  index: number,
): string {
  return `${offer.airline.trim()}-${offer.via ?? "direct"}-${index}`;
}

function roundAirConnectMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function matchAirConnectTotalAmount(
  offer: AirConnectAirFreightOffer,
  totals: AirConnectQuotationResponse["totalAmount"],
): number | null {
  if (!Array.isArray(totals) || totals.length === 0) return null;

  const airline = offer.airline.trim().toLowerCase();
  const via = offer.via?.trim().toLowerCase() || null;
  const expected = via ? `${airline} (via ${via})` : airline;

  const exact = totals.find(
    (t) => t.airline.trim().toLowerCase() === expected,
  );
  if (exact != null) return exact.total;

  if (via) {
    const withVia = totals.find((t) => {
      const name = t.airline.trim().toLowerCase();
      return name.startsWith(airline) && name.includes("via") && name.includes(via);
    });
    if (withVia != null) return withVia.total;
  } else {
    const direct = totals.find((t) => {
      const name = t.airline.trim().toLowerCase();
      return name === airline || (name.startsWith(airline) && !name.includes("via"));
    });
    if (direct != null) return direct.total;
  }

  return null;
}

/** Total oficial de cotización 3lg; fallback offer.total + totalLand. */
export function resolveAirConnectQuotationTotal(
  offer: AirConnectAirFreightOffer,
  quote: Pick<AirConnectQuotationResponse, "totalAmount" | "totalLand">,
): number {
  const matched = matchAirConnectTotalAmount(offer, quote.totalAmount ?? []);
  if (matched != null && Number.isFinite(matched) && matched > 0) {
    return matched;
  }
  const totalLand = quote.totalLand ?? 0;
  const airTotal =
    typeof offer.total === "number" && Number.isFinite(offer.total)
      ? offer.total
      : (offer.price ?? 0) + (offer.fuelSurcharge ?? 0) + (offer.fees ?? 0);
  return airTotal + totalLand;
}

export function priceAirConnectOffer(
  offer: AirConnectAirFreightOffer,
  quotationTotal: number,
  profitMarkupPct = DEFAULT_AIR_CONNECT_SPAIN_CONFIG.profitMarkupPctFca,
): Omit<AirConnectPricedOffer, "key"> {
  const apiWithLand = roundAirConnectMoney(quotationTotal);
  const markup = airConnectProfitMultiplier(profitMarkupPct);
  const incomeWithLand = roundAirConnectMoney(apiWithLand * markup);

  return {
    ...offer,
    apiWithLand,
    incomeWithLand,
    // Sin desglose de AirConnect hacia cliente/ejecutivo
    incomeRate: 0,
    incomeFreight: incomeWithLand,
    fuelAmount: 0,
    feesAmount: 0,
    incomeAirTotal: incomeWithLand,
    landAmount: 0,
  };
}

export function buildAirConnectPricedOffers(
  quote: AirConnectQuotationResponse,
  _fallbackChargeableWeight = 0,
  profitMarkupPct = DEFAULT_AIR_CONNECT_SPAIN_CONFIG.profitMarkupPctFca,
): AirConnectPricedOffer[] {
  return quote.airFreight.map((offer, index) => {
    const quotationTotal = resolveAirConnectQuotationTotal(offer, quote);
    return {
      key: getAirConnectOfferKey(offer, index),
      ...priceAirConnectOffer(offer, quotationTotal, profitMarkupPct),
    };
  });
}

export function resolveAirConnectOriginLabel(
  quote: Pick<AirConnectQuotationResponse, "origin" | "cityName" | "postalCode">,
): { value: string; label: string } {
  const iata = quote.origin?.trim() || "";
  const city = quote.cityName?.trim();
  const postal = quote.postalCode?.trim();
  if (city && iata) {
    return { value: iata, label: `${city} (${iata})` };
  }
  if (postal) {
    return { value: iata || postal, label: `CP ${postal}${iata ? ` → ${iata}` : ""}` };
  }
  return { value: iata, label: iata || "España" };
}

export function createAirConnectMockRuta(
  origin: { value: string; label: string },
): RutaAerea {
  return {
    id: "AIR-CONNECT-ES-SCL",
    origin: origin.label,
    originNormalized: origin.value,
    destination: SANTIAGO_DESTINATION_OPTION.label,
    destinationNormalized: SANTIAGO_IATA,
    kg45: null,
    kg100: null,
    kg300: null,
    kg500: null,
    kg1000: null,
    carrier: "AirConnect",
    carrierNormalized: "airconnect",
    frequency: null,
    transitTime: null,
    routing: null,
    remark1: null,
    remark2: null,
    validUntil: "",
    localCharges: 0,
    gastosXKg: 0,
    minGastosXKg: 0,
    minAirFreight: 0,
    row_number: 0,
    priceForComparison: 0,
    currency: AIR_CONNECT_CURRENCY,
    company: null,
  };
}

export function createAirConnectMockRutaFromPostal(postalCode: string): RutaAerea {
  const trimmed = postalCode.trim();
  return createAirConnectMockRuta({
    value: trimmed,
    label: `CP ${trimmed} (España)`,
  });
}

export function mapAirConnectQuoteToRuta(
  quote: AirConnectQuotationResponse,
): RutaAerea {
  const origin = resolveAirConnectOriginLabel(quote);
  return createAirConnectMockRuta(origin);
}

function isAirConnectNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    err.name === "TypeError" ||
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("load failed")
  );
}

export function formatAirConnectFetchError(
  err: unknown,
  incoterm: "FCA" | "EXW",
): string {
  const message =
    err instanceof Error
      ? err.message
      : "No se pudo obtener tarifas de AirConnect";

  // Errores de configuración/auth no son "código postal inválido"
  const lower = message.toLowerCase();
  if (
    lower.includes("api_key_3lg") ||
    lower.includes("falta api_key") ||
    lower.includes("sesión no válida") ||
    lower.includes("401") ||
    lower.includes("500")
  ) {
    return message;
  }

  if (incoterm === "EXW") {
    // Solo enmascarar fallos de cotización EXW (CP fuera de cobertura / API 4xx)
    return AIR_CONNECT_EXW_POSTAL_ERROR;
  }
  if (isAirConnectNetworkError(err)) {
    return "No se pudo conectar con el servicio de tarifas. Inténtalo de nuevo en unos momentos.";
  }
  return message;
}

export async function fetchAirConnectQuotation(
  input: AirConnectCalculateQuotationInput,
  authToken?: string | null,
): Promise<AirConnectQuotationResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch("/api/air-connect-spain/quotation/calculate", {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });

  const body = (await response.json().catch(() => null)) as
    | AirConnectQuotationResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        "Sesión no válida. Cierra sesión, vuelve a entrar e inténtalo de nuevo.",
      );
    }
    const message =
      (body && "error" in body && typeof body.error === "string"
        ? body.error
        : null) || `Error AirConnect (${response.status})`;
    throw new Error(message);
  }

  if (!body || !Array.isArray((body as AirConnectQuotationResponse).airFreight)) {
    throw new Error("Respuesta inválida de AirConnect");
  }

  return body as AirConnectQuotationResponse;
}
