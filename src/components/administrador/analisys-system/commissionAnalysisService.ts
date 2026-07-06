import { linbisFetch } from "@/services/linbisFetch";
import { parseInputDate } from "@/components/administrador/reporteria/financiera/invoiceUtils";
import type {
  CommissionAnalysisInvoiceRow,
  CommissionAnalysisReport,
  CommissionAnalysisRepGroup,
  InvoiceReconciliationStatus,
  LinbisChargeRecord,
  LinbisInvoiceRecord,
  LinbisShipmentRecord,
} from "./types";

const LINBIS_JSON_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
} as const;

const CHARGES_URL = "https://api.linbis.com/shipments/allCharges";
const INVOICES_URL = "https://api.linbis.com/invoices/all";
const SHIPMENTS_URL = "https://api.linbis.com/shipments/all";

type DatasetCache = {
  fetchedAt: number;
  charges: LinbisChargeRecord[];
  invoices: LinbisInvoiceRecord[];
  shipments: LinbisShipmentRecord[];
};

type ModuleReconciliation = {
  orphanAllocation: Map<string, number>;
  unallocatedExpense: number;
  isComplete: boolean;
};

let datasetCache: DatasetCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseUsDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const month = parseInt(parts[0], 10);
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  if (Number.isNaN(month) || Number.isNaN(day) || Number.isNaN(year)) return null;
  return new Date(year, month - 1, day);
}

function isInDateRange(dateStr: string, start: Date, end: Date): boolean {
  const parsed = parseUsDate(dateStr);
  if (!parsed) return false;
  return parsed >= start && parsed <= end;
}

function invoiceIncomeOnModule(
  moduleCharges: LinbisChargeRecord[],
  invoiceNumber: string,
): number {
  return moduleCharges
    .filter((charge) => (charge.income?.invoice || "") === invoiceNumber)
    .reduce((sum, charge) => sum + (charge.income?.exchangeAmount || 0), 0);
}

function invoiceDirectExpenseOnModule(
  moduleCharges: LinbisChargeRecord[],
  invoiceNumber: string,
): number {
  return moduleCharges
    .filter((charge) => (charge.income?.invoice || "") === invoiceNumber)
    .reduce((sum, charge) => sum + (charge.expense?.exchangeAmount || 0), 0);
}

/**
 * Asigna gastos huérfanos (sin income.invoice) usando únicamente vínculos
 * explícitos expuestos por la API Linbis en los cargos del mismo módulo:
 * - expense.referenceNumber compartido con un cargo facturado
 * - expense.bill compartido con un cargo facturado
 */
function reconcileModuleOrphans(
  moduleCharges: LinbisChargeRecord[],
): ModuleReconciliation {
  const refToInvoice = new Map<string, string>();
  const billToInvoice = new Map<string, string>();

  for (const charge of moduleCharges) {
    const invoiceNumber = (charge.income?.invoice || "").trim();
    if (!invoiceNumber) continue;

    const referenceNumber = (charge.expense?.referenceNumber || "").trim();
    if (referenceNumber) refToInvoice.set(referenceNumber, invoiceNumber);

    const billNumber = (charge.expense?.bill || "").trim();
    if (billNumber) billToInvoice.set(billNumber, invoiceNumber);
  }

  const orphanAllocation = new Map<string, number>();
  let unallocatedExpense = 0;

  for (const charge of moduleCharges) {
    if (charge.income?.invoice) continue;

    const expenseAmount = charge.expense?.exchangeAmount || 0;
    if (expenseAmount <= 0) continue;

    const referenceNumber = (charge.expense?.referenceNumber || "").trim();
    const billNumber = (charge.expense?.bill || "").trim();

    const recipient =
      (referenceNumber ? refToInvoice.get(referenceNumber) : undefined) ||
      (billNumber ? billToInvoice.get(billNumber) : undefined) ||
      null;

    if (!recipient) {
      unallocatedExpense = round2(unallocatedExpense + expenseAmount);
      continue;
    }

    orphanAllocation.set(
      recipient,
      round2((orphanAllocation.get(recipient) || 0) + expenseAmount),
    );
  }

  return {
    orphanAllocation,
    unallocatedExpense,
    isComplete: unallocatedExpense === 0,
  };
}

function normalizeDivision(
  invoice: LinbisInvoiceRecord,
  shipment: LinbisShipmentRecord | null,
): string {
  const division = (invoice.divisionName || shipment?.division || "").trim();
  if (division) return division;
  if ((invoice.operationFlow || "").toLowerCase().includes("direct")) return "Direct";
  return "House";
}

function normalizeType(division: string): string {
  return division || "House";
}

function resolveShipmentRef(
  invoice: LinbisInvoiceRecord,
  shipment: LinbisShipmentRecord | null,
): string {
  const moduleNumber = (invoice.moduleNumber || "").trim();
  if (moduleNumber) return moduleNumber;
  return shipment?.waybillNumber?.trim() || shipment?.number?.trim() || "";
}

