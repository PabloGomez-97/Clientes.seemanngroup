export interface DocItem {
  id: string;
  shipmentId: string | null;
  tipo: string;
  nombreArchivo: string;
  tipoArchivo: string;
  tamanoMB: string;
  fechaSubida: string;
  scope?: "cotizacion" | "operacional";
  modoOperacional?: "aereo" | "maritimo" | null;
}

export type TransportType = "all" | "air" | "ocean" | "ground" | "quotes";
export type GroupTransportType = Exclude<TransportType, "all">;

export const TRANSPORT_LABELS: Record<TransportType, string> = {
  all: "Todos",
  air: "Aérea",
  ocean: "Marítima",
  ground: "Terrestre",
  quotes: "Cotizaciones",
};

export const FILTER_LABELS: Record<TransportType, string> = {
  all: "Todos",
  air: "Aéreo",
  ocean: "Marítimo",
  ground: "Terrestre",
  quotes: "Cotizaciones",
};

export const FILTER_OPTIONS: Array<{
  key: TransportType;
  label: string;
}> = [
  { key: "all", label: FILTER_LABELS.all },
  { key: "air", label: FILTER_LABELS.air },
  { key: "ocean", label: FILTER_LABELS.ocean },
  { key: "ground", label: FILTER_LABELS.ground },
  { key: "quotes", label: FILTER_LABELS.quotes },
];

const FILE_BADGES: Array<{ match: string; label: string }> = [
  { match: "pdf", label: "PDF" },
  { match: "excel", label: "XLS" },
  { match: "spreadsheet", label: "XLS" },
  { match: "word", label: "DOC" },
  { match: "document", label: "DOC" },
];

export function getFileBadge(tipoArchivo: string) {
  const lower = tipoArchivo.toLowerCase();
  const match = FILE_BADGES.find((item) => lower.includes(item.match));
  return match?.label ?? "FILE";
}
