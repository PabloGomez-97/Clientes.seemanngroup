import { MOBILE_API_BASE } from "../../src/auth/authApi";

export type DocTransportType = "all" | "air" | "ocean" | "ground" | "quotes";
export type DocGroupType = Exclude<DocTransportType, "all">;

export type MobileDocItem = {
  id: string;
  shipmentId: string | null;
  tipo: string;
  nombreArchivo: string;
  tipoArchivo: string;
  tamanoMB: string;
  fechaSubida: string;
  scope?: "cotizacion" | "operacional";
  modoOperacional?: "aereo" | "maritimo" | null;
};

export type UnifiedDoc = MobileDocItem & { _type: DocGroupType };

export type AllDocs = {
  air: MobileDocItem[];
  ocean: MobileDocItem[];
  ground: MobileDocItem[];
  quotes: MobileDocItem[];
};

export const TRANSPORT_LABELS: Record<DocTransportType, string> = {
  all: "Todos",
  air: "Aéreo",
  ocean: "Marítimo",
  ground: "Terrestre",
  quotes: "Cotizaciones",
};

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function downloadEndpoint(doc: UnifiedDoc, ownerUsername: string): string {
  const ownerQuery = `ownerUsername=${encodeURIComponent(ownerUsername)}`;
  if (doc._type === "ground") {
    return `${MOBILE_API_BASE}/api/ground-shipments/documentos/download/${doc.id}?${ownerQuery}`;
  }
  if (doc.scope === "operacional") {
    return `${MOBILE_API_BASE}/api/documentos/operacionales/download/${doc.id}?${ownerQuery}`;
  }
  return `${MOBILE_API_BASE}/api/documentos/download/${doc.id}?${ownerQuery}`;
}

function deleteEndpoint(doc: UnifiedDoc, ownerUsername: string): string {
  const ownerQuery = `ownerUsername=${encodeURIComponent(ownerUsername)}`;
  if (doc._type === "ground") {
    return `${MOBILE_API_BASE}/api/ground-shipments/documentos/${doc.id}?${ownerQuery}`;
  }
  if (doc.scope === "operacional") {
    return `${MOBILE_API_BASE}/api/documentos/operacionales/${doc.id}?${ownerQuery}`;
  }
  return `${MOBILE_API_BASE}/api/documentos/${doc.id}?${ownerQuery}`;
}

