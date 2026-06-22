import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface PortalEndpoint {
  method: string;
  path: string;
  normalizedPath: string;
  rawUrl: string;
  file: string;
  line: number;
}

export interface PortalEndpointsResult {
  scanRoot: string;
  scannedFiles: number;
  totalUsages: number;
  uniqueEndpoints: number;
  endpoints: PortalEndpoint[];
}

const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const LINBIS_QUOTED_URL_PATTERN =
  /['"]https?:\/\/api\.linbis\.com([^'"]+)['"]/gi;
const LINBIS_TEMPLATE_URL_PATTERN =
  /`https?:\/\/api\.linbis\.com((?:[^`$]|\$\{[^}]+\})*)`/gi;
const LINBIS_CONST_URL_PATTERN =
  /(?:export\s+)?const\s+[A-Z0-9_]*LINBIS[A-Z0-9_]*\s*=\s*['"`](https?:\/\/api\.linbis\.com[^'"`]+)['"`]/gi;

const METHOD_HINT_PATTERN =
  /\b(method|type)\s*:\s*['"`](GET|POST|PUT|PATCH|DELETE)['"`]/i;

function getDefaultPortalRoot(): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(moduleDir, "../../../src");
}

export function resolvePortalRoot(customRoot?: string): string {
  if (customRoot) return path.resolve(customRoot);
  if (process.env.PORTAL_SRC_PATH) return path.resolve(process.env.PORTAL_SRC_PATH);
  return getDefaultPortalRoot();
}

async function collectSourceFiles(rootDir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "dist") continue;
        await walk(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;
      if (!SCAN_EXTENSIONS.has(path.extname(entry.name))) continue;
      files.push(fullPath);
    }
  }

  await walk(rootDir);
  return files;
}

function stripQueryAndHash(urlPath: string): string {
  return urlPath.split("?")[0]?.split("#")[0] ?? urlPath;
}

export function normalizePortalPath(rawPath: string): string {
  let normalized = stripQueryAndHash(rawPath.trim());

  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }

  normalized = normalized
    .replace(/\$\{[^}]+\}/g, "{param}")
    .replace(/\/\d+(?=\/|$)/g, "/{param}")
    .replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?=\/|$)/gi,
      "/{param}",
    )
    .replace(/\/[A-Za-z0-9_-]{20,}(?=\/|$)/g, "/{param}");

  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

function inferMethod(content: string, matchIndex: number): string {
  const windowStart = Math.max(0, matchIndex - 400);
  const windowEnd = Math.min(content.length, matchIndex + 200);
  const context = content.slice(windowStart, windowEnd);

  const methodMatch = context.match(METHOD_HINT_PATTERN);
  if (methodMatch?.[2]) return methodMatch[2].toUpperCase();

  if (/\b(post|create|upload|send)\b/i.test(context)) return "POST";
  if (/\b(put|update)\b/i.test(context)) return "PUT";
  if (/\b(patch)\b/i.test(context)) return "PATCH";
  if (/\b(delete|remove)\b/i.test(context)) return "DELETE";

  return "GET";
}

function lineNumberAt(content: string, index: number): number {
  return content.slice(0, index).split("\n").length;
}

function pushPortalEndpoint(
  results: PortalEndpoint[],
  content: string,
  rawUrl: string,
  matchIndex: number,
  relativeFile: string,
): void {
  const urlPath = rawUrl.replace(/^https?:\/\/api\.linbis\.com/i, "");
  const normalizedPath = normalizePortalPath(urlPath);

  results.push({
    method: inferMethod(content, matchIndex),
    path: stripQueryAndHash(urlPath),
    normalizedPath,
    rawUrl: rawUrl.slice(0, 200),
    file: relativeFile,
    line: lineNumberAt(content, matchIndex),
  });
}

function extractLinbisUrls(
  content: string,
  filePath: string,
  scanRoot: string,
): PortalEndpoint[] {
  const results: PortalEndpoint[] = [];
  const relativeFile = path.relative(scanRoot, filePath).replace(/\\/g, "/");

  let match: RegExpExecArray | null;

  LINBIS_QUOTED_URL_PATTERN.lastIndex = 0;
  while ((match = LINBIS_QUOTED_URL_PATTERN.exec(content)) !== null) {
    const suffix = match[1] ?? "";
    pushPortalEndpoint(
      results,
      content,
      `https://api.linbis.com${suffix}`,
      match.index,
      relativeFile,
    );
  }

  LINBIS_TEMPLATE_URL_PATTERN.lastIndex = 0;
  while ((match = LINBIS_TEMPLATE_URL_PATTERN.exec(content)) !== null) {
    const suffix = match[1] ?? "";
    pushPortalEndpoint(
      results,
      content,
      `https://api.linbis.com${suffix}`,
      match.index,
      relativeFile,
    );
  }

  LINBIS_CONST_URL_PATTERN.lastIndex = 0;
  while ((match = LINBIS_CONST_URL_PATTERN.exec(content)) !== null) {
    const rawUrl = match[1];
    if (!rawUrl) continue;
    pushPortalEndpoint(results, content, rawUrl, match.index, relativeFile);
  }

  return results;
}

function dedupeEndpoints(endpoints: PortalEndpoint[]): PortalEndpoint[] {
  const seen = new Set<string>();
  const unique: PortalEndpoint[] = [];

  for (const endpoint of endpoints) {
    const key = `${endpoint.method} ${endpoint.normalizedPath}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(endpoint);
  }

  return unique.sort((a, b) =>
    `${a.method} ${a.normalizedPath}`.localeCompare(`${b.method} ${b.normalizedPath}`),
  );
}

export async function getPortalEndpoints(
  customRoot?: string,
): Promise<PortalEndpointsResult> {
  const scanRoot = resolvePortalRoot(customRoot);
  const files = await collectSourceFiles(scanRoot);
  const allEndpoints: PortalEndpoint[] = [];

  for (const file of files) {
    const content = await readFile(file, "utf8");
    allEndpoints.push(...extractLinbisUrls(content, file, scanRoot));
  }

  const uniqueEndpoints = dedupeEndpoints(allEndpoints);

  return {
    scanRoot,
    scannedFiles: files.length,
    totalUsages: allEndpoints.length,
    uniqueEndpoints: uniqueEndpoints.length,
    endpoints: uniqueEndpoints,
  };
}
