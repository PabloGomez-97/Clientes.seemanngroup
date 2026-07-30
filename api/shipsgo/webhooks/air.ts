/**
 * ShipsGo Air webhook — body crudo para HMAC + notificación instantánea.
 * Ruta dedicada (prioridad sobre rewrite a api/index) con bodyParser: false.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import mongoose from "mongoose";
import {
  getShipsgoWebhookRawBody,
  parseShipsgoWebhookJson,
  verifyShipsgoWebhookSignature,
} from "../../../lib/shipsgo-webhook-auth.js";
import { processShipsgoWebhookPayload } from "../../../lib/shipsgo-status-notifications.js";

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 60,
};

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

let cachedDb: typeof mongoose | null = null;
async function connectDB() {
  if (cachedDb && mongoose.connection.readyState === 1) return cachedDb;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  cachedDb = await mongoose.connect(uri, { bufferCommands: false });
  return cachedDb;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("🔔 [shipsgo-webhook] Received air webhook event");
  try {
    const rawBuf = await readRawBody(req);
    const rawBody = getShipsgoWebhookRawBody(rawBuf);
    const signature = req.headers["x-shipsgo-webhook-signature"];
    const webhookId = req.headers["x-shipsgo-webhook-id"];
    const webhookName = req.headers["x-shipsgo-webhook-name"];

    const auth = verifyShipsgoWebhookSignature({
      secret: process.env.SHIPSGO_WEBHOOK_SECRET,
      signature: typeof signature === "string" ? signature : undefined,
      rawBody,
    });
    if (!auth.ok) {
      console.error("[shipsgo-webhook] Auth failed:", auth.error);
      return res.status(401).json({ error: auth.error });
    }

    await connectDB();

    const payload = parseShipsgoWebhookJson(rawBody || "{}");
    const payloadShipmentId = (payload as any)?.shipment?.id;
    const { eventName, result } = await processShipsgoWebhookPayload(
      "AIR",
      payload,
    );

    console.log(
      `[shipsgo-webhook] Event: ${eventName}, Webhook-Id: ${webhookId}, Webhook-Name: ${webhookName}, Shipment: ${payloadShipmentId}, statusChanged=${!!result?.statusChanged}, delayed=${!!result?.delayedNotified}`,
    );

    return res.status(200).json({
      received: true,
      event: eventName,
      statusChanged: !!result?.statusChanged,
      delayedNotified: !!result?.delayedNotified,
    });
  } catch (error) {
    console.error("[shipsgo-webhook] Error processing webhook:", error);
    return res.status(200).json({ received: true, error: "Processing error" });
  }
}
