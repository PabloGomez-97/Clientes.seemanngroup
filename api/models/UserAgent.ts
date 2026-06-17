import mongoose from 'mongoose';

// ============================================================================
// MODELO: Agentes de proveedores (correos a agentes)
// Colección: users_agent
// ============================================================================

export interface IUserAgent {
  nombreAgente: string;
  emailAgente: string;
  numeroAgente?: string;
  nombreResponsable: string;
  descripcion: string;
  asunto: string;
  activo: boolean;
}

export interface IUserAgentDoc extends IUserAgent, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

export type UserAgentModel = mongoose.Model<IUserAgentDoc>;

export const UserAgentSchema = new mongoose.Schema<IUserAgentDoc>(
  {
    nombreAgente: { type: String, required: true, trim: true },
    emailAgente: { type: String, required: true, lowercase: true, trim: true },
    numeroAgente: { type: String, trim: true, default: '' },
    nombreResponsable: { type: String, required: true, trim: true },
    descripcion: { type: String, required: true, default: '' },
    asunto: { type: String, required: true, trim: true },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'users_agent' },
);

UserAgentSchema.index(
  { emailAgente: 1 },
  { unique: true, partialFilterExpression: { activo: true } },
);

export function serializeUserAgent(doc: IUserAgentDoc) {
  return {
    id: String(doc._id),
    nombreAgente: doc.nombreAgente,
    emailAgente: doc.emailAgente,
    numeroAgente: doc.numeroAgente || '',
    nombreResponsable: doc.nombreResponsable,
    descripcion: doc.descripcion,
    asunto: doc.asunto,
    activo: doc.activo,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
