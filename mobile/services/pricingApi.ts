import { MOBILE_API_BASE } from "../../src/auth/authApi";

export type PricingTariffKind = "air" | "fcl" | "lcl";

export type PricingExpiringBase = {
  rowNumber: number;
  validUntil: string;
  daysUntilExpiry?: number;
  company?: string | null;
  currency?: string | null;
  carrier?: string | null;
};

export type PricingExpiringAir = PricingExpiringBase & {
  origen: string;
  destino: string;
  kg45?: string | null;
  kg100?: string | null;
};

export type PricingExpiringFcl = PricingExpiringBase & {
  pol: string;
  pod: string;
  gp20?: string | null;
  hq40?: string | null;
};

export type PricingExpiringLcl = PricingExpiringBase & {
  pol: string;
  pod: string;
  servicio?: string | null;
  ofWM?: string | null;
  operador?: string | null;
};

export type PricingExpiryData = {
  days: number;
  air: PricingExpiringAir[];
  fcl: PricingExpiringFcl[];
  lcl: PricingExpiringLcl[];
  totals: { air: number; fcl: number; lcl: number; all: number };
};

export type PricingAlertBuckets = {
  bucket48: number;
  bucket24: number;
  bucketToday: number;
  totals: { air: number; fcl: number; lcl: number; all: number };
};

export type PricingAlertStatus = {
  lastRun: {
    source: string;
    createdAt: string;
    sent: { type: string; alertType: string; count: number }[];
    errors: string[];
    skipped: string[];
  } | null;
  nextCronUtc: string;
  buckets: PricingAlertBuckets;
};

async function apiGet<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${MOBILE_API_BASE.replace(/\/$/, "")}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error || "Error al cargar datos de pricing",
    );
  }
  return (await response.json()) as T;
}

export async function fetchPricingExpiry(
  token: string,
  days = 7,
): Promise<PricingExpiryData> {
  const safeDays = Math.min(30, Math.max(1, days));
  const data = await apiGet<{
    success?: boolean;
    days?: number;
    air?: PricingExpiringAir[];
    fcl?: PricingExpiringFcl[];
    lcl?: PricingExpiringLcl[];
    totals?: PricingExpiryData["totals"];
  }>(`/api/pricing/expiry-check?days=${safeDays}`, token);

  return {
    days: data.days ?? safeDays,
    air: Array.isArray(data.air) ? data.air : [],
    fcl: Array.isArray(data.fcl) ? data.fcl : [],
    lcl: Array.isArray(data.lcl) ? data.lcl : [],
    totals: data.totals ?? { air: 0, fcl: 0, lcl: 0, all: 0 },
  };
}

export async function fetchPricingAlertStatus(
  token: string,
): Promise<PricingAlertStatus | null> {
  try {
    const data = await apiGet<{
      lastRun?: PricingAlertStatus["lastRun"];
      nextCronUtc?: string;
      buckets?: PricingAlertBuckets;
    }>("/api/pricing/alert-status", token);
    return {
      lastRun: data.lastRun ?? null,
      nextCronUtc: data.nextCronUtc ?? "",
      buckets: data.buckets ?? {
        bucket48: 0,
        bucket24: 0,
        bucketToday: 0,
        totals: { air: 0, fcl: 0, lcl: 0, all: 0 },
      },
    };
  } catch {
    return null;
  }
}

export type ProveedorArchivo = {
  id: string;
  nombreArchivo: string;
  tipoArchivo: string;
  tamanoBytes: number;
  categoria: "AEREO" | "FCL" | "LCL" | string;
  proveedorNombre?: string;
  createdAt: string;
};

export async function fetchProveedorArchivos(
  token: string,
  categoria?: string,
): Promise<ProveedorArchivo[]> {
  const q = categoria ? `?categoria=${encodeURIComponent(categoria)}` : "";
  const data = await apiGet<{ archivos?: ProveedorArchivo[] }>(
    `/api/proveedor-archivos${q}`,
    token,
  );
  return Array.isArray(data.archivos) ? data.archivos : [];
}

export async function downloadProveedorArchivo(
  token: string,
  id: string,
): Promise<{ nombreArchivo: string; tipoArchivo: string; contenidoBase64: string }> {
  const data = await apiGet<{
    archivo?: {
      nombreArchivo: string;
      tipoArchivo: string;
      contenidoBase64: string;
    };
  }>(`/api/proveedor-archivos/${encodeURIComponent(id)}/download`, token);

  if (!data.archivo?.contenidoBase64) {
    throw new Error("No se pudo descargar el archivo");
  }
  return data.archivo;
}

export async function saveProveedorArchivoToCache(
  token: string,
  id: string,
): Promise<{ uri: string; fileName: string }> {
  const FileSystem = await import("expo-file-system/legacy");
  const archivo = await downloadProveedorArchivo(token, id);
  const safeName =
    archivo.nombreArchivo.replace(/[^\w.\- ()\[\]]+/g, "_") || "archivo";
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error("Almacenamiento temporal no disponible");
  }
  const targetUri = `${cacheDir}${Date.now()}_${safeName}`;
  const base64 = archivo.contenidoBase64.includes(",")
    ? archivo.contenidoBase64.split(",")[1]
    : archivo.contenidoBase64;
  await FileSystem.writeAsStringAsync(targetUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { uri: targetUri, fileName: safeName };
}
