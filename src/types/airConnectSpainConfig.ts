export interface IAirConnectSpainConfig {
  profitMarkupPctFca: number;
  profitMarkupPctExw: number;
  updatedBy: string;
}

export const DEFAULT_AIR_CONNECT_SPAIN_CONFIG: IAirConnectSpainConfig = {
  profitMarkupPctFca: 15,
  profitMarkupPctExw: 15,
  updatedBy: "system",
};

export function airConnectProfitMultiplier(profitMarkupPct: number): number {
  return 1 + profitMarkupPct / 100;
}

export function getAirConnectProfitMarkupPct(
  config: IAirConnectSpainConfig,
  incoterm: "FCA" | "EXW" | "",
): number {
  if (incoterm === "EXW") return config.profitMarkupPctExw;
  return config.profitMarkupPctFca;
}
