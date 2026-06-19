/**
 * Lógica unificada de envío de alertas de pricing (cron, manual, test).
 */

import mongoose from 'mongoose';
import {
  fetchAllExpiring,
  filterExactWindow,
  filterMaxWindow,
} from './pricingExpiryService.js';
import {
  buildAirExpiryAlertHTML,
  buildAirExpiryAlertSubject,
  buildFCLExpiryAlertHTML,
  buildFCLExpiryAlertSubject,
  buildLCLExpiryAlertHTML,
  buildLCLExpiryAlertSubject,
  type AlertType,
  type TarifaAereaExpiringData,
  type TarifaFCLExpiringData,
  type TarifaLCLExpiringData,
} from '../emails/pricingAlertEmailTemplate.js';

// ─── Models ───────────────────────────────────────────────────

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

const PricingAlertRunSchema = new mongoose.Schema(
  {
    source: { type: String, enum: ['cron', 'manual', 'test'], required: true },
    triggeredByEmail: { type: String, default: null },
    alertType: { type: String, default: null },
    recipients: { type: [String], default: [] },
    sent: {
      type: [
        {
          type: String,
          alertType: String,
          recipients: Number,
          count: Number,
        },
      ],
      default: [],
    },
    skipped: { type: [String], default: [] },
    errorMessages: { type: [String], default: [] },
    totals: {
      air: { type: Number, default: 0 },
      fcl: { type: Number, default: 0 },
      lcl: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

PricingAlertRunSchema.index({ createdAt: -1 });

const PricingAlertRun =
  (mongoose.models.PricingAlertRun as mongoose.Model<any>) ||
  mongoose.model('PricingAlertRun', PricingAlertRunSchema);

// ─── Types ────────────────────────────────────────────────────

export type TariffKind = 'air' | 'fcl' | 'lcl';
export type AlertMode = 'cron' | 'manual' | 'test';

export interface RunPricingAlertsOptions {
  mode?: AlertMode;
  alertType?: '48hrs' | '24hrs';
  tariffType?: TariffKind | 'all';
  extraEmails?: string[];
  onlyExtraEmails?: boolean;
  testRecipientEmail?: string;
  triggeredByEmail?: string;
  /** If true, skip persisting run log and webhook (for preview). */
  dryRun?: boolean;
}

export interface SentEntry {
  type: string;
  alertType: AlertType;
  recipients: number;
  count: number;
}

export interface RunPricingAlertsResult {
  mode: AlertMode;
  alertType?: '48hrs' | '24hrs';
  recipients: string[];
  sent: SentEntry[];
  skipped: string[];
  errors: string[];
  totals: { air: number; fcl: number; lcl: number };
  partialFailure: boolean;
  success: boolean;
  message: string;
}

const BREVO_SENDER = { name: 'Seemann Cloud · Pricing', email: 'noreply@sphereglobal.io' };

const CRON_BUCKETS: { days: 0 | 1 | 2; alertType: AlertType }[] = [
  { days: 2, alertType: '48hrs' },
  { days: 1, alertType: '24hrs' },
  { days: 0, alertType: 'today' },
];

type TariffRates =
  | TarifaAereaExpiringData[]
  | TarifaFCLExpiringData[]
  | TarifaLCLExpiringData[];

type ExpiringRow = { daysUntilExpiry?: number };

// ─── Brevo ────────────────────────────────────────────────────

export async function sendBrevoEmail(
  toList: { email: string; name?: string }[],
  subject: string,
  htmlContent: string,
): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY no configurado');
  if (toList.length === 0) return;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender: BREVO_SENDER, to: toList, subject, htmlContent }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error Brevo: ${err}`);
  }
  console.log(`[pricing-alerts] Email enviado → ${toList.map((r) => r.email).join(', ')}`);
}

// ─── Recipients ───────────────────────────────────────────────

export async function getPricingRecipients(
  extraEmails?: string[],
  onlyExtra?: boolean,
): Promise<{ email: string; name?: string }[]> {
  let recipients: { email: string; name?: string }[] = [];

  if (!onlyExtra) {
    const pricingUsers = await Ejecutivo.find({ activo: true, 'roles.pricing': true })
      .select('email nombre')
      .lean<{ email: string; nombre?: string }[]>();

    recipients = pricingUsers
      .filter((u) => u.email)
      .map((u) => ({ email: String(u.email).toLowerCase().trim(), name: u.nombre || undefined }));
  }

  if (extraEmails?.length) {
    for (const em of extraEmails) {
      const clean = String(em).toLowerCase().trim();
      if (clean && !recipients.some((r) => r.email === clean)) {
        recipients.push({ email: clean });
      }
    }
  }

  return recipients;
}

// ─── Send helpers ─────────────────────────────────────────────

function buildEmail(
  type: TariffKind,
  rates: TariffRates,
  alertType: AlertType,
): { subject: string; html: string } {
  if (type === 'air') {
    const r = rates as TarifaAereaExpiringData[];
    return {
      subject: buildAirExpiryAlertSubject(alertType, r.length),
      html: buildAirExpiryAlertHTML(r, alertType),
    };
  }
  if (type === 'fcl') {
    const r = rates as TarifaFCLExpiringData[];
    return {
      subject: buildFCLExpiryAlertSubject(alertType, r.length),
      html: buildFCLExpiryAlertHTML(r, alertType),
    };
  }
  const r = rates as TarifaLCLExpiringData[];
  return {
    subject: buildLCLExpiryAlertSubject(alertType, r.length),
    html: buildLCLExpiryAlertHTML(r, alertType),
  };
}

async function sendTariffEmail(
  type: TariffKind,
  rates: TariffRates,
  alertType: AlertType,
  recipients: { email: string; name?: string }[],
  dryRun: boolean,
): Promise<SentEntry | null> {
  if (rates.length === 0) return null;
  const { subject, html } = buildEmail(type, rates, alertType);
  if (!dryRun) {
    await sendBrevoEmail(recipients, subject, html);
  }
  return {
    type: type.toUpperCase(),
    alertType,
    recipients: recipients.length,
    count: rates.length,
  };
}

// ─── Cron bucket sends ────────────────────────────────────────

async function runCronAlerts(
  recipients: { email: string; name?: string }[],
  dryRun: boolean,
): Promise<{ sent: SentEntry[]; skipped: string[]; errors: string[]; totals: { air: number; fcl: number; lcl: number } }> {
  const sent: SentEntry[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];
  const totals = { air: 0, fcl: 0, lcl: 0 };

  let all: Awaited<ReturnType<typeof fetchAllExpiring>>;
  try {
    all = await fetchAllExpiring(2);
  } catch (err: any) {
    errors.push(`Error al obtener hojas: ${err.message}`);
    return { sent, skipped, errors, totals };
  }

  totals.air = all.air.length;
  totals.fcl = all.fcl.length;
  totals.lcl = all.lcl.length;

  const types: TariffKind[] = ['air', 'fcl', 'lcl'];
  const ratesMap = { air: all.air, fcl: all.fcl, lcl: all.lcl };

  for (const bucket of CRON_BUCKETS) {
    const bucketSent: SentEntry[] = [];

    for (const type of types) {
      const filtered = filterExactWindow(
        ratesMap[type] as ExpiringRow[],
        bucket.days,
      ) as TariffRates;
      if (filtered.length === 0) continue;

      try {
        const entry = await sendTariffEmail(type, filtered, bucket.alertType, recipients, dryRun);
        if (entry) bucketSent.push(entry);
      } catch (err: any) {
        errors.push(`Error ${type.toUpperCase()} (${bucket.alertType}): ${err.message}`);
      }
    }

    if (bucketSent.length === 0) {
      skipped.push(`Sin tarifas en bucket ${bucket.days} día(s)`);
    } else {
      sent.push(...bucketSent);
    }
  }

  if (sent.length === 0 && errors.length === 0) {
    skipped.push('No hay tarifas por vencer en ventanas 48h / 24h / hoy');
  }

  return { sent, skipped, errors, totals };
}

// ─── Manual / test sends ──────────────────────────────────────

async function runManualAlerts(
  opts: RunPricingAlertsOptions,
  recipients: { email: string; name?: string }[],
  dryRun: boolean,
): Promise<{ sent: SentEntry[]; skipped: string[]; errors: string[]; totals: { air: number; fcl: number; lcl: number } }> {
  const alertType: '48hrs' | '24hrs' = opts.alertType === '24hrs' ? '24hrs' : '48hrs';
  const windowDays = alertType === '24hrs' ? 1 : 2;
  const tariffType = opts.tariffType || 'air';

  const sent: SentEntry[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];
  const totals = { air: 0, fcl: 0, lcl: 0 };

  let all: Awaited<ReturnType<typeof fetchAllExpiring>>;
  try {
    all = await fetchAllExpiring(windowDays);
  } catch (err: any) {
    errors.push(`Error al obtener hojas: ${err.message}`);
    return { sent, skipped, errors, totals };
  }

  totals.air = filterMaxWindow(all.air, windowDays).length;
  totals.fcl = filterMaxWindow(all.fcl, windowDays).length;
  totals.lcl = filterMaxWindow(all.lcl, windowDays).length;

  const types: TariffKind[] =
    tariffType === 'all' ? ['air', 'fcl', 'lcl'] : [tariffType];

  for (const type of types) {
    const filtered = filterMaxWindow(
      ratesMapFromAll(all, type) as ExpiringRow[],
      windowDays,
    ) as TariffRates;
    if (filtered.length === 0) {
      skipped.push(`No hay tarifas ${type.toUpperCase()} en ventana ${alertType}`);
      continue;
    }
    try {
      const entry = await sendTariffEmail(type, filtered, alertType, recipients, dryRun);
      if (entry) sent.push(entry);
    } catch (err: any) {
      errors.push(`Error enviando ${type.toUpperCase()}: ${err.message}`);
    }
  }

  return { sent, skipped, errors, totals };
}

function ratesMapFromAll(
  all: Awaited<ReturnType<typeof fetchAllExpiring>>,
  type: TariffKind,
): TariffRates {
  if (type === 'air') return all.air;
  if (type === 'fcl') return all.fcl;
  return all.lcl;
}

// ─── Webhook ──────────────────────────────────────────────────

export async function sendPricingWebhook(
  result: RunPricingAlertsResult,
): Promise<void> {
  const url = process.env.PRICING_ALERTS_WEBHOOK_URL;
  if (!url) return;

  const parts = result.sent.map((s) => `${s.count} ${s.type} (${s.alertType})`);
  const text =
    parts.length > 0
      ? `Pricing alerts: ${parts.join(', ')} → ${result.recipients.length} destinatario(s)`
      : `Pricing alerts: sin tarifas por vencer. ${result.skipped[0] || ''}`;

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    console.error('[pricing-alerts] Webhook error:', err);
  }
}

// ─── Persist run ──────────────────────────────────────────────

export async function savePricingAlertRun(
  result: RunPricingAlertsResult,
  source: AlertMode,
  triggeredByEmail?: string,
): Promise<void> {
  try {
    await PricingAlertRun.create({
      source,
      triggeredByEmail: triggeredByEmail || null,
      alertType: result.alertType || null,
      recipients: result.recipients,
      sent: result.sent,
      skipped: result.skipped,
      errorMessages: result.errors,
      totals: result.totals,
    });
  } catch (err) {
    console.error('[pricing-alerts] Error guardando run:', err);
  }
}

export async function getLastPricingAlertRun() {
  const doc = await PricingAlertRun.findOne().sort({ createdAt: -1 }).lean();
  if (!doc) return null;

  const { errorMessages, errors: legacyErrors, ...rest } = doc as typeof doc & {
    errorMessages?: string[];
    errors?: string[];
  };

  return {
    ...rest,
    errors: Array.isArray(errorMessages)
      ? errorMessages
      : Array.isArray(legacyErrors)
        ? legacyErrors
        : [],
  };
}

export function getNextCronRunUtc(): Date {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
  if (now >= next) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

// ─── Main entry ───────────────────────────────────────────────

export async function runPricingAlerts(
  opts: RunPricingAlertsOptions = {},
): Promise<RunPricingAlertsResult> {
  const mode: AlertMode = opts.mode || 'cron';
  const dryRun = opts.dryRun === true;

  const result: RunPricingAlertsResult = {
    mode,
    alertType: opts.alertType,
    recipients: [],
    sent: [],
    skipped: [],
    errors: [],
    totals: { air: 0, fcl: 0, lcl: 0 },
    partialFailure: false,
    success: true,
    message: '',
  };

  let recipients: { email: string; name?: string }[] = [];

  if (mode === 'test' && opts.testRecipientEmail) {
    recipients = [{ email: opts.testRecipientEmail.toLowerCase().trim() }];
  } else {
    try {
      recipients = await getPricingRecipients(opts.extraEmails, opts.onlyExtraEmails);
    } catch (err: any) {
      result.errors.push(`Error al obtener destinatarios: ${err.message}`);
      result.success = false;
      result.message = result.errors[0];
      return result;
    }
  }

  if (recipients.length === 0) {
    const msg = 'No hay destinatarios. Verifica ejecutivos activos con roles.pricing = true.';
    result.skipped.push(msg);
    result.success = false;
    result.message = msg;
    return result;
  }

  result.recipients = recipients.map((r) => r.email);

  const runResult =
    mode === 'cron'
      ? await runCronAlerts(recipients, dryRun)
      : await runManualAlerts(opts, recipients, dryRun);

  result.sent = runResult.sent;
  result.skipped = runResult.skipped;
  result.errors = runResult.errors;
  result.totals = runResult.totals;

  result.partialFailure = result.errors.length > 0 && result.sent.length > 0;

  if (result.partialFailure) {
    result.success = true;
    result.message = 'Alertas enviadas con errores parciales.';
  } else if (result.errors.length > 0 && result.sent.length === 0) {
    result.success = false;
    result.message = result.errors.join('; ');
  } else if (result.sent.length === 0) {
    result.success = true;
    result.message = 'No hay tarifas que venzan en la ventana seleccionada. No se enviaron correos.';
  } else {
    result.message = dryRun ? 'Vista previa generada.' : 'Alertas enviadas correctamente.';
  }

  if (!dryRun) {
    await savePricingAlertRun(result, mode, opts.triggeredByEmail);
    if (mode === 'cron') await sendPricingWebhook(result);
  }

  return result;
}

// ─── Preview HTML ─────────────────────────────────────────────

export async function buildAlertPreview(
  alertType: '48hrs' | '24hrs',
  tariffType: TariffKind,
): Promise<{ html: string; subject: string; count: number } | null> {
  const windowDays = alertType === '24hrs' ? 1 : 2;
  const { air, fcl, lcl } = await fetchAllExpiring(windowDays);
  const rates = ratesMapFromAll({ air, fcl, lcl }, tariffType);
  const filtered = filterMaxWindow(rates as ExpiringRow[], windowDays) as TariffRates;
  if (filtered.length === 0) return null;
  const { subject, html } = buildEmail(tariffType, filtered, alertType);
  return { html, subject, count: filtered.length };
}

// ─── Bucket counts for status panel ───────────────────────────

export async function getExpiryBucketCounts(): Promise<{
  bucket48: number;
  bucket24: number;
  bucketToday: number;
  totals: { air: number; fcl: number; lcl: number; all: number };
}> {
  const { air, fcl, lcl } = await fetchAllExpiring(2);
  const all = [...air, ...fcl, ...lcl];
  return {
    bucket48: all.filter((r) => r.daysUntilExpiry === 2).length,
    bucket24: all.filter((r) => r.daysUntilExpiry === 1).length,
    bucketToday: all.filter((r) => r.daysUntilExpiry === 0).length,
    totals: { air: air.length, fcl: fcl.length, lcl: lcl.length, all: all.length },
  };
}
