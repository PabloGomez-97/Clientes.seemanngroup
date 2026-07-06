import type {
  LinbisChargeRecord,
  LinbisInvoiceRecord,
  LinbisShipmentRecord,
} from "./types";

export type TransportShipmentRecord = {
  id: number;
  number?: string | null;
  waybillNumber?: string | null;
  salesRep?: string | null;
  quoteSalesRep?: string | null;
  quoteNumber?: string | null;
  parentShipmentId?: number | null;
};

export type SalesRepResolver = {
  resolve: (invoice: LinbisInvoiceRecord, moduleId: number | null) => string;
};

export function buildBillToSalesRepIndex(
  accounts: Array<{ id: number; salesRepId?: number | null }>,
  salesReps: Array<{ id: number; name?: string | null }>,
): Map<number, string> {
  const repNameById = new Map<number, string>();
  for (const rep of salesReps) {
    const name = trimRep(rep.name);
    if (rep.id != null && name) repNameById.set(rep.id, name);
  }

  const result = new Map<number, string>();
  for (const account of accounts) {
    const repId = account.salesRepId;
    if (account.id == null || repId == null) continue;
    const name = repNameById.get(repId);
    if (name) result.set(account.id, name);
  }
  return result;
}

function trimRep(value: string | null | undefined): string {
  return (value || "").trim();
}

function pickMajorityRep(candidates: Iterable<string>): string {
  const counts = new Map<string, number>();
  for (const candidate of candidates) {
    const rep = trimRep(candidate);
    if (!rep) continue;
    counts.set(rep, (counts.get(rep) || 0) + 1);
  }

  let bestRep = "";
  let bestCount = 0;
  for (const [rep, count] of counts) {
    if (count > bestCount) {
      bestRep = rep;
      bestCount = count;
    }
  }
  return bestRep;
}

function buildShipmentIndexes(
  oceanShipments: LinbisShipmentRecord[],
  airShipments: TransportShipmentRecord[],
  groundShipments: TransportShipmentRecord[],
) {
  const shipmentByNumber = new Map<string, TransportShipmentRecord>();
  const shipmentById = new Map<number, TransportShipmentRecord>();

  const register = (shipment: TransportShipmentRecord) => {
    if (shipment.id != null) shipmentById.set(shipment.id, shipment);
    const number = trimRep(shipment.number);
    const waybill = trimRep(shipment.waybillNumber);
    if (number) shipmentByNumber.set(number, shipment);
    if (waybill) shipmentByNumber.set(waybill, shipment);
  };

  for (const shipment of oceanShipments) register(shipment);
  for (const shipment of airShipments) register(shipment);
  for (const shipment of groundShipments) register(shipment);

  return { shipmentByNumber, shipmentById };
}

function buildBillToUniqueRepIndex(
  invoices: LinbisInvoiceRecord[],
): Map<string, string> {
  const repsByBillTo = new Map<string, Set<string>>();

  for (const invoice of invoices) {
    const billTo = trimRep(invoice.billToName);
    const rep = trimRep(invoice.salesRep);
    if (!billTo || !rep) continue;

    if (!repsByBillTo.has(billTo)) repsByBillTo.set(billTo, new Set());
    repsByBillTo.get(billTo)!.add(rep);
  }

  const uniqueRepByBillTo = new Map<string, string>();
  for (const [billTo, reps] of repsByBillTo) {
    if (reps.size === 1) uniqueRepByBillTo.set(billTo, [...reps][0]);
  }

  return uniqueRepByBillTo;
}

function buildModuleRepIndexes(
  invoices: LinbisInvoiceRecord[],
  charges: LinbisChargeRecord[] | undefined,
): {
  repsByModuleId: Map<number, string[]>;
  repsByModuleNumber: Map<string, string[]>;
} {
  const invoiceByNumber = new Map(
    invoices
      .filter((invoice) => invoice.number)
      .map((invoice) => [invoice.number, invoice]),
  );

  const repsByModuleId = new Map<number, string[]>();
  const repsByModuleNumber = new Map<string, string[]>();

  const addRep = (map: Map<number, string[]>, key: number, rep: string) => {
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(rep);
  };

  const addRepByModuleNumber = (moduleNumber: string, rep: string) => {
    if (!repsByModuleNumber.has(moduleNumber)) repsByModuleNumber.set(moduleNumber, []);
    repsByModuleNumber.get(moduleNumber)!.push(rep);
  };

  for (const invoice of invoices) {
    const rep = trimRep(invoice.salesRep);
    if (!rep) continue;

    const moduleNumber = trimRep(invoice.moduleNumber);
    if (moduleNumber) addRepByModuleNumber(moduleNumber, rep);
  }

  if (charges) {
    for (const charge of charges) {
      const invoiceNumber = trimRep(charge.income?.invoice);
      if (!invoiceNumber) continue;

      const invoice = invoiceByNumber.get(invoiceNumber);
      const rep = trimRep(invoice?.salesRep);
      if (!rep) continue;

      addRep(repsByModuleId, charge.moduleId, rep);
      const moduleNumber = trimRep(invoice?.moduleNumber);
      if (moduleNumber) addRepByModuleNumber(moduleNumber, rep);
    }
  }

  return { repsByModuleId, repsByModuleNumber };
}

