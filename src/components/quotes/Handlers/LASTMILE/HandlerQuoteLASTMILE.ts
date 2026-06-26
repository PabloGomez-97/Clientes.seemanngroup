import { capitalize, normalize, parseCSV } from "../FCL/HandlerQuoteFCL";

export const GOOGLE_SHEET_LASTMILE_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQR3oDDQTX5G7AN0yEkV3dzDS_SHP3ERZNkud92VuugEO2tggHh4hi9Ssat8L_VrTsmRmVCrXkQGQ1r/pub?gid=0&single=true&output=csv";

/** Rutas marítimas (FCL / LCL): solo puertos. */
export const GOOGLE_SHEET_LASTMILE_AIR_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQR3oDDQTX5G7AN0yEkV3dzDS_SHP3ERZNkud92VuugEO2tggHh4hi9Ssat8L_VrTsmRmVCrXkQGQ1r/pub?gid=404575258&single=true&output=csv";

export type LastMileServicio = "FCL" | "AÉREO" | "LCL";

export const getLastMileCsvUrl = (servicio: LastMileServicio): string => {
  const isAereo =
    servicio === "AÉREO" ||
    servicio.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase() === "AEREO";
  return isAereo
    ? GOOGLE_SHEET_LASTMILE_AIR_CSV_URL
    : GOOGLE_SHEET_LASTMILE_CSV_URL;
};

export interface LastMileSelectOption {
  value: string;
  label: string;
}

export interface RutaLastMile {
  id: string;
  origen: string;
  origenNormalized: string;
  destino: string;
  destinoNormalized: string;
}

export interface ClienteAsignadoLM {
  id: string;
  email: string;
  username: string;
  usernames?: string[];
  nombreuser: string;
  createdAt: string;
}

export interface QuoteLastMileProps {
  preselectedOrigin?: { value: string; label: string } | null;
  preselectedDestination?: { value: string; label: string } | null;
  isEjecutivoMode?: boolean;
  abandonRef?: import("react").MutableRefObject<(() => void) | null>;
}

/**
 * Estructura de pieza para Última Milla. Mismo modelo que el sistema de
 * piezas de QuoteAIR pero sin `noApilable`. Las dimensiones se almacenan
 * siempre en SI (cm / kg). El factor volumétrico utilizado es 167 kg/m³.
 */
export interface PieceDataLM {
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
  volumeWeight: number;
  totalVolumeWeight: number;
  totalWeight: number;
}

/**
 * Parsea el CSV publicado del sheet de Última Milla.
 * Estructura observada:
 *   col[0] vacío | col[1] = Origen | col[2] = Destino
 *
 * Existen N orígenes (col[1] en filas sucesivas) y un único destino
 * (col[2] en la primera fila con datos). El resultado expande la combinación
 * NxM (típicamente Nx1).
 */

export const parseLastMile = (data: any[]): RutaLastMile[] => {
  const origenes: { raw: string; norm: string }[] = [];
  const destinos: { raw: string; norm: string }[] = [];

  for (let i = 0; i < data.length; i++) {
    const row: any = data[i];
    if (!row) continue;

    const colA = (row[1] || row[0] || "").toString().trim();
    const colB = (row[2] || "").toString().trim();

    if (colA && !/^origen$/i.test(colA)) {
      const norm = normalize(colA);
      if (norm && !origenes.find((o) => o.norm === norm)) {
        origenes.push({ raw: colA, norm });
      }
    }
    if (colB && !/^destino$/i.test(colB)) {
      const norm = normalize(colB);
      if (norm && !destinos.find((d) => d.norm === norm)) {
        destinos.push({ raw: colB, norm });
      }
    }
  }

  const rutas: RutaLastMile[] = [];
  let id = 1;
  for (const o of origenes) {
    for (const d of destinos) {
      rutas.push({
        id: `LM-${id++}`,
        origen: capitalize(o.raw),
        origenNormalized: o.norm,
        destino: capitalize(d.raw),
        destinoNormalized: d.norm,
      });
    }
  }
  return rutas;
};

export { parseCSV };

// ============================================================================
// ADUANA / NACIONALIZACIÓN DDP — Desglose Linbis (reemplaza cobro agrupado Ee)
// ============================================================================

