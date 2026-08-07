import { getMongoDb, closeMongo } from '../whatsapp/db.js';
import { ensureWhitelistIndexes, upsertWhitelistPhone } from '../whatsapp/whitelist.js';
import { isValidPhoneDigits, phoneDigits, toE164 } from '../whatsapp/phone.js';

function env(name: string, fallback?: string): string {
  const v = process.env[name];
  if (v && v.trim()) return v.trim();
  if (fallback !== undefined) return fallback;
  throw new Error(`Falta variable de entorno: ${name}`);
}

async function main() {
  const MONGODB_URI = env('MONGODB_URI');
  const WHATSAPP_MONGODB_DB = process.env.WHATSAPP_MONGODB_DB?.trim() || undefined;
  const phoneRaw = env('PHONE');
  const digits = phoneDigits(phoneRaw);

  if (!isValidPhoneDigits(digits)) {
    throw new Error(`PHONE inválido. Usa dígitos con código de país, ej. 56992193809. Recibido: ${phoneRaw}`);
  }

  const db = await getMongoDb(MONGODB_URI, WHATSAPP_MONGODB_DB);
  await ensureWhitelistIndexes(db);
  const doc = await upsertWhitelistPhone(db, digits, process.env.LABEL?.trim());

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        phone: doc.phone,
        digits: doc._id,
        e164: toE164(doc._id),
      },
      null,
      2,
    ),
  );

  await closeMongo();
  process.exit(0);
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error('[whatsapp-whitelist-add] fatal:', err);
  await closeMongo().catch(() => undefined);
  process.exit(1);
});
