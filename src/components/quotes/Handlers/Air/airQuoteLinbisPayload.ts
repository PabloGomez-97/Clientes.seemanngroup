import { parseValidUntilToISO } from "../handlerFechas";
import type { RutaAerea } from "./HandlerQuoteAir";
import {
  DEFAULT_OVERALL_AIR_DESCRIPTION,
  DEFAULT_OVERALL_AIR_PACKAGE_TYPE,
} from "./airQuoteCargoShared";
import {
  AWB_AMOUNT,
  BL_AMOUNT_EXPORT,
  BL_SERVICE,
  BANK_FEE_AMOUNT,
  BANK_FEE_SERVICE,
  CUSTOM_BROKER_SERVICE,
  CUSTOMS_DECLARATION_AMOUNT,
  CUSTOMS_DECLARATION_SERVICE,
  DESCONSOLIDACION_AMOUNT,
  EXPORT_EXW_TT_SERVICE,
  FCA_MARKUP,
  aereoTtExpenseFromIncome,
  calculateAduanaAmount,
  calculateAirBaseWithoutSeguro,
  calculateCustomBrokerAmount,
  calculateExportExwCif,
  calculateEXWRate,
  calculateFCALocalCharges,
  calculateGastosXKg,
  calculateNoApilableAmount,
  calculateSeguroAmount,
  calculateUltimaMillaAmount,
  getCargoWeightTotals,
  isExportExw,
  isExportFcaOrExw,
  resolveAirFreightWeights,
  resolveAirportTransfer,
  resolveHandlingAmount,
  type AirAddonsState,
  type AirBaseChargesInput,
  type AirFreightQuoteValues,
} from "./airQuotePricingShared";
import { findAereoTtBracket } from "../../../../types/gestionCotizador";
import type { IAgenciaAduanaConfig } from "../../../../types/agenciaAduana";
import type { IAereoCotizadorConfig } from "../../../../types/gestionCotizador";
import {
  AIR_CONNECT_CURRENCY,
  LINBIS_GASTOS_TOTALES_SERVICE,
  type AirConnectPricedOffer,
} from "../../../../services/airConnectSpainQuote";

export type SalesRepPayload = { id: number } | { name: string };

function parseTransitDays(
  transit?: string | number | null,
): number | null {
  if (transit === undefined || transit === null) return null;
  const raw = String(transit);
  if (raw.trim() === "") return null;
  if (typeof transit === "number") return Math.max(1, Math.floor(transit));

  const txt = raw.trim().toLowerCase();
  const rangeMatch = txt.match(/(\d+)\s*[-–—]\s*(\d+)\s*(?:days?|d[ií]as?)?/i);
  if (rangeMatch) {
    const hi = parseInt(rangeMatch[2], 10);
    if (!isNaN(hi)) return Math.max(1, hi);
  }
  const singleMatch = txt.match(/(\d{1,4})\s*(?:days?|d[ií]as?)/i);
  if (singleMatch) {
    const v = parseInt(singleMatch[1], 10);
    if (!isNaN(v)) return Math.max(1, v);
  }
  const anyNum = txt.match(/(\d{1,4})/);
  if (anyNum) {
    const v = parseInt(anyNum[1], 10);
    if (!isNaN(v)) return Math.max(1, v);
  }
  return null;
}

function billTo(name: string) {
  return { name };
}

function currencyAbbr(ruta: RutaAerea) {
  return { abbr: (ruta.currency || "USD") as string };
}

function zeroChargesIfPending<T extends { income?: any; expense?: any }>(
  charges: T[],
  pending: boolean,
): T[] {
  if (!pending) return charges;
  return charges.map((ch) => ({
    ...ch,
    income: {
      ...ch.income,
      rate: 0,
      amount: 0,
      ...(ch.income?.showamount !== undefined ? { showamount: 0 } : {}),
    },
    expense: {
      ...ch.expense,
      ...(ch.expense?.rate !== undefined ? { rate: 0 } : {}),
      ...(ch.expense?.amount !== undefined ? { amount: 0 } : {}),
    },
  }));
}

