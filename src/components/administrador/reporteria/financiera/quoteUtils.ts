// Utilidades para normalizar cotizaciones Linbis en reportería de ejecutivos
//
// Quotes/filter (reportería por ejecutivo) devuelve un array reducido:
// number, salesRep, shipper, consignee, modeOfTransportation, status, date,
// origin, destination, totalIncome, totalExpense, profit, chargeDetails, customer
//
// GET /Quotes?ConsigneeName=... devuelve el objeto completo (~70 campos) con
// currentFlow, totalCharge_*DisplayValue, totalCharge_*Value, paymentType, etc.

export const LINBIS_FILTER_QUOTE_KEYS = [
  "number",
  "customer",
  "salesRep",
  "shipper",
  "consignee",
  "modeOfTransportation",
  "status",
  "date",
  "origin",
  "destination",
  "totalIncome",
  "totalExpense",
  "profit",
  "chargeDetails",
] as const;

export interface ExecutiveQuote {
  number: string;
  customer?: string;
  salesRep: string;
  shipper: string;
  consignee: string;
  modeOfTransportation: string;
  status: string;
  currentFlow: string;
  date: string;
  origin: string;
  destination: string;
  totalIncome: number;
  totalExpense: number;
  profit: number;
  currency: string | null;
  customerReference?: string;
  chargeDetails?: Record<string, unknown>[];
  [key: string]: unknown;
}
export type PeriodPreset =
  | "custom"
  | "this-month"
  | "last-month"
  | "this-year"
  | "last-year"
  | "last-12-months";

export const PERIOD_PRESET_LABELS: Record<PeriodPreset, string> = {
  custom: "Personalizado",
  "this-month": "Este mes",
  "last-month": "Mes anterior",
  "this-year": "Este año",
  "last-year": "Año anterior",
  "last-12-months": "Últimos 12 meses",
};

const MONTH_NAMES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export function parseLinbisAmount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const match = value.match(/[\d.,]+/);
    if (!match) return 0;
    const clean = match[0].replace(/,/g, "");
    const n = parseFloat(clean);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function getQuoteDate(quote: Record<string, unknown>): string {
  const candidates = [
    quote.date,
    quote.createdAt,
    quote.created_at,
    quote.dateCreated,
    quote.createdDate,
    quote.creationDate,
    quote.quoteDate,
    quote.quotationDate,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }

    if (
      candidate &&
      typeof candidate === "object" &&
      "displayDate" in candidate &&
      typeof (candidate as { displayDate?: unknown }).displayDate === "string"
    ) {
      const displayDate = (candidate as { displayDate: string }).displayDate;
      if (displayDate.trim()) return displayDate;
    }
  }

  return "";
}

/** Quotes/filter usa `status`; /Quotes paginado usa `currentFlow`. */
export function getQuoteStatus(quote: Record<string, unknown>): string {
  if (typeof quote.status === "string" && quote.status.trim()) {
    return quote.status.trim();
  }
  if (typeof quote.currentFlow === "string" && quote.currentFlow.trim()) {
    return quote.currentFlow.trim();
  }
  if (typeof quote.cargoStatus === "string" && quote.cargoStatus.trim()) {
    return quote.cargoStatus.trim();
  }
  return "";
}

export function parseCurrencyFromDisplayValue(display?: unknown): string | null {
  if (typeof display !== "string" || !display.trim()) return null;
  const value = display.trim();
  if (value.includes("USD")) return "USD";
  if (value.includes("CLP")) return "CLP";
  if (value.includes("EUR")) return "EUR";
  if (value.startsWith("$$")) return "CLP";
  const match = value.match(/\b([A-Z]{3})\b/);
  return match?.[1] ?? null;
}

