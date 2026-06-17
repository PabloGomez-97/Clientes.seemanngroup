/**
 * Envío de correos a agentes de proveedores vía Brevo.
 */

import { buildProviderAgentEmailHTML } from '../emails/providerAgentEmailTemplate.js';

const BREVO_SENDER = {
  name: 'Seemann Group · Proveedores',
  email: 'noreply@sphereglobal.io',
};

/** Elimina scripts y atributos de eventos peligrosos del HTML del cuerpo. */
export function sanitizeEmailBodyHtml(html: string): string {
  let safe = String(html || '');
  safe = safe.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  safe = safe.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  safe = safe.replace(/javascript:/gi, '');
  return safe.trim();
}

export interface SendProviderAgentEmailParams {
  toEmail: string;
  toName: string;
  subject: string;
  bodyHtml: string;
  agentName: string;
  responsableName: string;
  replyTo?: string;
}

export async function sendProviderAgentEmail(
  params: SendProviderAgentEmailParams,
): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY no configurado');

  const sanitizedBody = sanitizeEmailBodyHtml(params.bodyHtml);
  const htmlContent = buildProviderAgentEmailHTML({
    bodyHtml: sanitizedBody,
    agentName: params.agentName,
    responsableName: params.responsableName,
    subject: params.subject,
  });

  const payload: Record<string, unknown> = {
    sender: BREVO_SENDER,
    to: [{ email: params.toEmail, name: params.toName }],
    subject: params.subject,
    htmlContent,
  };

  if (params.replyTo) {
    payload.replyTo = { email: params.replyTo };
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error Brevo: ${err}`);
  }

  console.log(`[provider-agent-email] Enviado → ${params.toEmail}`);
}
