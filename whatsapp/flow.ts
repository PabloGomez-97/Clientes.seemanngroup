import type { Db } from 'mongodb';
import { createClientAccount, findEjecutivoByName } from './createUser.js';
import { generateCompanyEmailPrefix } from './emailPrefix.js';
import type { LinbisAccount } from './linbis.js';
import { searchLinbisAccounts } from './linbis.js';

export type FlowStep =
  | 'menu'
  | 'awaiting_company_name'
  | 'awaiting_account_choice'
  | 'awaiting_ejecutivo_name'
  | 'awaiting_confirm';

export type SessionDoc = {
  _id: string; // phone digits or jid user
  step: FlowStep;
  searchTerm?: string;
  accounts?: LinbisAccount[];
  selected?: LinbisAccount;
  ejecutivoId?: string;
  ejecutivoNombre?: string;
  updatedAt: Date;
};

const SESSIONS_COLLECTION = 'whatsapp_admin_sessions';
const SESSION_TTL_MS = 60 * 60 * 1000; // 1h

export type FlowReply = {
  text?: string;
  /** Si true, no enviar nada (ej. opción Salir). */
  silent?: boolean;
};

function menuText(): string {
  return ['1. Agregar empresa', '2. Salir'].join('\n');
}

function formatAccountsList(accounts: LinbisAccount[]): string {
  const lines = accounts.map((acc, i) => {
    const ejecutivo = acc.salesRepName?.trim() || 'Sin ejecutivo';
    const contact = acc.contact?.trim() || '—';
    return `${i + 1}. ${acc.name}\n   Contacto: ${contact}\n   Ejecutivo: ${ejecutivo}`;
  });
  return lines.join('\n\n');
}

function confirmText(params: {
  company: string;
  contact: string;
  emailPreviewPrefix: string;
  ejecutivo: string;
}): string {
  return [
    `Empresa: ${params.company}`,
    `Nombre: ${params.contact}`,
    `Email: ${params.emailPreviewPrefix}@seemanngroup.com`,
    `Ejecutivo: ${params.ejecutivo}`,
    '',
    '¿Crear? SI / NO',
  ].join('\n');
}

async function getSession(db: Db, sessionId: string): Promise<SessionDoc | null> {
  const doc = await db.collection<SessionDoc>(SESSIONS_COLLECTION).findOne({
    _id: sessionId,
  });
  if (!doc) return null;
  if (Date.now() - new Date(doc.updatedAt).getTime() > SESSION_TTL_MS) {
    await clearSession(db, sessionId);
    return null;
  }
  return doc;
}

async function saveSession(
  db: Db,
  session: SessionDoc,
): Promise<void> {
  await db.collection<SessionDoc>(SESSIONS_COLLECTION).updateOne(
    { _id: session._id },
    { $set: { ...session, updatedAt: new Date() } },
    { upsert: true },
  );
}

async function clearSession(db: Db, sessionId: string): Promise<void> {
  await db.collection<SessionDoc>(SESSIONS_COLLECTION).deleteOne({ _id: sessionId });
}

export async function ensureSessionIndexes(db: Db): Promise<void> {
  await db
    .collection(SESSIONS_COLLECTION)
    .createIndex({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 2 });
}

function isCancel(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t === 'cancelar' || t === 'cancel' || t === 'menu' || t === 'menú';
}

function isYes(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t === 'si' || t === 'sí' || t === 's' || t === 'yes' || t === 'y';
}

function isNo(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t === 'no' || t === 'n' || t === 'cancelar';
}

/**
 * Procesa un mensaje de un admin whitelisted.
 * Cualquier texto en menú/idle muestra el menú (salvo "2" = salir en silencio).
 */