export interface AduanaLinbisServiceDef {
  id: number;
  code: string;
  description: string;
  reference: string;
}

/** Servicios Linbis para cada componente de calculateAduanaCharges. */
export const ADUANA_LINBIS_SERVICES = {
  derechos: {
    id: 146100,
    code: "CUST",
    description: "CUSTOMS CLEARANCE",
    reference: "Amount to Customs Clearance",
  },
  ivaAduanero: {
    id: 146101,
    code: "CT1",
    description: "CUSTOMS TAX 19%",
    reference: "Amount to Customs Tax 19%",
  },
  honorarios: {
    id: 146102,
    code: "CB",
    description: "CUSTOMS BROKER",
    reference: "Amount to Customs Broker",
  },
  mensajeria: {
    id: 146103,
    code: "CM",
    description: "CUSTOMS MESSAGING",
    reference: "Amount to Customs Messaging",
  },
  tramitacion: {
    id: 146104,
    code: "CP",
    description: "CUSTOMS PROCESSING",
    reference: "Amount to Customs Processing",
  },
  gastosDespacho: {
    id: 146105,
    code: "CSC",
    description: "CUSTOMS SHIPPING COST",
    reference: "Amount to Customs Shipping Cost",
  },
} as const satisfies Record<string, AduanaLinbisServiceDef>;

export interface AduanaBreakdownAmounts {
  honorarios: number;
  gastosDespacho: number;
  tramitacion: number;
  mensajeria: number;
  ivaAduanero: number;
  derechos: number;
}

export interface AduanaBreakdownPdfCharge {
  code: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

const ADUANA_BREAKDOWN_ORDER: Array<{
  key: keyof AduanaBreakdownAmounts;
  service: AduanaLinbisServiceDef;
}> = [
  { key: "derechos", service: ADUANA_LINBIS_SERVICES.derechos },
  { key: "ivaAduanero", service: ADUANA_LINBIS_SERVICES.ivaAduanero },
  { key: "honorarios", service: ADUANA_LINBIS_SERVICES.honorarios },
  { key: "mensajeria", service: ADUANA_LINBIS_SERVICES.mensajeria },
  { key: "tramitacion", service: ADUANA_LINBIS_SERVICES.tramitacion },
  { key: "gastosDespacho", service: ADUANA_LINBIS_SERVICES.gastosDespacho },
];

export const buildAduanaBreakdownFromResult = (result: {
  honorarios: number;
  gastosDespacho: number;
  tramitacion: number;
  mensajeria: number;
  ivaAduanero: number;
  derechos: number;
}): AduanaBreakdownAmounts => ({
  honorarios: Number(result.honorarios.toFixed(2)),
  gastosDespacho: Number(result.gastosDespacho.toFixed(2)),
  tramitacion: Number(result.tramitacion.toFixed(2)),
  mensajeria: Number(result.mensajeria.toFixed(2)),
  ivaAduanero: Number(result.ivaAduanero.toFixed(2)),
  derechos: Number(result.derechos.toFixed(2)),
});

export const buildAduanaLinbisCharges = (
  breakdown: AduanaBreakdownAmounts,
  billToName: string,
  contextNote: string,
) =>
  ADUANA_BREAKDOWN_ORDER.flatMap(({ key, service }) => {
    const amount = breakdown[key];
    if (amount <= 0) return [];

    return [
      {
        service: { id: service.id, code: service.code },
        income: {
          quantity: 1,
          unit: "Each",
          rate: amount,
          amount,
          showamount: amount,
          payment: "Collect",
          billApplyTo: "Other",
          billTo: { name: billToName },
          currency: { abbr: "USD" as const },
          reference: service.reference,
          showOnDocument: true,
          notes: `${service.description} - ${contextNote}`,
        },
        expense: { currency: { abbr: "USD" as const } },
      },
    ];
  });

export const buildAduanaPdfCharges = (
  breakdown: AduanaBreakdownAmounts,
): AduanaBreakdownPdfCharge[] =>
  ADUANA_BREAKDOWN_ORDER.flatMap(({ key, service }) => {
    const amount = breakdown[key];
    if (amount <= 0) return [];

    return [
      {
        code: service.code,
        description: service.description,
        quantity: 1,
        unit: "Each",
        rate: amount,
        amount,
      },
    ];
  });
