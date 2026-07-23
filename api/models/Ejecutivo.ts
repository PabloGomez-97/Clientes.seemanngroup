import mongoose from 'mongoose';

export interface IEjecutivoRoles {
  administrador: boolean;
  pricing: boolean;
  ejecutivo: boolean;
  proveedor: boolean;
  operaciones: boolean;
}

export interface IEjecutivo {
  nombre: string;
  email: string;
  telefono: string;
  /** ID interno del sales rep en Linbis (`/salesreps/list`). */
  idInterno?: number | null;
  activo: boolean;
  roles: IEjecutivoRoles;
}

export interface IEjecutivoDoc extends IEjecutivo, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

export type EjecutivoModel = mongoose.Model<IEjecutivoDoc>;

/** Parsea y valida el ID interno de Linbis (entero positivo). */
export function parseIdInterno(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null;
  return n;
}

export const EjecutivoSchema = new mongoose.Schema<IEjecutivoDoc>(
  {
    nombre: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    telefono: { type: String, required: true, trim: true },
    idInterno: { type: Number, required: false, default: null },
    activo: { type: Boolean, default: true },
    roles: {
      administrador: { type: Boolean, default: false },
      pricing: { type: Boolean, default: false },
      ejecutivo: { type: Boolean, default: true },
      proveedor: { type: Boolean, default: false },
      operaciones: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

EjecutivoSchema.index({ idInterno: 1 }, { sparse: true });

export const Ejecutivo = (
  mongoose.models.Ejecutivo as EjecutivoModel | undefined) ||
  mongoose.model<IEjecutivoDoc>('Ejecutivo', EjecutivoSchema);
