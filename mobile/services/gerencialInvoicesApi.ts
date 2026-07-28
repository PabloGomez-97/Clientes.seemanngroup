import {
  type InvoiceData,
  type InvoiceStats,
  buildExecutiveComparisons,
  calculateInvoiceStats,
  fetchLinbisInvoicesAll,
  filterInvoices,
  formatInvoiceCurrency,
  getPeriodRange,
  groupInvoicesByMonth,
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

export function buildInvoiceMonthlyComparison(
  invoices1: InvoiceData[],
  invoices2: InvoiceData[],
): InvoiceMonthlyComparisonRow[] {
  const monthSet = new Set<string>();
  const map1 = groupInvoicesByMonth(invoices1);
  const map2 = groupInvoicesByMonth(invoices2);
  Object.keys(map1).forEach((k) => monthSet.add(k));
  Object.keys(map2).forEach((k) => monthSet.add(k));

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
