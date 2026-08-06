/**
 * Datos dummy para Empresa Contreras SpA (cuenta PR).
 * Reutiliza el shape de MundoGaming (primeros 5 de cada tipo) con rebrand.
 */

import {
  MUNDOGAMING_DUMMY_GROUND_SHIPMENTS,
  MUNDOGAMING_DUMMY_INVOICES,
  MUNDOGAMING_DUMMY_OCEAN_SHIPMENTS,
  MUNDOGAMING_DUMMY_SHIPMENTS,
  type DummyInvoice,
} from "@/mocks/mundogaming";
import type { AirShipment, GroundShipment, OceanShipment } from "@/types/shipments";
import type {
  AirShipment as ShipsgoAirShipment,
  AirShipmentDetail as ShipsgoAirDetail,
  OceanShipment as ShipsgoOceanShipment,
  OceanShipmentDetail as ShipsgoOceanDetail,
} from "@/components/cliente/tracking/shipsgo/types";
import {
  CONTRERAS_CONTACT_EMAIL,
  CONTRERAS_CONTACT_NAME,
  CONTRERAS_TAX_ID,
  CONTRERAS_USERNAME,
  rebrandToContreras,
} from "./rebrand";

export {
  CONTRERAS_CONTACT_EMAIL,
  CONTRERAS_CONTACT_NAME,
  CONTRERAS_TAX_ID,
  CONTRERAS_USERNAME,
};

export const CONTRERAS_DUMMY_SHIPMENTS: AirShipment[] = rebrandToContreras(
  MUNDOGAMING_DUMMY_SHIPMENTS.slice(0, 5),
);

export const CONTRERAS_DUMMY_OCEAN_SHIPMENTS: OceanShipment[] =
  rebrandToContreras(MUNDOGAMING_DUMMY_OCEAN_SHIPMENTS.slice(0, 5));

export const CONTRERAS_DUMMY_GROUND_SHIPMENTS: GroundShipment[] =
  rebrandToContreras(MUNDOGAMING_DUMMY_GROUND_SHIPMENTS.slice(0, 5));

export const CONTRERAS_DUMMY_INVOICES: DummyInvoice[] = rebrandToContreras(
  MUNDOGAMING_DUMMY_INVOICES.slice(0, 5),
).map((invoice, index) => {
  const air = CONTRERAS_DUMMY_SHIPMENTS[index % 3];
  const ocean = CONTRERAS_DUMMY_OCEAN_SHIPMENTS[index % 2];
  const isOcean = index === 1 || index === 3;

  if (isOcean && ocean) {
    return {
      ...invoice,
      billTo: {
        name: "EMPRESA CONTRERAS SPA",
        identificationNumber: CONTRERAS_TAX_ID,
      },
      billToAddress:
        "Av. Apoquindo 3000, Oficina 1201, Las Condes, Santiago, Chile",
      shipment: {
        ...invoice.shipment,
        number: ocean.number,
        waybillNumber: ocean.waybillNumber || ocean.containerNumber || undefined,
        consignee: { name: "EMPRESA CONTRERAS SPA" },
        departure: ocean.portOfLoading || invoice.shipment?.departure,
        arrival: ocean.portOfUnloading || invoice.shipment?.arrival,
        customerReference: ocean.customerReference,
      },
    };
  }

  if (air) {
    return {
      ...invoice,
      billTo: {
        name: "EMPRESA CONTRERAS SPA",
        identificationNumber: CONTRERAS_TAX_ID,
      },
      billToAddress:
        "Av. Apoquindo 3000, Oficina 1201, Las Condes, Santiago, Chile",
      shipment: {
        ...invoice.shipment,
        number: `SOG00${97001 + index}`,
        waybillNumber: air.number,
        consignee: { name: "EMPRESA CONTRERAS SPA" },
        customerReference: air.customerReference,
      },
    };
  }

  return invoice;
});

