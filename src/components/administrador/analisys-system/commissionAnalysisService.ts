import { linbisFetch } from "@/services/linbisFetch";
import { parseInputDate } from "@/components/administrador/reporteria/financiera/invoiceUtils";
import {
  applyModuleSalesRepPropagation,
  buildBillToSalesRepIndex,
  buildSalesRepResolver,
  type TransportShipmentRecord,
} from "./salesRepResolver";
import { clearCommissionAnalyticsDerivatives } from "./commissionAnalytics";
import type {
  CommissionAnalysisInvoiceRow,
  CommissionAnalysisOperationsGroup,
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
const AIR_SHIPMENTS_URL = "https://api.linbis.com/air-shipments/all";
const GROUND_SHIPMENTS_URL = "https://api.linbis.com/ground-shipments/all";
const ACCOUNTS_LIST_URL = "https://api.linbis.com/accounts/list?take=10000";
const SALESREPS_LIST_URL = "https://api.linbis.com/salesreps/list?take=100";

type LinbisAccountListRecord = {
  id: number;
  salesRepId?: number | null;
};

type LinbisSalesRepListRecord = {
  id: number;
  name?: string | null;
};

/** Etiqueta solo cuando ninguna fuente de la API permite inferir ejecutivo. */
const PENDING_SALES_REP = "Pendiente de asignación";

type DatasetCache = {
  fetchedAt: number;
  invoices: LinbisInvoiceRecord[];
  shipments: LinbisShipmentRecord[];
  airShipments: TransportShipmentRecord[];
  groundShipments: TransportShipmentRecord[];
  accounts: LinbisAccountListRecord[];
  salesReps: LinbisSalesRepListRecord[];
  charges: LinbisChargeRecord[] | null;
};

type ModuleReconciliation = {
  orphanAllocation: Map<string, number>;
  unallocatedExpense: number;
  isComplete: boolean;
};

let datasetCache: DatasetCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

function finalizeSalesRep(resolved: string): string {
  const rep = resolved.trim();
  return rep || PENDING_SALES_REP;
}

function buildQuoteSalesRepIndex(
  airShipments: TransportShipmentRecord[],
): Map<string, string> {
  const index = new Map<string, string>();
  for (const shipment of airShipments) {
    const quoteNumber = (shipment.quoteNumber || "").trim();
    const quoteSalesRep = (shipment.quoteSalesRep || "").trim();
    if (quoteNumber && quoteSalesRep) index.set(quoteNumber, quoteSalesRep);
  }
  return index;
}

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

function distributeProportional(
  total: number,
  weights: Map<string, number>,
): Map<string, number> {
  const result = new Map<string, number>();
  const entries = [...weights.entries()];
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (total <= 0 || totalWeight <= 0) return result;

  let allocated = 0;
  for (let index = 0; index < entries.length; index++) {
    const [invoice, weight] = entries[index];
    const share =
      index === entries.length - 1
        ? round2(total - allocated)
        : round2((total * weight) / totalWeight);
    allocated = round2(allocated + share);
    if (share !== 0) result.set(invoice, share);
  }
  return result;
}

/**
 * Asigna gastos huérfanos (sin income.invoice) en el mismo módulo:
 * 1. Vínculos explícitos: expense.invoice, expense.referenceNumber o expense.bill
 *    compartidos con cargos facturados (incluye income.referenceNumber).
 * 2. Residuo: reparto proporcional por gasto directo de cada factura; si no hay,
 *    por ingreso facturado en el módulo.
 */
function reconcileModuleOrphans(
  moduleCharges: LinbisChargeRecord[],
): ModuleReconciliation {
  const refToInvoice = new Map<string, string>();
  const billToInvoice = new Map<string, string>();
  const invoicesOnModule = new Set<string>();

  for (const charge of moduleCharges) {
    const invoiceNumber = (charge.income?.invoice || "").trim();
    if (!invoiceNumber) continue;

    invoicesOnModule.add(invoiceNumber);

    const expenseReference = (charge.expense?.referenceNumber || "").trim();
    if (expenseReference) refToInvoice.set(expenseReference, invoiceNumber);

    const incomeReference = (charge.income?.referenceNumber || "").trim();
    if (incomeReference) refToInvoice.set(incomeReference, invoiceNumber);

    const billNumber = (charge.expense?.bill || "").trim();
    if (billNumber) billToInvoice.set(billNumber, invoiceNumber);
  }

  const orphanAllocation = new Map<string, number>();
  let unallocatedExpense = 0;

  for (const charge of moduleCharges) {
    if (charge.income?.invoice) continue;

    const expenseAmount = charge.expense?.exchangeAmount || 0;
    if (expenseAmount <= 0) continue;

    const expenseInvoice = (charge.expense?.invoice || "").trim();
    const referenceNumber = (charge.expense?.referenceNumber || "").trim();
    const billNumber = (charge.expense?.bill || "").trim();

    const recipient =
      (expenseInvoice && invoicesOnModule.has(expenseInvoice)
        ? expenseInvoice
        : undefined) ||
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

  if (unallocatedExpense > 0 && invoicesOnModule.size > 0) {
    const directExpenseByInvoice = new Map<string, number>();
    const incomeByInvoice = new Map<string, number>();

    for (const invoiceNumber of invoicesOnModule) {
      directExpenseByInvoice.set(
        invoiceNumber,
        invoiceDirectExpenseOnModule(moduleCharges, invoiceNumber),
      );
      incomeByInvoice.set(
        invoiceNumber,
        invoiceIncomeOnModule(moduleCharges, invoiceNumber),
      );
    }

    const totalDirectExpense = [...directExpenseByInvoice.values()].reduce(
      (sum, value) => sum + value,
      0,
    );
    const weights =
      totalDirectExpense > 0 ? directExpenseByInvoice : incomeByInvoice;

    const proportional = distributeProportional(unallocatedExpense, weights);
    for (const [invoice, share] of proportional) {
      orphanAllocation.set(
        invoice,
        round2((orphanAllocation.get(invoice) || 0) + share),
      );
    }
    unallocatedExpense = 0;
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

function sumNullAsZero(values: Array<number | null>): number {
  return round2(values.reduce<number>((sum, value) => sum + (value ?? 0), 0));
}

type ShipmentIndexes = {
  shipmentByNumber: Map<string, LinbisShipmentRecord>;
  shipmentById: Map<number, LinbisShipmentRecord>;
};

function buildShipmentIndexes(shipments: LinbisShipmentRecord[]): ShipmentIndexes {
  const shipmentByNumber = new Map<string, LinbisShipmentRecord>();
  const shipmentById = new Map<number, LinbisShipmentRecord>();
  for (const shipment of shipments) {
    if (shipment.id != null) shipmentById.set(shipment.id, shipment);
    if (shipment.number) shipmentByNumber.set(shipment.number, shipment);
    if (shipment.waybillNumber) shipmentByNumber.set(shipment.waybillNumber, shipment);
  }
  return { shipmentByNumber, shipmentById };
}

function resolveShipmentForInvoice(
  invoice: LinbisInvoiceRecord,
  indexes: ShipmentIndexes,
  moduleId: number | null,
): LinbisShipmentRecord | null {
  const moduleRef = (invoice.moduleNumber || "").trim();
  if (moduleRef && indexes.shipmentByNumber.has(moduleRef)) {
    return indexes.shipmentByNumber.get(moduleRef)!;
  }
  if (moduleId != null && indexes.shipmentById.has(moduleId)) {
    return indexes.shipmentById.get(moduleId)!;
  }
  return null;
}

async function fetchJson<T>(
  url: string,
  accessToken: string,
  refreshAccessToken: () => Promise<string>,
): Promise<T[]> {
  const response = await linbisFetch(
    url,
    { method: "GET", headers: LINBIS_JSON_HEADERS },
    accessToken,
    refreshAccessToken,
  );
  if (!response.ok) {
    throw new Error(`Error al obtener datos (${response.status})`);
  }
  const payload = await response.json();
  return Array.isArray(payload) ? payload : [];
}

async function fetchCoreDataset(
  accessToken: string,
  refreshAccessToken: () => Promise<string>,
  force = false,
): Promise<
  Pick<
    DatasetCache,
    | "fetchedAt"
    | "invoices"
    | "shipments"
    | "airShipments"
    | "groundShipments"
    | "accounts"
    | "salesReps"
  >
> {
  const now = Date.now();
  if (!force && datasetCache && now - datasetCache.fetchedAt < CACHE_TTL_MS) {
    return {
      fetchedAt: datasetCache.fetchedAt,
      invoices: datasetCache.invoices,
      shipments: datasetCache.shipments,
      airShipments: datasetCache.airShipments,
      groundShipments: datasetCache.groundShipments,
      accounts: datasetCache.accounts,
      salesReps: datasetCache.salesReps,
    };
  }

  const [invoices, shipments, airShipments, groundShipments, accounts, salesReps] =
    await Promise.all([
      fetchJson<LinbisInvoiceRecord>(INVOICES_URL, accessToken, refreshAccessToken),
      fetchJson<LinbisShipmentRecord>(SHIPMENTS_URL, accessToken, refreshAccessToken),
      fetchJson<TransportShipmentRecord>(AIR_SHIPMENTS_URL, accessToken, refreshAccessToken),
      fetchJson<TransportShipmentRecord>(
        GROUND_SHIPMENTS_URL,
        accessToken,
        refreshAccessToken,
      ),
      fetchJson<LinbisAccountListRecord>(ACCOUNTS_LIST_URL, accessToken, refreshAccessToken),
      fetchJson<LinbisSalesRepListRecord>(SALESREPS_LIST_URL, accessToken, refreshAccessToken),
    ]);

  if (!datasetCache || force) {
    datasetCache = {
      fetchedAt: now,
      invoices,
      shipments,
      airShipments,
      groundShipments,
      accounts,
      salesReps,
      charges: null,
    };
  } else {
    datasetCache = {
      ...datasetCache,
      fetchedAt: now,
      invoices,
      shipments,
      airShipments,
      groundShipments,
      accounts,
      salesReps,
    };
  }

  return {
    fetchedAt: now,
    invoices,
    shipments,
    airShipments,
    groundShipments,
    accounts,
    salesReps,
  };
}

async function ensureChargesLoaded(
  accessToken: string,
  refreshAccessToken: () => Promise<string>,
  force = false,
): Promise<LinbisChargeRecord[]> {
  const now = Date.now();
  if (
    !force &&
    datasetCache?.charges &&
    now - datasetCache.fetchedAt < CACHE_TTL_MS
  ) {
    return datasetCache.charges;
  }

  const charges = await fetchJson<LinbisChargeRecord>(
    CHARGES_URL,
    accessToken,
    refreshAccessToken,
  );

  if (datasetCache) {
    datasetCache = { ...datasetCache, fetchedAt: now, charges };
  } else {
    datasetCache = {
      fetchedAt: now,
      invoices: [],
      shipments: [],
      airShipments: [],
      groundShipments: [],
      accounts: [],
      salesReps: [],
      charges,
    };
  }

  return charges;
}

function buildPreviewRows(
  invoices: LinbisInvoiceRecord[],
  shipments: LinbisShipmentRecord[],
  airShipments: TransportShipmentRecord[],
  groundShipments: TransportShipmentRecord[],
  accounts: LinbisAccountListRecord[],
  salesReps: LinbisSalesRepListRecord[],
  start: Date,
  endInclusive: Date,
): CommissionAnalysisInvoiceRow[] {
  const indexes = buildShipmentIndexes(shipments);
  const salesRepResolver = buildSalesRepResolver({
    invoices,
    oceanShipments: shipments,
    airShipments,
    groundShipments,
    quoteSalesRepByNumber: buildQuoteSalesRepIndex(airShipments),
    billToSalesRepByAccountId: buildBillToSalesRepIndex(accounts, salesReps),
  });
  const rows: CommissionAnalysisInvoiceRow[] = [];

  for (const invoice of invoices) {
    if (!invoice.number || !isInDateRange(invoice.date, start, endInclusive)) continue;

    const shipment = resolveShipmentForInvoice(invoice, indexes, null);
    const division = normalizeDivision(invoice, shipment);
    const shipmentRef = resolveShipmentRef(invoice, shipment);

    rows.push({
      invoice: invoice.number,
      date: invoice.date,
      status: invoice.status || "",
      division,
      type: normalizeType(division),
      hawbHbl: shipmentRef,
      shipmentRef,
      billTo: (invoice.billToName || "").trim(),
      consignee: (shipment?.consignee || invoice.billToName || "").trim(),
      destination: (shipment?.finalDestination || shipment?.destination || "").trim(),
      income: round2(invoice.homeTotalAmount ?? 0),
      expense: null,
      profit: null,
      commission: 0,
      salesRep: finalizeSalesRep(salesRepResolver.resolve(invoice, null)),
      moduleId: null,
      reconciliationStatus: "incomplete",
    });
  }

  return rows;
}

function buildDetailedRows(
  charges: LinbisChargeRecord[],
  invoices: LinbisInvoiceRecord[],
  shipments: LinbisShipmentRecord[],
  airShipments: TransportShipmentRecord[],
  groundShipments: TransportShipmentRecord[],
  accounts: LinbisAccountListRecord[],
  salesReps: LinbisSalesRepListRecord[],
  start: Date,
  endInclusive: Date,
  filterInvoiceNumbers?: Set<string>,
): CommissionAnalysisInvoiceRow[] {
  const invoiceByNumber = new Map(
    invoices.filter((invoice) => invoice.number).map((invoice) => [invoice.number, invoice]),
  );
  const indexes = buildShipmentIndexes(shipments);
  const salesRepResolver = buildSalesRepResolver({
    invoices,
    oceanShipments: shipments,
    airShipments,
    groundShipments,
    charges,
    quoteSalesRepByNumber: buildQuoteSalesRepIndex(airShipments),
    billToSalesRepByAccountId: buildBillToSalesRepIndex(accounts, salesReps),
  });

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

  for (const [invoiceNumber, invoiceCharges] of chargesByInvoice) {
    if (filterInvoiceNumbers && !filterInvoiceNumbers.has(invoiceNumber)) continue;

    const invoice = invoiceByNumber.get(invoiceNumber);
    if (!invoice) continue;
    if (!isInDateRange(invoice.date, start, endInclusive)) continue;

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
      }
    } else {
      const directExpense = invoiceDirectExpenseOnModule(moduleCharges, invoiceNumber);
      expense = round2(directExpense);
      profit = round2(income - expense);
      reconciliationStatus = "complete";
    }

    const shipment = resolveShipmentForInvoice(invoice, indexes, moduleId);
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
      salesRep: salesRepResolver.resolve(invoice, moduleId),
      moduleId,
      reconciliationStatus,
    });
  }

  applyModuleSalesRepPropagation(rows);

  for (const row of rows) {
    row.salesRep = finalizeSalesRep(row.salesRep);
  }

  return rows;
}

