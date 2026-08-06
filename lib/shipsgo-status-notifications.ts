/**
 * Shared ShipsGo status → portal notification + mobile push.
 * Used by cron (backup poll) and webhooks (instant).
 *
 * IMPORTANT: no registrar modelos User/Ejecutivo/PortalNotification al importar.
 * Si se registra un User incompleto (sin passwordHash) antes que api/index o
 * server/index, mongoose.models.User queda “congelado” y el login Chile falla
 * (passwordHash stripped) → cuentas duales caen solo en México.
 */

import mongoose from "mongoose";
import {
  formatTrackingTagsLabel,
  sendTrackingPushToClient,
} from "./expo-push.js";

export type ShipsgoShipmentMode = "AIR" | "OCEAN";

function getEjecutivoModel(): mongoose.Model<any> {
  if (mongoose.models.Ejecutivo) {
    return mongoose.models.Ejecutivo as mongoose.Model<any>;
  }
  const EjecutivoSchema = new mongoose.Schema({
    email: String,
    nombre: String,
    activo: Boolean,
    roles: {
      administrador: Boolean,
      pricing: Boolean,
      ejecutivo: Boolean,
      proveedor: Boolean,
      operaciones: Boolean,
    },
  });
  return mongoose.model("Ejecutivo", EjecutivoSchema);
}

function getUserModel(): mongoose.Model<any> {
  if (mongoose.models.User) {
    return mongoose.models.User as mongoose.Model<any>;
  }
  // Cron / webhook cold start: schema completo mínimo (passwordHash obligatorio).
  const UserSchema = new mongoose.Schema({
    email: String,
    username: String,
    usernames: [String],
    nombreuser: String,
    passwordHash: String,
    loginFailCount: { type: Number, default: 0 },
    loginCaptchaRequired: { type: Boolean, default: false },
    ejecutivoId: { type: mongoose.Schema.Types.ObjectId, ref: "Ejecutivo" },
    mobilePushEnabled: { type: Boolean, default: true },
  });
  return mongoose.model("User", UserSchema);
}

function getPortalNotificationModel(): mongoose.Model<any> {
  if (mongoose.models.PortalNotification) {
    return mongoose.models.PortalNotification as mongoose.Model<any>;
  }
  const PortalNotificationSchema = new mongoose.Schema(
    {
      audience: {
        type: String,
        required: true,
        enum: ["EJECUTIVO", "CLIENTE", "OPERACIONES"],
        index: true,
      },
      recipientEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true,
      },
      recipientUsername: String,
      type: {
        type: String,
        required: true,
        enum: [
          "QUOTE_COMPLETED",
          "QUOTE_ABANDONED",
          "TRACKING_CREATED",
          "TRACKING_STATUS_CHANGED",
          "TRACKING_DELAYED",
          "CLIENT_ASSIGNED",
          "CLIENT_COLD",
        ],
      },
      dedupKey: { type: String, required: true },
      sessionId: String,
      quoteType: String,
      quoteNumber: String,
      route: { origin: String, destination: String },
      shipmentMode: String,
      shipmentId: String,
      reference: String,
      awbNumber: String,
      containerNumber: String,
      tagsLabel: String,
      oldStatus: String,
      newStatus: String,
      clientEmail: String,
      clientUsername: String,
      clientNombre: String,
      payload: { type: mongoose.Schema.Types.Mixed, default: {} },
      read: { type: Boolean, default: false },
      readAt: Date,
    },
    { timestamps: true },
  );
  PortalNotificationSchema.index(
    { recipientEmail: 1, dedupKey: 1 },
    { unique: true },
  );
  return mongoose.model("PortalNotification", PortalNotificationSchema);
}

function getShipmentStateSnapshotModel(): mongoose.Model<any> {
  if (mongoose.models.ShipmentStateSnapshot) {
    return mongoose.models.ShipmentStateSnapshot as mongoose.Model<any>;
  }
  const ShipmentStateSnapshotSchema = new mongoose.Schema(
    {
      mode: { type: String, required: true, enum: ["AIR", "OCEAN"] },
      shipmentId: { type: String, required: true },
      reference: String,
      status: String,
      isDelayed: { type: Boolean, default: false },
      updatedAtIso: String,
      lastSeenAt: { type: Date, default: () => new Date() },
    },
    { timestamps: true },
  );
  ShipmentStateSnapshotSchema.index({ mode: 1, shipmentId: 1 }, { unique: true });
  return mongoose.model("ShipmentStateSnapshot", ShipmentStateSnapshotSchema);
}

export function isAirDelayed(s: any): boolean {
  if (!s?.route) return false;
  const eta = s.route.destination?.date_of_rcf;
  const tp = Number(s.route.transit_percentage ?? 0);
  if (!eta || tp >= 100) return false;
  return new Date(s.updated_at) >= new Date(eta) && tp < 100;
}

export function isOceanDelayed(s: any): boolean {
  if (!s?.route) return false;
  const eta = s.route.port_of_discharge?.date_of_discharge;
  const tp = Number(s.route.transit_percentage ?? 0);
  if (!eta || tp >= 100) return false;
  return new Date(s.updated_at) >= new Date(eta) && tp < 100;
}

