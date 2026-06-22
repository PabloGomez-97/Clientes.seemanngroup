import {
  getLinbisEndpoints,
  type LinbisEndpoint,
  type LinbisEndpointsResult,
} from "./linbis.js";
import {
  getPortalEndpoints,
  type PortalEndpoint,
  type PortalEndpointsResult,
} from "./portal.js";

export interface UnusedEndpoint {
  method: string;
  path: string;
  summary?: string;
  module: string;
  requiredParameters: string[];
  portalValueNote: string;
  priorityScore: number;
}

export interface EndpointGapModule {
  module: string;
  unusedCount: number;
  endpoints: UnusedEndpoint[];
}

export interface PrioritizedRecommendation {
  rank: number;
  method: string;
  path: string;
  module: string;
  summary?: string;
  rationale: string;
  priorityScore: number;
}

export interface EndpointGapAnalysis {
  analyzedAt: string;
  linbis: Pick<LinbisEndpointsResult, "source" | "totalEndpoints">;
  portal: Pick<
    PortalEndpointsResult,
    "scanRoot" | "uniqueEndpoints" | "totalUsages"
  >;
  summary: {
    linbisTotal: number;
    portalUnique: number;
    portalUsages: number;
    unusedInPortal: number;
    coveragePercent: number;
  };
  unusedByModule: EndpointGapModule[];
  prioritizedRecommendations: PrioritizedRecommendation[];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function swaggerPathToRegex(swaggerPath: string): RegExp {
  const pattern = swaggerPath
    .split("/")
    .map((segment) => {
      if (segment.startsWith("{") && segment.endsWith("}")) {
        return "[^/]+";
      }
      return escapeRegex(segment);
    })
    .join("/");

  return new RegExp(`^${pattern}$`, "i");
}

export function portalMatchesSwagger(
  portal: PortalEndpoint,
  swagger: LinbisEndpoint,
): boolean {
  if (portal.method !== swagger.method) return false;

  const regex = swaggerPathToRegex(swagger.path);
  return regex.test(portal.normalizedPath) || regex.test(portal.path);
}

function assessPortalValue(endpoint: LinbisEndpoint): {
  note: string;
  score: number;
} {
  const text = `${endpoint.path} ${endpoint.summary ?? ""} ${endpoint.description ?? ""} ${endpoint.tags.join(" ")}`.toLowerCase();

  const rules: Array<{ pattern: RegExp; note: string; score: number }> = [
    {
      pattern: /track|status|milestone|event|timeline/,
      note: "Seguimiento en tiempo real del envío — alto valor para portal de clientes.",
      score: 95,
    },
    {
      pattern: /document|attachment|file|pod|proof/,
      note: "Documentos y comprobantes — mejora autoservicio y reduce consultas al ejecutivo.",
      score: 92,
    },
    {
      pattern: /invoice|billing|payment|charge|cobro/,
      note: "Facturación y cobros — visibilidad financiera clave para el cliente.",
      score: 90,
    },
    {
      pattern: /quote|quotation|rate|pricing/,
      note: "Cotizaciones y tarifas — complementa el flujo comercial del portal.",
      score: 88,
    },
    {
      pattern: /shipment|shipping|ocean|air|ground|container|awb|bl\b/,
      note: "Operaciones de embarque — extiende visibilidad operativa del portal.",
      score: 85,
    },
    {
      pattern: /account|customer|consignee|client/,
      note: "Datos de cuenta/cliente — útil para perfil y personalización.",
      score: 70,
    },
    {
      pattern: /report|analytics|dashboard|kpi/,
      note: "Reportería — valor para usuarios avanzados y ejecutivos.",
      score: 65,
    },
    {
      pattern: /notification|alert|email|sms/,
      note: "Notificaciones — puede habilitar alertas proactivas en el portal.",
      score: 60,
    },
    {
      pattern: /warehouse|inventory|commodit/,
      note: "Inventario/mercancía — relevante para visibilidad de carga.",
      score: 58,
    },
    {
      pattern: /admin|internal|salesrep|employee/,
      note: "Operación interna — baja prioridad para portal de clientes.",
      score: 20,
    },
  ];

  for (const rule of rules) {
    if (rule.pattern.test(text)) {
      return { note: rule.note, score: rule.score };
    }
  }

  if (endpoint.method === "GET") {
    return {
      note: "Endpoint de lectura — evaluar si expone datos útiles para clientes.",
      score: 45,
    };
  }

  return {
    note: "Operación de escritura — revisar permisos antes de exponer en portal.",
    score: 30,
  };
}

function findUnusedEndpoints(
  linbis: LinbisEndpointsResult,
  portal: PortalEndpointsResult,
): UnusedEndpoint[] {
  const unused: UnusedEndpoint[] = [];

  for (const moduleGroup of linbis.modules) {
    for (const endpoint of moduleGroup.endpoints) {
      const isUsed = portal.endpoints.some((portalEndpoint) =>
        portalMatchesSwagger(portalEndpoint, endpoint),
      );

      if (isUsed) continue;

      const value = assessPortalValue(endpoint);

      unused.push({
        method: endpoint.method,
        path: endpoint.path,
        summary: endpoint.summary,
        module: moduleGroup.module,
        requiredParameters: endpoint.requiredParameters.map(
          (param) => `${param.name} (${param.in})`,
        ),
        portalValueNote: value.note,
        priorityScore: value.score,
      });
    }
  }

  return unused;
}

export async function analyzeEndpointGaps(
  portalRoot?: string,
): Promise<EndpointGapAnalysis> {
  const [linbis, portal] = await Promise.all([
    getLinbisEndpoints(),
    getPortalEndpoints(portalRoot),
  ]);

  const unused = findUnusedEndpoints(linbis, portal);

  const moduleMap = new Map<string, UnusedEndpoint[]>();
  for (const endpoint of unused) {
    const list = moduleMap.get(endpoint.module) ?? [];
    list.push(endpoint);
    moduleMap.set(endpoint.module, list);
  }

  const unusedByModule: EndpointGapModule[] = [...moduleMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([module, endpoints]) => ({
      module,
      unusedCount: endpoints.length,
      endpoints: endpoints.sort(
        (a, b) => b.priorityScore - a.priorityScore || a.path.localeCompare(b.path),
      ),
    }));

  const prioritizedRecommendations: PrioritizedRecommendation[] = [...unused]
    .sort((a, b) => b.priorityScore - a.priorityScore || a.path.localeCompare(b.path))
    .slice(0, 10)
    .map((endpoint, index) => ({
      rank: index + 1,
      method: endpoint.method,
      path: endpoint.path,
      module: endpoint.module,
      summary: endpoint.summary,
      rationale: endpoint.portalValueNote,
      priorityScore: endpoint.priorityScore,
    }));

  const coveragePercent =
    linbis.totalEndpoints === 0
      ? 0
      : Math.round(
          ((linbis.totalEndpoints - unused.length) / linbis.totalEndpoints) * 100,
        );

  return {
    analyzedAt: new Date().toISOString(),
    linbis: {
      source: linbis.source,
      totalEndpoints: linbis.totalEndpoints,
    },
    portal: {
      scanRoot: portal.scanRoot,
      uniqueEndpoints: portal.uniqueEndpoints,
      totalUsages: portal.totalUsages,
    },
    summary: {
      linbisTotal: linbis.totalEndpoints,
      portalUnique: portal.uniqueEndpoints,
      portalUsages: portal.totalUsages,
      unusedInPortal: unused.length,
      coveragePercent,
    },
    unusedByModule,
    prioritizedRecommendations,
  };
}
