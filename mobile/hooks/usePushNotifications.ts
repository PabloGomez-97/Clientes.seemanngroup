import { useEffect, useRef } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  getNotificationPreferences,
  registerPushToken,
} from "../services/pushNotifications";

export function usePushNotifications() {
  const { token, user } = useAuth();
  const registeredFor = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!token || !user || user.username === "Ejecutivo") return;
      if (registeredFor.current === token) return;

      try {
        const enabled = await getNotificationPreferences(token);
        if (cancelled || !enabled) return;
        await registerPushToken(token);
        if (!cancelled) registeredFor.current = token;
      } catch {
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, user]);
}
