export type ShipsGoOpenTrackingTarget = {
  mode: "air" | "ocean";
  awbNumber?: string;
  containerNumber?: string;
  bookingNumber?: string;
};

export type ShipsGoTrackingLocationState = {
  openTab?: "air" | "ocean";
  openTracking?: ShipsGoOpenTrackingTarget;
};

export function buildShipsgoTrackingPath(
  mode: "air" | "ocean",
  identifier: string,
): string {
  const base =
    mode === "air" ? "/trackings-aereo" : "/trackings-maritimo";
  return `${base}/${encodeURIComponent(identifier.trim())}`;
}

export function buildOpenTrackingTargetFromPath(
  mode: "air" | "ocean",
  identifier?: string | null,
): ShipsGoOpenTrackingTarget | null {
  if (!identifier?.trim()) return null;
  return mode === "air"
    ? buildAirOpenTrackingTarget(identifier)
    : buildOceanOpenTrackingTarget({ trackingNumber: identifier });
}

export const normalizeShipsgoAwbKey = (value?: string | null) =>
  (value ?? "").replace(/[\s-]/g, "");

export const normalizeShipsgoOceanKey = (value?: string | null) =>
  (value ?? "").replace(/[\s-]/g, "").toUpperCase();

export function buildAirOpenTrackingTarget(
  awbNumber?: string | null,
): ShipsGoOpenTrackingTarget | null {
  const awb = awbNumber?.trim();
  if (!awb) return null;
  return { mode: "air", awbNumber: awb };
}

export function buildOceanOpenTrackingTarget(options: {
  containerNumber?: string | null;
  bookingNumber?: string | null;
  trackingNumber?: string | null;
}): ShipsGoOpenTrackingTarget | null {
  const container = options.containerNumber?.trim();
  const booking = options.bookingNumber?.trim();
  const tracking = options.trackingNumber?.trim();

  if (container) {
    return { mode: "ocean", containerNumber: container.toUpperCase() };
  }
  if (booking) {
    return { mode: "ocean", bookingNumber: booking };
  }
  if (tracking) {
    const upper = tracking.toUpperCase();
    if (/^[A-Z]{4}[0-9]{7}$/.test(upper)) {
      return { mode: "ocean", containerNumber: upper };
    }
    return { mode: "ocean", bookingNumber: tracking };
  }
  return null;
}

export function matchesAirOpenTrackingTarget(
  awbNumber: string | undefined | null,
  target: ShipsGoOpenTrackingTarget,
): boolean {
  const wanted = normalizeShipsgoAwbKey(target.awbNumber);
  if (!wanted) return false;
  return normalizeShipsgoAwbKey(awbNumber) === wanted;
}

export function matchesOceanOpenTrackingTarget(
  shipment: {
    container_number?: string | null;
    booking_number?: string | null;
  },
  target: ShipsGoOpenTrackingTarget,
): boolean {
  const wanted = [
    target.containerNumber,
    target.bookingNumber,
  ]
    .map(normalizeShipsgoOceanKey)
    .filter(Boolean);
  if (!wanted.length) return false;

  const available = [shipment.container_number, shipment.booking_number]
    .map(normalizeShipsgoOceanKey)
    .filter(Boolean);

  return wanted.some((key) => available.includes(key));
}
