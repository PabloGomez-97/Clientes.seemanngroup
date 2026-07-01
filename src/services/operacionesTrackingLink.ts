import type { AirShipment } from "../types/shipments.js";
import type {
  AirShipment as ShipsgoAirShipment,
  OceanShipment as ShipsgoOceanShipment,
} from "../components/cliente/tracking/shipsgo/types.js";
import {
  extractHbliFromCharges,
  extractHbliFromCommodities,
} from "./linbisQuoteLookup.js";
import type { OceanListItem } from "./linbisShipmentMappers.js";
import {
  buildAirOpenTrackingTarget,
  buildOceanOpenTrackingTarget,
  matchesAirOpenTrackingTarget,
  matchesOceanOpenTrackingTarget,
  normalizeShipsgoAwbKey,
  normalizeShipsgoOceanKey,
  type ShipsGoOpenTrackingTarget,
} from "./shipsgoTrackingNavigation.js";

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
): string | null {
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
): string[] {
  const raw = [
    resolveOceanOperacionTrackingNumber(shipment, trackingIndex),
    shipment.bookingNumber,
    getOceanOperacionContainerNumber(shipment),
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
): boolean {
  if (!trackedOceanKeys.size) return false;
  return getOceanOperacionShipsgoLookupKeys(shipment, trackingIndex).some((key) =>
    trackedOceanKeys.has(key),
  );
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
): OperacionTrackingStatus {
  const trackingNumber = resolveOceanOperacionTrackingNumber(
    shipment,
    trackingIndex,
  );
  const hbli = extractHbliFromCharges(shipment.charges);
  const containerNumber = getOceanOperacionContainerNumber(shipment);
  const isTracked = isOceanOperacionTracked(
    shipment,
    trackingIndex,
    trackedOceanKeys,
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
      containerNumber ||
      trackingNumber ||
      shipment.bookingNumber?.trim() ||
      hbli ||
      null,
  };
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
