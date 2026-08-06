import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useAuth } from "../auth/AuthContext";
import {
  getNotificationPreferences,
  registerPushToken,
} from "../services/pushNotifications";

/** Evita martillar el API si el usuario entra/sale del foreground muy seguido. */
const REFRESH_MIN_INTERVAL_MS = 2 * 60 * 1000;

/**
 * Mantiene el Expo push token sincronizado con el backend:
 * - al iniciar sesión / montar la app
 * - cada vez que la app vuelve a primer plano
 * - cuando Expo rota el token del dispositivo
 * - al cambiar de cuenta (nuevo JWT / user)
 */
export function usePushNotifications() {
  const { token, user } = useAuth();
  const lastAttemptAt = useRef(0);
  const inFlight = useRef(false);
  const authTokenRef = useRef(token);
  const userEmailRef = useRef(user?.email ?? null);
  authTokenRef.current = token;
  userEmailRef.current = user?.email ?? null;

  useEffect(() => {
    let cancelled = false;
    let removeTokenListener: (() => void) | undefined;

    // Cuenta nueva / re-login: no heredar el throttle de la sesión anterior.
    lastAttemptAt.current = 0;

    const sync = async (force = false) => {
      const authToken = authTokenRef.current;
      if (!authToken || !user || user.username === "Ejecutivo") return;
      if (inFlight.current) return;

      const now = Date.now();
      if (!force && now - lastAttemptAt.current < REFRESH_MIN_INTERVAL_MS) {
        return;
      }

      inFlight.current = true;
      lastAttemptAt.current = now;
      try {
        const enabled = await getNotificationPreferences(authToken);
        if (cancelled || !enabled) return;
        // Si el usuario cambió a mitad del await, no registrar bajo la cuenta vieja.
        if (authTokenRef.current !== authToken) return;
        if ((userEmailRef.current ?? null) !== (user.email ?? null)) return;
        await registerPushToken(authToken);
      } catch {
        // best-effort: el próximo foreground reintenta
      } finally {
        inFlight.current = false;
      }
    };

    void sync(true);

    const onAppState = (next: AppStateStatus) => {
      if (next === "active") void sync(false);
    };
    const appSub = AppState.addEventListener("change", onAppState);

    void (async () => {
      try {
        const Notifications = await import("expo-notifications");
        const sub = Notifications.addPushTokenListener(() => {
          void sync(true);
        });
        removeTokenListener = () => sub.remove();
      } catch {
        // sin módulo nativo (Expo Go / web): no hay listener
      }
    })();

    return () => {
      cancelled = true;
      appSub.remove();
      removeTokenListener?.();
    };
  }, [token, user]);
}
