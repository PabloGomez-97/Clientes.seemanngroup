// HandlerQuoteLCL.tsx
// Handlers y tipos para cotizaciones LCL

export interface PieceData {
  id: string;
  packageType: string;
  description: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  // Calculados
  volume: number;
  totalVolume: number;
  weightTons: number; // peso en toneladas
  totalWeightTons: number; // peso total en toneladas
  wmChargeable: number; // W/M individual (mayor entre toneladas y volumen)
}

export interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

export interface RutaLCL {
  id: string;
  pol: string;
  polNormalized: string;
  pod: string;
  podNormalized: string;
  servicio: string | null;
  ofWM: number;
  ofWMString: string;
  currency: "USD" | "EUR";
  frecuencia: string | null;
  agente: string | null;
  ttAprox: string | null;
  operador: string;
  operadorNormalized: string;
  row_number: number;
}

export interface SelectOption {
  value: string;
  label: string;
}

export const GOOGLE_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vT5T29WmDAI_z4RxlPtY3GoB3pm7NyBBiWZGc06cYRR1hg5fdFx7VEr3-i2geKxgw/pub?output=csv";

export type Operador = string;

export const extractPrice = (priceValue: any): number => {
  if (!priceValue) return 0;
  if (typeof priceValue === "number") return priceValue;
  const match = priceValue.toString().match(/[\d,]+\.?\d*/);
  if (!match) return 0;
  return parseFloat(match[0].replace(/,/g, ""));
};

export const normalize = (str: string | null): string => {
  if (!str) return "";
  return str.toString().toLowerCase().trim();
};

export const capitalize = (str: string): string => {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const parseCSV = (csvText: string): any[] => {
  const lines = csvText.split("\n");
  const result: any[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const row: any[] = [];
    let currentField = "";
    let insideQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const nextChar = line[j + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // Escaped quote
          currentField += '"';
          j++; // Skip next quote
        } else {
          // Toggle quote state
          insideQuotes = !insideQuotes;
        }
      } else if (char === "," && !insideQuotes) {
        // End of field
        row.push(currentField.trim());
        currentField = "";
      } else {
        currentField += char;
      }
    }

    // Add last field
    row.push(currentField.trim());
    result.push(row);
  }

  return result;
};

export const normalizePOD = (pod: string): string => {
  if (!pod) return "";

  const podLower = pod.toLowerCase().trim();

  // Definir mapeo de variantes a nombres canónicos
  const podMapping: { [key: string]: string } = {
    // Grupo: San Antonio - Valparaíso
    "san antonio - valparaiso": "san antonio - valparaiso",
    "san antonio / valparaiso": "san antonio - valparaiso",
    "vap / sai": "san antonio - valparaiso",
    "sai / vap": "san antonio - valparaiso",
    "valparaiso - san antonio": "san antonio - valparaiso",
    "valparaiso / san antonio": "san antonio - valparaiso",

    // Puertos individuales (mantener por si acaso)
    valparaiso: "valparaiso",
    "san antonio": "san antonio",
    iquique: "iquique",
    "iquique via san antonio": "iquique via san antonio",
    santos: "santos",
    callao: "callao",
    tbc: "tbc",
  };

  // Buscar coincidencia en el mapeo
  if (podMapping[podLower]) {
    return podMapping[podLower];
  }

  // Si no hay coincidencia específica, devolver normalizado estándar
  return podLower;
};

export const getPODDisplayName = (podNormalized: string): string => {
  const displayNames: { [key: string]: string } = {
    "san antonio - valparaiso": "SAN ANTONIO - VALPARAISO",
    valparaiso: "VALPARAISO",
    "san antonio": "SAN ANTONIO",
    iquique: "IQUIQUE",
    "iquique via san antonio": "IQUIQUE VIA SAN ANTONIO",
    santos: "SANTOS",
    callao: "CALLAO",
    tbc: "TBC",
  };

  return displayNames[podNormalized] || capitalize(podNormalized);
};

export const parseLCL = (data: any[]): RutaLCL[] => {
  const rutas: RutaLCL[] = [];
  let idCounter = 1;

  for (let i = 2; i < data.length; i++) {
    const row: any = data[i];
    if (!row) continue;

    const pol = row[1];
    const servicio = row[2];
    const pod = row[3];
    const ofWM = row[4];
    const currency = row[5];
    const frecuencia = row[6];
    const agente = row[7];
    const ttAprox = row[8];
    const operador = row[9];

    if (
      pol &&
      pod &&
      typeof pol === "string" &&
      typeof pod === "string" &&
      ofWM &&
      operador
    ) {
      const ofWMNumber = extractPrice(ofWM);

      rutas.push({
        id: `LCL-${idCounter++}`,
        pol: pol.trim(),
        polNormalized: normalize(pol),
        pod: pod.trim(),
        podNormalized: normalizePOD(pod),
        servicio: servicio ? servicio.toString().trim() : null,
        ofWM: ofWMNumber,
        ofWMString: ofWM.toString().trim(),
        currency:
          currency && currency.toString().toUpperCase() === "EUR"
            ? "EUR"
            : "USD",
        frecuencia: frecuencia ? frecuencia.toString().trim() : null,
        agente: agente ? agente.toString().trim() : null,
        ttAprox: ttAprox ? ttAprox.toString().trim() : null,
        operador: operador.toString().trim(),
        operadorNormalized: normalize(operador),
        row_number: i + 1,
      });
    }
  }

  return rutas;
};
