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

export interface AirConnectCalculateQuotationInput {
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

const DEFAULT_AIR_CONNECT_BASE_URL =
  "https://57aaug0p0i.execute-api.eu-west-1.amazonaws.com/dev";

export const AIR_CONNECT_CURRENCY = "EUR";

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
  origin: string;
  destination: string;
  totalLand?: number;
  FCA?: number;
  PNS?: number;
  THC?: number;
  airFreight: AirConnectAirFreightOffer[];
  totalAmount: { airline: string; total: number }[];
  parcelsData?: {
    airChargeableWeight?: number;
    grossWeight?: number;
    volume?: number;
  };
}

export function isAirConnectSpainSclFlow(params: {
  routeMode: "recurrente" | "noRecurrente" | null;
  paisValue?: string;
  destValue?: string;
  incoterm: string;
  isSimulationMode: boolean;
}): boolean {
  return (
    !params.isSimulationMode &&
    params.routeMode === "recurrente" &&
    params.paisValue === SPAIN_COUNTRY_CODE &&
    params.destValue === SANTIAGO_IATA &&
    params.incoterm === "FCA"
  );
}

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

  const { length, width, height } = volumeM3ToCubeSidesCm(volumeM3);

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

export function buildAirConnectCalculateInput(params: {
  airportOrigin: string;
  contactCompanyName: string;
  overallDimsAndWeight: boolean;
  manualWeight: number;
  manualVolume: number;
  pieces: {
    weight: number;
    totalVolume: number;
    volume: number;
    noApilable: boolean;
  }[];
}): AirConnectCalculateQuotationInput {
  return {
    airportOrigin: params.airportOrigin,
    airportDest: SANTIAGO_IATA,
    parcelsInput: {
      incoterm: "FCA",
      awbType: "CONSOLIDATED",
      parcelsOrigin: "AIRPORT",
      parcels: buildAirConnectParcels({
        overallDimsAndWeight: params.overallDimsAndWeight,
        manualWeight: params.manualWeight,
        manualVolume: params.manualVolume,
        pieces: params.pieces,
      }),
    },
    contactCompanyName: params.contactCompanyName,
  };
}

export interface AirConnectPricedOffer extends AirConnectAirFreightOffer {
  key: string;
  /** Valores API sin margen (base para servicios adicionales) */
  apiWithLand: number;
  incomeRate: number;
  incomeFreight: number;
  fuelAmount: number;
  feesAmount: number;
  incomeAirTotal: number;
  landAmount: number;
  incomeWithLand: number;
}

export function getAirConnectOfferKey(
  offer: AirConnectAirFreightOffer,
  index: number,
): string {
  return `${offer.airline.trim()}-${offer.via ?? "direct"}-${index}`;
}

export function priceAirConnectOffer(
  offer: AirConnectAirFreightOffer,
  chargeableWeight: number,
  totalLand: number,
  profitMarkupPct = DEFAULT_AIR_CONNECT_SPAIN_CONFIG.profitMarkupPct,
): Omit<AirConnectPricedOffer, "key"> {
  const apiFreight = chargeableWeight * offer.rate;
  const apiFuel = offer.fuelSurcharge ?? 0;
  const apiFees = offer.fees ?? 0;
  const apiAirTotal = apiFreight + apiFuel + apiFees;
  const apiWithLand = apiAirTotal + totalLand;

  const markup = airConnectProfitMultiplier(profitMarkupPct);
  const incomeRate = offer.rate * markup;
  const incomeFreight = chargeableWeight * incomeRate;
  const fuelAmount = apiFuel * markup;
  const feesAmount = apiFees * markup;
  const landAmount = totalLand * markup;
  const incomeAirTotal = incomeFreight + fuelAmount + feesAmount;

  return {
    ...offer,
    apiWithLand,
    incomeRate,
    incomeFreight,
    fuelAmount,
    feesAmount,
    incomeAirTotal,
    landAmount,
    incomeWithLand: incomeAirTotal + landAmount,
  };
}

export function buildAirConnectPricedOffers(
  quote: AirConnectQuotationResponse,
  fallbackChargeableWeight = 0,
  profitMarkupPct = DEFAULT_AIR_CONNECT_SPAIN_CONFIG.profitMarkupPct,
): AirConnectPricedOffer[] {
  const chargeableWeight =
    quote.parcelsData?.airChargeableWeight ?? fallbackChargeableWeight;
  const totalLand = quote.totalLand ?? 0;

  return quote.airFreight.map((offer, index) => ({
    key: getAirConnectOfferKey(offer, index),
    ...priceAirConnectOffer(offer, chargeableWeight, totalLand, profitMarkupPct),
  }));
}

export function matchAirConnectTotalAmount(
  offer: AirConnectAirFreightOffer,
  totals: AirConnectQuotationResponse["totalAmount"],
): number | null {
  const viaSuffix = offer.via ? ` (via ${offer.via})` : "";
  const expected = `${offer.airline}${viaSuffix}`.trim().toLowerCase();
  const row = totals.find((t) => t.airline.trim().toLowerCase() === expected);
  if (row) return row.total;
  const loose = totals.find((t) =>
    t.airline.toLowerCase().includes(offer.airline.trim().toLowerCase()),
  );
  return loose?.total ?? null;
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

export async function fetchAirConnectQuotation(
  input: AirConnectCalculateQuotationInput,
): Promise<AirConnectQuotationResponse> {
  const apiKey = import.meta.env.VITE_API_KEY_3LG;
  const baseUrl =
    import.meta.env.VITE_AIR_CONNECT_BASE_URL || DEFAULT_AIR_CONNECT_BASE_URL;

  if (!apiKey) {
    throw new Error(
      "Falta VITE_API_KEY_3LG en el entorno. Agrega la clave de AirConnect al archivo .env.",
    );
  }

  const url = `${baseUrl.replace(/\/+$/, "")}/api/quotations/calculate`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
    },
    body: JSON.stringify(input),
  });

  const body = (await response.json().catch(() => null)) as
    | AirConnectQuotationResponse
    | { error?: string }
    | null;

  if (!response.ok) {
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
