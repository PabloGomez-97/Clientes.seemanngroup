/**
 * Pure helpers for portal notification routing (frontend + tests).
 */

export interface NotificationRouteInput {
  clientUsername?: string;
  quoteNumber?: string;
  payload?: {
    route?: string;
    clientUsername?: string;
    openModal?: string;
    modalTab?: string;
    targetTab?: string;
    quoteFilterNumber?: string;
    shipmentMode?: "AIR" | "OCEAN";
    shipmentId?: string;
    awbNumber?: string;
    containerNumber?: string;
    bookingNumber?: string;
    [key: string]: unknown;
  };
}

export interface NotificationNavigationTarget {
  route: string;
  state: {
    openModal?: string;
    modalTab?: string;
    targetTab?: string;
    quoteFilterNumber?: string;
    openTab?: "air" | "ocean";
    openTracking?: {
      mode: "air" | "ocean";
      awbNumber?: string;
      containerNumber?: string;
      bookingNumber?: string;
    };
  };
}

export function resolveNotificationRoute(
  n: NotificationRouteInput,
): string {
  const clientUsername =
    n.clientUsername ||
    (typeof n.payload?.clientUsername === "string"
      ? n.payload.clientUsername
      : undefined);

  const quoteNumber =
    n.quoteNumber ||
    (typeof n.payload?.quoteFilterNumber === "string"
      ? n.payload.quoteFilterNumber
      : undefined);

  const isQuoteType =
    typeof n.payload?.route === "string" &&
    (n.payload.route.includes("comportamiento") ||
      n.payload.route.includes("reporteria"));

  if (
    quoteNumber &&
    clientUsername &&
    (n.payload?.targetTab === "quotes" || isQuoteType)
  ) {
    return `/admin/clientes/reporteria/${encodeURIComponent(clientUsername)}`;
  }

  const route = n.payload?.route;
  if (!route) {
    return clientUsername
      ? `/admin/clientes/comportamiento/${encodeURIComponent(clientUsername)}`
      : "/admin/clientes/comportamiento";
  }

  if (
    route === "/admin/comportamiento-clientes" ||
    route === "/admin/op-comportamiento-clientes"
  ) {
    const base =
      route === "/admin/op-comportamiento-clientes"
        ? "/admin/operaciones/clientes/comportamiento"
        : "/admin/clientes/comportamiento";
    return clientUsername
      ? `${base}/${encodeURIComponent(clientUsername)}`
      : base;
  }

  return route;
}

export function buildNotificationNavigationState(
  n: NotificationRouteInput,
): NotificationNavigationTarget["state"] {
  const clientUsername =
    n.clientUsername ||
    (typeof n.payload?.clientUsername === "string"
      ? n.payload.clientUsername
      : undefined);

  const quoteNumber =
    n.quoteNumber ||
    (typeof n.payload?.quoteFilterNumber === "string"
      ? n.payload.quoteFilterNumber
      : undefined);

  const state: NotificationNavigationTarget["state"] = {};

  if (n.payload?.openModal) state.openModal = n.payload.openModal;
  if (
    n.payload?.modalTab === "air" ||
    n.payload?.modalTab === "ocean" ||
    n.payload?.modalTab === "all"
  ) {
    state.modalTab = n.payload.modalTab;
  }

  if (quoteNumber && clientUsername) {
    state.targetTab = "quotes";
    state.quoteFilterNumber = quoteNumber;
  } else if (n.payload?.targetTab === "quotes") {
    state.targetTab = "quotes";
    if (typeof n.payload.quoteFilterNumber === "string") {
      state.quoteFilterNumber = n.payload.quoteFilterNumber;
    }
  }

  if (n.payload?.route === "/shipsgo" || n.payload?.shipmentMode) {
    const mode = n.payload.shipmentMode === "OCEAN" ? "ocean" : "air";
    state.openTab = mode;
    if (mode === "air" && n.payload.awbNumber) {
      state.openTracking = { mode: "air", awbNumber: String(n.payload.awbNumber) };
    } else if (mode === "ocean") {
      const container = n.payload.containerNumber
        ? String(n.payload.containerNumber)
        : undefined;
      const booking = n.payload.bookingNumber
        ? String(n.payload.bookingNumber)
        : undefined;
      if (container || booking) {
        state.openTracking = {
          mode: "ocean",
          containerNumber: container,
          bookingNumber: booking,
        };
      }
    }
  }

  return state;
}

export function buildNotificationNavigation(
  n: NotificationRouteInput,
): NotificationNavigationTarget {
  return {
    route: resolveNotificationRoute(n),
    state: buildNotificationNavigationState(n),
  };
}

/** Notification types hidden from the bell dropdown but may still exist in feed. */
export const BELL_HIDDEN_NOTIFICATION_TYPES = ["CLIENT_COLD"] as const;

export function isVisibleInNotificationBell(type: string): boolean {
  return !BELL_HIDDEN_NOTIFICATION_TYPES.includes(
    type as (typeof BELL_HIDDEN_NOTIFICATION_TYPES)[number],
  );
}
