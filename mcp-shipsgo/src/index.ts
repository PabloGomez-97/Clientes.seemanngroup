#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  ensureEnvLoaded,
  getShipsGoToken,
  toSafeJson,
} from "./config.js";
import { executeRequest } from "./tools/execute.js";
import {
  getAuthInfo,
  getEndpoint,
  listEndpoints,
  listSpecs,
  searchEndpoints,
} from "./tools/openapi.js";

ensureEnvLoaded();

const server = new McpServer({
  name: "shipsgo",
  version: "1.0.0",
});

function textResult(payload: unknown, token?: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: toSafeJson(payload, token),
      },
    ],
  };
}

function errorResult(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unexpected ShipsGo MCP error";
  return {
    content: [
      {
        type: "text" as const,
        text: toSafeJson({ error: message }),
      },
    ],
    isError: true,
  };
}

server.tool(
  "list_specs",
  "Lists available ShipsGo OpenAPI specs loaded by this MCP server.",
  {},
  async () => {
    try {
      return textResult(await listSpecs());
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.tool(
  "list_endpoints",
  "Lists all ShipsGo API paths and HTTP methods with summaries. Optionally filter by tag (e.g. ocean-shipments, air-shipments).",
  {
    tag: z
      .string()
      .optional()
      .describe(
        "Optional tag filter, e.g. ocean-shipments, air-shipments, ocean-carriers, air-airlines.",
      ),
  },
  async ({ tag }) => {
    try {
      return textResult(await listEndpoints(tag));
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.tool(
  "search_endpoints",
  "Deep-search ShipsGo endpoints by path, method, summary, description, or tags.",
  {
    query: z
      .string()
      .describe(
        "Search text, e.g. geojson, followers, booking_number, air shipments.",
      ),
  },
  async ({ query }) => {
    try {
      return textResult(await searchEndpoints(query));
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.tool(
  "get_endpoint",
  "Gets detailed information for a specific ShipsGo endpoint, including parameters, request body, responses, and resolved schemas.",
  {
    method: z
      .string()
      .describe("HTTP method, e.g. GET, POST, PATCH, DELETE."),
    path: z
      .string()
      .describe(
        "OpenAPI path template, e.g. /ocean/shipments/{shipment_id}.",
      ),
  },
  async ({ method, path }) => {
    try {
      return textResult(await getEndpoint(method, path));
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.tool(
  "get_auth_info",
  "Returns ShipsGo auth configuration metadata (header name and env var). Never returns the token value.",
  {},
  async () => {
    try {
      ensureEnvLoaded();
      return textResult(await getAuthInfo());
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.tool(
  "execute_request",
  "Executes an authenticated request against https://api.shipsgo.com/v2 using SHIPSGO_API_TOKEN from the repo .env. The token is never returned in the tool output.",
  {
    method: z.string().describe("HTTP method, e.g. GET or POST."),
    path: z
      .string()
      .describe(
        "API path, with concrete path params already substituted, e.g. /ocean/shipments/1001.",
      ),
    query: z
      .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
      .optional()
      .describe("Optional query string parameters."),
    headers: z
      .record(z.string())
      .optional()
      .describe(
        "Optional extra headers. Do not pass X-Shipsgo-User-Token; it is injected automatically.",
      ),
    body: z
      .unknown()
      .optional()
      .describe("Optional JSON body for POST/PATCH/PUT."),
    timeoutMs: z
      .number()
      .int()
      .positive()
      .max(120_000)
      .optional()
      .describe("Optional timeout in milliseconds (default 30000)."),
  },
  async ({ method, path, query, headers, body, timeoutMs }) => {
    try {
      const token = getShipsGoToken();
      const result = await executeRequest({
        method,
        path,
        query,
        headers,
        body,
        timeoutMs,
      });
      return textResult(result, token);
    } catch (error) {
      return errorResult(error);
    }
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  console.error("MCP ShipsGo failed to start:", error);
  process.exit(1);
});
