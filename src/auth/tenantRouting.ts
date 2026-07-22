import type { AuthUser } from "./authApi";

/** Redirección post-login al portal del país (mismo dominio: / o /mx/). */
export function goToTenantApp(redirectTo: string, fallbackPath?: string) {
  if (redirectTo.startsWith("/mx")) {
    window.location.assign(redirectTo);
    return;
  }
  if (fallbackPath) {
    window.location.assign(fallbackPath);
    return;
  }
  // Chile: navegación interna la hace el caller con react-router
}

export function getPostLoginPath(user: AuthUser): string {
  if (user.tenant === "mx") return "/mx";
  if (user.username === "Ejecutivo") {
    if (user.roles?.proveedor) return "/proveedor/home";
    return "/admin/home";
  }
  return "/";
}
