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

function findParentWithRoute(
  navigation: LooseNav,
  routeName: string,
): LooseNav | null {
  let current: LooseNav | undefined = navigation;
  for (let depth = 0; depth < 8 && current; depth++) {
    const parent = current.getParent?.() as LooseNav | undefined;
    if (!parent) break;
    const state = parent.getState?.();
    const names = (state?.routeNames ??
      state?.routes?.map((r: { name: string }) => r.name)) as
      | string[]
      | undefined;
    if (names?.includes(routeName)) return parent;
    current = parent;
  }
  return null;
}

/**
 * Abre el seguimiento desde Operaciones.
 * - Portal cliente: tab Trackeos.
 * - Staff embebido en Clientes: pantalla ClientTrackeos del mismo cliente.
 */
export function openTrackeosFromOperacion(
  navigation: LooseNav,
  target: ShipsGoOpenTrackingTarget,
) {
  const trackeosParent = findParentWithRoute(navigation, "Trackeos");
  if (trackeosParent) {
    (trackeosParent as NavigationProp<ParamListBase>).navigate("Trackeos", {
      screen: "TrackeosList",
      params: { openTracking: target },
    });
    return;
  }

  const clientTrackeos = findParentWithRoute(navigation, "ClientTrackeos");
  if (!clientTrackeos) return;

  const state = clientTrackeos.getState?.();
  const focused = state?.routes?.[state.index ?? 0] as
    | { params?: Record<string, unknown> }
    | undefined;
  const params = (focused?.params ?? {}) as {
    username?: string;
    nombreuser?: string;
    email?: string;
  };
  if (!params.username) return;

  (clientTrackeos as NavigationProp<ParamListBase>).navigate("ClientTrackeos", {
    username: params.username,
    nombreuser: params.nombreuser,
    email: params.email,
    openTracking: target,
  });
}

export function openNewAirTrackingFromOperacion(
  navigation: LooseNav,
  awbNumber: string,
  tagHint?: string | null,
) {
  const parent = findParentWithRoute(navigation, "Trackeos");
  if (!parent) return;
  (parent as NavigationProp<ParamListBase>).navigate("Trackeos", {
    screen: "NewAirTracking",
    params: {
      initialAwb: awbNumber,
      initialTag: tagHint?.trim() || undefined,
    },
  });
}

export function openNewOceanTrackingFromOperacion(
  navigation: LooseNav,
  params: {
    containerNumber?: string | null;
    bookingNumber?: string | null;
    tagHint?: string | null;
  },
) {
  const parent = findParentWithRoute(navigation, "Trackeos");
  if (!parent) return;
  const container = params.containerNumber?.trim();
  const booking = params.bookingNumber?.trim();
  (parent as NavigationProp<ParamListBase>).navigate("Trackeos", {
    screen: "NewOceanTracking",
    params: {
      initialIdentifierType: container ? "container_number" : "booking_number",
      initialIdentifierValue: container || booking || undefined,
      initialTag: params.tagHint?.trim() || undefined,
    },
  });
}

export function openCotizacionesFromOperacion(navigation: LooseNav) {
  const parent = findParentWithRoute(navigation, "Cotizaciones");
  if (!parent) return;
  (parent as NavigationProp<ParamListBase>).navigate("Cotizaciones");
}