export async function handleAdminMessage(
  db: Db,
  sessionId: string,
  rawText: string,
): Promise<FlowReply> {
  const text = String(rawText || '').trim();
  if (!text) return { silent: true };

  let session = await getSession(db, sessionId);

  // Sin sesión activa → menú
  if (!session || session.step === 'menu') {
    if (text === '2') {
      await clearSession(db, sessionId);
      return { silent: true };
    }
    if (text === '1') {
      await saveSession(db, {
        _id: sessionId,
        step: 'awaiting_company_name',
        updatedAt: new Date(),
      });
      return { text: 'Nombre de la empresa:' };
    }
    await saveSession(db, {
      _id: sessionId,
      step: 'menu',
      updatedAt: new Date(),
    });
    return { text: menuText() };
  }

  if (isCancel(text) && session.step !== 'awaiting_confirm') {
    await saveSession(db, { _id: sessionId, step: 'menu', updatedAt: new Date() });
    return { text: menuText() };
  }

  if (session.step === 'awaiting_company_name') {
    try {
      const accounts = await searchLinbisAccounts(db, text);
      if (!accounts.length) {
        return { text: `Sin resultados para "${text}".` };
      }
      await saveSession(db, {
        _id: sessionId,
        step: 'awaiting_account_choice',
        searchTerm: text,
        accounts,
        updatedAt: new Date(),
      });
      return { text: formatAccountsList(accounts) };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al buscar en Linbis';
      return { text: `Error Linbis: ${msg}` };
    }
  }

  if (session.step === 'awaiting_account_choice') {
    const accounts = session.accounts || [];
    const n = Number(text);
    if (!Number.isInteger(n) || n < 1 || n > accounts.length) {
      return { text: `Número inválido (1-${accounts.length}).` };
    }
    const selected = accounts[n - 1];
    const salesRep = selected.salesRepName?.trim() || '';
    let matched = salesRep ? await findEjecutivoByName(db, salesRep) : null;

    if (!matched) {
      await saveSession(db, {
        _id: sessionId,
        step: 'awaiting_ejecutivo_name',
        searchTerm: session.searchTerm,
        accounts,
        selected,
        updatedAt: new Date(),
      });
      const hint = salesRep
        ? `No hay ejecutivo local "${salesRep}".`
        : 'Sin ejecutivo en Linbis.';
      return { text: `${hint}\nNombre del ejecutivo:` };
    }

    return goToConfirm(db, sessionId, selected, matched._id.toString(), matched.nombre);
  }

  if (session.step === 'awaiting_ejecutivo_name') {
    const matched = await findEjecutivoByName(db, text);
    if (!matched) {
      return { text: `Ejecutivo "${text}" no encontrado. Intenta de nuevo:` };
    }
    if (!session.selected) {
      await saveSession(db, { _id: sessionId, step: 'menu', updatedAt: new Date() });
      return { text: menuText() };
    }
    return goToConfirm(
      db,
      sessionId,
      session.selected,
      matched._id.toString(),
      matched.nombre,
    );
  }

  if (session.step === 'awaiting_confirm') {
    if (isNo(text)) {
      await saveSession(db, { _id: sessionId, step: 'menu', updatedAt: new Date() });
      return { text: menuText() };
    }
    if (!isYes(text)) {
      return { text: 'SI / NO' };
    }
    if (!session.selected || !session.ejecutivoId) {
      await saveSession(db, { _id: sessionId, step: 'menu', updatedAt: new Date() });
      return { text: menuText() };
    }

    try {
      const created = await createClientAccount(db, {
        companyName: session.selected.name,
        contactName: session.selected.contact || session.selected.name,
        ejecutivoId: session.ejecutivoId,
      });
      await saveSession(db, { _id: sessionId, step: 'menu', updatedAt: new Date() });
      return {
        text: [
          `Account: ${created.email}`,
          `Password: ${created.password}`,
          '',
          menuText(),
        ].join('\n'),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear usuario';
      await saveSession(db, { _id: sessionId, step: 'menu', updatedAt: new Date() });
      return {
        text: [msg, '', menuText()].join('\n'),
      };
    }
  }

  await saveSession(db, { _id: sessionId, step: 'menu', updatedAt: new Date() });
  return { text: menuText() };
}

async function goToConfirm(
  db: Db,
  sessionId: string,
  selected: LinbisAccount,
  ejecutivoId: string,
  ejecutivoNombre: string,
): Promise<FlowReply> {
  // Prefijo aproximado solo para preview; el definitivo se calcula al crear
  const existingEmails = (
    await db
      .collection('users')
      .find({}, { projection: { email: 1 } })
      .toArray()
  ).map((u) => String(u.email || ''));
  const prefix = generateCompanyEmailPrefix(selected.name, existingEmails);

  await saveSession(db, {
    _id: sessionId,
    step: 'awaiting_confirm',
    selected,
    ejecutivoId,
    ejecutivoNombre,
    updatedAt: new Date(),
  });

  return {
    text: confirmText({
      company: selected.name,
      contact: selected.contact || selected.name,
      emailPreviewPrefix: prefix,
      ejecutivo: ejecutivoNombre,
    }),
  };
}
