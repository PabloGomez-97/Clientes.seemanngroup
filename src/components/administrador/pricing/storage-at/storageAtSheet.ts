/**
 * Storage / Airport Transfer — lectura y cálculo desde el sheet TEISA.
 *
 * Layout fijo (no mover filas/columnas en el sheet):
 *   G3  = kg de prueba
 *   A9–A12 = valores unitarios (Descarga, Acopio, Rayos X, Admin)
 *   B9–B12 = cálculo con IVA
 *   C9–C12 = mínimo por línea
 *   B14 / C14 = total USD (cálculo / mínimo) → se cobra MAX(B14, C14)
 */

export const STORAGE_AT_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vShrrOC9lxXYa-lqhqd9AjulSACLZVOSfhUxCLZNOQi7lDv-TC9LW0QkL_i9_l4rQ/pub?gid=406808416&single=true&output=csv";

export const STORAGE_AT_SHEET_HTML_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vShrrOC9lxXYa-lqhqd9AjulSACLZVOSfhUxCLZNOQi7lDv-TC9LW0QkL_i9_l4rQ/pubhtml?gid=406808416&single=true";

export const STORAGE_AT_IVA = 1.19;
/** Fallback si el sheet no trae totales USD utilizables */
export const STORAGE_AT_USD_RATE_FALLBACK = 950;
export const STORAGE_AT_POLL_MS = 60_000;

export type StorageAtLineKey =
  | "descarga"
  | "acopio"
  | "rayosX"
  | "administracion";

export interface StorageAtConcept {
  key: StorageAtLineKey;
  label: string;
  conceptMin: number | null;
  conceptMinRaw: string;
}

export interface StorageAtRateLine {
  key: StorageAtLineKey;
  label: string;
  /** A9–A12 */
  valor: number;
  /** B9–B12 en el sheet (con kg del sheet) */
  calculoSheet: number;
  /** C9–C12 — piso mínimo CLP por línea */
  minClp: number;
}

export interface StorageAtSheetData {
  title: string;
  kgSheet: number;
  concepts: StorageAtConcept[];
  lines: StorageAtRateLine[];
  totalClpCalculo: number;
  totalClpMin: number;
  totalUsdCalculo: number;
  totalUsdMin: number;
  usdRate: number;
  extras: { label: string; value: string; note: string }[];
  contacts: { name: string; phone: string; role: string }[];
  notice: string;
  rawRows: string[][];
  fetchedAt: number;
}

export interface StorageAtVerification {
  key: StorageAtLineKey;
  label: string;
  sheetValor: number;
  expectedFromConcept: number | null;
  ok: boolean;
  detail: string;
}

