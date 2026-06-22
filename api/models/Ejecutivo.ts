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
  activo: boolean;
  roles: IEjecutivoRoles;
}

export interface IEjecutivoDoc extends IEjecutivo, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

export type EjecutivoModel = mongoose.Model<IEjecutivoDoc>;

export const EjecutivoSchema = new mongoose.Schema<IEjecutivoDoc>(
  {
    nombre: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    telefono: { type: String, required: true, trim: true },
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

export const Ejecutivo = (
  mongoose.models.Ejecutivo as EjecutivoModel | undefined) ||
  mongoose.model<IEjecutivoDoc>('Ejecutivo', EjecutivoSchema);
