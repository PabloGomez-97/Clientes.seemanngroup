import { MOBILE_API_BASE } from "../../src/auth/authApi";

export type ProveedorTariffMode = "air" | "fcl" | "lcl";

const SCRIPT_URL: Record<ProveedorTariffMode, string> = {
  air: "https://script.google.com/macros/s/AKfycbw2HBzC1sHIKUAHG2PVCBKLtdTEatgv5I_hy2nL_DfjR-_rRR9nTwaxY7FNWojm5oMs/exec",
  fcl: "https://script.google.com/macros/s/AKfycbyOfoEKwyJK6kzkVMuMtB-N1QZB65R-S5tuTG38QQjY2SY01B3EupTwhAZ4J_OWycU/exec",
  lcl: "https://script.google.com/macros/s/AKfycbyDcpZT3TmaOmrOq-vJPoMMmwHlUzNf1wBQeZiUjSoPexfZ_IpShAJV2RivzyFLGGk3Jw/exec",
};

/** Columna Compañía (AIR/FCL) u Operador (LCL) — match con nombreuser. */
const OWNER_COL: Record<ProveedorTariffMode, number> = {
  air: 16,
  fcl: 10,
  lcl: 9,
};

export type ProveedorTariffRow = {
  id: string;
  mode: ProveedorTariffMode;
  origin: string;
  destination: string;
  carrier?: string;
  currency?: string;
  validUntil?: string;
  company: string;
  /** Resumen de precios para la card. */
  priceSummary: string;
  raw: string[];
};

function cell(row: string[], idx: number): string {
  const v = row[idx];
  return v == null ? "" : String(v).trim();
}

function mapRow(
  mode: ProveedorTariffMode,
  row: string[],
  index: number,
): ProveedorTariffRow | null {
  const ownerIdx = OWNER_COL[mode];
  const company = cell(row, ownerIdx);
  if (!company) return null;

  if (mode === "air") {
    const prices = [
      cell(row, 3) && `45kg ${cell(row, 3)}`,
      cell(row, 4) && `100kg ${cell(row, 4)}`,
      cell(row, 7) && `+1000 ${cell(row, 7)}`,
    ].filter(Boolean);
    return {
      id: `air-${index}`,
      mode,
      origin: cell(row, 1),
      destination: cell(row, 2),
      carrier: cell(row, 8) || undefined,
      currency: cell(row, 14) || undefined,
      validUntil: cell(row, 15) || undefined,
      company,
      priceSummary: prices.join(" · ") || "Sin tarifas",
      raw: row,
    };
  }

  if (mode === "fcl") {
    const prices = [
      cell(row, 3) && `20GP ${cell(row, 3)}`,
      cell(row, 4) && `40HQ ${cell(row, 4)}`,
      cell(row, 5) && `40NOR ${cell(row, 5)}`,
    ].filter(Boolean);
    return {
      id: `fcl-${index}`,
      mode,
      origin: cell(row, 1),
      destination: cell(row, 2),
      carrier: cell(row, 6) || undefined,
      currency: cell(row, 11) || undefined,
      validUntil: cell(row, 12) || undefined,
      company,
      priceSummary: prices.join(" · ") || "Sin tarifas",
      raw: row,
    };
  }

  // lcl
  return {
    id: `lcl-${index}`,
    mode,
    origin: cell(row, 1),
    destination: cell(row, 3),
    carrier: cell(row, 7) || cell(row, 2) || undefined,
    currency: cell(row, 5) || undefined,
    validUntil: cell(row, 10) || undefined,
    company,
    priceSummary: cell(row, 4)
      ? `OF W/M ${cell(row, 4)}${cell(row, 5) ? ` ${cell(row, 5)}` : ""}`
      : "Sin tarifa",
    raw: row,
  };
}

async function fetchSheetRows(mode: ProveedorTariffMode): Promise<string[][]> {
  const res = await fetch(`${SCRIPT_URL[mode]}?action=getAll`);
  if (!res.ok) {
    throw new Error("No se pudieron cargar las tarifas");
  }
  const data = (await res.json()) as { success?: boolean; data?: string[][] };
  if (!data.success || !Array.isArray(data.data)) {
    throw new Error("Respuesta inválida del tarifario");
  }
  return data.data;
}

export async function fetchProveedorOwnTariffs(
  mode: ProveedorTariffMode,
  nombreUsuario: string,
): Promise<ProveedorTariffRow[]> {
  const name = nombreUsuario.trim().toLowerCase();
  if (!name) return [];

  const rows = await fetchSheetRows(mode);
  const ownerIdx = OWNER_COL[mode];
  const mapped: ProveedorTariffRow[] = [];

  rows.forEach((row, index) => {
    const owner = cell(row, ownerIdx);
    if (!owner || owner.toLowerCase() !== name) return;
    const item = mapRow(mode, row, index);
    if (item) mapped.push(item);
  });

  return mapped;
}

export async function fetchProveedorTariffCounts(
  nombreUsuario: string,
): Promise<{ air: number; fcl: number; lcl: number; all: number }> {
  const [air, fcl, lcl] = await Promise.all([
    fetchProveedorOwnTariffs("air", nombreUsuario),
    fetchProveedorOwnTariffs("fcl", nombreUsuario),
    fetchProveedorOwnTariffs("lcl", nombreUsuario),
  ]);
  return {
    air: air.length,
    fcl: fcl.length,
    lcl: lcl.length,
    all: air.length + fcl.length + lcl.length,
  };
}

export type ProveedorEjecutivoContact = {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
};

export async function fetchProveedorAyudaEjecutivos(
  token: string,
): Promise<ProveedorEjecutivoContact[]> {
  const response = await fetch(
    `${MOBILE_API_BASE.replace(/\/$/, "")}/api/ejecutivos`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );
  if (!response.ok) {
    throw new Error("No se pudo cargar el equipo de ayuda");
  }
  const data = (await response.json()) as {
    ejecutivos?: ProveedorEjecutivoContact[];
  };
  return Array.isArray(data.ejecutivos) ? data.ejecutivos : [];
}
