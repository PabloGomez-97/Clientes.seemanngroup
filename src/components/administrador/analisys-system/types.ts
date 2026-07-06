export type InvoiceReconciliationStatus = "complete" | "incomplete";

export type CommissionAnalysisInvoiceRow = {
  invoice: string;
  date: string;
  status: string;
  division: string;
  type: string;
  hawbHbl: string;
  shipmentRef: string;
  billTo: string;
  consignee: string;
  destination: string;
  /** Ingreso desde cargos Linbis (`income.exchangeAmount` vinculados a la factura). */
  income: number;
  /** Gasto asignado solo con vínculos explícitos en cargos Linbis; null si hay gastos huérfanos sin asignar. */
  expense: number | null;
  /** Profit calculado solo cuando expense está completo. */
  profit: number | null;
  commission: number;
  salesRep: string;
  moduleId: number | null;
  reconciliationStatus: InvoiceReconciliationStatus;
};

export type CommissionAnalysisRepGroup = {
  salesRep: string;
  rows: CommissionAnalysisInvoiceRow[];
  subtotal: {
    income: number;
    expense: number;
    profit: number;
    commission: number;
  };
};

export type CommissionAnalysisReport = {
  generatedAt: Date;
  startDate: string;
  endDate: string;
  groups: CommissionAnalysisRepGroup[];
  totals: {
    income: number;
    expense: number;
    profit: number;
    commission: number;
  };
  invoiceCount: number;
  reconciliation: {
    completeRows: number;
    incompleteRows: number;
    unallocatedExpenseTotal: number;
    /** true solo si todas las filas tienen expense/profit completos vía API. */
    isFullyReconciled: boolean;
  };
};

/** Una operación Linbis agrupa varias facturas (INV) bajo el mismo embarque. */
export type CommissionAnalysisOperation = {
  salesRep: string;
  /** Referencia visible del embarque (HBL/HAWB/SOG — `invoice.moduleNumber` en Linbis). */
  operationRef: string;
  moduleId: number | null;
  invoices: string[];
  invoiceCount: number;
  consignee: string;
  destination: string;
  income: number;
  expense: number;
  profit: number;
};

export type CommissionAnalysisOperationsGroup = {
  salesRep: string;
  operations: CommissionAnalysisOperation[];
  subtotal: {
    operationCount: number;
    invoiceCount: number;
    income: number;
    expense: number;
    profit: number;
  };
};

export type LinbisChargeRecord = {
  moduleId: number;
  id: number;
  status?: string | null;
  description?: string | null;
  profit?: number;
  income?: {
    invoice?: string | null;
    exchangeAmount?: number;
    billApplyTo?: string | null;
    referenceNumber?: string | null;
  } | null;
  expense?: {
    invoice?: string | null;
    exchangeAmount?: number;
    bill?: string | null;
    referenceNumber?: string | null;
  } | null;
};

export type LinbisInvoiceRecord = {
  number: string;
  date: string;
  status: string;
  type: string;
  divisionName?: string | null;
  billToId?: number | null;
  billToName?: string | null;
  salesRep?: string | null;
  moduleNumber?: string | null;
  moduleType?: string | null;
  operationFlow?: string | null;
  homeTotalAmount?: number;
};

export type LinbisShipmentRecord = {
  id: number;
  number?: string | null;
  waybillNumber?: string | null;
  salesRep?: string | null;
  consignee?: string | null;
  destination?: string | null;
  finalDestination?: string | null;
  division?: string | null;
};
