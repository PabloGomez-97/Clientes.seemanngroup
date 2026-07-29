import { calculateAduanaCharges, applyDerechosExclusion } from "../../../types/agenciaAduana";
import type { IAgenciaAduanaConfig } from "../../../types/agenciaAduana";
import type { SupportedCurrency } from "../../../types/agenciaAduana";
import { AIR_CONNECT_CURRENCY } from "../../../services/airConnectSpainQuote";

export interface AirConnectStep3ExtrasParams {
  transportBaseline: number;
  ultimaMillaActivo: boolean;
  calculateUltimaMilla: () => number;
  seguroActivo: boolean;
  valorMercaderia: string;
  aduanaActivo: boolean;
  valorProductoAduana: string;
  derechosAduanaExcluidos?: boolean;
  aduanaConfig: IAgenciaAduanaConfig | null;
  gastolocal: boolean;
}

export interface AirConnectStep3ExtrasBreakdown {
  ultimaMilla: number;
  seguro: number;
  aduana: number;
  gastolocal: number;
  total: number;
}

export function calculateAirConnectStep3ExtrasBreakdown(
  params: AirConnectStep3ExtrasParams,
): AirConnectStep3ExtrasBreakdown {
  let ultimaMilla = 0;
  if (params.ultimaMillaActivo) {
    ultimaMilla = params.calculateUltimaMilla();
  }

  const valorCarga =
    parseFloat(params.valorMercaderia.replace(",", ".")) || 0;

  let seguro = 0;
  if (params.seguroActivo) {
    seguro = Math.max(
      (valorCarga + params.transportBaseline) * 1.1 * 0.0025,
      25,
    );
  }

  let aduana = 0;
  if (params.aduanaActivo && params.aduanaConfig) {
    const valorProd =
      parseFloat(params.valorProductoAduana.replace(",", ".")) || 0;
    if (valorProd > 0) {
      const seguroParaCIF = params.seguroActivo
        ? Math.max(
            (valorCarga + params.transportBaseline) * 1.1 * 0.0025,
            25,
          )
        : (valorProd + params.transportBaseline) * 1.1 * 0.02;
      aduana = applyDerechosExclusion(
        calculateAduanaCharges(
          valorProd,
          params.transportBaseline,
          seguroParaCIF,
          AIR_CONNECT_CURRENCY as SupportedCurrency,
          params.aduanaConfig,
        ),
        !!params.derechosAduanaExcluidos,
      ).total;
    }
  }

  const gastolocal = params.gastolocal ? 194.4 : 0;

  return {
    ultimaMilla,
    seguro,
    aduana,
    gastolocal,
    total: ultimaMilla + seguro + aduana + gastolocal,
  };
}

export function calculateAirConnectStep3Extras(
  params: AirConnectStep3ExtrasParams,
): number {
  return calculateAirConnectStep3ExtrasBreakdown(params).total;
}
