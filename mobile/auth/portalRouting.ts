import type { AuthUser } from "../../src/auth/authApi";

/** Cuenta staff (username fijo "Ejecutivo"). */
export function isStaffUser(user: AuthUser | null | undefined): boolean {
  return user?.username === "Ejecutivo";
}

export function canAccessAdminPortal(
  user: AuthUser | null | undefined,
): boolean {
  return isStaffUser(user) && Boolean(user?.roles?.administrador);
}

export function canAccessExecutivePortal(
  user: AuthUser | null | undefined,
): boolean {
  return isStaffUser(user) && Boolean(user?.roles?.ejecutivo);
}

export function canAccessOperacionesPortal(
  user: AuthUser | null | undefined,
): boolean {
  return isStaffUser(user) && Boolean(user?.roles?.operaciones);
}

export function canAccessPricingPortal(
  user: AuthUser | null | undefined,
): boolean {
  return isStaffUser(user) && Boolean(user?.roles?.pricing);
}

export function canAccessProveedorPortal(
  user: AuthUser | null | undefined,
): boolean {
  return isStaffUser(user) && Boolean(user?.roles?.proveedor);
}

export type MobilePortal =
  | "client"
  | "admin"
  | "executive"
  | "operaciones"
  | "pricing"
  | "proveedor"
  | "staff-empty";

/**
 * En mobile los roles staff son exclusivos (sin combinación).
 * Prioridad solo por seguridad de resolución:
 * admin → operaciones → pricing → ejecutivo → proveedor.
 */
export function resolveMobilePortal(
  user: AuthUser | null | undefined,
): MobilePortal | null {
  if (!user) return null;
  if (!isStaffUser(user)) return "client";
  if (canAccessAdminPortal(user)) return "admin";
  if (canAccessOperacionesPortal(user)) return "operaciones";
  if (canAccessPricingPortal(user)) return "pricing";
  if (canAccessExecutivePortal(user)) return "executive";
  if (canAccessProveedorPortal(user)) return "proveedor";
  return "staff-empty";
}
