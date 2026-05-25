// ============================================================================
// Tipos compartidos — Gestión Cotizador (tarifas TT, DELV y recargos)
// ============================================================================

export interface IFclCotizadorConfig {
  ttRate20GP: number;
  ttRate40: number;
  vespucioExtendedSurchargePct: number;
}

export interface ILclDeliveryBracket {
  maxKg: number;
  maxM3: number;
  amount: number;
}

export interface ILclCotizadorConfig {
  brackets: ILclDeliveryBracket[];
  maxKg: number;
  maxM3: number;
  vespucioExtendedSurchargePct: number;
}

export interface IGestionCotizadorConfig {
  fcl: IFclCotizadorConfig;
  lcl: ILclCotizadorConfig;
  updatedBy: string;
}

export const DEFAULT_FCL_COTIZADOR: IFclCotizadorConfig = {
  ttRate20GP: 690.2,
  ttRate40: 547.4,
  vespucioExtendedSurchargePct: 45,
};

export const DEFAULT_LCL_DELIVERY_BRACKETS: ILclDeliveryBracket[] = [
  { maxKg: 500, maxM3: 2.5, amount: 183.26 },
  { maxKg: 1000, maxM3: 5, amount: 202.9 },
  { maxKg: 2000, maxM3: 8, amount: 248.71 },
  { maxKg: 3000, maxM3: 11, amount: 274.89 },
  { maxKg: 4000, maxM3: 15, amount: 294.53 },
  { maxKg: 5000, maxM3: 20, amount: 314.16 },
  { maxKg: 6000, maxM3: 25, amount: 353.43 },
  { maxKg: 7000, maxM3: 30, amount: 392.7 },
];

export const DEFAULT_LCL_COTIZADOR: ILclCotizadorConfig = {
  brackets: DEFAULT_LCL_DELIVERY_BRACKETS,
  maxKg: 7000,
  maxM3: 30,
  vespucioExtendedSurchargePct: 45,
};

export const DEFAULT_GESTION_COTIZADOR_CONFIG: IGestionCotizadorConfig = {
  fcl: DEFAULT_FCL_COTIZADOR,
  lcl: DEFAULT_LCL_COTIZADOR,
  updatedBy: "system",
};

export const LCL_DELIVERY_EXPENSE_DIVISOR = 1.1;

export type ContainerTypeForTt = "20GP" | "40HQ" | "40NOR";

export function getFclTtRate(
  containerType: ContainerTypeForTt,
  fcl: IFclCotizadorConfig = DEFAULT_FCL_COTIZADOR,
): number {
  return containerType === "20GP" ? fcl.ttRate20GP : fcl.ttRate40;
}

export function getVespucioExtendedMultiplier(
  surchargePct: number = DEFAULT_FCL_COTIZADOR.vespucioExtendedSurchargePct,
): number {
  return 1 + surchargePct / 100;
}

export interface LclDeliveryBracketResult {
  amount: number;
  unit: "kg" | "m3";
  quantity: number;
  bracketIndex: number;
}

/**
 * Bracket DELV LCL: elige el tramo de mayor índice entre peso real (kg) y volumen (m³).
 */
export function findLclDeliveryBracket(
  realWeightKg: number,
  totalVolumeM3: number,
  lcl: ILclCotizadorConfig = DEFAULT_LCL_COTIZADOR,
): LclDeliveryBracketResult | null {
  const { brackets, maxKg, maxM3 } = lcl;
  if (realWeightKg > maxKg || totalVolumeM3 > maxM3) {
    return null;
  }

  const kgIdx = brackets.findIndex((b) => realWeightKg <= b.maxKg);
  const m3Idx = brackets.findIndex((b) => totalVolumeM3 <= b.maxM3);
  if (kgIdx < 0 && m3Idx < 0) return null;

  const effectiveKgIdx = kgIdx >= 0 ? kgIdx : -1;
  const effectiveM3Idx = m3Idx >= 0 ? m3Idx : -1;

  let chosenIdx: number;
  let unit: "kg" | "m3";
  let quantity: number;

  if (effectiveKgIdx > effectiveM3Idx) {
    chosenIdx = effectiveKgIdx;
    unit = "kg";
    quantity = realWeightKg;
  } else if (effectiveM3Idx > effectiveKgIdx) {
    chosenIdx = effectiveM3Idx;
    unit = "m3";
    quantity = totalVolumeM3;
  } else {
    chosenIdx = effectiveM3Idx;
    unit = "m3";
    quantity = totalVolumeM3;
  }

  return {
    amount: brackets[chosenIdx].amount,
    unit,
    quantity,
    bracketIndex: chosenIdx,
  };
}

export function lclDeliveryExpenseFromIncome(incomeAmount: number): number {
  return Number((incomeAmount / LCL_DELIVERY_EXPENSE_DIVISOR).toFixed(2));
}
