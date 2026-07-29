import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(PACKAGE_ROOT, "..");

const SENSITIVE_HEADER_NAMES = new Set([
  "x-shipsgo-user-token",
  "authorization",
  "cookie",
  "set-cookie",
]);

export const SHIPSGO_AUTH_HEADER = "X-Shipsgo-User-Token";
export const DEFAULT_BASE_URL = "https://api.shipsgo.com/v2";

function resolveEnvFilePath(): string | undefined {
  const candidates = [
    process.env.SHIPSGO_DOTENV_PATH,
    process.env.DOTENV_PATH,
    path.join(REPO_ROOT, ".env"),
    path.join(PACKAGE_ROOT, ".env"),
  ].filter((value): value is string => Boolean(value));

  return candidates.find((candidate) => existsSync(candidate));
}

let envLoaded = false;

export function ensureEnvLoaded(): void {
  if (envLoaded) return;
  const envPath = resolveEnvFilePath();
  if (envPath) {
    loadDotenv({ path: envPath, quiet: true });
  }
  envLoaded = true;
}

export function getOpenApiPath(): string {
  ensureEnvLoaded();
  return (
    process.env.SHIPSGO_OPENAPI_PATH ||
    path.join(PACKAGE_ROOT, "openapi.json")
  );
}

export function getShipsGoToken(): string {
  ensureEnvLoaded();
  const token = (process.env.SHIPSGO_API_TOKEN || "").trim();
  if (!token) {
    throw new Error(
      "SHIPSGO_API_TOKEN no está configurado. Defínelo en el .env del repo (nunca en mcp.json).",
    );
  }
  return token;
}

export function getBaseUrl(): string {
  ensureEnvLoaded();
  return (process.env.SHIPSGO_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
}

export function maskSecret(value: string): string {
  if (!value) return "";
  if (value.length <= 8) return "***";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export function redactSecrets(input: unknown, token?: string): unknown {
  if (typeof input === "string") {
    let text = input;
    if (token && token.length > 0) {
      text = text.split(token).join("[REDACTED_TOKEN]");
    }
    return text;
  }

  if (Array.isArray(input)) {
    return input.map((item) => redactSecrets(item, token));
  }

  if (input && typeof input === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (SENSITIVE_HEADER_NAMES.has(key.toLowerCase())) {
        result[key] = "[REDACTED]";
        continue;
      }
      result[key] = redactSecrets(value, token);
    }
    return result;
  }

  return input;
}

export function toSafeJson(value: unknown, token?: string): string {
  return JSON.stringify(redactSecrets(value, token), null, 2);
}
