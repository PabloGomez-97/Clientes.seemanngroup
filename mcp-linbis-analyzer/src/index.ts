#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { analyzeEndpointGaps } from "./tools/analyzer.js";
import { getLinbisEndpoints } from "./tools/linbis.js";
import { getPortalEndpoints } from "./tools/portal.js";

const server = new McpServer({
  name: "linbis-analyzer",
  version: "1.0.0",
});

server.tool(
  "get_linbis_endpoints",
  "Fetches the Linbis OpenAPI swagger.json and returns all endpoints grouped by tag/module.",
  {},
  async () => {
    const result = await getLinbisEndpoints();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
);

server.tool(
  "get_portal_endpoints",
  "Scans the customer portal codebase for Linbis API calls (api.linbis.com and configured base URLs).",
  {
    portalRoot: z
      .string()
      .optional()
      .describe(
        "Optional absolute path to scan. Defaults to PORTAL_SRC_PATH env var or ../src relative to this package.",
      ),
  },
  async ({ portalRoot }) => {
    const result = await getPortalEndpoints(portalRoot);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
);

server.tool(
  "analyze_endpoint_gaps",
  "Compares Linbis API endpoints against portal usage and returns gaps with prioritized recommendations.",
  {
    portalRoot: z
      .string()
      .optional()
      .describe(
        "Optional absolute path to scan. Defaults to PORTAL_SRC_PATH env var or ../src relative to this package.",
      ),
  },
  async ({ portalRoot }) => {
    const result = await analyzeEndpointGaps(portalRoot);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  console.error("MCP Linbis Analyzer failed to start:", error);
  process.exit(1);
});