/** Shape usado por ReporteriaOperacional / mobile reportería (SOG). */
export type ContrerasOperationalShipment = {
  id?: number;
  number?: string;
  createdOn?: string;
  departure?: string;
  arrival?: string;
  origin?: string;
  destination?: string;
  orderType?: number | string;
  currentFlow?: string;
  totalCargo_Pieces?: number;
  totalCargo_WeightValue?: number;
  totalCargo_VolumeWeightValue?: number;
  shipper?: string;
  consignee?: string;
};

function parseWeightKg(display?: string | null): number {
  if (!display) return 0;
  const n = Number.parseFloat(display.replace(/[^\d.,]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function parseVolumeM3(display?: string | null): number {
  if (!display) return 0;
  const n = Number.parseFloat(display.replace(/[^\d.,]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function airDepartureIso(s: AirShipment): string | undefined {
  return s.departure?.date || undefined;
}

function airArrivalIso(s: AirShipment): string | undefined {
  return s.arrival?.date || undefined;
}

export const CONTRERAS_DUMMY_OPERATIONAL_SHIPMENTS: ContrerasOperationalShipment[] =
  [
    ...CONTRERAS_DUMMY_SHIPMENTS.map((s, i) => ({
      id: 97001 + i,
      number: `SOG00${97001 + i}`,
      createdOn: airDepartureIso(s),
      departure: airDepartureIso(s),
      arrival: airArrivalIso(s),
      origin: "Shenzhen, China",
      destination: "Santiago, Chile",
      orderType: 1,
      currentFlow: "Import",
      totalCargo_Pieces: s.commodities?.[0]?.pieces ?? s.manifestedPieces ?? 5,
      totalCargo_WeightValue: s.commodities?.[0]?.totalWeightValue ?? 120,
      totalCargo_VolumeWeightValue: s.commodities?.[0]?.totalVolumeValue ?? 0.85,
      shipper: s.shipper?.name,
      consignee: CONTRERAS_USERNAME,
    })),
    ...CONTRERAS_DUMMY_OCEAN_SHIPMENTS.map((s, i) => ({
      id: 97101 + i,
      number: `SOG00${97101 + i}`,
      createdOn: s.createdOn || s.departure,
      departure: s.departure,
      arrival: s.arrival,
      origin: s.portOfLoading,
      destination: s.portOfUnloading,
      orderType: 2,
      currentFlow: s.operationFlow || "Import",
      totalCargo_Pieces: s.totalCargo_Pieces ?? 10,
      totalCargo_WeightValue: parseWeightKg(s.totalCargo_WeightDisplayValue),
      totalCargo_VolumeWeightValue: parseVolumeM3(
        s.totalCargo_VolumeDisplayValue,
      ),
      shipper: typeof s.shipper === "string" ? s.shipper : undefined,
      consignee: CONTRERAS_USERNAME,
    })),
    ...CONTRERAS_DUMMY_GROUND_SHIPMENTS.map((s, i) => ({
      id: 97201 + i,
      number: `SOG00${97201 + i}`,
      createdOn: s.createdOn || s.departure,
      departure: s.departure || undefined,
      arrival: s.arrival || undefined,
      origin: s.from,
      destination: s.to,
      orderType: 3,
      currentFlow: s.operationFlow || "Domestic",
      totalCargo_Pieces: s.totalCargo_Pieces ?? 10,
      totalCargo_WeightValue: parseWeightKg(s.totalCargo_WeightDisplayValue),
      totalCargo_VolumeWeightValue: parseVolumeM3(
        s.totalCargo_VolumeDisplayValue,
      ),
      shipper: typeof s.shipper === "string" ? s.shipper : undefined,
      consignee: CONTRERAS_USERNAME,
    })),
  ];

const CREATOR = {
  name: CONTRERAS_CONTACT_NAME,
  email: CONTRERAS_CONTACT_EMAIL,
};

function airStatusFromOp(s: AirShipment, index: number): string {
  const arrival = s.arrival?.date ? new Date(s.arrival.date) : null;
  if (arrival && arrival.getTime() < Date.now()) {
    return index % 2 === 0 ? "LANDED" : "DELIVERED";
  }
  return index === 0 ? "EN_ROUTE" : "EN_ROUTE";
}

function oceanStatusFromOp(s: OceanShipment, index: number): string {
  const flow = (s.currentFlow || "").toLowerCase();
  if (flow.includes("arriv")) return index % 2 === 0 ? "ARRIVED" : "DISCHARGED";
  return "SAILING";
}

/** Trackings aéreos vinculados a las 5 operaciones aéreas (AWB = number). */
export const CONTRERAS_DUMMY_AIR_TRACKINGS: ShipsgoAirShipment[] =
  CONTRERAS_DUMMY_SHIPMENTS.map((op, i) => {
    const status = airStatusFromOp(op, i);
    const dep = op.departure?.date || "2026-02-08T04:00:00Z";
    const arr = op.arrival?.date || "2026-02-18T04:00:00Z";
    const transitPct =
      status === "DELIVERED" || status === "LANDED" ? 100 : 55 + i * 8;
    return {
      id: 98001 + i,
      reference: CONTRERAS_USERNAME,
      awb_number: op.number || `123-4567891${i}`,
      airline: {
        iata: op.carrier?.code?.slice(0, 2) || "LA",
        name: op.carrier?.name || "LATAM CARGO",
      },
      cargo: {
        pieces: op.commodities?.[0]?.pieces ?? 5,
        weight: op.commodities?.[0]?.totalWeightValue ?? 120,
        volume: op.commodities?.[0]?.totalVolumeValue ?? 0.85,
      },
      status,
      status_split: false,
      route: {
        origin: {
          location: {
            iata: "SZX",
            name: "Shenzhen Bao'an",
            timezone: "Asia/Shanghai",
            country: { code: "CN", name: "China" },
          },
          date_of_dep: dep,
          date_of_dep_initial: dep,
        },
        destination: {
          location: {
            iata: "SCL",
            name: "Santiago Arturo Merino Benítez",
            timezone: "America/Santiago",
            country: { code: "CL", name: "Chile" },
          },
          date_of_rcf: arr,
          date_of_rcf_initial: arr,
        },
        ts_count: 1,
        transit_time: 48 + i * 6,
        transit_percentage: transitPct,
      },
      creator: CREATOR,
      tags: [{ id: 1, name: "PR Demo" }],
      created_at: op.departure?.date || "2026-02-01T12:00:00Z",
      updated_at: op.arrival?.date || "2026-02-10T12:00:00Z",
      checked_at: "2026-02-10T12:00:00Z",
      discarded_at: null,
    };
  });

/** Trackings marítimos vinculados a las 5 operaciones ocean (container). */
export const CONTRERAS_DUMMY_OCEAN_TRACKINGS: ShipsgoOceanShipment[] =
  CONTRERAS_DUMMY_OCEAN_SHIPMENTS.map((op, i) => {
    const status = oceanStatusFromOp(op, i);
    const dep = op.departure || "2026-01-25T04:00:00Z";
    const arr = op.arrival || "2026-03-05T04:00:00Z";
    const polCode = i % 2 === 0 ? "CNSHA" : "CNNGB";
    const podCode = i % 2 === 0 ? "CLSAI" : "CLVAP";
    return {
      id: 98101 + i,
      reference: CONTRERAS_USERNAME,
      container_number: op.containerNumber || `MSKU782345${i}`,
      booking_number: op.bookingNumber || `ECO-BK-2026-00${i + 1}`,
      container_count: 1,
      carrier: {
        scac: "MAEU",
        name: op.carrier || "MAERSK CHILE S.A.",
      },
      status,
      route: {
        port_of_loading: {
          location: {
            code: polCode,
            name: op.portOfLoading || "PUERTO DE SHANGHAI",
            timezone: "Asia/Shanghai",
            country: { code: "CN", name: "China" },
          },
          date_of_loading: dep,
          date_of_loading_initial: dep,
        },
        port_of_discharge: {
          location: {
            code: podCode,
            name: op.portOfUnloading || "SAN ANTONIO",
            timezone: "America/Santiago",
            country: { code: "CL", name: "Chile" },
          },
          date_of_discharge: arr,
          date_of_discharge_initial: arr,
        },
        ts_count: 0,
        transit_time: 35 + i * 2,
        transit_percentage:
          status === "ARRIVED" || status === "DISCHARGED" ? 100 : 40 + i * 10,
      },
      creator: CREATOR,
      tags: [{ id: 1, name: "PR Demo" }],
      co2_emission: null,
      created_at: op.createdOn || dep,
      updated_at: arr,
      checked_at: arr,
      discarded_at: null,
    };
  });

export function getContrerasAirTrackingDetail(
  id: number,
): ShipsgoAirDetail | null {
  const base = CONTRERAS_DUMMY_AIR_TRACKINGS.find((s) => s.id === id);
  if (!base || !base.route) return null;
  const dep = base.route.origin.date_of_dep || base.created_at;
  const arr = base.route.destination.date_of_rcf || base.updated_at;
  return {
    ...base,
    status_extended: {},
    followers: [
      { id: 1, email: CONTRERAS_CONTACT_EMAIL },
      { id: 2, email: "operaciones@seemanngroup.com" },
    ],
    movements: [
      {
        event: "RCS",
        status: "RECEIVED",
        cargo: base.cargo,
        location: base.route.origin.location,
        flight: null,
        timestamp: dep,
      },
      {
        event: "DEP",
        status: "DEPARTED",
        cargo: base.cargo,
        location: base.route.origin.location,
        flight: `${base.airline?.iata || "LA"}800`,
        timestamp: dep,
      },
      {
        event: "ARR",
        status: base.status === "EN_ROUTE" ? "IN_TRANSIT" : "ARRIVED",
        cargo: base.cargo,
        location: base.route.destination.location,
        flight: `${base.airline?.iata || "LA"}800`,
        timestamp: arr,
      },
    ],
  };
}

export function getContrerasOceanTrackingDetail(
  id: number,
): ShipsgoOceanDetail | null {
  const base = CONTRERAS_DUMMY_OCEAN_TRACKINGS.find((s) => s.id === id);
  if (!base || !base.route) return null;
  const dep =
    base.route.port_of_loading.date_of_loading || base.created_at;
  const arr =
    base.route.port_of_discharge.date_of_discharge || base.updated_at;
  return {
    ...base,
    followers: [
      { id: 1, email: CONTRERAS_CONTACT_EMAIL },
      { id: 2, email: "operaciones@seemanngroup.com" },
    ],
    containers: [
      {
        number: base.container_number || "UNKNOWN",
        status: base.status,
        size: 40,
        type: "HC",
        movements: [
          {
            event: "LOAD",
            status: "LOADED",
            location: base.route.port_of_loading.location,
            vessel: { name: "MAERSK EDINBURGH", imo: 1234567 },
            voyage: "402S",
            timestamp: dep,
          },
          {
            event: "DEPA",
            status: "SAILING",
            location: base.route.port_of_loading.location,
            vessel: { name: "MAERSK EDINBURGH", imo: 1234567 },
            voyage: "402S",
            timestamp: dep,
          },
          {
            event: "ARRV",
            status: base.status === "SAILING" ? "SAILING" : "ARRIVED",
            location: base.route.port_of_discharge.location,
            vessel: { name: "MAERSK EDINBURGH", imo: 1234567 },
            voyage: "402S",
            timestamp: arr,
          },
        ],
      },
    ],
  };
}
