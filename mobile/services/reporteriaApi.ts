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
