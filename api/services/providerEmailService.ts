/**
 * Envío de correos a agentes de proveedores según catálogo fijo (Craft, MSL, etc.).
 */

import mongoose from 'mongoose';
import {
  getProviderEmailProvider,
  listProviderEmailProvidersPublic,
} from '../config/providerEmailProviders.js';
import { N8nWorkflowError, triggerN8nWorkflow } from './n8nWorkflowService.js';
import { ProviderAgentHttpError } from './providerAgentService.js';

const EjecutivoSchema = new mongoose.Schema({
  nombre: String,
  email: String,
  activo: Boolean,
  roles: {
    administrador: Boolean,
    pricing: Boolean,
    ejecutivo: Boolean,
    proveedor: Boolean,
    operaciones: Boolean,
  },
});

const Ejecutivo =
  (mongoose.models.Ejecutivo as mongoose.Model<any>) ||
  mongoose.model('Ejecutivo', EjecutivoSchema);

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

async function requirePricingOrAdmin(userEmail: string) {
  const ejDoc = await Ejecutivo.findOne({ email: userEmail.toLowerCase() });
  if (!ejDoc?.roles?.administrador && !ejDoc?.roles?.pricing) {
    throw new ProviderAgentHttpError(403, 'No tienes permisos para enviar correos a proveedores');
  }
  return ejDoc;
}

function trimStr(value: unknown): string {
  return String(value ?? '').trim();
}

export function getProviderEmailCatalog() {
  return listProviderEmailProvidersPublic();
}

export async function sendProviderEmail(
  userEmail: string,
  providerId: string,
  descripcion: string,
  auditMeta: { usuario: string; ejecutivoNombre?: string },
) {
  const ejDoc = await requirePricingOrAdmin(userEmail);
  const provider = getProviderEmailProvider(trimStr(providerId));
  if (!provider) {
    throw new ProviderAgentHttpError(404, 'Proveedor no encontrado');
  }

  const descripcionTrimmed = trimStr(descripcion);
  if (!descripcionTrimmed) {
    throw new ProviderAgentHttpError(400, 'El cuerpo del correo es obligatorio');
  }

  await triggerN8nWorkflow(provider.workflowKey, {
    providerId: provider.id,
    nombreAgente: provider.label,
    asunto: provider.asunto,
    descripcion: descripcionTrimmed,
    triggeredBy: userEmail,
    triggeredByName: auditMeta.usuario || ejDoc.nombre,
    triggeredAt: new Date().toISOString(),
  });

  await AuditLog.create({
    usuario: auditMeta.usuario,
    email: userEmail,
    ejecutivo: auditMeta.ejecutivoNombre || ejDoc.nombre,
    ejecutivoEmail: userEmail,
    accion: 'PROVEEDOR_CORREO_ENVIADO',
    descripcion: `Correo enviado a ${provider.label}`,
    detalles: {
      providerId: provider.id,
      asunto: provider.asunto,
      workflow: provider.workflowKey,
    },
  });

  return { sent: true, providerId: provider.id };
}

export function handleProviderEmailError(e: unknown) {
  if (e instanceof ProviderAgentHttpError) {
    return { status: e.status, body: { error: e.message } };
  }
  if (e instanceof N8nWorkflowError) {
    const message =
      e.status === 404
        ? 'No se pudo enviar el correo. El servicio no está disponible en este momento.'
        : e.message.replace(/n8n/gi, 'el servicio de correo');
    return { status: e.status, body: { error: message } };
  }
  console.error('[provider-emails] Error:', e);
  return { status: 500, body: { error: 'Error interno del servidor' } };
}
