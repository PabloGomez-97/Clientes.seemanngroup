import { getMongoDb, closeMongo } from '../whatsapp/db.js';
import { ensureWhitelistIndexes, seedWhitelistPhones } from '../whatsapp/whitelist.js';

function env(name: string, fallback?: string): string {
  const v = process.env[name];
  if (v && v.trim()) return v.trim();
  if (fallback !== undefined) return fallback;
  throw new Error(`Falta variable de entorno: ${name}`);
}

const DEFAULT_ADMIN_PHONES = ['56992193809', '56984607954', '56958022000'];

async function main() {
  const MONGODB_URI = env('MONGODB_URI');
  const WHATSAPP_MONGODB_DB = process.env.WHATSAPP_MONGODB_DB?.trim() || undefined;

  const fromEnv = process.env.WHATSAPP_ADMIN_PHONES?.trim();
  const phones = fromEnv
    ? fromEnv.split(/[,\s]+/).filter(Boolean)
    : DEFAULT_ADMIN_PHONES;

  const db = await getMongoDb(MONGODB_URI, WHATSAPP_MONGODB_DB);
  await ensureWhitelistIndexes(db);
  const { upserted } = await seedWhitelistPhones(db, phones);

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ upserted }, null, 2));

  await closeMongo();
  process.exit(0);
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error('[whatsapp-whitelist-seed] fatal:', err);
  await closeMongo().catch(() => undefined);
  process.exit(1);
});
