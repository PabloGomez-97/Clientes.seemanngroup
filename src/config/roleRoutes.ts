// ============================================================================
// CONFIGURACIÓN DE RUTAS POR ROL
// ============================================================================
// Este archivo define qué rutas puede acceder cada rol.
// Para agregar acceso a un nuevo componente, simplemente agrega la ruta aquí.
//
// ROLES:
//   - administrador: Acceso a TODAS las rutas admin (no necesita configuración)
//   - pricing:       Acceso a tarifas y cotizador
//   - ejecutivo:     Acceso a clientes, trackeos, reportería y cotizador
//   - proveedor:     Acceso exclusivo al portal de proveedores
//
// REGLAS DE COMBINACIÓN:
//   - Administrador es exclusivo (no se combina con pricing, ejecutivo ni proveedor)
//   - Proveedor es exclusivo (no se combina con ningún otro rol)
//   - Pricing + Ejecutivo se pueden combinar
//   - Mínimo 1 rol obligatorio
// ============================================================================

export interface RolesConfig {
  administrador: boolean;
  pricing: boolean;
  ejecutivo: boolean;
  proveedor: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// RUTAS DEL ROL "PRICING"
// Agrega aquí cualquier ruta nueva que deba ser visible para el rol Pricing
// ────────────────────────────────────────────────────────────────────────────
export const PRICING_ROUTES: string[] = [
  '/admin/home',
  '/admin/cotizador-administrador',
  '/admin/pricing',
  '/admin/pricingFCL',
  '/admin/pricingLCL',
  '/admin/settings',
];

// ────────────────────────────────────────────────────────────────────────────
// RUTAS DEL ROL "EJECUTIVO"
// Agrega aquí cualquier ruta nueva que deba ser visible para el rol Ejecutivo
// ────────────────────────────────────────────────────────────────────────────
export const EJECUTIVO_ROUTES: string[] = [
  '/admin/home',
  '/admin/cotizador-administrador',
  '/admin/tusclientes',
  '/admin/trackeos',
  '/admin/reporteria',
  '/admin/reporteriaclientes',
  '/admin/settings',
];

// ────────────────────────────────────────────────────────────────────────────
// RUTAS DEL ROL "PROVEEDOR"
// Agrega aquí cualquier ruta nueva que deba ser visible para el rol Proveedor
// ────────────────────────────────────────────────────────────────────────────
export const PROVEEDOR_ROUTES: string[] = [
  '/proveedor/home',
  '/proveedor/settings',
];

// ────────────────────────────────────────────────────────────────────────────
// FUNCIÓN: Verificar si un usuario con ciertos roles puede acceder a una ruta
// ────────────────────────────────────────────────────────────────────────────
export function canAccessRoute(roles: RolesConfig | null | undefined, path: string): boolean {
  // Sin roles definidos → acceso completo (compatibilidad con cuentas antiguas)
  if (!roles) return true;

  // Administrador tiene acceso a TODO (excepto proveedor)
  if (roles.administrador) return !path.startsWith('/proveedor');

  // Proveedor solo puede acceder a rutas de proveedor
  if (roles.proveedor) {
    return PROVEEDOR_ROUTES.some(route => path === route || path.startsWith(route + '/'));
  }

  // Construir lista de rutas permitidas según roles activos
  const allowedRoutes: string[] = [];
  if (roles.pricing) allowedRoutes.push(...PRICING_ROUTES);
  if (roles.ejecutivo) allowedRoutes.push(...EJECUTIVO_ROUTES);

  // Verificar si la ruta actual coincide con alguna permitida
  return allowedRoutes.some(route => path === route || path.startsWith(route + '/'));
}

// ────────────────────────────────────────────────────────────────────────────
// FUNCIÓN: Verificar si un ítem del sidebar debe ser visible según los roles
// Recibe la ruta del ítem y los roles del usuario
// ────────────────────────────────────────────────────────────────────────────
export function canSeeSidebarItem(roles: RolesConfig | null | undefined, itemPath: string): boolean {
  return canAccessRoute(roles, itemPath);
}

// ────────────────────────────────────────────────────────────────────────────
// FUNCIÓN: Obtener etiquetas de roles activos para UI
// ────────────────────────────────────────────────────────────────────────────
export function getRoleLabels(roles: RolesConfig | null | undefined): string[] {
  if (!roles) return ['Ejecutivo'];
  const labels: string[] = [];
  if (roles.administrador) labels.push('Administrador');
  if (roles.pricing) labels.push('Pricing');
  if (roles.ejecutivo) labels.push('Ejecutivo');
  if (roles.proveedor) labels.push('Proveedor');
  return labels.length > 0 ? labels : ['Sin rol'];
}

// ────────────────────────────────────────────────────────────────────────────
// FUNCIÓN: Validar combinación de roles
// Retorna null si es válida, o un string con el error
// ────────────────────────────────────────────────────────────────────────────
export function validateRoles(roles: RolesConfig): string | null {
  if (roles.administrador && (roles.pricing || roles.ejecutivo || roles.proveedor)) {
    return 'El rol Administrador no se puede combinar con otros roles';
  }
  if (roles.proveedor && (roles.administrador || roles.pricing || roles.ejecutivo)) {
    return 'El rol Proveedor no se puede combinar con otros roles';
  }
  if (!roles.administrador && !roles.pricing && !roles.ejecutivo && !roles.proveedor) {
    return 'Debe tener al menos un rol asignado';
  }
  return null;
}
