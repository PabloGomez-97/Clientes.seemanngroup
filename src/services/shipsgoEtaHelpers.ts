import { formatDateTime } from "../components/Sidebar/shipsgo/types";

export interface ShipsgoEtaEntry {
  current: string;
  initial?: string;
}

/** Fecha larga para ISO de ShipsGo (respeta zona horaria del valor, sin offset Linbis). */
export function formatShipsgoDateLong(iso?: string | null): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("es-CL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

export function formatShipsgoTime(iso?: string | null): string | null {
  if (!iso || !/T\d/.test(iso)) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

export function getShipsgoScheduledInitial(
  entry?: ShipsgoEtaEntry | null,
): string | undefined {
  if (!entry?.initial || !entry.current) return undefined;
  if (entry.initial === entry.current) return undefined;
  return entry.initial;
}

export function formatShipsgoScheduledLabel(iso: string): string {
  return formatDateTime(iso);
}
