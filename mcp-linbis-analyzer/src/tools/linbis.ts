import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const LINBIS_SWAGGER_URL = "https://api.linbis.com/swagger.json";

export interface LinbisParameter {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required: boolean;
  description?: string;
}

export interface LinbisEndpoint {
  method: string;
  path: string;
  summary?: string;
  description?: string;
  tags: string[];
  requiredParameters: LinbisParameter[];
}

export interface LinbisModuleGroup {
  module: string;
  endpoints: LinbisEndpoint[];
}

export interface LinbisEndpointsResult {
  source: string;
  sourceType: "remote" | "fallback";
  fetchedAt: string;
  totalEndpoints: number;
  modules: LinbisModuleGroup[];
}

type OpenApiParameter = {
  name?: string;
  in?: string;
  required?: boolean;
  description?: string;
};

type OpenApiOperation = {
  tags?: string[];
  summary?: string;
  description?: string;
  parameters?: OpenApiParameter[];
};

type OpenApiSpec = {
  paths?: Record<string, Record<string, OpenApiOperation>>;
};

const HTTP_METHODS = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
]);

function parseRequiredParameters(
  operation: OpenApiOperation,
): LinbisParameter[] {
  return (operation.parameters ?? [])
    .filter((param) => param.name && param.in)
    .map((param) => ({
      name: param.name!,
      in: param.in as LinbisParameter["in"],
      required: Boolean(param.required),
      description: param.description,
    }))
    .filter((param) => param.required);
}

function groupByModule(endpoints: LinbisEndpoint[]): LinbisModuleGroup[] {
  const moduleMap = new Map<string, LinbisEndpoint[]>();

  for (const endpoint of endpoints) {
    const moduleName = endpoint.tags[0] ?? "Untagged";
    const existing = moduleMap.get(moduleName) ?? [];
    existing.push(endpoint);
    moduleMap.set(moduleName, existing);
  }

  return [...moduleMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([module, moduleEndpoints]) => ({
      module,
      endpoints: moduleEndpoints.sort((a, b) =>
        `${a.method} ${a.path}`.localeCompare(`${b.method} ${b.path}`),
      ),
    }));
}

export function parseSwaggerSpec(spec: OpenApiSpec): LinbisEndpoint[] {
  const endpoints: LinbisEndpoint[] = [];

  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method.toLowerCase())) continue;

      endpoints.push({
        method: method.toUpperCase(),
        path,
        summary: operation.summary,
        description: operation.description,
        tags: operation.tags ?? ["Untagged"],
        requiredParameters: parseRequiredParameters(operation),
      });
    }
  }

  return endpoints;
}

function defaultFallbackSwaggerPath(): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(moduleDir, "../../../swagger.md");
}

function resolveFallbackSwaggerPath(): string {
  if (process.env.LINBIS_SWAGGER_FALLBACK_PATH) {
    return path.resolve(process.env.LINBIS_SWAGGER_FALLBACK_PATH);
  }
  return defaultFallbackSwaggerPath();
}

async function loadFallbackSwagger(): Promise<OpenApiSpec> {
  const fallbackPath = resolveFallbackSwaggerPath();
  const raw = await readFile(fallbackPath, "utf8");
  return JSON.parse(raw) as OpenApiSpec;
}

export async function getLinbisEndpoints(): Promise<LinbisEndpointsResult> {
  const response = await fetch(LINBIS_SWAGGER_URL);

  if (response.ok) {
    const spec = (await response.json()) as OpenApiSpec;
    const endpoints = parseSwaggerSpec(spec);

    return {
      source: LINBIS_SWAGGER_URL,
      sourceType: "remote",
      fetchedAt: new Date().toISOString(),
      totalEndpoints: endpoints.length,
      modules: groupByModule(endpoints),
    };
  }

  try {
    const spec = await loadFallbackSwagger();
    const endpoints = parseSwaggerSpec(spec);
    const fallbackPath = resolveFallbackSwaggerPath();

    return {
      source: fallbackPath,
      sourceType: "fallback",
      fetchedAt: new Date().toISOString(),
      totalEndpoints: endpoints.length,
      modules: groupByModule(endpoints),
    };
  } catch (fallbackError) {
    const reason =
      fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
    throw new Error(
      `Failed to fetch Linbis swagger (${response.status} ${response.statusText}) and fallback also failed: ${reason}`,
    );
  }
}
