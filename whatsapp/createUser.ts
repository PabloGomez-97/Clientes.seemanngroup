import bcrypt from 'bcryptjs';
import { ObjectId, type Db } from 'mongodb';
import { generateCompanyEmailPrefix, normalizeCompanyName } from './emailPrefix.js';

export type EjecutivoDoc = {
  _id: ObjectId;
  nombre: string;
  email?: string;
  activo?: boolean;
  roles?: {
    administrador?: boolean;
    pricing?: boolean;
    ejecutivo?: boolean;
    proveedor?: boolean;
    operaciones?: boolean;
  };
};

export type CreateClientInput = {
  companyName: string;
  contactName: string;
  ejecutivoId: string;
};

export type CreateClientResult = {
  email: string;
  password: string;
  username: string;
  nombreuser: string;
  ejecutivoNombre: string;
};

function defaultClientPassword(): string {
  return (
    process.env.DEFAULT_CLIENT_PASSWORD?.trim() ||
    // Mismo valor que muestra el portal tras crear un cliente
    'Seemann@2026'
  );
}

/** Solo activos con rol ejecutivo. */
export async function listActiveEjecutivos(db: Db): Promise<EjecutivoDoc[]> {
  const col = db.collection<EjecutivoDoc>('ejecutivos');
  return col
    .find({
      activo: { $ne: false },
      'roles.ejecutivo': true,
    })
    .project<EjecutivoDoc>({ nombre: 1, email: 1, activo: 1, roles: 1 })
    .sort({ nombre: 1 })
    .toArray();
}

export async function findEjecutivoByName(
  db: Db,
  name: string,
): Promise<EjecutivoDoc | null> {
  const needle = name.trim().toLowerCase();
  if (!needle) return null;
  const ejecutivos = await listActiveEjecutivos(db);
  return (
    ejecutivos.find((ej) => (ej.nombre || '').trim().toLowerCase() === needle) ||
    null
  );
}

async function findDuplicateCompanyNames(
  db: Db,
  companyNames: string[],
): Promise<string[]> {
  const normalizedRequested = Array.from(
    new Set(companyNames.map((n) => normalizeCompanyName(n)).filter(Boolean)),
  );
  if (!normalizedRequested.length) return [];

  const users = await db
    .collection('users')
    .find({ username: { $ne: 'Ejecutivo' } }, { projection: { username: 1, usernames: 1 } })
    .toArray();

  const duplicates = new Set<string>();
  for (const existingUser of users) {
    const existingCompanies = Array.from(
      new Set([
        String(existingUser.username || ''),
        ...((Array.isArray(existingUser.usernames)
          ? existingUser.usernames
          : []) as string[]),
      ]),
    );
    for (const existingCompany of existingCompanies) {
      const normalizedExisting = normalizeCompanyName(existingCompany);
      if (normalizedRequested.includes(normalizedExisting)) {
        duplicates.add(existingCompany);
      }
    }
  }
  return Array.from(duplicates);
}

export async function createClientAccount(
  db: Db,
  input: CreateClientInput,
): Promise<CreateClientResult> {
  const companyName = input.companyName.trim();
  const contactName = (input.contactName || companyName).trim();
  if (!companyName) throw new Error('Falta el nombre de la empresa');
  if (!contactName) throw new Error('Falta el nombre de contacto');

  const ejecutivo = await db.collection<EjecutivoDoc>('ejecutivos').findOne({
    _id: new ObjectId(input.ejecutivoId),
  });
  if (!ejecutivo) throw new Error('Ejecutivo no encontrado');

  const existingEmails = (
    await db
      .collection('users')
      .find({}, { projection: { email: 1 } })
      .toArray()
  ).map((u) => String(u.email || ''));

  const prefix = generateCompanyEmailPrefix(companyName, existingEmails);
  const email = `${prefix}@seemanngroup.com`;

  const existingUser = await db.collection('users').findOne({ email });
  if (existingUser) {
    throw new Error('El email ya está registrado');
  }

  const duplicates = await findDuplicateCompanyNames(db, [companyName]);
  if (duplicates.length > 0) {
    throw new Error(
      `Ya existe una cuenta registrada con el nombre de empresa "${duplicates[0]}"`,
    );
  }

  const password = defaultClientPassword();
  const passwordHash = bcrypt.hashSync(password, 12);
  const now = new Date();

  await db.collection('users').insertOne({
    email,
    username: companyName,
    usernames: [companyName],
    nombreuser: contactName,
    passwordHash,
    ejecutivoId: ejecutivo._id,
    loginFailCount: 0,
    loginCaptchaRequired: false,
    mobilePushEnabled: true,
    createdAt: now,
    updatedAt: now,
  });

  return {
    email,
    password,
    username: companyName,
    nombreuser: contactName,
    ejecutivoNombre: ejecutivo.nombre,
  };
}

