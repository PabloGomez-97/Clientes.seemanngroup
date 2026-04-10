// ExpandedRoutes.ts
// Carga y parsea el tercer sheet de "Rutas Existentes" para generar
// todas las combinaciones POL × POD expandidas.

export const EXPANDED_ROUTES_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTqDOOy1LOPWCns63VUeiH2QDRdk7LcTqBT2zKBYE6TZsONKaMlznyyPCNb_TX9z1L8V6znOhL-5sKf/pub?output=csv";

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

    if (polRaw) {
      const norm = normalize(polRaw);
      if (norm && !polMap.has(norm)) {
        polMap.set(norm, capitalize(polRaw));
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

  return { pols, pods };
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
