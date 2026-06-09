import mongoose from "mongoose";

// ============================================================================
// MODELO: Configuración AirConnect España (singleton)
// Margen de ganancia FCA y EXW sobre costos AirConnect
// ============================================================================

export interface IAirConnectSpainConfig {
  profitMarkupPctFca: number;
  profitMarkupPctExw: number;
  /** @deprecated Legado — se migra a profitMarkupPctFca al leer */
  profitMarkupPct?: number;
  updatedBy: string;
}

export interface IAirConnectSpainConfigDoc
  extends IAirConnectSpainConfig,
    mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

export type AirConnectSpainConfigModel =
  mongoose.Model<IAirConnectSpainConfigDoc>;

export const DEFAULT_AIR_CONNECT_SPAIN_CONFIG: IAirConnectSpainConfig = {
  profitMarkupPctFca: 15,
  profitMarkupPctExw: 15,
  updatedBy: "system",
};

export const AirConnectSpainConfigSchema =
  new mongoose.Schema<IAirConnectSpainConfigDoc>(
    {
      profitMarkupPctFca: {
        type: Number,
        required: true,
        default: DEFAULT_AIR_CONNECT_SPAIN_CONFIG.profitMarkupPctFca,
      },
      profitMarkupPctExw: {
        type: Number,
        required: true,
        default: DEFAULT_AIR_CONNECT_SPAIN_CONFIG.profitMarkupPctExw,
      },
      profitMarkupPct: { type: Number, required: false },
      updatedBy: {
        type: String,
        required: true,
        default: DEFAULT_AIR_CONNECT_SPAIN_CONFIG.updatedBy,
      },
    },
    { timestamps: true, collection: "air_connect_spain_config" },
  );
