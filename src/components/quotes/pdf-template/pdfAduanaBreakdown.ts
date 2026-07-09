import type { IAgenciaAduanaConfig } from "../../../types/agenciaAduana";
import {
  applyDerechosExclusion,
  calculateAduanaCharges,
} from "../../../types/agenciaAduana";
import type { IAgenciaAduanaFclConfig } from "../../../types/agenciaAduanaFcl";
import { calculateAduanaChargesFcl } from "../../../types/agenciaAduanaFcl";
import type { IAgenciaAduanaLclConfig } from "../../../types/agenciaAduanaLcl";
import { calculateAduanaChargesLcl } from "../../../types/agenciaAduanaLcl";

export interface PdfAduanaBreakdownBase {
  currency: string;
  valorProducto: number;
  costoTransporte: number;
  seguroParaCIF: number;
  seguroIsTheoretical: boolean;
  cif: number;
  total: number;
}

export interface PdfAduanaBreakdownAir extends PdfAduanaBreakdownBase {
  mode: "air";
  honorarios: number;
  gastosDespacho: number;
  tramitacion: number;
  mensajeria: number;
  ivaAduaneroPct: number;
  ivaAduanero: number;
  derechosPct: number;
  derechos: number;
}

export interface PdfAduanaBreakdownFcl extends PdfAduanaBreakdownBase {
  mode: "fcl";
  honorarios: number;
  customsClearance: number;
  gateIn: number;
  gateInQuantity: number;
  docProcess: number;
  ivaAduaneroPct: number;
  ivaAduanero: number;
  derechosPct: number;
  derechos: number;
}

export interface PdfAduanaBreakdownLcl extends PdfAduanaBreakdownBase {
  mode: "lcl";
  honorarios: number;
  customsClearance: number;
  extraportCharges: number;
  wmChargeable: number;
  ivaAduaneroPct: number;
  ivaAduanero: number;
  derechosPct: number;
  derechos: number;
}

export type PdfAduanaBreakdown =
  | PdfAduanaBreakdownAir
  | PdfAduanaBreakdownFcl
  | PdfAduanaBreakdownLcl;

function parseValorProducto(valorProducto: string): number {
  return parseFloat(valorProducto.replace(",", ".")) || 0;
}

function computeSeguroParaCIF(
  valorProducto: number,
  costoTransporte: number,
  seguroActivo: boolean,
  seguroMonto: number,
): { seguroParaCIF: number; seguroIsTheoretical: boolean } {
  if (seguroActivo && seguroMonto > 0) {
    return { seguroParaCIF: seguroMonto, seguroIsTheoretical: false };
  }
  if (valorProducto > 0) {
    return {
      seguroParaCIF: (valorProducto + costoTransporte) * 1.1 * 0.02,
      seguroIsTheoretical: true,
    };
  }
  return { seguroParaCIF: 0, seguroIsTheoretical: true };
}

export function buildAirAduanaPdfBreakdown(params: {
  activo: boolean;
  valorProducto: string;
  costoTransporte: number;
  seguroActivo: boolean;
  seguroMonto: number;
  currency: string;
  config: IAgenciaAduanaConfig | null | undefined;
  derechosExcluidos?: boolean;
}): PdfAduanaBreakdownAir | undefined {
  if (!params.activo || !params.config) return undefined;

  const valorProducto = parseValorProducto(params.valorProducto);
  if (valorProducto <= 0) return undefined;

  const { seguroParaCIF, seguroIsTheoretical } = computeSeguroParaCIF(
    valorProducto,
    params.costoTransporte,
    params.seguroActivo,
    params.seguroMonto,
  );

  const rawResult = calculateAduanaCharges(
    valorProducto,
    params.costoTransporte,
    seguroParaCIF,
    params.currency as Parameters<typeof calculateAduanaCharges>[3],
    params.config,
  );
  const result = applyDerechosExclusion(rawResult, !!params.derechosExcluidos);

  return {
    mode: "air",
    currency: params.currency,
    valorProducto,
    costoTransporte: params.costoTransporte,
    seguroParaCIF,
    seguroIsTheoretical,
    cif: result.cif,
    total: result.total,
    honorarios: result.honorarios,
    gastosDespacho: result.gastosDespacho,
    tramitacion: result.tramitacion,
    mensajeria: result.mensajeria,
    ivaAduaneroPct: params.config.charges.ivaAduaneroPct,
    ivaAduanero: result.ivaAduanero,
    derechosPct: params.config.charges.derechosPct,
    derechos: result.derechos,
  };
}

