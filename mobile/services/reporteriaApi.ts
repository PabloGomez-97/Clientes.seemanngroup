import { linbisFetch } from "../../src/services/linbisFetch";
import {
  matchesConsigneeName,
  normalizeShipmentKey,
} from "../../src/utils/linbisClientFilter";

export type InvoiceRow = {
  id?: number;
  number?: string;
  date?: string;
  dueDate?: string;
  status?: string | number;
  notes?: string;
  currency?: { abbr?: string };
  totalAmount?: { value?: number; userString?: string };
  balanceDue?: { value?: number; userString?: string };
  amount?: { value?: number; userString?: string };
  taxAmount?: { value?: number; userString?: string };
  shipment?: {
    number?: string;
    customerReference?: string;
  };
  [key: string]: unknown;
};

/** Operación de reportería = Shipping Order SOG (misma lógica que web). */
export type ShipmentRow = {
  id?: number;
  number?: string;
  createdOn?: string;
  departure?: string;
  arrival?: string;
  origin?: string;
  destination?: string;
  /** 1/Air, 2/Ocean, 3/Ground (Linbis ShippingOrderType). */
  orderType?: number | string;
  currentFlow?: string;
  shipper?: string;
  consignee?: string;
  totalCargo_Pieces?: number;
  totalCargo_WeightValue?: number;
  totalCargo_VolumeWeightValue?: number;
};

type LinbisOpts = {
  accessToken: string;
  refreshAccessToken: () => Promise<string>;
  signal?: AbortSignal;
};

type LinbisDateLike =
  | string
  | { date?: string | null; displayDate?: string | null }
  | null
  | undefined;

type LinbisLocationLike =
  | string
  | { name?: string | null; code?: string | null }
  | null
  | undefined;

type LinbisPartyLike = string | { name?: string | null } | null | undefined;

type ShippingOrdersPage = {
  items?: unknown[];
  pageIndex?: number;
  totalPages?: number;
  totalCount?: number;
  hasNextPage?: boolean;
};

const SHIPPING_ORDERS_URL = "https://api.linbis.com/api/shipping-orders";
const PAGE_SIZE = 100;
const MAX_PAGES = 50;

