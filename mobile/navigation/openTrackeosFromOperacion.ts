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

type NewTrackingParams = {
  mode: "air" | "ocean";
  initialAwb?: string;
  initialIdentifierType?: "container_number" | "booking_number";
  initialIdentifierValue?: string;
  initialTag?: string;
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

function readClientScopeParams(nav: LooseNav): {
  username?: string;
  nombreuser?: string;
  email?: string;
} {
  const state = nav.getState?.();
  const focused = state?.routes?.[state.index ?? 0] as
    | { params?: Record<string, unknown> }
    | undefined;
  return (focused?.params ?? {}) as {
    username?: string;
    nombreuser?: string;
    email?: string;
  };
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
  const clientTrackeos = findParentWithRoute(navigation, "ClientTrackeos");
  if (clientTrackeos) {
    const params = readClientScopeParams(clientTrackeos);
    if (params.username) {
      (clientTrackeos as NavigationProp<ParamListBase>).navigate(
        "ClientTrackeos",
        {
          username: params.username,
          nombreuser: params.nombreuser,
          email: params.email,
          openTracking: target,
        },
      );
      return;
    }
  }

  const trackeosParent = findParentWithRoute(navigation, "Trackeos");
  if (!trackeosParent) return;
  (trackeosParent as NavigationProp<ParamListBase>).navigate("Trackeos", {
    screen: "TrackeosList",
    params: { openTracking: target },
  });
}

function openNewTrackingFromOperacion(
  navigation: LooseNav,
  tracking: NewTrackingParams,
) {
  const clientTrackeos = findParentWithRoute(navigation, "ClientTrackeos");
  if (clientTrackeos) {
    const params = readClientScopeParams(clientTrackeos);
    // Si estamos dentro de ClientOperaciones, los params están en esa ruta.
    const state = clientTrackeos.getState?.();
    const opsRoute = state?.routes?.find(
      (r: { name: string }) => r.name === "ClientOperaciones",
    ) as { params?: Record<string, unknown> } | undefined;
    const scope = {
      username:
        params.username ||
        (opsRoute?.params?.username as string | undefined),
      nombreuser:
        params.nombreuser ||
        (opsRoute?.params?.nombreuser as string | undefined),
      email: params.email || (opsRoute?.params?.email as string | undefined),
    };
    if (scope.username) {
      (clientTrackeos as NavigationProp<ParamListBase>).navigate(
        "ClientTrackeos",
        {
          ...scope,
          openNewTracking: tracking,
        },
      );
      return;
    }
  }

  const trackeosParent = findParentWithRoute(navigation, "Trackeos");
  if (!trackeosParent) return;

  if (tracking.mode === "air") {
    (trackeosParent as NavigationProp<ParamListBase>).navigate("Trackeos", {
      screen: "NewAirTracking",
      params: {
        initialAwb: tracking.initialAwb,
        initialTag: tracking.initialTag,
      },
    });
    return;
  }

  (trackeosParent as NavigationProp<ParamListBase>).navigate("Trackeos", {
    screen: "NewOceanTracking",
    params: {
      initialIdentifierType: tracking.initialIdentifierType,
      initialIdentifierValue: tracking.initialIdentifierValue,
      initialTag: tracking.initialTag,
    },
  });
}

export function openNewAirTrackingFromOperacion(
  navigation: LooseNav,
  awbNumber: string,
  tagHint?: string | null,
) {
  openNewTrackingFromOperacion(navigation, {
    mode: "air",
    initialAwb: awbNumber,
    initialTag: tagHint?.trim() || undefined,
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
  const container = params.containerNumber?.trim();
  const booking = params.bookingNumber?.trim();
  openNewTrackingFromOperacion(navigation, {
    mode: "ocean",
    initialIdentifierType: container ? "container_number" : "booking_number",
    initialIdentifierValue: container || booking || undefined,
    initialTag: params.tagHint?.trim() || undefined,
  });
}

export function openCotizacionesFromOperacion(navigation: LooseNav) {
  const parent = findParentWithRoute(navigation, "Cotizaciones");
  if (!parent) return;
  (parent as NavigationProp<ParamListBase>).navigate("Cotizaciones");
}
