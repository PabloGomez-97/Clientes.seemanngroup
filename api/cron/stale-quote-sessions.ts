// api/cron/stale-quote-sessions.ts
// Cierra sesiones de cotización in_progress sin actividad > 24h como QUOTE_ABANDONED.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';

export const config = {
  maxDuration: 300,
};

const STALE_MS = 24 * 60 * 60 * 1000;

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, lowercase: true, trim: true },
    username: String,
    nombreuser: String,
    ejecutivoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ejecutivo' },
  },
  { timestamps: true },
);
const User =
  (mongoose.models.User as mongoose.Model<any>) ||
  mongoose.model('User', UserSchema);

const EjecutivoSchema = new mongoose.Schema(
  {
    email: { type: String, lowercase: true, trim: true },
  },
  { timestamps: true },
);
const Ejecutivo =
  (mongoose.models.Ejecutivo as mongoose.Model<any>) ||
  mongoose.model('Ejecutivo', EjecutivoSchema);

const QuoteTrackingEventSchema = new mongoose.Schema({
  clientEmail: { type: String, lowercase: true, trim: true },
  clientUsername: String,
  sessionId: String,
  event: String,
  quoteType: String,
  step: mongoose.Schema.Types.Mixed,
  route: mongoose.Schema.Types.Mixed,
  metadata: mongoose.Schema.Types.Mixed,
  timestamp: Date,
});
const QuoteTrackingEvent =
  (mongoose.models.QuoteTrackingEvent as mongoose.Model<any>) ||
  mongoose.model('QuoteTrackingEvent', QuoteTrackingEventSchema);

const PortalNotificationSchema = new mongoose.Schema(
  {
    audience: String,
    recipientEmail: { type: String, lowercase: true, trim: true },
    type: String,
    dedupKey: String,
    clientEmail: { type: String, lowercase: true, trim: true },
    clientUsername: String,
    clientNombre: String,
    payload: mongoose.Schema.Types.Mixed,
    read: { type: Boolean, default: false },
    readAt: Date,
  },
  { timestamps: true },
);
const PortalNotification =
  (mongoose.models.PortalNotification as mongoose.Model<any>) ||
  mongoose.model('PortalNotification', PortalNotificationSchema);

let cachedDb: typeof mongoose | null = null;
async function connectDB() {
  if (cachedDb) return cachedDb;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  cachedDb = await mongoose.connect(uri, { bufferCommands: false });
  return cachedDb;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    await connectDB();

    const now = new Date();
    const cutoff = new Date(now.getTime() - STALE_MS);

    const staleSessions: Array<{
      clientEmail: string;
      sessionId: string;
      quoteType: string;
      clientUsername: string;
      lastActivity: Date;
      lastStep: { step?: string; stepNumber?: number; totalSteps?: number } | null;
      route: { origin?: string; destination?: string } | null;
    }> = await QuoteTrackingEvent.aggregate([
      {
        $group: {
          _id: { email: '$clientEmail', sessionId: '$sessionId' },
          hasCompleted: {
            $max: { $cond: [{ $eq: ['$event', 'QUOTE_COMPLETED'] }, 1, 0] },
          },
          hasAbandoned: {
            $max: { $cond: [{ $eq: ['$event', 'QUOTE_ABANDONED'] }, 1, 0] },
          },
          lastActivity: { $max: '$timestamp' },
          quoteType: { $first: '$quoteType' },
          clientUsername: { $last: '$clientUsername' },
          lastStep: {
            $last: {
              $cond: [
                { $in: ['$event', ['QUOTE_STEP_CHANGED', 'QUOTE_STARTED']] },
                '$step',
                null,
              ],
            },
          },
          route: {
            $last: {
              $cond: [{ $eq: ['$event', 'QUOTE_ROUTE_SELECTED'] }, '$route', null],
            },
          },
        },
      },
      {
        $match: {
          hasCompleted: 0,
          hasAbandoned: 0,
          lastActivity: { $lt: cutoff },
        },
      },
      {
        $project: {
          _id: 0,
          clientEmail: '$_id.email',
          sessionId: '$_id.sessionId',
          quoteType: 1,
          clientUsername: 1,
          lastActivity: 1,
          lastStep: 1,
          route: 1,
        },
      },
      { $limit: 500 },
    ]);

    let closed = 0;
    let notified = 0;

    for (const session of staleSessions) {
      const clientEmail = String(session.clientEmail).toLowerCase().trim();
      const sessionId = String(session.sessionId);

      const exists = await QuoteTrackingEvent.exists({
        sessionId,
        event: 'QUOTE_ABANDONED',
      });
      if (exists) continue;

      const clientUser = await User.findOne({ email: clientEmail })
        .populate('ejecutivoId')
        .lean();
      const clientUsername =
        session.clientUsername ||
        (clientUser as any)?.username ||
        clientEmail;

      await QuoteTrackingEvent.create({
        clientEmail,
        clientUsername,
        sessionId,
        event: 'QUOTE_ABANDONED',
        quoteType: session.quoteType || 'FCL',
        step: session.lastStep || undefined,
        route: session.route || undefined,
        metadata: { source: 'cron_stale', staleSince: session.lastActivity },
        timestamp: now,
      });
      closed++;

      const ejecutivo = (clientUser as any)?.ejecutivoId;
      const ejecutivoEmail = ejecutivo?.email
        ? String(ejecutivo.email).toLowerCase().trim()
        : '';
      if (!ejecutivoEmail) continue;

      try {
        await PortalNotification.updateOne(
          {
            recipientEmail: ejecutivoEmail,
            dedupKey: `QUOTE:${sessionId}`,
          },
          {
            $set: {
              audience: 'EJECUTIVO',
              type: 'QUOTE_ABANDONED',
              recipientEmail: ejecutivoEmail,
              clientEmail,
              clientUsername,
              clientNombre: (clientUser as any)?.nombreuser,
              payload: {
                route: `/admin/clientes/comportamiento/${encodeURIComponent(clientUsername)}`,
                clientUsername,
              },
              read: false,
              readAt: undefined,
              updatedAt: now,
            },
            $setOnInsert: {
              dedupKey: `QUOTE:${sessionId}`,
              createdAt: now,
            },
          },
          { upsert: true },
        );
        notified++;
      } catch (err) {
        console.error('[stale-quote-sessions] notification failed:', sessionId, err);
      }
    }

    return res.json({
      ok: true,
      scanned: staleSessions.length,
      closed,
      notified,
    });
  } catch (err: any) {
    console.error('[stale-quote-sessions] error:', err);
    return res.status(500).json({
      error: err?.message || 'Error en cron stale-quote-sessions',
    });
  }
}
