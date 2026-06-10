import type { AirShipment } from "../components/shipments/Handlers/Handlersairshipments";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawRecord = Record<string, any>;

function normalizeDateField(
  field: unknown,
): { date: string; displayDate: string } | null {
  if (!field) return null;
  if (typeof field === "string") {
    const trimmed = field.trim();
    if (!trimmed) return null;
    return { date: trimmed, displayDate: trimmed };
  }
  if (typeof field === "object" && field !== null) {
    const obj = field as RawRecord;
    const display = String(obj.displayDate ?? obj.date ?? "").trim();
    const date = String(obj.date ?? obj.displayDate ?? display).trim();
    if (!display && !date) return null;
    return { date: date || display, displayDate: display || date };
  }
  return null;
}

function normalizeLocation(
  field: unknown,
): { code?: string; name?: string } | null {
  if (!field) return null;
  if (typeof field === "string") {
    const trimmed = field.trim();
    return trimmed ? { name: trimmed } : null;
  }
  if (typeof field === "object" && field !== null) {
    const obj = field as RawRecord;
    return {
      code: obj.code ?? undefined,
      name: obj.name ?? obj.code ?? undefined,
    };
  }
  return null;
}

function normalizeCarrier(
  field: unknown,
): { name?: string; code?: string } | null {
  if (!field) return null;
  if (typeof field === "string") {
    const trimmed = field.trim();
    return trimmed ? { name: trimmed } : null;
  }
  if (typeof field === "object" && field !== null) return field as RawRecord;
  return null;
}

/** Aeropuertos de carga/descarga según el shape real de Linbis (lista y detalle). */
export function resolveAirRouteLocations(raw: RawRecord): {
  origin: { code?: string; name?: string } | null;
  destination: { code?: string; name?: string } | null;
} {
  const origin = normalizeLocation(
    raw.executedAt ??
      raw.airportOfDeparture ??
      raw.from ??
      raw.origin ??
      raw.portOfLoading,
  );
  const destination = normalizeLocation(
    raw.airportOfArrival ??
      raw.to ??
      raw.destination ??
      raw.portOfUnloading,
  );
  return { origin, destination };
}

/** Convierte un registro de air-shipments Linbis al shape usado por AirShipmentsView. */
export function mapLinbisAirToAirShipment(raw: RawRecord): AirShipment {
  const { origin, destination } = resolveAirRouteLocations(raw);

  return {
    id: raw.id,
    number: raw.number,
    customerReference: raw.customerReference ?? null,
    waybillNumber: raw.waybillNumber ?? null,
    carrier: normalizeCarrier(raw.carrier ?? raw.carrierBroker),
    notes: raw.notes ?? null,
    trackingNumber: raw.trackingNumber ?? null,
    executedAt: origin,
    origin,
    destination,
    commodities: Array.isArray(raw.commodities) ? raw.commodities : [],
    departure: normalizeDateField(raw.departure ?? raw.departureDate),
    arrival: normalizeDateField(raw.arrival ?? raw.arrivalDate),
    cargoDescription: raw.cargoDescription ?? null,
    hazardous: typeof raw.hazardous === "boolean" ? raw.hazardous : null,
  };
}

/** Completa origen/destino desde /air-shipments/details/{id}. */
export function mergeAirShipmentRouteFromDetail(
  shipment: AirShipment,
  detail: RawRecord,
): AirShipment {
  const { origin, destination } = resolveAirRouteLocations(detail);
  return {
    ...shipment,
    executedAt: origin ?? shipment.executedAt ?? null,
    origin: origin ?? shipment.origin ?? null,
    destination: destination ?? shipment.destination ?? null,
  };
}

/** Expande subShipments anidados del listado air-shipments. */
export function flattenAirShipmentRecords(records: unknown[]): RawRecord[] {
  const flat: RawRecord[] = [];
  const seen = new Set<string | number>();

  for (const record of records) {
    if (!record || typeof record !== "object") continue;
    const raw = record as RawRecord;

    const pushUnique = (item: RawRecord) => {
      const id = item.id ?? item.number;
      if (id == null) return;
      if (seen.has(id)) return;
      seen.add(id);
      flat.push(item);
    };

    pushUnique(raw);

    if (Array.isArray(raw.subShipments)) {
      for (const sub of raw.subShipments) {
        if (sub && typeof sub === "object") pushUnique(sub as RawRecord);
      }
    }
  }

  return flat;
}

export interface OceanListItem {
  id: number;
  number: string;
  waybillNumber?: string | null;
  bookingNumber?: string | null;
  customerReference?: string | null;
  departureDate?: string | null;
  arrivalDate?: string | null;
  notes?: string | null;
  carrier?: { id?: number; name?: string; code?: string } | null;
  executedAt?: { code?: string; name?: string } | null;
  destination?: { code?: string; name?: string } | null;
  trackingNumber?: string | null;
  totalCargo?: {
    pieces?: number;
    weight?: { userDisplay?: string };
    volume?: { userDisplay?: string };
    containers?: number;
  } | null;
  commodities?: unknown[];
  charges?: unknown[];
}

/** Convierte un registro de ocean-shipments/all al shape de OceanShipmentsView. */
export function mapLinbisOceanToShippingOrder(raw: RawRecord): OceanListItem {
  const originName = String(
    raw.portOfLoading ?? raw.origin ?? raw.from ?? "",
  ).trim();
  const destName = String(
    raw.portOfUnloading ?? raw.destination ?? raw.to ?? "",
  ).trim();

  const departure =
    typeof raw.departure === "string"
      ? raw.departure
      : (raw.departureDate ?? null);
  const arrival =
    typeof raw.arrival === "string" ? raw.arrival : (raw.arrivalDate ?? null);

  return {
    id: Number(raw.id) || 0,
    number: String(raw.number ?? ""),
    waybillNumber: raw.waybillNumber ?? null,
    bookingNumber: raw.bookingNumber ?? null,
    customerReference: raw.customerReference ?? null,
    departureDate: departure ?? null,
    arrivalDate: arrival ?? null,
    notes: raw.notes ?? raw.cargoDescription ?? null,
    carrier: normalizeCarrier(raw.carrier ?? raw.carrierBroker),
    executedAt: originName ? { name: originName } : null,
    destination: destName ? { name: destName } : null,
    trackingNumber: raw.trackingNumber ?? raw.containerNumber ?? null,
    totalCargo: {
      pieces: raw.totalCargo_Pieces ?? raw.totalCargo?.pieces ?? undefined,
      weight: {
        userDisplay:
          raw.totalCargo_WeightDisplayValue ??
          raw.totalCargo?.weight?.userDisplay ??
          undefined,
      },
      volume: {
        userDisplay:
          raw.totalCargo_VolumeDisplayValue ??
          raw.totalCargo?.volume?.userDisplay ??
          undefined,
      },
      containers: raw.totalCargo?.containers ?? undefined,
    },
    commodities: Array.isArray(raw.commodities) ? raw.commodities : [],
    charges: Array.isArray(raw.charges) ? raw.charges : [],
  };
}
