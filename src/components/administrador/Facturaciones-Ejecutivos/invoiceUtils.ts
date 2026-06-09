// Utilidades para facturación de ejecutivos — API Linbis GET /invoices/all
//
// Respuesta: array de facturas (~11.000 registros, números únicos INV########).
// Montos en moneda documento (amount/totalAmount) y en moneda casa CLP (home*).
// No existe profit/expense en facturas; es reportería de ventas facturadas.

import { linbisFetch } from "../../../services/linbisFetch";
import {
  getPeriodRange,
  PERIOD_PRESET_LABELS,
  type PeriodPreset,
} from "./quoteUtils";

export { getPeriodRange, PERIOD_PRESET_LABELS, type PeriodPreset };

export const LINBIS_INVOICES_ALL_URL = "https://api.linbis.com/invoices/all";

export interface LinbisInvoice {
  id: number;
  number: string;
  type: string;
  billToName: string;
  salesRep: string | null;
  status: string;
  date: string;
  dueDate: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  currencyCode: string;
  homeCurrencyCode: string;
  homeAmount: number;
  homeTaxAmount: number;
  homeTotalAmount: number;
  balanceDue: number;
  amountPaid: number;
  paymentDate: string | null;
  statementMemo: string;
  moduleNumber: string;
  moduleType: string;
  charges: Array<{
    description: string;
    amount: number;
    exchangeRate: number;
    quantity: number;
    rate: number;
    unit: string;
  }>;
  [key: string]: unknown;
}

export interface InvoiceData {
  id: number;
  moduleNumber: string;
  shipmentRef: string;
  invoiceNumber: string;
  billToName: string;
  salesRep: string;
  type: string;
  status: string;
  date: string;
  dueDate: string;
  amount: number;
  totalAmount: number;
  currencyCode: string;
  homeTotalAmount: number;
  homeCurrencyCode: string;
  balanceDue: number;
  amountPaid: number;
  paymentDate: string | null;
}

export interface InvoiceStats {
  totalInvoices: number;
  invoicedCount: number;
  postedCount: number;
  totalAmount: number;
  totalHomeTotalAmount: number;
  totalBalanceDue: number;
  totalAmountPaid: number;
  averagePerInvoice: number;
  uniqueClients: number;
}

export interface ExecutiveInvoiceComparison {
  nombre: string;
  stats: InvoiceStats;
}

/** MM/DD/YYYY del API Linbis */
export function parseLinbisInvoiceDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const month = parseInt(parts[0], 10);
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  if (Number.isNaN(month) || Number.isNaN(day) || Number.isNaN(year)) {
    return null;
  }
  return new Date(year, month - 1, day);
}

export function parseInputDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  return new Date(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10),
  );
}

export function getShipmentRef(invoice: LinbisInvoice): string {
  return (invoice.statementMemo || invoice.moduleNumber || "").trim();
}

export function isSogShipment(ref: string): boolean {
  if (!ref) return false;
  const upper = ref.toUpperCase();
  return upper.startsWith("SOG") || upper.includes("/SOG") || upper.includes("SOG0");
}

export function mapLinbisInvoiceToData(invoice: LinbisInvoice): InvoiceData {
  const shipmentRef = getShipmentRef(invoice);
  return {
    id: invoice.id,
    moduleNumber: invoice.moduleNumber || shipmentRef,
    shipmentRef,
    invoiceNumber: invoice.number,
    billToName: invoice.billToName || "",
    salesRep: (invoice.salesRep || "").trim(),
    type: invoice.type || "",
    status: invoice.status || "",
    date: invoice.date || "",
    dueDate: invoice.dueDate || "",
    amount: invoice.amount || 0,
    totalAmount: invoice.totalAmount || 0,
    currencyCode: invoice.currencyCode || "",
    homeTotalAmount: invoice.homeTotalAmount || 0,
    homeCurrencyCode: invoice.homeCurrencyCode || "CLP",
    balanceDue: invoice.balanceDue || 0,
    amountPaid: invoice.amountPaid || 0,
    paymentDate: invoice.paymentDate,
  };
}

/**
 * Normaliza el payload de /invoices/all.
 * IMPORTANTE: cada `number` es único; NO deduplicar por shipmentRef/moduleNumber
 * (varias facturas pueden compartir el mismo embarque).
 */
export function normalizeInvoicesFromApi(data: unknown): LinbisInvoice[] {
  if (!Array.isArray(data)) return [];
  const byNumber = new Map<string, LinbisInvoice>();
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const inv = row as LinbisInvoice;
    const num = String(inv.number || "").trim();
    if (!num) continue;
    if (!byNumber.has(num)) byNumber.set(num, inv);
  }
  return Array.from(byNumber.values());
}

