import bcrypt from 'bcryptjs';
import { ObjectId, type Db } from 'mongodb';
import { generateCompanyEmailPrefix, normalizeCompanyName } from './emailPrefix.js';

export type EjecutivoDoc = {
  _id: ObjectId;
  nombre: string;
  email?: string;
  activo?: boolean;
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

export async function listActiveEjecutivos(db: Db): Promise<EjecutivoDoc[]> {
  const col = db.collection<EjecutivoDoc>('ejecutivos');
  return col
    .find({ activo: { $ne: false } })
    .project<EjecutivoDoc>({ nombre: 1, email: 1, activo: 1 })
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