export type ShipmentSnapshotLike = {
  status?: string | null;
  isDelayed?: boolean | null;
} | null;

/**
 * Lógica pura de transición (testable sin Mongo):
 * - Sin snapshot previo → no notifica (solo “aprende” estado).
 * - Con snapshot y status distinto → status change.
 * - Con snapshot y demora false→true → delay.
 */
export function evaluateShipmentTransition(
  mode: ShipsgoShipmentMode,
  shipment: any,
  snapshot: ShipmentSnapshotLike,
): {
  shipmentId: string;
  status?: string;
  reference: string;
  tagsLabel?: string;
  isDelayed: boolean;
  updatedAtIso?: string;
  oldStatus?: string;
  shouldNotifyStatusChange: boolean;
  shouldNotifyDelay: boolean;
  awbNumber?: string;
  containerNumber?: string;
  bookingNumber?: string;
} | null {
  const shipmentId = String(shipment?.id ?? "").trim();
  if (!shipmentId) return null;

  const status = String(shipment?.status ?? "").trim() || undefined;
  const reference = String(shipment?.reference ?? "").trim();
  const updatedAtIso = shipment?.updated_at || undefined;
  const isDelayed =
    mode === "AIR" ? isAirDelayed(shipment) : isOceanDelayed(shipment);
  const tagsLabel = formatTrackingTagsLabel(shipment?.tags);
  const oldStatus = snapshot?.status
    ? String(snapshot.status).trim() || undefined
    : undefined;
  const oldDelayed = !!snapshot?.isDelayed;

  return {
    shipmentId,
    status,
    reference,
    tagsLabel,
    isDelayed,
    updatedAtIso,
    oldStatus,
    shouldNotifyStatusChange: !!(snapshot && status && status !== oldStatus),
    shouldNotifyDelay: !!(snapshot && !oldDelayed && isDelayed),
    awbNumber: mode === "AIR" ? shipment?.awb_number : undefined,
    containerNumber: mode === "OCEAN" ? shipment?.container_number : undefined,
    bookingNumber: mode === "OCEAN" ? shipment?.booking_number : undefined,
  };
}

/** @returns true si el documento se insertó (nuevo), false si ya existía. */
async function upsertNotification(doc: any): Promise<boolean> {
  try {
    const PortalNotification = getPortalNotificationModel();
    const recipient = String(doc.recipientEmail || "")
      .toLowerCase()
      .trim();
    if (!recipient) return false;
    const { dedupKey, recipientEmail: _recipient, ...rest } = doc;
    const result = await PortalNotification.updateOne(
      { recipientEmail: recipient, dedupKey },
      {
        $set: {
          ...rest,
          recipientEmail: recipient,
          read: false,
          readAt: undefined,
          updatedAt: new Date(),
        },
        $setOnInsert: { dedupKey, createdAt: new Date() },
      },
      { upsert: true },
    );
    return (result.upsertedCount ?? 0) > 0;
  } catch (err) {
    console.error("[shipsgo-status] upsert notification failed:", err);
    return false;
  }
}

async function fanOut(opts: {
  type: "TRACKING_STATUS_CHANGED" | "TRACKING_DELAYED";
  shipmentMode: ShipsgoShipmentMode;
  shipmentId: string;
  reference: string;
  awbNumber?: string;
  containerNumber?: string;
  bookingNumber?: string;
  tagsLabel?: string;
  oldStatus?: string;
  newStatus?: string;
}): Promise<void> {
  try {
    const User = getUserModel();
    const Ejecutivo = getEjecutivoModel();
    const reference = String(opts.reference || "").trim();
    if (!reference) return;

    const clientUser = await User.findOne({
      $or: [{ username: reference }, { usernames: reference }],
    }).populate("ejecutivoId");

    const dedupKey = `${opts.type}:${opts.shipmentMode}:${opts.shipmentId}${
      opts.newStatus ? ":" + opts.newStatus : ""
    }`;

    const baseDoc: any = {
      type: opts.type,
      dedupKey,
      shipmentMode: opts.shipmentMode,
      shipmentId: opts.shipmentId,
      reference,
      awbNumber: opts.awbNumber,
      containerNumber: opts.containerNumber,
      tagsLabel: opts.tagsLabel,
      oldStatus: opts.oldStatus,
      newStatus: opts.newStatus,
      clientEmail: clientUser?.email,
      clientUsername: clientUser?.username,
      clientNombre: clientUser?.nombreuser,
    };

    if (clientUser?.email) {
      const isNew = await upsertNotification({
        ...baseDoc,
        audience: "CLIENTE",
        recipientEmail: clientUser.email,
        recipientUsername: clientUser.username,
        payload: {
          route: "/shipsgo",
          shipmentMode: opts.shipmentMode,
          shipmentId: opts.shipmentId,
          tagsLabel: opts.tagsLabel,
        },
      });

      // Solo push en la primera emisión (evita doble push webhook+cron)
      if (isNew) {
        await sendTrackingPushToClient({
          email: clientUser.email,
          mobilePushEnabled: clientUser.mobilePushEnabled,
          type: opts.type,
          shipmentMode: opts.shipmentMode,
          shipmentId: opts.shipmentId,
          awbNumber: opts.awbNumber,
          containerNumber: opts.containerNumber,
          bookingNumber: opts.bookingNumber,
          tagsLabel: opts.tagsLabel,
          reference,
          oldStatus: opts.oldStatus,
          newStatus: opts.newStatus,
        });
      }
    }

    if (clientUser?.ejecutivoId) {
      const ej = clientUser.ejecutivoId as any;
      const ejecutivoEmail = ej?.email
        ? String(ej.email).toLowerCase().trim()
        : null;
      if (ejecutivoEmail) {
        await upsertNotification({
          ...baseDoc,
          audience: "EJECUTIVO",
          recipientEmail: ejecutivoEmail,
          payload: {
            route: "/admin/home",
            openModal: "all-trackings",
            modalTab: opts.shipmentMode === "AIR" ? "air" : "ocean",
          },
        });
      }
    }

    const opsExecs = await Ejecutivo.find(
      { activo: true, "roles.operaciones": true },
      { email: 1 },
    ).lean();
    for (const opEj of opsExecs) {
      const email = (opEj as any)?.email
        ? String((opEj as any).email).toLowerCase().trim()
        : null;
      if (!email) continue;
      await upsertNotification({
        ...baseDoc,
        audience: "OPERACIONES",
        recipientEmail: email,
        payload: {
          route: "/admin/home",
          openModal: "all-shipments",
          modalTab: opts.shipmentMode === "AIR" ? "air" : "ocean",
        },
      });
    }
  } catch (err) {
    console.error("[shipsgo-status] fanOut failed:", err);
  }
}

