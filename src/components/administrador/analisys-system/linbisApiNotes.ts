/**
 * Linbis API scope notes for Commission Analysis.
 *
 * Server-side filters (swagger updated):
 * - GET /invoices/all?StartDate&EndDate — invoice.date range
 * - GET /shipments/allCharges?startDate&endDate&invoiceNumbers
 * - GET /shipments|air-shipments|ground-shipments/all?ModuleNumbers|StartDate&EndDate
 *
 * Portal strategy:
 * 1. Invoices by StartDate/EndDate (invoice.date)
 * 2. Shipments by ModuleNumbers from those invoices (chunked requests)
 * 3. Charges by startDate/endDate; invoiceNumbers only for small scoped modal fetches
 * 4. Client-side date filter kept as safety net
 *
 * Constraints found in production:
 * - Bulk list endpoints page at 50 rows by default, so every page must be walked.
 * - URLs over 2048 chars are rejected with a 404 that omits CORS headers, which the
 *   browser surfaces as a CORS error. Array params must be chunked by URL length.
 */
export const LINBIS_ANALYSIS_API_NOTES = {
  bulkEndpoints: [
    "https://api.linbis.com/invoices/all",
    "https://api.linbis.com/shipments/all",
    "https://api.linbis.com/air-shipments/all",
    "https://api.linbis.com/ground-shipments/all",
    "https://api.linbis.com/shipments/allCharges",
  ],
  serverFiltersInUse: [
    "invoices/all?StartDate&EndDate",
    "shipments/allCharges?startDate&endDate",
    "shipments/*/all?ModuleNumbers (chunked)",
  ],
} as const;
