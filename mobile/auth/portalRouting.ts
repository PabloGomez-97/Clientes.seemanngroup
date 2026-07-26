import type { AuthUser } from "../../src/auth/authApi";

/** Cuenta staff (username fijo "Ejecutivo"). */
export function isStaffUser(user: AuthUser | null | undefined): boolean {
  return user?.username === "Ejecutivo";
}

/**
 * Fase 1: portal ejecutivo completo solo si tiene rol `ejecutivo`.
 * Otros staff (pricing solo, operaciones, admin, proveedor) → home vacío.
 */
export function canAccessExecutivePortal(
  user: AuthUser | null | undefined,
): boolean {
  return isStaffUser(user) && Boolean(user?.roles?.ejecutivo);
}

export type MobilePortal = "client" | "executive" | "staff-empty";

export function resolveMobilePortal(
  user: AuthUser | null | undefined,
): MobilePortal | null {
  if (!user) return null;
  if (!isStaffUser(user)) return "client";
  if (canAccessExecutivePortal(user)) return "executive";
  return "staff-empty";
}
