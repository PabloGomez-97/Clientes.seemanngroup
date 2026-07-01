import type {
  AirShipment,
  OceanShipment,
} from "../components/cliente/tracking/shipsgo/types.js";

export type TrackingTab = "air" | "ocean";
export type AirFilterKey = "inTransit" | "delivered" | "delayed";
export type OceanFilterKey = "sailing" | "arrived" | "delayed";

export type StatusChipTone = "transit" | "done" | "delayed" | "neutral";

export interface StatusChipDef {
  key: string;
  label: string;
  count: number;
  tone: StatusChipTone;
}

export interface AirStats {
  total: number;
  inTransit: number;
  delivered: number;
  delayed: number;
}

export interface OceanStats {
  total: number;
  sailing: number;
  arrived: number;
  delayed: number;
}

export interface AwbValidation {
  valid: boolean;
  message: string;
}

export interface OceanIdentifierValidation {
  valid: boolean;
  message: string;
}

export function filterShipmentsByUsername<T extends { reference: string | null }>(
  shipments: T[],
  username: string | undefined,
): T[] {
  if (!username) return [];
  return shipments.filter(
    (shipment) =>
      shipment.reference !== null && shipment.reference === username,
  );
}

export function sortShipmentsByCreatedAt<T extends { created_at: string }>(
  shipments: T[],
): T[] {
  return [...shipments].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function isAirDelayed(shipment: AirShipment): boolean {
  if (!shipment.route) return false;
  const { transit_percentage } = shipment.route;
  const eta = shipment.route.destination.date_of_rcf;
  if (!eta || transit_percentage >= 100) return false;
  return (
    new Date(shipment.updated_at) >= new Date(eta) && transit_percentage < 100
  );
}

export function isOceanDelayed(shipment: OceanShipment): boolean {
  if (!shipment.route) return false;
  const { transit_percentage } = shipment.route;
  const eta = shipment.route.port_of_discharge.date_of_discharge;
  if (!eta || transit_percentage >= 100) return false;
  return (
    new Date(shipment.updated_at) >= new Date(eta) && transit_percentage < 100
  );
}

export function matchesAirFilter(
  shipment: AirShipment,
  filter: AirFilterKey,
): boolean {
  switch (filter) {
    case "inTransit":
      return shipment.status === "EN_ROUTE";
    case "delivered":
      return (
        shipment.status === "DELIVERED" || shipment.status === "LANDED"
      );
    case "delayed":
      return isAirDelayed(shipment);
    default:
      return true;
  }
}

export function matchesOceanFilter(
  shipment: OceanShipment,
  filter: OceanFilterKey,
): boolean {
  switch (filter) {
    case "sailing":
      return shipment.status === "SAILING";
    case "arrived":
      return (
        shipment.status === "ARRIVED" || shipment.status === "DISCHARGED"
      );
    case "delayed":
      return isOceanDelayed(shipment);
    default:
      return true;
  }
}

export function computeAirStats(shipments: AirShipment[]): AirStats {
  return {
    total: shipments.length,
    inTransit: shipments.filter((s) => s.status === "EN_ROUTE").length,
    delivered: shipments.filter(
      (s) => s.status === "DELIVERED" || s.status === "LANDED",
    ).length,
    delayed: shipments.filter(isAirDelayed).length,
  };
}

export function computeOceanStats(shipments: OceanShipment[]): OceanStats {
  return {
    total: shipments.length,
    sailing: shipments.filter((s) => s.status === "SAILING").length,
    arrived: shipments.filter(
      (s) => s.status === "ARRIVED" || s.status === "DISCHARGED",
    ).length,
    delayed: shipments.filter(isOceanDelayed).length,
  };
}

export function buildAirStatusChips(stats: AirStats): StatusChipDef[] {
  return [
    {
      key: "inTransit",
      label: "En tránsito",
      count: stats.inTransit,
      tone: "transit",
    },
    {
      key: "delivered",
      label: "Entregados",
      count: stats.delivered,
      tone: "done",
    },
    {
      key: "delayed",
      label: "Demorados",
      count: stats.delayed,
      tone: "delayed",
    },
  ];
}

export function buildOceanStatusChips(stats: OceanStats): StatusChipDef[] {
  return [
    {
      key: "sailing",
      label: "Navegando",
      count: stats.sailing,
      tone: "transit",
    },
    {
      key: "arrived",
      label: "Llegados",
      count: stats.arrived,
      tone: "done",
    },
    {
      key: "delayed",
      label: "Demorados",
      count: stats.delayed,
      tone: "delayed",
    },
  ];
}

export function validateAwb(value: string): AwbValidation {
  const clean = value.replace(/[\s-]/g, "");
  if (clean.length === 0) return { valid: false, message: "" };
  if (!/^\d+$/.test(clean)) {
    return { valid: false, message: "Solo números permitidos" };
  }
  if (clean.length !== 11) {
    return { valid: false, message: `${clean.length}/11 dígitos` };
  }
  return { valid: true, message: "Formato válido" };
}

export function validateOceanIdentifier(
  type: "container_number" | "booking_number",
  value: string,
): OceanIdentifierValidation {
  if (!value) return { valid: false, message: "" };
  if (type === "container_number") {
    const regex = /^[A-Z]{4}[0-9]{7}$/;
    if (!regex.test(value.toUpperCase())) {
      return {
        valid: false,
        message: "Formato: 4 letras + 7 números (ej: MSCU1234567)",
      };
    }
    return { valid: true, message: "Formato válido" };
  }
  const regex = /^[a-zA-Z0-9/-]+$/;
  if (!regex.test(value)) {
    return { valid: false, message: "Solo letras, números, / y -" };
  }
  return { valid: true, message: "Formato válido" };
}

export function getOceanTrackingLabel(shipment: OceanShipment): string {
  return (
    shipment.container_number?.trim() ||
    shipment.booking_number?.trim() ||
    `#${shipment.id}`
  );
}

export function getOceanEmbedQuery(shipment: OceanShipment): string {
  return (
    shipment.container_number?.trim() ||
    shipment.booking_number?.trim() ||
    ""
  );
}

export function buildShipsGoEmbedUrl(
  token: string | undefined,
  transport: "air" | "ocean",
  query: string,
): string | null {
  if (!token?.trim() || !query.trim()) return null;

  const params = new URLSearchParams({
    token: token.trim(),
    tabs: "none",
    transport,
    query: query.trim(),
  });

  return `https://embed.shipsgo.com/?${params.toString()}`;
}

export function mapCreateAirError(status: number, fallback?: string): string {
  const errorMessages: Record<number, string> = {
    409: "Ya existe un trackeo con este AWB en tu cuenta.",
    402: "Sin créditos disponibles. Contacta a tu ejecutivo de cuenta.",
  };
  return errorMessages[status] || fallback || "Error al crear el trackeo.";
}

export function mapCreateOceanError(status: number, fallback?: string): string {
  const errorMessages: Record<number, string> = {
    409: "Ya existe un trackeo con este contenedor/booking en tu cuenta.",
    402: "Sin créditos disponibles. Contacta a tu ejecutivo de cuenta.",
  };
  return errorMessages[status] || fallback || "Error al crear el trackeo.";
}
