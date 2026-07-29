import { readFile } from "node:fs/promises";
import { getBaseUrl, getOpenApiPath } from "../config.js";

const HTTP_METHODS = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
]);

export type OpenApiParameter = {
  name?: string;
  in?: string;
  required?: boolean;
  description?: string;
  schema?: unknown;
  example?: unknown;
};

export type OpenApiRequestBody = {
  required?: boolean;
  description?: string;
  content?: Record<
    string,
    {
      schema?: unknown;
      examples?: unknown;
    }
  >;
};

export type OpenApiOperation = {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses?: Record<string, unknown>;
  security?: unknown[];
};

export type OpenApiSpec = {
  openapi?: string;
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
  servers?: Array<{ url?: string; description?: string }>;
  paths?: Record<string, Record<string, OpenApiOperation>>;
  components?: {
    schemas?: Record<string, unknown>;
    securitySchemes?: Record<string, unknown>;
  };
};

export type EndpointSummary = {
  method: string;
  path: string;
  summary?: string;
  description?: string;
  tags: string[];
  operationId?: string;
};

export type EndpointDetail = EndpointSummary & {
  parameters: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses?: Record<string, unknown>;
  resolvedSchemas?: Record<string, unknown>;
};

let cachedSpec: OpenApiSpec | null = null;
let cachedSpecPath: string | null = null;

export async function loadOpenApiSpec(force = false): Promise<{
  spec: OpenApiSpec;
  source: string;
}> {
  const source = getOpenApiPath();
  if (!force && cachedSpec && cachedSpecPath === source) {
    return { spec: cachedSpec, source };
  }

  const raw = await readFile(source, "utf8");
  const spec = JSON.parse(raw) as OpenApiSpec;
  cachedSpec = spec;
  cachedSpecPath = source;
  return { spec, source };
}

function collectEndpoints(spec: OpenApiSpec): EndpointSummary[] {
  const endpoints: EndpointSummary[] = [];
  for (const [path, methods] of Object.entries(spec.paths ?? {})) {
    for (const [method, operation] of Object.entries(methods)) {
      if (!HTTP_METHODS.has(method.toLowerCase())) continue;
      endpoints.push({
        method: method.toUpperCase(),
        path,
        summary: operation.summary,
        description: operation.description,
        tags: operation.tags ?? [],
        operationId: operation.operationId,
      });
    }
  }
  return endpoints.sort((a, b) =>
    a.path === b.path
      ? a.method.localeCompare(b.method)
      : a.path.localeCompare(b.path),
  );
}

function collectRefNames(node: unknown, refs = new Set<string>()): Set<string> {
  if (!node || typeof node !== "object") return refs;
  if (Array.isArray(node)) {
    for (const item of node) collectRefNames(item, refs);
    return refs;
  }

  for (const [key, value] of Object.entries(node)) {
    if (key === "$ref" && typeof value === "string") {
      const match = value.match(/^#\/components\/schemas\/(.+)$/);
      if (match?.[1]) refs.add(match[1]);
    } else {
      collectRefNames(value, refs);
    }
  }
  return refs;
}

export async function listSpecs() {
  const { spec, source } = await loadOpenApiSpec();
  return {
    specs: [
      {
        title: spec.info?.title ?? "ShipsGo API",
        version: spec.info?.version ?? "unknown",
        openapi: spec.openapi ?? "3.x",
        source,
        baseUrl: getBaseUrl(),
        pathCount: Object.keys(spec.paths ?? {}).length,
        schemaCount: Object.keys(spec.components?.schemas ?? {}).length,
        authHeader: "X-Shipsgo-User-Token",
        authEnvVar: "SHIPSGO_API_TOKEN",
      },
    ],
  };
}

export async function listEndpoints(tag?: string) {
  const { spec, source } = await loadOpenApiSpec();
  let endpoints = collectEndpoints(spec);
  if (tag) {
    const needle = tag.toLowerCase();
    endpoints = endpoints.filter((endpoint) =>
      endpoint.tags.some((value) => value.toLowerCase().includes(needle)),
    );
  }

  const byPath: Record<string, EndpointSummary[]> = {};
  for (const endpoint of endpoints) {
    byPath[endpoint.path] ??= [];
    byPath[endpoint.path].push(endpoint);
  }

  return {
    source,
    baseUrl: getBaseUrl(),
    total: endpoints.length,
    endpoints,
    byPath,
  };
}

export async function searchEndpoints(query: string) {
  const { spec, source } = await loadOpenApiSpec();
  const endpoints = collectEndpoints(spec);
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return { source, query, total: 0, matches: [] as EndpointSummary[] };
  }

  const matches = endpoints.filter((endpoint) => {
    const haystack = [
      endpoint.method,
      endpoint.path,
      endpoint.summary ?? "",
      endpoint.description ?? "",
      endpoint.operationId ?? "",
      ...endpoint.tags,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });

  return {
    source,
    query,
    total: matches.length,
    matches,
  };
}

export async function getEndpoint(method: string, path: string) {
  const { spec, source } = await loadOpenApiSpec();
  const normalizedMethod = method.toLowerCase();
  const operation = spec.paths?.[path]?.[normalizedMethod];

  if (!operation) {
    const available = collectEndpoints(spec)
      .filter((endpoint) => endpoint.path === path)
      .map((endpoint) => endpoint.method);
    throw new Error(
      available.length > 0
        ? `No existe ${method.toUpperCase()} ${path}. Métodos disponibles: ${available.join(", ")}`
        : `No existe el path ${path} en el OpenAPI de ShipsGo.`,
    );
  }

  const detail: EndpointDetail = {
    method: method.toUpperCase(),
    path,
    summary: operation.summary,
    description: operation.description,
    tags: operation.tags ?? [],
    operationId: operation.operationId,
    parameters: operation.parameters ?? [],
    requestBody: operation.requestBody,
    responses: operation.responses,
  };

  const refs = collectRefNames({
    parameters: operation.parameters,
    requestBody: operation.requestBody,
    responses: operation.responses,
  });

  const resolvedSchemas: Record<string, unknown> = {};
  for (const ref of refs) {
    const schema = spec.components?.schemas?.[ref];
    if (schema) resolvedSchemas[ref] = schema;
  }

  return {
    source,
    baseUrl: getBaseUrl(),
    endpoint: {
      ...detail,
      resolvedSchemas:
        Object.keys(resolvedSchemas).length > 0 ? resolvedSchemas : undefined,
    },
  };
}

export async function getAuthInfo() {
  const { spec, source } = await loadOpenApiSpec();
  return {
    source,
    baseUrl: getBaseUrl(),
    authHeader: "X-Shipsgo-User-Token",
    authEnvVar: "SHIPSGO_API_TOKEN",
    tokenConfigured: Boolean((process.env.SHIPSGO_API_TOKEN || "").trim()),
    securitySchemes: spec.components?.securitySchemes ?? {},
    note: "El valor del token nunca se expone por estas tools. Solo se usa en execute_request.",
  };
}
