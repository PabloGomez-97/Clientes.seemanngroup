/**
 * Handlers compartidos para CRUD y envío de correos a agentes de proveedores.
 * Usado por api/index.ts (prod) y server/index.ts (dev).
 */

import mongoose from 'mongoose';
import { Ejecutivo } from '../models/Ejecutivo.js';
import {
  UserAgentSchema,
  serializeUserAgent,
  type IUserAgentDoc,
  type UserAgentModel,
} from '../models/UserAgent.js';
import { N8nWorkflowError, triggerN8nWorkflow } from './n8nWorkflowService.js';

const UserAgent = (
  mongoose.models.UserAgent ||
  mongoose.model<IUserAgentDoc>('UserAgent', UserAgentSchema)
) as UserAgentModel;

const AuditLogSchema = new mongoose.Schema(
  {
    usuario: String,
    email: String,
    rol: String,
    ejecutivo: String,
    ejecutivoEmail: String,
    accion: String,
    categoria: String,
    descripcion: String,
    detalles: mongoose.Schema.Types.Mixed,
    clienteAfectado: String,
    ip: String,
  },
  { timestamps: true },
);

const AuditLog =
  (mongoose.models.AuditLog as mongoose.Model<any>) ||
  mongoose.model('AuditLog', AuditLogSchema);

export class ProviderAgentHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function requirePricingOrAdmin(userEmail: string) {
  const ejDoc = await Ejecutivo.findOne({ email: userEmail.toLowerCase() });
  if (!ejDoc?.roles?.administrador && !ejDoc?.roles?.pricing) {
    throw new ProviderAgentHttpError(403, 'No tienes permisos para gestionar agentes de proveedores');
  }
  return ejDoc;
}

function trimStr(value: unknown): string {
  return String(value ?? '').trim();
}

function validateCreatePayload(body: Record<string, unknown>) {
  const nombreAgente = trimStr(body.nombreAgente);
  const emailAgente = trimStr(body.emailAgente).toLowerCase();
  const nombreResponsable = trimStr(body.nombreResponsable);
  const descripcion = trimStr(body.descripcion);
  const asunto = trimStr(body.asunto);
  const numeroAgente = trimStr(body.numeroAgente);

  if (!nombreAgente || !emailAgente || !nombreResponsable || !descripcion || !asunto) {
    throw new ProviderAgentHttpError(400, 'Todos los campos son obligatorios excepto el teléfono del agente');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAgente)) {
    throw new ProviderAgentHttpError(400, 'Correo del agente inválido');
  }

  return { nombreAgente, emailAgente, nombreResponsable, descripcion, asunto, numeroAgente };
}

function validateUpdatePayload(body: Record<string, unknown>) {
  const nombreAgente = trimStr(body.nombreAgente);
  const emailAgente = trimStr(body.emailAgente).toLowerCase();
  const nombreResponsable = trimStr(body.nombreResponsable);
  const asunto = trimStr(body.asunto);
  const numeroAgente = trimStr(body.numeroAgente);

  if (!nombreAgente || !emailAgente || !nombreResponsable || !asunto) {
    throw new ProviderAgentHttpError(400, 'nombreAgente, emailAgente, nombreResponsable y asunto son obligatorios');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAgente)) {
    throw new ProviderAgentHttpError(400, 'Correo del agente inválido');
  }

  return { nombreAgente, emailAgente, nombreResponsable, asunto, numeroAgente };
}

async function logAudit(params: {
  usuario: string;
  email: string;
  ejecutivo?: string | null;
  ejecutivoEmail?: string | null;
  accion: string;
  descripcion: string;
  detalles?: Record<string, unknown>;
}) {
  await AuditLog.create({
    usuario: params.usuario,
    email: params.email,
    rol: 'ejecutivo',
    ejecutivo: params.ejecutivo || null,
    ejecutivoEmail: params.ejecutivoEmail || null,
    accion: params.accion,
    categoria: 'AGENTES_PROVEEDOR',
    descripcion: params.descripcion,
    detalles: params.detalles || {},
    clienteAfectado: null,
    ip: null,
  });
}

export async function listProviderAgents(
  userEmail: string,
  incluirInactivos: boolean,
) {
  await requirePricingOrAdmin(userEmail);
  const filter = incluirInactivos ? {} : { activo: true };
  const docs = await UserAgent.find(filter).sort({ nombreAgente: 1 });
  return docs.map(serializeUserAgent);
}