/**
 * Detecta transición de estado/demora, notifica (campanita + push) y
 * actualiza el snapshot. Seguro para webhook y cron (dedupe por snapshot +
 * dedupKey de PortalNotification).
 */
export async function processShipsgoShipmentStatus(
  mode: ShipsgoShipmentMode,
  s: any,
): Promise<{
  shipmentId: string;
  statusChanged: boolean;
  delayedNotified: boolean;
} | null> {
  const shipmentIdHint = String(s?.id ?? "").trim();
  if (!shipmentIdHint) return null;

  const ShipmentStateSnapshot = getShipmentStateSnapshotModel();
  const snapshot = (await ShipmentStateSnapshot.findOne({
    mode,
    shipmentId: shipmentIdHint,
  }).lean()) as any | null;

  const transition = evaluateShipmentTransition(mode, s, snapshot);
  if (!transition) return null;

  const {
    shipmentId,
    status,
    reference,
    tagsLabel,
    isDelayed,
    updatedAtIso,
    oldStatus,
    shouldNotifyStatusChange,
    shouldNotifyDelay,
    awbNumber,
    containerNumber,
    bookingNumber,
  } = transition;

  if (shouldNotifyStatusChange) {
    await fanOut({
      type: "TRACKING_STATUS_CHANGED",
      shipmentMode: mode,
      shipmentId,
      reference,
      awbNumber,
      containerNumber,
      bookingNumber,
      tagsLabel,
      oldStatus,
      newStatus: status,
    });
  }

  if (shouldNotifyDelay) {
    await fanOut({
      type: "TRACKING_DELAYED",
      shipmentMode: mode,
      shipmentId,
      reference,
      awbNumber,
      containerNumber,
      bookingNumber,
      tagsLabel,
      newStatus: status,
    });
  }

  await ShipmentStateSnapshot.updateOne(
    { mode, shipmentId },
    {
      $set: {
        mode,
        shipmentId,
        reference,
        status,
        isDelayed,
        updatedAtIso,
        lastSeenAt: new Date(),
      },
    },
    { upsert: true },
  );

  return {
    shipmentId,
    statusChanged: shouldNotifyStatusChange,
    delayedNotified: shouldNotifyDelay,
  };
}

/**
 * Procesa un payload de webhook ShipsGo (`{ event, shipment }`).
 */
export async function processShipsgoWebhookPayload(
  mode: ShipsgoShipmentMode,
  payload: any,
): Promise<{
  eventName: string;
  result: Awaited<ReturnType<typeof processShipsgoShipmentStatus>>;
}> {
  const eventName = String(payload?.event?.name || "UNKNOWN");
  const shipment = payload?.shipment;
  if (!shipment || typeof shipment !== "object") {
    return { eventName, result: null };
  }
  const result = await processShipsgoShipmentStatus(mode, shipment);
  return { eventName, result };
}

/**
 * Guardrail: si User ya está registrado (api/server), debe tener passwordHash.
 * Exportado para tests de regresión del bug Chile/México.
 */
export function assertShipsgoUserModelSafeForLogin(): {
  ok: boolean;
  reason?: string;
} {
  if (!mongoose.models.User) {
    return { ok: true };
  }
  if (!mongoose.models.User.schema.paths.passwordHash) {
    return {
      ok: false,
      reason:
        "mongoose.models.User existe sin passwordHash (login Chile roto)",
    };
  }
  return { ok: true };
}