function assembleReport(
  rows: CommissionAnalysisInvoiceRow[],
  startDate: string,
  endDate: string,
): CommissionAnalysisReport {
  const sortedRows = [...rows].sort((a, b) => {
    const repCompare = a.salesRep.localeCompare(b.salesRep, "es");
    if (repCompare !== 0) return repCompare;
    const shipmentCompare = a.shipmentRef.localeCompare(b.shipmentRef, "es");
    if (shipmentCompare !== 0) return shipmentCompare;
    return (a.date || "").localeCompare(b.date || "");
  });

  const groups = buildGroupsFromRows(sortedRows);

  let completeRows = 0;
  let incompleteRows = 0;
  let unallocatedExpenseTotal = 0;
  const modulesCounted = new Set<number>();

  if (datasetCache?.charges) {
    const chargesByModule = new Map<number, LinbisChargeRecord[]>();
    for (const charge of datasetCache.charges) {
      if (!chargesByModule.has(charge.moduleId)) {
        chargesByModule.set(charge.moduleId, []);
      }
      chargesByModule.get(charge.moduleId)!.push(charge);
    }

    for (const row of sortedRows) {
      if (row.reconciliationStatus === "complete") completeRows += 1;
      else incompleteRows += 1;

      if (row.moduleId != null && row.reconciliationStatus === "incomplete") {
        if (!modulesCounted.has(row.moduleId)) {
          modulesCounted.add(row.moduleId);
          const reconciliation = reconcileModuleOrphans(
            chargesByModule.get(row.moduleId) || [],
          );
          unallocatedExpenseTotal = round2(
            unallocatedExpenseTotal + reconciliation.unallocatedExpense,
          );
        }
      }
    }
  } else {
    incompleteRows = sortedRows.length;
  }

  return {
    generatedAt: new Date(),
    startDate,
    endDate,
    groups,
    totals: {
      income: round2(sortedRows.reduce((sum, row) => sum + row.income, 0)),
      expense: sumNullAsZero(sortedRows.map((row) => row.expense)),
      profit: sumNullAsZero(sortedRows.map((row) => row.profit)),
      commission: 0,
    },
    invoiceCount: sortedRows.length,
    reconciliation: {
      completeRows,
      incompleteRows,
      unallocatedExpenseTotal,
      isFullyReconciled: incompleteRows === 0,
    },
  };
}

