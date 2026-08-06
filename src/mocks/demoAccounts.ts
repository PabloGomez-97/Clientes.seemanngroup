/**
 * Cuentas demo/PR del portal cliente.
 * Los datos son mocks frontend: no afectan Linbis ni KPIs admin.
 */

import {
  MUNDOGAMING_DUMMY_GROUND_SHIPMENTS,
  MUNDOGAMING_DUMMY_INVOICES,
  MUNDOGAMING_DUMMY_OCEAN_SHIPMENTS,
  MUNDOGAMING_DUMMY_SHIPMENTS,
  type DummyInvoice,
} from "@/mocks/mundogaming";
import {
  CONTRERAS_DUMMY_AIR_TRACKINGS,
  CONTRERAS_DUMMY_GROUND_SHIPMENTS,
  CONTRERAS_DUMMY_INVOICES,
  CONTRERAS_DUMMY_OCEAN_SHIPMENTS,
  CONTRERAS_DUMMY_OCEAN_TRACKINGS,
  CONTRERAS_DUMMY_OPERATIONAL_SHIPMENTS,
  CONTRERAS_DUMMY_SHIPMENTS,
  CONTRERAS_USERNAME,
  getContrerasAirTrackingDetail,
  getContrerasOceanTrackingDetail,
  type ContrerasOperationalShipment,
} from "@/mocks/contreras";
import type { AirShipment, GroundShipment, OceanShipment } from "@/types/shipments";
import type {
  AirShipment as ShipsgoAirShipment,
  AirShipmentDetail as ShipsgoAirDetail,
  OceanShipment as ShipsgoOceanShipment,
  OceanShipmentDetail as ShipsgoOceanDetail,
} from "@/components/cliente/tracking/shipsgo/types";

export const DEMO_ACCOUNT_MUNDOGAMING = "MundoGaming";
export const DEMO_ACCOUNT_CONTRERAS = CONTRERAS_USERNAME;

export function isDemoAccount(
  username: string | null | undefined,
): boolean {
  return (
    username === DEMO_ACCOUNT_MUNDOGAMING ||
    username === DEMO_ACCOUNT_CONTRERAS
  );
}

export function isContrerasDemoAccount(
  username: string | null | undefined,
): boolean {
  return username === DEMO_ACCOUNT_CONTRERAS;
}

export function getDemoAirShipments(
  username: string | null | undefined,
): AirShipment[] | null {
  if (username === DEMO_ACCOUNT_MUNDOGAMING) return MUNDOGAMING_DUMMY_SHIPMENTS;
  if (username === DEMO_ACCOUNT_CONTRERAS) return CONTRERAS_DUMMY_SHIPMENTS;
  return null;
}

export function getDemoOceanShipments(
  username: string | null | undefined,
): OceanShipment[] | null {
  if (username === DEMO_ACCOUNT_MUNDOGAMING) {
    return MUNDOGAMING_DUMMY_OCEAN_SHIPMENTS;
  }
  if (username === DEMO_ACCOUNT_CONTRERAS) {
    return CONTRERAS_DUMMY_OCEAN_SHIPMENTS;
  }
  return null;
}

export function getDemoGroundShipments(
  username: string | null | undefined,
): GroundShipment[] | null {
  if (username === DEMO_ACCOUNT_MUNDOGAMING) {
    return MUNDOGAMING_DUMMY_GROUND_SHIPMENTS;
  }
  if (username === DEMO_ACCOUNT_CONTRERAS) {
    return CONTRERAS_DUMMY_GROUND_SHIPMENTS;
  }
  return null;
}

export function getDemoInvoices(
  username: string | null | undefined,
): DummyInvoice[] | null {
  if (username === DEMO_ACCOUNT_MUNDOGAMING) return MUNDOGAMING_DUMMY_INVOICES;
  if (username === DEMO_ACCOUNT_CONTRERAS) return CONTRERAS_DUMMY_INVOICES;
  return null;
}

export function getDemoOperationalShipments(
  username: string | null | undefined,
): ContrerasOperationalShipment[] | null {
  if (username === DEMO_ACCOUNT_CONTRERAS) {
    return CONTRERAS_DUMMY_OPERATIONAL_SHIPMENTS;
  }
  return null;
}

export function getDemoAirTrackings(
  username: string | null | undefined,
): ShipsgoAirShipment[] | null {
  if (username === DEMO_ACCOUNT_CONTRERAS) return CONTRERAS_DUMMY_AIR_TRACKINGS;
  return null;
}

export function getDemoOceanTrackings(
  username: string | null | undefined,
): ShipsgoOceanShipment[] | null {
  if (username === DEMO_ACCOUNT_CONTRERAS) return CONTRERAS_DUMMY_OCEAN_TRACKINGS;
  return null;
}

export function getDemoAirTrackingDetail(
  username: string | null | undefined,
  id: number,
): ShipsgoAirDetail | null {
  if (username && username !== DEMO_ACCOUNT_CONTRERAS) return null;
  return getContrerasAirTrackingDetail(id);
}

export function getDemoOceanTrackingDetail(
  username: string | null | undefined,
  id: number,
): ShipsgoOceanDetail | null {
  if (username && username !== DEMO_ACCOUNT_CONTRERAS) return null;
  return getContrerasOceanTrackingDetail(id);
}

/** Ocean list shape used by mobile/web operaciones mappers. */
export function getDemoOceanListItems(
  username: string | null | undefined,
): Array<{
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
  } | null;
}> | null {
  const ocean = getDemoOceanShipments(username);
  if (!ocean) return null;
  return ocean.map((s) => ({
    id: s.id,
    number: s.number,
    waybillNumber: s.waybillNumber ?? null,
    bookingNumber: s.bookingNumber ?? null,
    customerReference: s.customerReference ?? null,
    departureDate: s.departure ?? null,
    arrivalDate: s.arrival ?? null,
    notes: s.cargoDescription ?? null,
    carrier: s.carrier ? { name: String(s.carrier) } : null,
    executedAt: s.portOfLoading ? { name: s.portOfLoading } : null,
    destination: s.portOfUnloading ? { name: s.portOfUnloading } : null,
    trackingNumber: s.containerNumber ?? null,
    totalCargo: {
      pieces: s.totalCargo_Pieces,
      weight: { userDisplay: s.totalCargo_WeightDisplayValue },
      volume: { userDisplay: s.totalCargo_VolumeDisplayValue },
    },
  }));
}

export function sortDemoByDepartureDesc<
  T extends {
    departure?: { date?: string | null } | string | null;
  },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const da =
      typeof a.departure === "string"
        ? a.departure
        : a.departure?.date || "";
    const db =
      typeof b.departure === "string"
        ? b.departure
        : b.departure?.date || "";
    return new Date(db || 0).getTime() - new Date(da || 0).getTime();
  });
}
