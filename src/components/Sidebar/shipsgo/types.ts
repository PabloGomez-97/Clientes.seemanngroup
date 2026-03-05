// Shared types for ShipsGo tracking components

export interface AirLocation {
  iata: string;
  name: string;
  timezone: string;
  country: { code: string; name: string };
}

export interface AirRoutePoint {
  location: AirLocation;
  date_of_dep?: string;
  date_of_dep_initial?: string;
  date_of_rcf?: string;
  date_of_rcf_initial?: string;
}

export interface AirRoute {
  origin: AirRoutePoint;
  destination: AirRoutePoint;
  ts_count: number;
  transit_time: number;
  transit_percentage: number;
}

export interface Airline {
  iata: string;
  name: string;
}

export interface Cargo {
  pieces: number | null;
  weight: number | null;
  volume: number | null;
}

export interface Tag {
  id: number;
  name: string;
}

export interface Creator {
  name: string;
  email: string;
}

export interface AirShipment {
  id: number;
  reference: string | null;
  awb_number: string;
  airline: Airline | null;
  cargo: Cargo;
  status: string;
  status_split: boolean;
  route: AirRoute | null;
  creator: Creator;
  tags: Tag[];
  created_at: string;
  updated_at: string;
  checked_at: string;
  discarded_at: string | null;
}

export interface AirResponse {
  message: string;
  shipments: AirShipment[];
  meta: { more: boolean; total: number };
}

// Shipment detail (from /air/shipments/:id)
export interface AirMovement {
  event: string;
  status: string;
  cargo: Cargo;
  location: AirLocation;
  flight: string | null;
  timestamp: string;
}

export interface AirShipmentDetail extends AirShipment {
  status_extended: Record<string, number>;
  movements: AirMovement[];
  followers: { id: number; email: string }[];
}

// GeoJSON types (from /air/shipments/:id/geojson)
export interface GeoJSONPointProperties {
  status: "PAST" | "CURRENT" | "FUTURE";
  location: AirLocation;
}

export interface GeoJSONLineStringProperties {
  status: "PAST" | "CURRENT" | "FUTURE";
  cargo?: Cargo;
  flight?: string;
  events?: {
    DEP?: {
      location: AirLocation;
      timestamp: string;
    };
    ARR?: {
      location: AirLocation;
      timestamp: string;
    };
  };
  current?: {
    index: number;
    coordinates: [number, number];
  };
}

export interface GeoJSONFeature {
  type: "Feature";
  geometry:
    | { type: "Point"; coordinates: [number, number] }
    | { type: "LineString"; coordinates: [number, number][] };
  properties: GeoJSONPointProperties | GeoJSONLineStringProperties;
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

// Ocean types
export interface OceanPortLocation {
  code: string;
  name: string;
  country: { code: string; name: string };
}

export interface OceanPortPoint {
  location: OceanPortLocation;
  date_of_loading?: string;
  date_of_discharge?: string;
}

export interface OceanRoute {
  port_of_loading: OceanPortPoint;
  port_of_discharge: OceanPortPoint;
  ts_count: number;
  transit_time: number;
  transit_percentage: number;
}

export interface OceanCarrier {
  scac: string;
  name: string;
}

export interface OceanShipment {
  id: number;
  reference: string | null;
  container_number: string | null;
  booking_number: string | null;
  container_count: number;
  carrier: OceanCarrier | null;
  status: string;
  route: OceanRoute | null;
  creator: Creator;
  tags: Tag[];
  co2_emission: unknown;
  created_at: string;
  updated_at: string;
  checked_at: string;
  discarded_at: string | null;
}

export interface OceanResponse {
  message: string;
  shipments: OceanShipment[];
  meta: { more: boolean; total: number };
}

// Status labels
export const AIR_STATUS_LABELS: Record<string, string> = {
  BOOKED: "Reservado",
  EN_ROUTE: "En Tránsito",
  LANDED: "Aterrizado",
  DELIVERED: "Entregado",
  UNTRACKED: "Sin Rastreo",
  DISCARDED: "Descartado",
  INPROGRESS: "En Proceso",
};

export const OCEAN_STATUS_LABELS: Record<string, string> = {
  NEW: "Nuevo",
  INPROGRESS: "En proceso",
  BOOKED: "Reservado",
  LOADED: "Cargado",
  SAILING: "Navegando",
  ARRIVED: "Llegó",
  DISCHARGED: "Descargado",
  UNTRACKED: "Sin Rastreo",
};

// Movement event labels
export const MOVEMENT_EVENT_LABELS: Record<string, string> = {
  RCS: "Recepción de carga",
  MAN: "Manifestado",
  DEP: "Salida",
  ARR: "Llegada",
  RCF: "Recibido en destino",
  DLV: "Entregado",
  BKD: "Reservado",
  NFD: "Notificación de entrega",
  AWD: "Documentos disponibles",
  CCD: "Aduanas despachado",
  DIS: "Discrepancia",
  TRM: "Transferido",
  TFD: "Transferencia completada",
  PRE: "Pre-alerta",
  FOH: "Carga en espera",
};

// Helpers
export function getStatusClass(status: string): string {
  return "sg-status sg-status--" + status.toLowerCase().replace("_", "-");
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function formatDateTime(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function getFlagUrl(code: string): string {
  return `https://flagcdn.com/w20/${code.toLowerCase()}.png`;
}