export async function fetchOperationInvoiceDetails(
  accessToken: string,
  refreshAccessToken: () => Promise<string>,
  options: {
    invoiceNumbers: string[];
    moduleId: number | null;
    startDate: string;
    endDate: string;
  },
): Promise<CommissionAnalysisInvoiceRow[]> {
  const { invoiceNumbers, startDate, endDate } = options;
  const start = parseInputDate(startDate);
  const end = parseInputDate(endDate);
  if (!start || !end) throw new Error("Rango de fechas inválido");

  const endInclusive = new Date(end);
  endInclusive.setHours(23, 59, 59, 999);

  const filterSet = new Set(invoiceNumbers);
  const { invoices, shipments, airShipments, groundShipments, accounts, salesReps } =
    await fetchCoreDataset(accessToken, refreshAccessToken);
  const charges = await ensureChargesLoaded(accessToken, refreshAccessToken);

  const rows = buildDetailedRows(
    charges,
    invoices,
    shipments,
    airShipments,
    groundShipments,
    accounts,
    salesReps,
    start,
    endInclusive,
    filterSet,
  );

  return rows.sort((a, b) => a.invoice.localeCompare(b.invoice, "es"));
}

async function fetchDataset(
  accessToken: string,
  refreshAccessToken: () => Promise<string>,
  force = false,
): Promise<Required<DatasetCache>> {
  const core = await fetchCoreDataset(accessToken, refreshAccessToken, force);
  const charges = await ensureChargesLoaded(accessToken, refreshAccessToken, force);
  return {
    fetchedAt: core.fetchedAt,
    invoices: core.invoices,
    shipments: core.shipments,
    airShipments: core.airShipments,
    groundShipments: core.groundShipments,
    accounts: core.accounts,
    salesReps: core.salesReps,
    charges,
  };
}

