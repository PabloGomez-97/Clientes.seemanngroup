import {
  getWeightRangeValidation,
  seleccionarTarifaPorPeso,
  type PieceData,
  type RutaAerea,
} from "./HandlerQuoteAir";
import type { OverallPieceDataAir } from "./airQuoteCargoShared";
import {
  AIR_VOLUME_FACTOR,
  calculateDetailedTotals,
  calculateOverallTotalsAir,
} from "./airQuoteCargoShared";
import {
  calculateAduanaCharges,
  applyDerechosExclusion,
  type IAgenciaAduanaConfig,
  type SupportedCurrency,
} from "../../../../types/agenciaAduana";
import {
  aereoTtExpenseFromIncome,
  findAereoTtBracket,
  type IAereoCotizadorConfig,
  type AereoTtBracketResult,
} from "../../../../types/gestionCotizador";
import {
  applyVespucioTransportSurcharge,
  type VespucioDeliveryZone,
} from "../../../../config/vespucioRing";
import {
  calculateStorageAt,
  type StorageAtCalculation,
  type StorageAtSheetData,
} from "../../../administrador/pricing/storage-at/storageAtSheet";
import type { AirTradeType } from "./airQuoteStep1Shared";

/** Markup configurable para cobros FCA (Local Charges & Gastos x kg) */
export const FCA_MARKUP = 1.2;
export const HANDLING_AMOUNT = 45;
export const HANDLING_AMOUNT_EXPORT_FCA = 60;
export const AWB_AMOUNT = 30;
export const BL_AMOUNT_EXPORT_FCA = 60;
export const BL_SERVICE = {
  id: 153153,
  code: "B",
  description: "BL",
} as const;
export const DESCONSOLIDACION_AMOUNT = 194.4;
export const AIRPORT_TRANSFER_RATE = 0.15;
export const AIRPORT_TRANSFER_MIN = 50;
export const SEGURO_MIN = 25;

export function resolveHandlingAmount(isExportFca: boolean): number {
  return isExportFca ? HANDLING_AMOUNT_EXPORT_FCA : HANDLING_AMOUNT;
}

export type AirportTransferQuote = {
  amount: number;
  rate: number;
  quantity: number;
  unit: string;
  source: "teisa" | "legacy";
  notes: string;
  teisa?: StorageAtCalculation;
};

/**
 * A/T:
 * - Exportación + FCA → sheet TEISA (`calculateStorageAt`) con peso cargable
 * - Resto → tarifa legacy 0.15/kg (mín. 50)
 */
export function resolveAirportTransfer(params: {
  weightKg: number;
  useTeisaExportFca: boolean;
  storageAtData: StorageAtSheetData | null;
}): AirportTransferQuote {
  const kg =
    Number.isFinite(params.weightKg) && params.weightKg > 0
      ? params.weightKg
      : 0;

  if (params.useTeisaExportFca) {
    if (!params.storageAtData || kg <= 0) {
      return {
        amount: 0,
        rate: 0,
        quantity: kg,
        unit: "kg",
        source: "teisa",
        notes:
          "Airport Transfer TEISA (Export FCA) — pendiente de sincronizar sheet o kg cargable",
      };
    }
    const teisa = calculateStorageAt(params.storageAtData, kg);
    return {
      amount: teisa.chargeUsd,
      rate: kg > 0 ? teisa.chargeUsd / kg : teisa.chargeUsd,
      quantity: kg,
      unit: "kg",
      source: "teisa",
      notes: `Airport Transfer TEISA (Export FCA) — ${kg} kg cargable; USD ${teisa.chargeUsd}${teisa.appliesMinimum ? " (mínimo)" : ""}`,
      teisa,
    };
  }

  const amount = Math.max(kg * AIRPORT_TRANSFER_RATE, AIRPORT_TRANSFER_MIN);
  return {
    amount,
    rate: AIRPORT_TRANSFER_RATE,
    quantity: kg,
    unit: "kg",
    source: "legacy",
    notes: `Airport Transfer charge - 0.15/kg (minimum USD ${AIRPORT_TRANSFER_MIN})`,
  };
}

