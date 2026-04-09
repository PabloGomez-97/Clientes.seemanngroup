// ExpandedRoutesAir.ts
// Carga y parsea el sheet de "Rutas Aéreas Expandidas" para generar
// todas las combinaciones Origin × Destination expandidas.

export const EXPANDED_ROUTES_AIR_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRH46DfK8BWlYXwZoR3UdVP_mXiQZn_JdWaQwCQUGPmu5qv6Eov2hNnoaaZHpWXN1VXfL7vqIgpwOyD/pub?output=csv";

const normalize = (str: string): string => {
  if (!str) return "";
  return str
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

const capitalize = (str: string): string => {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export interface ExpandedRoutesAirData {
  origins: Array<{ value: string; label: string }>;
  destinations: Array<{ value: string; label: string }>;
}

export const parseExpandedRoutesAirCSV = (
  csvText: string,
): ExpandedRoutesAirData => {
  const lines = csvText.split("\n");

  const originMap = new Map<string, string>();
  const destMap = new Map<string, string>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

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

    const originRaw = fields[1]?.trim();
    const destRaw = fields[2]?.trim();

    if (originRaw) {
      const norm = normalize(originRaw);
      if (norm && !originMap.has(norm)) {
        originMap.set(norm, capitalize(originRaw));
      }
    }

    if (destRaw) {
      const norm = normalize(destRaw);
      if (norm && !destMap.has(norm)) {
        destMap.set(norm, capitalize(destRaw));
      }
    }
  }

  const origins = Array.from(originMap.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const destinations = Array.from(destMap.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return { origins, destinations };
};

export const fetchExpandedRoutesAir =
  async (): Promise<ExpandedRoutesAirData> => {
    const response = await fetch(EXPANDED_ROUTES_AIR_CSV_URL);
    if (!response.ok) {
      throw new Error(
        `Error al cargar rutas aéreas expandidas: ${response.status}`,
      );
    }
    const csvText = await response.text();
    return parseExpandedRoutesAirCSV(csvText);
  };