export async function createProviderAgent(
  userEmail: string,
  body: Record<string, unknown>,
  auditMeta: { usuario: string; ejecutivoNombre?: string },
) {
  const ejDoc = await requirePricingOrAdmin(userEmail);
  const data = validateCreatePayload(body);

  const existing = await UserAgent.findOne({ emailAgente: data.emailAgente, activo: true });
  if (existing) {
    throw new ProviderAgentHttpError(409, 'Ya existe un agente activo con ese correo');
  }

  const doc = await UserAgent.create({
    ...data,
    activo: true,
  });

  await logAudit({
    usuario: auditMeta.usuario,
    email: userEmail,
    ejecutivo: auditMeta.ejecutivoNombre || ejDoc.nombre,
    ejecutivoEmail: userEmail,
    accion: 'AGENTE_PROVEEDOR_CREADO',
    descripcion: `Agente creado: ${data.nombreAgente} (${data.emailAgente})`,
    detalles: { agentId: String(doc._id) },
  });

  return serializeUserAgent(doc);
}

export async function updateProviderAgent(
  userEmail: string,
  id: string,
  body: Record<string, unknown>,
  auditMeta: { usuario: string; ejecutivoNombre?: string },
) {
  const ejDoc = await requirePricingOrAdmin(userEmail);
  const data = validateUpdatePayload(body);

  const agent = await UserAgent.findById(id);
  if (!agent) throw new ProviderAgentHttpError(404, 'Agente no encontrado');

  if (data.emailAgente !== agent.emailAgente) {
    const duplicate = await UserAgent.findOne({
      emailAgente: data.emailAgente,
      activo: true,
      _id: { $ne: agent._id },
    });
    if (duplicate) {
      throw new ProviderAgentHttpError(409, 'Ya existe un agente activo con ese correo');
    }
  }

  agent.nombreAgente = data.nombreAgente;
  agent.emailAgente = data.emailAgente;
  agent.nombreResponsable = data.nombreResponsable;
  agent.asunto = data.asunto;
  agent.numeroAgente = data.numeroAgente;
  await agent.save();

  await logAudit({
    usuario: auditMeta.usuario,
    email: userEmail,
    ejecutivo: auditMeta.ejecutivoNombre || ejDoc.nombre,
    ejecutivoEmail: userEmail,
    accion: 'AGENTE_PROVEEDOR_ACTUALIZADO',
    descripcion: `Agente actualizado: ${data.nombreAgente} (${data.emailAgente})`,
    detalles: { agentId: id },
  });

  return serializeUserAgent(agent);
}

export async function deactivateProviderAgent(
  userEmail: string,
  id: string,
  auditMeta: { usuario: string; ejecutivoNombre?: string },
) {
  const ejDoc = await requirePricingOrAdmin(userEmail);
  const agent = await UserAgent.findById(id);
  if (!agent) throw new ProviderAgentHttpError(404, 'Agente no encontrado');
  if (!agent.activo) {
    throw new ProviderAgentHttpError(400, 'El agente ya está inactivo');
  }

  agent.activo = false;
  await agent.save();

  await logAudit({
    usuario: auditMeta.usuario,
    email: userEmail,
    ejecutivo: auditMeta.ejecutivoNombre || ejDoc.nombre,
    ejecutivoEmail: userEmail,
    accion: 'AGENTE_PROVEEDOR_DESACTIVADO',
    descripcion: `Agente desactivado: ${agent.nombreAgente} (${agent.emailAgente})`,
    detalles: { agentId: id },
  });

  return serializeUserAgent(agent);
}

