import { linbisFetch } from "../../src/services/linbisFetch";

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

export type ShipmentRow = {
  id?: number;
  number?: string;
  customerReference?: string;
  modeOfTransportation?: string;
  origin?: string;
  destination?: string;
  departure?: string;
  arrival?: string;
  currentFlow?: string;
  lastEvent?: string;
  createdOn?: string;
  shipper?: string;
  totalCargo_Pieces?: number;
  totalCargo_WeightValue?: number;
  totalCargo_VolumeWeightValue?: number;
  [key: string]: unknown;
};

type LinbisOpts = {
  accessToken: string;
  refreshAccessToken: () => Promise<string>;
};

export async function fetchClientInvoices(
  consigneeName: string,
  page: number,
  opts: LinbisOpts,
): Promise<{ items: InvoiceRow[]; hasMore: boolean }> {
  const params = new URLSearchParams({
    ConsigneeName: consigneeName,
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
    },
    opts.accessToken,
    opts.refreshAccessToken,
  );
  if (!response.ok) {
    throw new Error(`Error ${response.status} al cargar facturas`);
  }
  const data = await response.json();
  const items: InvoiceRow[] = Array.isArray(data) ? data : [];
  return { items, hasMore: items.length === 50 };
}

export async function fetchClientShipmentsAll(
  consigneeName: string,
  page: number,
  opts: LinbisOpts,
): Promise<{ items: ShipmentRow[]; hasMore: boolean }> {
  const params = new URLSearchParams({
    ConsigneeName: consigneeName,
    Page: String(page),
    ItemsPerPage: "50",
    SortBy: "newest",
  });
  const response = await linbisFetch(
    `https://api.linbis.com/shipments/all?${params}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    },
    opts.accessToken,
    opts.refreshAccessToken,
  );
  if (!response.ok) {
    throw new Error(`Error ${response.status} al cargar embarques`);
  }
  const data = await response.json();
  const items: ShipmentRow[] = Array.isArray(data) ? data : [];
  return { items, hasMore: items.length === 50 };
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

export function classifyMode(mode?: string): "air" | "sea" | "ground" | "other" {
  if (!mode) return "other";
  const m = mode.toLowerCase();
  if (m.includes("40 - air") || m.includes("41 - air") || m.includes("air")) {
    return "air";
  }
  if (m.includes("10 - vessel") || m.includes("11 - vessel") || m.includes("vessel") || m.includes("ocean")) {
    return "sea";
  }
  if (m.includes("30 - truck") || m.includes("terrestre") || m.includes("truck")) {
    return "ground";
  }
  return "other";
}

export function formatShortDate(value?: string): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
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
  const list = shipments.filter(
    (s) => classifyMode(s.modeOfTransportation) === mode,
  );
  const count = list.length;
  let transitSum = 0;
  let transitN = 0;
  let weightSum = 0;
  for (const s of list) {
    weightSum += s.totalCargo_WeightValue || 0;
    if (s.departure && s.arrival) {
      const days =
        (new Date(s.arrival).getTime() - new Date(s.departure).getTime()) /
        86400000;
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

/** Agrega KPIs de reportería operacional (sin listado). */
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
    const mode = classifyMode(s.modeOfTransportation);
    if (mode === "air") air += 1;
    else if (mode === "sea") sea += 1;
    else if (mode === "ground") ground += 1;

    pieces += s.totalCargo_Pieces || 0;
    weightKg += s.totalCargo_WeightValue || 0;
    volumeM3 += s.totalCargo_VolumeWeightValue || 0;

    if (s.departure && s.arrival) {
      const days =
        (new Date(s.arrival).getTime() - new Date(s.departure).getTime()) /
        86400000;
      if (days > 0) {
        transitSum += days;
        transitCount += 1;
      }
    }

    const created = s.createdOn ? new Date(s.createdOn) : null;
    if (created && !Number.isNaN(created.getTime())) {
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

/** Carga páginas de embarques para KPIs (tope de seguridad). */
export async function fetchAllClientShipments(
  consigneeName: string,
  opts: LinbisOpts,
  maxPages = 20,
): Promise<ShipmentRow[]> {
  const all: ShipmentRow[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const result = await fetchClientShipmentsAll(consigneeName, page, opts);
    all.push(...result.items);
    if (!result.hasMore) break;
  }
  return all;
}