export type BuildAirLinbisPayloadInput = {
  ruta: RutaAerea;
  incoterm: "EXW" | "FCA";
  sinTarifa: boolean;
  effectiveUsername: string;
  salesRep: SalesRepPayload;
  pickupFromAddress?: string;
  deliveryToAddress?: string;
  base: AirBaseChargesInput;
  freight: AirFreightQuoteValues;
  addons: AirAddonsState;
  aduanaConfig: IAgenciaAduanaConfig | null;
  aereoTtConfig: IAereoCotizadorConfig;
  vespucioExtendedMultiplier: number;
};

export function buildAirLinbisPayload(input: BuildAirLinbisPayloadInput) {
  const {
    ruta,
    incoterm,
    sinTarifa,
    effectiveUsername,
    salesRep,
    freight,
    addons,
  } = input;
  const totals = getCargoWeightTotals(input.base.cargo);
  const { pesoAirFreight, pesoParaCargos } = resolveAirFreightWeights(
    ruta,
    totals.chargeableWeight,
    sinTarifa,
  );
  const showPendingQuote = sinTarifa;
  const routeInfoPlaceholder = "Por Confirmar";
  const username = effectiveUsername;
  const cur = currencyAbbr(ruta);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const charges: any[] = [];
  const useExportSpecial = isExportFcaOrExw(input.base.tradeType, incoterm);
  const useExportExw = isExportExw(input.base.tradeType, incoterm);
  const handlingAmount = resolveHandlingAmount(useExportSpecial);

  charges.push({
    service: { id: 162, code: "H" },
    income: {
      quantity: 1,
      unit: "HL",
      rate: handlingAmount,
      amount: handlingAmount,
      showamount: handlingAmount,
      payment: "Collect",
      billApplyTo: "Other",
      billTo: billTo(username),
      currency: cur,
      reference: "Amount to Handling",
      showOnDocument: true,
      notes: useExportSpecial
        ? "Handling charge (Export) created via Client Portal"
        : "Handling charge created via Client Portal",
    },
    expense: { currency: cur },
  });

  if (useExportSpecial) {
    charges.push({
      service: {
        id: BL_SERVICE.id,
        code: BL_SERVICE.code,
      },
      income: {
        quantity: 1,
        unit: "Each",
        rate: BL_AMOUNT_EXPORT,
        amount: BL_AMOUNT_EXPORT,
        showamount: BL_AMOUNT_EXPORT,
        payment: "Collect",
        billApplyTo: "Other",
        billTo: billTo(username),
        currency: cur,
        reference: "Amount to BL",
        showOnDocument: true,
        notes: "BL charge (Export) created via Client Portal",
      },
      expense: { currency: cur },
    });
  }

  if (incoterm === "EXW") {
    const exw = calculateEXWRate(totals.totalRealWeight, pesoParaCargos);
    charges.push({
      service: { id: 271, code: "EC" },
      income: {
        quantity: 1,
        unit: "EXW CHARGES",
        rate: exw,
        amount: exw,
        showamount: exw,
        payment: "Collect",
        billApplyTo: "Other",
        billTo: billTo(username),
        currency: cur,
        reference: "Amount to EXW Charges",
        showOnDocument: true,
        notes: "EXW charge created via Client Portal",
      },
      expense: { currency: cur },
    });
  }

  charges.push({
    service: { id: 335, code: "AWB" },
    income: {
      quantity: 1,
      unit: "AWB",
      rate: AWB_AMOUNT,
      amount: AWB_AMOUNT,
      showamount: AWB_AMOUNT,
      payment: "Collect",
      billApplyTo: "Other",
      billTo: billTo(username),
      currency: cur,
      reference: "Amount to AWB",
      showOnDocument: true,
      notes: "AWB charge created via Client Portal",
    },
    expense: { currency: cur },
  });

  const airportTransfer = resolveAirportTransfer({
    weightKg: useExportSpecial ? totals.chargeableWeight : pesoParaCargos,
    useTeisaExportFca: useExportSpecial,
    storageAtData: input.base.storageAtData ?? null,
  });
  charges.push({
    service: { id: 110936, code: "A/T" },
    income: {
      quantity: airportTransfer.quantity,
      unit: airportTransfer.unit,
      rate: airportTransfer.rate,
      amount: airportTransfer.amount,
      showamount: airportTransfer.amount,
      payment: "Collect",
      billApplyTo: "Other",
      billTo: billTo(username),
      currency: cur,
      reference: "Amount to AirPort Transfer",
      showOnDocument: true,
      notes: airportTransfer.notes,
    },
    expense: { currency: cur },
  });

  if (useExportExw) {
    const tt = findAereoTtBracket(
      totals.totalRealWeight,
      input.aereoTtConfig,
    );
    if (tt) {
      const ttExpense = aereoTtExpenseFromIncome(tt.amount);
      charges.push({
        service: {
          id: EXPORT_EXW_TT_SERVICE.id,
          code: EXPORT_EXW_TT_SERVICE.code,
          description: EXPORT_EXW_TT_SERVICE.description,
        },
        income: {
          quantity: 1,
          unit: "SHIPMENT",
          rate: tt.amount,
          amount: tt.amount,
          showamount: tt.amount,
          payment: "Collect",
          billApplyTo: "Other",
          billTo: billTo(username),
          currency: cur,
          reference: "Amount to TT Export EXW",
          showOnDocument: true,
          notes: `Transporte Terrestre Export EXW - peso real ${totals.totalRealWeight.toFixed(2)} kg`,
        },
        expense: {
          quantity: 1,
          unit: "SHIPMENT",
          rate: ttExpense,
          amount: ttExpense,
          showamount: ttExpense,
          payment: "Collect",
          billApplyTo: "Other",
          billTo: billTo(username),
          currency: cur,
          reference: "Expense TT Export EXW",
          showOnDocument: false,
          notes: "Transporte Terrestre Export EXW expense - income / 1.10",
        },
      });
    }
    charges.push({
      service: {
        id: BANK_FEE_SERVICE.id,
        code: BANK_FEE_SERVICE.code,
        description: BANK_FEE_SERVICE.description,
      },
      income: {
        quantity: 1,
        unit: "Each",
        rate: BANK_FEE_AMOUNT,
        amount: BANK_FEE_AMOUNT,
        showamount: BANK_FEE_AMOUNT,
        payment: "Collect",
        billApplyTo: "Other",
        billTo: billTo(username),
        currency: cur,
        reference: "Amount to BANK FEE",
        showOnDocument: true,
        notes: "BANK FEE (Export EXW) created via Client Portal",
      },
      expense: { currency: cur },
    });

    const valorProducto =
      parseFloat(String(addons.valorMercaderia ?? "").replace(",", ".")) || 0;
    if (valorProducto > 0) {
      const costoTransporte =
        resolveHandlingAmount(true) +
        BL_AMOUNT_EXPORT +
        (incoterm === "EXW"
          ? calculateEXWRate(totals.totalRealWeight, pesoParaCargos)
          : 0) +
        AWB_AMOUNT +
        airportTransfer.amount +
        freight.incomeAmount +
        (tt?.amount ?? 0);
      const seguroMonto = addons.seguroActivo
        ? calculateSeguroAmount({
            activo: true,
            valorMercaderia: addons.valorMercaderia,
            baseWithoutSeguro: costoTransporte + BANK_FEE_AMOUNT,
          })
        : 0;
      const { cif } = calculateExportExwCif({
        valorProducto,
        costoTransporte,
        seguroActivo: addons.seguroActivo,
        seguroMonto,
      });
      const customBroker = calculateCustomBrokerAmount(cif);
      charges.push({
        service: {
          id: CUSTOM_BROKER_SERVICE.id,
          code: CUSTOM_BROKER_SERVICE.code,
          description: CUSTOM_BROKER_SERVICE.description,
        },
        income: {
          quantity: 1,
          unit: "Shipment",
          rate: customBroker,
          amount: customBroker,
          showamount: customBroker,
          payment: "Collect",
          billApplyTo: "Other",
          billTo: billTo(username),
          currency: cur,
          reference: "Amount to CUSTOM BROKER",
          showOnDocument: true,
          notes: `Custom Broker 0.25% CIF ${cif.toFixed(2)} (min 175)`,
        },
        expense: { currency: cur },
      });
      charges.push({
        service: {
          id: CUSTOMS_DECLARATION_SERVICE.id,
          code: CUSTOMS_DECLARATION_SERVICE.code,
          description: CUSTOMS_DECLARATION_SERVICE.description,
        },
        income: {
          quantity: 1,
          unit: "Each",
          rate: CUSTOMS_DECLARATION_AMOUNT,
          amount: CUSTOMS_DECLARATION_AMOUNT,
          showamount: CUSTOMS_DECLARATION_AMOUNT,
          payment: "Collect",
          billApplyTo: "Other",
          billTo: billTo(username),
          currency: cur,
          reference: "Amount to CUSTOMS DECLARATION",
          showOnDocument: true,
          notes: "Customs Declaration (Export EXW) fixed charge",
        },
        expense: { currency: cur },
      });
    }
  }

  charges.push({
    service: { id: 4, code: "AF" },
    income: {
      quantity: pesoAirFreight,
      unit: "AIR FREIGHT",
      rate: freight.incomeRate,
      amount: freight.incomeAmount,
      showamount: freight.incomeAmount,
      payment: "Collect",
      billApplyTo: "Other",
      billTo: billTo(username),
      currency: cur,
      reference: "Amount to Air Freight",
      showOnDocument: true,
      notes: `AIR FREIGHT charge - Tarifa: ${freight.currency} ${freight.expenseRate.toFixed(2)}/kg`,
    },
    expense: {
      quantity: pesoAirFreight,
      unit: "AIR FREIGHT",
      rate: freight.expenseRate,
      amount: freight.expenseAmount,
      showamount: freight.expenseAmount,
      payment: "Collect",
      billApplyTo: "Other",
      billTo: billTo(username),
      currency: cur,
      reference: "TEST-REF-AIRFREIGHT",
      showOnDocument: true,
      notes: `AIR FREIGHT expense - Tarifa: ${freight.currency} ${freight.expenseRate.toFixed(2)}/kg`,
    },
  });

  if (incoterm === "FCA") {
    const fcaLocalAmount = calculateFCALocalCharges(ruta);
    if (fcaLocalAmount > 0) {
      charges.push({
        service: { id: 125539, code: "FC" },
        income: {
          quantity: 1,
          unit: "FCA CHARGES",
          rate: fcaLocalAmount,
          amount: fcaLocalAmount,
          showamount: fcaLocalAmount,
          payment: "Collect",
          billApplyTo: "Other",
          billTo: billTo(username),
          currency: cur,
          reference: "Amount to FCA Charges",
          showOnDocument: true,
          notes: `FCA Local Charges - Base: ${ruta.localCharges}`,
        },
        expense: { currency: cur },
      });
    }
    const gastosXKgAmount = calculateGastosXKg(ruta, pesoParaCargos);
    if (gastosXKgAmount > 0) {
      charges.push({
        service: { id: 125595, code: "Gxk" },
        income: {
          quantity: pesoParaCargos,
          unit: "kg",
          rate: ruta.gastosXKg * FCA_MARKUP,
          amount: gastosXKgAmount,
          showamount: gastosXKgAmount,
          payment: "Collect",
          billApplyTo: "Other",
          billTo: billTo(username),
          currency: cur,
          reference: "Amount to Gastos x kg",
          showOnDocument: true,
          notes: `Gastos x kg - Rate: ${ruta.gastosXKg}/kg`,
        },
        expense: { currency: cur },
      });
    }
  }

  const baseWithoutSeguro = calculateAirBaseWithoutSeguro(
    input.base,
    freight.incomeAmount,
  );
  const seguroAmount = calculateSeguroAmount({
    activo: addons.seguroActivo,
    valorMercaderia: addons.valorMercaderia,
    baseWithoutSeguro,
  });
  if (addons.seguroActivo && seguroAmount > 0) {
    charges.push({
      service: { id: 111361, code: "S" },
      income: {
        quantity: 1,
        unit: "SEGURO",
        rate: seguroAmount,
        amount: seguroAmount,
        showamount: seguroAmount,
        payment: "Collect",
        billApplyTo: "Other",
        billTo: billTo(username),
        currency: cur,
        reference: "Amount to Insurrance",
        showOnDocument: true,
        notes: "Seguro opcional - Protección adicional para la carga",
      },
      expense: { currency: cur },
    });
  }

  if (addons.gastolocal) {
    charges.push({
      service: { id: 121127, code: "D" },
      income: {
        quantity: 1,
        unit: "DESCONSOLIDACIÓN",
        rate: DESCONSOLIDACION_AMOUNT,
        amount: DESCONSOLIDACION_AMOUNT,
        showamount: DESCONSOLIDACION_AMOUNT,
        payment: "Collect",
        billApplyTo: "Other",
        billTo: billTo(username),
        currency: cur,
        reference: "Gastos Locales - Desconsolidación",
        showOnDocument: true,
        notes: "Cargo por Gastos Locales (Desconsolidación) agregado desde portal",
      },
      expense: { currency: cur },
    });
  }

  const umAmount = calculateUltimaMillaAmount({
    activo: addons.ultimaMillaActivo,
    bracket: addons.ultimaMillaBracket,
    zone: addons.ultimaMillaZone,
    extendedMultiplier: input.vespucioExtendedMultiplier,
  });
  if (umAmount > 0 && addons.ultimaMillaBracket) {
    const expenseAmount = aereoTtExpenseFromIncome(umAmount);
    const bracketCfg =
      input.aereoTtConfig.brackets[addons.ultimaMillaBracket.bracketIndex];
    const zoneNote =
      addons.ultimaMillaZone === "extended"
        ? ` (+${input.aereoTtConfig.vespucioExtendedSurchargePct}% zona extendida)`
        : "";
    charges.push({
      service: {
        id: 134796,
        code: "TT",
        description: "TRANSPORTE TERRESTRE",
      },
      income: {
        quantity: 1,
        unit: "SHIPMENT",
        rate: umAmount,
        amount: umAmount,
        showamount: umAmount,
        payment: "Collect",
        billApplyTo: "Other",
        billTo: billTo(username),
        currency: cur,
        reference: "AIR-ULTIMA-MILLA",
        showOnDocument: true,
        notes: `Transporte Terrestre${zoneNote} - tramo ≤${bracketCfg?.maxKg ?? "?"} kg (peso real ${totals.totalRealWeight.toFixed(2)} kg). Entrega: ${addons.ultimaMillaDireccion}`,
      },
      expense: {
        quantity: 1,
        unit: "SHIPMENT",
        rate: expenseAmount,
        amount: expenseAmount,
        showamount: expenseAmount,
        payment: "Collect",
        billApplyTo: "Other",
        billTo: billTo(username),
        currency: cur,
        reference: "AIR-ULTIMA-MILLA-EXP",
        showOnDocument: true,
        notes: "Transporte Terrestre expense - income / 1.10",
      },
    });
  }

  if (addons.liveTrackingActivo) {
    charges.push({
      service: { id: 133570, code: "LT", description: "LIVE TRACKING" },
      income: {
        quantity: 1,
        unit: "LIVE TRACKING",
        rate: 0,
        amount: 0,
        showamount: 0,
        payment: "Collect",
        billApplyTo: "Other",
        billTo: billTo(username),
        currency: cur,
        reference: "Live Tracking - Free",
        showOnDocument: true,
        notes:
          "Servicio de Live Tracking gratuito - seguimiento en tiempo real del cargamento",
      },
      expense: {
        quantity: 1,
        unit: "LIVE TRACKING",
        rate: 0,
        amount: 0,
        showamount: 0,
        payment: "Collect",
        billApplyTo: "Other",
        billTo: billTo(username),
        currency: cur,
      },
    });
  }

  const noApilableAmount = calculateNoApilableAmount(
    incoterm,
    addons.noApilableActivo,
    totals.totalRealWeight,
    totals.chargeableWeight,
  );
  if (noApilableAmount > 0) {
    charges.push({
      service: { id: 115954, code: "NA", description: "NO APILABLE" },
      income: {
        quantity: 1,
        unit: "NO APILABLE",
        rate: noApilableAmount,
        amount: noApilableAmount,
        showamount: noApilableAmount,
        payment: "Collect",
        billApplyTo: "Other",
        billTo: billTo(username),
        currency: cur,
        reference: "Amount to NO STACKEABLE",
        showOnDocument: true,
        notes: "Cargo adicional por carga no apilable",
      },
      expense: { currency: cur },
    });
  }

  const aduanaAmount = calculateAduanaAmount({
    activo: addons.aduanaActivo,
    valorProducto: addons.valorProductoAduana,
    costoTransporte: baseWithoutSeguro,
    seguroActivo: addons.seguroActivo,
    seguroMonto: seguroAmount,
    currency: freight.currency,
    config: input.aduanaConfig,
    derechosExcluidos: addons.derechosAduanaExcluidos,
  });
  if (aduanaAmount > 0) {
    charges.push({
      service: { id: 127954, code: "ADA", description: "AGENCIA DE ADUANA" },
      income: {
        quantity: 1,
        unit: "AGENCIA DE ADUANA",
        rate: aduanaAmount,
        amount: aduanaAmount,
        showamount: aduanaAmount,
        payment: "Collect",
        billApplyTo: "Other",
        billTo: billTo(username),
        currency: cur,
        reference: "Amount to Agencia de Aduana",
        showOnDocument: true,
        notes:
          "Agencia de Aduana y Nacionalización - incluye honorarios, gastos despacho, tramitación, mensajería, IVA aduanero y derechos",
      },
      expense: { currency: cur },
    });
  }

  const finalCharges = zeroChargesIfPending(charges, showPendingQuote);
  const oneWeekFromNow = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const isOverall = input.base.cargo.mode === "overall";

  const commodities = isOverall
    ? input.base.cargo.overallPieces.map((piece) => ({
        commodityType: "Standard",
        packageType: { id: DEFAULT_OVERALL_AIR_PACKAGE_TYPE },
        pieces: 1,
        description: DEFAULT_OVERALL_AIR_DESCRIPTION,
        overallDimsAndWeight: true,
        weightPerUnitValue: piece.weight,
        weightPerUnitUOM: "kg",
        totalWeightValue: piece.weight,
        totalWeightUOM: "kg",
        volumeValue: piece.volume,
        volumeUOM: "m3",
        totalVolumeValue: piece.volume,
        totalVolumeUOM: "m3",
        volumeWeightValue: piece.volumeWeight,
        volumeWeightUOM: "kg",
        totalVolumeWeightValue: piece.volumeWeight,
        totalVolumeWeightUOM: "kg",
      }))
    : input.base.cargo.pieces.map((piece) => ({
        commodityType: "Standard",
        packageType: { id: DEFAULT_OVERALL_AIR_PACKAGE_TYPE },
        pieces: 1,
        description: DEFAULT_OVERALL_AIR_DESCRIPTION,
        weightPerUnitValue: piece.weight,
        weightPerUnitUOM: "kg",
        totalWeightValue: piece.totalWeight,
        totalWeightUOM: "kg",
        lengthValue: piece.length,
        lengthUOM: "cm",
        widthValue: piece.width,
        widthUOM: "cm",
        heightValue: piece.height,
        heightUOM: "cm",
        volumeValue: piece.volume,
        volumeUOM: "m3",
        totalVolumeValue: piece.totalVolume,
        totalVolumeUOM: "m3",
        volumeWeightValue: piece.volumeWeight,
        volumeWeightUOM: "kg",
        totalVolumeWeightValue: piece.totalVolumeWeight,
        totalVolumeWeightUOM: "kg",
      }));

  return {
    date: new Date().toISOString(),
    validUntil: sinTarifa
      ? oneWeekFromNow
      : parseValidUntilToISO(ruta.validUntil),
    transitDays: sinTarifa ? null : parseTransitDays(ruta.transitTime),
    project: { name: "AIR" },
    customerReference: sinTarifa
      ? isOverall
        ? "Portal Created [AIR-OVERALL] - PENDIENTE TARIFA"
        : "Portal Created [AIR] - PENDIENTE TARIFA"
      : isOverall
        ? "Portal-Created [AIR-OVERALL]"
        : "Portal Created [AIR]",
    contact: { name: username },
    origin: { name: ruta.origin },
    carrierBroker: {
      name: sinTarifa ? routeInfoPlaceholder : ruta.carrier,
    },
    destination: { name: ruta.destination },
    modeOfTransportation: { id: 8 },
    rateCategoryId: 2,
    incoterm: { code: incoterm, name: incoterm },
    ...(incoterm === "EXW" && {
      pickupFromAddress: input.pickupFromAddress || "",
      deliveryToAddress: input.deliveryToAddress || "",
    }),
    portOfReceipt: { name: ruta.origin },
    shipper: { name: username },
    consignee: { name: username },
    issuingCompany: {
      name: sinTarifa
        ? routeInfoPlaceholder
        : ruta.carrier || "Por Confirmar",
    },
    serviceType: {
      name: isOverall ? "Overall Dims & Weight" : "Normal",
    },
    salesRep,
    commodities,
    charges: finalCharges,
  };
}

