const rows = $input.all().map((item) => item.json);
const result = [];

const CONFIG = {
  COMPANIA: "LINEALOGISTICS",
  CURRENCY: "USD",
  FORTY_NOR: "",
  TRANSIT_TIME: "",
  COLUMNS: {
    carrier: "__EMPTY",
    pol: "__EMPTY_2",
    pod: "__EMPTY_3",
    type: "__EMPTY_4",
    totalFreight: "__EMPTY_10",
    ftPod: "__EMPTY_11",
    validTo: "__EMPTY_12",
    obs: "__EMPTY_13",
  },
};

const POL_CODE_MAP = {
  "RIO GRANDE": "Rio Grande",
  RIO: "Rio de Janeiro",
  IOA: "Itaguaí",
  SSZ: "Santos",
  PNG: "Paranaguá",
  ITJ: "Itajaí",
  ITAJAI: "Itajaí",
  ITAPOA: "Itapoá",
  PARANAGUA: "Paranaguá",
};

const MONTHS_ES = {
  1: "enero",
  2: "febrero",
  3: "marzo",
  4: "abril",
  5: "mayo",
  6: "junio",
  7: "julio",
  8: "agosto",
  9: "septiembre",
  10: "octubre",
  11: "noviembre",
  12: "diciembre",
};

function cleanValue(value) {
  return String(value ?? "")
    .replace(/\r/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(value) {
  return cleanValue(value)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(
    cleanValue(value)
      .replace(/USD/gi, "")
      .replace(/\$/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, ""),
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value) {
  if (!Number.isFinite(value) || value <= 0) return "";
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(2).replace(".", ",");
}

function mapPolToken(token) {
  const normalized = normalizeKey(token);
  if (!normalized) return "";

  const sortedKeys = Object.keys(POL_CODE_MAP).sort(
    (a, b) => b.length - a.length,
  );

  for (const key of sortedKeys) {
    if (normalized === normalizeKey(key)) {
      return POL_CODE_MAP[key];
    }
  }

  return cleanValue(token);
}

function expandPol(polRaw) {
  const pol = cleanValue(polRaw);
  if (!pol) return [];

  return pol
    .split("/")
    .map((token) => mapPolToken(token))
    .filter(Boolean);
}

function cleanPod(value) {
  const pod = cleanValue(value)
    .replace(/,\s*CL$/i, "")
    .replace(/,\s*CO$/i, "")
    .replace(/,\s*PE$/i, "")
    .trim();

  return pod
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function parseExcelDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number" && value > 30000) {
    return new Date(Date.UTC(1899, 11, 30 + Math.floor(value)));
  }

  const text = cleanValue(value);
  if (!text) return null;

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatValidez(value) {
  const date = parseExcelDate(value);
  if (!date) return "";

  const monthName = MONTHS_ES[date.getUTCMonth() + 1];
  if (!monthName) return "";

  return `${date.getUTCDate()} ${monthName}`;
}

function formatFreeTime(value) {
  const days = toNumber(value);
  return days > 0 ? `${days} days` : "";
}

/** TYPE del Excel → columna de tarifa en Google Sheets (20GP o 40HQ). */
function resolveContainerType(value) {
  const normalized = cleanValue(value)
    .toUpperCase()
    .replace(/['`´]/g, "")
    .replace(/\s+/g, "");

  if (
    normalized.startsWith("20") ||
    normalized.includes("20GP") ||
    normalized === "20GP"
  ) {
    return "20GP";
  }

  if (
    normalized.startsWith("40") ||
    normalized.includes("40HQ") ||
    normalized.includes("40HC") ||
    normalized === "40HQ"
  ) {
    return "40HQ";
  }

  return "";
}

function buildRates(containerType, total) {
  const formatted = formatNumber(total);
  return {
    rate20gp: containerType === "20GP" ? formatted : "",
    rate40hq: containerType === "40HQ" ? formatted : "",
  };
}

function isHeaderRow(row) {
  const carrier = cleanValue(row[CONFIG.COLUMNS.carrier]);
  return normalizeKey(carrier) === "CARRIER";
}

function isValidRateRow(row) {
  if (isHeaderRow(row)) return false;

  const carrier = cleanValue(row[CONFIG.COLUMNS.carrier]);
  const pol = cleanValue(row[CONFIG.COLUMNS.pol]);
  const pod = cleanValue(row[CONFIG.COLUMNS.pod]);
  const containerType = resolveContainerType(row[CONFIG.COLUMNS.type]);
  const total = toNumber(row[CONFIG.COLUMNS.totalFreight]);

  return !!(carrier && pol && pod && containerType && total > 0);
}

for (const row of rows) {
  if (!isValidRateRow(row)) continue;

  const cols = CONFIG.COLUMNS;
  const carrier = cleanValue(row[cols.carrier]);
  const pod = cleanPod(row[cols.pod]);
  const containerType = resolveContainerType(row[cols.type]);
  const total = toNumber(row[cols.totalFreight]);
  const freeTime = formatFreeTime(row[cols.ftPod]);
  const validez = formatValidez(row[cols.validTo]);
  const obs = cleanValue(row[cols.obs]);
  const { rate20gp, rate40hq } = buildRates(containerType, total);

  for (const pol of expandPol(row[cols.pol])) {
    result.push({
      json: {
        values: [
          "",
          pol,
          pod,
          rate20gp,
          rate40hq,
          CONFIG.FORTY_NOR,
          carrier,
          CONFIG.TRANSIT_TIME,
          obs,
          freeTime,
          CONFIG.COMPANIA,
          CONFIG.CURRENCY,
          validez,
        ],
      },
    });
  }
}

if (result.length === 0) {
  throw new Error(
    "No se generaron filas LINEALOGISTICS FCL desde el Excel adjunto.",
  );
}

return result;
