import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import type { ShipsGoOpenTrackingTarget } from "../../src/services/shipsgoTrackingNavigation";

type LooseNav = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getParent: () => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getState?: () => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigate: (...args: any[]) => void;
};

/**
 * Abre el seguimiento desde Operaciones.
 * - Portal cliente: tab Trackeos.
 * - Staff embebido en Clientes: pantalla ClientTrackeos del mismo cliente.
 */
export function openTrackeosFromOperacion(
  navigation: LooseNav,
  target: ShipsGoOpenTrackingTarget,
) {
  let current: LooseNav | undefined = navigation;

  for (let depth = 0; depth < 8 && current; depth++) {
    const parent = current.getParent?.() as LooseNav | undefined;
    if (!parent) break;

    const state = parent.getState?.();
    const names = (state?.routeNames ??
      state?.routes?.map((r: { name: string }) => r.name)) as
      | string[]
      | undefined;

    if (names?.includes("Trackeos")) {
      (parent as NavigationProp<ParamListBase>).navigate("Trackeos", {
        screen: "TrackeosList",
        params: { openTracking: target },
      });
      return;
    }

    if (names?.includes("ClientTrackeos")) {
      const focused = state?.routes?.[state.index ?? 0] as
        | { params?: Record<string, unknown> }
        | undefined;
      const params = (focused?.params ?? {}) as {
        username?: string;
        nombreuser?: string;
        email?: string;
      };
      if (params.username) {
        (parent as NavigationProp<ParamListBase>).navigate("ClientTrackeos", {
          username: params.username,
          nombreuser: params.nombreuser,
          email: params.email,
          openTracking: target,
        });
        return;
      }
    }

    current = parent;
  }
}
