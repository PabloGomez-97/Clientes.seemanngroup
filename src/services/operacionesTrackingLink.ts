import type { AirShipment } from "../types/shipments";
import type {
  AirShipment as ShipsgoAirShipment,
  OceanShipment as ShipsgoOceanShipment,
} from "../components/cliente/tracking/shipsgo/types";
import {
  extractHbliFromCharges,
  extractHbliFromCommodities,
} from "./linbisQuoteLookup";
import type { OceanListItem } from "./linbisShipmentMappers";
import {
  buildAirOpenTrackingTarget,
  buildOceanOpenTrackingTarget,
  matchesAirOpenTrackingTarget,
  matchesOceanOpenTrackingTarget,
  normalizeShipsgoAwbKey,
  normalizeShipsgoOceanKey,
  type ShipsGoOpenTrackingTarget,
} from "./shipsgoTrackingNavigation";

export type OperacionTrackingStatus = {
  isTracked: boolean;
  openTarget: ShipsGoOpenTrackingTarget | null;
  trackingLabel: string | null;
};

export function resolveAirOperacionTrackingNumber(
  shipment: AirShipment,
  trackingIndex: Record<string, string>,
): string | null {
  const shipmentNumber = shipment.number?.trim();
  if (shipmentNumber && trackingIndex[shipmentNumber]) {
    return trackingIndex[shipmentNumber];
  }
  if (
    typeof shipment.trackingNumber === "string" &&
    shipment.trackingNumber.trim()
  ) {
    return shipment.trackingNumber.trim();
  }
  return null;
}

export function getAirOperacionShipsgoLookupKeys(
  shipment: AirShipment,
  trackingIndex: Record<string, string>,
): string[] {
  const raw = [resolveAirOperacionTrackingNumber(shipment, trackingIndex), shipment.number];
  return [
    ...new Set(
      raw.map(normalizeShipsgoAwbKey).filter((key) => key.length > 0),
    ),
  ];
}

export function resolveOceanOperacionTrackingNumber(
  shipment: OceanListItem,
  trackingIndex: Record<string, string>,
): string | null {
  const shipmentNumber = shipment.number?.trim();
  if (shipmentNumber && trackingIndex[shipmentNumber]) {
    return trackingIndex[shipmentNumber];
  }
  if (
    typeof shipment.trackingNumber === "string" &&
    shipment.trackingNumber.trim()
  ) {
    return shipment.trackingNumber.trim();
  }
  return null;
}

export function getOceanOperacionContainerNumber(
  shipment: OceanListItem,
  containerHint?: string | null,
): string | null {
  const hint = containerHint?.trim();
  if (hint) return hint;

  const fromCommodities = extractHbliFromCommodities(shipment.commodities);
  if (fromCommodities.containerNumber) {
    return fromCommodities.containerNumber;
  }

  const tracking = shipment.trackingNumber?.trim().toUpperCase() ?? "";
  if (/^[A-Z]{4}[0-9]{7}$/.test(tracking)) {
    return tracking;
  }

  return null;
}

export function getOceanOperacionShipsgoLookupKeys(
  shipment: OceanListItem,
  trackingIndex: Record<string, string>,
  containerHint?: string | null,
): string[] {
  const raw = [
    resolveOceanOperacionTrackingNumber(shipment, trackingIndex),
    shipment.bookingNumber,
    getOceanOperacionContainerNumber(shipment, containerHint),
    shipment.waybillNumber,
  ];
  return [
    ...new Set(
      raw.map(normalizeShipsgoOceanKey).filter((key) => key.length > 0),
    ),
  ];
}

export function buildTrackedAwbSet(
  shipments: ShipsgoAirShipment[],
  activeUsername: string,
): Set<string> {
  const tracked = new Set<string>();
  for (const shipment of shipments) {
    if (shipment.reference !== activeUsername) continue;
    const key = normalizeShipsgoAwbKey(shipment.awb_number);
    if (key) tracked.add(key);
  }
  return tracked;
}

export function buildTrackedOceanKeySet(
  shipments: ShipsgoOceanShipment[],
  activeUsername: string,
): Set<string> {
  const tracked = new Set<string>();
  for (const shipment of shipments) {
    if (shipment.reference !== activeUsername) continue;
    for (const value of [
      shipment.container_number,
      shipment.booking_number,
    ]) {
      const key = normalizeShipsgoOceanKey(value);
      if (key) tracked.add(key);
    }
  }
  return tracked;
}

