/**
 * Catálogo de workflows n8n invocables desde el portal.
 * Cada entrada apunta a una variable de entorno con la URL del webhook.
 */

export const N8N_WORKFLOW_KEYS = ['provider-agent-email', 'provider-agent-email-msl'] as const;

export type N8nWorkflowKey = (typeof N8N_WORKFLOW_KEYS)[number];

export interface N8nWorkflowConfig {
  /** Variable de entorno que contiene la URL del webhook de producción */
  envWebhook: string;
  /** Roles de ejecutivo permitidos para disparar el workflow */
  roles: Array<'pricing' | 'administrador'>;
}

export const N8N_WORKFLOWS: Record<N8nWorkflowKey, N8nWorkflowConfig> = {
  'provider-agent-email': {
    envWebhook: 'N8N_WEBHOOK_PROVIDER_AGENT_EMAIL',
    roles: ['pricing', 'administrador'],
  },
  'provider-agent-email-msl': {
    envWebhook: 'N8N_WEBHOOK_PROVIDER_AGENT_EMAIL_MSL',
    roles: ['pricing', 'administrador'],
  },
};