export async function fetchClientInvoices(
  consigneeName: string,
  page: number,
  opts: LinbisOpts,
): Promise<{ items: InvoiceRow[]; hasMore: boolean }> {
  const name = consigneeName.trim();
  if (!name) {
    throw new Error("ConsigneeName es obligatorio para consultar facturas.");
  }
  if (!Number.isInteger(page) || page < 1) {
    throw new Error("Page inválido para consultar facturas.");
  }

  const params = new URLSearchParams({
    ConsigneeName: name,
    Page: String(page),
    ItemsPerPage: "50",
    SortBy: "newest",
  });
  const response = await linbisFetch(
    `https://api.linbis.com/invoices?${params}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      signal: opts.signal,
    },
    opts.accessToken,
    opts.refreshAccessToken,
  );
  if (!response.ok) {
    throw new Error(`Error ${response.status} al cargar facturas`);
  }
  const data: unknown = await response.json();
  const items: InvoiceRow[] = Array.isArray(data) ? (data as InvoiceRow[]) : [];
  return { items, hasMore: items.length === 50 };
}

function isSogNumber(number?: string | null): boolean {
  return /^SOG/i.test((number ?? "").trim());
}

function parseLinbisDate(value?: LinbisDateLike): Date | null {
  if (value == null) return null;
  const raw =
    typeof value === "string"
      ? value.trim()
      : String(value.displayDate ?? value.date ?? "").trim();
  if (!raw) return null;
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  if (us) {
    const d = new Date(Number(us[3]), Number(us[1]) - 1, Number(us[2]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateToIsoString(value?: LinbisDateLike): string | undefined {
  const d = parseLinbisDate(value);
  return d ? d.toISOString() : undefined;
}

function locationName(value?: LinbisLocationLike): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value.trim() || undefined;
  return value.name?.trim() || value.code?.trim() || undefined;
}

function partyName(value?: LinbisPartyLike): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value.trim() || undefined;
  return value.name?.trim() || undefined;
}

function shipmentIdentity(s: ShipmentRow): string | null {
  if (typeof s.id === "number" && Number.isFinite(s.id)) return `id:${s.id}`;
  const number = normalizeShipmentKey(s.number);
  return number ? `num:${number}` : null;
}

function shipmentTimestamp(s: ShipmentRow): number {
  return (
    parseLinbisDate(s.createdOn)?.getTime() ??
    parseLinbisDate(s.departure)?.getTime() ??
    0
  );
}

function mapShippingOrderToShipment(
  raw: Record<string, unknown>,
): ShipmentRow | null {
  const number = typeof raw.number === "string" ? raw.number.trim() : "";
  if (!isSogNumber(number)) return null;

  const consignee = partyName(raw.consignee as LinbisPartyLike);
  const cargo =
    raw.totalCargo && typeof raw.totalCargo === "object"
      ? (raw.totalCargo as Record<string, unknown>)
      : null;
  const weightObj =
    cargo?.weight && typeof cargo.weight === "object"
      ? (cargo.weight as { value?: number })
      : null;
  const volumeWeightObj =
    cargo?.volumeWeight && typeof cargo.volumeWeight === "object"
      ? (cargo.volumeWeight as { value?: number })
      : null;

  return {
    id: typeof raw.id === "number" ? raw.id : undefined,
    number,
    createdOn:
      dateToIsoString(raw.orderDate as LinbisDateLike) ??
      dateToIsoString(raw.executedOnDate as LinbisDateLike),
    departure: dateToIsoString(raw.departureDate as LinbisDateLike),
    arrival: dateToIsoString(raw.arrivalDate as LinbisDateLike),
    origin:
      locationName(raw.origin as LinbisLocationLike) ??
      locationName(raw.from as LinbisLocationLike) ??
      locationName(raw.executedAt as LinbisLocationLike) ??
      locationName(raw.portOfLoading as LinbisLocationLike),
    destination:
      locationName(raw.destination as LinbisLocationLike) ??
      locationName(raw.to as LinbisLocationLike) ??
      locationName(raw.portOfUnloading as LinbisLocationLike),
    orderType: raw.orderType as number | string | undefined,
    currentFlow:
      typeof raw.operationFlow === "string" ? raw.operationFlow : undefined,
    totalCargo_Pieces:
      typeof cargo?.pieces === "number" ? cargo.pieces : undefined,
    totalCargo_WeightValue:
      typeof cargo?.weightValue === "number"
        ? cargo.weightValue
        : typeof weightObj?.value === "number"
          ? weightObj.value
          : undefined,
    totalCargo_VolumeWeightValue:
      typeof cargo?.volumeWeightValue === "number"
        ? cargo.volumeWeightValue
        : typeof volumeWeightObj?.value === "number"
          ? volumeWeightObj.value
          : undefined,
    shipper: partyName(raw.shipper as LinbisPartyLike),
    consignee,
  };
}

function normalizeShippingOrdersForConsignee(
  records: unknown[],
  consigneeName: string,
): ShipmentRow[] {
  const seen = new Set<string>();
  const list: ShipmentRow[] = [];

  for (const record of records) {
    if (!record || typeof record !== "object") continue;
    const mapped = mapShippingOrderToShipment(record as Record<string, unknown>);
    if (!mapped) continue;
    if (!matchesConsigneeName(mapped.consignee, consigneeName)) continue;

    const key = shipmentIdentity(mapped);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    list.push(mapped);
  }

  return list.sort((a, b) => shipmentTimestamp(b) - shipmentTimestamp(a));
}

/**
 * Fuente de verdad operativa (igual que web):
 * GET /api/shipping-orders?ConsigneeName=… → solo SOG.
 */
export async function fetchAllClientShipments(
  consigneeName: string,
  opts: LinbisOpts,
  maxPages = MAX_PAGES,
): Promise<ShipmentRow[]> {
  const name = consigneeName.trim();
  if (!name) {
    throw new Error("ConsigneeName es obligatorio para consultar operaciones.");
  }
  if (!Number.isInteger(maxPages) || maxPages < 1) {
    throw new Error("maxPages inválido para consultar operaciones.");
  }

  const allRaw: unknown[] = [];
  let page = 1;
  const pageCap = Math.min(maxPages, MAX_PAGES);

  while (page <= pageCap) {
    if (opts.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const params = new URLSearchParams({
      ConsigneeName: name,
      PageNumber: page.toString(),
      PageSize: PAGE_SIZE.toString(),
    });

    const response = await linbisFetch(
      `${SHIPPING_ORDERS_URL}?${params}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        signal: opts.signal,
      },
      opts.accessToken,
      opts.refreshAccessToken,
    );

    if (!response.ok) {
      throw new Error(`Error ${response.status} al cargar embarques`);
    }

    const data: unknown = await response.json();
    if (!data || typeof data !== "object") {
      throw new Error("Respuesta inesperada de Linbis (shipping-orders).");
    }

    const pageData = (data as { shippingOrders?: ShippingOrdersPage })
      .shippingOrders;
    const items = Array.isArray(pageData?.items) ? pageData.items : [];
    allRaw.push(...items);

    const hasNext =
      pageData?.hasNextPage === true ||
      (typeof pageData?.totalPages === "number" && page < pageData.totalPages);

    if (!hasNext || items.length < PAGE_SIZE) break;
    page += 1;
  }

  return normalizeShippingOrdersForConsignee(allRaw, name);
}