export interface StorageAtCalculation {
  kg: number;
  lines: {
    key: StorageAtLineKey;
    label: string;
    valor: number;
    calculo: number;
    minClp: number;
    aplicado: number;
  }[];
  totalClpCalculo: number;
  totalClpMin: number;
  totalUsdCalculo: number;
  totalUsdMin: number;
  /** MAX(B14, C14) — lo que se cobra */
  chargeUsd: number;
  appliesMinimum: boolean;
  usdRate: number;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch === "\r") {
      // ignore
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** Parsea montos CLP/USD del sheet (105.41 | 105,41 | $62,719 | 8.645). */
export function parseSheetNumber(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s || s === "(COBRO FIJO)") return null;
  s = s.replace(/\$/g, "").replace(/\s/g, "").replace(/"/g, "");
  if (!s) return null;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    // 1.234,56 → EU o 1,234.56 → US: el último separador es decimal
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    const parts = s.split(",");
    const right = parts[1] ?? "";
    if (right.length === 3 && /^\d+$/.test(right)) {
      s = parts.join(""); // miles: 62,719
    } else {
      s = `${parts[0]}.${right}`; // decimal: 105,41
    }
  } else if (hasDot) {
    const parts = s.split(".");
    const right = parts[1] ?? "";
    // En CL, 8.645 = 8645 (miles); 105.41 = decimal
    if (right.length === 3 && /^\d+$/.test(right) && parts.length === 2) {
      s = parts.join("");
    }
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function cell(rows: string[][], r0: number, c0: number): string {
  return rows[r0]?.[c0]?.trim() ?? "";
}

function extractRateFromConcept(label: string): number | null {
  // "Descarga: $105,41/kilo." | "Rayos X: $107.35/ kilo" | "Administración ... $ 8.645 + IVA"
  const match = label.match(/\$?\s*([\d.,]+)/);
  if (!match) return null;
  return parseSheetNumber(match[1]);
}

export function parseStorageAtSheet(
  csvText: string,
  fetchedAt = Date.now(),
): StorageAtSheetData {
  const rows = parseCsv(csvText);
  if (rows.length < 14) {
    throw new Error("El sheet Storage/AT no tiene el layout esperado (faltan filas).");
  }

  const title = cell(rows, 0, 0);
  const kgSheet = parseSheetNumber(cell(rows, 2, 6)) ?? 0;
  const notice = cell(rows, 4, 5);

  const conceptDefs: { key: StorageAtLineKey; row: number }[] = [
    { key: "descarga", row: 2 },
    { key: "acopio", row: 3 },
    { key: "rayosX", row: 4 },
    { key: "administracion", row: 5 },
  ];

  const concepts: StorageAtConcept[] = conceptDefs.map(({ key, row }) => {
    const label = cell(rows, row, 1);
    const minRaw = cell(rows, row, 2);
    return {
      key,
      label,
      conceptMin: parseSheetNumber(minRaw),
      conceptMinRaw: minRaw,
    };
  });

  const calcRows: { key: StorageAtLineKey; row: number; label: string }[] = [
    { key: "descarga", row: 8, label: concepts[0]?.label || "Descarga" },
    { key: "acopio", row: 9, label: concepts[1]?.label || "Acopio" },
    { key: "rayosX", row: 10, label: concepts[2]?.label || "Rayos X" },
    {
      key: "administracion",
      row: 11,
      label: concepts[3]?.label || "Administración zona Carga",
    },
  ];

  const lines: StorageAtRateLine[] = calcRows.map(({ key, row, label }) => {
    const valor = parseSheetNumber(cell(rows, row, 0));
    const calculoSheet = parseSheetNumber(cell(rows, row, 1));
    const minClp = parseSheetNumber(cell(rows, row, 2));
    if (valor == null || calculoSheet == null || minClp == null) {
      throw new Error(`Faltan valores en la fila de cálculo (${label}).`);
    }
    return { key, label, valor, calculoSheet, minClp };
  });

  const totalClpCalculo = parseSheetNumber(cell(rows, 12, 1)) ?? 0;
  const totalClpMin = parseSheetNumber(cell(rows, 12, 2)) ?? 0;
  const totalUsdCalculo = parseSheetNumber(cell(rows, 13, 1)) ?? 0;
  const totalUsdMin = parseSheetNumber(cell(rows, 13, 2)) ?? 0;

  // El sheet redondea CLP→USD con ~950. Inferir B13/B14 sesga el mínimo.
  const usdRate = STORAGE_AT_USD_RATE_FALLBACK;

  const extras: StorageAtSheetData["extras"] = [];
  const contacts: StorageAtSheetData["contacts"] = [];
  for (let r = 17; r < Math.min(rows.length, 25); r++) {
    const a = cell(rows, r, 0);
    const b = cell(rows, r, 1);
    const c = cell(rows, r, 2);
    if (!a) continue;
    if (c.toUpperCase().includes("EJECUTIVO") || c.toUpperCase().includes("GERENTE")) {
      contacts.push({ name: a, phone: b, role: c });
    } else {
      extras.push({ label: a, value: b, note: c });
    }
  }

  return {
    title,
    kgSheet,
    concepts,
    lines,
    totalClpCalculo,
    totalClpMin,
    totalUsdCalculo,
    totalUsdMin,
    usdRate,
    extras,
    contacts,
    notice,
    rawRows: rows,
    fetchedAt,
  };
}

export async function fetchStorageAtSheet(): Promise<StorageAtSheetData> {
  const response = await fetch(STORAGE_AT_SHEET_CSV_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`No se pudo leer el sheet (${response.status}).`);
  }
  const text = await response.text();
  return parseStorageAtSheet(text);
}

/** Verifica que A9–A12 coincidan con las tarifas declaradas en CONCEPTOS. */
export function verifyStorageAtRates(
  data: StorageAtSheetData,
): StorageAtVerification[] {
  return data.lines.map((line, idx) => {
    const concept = data.concepts[idx];
    const extracted = concept ? extractRateFromConcept(concept.label) : null;
    let expected: number | null = extracted;
    let detail = "";

    if (extracted != null) {
      expected = extracted;
      detail =
        line.key === "administracion"
          ? `Base en concepto (sin IVA): ${extracted.toLocaleString("es-CL")} — B12 aplica ×${STORAGE_AT_IVA}`
          : `Tarifa en concepto: ${extracted}`;
    } else {
      detail = "No se pudo leer la tarifa desde el texto del concepto";
    }

    const ok =
      expected == null
        ? false
        : Math.abs(expected - line.valor) < 0.02 ||
          Math.abs(expected - line.valor) / Math.max(expected, 1) < 0.005;

    return {
      key: line.key,
      label: line.label,
      sheetValor: line.valor,
      expectedFromConcept: expected,
      ok,
      detail: ok
        ? `OK — A${9 + idx} = ${line.valor}`
        : `Desfase — sheet ${line.valor} vs esperado ${expected ?? "?"} (${detail})`,
    };
  });
}

function roundClp(n: number): number {
  return Math.round(n);
}

function toUsd(clp: number, usdRate: number): number {
  return Math.round(clp / usdRate);
}

/**
 * Replica el motor del sheet:
 *   Bx = ROUND(Ax * kg * 1.19)  (Admin: ROUND(A12 * 1.19), sin kg)
 *   Cx = MAX(Bx, mínimo del sheet)
 *   Totales y cobro = MAX(B14, C14)
 */
export function calculateStorageAt(
  data: StorageAtSheetData,
  kg: number,
): StorageAtCalculation {
  const safeKg = Number.isFinite(kg) && kg > 0 ? kg : 0;
  const usdRate = data.usdRate || STORAGE_AT_USD_RATE_FALLBACK;

  const lines = data.lines.map((line) => {
    const calculo =
      line.key === "administracion"
        ? roundClp(line.valor * STORAGE_AT_IVA)
        : roundClp(line.valor * safeKg * STORAGE_AT_IVA);
    const aplicado = Math.max(calculo, line.minClp);
    return {
      key: line.key,
      label: line.label,
      valor: line.valor,
      calculo,
      minClp: line.minClp,
      aplicado,
    };
  });

  const totalClpCalculo = lines.reduce((s, l) => s + l.calculo, 0);
  const totalClpMin = lines.reduce((s, l) => s + l.aplicado, 0);
  const totalUsdCalculo = toUsd(totalClpCalculo, usdRate);
  const totalUsdMin = toUsd(totalClpMin, usdRate);
  const chargeUsd = Math.max(totalUsdCalculo, totalUsdMin);

  return {
    kg: safeKg,
    lines,
    totalClpCalculo,
    totalClpMin,
    totalUsdCalculo,
    totalUsdMin,
    chargeUsd,
    appliesMinimum: totalUsdCalculo < totalUsdMin,
    usdRate,
  };
}

export function formatClp(n: number): string {
  return `$${n.toLocaleString("es-CL")}`;
}

export function formatUsd(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}