export type PortalClientMatch = {
  id: string;
  email: string;
  company: string;
  nombreuser: string;
  score: number;
};

function scoreCompanyMatch(query: string, company: string): number {
  const q = normalizeCompanyName(query);
  const c = normalizeCompanyName(company);
  if (!q || !c) return 0;
  if (c === q) return 100;
  if (c.startsWith(q) || q.startsWith(c)) return 90;
  if (c.includes(q)) return 80;
  if (q.includes(c) && c.length >= 3) return 70;

  const qWords = q.split(' ').filter(Boolean);
  if (qWords.length > 1 && qWords.every((w) => c.includes(w))) return 65;

  // similitud simple por caracteres compartidos al inicio
  let shared = 0;
  const max = Math.min(q.length, c.length);
  for (let i = 0; i < max; i++) {
    if (q[i] === c[i]) shared++;
    else break;
  }
  if (shared >= 4) return 40 + Math.min(shared, 20);
  return 0;
}

/** Busca clientes del portal por nombre/parte de empresa (excluye ejecutivos). */
export async function searchPortalClients(
  db: Db,
  term: string,
): Promise<PortalClientMatch[]> {
  const query = term.trim();
  if (!query) return [];

  const users = await db
    .collection('users')
    .find(
      { username: { $ne: 'Ejecutivo' } },
      {
        projection: {
          email: 1,
          username: 1,
          usernames: 1,
          nombreuser: 1,
        },
      },
    )
    .toArray();

  const matches: PortalClientMatch[] = [];

  for (const user of users) {
    const companies = Array.from(
      new Set([
        String(user.username || ''),
        ...((Array.isArray(user.usernames) ? user.usernames : []) as string[]),
      ]),
    ).filter(Boolean);

    let bestScore = 0;
    let bestCompany = companies[0] || String(user.username || '');
    for (const company of companies) {
      const score = scoreCompanyMatch(query, company);
      if (score > bestScore) {
        bestScore = score;
        bestCompany = company;
      }
    }

    if (bestScore <= 0) continue;

    matches.push({
      id: String(user._id),
      email: String(user.email || ''),
      company: bestCompany,
      nombreuser: String(user.nombreuser || ''),
      score: bestScore,
    });
  }

  matches.sort((a, b) => b.score - a.score || a.company.localeCompare(b.company));
  return matches.slice(0, 10);
}

/** Restaura la password al default del portal. Solo passwordHash. */
export async function resetClientPassword(
  db: Db,
  userId: string,
): Promise<{ email: string; password: string }> {
  const password = defaultClientPassword();
  const passwordHash = bcrypt.hashSync(password, 12);
  const _id = new ObjectId(userId);

  const existing = await db.collection('users').findOne(
    { _id, username: { $ne: 'Ejecutivo' } },
    { projection: { email: 1 } },
  );
  if (!existing?.email) {
    throw new Error('No encontré esa cuenta para resetear');
  }

  await db.collection('users').updateOne(
    { _id },
    {
      $set: {
        passwordHash,
        loginFailCount: 0,
        loginCaptchaRequired: false,
        updatedAt: new Date(),
      },
    },
  );

  return { email: String(existing.email), password };
}
