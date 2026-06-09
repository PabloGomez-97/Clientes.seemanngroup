import { calculateAduanaCharges } from "../../../types/agenciaAduana";
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
  aduanaConfig: IAgenciaAduanaConfig | null;
  gastolocal: boolean;
}

export function calculateAirConnectStep3Extras(
  params: AirConnectStep3ExtrasParams,
): number {
  let extra = 0;
  if (params.ultimaMillaActivo) {
    extra += params.calculateUltimaMilla();
  }
  const valorCarga =
    parseFloat(params.valorMercaderia.replace(",", ".")) || 0;
  if (params.seguroActivo) {
    extra += Math.max(
      (valorCarga + params.transportBaseline) * 1.1 * 0.0025,
      25,
    );
  }
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
      extra += calculateAduanaCharges(
        valorProd,
        params.transportBaseline,
        seguroParaCIF,
        AIR_CONNECT_CURRENCY as SupportedCurrency,
        params.aduanaConfig,
      ).total;
    }
  }
  if (params.gastolocal) {
    extra += 194.4;
  }
  return extra;
}
