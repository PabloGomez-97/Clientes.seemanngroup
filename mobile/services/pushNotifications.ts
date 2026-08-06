import { Platform } from "react-native";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { MOBILE_API_BASE } from "../../src/auth/authApi";

type NotificationsModule = typeof import("expo-notifications");

let notificationsMod: NotificationsModule | null | undefined;
/** Último Expo push token de ESTE dispositivo (sesión / proceso). */
let lastRegisteredPushToken: string | null = null;

const PUSH_TOKEN_KEY = "expo_push_token";

function apiUrl(path: string): string {
  return `${MOBILE_API_BASE.replace(/\/$/, "")}${path}`;
}

function hasPushNativeModule(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireOptionalNativeModule } = require("expo-modules-core");
    return requireOptionalNativeModule("ExpoPushTokenManager") != null;
  } catch {
    return false;
  }
}

function canRegisterPush(): boolean {
  if (Platform.OS === "web") return false;
  if (Constants.appOwnership === "expo") return false;
  if (Constants.executionEnvironment === "storeClient") return false;
  return hasPushNativeModule();
}

function getEasProjectId(): string | null {
  const projectId =
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId;
  return typeof projectId === "string" && projectId ? projectId : null;
}

async function getNotifications(): Promise<NotificationsModule | null> {
  if (notificationsMod !== undefined) return notificationsMod;
  if (!canRegisterPush()) {
    notificationsMod = null;
    return null;
  }

  try {
    const mod = await import("expo-notifications");
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    notificationsMod = mod;
    return mod;
  } catch {
    notificationsMod = null;
    return null;
  }
}

async function persistPushToken(token: string | null): Promise<void> {
  lastRegisteredPushToken = token;
  try {
    if (token) {
      await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
    }
  } catch {
    // SecureStore puede fallar en edge cases; la memoria sigue siendo útil.
  }
}

/**
 * Resuelve el push token de este dispositivo sin inventar borrados masivos:
 * memoria → SecureStore → Expo nativo.
 */
export async function resolveDevicePushToken(): Promise<string | null> {
  if (lastRegisteredPushToken) return lastRegisteredPushToken;

  try {
    const stored = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
    if (stored?.startsWith("ExponentPushToken")) {
      lastRegisteredPushToken = stored;
      return stored;
    }
  } catch {
    // ignore
  }

  const Notifications = await getNotifications();
  const projectId = getEasProjectId();
  if (!Notifications || !projectId) return null;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return null;
    const push = await Notifications.getExpoPushTokenAsync({ projectId });
    if (push.data?.startsWith("ExponentPushToken")) {
      lastRegisteredPushToken = push.data;
      return push.data;
    }
  } catch {
    // ignore
  }
  return null;
}

export function getLastRegisteredPushToken(): string | null {
  return lastRegisteredPushToken;
}

export async function getNotificationPreferences(
  token: string,
): Promise<boolean> {
  const r = await fetch(apiUrl("/api/mobile/notification-preferences"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (r.status === 404 || r.status === 405) return true;
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  return data.enabled !== false;
}

export async function setNotificationPreferences(
  token: string,
  enabled: boolean,
): Promise<boolean> {
  const r = await fetch(apiUrl("/api/mobile/notification-preferences"), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ enabled }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  return data.enabled !== false;
}

async function deletePushTokenOnServer(
  authToken: string,
  pushToken: string,
): Promise<void> {
  await fetch(apiUrl("/api/mobile/push-token"), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token: pushToken }),
  }).catch(() => undefined);
}

/**
 * Pide permiso, obtiene el Expo push token y lo guarda en el backend.
 * Seguro llamar varias veces: re-sincroniza el token actual del dispositivo.
 * Si Expo rota el token, limpia el anterior en el servidor.
 */
export async function registerPushToken(
  authToken: string,
): Promise<string | null> {
  const Notifications = await getNotifications();
  if (!Notifications) return null;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return null;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("seguimientos", {
        name: "Seguimientos",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#ff6200",
      });
    }

    const projectId = getEasProjectId();
    if (!projectId) return null;

    // Token previo de ESTE dispositivo (antes de pedir uno nuevo / rotado).
    const previousToken =
      lastRegisteredPushToken ||
      (await SecureStore.getItemAsync(PUSH_TOKEN_KEY).catch(() => null));

    const push = await Notifications.getExpoPushTokenAsync({ projectId });
    const newToken = push.data;
    if (!newToken?.startsWith("ExponentPushToken")) return null;

    const r = await fetch(apiUrl("/api/mobile/push-token"), {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: newToken,
        platform: Platform.OS,
      }),
    });

    if (!r.ok) return null;

    // Rotación: el token viejo de este teléfono ya no debe quedar ligado al usuario.
    if (
      previousToken &&
      previousToken.startsWith("ExponentPushToken") &&
      previousToken !== newToken
    ) {
      await deletePushTokenOnServer(authToken, previousToken);
    }

    await persistPushToken(newToken);
    return newToken;
  } catch {
    return null;
  }
}

/**
 * Quita SOLO el token de este dispositivo.
 * Nunca borra “todos los dispositivos” del usuario (evita romper iPad/otro teléfono).
 */
export async function unregisterPushToken(
  authToken: string,
  pushToken?: string | null,
): Promise<void> {
  const explicit = pushToken && String(pushToken).trim();
  const tokenToRemove =
    (explicit && explicit.startsWith("ExponentPushToken")
      ? explicit
      : null) || (await resolveDevicePushToken());

  // Sin token concreto: no hacemos deleteMany. El próximo login reasigna por upsert.
  if (!tokenToRemove) return;

  await deletePushTokenOnServer(authToken, tokenToRemove);
  await persistPushToken(null);
}
