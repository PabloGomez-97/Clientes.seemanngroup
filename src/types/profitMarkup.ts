// ============================================================================
// Profit markup — global (gestion-cotizador) + override por cliente
// ============================================================================

export type ProfitMode = "air" | "fcl" | "lcl";

export const PROFIT_MODES: ProfitMode[] = ["air", "fcl", "lcl"];

export interface IProfitMarkupConfig {
  air: number;
  fcl: number;
  lcl: number;
}

/** Defaults alineados con el markup histórico hardcodeado en cotizadores */
export const DEFAULT_PROFIT_MARKUP: IProfitMarkupConfig = {
  air: 15,
  fcl: 15,
  lcl: 35,
};

export type ProfitMarkupSource = "override" | "global";

export interface IEffectiveProfitMarkup extends IProfitMarkupConfig {
  sources: Record<ProfitMode, ProfitMarkupSource>;
}

/** Override parcial: null = usar general para ese modo */
export interface IClientProfitOverrideFields {
  air: number | null;
  fcl: number | null;
  lcl: number | null;
}

export interface IClientProfitOverride extends IClientProfitOverrideFields {
  clientUserId: string;
  updatedBy: string;
  updatedAt?: string;
}

export interface IClientProfitAuditEntry {
  id: string;
  clientUserId: string | null;
  scope: "global" | "client";
  mode: ProfitMode;
  previousValue: number | null;
  newValue: number | null;
  changedByEmail: string;
  changedByName?: string;
  createdAt: string;
}

export function isPositiveIntegerProfit(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 1
  );
}

export function profitMultiplier(pct: number): number {
  return 1 + pct / 100;
}

export function resolveEffectiveProfitMarkup(
  globalMarkup: IProfitMarkupConfig,
  override: Partial<IClientProfitOverrideFields> | null | undefined,
): IEffectiveProfitMarkup {
  const sources = {} as Record<ProfitMode, ProfitMarkupSource>;
  const effective = {} as IProfitMarkupConfig;

  for (const mode of PROFIT_MODES) {
    const ov = override?.[mode];
    if (ov !== null && ov !== undefined && isPositiveIntegerProfit(ov)) {
      effective[mode] = ov;
      sources[mode] = "override";
    } else {
      effective[mode] = globalMarkup[mode];
      sources[mode] = "global";
    }
  }

  return { ...effective, sources };
}

export function normalizeProfitMarkup(
  raw: Partial<IProfitMarkupConfig> | null | undefined,
): IProfitMarkupConfig {
  return {
    air: isPositiveIntegerProfit(raw?.air)
      ? raw!.air
      : DEFAULT_PROFIT_MARKUP.air,
    fcl: isPositiveIntegerProfit(raw?.fcl)
      ? raw!.fcl
      : DEFAULT_PROFIT_MARKUP.fcl,
    lcl: isPositiveIntegerProfit(raw?.lcl)
      ? raw!.lcl
      : DEFAULT_PROFIT_MARKUP.lcl,
  };
}

export function profitMarkupEquals(
  a: Pick<IEffectiveProfitMarkup, "air" | "fcl" | "lcl">,
  b: Pick<IEffectiveProfitMarkup, "air" | "fcl" | "lcl">,
): boolean {
  return a.air === b.air && a.fcl === b.fcl && a.lcl === b.lcl;
}

export function formatProfitColumnSummary(
  effective: IEffectiveProfitMarkup,
): string {
  const fmt = (mode: ProfitMode, label: string) => {
    const custom = effective.sources[mode] === "override";
    return `${label}:${effective[mode]}%${custom ? "" : "·g"}`;
  };
  return `${fmt("air", "A")} · ${fmt("fcl", "F")} · ${fmt("lcl", "L")}`;
}