export function isAirOperacionTracked(
  shipment: AirShipment,
  trackingIndex: Record<string, string>,
  trackedAwbs: Set<string>,
): boolean {
  if (!trackedAwbs.size) return false;
  return getAirOperacionShipsgoLookupKeys(shipment, trackingIndex).some((key) =>
    trackedAwbs.has(key),
  );
}

export function isOceanOperacionTracked(
  shipment: OceanListItem,
  trackingIndex: Record<string, string>,
  trackedOceanKeys: Set<string>,
  containerHint?: string | null,
): boolean {
  if (!trackedOceanKeys.size) return false;
  return getOceanOperacionShipsgoLookupKeys(
    shipment,
    trackingIndex,
    containerHint,
  ).some((key) => trackedOceanKeys.has(key));
}

export function getAirOperacionTrackingStatus(
  shipment: AirShipment,
  trackingIndex: Record<string, string>,
  trackedAwbs: Set<string>,
): OperacionTrackingStatus {
  const trackingNumber = resolveAirOperacionTrackingNumber(shipment, trackingIndex);
  const isTracked = isAirOperacionTracked(shipment, trackingIndex, trackedAwbs);
  const awb =
    trackingNumber || shipment.waybillNumber?.trim() || shipment.number?.trim() || null;
  return {
    isTracked,
    openTarget: isTracked ? buildAirOpenTrackingTarget(awb) : null,
    trackingLabel: awb,
  };
}

export function getOceanOperacionTrackingStatus(
  shipment: OceanListItem,
  trackingIndex: Record<string, string>,
  trackedOceanKeys: Set<string>,
  containerHint?: string | null,
): OperacionTrackingStatus {
  const trackingNumber = resolveOceanOperacionTrackingNumber(
    shipment,
    trackingIndex,
  );
  const hbli = extractHbliFromCharges(shipment.charges);
  const containerNumber = getOceanOperacionContainerNumber(
    shipment,
    containerHint,
  );
  const isTracked = isOceanOperacionTracked(
    shipment,
    trackingIndex,
    trackedOceanKeys,
    containerHint,
  );
  const openTarget = isTracked
    ? buildOceanOpenTrackingTarget({
        containerNumber,
        bookingNumber: shipment.bookingNumber,
        trackingNumber,
      })
    : null;

  return {
    isTracked,
    openTarget,
    trackingLabel:
      trackingNumber ||
      shipment.bookingNumber?.trim() ||
      containerNumber ||
      shipment.waybillNumber?.trim() ||
      hbli ||
      null,
  };
}

/** Identificador usable para crear seguimiento (paridad web). */
export function getOceanTrackCreateIdentifier(
  shipment: OceanListItem,
  trackingIndex: Record<string, string>,
  containerHint?: string | null,
): {
  type: "container_number" | "booking_number";
  value: string;
} | null {
  const trackingNumber = resolveOceanOperacionTrackingNumber(
    shipment,
    trackingIndex,
  );
  const containerNumber = getOceanOperacionContainerNumber(
    shipment,
    containerHint,
  );
  const booking = shipment.bookingNumber?.trim();
  const waybill = shipment.waybillNumber?.trim();

  if (containerNumber) {
    return { type: "container_number", value: containerNumber };
  }
  if (booking) {
    return { type: "booking_number", value: booking };
  }
  if (trackingNumber && /^[A-Z]{4}[0-9]{7}$/i.test(trackingNumber)) {
    return { type: "container_number", value: trackingNumber };
  }
  if (trackingNumber) {
    return { type: "booking_number", value: trackingNumber };
  }
  if (waybill) {
    return { type: "booking_number", value: waybill };
  }
  return null;
}

export function findTrackedAirShipment(
  shipments: ShipsgoAirShipment[],
  target: ShipsGoOpenTrackingTarget,
  activeUsername: string,
): ShipsgoAirShipment | undefined {
  return shipments.find(
    (shipment) =>
      shipment.reference === activeUsername &&
      matchesAirOpenTrackingTarget(shipment.awb_number, target),
  );
}

export function findTrackedOceanShipment(
  shipments: ShipsgoOceanShipment[],
  target: ShipsGoOpenTrackingTarget,
  activeUsername: string,
): ShipsgoOceanShipment | undefined {
  return shipments.find(
    (shipment) =>
      shipment.reference === activeUsername &&
      matchesOceanOpenTrackingTarget(shipment, target),
  );
}
