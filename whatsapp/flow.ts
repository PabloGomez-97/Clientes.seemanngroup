import type { Db } from 'mongodb';
import {
  createClientAccount,
  findEjecutivoByName,
  listActiveEjecutivos,
  resetClientPassword,
  searchPortalClients,
  type EjecutivoDoc,
  type PortalClientMatch,
} from './createUser.js';
import { generateCompanyEmailPrefix } from './emailPrefix.js';
import type { LinbisAccount } from './linbis.js';
import { searchLinbisAccounts } from './linbis.js';

export type FlowStep =
  | 'menu'
  | 'awaiting_company_name'
  | 'awaiting_account_choice'
  | 'awaiting_ejecutivo_name'
  | 'awaiting_confirm'
  | 'awaiting_reset_company_name'
  | 'awaiting_reset_choice'
  | 'awaiting_reset_identity_confirm'
  | 'awaiting_reset_password_confirm'
  | 'awaiting_create_offer'
  | 'awaiting_lookup_company_name';

export type SessionDoc = {
  _id: string;
  step: FlowStep;
  searchTerm?: string;
  accounts?: LinbisAccount[];
  selected?: LinbisAccount;
  ejecutivos?: Array<{ id: string; nombre: string }>;
  ejecutivoId?: string;
  ejecutivoNombre?: string;
  portalMatches?: PortalClientMatch[];
  resetTarget?: PortalClientMatch;
  updatedAt: Date;
};

const SESSIONS_COLLECTION = 'whatsapp_admin_sessions';
const SESSION_TTL_MS = 5 * 60 * 1000;

export type FlowReply = {
  text?: string;
  silent?: boolean;
};

function menuText(): string {
  return [
    'Dime que necesitas',
    '1. Agregar empresa',
    '2. Recuperar contraseña',
    '3. Buscar cuenta, ¿existe?',
    '4. Salir',
  ].join('\n');
}

function formatAccountsList(accounts: LinbisAccount[]): string {
  const lines = accounts.map((acc, i) => {
    const ejecutivo = acc.salesRepName?.trim() || 'Sin ejecutivo';
    const contact = acc.contact?.trim() || '—';
    return `${i + 1}. ${acc.name}\n   Contacto: ${contact}\n   Ejecutivo: ${ejecutivo}`;
  });
  return [
    'Ya mira, encontré estos resultados, sabes cual de esos es? dime el número',
    '',
    ...lines,
  ].join('\n');
}

function formatEjecutivosList(ejecutivos: EjecutivoDoc[]): string {
  const lines = ejecutivos.map((ej, i) => `${i + 1}. ${ej.nombre}`);
  return [
    'Esa cuenta no tiene ejecutivo, ¿sabes cual es?',
    '',
    ...lines,
  ].join('\n');
}

function formatPortalMatches(matches: PortalClientMatch[]): string {
  const lines = matches.map(
    (m, i) => `${i + 1}. ${m.company}\n   Account: ${m.email}`,
  );
  return [
    'Encontré estas cuentas, ¿cuál es? dime el número',
    '',
    ...lines,
  ].join('\n');
}

/** Solo búsqueda: lista o ficha, sin pedir elección. */
function formatLookupResults(matches: PortalClientMatch[]): string {
  if (matches.length === 1) {
    return [
      `Empresa: ${matches[0].company}`,
      `Account: ${matches[0].email}`,
    ].join('\n');
  }
  const lines = matches.map(
    (m, i) => `${i + 1}. ${m.company}\n   Account: ${m.email}`,
  );
  return ['Encontré estas:', '', ...lines].join('\n');
}

function formatResetIdentity(match: PortalClientMatch): string {
  return [
    `Empresa: ${match.company}`,
    `Account: ${match.email}`,
    '¿Es esta?',
  ].join('\n');
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

async function saveSession(db: Db, session: SessionDoc): Promise<void> {
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
  const col = db.collection(SESSIONS_COLLECTION);
  try {
    await col.dropIndex('updatedAt_1');
  } catch {
    // no existía
  }
  await col.createIndex(
    { updatedAt: 1 },
    { expireAfterSeconds: Math.ceil(SESSION_TTL_MS / 1000) },
  );
}

function isBackToMenu(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    t === 'volver' ||
    t === 'cancelar' ||
    t === 'cancel' ||
    t === 'menu' ||
    t === 'menú'
  );
}

function isYes(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t === 'si' || t === 'sí' || t === 's' || t === 'yes' || t === 'y';
}

function isNo(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t === 'no' || t === 'n';
}

