export interface IAirConnectSpainConfig {
  profitMarkupPct: number;
  updatedBy: string;
}

export const DEFAULT_AIR_CONNECT_SPAIN_CONFIG: IAirConnectSpainConfig = {
  profitMarkupPct: 15,
  updatedBy: "system",
};

export function airConnectProfitMultiplier(profitMarkupPct: number): number {
  return 1 + profitMarkupPct / 100;
}
