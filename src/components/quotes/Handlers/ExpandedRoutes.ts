// ExpandedRoutes.ts
// Carga y parsea el tercer sheet de "Rutas Existentes" para generar
// todas las combinaciones POL × POD expandidas.

export const EXPANDED_ROUTES_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTqDOOy1LOPWCns63VUeiH2QDRdk7LcTqBT2zKBYE6TZsONKaMlznyyPCNb_TX9z1L8V6znOhL-5sKf/pub?output=csv";

/**
 * URL del sheet "CHINA" del mismo documento de Rutas Existentes.
 * Estructura: columna B = "Puerto Principal", C = "lat", D = "lng".
 * Datos a partir de la fila 3 (B3, C3, D3).
 */
export const CHINA_PORTS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTqDOOy1LOPWCns63VUeiH2QDRdk7LcTqBT2zKBYE6TZsONKaMlznyyPCNb_TX9z1L8V6znOhL-5sKf/pub?gid=184920392&single=true&output=csv";

/**
 * Normalizar texto: quitar acentos, lowercase, trim
 */
const normalize = (str: string): string => {
  if (!str) return "";
  return str
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

/**
 * Capitalizar cada palabra
 */
const capitalize = (str: string): string => {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/**
 * Detecta si un POD es una combinación de puertos (e.g. "San Antonio - Valparaiso").
 * Devuelve un array con los puertos individuales normalizados.
 */
const splitCombinedPOD = (pod: string): string[] => {
  if (!pod) return [""];

  const podLower = pod
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const combinedPatterns: { [key: string]: string[] } = {
    "san antonio - valparaiso": ["san antonio", "valparaiso"],
    "san antonio / valparaiso": ["san antonio", "valparaiso"],
    "vap / sai": ["san antonio", "valparaiso"],
    "sai / vap": ["san antonio", "valparaiso"],
    "valparaiso - san antonio": ["san antonio", "valparaiso"],
    "valparaiso / san antonio": ["san antonio", "valparaiso"],
  };

  if (combinedPatterns[podLower]) {
    return combinedPatterns[podLower];
  }

  return [podLower];
};

const getPODDisplayName = (podNormalized: string): string => {
  const displayNames: { [key: string]: string } = {
    valparaiso: "Valparaiso",
    "san antonio": "San Antonio",
    iquique: "Iquique",
    "iquique via san antonio": "Iquique via San Antonio",
    santos: "Santos",
    callao: "Callao",
    tbc: "Tbc",
  };

  return displayNames[podNormalized] || capitalize(podNormalized);
};

/**
 * Parsea el CSV del tercer sheet.
 * El CSV tiene columnas: [vacía], POL, POD
 * - Extrae todos los POL únicos (row[1]) y POD únicos (row[2])
 * - Normaliza y deduplica nombres
 */
export interface ExpandedRoutesData {
  pols: Array<{ value: string; label: string }>;
  pods: Array<{ value: string; label: string }>;
  rows: Array<{ polNorm: string; podNorm: string; podLabel: string }>;
}

export const parseExpandedRoutesCSV = (csvText: string): ExpandedRoutesData => {
  const lines = csvText.split("\n");

  // Maps para deduplicar (normalized → display name preferido)
  const polMap = new Map<string, string>();
  const podMap = new Map<string, string>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parsear línea CSV simple (sin comillas complejas en este sheet)
    const fields: string[] = [];
    let currentField = "";
    let insideQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const nextChar = line[j + 1];
      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentField += '"';
          j++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === "," && !insideQuotes) {
        fields.push(currentField.trim());
        currentField = "";
      } else {
        currentField += char;
      }
    }
    fields.push(currentField.trim());

    const polRaw = fields[1]?.trim();
    const podRaw = fields[2]?.trim();

    const polNorm = polRaw ? normalize(polRaw) : "";

    if (polRaw && polNorm) {
      if (!polMap.has(polNorm)) {
        polMap.set(polNorm, capitalize(polRaw));
      }
    }

    if (podRaw) {
      const parts = splitCombinedPOD(podRaw);
      for (const norm of parts) {
        if (norm && !podMap.has(norm)) {
          podMap.set(norm, getPODDisplayName(norm));
        }
      }
    }
  }

  const pols = Array.from(polMap.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const pods = Array.from(podMap.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // Generate ALL combinations: every POL × every POD
  const rows: Array<{ polNorm: string; podNorm: string; podLabel: string }> = [];
  for (const pol of pols) {
    for (const pod of pods) {
      rows.push({ polNorm: pol.value, podNorm: pod.value, podLabel: pod.label });
    }
  }

  return { pols, pods, rows };
};

/**
 * Carga el CSV de rutas expandidas desde Google Sheets
 */
export const fetchExpandedRoutes = async (): Promise<ExpandedRoutesData> => {
  const response = await fetch(EXPANDED_ROUTES_CSV_URL);
  if (!response.ok) {
    throw new Error(`Error al cargar rutas expandidas: ${response.status}`);
  }
  const csvText = await response.text();
  return parseExpandedRoutesCSV(csvText);
};

/**
 * Puerto principal de China con coordenadas para trazado de ruta de pickup
 * cuando el cliente escoge Incoterm EXW desde un POL chino (UN/LOCODE CN*).
 */
export interface ChinaPort {
  value: string; // normalized name (lowercase, sin acentos)
  label: string; // display name (e.g. "Shanghai")
  lat: number;
  lng: number;
}

/**
 * Distancia haversine en kilómetros entre dos coordenadas (lat/lng en grados).
 */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/**
 * Devuelve los N puertos chinos más cercanos a una coordenada (típicamente
 * la dirección de recogida del cliente). Cada puerto incluye `distanceKm`.
 */
export function getNearestChinaPorts(
  origin: { lat: number; lng: number },
  ports: ChinaPort[],
  count = 3,
): Array<ChinaPort & { distanceKm: number }> {
  return ports
    .map((p) => ({ ...p, distanceKm: haversineKm(origin, p) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, count);
}

/**
 * Parsea el CSV de la hoja "CHINA".
 * El CSV publicado tiene 4 columnas (la primera vacía porque B es la 2da):
 *   row[0] = "" | row[1] = Puerto Principal | row[2] = lat | row[3] = lng
 * La fila 1 (índice 0) es vacía/encabezado de planilla, la fila 2 (índice 1)
 * son los headers ("Puerto Principal", "lat", "lng"). Los datos comienzan
 * en la fila 3 (índice 2).
 */
export const parseChinaPortsCSV = (csvText: string): ChinaPort[] => {
  const lines = csvText.split("\n");
  const ports: ChinaPort[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parser CSV simple (la hoja no tiene comillas complejas)
    const fields: string[] = [];
    let currentField = "";
    let insideQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const nextChar = line[j + 1];
      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentField += '"';
          j++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === "," && !insideQuotes) {
        fields.push(currentField.trim());
        currentField = "";
      } else {
        currentField += char;
      }
    }
    fields.push(currentField.trim());

    const nameRaw = fields[1]?.trim();
    const latRaw = fields[2]?.trim();
    const lngRaw = fields[3]?.trim();

    if (!nameRaw || !latRaw || !lngRaw) continue;
    // Saltar header
    if (nameRaw.toLowerCase() === "puerto principal") continue;

    const lat = parseFloat(latRaw.replace(",", "."));
    const lng = parseFloat(lngRaw.replace(",", "."));
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue;

    const norm = nameRaw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

    ports.push({ value: norm, label: nameRaw.trim(), lat, lng });
  }

  return ports;
};

export const fetchChinaPorts = async (): Promise<ChinaPort[]> => {
  const response = await fetch(CHINA_PORTS_CSV_URL);
  if (!response.ok) {
    throw new Error(`Error al cargar puertos China: ${response.status}`);
  }
  const csvText = await response.text();
  return parseChinaPortsCSV(csvText);
};
