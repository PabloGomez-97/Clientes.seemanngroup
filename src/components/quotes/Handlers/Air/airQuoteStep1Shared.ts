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
import { getAirportByOrigin } from "../../../../config/airportCoordinates";

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