export function calculateAirportTransfer(pesoParaCargos: number): number {
  return resolveAirportTransfer({
    weightKg: pesoParaCargos,
    useTeisaExportFca: false,
    storageAtData: null,
  }).amount;
}

export function isExportFcaAirportTransfer(
  tradeType: AirTradeType | null | undefined,
  incoterm: "EXW" | "FCA" | "" | null | undefined,
): boolean {
  return tradeType === "exportacion" && incoterm === "FCA";
}

export type AirCargoMode = "detailed" | "overall";

export type AirCargoSnapshot = {
  mode: AirCargoMode;
  pieces: PieceData[];
  overallPieces: OverallPieceDataAir[];
};

export function getCargoWeightTotals(cargo: AirCargoSnapshot) {
  if (cargo.mode === "overall") {
    const totals = calculateOverallTotalsAir(cargo.overallPieces);
    return {
      totalRealWeight: totals.totalWeight,
      totalVolumetricWeight: totals.totalVolumetricWeight,
      totalVolume: totals.totalVolume,
      chargeableWeight: totals.chargeableWeight,
    };
  }
  return calculateDetailedTotals(cargo.pieces);
}

export function resolveAirFreightWeights(
  ruta: RutaAerea | null,
  pesoChargeable: number,
  sinTarifa: boolean,
) {
  const weightRangeValidation = ruta
    ? getWeightRangeValidation(ruta, pesoChargeable)
    : null;
  const weightRangeError =
    !sinTarifa &&
    weightRangeValidation !== null &&
    !weightRangeValidation.tienePrecio;

  const pesoAirFreightBase =
    weightRangeError && weightRangeValidation?.pesoMinimoRequerido != null
      ? weightRangeValidation.pesoMinimoRequerido
      : pesoChargeable;

  const pesoAirFreight =
    !weightRangeError &&
    ruta?.kg45 &&
    pesoAirFreightBase < 45 &&
    !(ruta?.minAirFreight > 0)
      ? 45
      : pesoAirFreightBase;

  const pesoParaCargos = weightRangeError ? pesoChargeable : pesoAirFreight;

  return {
    weightRangeValidation,
    weightRangeError,
    pesoAirFreight,
    pesoParaCargos,
  };
}

export function calculateEXWRate(
  weightKg: number,
  volumeWeightKg: number,
): number {
  const chargeableWeight = Math.max(weightKg, volumeWeightKg);
  let ratePerKg: number;
  if (chargeableWeight >= 500) {
    ratePerKg = 0.8;
  } else if (chargeableWeight >= 300) {
    ratePerKg = 1.2;
  } else {
    ratePerKg = 1.6;
  }
  return Math.max(chargeableWeight * ratePerKg, 250);
}

export function calculateFCALocalCharges(ruta: RutaAerea | null): number {
  if (!ruta || ruta.localCharges <= 0) return 0;
  return ruta.localCharges * FCA_MARKUP;
}

export function calculateGastosXKg(
  ruta: RutaAerea | null,
  pesoParaCargos: number,
): number {
  if (!ruta || ruta.gastosXKg <= 0) return 0;
  const calculated = ruta.gastosXKg * pesoParaCargos * FCA_MARKUP;
  return Math.max(calculated, ruta.minGastosXKg > 0 ? ruta.minGastosXKg : 0);
}

export function calculateNoApilableAmount(
  incoterm: "EXW" | "FCA",
  noApilableActivo: boolean,
  totalRealWeight: number,
  chargeableWeight: number,
): number {
  if (!noApilableActivo || incoterm !== "EXW") return 0;
  return calculateEXWRate(totalRealWeight, chargeableWeight) * 0.6;
}