function sumNullable(values: Array<number | null>): number | null {
  if (values.some((value) => value == null)) return null;
  return round2(
    values.reduce<number>((sum, value) => sum + (value as number), 0),
  );
}

async function fetchDataset(
  accessToken: string,
  refreshAccessToken: () => Promise<string>,
  force = false,
): Promise<DatasetCache> {
  const now = Date.now();
  if (!force && datasetCache && now - datasetCache.fetchedAt < CACHE_TTL_MS) {
    return datasetCache;
  }

  const fetchJson = async (url: string) => {
    const response = await linbisFetch(
      url,
      { method: "GET", headers: LINBIS_JSON_HEADERS },
      accessToken,
      refreshAccessToken,
    );
    if (!response.ok) {
      throw new Error(`Error Linbis (${url}): ${response.status} ${response.statusText}`);
    }
    const payload = await response.json();
    return Array.isArray(payload) ? payload : [];
  };

  const [charges, invoices, shipments] = await Promise.all([
    fetchJson(CHARGES_URL) as Promise<LinbisChargeRecord[]>,
    fetchJson(INVOICES_URL) as Promise<LinbisInvoiceRecord[]>,
    fetchJson(SHIPMENTS_URL) as Promise<LinbisShipmentRecord[]>,
  ]);

  datasetCache = { fetchedAt: now, charges, invoices, shipments };
  return datasetCache;
}

export function clearCommissionAnalysisCache(): void {
  datasetCache = null;
}

