/**
 * Configuración de versión mínima de la app móvil (force update).
 *
 * Flujo operativo:
 * 1. Publica el build nuevo en App Store / Play Store y espera a que esté live.
 * 2. Sube `minVersion` (p. ej. de "1.0.3" a "1.0.4").
 * 3. Las apps instaladas con versión menor verán la pantalla bloqueante.
 *
 * No subas `minVersion` antes de que la tienda ya tenga el binario disponible.
 */
export type MobilePlatformVersionConfig = {
  minVersion: string;
  latestVersion: string;
  storeUrl: string;
};

export type MobileAppVersionResponse = {
  ios: MobilePlatformVersionConfig;
  android: MobilePlatformVersionConfig;
  message: string;
};

export const MOBILE_APP_VERSION_CONFIG: MobileAppVersionResponse = {
  ios: {
    minVersion: "1.0.0",
    latestVersion: "1.0.3",
    storeUrl: "https://apps.apple.com/app/id6793726585",
  },
  android: {
    minVersion: "1.0.0",
    latestVersion: "1.0.3",
    storeUrl:
      "https://play.google.com/store/apps/details?id=com.seemanngroup.portalclientes",
  },
  message:
    "Tenemos una nueva versión lista para ti, con mejoras y una experiencia más fluida. Actualízala en unos segundos para seguir usando Seemann Group.",
};
