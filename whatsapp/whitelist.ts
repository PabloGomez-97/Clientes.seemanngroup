import type { Collection, Db } from 'mongodb';
import { isValidPhoneDigits, phoneDigits, toE164 } from './phone.js';

export const WHITELIST_COLLECTION = 'whatsapp_admin_whitelist';

export type WhitelistDoc = {
  _id: string; // digits only
  phone: string; // +E.164
  label?: string;
  createdAt: Date;
  updatedAt: Date;
};

export function whitelistCollection(db: Db): Collection<WhitelistDoc> {
  return db.collection<WhitelistDoc>(WHITELIST_COLLECTION);
}

export async function ensureWhitelistIndexes(db: Db): Promise<void> {
  await whitelistCollection(db).createIndex({ phone: 1 }, { unique: true });
}

export async function isPhoneWhitelisted(db: Db, phoneOrDigits: string): Promise<boolean> {
  const digits = phoneDigits(phoneOrDigits);
  if (!digits) return false;
  const doc = await whitelistCollection(db).findOne({ _id: digits });
  return Boolean(doc);
}

export async function upsertWhitelistPhone(
  db: Db,
  phoneRaw: string,
  label?: string,
): Promise<WhitelistDoc> {
  const digits = phoneDigits(phoneRaw);
  if (!isValidPhoneDigits(digits)) {
    throw new Error(`Teléfono inválido: ${phoneRaw}`);
  }
  const phone = toE164(digits);
  const now = new Date();
  await whitelistCollection(db).updateOne(
    { _id: digits },
    {
      $set: {
        phone,
        updatedAt: now,
        ...(label ? { label } : {}),
      },
      $setOnInsert: {
        _id: digits,
        createdAt: now,
      },
    },
    { upsert: true },
  );
  const doc = await whitelistCollection(db).findOne({ _id: digits });
  if (!doc) throw new Error('No se pudo guardar el teléfono en whitelist');
  return doc;
}

/** Semilla idempotente de números admin. */
export async function seedWhitelistPhones(
  db: Db,
  phones: string[],
): Promise<{ upserted: string[] }> {
  const upserted: string[] = [];
  for (const raw of phones) {
    const doc = await upsertWhitelistPhone(db, raw);
    upserted.push(doc.phone);
  }
  return { upserted };
}
