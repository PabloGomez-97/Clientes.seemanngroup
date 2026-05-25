// ============================================================================
// Tipos compartidos — Gestión Cotizador (tarifas TT y recargos)
// ============================================================================

export interface IFclCotizadorConfig {
  ttRate20GP: number;
  ttRate40: number;
  vespucioExtendedSurchargePct: number;
}

export interface IGestionCotizadorConfig {
  fcl: IFclCotizadorConfig;
  updatedBy: string;
}

export const DEFAULT_FCL_COTIZADOR: IFclCotizadorConfig = {
  ttRate20GP: 690.2,
  ttRate40: 547.4,
  vespucioExtendedSurchargePct: 45,
};

export const DEFAULT_GESTION_COTIZADOR_CONFIG: IGestionCotizadorConfig = {
  fcl: DEFAULT_FCL_COTIZADOR,
  updatedBy: "system",
};

export type ContainerTypeForTt = "20GP" | "40HQ" | "40NOR";

export function getFclTtRate(
  containerType: ContainerTypeForTt,
  fcl: IFclCotizadorConfig = DEFAULT_FCL_COTIZADOR,
): number {
  return containerType === "20GP" ? fcl.ttRate20GP : fcl.ttRate40;
}

/** Multiplicador para zona extendida Vespucio (ej. 45 → 1.45) */
export function getVespucioExtendedMultiplier(
  surchargePct: number = DEFAULT_FCL_COTIZADOR.vespucioExtendedSurchargePct,
): number {
  return 1 + surchargePct / 100;
}
