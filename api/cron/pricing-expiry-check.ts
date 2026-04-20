// api/cron/pricing-expiry-check.ts
// Vercel Cron Job: verifica tarifas próximas a vencer y envía alertas por email.
// Corre una vez al día (configurado en vercel.json).
// Por cada ventana de tiempo (48hrs y 24hrs) envía un email consolidado por tipo de tarifa.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';
import {
  fetchAllExpiring,
  filterExactWindow,
} from '../services/pricingExpiryService.js';
import {
  buildAirExpiryAlertHTML,
  buildAirExpiryAlertSubject,
  buildFCLExpiryAlertHTML,
  buildFCLExpiryAlertSubject,
  buildLCLExpiryAlertHTML,
  buildLCLExpiryAlertSubject,
  type AlertType,
} from '../emails/pricingAlertEmailTemplate.js';

export const config = {
  maxDuration: 300,
};

// ─── Mongoose schema (minimal, matches api/index.ts) ─────────

const EjecutivoSchema = new mongoose.Schema({
  nombre: String,
  email: String,
  activo: Boolean,
  roles: {
    administrador: Boolean,
    pricing: Boolean,
    ejecutivo: Boolean,
    proveedor: Boolean,
    operaciones: Boolean,
  },
});

const Ejecutivo =
  (mongoose.models.Ejecutivo as mongoose.Model<any>) ||
  mongoose.model('Ejecutivo', EjecutivoSchema);

let cachedDb: typeof mongoose | null = null;

async function connectDB() {
  if (cachedDb) return cachedDb;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  cachedDb = await mongoose.connect(uri, { bufferCommands: false });
  return cachedDb;
}

// ─── Brevo sender ─────────────────────────────────────────────

const BREVO_SENDER = { name: 'Seemann Cloud · Pricing', email: 'noreply@sphereglobal.io' };

async function sendBrevoEmail(
  toList: { email: string; name?: string }[],
  subject: string,
  htmlContent: string,
): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('[pricing-cron] BREVO_API_KEY no configurado');
    return;
  }
  if (toList.length === 0) return;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender: BREVO_SENDER, to: toList, subject, htmlContent }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[pricing-cron] Error Brevo:', err);
  } else {
    console.log(`[pricing-cron] Email enviado → ${toList.map((r) => r.email).join(', ')}`);
  }
}

// ─── Core send logic (reusable from endpoint) ─────────────────

interface SendAlertsOptions {
  /** alertType: '48hrs' | '24hrs'. Both are processed when this function is called for the cron. */
  alertType?: AlertType | 'both';
  /** Override recipient list (replaces pricing users). Use for manual test sends. */
  extraEmails?: string[];
  /** If true, sends only to extraEmails and not to pricing users. */
  onlyExtraEmails?: boolean;
}

interface SendAlertsResult {
  sent: { type: string; alertType: AlertType; recipients: number; count: number }[];
  skipped: string[];
  errors: string[];
}

export async function runPricingAlerts(opts: SendAlertsOptions = {}): Promise<SendAlertsResult> {
  const result: SendAlertsResult = { sent: [], skipped: [], errors: [] };
  const alertTypes: AlertType[] =
    opts.alertType === 'both' || !opts.alertType ? ['48hrs', '24hrs'] : [opts.alertType];

  // Fetch all sheets (up to 2 days ahead is enough for cron; a bit more for flexibility)
  let all: Awaited<ReturnType<typeof fetchAllExpiring>>;
  try {
    all = await fetchAllExpiring(2);
  } catch (err: any) {
    result.errors.push(`Error al obtener hojas: ${err.message}`);
    return result;
  }

  // Determine recipients
  let recipients: { email: string; name?: string }[] = [];

  if (!opts.onlyExtraEmails) {
    try {
      const pricingUsers = await Ejecutivo.find({ activo: true, 'roles.pricing': true })
        .select('email nombre')
        .lean<{ email: string; nombre?: string }[]>();

      recipients = pricingUsers
        .filter((u) => u.email)
        .map((u) => ({ email: String(u.email).toLowerCase().trim(), name: u.nombre || undefined }));
    } catch (err: any) {
      result.errors.push(`Error al obtener usuarios pricing: ${err.message}`);
    }
  }

  // Add extra emails
  if (opts.extraEmails && opts.extraEmails.length > 0) {
    for (const em of opts.extraEmails) {
      const clean = String(em).toLowerCase().trim();
      if (clean && !recipients.some((r) => r.email === clean)) {
        recipients.push({ email: clean });
      }
    }
  }

  if (recipients.length === 0) {
    result.skipped.push('No hay destinatarios pricing activos');
    return result;
  }

  // Send emails for each alert type and each sheet
  for (const alertType of alertTypes) {
    const windowDays: 1 | 2 = alertType === '24hrs' ? 1 : 2;

    const airFiltered = filterExactWindow(all.air, windowDays);
    const fclFiltered = filterExactWindow(all.fcl, windowDays);
    const lclFiltered = filterExactWindow(all.lcl, windowDays);

    if (airFiltered.length > 0) {
      try {
        await sendBrevoEmail(
          recipients,
          buildAirExpiryAlertSubject(alertType, airFiltered.length),
          buildAirExpiryAlertHTML(airFiltered, alertType),
        );
        result.sent.push({ type: 'AIR', alertType, recipients: recipients.length, count: airFiltered.length });
      } catch (err: any) {
        result.errors.push(`Error enviando alerta AIR ${alertType}: ${err.message}`);
      }
    } else {
      result.skipped.push(`No hay tarifas AIR para ventana ${alertType}`);
    }

    if (fclFiltered.length > 0) {
      try {
        await sendBrevoEmail(
          recipients,
          buildFCLExpiryAlertSubject(alertType, fclFiltered.length),
          buildFCLExpiryAlertHTML(fclFiltered, alertType),
        );
        result.sent.push({ type: 'FCL', alertType, recipients: recipients.length, count: fclFiltered.length });
      } catch (err: any) {
        result.errors.push(`Error enviando alerta FCL ${alertType}: ${err.message}`);
      }
    } else {
      result.skipped.push(`No hay tarifas FCL para ventana ${alertType}`);
    }

    if (lclFiltered.length > 0) {
      try {
        await sendBrevoEmail(
          recipients,
          buildLCLExpiryAlertSubject(alertType, lclFiltered.length),
          buildLCLExpiryAlertHTML(lclFiltered, alertType),
        );
        result.sent.push({ type: 'LCL', alertType, recipients: recipients.length, count: lclFiltered.length });
      } catch (err: any) {
        result.errors.push(`Error enviando alerta LCL ${alertType}: ${err.message}`);
      }
    } else {
      result.skipped.push(`No hay tarifas LCL para ventana ${alertType}`);
    }
  }

  return result;
}

// ─── Vercel handler ───────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const isVercelCron = String(req.headers['user-agent'] || '').startsWith('vercel-cron/');

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth: GET only from Vercel Cron; POST requires Bearer CRON_SECRET
  if (req.method === 'POST') {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
  } else {
    if (!isVercelCron) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
  }

  console.log('[pricing-cron] 🔔 Iniciando verificación de tarifas por vencer...');

  try {
    await connectDB();
    const result = await runPricingAlerts({ alertType: 'both' });

    console.log('[pricing-cron] ✅ Completado:', JSON.stringify(result));
    return res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    console.error('[pricing-cron] ❌ Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
