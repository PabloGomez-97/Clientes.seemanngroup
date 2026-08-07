import { Platform } from "react-native";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { MOBILE_API_BASE } from "../../src/auth/authApi";

/**
 * Solo para probar en desarrollo (`expo run:ios` / `run:android`).
 * Ponlo en `true`, recarga la app (Cmd+R) y verás la pantalla forzada.
 * Déjalo en `false` antes de subir builds a tienda.
 */
export const FORCE_UPDATE_TEST_IN_DEV = false;

const DEV_TEST_STORE_URLS = {
  ios: "https://apps.apple.com/app/id6793726585",
  android:
    "https://play.google.com/store/apps/details?id=com.seemanngroup.portalclientes",
} as const;

export type PlatformVersionConfig = {
  minVersion: string;
  latestVersion: string;
  storeUrl: string;
};

export type AppVersionConfig = {
  ios: PlatformVersionConfig;
  android: PlatformVersionConfig;
  message: string;
};

export type ForceUpdateRequirement = {
  required: true;
  storeUrl: string;
  message: string;
  currentVersion: string;
  minVersion: string;
  platform: "ios" | "android";
};

function parseVersionParts(version: string): number[] {
  return version
    .trim()
    .split(/[.+_-]/)
    .filter(Boolean)
    .map((part) => {
      const n = Number.parseInt(part.replace(/[^0-9]/g, ""), 10);
      return Number.isFinite(n) ? n : 0;
    });
}

/** Devuelve negativo si a < b, 0 si iguales, positivo si a > b. */
export function compareSemver(a: string, b: string): number {
  const pa = parseVersionParts(a);
  const pb = parseVersionParts(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function isVersionBelow(current: string, minimum: string): boolean {
  return compareSemver(current, minimum) < 0;
}

export function getInstalledAppVersion(): string {
  const native = Application.nativeApplicationVersion?.trim();
  if (native) return native;

  const fromExpo =
    Constants.expoConfig?.version?.trim() ||
    (Constants.manifest as { version?: string } | null)?.version?.trim();
  if (fromExpo) return fromExpo;

  return "0.0.0";
}

export function getStorePlatform(): "ios" | "android" | null {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return null;
}

export async function fetchAppVersionConfig(
  signal?: AbortSignal,
): Promise<AppVersionConfig> {
  const res = await fetch(
    `${MOBILE_API_BASE.replace(/\/$/, "")}/api/mobile/app-version`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    },
  );
  if (!res.ok) {
    throw new Error(`app-version HTTP ${res.status}`);
  }
  return (await res.json()) as AppVersionConfig;
}

/**
 * Fail-open: si no hay red / el endpoint falla, no bloquea la app.
 */
export async function checkForceUpdateRequirement(
  signal?: AbortSignal,
): Promise<ForceUpdateRequirement | null> {
  const platform = getStorePlatform();
  if (!platform) return null;

  const currentVersion = getInstalledAppVersion();

  if (__DEV__ && FORCE_UPDATE_TEST_IN_DEV) {
    return {
      required: true,
      storeUrl: DEV_TEST_STORE_URLS[platform],
      message:
        "Tenemos una actualización lista para ti, con mejoras y una experiencia más fluida.",
      currentVersion,
      minVersion: "99.0.0",
      platform,
    };
  }

  try {
    const config = await fetchAppVersionConfig(signal);
    const platformConfig = config[platform];
    if (!platformConfig?.minVersion || !platformConfig?.storeUrl) return null;

    if (!isVersionBelow(currentVersion, platformConfig.minVersion)) {
      return null;
    }

    return {
      required: true,
      storeUrl: platformConfig.storeUrl,
      message:
        config.message?.trim() ||
        "Tenemos una actualización lista para ti, con mejoras y una experiencia más fluida. Solo toma unos segundos y podrás seguir usando Seemann Group con normalidad.",
      currentVersion,
      minVersion: platformConfig.minVersion,
      platform,
    };
  } catch {
    return null;
  }
}
