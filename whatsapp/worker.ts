import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
  type WAMessage,
} from '@whiskeysockets/baileys';
import { readFile } from 'fs/promises';
import path from 'path';
import qrcode from 'qrcode-terminal';
import pino from 'pino';

import { getMongoDb } from './db.js';
import { handleAdminMessage, ensureSessionIndexes } from './flow.js';
import { useMongoAuthState } from './mongoAuthState.js';
import { jidToPhoneDigits, phoneDigits } from './phone.js';
import {
  ensureWhitelistIndexes,
  isPhoneWhitelisted,
  seedWhitelistPhones,
} from './whitelist.js';

function env(name: string, fallback?: string): string {
  const v = process.env[name];
  if (v && v.trim()) return v.trim();
  if (fallback !== undefined) return fallback;
  throw new Error(`Falta variable de entorno: ${name}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractText(msg: WAMessage): string {
  const m = msg.message;
  if (!m) return '';
  // Mensajes efímeros / view-once vienen envueltos
  const inner =
    m.ephemeralMessage?.message ||
    m.viewOnceMessage?.message ||
    m.viewOnceMessageV2?.message ||
    m.viewOnceMessageV2Extension?.message ||
    m.documentWithCaptionMessage?.message ||
    m;
  if (typeof inner.conversation === 'string') return inner.conversation;
  if (inner.extendedTextMessage?.text) return inner.extendedTextMessage.text;
  if (inner.imageMessage?.caption) return inner.imageMessage.caption;
  if (inner.buttonsResponseMessage?.selectedDisplayText) {
    return inner.buttonsResponseMessage.selectedDisplayText;
  }
  if (inner.listResponseMessage?.title) return inner.listResponseMessage.title;
  return '';
}

/**
 * WhatsApp moderno suele mandar @lid; el número real viene en senderPn / participantPn.
 */
function extractSenderPhoneDigits(msg: WAMessage): string {
  const key = msg.key as WAMessage['key'] & {
    senderPn?: string | null;
    participantPn?: string | null;
  };

  const candidates = [
    key.senderPn,
    key.participantPn,
    key.participant,
    key.remoteJid,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    // Preferir JIDs de teléfono reales
    if (String(candidate).includes('@lid')) continue;
    const digits = jidToPhoneDigits(candidate);
    if (digits && digits.length >= 8) return digits;
  }

  // Último recurso: senderPn puede venir como "569...@s.whatsapp.net" o solo dígitos
  for (const candidate of [key.senderPn, key.participantPn]) {
    if (!candidate) continue;
    const digits = phoneDigits(candidate);
    if (digits && digits.length >= 8) return digits;
  }

  return '';
}

/** Números iniciales acordados (también se pueden agregar con el script). */
const DEFAULT_ADMIN_PHONES = ['56992193809', '56984607954', '56958022000'];

async function main() {
  const MONGODB_URI = env('MONGODB_URI');
  const WHATSAPP_MONGODB_DB = process.env.WHATSAPP_MONGODB_DB?.trim() || undefined;
  const BAILEYS_SESSION_ID = env('BAILEYS_SESSION_ID', 'seemann-portal');

  const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection');
    process.exit(1);
  });
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception');
    process.exit(1);
  });

  const db = await getMongoDb(MONGODB_URI, WHATSAPP_MONGODB_DB);
  await ensureWhitelistIndexes(db);
  await ensureSessionIndexes(db);

  // Semilla idempotente de whitelist
  const seedFromEnv = process.env.WHATSAPP_ADMIN_PHONES?.trim();
  const phonesToSeed = seedFromEnv
    ? seedFromEnv.split(/[,\s]+/).filter(Boolean)
    : DEFAULT_ADMIN_PHONES;
  const seeded = await seedWhitelistPhones(db, phonesToSeed);
  logger.info({ phones: seeded.upserted }, 'Whitelist admin lista');

  const { state, saveCreds } = await useMongoAuthState({
    db,
    sessionId: BAILEYS_SESSION_ID,
    collectionName: process.env.BAILEYS_AUTH_COLLECTION || 'baileys_auth',
  });

  const { version } = await fetchLatestBaileysVersion();

  let sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
  });

  let reconnectRequested = false;
  let loggedOut = false;

  const attachSocketListeners = (s: typeof sock) => {
    s.ev.on('creds.update', saveCreds);

    s.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        logger.info('Escanea el QR para vincular WhatsApp.');
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'open') {
        reconnectRequested = false;
        logger.info('Conexión WhatsApp abierta.');
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect as { error?: { output?: { statusCode?: number } } })
          ?.error?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;
        const isDeviceRemovedConflict = statusCode === 401;
        const shouldReconnect = !isLoggedOut && !isDeviceRemovedConflict;

        logger.warn(
          { statusCode, shouldReconnect, isDeviceRemovedConflict },
          'Conexión WhatsApp cerrada.',
        );

        if (isLoggedOut || isDeviceRemovedConflict) loggedOut = true;
        else reconnectRequested = true;
      }
    });

    s.ev.on('messages.upsert', async ({ messages, type }) => {
      // notify = mensaje nuevo; append a veces llega en sync reciente
      if (type !== 'notify' && type !== 'append') return;

      for (const msg of messages) {
        try {
          if (!msg.message) continue;
          if (msg.key.fromMe) continue;

          const remoteJid = msg.key.remoteJid;
          if (!remoteJid) continue;
          // Solo chats 1:1
          if (remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast') {
            continue;
          }

          const digits = extractSenderPhoneDigits(msg);
          const text = extractText(msg).trim();

          logger.info(
            {
              type,
              remoteJid,
              senderPn: (msg.key as { senderPn?: string }).senderPn,
              digits,
              textPreview: text.slice(0, 80),
            },
            'Mensaje entrante',
          );

          if (!digits) {
            logger.warn({ remoteJid }, 'No pude resolver el teléfono del remitente');
            continue;
          }

          const allowed = await isPhoneWhitelisted(db, digits);
          if (!allowed) {
            logger.info({ digits }, 'Mensaje ignorado (no whitelist)');
            continue;
          }

          if (!text) continue;

          const reply = await handleAdminMessage(db, digits, text);
          if (reply.silent || (!reply.text && !reply.stickerPath)) continue;

          // Responder al chat (puede ser @lid o @s.whatsapp.net)
          const jid = jidNormalizedUser(remoteJid);

          if (reply.stickerPath) {
            try {
              const stickerAbs = path.isAbsolute(reply.stickerPath)
                ? reply.stickerPath
                : path.join(process.cwd(), reply.stickerPath);
              const stickerBuf = await readFile(stickerAbs);
              await s.sendMessage(jid, { sticker: stickerBuf });
            } catch (stickerErr) {
              logger.warn({ stickerErr, path: reply.stickerPath }, 'No pude enviar sticker');
            }
          }

          if (reply.text) {
            await s.sendMessage(jid, { text: reply.text });
          }        } catch (err) {
          logger.error({ err }, 'Error procesando mensaje entrante');
        }
      }
    });
  };

  attachSocketListeners(sock);

  logger.info({ sessionId: BAILEYS_SESSION_ID }, 'Worker WhatsApp (crear empresas) iniciado.');

  while (true) {
    try {
      if (loggedOut) {
        logger.error(
          'Sesión cerrada o dispositivo removido. Re-vincula con QR ' +
            '(cambia BAILEYS_SESSION_ID o ejecuta npm run whatsapp:reset).',
        );
        process.exit(3);
      }

      if (reconnectRequested) {
        logger.warn('Reconectando WhatsApp…');
        try {
          sock.end(undefined);
        } catch {
          // ignore
        }
        await sleep(750);
        sock = makeWASocket({
          version,
          auth: state,
          logger,
          printQRInTerminal: false,
        });
        attachSocketListeners(sock);
        reconnectRequested = false;
      }

      await sleep(2000);
    } catch (err) {
      logger.error({ err }, 'Error en loop del worker');
      await sleep(3000);
    }
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[whatsapp-worker] fatal:', err);
  process.exit(1);
});
