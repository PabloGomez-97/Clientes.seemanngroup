import {
  type InvoiceData,
  type InvoiceStats,
  buildExecutiveComparisons,
  calculateInvoiceStats,
  fetchLinbisInvoicesAll,
  filterInvoices,
  formatInvoiceCurrency,
  getPeriodRange,
  parseLinbisInvoiceDate,
  type PeriodPreset,
} from "../../src/components/administrador/reporteria/financiera/invoiceUtils";

export type { InvoiceData, InvoiceStats, PeriodPreset };
export {
  calculateInvoiceStats,
  buildExecutiveComparisons,
  filterInvoices,
  formatInvoiceCurrency,
  getPeriodRange,
  fetchLinbisInvoicesAll,
};

type LinbisOptions = {
  accessToken: string;
  refreshAccessToken: () => Promise<string>;
};

export async function loadFilteredInvoices(
  options: LinbisOptions,
  filters: {
    salesRep?: string;
    startDate: string;
    endDate: string;
  },
): Promise<{ invoices: InvoiceData[]; fetchedAt: number }> {
  const { mapped, fetchedAt } = await fetchLinbisInvoicesAll(
    options.accessToken,
    options.refreshAccessToken,
  );
  const invoices = filterInvoices(mapped, {
    salesRep: filters.salesRep,
    startDate: filters.startDate,
    endDate: filters.endDate,
  });
  return { invoices, fetchedAt };
}

export async function loadAllInvoices(
  options: LinbisOptions,
): Promise<{ invoices: InvoiceData[]; fetchedAt: number }> {
  const { mapped, fetchedAt } = await fetchLinbisInvoicesAll(
    options.accessToken,
    options.refreshAccessToken,
  );
  return { invoices: mapped, fetchedAt };
}

export type InvoiceMonthlyComparisonRow = {
  month: string;
  label: string;
  executive1Invoices: number;
  executive2Invoices: number;
  executive1Amount: number;
  executive2Amount: number;
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

function groupByMonth(invoices: InvoiceData[]): Record<string, InvoiceData[]> {
  const monthMap: Record<string, InvoiceData[]> = {};
  for (const invoice of invoices) {
    const d = parseLinbisInvoiceDate(invoice.date);
    if (!d) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap[key]) monthMap[key] = [];
    monthMap[key].push(invoice);
  }
  return monthMap;
}

export function buildInvoiceMonthlyComparison(
  invoices1: InvoiceData[],
  invoices2: InvoiceData[],
): InvoiceMonthlyComparisonRow[] {
  const map1 = groupByMonth(invoices1);
  const map2 = groupByMonth(invoices2);
  const monthSet = new Set([...Object.keys(map1), ...Object.keys(map2)]);

  return [...monthSet]
    .sort()
    .map((month) => {
      const [year, monthNum] = month.split("-");
      const list1 = map1[month] || [];
      const list2 = map2[month] || [];
      return {
        month,
        label: `${MONTH_NAMES[Number(monthNum) - 1] || monthNum} ${year}`,
        executive1Invoices: list1.length,
        executive2Invoices: list2.length,
        executive1Amount: list1.reduce(
          (sum, inv) => sum + (inv.homeTotalAmount || 0),
          0,
        ),
        executive2Amount: list2.reduce(
          (sum, inv) => sum + (inv.homeTotalAmount || 0),
          0,
        ),
      };
    });
}
