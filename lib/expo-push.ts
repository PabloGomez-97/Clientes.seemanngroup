import mongoose from "mongoose";

export type TrackingPushType =
  | "TRACKING_CREATED"
  | "TRACKING_STATUS_CHANGED"
  | "TRACKING_DELAYED";

type DevicePushTokenDoc = {
  email: string;
  token: string;
  platform?: string;
  enabled: boolean;
  updatedAt?: Date;
};

const DevicePushTokenSchema = new mongoose.Schema<DevicePushTokenDoc>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    token: { type: String, required: true, unique: true },
    platform: { type: String, trim: true },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export function getDevicePushTokenModel() {
  return (
    (mongoose.models.DevicePushToken as mongoose.Model<DevicePushTokenDoc>) ||
    mongoose.model<DevicePushTokenDoc>("DevicePushToken", DevicePushTokenSchema)
  );
}

function statusLabel(status?: string): string {
  if (!status) return "actualizado";
  const map: Record<string, string> = {
    REGISTERED: "Registrado",
    BOOKED: "Reservado",
    RECEIVED: "Recibido",
    DEPARTED: "Zarpe / salida",
    IN_TRANSIT: "En tránsito",
    EN_ROUTE: "En ruta",
    ARRIVED: "Llegada",
    LANDED: "Aterrizaje",
    DELIVERED: "Entregado",
    DISCHARGED: "Descargado",
    SAILING: "Navegando",
    TRANSSHIPMENT: "Escala / transbordo",
  };
  return map[status] || status.replace(/_/g, " ");
}

/** Une tags ShipsGo (`string` o `{ name }`) para mostrar en notificaciones. */
export function formatTrackingTagsLabel(tags: unknown): string | undefined {
  if (!Array.isArray(tags) || tags.length === 0) return undefined;

  const names: string[] = [];
  for (const item of tags) {
    if (typeof item === "string") {
      const value = item.trim();
      if (value) names.push(value);
      continue;
    }
    if (item && typeof item === "object" && "name" in item) {
      const value = String((item as { name?: unknown }).name ?? "").trim();
      if (value) names.push(value);
    }
  }

  if (names.length === 0) return undefined;
  return names.join(" · ");
}

/**
 * Prefiere Ref. Cliente / Etiquetas; si no hay, AWB (aéreo) o contenedor
 * (marítimo), luego fallbacks existentes.
 */
export function resolveTrackingPushRef(opts: {
  shipmentMode: "AIR" | "OCEAN";
  tagsLabel?: string | null;
  awbNumber?: string | null;
  containerNumber?: string | null;
  bookingNumber?: string | null;
  reference?: string | null;
  shipmentId?: string | null;
}): string {
  const tagsLabel = String(opts.tagsLabel || "").trim();
  if (tagsLabel) return tagsLabel;

  if (opts.shipmentMode === "AIR") {
    return (
      String(opts.awbNumber || "").trim() ||
      String(opts.reference || "").trim() ||
      String(opts.shipmentId || "").trim()
    );
  }

  return (
    String(opts.containerNumber || "").trim() ||
    String(opts.bookingNumber || "").trim() ||
    String(opts.reference || "").trim() ||
    String(opts.shipmentId || "").trim()
  );
}

export function buildTrackingPushMessage(opts: {
  type: TrackingPushType;
  shipmentMode: "AIR" | "OCEAN";
  awbNumber?: string;
  containerNumber?: string;
  bookingNumber?: string;
  tagsLabel?: string;
  reference?: string;
  oldStatus?: string;
  newStatus?: string;
  shipmentId: string;
}): { title: string; body: string; data: Record<string, string> } {
  const mode = opts.shipmentMode === "AIR" ? "Aéreo" : "Marítimo";
  const ref = resolveTrackingPushRef(opts);

  const data = {
    type: opts.type,
    shipmentMode: opts.shipmentMode,
    shipmentId: opts.shipmentId,
    screen: "Trackeos",
  };

  if (opts.type === "TRACKING_DELAYED") {
    return {
      title: `Seguimiento demorado · ${mode}`,
      body: `${ref}: tu embarque presenta demora.`,
      data,
    };
  }

  if (opts.type === "TRACKING_CREATED") {
    return {
      title: `Nuevo seguimiento · ${mode}`,
      body: `${ref} quedó registrado en tus seguimientos.`,
      data,
    };
  }

  return {
    title: `Cambio en seguimiento · ${mode}`,
    body: `${ref}: ${statusLabel(opts.oldStatus)} → ${statusLabel(opts.newStatus)}`,
    data,
  };
}

export async function sendTrackingPushToClient(opts: {
  email?: string | null;
  mobilePushEnabled?: boolean | null;
  type: TrackingPushType;
  shipmentMode: "AIR" | "OCEAN";
  shipmentId: string;
  awbNumber?: string;
  containerNumber?: string;
  bookingNumber?: string;
  tagsLabel?: string;
  reference?: string;
  oldStatus?: string;
  newStatus?: string;
}): Promise<void> {
  try {
    const email = String(opts.email || "")
      .toLowerCase()
      .trim();
    if (!email) return;
    if (opts.mobilePushEnabled === false) return;

    const DevicePushToken = getDevicePushTokenModel();
    const devices = await DevicePushToken.find({
      email,
      enabled: true,
    })
      .select("token")
      .lean();

    if (!devices.length) return;

    const message = buildTrackingPushMessage(opts);
    const tokens = devices
      .map((d) => d.token)
      .filter((t) => typeof t === "string" && t.startsWith("ExponentPushToken"));

    if (!tokens.length) return;

    const chunks: string[][] = [];
    for (let i = 0; i < tokens.length; i += 100) {
      chunks.push(tokens.slice(i, i + 100));
    }

    for (const chunk of chunks) {
      const payload = chunk.map((to) => ({
        to,
        sound: "default" as const,
        title: message.title,
        body: message.body,
        data: message.data,
        channelId: "seguimientos",
      }));

      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("[expo-push] send failed:", res.status, text);
        continue;
      }

      const result = (await res.json().catch(() => null)) as {
        data?: Array<{ status?: string; details?: { error?: string } }>;
      } | null;

      const tickets = Array.isArray(result?.data) ? result!.data! : [];
      for (let i = 0; i < tickets.length; i += 1) {
        const ticket = tickets[i];
        if (
          ticket?.status === "error" &&
          (ticket.details?.error === "DeviceNotRegistered" ||
            ticket.details?.error === "InvalidCredentials")
        ) {
          const badToken = chunk[i];
          if (badToken) {
            await DevicePushToken.deleteOne({ token: badToken }).catch(
              () => undefined,
            );
          }
        }
      }
    }
  } catch (err) {
    console.error("[expo-push] unexpected error:", err);
  }
}