export function moneyLabel(invoice: InvoiceRow): string {
  const total =
    invoice.totalAmount?.userString ||
    invoice.amount?.userString ||
    (invoice.totalAmount?.value != null
      ? `${invoice.currency?.abbr || "USD"} ${invoice.totalAmount.value}`
      : "—");
  return total;
}

/** Clasifica por orderType de Shipping Order (Air/Ocean/Ground). */
export function classifyMode(
  orderType?: number | string,
): "air" | "sea" | "ground" | "other" {
  if (orderType === 1 || orderType === "1" || orderType === "Air") return "air";
  if (orderType === 2 || orderType === "2" || orderType === "Ocean") return "sea";
  if (orderType === 3 || orderType === "3" || orderType === "Ground") {
    return "ground";
  }
  return "other";
}

export function formatShortDate(value?: string): string {
  if (!value) return "—";
  const date = parseLinbisDate(value);
  if (!date) return "—";
  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function shortenLocation(value: string): string {
  const raw = value.trim();
  if (!raw) return "—";
  const paren = raw.match(/\(([A-Z0-9]{2,5})\)\s*$/i);
  if (paren) return paren[1].toUpperCase();
  if (raw.length <= 18) return raw;
  return `${raw.slice(0, 16)}…`;
}

export type OperationalModeStats = {
  count: number;
  pct: number;
  avgTransitDays: number;
  avgWeightKg: number;
};

export type OperationalDashboard = {
  total: number;
  air: number;
  sea: number;
  ground: number;
  pieces: number;
  weightKg: number;
  volumeM3: number;
  avgTransitDays: number;
  year: {
    current: number;
    previous: number;
    growthPct: number;
    currentYear: number;
    previousYear: number;
  };
  modeShare: Array<{
    key: "air" | "sea" | "ground";
    label: string;
    count: number;
    pct: number;
  }>;
  perfByMode: Array<{
    key: "air" | "sea" | "ground";
    label: string;
    stats: OperationalModeStats;
  }>;
  topRoutes: Array<{ route: string; count: number; pct: number }>;
  topDestinations: Array<{ destination: string; count: number; pct: number }>;
  monthly: Array<{
    key: string;
    label: string;
    total: number;
    air: number;
    sea: number;
    ground: number;
  }>;
};

function modePerf(
  shipments: ShipmentRow[],
  mode: "air" | "sea" | "ground",
  total: number,
): OperationalModeStats {
  const list = shipments.filter((s) => classifyMode(s.orderType) === mode);
  const count = list.length;
  let transitSum = 0;
  let transitN = 0;
  let weightSum = 0;
  for (const s of list) {
    weightSum += s.totalCargo_WeightValue || 0;
    const dep = parseLinbisDate(s.departure);
    const arr = parseLinbisDate(s.arrival);
    if (dep && arr) {
      const days = (arr.getTime() - dep.getTime()) / 86400000;
      if (days > 0) {
        transitSum += days;
        transitN += 1;
      }
    }
  }
  return {
    count,
    pct: total > 0 ? (count / total) * 100 : 0,
    avgTransitDays: transitN > 0 ? transitSum / transitN : 0,
    avgWeightKg: count > 0 ? weightSum / count : 0,
  };
}

export function computeOperationalDashboard(
  shipments: ShipmentRow[],
): OperationalDashboard {
  const total = shipments.length;
  let air = 0;
  let sea = 0;
  let ground = 0;
  let pieces = 0;
  let weightKg = 0;
  let volumeM3 = 0;
  let transitSum = 0;
  let transitCount = 0;

  const cy = new Date().getFullYear();
  const py = cy - 1;
  let yearCurr = 0;
  let yearPrev = 0;

  const routeMap = new Map<string, number>();
  const destMap = new Map<string, number>();
  const monthMap = new Map<
    string,
    { air: number; sea: number; ground: number }
  >();

  for (const s of shipments) {
    const mode = classifyMode(s.orderType);
    if (mode === "air") air += 1;
    else if (mode === "sea") sea += 1;
    else if (mode === "ground") ground += 1;

    pieces += s.totalCargo_Pieces || 0;
    weightKg += s.totalCargo_WeightValue || 0;
    volumeM3 += s.totalCargo_VolumeWeightValue || 0;

    const dep = parseLinbisDate(s.departure);
    const arr = parseLinbisDate(s.arrival);
    if (dep && arr) {
      const days = (arr.getTime() - dep.getTime()) / 86400000;
      if (days > 0) {
        transitSum += days;
        transitCount += 1;
      }
    }

    const created =
      parseLinbisDate(s.createdOn) ?? parseLinbisDate(s.departure);
    if (created) {
      const y = created.getFullYear();
      if (y === cy) yearCurr += 1;
      else if (y === py) yearPrev += 1;

      const mk = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
      if (!monthMap.has(mk)) monthMap.set(mk, { air: 0, sea: 0, ground: 0 });
      const bucket = monthMap.get(mk)!;
      if (mode === "air") bucket.air += 1;
      else if (mode === "sea") bucket.sea += 1;
      else if (mode === "ground") bucket.ground += 1;
    }

    if (s.origin && s.destination) {
      const route = `${s.origin} → ${s.destination}`;
      routeMap.set(route, (routeMap.get(route) || 0) + 1);
    }
    if (s.destination) {
      destMap.set(s.destination, (destMap.get(s.destination) || 0) + 1);
    }
  }

  const modeShare = (
    [
      ["air", "Aéreo", air],
      ["sea", "Marítimo", sea],
      ["ground", "Terrestre", ground],
    ] as const
  ).map(([key, label, count]) => ({
    key,
    label,
    count,
    pct: total > 0 ? (count / total) * 100 : 0,
  }));

  const perfByMode = (
    [
      ["air", "Aéreo"],
      ["sea", "Marítimo"],
      ["ground", "Terrestre"],
    ] as const
  ).map(([key, label]) => ({
    key,
    label,
    stats: modePerf(shipments, key, total),
  }));

  const topRoutes = Array.from(routeMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([route, count]) => {
      const [o, d] = route.split(" → ");
      return {
        route: `${shortenLocation(o || "")} → ${shortenLocation(d || "")}`,
        count,
        pct: total > 0 ? (count / total) * 100 : 0,
      };
    });

  const topDestinations = Array.from(destMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([destination, count]) => ({
      destination: shortenLocation(destination),
      count,
      pct: total > 0 ? (count / total) * 100 : 0,
    }));

  const monthly = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, d]) => ({
      key,
      label: new Date(`${key}-01`).toLocaleDateString("es-CL", {
        month: "short",
        year: "2-digit",
      }),
      total: d.air + d.sea + d.ground,
      air: d.air,
      sea: d.sea,
      ground: d.ground,
    }));

  return {
    total,
    air,
    sea,
    ground,
    pieces,
    weightKg,
    volumeM3,
    avgTransitDays: transitCount > 0 ? transitSum / transitCount : 0,
    year: {
      current: yearCurr,
      previous: yearPrev,
      growthPct: yearPrev > 0 ? ((yearCurr - yearPrev) / yearPrev) * 100 : 0,
      currentYear: cy,
      previousYear: py,
    },
    modeShare,
    perfByMode,
    topRoutes,
    topDestinations,
    monthly,
  };
}
