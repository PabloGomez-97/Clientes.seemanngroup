/**
 * Lógica pura del Paso 1 del cotizador aéreo.
 * Compartida entre web (QuoteAIR) y mobile — sin DOM.
 */
import {
  GOOGLE_SHEET_CSV_URL,
  capitalize,
  extractPrice,
  normalize,
  parseAEREO,
  parseCSV,
  type RutaAerea,
} from "./HandlerQuoteAir";
import { getValidityClass, parseValidUntilToISO } from "../handlerFechas";
import {
  getAirportByOrigin,
  getOriginCountryCode,
} from "../../../../config/airportCoordinates";

/** Tipo de operación comercial aéreo (export / import). */
export type AirTradeType = "exportacion" | "importacion";

const CHILE_COUNTRY_CODE = "CL";
const CHILE_IATA_CODES = new Set(["SCL"]);

function looksLikeChileLabel(value: string | null | undefined): boolean {
  if (!value) return false;
  const n = normalize(value);
  return (
    n === "chile" ||
    n.includes("chile") ||
    n.includes("santiago_de_chile") ||
    n.includes("merino_benitez") ||
    n.includes("arturo_merino")
  );
}

/** País de origen Chile: código ISO `CL` o label "Chile". */
export function isChileOriginCountry(params: {
  countryCode?: string | null;
  countryLabel?: string | null;
}): boolean {
  const code = params.countryCode?.trim().toUpperCase();
  if (code === CHILE_COUNTRY_CODE) return true;
  return looksLikeChileLabel(params.countryLabel);
}

/**
 * Destino en Chile: prioriza countryCode del catálogo de aeropuertos,
 * luego IATA conocidos (SCL), y por último label/normalized.
 */
export function isChileAirportDestination(params: {
  destinationNormalized?: string | null;
  destinationLabel?: string | null;
}): boolean {
  const normalized = params.destinationNormalized?.trim() ?? "";
  if (normalized) {
    // AirConnect y selectores que guardan IATA (ej. "SCL") en el value
    if (CHILE_IATA_CODES.has(normalized.toUpperCase())) {
      return true;
    }

    const airport = getAirportByOrigin(normalized);
    if (airport?.countryCode?.toUpperCase() === CHILE_COUNTRY_CODE) {
      return true;
    }
    if (getOriginCountryCode(normalized) === CHILE_COUNTRY_CODE) {
      return true;
    }
    if (airport?.iata && CHILE_IATA_CODES.has(airport.iata.toUpperCase())) {
      return true;
    }
  }

  return (
    looksLikeChileLabel(params.destinationNormalized) ||
    looksLikeChileLabel(params.destinationLabel)
  );
}

/**
 * Resuelve Exportación / Importación del cotizador aéreo.
 * - Destino Chile → Importación (incluye el caso borde origen Chile + destino Chile)
 * - Origen Chile (sin destino Chile) → Exportación
 * - Cualquier otro caso → Exportación (default)
 * - Sin destino → null (aún no se muestra en UI)
 */
export function resolveAirTradeType(params: {
  originCountryCode?: string | null;
  originCountryLabel?: string | null;
  destinationNormalized?: string | null;
  destinationLabel?: string | null;
}): AirTradeType | null {
  const hasDestination = Boolean(
    params.destinationNormalized?.trim() || params.destinationLabel?.trim(),
  );
  if (!hasDestination) return null;

  if (
    isChileAirportDestination({
      destinationNormalized: params.destinationNormalized,
      destinationLabel: params.destinationLabel,
    })
  ) {
    return "importacion";
  }

  if (
    isChileOriginCountry({
      countryCode: params.originCountryCode,
      countryLabel: params.originCountryLabel,
    })
  ) {
    return "exportacion";
  }

  return "exportacion";
}

export function formatAirTradeTypeLabel(tradeType: AirTradeType): string {
  return tradeType === "importacion" ? "Tipo: Importación" : "Tipo: Exportación";
}

