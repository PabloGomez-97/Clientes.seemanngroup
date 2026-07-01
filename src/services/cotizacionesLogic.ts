export interface ClientQuote {
  id?: string | number;
  number?: string;
  date?: string;
  validUntil_Date?: string;
  transitDays?: number;
  customerReference?: string;
  origin?: string;
  destination?: string;
  currentFlow?: string;
  modeOfTransportation?: string | { name?: string };
  totalCargo_Pieces?: number;
  totalCargo_Container?: number;
  totalCargo_WeightDisplayValue?: string;
  totalCargo_VolumeDisplayValue?: string;
  totalCharge_IncomeDisplayValue?: string;
  paymentType?: string;
  hazardous?: string;
  cargoStatus?: string;
  carrierBroker?: string;
  salesRep?: string;
  notes?: string;
  deperture_Date?: string;
  arrival_Date?: string;
  [key: string]: unknown;
}

const FLOW_LABELS: Record<string, string> = {
  Requested: "Solicitado",
  Pricing: "Tarificación",
  Revision: "Revisión",
  Sent: "Enviado",
  Approved: "Aprobado",
  Completed: "Completado",
  Canceled: "Cancelado",
};

export function getQuoteDate(raw: Record<string, unknown>): string {
  const candidates = [
    raw.date,
    raw.createdAt,
    raw.created_at,
    raw.dateCreated,
    raw.createdDate,
    raw.creationDate,
    raw.quoteDate,
    raw.quotationDate,
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

function coerceQuoteDisplayString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "object") {
    const name = (value as { name?: unknown }).name;
    if (typeof name === "string") return name;
    if (typeof name === "number" && Number.isFinite(name)) return String(name);
  }
  return undefined;
}

export function normalizeClientQuote(raw: ClientQuote): ClientQuote {
  return {
    ...raw,
    date: getQuoteDate(raw),
    number:
      raw.number !== null && raw.number !== undefined
        ? String(raw.number)
        : raw.number,
    customerReference:
      raw.customerReference !== null && raw.customerReference !== undefined
        ? String(raw.customerReference)
        : raw.customerReference,
    origin: coerceQuoteDisplayString(raw.origin),
    destination: coerceQuoteDisplayString(raw.destination),
    carrierBroker: coerceQuoteDisplayString(raw.carrierBroker),
    salesRep: coerceQuoteDisplayString(raw.salesRep),
    paymentType: coerceQuoteDisplayString(raw.paymentType),
    hazardous: coerceQuoteDisplayString(raw.hazardous),
    cargoStatus: coerceQuoteDisplayString(raw.cargoStatus),
    notes:
      typeof raw.notes === "string"
        ? raw.notes
        : coerceQuoteDisplayString(raw.notes),
  };
}

export function getQuoteTransportModeLabel(quote: ClientQuote): string {
  const mode = quote.modeOfTransportation;
  if (typeof mode === "string") return mode;
  if (mode && typeof mode === "object") {
    const name = mode.name;
    if (typeof name === "string") return name;
  }
  return "";
}

export function getQuoteTransportDisplay(quote: ClientQuote): string {
  const label = getQuoteTransportModeLabel(quote);
  if (label) return label;
  const mode = quote.modeOfTransportation;
  if (mode === null || mode === undefined || mode === "") return "-";
  if (typeof mode === "object") {
    const name = mode.name;
    if (typeof name === "string" && name.trim()) return name;
    return "-";
  }
  return String(mode);
}

export function getQuoteFlowLabel(currentFlow?: string | null): string {
  const flow = currentFlow || "Requested";
  return FLOW_LABELS[flow] ?? flow;
}

export function isQuoteValid(validUntilDate?: string): boolean | null {
  if (!validUntilDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const until = new Date(validUntilDate);
  until.setHours(23, 59, 59, 999);
  return until >= today;
}

export function getQuoteValidityLabel(validUntilDate?: string): string {
  const valid = isQuoteValid(validUntilDate);
  if (valid === null) return "Sin vigencia";
  return valid ? "Vigente" : "Vencida";
}

export function sortQuotesByNumber(quotes: ClientQuote[]): ClientQuote[] {
  return [...quotes].sort((a, b) => {
    const nA = parseInt(String(a.number ?? "").replace(/\D/g, "") || "0", 10);
    const nB = parseInt(String(b.number ?? "").replace(/\D/g, "") || "0", 10);
    return nB - nA;
  });
}