export type AirBaseChargesInput = {
  ruta: RutaAerea;
  incoterm: "EXW" | "FCA";
  sinTarifa: boolean;
  cargo: AirCargoSnapshot;
  profitMarkupPct: number;
  noApilableActivo?: boolean;
  /** Para A/T TEISA en Exportación + FCA */
  tradeType?: AirTradeType | null;
  storageAtData?: StorageAtSheetData | null;
};

export type AirFreightQuoteValues = {
  expenseRate: number;
  incomeRate: number;
  currency: string;
  incomeAmount: number;
  expenseAmount: number;
  rango: string | null;
};

export function computeAirFreightQuoteValues(
  input: AirBaseChargesInput,
): AirFreightQuoteValues | null {
  const totals = getCargoWeightTotals(input.cargo);
  const { pesoAirFreight } = resolveAirFreightWeights(
    input.ruta,
    totals.chargeableWeight,
    input.sinTarifa,
  );

  if (input.sinTarifa) {
    return {
      expenseRate: 0,
      incomeRate: 0,
      currency: input.ruta.currency || "USD",
      incomeAmount: 0,
      expenseAmount: 0,
      rango: null,
    };
  }

  const tarifa = seleccionarTarifaPorPeso(
    input.ruta,
    pesoAirFreight,
    input.profitMarkupPct,
  );
  if (!tarifa) return null;

  let incomeAmount = tarifa.precioConMarkup * pesoAirFreight;
  let expenseAmount = tarifa.precio * pesoAirFreight;

  // Mínimo flete aéreo (si aplica)
  if (input.ruta.minAirFreight > 0) {
    incomeAmount = Math.max(incomeAmount, input.ruta.minAirFreight);
    expenseAmount = Math.max(
      expenseAmount,
      input.ruta.minAirFreight / (1 + input.profitMarkupPct / 100),
    );
  }

  return {
    expenseRate: tarifa.precio,
    incomeRate: tarifa.precioConMarkup,
    currency: tarifa.moneda,
    incomeAmount,
    expenseAmount,
    rango: tarifa.rango,
  };
}

export function calculateAirBaseWithoutSeguro(
  input: AirBaseChargesInput,
  airFreightIncomeAmount: number,
): number {
  const totals = getCargoWeightTotals(input.cargo);
  const { pesoParaCargos } = resolveAirFreightWeights(
    input.ruta,
    totals.chargeableWeight,
    input.sinTarifa,
  );

  const useExportFca = isExportFcaAirportTransfer(input.tradeType, input.incoterm);
  const airportTransfer = resolveAirportTransfer({
    weightKg: useExportFca ? totals.chargeableWeight : pesoParaCargos,
    useTeisaExportFca: useExportFca,
    storageAtData: input.storageAtData ?? null,
  });

  let total =
    resolveHandlingAmount(useExportFca) +
    (useExportFca ? BL_AMOUNT_EXPORT_FCA : 0) +
    AWB_AMOUNT +
    airportTransfer.amount +
    airFreightIncomeAmount;

  if (input.incoterm === "EXW") {
    total += calculateEXWRate(totals.totalRealWeight, pesoParaCargos);
  }

  if (input.incoterm === "FCA") {
    total += calculateFCALocalCharges(input.ruta);
    total += calculateGastosXKg(input.ruta, pesoParaCargos);
  }

  return total;
}

export function calculateSeguroAmount(params: {
  activo: boolean;
  valorMercaderia: string;
  baseWithoutSeguro: number;
}): number {
  if (!params.activo) return 0;
  const valorCarga = parseFloat(params.valorMercaderia.replace(",", ".")) || 0;
  if (valorCarga === 0) return 0;
  return Math.max((valorCarga + params.baseWithoutSeguro) * 1.1 * 0.0025, SEGURO_MIN);
}

export function calculateUltimaMillaAmount(params: {
  activo: boolean;
  bracket: AereoTtBracketResult | null;
  zone: VespucioDeliveryZone | null;
  extendedMultiplier: number;
}): number {
  if (!params.activo || !params.bracket) return 0;
  if (!params.zone || params.zone === "outside") return 0;
  return applyVespucioTransportSurcharge(
    params.bracket.amount,
    params.zone,
    params.extendedMultiplier,
  );
}