export function clearCommissionAnalysisCache(): void {
  datasetCache = null;
  clearCommissionAnalyticsDerivatives();
}

function buildGroupsFromRows(
  rows: CommissionAnalysisInvoiceRow[],
): CommissionAnalysisRepGroup[] {
  const groupsMap = new Map<string, CommissionAnalysisRepGroup>();

  for (const row of rows) {
    if (!groupsMap.has(row.salesRep)) {
      groupsMap.set(row.salesRep, {
        salesRep: row.salesRep,
        rows: [],
        subtotal: { income: 0, expense: 0, profit: 0, commission: 0 },
      });
    }
    const group = groupsMap.get(row.salesRep)!;
    group.rows.push(row);
    group.subtotal.income = round2(group.subtotal.income + row.income);
    group.subtotal.commission = round2(group.subtotal.commission + row.commission);
  }

  return Array.from(groupsMap.values())
    .map((group) => ({
      ...group,
      subtotal: {
        ...group.subtotal,
        expense: sumNullAsZero(group.rows.map((row) => row.expense)),
        profit: sumNullAsZero(group.rows.map((row) => row.profit)),
      },
    }))
    .sort((a, b) => a.salesRep.localeCompare(b.salesRep, "es"));
}

function resolveOperationKey(row: CommissionAnalysisInvoiceRow): string {
  if (row.moduleId != null) return `module:${row.moduleId}`;
  if (row.shipmentRef) return row.shipmentRef;
  return `invoice:${row.invoice}`;
}