export function formatExecutiveAmount(
  amount: number,
  currency?: string | null,
): string {
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  if (currency === "CLP") {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
  if (currency) {
    return `${currency} ${amount.toLocaleString("es-CL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return amount.toLocaleString("es-CL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function isQuoteCompleted(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return normalized === "completed" || normalized === "approved";
}

export function getSalesRepName(quote: Record<string, unknown>): string {
  const rep = quote.salesRep;
  if (typeof rep === "string") return rep.trim();
  if (rep && typeof rep === "object" && "name" in rep) {
    const name = (rep as { name?: unknown }).name;
    if (typeof name === "string") return name.trim();
  }
  return "";
}

export function getModeOfTransportation(quote: Record<string, unknown>): string {
  const mode = quote.modeOfTransportation;
  if (typeof mode === "string") return mode;
  if (mode && typeof mode === "object") {
    const name = (mode as { name?: unknown }).name;
    if (typeof name === "string") return name;
  }
  return "";
}

export function isAirMode(mode?: string): boolean {
  if (!mode) return false;
  const m = mode.toLowerCase();
  return m.includes("40 - air") || m.includes("41 - air") || m === "air";
}

export function isSeaMode(mode?: string): boolean {
  if (!mode) return false;
  const m = mode.toLowerCase();
  return (
    m.includes("10 - vessel") ||
    m.includes("11 - vessel") ||
    m.includes("vessel") ||
    m === "sea" ||
    m === "fcl" ||
    m === "lcl"
  );
}

export function isTruckMode(mode?: string): boolean {
  if (!mode) return false;
  const m = mode.toLowerCase();
  return m.includes("30 - truck") || m.includes("truck") || m.includes("terrestre");
}

export function getTransportShortLabel(mode?: string): string {
  if (isAirMode(mode)) return "Air";
  if (isSeaMode(mode)) return "Sea";
  if (isTruckMode(mode)) return "Truck";
  return mode || "Other";
}

export function normalizeExecutiveQuote(
  raw: Record<string, unknown>,
): ExecutiveQuote {
  const income = parseLinbisAmount(
    raw.totalIncome ??
      raw.totalCharge_IncomeValue ??
      raw.totalCharge_IncomeDisplayValue ??
      raw.totalCharge_Income,
  );
  const expense = parseLinbisAmount(
    raw.totalExpense ??
      raw.totalCharge_ExpenseValue ??
      raw.totalCharge_ExpenseDisplayValue ??
      raw.totalCharge_Expense,
  );
  let profit = parseLinbisAmount(
    raw.profit ??
      raw.totalCharge_ProfitValue ??
      raw.totalCharge_ProfitDisplayValue ??
      raw.totalCharge_Profit,
  );
  if (!profit && (income || expense)) profit = income - expense;

  const status = getQuoteStatus(raw);
  const currentFlow =
    typeof raw.currentFlow === "string" ? raw.currentFlow.trim() : status;
  const currency =
    parseCurrencyFromDisplayValue(raw.totalCharge_IncomeDisplayValue) ??
    parseCurrencyFromDisplayValue(raw.totalCharge_ExpenseDisplayValue) ??
    parseCurrencyFromDisplayValue(raw.totalCharge_ProfitDisplayValue);

  // Solo campos usados en reportería. Evitar `...raw` (chargeDetails y ~70
  // campos extra) para no saturar localStorage al cachear por ejecutivo/rango.
  return {
    number: String(raw.number ?? ""),
    customer: typeof raw.customer === "string" ? raw.customer : undefined,
    salesRep: getSalesRepName(raw),
    shipper: String(raw.shipper ?? ""),
    consignee: String(raw.consignee ?? ""),
    modeOfTransportation: getModeOfTransportation(raw),
    status,
    currentFlow,
    date: getQuoteDate(raw),
    origin: String(raw.origin ?? ""),
    destination: String(raw.destination ?? ""),
    totalIncome: income,
    totalExpense: expense,
    profit,
    currency,
    customerReference:
      typeof raw.customerReference === "string"
        ? raw.customerReference
        : undefined,
  };
}

export function extractQuotesFromResponse(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as Record<string, unknown>[];
    if (Array.isArray(obj.quotes)) return obj.quotes as Record<string, unknown>[];
    if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
  }
  return [];
}

export function filterQuotesBySalesRep(
  quotes: ExecutiveQuote[],
  salesRepName: string,
): ExecutiveQuote[] {
  const target = salesRepName.trim().toLowerCase();
  if (!target) return quotes;
  const matched = quotes.filter(
    (q) => q.salesRep.trim().toLowerCase() === target,
  );
  return matched.length > 0 ? matched : quotes;
}

export function filterQuotesByDateRange(
  quotes: ExecutiveQuote[],
  startDate?: string,
  endDate?: string,
): ExecutiveQuote[] {
  if (!startDate && !endDate) return quotes;
  const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const end = endDate ? new Date(`${endDate}T23:59:59.999`) : null;

  return quotes.filter((q) => {
    if (!q.date) return !start && !end;
    const d = new Date(q.date);
    if (Number.isNaN(d.getTime())) return false;
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });
}

export function toIsoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function getPeriodRange(
  preset: PeriodPreset,
): { startDate: string; endDate: string } {
  const today = new Date();

  switch (preset) {
    case "this-month": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: toIsoDate(start), endDate: toIsoDate(today) };
    }
    case "last-month": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
    }
    case "this-year": {
      const start = new Date(today.getFullYear(), 0, 1);
      return { startDate: toIsoDate(start), endDate: toIsoDate(today) };
    }
    case "last-year": {
      const start = new Date(today.getFullYear() - 1, 0, 1);
      const end = new Date(today.getFullYear() - 1, 11, 31);
      return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
    }
    case "last-12-months": {
      const start = new Date(today);
      start.setFullYear(start.getFullYear() - 1);
      return { startDate: toIsoDate(start), endDate: toIsoDate(today) };
    }
    default:
      return { startDate: "", endDate: "" };
  }
}

export interface MonthlyComparisonRow {
  month: string;
  label: string;
  executive1Quotes: number;
  executive2Quotes: number;
  executive1Profit: number;
  executive2Profit: number;
  executive1Income: number;
  executive2Income: number;
}

export function buildMonthlyComparison(
  quotes1: ExecutiveQuote[],
  quotes2: ExecutiveQuote[],
): MonthlyComparisonRow[] {
  const monthMap = new Map<
    string,
    { q1: ExecutiveQuote[]; q2: ExecutiveQuote[] }
  >();

  const addToMap = (quotes: ExecutiveQuote[], key: "q1" | "q2") => {
    quotes.forEach((q) => {
      if (!q.date) return;
      const d = new Date(q.date);
      if (Number.isNaN(d.getTime())) return;
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthMap.has(month)) monthMap.set(month, { q1: [], q2: [] });
      monthMap.get(month)![key].push(q);
    });
  };

  addToMap(quotes1, "q1");
  addToMap(quotes2, "q2");

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => {
      const [year, m] = month.split("-");
      const sum = (arr: ExecutiveQuote[], field: "profit" | "totalIncome") =>
        arr.reduce((s, q) => s + (q[field] || 0), 0);
      return {
        month,
        label: `${MONTH_NAMES[parseInt(m, 10) - 1]} ${year}`,
        executive1Quotes: data.q1.length,
        executive2Quotes: data.q2.length,
        executive1Profit: sum(data.q1, "profit"),
        executive2Profit: sum(data.q2, "profit"),
        executive1Income: sum(data.q1, "totalIncome"),
        executive2Income: sum(data.q2, "totalIncome"),
      };
    });
}

export interface GlobalMonthlyRow {
  month: string;
  label: string;
  quotes: number;
  income: number;
  profit: number;
  executives: number;
}

export function buildGlobalMonthlySummary(
  quotes: ExecutiveQuote[],
): GlobalMonthlyRow[] {
  const monthMap = new Map<string, ExecutiveQuote[]>();

  quotes.forEach((q) => {
    if (!q.date) return;
    const d = new Date(q.date);
    if (Number.isNaN(d.getTime())) return;
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap.has(month)) monthMap.set(month, []);
    monthMap.get(month)!.push(q);
  });

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, qs]) => {
      const [year, m] = month.split("-");
      const reps = new Set(qs.map((q) => q.salesRep).filter(Boolean));
      return {
        month,
        label: `${MONTH_NAMES[parseInt(m, 10) - 1]} ${year}`,
        quotes: qs.length,
        income: qs.reduce((s, q) => s + q.totalIncome, 0),
        profit: qs.reduce((s, q) => s + q.profit, 0),
        executives: reps.size,
      };
    });
}
