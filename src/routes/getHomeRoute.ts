import type { User } from "@/auth/AuthContext";

export function getHomeRoute(user: User): string {
  if (!user) return "/login";
  if (user.username === "Ejecutivo") {
    if (user.roles?.proveedor) return "/proveedor/home";
    return "/admin/home";
  }
  return "/";
}
