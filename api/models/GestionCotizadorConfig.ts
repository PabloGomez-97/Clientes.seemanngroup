import mongoose from "mongoose";

// ============================================================================
// MODELO: Gestión Cotizador (singleton en colección gestioncotizador)
// Tarifas configurables por tipo de servicio (FCL, LCL, AÉREO, ÚLTIMA MILLA)
// ============================================================================

export interface IFclCotizadorConfig {
  /** Transporte terrestre por contenedor 20GP */
  ttRate20GP: number;
  /** Transporte terrestre por contenedor 40HQ / 40NOR */
  ttRate40: number;
  /** Recargo % adicional en zona extendida (entre anillo Vespucio y polígono exterior) */
  vespucioExtendedSurchargePct: number;
}

export interface IGestionCotizadorConfig {
  fcl: IFclCotizadorConfig;
  updatedBy: string;
}

export interface IGestionCotizadorConfigDoc
  extends IGestionCotizadorConfig,
    mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

export type GestionCotizadorConfigModel =
  mongoose.Model<IGestionCotizadorConfigDoc>;

export const DEFAULT_FCL_COTIZADOR: IFclCotizadorConfig = {
  ttRate20GP: 690.2,
  ttRate40: 547.4,
  vespucioExtendedSurchargePct: 45,
};

export const DEFAULT_GESTION_COTIZADOR_CONFIG: IGestionCotizadorConfig = {
  fcl: DEFAULT_FCL_COTIZADOR,
  updatedBy: "system",
};

export const GestionCotizadorConfigSchema =
  new mongoose.Schema<IGestionCotizadorConfigDoc>(
    {
      fcl: {
        ttRate20GP: {
          type: Number,
          required: true,
          default: DEFAULT_FCL_COTIZADOR.ttRate20GP,
        },
        ttRate40: {
          type: Number,
          required: true,
          default: DEFAULT_FCL_COTIZADOR.ttRate40,
        },
        vespucioExtendedSurchargePct: {
          type: Number,
          required: true,
          default: DEFAULT_FCL_COTIZADOR.vespucioExtendedSurchargePct,
        },
      },
      updatedBy: { type: String, required: true, default: "system" },
    },
    { timestamps: true, collection: "gestioncotizador" },
  );
