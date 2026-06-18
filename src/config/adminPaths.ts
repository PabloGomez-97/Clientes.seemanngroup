/** Canonical admin portal paths (post URL normalization). */
export const adminPaths = {
  home: "/admin/home",
  cotizador: "/admin/cotizador",
  clientes: "/admin/clientes",
  clientesReporteria: "/admin/clientes/reporteria",
  clientesDocumentacion: "/admin/clientes/documentacion",
  clientesTracking: "/admin/clientes/tracking",
  clientesComportamiento: "/admin/clientes/comportamiento",
  operacionesReporteria: "/admin/operaciones/clientes/reporteria",
  operacionesDocumentacion: "/admin/operaciones/clientes/documentacion",
  operacionesTracking: "/admin/operaciones/tracking",
  operacionesComportamiento: "/admin/operaciones/clientes/comportamiento",
  pricingAlertas: "/admin/pricing/alertas",
} as const;

export function adminClientPath(
  base: string,
  clientUsername?: string | null,
): string {
  if (!clientUsername) return base;
  return `${base}/${encodeURIComponent(clientUsername)}`;
}
