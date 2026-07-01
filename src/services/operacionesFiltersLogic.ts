import type { AirShipment } from "@/components/cliente/embarques/Handlers/HandlerAirShipments";
import type { GroundShipment } from "@/components/cliente/embarques/Handlers/HandlerGroundShipments";
import { extractHbliFromCharges } from "./linbisQuoteLookup";
import type { OceanListItem } from "./linbisShipmentMappers";

export type AirOceanOperacionesFilters = {
  number?: string;
  waybill?: string;
  clientReference?: string;
  departureDate?: string;
  arrivalDate?: string;
  carrier?: string;
};

export type GroundOperacionesFilters = {
  number?: string;
  origin?: string;
  destination?: string;
  departureDate?: string;
  carrier?: string;
  type?: string;
  pieces?: string;
};

export type OperacionesTab = "air" | "ocean" | "ground";

function includesInsensitive(haystack: unknown, needle: string): boolean {
  const term = needle.trim().toLowerCase();
  if (!term) return true;
  return String(haystack ?? "")
    .toLowerCase()
    .includes(term);
}

function matchesIsoDate(value: unknown, isoDate: string): boolean {
  if (!value || !isoDate) return false;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return false;
  d.setTime(d.getTime() + 3_600_000);
  return d.toISOString().split("T")[0] === isoDate;
}

export function oceanShipmentMatchesNumberFilter(
  shipment: OceanListItem,
  term: string,
): boolean {
  const lower = term.trim().toLowerCase();
  if (!lower) return true;

  if ((shipment.number || "").toLowerCase().includes(lower)) return true;

  const hbliFromCharges = extractHbliFromCharges(shipment.charges);
  if (hbliFromCharges?.toLowerCase().includes(lower)) return true;

  const number = shipment.number?.trim() ?? "";
  if (
    number.toUpperCase().startsWith("HBLI") &&
    number.toLowerCase().includes(lower)
  ) {
    return true;
  }

  return false;
}

export function countActiveAirOceanFilters(
  filters: AirOceanOperacionesFilters,
): number {
  return [
    filters.number,
    filters.waybill,
    filters.clientReference,
    filters.departureDate,
    filters.arrivalDate,
    filters.carrier,
  ].filter((value) => Boolean(value?.trim())).length;
}

export function countActiveGroundFilters(
  filters: GroundOperacionesFilters,
): number {
  return [
    filters.number,
    filters.origin,
    filters.destination,
    filters.departureDate,
    filters.carrier,
    filters.type,
    filters.pieces,
  ].filter((value) => Boolean(value?.trim())).length;
}

export function applyAirOperacionesFilters(
  shipments: AirShipment[],
  filters: AirOceanOperacionesFilters,
  resolveArrivalDate?: (shipment: AirShipment) => string | null | undefined,
): AirShipment[] {
  let filtered = shipments;

  if (filters.number?.trim()) {
    filtered = filtered.filter((shipment) =>
      includesInsensitive(shipment.number, filters.number!),
    );
  }
  if (filters.waybill?.trim()) {
    filtered = filtered.filter((shipment) =>
      includesInsensitive(shipment.waybillNumber, filters.waybill!),
    );
  }
  if (filters.clientReference?.trim()) {
    filtered = filtered.filter((shipment) =>
      includesInsensitive(shipment.customerReference, filters.clientReference!),
    );
  }
  if (filters.departureDate) {
    filtered = filtered.filter((shipment) => {
      const departure = shipment.departure?.date;
      return departure ? matchesIsoDate(departure, filters.departureDate!) : false;
    });
  }
  if (filters.arrivalDate) {
    filtered = filtered.filter((shipment) => {
      const arrival = resolveArrivalDate
        ? resolveArrivalDate(shipment)
        : shipment.arrival?.date ?? shipment.arrival?.displayDate;
      return arrival ? matchesIsoDate(arrival, filters.arrivalDate!) : false;
    });
  }
  if (filters.carrier?.trim()) {
    filtered = filtered.filter((shipment) =>
      includesInsensitive(shipment.carrier?.name, filters.carrier!),
    );
  }

  return filtered;
}

