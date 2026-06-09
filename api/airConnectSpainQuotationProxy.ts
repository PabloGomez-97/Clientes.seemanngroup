export const DEFAULT_AIR_CONNECT_API_BASE =
  'https://57aaug0p0i.execute-api.eu-west-1.amazonaws.com/dev';

function resolveAirConnectApiKey(): string {
  return (
    process.env.API_KEY_3LG ||
    process.env.VITE_API_KEY_3LG ||
    ''
  );
}

function resolveAirConnectBaseUrl(): string {
  return (
    process.env.AIR_CONNECT_BASE_URL ||
    process.env.VITE_AIR_CONNECT_BASE_URL ||
    DEFAULT_AIR_CONNECT_API_BASE
  );
}

export class AirConnectProxyError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = 'AirConnectProxyError';
    this.status = status;
  }
}

export async function callAirConnectQuotationApi(
  input: unknown,
): Promise<Record<string, unknown>> {
  const apiKey = resolveAirConnectApiKey();
  const baseUrl = resolveAirConnectBaseUrl();

  if (!apiKey) {
    throw new AirConnectProxyError(
      'Falta API_KEY_3LG en el entorno del servidor',
      500,
    );
  }

  const url = `${baseUrl.replace(/\/+$/, '')}/api/quotations/calculate`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify(input),
  });

  const body = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | { error?: string }
    | null;

  if (!response.ok) {
    const message =
      body &&
      typeof body === 'object' &&
      'error' in body &&
      typeof body.error === 'string'
        ? body.error
        : `Error AirConnect (${response.status})`;
    throw new AirConnectProxyError(message, response.status);
  }

  if (
    !body ||
    typeof body !== 'object' ||
    !Array.isArray((body as { airFreight?: unknown }).airFreight)
  ) {
    throw new AirConnectProxyError('Respuesta inválida de AirConnect', 502);
  }

  return body;
}
