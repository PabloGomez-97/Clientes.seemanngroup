// api/cron/shipsgo-status-watch.ts
// Vercel Cron Job: polls ShipsGo (air + ocean) as backup for webhooks.
// Instant path: POST /api/shipsgo/webhooks/{air|ocean}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import mongoose from "mongoose";
import { processShipsgoShipmentStatus } from "../../lib/shipsgo-status-notifications.js";

export const config = {
  maxDuration: 300,
};

let cachedDb: typeof mongoose | null = null;
async function connectDB() {
  if (cachedDb) return cachedDb;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  cachedDb = await mongoose.connect(uri, { bufferCommands: false });
  return cachedDb;
}

async function fetchShipsgo(url: string): Promise<any[]> {
  const token = process.env.SHIPSGO_API_TOKEN;
  if (!token) {
    console.warn("[shipsgo-cron] Missing SHIPSGO_API_TOKEN");
    return [];
  }
  const res = await fetch(url, {
    method: "GET",
    headers: { "X-Shipsgo-User-Token": token },
  });
  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    console.error("[shipsgo-cron] Fetch failed", url, res.status, errorBody);
    return [];
  }
  const data = (await res.json()) as { shipments?: any[] };
  return Array.isArray(data?.shipments) ? data.shipments : [];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  try {
    await connectDB();

    const airShipments = await fetchShipsgo(
      "https://api.shipsgo.com/v2/air/shipments?order_by=updated_at,desc&skip=0&take=100",
    );
    const oceanShipments = await fetchShipsgo(
      "https://api.shipsgo.com/v2/ocean/shipments?order_by=updated_at,desc&skip=0&take=100",
    );

    let airCount = 0;
    let oceanCount = 0;
    let statusChanges = 0;
    let delays = 0;

    for (const s of airShipments) {
      const result = await processShipsgoShipmentStatus("AIR", s);
      airCount++;
      if (result?.statusChanged) statusChanges++;
      if (result?.delayedNotified) delays++;
    }
    for (const s of oceanShipments) {
      const result = await processShipsgoShipmentStatus("OCEAN", s);
      oceanCount++;
      if (result?.statusChanged) statusChanges++;
      if (result?.delayedNotified) delays++;
    }

    return res.status(200).json({
      success: true,
      processed: { air: airCount, ocean: oceanCount },
      emitted: { statusChanges, delays },
    });
  } catch (err: any) {
    console.error("[shipsgo-cron] Fatal error:", err);
    return res
      .status(500)
      .json({ error: "Internal error", details: err?.message });
  }
}
