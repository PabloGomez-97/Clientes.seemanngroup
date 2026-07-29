import {
  getBaseUrl,
  getShipsGoToken,
  redactSecrets,
  SHIPSGO_AUTH_HEADER,
  toSafeJson,
} from "../config.js";
import { loadOpenApiSpec } from "./openapi.js";

export type ExecuteRequestInput = {
  method: string;
  path: string;
  query?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
};

function buildUrl(
  baseUrl: string,
  apiPath: string,
  query?: ExecuteRequestInput["query"],
): string {
  const normalizedPath = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
  const url = new URL(`${baseUrl}${normalizedPath}`);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

function looksLikeJson(contentType: string | null): boolean {
  if (!contentType) return false;
  return contentType.includes("application/json") || contentType.includes("+json");
}

export async function executeRequest(input: ExecuteRequestInput) {
  const token = getShipsGoToken();
  const baseUrl = getBaseUrl();
  const method = input.method.toUpperCase();
  const url = buildUrl(baseUrl, input.path, input.query);

  // Validate path exists in OpenAPI when possible (helps catch typos).
  const { spec } = await loadOpenApiSpec();
  const openApiPath = Object.keys(spec.paths ?? {}).find((candidate) => {
    const pattern = candidate.replace(/\{[^/]+\}/g, "[^/]+");
    return new RegExp(`^${pattern}$`).test(input.path.split("?")[0] ?? input.path);
  });

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(input.headers ?? {}),
    [SHIPSGO_AUTH_HEADER]: token,
  };

  const init: RequestInit = {
    method,
    headers,
  };

  if (input.body !== undefined && method !== "GET" && method !== "HEAD") {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
    init.body =
      typeof input.body === "string" ? input.body : JSON.stringify(input.body);
  }

  const controller = new AbortController();
  const timeoutMs = input.timeoutMs ?? 30_000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const contentType = response.headers.get("content-type");
    const rawText = await response.text();

    let parsedBody: unknown = rawText;
    if (rawText && looksLikeJson(contentType)) {
      try {
        parsedBody = JSON.parse(rawText);
      } catch {
        parsedBody = rawText;
      }
    }

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      url: redactSecrets(url, token),
      matchedOpenApiPath: openApiPath ?? null,
      request: {
        method,
        path: input.path,
        query: input.query ?? {},
        // Never echo auth headers.
        headers: redactSecrets(
          {
            Accept: headers.Accept,
            "Content-Type": headers["Content-Type"],
            ...(input.headers ?? {}),
          },
          token,
        ),
        body: redactSecrets(input.body, token),
      },
      response: {
        headers: redactSecrets(responseHeaders, token),
        body: redactSecrets(parsedBody, token),
      },
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown request error";
    throw new Error(
      String(redactSecrets(`ShipsGo request failed: ${message}`, token)),
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function formatExecuteResult(result: unknown, token?: string): string {
  return toSafeJson(result, token);
}