async function startLinbisCreateFromTerm(
  db: Db,
  sessionId: string,
  term: string,
): Promise<FlowReply> {
  try {
    const accounts = await searchLinbisAccounts(db, term);
    if (!accounts.length) {
      await saveSession(db, {
        _id: sessionId,
        step: 'awaiting_company_name',
        updatedAt: new Date(),
      });
      return {
        text: `No encontré nada en Linbis con "${term}". Dime otro nombre o parte:`,
      };
    }
    await saveSession(db, {
      _id: sessionId,
      step: 'awaiting_account_choice',
      searchTerm: term,
      accounts,
      updatedAt: new Date(),
    });
    return { text: formatAccountsList(accounts) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al buscar en Linbis';
    return { text: `Uy, falló Linbis: ${msg}` };
  }
}

/**
 * Procesa un mensaje de un admin whitelisted.
 */
export async function handleAdminMessage(
  db: Db,
  sessionId: string,
  rawText: string,
): Promise<FlowReply> {
  const text = String(rawText || '').trim();
  if (!text) return { silent: true };

  const session = await getSession(db, sessionId);

  // Menú
  if (!session || session.step === 'menu') {
    if (text === '4') {
      await clearSession(db, sessionId);
      return { silent: true };
    }
    if (text === '1') {
      await saveSession(db, {
        _id: sessionId,
        step: 'awaiting_company_name',
        updatedAt: new Date(),
      });
      return { text: 'Oka, dime el nombre de la empresa o parte de ella:' };
    }
    if (text === '2') {
      await saveSession(db, {
        _id: sessionId,
        step: 'awaiting_reset_company_name',
        updatedAt: new Date(),
      });
      return { text: 'Dime el nombre de la empresa o parte de ella' };
    }
    if (text === '3') {
      await saveSession(db, {
        _id: sessionId,
        step: 'awaiting_lookup_company_name',
        updatedAt: new Date(),
      });
      return { text: 'Dime el nombre de la empresa o parte de ella' };
    }
    await saveSession(db, {
      _id: sessionId,
      step: 'menu',
      updatedAt: new Date(),
    });
    return { text: menuText() };
  }

  if (isBackToMenu(text)) {
    await saveSession(db, { _id: sessionId, step: 'menu', updatedAt: new Date() });
    return { text: menuText() };
  }

  // ——— Crear empresa (opción 1) ———
  if (session.step === 'awaiting_company_name') {
    try {
      const accounts = await searchLinbisAccounts(db, text);
      if (!accounts.length) {
        return { text: `No encontré nada con "${text}", prueba con otra cosa` };
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
      return { text: `Uy, falló Linbis: ${msg}` };
    }
  }

  if (session.step === 'awaiting_account_choice') {
    const accounts = session.accounts || [];
    const n = Number(text);
    if (!Number.isInteger(n) || n < 1 || n > accounts.length) {
      return { text: `Ese número no calza, prueba del 1 al ${accounts.length}` };
    }
    const selected = accounts[n - 1];
    const salesRep = selected.salesRepName?.trim() || '';
    const matched = salesRep ? await findEjecutivoByName(db, salesRep) : null;

    if (!matched) {
      const ejecutivos = await listActiveEjecutivos(db);
      if (!ejecutivos.length) {
        return {
          text: 'No hay ejecutivos con rol Ejecutivo en el portal para asignar.',
        };
      }
      await saveSession(db, {
        _id: sessionId,
        step: 'awaiting_ejecutivo_name',
        searchTerm: session.searchTerm,
        accounts,
        selected,
        ejecutivos: ejecutivos.map((ej) => ({
          id: ej._id.toString(),
          nombre: ej.nombre,
        })),
        updatedAt: new Date(),
      });
      return { text: formatEjecutivosList(ejecutivos) };
    }

    return goToConfirm(db, sessionId, selected, matched._id.toString(), matched.nombre);
  }

  if (session.step === 'awaiting_ejecutivo_name') {
    const list = session.ejecutivos || [];
    let matchedId: string | undefined;
    let matchedNombre: string | undefined;

    const n = Number(text);
    if (Number.isInteger(n) && n >= 1 && n <= list.length) {
      matchedId = list[n - 1].id;
      matchedNombre = list[n - 1].nombre;
    } else {
      const byName = await findEjecutivoByName(db, text);
      if (byName) {
        matchedId = byName._id.toString();
        matchedNombre = byName.nombre;
      }
    }

    if (!matchedId || !matchedNombre) {
      const ejecutivos = await listActiveEjecutivos(db);
      await saveSession(db, {
        ...session,
        step: 'awaiting_ejecutivo_name',
        ejecutivos: ejecutivos.map((ej) => ({
          id: ej._id.toString(),
          nombre: ej.nombre,
        })),
        updatedAt: new Date(),
      });
      return {
        text: [
          'No me cuadró ese, dime el número de la lista:',
          '',
          ...ejecutivos.map((ej, i) => `${i + 1}. ${ej.nombre}`),
        ].join('\n'),
      };
    }

    if (!session.selected) {
      await saveSession(db, { _id: sessionId, step: 'menu', updatedAt: new Date() });
      return { text: menuText() };
    }
    return goToConfirm(db, sessionId, session.selected, matchedId, matchedNombre);
  }

  if (session.step === 'awaiting_confirm') {
    if (isNo(text)) {
      await saveSession(db, { _id: sessionId, step: 'menu', updatedAt: new Date() });
      return { text: menuText() };
    }
    if (!isYes(text)) {
      return { text: '¿Crear? SI / NO' };
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
        text: [`Account: ${created.email}`, `Password: ${created.password}`].join(
          '\n',
        ),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear usuario';
      await saveSession(db, { _id: sessionId, step: 'menu', updatedAt: new Date() });
      return {
        text: [msg, '', menuText()].join('\n'),
      };
    }
  }

  // ——— Recuperar contraseña (opción 2) ———
  if (session.step === 'awaiting_reset_company_name') {
    const matches = await searchPortalClients(db, text);
    if (!matches.length) {
      await saveSession(db, {
        _id: sessionId,
        step: 'awaiting_create_offer',
        searchTerm: text,
        updatedAt: new Date(),
      });
      return { text: 'No existe esa cuenta... te la creo?' };
    }

    if (matches.length === 1) {
      await saveSession(db, {
        _id: sessionId,
        step: 'awaiting_reset_identity_confirm',
        searchTerm: text,
        portalMatches: matches,
        resetTarget: matches[0],
        updatedAt: new Date(),
      });
      return { text: formatResetIdentity(matches[0]) };
    }

    await saveSession(db, {
      _id: sessionId,
      step: 'awaiting_reset_choice',
      searchTerm: text,
      portalMatches: matches,
      updatedAt: new Date(),
    });
    return { text: formatPortalMatches(matches) };
  }

  if (session.step === 'awaiting_reset_choice') {
    const matches = session.portalMatches || [];
    const n = Number(text);
    if (!Number.isInteger(n) || n < 1 || n > matches.length) {
      return { text: `Ese número no calza, prueba del 1 al ${matches.length}` };
    }
    const target = matches[n - 1];
    await saveSession(db, {
      _id: sessionId,
      step: 'awaiting_reset_identity_confirm',
      searchTerm: session.searchTerm,
      portalMatches: matches,
      resetTarget: target,
      updatedAt: new Date(),
    });
    return { text: formatResetIdentity(target) };
  }

  if (session.step === 'awaiting_reset_identity_confirm') {
    if (isNo(text)) {
      await saveSession(db, {
        _id: sessionId,
        step: 'awaiting_reset_company_name',
        updatedAt: new Date(),
      });
      return { text: 'Dale, dime el nombre de la empresa o parte de ella' };
    }
    if (!isYes(text)) {
      return { text: '¿Es esta?' };
    }
    if (!session.resetTarget) {
      await saveSession(db, {
        _id: sessionId,
        step: 'awaiting_reset_company_name',
        updatedAt: new Date(),
      });
      return { text: 'Dime el nombre de la empresa o parte de ella' };
    }
    await saveSession(db, {
      _id: sessionId,
      step: 'awaiting_reset_password_confirm',
      searchTerm: session.searchTerm,
      resetTarget: session.resetTarget,
      updatedAt: new Date(),
    });
    return { text: '¿Estás seguro de reiniciar la contraseña?' };
  }

  if (session.step === 'awaiting_reset_password_confirm') {
    if (isNo(text)) {
      await saveSession(db, { _id: sessionId, step: 'menu', updatedAt: new Date() });
      return { text: menuText() };
    }
    if (!isYes(text)) {
      return { text: '¿Estás seguro de reiniciar la contraseña?' };
    }
    if (!session.resetTarget?.id) {
      await saveSession(db, { _id: sessionId, step: 'menu', updatedAt: new Date() });
      return { text: menuText() };
    }

    try {
      const reset = await resetClientPassword(db, session.resetTarget.id);
      await saveSession(db, { _id: sessionId, step: 'menu', updatedAt: new Date() });
      return {
        text: [`Account: ${reset.email}`, `Password: ${reset.password}`].join('\n'),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No pude resetear';
      await saveSession(db, { _id: sessionId, step: 'menu', updatedAt: new Date() });
      return { text: [msg, '', menuText()].join('\n') };
    }
  }

  if (session.step === 'awaiting_create_offer') {
    if (isNo(text)) {
      await saveSession(db, {
        _id: sessionId,
        step: 'awaiting_reset_company_name',
        updatedAt: new Date(),
      });
      return { text: 'Ok, dime otro nombre de empresa o parte de ella' };
    }
    if (!isYes(text)) {
      return { text: 'No existe esa cuenta... te la creo?' };
    }
    const term = session.searchTerm?.trim() || '';
    if (!term) {
      await saveSession(db, {
        _id: sessionId,
        step: 'awaiting_company_name',
        updatedAt: new Date(),
      });
      return { text: 'Oka, dime el nombre de la empresa o parte de ella:' };
    }
    return startLinbisCreateFromTerm(db, sessionId, term);
  }

  // ——— Buscar cuenta (opción 3) ———
  if (session.step === 'awaiting_lookup_company_name') {
    const matches = await searchPortalClients(db, text);
    if (!matches.length) {
      return {
        text: 'No encontré esa cuenta. Dime otro nombre o parte de la empresa',
      };
    }
    // Fin de la consulta: vuelve a menú para que arranque el TTL en paz
    await saveSession(db, {
      _id: sessionId,
      step: 'menu',
      updatedAt: new Date(),
    });
    return { text: formatLookupResults(matches) };
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