export async function buildCommissionAnalysisReport(
  accessToken: string,
  refreshAccessToken: () => Promise<string>,
  options: {
    startDate: string;
    endDate: string;
    salesRep?: string;
    forceRefresh?: boolean;
  },
): Promise<CommissionAnalysisReport> {
  const { startDate, endDate, salesRep, forceRefresh = false } = options;
  const start = parseInputDate(startDate);
  const end = parseInputDate(endDate);

  if (!start || !end) {
    throw new Error("Rango de fechas inválido");
  }
  const endInclusive = new Date(end);
  endInclusive.setHours(23, 59, 59, 999);

  const { charges, invoices, shipments } = await fetchDataset(
    accessToken,
    refreshAccessToken,
    forceRefresh,
  );

  const invoiceByNumber = new Map(
    invoices.filter((invoice) => invoice.number).map((invoice) => [invoice.number, invoice]),
  );

  const shipmentByNumber = new Map<string, LinbisShipmentRecord>();
  const shipmentById = new Map<number, LinbisShipmentRecord>();
  for (const shipment of shipments) {
    if (shipment.id != null) shipmentById.set(shipment.id, shipment);
    if (shipment.number) shipmentByNumber.set(shipment.number, shipment);
    if (shipment.waybillNumber) shipmentByNumber.set(shipment.waybillNumber, shipment);
  }

  const chargesByModule = new Map<number, LinbisChargeRecord[]>();
  for (const charge of charges) {
    if (!chargesByModule.has(charge.moduleId)) {
      chargesByModule.set(charge.moduleId, []);
    }
    chargesByModule.get(charge.moduleId)!.push(charge);
  }

  const moduleReconciliationCache = new Map<number, ModuleReconciliation>();
  const getModuleReconciliation = (moduleId: number): ModuleReconciliation => {
    if (!moduleReconciliationCache.has(moduleId)) {
      moduleReconciliationCache.set(
        moduleId,
        reconcileModuleOrphans(chargesByModule.get(moduleId) || []),
      );
    }
    return moduleReconciliationCache.get(moduleId)!;
  };

  const chargesByInvoice = new Map<string, LinbisChargeRecord[]>();
  for (const charge of charges) {
    const invoiceNumber = charge.income?.invoice;
    if (!invoiceNumber) continue;
    if (!chargesByInvoice.has(invoiceNumber)) {
      chargesByInvoice.set(invoiceNumber, []);
    }
    chargesByInvoice.get(invoiceNumber)!.push(charge);
  }

  const rows: CommissionAnalysisInvoiceRow[] = [];
  let completeRows = 0;
  let incompleteRows = 0;
  let unallocatedExpenseTotal = 0;
  const modulesCountedForUnallocated = new Set<number>();

  for (const [invoiceNumber, invoiceCharges] of chargesByInvoice) {
    const invoice = invoiceByNumber.get(invoiceNumber);
    if (!invoice) continue;
    if (!isInDateRange(invoice.date, start, endInclusive)) continue;

    const rep = (invoice.salesRep || "").trim();
    if (salesRep && rep.toLowerCase() !== salesRep.trim().toLowerCase()) continue;

    const moduleId = invoiceCharges[0]?.moduleId ?? null;
    const moduleCharges =
      moduleId != null ? chargesByModule.get(moduleId) || [] : invoiceCharges;

    const income = round2(invoiceIncomeOnModule(moduleCharges, invoiceNumber));

    let expense: number | null = null;
    let profit: number | null = null;
    let reconciliationStatus: InvoiceReconciliationStatus = "incomplete";

    if (moduleId != null) {
      const reconciliation = getModuleReconciliation(moduleId);
      if (reconciliation.isComplete) {
        const directExpense = invoiceDirectExpenseOnModule(moduleCharges, invoiceNumber);
        const allocatedOrphans = reconciliation.orphanAllocation.get(invoiceNumber) || 0;
        expense = round2(directExpense + allocatedOrphans);
        profit = round2(income - expense);
        reconciliationStatus = "complete";
        completeRows += 1;
      } else {
        incompleteRows += 1;
        if (!modulesCountedForUnallocated.has(moduleId)) {
          modulesCountedForUnallocated.add(moduleId);
          unallocatedExpenseTotal = round2(
            unallocatedExpenseTotal + reconciliation.unallocatedExpense,
          );
        }
      }
    } else {
      const directExpense = invoiceDirectExpenseOnModule(moduleCharges, invoiceNumber);
      expense = round2(directExpense);
      profit = round2(income - expense);
      reconciliationStatus = "complete";
      completeRows += 1;
    }

    let shipment: LinbisShipmentRecord | null = null;
    const moduleRef = (invoice.moduleNumber || "").trim();
    if (moduleRef && shipmentByNumber.has(moduleRef)) {
      shipment = shipmentByNumber.get(moduleRef)!;
    } else if (moduleId != null && shipmentById.has(moduleId)) {
      shipment = shipmentById.get(moduleId)!;
    }

    const resolvedRep = rep || (shipment?.salesRep || "").trim() || "Sin representante";
    const division = normalizeDivision(invoice, shipment);
    const shipmentRef = resolveShipmentRef(invoice, shipment);

    rows.push({
      invoice: invoiceNumber,
      date: invoice.date,
      status: invoice.status || "",
      division,
      type: normalizeType(division),
      hawbHbl: shipmentRef,
      shipmentRef,
      billTo: (invoice.billToName || "").trim(),
      consignee: (shipment?.consignee || invoice.billToName || "").trim(),
      destination: (shipment?.finalDestination || shipment?.destination || "").trim(),
      income,
      expense,
      profit,
      commission: 0,
      salesRep: resolvedRep,
      moduleId,
      reconciliationStatus,
    });
  }

  rows.sort((a, b) => {
    const repCompare = a.salesRep.localeCompare(b.salesRep, "es");
    if (repCompare !== 0) return repCompare;
    const shipmentCompare = a.shipmentRef.localeCompare(b.shipmentRef, "es");
    if (shipmentCompare !== 0) return shipmentCompare;
    return (a.date || "").localeCompare(b.date || "");
  });

  const groupsMap = new Map<string, CommissionAnalysisRepGroup>();

  for (const row of rows) {
    if (!groupsMap.has(row.salesRep)) {
      groupsMap.set(row.salesRep, {
        salesRep: row.salesRep,
        rows: [],
        subtotal: { income: 0, expense: null, profit: null, commission: 0 },
      });
    }
    const group = groupsMap.get(row.salesRep)!;
    group.rows.push(row);
    group.subtotal.income = round2(group.subtotal.income + row.income);
    group.subtotal.commission = round2(group.subtotal.commission + row.commission);
  }

  const groups = Array.from(groupsMap.values())
    .map((group) => ({
      ...group,
      subtotal: {
        ...group.subtotal,
        expense: sumNullable(group.rows.map((row) => row.expense)),
        profit: sumNullable(group.rows.map((row) => row.profit)),
      },
    }))
    .sort((a, b) => a.salesRep.localeCompare(b.salesRep, "es"));

  const totals = {
    income: round2(rows.reduce((sum, row) => sum + row.income, 0)),
    expense: sumNullable(rows.map((row) => row.expense)),
    profit: sumNullable(rows.map((row) => row.profit)),
    commission: 0,
  };

  return {
    generatedAt: new Date(),
    startDate,
    endDate,
    groups,
    totals,
    invoiceCount: rows.length,
    reconciliation: {
      completeRows,
      incompleteRows,
      unallocatedExpenseTotal,
      isFullyReconciled: incompleteRows === 0,
    },
  };
}

export function formatCommissionAmount(value: number | null): string {
  if (value == null) return "—";
  return value.toLocaleString("es-CL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatReportDateRange(startDate: string, endDate: string): string {
  const format = (iso: string) => {
    const parsed = parseInputDate(iso);
    if (!parsed) return iso;
    const month = parsed.getMonth() + 1;
    const day = parsed.getDate();
    const year = parsed.getFullYear();
    return `${month}/${day}/${year}`;
  };
  return `${format(startDate)} to ${format(endDate)}`;
}
