import type { AirShipment } from "../types/shipments";

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
  id?: number;
  number?: string;
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

function extractDateString(field: unknown): string | null {
  if (!field) return null;
  if (typeof field === "string") {
    const trimmed = field.trim();
    return trimmed || null;
  }
  if (typeof field === "object") {
    const obj = field as RawRecord;
    const value = obj.date ?? obj.displayDate ?? obj.dateTime;
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function locationLabel(field: unknown): string {
  const loc = normalizeLocation(field);
  if (!loc) return "";
  if (loc.name && loc.code) return `${loc.name} (${loc.code})`;
  return loc.name || loc.code || "";
}

/** Convierte un registro de ocean-shipments (lista o /all) al shape de OceanShipmentsView. */
export function mapLinbisOceanToShippingOrder(raw: RawRecord): OceanListItem {
  const origin =
    normalizeLocation(
      raw.portOfLoading ?? raw.executedAt ?? raw.origin ?? raw.from,
    ) ?? null;
  const destination =
    normalizeLocation(
      raw.portOfUnloading ??
        raw.finalDestination ??
        raw.destination ??
        raw.to,
    ) ?? null;

  const departure =
    extractDateString(raw.departure) ??
    extractDateString(raw.departureDate) ??
    extractDateString(raw.loadingDate);
  const arrival =
    extractDateString(raw.arrival) ?? extractDateString(raw.arrivalDate);

  return {
    id: Number(raw.id) || 0,
    number: String(raw.number ?? ""),
    waybillNumber: raw.waybillNumber ?? null,
    bookingNumber: raw.bookingNumber ?? null,
    customerReference: raw.customerReference ?? null,
    departureDate: departure,
    arrivalDate: arrival,
    notes: raw.notes ?? raw.cargoDescription ?? null,
    carrier: normalizeCarrier(raw.carrier ?? raw.carrierBroker),
    executedAt: origin,
    destination,
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

/** Convierte un registro de ground-shipments (lista o /all) al shape de GroundShipment. */
export function mapLinbisGroundToGroundShipment(raw: RawRecord): {
  id?: number;
  number?: string;
  operationFlow?: string;
  shipmentType?: string;
  shipmentClass?: string;
  currentFlow?: string;
  departure?: string;
  arrival?: string;
  from?: string;
  to?: string;
  finalDestination?: string;
  carrier?: string;
  truckNumber?: string;
  trackingNumber?: string;
  proNumber?: string;
  driver?: string;
  bookingNumber?: string;
  waybillNumber?: string;
  containerNumber?: string;
  consignee?: string;
  consigneeId?: number;
  consigneeAddress?: string;
  shipper?: string;
  customer?: string;
  customerReference?: string;
  cargoDescription?: string;
  cargoStatus?: string;
  rateCategory?: string;
  totalCargo_Pieces?: number;
  totalCargo_WeightDisplayValue?: string;
  totalCargo_VolumeDisplayValue?: string;
  notes?: string;
  hazardous?: boolean;
} {
  const consigneeName =
    typeof raw.consignee === "string"
      ? raw.consignee
      : raw.consignee?.name;
  const customerName =
    typeof raw.customer === "string" ? raw.customer : raw.customer?.name;
  const carrierName =
    typeof raw.carrier === "string"
      ? raw.carrier
      : raw.carrier?.name ?? raw.carrierBroker?.name;
  const shipperName =
    typeof raw.shipper === "string" ? raw.shipper : raw.shipper?.name;

  return {
    id: raw.id,
    number: raw.number,
    operationFlow: raw.operationFlow,
    shipmentType: raw.shipmentType,
    shipmentClass: raw.shipmentClass,
    currentFlow: raw.currentFlow,
    departure:
      extractDateString(raw.departure) ??
      extractDateString(raw.departureDate) ??
      undefined,
    arrival:
      extractDateString(raw.arrival) ??
      extractDateString(raw.arrivalDate) ??
      undefined,
    from:
      locationLabel(raw.from ?? raw.origin ?? raw.portOfLoading) || undefined,
    to:
      locationLabel(raw.to ?? raw.destination ?? raw.portOfUnloading) ||
      undefined,
    finalDestination:
      locationLabel(raw.finalDestination) || undefined,
    carrier: carrierName ?? undefined,
    truckNumber: raw.truckNumber ?? undefined,
    trackingNumber: raw.trackingNumber ?? undefined,
    proNumber: raw.proNumber ?? undefined,
    driver: raw.driver ?? undefined,
    bookingNumber: raw.bookingNumber ?? undefined,
    waybillNumber: raw.waybillNumber ?? undefined,
    containerNumber: raw.containerNumber ?? undefined,
    consignee: consigneeName ?? undefined,
    consigneeId:
      typeof raw.consigneeId === "number"
        ? raw.consigneeId
        : raw.consignee?.id,
    consigneeAddress: raw.consigneeAddress ?? undefined,
    shipper: shipperName ?? undefined,
    customer: customerName ?? undefined,
    customerReference: raw.customerReference ?? undefined,
    cargoDescription: raw.cargoDescription ?? undefined,
    cargoStatus: raw.cargoStatus ?? undefined,
    rateCategory: raw.rateCategory ?? undefined,
    totalCargo_Pieces:
      raw.totalCargo_Pieces ?? raw.totalCargo?.pieces ?? undefined,
    totalCargo_WeightDisplayValue:
      raw.totalCargo_WeightDisplayValue ??
      raw.totalCargo?.weight?.userDisplay ??
      undefined,
    totalCargo_VolumeDisplayValue:
      raw.totalCargo_VolumeDisplayValue ??
      raw.totalCargo?.volume?.userDisplay ??
      undefined,
    notes: raw.notes ?? undefined,
    hazardous: typeof raw.hazardous === "boolean" ? raw.hazardous : undefined,
  };
}
