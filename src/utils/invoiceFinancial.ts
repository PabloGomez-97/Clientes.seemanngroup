import { parseCurrencyFromDisplayValue } from "@/components/administrador/reporteria/financiera/quoteUtils";

export type InvoiceMoney = {
  value?: number;
  userString?: string;
};

export type InvoiceCharge = {
  description?: string;
  quantity?: number;
  unit?: string;
  rate?: number;
  amount?: number;
  exchangeRate?: number;
  notes?: string;
};

export type InvoiceLike = {
  id?: number;
  number?: string;
  type?: string | number;
  date?: string;
  dueDate?: string;
  status?: string | number;
  notes?: string;
  statementMemo?: string;
  updatedOn?: string;
  billTo?: { name?: string; identificationNumber?: string };
  billToAddress?: string;
  currency?: { abbr?: string; name?: string };
  amount?: InvoiceMoney;
  taxAmount?: InvoiceMoney;
  totalAmount?: InvoiceMoney;
  balanceDue?: InvoiceMoney;
  charges?: InvoiceCharge[];
  shipment?: {
    number?: string;
    waybillNumber?: string;
    customerReference?: string;
    departure?: string;
    arrival?: string;
    consignee?: { name?: string };
  };
  paymentTerm?: { name?: string };
};

export type ClientInvoiceStatus = "paid" | "pending" | "overdue";

const QUO_NUMBER_REGEX = /\bQUO\d+/i;

const LINBIS_ACCOUNTING_STATUS: Record<string, string> = {
  Empty: "empty",
  Pending: "pendingAccounting",
  Invoiced: "invoiced",
  Posted: "posted",
  Other: "other",
};

export function getInvoiceCurrencyCode(invoice: InvoiceLike): string {
  const abbr = invoice.currency?.abbr?.trim();
  if (abbr) return abbr.toUpperCase();
  return "USD";
}

export function formatMoneyAmount(
  money: InvoiceMoney | undefined,
  currency: string,
  formatCurrency: (value: number, currency?: string, decimals?: number) => string,
  decimals = 0,
): string {
  const userString = money?.userString?.trim();
  if (userString) return userString;
  return formatCurrency(money?.value ?? 0, currency, decimals);
}

export function getInvoiceBalanceDisplay(
  invoice: InvoiceLike,
  formatCurrency: (value: number, currency?: string, decimals?: number) => string,
): string {
  return formatMoneyAmount(
    invoice.balanceDue,
    getInvoiceCurrencyCode(invoice),
    formatCurrency,
  );
}

export function getInvoiceExchangeRateText(invoice: InvoiceLike): string | null {
  const charges = invoice.charges ?? [];
  const rates = [
    ...new Set(
      charges
        .map((charge) => charge.exchangeRate)
        .filter((rate): rate is number => typeof rate === "number" && rate > 0),
    ),
  ];

  if (rates.length === 1) {
    const documentCurrency = getInvoiceCurrencyCode(invoice);
    return `${rates[0].toLocaleString("es-CL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })} / ${documentCurrency}`;
  }

  return null;
}

export function getClientInvoiceStatus(invoice: InvoiceLike): ClientInvoiceStatus {
  const balance = invoice.balanceDue?.value ?? 0;
  if (balance <= 0) return "paid";

  if (invoice.dueDate) {
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dueDate < today) return "overdue";
  }

  return "pending";
}

export function getLinbisAccountingStatusKey(
  invoice: InvoiceLike,
): string | null {
  if (typeof invoice.status === "string" && invoice.status.trim()) {
    return LINBIS_ACCOUNTING_STATUS[invoice.status.trim()] ?? invoice.status;
  }
  return null;
}

export function getInvoiceTypeKey(invoice: InvoiceLike): string {
  const raw = invoice.type;
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (normalized.includes("credit")) return "creditMemo";
    return "invoice";
  }
  return "invoice";
}

export function extractQuoteNumberFromInvoice(
  invoice: InvoiceLike,
): string | null {
  const candidates = [
    invoice.statementMemo,
    invoice.notes,
    invoice.shipment?.customerReference,
    invoice.shipment?.number,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const match = candidate.match(QUO_NUMBER_REGEX);
    if (match) {
      return match[0].toUpperCase().split("-")[0];
    }
  }

  return null;
}

export function dedupeInvoiceCharges(charges: InvoiceCharge[]): InvoiceCharge[] {
  const unique: InvoiceCharge[] = [];
  const seen = new Set<string>();

  for (const charge of charges) {
    const key = `${charge.description}-${charge.quantity}-${charge.rate}-${charge.amount}-${charge.exchangeRate}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(charge);
  }

  return unique;
}

export function getPrimaryCurrencyFromInvoices(
  invoices: InvoiceLike[],
): string | null {
  const counts = new Map<string, number>();
  for (const invoice of invoices) {
    const currency = getInvoiceCurrencyCode(invoice);
    counts.set(currency, (counts.get(currency) ?? 0) + 1);
  }

  const entries = [...counts.entries()];
  if (entries.length !== 1) return null;
  return entries[0][0];
}

export function sumInvoicesInCurrency(
  invoices: InvoiceLike[],
  currency: string,
  field: "totalAmount" | "balanceDue",
): number {
  return invoices.reduce((sum, invoice) => {
    if (getInvoiceCurrencyCode(invoice) !== currency) return sum;
    return sum + (invoice[field]?.value ?? 0);
  }, 0);
}

export function parseQuoteCurrency(raw: Record<string, unknown>): string | null {
  return (
    parseCurrencyFromDisplayValue(raw.totalCharge_IncomeDisplayValue) ??
    parseCurrencyFromDisplayValue(raw.totalCharge_ExpenseDisplayValue) ??
    parseCurrencyFromDisplayValue(raw.totalCharge_ProfitDisplayValue) ??
    (typeof raw.currencyCode === "string" ? raw.currencyCode : null)
  );
}
