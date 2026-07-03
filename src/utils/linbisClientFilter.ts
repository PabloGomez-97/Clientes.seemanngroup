/**
 * Filtrado client-side para endpoints Linbis sin filtro interno por consignatario.
 * El endpoint entrega el universo de datos; el portal conserva solo lo del cliente activo.
 */

export function normalizeLinbisAccountName(
  value: string | null | undefined,
): string {
  return (value ?? "").trim().toLowerCase();
}

export function matchesConsigneeName(
  candidate: string | null | undefined,
  consigneeName: string,
): boolean {
  if (!candidate?.trim() || !consigneeName.trim()) return false;
  return (
    normalizeLinbisAccountName(candidate) ===
    normalizeLinbisAccountName(consigneeName)
  );
}

function pushCandidate(
  candidates: string[],
  value: unknown,
): void {
  if (typeof value === "string" && value.trim()) {
    candidates.push(value);
  }
}

/** Campos habituales donde Linbis expone consignatario / facturado a. */
export function getConsigneeCandidatesFromRecord(
  record: Record<string, unknown>,
): string[] {
  const candidates: string[] = [];

  pushCandidate(candidates, record.consignee);
  pushCandidate(candidates, record.billToName);
  pushCandidate(candidates, record.customer);
  pushCandidate(candidates, record.CustomerName);
  pushCandidate(candidates, record.ShipperName);

  if (record.consignee && typeof record.consignee === "object") {
    pushCandidate(
      candidates,
      (record.consignee as { name?: unknown }).name,
    );
  }

  if (record.billTo && typeof record.billTo === "object") {
    pushCandidate(candidates, (record.billTo as { name?: unknown }).name);
  }

  if (record.shipment && typeof record.shipment === "object") {
    const shipment = record.shipment as { consignee?: { name?: unknown } };
    pushCandidate(candidates, shipment.consignee?.name);
  }

  return candidates;
}

export function recordBelongsToConsignee(
  record: Record<string, unknown>,
  consigneeName: string,
): boolean {
  return getConsigneeCandidatesFromRecord(record).some((candidate) =>
    matchesConsigneeName(candidate, consigneeName),
  );
}

export function filterRecordsForConsignee<T extends Record<string, unknown>>(
  records: T[],
  consigneeName: string,
): T[] {
  return records.filter((record) =>
    recordBelongsToConsignee(record, consigneeName),
  );
}

export function normalizeShipmentKey(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

export function buildShipmentNumberSet(
  shipmentNumbers: Iterable<string | null | undefined>,
): Set<string> {
  const set = new Set<string>();
  for (const value of shipmentNumbers) {
    const normalized = normalizeShipmentKey(value);
    if (normalized) set.add(normalized);
  }
  return set;
}
