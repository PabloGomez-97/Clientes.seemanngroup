/**
 * Disparo de workflows n8n vía webhook desde el backend del portal.
 */

import { N8N_WORKFLOWS, type N8nWorkflowKey } from '../config/n8nWorkflows.js';

const DEFAULT_TIMEOUT_MS = 120_000;

export class N8nWorkflowError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface TriggerN8nWorkflowResult {
  ok: true;
  status: number;
  data: unknown;
}

function resolveWebhookUrl(workflowKey: N8nWorkflowKey): string {
  const config = N8N_WORKFLOWS[workflowKey];
  const webhookUrl = process.env[config.envWebhook]?.trim();
  if (!webhookUrl) {
    throw new N8nWorkflowError(
      503,
      `Workflow n8n no configurado. Falta la variable ${config.envWebhook}.`,
    );
  }
  if (webhookUrl.includes('/webhook-test/')) {
    console.warn(
      `[n8n] La URL de "${workflowKey}" usa /webhook-test/. ` +
        'Esa URL es temporal. Configura la URL de Production (/webhook/) en ' +
        `${config.envWebhook}.`,
    );
  }
  return webhookUrl;
}

function buildN8nErrorMessage(status: number, detail: string, webhookUrl: string): string {
  const notRegistered =
    status === 404 && /not registered|no está registrado/i.test(detail);
  const usesTestUrl = webhookUrl.includes('/webhook-test/');

  if (notRegistered) {
    if (usesTestUrl) {
      return (
        'El webhook de prueba de n8n dejó de estar disponible. ' +
        'En el nodo Webhook copia la URL de Production (termina en /webhook/provider-agent-email, ' +
        'sin "webhook-test"), actualiza N8N_WEBHOOK_PROVIDER_AGENT_EMAIL y activa el workflow en n8n.'
      );
    }
    return (
      'El webhook no está registrado en n8n. Abre el workflow en n8n, activa el interruptor ' +
      '"Active" (arriba a la derecha) y vuelve a intentar. El workflow debe permanecer activo ' +
      'para que el botón funcione cada vez.'
    );
  }

  return `Error n8n (${status}): ${detail}`;
}

export async function triggerN8nWorkflow(
  workflowKey: N8nWorkflowKey,
  payload: Record<string, unknown>,
  options?: { timeoutMs?: number },
): Promise<TriggerN8nWorkflowResult> {
  const webhookUrl = resolveWebhookUrl(workflowKey);
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const secret = process.env.N8N_WEBHOOK_SECRET?.trim();
  if (secret) {
    headers['X-N8N-Webhook-Secret'] = secret;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const raw = await res.text();
    let data: unknown = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        data = { message: raw };
      }
    }

    if (!res.ok) {
      const detail =
        typeof data === 'object' && data !== null && 'message' in data
          ? String((data as { message: unknown }).message)
          : raw || res.statusText;
      throw new N8nWorkflowError(
        res.status === 404 ? 404 : 502,
        buildN8nErrorMessage(res.status, detail, webhookUrl),
      );
    }

    console.log(`[n8n] Workflow "${workflowKey}" ejecutado correctamente`);
    return { ok: true, status: res.status, data };
  } catch (e) {
    if (e instanceof N8nWorkflowError) throw e;
    if (e instanceof Error && e.name === 'AbortError') {
      throw new N8nWorkflowError(
        504,
        'El workflow de n8n tardó demasiado en responder. Verifica que el webhook esté activo.',
      );
    }
    console.error(`[n8n] Error al disparar "${workflowKey}":`, e);
    throw new N8nWorkflowError(502, 'No se pudo contactar con n8n');
  } finally {
    clearTimeout(timeout);
  }
}