export function buildAirConnectLinbisPayload(params: {
  ruta: RutaAerea;
  offer: AirConnectPricedOffer;
  step3Extra: number;
  incoterm: "EXW" | "FCA";
  effectiveUsername: string;
  salesRep: SalesRepPayload;
  commodities: ReturnType<typeof buildAirLinbisPayload>["commodities"];
}) {
  const grandTotal = params.offer.incomeWithLand + params.step3Extra;
  const airlineLabel = params.offer.via
    ? `${params.offer.airline} (vía ${params.offer.via})`
    : params.offer.airline;
  const validUntilIso = params.offer.validity
    ? new Date(params.offer.validity).toISOString()
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  return {
    date: new Date().toISOString(),
    validUntil: validUntilIso,
    transitDays: null,
    project: { name: "AIR" },
    customerReference: "Portal Created [AIR] - AirConnect ES-SCL",
    contact: { name: params.effectiveUsername },
    origin: { name: params.ruta.origin },
    carrierBroker: { name: airlineLabel },
    destination: { name: params.ruta.destination },
    modeOfTransportation: { id: 8 },
    rateCategoryId: 2,
    incoterm: { code: params.incoterm, name: params.incoterm },
    portOfReceipt: { name: params.ruta.origin },
    shipper: { name: params.effectiveUsername },
    consignee: { name: params.effectiveUsername },
    issuingCompany: { name: airlineLabel },
    serviceType: { name: "Normal" },
    salesRep: params.salesRep,
    commodities: params.commodities,
    charges: [
      {
        service: LINBIS_GASTOS_TOTALES_SERVICE,
        income: {
          quantity: 1,
          unit: "Shipment",
          rate: grandTotal,
          amount: grandTotal,
          showamount: grandTotal,
          payment: "Collect",
          billApplyTo: "Other",
          billTo: { name: params.effectiveUsername },
          currency: { abbr: AIR_CONNECT_CURRENCY },
          reference: `AirConnect ${params.offer.freight} - ${airlineLabel}`,
          showOnDocument: true,
          notes: `Cotización AirConnect España→SCL (${airlineLabel})`,
        },
        expense: {
          currency: { abbr: AIR_CONNECT_CURRENCY },
        },
      },
    ],
  };
}