export function resolveUltimaMillaBracket(
  totalRealWeightKg: number,
  aereoConfig: IAereoCotizadorConfig,
): AereoTtBracketResult | null {
  return findAereoTtBracket(totalRealWeightKg, aereoConfig);
}

export function calculateAduanaAmount(params: {
  activo: boolean;
  valorProducto: string;
  costoTransporte: number;
  seguroActivo: boolean;
  seguroMonto: number;
  currency: string;
  config: IAgenciaAduanaConfig | null;
  derechosExcluidos?: boolean;
}): number {
  if (!params.activo || !params.config) return 0;
  const valorProd = parseFloat(params.valorProducto.replace(",", ".")) || 0;
  if (valorProd <= 0) return 0;
  const seguroParaCIF = params.seguroActivo
    ? params.seguroMonto
    : (valorProd + params.costoTransporte) * 1.1 * 0.02;
  return applyDerechosExclusion(
    calculateAduanaCharges(
      valorProd,
      params.costoTransporte,
      seguroParaCIF,
      (params.currency || "USD") as SupportedCurrency,
      params.config,
    ),
    !!params.derechosExcluidos,
  ).total;
}

export type PdfChargeLine = {
  code: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
};

export type AirAddonsState = {
  seguroActivo: boolean;
  valorMercaderia: string;
  gastolocal: boolean;
  liveTrackingActivo: boolean;
  ultimaMillaActivo: boolean;
  ultimaMillaDireccion: string;
  ultimaMillaZone: VespucioDeliveryZone | null;
  ultimaMillaBracket: AereoTtBracketResult | null;
  aduanaActivo: boolean;
  valorProductoAduana: string;
  derechosAduanaExcluidos?: boolean;
  noApilableActivo: boolean;
};