export async function sendProviderAgentEmailAndSave(
  userEmail: string,
  id: string,
  descripcion: string,
  auditMeta: { usuario: string; ejecutivoNombre?: string },
) {
  const ejDoc = await requirePricingOrAdmin(userEmail);
  const agent = await UserAgent.findById(id);
  if (!agent) throw new ProviderAgentHttpError(404, 'Agente no encontrado');
  if (!agent.activo) throw new ProviderAgentHttpError(400, 'No se puede enviar correo a un agente inactivo');

  const descripcionTrimmed = trimStr(descripcion);
  if (!descripcionTrimmed) {
    throw new ProviderAgentHttpError(400, 'La descripción del correo es obligatoria');
  }

  let descripcionGuardada = false;
  if (descripcionTrimmed !== agent.descripcion) {
    agent.descripcion = descripcionTrimmed;
    await agent.save();
    descripcionGuardada = true;
  }

  await triggerN8nWorkflow('provider-agent-email', {
    agentId: id,
    nombreAgente: agent.nombreAgente,
    emailAgente: agent.emailAgente,
    numeroAgente: agent.numeroAgente || '',
    nombreResponsable: agent.nombreResponsable,
    asunto: agent.asunto,
    descripcion: descripcionTrimmed,
    triggeredBy: userEmail,
    triggeredByName: auditMeta.usuario || ejDoc.nombre,
    triggeredAt: new Date().toISOString(),
  });

  await logAudit({
    usuario: auditMeta.usuario,
    email: userEmail,
    ejecutivo: auditMeta.ejecutivoNombre || ejDoc.nombre,
    ejecutivoEmail: userEmail,
    accion: 'AGENTE_PROVEEDOR_CORREO_ENVIADO',
    descripcion: `Workflow n8n disparado para ${agent.nombreAgente} (${agent.emailAgente})`,
    detalles: {
      agentId: id,
      asunto: agent.asunto,
      descripcionGuardada,
      workflow: 'provider-agent-email',
    },
  });

  return {
    agent: serializeUserAgent(agent),
    emailSent: true,
    descripcionGuardada,
  };
}

export interface ManualWorkflowTriggerInput {
  asunto: string;
  descripcion: string;
  agentId?: string;
  nombreAgente?: string;
  emailAgente?: string;
  nombreResponsable?: string;
}

export async function triggerProviderAgentEmailWorkflowManual(
  userEmail: string,
  input: ManualWorkflowTriggerInput,
  auditMeta: { usuario: string; ejecutivoNombre?: string },
) {
  const ejDoc = await requirePricingOrAdmin(userEmail);

  const asunto = trimStr(input.asunto);
  const descripcion = trimStr(input.descripcion);
  if (!asunto || !descripcion) {
    throw new ProviderAgentHttpError(400, 'Asunto y descripción son obligatorios');
  }

  let agent: IUserAgentDoc | null = null;
  const agentId = trimStr(input.agentId);
  if (agentId) {
    agent = await UserAgent.findById(agentId);
    if (!agent) throw new ProviderAgentHttpError(404, 'Agente no encontrado');
    if (!agent.activo) throw new ProviderAgentHttpError(400, 'El agente está inactivo');
  }

  const nombreAgente = trimStr(input.nombreAgente) || agent?.nombreAgente || '';
  const emailAgente = trimStr(input.emailAgente).toLowerCase() || agent?.emailAgente || '';
  const nombreResponsable = trimStr(input.nombreResponsable) || agent?.nombreResponsable || '';

  await triggerN8nWorkflow('provider-agent-email', {
    agentId: agentId || undefined,
    nombreAgente,
    emailAgente,
    numeroAgente: agent?.numeroAgente || '',
    nombreResponsable,
    asunto,
    descripcion,
    triggeredBy: userEmail,
    triggeredByName: auditMeta.usuario || ejDoc.nombre,
    triggeredAt: new Date().toISOString(),
    manual: true,
  });

  await logAudit({
    usuario: auditMeta.usuario,
    email: userEmail,
    ejecutivo: auditMeta.ejecutivoNombre || ejDoc.nombre,
    ejecutivoEmail: userEmail,
    accion: 'AGENTE_PROVEEDOR_WORKFLOW_MANUAL',
    descripcion: `Workflow n8n disparado manualmente (${asunto})`,
    detalles: {
      agentId: agentId || null,
      asunto,
      emailAgente: emailAgente || null,
      workflow: 'provider-agent-email',
    },
  });

  return { triggered: true };
}

export function handleProviderAgentError(e: unknown) {
  if (e instanceof ProviderAgentHttpError) {
    return { status: e.status, body: { error: e.message } };
  }
  if (e instanceof N8nWorkflowError) {
    return { status: e.status, body: { error: e.message } };
  }
  console.error('[provider-agents] Error:', e);
  return { status: 500, body: { error: 'Error interno del servidor' } };
}