function uniqueJoined(values: string[]): string {
  return [...new Set(values.filter(Boolean))].join(", ");
}

export function buildOperationsSummary(
  report: CommissionAnalysisReport,
): CommissionAnalysisOperationsGroup[] {
  const operationsByRep = new Map<string, Map<string, CommissionAnalysisInvoiceRow[]>>();

  for (const group of report.groups) {
    if (!operationsByRep.has(group.salesRep)) {
      operationsByRep.set(group.salesRep, new Map());
    }
    const repOps = operationsByRep.get(group.salesRep)!;

    for (const row of group.rows) {
      const opKey = resolveOperationKey(row);
      if (!repOps.has(opKey)) repOps.set(opKey, []);
      repOps.get(opKey)!.push(row);
    }
  }

  const result: CommissionAnalysisOperationsGroup[] = [];

  for (const [salesRep, opsMap] of [...operationsByRep.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], "es"),
  )) {
    const operations = [...opsMap.entries()]
      .map(([, invoiceRows]) => {
        const sortedInvoices = [...invoiceRows].sort((a, b) =>
          a.invoice.localeCompare(b.invoice, "es"),
        );
        const operationRef =
          sortedInvoices.find((row) => row.shipmentRef)?.shipmentRef ||
          sortedInvoices[0]?.invoice ||
          "—";

        return {
          salesRep,
          operationRef,
          moduleId: sortedInvoices.find((row) => row.moduleId != null)?.moduleId ?? null,
          invoices: sortedInvoices.map((row) => row.invoice),
          invoiceCount: sortedInvoices.length,
          consignee: uniqueJoined(sortedInvoices.map((row) => row.consignee)),
          destination: uniqueJoined(sortedInvoices.map((row) => row.destination)),
          income: round2(sortedInvoices.reduce((sum, row) => sum + row.income, 0)),
          expense: sumNullAsZero(sortedInvoices.map((row) => row.expense)),
          profit: sumNullAsZero(sortedInvoices.map((row) => row.profit)),
        };
      })
      .sort((a, b) => a.operationRef.localeCompare(b.operationRef, "es"));

    result.push({
      salesRep,
      operations,
      subtotal: {
        operationCount: operations.length,
        invoiceCount: operations.reduce((sum, op) => sum + op.invoiceCount, 0),
        income: round2(operations.reduce((sum, op) => sum + op.income, 0)),
        expense: round2(operations.reduce((sum, op) => sum + op.expense, 0)),
        profit: round2(operations.reduce((sum, op) => sum + op.profit, 0)),
      },
    });
  }

  return result;
}

