/**
 * Catálogo de agentes/proveedores para correos de tarifas.
 * El asunto y el webhook son fijos por proveedor; solo el cuerpo lo edita el ejecutivo.
 */

import type { N8nWorkflowKey } from './n8nWorkflows.js';

export interface ProviderEmailProviderConfig {
  id: string;
  label: string;
  asunto: string;
  workflowKey: N8nWorkflowKey;
  defaultDescripcion: string;
}

export const PROVIDER_EMAIL_PROVIDERS: ProviderEmailProviderConfig[] = [
  {
    id: 'craft',
    label: 'Craft',
    asunto: 'Revisión de correos',
    workflowKey: 'provider-agent-email',
    defaultDescripcion:
      'Dear Craft, Good Day. Can you please update us the rate for the upcoming month? Thanks!',
  },
  {
    id: 'msl',
    label: 'MSL',
    asunto: 'Revisión de tarifas MSL',
    workflowKey: 'provider-agent-email-msl',
    defaultDescripcion:
      'Dear MSL, Good Day. Can you please update us the rate for the upcoming month? Thanks!',
  },
];

export function getProviderEmailProvider(id: string): ProviderEmailProviderConfig | undefined {
  return PROVIDER_EMAIL_PROVIDERS.find((p) => p.id === id);
}

export function listProviderEmailProvidersPublic() {
  return PROVIDER_EMAIL_PROVIDERS.map(({ id, label, asunto, defaultDescripcion }) => ({
    id,
    label,
    asunto,
    defaultDescripcion,
  }));
}