export function applyOceanOperacionesFilters(
  shipments: OceanListItem[],
  filters: AirOceanOperacionesFilters,
  resolveArrivalDate?: (shipment: OceanListItem) => string | null | undefined,
): OceanListItem[] {
  let filtered = shipments;

  if (filters.number?.trim()) {
    filtered = filtered.filter((shipment) =>
      oceanShipmentMatchesNumberFilter(shipment, filters.number!),
    );
  }
  if (filters.waybill?.trim()) {
    filtered = filtered.filter((shipment) =>
      includesInsensitive(shipment.waybillNumber, filters.waybill!),
    );
  }
  if (filters.clientReference?.trim()) {
    filtered = filtered.filter((shipment) =>
      includesInsensitive(shipment.customerReference, filters.clientReference!),
    );
  }
  if (filters.departureDate) {
    filtered = filtered.filter((shipment) =>
      shipment.departureDate
        ? matchesIsoDate(shipment.departureDate, filters.departureDate!)
        : false,
    );
  }
  if (filters.arrivalDate) {
    filtered = filtered.filter((shipment) => {
      const arrival = resolveArrivalDate
        ? resolveArrivalDate(shipment)
        : shipment.arrivalDate;
      return arrival ? matchesIsoDate(arrival, filters.arrivalDate!) : false;
    });
  }
  if (filters.carrier?.trim()) {
    filtered = filtered.filter((shipment) =>
      includesInsensitive(shipment.carrier?.name, filters.carrier!),
    );
  }

  return filtered;
}

export function applyGroundOperacionesFilters(
  shipments: GroundShipment[],
  filters: GroundOperacionesFilters,
): GroundShipment[] {
  let filtered = shipments;

  if (filters.number?.trim()) {
    filtered = filtered.filter((shipment) =>
      includesInsensitive(shipment.number, filters.number!),
    );
  }
  if (filters.origin?.trim()) {
    filtered = filtered.filter((shipment) =>
      includesInsensitive(shipment.from, filters.origin!),
    );
  }
  if (filters.destination?.trim()) {
    filtered = filtered.filter((shipment) =>
      includesInsensitive(shipment.to, filters.destination!),
    );
  }
  if (filters.departureDate) {
    filtered = filtered.filter((shipment) =>
      shipment.departure
        ? matchesIsoDate(shipment.departure, filters.departureDate!)
        : false,
    );
  }
  if (filters.carrier?.trim()) {
    filtered = filtered.filter((shipment) =>
      includesInsensitive(shipment.carrier, filters.carrier!),
    );
  }
  if (filters.type?.trim()) {
    filtered = filtered.filter(
      (shipment) =>
        includesInsensitive(shipment.shipmentClass, filters.type!) ||
        includesInsensitive(shipment.rateCategory, filters.type!),
    );
  }
  if (filters.pieces?.trim()) {
    filtered = filtered.filter((shipment) =>
      includesInsensitive(shipment.totalCargo_Pieces, filters.pieces!),
    );
  }

  return filtered;
}

function parseDepartureTime(shipment: Record<string, unknown>): number {
  const departure = shipment.departure;
  if (typeof departure === "string") {
    const time = new Date(departure).getTime();
    return Number.isFinite(time) ? time : 0;
  }
  if (departure && typeof departure === "object") {
    const date = (departure as { date?: string }).date;
    if (date) {
      const time = new Date(date).getTime();
      return Number.isFinite(time) ? time : 0;
    }
  }
  const departureDate = shipment.departureDate;
  if (typeof departureDate === "string") {
    const time = new Date(departureDate).getTime();
    return Number.isFinite(time) ? time : 0;
  }
  return 0;
}

export function sortAirOperaciones(shipments: AirShipment[]): AirShipment[] {
  return [...shipments].sort(
    (a, b) =>
      parseDepartureTime(b as unknown as Record<string, unknown>) -
      parseDepartureTime(a as unknown as Record<string, unknown>),
  );
}

export function sortOceanOperaciones(
  shipments: OceanListItem[],
): OceanListItem[] {
  return [...shipments].sort(
    (a, b) =>
      parseDepartureTime(b as unknown as Record<string, unknown>) -
      parseDepartureTime(a as unknown as Record<string, unknown>),
  );
}

export function sortGroundOperaciones(
  shipments: GroundShipment[],
): GroundShipment[] {
  return [...shipments].sort(
    (a, b) =>
      parseDepartureTime(b as unknown as Record<string, unknown>) -
      parseDepartureTime(a as unknown as Record<string, unknown>),
  );
}

export function formatOperacionDate(value: unknown): string {
  if (!value) return "-";
  const raw =
    typeof value === "object" && value !== null
      ? String(
          (value as { displayDate?: string; date?: string }).displayDate ??
            (value as { date?: string }).date ??
            "",
        )
      : String(value);
  if (!raw.trim()) return "-";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  d.setTime(d.getTime() + 3_600_000);
  return d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatLocationName(
  location?: { code?: string; name?: string } | string | null,
): string {
  if (!location) return "-";
  if (typeof location === "string") return location.trim() || "-";
  const name = location.name?.trim();
  const code = location.code?.trim();
  if (name && code) return `${name} (${code})`;
  return name || code || "-";
}

export function formatOperacionCustomerReference(
  reference?: string | null,
): string {
  const trimmed = reference?.trim();
  return trimmed || "-";
}