export async function fetchAllDocuments(
  token: string,
  ownerUsername: string,
): Promise<AllDocs> {
  const res = await fetch(
    `${MOBILE_API_BASE}/api/documents/all?ownerUsername=${encodeURIComponent(ownerUsername)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    throw new Error("No se pudieron cargar los documentos");
  }
  const data = await res.json();
  return {
    air: Array.isArray(data.air) ? data.air : [],
    ocean: Array.isArray(data.ocean) ? data.ocean : [],
    ground: Array.isArray(data.ground) ? data.ground : [],
    quotes: Array.isArray(data.quotes) ? data.quotes : [],
  };
}

export async function deleteDocument(
  token: string,
  ownerUsername: string,
  doc: UnifiedDoc,
): Promise<void> {
  const res = await fetch(deleteEndpoint(doc, ownerUsername), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error("No se pudo eliminar el documento");
  }
}

export type DownloadResult = {
  uri: string;
  fileName: string;
};

export async function downloadDocumentFile(
  token: string,
  ownerUsername: string,
  doc: UnifiedDoc,
): Promise<DownloadResult> {
  const FileSystem = await import("expo-file-system/legacy");
  const res = await fetch(downloadEndpoint(doc, ownerUsername), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error("No se pudo descargar el documento");
  }

  const contentType = res.headers.get("Content-Type") || "";
  const safeName =
    doc.nombreArchivo.replace(/[^\w.\- ()\[\]]+/g, "_") || "documento";
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error("Almacenamiento temporal no disponible");
  }
  const targetUri = `${cacheDir}${Date.now()}_${safeName}`;

  if (contentType.includes("application/json")) {
    const data = await res.json();
    const payload = data?.documento?.contenidoBase64 as string | undefined;
    if (!payload) {
      throw new Error("Respuesta de descarga inválida");
    }
    const base64 = payload.includes(",") ? payload.split(",")[1] : payload;
    await FileSystem.writeAsStringAsync(targetUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } else {
    const buffer = await res.arrayBuffer();
    const base64 = uint8ToBase64(new Uint8Array(buffer));
    await FileSystem.writeAsStringAsync(targetUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  return { uri: targetUri, fileName: safeName };
}

export function flattenDocs(docs: AllDocs): UnifiedDoc[] {
  return [
    ...docs.air.map((d) => ({ ...d, _type: "air" as const })),
    ...docs.ocean.map((d) => ({ ...d, _type: "ocean" as const })),
    ...docs.ground.map((d) => ({ ...d, _type: "ground" as const })),
    ...docs.quotes.map((d) => ({ ...d, _type: "quotes" as const })),
  ];
}

export function filterDocs(
  docs: UnifiedDoc[],
  type: DocTransportType,
  search: string,
): UnifiedDoc[] {
  const q = search.trim().toLowerCase();
  return docs.filter((doc) => {
    if (type !== "all" && doc._type !== type) return false;
    if (!q) return true;
    return (
      doc.nombreArchivo.toLowerCase().includes(q) ||
      doc.tipo.toLowerCase().includes(q) ||
      (doc.shipmentId || "").toLowerCase().includes(q)
    );
  });
}

/** Clave de carpeta para docs sin cotización/operación asociada. */
export const DOC_FOLDER_NONE_KEY = "__none__";

export type DocFolder = {
  key: string;
  reference: string | null;
  title: string;
  types: DocGroupType[];
  docs: UnifiedDoc[];
  count: number;
  latestDate: string;
};

function folderTitle(reference: string | null, types: DocGroupType[]): string {
  if (!reference) return "Sin referencia";
  const unique = [...new Set(types)];
  if (unique.length === 1) {
    const only = unique[0];
    if (only === "quotes") return `Cotización ${reference}`;
    return `${TRANSPORT_LABELS[only]} · ${reference}`;
  }
  return `Ref. ${reference}`;
}

function folderTypesLabel(types: DocGroupType[]): string {
  const unique = [...new Set(types)];
  if (unique.length === 0) return "";
  if (unique.length === 1) return TRANSPORT_LABELS[unique[0]];
  return unique.map((t) => TRANSPORT_LABELS[t]).join(" · ");
}

export function folderMetaLabel(folder: DocFolder): string {
  const typeLabel = folderTypesLabel(folder.types);
  const countLabel =
    folder.count === 1 ? "1 documento" : `${folder.count} documentos`;
  return typeLabel ? `${countLabel} · ${typeLabel}` : countLabel;
}

export function groupDocsByReference(docs: UnifiedDoc[]): DocFolder[] {
  const map = new Map<string, UnifiedDoc[]>();
  for (const doc of docs) {
    const ref = (doc.shipmentId || "").trim();
    const key = ref || DOC_FOLDER_NONE_KEY;
    const list = map.get(key);
    if (list) list.push(doc);
    else map.set(key, [doc]);
  }

  const folders: DocFolder[] = [];
  for (const [key, folderDocs] of map) {
    const reference = key === DOC_FOLDER_NONE_KEY ? null : key;
    const types = folderDocs.map((d) => d._type);
    let latestDate = folderDocs[0]?.fechaSubida || "";
    for (const d of folderDocs) {
      if (
        !latestDate ||
        new Date(d.fechaSubida).getTime() > new Date(latestDate).getTime()
      ) {
        latestDate = d.fechaSubida;
      }
    }
    folders.push({
      key,
      reference,
      title: folderTitle(reference, types),
      types: [...new Set(types)],
      docs: folderDocs,
      count: folderDocs.length,
      latestDate,
    });
  }

  return folders.sort((a, b) => {
    const ta = new Date(a.latestDate).getTime() || 0;
    const tb = new Date(b.latestDate).getTime() || 0;
    return tb - ta;
  });
}

/** Filtra carpetas por búsqueda (referencia, título o archivos internos). */
export function filterFolders(
  folders: DocFolder[],
  search: string,
): DocFolder[] {
  const q = search.trim().toLowerCase();
  if (!q) return folders;
  return folders.filter((folder) => {
    if (folder.title.toLowerCase().includes(q)) return true;
    if ((folder.reference || "").toLowerCase().includes(q)) return true;
    return folder.docs.some(
      (doc) =>
        doc.nombreArchivo.toLowerCase().includes(q) ||
        doc.tipo.toLowerCase().includes(q) ||
        (doc.shipmentId || "").toLowerCase().includes(q),
    );
  });
}

export function docsForReference(
  docs: UnifiedDoc[],
  reference: string,
): UnifiedDoc[] {
  if (reference === DOC_FOLDER_NONE_KEY) {
    return docs.filter((d) => !(d.shipmentId || "").trim());
  }
  const key = reference.trim();
  return docs.filter((d) => (d.shipmentId || "").trim() === key);
}

export function countByType(docs: AllDocs): Record<DocTransportType, number> {
  return {
    all:
      docs.air.length +
      docs.ocean.length +
      docs.ground.length +
      docs.quotes.length,
    air: docs.air.length,
    ocean: docs.ocean.length,
    ground: docs.ground.length,
    quotes: docs.quotes.length,
  };
}

export function formatDocDate(fechaISO: string): string {
  try {
    return new Date(fechaISO).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return fechaISO;
  }
}
