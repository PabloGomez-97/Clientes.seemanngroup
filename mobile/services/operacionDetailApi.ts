import { MOBILE_API_BASE } from "../../src/auth/authApi";
import {
  fetchQuoteProfitIndex,
  lookupQuoteFromProfitIndex,
  normalizeQuoteNumber,
} from "../../src/services/linbisQuoteLookup";
import type { MobileDocItem, UnifiedDoc } from "./documentsApi";
import { downloadDocumentFile } from "./documentsApi";

export type OperacionModoDocs = "aereo" | "maritimo";

type LinbisAuth = {
  accessToken: string;
  refreshAccessToken: () => Promise<string>;
};

export async function resolveOperacionQuoteNumber(
  auth: LinbisAuth,
  keys: {
    sogNumber?: string | null;
    shipmentId?: number | string | null;
    quoteNumberHint?: string | null;
  },
): Promise<string | null> {
  const hinted = normalizeQuoteNumber(keys.quoteNumberHint);
  if (hinted) return hinted;

  const index = await fetchQuoteProfitIndex(auth);
  const shipmentId =
    typeof keys.shipmentId === "number"
      ? keys.shipmentId
      : Number(keys.shipmentId) || null;

  return lookupQuoteFromProfitIndex(index, {
    sogNumber: keys.sogNumber,
    shipmentId,
  });
}

export async function fetchOperacionDocumentos(
  token: string,
  ownerUsername: string,
  quoteNumber: string,
  modo: OperacionModoDocs,
): Promise<MobileDocItem[]> {
  const res = await fetch(
    `${MOBILE_API_BASE}/api/documentos/operacionales/${encodeURIComponent(quoteNumber)}?modo=${modo}&ownerUsername=${encodeURIComponent(ownerUsername)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    throw new Error("No se pudieron cargar los documentos");
  }
  const data = await res.json();
  const list = Array.isArray(data) ? data : data?.documentos;
  if (!Array.isArray(list)) return [];
  return list.map((doc: MobileDocItem) => ({
    ...doc,
    scope: "operacional" as const,
    modoOperacional: modo,
  }));
}

export async function fetchGroundOperacionDocumentos(
  token: string,
  ownerUsername: string,
  shipmentId: string | number,
): Promise<MobileDocItem[]> {
  const res = await fetch(
    `${MOBILE_API_BASE}/api/ground-shipments/documentos/${shipmentId}?ownerUsername=${encodeURIComponent(ownerUsername)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    throw new Error("No se pudieron cargar los documentos");
  }
  const data = await res.json();
  const list = Array.isArray(data) ? data : data?.documentos;
  if (!Array.isArray(list)) return [];
  return list;
}

export function toUnifiedOperacionalDoc(
  doc: MobileDocItem,
  type: "air" | "ocean" | "ground",
): UnifiedDoc {
  return {
    ...doc,
    _type: type,
    scope: type === "ground" ? doc.scope : "operacional",
  };
}

export async function downloadOperacionDocumento(
  token: string,
  ownerUsername: string,
  doc: UnifiedDoc,
) {
  return downloadDocumentFile(token, ownerUsername, doc);
}
