/**
 * Handoff de sesión entre portal Chile (/) y México (/mx) en el mismo dominio.
 * Misma origin ⇒ comparten localStorage: hay que manejar tenant con cuidado
 * para no validar un JWT mx contra /api/me de Chile (409 → loop).
 */

export const AUTH_TOKEN_KEY = "auth_token";
export const AUTH_TENANT_KEY = "auth_tenant";
export const AUTH_USERNAME_KEY = "active_username";

export type StoredTenant = "cl" | "mx";

export function readStoredTenant(): StoredTenant | null {
  const v = localStorage.getItem(AUTH_TENANT_KEY);
  return v === "cl" || v === "mx" ? v : null;
}

export function clearAuthStorage() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_TENANT_KEY);
  localStorage.removeItem(AUTH_USERNAME_KEY);
}

export function isLoginPath(pathname = window.location.pathname): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/login-") ||
    pathname === "/login-admin" ||
    pathname === "/login-proveedor"
  );
}

export function isMexicoPath(pathname = window.location.pathname): boolean {
  return pathname === "/mx" || pathname.startsWith("/mx/");
}

/**
 * En la SPA Chile: decide qué hacer con una sesión mx en localStorage.
 * - En /login*: limpiar para permitir nuevo login (rompe loops).
 * - Fuera de /mx: redirigir una vez a /mx.
 * - En /mx (rewrite roto, SPA Chile): no redirigir; dejar el bridge.
 */
export function resolveChileMxSession(pathname = window.location.pathname): {
  action: "clear_for_login" | "redirect_mx" | "stay" | "none";
} {
  const tenant = readStoredTenant();
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token || tenant !== "mx") return { action: "none" };

  if (isLoginPath(pathname)) return { action: "clear_for_login" };
  if (!isMexicoPath(pathname)) return { action: "redirect_mx" };
  return { action: "stay" };
}
