import { Platform } from "react-native";
import Constants from "expo-constants";
import { MOBILE_API_BASE } from "../../src/auth/authApi";

type NotificationsModule = typeof import("expo-notifications");

let notificationsMod: NotificationsModule | null | undefined;

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

    const projectId =
      Constants.easConfig?.projectId ??
      Constants.expoConfig?.extra?.eas?.projectId;

    if (!projectId || typeof projectId !== "string") return null;

    const push = await Notifications.getExpoPushTokenAsync({ projectId });

    const r = await fetch(apiUrl("/api/mobile/push-token"), {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: push.data,
        platform: Platform.OS,
      }),
    });

    if (!r.ok) return null;
    return push.data;
  } catch {
    return null;
  }
}

export async function unregisterPushToken(
  authToken: string,
  pushToken?: string | null,
): Promise<void> {
  await fetch(apiUrl("/api/mobile/push-token"), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(pushToken ? { token: pushToken } : {}),
  }).catch(() => undefined);
}