export function filterCommissionAnalysisReport(
  report: CommissionAnalysisReport,
  filters: { salesRep?: string; consignee?: string },
): CommissionAnalysisReport {
  const salesRepFilter = (filters.salesRep || "").trim();
  const consigneeFilter = (filters.consignee || "").trim().toLowerCase();

  const filteredRows: CommissionAnalysisInvoiceRow[] = [];

  for (const group of report.groups) {
    if (salesRepFilter && group.salesRep !== salesRepFilter) continue;

    for (const row of group.rows) {
      if (consigneeFilter && !row.consignee.toLowerCase().includes(consigneeFilter)) {
        continue;
      }
      filteredRows.push(row);
    }
  }

  filteredRows.sort((a, b) => {
    const repCompare = a.salesRep.localeCompare(b.salesRep, "es");
    if (repCompare !== 0) return repCompare;
    const shipmentCompare = a.shipmentRef.localeCompare(b.shipmentRef, "es");
    if (shipmentCompare !== 0) return shipmentCompare;
    return (a.date || "").localeCompare(b.date || "");
  });

  const groups = buildGroupsFromRows(filteredRows);
  let completeRows = 0;
  let incompleteRows = 0;

  for (const row of filteredRows) {
    if (row.reconciliationStatus === "complete") completeRows += 1;
    else incompleteRows += 1;
  }

  return {
    ...report,
    groups,
    totals: {
      income: round2(filteredRows.reduce((sum, row) => sum + row.income, 0)),
      expense: sumNullAsZero(filteredRows.map((row) => row.expense)),
      profit: sumNullAsZero(filteredRows.map((row) => row.profit)),
      commission: round2(filteredRows.reduce((sum, row) => sum + row.commission, 0)),
    },
    invoiceCount: filteredRows.length,
    reconciliation: {
      ...report.reconciliation,
      completeRows,
      incompleteRows,
      isFullyReconciled: incompleteRows === 0,
    },
  };
}

export async function buildCommissionAnalysisReport(
  accessToken: string,
  refreshAccessToken: () => Promise<string>,
  options: {
    startDate: string;
    endDate: string;
    forceRefresh?: boolean;
    onProgress?: (report: CommissionAnalysisReport, phase: "preview" | "complete") => void;
  },
): Promise<CommissionAnalysisReport> {
  const { startDate, endDate, forceRefresh = false, onProgress } = options;
  const start = parseInputDate(startDate);
  const end = parseInputDate(endDate);

  if (!start || !end) {
    throw new Error("Rango de fechas inválido");
  }
  const endInclusive = new Date(end);
  endInclusive.setHours(23, 59, 59, 999);

  const { invoices, shipments, airShipments, groundShipments, accounts, salesReps } =
    await fetchCoreDataset(accessToken, refreshAccessToken, forceRefresh);

  const previewRows = buildPreviewRows(
    invoices,
    shipments,
    airShipments,
    groundShipments,
    accounts,
    salesReps,
    start,
    endInclusive,
  );
  const previewReport = assembleReport(previewRows, startDate, endDate);
  onProgress?.(previewReport, "preview");

  const charges = await ensureChargesLoaded(
    accessToken,
    refreshAccessToken,
    forceRefresh,
  );

  const detailedRows = buildDetailedRows(
    charges,
    invoices,
    shipments,
    airShipments,
    groundShipments,
    accounts,
    salesReps,
    start,
    endInclusive,
  );

  const report = assembleReport(detailedRows, startDate, endDate);
  onProgress?.(report, "complete");
  return report;
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