export const INITIAL_VISIBLE_AIR_ROUTES = 5;

export function normalizeAirCarrierKey(
  carrier: string | null | undefined,
): string {
  const trimmed = carrier?.trim();
  return trimmed ? trimmed.toLowerCase() : "otros/no informado";
}

export function getAirDestinationLabel(
  destinationNormalized: string,
  routeDestination: string,
): string {
  return (
    getAirportByOrigin(destinationNormalized)?.name ??
    capitalize(routeDestination)
  );
}

export async function fetchAirRatesFromSheet(): Promise<RutaAerea[]> {
  const res = await fetch(GOOGLE_SHEET_CSV_URL);
  if (!res.ok) {
    throw new Error(`Error al cargar tarifas aéreas (${res.status})`);
  }
  const text = await res.text();
  return parseAEREO(parseCSV(text));
}

export function filterAirRoutesForOd(params: {
  rutas: RutaAerea[];
  originNormalized: string;
  destinationNormalized: string;
  includeExpired?: boolean;
}): RutaAerea[] {
  const {
    rutas,
    originNormalized,
    destinationNormalized,
    includeExpired = false,
  } = params;

  return rutas
    .filter((ruta) => {
      if (!includeExpired && getValidityClass(ruta.validUntil) === "expired") {
        return false;
      }
      return (
        ruta.originNormalized === originNormalized &&
        ruta.destinationNormalized === destinationNormalized
      );
    })
    .sort((a, b) => {
      const valA = a.priceForComparison || extractPrice(a.kg45);
      const valB = b.priceForComparison || extractPrice(b.kg45);
      const effA = valA === 0 ? Infinity : valA;
      const effB = valB === 0 ? Infinity : valB;
      return effA - effB;
    });
}

/** Una tarifa por carrier (mejor precio), máximo `limit`. */
export function collapseAirRoutesByCarrier(
  rutas: RutaAerea[],
  limit = INITIAL_VISIBLE_AIR_ROUTES,
): RutaAerea[] {
  const seen = new Set<string>();
  const unique: RutaAerea[] = [];
  for (const ruta of rutas) {
    const key = normalizeAirCarrierKey(ruta.carrier);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(ruta);
  }
  return unique.slice(0, limit);
}

export function createPendingAirRoute(params: {
  originLabel: string;
  originNormalized: string;
  destinationLabel: string;
  destinationNormalized: string;
}): RutaAerea {
  return {
    id: "AIR-PENDING",
    origin: params.originLabel,
    originNormalized: params.originNormalized,
    destination: params.destinationLabel,
    destinationNormalized: params.destinationNormalized,
    kg45: null,
    kg100: null,
    kg300: null,
    kg500: null,
    kg1000: null,
    carrier: "Pendiente de cotización",
    carrierNormalized: normalize("Pendiente de cotización"),
    frequency: null,
    transitTime: null,
    routing: null,
    remark1: null,
    remark2: null,
    validUntil: null,
    company: null,
    localCharges: 0,
    gastosXKg: 0,
    minGastosXKg: 0,
    minAirFreight: 0,
    row_number: -1,
    priceForComparison: 0,
    currency: "USD",
  };
}

export function isAirRouteSelectable(ruta: RutaAerea): boolean {
  if (ruta.id === "AIR-PENDING") return true;
  return ruta.priceForComparison > 0 || extractPrice(ruta.kg45) > 0;
}

export function formatAirRateTier(
  value: string | null,
  currency: string,
): string {
  const n = extractPrice(value);
  if (!n) return "—";
  return `${currency} ${n.toFixed(2)}`;
}

export function airRouteValidityMeta(validUntil: string | null): {
  state: ReturnType<typeof getValidityClass>;
  label: string;
  iso: string;
} {
  const state = getValidityClass(validUntil);
  const iso = parseValidUntilToISO(validUntil);
  const label =
    state === "expired"
      ? "Vencida"
      : state === "expiring-soon"
        ? "Por vencer"
        : "Vigente";
  return { state, label, iso };
}
