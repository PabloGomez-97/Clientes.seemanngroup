export const GOOGLE_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSWzBbNU6lsWnVEhRgzTPNEjtq-eH59rGSQf3QS6UGiRHT98A-g3LumdtuFHKb5lcGmERT4nZjAbMhm/pub?output=csv";

export interface OutletContext {
  accessToken: string;
  onLogout: () => void;
}

export interface RutaFCL {
  id: string;
  pol: string;
  polNormalized: string;
  pod: string;
  podNormalized: string;
  gp20: string;
  hq40: string;
  nor40: string | null;
  carrier: string;
  carrierNormalized: string;
  tt: string | null;
  remarks: string;
  company: string;
  companyNormalized: string;
  validUntil: string | null;
  row_number: number;
  priceForComparison: number;
  currency: Currency;
}

export interface SelectOption {
  value: string;
  label: string;
}

export type Currency = "USD" | "EUR" | "GBP" | "CAD" | "CHF" | "CLP" | "SEK";

export type ContainerType = "20GP" | "40HQ" | "40NOR";

export interface ContainerSelection {
  type: ContainerType;
  packageTypeId: number;
  price: number;
  priceString: string;
}

// ============================================================================
// MAPEO DE CONTENEDORES
// ============================================================================

export const CONTAINER_MAPPING = {
  "20GP": { id: 40, name: "20 FT. STANDARD CONTAINER" },
  "40HQ": { id: 27, name: "40 FT. HIGH CUBE" },
  "40NOR": { id: 25, name: "40 FT. REFRIGERATED (ALUMINIUM)" },
};

// ============================================================================
// FUNCIONES HELPER PARA RUTAS FCL
// ============================================================================

export const extractPrice = (priceStr: string | null): number => {
  if (!priceStr) return 0;
  const cleaned = priceStr.toString().replace(/[^\d,\.]/g, "");
  const normalized = cleaned.replace(",", ".");
  const price = parseFloat(normalized);
  return isNaN(price) ? 0 : price;
};

export const parseCurrency = (currencyStr: string | null): Currency => {
  if (!currencyStr) return "USD";
  const str = currencyStr.toString().trim().toUpperCase();

  if (str === "EUR") return "EUR";
  if (str === "GBP") return "GBP";
  if (str === "CAD") return "CAD";
  if (str === "CHF") return "CHF";
  if (str === "CLP") return "CLP";
  if (str === "SEK") return "SEK";
  if (str === "USD") return "USD";

  return "USD"; // Default fallback
};

export const normalize = (str: string | null): string => {
  if (!str) return "";
  return str.toString().toLowerCase().trim();
};

// ============================================================================
// FUNCIÓN PARA PARSEAR CSV CORRECTAMENTE
// ============================================================================

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

export const capitalize = (str: string): string => {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const parseFCL = (data: any[]): RutaFCL[] => {
  const rutas: RutaFCL[] = [];
  let idCounter = 1;

  for (let i = 2; i < data.length; i++) {
    const row: any = data[i];
    if (!row) continue;

    const pol = row[1];
    const pod = row[2];
    const gp20 = row[3];
    const hq40 = row[4];
    const nor40 = row[5];
    const carrier = row[6];
    const tt = row[7];
    const remarks = row[8];
    const company = row[10];
    const currency = row[11];
    const validUntil = row[12];

    if (pol && pod && typeof pol === "string" && typeof pod === "string") {
      // Parsear la moneda desde la columna [11]
      const parsedCurrency = parseCurrency(currency);
      const price = extractPrice(hq40);

      rutas.push({
        id: `FCL-${idCounter++}`,
        pol: pol.trim(),
        polNormalized: normalize(pol),
        pod: pod.trim(),
        podNormalized: normalize(pod),
        gp20: gp20 ? gp20.toString().trim() : "N/A",
        hq40: hq40 ? hq40.toString().trim() : "N/A",
        nor40: nor40 ? nor40.toString().trim() : null,
        carrier: carrier ? carrier.toString().trim() : "N/A",
        carrierNormalized: normalize(carrier),
        tt: tt ? tt.toString().trim() : null,
        remarks: remarks ? remarks.toString().trim() : "",
        company: company ? company.toString().trim() : "",
        companyNormalized: normalize(company),
        validUntil: validUntil ? validUntil.toString().trim() : null,
        row_number: i + 1,
        priceForComparison: price,
        currency: parsedCurrency, // 🆕 Usar la moneda parseada desde columna [11]
      });
    }
  }

  return rutas;
};

export interface ClienteAsignado {
  id: string;
  email: string;
  username: string;
  nombreuser: string;
  createdAt: string;
}

export interface QuoteFCLProps {
  preselectedPOL?: { value: string; label: string } | null;
  preselectedPOD?: { value: string; label: string } | null;
  isEjecutivoMode?: boolean;
}