export function buildFclAduanaPdfBreakdown(params: {
  activo: boolean;
  valorProducto: string;
  costoTransporte: number;
  seguroActivo: boolean;
  seguroMonto: number;
  currency: string;
  cantidadContenedores: number;
  config: IAgenciaAduanaFclConfig | null | undefined;
  derechosExcluidos?: boolean;
}): PdfAduanaBreakdownFcl | undefined {
  if (!params.activo || !params.config) return undefined;

  const valorProducto = parseValorProducto(params.valorProducto);
  if (valorProducto <= 0) return undefined;

  const { seguroParaCIF, seguroIsTheoretical } = computeSeguroParaCIF(
    valorProducto,
    params.costoTransporte,
    params.seguroActivo,
    params.seguroMonto,
  );

  const rawResult = calculateAduanaChargesFcl(
    valorProducto,
    params.costoTransporte,
    seguroParaCIF,
    params.cantidadContenedores,
    params.config,
  );
  const result = applyDerechosExclusion(rawResult, !!params.derechosExcluidos);

  return {
    mode: "fcl",
    currency: params.currency,
    valorProducto,
    costoTransporte: params.costoTransporte,
    seguroParaCIF,
    seguroIsTheoretical,
    cif: result.cif,
    total: result.total,
    honorarios: result.honorarios,
    customsClearance: result.customsClearance,
    gateIn: result.gateIn,
    gateInQuantity: result.gateInQuantity,
    docProcess: result.docProcess,
    ivaAduaneroPct: params.config.charges.ivaAduaneroPct,
    ivaAduanero: result.ivaAduanero,
    derechosPct: params.config.charges.derechosPct,
    derechos: result.derechos,
  };
}

export function buildLclAduanaPdfBreakdown(params: {
  activo: boolean;
  valorProducto: string;
  costoTransporte: number;
  seguroActivo: boolean;
  seguroMonto: number;
  currency: string;
  wmChargeable: number;
  config: IAgenciaAduanaLclConfig | null | undefined;
  derechosExcluidos?: boolean;
}): PdfAduanaBreakdownLcl | undefined {
  if (!params.activo || !params.config) return undefined;

  const valorProducto = parseValorProducto(params.valorProducto);
  if (valorProducto <= 0 || params.wmChargeable <= 0) return undefined;

  const { seguroParaCIF, seguroIsTheoretical } = computeSeguroParaCIF(
    valorProducto,
    params.costoTransporte,
    params.seguroActivo,
    params.seguroMonto,
  );

  const rawResult = calculateAduanaChargesLcl(
    valorProducto,
    params.costoTransporte,
    seguroParaCIF,
    params.wmChargeable,
    params.config,
  );
  const result = applyDerechosExclusion(rawResult, !!params.derechosExcluidos);

  return {
    mode: "lcl",
    currency: params.currency,
    valorProducto,
    costoTransporte: params.costoTransporte,
    seguroParaCIF,
    seguroIsTheoretical,
    cif: result.cif,
    total: result.total,
    honorarios: result.honorarios,
    customsClearance: result.customsClearance,
    extraportCharges: result.extraportCharges,
    wmChargeable: result.wmChargeable,
    ivaAduaneroPct: params.config.charges.ivaAduaneroPct,
    ivaAduanero: result.ivaAduanero,
    derechosPct: params.config.charges.derechosPct,
    derechos: result.derechos,
  };
}