function resolveShipmentForInvoice(
  invoice: LinbisInvoiceRecord,
  moduleId: number | null,
  indexes: ReturnType<typeof buildShipmentIndexes>,
): TransportShipmentRecord | null {
  const moduleRef = trimRep(invoice.moduleNumber);
  if (moduleRef && indexes.shipmentByNumber.has(moduleRef)) {
    return indexes.shipmentByNumber.get(moduleRef)!;
  }
  if (moduleId != null && indexes.shipmentById.has(moduleId)) {
    return indexes.shipmentById.get(moduleId)!;
  }
  return null;
}

function resolveFromShipmentTree(
  shipment: TransportShipmentRecord | null,
  indexes: ReturnType<typeof buildShipmentIndexes>,
): string {
  if (!shipment) return "";

  const directRep =
    trimRep(shipment.salesRep) || trimRep(shipment.quoteSalesRep);
  if (directRep) return directRep;

  const parentId = shipment.parentShipmentId;
  if (parentId != null && parentId > 0) {
    const parent = indexes.shipmentById.get(parentId);
    if (parent) {
      const parentRep =
        trimRep(parent.salesRep) || trimRep(parent.quoteSalesRep);
      if (parentRep) return parentRep;
    }
  }

  return "";
}

export function buildSalesRepResolver(options: {
  invoices: LinbisInvoiceRecord[];
  oceanShipments: LinbisShipmentRecord[];
  airShipments?: TransportShipmentRecord[];
  groundShipments?: TransportShipmentRecord[];
  charges?: LinbisChargeRecord[];
  quoteSalesRepByNumber?: Map<string, string>;
  billToSalesRepByAccountId?: Map<number, string>;
}): SalesRepResolver {
  const {
    invoices,
    oceanShipments,
    airShipments = [],
    groundShipments = [],
    charges,
    quoteSalesRepByNumber = new Map(),
    billToSalesRepByAccountId = new Map(),
  } = options;

  const shipmentIndexes = buildShipmentIndexes(
    oceanShipments,
    airShipments,
    groundShipments,
  );
  const billToUniqueRep = buildBillToUniqueRepIndex(invoices);
  const { repsByModuleId, repsByModuleNumber } = buildModuleRepIndexes(
    invoices,
    charges,
  );

  const resolve = (invoice: LinbisInvoiceRecord, moduleId: number | null): string => {
    const directRep = trimRep(invoice.salesRep);
    if (directRep) return directRep;

    const billToId = invoice.billToId;
    if (billToId != null && billToSalesRepByAccountId.has(billToId)) {
      return billToSalesRepByAccountId.get(billToId)!;
    }

    const shipment = resolveShipmentForInvoice(invoice, moduleId, shipmentIndexes);
    const shipmentRep = resolveFromShipmentTree(shipment, shipmentIndexes);
    if (shipmentRep) return shipmentRep;

    const quoteNumber = trimRep(shipment?.quoteNumber);
    if (quoteNumber && quoteSalesRepByNumber.has(quoteNumber)) {
      return quoteSalesRepByNumber.get(quoteNumber)!;
    }

    if (moduleId != null) {
      const moduleRep = pickMajorityRep(repsByModuleId.get(moduleId) || []);
      if (moduleRep) return moduleRep;
    }

    const moduleNumber = trimRep(invoice.moduleNumber);
    if (moduleNumber) {
      const moduleNumberRep = pickMajorityRep(
        repsByModuleNumber.get(moduleNumber) || [],
      );
      if (moduleNumberRep) return moduleNumberRep;
    }

    const billTo = trimRep(invoice.billToName);
    if (billTo && billToUniqueRep.has(billTo)) {
      return billToUniqueRep.get(billTo)!;
    }

    return "";
  };

  return { resolve };
}

export function applyModuleSalesRepPropagation(
  rows: Array<{ salesRep: string; moduleId: number | null }>,
): void {
  const repsByModule = new Map<number, string[]>();

  for (const row of rows) {
    const rep = trimRep(row.salesRep);
    if (!rep || row.moduleId == null) continue;
    if (!repsByModule.has(row.moduleId)) repsByModule.set(row.moduleId, []);
    repsByModule.get(row.moduleId)!.push(rep);
  }

  for (const row of rows) {
    if (trimRep(row.salesRep) || row.moduleId == null) continue;
    const inferred = pickMajorityRep(repsByModule.get(row.moduleId) || []);
    if (inferred) row.salesRep = inferred;
  }
}
