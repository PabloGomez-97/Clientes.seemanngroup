import type { AuthUser } from "../../src/auth/authApi";

/** Cuenta staff (username fijo "Ejecutivo"). */
export function isStaffUser(user: AuthUser | null | undefined): boolean {
  return user?.username === "Ejecutivo";
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

export type MobilePortal =
  | "client"
  | "executive"
  | "operaciones"
  | "staff-empty";

export function resolveMobilePortal(
  user: AuthUser | null | undefined,
): MobilePortal | null {
  if (!user) return null;
  if (!isStaffUser(user)) return "client";
  if (canAccessOperacionesPortal(user)) return "operaciones";
  if (canAccessExecutivePortal(user)) return "executive";
  return "staff-empty";
}
