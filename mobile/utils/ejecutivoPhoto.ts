import { imgUrl } from "../config/images";

/** Misma regla que EjecutivoCard: iniciales de nombre + apellido → Cloudflare/R2. */
export function getEjecutivoPhotoUrl(nombre: string | null | undefined): string | null {
  if (!nombre?.trim()) return null;
  const partes = nombre.trim().split(/\s+/);
  if (partes.length < 2) return null;
  const a = partes[0][0];
  const b = partes[1][0];
  if (!a || !b) return null;
  return imgUrl(`/ejecutivos/${a.toLowerCase()}${b.toLowerCase()}.png`);
}

export function getInitials(nombre: string | null | undefined): string {
  if (!nombre?.trim()) return "?";
  return nombre
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