export function filterInvoices(
  invoices: InvoiceData[],
  options: {
    salesRep?: string;
    startDate?: string;
    endDate?: string;
    excludeSog?: boolean;
  },
): InvoiceData[] {
  const { salesRep, startDate, endDate, excludeSog = true } = options;
  const start = startDate ? parseInputDate(startDate) : null;
  const end = endDate
    ? new Date(`${endDate}T23:59:59.999`)
    : null;

  return invoices.filter((invoice) => {
    if (excludeSog && isSogShipment(invoice.shipmentRef)) return false;
    if (
      salesRep &&
      invoice.salesRep.toLowerCase() !== salesRep.trim().toLowerCase()
    ) {
      return false;
    }
    if (start || end) {
      const invoiceDate = parseLinbisInvoiceDate(invoice.date);
      if (!invoiceDate) return false;
      if (start && invoiceDate < start) return false;
      if (end && invoiceDate > end) return false;
    }
    return true;
  });
}

export function calculateInvoiceStats(
  invoicesArray: InvoiceData[],
): InvoiceStats {
  const totalInvoices = invoicesArray.length;
  const invoicedCount = invoicesArray.filter(
    (i) => i.status === "Invoiced",
  ).length;
  const postedCount = invoicesArray.filter(
    (i) => i.status === "Posted",
  ).length;
  const totalAmount = invoicesArray.reduce(
    (sum, i) => sum + (i.totalAmount || 0),
    0,
  );
  const totalHomeTotalAmount = invoicesArray.reduce(
    (sum, i) => sum + (i.homeTotalAmount || 0),
    0,
  );
  const totalBalanceDue = invoicesArray.reduce(
    (sum, i) => sum + (i.balanceDue || 0),
    0,
  );
  const totalAmountPaid = invoicesArray.reduce(
    (sum, i) => sum + (i.amountPaid || 0),
    0,
  );
  const uniqueClients = new Set(
    invoicesArray
      .map((i) => i.billToName?.trim())
      .filter((c) => c && c.length > 0),
  ).size;

  return {
    totalInvoices,
    invoicedCount,
    postedCount,
    totalAmount,
    totalHomeTotalAmount,
    totalBalanceDue,
    totalAmountPaid,
    averagePerInvoice:
      totalInvoices > 0 ? totalHomeTotalAmount / totalInvoices : 0,
    uniqueClients,
  };
}

export function groupInvoicesByMonth(invoicesArray: InvoiceData[]) {
  const monthMap: Record<string, InvoiceData[]> = {};

  invoicesArray.forEach((invoice) => {
    const d = parseLinbisInvoiceDate(invoice.date);
    if (!d) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap[key]) monthMap[key] = [];
    monthMap[key].push(invoice);
  });

  return monthMap;
}

export function formatInvoiceCurrency(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatFetchedAt(value: string | null): string | null {
  if (!value) return null;
  const asNumber = Number(value);
  const date = Number.isFinite(asNumber)
    ? new Date(asNumber)
    : new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleString("es-CL");
}

let invoicesAllCache: {
  data: LinbisInvoice[];
  fetchedAt: number;
} | null = null;

const INVOICES_CACHE_TTL_MS = 5 * 60 * 1000;

export async function fetchLinbisInvoicesAll(
  accessToken: string,
  refreshAccessToken: () => Promise<string>,
  force = false,
): Promise<{ raw: LinbisInvoice[]; mapped: InvoiceData[]; fetchedAt: number }> {
  const now = Date.now();
  if (
    !force &&
    invoicesAllCache &&
    now - invoicesAllCache.fetchedAt < INVOICES_CACHE_TTL_MS
  ) {
    const mapped = invoicesAllCache.data.map(mapLinbisInvoiceToData);
    return {
      raw: invoicesAllCache.data,
      mapped,
      fetchedAt: invoicesAllCache.fetchedAt,
    };
  }

  const response = await linbisFetch(
    LINBIS_INVOICES_ALL_URL,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    },
    accessToken,
    refreshAccessToken,
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Token inválido o expirado");
    }
    throw new Error(`Error al obtener invoices: ${response.statusText}`);
  }

  const data = await response.json();
  const raw = normalizeInvoicesFromApi(data);
  invoicesAllCache = { data: raw, fetchedAt: now };
  return { raw, mapped: raw.map(mapLinbisInvoiceToData), fetchedAt: now };
}

export function buildExecutiveComparisons(
  invoices: InvoiceData[],
  knownExecutives: string[] = [],
): ExecutiveInvoiceComparison[] {
  const grouped: Record<string, InvoiceData[]> = {};

  invoices.forEach((invoice) => {
    const rep = invoice.salesRep?.trim();
    if (!rep) return;
    if (!grouped[rep]) grouped[rep] = [];
    grouped[rep].push(invoice);
  });

  const names = new Set([...Object.keys(grouped), ...knownExecutives]);
  return Array.from(names)
    .filter(Boolean)
    .map((nombre) => ({
      nombre,
      stats: calculateInvoiceStats(grouped[nombre] || []),
    }))
    .sort((a, b) => b.stats.totalHomeTotalAmount - a.stats.totalHomeTotalAmount);
}
