export type OperacionCommodity = {
  description?: string | null;
  pieces?: number | null;
  totalWeightValue?: number | null;
  totalVolumeValue?: number | null;
  packageType?: { description?: string | null } | null;
  purchaseOrderNumber?: string | null;
  invoiceNumber?: string | null;
};

function asCommodity(value: unknown): OperacionCommodity | null {
  if (!value || typeof value !== "object") return null;
  return value as OperacionCommodity;
}

/** Igual que web: commodities del shipment + subShipments. */
export function getOperacionCommodities(shipment: unknown): OperacionCommodity[] {
  if (!shipment || typeof shipment !== "object") return [];
  const source = shipment as {
    commodities?: unknown;
    subShipments?: unknown;
  };
  const out: OperacionCommodity[] = [];

  if (Array.isArray(source.subShipments)) {
    for (const sub of source.subShipments) {
      if (!sub || typeof sub !== "object") continue;
      const commodities = (sub as { commodities?: unknown }).commodities;
      if (!Array.isArray(commodities)) continue;
      for (const item of commodities) {
        const commodity = asCommodity(item);
        if (commodity) out.push(commodity);
      }
    }
  }

  if (Array.isArray(source.commodities)) {
    for (const item of source.commodities) {
      const commodity = asCommodity(item);
      if (commodity) out.push(commodity);
    }
  }

  return out;
}

export function summarizeCommodities(commodities: OperacionCommodity[]): {
  pieces: number;
  weight: number;
  volume: number;
  packageTypes: string[];
} {
  const packageTypes = new Set<string>();
  let pieces = 0;
  let weight = 0;
  let volume = 0;

  for (const item of commodities) {
    pieces += Number(item.pieces) || 0;
    weight += Number(item.totalWeightValue) || 0;
    volume += Number(item.totalVolumeValue) || 0;
    const pack = item.packageType?.description?.trim();
    if (pack) packageTypes.add(pack);
  }

  return {
    pieces,
    weight,
    volume,
    packageTypes: [...packageTypes],
  };
}

export function formatMetric(
  value: number | null | undefined,
  unit?: string,
): string | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  const rounded =
    Math.abs(value) >= 100 ? String(Math.round(value)) : value.toFixed(1);
  return unit ? `${rounded} ${unit}` : rounded;
}