export function buildAirPdfCharges(params: {
  base: AirBaseChargesInput;
  freight: AirFreightQuoteValues;
  addons: AirAddonsState;
  aduanaConfig: IAgenciaAduanaConfig | null;
  vespucioExtendedMultiplier: number;
  zeroAmounts?: boolean;
}): PdfChargeLine[] {
  const { base, freight, addons } = params;
  const totals = getCargoWeightTotals(base.cargo);
  const { pesoAirFreight, pesoParaCargos } = resolveAirFreightWeights(
    base.ruta,
    totals.chargeableWeight,
    base.sinTarifa,
  );

  const lines: PdfChargeLine[] = [];
  const useExportFca = isExportFcaAirportTransfer(base.tradeType, base.incoterm);
  const handlingAmount = resolveHandlingAmount(useExportFca);

  lines.push({
    code: "H",
    description: "HANDLING",
    quantity: 1,
    unit: "Each",
    rate: handlingAmount,
    amount: handlingAmount,
  });

  if (useExportFca) {
    lines.push({
      code: BL_SERVICE.code,
      description: BL_SERVICE.description,
      quantity: 1,
      unit: "Each",
      rate: BL_AMOUNT_EXPORT_FCA,
      amount: BL_AMOUNT_EXPORT_FCA,
    });
  }

  if (base.incoterm === "EXW") {
    const exw = calculateEXWRate(totals.totalRealWeight, pesoParaCargos);
    lines.push({
      code: "EC",
      description: "EXW CHARGES",
      quantity: 1,
      unit: "Shipment",
      rate: exw,
      amount: exw,
    });
  }

  lines.push({
    code: "AWB",
    description: "AWB",
    quantity: 1,
    unit: "Each",
    rate: AWB_AMOUNT,
    amount: AWB_AMOUNT,
  });

  const at = resolveAirportTransfer({
    weightKg: useExportFca ? totals.chargeableWeight : pesoParaCargos,
    useTeisaExportFca: useExportFca,
    storageAtData: base.storageAtData ?? null,
  });
  lines.push({
    code: "A/T",
    description: "AIRPORT TRANSFER",
    quantity: at.quantity,
    unit: at.unit,
    rate: at.rate,
    amount: at.amount,
  });

  lines.push({
    code: "AF",
    description: "AIR FREIGHT",
    quantity: pesoAirFreight,
    unit: "kg",
    rate: freight.incomeRate,
    amount: freight.incomeAmount,
  });

  if (base.incoterm === "FCA") {
    const fca = calculateFCALocalCharges(base.ruta);
    if (fca > 0) {
      lines.push({
        code: "FC",
        description: "FCA CHARGES",
        quantity: 1,
        unit: "Shipment",
        rate: fca,
        amount: fca,
      });
    }
    const gxk = calculateGastosXKg(base.ruta, pesoParaCargos);
    if (gxk > 0) {
      lines.push({
        code: "Gxk",
        description: "GASTOS X KG",
        quantity: pesoParaCargos,
        unit: "kg",
        rate: base.ruta.gastosXKg * FCA_MARKUP,
        amount: gxk,
      });
    }
  }

  const baseWithoutSeguro = calculateAirBaseWithoutSeguro(
    base,
    freight.incomeAmount,
  );
  const seguro = calculateSeguroAmount({
    activo: addons.seguroActivo,
    valorMercaderia: addons.valorMercaderia,
    baseWithoutSeguro,
  });
  if (addons.seguroActivo && seguro > 0) {
    lines.push({
      code: "S",
      description: "SEGURO",
      quantity: 1,
      unit: "Shipment",
      rate: seguro,
      amount: seguro,
    });
  }

  if (addons.gastolocal) {
    lines.push({
      code: "D",
      description: "GASTOS LOCALES (Desconsolidación)",
      quantity: 1,
      unit: "Shipment",
      rate: DESCONSOLIDACION_AMOUNT,
      amount: DESCONSOLIDACION_AMOUNT,
    });
  }

  const um = calculateUltimaMillaAmount({
    activo: addons.ultimaMillaActivo,
    bracket: addons.ultimaMillaBracket,
    zone: addons.ultimaMillaZone,
    extendedMultiplier: params.vespucioExtendedMultiplier,
  });
  if (um > 0) {
    lines.push({
      code: "TT",
      description: "TRANSPORTE TERRESTRE",
      quantity: 1,
      unit: "Shipment",
      rate: um,
      amount: um,
    });
  }

  if (addons.liveTrackingActivo) {
    lines.push({
      code: "LT",
      description: "LIVE TRACKING (Free)",
      quantity: 1,
      unit: "Shipment",
      rate: 0,
      amount: 0,
    });
  }

  const noApilable = calculateNoApilableAmount(
    base.incoterm,
    addons.noApilableActivo,
    totals.totalRealWeight,
    totals.chargeableWeight,
  );
  if (noApilable > 0) {
    lines.push({
      code: "NA",
      description: "NO APILABLE",
      quantity: 1,
      unit: "Shipment",
      rate: noApilable,
      amount: noApilable,
    });
  }

  const aduana = calculateAduanaAmount({
    activo: addons.aduanaActivo,
    valorProducto: addons.valorProductoAduana,
    costoTransporte: baseWithoutSeguro,
    seguroActivo: addons.seguroActivo,
    seguroMonto: seguro,
    currency: freight.currency,
    config: params.aduanaConfig,
    derechosExcluidos: addons.derechosAduanaExcluidos,
  });
  if (aduana > 0) {
    lines.push({
      code: "ADA",
      description: "AGENCIA DE ADUANA",
      quantity: 1,
      unit: "Shipment",
      rate: aduana,
      amount: aduana,
    });
  }

  if (params.zeroAmounts) {
    return lines.map((l) => ({ ...l, rate: 0, amount: 0 }));
  }
  return lines;
}

export function overallVolumeFromWeight(manualWeight: number, manualVolume: number) {
  return Math.max(manualWeight, manualVolume * AIR_VOLUME_FACTOR);
}

export { aereoTtExpenseFromIncome };
