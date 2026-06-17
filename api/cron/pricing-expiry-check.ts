// api/cron/pricing-expiry-check.ts
// Vercel Cron Job: verifica tarifas próximas a vencer y envía alertas por email.
// Corre una vez al día (vercel.json: 0 12 * * * UTC).
// Por bucket de urgencia (48h / 24h / hoy) envía un correo por tipo de tarifa con tarifas.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';
import { runPricingAlerts } from '../services/pricingAlertSender.js';

export const config = {
  maxDuration: 300,
};

let cachedDb: typeof mongoose | null = null;

async function connectDB() {
  if (cachedDb) return cachedDb;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  cachedDb = await mongoose.connect(uri, { bufferCommands: false });
  return cachedDb;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const isVercelCron = String(req.headers['user-agent'] || '').startsWith('vercel-cron/');

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'POST') {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
  } else if (!isVercelCron) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  console.log('[pricing-cron] Iniciando verificación de tarifas por vencer...');

  try {
    await connectDB();
    const result = await runPricingAlerts({ mode: 'cron' });

    console.log('[pricing-cron] Completado:', JSON.stringify(result));
    const status = result.success ? 200 : result.partialFailure ? 207 : 500;
    return res.status(status).json({ success: result.success, ...result });
  } catch (err: any) {
    console.error('[pricing-cron] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
