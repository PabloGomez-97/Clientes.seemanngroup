/**
 * Linbis API scope notes for Commission Analysis (Phase 3).
 *
 * Current client behavior:
 * - Core: GET /invoices/all, /shipments/all, /air-shipments/all, /ground-shipments/all,
 *   /accounts/list?take=10000, /salesreps/list?take=100
 * - Enrich: GET /shipments/allCharges (largest payload)
 * - Date filtering is entirely client-side after download
 *
 * Related endpoint already used elsewhere:
 * - GET /invoices?ConsigneeName&Page&ItemsPerPage&SortBy — paginated and scoped to one
 *   consignee (client reportería). Not a drop-in for whole-team commission ranges.
 *
 * Recommended Linbis follow-ups (largest performance wins):
 * 1. allCharges?from=&to= (invoice or charge date range)
 * 2. invoices/all?from=&to= (or paginated with date range without consignee filter)
 * 3. charges by moduleId for operation drill-down
 *
 * Until those exist, frontend mitigations are: preview→enrich phases, cache TTL,
 * single-flight, timeouts/abort, and modal reuse of completed report rows.
 */
export const LINBIS_ANALYSIS_API_NOTES = {
  bulkEndpoints: [
    "https://api.linbis.com/invoices/all",
    "https://api.linbis.com/shipments/all",
    "https://api.linbis.com/air-shipments/all",
    "https://api.linbis.com/ground-shipments/all",
    "https://api.linbis.com/shipments/allCharges",
  ],
  requestedEnhancements: [
    "allCharges?from&to",
    "invoices date-scoped bulk or pagination without consignee",
    "charges-by-moduleId",
  ],
} as const;
