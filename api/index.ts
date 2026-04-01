// api/index.ts - Serverless function para Vercel, ESTO ES SOLO PARA PRODUCCIÓN
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { buildOversizeEmailHTML, getOversizeEmailSubject, type OversizeEmailData } from './emails/oversizeEmailTemplate.js';
import { buildOceanOversizeEmailHTML, getOceanOversizeEmailSubject, type OceanOversizeEmailData } from './emails/oversizeEmailTemplateOcean.js';
import { buildDocumentUploadEmailHTML, getDocumentUploadEmailSubject, type DocumentUploadEmailData } from './emails/documentUploadEmailTemplate.js';
import chatHandler from './chat.js';

/** =========================
 *  Entorno + JWT
 *  ========================= */
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

const JWT_SECRET: jwt.Secret = requireEnv('JWT_SECRET');
const TOKEN_TTL: jwt.SignOptions['expiresIn'] =
  (process.env.JWT_TTL as jwt.SignOptions['expiresIn']) ?? '7d';
const MONGODB_URI = requireEnv('MONGODB_URI');

interface AuthPayload extends jwt.JwtPayload {
  sub: string;
  username: string;
}

function signToken(payload: AuthPayload | object): string {
  const opts: jwt.SignOptions = { expiresIn: TOKEN_TTL };
  return jwt.sign(payload as object, JWT_SECRET, opts);
}

function verifyToken(token: string): AuthPayload {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (typeof decoded === 'string') throw new Error('Invalid token payload');
  return decoded as AuthPayload;
}

const OPERATIONS_FOLLOWER_EMAIL = 'operaciones@seemanngroup.com';
const MAX_VISIBLE_TRACK_FOLLOWERS = 10;
const MAX_SAVED_TRACKING_EMAILS = 20;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeTrackingFollowers(rawFollowers: unknown): string[] {
  const uniqueFollowers = new Map<string, string>();
  const inputFollowers = Array.isArray(rawFollowers) ? rawFollowers : [];

  for (const value of inputFollowers) {
    const email = String(value || '').trim();
    if (!email) continue;

    const key = email.toLowerCase();
    if (key === OPERATIONS_FOLLOWER_EMAIL) continue;
    if (!uniqueFollowers.has(key)) {
      uniqueFollowers.set(key, email);
    }
  }

  return [...uniqueFollowers.values(), OPERATIONS_FOLLOWER_EMAIL];
}

function validateTrackingPreferenceEmails(rawEmails: unknown): {
  emails?: string[];
  error?: string;
} {
  if (!Array.isArray(rawEmails)) {
    return { error: 'emails debe ser un array de correos electrónicos' };
  }

  if (rawEmails.length > MAX_SAVED_TRACKING_EMAILS) {
    return {
      error: `Máximo ${MAX_SAVED_TRACKING_EMAILS} correos permitidos por cuenta`,
    };
  }

  const uniqueEmails = new Map<string, string>();

  for (const rawEmail of rawEmails) {
    if (typeof rawEmail !== 'string') {
      return { error: 'Cada correo debe ser un texto válido' };
    }

    const email = rawEmail.trim().toLowerCase();

    if (!email) {
      return { error: 'No se permiten correos vacíos' };
    }

    if (!EMAIL_REGEX.test(email)) {
      return { error: `El correo ${rawEmail} no es válido` };
    }

    if (email === OPERATIONS_FOLLOWER_EMAIL.toLowerCase()) {
      return {
        error:
          'El correo de operaciones se agrega automáticamente y no debe configurarse manualmente',
      };
    }

    if (uniqueEmails.has(email)) {
      return { error: 'No se permiten correos duplicados' };
    }

    uniqueEmails.set(email, email);
  }

  return { emails: Array.from(uniqueEmails.values()) };
}

async function getShipsgoShipmentFollowerEmail(
  shipmentType: 'air' | 'ocean',
  shipmentId: string,
  followerId: string,
  token: string,
): Promise<string | null> {
  const response = await fetch(
    `https://api.shipsgo.com/v2/${shipmentType}/shipments/${encodeURIComponent(shipmentId)}`,
    {
      method: 'GET',
      headers: {
        'X-Shipsgo-User-Token': token,
      },
    },
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json().catch(() => ({}))) as {
    shipment?: { followers?: Array<{ id?: number | string; email?: string }> };
  };

  const follower = data.shipment?.followers?.find(
    (item) => String(item.id) === String(followerId),
  );

  return follower?.email?.trim().toLowerCase() || null;
}

/** =========================
 *  Mongoose / Modelos tipados
 *  ========================= */

// ✅ Modelo Ejecutivo
interface IEjecutivo {
  nombre: string;
  email: string;
  telefono: string;
  activo: boolean;
  roles: {
    administrador: boolean;
    pricing: boolean;
    ejecutivo: boolean;
    proveedor: boolean;
    operaciones: boolean;
  };
}

interface IEjecutivoDoc extends IEjecutivo, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

type EjecutivoModel = mongoose.Model<IEjecutivoDoc>;

const EjecutivoSchema = new mongoose.Schema<IEjecutivoDoc>(
  {
    nombre: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    telefono: { type: String, required: true, trim: true },
    activo: { type: Boolean, default: true },
    roles: {
      administrador: { type: Boolean, default: false },
      pricing: { type: Boolean, default: false },
      ejecutivo: { type: Boolean, default: true },
      proveedor: { type: Boolean, default: false },
      operaciones: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

const Ejecutivo = (mongoose.models.Ejecutivo || mongoose.model<IEjecutivoDoc>('Ejecutivo', EjecutivoSchema)) as EjecutivoModel;

// ✅ Modelo User con referencia a Ejecutivo
interface IUser {
  email: string;
  username: string;
  usernames: string[];  // Múltiples empresas/cuentas asignadas
  nombreuser: string;
  passwordHash: string;
  ejecutivoId?: mongoose.Types.ObjectId;
}

interface IUserDoc extends IUser, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

type UserModel = mongoose.Model<IUserDoc>;

const UserSchema = new mongoose.Schema<IUserDoc>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, required: true, trim: true },
    usernames: { type: [String], default: [] },  // Múltiples empresas
    nombreuser: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    ejecutivoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ejecutivo' },
  },
  { timestamps: true }
);

const User = (mongoose.models.User || mongoose.model<IUserDoc>('User', UserSchema)) as UserModel;

const normalizeCompanyName = (value: string): string =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const findDuplicateCompanyNames = async (companyNames: string[]): Promise<string[]> => {
  const normalizedRequested = Array.from(
    new Set(companyNames.map((name) => normalizeCompanyName(name)).filter(Boolean))
  );

  if (normalizedRequested.length === 0) {
    return [];
  }

  const existingUsers = await User.find(
    { username: { $ne: 'Ejecutivo' } },
    { username: 1, usernames: 1 }
  ).lean();

  const duplicates = new Set<string>();

  for (const existingUser of existingUsers) {
    const existingCompanies = Array.from(
      new Set([
        existingUser.username,
        ...(Array.isArray(existingUser.usernames) ? existingUser.usernames : []),
      ])
    );

    for (const existingCompany of existingCompanies) {
      const normalizedExisting = normalizeCompanyName(existingCompany);
      if (normalizedRequested.includes(normalizedExisting)) {
        duplicates.add(existingCompany);
      }
    }
  }

  return Array.from(duplicates);
};

interface ITrackingEmailPreference {
  reference: string;
  emails: string[];
  updatedBy: string;
}

interface ITrackingEmailPreferenceDoc
  extends ITrackingEmailPreference,
    mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

type TrackingEmailPreferenceModel = mongoose.Model<ITrackingEmailPreferenceDoc>;

const TrackingEmailPreferenceSchema = new mongoose.Schema<ITrackingEmailPreferenceDoc>(
  {
    reference: { type: String, required: true, unique: true, trim: true, index: true },
    emails: { type: [String], default: [] },
    updatedBy: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const TrackingEmailPreference =
  (mongoose.models.TrackingEmailPreference ||
    mongoose.model<ITrackingEmailPreferenceDoc>(
      'TrackingEmailPreference',
      TrackingEmailPreferenceSchema,
    )) as TrackingEmailPreferenceModel;

async function getShipsgoExecutiveProfileForUser(
  email: string,
): Promise<IEjecutivoDoc | null> {
  const lookupEmail = String(email || '').toLowerCase().trim();

  if (!lookupEmail) {
    return null;
  }

  return Ejecutivo.findOne({ email: lookupEmail });
}

async function canManageShipsgoReference(
  currentUser: AuthPayload,
  reference: string,
): Promise<boolean> {
  const normalizedReference = String(reference || '').trim();

  if (!normalizedReference) {
    return false;
  }

  if (normalizedReference === currentUser.username) {
    return true;
  }

  const me = await User.findOne({ email: currentUser.sub });

  if (!me) {
    return false;
  }

  const ownReferences = new Set(
    [me.username, ...(Array.isArray(me.usernames) ? me.usernames : [])]
      .map((value) => String(value || '').trim())
      .filter(Boolean),
  );

  if (ownReferences.has(normalizedReference)) {
    return true;
  }

  const myExecutiveProfile = await getShipsgoExecutiveProfileForUser(me.email);

  if (!myExecutiveProfile) {
    return false;
  }

  const targetClient = await User.exists({
    username: { $ne: 'Ejecutivo' },
    $or: [{ username: normalizedReference }, { usernames: normalizedReference }],
  });

  return !!targetClient;
}

async function canDeleteShipsgoShipment(
  currentUser: AuthPayload,
  shipmentType: 'air' | 'ocean',
  shipmentId: string,
  token: string,
): Promise<{ allowed: boolean; status: number; error?: string }> {
  const detailResponse = await fetch(
    `https://api.shipsgo.com/v2/${shipmentType}/shipments/${encodeURIComponent(shipmentId)}`,
    {
      method: 'GET',
      headers: {
        'X-Shipsgo-User-Token': token,
      },
    },
  );

  if (detailResponse.status === 404) {
    return {
      allowed: false,
      status: 404,
      error: 'Tracking no encontrado',
    };
  }

  if (!detailResponse.ok) {
    return {
      allowed: false,
      status: detailResponse.status,
      error: 'No se pudo validar el tracking',
    };
  }

  const detailData = (await detailResponse.json().catch(() => ({}))) as {
    shipment?: { reference?: string | null };
  };

  const reference = String(detailData.shipment?.reference || '').trim();

  if (reference) {
    const canManageReference = await canManageShipsgoReference(
      currentUser,
      reference,
    );

    return canManageReference
      ? { allowed: true, status: 200 }
      : {
          allowed: false,
          status: 403,
          error: 'No tienes permisos para eliminar este tracking',
        };
  }

  const me = await User.findOne({ email: currentUser.sub });
  const myExecutiveProfile = me
    ? await getShipsgoExecutiveProfileForUser(me.email)
    : null;

  if (myExecutiveProfile) {
    return { allowed: true, status: 200 };
  }

  return {
    allowed: false,
    status: 403,
    error: 'No tienes permisos para eliminar este tracking',
  };
}

function getRequestedDocumentOwnerUsername(req: VercelRequest): string | undefined {
  const headerValue = req.headers['x-owner-username'];
  const headerOwner = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const queryOwner = Array.isArray(req.query.ownerUsername)
    ? req.query.ownerUsername[0]
    : req.query.ownerUsername;
  const bodyOwner = (req.body as any)?.ownerUsername;

  for (const candidate of [headerOwner, queryOwner, bodyOwner]) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return undefined;
}

async function resolveDocumentOwnerUsername(
  currentUser: AuthPayload,
  requestedOwnerUsername?: unknown,
): Promise<string> {
  const me = await User.findOne({ email: currentUser.sub }).populate('ejecutivoId');

  if (!me) {
    throw new Error('Usuario no encontrado');
  }

  const ownUsernames = (Array.isArray(me.usernames) && me.usernames.length > 0
    ? me.usernames
    : [me.username]
  )
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  const requested = String(requestedOwnerUsername || '').trim();

  if (!requested) {
    return ownUsernames[0] || me.username;
  }

  if (ownUsernames.includes(requested)) {
    return requested;
  }

  if (me.username !== 'Ejecutivo') {
    throw new Error('No tienes permiso para acceder a esta cuenta');
  }

  let ejecutivoDoc = me.ejecutivoId as any;
  if (!ejecutivoDoc || !ejecutivoDoc._id) {
    const lookupEmail = String(me.email || '').toLowerCase().trim();
    ejecutivoDoc = await Ejecutivo.findOne({ email: lookupEmail });
  }

  const targetClientQuery = {
    username: { $ne: 'Ejecutivo' },
    $or: [{ username: requested }, { usernames: requested }],
  };

  const hasGlobalExecutiveAccess = !!(
    ejecutivoDoc?.roles?.administrador || ejecutivoDoc?.roles?.operaciones
  );

  if (hasGlobalExecutiveAccess) {
    const targetClient = await User.exists(targetClientQuery);
    if (targetClient) {
      return requested;
    }
    throw new Error('Cliente no encontrado');
  }

  const ejecutivoObjectId = ejecutivoDoc?._id ?? null;
  if (!ejecutivoObjectId) {
    throw new Error('No tienes permiso para acceder a esta cuenta');
  }

  const targetClient = await User.exists({
    ...targetClientQuery,
    ejecutivoId: ejecutivoObjectId,
  });

  if (!targetClient) {
    throw new Error('No tienes permiso para acceder a esta cuenta');
  }

  return requested;
}

function buildDocumentOwnerScopeQuery(ownerUsername: string) {
  if (ownerUsername === 'Ejecutivo') {
    return { usuarioId: ownerUsername };
  }

  return {
    $or: [{ usuarioId: ownerUsername }, { usuarioId: 'Ejecutivo' }],
  };
}

function documentBelongsToOwnerScope(
  documento: { usuarioId?: string | null },
  ownerUsername: string,
): boolean {
  if (documento.usuarioId === ownerUsername) {
    return true;
  }

  return ownerUsername !== 'Ejecutivo' && documento.usuarioId === 'Ejecutivo';
}

// ============================================================
// HELPER: NOTIFICACIÓN POR EMAIL AL SUBIR DOCUMENTO
// ============================================================

async function sendDocumentUploadNotification(opts: {
  uploaderEmail: string;
  ownerUsername: string;
  numero: string;
  tipoOperacion: string;
  tipoDocumento: string;
  nombreArchivo: string;
}): Promise<void> {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.warn('[doc-notification] BREVO_API_KEY not set, skipping email');
      return;
    }

    const ownerUser = await User.findOne({
      $or: [{ username: opts.ownerUsername }, { usernames: opts.ownerUsername }],
    }).populate('ejecutivoId');

    const uploaderUser = await User.findOne({ email: opts.uploaderEmail }).populate('ejecutivoId');

    let ejecutivoEmail: string | null = null;
    if (ownerUser?.ejecutivoId && typeof (ownerUser.ejecutivoId as any).email === 'string') {
      ejecutivoEmail = (ownerUser.ejecutivoId as any).email;
    } else if (uploaderUser?.ejecutivoId && typeof (uploaderUser.ejecutivoId as any).email === 'string') {
      ejecutivoEmail = (uploaderUser.ejecutivoId as any).email;
    }

    const preference = await TrackingEmailPreference.findOne({
      reference: opts.ownerUsername,
    }).lean();
    const trackingEmails: string[] = preference?.emails || [];

    const allRecipients = new Set<string>();
    // Operaciones siempre recibe notificaciones de documentos
    allRecipients.add('operaciones@seemanngroup.com');
    if (ejecutivoEmail) allRecipients.add(ejecutivoEmail.toLowerCase().trim());
    for (const email of trackingEmails) {
      const normalized = email.toLowerCase().trim();
      if (normalized && normalized !== 'noreply@sphereglobal.io') {
        allRecipients.add(normalized);
      }
    }

    if (allRecipients.size === 0) {
      console.log('[doc-notification] No recipients found, skipping');
      return;
    }

    const subidoPor = uploaderUser?.nombreuser || uploaderUser?.username || opts.uploaderEmail;

    const emailData: DocumentUploadEmailData = {
      numero: opts.numero,
      tipoOperacion: opts.tipoOperacion,
      tipoDocumento: opts.tipoDocumento,
      nombreArchivo: opts.nombreArchivo,
      subidoPor,
    };

    const subject = getDocumentUploadEmailSubject(emailData);
    const htmlContent = buildDocumentUploadEmailHTML(emailData);
    const toList = Array.from(allRecipients).map((email) => ({ email }));

    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Seemann Cloud · Documentos', email: 'noreply@sphereglobal.io' },
        to: toList,
        subject,
        htmlContent,
      }),
    });

    if (!brevoResponse.ok) {
      const errorText = await brevoResponse.text();
      console.error('[doc-notification] Brevo error:', brevoResponse.status, errorText);
    } else {
      console.log(`[doc-notification] Email sent to ${toList.length} recipients for ${opts.tipoOperacion} #${opts.numero}`);
    }
  } catch (err) {
    console.error('[doc-notification] Error sending notification:', err);
  }
}

// ============================================================
// MODELO DE DOCUMENTOS (AIR SHIPMENTS)
// ============================================================

type TipoDocumentoAirShipment =
  | 'Documento de transporte Internacional (AWB)'
  | 'Facturas asociados al servicio'
  | 'Invoice'
  | 'Packing List'
  | 'Certificado de Origen'
  | 'Póliza de Seguro'
  | 'Declaración de ingreso (DNI)'
  | 'Guía de despacho'
  | 'SDA'
  | 'Papeleta'
  | 'Transporte local'
  | 'Otros Documentos';

interface IAirShipmentDocumento {
  shipmentId: string;
  tipo: TipoDocumentoAirShipment;
  nombreArchivo: string;
  tipoArchivo: string;
  tamanoBytes: number;
  contenidoBase64: string;
  subidoPor: string;   // email (currentUser.sub)
  usuarioId: string;   // username (currentUser.username)
}

interface IAirShipmentDocumentoDoc extends IAirShipmentDocumento, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

type AirShipmentDocumentoModel = mongoose.Model<IAirShipmentDocumentoDoc>;

const AirShipmentDocumentoSchema = new mongoose.Schema<IAirShipmentDocumentoDoc>(
  {
    shipmentId: { type: String, required: true, index: true },
    tipo: {
      type: String,
      required: true,
      enum: [
        'Documento de transporte Internacional (AWB)',
        'Facturas asociados al servicio',
        'Invoice',
        'Packing List',
        'Certificado de Origen',
        'Póliza de Seguro',
        'Declaración de ingreso (DNI)',
        'Guía de despacho',
        'SDA',
        'Papeleta',
        'Transporte local',
        'Otros Documentos',
      ],
    },
    nombreArchivo: { type: String, required: true },
    tipoArchivo: { type: String, required: true },
    tamanoBytes: { type: Number, required: true },
    contenidoBase64: { type: String, required: true },
    subidoPor: { type: String, required: true },
    usuarioId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

AirShipmentDocumentoSchema.index({ shipmentId: 1, usuarioId: 1 });

const AirShipmentDocumento =
  (mongoose.models.AirShipmentDocumento ||
    mongoose.model<IAirShipmentDocumentoDoc>('AirShipmentDocumento', AirShipmentDocumentoSchema)) as AirShipmentDocumentoModel;


// ============================================================
// MODELO DE DOCUMENTOS (OCEAN SHIPMENTS)
// ============================================================

type TipoDocumentoOceanShipment =
  | 'Bill of Lading (BL)'
  | 'Facturas asociadas al servicio'
  | 'Endoso'
  | 'Invoice'
  | 'Packing List'
  | 'Certificado de Origen'
  | 'Póliza de Seguro'
  | 'Declaración de ingreso (DIN)'
  | 'Guía de despacho / Delivery Order'
  | 'SDA'
  | 'Papeleta'
  | 'Transporte local'
  | 'Warehouse Receipt'
  | "Mate's Receipt / Received for shipment"
  | 'Otros Documentos';

interface IOceanShipmentDocumento {
  shipmentId: string;
  tipo: TipoDocumentoOceanShipment;
  nombreArchivo: string;
  tipoArchivo: string;
  tamanoBytes: number;
  contenidoBase64: string;
  subidoPor: string;
  usuarioId: string;
}

interface IOceanShipmentDocumentoDoc extends IOceanShipmentDocumento, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

type OceanShipmentDocumentoModel = mongoose.Model<IOceanShipmentDocumentoDoc>;

const OceanShipmentDocumentoSchema = new mongoose.Schema<IOceanShipmentDocumentoDoc>(
  {
    shipmentId: { type: String, required: true, index: true },
    tipo: {
      type: String,
      required: true,
      enum: [
        'Bill of Lading (BL)',
        'Facturas asociadas al servicio',
        'Endoso',
        'Invoice',
        'Packing List',
        'Certificado de Origen',
        'Póliza de Seguro',
        'Declaración de ingreso (DIN)',
        'Guía de despacho / Delivery Order',
        'SDA',
        'Papeleta',
        'Transporte local',
        'Warehouse Receipt',
        "Mate's Receipt / Received for shipment",
        'Otros Documentos',
      ],
    },
    nombreArchivo: { type: String, required: true },
    tipoArchivo: { type: String, required: true },
    tamanoBytes: { type: Number, required: true },
    contenidoBase64: { type: String, required: true },
    subidoPor: { type: String, required: true },
    usuarioId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

OceanShipmentDocumentoSchema.index({ shipmentId: 1, usuarioId: 1 });

const OceanShipmentDocumento =
  (mongoose.models.OceanShipmentDocumento ||
    mongoose.model<IOceanShipmentDocumentoDoc>('OceanShipmentDocumento', OceanShipmentDocumentoSchema)) as OceanShipmentDocumentoModel;

// ============================================================
// MODELO GROUND-SHIPMENT DOCUMENTOS
// ============================================================

type TipoDocumentoGroundShipment =
  | 'Carta de porte / Guía de remisión / CMR'
  | 'Prueba de entrega (POD / remito firmado)'
  | 'Factura comercial (Invoice)'
  | 'Packing List'
  | 'Póliza/Certificado de seguro de transporte'
  | 'Permisos/autorizaciones (sobredimensionada, especiales)'
  | 'Documentación del vehículo y conductor (licencia, tarjeta)'
  | 'Documentos aduaneros/transito (T1, TIR, manifiesto)'
  | 'Documentos ADR / MSDS (mercancías peligrosas)'
  | 'Orden/confirmación y factura del transportista (freight invoice)'
  | 'Delivery Order / Warehouse Receipt (si hay almacenaje)'
  | 'Certificado de Origen'
  | 'Papeleta'
  | 'Otros Documentos';

interface IGroundShipmentDocumento {
  shipmentId: string;
  tipo: TipoDocumentoGroundShipment;
  nombreArchivo: string;
  tipoArchivo: string;
  tamanoBytes: number;
  contenidoBase64: string;
  subidoPor: string;
  usuarioId: string;
}

interface IGroundShipmentDocumentoDoc extends IGroundShipmentDocumento, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

type GroundShipmentDocumentoModel = mongoose.Model<IGroundShipmentDocumentoDoc>;

const GroundShipmentDocumentoSchema = new mongoose.Schema<IGroundShipmentDocumentoDoc>(
  {
    shipmentId: { type: String, required: true, index: true },
    tipo: {
      type: String,
      required: true,
      enum: [
        'Carta de porte / Guía de remisión / CMR',
        'Prueba de entrega (POD / remito firmado)',
        'Factura comercial (Invoice)',
        'Packing List',
        'Póliza/Certificado de seguro de transporte',
        'Permisos/autorizaciones (sobredimensionada, especiales)',
        'Documentación del vehículo y conductor (licencia, tarjeta)',
        'Documentos aduaneros/transito (T1, TIR, manifiesto)',
        'Documentos ADR / MSDS (mercancías peligrosas)',
        'Orden/confirmación y factura del transportista (freight invoice)',
        'Delivery Order / Warehouse Receipt (si hay almacenaje)',
        'Certificado de Origen',
        'Papeleta',
        'Otros Documentos',
      ],
    },
    nombreArchivo: { type: String, required: true },
    tipoArchivo: { type: String, required: true },
    tamanoBytes: { type: Number, required: true },
    contenidoBase64: { type: String, required: true },
    subidoPor: { type: String, required: true },
    usuarioId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

GroundShipmentDocumentoSchema.index({ shipmentId: 1, usuarioId: 1 });

const GroundShipmentDocumento =
  (mongoose.models.GroundShipmentDocumento ||
    mongoose.model<IGroundShipmentDocumentoDoc>('GroundShipmentDocumento', GroundShipmentDocumentoSchema)) as GroundShipmentDocumentoModel;


// ============================================================
// MODELO DE DOCUMENTOS
// ============================================================

interface IDocumento {
  quoteId: string;
  tipo: 'Invoice' | 'Packing List' | 'Certificado de Origen' | 'Póliza de seguro' | 'Guía de Despacho' | 'Declaración de Ingreso';
  nombreArchivo: string;
  tipoArchivo: string;
  tamanoBytes: number;
  contenidoBase64: string;
  subidoPor: string;
  usuarioId: string;
}

interface IDocumentoDoc extends IDocumento, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

type DocumentoModel = mongoose.Model<IDocumentoDoc>;

const DocumentoSchema = new mongoose.Schema<IDocumentoDoc>(
  {
    quoteId: { type: String, required: true, index: true },
    tipo: { 
      type: String, 
      required: true,
      enum: ['Invoice', 'Packing List', 'Certificado de Origen', 'Póliza de seguro', 'Guía de Despacho', 'Declaración de Ingreso']
    },
    nombreArchivo: { type: String, required: true },
    tipoArchivo: { type: String, required: true },
    tamanoBytes: { type: Number, required: true },
    contenidoBase64: { type: String, required: true },
    subidoPor: { type: String, required: true },
    usuarioId: { type: String, required: true, index: true }
  },
  { timestamps: true }
);

DocumentoSchema.index({ quoteId: 1, usuarioId: 1 });

const Documento = (mongoose.models.Documento || 
  mongoose.model<IDocumentoDoc>('Documento', DocumentoSchema)) as DocumentoModel;

// ============================================================
// MODELO DE PDF DE COTIZACIONES
// ============================================================

interface IQuotePDF {
  quoteNumber: string;
  nombreArchivo: string;
  tamanoBytes: number;
  contenidoBase64: string;
  tipoServicio: 'AIR' | 'FCL' | 'LCL';
  origen: string;
  destino: string;
  usuarioId: string;
  subidoPor: string;
}

interface IQuotePDFDoc extends IQuotePDF, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

type QuotePDFModel = mongoose.Model<IQuotePDFDoc>;

const QuotePDFSchema = new mongoose.Schema<IQuotePDFDoc>(
  {
    quoteNumber: { type: String, required: true, index: true },
    nombreArchivo: { type: String, required: true },
    tamanoBytes: { type: Number, required: true },
    contenidoBase64: { type: String, required: true },
    tipoServicio: { type: String, required: true, enum: ['AIR', 'FCL', 'LCL'] },
    origen: { type: String, default: '' },
    destino: { type: String, default: '' },
    usuarioId: { type: String, required: true, index: true },
    subidoPor: { type: String, required: true },
  },
  { timestamps: true }
);

QuotePDFSchema.index({ quoteNumber: 1, usuarioId: 1 }, { unique: true });

const QuotePDF = (mongoose.models.QuotePDF || 
  mongoose.model<IQuotePDFDoc>('QuotePDF', QuotePDFSchema)) as QuotePDFModel;

// ============================================================
// CONSTANTES Y FUNCIONES AUXILIARES PARA DOCUMENTOSs
// ============================================================

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

function validateBase64(base64String: string): boolean {
  try {
    if (!base64String.includes('base64,')) {
      return false;
    }
    const base64Content = base64String.split('base64,')[1];
    const decoded = Buffer.from(base64Content, 'base64').toString('base64');
    return decoded === base64Content;
  } catch {
    return false;
  }
}

function getBase64Size(base64String: string): number {
  const base64Content = base64String.split('base64,')[1];
  const padding = (base64Content.match(/=/g) || []).length;
  return (base64Content.length * 3) / 4 - padding;
}

function getMimeTypeFromBase64(base64String: string): string | null {
  const match = base64String.match(/data:([^;]+);base64,/);
  return match ? match[1] : null;
}

// ============================================================
// MODELO DE AUDITORÍA
// ============================================================

interface IAuditLog {
  usuario: string;
  email: string;
  rol: 'cliente' | 'ejecutivo';
  ejecutivo: string | null;
  ejecutivoEmail: string | null;
  accion: string;
  categoria: string;
  descripcion: string;
  detalles: Record<string, unknown>;
  clienteAfectado: string | null;
  ip: string | null;
}

interface IAuditLogDoc extends IAuditLog, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

type AuditLogModel = mongoose.Model<IAuditLogDoc>;

const AuditLogSchema = new mongoose.Schema<IAuditLogDoc>(
  {
    usuario: { type: String, required: true, index: true },
    email: { type: String, required: true, index: true },
    rol: { type: String, required: true, enum: ['cliente', 'ejecutivo'] },
    ejecutivo: { type: String, default: null },
    ejecutivoEmail: { type: String, default: null },
    accion: { type: String, required: true, index: true },
    categoria: { type: String, required: true, index: true },
    descripcion: { type: String, required: true },
    detalles: { type: mongoose.Schema.Types.Mixed, default: {} },
    clienteAfectado: { type: String, default: null, index: true },
    ip: { type: String, default: null },
  },
  { timestamps: true }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ categoria: 1, createdAt: -1 });
AuditLogSchema.index({ usuario: 1, createdAt: -1 });

const AuditLog = (mongoose.models.AuditLog || mongoose.model<IAuditLogDoc>('AuditLog', AuditLogSchema)) as AuditLogModel;

// ============================================================
// MODELO ALUMNOS PRÁCTICA
// ============================================================
interface IAlumnoPuntaje {
  puntaje: number;
  tipoEntrenamiento: string;
  fecha: Date;
}

interface IAlumno {
  nombre: string;
  tipoEntrenamiento: string;
  puntajeTotal: number;
  historial: IAlumnoPuntaje[];
  activo: boolean;
}

interface IAlumnoDoc extends IAlumno, mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

type AlumnoModel = mongoose.Model<IAlumnoDoc>;

const AlumnoPuntajeSchema = new mongoose.Schema({
  puntaje: { type: Number, required: true },
  tipoEntrenamiento: { type: String, required: true, trim: true },
  fecha: { type: Date, default: Date.now },
}, { _id: true });

const AlumnoSchema = new mongoose.Schema<IAlumnoDoc>(
  {
    nombre: { type: String, required: true, trim: true },
    tipoEntrenamiento: { type: String, required: true, trim: true },
    puntajeTotal: { type: Number, default: 0 },
    historial: { type: [AlumnoPuntajeSchema], default: [] },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AlumnoSchema.index({ puntajeTotal: -1 });
AlumnoSchema.index({ nombre: 1 });

const Alumno = (mongoose.models.Alumno || mongoose.model<IAlumnoDoc>('Alumno', AlumnoSchema)) as AlumnoModel;

// Reutilizar la conexión de mongoose en serverless
let cachedDb: typeof mongoose | null = null;

async function connectDB() {
  if (cachedDb) return cachedDb;
  const db = await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  cachedDb = db;
  return db;
}

/** =========================
 *  Helpers de auth para rutas
 *  ========================= */
function extractBearerToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
}

function requireAuth(req: VercelRequest): AuthPayload {
  const token = extractBearerToken(req);
  if (!token) throw new Error('No auth token');
  try {
    return verifyToken(token);
  } catch {
    throw new Error('Invalid token');
  }
}

/** =========================
 *  Cache de tokens Linbis (en memoria)
 *  ========================= */
interface LinbisTokenCache {
  refresh_token: string;
  access_token?: string;
  access_token_expiry?: number;
}

let linbisTokenCache: LinbisTokenCache = {
  refresh_token: process.env.LINBIS_REFRESH_TOKEN || '',
  access_token: undefined,
  access_token_expiry: undefined
};

/** =========================
 *  Handler principal
 *  ========================= */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    await connectDB();

    const { url, method } = req;
    const path = url?.split('?')[0] || '';

    // ============================================================
    // RUTAS DE AUTENTICACIÓN
    // ============================================================

    // POST /api/login
    if (path === '/api/login' && method === 'POST') {
      const { email, password } = (req.body as any) || {};

      if (!email || !password) {
        return res.status(400).json({ error: 'Faltan campos' });
      }

      const lookupEmail = String(email).toLowerCase().trim();
      const user = await User.findOne({ email: lookupEmail }).populate('ejecutivoId');

      if (!user) {
        console.log('[login] email no encontrado:', lookupEmail);
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      if (!user.passwordHash) {
        console.error('[login] passwordHash ausente para', user.email);
        return res.status(500).json({ error: 'Usuario mal configurado' });
      }

      const ok = bcrypt.compareSync(String(password), user.passwordHash);
      if (!ok) {
        console.log('[login] password incorrecto para', user.email);
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const token = signToken({ sub: user.email, username: user.username });
      
      const ejecutivo = user.ejecutivoId as any;

      // Buscar roles del ejecutivo
      let roles = null;
      if (user.username === 'Ejecutivo') {
        let ejDoc = ejecutivo;
        if (!ejDoc || !ejDoc._id) {
          ejDoc = await Ejecutivo.findOne({ email: user.email });
        }
        if (ejDoc) {
          roles = {
            administrador: ejDoc.roles?.administrador || false,
            pricing: ejDoc.roles?.pricing || false,
            ejecutivo: ejDoc.roles?.ejecutivo !== false,
            proveedor: ejDoc.roles?.proveedor || false,
            operaciones: ejDoc.roles?.operaciones || false,
          };
        }
      }

      // Construir usernames
      const usernames = (user.usernames && user.usernames.length > 0)
        ? user.usernames
        : [user.username];

      return res.json({
        token,
        user: { 
          email: user.email, 
          username: user.username,
          usernames,
          nombreuser: user.nombreuser,
          ejecutivo: ejecutivo ? {
            id: ejecutivo._id,
            nombre: ejecutivo.nombre,
            email: ejecutivo.email,
            telefono: ejecutivo.telefono
          } : null,
          roles,
        },
      });
    }

    // POST /api/change-password
    if (path === '/api/change-password' && method === 'POST') {
      try {
        const currentUser = requireAuth(req);
        const { currentPassword, newPassword } = (req.body as any) || {};

        if (!currentPassword || !newPassword) {
          return res.status(400).json({ error: 'Debes ingresar la contraseña actual y la nueva.' });
        }

        const user = await User.findOne({ email: currentUser.sub });
        if (!user) {
          return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        if (!user.passwordHash) {
          return res.status(500).json({ error: 'Usuario mal configurado.' });
        }

        const ok = bcrypt.compareSync(String(currentPassword), user.passwordHash);
        if (!ok) {
          return res.status(401).json({ error: 'La contraseña actual es incorrecta.' });
        }

        user.passwordHash = bcrypt.hashSync(String(newPassword), 12);
        await user.save();

        return res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
      } catch (e) {
        console.error('[change-password] error:', e);
        return res.status(500).json({ error: 'Error interno' });
      }
    }

    // GET /api/me
    if (path === '/api/me' && method === 'GET') {
      const token = extractBearerToken(req);
      if (!token) {
        return res.status(401).json({ error: 'No auth token' });
      }

      try {
        const decoded = verifyToken(token);
        const user = await User.findOne({ email: decoded.sub }).populate('ejecutivoId');
        
        if (!user) {
          return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const ejecutivo = user.ejecutivoId as any;

        // Buscar roles del ejecutivo
        let roles = null;
        if (user.username === 'Ejecutivo') {
          let ejDoc = ejecutivo;
          if (!ejDoc || !ejDoc._id) {
            ejDoc = await Ejecutivo.findOne({ email: user.email });
          }
          if (ejDoc) {
            roles = {
              administrador: ejDoc.roles?.administrador || false,
              pricing: ejDoc.roles?.pricing || false,
              ejecutivo: ejDoc.roles?.ejecutivo !== false,
              proveedor: ejDoc.roles?.proveedor || false,
              operaciones: ejDoc.roles?.operaciones || false,
            };
          }
        }

        // Construir usernames
        const usernames = (user.usernames && user.usernames.length > 0)
          ? user.usernames
          : [user.username];

        return res.json({ 
          user: {
            sub: user.email,
            username: user.username,
            usernames,
            nombreuser: user.nombreuser,
            ejecutivo: ejecutivo ? {
              id: ejecutivo._id,
              nombre: ejecutivo.nombre,
              email: ejecutivo.email,
              telefono: ejecutivo.telefono
            } : null,
            roles,
          }
        });
      } catch {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    if (path === '/api/tracking-email-preferences' && method === 'GET') {
      try {
        const currentUser = requireAuth(req);
        const reference = String(req.query.reference || '').trim();

        if (!reference) {
          return res.status(400).json({ error: 'reference es un parámetro requerido' });
        }

        const canManageReference = await canManageShipsgoReference(
          currentUser,
          reference,
        );

        if (!canManageReference) {
          return res.status(403).json({
            error: 'No puedes acceder a las configuraciones de otra cuenta',
          });
        }

        const preference = await TrackingEmailPreference.findOne({ reference }).lean();

        return res.json({
          success: true,
          preference: {
            reference,
            emails: preference?.emails || [],
            updatedAt: preference?.updatedAt || null,
          },
        });
      } catch (error: unknown) {
        if (
          error instanceof Error &&
          (error.message === 'No auth token' || error.message === 'Invalid token')
        ) {
          return res.status(401).json({ error: error.message });
        }

        console.error('[tracking-email-preferences:get] error:', error);
        return res.status(500).json({ error: 'Error interno' });
      }
    }

    if (path === '/api/tracking-email-preferences' && method === 'PUT') {
      try {
        const currentUser = requireAuth(req);
        const requestBody = (req.body ?? {}) as {
          reference?: unknown;
          emails?: unknown;
        };
        const reference = String(requestBody.reference || '').trim();

        if (!reference) {
          return res.status(400).json({ error: 'reference es un campo requerido' });
        }

        const canManageReference = await canManageShipsgoReference(
          currentUser,
          reference,
        );

        if (!canManageReference) {
          return res.status(403).json({
            error: 'No puedes modificar las configuraciones de otra cuenta',
          });
        }

        const validation = validateTrackingPreferenceEmails(requestBody.emails);

        if (validation.error || !validation.emails) {
          return res.status(400).json({ error: validation.error || 'emails inválidos' });
        }

        if (validation.emails.length === 0) {
          await TrackingEmailPreference.deleteOne({ reference });

          return res.json({
            success: true,
            preference: {
              reference,
              emails: [],
              updatedAt: null,
            },
          });
        }

        const preference = await TrackingEmailPreference.findOneAndUpdate(
          { reference },
          {
            reference,
            emails: validation.emails,
            updatedBy: currentUser.sub,
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          },
        ).lean();

        return res.json({
          success: true,
          preference: {
            reference,
            emails: preference?.emails || [],
            updatedAt: preference?.updatedAt || null,
          },
        });
      } catch (error: unknown) {
        if (
          error instanceof Error &&
          (error.message === 'No auth token' || error.message === 'Invalid token')
        ) {
          return res.status(401).json({ error: error.message });
        }

        console.error('[tracking-email-preferences:put] error:', error);
        return res.status(500).json({ error: 'Error interno' });
      }
    }

    // ============================================================
    // RUTAS DE EJECUTIVO (ver sus clientes)
    // ============================================================

    // GET /api/ejecutivo/clientes
    if (path === '/api/ejecutivo/clientes' && method === 'GET') {
      try {
        const currentUser = requireAuth(req);

        const me = await User.findOne({ email: currentUser.sub }).populate('ejecutivoId');

        if (!me) {
          return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        let ejecutivoObjectId: any = null;

        if (me.ejecutivoId) {
          ejecutivoObjectId = (me.ejecutivoId as any)._id ?? me.ejecutivoId;
        } else {
          const lookupEmail = String(me.email).toLowerCase().trim();
          const ej = await Ejecutivo.findOne({ email: lookupEmail });
          if (ej) ejecutivoObjectId = ej._id;
        }

        if (!ejecutivoObjectId) {
          return res.json({ clientes: [] });
        }

        const clientes = await User.find(
          { ejecutivoId: ejecutivoObjectId, username: { $ne: 'Ejecutivo' } },
          { passwordHash: 0 }
        ).sort({ createdAt: -1 });

        return res.json({
          clientes: clientes.map((c: any) => ({
            id: c._id,
            email: c.email,
            username: c.username,
            nombreuser: c.nombreuser,
            createdAt: c.createdAt
          }))
        });
      } catch (e: any) {
        if (e?.message === 'No auth token' || e?.message === 'Invalid token') {
          return res.status(401).json({ error: e.message });
        }
        console.error('[ejecutivo/clientes] error:', e);
        return res.status(500).json({ error: 'Error interno' });
      }
    }

    // ============================================================
    // RUTAS DE EJECUTIVOS
    // ============================================================

    // GET /api/ejecutivos - ✅ NUEVO ENDPOINT AGREGADO
    if (path === '/api/ejecutivos' && method === 'GET') {
      try {
        const currentUser = requireAuth(req);
        if (currentUser.username !== 'Ejecutivo') {
          return res.status(403).json({ error: 'No tienes permisos' });
        }
        
        const ejecutivos = await Ejecutivo.find({ activo: true })
          .select('nombre email telefono')
          .sort({ nombre: 1 });

        return res.json({
          ejecutivos: ejecutivos.map(ej => ({
            id: ej._id,
            nombre: ej.nombre,
            email: ej.email,
            telefono: ej.telefono
          }))
        });
      } catch (e: any) {
        if (e?.message === 'No auth token' || e?.message === 'Invalid token') {
          return res.status(401).json({ error: e.message });
        }
        console.error('[ejecutivos] Error:', e);
        return res.status(500).json({ error: 'Error al obtener ejecutivos' });
      }
    }

    // GET /api/admin/ejecutivos
    if (path === '/api/admin/ejecutivos' && method === 'GET') {
      try {
        const currentUser = requireAuth(req);
        if (currentUser.username !== 'Ejecutivo') {
          return res.status(403).json({ error: 'No tienes permisos' });
        }

        const ejecutivos = await Ejecutivo.find().sort({ createdAt: -1 });

        return res.json({
          success: true,
          ejecutivos: ejecutivos.map((e: any) => ({
            id: e._id,
            nombre: e.nombre,
            email: e.email,
            telefono: e.telefono,
            activo: e.activo,
            roles: {
              administrador: e.roles?.administrador || false,
              pricing: e.roles?.pricing || false,
              ejecutivo: e.roles?.ejecutivo !== false,
              proveedor: e.roles?.proveedor || false,
              operaciones: e.roles?.operaciones || false,
            },
            createdAt: e.createdAt
          }))
        });
      } catch (e: any) {
        if (e?.message === 'No auth token' || e?.message === 'Invalid token') {
          return res.status(401).json({ error: e.message });
        }
        console.error('[admin] Error listando ejecutivos:', e);
        return res.status(500).json({ error: 'Error al listar ejecutivos' });
      }
    }

    // POST /api/admin/ejecutivos
    if (path === '/api/admin/ejecutivos' && method === 'POST') {
      try {
        const currentUser = requireAuth(req);
        if (currentUser.username !== 'Ejecutivo') {
          return res.status(403).json({ error: 'No tienes permisos' });
        }

        const { nombre, email, telefono, roles } = (req.body as any) || {};
        if (!nombre || !email || !telefono) {
          return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        // Validar roles si se envían
        if (roles) {
          const { administrador, pricing, ejecutivo: rolEjecutivo, proveedor: rolProveedor, operaciones: rolOperaciones } = roles;
          if (administrador && (pricing || rolEjecutivo || rolProveedor || rolOperaciones)) {
            return res.status(400).json({ error: 'El rol Administrador no se puede combinar con otros roles' });
          }
          if (rolProveedor && (administrador || pricing || rolEjecutivo || rolOperaciones)) {
            return res.status(400).json({ error: 'El rol Proveedor no se puede combinar con otros roles' });
          }
          if (rolOperaciones && (administrador || pricing || rolEjecutivo || rolProveedor)) {
            return res.status(400).json({ error: 'El rol Operaciones no se puede combinar con otros roles' });
          }
          if (!administrador && !pricing && !rolEjecutivo && !rolProveedor && !rolOperaciones) {
            return res.status(400).json({ error: 'Debe tener al menos un rol asignado' });
          }
        }

        const normalizedEmail = String(email).toLowerCase().trim();
        const existingEjecutivo = await Ejecutivo.findOne({ email: normalizedEmail });
        if (existingEjecutivo) {
          return res.status(400).json({ error: 'Ya existe un ejecutivo con este email' });
        }

        const newEjecutivo = new Ejecutivo({
          nombre: String(nombre).trim(),
          email: normalizedEmail,
          telefono: String(telefono).trim(),
          activo: true,
          ...(roles ? { roles } : {})
        });

        await newEjecutivo.save();

        return res.json({
          success: true,
          message: 'Ejecutivo creado exitosamente',
          ejecutivo: {
            id: newEjecutivo._id,
            nombre: newEjecutivo.nombre,
            email: newEjecutivo.email,
            telefono: newEjecutivo.telefono
          }
        });
      } catch (e: any) {
        if (e?.message === 'No auth token' || e?.message === 'Invalid token') {
          return res.status(401).json({ error: e.message });
        }
        console.error('[admin] Error creando ejecutivo:', e);
        return res.status(500).json({ error: 'Error al crear ejecutivo' });
      }
    }

    // PUT /api/admin/ejecutivos/:id
    if (path?.startsWith('/api/admin/ejecutivos/') && method === 'PUT') {
      try {
        const currentUser = requireAuth(req);
        if (currentUser.username !== 'Ejecutivo') {
          return res.status(403).json({ error: 'No tienes permisos' });
        }

        const id = path.split('/').pop();
        const { nombre, email, telefono, activo, roles } = (req.body as any) || {};

        const ejecutivo = await Ejecutivo.findById(id);
        if (!ejecutivo) {
          return res.status(404).json({ error: 'Ejecutivo no encontrado' });
        }

        // Validar roles si se envían
        if (roles) {
          const { administrador, pricing, ejecutivo: rolEjecutivo, proveedor: rolProveedor, operaciones: rolOperaciones } = roles;
          if (administrador && (pricing || rolEjecutivo || rolProveedor || rolOperaciones)) {
            return res.status(400).json({ error: 'El rol Administrador no se puede combinar con otros roles' });
          }
          if (rolProveedor && (administrador || pricing || rolEjecutivo || rolOperaciones)) {
            return res.status(400).json({ error: 'El rol Proveedor no se puede combinar con otros roles' });
          }
          if (rolOperaciones && (administrador || pricing || rolEjecutivo || rolProveedor)) {
            return res.status(400).json({ error: 'El rol Operaciones no se puede combinar con otros roles' });
          }
          if (!administrador && !pricing && !rolEjecutivo && !rolProveedor && !rolOperaciones) {
            return res.status(400).json({ error: 'Debe tener al menos un rol asignado' });
          }
          ejecutivo.roles = roles;
        }

        if (nombre) ejecutivo.nombre = String(nombre).trim();
        if (email) ejecutivo.email = String(email).toLowerCase().trim();
        if (telefono) ejecutivo.telefono = String(telefono).trim();
        if (activo !== undefined) ejecutivo.activo = Boolean(activo);

        await ejecutivo.save();

        return res.json({
          success: true,
          message: 'Ejecutivo actualizado exitosamente',
          ejecutivo: {
            id: ejecutivo._id,
            nombre: ejecutivo.nombre,
            email: ejecutivo.email,
            telefono: ejecutivo.telefono,
            activo: ejecutivo.activo,
            roles: {
              administrador: ejecutivo.roles?.administrador || false,
              pricing: ejecutivo.roles?.pricing || false,
              ejecutivo: ejecutivo.roles?.ejecutivo !== false,
              proveedor: ejecutivo.roles?.proveedor || false,
              operaciones: ejecutivo.roles?.operaciones || false,
            }
          }
        });
      } catch (e: any) {
        if (e?.message === 'No auth token' || e?.message === 'Invalid token') {
          return res.status(401).json({ error: e.message });
        }
        console.error('[admin] Error actualizando ejecutivo:', e);
        return res.status(500).json({ error: 'Error al actualizar ejecutivo' });
      }
    }

    // DELETE /api/admin/ejecutivos/:id
    if (path?.startsWith('/api/admin/ejecutivos/') && method === 'DELETE') {
      try {
        const currentUser = requireAuth(req);
        if (currentUser.username !== 'Ejecutivo') {
          return res.status(403).json({ error: 'No tienes permisos' });
        }

        const id = path.split('/').pop();

        const clientesAsignados = await User.countDocuments({ ejecutivoId: id });
        if (clientesAsignados > 0) {
          return res.status(400).json({ 
            error: `No se puede eliminar. Hay ${clientesAsignados} cliente(s) asignado(s) a este ejecutivo.` 
          });
        }

        await Ejecutivo.findByIdAndDelete(id);

        return res.json({
          success: true,
          message: 'Ejecutivo eliminado exitosamente'
        });
      } catch (e: any) {
        if (e?.message === 'No auth token' || e?.message === 'Invalid token') {
          return res.status(401).json({ error: e.message });
        }
        console.error('[admin] Error eliminando ejecutivo:', e);
        return res.status(500).json({ error: 'Error al eliminar ejecutivo' });
      }
    }

    // ============================================================
    // RUTAS DE ADMINISTRACIÓN DE USUARIOS
    // ============================================================

    // POST /api/admin/create-user
    if (path === '/api/admin/create-user' && method === 'POST') {
      try {
        const currentUser = requireAuth(req);
        if (currentUser.username !== 'Ejecutivo') {
          return res.status(403).json({ error: 'No tienes permisos para crear usuarios' });
        }

        const { email, username, nombreuser, password, ejecutivoId, usernames } = (req.body as any) || {};
        if (!email || !username || !nombreuser || !password) {
          return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const normalizedEmail = String(email).toLowerCase().trim();
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
          return res.status(400).json({ error: 'El email ya está registrado' });
        }

        const passwordHash = bcrypt.hashSync(String(password), 12);

        // Construir array de usernames
        const usernamesArray = Array.isArray(usernames) && usernames.length > 0
          ? usernames.map((u: string) => String(u).trim()).filter(Boolean)
          : [String(username).trim()];

        if (String(username).trim() !== 'Ejecutivo') {
          const duplicateCompanies = await findDuplicateCompanyNames(usernamesArray);
          if (duplicateCompanies.length > 0) {
            const duplicateLabel = duplicateCompanies[0];
            return res.status(400).json({
              error: `Ya existe una cuenta registrada con el nombre de empresa \"${duplicateLabel}\"`,
            });
          }
        }

        const newUser = new User({
          email: normalizedEmail,
          username: String(username).trim(),
          usernames: usernamesArray,
          nombreuser: String(nombreuser).trim(),
          passwordHash,
          ejecutivoId: ejecutivoId || undefined
        });

        await newUser.save();

        return res.json({
          success: true,
          message: 'Usuario creado exitosamente',
          user: {
            email: newUser.email,
            username: newUser.username
          }
        });
      } catch (e: any) {
        if (e?.message === 'No auth token' || e?.message === 'Invalid token') {
          return res.status(401).json({ error: e.message });
        }
        console.error('[admin] Error creando usuario:', e);
        return res.status(500).json({ error: 'Error al crear usuario' });
      }
    }

    // GET /api/admin/users
    if (path === '/api/admin/users' && method === 'GET') {
      try {
        const currentUser = requireAuth(req);
        if (currentUser.username !== 'Ejecutivo') {
          return res.status(403).json({ error: 'No tienes permisos para ver usuarios' });
        }

        const users = await User.find({}, { passwordHash: 0 })
          .populate('ejecutivoId')
          .sort({ createdAt: -1 });

        return res.json({
          success: true,
          users: users.map((u: any) => ({
            id: u._id,
            email: u.email,
            username: u.username,
            usernames: (u.usernames && u.usernames.length > 0) ? u.usernames : [u.username],
            nombreuser: u.nombreuser,
            createdAt: u.createdAt,
            ejecutivo: u.ejecutivoId ? {
              id: u.ejecutivoId._id,
              nombre: u.ejecutivoId.nombre,
              email: u.ejecutivoId.email,
              telefono: u.ejecutivoId.telefono
            } : null
          }))
        });
      } catch (e: any) {
        if (e?.message === 'No auth token' || e?.message === 'Invalid token') {
          return res.status(401).json({ error: e.message });
        }
        console.error('[admin] Error listando usuarios:', e);
        return res.status(500).json({ error: 'Error al listar usuarios' });
      }
    }

    // PUT /api/admin/users/:id
    if (path?.startsWith('/api/admin/users/') && method === 'PUT') {
      try {
        const currentUser = requireAuth(req);
        if (currentUser.username !== 'Ejecutivo') {
          return res.status(403).json({ error: 'No tienes permisos para actualizar usuarios' });
        }

        const id = path.split('/').pop();
        const { username, nombreuser, password, ejecutivoId, roles } = (req.body as any) || {};

        const userToUpdate = await User.findById(id);
        if (!userToUpdate) {
          return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        if (userToUpdate.username === 'Ejecutivo') {
          // Permitir editar ejecutivos: solo nombreuser y password
          if (nombreuser) {
            userToUpdate.nombreuser = String(nombreuser).trim();
          }
          if (password) {
            userToUpdate.passwordHash = bcrypt.hashSync(String(password), 12);
          }

          // Actualizar roles en el documento Ejecutivo vinculado
          if (roles) {
            const { administrador, pricing, ejecutivo: rolEjecutivo, proveedor: rolProveedor, operaciones: rolOperaciones } = roles;
            if (administrador && (pricing || rolEjecutivo || rolProveedor || rolOperaciones)) {
              return res.status(400).json({ error: 'El rol Administrador no se puede combinar con otros roles' });
            }
            if (rolProveedor && (administrador || pricing || rolEjecutivo || rolOperaciones)) {
              return res.status(400).json({ error: 'El rol Proveedor no se puede combinar con otros roles' });
            }
            if (rolOperaciones && (administrador || pricing || rolEjecutivo || rolProveedor)) {
              return res.status(400).json({ error: 'El rol Operaciones no se puede combinar con otros roles' });
            }
            if (!administrador && !pricing && !rolEjecutivo && !rolProveedor && !rolOperaciones) {
              return res.status(400).json({ error: 'Debe tener al menos un rol asignado' });
            }

            let ejDoc = userToUpdate.ejecutivoId
              ? await Ejecutivo.findById(userToUpdate.ejecutivoId)
              : await Ejecutivo.findOne({ email: userToUpdate.email });

            if (ejDoc) {
              ejDoc.roles = roles;
              await ejDoc.save();
            }
          }

          // Actualizar teléfono en el documento Ejecutivo
          const { telefono } = (req.body as any) || {};
          if (telefono !== undefined) {
            let ejDocTel = userToUpdate.ejecutivoId
              ? await Ejecutivo.findById(userToUpdate.ejecutivoId)
              : await Ejecutivo.findOne({ email: userToUpdate.email });
            if (ejDocTel) {
              ejDocTel.telefono = String(telefono).trim();
              await ejDocTel.save();
            }
          }

          await userToUpdate.save();
          console.log('[admin] Ejecutivo actualizado:', userToUpdate.email);
          return res.json({
            success: true,
            message: 'Ejecutivo actualizado exitosamente',
            user: {
              id: userToUpdate._id,
              email: userToUpdate.email,
              username: userToUpdate.username
            }
          });
        }

        if (username) {
          userToUpdate.username = String(username).trim();
        }

        // ✅ AGREGADO: Actualizar usernames
        const { usernames: newUsernames } = (req.body as any) || {};
        if (Array.isArray(newUsernames)) {
          const cleanUsernames = newUsernames.map((u: string) => String(u).trim()).filter(Boolean);
          if (cleanUsernames.length > 0) {
            userToUpdate.usernames = cleanUsernames;
            // Sincronizar username con el primer elemento
            userToUpdate.username = cleanUsernames[0];
          }
        }

        if (nombreuser) {
          userToUpdate.nombreuser = String(nombreuser).trim();
        }

        if (password) {
          userToUpdate.passwordHash = bcrypt.hashSync(String(password), 12);
        }

        if (ejecutivoId !== undefined) {
          userToUpdate.ejecutivoId = ejecutivoId ? ejecutivoId : undefined;
        }

        await userToUpdate.save();

        console.log('[admin] Usuario actualizado:', userToUpdate.email);

        return res.json({
          success: true,
          message: 'Usuario actualizado exitosamente',
          user: {
            id: userToUpdate._id,
            email: userToUpdate.email,
            username: userToUpdate.username
          }
        });
      } catch (e: any) {
        if (e?.message === 'No auth token' || e?.message === 'Invalid token') {
          return res.status(401).json({ error: e.message });
        }
        console.error('[admin] Error actualizando usuario:', e);
        return res.status(500).json({ error: 'Error al actualizar usuario' });
      }
    }

    // DELETE /api/admin/users/:id
    if (path?.startsWith('/api/admin/users/') && method === 'DELETE') {
      try {
        const currentUser = requireAuth(req);
        if (currentUser.username !== 'Ejecutivo') {
          return res.status(403).json({ error: 'No tienes permisos para eliminar usuarios' });
        }

        const id = path.split('/').pop();

        const userToDelete = await User.findById(id);
        if (userToDelete?.username === 'Ejecutivo') {
          // Verificar que NO se elimine a sí mismo
          if (userToDelete.email === currentUser.sub) {
            return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
          }
          // Verificar si el ejecutivo tiene clientes asignados
          const ejDoc = userToDelete.ejecutivoId
            ? await Ejecutivo.findById(userToDelete.ejecutivoId)
            : await Ejecutivo.findOne({ email: userToDelete.email });
          if (ejDoc) {
            const clientesAsignados = await User.countDocuments({ ejecutivoId: ejDoc._id });
            if (clientesAsignados > 0) {
              return res.status(400).json({ 
                error: `No se puede eliminar. Hay ${clientesAsignados} cliente(s) asignado(s) a este ejecutivo.` 
              });
            }
            await Ejecutivo.findByIdAndDelete(ejDoc._id);
          }
        }

        await User.findByIdAndDelete(id);

        return res.json({
          success: true,
          message: 'Usuario eliminado exitosamente'
        });
      } catch (e: any) {
        if (e?.message === 'No auth token' || e?.message === 'Invalid token') {
          return res.status(401).json({ error: e.message });
        }
        console.error('[admin] Error eliminando usuario:', e);
        return res.status(500).json({ error: 'Error al eliminar usuario' });
      }
    }

    // ============================================================
    // RUTAS DE LINBIS TOKEN
    // ============================================================

    // GET /api/linbis-token - Obtener token (con renovación automática)
    if (path === '/api/linbis-token' && method === 'GET') {
      console.log('🔵 [linbis-token] Endpoint llamado');
      try {
        const LINBIS_CLIENT_ID = process.env.LINBIS_CLIENT_ID;
        const LINBIS_TOKEN_URL = process.env.LINBIS_TOKEN_URL;

        if (!LINBIS_CLIENT_ID || !LINBIS_TOKEN_URL) {
          return res.status(500).json({ 
            error: 'Missing Linbis configuration. Set LINBIS_CLIENT_ID and LINBIS_TOKEN_URL in environment variables' 
          });
        }

        if (!linbisTokenCache.refresh_token) {
          return res.status(500).json({ 
            error: 'No refresh token found. Please initialize it first with POST /api/admin/init-linbis-token' 
          });
        }

        const now = Date.now();
        if (linbisTokenCache.access_token && 
            linbisTokenCache.access_token_expiry && 
            linbisTokenCache.access_token_expiry > now + 300000) {
          console.log('[linbis-token] Using cached access token');
          return res.json({ token: linbisTokenCache.access_token });
        }

        console.log('[linbis-token] Refreshing access token...');

        const response = await fetch(LINBIS_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: LINBIS_CLIENT_ID,
            refresh_token: linbisTokenCache.refresh_token,
            scope: 'https://linbis.onmicrosoft.com/linbis-api/access_as_user openid profile offline_access'
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[linbis-token] Failed to refresh:', errorText);
          return res.status(500).json({ error: 'Failed to refresh Linbis token' });
        }

        const data = await response.json() as {
          access_token: string;
          expires_in: number;
          refresh_token?: string;
        };

        linbisTokenCache.access_token = data.access_token;
        linbisTokenCache.access_token_expiry = now + (data.expires_in * 1000);

        if (data.refresh_token) {
          console.log('[linbis-token] Updating refresh token in cache');
          linbisTokenCache.refresh_token = data.refresh_token;
        }

        console.log('[linbis-token] Token refreshed successfully');
        return res.json({ token: linbisTokenCache.access_token });

      } catch (error) {
        console.error('[linbis-token] Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    // POST /api/admin/init-linbis-token - Inicializar token
    if (path === '/api/admin/init-linbis-token' && method === 'POST') {
      try {
        const { refresh_token } = req.body as any;

        if (!refresh_token) {
          return res.status(400).json({ error: 'refresh_token is required' });
        }

        linbisTokenCache.refresh_token = refresh_token;
        linbisTokenCache.access_token = undefined;
        linbisTokenCache.access_token_expiry = undefined;

        console.log('[init-linbis-token] Refresh token initialized successfully');

        return res.json({ 
          success: true, 
          message: 'Refresh token initialized successfully' 
        });
      } catch (error) {
        console.error('[init-linbis-token] Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    // ============================================================
    // RUTAS DE SHIPSGO
    // ============================================================

    // GET /api/shipsgo/shipments - Obtener todos los shipments de ShipsGo
    if (path === '/api/shipsgo/shipments' && method === 'GET') {
      console.log('🚢 [shipsgo] Fetching shipments...');
      try {
        const SHIPSGO_API_TOKEN = process.env.SHIPSGO_API_TOKEN;
        const SHIPSGO_API_URL = 'https://api.shipsgo.com/v2/air/shipments';

        if (!SHIPSGO_API_TOKEN) {
          return res.status(500).json({ 
            error: 'Missing ShipsGo API token. Set SHIPSGO_API_TOKEN in environment variables' 
          });
        }

        // Hacer petición a ShipsGo API
        const response = await fetch(`${SHIPSGO_API_URL}?order_by=&skip=0&take=100`, {
          method: 'GET',
          headers: {
            'X-Shipsgo-User-Token': SHIPSGO_API_TOKEN
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[shipsgo] API Error:', errorText);
          return res.status(response.status).json({ 
            error: 'Failed to fetch shipments from ShipsGo' 
          });
        }

        const data = await response.json() as { shipments?: Array<any> };
        console.log(`[shipsgo] Successfully fetched ${data.shipments?.length || 0} shipments`);
        
        return res.json(data);

      } catch (error) {
        console.error('[shipsgo] Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    // ============================================================
    // RUTAS DE SHIPSGO - POST
    // ============================================================

    // POST /api/shipsgo/shipments - Crear un nuevo shipment
    if (path === '/api/shipsgo/shipments' && method === 'POST') {
      console.log('🚢 [shipsgo] Creating new shipment...');
      try {
        // Validar autenticación
        const currentUser = requireAuth(req);
        
        const SHIPSGO_API_TOKEN = process.env.SHIPSGO_API_TOKEN;
        const SHIPSGO_API_URL = 'https://api.shipsgo.com/v2/air/shipments';

        if (!SHIPSGO_API_TOKEN) {
          return res.status(500).json({ 
            error: 'Missing ShipsGo API token. Set SHIPSGO_API_TOKEN in environment variables' 
          });
        }

        // Obtener datos del body
        const { reference, awb_number, followers, tags } = req.body || {};

        // Validaciones básicas
        if (!reference || !awb_number) {
          return res.status(400).json({ 
            error: 'reference y awb_number son campos requeridos' 
          });
        }

        const canManageReference = await canManageShipsgoReference(
          currentUser,
          reference,
        );

        if (!canManageReference) {
          console.error(`[shipsgo] Security violation: User ${currentUser.username} tried to create shipment with reference ${reference}`);
          return res.status(403).json({ 
            error: 'No puedes crear trackeos para otros usuarios' 
          });
        }

        // Validar formato de AWB (11 dígitos, con o sin guion)
        const awbClean = awb_number.replace(/-/g, '');
        if (!/^\d{11}$/.test(awbClean)) {
          return res.status(400).json({ 
            error: 'El AWB debe contener exactamente 11 dígitos' 
          });
        }

        // Formatear AWB con guion (XXX-XXXXXXXX)
        const awbFormatted = `${awbClean.slice(0, 3)}-${awbClean.slice(3)}`;

        // Validar followers (opcional, pero si existe debe ser array)
        if (followers && !Array.isArray(followers)) {
          return res.status(400).json({ 
            error: 'followers debe ser un array de emails' 
          });
        }

        // Validar máximo 10 followers visibles + 1 correo interno de operaciones
        if (followers && followers.length > MAX_VISIBLE_TRACK_FOLLOWERS) {
          return res.status(400).json({ 
            error: 'Máximo 10 emails visibles permitidos en followers' 
          });
        }

        // Validar tags (opcional, pero si existe debe ser array)
        if (tags && !Array.isArray(tags)) {
          return res.status(400).json({ 
            error: 'tags debe ser un array' 
          });
        }

        // Validar máximo 10 tags
        if (tags && tags.length > 10) {
          return res.status(400).json({ 
            error: 'Máximo 10 tags permitidos' 
          });
        }

        // Preparar body para ShipsGo
        const shipmentData = {
          reference,
          awb_number: awbFormatted,
          followers: normalizeTrackingFollowers(followers),
          tags: tags || []
        };

        console.log('[shipsgo] Creating shipment:', shipmentData);

        // Hacer petición a ShipsGo API
        const response = await fetch(SHIPSGO_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shipsgo-User-Token': SHIPSGO_API_TOKEN
          },
          body: JSON.stringify(shipmentData)
        });

        const data = await response.json() as { shipment?: any; [key: string]: any };

        // Manejar respuestas específicas de ShipsGo
        if (response.status === 409) {
          // Shipment ya existe
          console.log('[shipsgo] Shipment already exists:', data);
          return res.status(409).json({ 
            error: 'Ya existe un trackeo con este AWB para tu cuenta',
            code: 'ALREADY_EXISTS',
            existingShipment: data.shipment || null
          });
        }

        if (response.status === 402) {
          // Sin créditos
          console.error('[shipsgo] Insufficient credits');
          return res.status(402).json({ 
            error: 'No hay créditos disponibles. Por favor contacta a tu ejecutivo de cuenta.',
            code: 'INSUFFICIENT_CREDITS'
          });
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[shipsgo] API Error:', response.status, errorText);
          return res.status(response.status).json({ 
            error: 'Error al crear el shipment en ShipsGo',
            details: errorText
          });
        }

        console.log(`[shipsgo] Shipment created successfully:`, data.shipment);
        
        return res.status(200).json({
          success: true,
          message: 'Trackeo creado exitosamente',
          shipment: data.shipment
        });

      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[shipsgo] Error:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }
    }

    const airShipmentDeleteMatch = path?.match(/^\/api\/shipsgo\/shipments\/([^/]+)$/);
    if (airShipmentDeleteMatch && method === 'DELETE') {
      const shipmentId = airShipmentDeleteMatch[1];
      console.log(`✈️ [shipsgo] Deleting air shipment id=${shipmentId}...`);
      try {
        const currentUser = requireAuth(req);

        const SHIPSGO_API_TOKEN = process.env.SHIPSGO_API_TOKEN;
        if (!SHIPSGO_API_TOKEN) {
          return res.status(500).json({ error: 'Missing ShipsGo API token' });
        }

        const permission = await canDeleteShipsgoShipment(
          currentUser,
          'air',
          shipmentId,
          SHIPSGO_API_TOKEN,
        );

        if (!permission.allowed) {
          return res.status(permission.status).json({
            error: permission.error || 'No tienes permisos para eliminar este tracking',
          });
        }

        const response = await fetch(
          `https://api.shipsgo.com/v2/air/shipments/${encodeURIComponent(shipmentId)}`,
          {
            method: 'DELETE',
            headers: {
              'X-Shipsgo-User-Token': SHIPSGO_API_TOKEN,
            },
          },
        );

        const data = await response.json().catch(() => ({} as Record<string, unknown>));

        if (!response.ok) {
          return res.status(response.status).json({
            error:
              (data as any).error ||
              (data as any).message ||
              'No se pudo eliminar el tracking',
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Tracking eliminado correctamente',
        });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[shipsgo] Delete air shipment error:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }
    }

    // POST /api/shipsgo/shipments/:id/followers - Agregar follower a shipment aéreo existente
    const airFollowerCreateMatch = path?.match(/^\/api\/shipsgo\/shipments\/(\d+)\/followers$/);
    if (airFollowerCreateMatch && method === 'POST') {
      const shipmentId = airFollowerCreateMatch[1];
      console.log(`✈️ [shipsgo] Adding follower to air shipment id=${shipmentId}...`);
      try {
        requireAuth(req);

        const SHIPSGO_API_TOKEN = process.env.SHIPSGO_API_TOKEN;
        if (!SHIPSGO_API_TOKEN) {
          return res.status(500).json({ error: 'Missing ShipsGo API token' });
        }

        const follower = String((req.body as any)?.follower || '').trim();
        if (!follower) {
          return res.status(400).json({ error: 'follower es un campo requerido' });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(follower)) {
          return res.status(400).json({ error: 'Debes ingresar un correo electrónico válido' });
        }

        if (follower.toLowerCase() === OPERATIONS_FOLLOWER_EMAIL) {
          return res.status(400).json({
            error: 'El correo de operaciones se agrega automáticamente en todos los trackings',
          });
        }

        const response = await fetch(
          `https://api.shipsgo.com/v2/air/shipments/${encodeURIComponent(shipmentId)}/followers`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shipsgo-User-Token': SHIPSGO_API_TOKEN,
            },
            body: JSON.stringify({ follower }),
          },
        );

        const data = await response.json().catch(() => ({} as Record<string, unknown>));

        if (response.status === 409) {
          return res.status(409).json({ error: 'Ese correo ya está agregado a este tracking' });
        }

        if (response.status === 403) {
          return res.status(403).json({ error: 'No tienes permisos para modificar este tracking' });
        }

        if (!response.ok) {
          return res.status(response.status).json({
            error: (data as any).error || (data as any).message || 'No se pudo agregar el correo al tracking',
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Correo agregado correctamente',
          follower: (data as any).follower || null,
        });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[shipsgo] Add follower error:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }
    }

    // DELETE /api/shipsgo/shipments/:id/followers/:followerId - Eliminar follower de shipment aéreo existente
    const airFollowerDeleteMatch = path?.match(/^\/api\/shipsgo\/shipments\/(\d+)\/followers\/(\d+)$/);
    if (airFollowerDeleteMatch && method === 'DELETE') {
      const shipmentId = airFollowerDeleteMatch[1];
      const followerId = airFollowerDeleteMatch[2];
      console.log(`✈️ [shipsgo] Removing follower ${followerId} from air shipment id=${shipmentId}...`);
      try {
        requireAuth(req);

        const SHIPSGO_API_TOKEN = process.env.SHIPSGO_API_TOKEN;
        if (!SHIPSGO_API_TOKEN) {
          return res.status(500).json({ error: 'Missing ShipsGo API token' });
        }

        const followerEmail = await getShipsgoShipmentFollowerEmail('air', shipmentId, followerId, SHIPSGO_API_TOKEN);
        if (followerEmail === OPERATIONS_FOLLOWER_EMAIL) {
          return res.status(400).json({
            error: 'El correo de operaciones es obligatorio y no puede eliminarse',
          });
        }

        const response = await fetch(
          `https://api.shipsgo.com/v2/air/shipments/${encodeURIComponent(shipmentId)}/followers/${encodeURIComponent(followerId)}`,
          {
            method: 'DELETE',
            headers: {
              'X-Shipsgo-User-Token': SHIPSGO_API_TOKEN,
            },
          },
        );

        const data = await response.json().catch(() => ({} as Record<string, unknown>));

        if (response.status === 403) {
          return res.status(403).json({ error: 'No tienes permisos para modificar este tracking' });
        }

        if (!response.ok) {
          return res.status(response.status).json({
            error: (data as any).error || (data as any).message || 'No se pudo eliminar el correo del tracking',
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Correo eliminado correctamente',
        });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[shipsgo] Remove follower error:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }
    }

    // GET /api/shipsgo/shipments/:id/geojson - Ruta GeoJSON de un shipment aéreo (experimental)
    if (path?.match(/^\/api\/shipsgo\/shipments\/\d+\/geojson$/) && method === 'GET') {
      const shipmentId = path.split('/')[4];
      console.log(`✈️ [shipsgo] Fetching air shipment geojson for id=${shipmentId}...`);
      try {
        const SHIPSGO_API_TOKEN = process.env.SHIPSGO_API_TOKEN;
        if (!SHIPSGO_API_TOKEN) {
          return res.status(500).json({ error: 'Missing ShipsGo API token' });
        }

        const response = await fetch(`https://api.shipsgo.com/v2/air/shipments/${encodeURIComponent(shipmentId)}/geojson`, {
          method: 'GET',
          headers: { 'X-Shipsgo-User-Token': SHIPSGO_API_TOKEN },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[shipsgo] GeoJSON API Error:', errorText);
          return res.status(response.status).json({ error: 'Failed to fetch shipment route' });
        }

        const data = await response.json();
        return res.json(data);
      } catch (error) {
        console.error('[shipsgo] GeoJSON Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    // GET /api/shipsgo/shipments/:id - Detalles de un shipment aéreo
    if (path?.match(/^\/api\/shipsgo\/shipments\/\d+$/) && method === 'GET') {
      const shipmentId = path.split('/')[4];
      console.log(`✈️ [shipsgo] Fetching air shipment detail for id=${shipmentId}...`);
      try {
        const SHIPSGO_API_TOKEN = process.env.SHIPSGO_API_TOKEN;
        if (!SHIPSGO_API_TOKEN) {
          return res.status(500).json({ error: 'Missing ShipsGo API token' });
        }

        const response = await fetch(`https://api.shipsgo.com/v2/air/shipments/${encodeURIComponent(shipmentId)}`, {
          method: 'GET',
          headers: { 'X-Shipsgo-User-Token': SHIPSGO_API_TOKEN },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[shipsgo] Detail API Error:', errorText);
          return res.status(response.status).json({ error: 'Failed to fetch shipment detail' });
        }

        const data = await response.json();
        return res.json(data);
      } catch (error) {
        console.error('[shipsgo] Detail Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    // POST /api/shipsgo/webhooks/air - Webhook endpoint para eventos de ShipsGo Air
    if (path === '/api/shipsgo/webhooks/air' && method === 'POST') {
      console.log('🔔 [shipsgo-webhook] Received air webhook event');
      try {
        const SHIPSGO_WEBHOOK_SECRET = process.env.SHIPSGO_WEBHOOK_SECRET;
        const signature = req.headers['x-shipsgo-webhook-signature'] as string | undefined;
        const webhookId = req.headers['x-shipsgo-webhook-id'] as string | undefined;
        const webhookName = req.headers['x-shipsgo-webhook-name'] as string | undefined;

        // Validate signature if secret is configured
        if (SHIPSGO_WEBHOOK_SECRET && signature) {
          const crypto = await import('crypto');
          const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
          const expectedSignature = crypto
            .createHmac('sha256', SHIPSGO_WEBHOOK_SECRET)
            .update(rawBody)
            .digest('hex');

          if (signature !== expectedSignature) {
            console.error('[shipsgo-webhook] Invalid signature');
            return res.status(401).json({ error: 'Invalid webhook signature' });
          }
        }

        const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const eventName = payload?.event?.name || 'UNKNOWN';
        const payloadShipmentId = payload?.shipment?.id;

        console.log(`[shipsgo-webhook] Event: ${eventName}, Webhook-Id: ${webhookId}, Webhook-Name: ${webhookName}, Shipment: ${payloadShipmentId}`);
        console.log('[shipsgo-webhook] Payload:', JSON.stringify(payload, null, 2));

        // Respond immediately with 200 to acknowledge receipt
        return res.status(200).json({ received: true, event: eventName });
      } catch (error) {
        console.error('[shipsgo-webhook] Error processing webhook:', error);
        return res.status(200).json({ received: true, error: 'Processing error' });
      }
    }

    // ============================================================
    // RUTAS DE SHIPSGO - OCEAN (Marítimo)
    // ============================================================

    // GET /api/shipsgo/ocean/carriers - Obtener lista de carriers marítimos
    if (path === '/api/shipsgo/ocean/carriers' && method === 'GET') {
      console.log('🚢 [shipsgo-ocean] Fetching carriers...');
      try {
        const SHIPSGO_API_TOKEN = process.env.SHIPSGO_API_TOKEN;
        if (!SHIPSGO_API_TOKEN) {
          return res.status(500).json({ error: 'Missing ShipsGo API token' });
        }

        const response = await fetch('https://api.shipsgo.com/v2/ocean/carriers', {
          method: 'GET',
          headers: { 'X-Shipsgo-User-Token': SHIPSGO_API_TOKEN }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[shipsgo-ocean] Carriers API Error:', errorText);
          return res.status(response.status).json({ error: 'Failed to fetch ocean carriers' });
        }

        const data = await response.json();
        return res.json(data);
      } catch (error) {
        console.error('[shipsgo-ocean] Carriers Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    // GET /api/shipsgo/ocean/shipments - Obtener todos los shipments marítimos
    if (path === '/api/shipsgo/ocean/shipments' && method === 'GET') {
      console.log('🚢 [shipsgo-ocean] Fetching ocean shipments...');
      try {
        const SHIPSGO_API_TOKEN = process.env.SHIPSGO_API_TOKEN;
        const SHIPSGO_OCEAN_URL = 'https://api.shipsgo.com/v2/ocean/shipments';

        if (!SHIPSGO_API_TOKEN) {
          return res.status(500).json({ error: 'Missing ShipsGo API token' });
        }

        const response = await fetch(`${SHIPSGO_OCEAN_URL}?order_by=created_at,desc&skip=0&take=100`, {
          method: 'GET',
          headers: { 'X-Shipsgo-User-Token': SHIPSGO_API_TOKEN }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[shipsgo-ocean] API Error:', errorText);
          return res.status(response.status).json({ error: 'Failed to fetch ocean shipments' });
        }

        const data = await response.json() as { shipments?: Array<any> };
        console.log(`[shipsgo-ocean] Successfully fetched ${data.shipments?.length || 0} ocean shipments`);
        return res.json(data);
      } catch (error) {
        console.error('[shipsgo-ocean] Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    // POST /api/shipsgo/ocean/shipments - Crear un nuevo shipment marítimo
    if (path === '/api/shipsgo/ocean/shipments' && method === 'POST') {
      console.log('🚢 [shipsgo-ocean] Creating new ocean shipment...');
      try {
        const currentUser = requireAuth(req);

        const SHIPSGO_API_TOKEN = process.env.SHIPSGO_API_TOKEN;
        const SHIPSGO_OCEAN_URL = 'https://api.shipsgo.com/v2/ocean/shipments';

        if (!SHIPSGO_API_TOKEN) {
          return res.status(500).json({ error: 'Missing ShipsGo API token' });
        }

        const { reference, container_number, booking_number, carrier, followers, tags } = req.body || {};

        // Validar referencia
        if (!reference) {
          return res.status(400).json({ error: 'reference es un campo requerido' });
        }

        const canManageReference = await canManageShipsgoReference(
          currentUser,
          reference,
        );

        if (!canManageReference) {
          console.error(`[shipsgo-ocean] Security violation: User ${currentUser.username} tried to create shipment with reference ${reference}`);
          return res.status(403).json({ error: 'No puedes crear trackeos para otros usuarios' });
        }

        // Validar que al menos container_number o booking_number esté presente
        if (!container_number && !booking_number) {
          return res.status(400).json({ error: 'Debes proporcionar container_number o booking_number' });
        }

        // Validar formato de container_number si se proporcionó
        if (container_number && !/^[A-Z]{4}[0-9]{7}$/.test(container_number)) {
          return res.status(400).json({ error: 'El container number debe tener formato XXXX0000000 (4 letras + 7 dígitos)' });
        }

        // Validar formato de booking_number si se proporcionó
        if (booking_number && !/^[a-zA-Z0-9/\-]+$/.test(booking_number)) {
          return res.status(400).json({ error: 'El booking number solo puede contener letras, números, / y -' });
        }

        // Validar carrier si se proporcionó
        if (carrier && !/^(SG_)?[A-Z0-9]{4}$/.test(carrier)) {
          return res.status(400).json({ error: 'El código de carrier (SCAC) no tiene un formato válido' });
        }

        // Validar followers
        if (followers && !Array.isArray(followers)) {
          return res.status(400).json({ error: 'followers debe ser un array de emails' });
        }
        if (followers && followers.length > MAX_VISIBLE_TRACK_FOLLOWERS) {
          return res.status(400).json({ error: 'Máximo 10 emails visibles permitidos en followers' });
        }

        // Validar tags
        if (tags && !Array.isArray(tags)) {
          return res.status(400).json({ error: 'tags debe ser un array' });
        }
        if (tags && tags.length > 10) {
          return res.status(400).json({ error: 'Máximo 10 tags permitidos' });
        }

        // Preparar body para ShipsGo
        const shipmentData: Record<string, any> = {
          reference,
          followers: normalizeTrackingFollowers(followers),
          tags: tags || []
        };
        if (container_number) shipmentData.container_number = container_number;
        if (booking_number) shipmentData.booking_number = booking_number;
        if (carrier) shipmentData.carrier = carrier;

        console.log('[shipsgo-ocean] Creating ocean shipment:', shipmentData);

        const response = await fetch(SHIPSGO_OCEAN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shipsgo-User-Token': SHIPSGO_API_TOKEN
          },
          body: JSON.stringify(shipmentData)
        });

        const data = await response.json() as { shipment?: any; [key: string]: any };

        if (response.status === 409) {
          console.log('[shipsgo-ocean] Shipment already exists:', data);
          return res.status(409).json({
            error: 'Ya existe un trackeo con estos datos para tu cuenta',
            code: 'ALREADY_EXISTS',
            existingShipment: data.shipment || null
          });
        }

        if (response.status === 402) {
          console.error('[shipsgo-ocean] Insufficient credits');
          return res.status(402).json({
            error: 'No hay créditos disponibles. Por favor contacta a tu ejecutivo de cuenta.',
            code: 'INSUFFICIENT_CREDITS'
          });
        }

        if (!response.ok) {
          const errorText = JSON.stringify(data);
          console.error('[shipsgo-ocean] API Error:', response.status, errorText);
          return res.status(response.status).json({
            error: 'Error al crear el shipment marítimo en ShipsGo',
            details: errorText
          });
        }

        console.log(`[shipsgo-ocean] Ocean shipment created successfully:`, data.shipment);

        return res.status(200).json({
          success: true,
          message: 'Trackeo marítimo creado exitosamente',
          shipment: data.shipment
        });

      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[shipsgo-ocean] Error:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }
    }

    const oceanShipmentDeleteMatch = path?.match(/^\/api\/shipsgo\/ocean\/shipments\/([^/]+)$/);
    if (oceanShipmentDeleteMatch && method === 'DELETE') {
      const shipmentId = oceanShipmentDeleteMatch[1];
      console.log(`🚢 [shipsgo-ocean] Deleting ocean shipment id=${shipmentId}...`);
      try {
        const currentUser = requireAuth(req);

        const SHIPSGO_API_TOKEN = process.env.SHIPSGO_API_TOKEN;
        if (!SHIPSGO_API_TOKEN) {
          return res.status(500).json({ error: 'Missing ShipsGo API token' });
        }

        const permission = await canDeleteShipsgoShipment(
          currentUser,
          'ocean',
          shipmentId,
          SHIPSGO_API_TOKEN,
        );

        if (!permission.allowed) {
          return res.status(permission.status).json({
            error: permission.error || 'No tienes permisos para eliminar este tracking',
          });
        }

        const response = await fetch(
          `https://api.shipsgo.com/v2/ocean/shipments/${encodeURIComponent(shipmentId)}`,
          {
            method: 'DELETE',
            headers: {
              'X-Shipsgo-User-Token': SHIPSGO_API_TOKEN,
            },
          },
        );

        const data = await response.json().catch(() => ({} as Record<string, unknown>));

        if (!response.ok) {
          return res.status(response.status).json({
            error:
              (data as any).error ||
              (data as any).message ||
              'No se pudo eliminar el tracking',
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Tracking eliminado correctamente',
        });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[shipsgo-ocean] Delete ocean shipment error:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }
    }

    // POST /api/shipsgo/ocean/shipments/:id/followers - Agregar follower a shipment marítimo existente
    const oceanFollowerCreateMatch = path?.match(/^\/api\/shipsgo\/ocean\/shipments\/(\d+)\/followers$/);
    if (oceanFollowerCreateMatch && method === 'POST') {
      const shipmentId = oceanFollowerCreateMatch[1];
      console.log(`🚢 [shipsgo-ocean] Adding follower to ocean shipment id=${shipmentId}...`);
      try {
        requireAuth(req);

        const SHIPSGO_API_TOKEN = process.env.SHIPSGO_API_TOKEN;
        if (!SHIPSGO_API_TOKEN) {
          return res.status(500).json({ error: 'Missing ShipsGo API token' });
        }

        const follower = String((req.body as any)?.follower || '').trim();
        if (!follower) {
          return res.status(400).json({ error: 'follower es un campo requerido' });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(follower)) {
          return res.status(400).json({ error: 'Debes ingresar un correo electrónico válido' });
        }

        if (follower.toLowerCase() === OPERATIONS_FOLLOWER_EMAIL) {
          return res.status(400).json({
            error: 'El correo de operaciones se agrega automáticamente en todos los trackings',
          });
        }

        const response = await fetch(
          `https://api.shipsgo.com/v2/ocean/shipments/${encodeURIComponent(shipmentId)}/followers`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shipsgo-User-Token': SHIPSGO_API_TOKEN,
            },
            body: JSON.stringify({ follower }),
          },
        );

        const data = await response.json().catch(() => ({} as Record<string, unknown>));

        if (response.status === 409) {
          return res.status(409).json({ error: 'Ese correo ya está agregado a este tracking' });
        }

        if (response.status === 403) {
          return res.status(403).json({ error: 'No tienes permisos para modificar este tracking' });
        }

        if (!response.ok) {
          return res.status(response.status).json({
            error: (data as any).error || (data as any).message || 'No se pudo agregar el correo al tracking',
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Correo agregado correctamente',
          follower: (data as any).follower || null,
        });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[shipsgo-ocean] Add follower error:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }
    }

    // DELETE /api/shipsgo/ocean/shipments/:id/followers/:followerId - Eliminar follower de shipment marítimo existente
    const oceanFollowerDeleteMatch = path?.match(/^\/api\/shipsgo\/ocean\/shipments\/(\d+)\/followers\/(\d+)$/);
    if (oceanFollowerDeleteMatch && method === 'DELETE') {
      const shipmentId = oceanFollowerDeleteMatch[1];
      const followerId = oceanFollowerDeleteMatch[2];
      console.log(`🚢 [shipsgo-ocean] Removing follower ${followerId} from ocean shipment id=${shipmentId}...`);
      try {
        requireAuth(req);

        const SHIPSGO_API_TOKEN = process.env.SHIPSGO_API_TOKEN;
        if (!SHIPSGO_API_TOKEN) {
          return res.status(500).json({ error: 'Missing ShipsGo API token' });
        }

        const followerEmail = await getShipsgoShipmentFollowerEmail('ocean', shipmentId, followerId, SHIPSGO_API_TOKEN);
        if (followerEmail === OPERATIONS_FOLLOWER_EMAIL) {
          return res.status(400).json({
            error: 'El correo de operaciones es obligatorio y no puede eliminarse',
          });
        }

        const response = await fetch(
          `https://api.shipsgo.com/v2/ocean/shipments/${encodeURIComponent(shipmentId)}/followers/${encodeURIComponent(followerId)}`,
          {
            method: 'DELETE',
            headers: {
              'X-Shipsgo-User-Token': SHIPSGO_API_TOKEN,
            },
          },
        );

        const data = await response.json().catch(() => ({} as Record<string, unknown>));

        if (response.status === 403) {
          return res.status(403).json({ error: 'No tienes permisos para modificar este tracking' });
        }

        if (!response.ok) {
          return res.status(response.status).json({
            error: (data as any).error || (data as any).message || 'No se pudo eliminar el correo del tracking',
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Correo eliminado correctamente',
        });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[shipsgo-ocean] Remove follower error:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }
    }

    // GET /api/shipsgo/ocean/shipments/:id/geojson - Obtener ruta GeoJSON de un shipment marítimo (experimental)
    const oceanGeojsonMatch = path?.match(/^\/api\/shipsgo\/ocean\/shipments\/(\d+)\/geojson$/);
    if (oceanGeojsonMatch && method === 'GET') {
      const shipmentId = oceanGeojsonMatch[1];
      console.log(`🚢 [shipsgo-ocean] Fetching ocean shipment geojson for id=${shipmentId}...`);
      try {
        const SHIPSGO_API_TOKEN = process.env.SHIPSGO_API_TOKEN;
        if (!SHIPSGO_API_TOKEN) {
          return res.status(500).json({ error: 'Missing ShipsGo API token' });
        }

        const response = await fetch(`https://api.shipsgo.com/v2/ocean/shipments/${encodeURIComponent(shipmentId)}/geojson`, {
          method: 'GET',
          headers: { 'X-Shipsgo-User-Token': SHIPSGO_API_TOKEN },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[shipsgo-ocean] GeoJSON API Error:', errorText);
          return res.status(response.status).json({ error: 'Failed to fetch ocean shipment route' });
        }

        const data = await response.json();
        return res.json(data);
      } catch (error) {
        console.error('[shipsgo-ocean] GeoJSON Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    // GET /api/shipsgo/ocean/shipments/:id - Obtener detalles de un shipment marítimo
    const oceanDetailMatch = path?.match(/^\/api\/shipsgo\/ocean\/shipments\/(\d+)$/);
    if (oceanDetailMatch && method === 'GET') {
      const shipmentId = oceanDetailMatch[1];
      console.log(`🚢 [shipsgo-ocean] Fetching ocean shipment detail for id=${shipmentId}...`);
      try {
        const SHIPSGO_API_TOKEN = process.env.SHIPSGO_API_TOKEN;
        if (!SHIPSGO_API_TOKEN) {
          return res.status(500).json({ error: 'Missing ShipsGo API token' });
        }

        const response = await fetch(`https://api.shipsgo.com/v2/ocean/shipments/${encodeURIComponent(shipmentId)}`, {
          method: 'GET',
          headers: { 'X-Shipsgo-User-Token': SHIPSGO_API_TOKEN },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[shipsgo-ocean] Detail API Error:', errorText);
          return res.status(response.status).json({ error: 'Failed to fetch ocean shipment detail' });
        }

        const data = await response.json();
        return res.json(data);
      } catch (error) {
        console.error('[shipsgo-ocean] Detail Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    // POST /api/shipsgo/webhooks/ocean - Webhook endpoint para eventos de ShipsGo Ocean
    if (path === '/api/shipsgo/webhooks/ocean' && method === 'POST') {
      console.log('🔔 [shipsgo-webhook] Received ocean webhook event');
      try {
        const SHIPSGO_WEBHOOK_SECRET = process.env.SHIPSGO_WEBHOOK_SECRET;
        const signature = req.headers['x-shipsgo-webhook-signature'] as string | undefined;
        const webhookId = req.headers['x-shipsgo-webhook-id'] as string | undefined;
        const webhookName = req.headers['x-shipsgo-webhook-name'] as string | undefined;

        // Validate signature if secret is configured
        if (SHIPSGO_WEBHOOK_SECRET && signature) {
          const crypto = await import('crypto');
          const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
          const expectedSignature = crypto
            .createHmac('sha256', SHIPSGO_WEBHOOK_SECRET)
            .update(rawBody)
            .digest('hex');

          if (signature !== expectedSignature) {
            console.error('[shipsgo-webhook] Invalid ocean webhook signature');
            return res.status(401).json({ error: 'Invalid webhook signature' });
          }
        }

        const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const eventName = payload?.event?.name || 'UNKNOWN';
        const shipmentId = payload?.shipment?.id;

        console.log(`[shipsgo-webhook] Ocean Event: ${eventName}, Webhook-Id: ${webhookId}, Webhook-Name: ${webhookName}, Shipment: ${shipmentId}`);
        console.log('[shipsgo-webhook] Ocean Payload:', JSON.stringify(payload, null, 2));

        // Respond immediately with 200 to acknowledge receipt
        return res.status(200).json({ received: true, event: eventName });
      } catch (error) {
        console.error('[shipsgo-webhook] Error processing ocean webhook:', error);
        return res.status(200).json({ received: true, error: 'Processing error' });
      }
    }

    // ============================================================
    // RUTAS DE DOCUMENTOS
    // ============================================================

    // POST /api/documentos/upload - Subir documento
    if (path === '/api/documentos/upload' && method === 'POST') {
      try {
        const currentUser = requireAuth(req);
        
        if (!currentUser || !currentUser.sub || !currentUser.username) {
          return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const { quoteId, tipo, nombreArchivo, contenidoBase64 } = req.body;

        if (!quoteId || !tipo || !nombreArchivo || !contenidoBase64) {
          return res.status(400).json({ 
            error: 'Faltan campos requeridos: quoteId, tipo, nombreArchivo, contenidoBase64' 
          });
        }

        const tiposPermitidos = ['Invoice', 'Packing List', 'Certificado de Origen', 'Póliza de seguro', 'Guía de Despacho', 'Declaración de Ingreso'];
        if (!tiposPermitidos.includes(tipo)) {
          return res.status(400).json({ 
            error: `Tipo de documento inválido. Debe ser uno de: ${tiposPermitidos.join(', ')}` 
          });
        }

        if (!validateBase64(contenidoBase64)) {
          return res.status(400).json({ 
            error: 'El archivo debe estar en formato base64 válido' 
          });
        }

        const mimeType = getMimeTypeFromBase64(contenidoBase64);
        if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
          return res.status(400).json({ 
            error: 'Tipo de archivo no permitido. Solo PDF, Excel y Word' 
          });
        }

        const fileSize = getBase64Size(contenidoBase64);
        if (fileSize > MAX_FILE_SIZE) {
          return res.status(400).json({ 
            error: `El archivo excede el tamaño máximo de 5MB. Tamaño: ${(fileSize / 1024 / 1024).toFixed(2)}MB` 
          });
        }

        const ownerUsername = await resolveDocumentOwnerUsername(
          currentUser,
          getRequestedDocumentOwnerUsername(req),
        );

        const nuevoDocumento = await Documento.create({
          quoteId: String(quoteId),
          tipo,
          nombreArchivo: String(nombreArchivo),
          tipoArchivo: mimeType,
          tamanoBytes: fileSize,
          contenidoBase64,
          subidoPor: currentUser.sub,
          usuarioId: ownerUsername
        });

        console.log(`[documentos] Documento subido: ${nuevoDocumento._id}`);

        // Fire-and-forget: notificar por email
        sendDocumentUploadNotification({
          uploaderEmail: currentUser.sub,
          ownerUsername,
          numero: String(quoteId),
          tipoOperacion: 'Cotización',
          tipoDocumento: tipo,
          nombreArchivo: String(nombreArchivo),
        }).catch(() => {});

        return res.status(201).json({
          success: true,
          message: 'Documento subido exitosamente',
          documento: {
            id: nuevoDocumento._id,
            quoteId: nuevoDocumento.quoteId,
            tipo: nuevoDocumento.tipo,
            nombreArchivo: nuevoDocumento.nombreArchivo,
            tipoArchivo: nuevoDocumento.tipoArchivo,
            tamanoMB: (nuevoDocumento.tamanoBytes / 1024 / 1024).toFixed(2),
            fechaSubida: nuevoDocumento.createdAt
          }
        });

      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[documentos] Error al subir:', error);
        return res.status(500).json({ 
          error: 'Error interno al subir documento'
        });
      }
    }

    // GET /api/documentos/:quoteId - Obtener documentos de una cotización
    if (path?.startsWith('/api/documentos/') && !path.includes('/download/') && method === 'GET') {
      try {
        const currentUser = requireAuth(req);
        
        if (!currentUser || !currentUser.username) {
          return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const quoteId = path.split('/api/documentos/')[1];

        if (!quoteId) {
          return res.status(400).json({ error: 'quoteId es requerido' });
        }

        const ownerUsername = await resolveDocumentOwnerUsername(
          currentUser,
          getRequestedDocumentOwnerUsername(req),
        );

        const documentos = await Documento.find({ 
          quoteId: String(quoteId),
          ...buildDocumentOwnerScopeQuery(ownerUsername)
        })
        .select('-contenidoBase64')
        .sort({ createdAt: -1 });

        console.log(`[documentos] Encontrados ${documentos.length} documentos para quote ${quoteId}`);

        return res.json({
          success: true,
          documentos: documentos.map(doc => ({
            id: doc._id,
            quoteId: doc.quoteId,
            tipo: doc.tipo,
            nombreArchivo: doc.nombreArchivo,
            tipoArchivo: doc.tipoArchivo,
            tamanoMB: (doc.tamanoBytes / 1024 / 1024).toFixed(2),
            fechaSubida: doc.createdAt
          }))
        });

      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[documentos] Error al obtener:', error);
        return res.status(500).json({ 
          error: 'Error interno al obtener documentos'
        });
      }
    }

    // GET /api/documentos/download/:documentoId - Descargar documento
    if (path?.startsWith('/api/documentos/download/') && method === 'GET') {
      try {
        const currentUser = requireAuth(req);
        
        if (!currentUser || !currentUser.username) {
          return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const documentoId = path.split('/api/documentos/download/')[1];

        if (!documentoId) {
          return res.status(400).json({ error: 'documentoId es requerido' });
        }

        const ownerUsername = await resolveDocumentOwnerUsername(
          currentUser,
          getRequestedDocumentOwnerUsername(req),
        );

        const documento = await Documento.findById(documentoId);

        if (!documento) {
          return res.status(404).json({ error: 'Documento no encontrado' });
        }

        if (!documentBelongsToOwnerScope(documento, ownerUsername)) {
          return res.status(403).json({ error: 'No tienes permiso para descargar este documento' });
        }

        console.log(`[documentos] Descargando: ${documento._id}`);

        return res.json({
          success: true,
          documento: {
            id: documento._id,
            quoteId: documento.quoteId,
            tipo: documento.tipo,
            nombreArchivo: documento.nombreArchivo,
            tipoArchivo: documento.tipoArchivo,
            tamanoMB: (documento.tamanoBytes / 1024 / 1024).toFixed(2),
            contenidoBase64: documento.contenidoBase64,
            fechaSubida: documento.createdAt
          }
        });

      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[documentos] Error al descargar:', error);
        return res.status(500).json({ 
          error: 'Error interno al descargar documento'
        });
      }
    }

    // DELETE /api/documentos/:documentoId - Eliminar documento
    if (path?.startsWith('/api/documentos/') && !path.includes('/download/') && method === 'DELETE') {
      try {
        const currentUser = requireAuth(req);
        
        if (!currentUser || !currentUser.username) {
          return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const documentoId = path.split('/api/documentos/')[1];

        if (!documentoId) {
          return res.status(400).json({ error: 'documentoId es requerido' });
        }

        const ownerUsername = await resolveDocumentOwnerUsername(
          currentUser,
          getRequestedDocumentOwnerUsername(req),
        );

        const documento = await Documento.findById(documentoId);

        if (!documento) {
          return res.status(404).json({ error: 'Documento no encontrado' });
        }

        if (!documentBelongsToOwnerScope(documento, ownerUsername)) {
          return res.status(403).json({ error: 'No tienes permiso para eliminar este documento' });
        }

        await Documento.findByIdAndDelete(documentoId);

        console.log(`[documentos] Eliminado: ${documentoId}`);

        return res.json({
          success: true,
          message: 'Documento eliminado exitosamente'
        });

      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[documentos] Error al eliminar:', error);
        return res.status(500).json({ 
          error: 'Error interno al eliminar documento'
        });
      }
    }

    // ============================================================
    // RUTAS DE DOCUMENTOS (AIR SHIPMENTS)
    // ============================================================

    // POST /api/air-shipments/documentos/upload
    if (path === '/api/air-shipments/documentos/upload' && method === 'POST') {
      try {
        const currentUser = requireAuth(req);

        if (!currentUser || !currentUser.sub || !currentUser.username) {
          return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const { shipmentId, tipo, nombreArchivo, contenidoBase64 } = req.body;

        if (!shipmentId || !tipo || !nombreArchivo || !contenidoBase64) {
          return res.status(400).json({
            error: 'Faltan campos requeridos: shipmentId, tipo, nombreArchivo, contenidoBase64',
          });
        }

        const tiposPermitidos = [
          'Documento de transporte Internacional (AWB)',
          'Facturas asociados al servicio',
          'Invoice',
          'Packing List',
          'Certificado de Origen',
          'Póliza de Seguro',
          'Declaración de ingreso (DNI)',
          'Guía de despacho',
          'SDA',
          'Papeleta',
          'Transporte local',
          'Otros Documentos',
        ];

        if (!tiposPermitidos.includes(tipo)) {
          return res.status(400).json({
            error: `Tipo de documento inválido. Debe ser uno de: ${tiposPermitidos.join(', ')}`,
          });
        }

        if (!validateBase64(contenidoBase64)) {
          return res.status(400).json({ error: 'El archivo debe estar en formato base64 válido' });
        }

        const mimeType = getMimeTypeFromBase64(contenidoBase64);
        if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
          return res.status(400).json({ error: 'Tipo de archivo no permitido. Solo PDF, Excel y Word' });
        }

        const fileSize = getBase64Size(contenidoBase64);
        if (fileSize > MAX_FILE_SIZE) {
          return res.status(400).json({
            error: `El archivo excede el tamaño máximo de 5MB. Tamaño: ${(fileSize / 1024 / 1024).toFixed(2)}MB`,
          });
        }

        const ownerUsername = await resolveDocumentOwnerUsername(
          currentUser,
          getRequestedDocumentOwnerUsername(req),
        );

        const nuevoDocumento = await AirShipmentDocumento.create({
          shipmentId: String(shipmentId),
          tipo,
          nombreArchivo: String(nombreArchivo),
          tipoArchivo: mimeType,
          tamanoBytes: fileSize,
          contenidoBase64,
          subidoPor: currentUser.sub,
          usuarioId: ownerUsername,
        });

        // Fire-and-forget: notificar por email
        sendDocumentUploadNotification({
          uploaderEmail: currentUser.sub,
          ownerUsername,
          numero: String(shipmentId),
          tipoOperacion: 'Operación Aérea',
          tipoDocumento: tipo,
          nombreArchivo: String(nombreArchivo),
        }).catch(() => {});

        return res.status(201).json({
          success: true,
          message: 'Documento subido exitosamente',
          documento: {
            id: nuevoDocumento._id,
            shipmentId: nuevoDocumento.shipmentId,
            tipo: nuevoDocumento.tipo,
            nombreArchivo: nuevoDocumento.nombreArchivo,
            tipoArchivo: nuevoDocumento.tipoArchivo,
            tamanoMB: (nuevoDocumento.tamanoBytes / 1024 / 1024).toFixed(2),
            fechaSubida: nuevoDocumento.createdAt,
          },
        });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[air-shipments/documentos] Error al subir:', error);
        return res.status(500).json({ error: 'Error interno al subir documento' });
      }
    }

    // GET /api/air-shipments/documentos/:shipmentId
    if (
      path?.startsWith('/api/air-shipments/documentos/') &&
      !path.includes('/download/') &&
      method === 'GET'
    ) {
      try {
        const currentUser = requireAuth(req);

        if (!currentUser || !currentUser.username) {
          return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const shipmentId = path.split('/api/air-shipments/documentos/')[1];
        if (!shipmentId) return res.status(400).json({ error: 'shipmentId es requerido' });

        const ownerUsername = await resolveDocumentOwnerUsername(
          currentUser,
          getRequestedDocumentOwnerUsername(req),
        );

        const documentos = await AirShipmentDocumento.find({
          shipmentId: String(shipmentId),
          ...buildDocumentOwnerScopeQuery(ownerUsername),
        })
          .select('-contenidoBase64')
          .sort({ createdAt: -1 });

        return res.json({
          success: true,
          documentos: documentos.map((doc) => ({
            id: doc._id,
            shipmentId: doc.shipmentId,
            tipo: doc.tipo,
            nombreArchivo: doc.nombreArchivo,
            tipoArchivo: doc.tipoArchivo,
            tamanoMB: (doc.tamanoBytes / 1024 / 1024).toFixed(2),
            fechaSubida: doc.createdAt,
          })),
        });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[air-shipments/documentos] Error al obtener:', error);
        return res.status(500).json({ error: 'Error interno al obtener documentos' });
      }
    }

    // GET /api/air-shipments/documentos/download/:documentoId
    if (path?.startsWith('/api/air-shipments/documentos/download/') && method === 'GET') {
      try {
        const currentUser = requireAuth(req);

        if (!currentUser || !currentUser.username) {
          return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const documentoId = path.split('/api/air-shipments/documentos/download/')[1];
        if (!documentoId) return res.status(400).json({ error: 'documentoId es requerido' });

        const ownerUsername = await resolveDocumentOwnerUsername(
          currentUser,
          getRequestedDocumentOwnerUsername(req),
        );

        const documento = await AirShipmentDocumento.findById(documentoId);
        if (!documento) return res.status(404).json({ error: 'Documento no encontrado' });

        if (!documentBelongsToOwnerScope(documento, ownerUsername)) {
          return res.status(403).json({ error: 'No tienes permiso para descargar este documento' });
        }

        return res.json({
          success: true,
          documento: {
            id: documento._id,
            shipmentId: documento.shipmentId,
            tipo: documento.tipo,
            nombreArchivo: documento.nombreArchivo,
            tipoArchivo: documento.tipoArchivo,
            tamanoMB: (documento.tamanoBytes / 1024 / 1024).toFixed(2),
            contenidoBase64: documento.contenidoBase64,
            fechaSubida: documento.createdAt,
          },
        });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[air-shipments/documentos] Error al descargar:', error);
        return res.status(500).json({ error: 'Error interno al descargar documento' });
      }
    }

    // DELETE /api/air-shipments/documentos/:documentoId
    if (
      path?.startsWith('/api/air-shipments/documentos/') &&
      !path.includes('/download/') &&
      method === 'DELETE'
    ) {
      try {
        const currentUser = requireAuth(req);

        if (!currentUser || !currentUser.username) {
          return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const documentoId = path.split('/api/air-shipments/documentos/')[1];
        if (!documentoId) return res.status(400).json({ error: 'documentoId es requerido' });

        const ownerUsername = await resolveDocumentOwnerUsername(
          currentUser,
          getRequestedDocumentOwnerUsername(req),
        );

        const documento = await AirShipmentDocumento.findById(documentoId);
        if (!documento) return res.status(404).json({ error: 'Documento no encontrado' });

        if (!documentBelongsToOwnerScope(documento, ownerUsername)) {
          return res.status(403).json({ error: 'No tienes permiso para eliminar este documento' });
        }

        await AirShipmentDocumento.findByIdAndDelete(documentoId);

        return res.json({ success: true, message: 'Documento eliminado exitosamente' });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[air-shipments/documentos] Error al eliminar:', error);
        return res.status(500).json({ error: 'Error interno al eliminar documento' });
      }
    }

    // ============================================================
    // RUTAS DE DOCUMENTOS (OCEAN SHIPMENTS)
    // ============================================================

    // POST /api/ocean-shipments/documentos/upload
    if (path === '/api/ocean-shipments/documentos/upload' && method === 'POST') {
      try {
        const currentUser = requireAuth(req);

        if (!currentUser || !currentUser.sub || !currentUser.username) {
          return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const { shipmentId, tipo, nombreArchivo, contenidoBase64 } = req.body;

        if (!shipmentId || !tipo || !nombreArchivo || !contenidoBase64) {
          return res.status(400).json({
            error: 'Faltan campos requeridos: shipmentId, tipo, nombreArchivo, contenidoBase64',
          });
        }

        const tiposPermitidos = [
          'Bill of Lading (BL)',
          'Facturas asociadas al servicio',
          'Endoso',
          'Invoice',
          'Packing List',
          'Certificado de Origen',
          'Póliza de Seguro',
          'Declaración de ingreso (DIN)',
          'Guía de despacho / Delivery Order',
          'SDA',
          'Papeleta',
          'Transporte local',
          'Warehouse Receipt',
          "Mate's Receipt / Received for shipment",
          'Otros Documentos',
        ];

        if (!tiposPermitidos.includes(tipo)) {
          return res.status(400).json({
            error: `Tipo de documento inválido. Debe ser uno de: ${tiposPermitidos.join(', ')}`,
          });
        }

        if (!validateBase64(contenidoBase64)) {
          return res.status(400).json({ error: 'El archivo debe estar en formato base64 válido' });
        }

        const mimeType = getMimeTypeFromBase64(contenidoBase64);
        if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
          return res.status(400).json({ error: 'Tipo de archivo no permitido. Solo PDF, Excel y Word' });
        }

        const fileSize = getBase64Size(contenidoBase64);
        if (fileSize > MAX_FILE_SIZE) {
          return res.status(400).json({
            error: `El archivo excede el tamaño máximo de 5MB. Tamaño: ${(fileSize / 1024 / 1024).toFixed(2)}MB`,
          });
        }

        const ownerUsername = await resolveDocumentOwnerUsername(
          currentUser,
          getRequestedDocumentOwnerUsername(req),
        );

        const nuevoDocumento = await OceanShipmentDocumento.create({
          shipmentId: String(shipmentId),
          tipo,
          nombreArchivo: String(nombreArchivo),
          tipoArchivo: mimeType,
          tamanoBytes: fileSize,
          contenidoBase64,
          subidoPor: currentUser.sub,
          usuarioId: ownerUsername,
        });

        // Fire-and-forget: notificar por email
        sendDocumentUploadNotification({
          uploaderEmail: currentUser.sub,
          ownerUsername,
          numero: String(shipmentId),
          tipoOperacion: 'Operación Marítima',
          tipoDocumento: tipo,
          nombreArchivo: String(nombreArchivo),
        }).catch(() => {});

        return res.status(201).json({
          success: true,
          message: 'Documento subido exitosamente',
          documento: {
            id: nuevoDocumento._id,
            shipmentId: nuevoDocumento.shipmentId,
            tipo: nuevoDocumento.tipo,
            nombreArchivo: nuevoDocumento.nombreArchivo,
            tipoArchivo: nuevoDocumento.tipoArchivo,
            tamanoMB: (nuevoDocumento.tamanoBytes / 1024 / 1024).toFixed(2),
            fechaSubida: nuevoDocumento.createdAt,
          },
        });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[ocean-shipments/documentos] Error al subir:', error);
        return res.status(500).json({ error: 'Error interno al subir documento' });
      }
    }

    // GET /api/ocean-shipments/documentos/:shipmentId
    if (
      path?.startsWith('/api/ocean-shipments/documentos/') &&
      !path.includes('/download/') &&
      method === 'GET'
    ) {
      try {
        const currentUser = requireAuth(req);

        if (!currentUser || !currentUser.username) {
          return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const shipmentId = path.split('/api/ocean-shipments/documentos/')[1];
        if (!shipmentId) return res.status(400).json({ error: 'shipmentId es requerido' });

        const ownerUsername = await resolveDocumentOwnerUsername(
          currentUser,
          getRequestedDocumentOwnerUsername(req),
        );

        const documentos = await OceanShipmentDocumento.find({
          shipmentId: String(shipmentId),
          ...buildDocumentOwnerScopeQuery(ownerUsername),
        })
          .select('-contenidoBase64')
          .sort({ createdAt: -1 });

        return res.json({
          success: true,
          documentos: documentos.map((doc) => ({
            id: doc._id,
            shipmentId: doc.shipmentId,
            tipo: doc.tipo,
            nombreArchivo: doc.nombreArchivo,
            tipoArchivo: doc.tipoArchivo,
            tamanoMB: (doc.tamanoBytes / 1024 / 1024).toFixed(2),
            fechaSubida: doc.createdAt,
          })),
        });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[ocean-shipments/documentos] Error al obtener:', error);
        return res.status(500).json({ error: 'Error interno al obtener documentos' });
      }
    }

    // GET /api/ocean-shipments/documentos/download/:documentoId
    if (path?.startsWith('/api/ocean-shipments/documentos/download/') && method === 'GET') {
      try {
        const currentUser = requireAuth(req);

        if (!currentUser || !currentUser.username) {
          return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const documentoId = path.split('/api/ocean-shipments/documentos/download/')[1];
        if (!documentoId) return res.status(400).json({ error: 'documentoId es requerido' });

        const ownerUsername = await resolveDocumentOwnerUsername(
          currentUser,
          getRequestedDocumentOwnerUsername(req),
        );

        const documento = await OceanShipmentDocumento.findById(documentoId);
        if (!documento) return res.status(404).json({ error: 'Documento no encontrado' });

        if (!documentBelongsToOwnerScope(documento, ownerUsername)) {
          return res.status(403).json({ error: 'No tienes permiso para descargar este documento' });
        }

        return res.json({
          success: true,
          documento: {
            id: documento._id,
            shipmentId: documento.shipmentId,
            tipo: documento.tipo,
            nombreArchivo: documento.nombreArchivo,
            tipoArchivo: documento.tipoArchivo,
            tamanoMB: (documento.tamanoBytes / 1024 / 1024).toFixed(2),
            contenidoBase64: documento.contenidoBase64,
            fechaSubida: documento.createdAt,
          },
        });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[ocean-shipments/documentos] Error al descargar:', error);
        return res.status(500).json({ error: 'Error interno al descargar documento' });
      }
    }

    // DELETE /api/ocean-shipments/documentos/:documentoId
    if (
      path?.startsWith('/api/ocean-shipments/documentos/') &&
      !path.includes('/download/') &&
      method === 'DELETE'
    ) {
      try {
        const currentUser = requireAuth(req);

        if (!currentUser || !currentUser.username) {
          return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const documentoId = path.split('/api/ocean-shipments/documentos/')[1];
        if (!documentoId) return res.status(400).json({ error: 'documentoId es requerido' });

        const ownerUsername = await resolveDocumentOwnerUsername(
          currentUser,
          getRequestedDocumentOwnerUsername(req),
        );

        const documento = await OceanShipmentDocumento.findById(documentoId);
        if (!documento) return res.status(404).json({ error: 'Documento no encontrado' });

        if (!documentBelongsToOwnerScope(documento, ownerUsername)) {
          return res.status(403).json({ error: 'No tienes permiso para eliminar este documento' });
        }

        await OceanShipmentDocumento.findByIdAndDelete(documentoId);

        return res.json({ success: true, message: 'Documento eliminado exitosamente' });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[ocean-shipments/documentos] Error al eliminar:', error);
        return res.status(500).json({ error: 'Error interno al eliminar documento' });
      }
    }

    // ============================================================
    // RUTAS DE DOCUMENTOS (GROUND SHIPMENTS)
    // ============================================================

    // POST /api/ground-shipments/documentos/upload
    if (path === '/api/ground-shipments/documentos/upload' && method === 'POST') {
      try {
        const currentUser = requireAuth(req);

        if (!currentUser || !currentUser.sub || !currentUser.username) {
          return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const { shipmentId, tipo, nombreArchivo, contenidoBase64 } = req.body;

        if (!shipmentId || !tipo || !nombreArchivo || !contenidoBase64) {
          return res.status(400).json({
            error: 'Faltan campos requeridos: shipmentId, tipo, nombreArchivo, contenidoBase64',
          });
        }

        const tiposPermitidos = [
          'Carta de porte / Guía de remisión / CMR',
          'Prueba de entrega (POD / remito firmado)',
          'Factura comercial (Invoice)',
          'Packing List',
          'Póliza/Certificado de seguro de transporte',
          'Permisos/autorizaciones (sobredimensionada, especiales)',
          'Documentación del vehículo y conductor (licencia, tarjeta)',
          'Documentos aduaneros/transito (T1, TIR, manifiesto)',
          'Documentos ADR / MSDS (mercancías peligrosas)',
          'Orden/confirmación y factura del transportista (freight invoice)',
          'Delivery Order / Warehouse Receipt (si hay almacenaje)',
          'Certificado de Origen',
          'Papeleta',
          'Otros Documentos',
        ];

        if (!tiposPermitidos.includes(tipo)) {
          return res.status(400).json({
            error: `Tipo de documento inválido. Debe ser uno de: ${tiposPermitidos.join(', ')}`,
          });
        }

        if (!validateBase64(contenidoBase64)) {
          return res.status(400).json({ error: 'El archivo debe estar en formato base64 válido' });
        }

        const mimeType = getMimeTypeFromBase64(contenidoBase64);
        if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
          return res.status(400).json({ error: 'Tipo de archivo no permitido. Solo PDF, Excel y Word' });
        }

        const fileSize = getBase64Size(contenidoBase64);
        if (fileSize > MAX_FILE_SIZE) {
          return res.status(400).json({
            error: `El archivo excede el tamaño máximo de 5MB. Tamaño: ${(fileSize / 1024 / 1024).toFixed(2)}MB`,
          });
        }

        const ownerUsername = await resolveDocumentOwnerUsername(
          currentUser,
          getRequestedDocumentOwnerUsername(req),
        );

        const nuevoDocumento = await GroundShipmentDocumento.create({
          shipmentId: String(shipmentId),
          tipo,
          nombreArchivo: String(nombreArchivo),
          tipoArchivo: mimeType,
          tamanoBytes: fileSize,
          contenidoBase64,
          subidoPor: currentUser.sub,
          usuarioId: ownerUsername,
        });

        // Fire-and-forget: notificar por email
        sendDocumentUploadNotification({
          uploaderEmail: currentUser.sub,
          ownerUsername,
          numero: String(shipmentId),
          tipoOperacion: 'Operación Terrestre',
          tipoDocumento: tipo,
          nombreArchivo: String(nombreArchivo),
        }).catch(() => {});

        return res.status(201).json({
          success: true,
          message: 'Documento subido exitosamente',
          documento: {
            id: nuevoDocumento._id,
            shipmentId: nuevoDocumento.shipmentId,
            tipo: nuevoDocumento.tipo,
            nombreArchivo: nuevoDocumento.nombreArchivo,
            tipoArchivo: nuevoDocumento.tipoArchivo,
            tamanoMB: (nuevoDocumento.tamanoBytes / 1024 / 1024).toFixed(2),
            fechaSubida: nuevoDocumento.createdAt,
          },
        });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[ground-shipments/documentos] Error al subir:', error);
        return res.status(500).json({ error: 'Error interno al subir documento' });
      }
    }

    // GET /api/ground-shipments/documentos/:shipmentId
    if (
      path?.startsWith('/api/ground-shipments/documentos/') &&
      !path.includes('/download/') &&
      method === 'GET'
    ) {
      try {
        const currentUser = requireAuth(req);

        if (!currentUser || !currentUser.username) {
          return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const shipmentId = path.split('/api/ground-shipments/documentos/')[1];
        if (!shipmentId) return res.status(400).json({ error: 'shipmentId es requerido' });

        const ownerUsername = await resolveDocumentOwnerUsername(
          currentUser,
          getRequestedDocumentOwnerUsername(req),
        );

        const documentos = await GroundShipmentDocumento.find({
          shipmentId: String(shipmentId),
          ...buildDocumentOwnerScopeQuery(ownerUsername),
        })
          .select('-contenidoBase64')
          .sort({ createdAt: -1 });

        return res.json({
          success: true,
          documentos: documentos.map((doc) => ({
            id: doc._id,
            shipmentId: doc.shipmentId,
            tipo: doc.tipo,
            nombreArchivo: doc.nombreArchivo,
            tipoArchivo: doc.tipoArchivo,
            tamanoMB: (doc.tamanoBytes / 1024 / 1024).toFixed(2),
            fechaSubida: doc.createdAt,
          })),
        });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[ground-shipments/documentos] Error al obtener:', error);
        return res.status(500).json({ error: 'Error interno al obtener documentos' });
      }
    }

    // GET /api/ground-shipments/documentos/download/:documentoId
    if (path?.startsWith('/api/ground-shipments/documentos/download/') && method === 'GET') {
      try {
        const currentUser = requireAuth(req);

        if (!currentUser || !currentUser.username) {
          return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const documentoId = path.split('/api/ground-shipments/documentos/download/')[1];
        if (!documentoId) return res.status(400).json({ error: 'documentoId es requerido' });

        const ownerUsername = await resolveDocumentOwnerUsername(
          currentUser,
          getRequestedDocumentOwnerUsername(req),
        );

        const documento = await GroundShipmentDocumento.findById(documentoId);
        if (!documento) return res.status(404).json({ error: 'Documento no encontrado' });

        if (!documentBelongsToOwnerScope(documento, ownerUsername)) {
          return res.status(403).json({ error: 'No tienes permiso para descargar este documento' });
        }

        return res.json({
          success: true,
          documento: {
            id: documento._id,
            shipmentId: documento.shipmentId,
            tipo: documento.tipo,
            nombreArchivo: documento.nombreArchivo,
            tipoArchivo: documento.tipoArchivo,
            tamanoMB: (documento.tamanoBytes / 1024 / 1024).toFixed(2),
            contenidoBase64: documento.contenidoBase64,
            fechaSubida: documento.createdAt,
          },
        });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[ground-shipments/documentos] Error al descargar:', error);
        return res.status(500).json({ error: 'Error interno al descargar documento' });
      }
    }

    // DELETE /api/ground-shipments/documentos/:documentoId
    if (
      path?.startsWith('/api/ground-shipments/documentos/') &&
      !path.includes('/download/') &&
      method === 'DELETE'
    ) {
      try {
        const currentUser = requireAuth(req);

        if (!currentUser || !currentUser.username) {
          return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const documentoId = path.split('/api/ground-shipments/documentos/')[1];
        if (!documentoId) return res.status(400).json({ error: 'documentoId es requerido' });

        const ownerUsername = await resolveDocumentOwnerUsername(
          currentUser,
          getRequestedDocumentOwnerUsername(req),
        );

        const documento = await GroundShipmentDocumento.findById(documentoId);
        if (!documento) return res.status(404).json({ error: 'Documento no encontrado' });

        if (!documentBelongsToOwnerScope(documento, ownerUsername)) {
          return res.status(403).json({ error: 'No tienes permiso para eliminar este documento' });
        }

        await GroundShipmentDocumento.findByIdAndDelete(documentoId);

        return res.json({ success: true, message: 'Documento eliminado exitosamente' });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[ground-shipments/documentos] Error al eliminar:', error);
        return res.status(500).json({ error: 'Error interno al eliminar documento' });
      }
    }

    // ============================================================
    // RUTAS DE GOOGLE SHEETS
    // ============================================================

    // POST /api/google-sheets/append - Enviar datos a Google Sheets
    if (path === '/api/google-sheets/append' && method === 'POST') {
      try {
        const currentUser = requireAuth(req);

        const { values } = req.body as any;

        if (!values || !Array.isArray(values)) {
          return res.status(400).json({ error: 'Invalid values array' });
        }

        // Validar que no esté vacío
        if (values.length === 0) {
          return res.status(400).json({ error: 'Values array cannot be empty' });
        }

        const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyYYU3sdPvU5svUgCWMovXMu4AeDpqvcpqTTjpiZoYTGQQbWsfDqSnt-SgKV2sEHXMz/exec';

        // Desde servidor a servidor NO hay restricciones CORS
        const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values })
        });

        if (!response.ok) {
          console.error('[google-sheets] Response status:', response.status);
          return res.status(response.status).json({ 
            error: 'Failed to append to Google Sheets' 
          });
        }

        const data = await response.json();
        console.log('[google-sheets] Data appended successfully');

        return res.status(200).json({ 
          success: true, 
          message: 'Data appended successfully',
          data 
        });

      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[google-sheets] Error appending to Google Sheets:', error);
        return res.status(500).json({ 
          error: 'Internal server error',
          details: error.message 
        });
      }
    }

    // POST /api/send-oversize-email - Notificar al ejecutivo sobre carga especial
    if (path === '/api/send-oversize-email' && method === 'POST') {
      try {
        console.log('Endpoint /api/send-oversize-email hit');
        const currentUser = await User.findOne({ email: requireAuth(req).sub }).populate('ejecutivoId');
        if (!currentUser || !currentUser.ejecutivoId) {
          return res.status(400).json({ error: 'No se encontró ejecutivo asignado al usuario' });
        }

        const ejecutivoEmail = (currentUser.ejecutivoId as any).email;
        const { origen, destino, carrier, validUntil, motivos, descripcion, incoterm, piezas, clienteNombre, clienteEmail, cargos } = req.body;

        const emailData: OversizeEmailData = {
          clienteNombre: clienteNombre || currentUser.username,
          clienteEmail: clienteEmail || currentUser.email,
          origen: origen || '',
          destino: destino || '',
          carrier: carrier || '',
          descripcion: descripcion || '',
          incoterm: incoterm || '',
          validUntil: validUntil || '',
          motivos: motivos || [],
          piezas: piezas || [],
          cargos: cargos || undefined,
        };

        const subject = getOversizeEmailSubject(emailData);
        const htmlContent = buildOversizeEmailHTML(emailData);

        // Enviar correo usando Brevo API
        const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': process.env.BREVO_API_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: 'Cotización Especial', email: 'noreply@sphereglobal.io' },
            to: [{ email: ejecutivoEmail }],
            subject,
            htmlContent,
          }),
        });

        if (!brevoResponse.ok) {
          const errorText = await brevoResponse.text();
          console.error('Error enviando correo oversize con Brevo:', errorText);
        }

        return res.status(200).json({ success: true, message: 'Notificación de carga especial enviada al ejecutivo' });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('Error en /api/send-oversize-email:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }
    }

    // POST /api/send-oversize-email-ocean - Notificar al ejecutivo sobre carga oversize marítima LCL
    if (path === '/api/send-oversize-email-ocean' && method === 'POST') {
      try {
        console.log('Endpoint /api/send-oversize-email-ocean hit');
        const currentUser = await User.findOne({ email: requireAuth(req).sub }).populate('ejecutivoId');
        if (!currentUser || !currentUser.ejecutivoId) {
          return res.status(400).json({ error: 'No se encontró ejecutivo asignado al usuario' });
        }

        const ejecutivoEmail = (currentUser.ejecutivoId as any).email;
        const { origen, destino, operador, motivos, descripcion, incoterm, validUntil, piezas, clienteNombre, clienteEmail, cargos } = req.body;

        const emailData: OceanOversizeEmailData = {
          clienteNombre: clienteNombre || currentUser.username,
          clienteEmail: clienteEmail || currentUser.email,
          origen: origen || '',
          destino: destino || '',
          operador: operador || '',
          descripcion: descripcion || '',
          incoterm: incoterm || '',
          validUntil: validUntil || '',
          motivos: motivos || [],
          piezas: piezas || [],
          cargos: cargos || undefined,
        };

        const subject = getOceanOversizeEmailSubject(emailData);
        const htmlContent = buildOceanOversizeEmailHTML(emailData);

        const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': process.env.BREVO_API_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: 'Cotización Marítima Especial', email: 'noreply@sphereglobal.io' },
            to: [{ email: ejecutivoEmail }],
            subject,
            htmlContent,
          }),
        });

        if (!brevoResponse.ok) {
          const errorText = await brevoResponse.text();
          console.error('Error enviando correo oversize ocean con Brevo:', errorText);
        }

        return res.status(200).json({ success: true, message: 'Notificación de carga marítima especial enviada al ejecutivo' });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('Error en /api/send-oversize-email-ocean:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }
    }

    // POST /api/send-operation-email - Enviar notificación de nueva operación al ejecutivo
    if (path === '/api/send-operation-email' && method === 'POST') {
      try {
        console.log('Endpoint /api/send-operation-email hit');
        const currentUser = await User.findOne({ email: requireAuth(req).sub }).populate('ejecutivoId');
        console.log('Current user:', currentUser?.email, 'Ejecutivo:', (currentUser?.ejecutivoId as any)?.email);
        if (!currentUser || !currentUser.ejecutivoId) {
          return res.status(400).json({ error: 'No se encontró ejecutivo asignado al usuario' });
        }

        const ejecutivoEmail = (currentUser.ejecutivoId as any).email;
        const { 
          tipoServicio = 'Aéreo', 
          origen, 
          destino, 
          carrier, 
          precio, 
          currency, 
          total, 
          tipoAccion,
          quoteId,
          // Campos legacy para compatibilidad
          origin, 
          destination, 
          description, 
          chargeableWeight, 
          date,
          tipo 
        } = req.body;
        
        console.log('Email data:', req.body);

        // Construir el mensaje en español
        const tipoTexto = (tipoAccion || tipo) === 'operacion' ? 'operación' : 'cotización';
        const subject = `Nueva ${tipoTexto} ${tipoServicio} generada por cliente`;
        
        let textContent = '';
        if (tipoServicio === 'Marítimo FCL') {
          textContent = `
Estimado ejecutivo,

El cliente ${currentUser.username} ha generado una nueva ${tipoTexto} con los siguientes detalles:

- Tipo de Servicio: ${tipoServicio}
- Origen (POL): ${origen || 'No especificado'}
- Destino (POD): ${destino || 'No especificado'}
- Carrier: ${carrier || 'No especificado'}
- Precio: ${currency || 'USD'} ${precio || 'No especificado'}
- Total: ${total || 'No especificado'}
- Fecha de generación: ${new Date().toLocaleString('es-ES')}

${tipoTexto === 'operación' ? 'Esta operación está pendiente de proceso.' : 'Esta cotización está lista para revisión.'}

Atentamente,
Sistema de Cotizaciones Seemann Group
          `.trim();
        } else if (tipoServicio === 'Marítimo LCL') {
          textContent = `
Estimado ejecutivo,

El cliente ${currentUser.username} ha generado una nueva ${tipoTexto} con los siguientes detalles:

- Tipo de Servicio: ${tipoServicio}
- Origen (POL): ${origen || 'No especificado'}
- Destino (POD): ${destino || 'No especificado'}
- Carrier: ${carrier || 'No especificado'}
- Precio: ${currency || 'USD'} ${precio || 'No especificado'}
- Total: ${total || 'No especificado'}
- Fecha de generación: ${new Date().toLocaleString('es-ES')}

${tipoTexto === 'operación' ? 'Esta operación está pendiente de proceso.' : 'Esta cotización está lista para revisión.'}

Atentamente,
Sistema de Cotizaciones Seemann Group
          `.trim();
        } else {
          // Aéreo (legacy)
          textContent = `
Estimado ejecutivo,

El cliente ${currentUser.username} ha generado una nueva ${tipoTexto} con los siguientes detalles:

- Tipo de Servicio: ${tipoServicio}
- Origen: ${origen || origin || 'No especificado'}
- Destino: ${destino || destination || 'No especificado'}
- Descripción de la carga: ${description || 'No especificada'}
- Peso chargeable: ${chargeableWeight || 'No especificado'} kg
- Total: ${total || 'No especificado'}
- Fecha de generación: ${date || new Date().toLocaleString('es-ES')}

${tipoTexto === 'operación' ? 'Esta operación está pendiente de proceso.' : 'Esta cotización está lista para revisión.'}

Atentamente,
Sistema de Cotizaciones Seemann Group
          `.trim();
        }

        // Enviar correo usando Brevo API
        const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': process.env.BREVO_API_KEY!,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sender: { name: `Nueva ${tipoTexto.charAt(0).toUpperCase() + tipoTexto.slice(1)}`, email: 'noreply@sphereglobal.io' },
            to: [{ email: ejecutivoEmail }],
            subject,
            textContent
          })
        });

        console.log('Brevo response status:', brevoResponse.status);
        if (!brevoResponse.ok) {
          const errorText = await brevoResponse.text();
          console.error('Error enviando correo con Brevo:', errorText);
          // No devolver error al cliente, solo loggear
        }

        return res.status(200).json({ success: true, message: 'Notificación enviada al ejecutivo' });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('Error en /api/send-operation-email:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }
    }

    // POST /api/send-special-quote-email - Notificar al ejecutivo que el cliente necesita cotización especial
    if (path === '/api/send-special-quote-email' && method === 'POST') {
      try {
        const currentUser = await User.findOne({ email: requireAuth(req).sub }).populate('ejecutivoId');
        if (!currentUser || !currentUser.ejecutivoId) {
          return res.status(400).json({ error: 'No se encontró ejecutivo asignado al usuario' });
        }

        const ejecutivoEmail = (currentUser.ejecutivoId as any).email;
        const ejecutivoNombre = (currentUser.ejecutivoId as any).nombre || 'Ejecutivo';
        const clienteUsername = currentUser.username || currentUser.email;

        const subject = `Solicitud de cotización especial — ${clienteUsername}`;
        const textContent = `
Estimado/a ${ejecutivoNombre},

Tu cliente ${clienteUsername} necesita una cotización de carácter especial y ha solicitado que lo contactes a la brevedad posible.

Por favor, comunícate con él/ella para asistirle con su requerimiento.

Fecha de solicitud: ${new Date().toLocaleString('es-CL')}

Atentamente,
Sistema de Portal Clientes — Seemann Group
        `.trim();

        const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': process.env.BREVO_API_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: 'Portal Clientes Seemann Group', email: 'noreply@sphereglobal.io' },
            to: [{ email: ejecutivoEmail }],
            subject,
            textContent,
          }),
        });

        if (!brevoResponse.ok) {
          const errText = await brevoResponse.text();
          console.error('Error enviando correo especial con Brevo:', errText);
        }

        return res.status(200).json({ success: true });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('Error en /api/send-special-quote-email:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }
    }

    // ============================================================
    // RUTAS DE PDF DE COTIZACIONES
    // ============================================================

    // POST /api/quote-pdf/upload - Subir PDF de cotización
    if (path === '/api/quote-pdf/upload' && method === 'POST') {
      try {
        const currentUser = requireAuth(req);

        if (!currentUser || !currentUser.sub || !currentUser.username) {
          return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const { quoteNumber, nombreArchivo, contenidoBase64, tipoServicio, origen, destino } = req.body;

        // Permitir override desde el frontend cuando el ejecutivo
        // genera el PDF en nombre de un cliente. Sólo se usará si ambos campos
        // están presentes y el usuario autenticado tiene username === 'Ejecutivo'.
        const overrideUsuarioId = typeof (req.body.usuarioId) === 'string' ? String(req.body.usuarioId) : null;
        const overrideSubidoPor = typeof (req.body.subidoPor) === 'string' ? String(req.body.subidoPor) : null;
        const shouldUseOverride = currentUser.username === 'Ejecutivo' && overrideUsuarioId && overrideSubidoPor;
        const resolvedUsuarioId = shouldUseOverride ? overrideUsuarioId : currentUser.username;
        const resolvedSubidoPor = shouldUseOverride ? overrideSubidoPor : currentUser.sub;

        if (!quoteNumber || !nombreArchivo || !contenidoBase64 || !tipoServicio) {
          return res.status(400).json({
            error: 'Faltan campos requeridos: quoteNumber, nombreArchivo, contenidoBase64, tipoServicio'
          });
        }

        if (!['AIR', 'FCL', 'LCL'].includes(tipoServicio)) {
          return res.status(400).json({ error: 'tipoServicio debe ser AIR, FCL o LCL' });
        }

        // Calcular tamaño del base64
        const base64Content = contenidoBase64.includes('base64,')
          ? contenidoBase64.split('base64,')[1]
          : contenidoBase64;
        const padding = (base64Content.match(/=/g) || []).length;
        const fileSize = (base64Content.length * 3) / 4 - padding;

        // Límite de 10MB para PDFs de cotizaciones
        if (fileSize > 10 * 1024 * 1024) {
          return res.status(400).json({ error: 'El PDF excede el tamaño máximo de 10MB' });
        }

        // Si ya existe un PDF para esta cotización (para el usuario resuelto), actualizarlo
        const existente = await QuotePDF.findOne({
          quoteNumber: String(quoteNumber),
          usuarioId: resolvedUsuarioId
        });

        if (existente) {
          existente.contenidoBase64 = contenidoBase64;
          existente.nombreArchivo = nombreArchivo;
          existente.tamanoBytes = fileSize;
          existente.tipoServicio = tipoServicio;
          existente.origen = origen || '';
          existente.destino = destino || '';
          await existente.save();

          console.log(`[quote-pdf] PDF actualizado para cotización ${quoteNumber}`);
          return res.status(200).json({
            success: true,
            message: 'PDF de cotización actualizado',
            quotePdf: {
              id: existente._id,
              quoteNumber: existente.quoteNumber,
              nombreArchivo: existente.nombreArchivo,
              tamanoMB: (existente.tamanoBytes / 1024 / 1024).toFixed(2),
            }
          });
        }

        const nuevoQuotePDF = await QuotePDF.create({
          quoteNumber: String(quoteNumber),
          nombreArchivo: String(nombreArchivo),
          tamanoBytes: fileSize,
          contenidoBase64,
          tipoServicio,
          origen: origen || '',
          destino: destino || '',
          usuarioId: resolvedUsuarioId,
          subidoPor: resolvedSubidoPor,
        });

        console.log(`[quote-pdf] PDF subido para cotización ${quoteNumber}: ${nuevoQuotePDF._id}`);

        return res.status(201).json({
          success: true,
          message: 'PDF de cotización guardado',
          quotePdf: {
            id: nuevoQuotePDF._id,
            quoteNumber: nuevoQuotePDF.quoteNumber,
            nombreArchivo: nuevoQuotePDF.nombreArchivo,
            tamanoMB: (nuevoQuotePDF.tamanoBytes / 1024 / 1024).toFixed(2),
          }
        });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[quote-pdf] Error al subir:', error);
        return res.status(500).json({ error: 'Error interno al guardar PDF de cotización' });
      }
    }

    // GET /api/quote-pdf/list - Obtener lista de PDFs disponibles para el usuario
    if (path === '/api/quote-pdf/list' && method === 'GET') {
      try {
        const currentUser = requireAuth(req);

        if (!currentUser || !currentUser.username) {
          return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const pdfs = await QuotePDF.find({ usuarioId: currentUser.username })
          .select('-contenidoBase64')
          .sort({ createdAt: -1 });

        return res.json({
          success: true,
          pdfs: pdfs.map(pdf => ({
            id: pdf._id,
            quoteNumber: pdf.quoteNumber,
            nombreArchivo: pdf.nombreArchivo,
            tipoServicio: pdf.tipoServicio,
            origen: pdf.origen,
            destino: pdf.destino,
            tamanoMB: (pdf.tamanoBytes / 1024 / 1024).toFixed(2),
            fechaCreacion: pdf.createdAt,
          }))
        });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[quote-pdf] Error al listar:', error);
        return res.status(500).json({ error: 'Error interno al listar PDFs' });
      }
    }

    // GET /api/quote-pdf/download/:quoteNumber - Descargar PDF de cotización
    if (path?.startsWith('/api/quote-pdf/download/') && method === 'GET') {
      try {
        const currentUser = requireAuth(req);

        if (!currentUser || !currentUser.username) {
          return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const quoteNumber = path.split('/api/quote-pdf/download/')[1];

        if (!quoteNumber) {
          return res.status(400).json({ error: 'quoteNumber es requerido' });
        }

        const quotePdf = await QuotePDF.findOne({
          quoteNumber: decodeURIComponent(quoteNumber),
          usuarioId: currentUser.username
        });

        if (!quotePdf) {
          return res.status(404).json({ error: 'PDF de cotización no encontrado' });
        }

        console.log(`[quote-pdf] Descargando PDF cotización ${quoteNumber}`);

        return res.json({
          success: true,
          quotePdf: {
            id: quotePdf._id,
            quoteNumber: quotePdf.quoteNumber,
            nombreArchivo: quotePdf.nombreArchivo,
            tipoServicio: quotePdf.tipoServicio,
            contenidoBase64: quotePdf.contenidoBase64,
            tamanoMB: (quotePdf.tamanoBytes / 1024 / 1024).toFixed(2),
          }
        });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[quote-pdf] Error al descargar:', error);
        return res.status(500).json({ error: 'Error interno al descargar PDF' });
      }
    }


    // ============================================================
    // RUTAS DE AUDITORÍA
    // ============================================================

    // POST /api/audit — Registrar evento de auditoría
    if (path === '/api/audit' && method === 'POST') {
      try {
        const currentUser = requireAuth(req);
        const { usuario, email, rol, ejecutivo, ejecutivoEmail, accion, categoria, descripcion, detalles, clienteAfectado } = req.body as any;

        if (!accion || !categoria || !descripcion) {
          return res.status(400).json({ error: 'accion, categoria y descripcion son requeridos' });
        }

        const ip = req.headers['x-forwarded-for'] || null;

        const auditEntry = await AuditLog.create({
          usuario: usuario || currentUser.username || 'desconocido',
          email: email || currentUser.sub || '',
          rol: rol || 'cliente',
          ejecutivo: ejecutivo || null,
          ejecutivoEmail: ejecutivoEmail || null,
          accion,
          categoria,
          descripcion,
          detalles: detalles || {},
          clienteAfectado: clienteAfectado || null,
          ip: typeof ip === 'string' ? ip : Array.isArray(ip) ? ip[0] : null,
        });

        console.log(`[audit] ${accion} por ${usuario || 'unknown'} — ${descripcion}`);
        return res.status(201).json({ success: true, id: auditEntry._id });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[audit] Error al registrar evento:', error);
        return res.status(500).json({ error: 'Error al registrar evento de auditoría' });
      }
    }

    // GET /api/audit — Listar eventos de auditoría (solo ejecutivos/admins)
    if (path === '/api/audit' && method === 'GET') {
      try {
        const currentUser = requireAuth(req);

        if (currentUser.username !== 'Ejecutivo') {
          return res.status(403).json({ error: 'No autorizado' });
        }

        const query = req.query as Record<string, string | string[]>;
        const page = typeof query.page === 'string' ? query.page : '1';
        const limit = typeof query.limit === 'string' ? query.limit : '50';
        const categoria = typeof query.categoria === 'string' ? query.categoria : undefined;
        const accion = typeof query.accion === 'string' ? query.accion : undefined;
        const usuario = typeof query.usuario === 'string' ? query.usuario : undefined;
        const desde = typeof query.desde === 'string' ? query.desde : undefined;
        const hasta = typeof query.hasta === 'string' ? query.hasta : undefined;
        const busqueda = typeof query.busqueda === 'string' ? query.busqueda : undefined;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

        const filter: any = {};
        if (categoria) filter.categoria = categoria;
        if (accion) filter.accion = accion;
        if (usuario) filter.usuario = { $regex: usuario, $options: 'i' };
        if (desde || hasta) {
          filter.createdAt = {};
          if (desde) filter.createdAt.$gte = new Date(desde);
          if (hasta) filter.createdAt.$lte = new Date(hasta + 'T23:59:59.999Z');
        }
        if (busqueda) {
          filter.$or = [
            { usuario: { $regex: busqueda, $options: 'i' } },
            { email: { $regex: busqueda, $options: 'i' } },
            { descripcion: { $regex: busqueda, $options: 'i' } },
            { accion: { $regex: busqueda, $options: 'i' } },
            { clienteAfectado: { $regex: busqueda, $options: 'i' } },
            { ejecutivo: { $regex: busqueda, $options: 'i' } },
          ];
        }

        const [logs, total] = await Promise.all([
          AuditLog.find(filter)
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .lean(),
          AuditLog.countDocuments(filter),
        ]);

        const stats = await AuditLog.aggregate([
          { $group: { _id: '$categoria', count: { $sum: 1 } } },
        ]);

        return res.json({
          success: true,
          logs,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
          stats: stats.reduce((acc: any, s: any) => {
            acc[s._id] = s.count;
            return acc;
          }, {}),
        });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[audit] Error al listar eventos:', error);
        return res.status(500).json({ error: 'Error al obtener auditoría' });
      }
    }

    // ============================================================
    // RUTAS DE ALUMNOS PRÁCTICA
    // ============================================================

    // GET /api/alumnos - Obtener todos los alumnos ordenados por puntaje
    if (path === '/api/alumnos' && method === 'GET') {
      try {
        requireAuth(req);
        // Mostrar alumnos activos y también documentos legacy que no tienen el campo "activo"
        const filtroActivo = { $or: [{ activo: true }, { activo: { $exists: false } }] };
        const alumnos = await Alumno.find(filtroActivo).sort({ puntajeTotal: -1 }).lean();
        // Evitar que los resultados queden cacheados por CDNs/edge
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json({ alumnos });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[alumnos] Error:', error);
        return res.status(500).json({ error: 'Error al obtener alumnos' });
      }
    }

    // POST /api/alumnos - Crear un nuevo alumno
    if (path === '/api/alumnos' && method === 'POST') {
      try {
        requireAuth(req);
        const { nombre, tipoEntrenamiento, puntaje } = (req.body as any) || {};
        if (!nombre || !tipoEntrenamiento || puntaje === undefined) {
          return res.status(400).json({ error: 'Nombre, tipo de entrenamiento y puntaje son requeridos' });
        }
        const puntajeNum = Number(puntaje);
        if (isNaN(puntajeNum) || puntajeNum < 0) {
          return res.status(400).json({ error: 'El puntaje debe ser un número válido >= 0' });
        }
        const alumno = await Alumno.create({
          nombre: nombre.trim(),
          tipoEntrenamiento: tipoEntrenamiento.trim(),
          puntajeTotal: puntajeNum,
          historial: [{ puntaje: puntajeNum, tipoEntrenamiento: tipoEntrenamiento.trim(), fecha: new Date() }],
        });
        return res.status(201).json({ alumno });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[alumnos] Error al crear alumno:', error);
        return res.status(500).json({ error: 'Error al crear alumno' });
      }
    }

    // POST /api/alumnos/puntaje - Agregar puntaje a un alumno existente
    if (path === '/api/alumnos/puntaje' && method === 'POST') {
      try {
        requireAuth(req);
        const { alumnoId, tipoEntrenamiento, puntaje } = (req.body as any) || {};
        if (!alumnoId || !tipoEntrenamiento || puntaje === undefined) {
          return res.status(400).json({ error: 'alumnoId, tipoEntrenamiento y puntaje son requeridos' });
        }
        const puntajeNum = Number(puntaje);
        if (isNaN(puntajeNum) || puntajeNum < 0) {
          return res.status(400).json({ error: 'El puntaje debe ser un número válido >= 0' });
        }
        const alumno = await Alumno.findByIdAndUpdate(
          alumnoId,
          {
            $inc: { puntajeTotal: puntajeNum },
            $set: { tipoEntrenamiento: tipoEntrenamiento.trim() },
            $push: { historial: { puntaje: puntajeNum, tipoEntrenamiento: tipoEntrenamiento.trim(), fecha: new Date() } },
          },
          { new: true }
        );
        if (!alumno) {
          return res.status(404).json({ error: 'Alumno no encontrado' });
        }
        return res.status(200).json({ alumno });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[alumnos] Error al agregar puntaje:', error);
        return res.status(500).json({ error: 'Error al agregar puntaje' });
      }
    }

    // GET /api/alumnos/:id - Obtener un alumno específico con historial
    if (path.startsWith('/api/alumnos/detalle/') && method === 'GET') {
      try {
        requireAuth(req);
        const alumnoId = path.replace('/api/alumnos/detalle/', '');
        const alumno = await Alumno.findById(alumnoId).lean();
        if (!alumno) {
          return res.status(404).json({ error: 'Alumno no encontrado' });
        }
        return res.status(200).json({ alumno });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[alumnos] Error:', error);
        return res.status(500).json({ error: 'Error al obtener alumno' });
      }
    }

    // GET /api/alumnos/ranking - Ranking con filtros por semana/mes
    if (path === '/api/alumnos/ranking' && method === 'GET') {
      try {
        requireAuth(req);
        const urlObj = new URL(url || '', `http://${req.headers.host}`);
        const periodo = urlObj.searchParams.get('periodo') || 'total'; // total | semana | mes
        const mes = urlObj.searchParams.get('mes'); // 0-11
        const anio = urlObj.searchParams.get('anio'); // e.g. 2026

        const filtroActivo = { $or: [{ activo: true }, { activo: { $exists: false } }] };
        const alumnos = await Alumno.find(filtroActivo).lean();

        if (periodo === 'total') {
          const ranking = alumnos
            .map(a => ({ _id: a._id, nombre: a.nombre, tipoEntrenamiento: a.tipoEntrenamiento, puntajeTotal: a.puntajeTotal }))
            .sort((a, b) => b.puntajeTotal - a.puntajeTotal);
          return res.status(200).json({ ranking, periodo });
        }

        let fechaInicio: Date;
        let fechaFin: Date;

        if (periodo === 'semana') {
          const now = new Date();
          const dayOfWeek = now.getDay();
          fechaInicio = new Date(now);
          fechaInicio.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
          fechaInicio.setHours(0, 0, 0, 0);
          fechaFin = new Date(now);
          fechaFin.setHours(23, 59, 59, 999);
        } else {
          // mes específico
          const m = mes !== null ? parseInt(mes) : new Date().getMonth();
          const y = anio ? parseInt(anio) : new Date().getFullYear();
          fechaInicio = new Date(y, m, 1);
          fechaFin = new Date(y, m + 1, 0, 23, 59, 59, 999);
        }

        const ranking = alumnos.map(a => {
          const puntosPeriodo = (a.historial || [])
            .filter((h: any) => {
              const f = new Date(h.fecha);
              return f >= fechaInicio && f <= fechaFin;
            })
            .reduce((sum: number, h: any) => sum + h.puntaje, 0);
          return {
            _id: a._id,
            nombre: a.nombre,
            tipoEntrenamiento: a.tipoEntrenamiento,
            puntajePeriodo: puntosPeriodo,
            puntajeTotal: a.puntajeTotal,
          };
        })
        .sort((a, b) => b.puntajePeriodo - a.puntajePeriodo);

        return res.status(200).json({ ranking, periodo, fechaInicio, fechaFin });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[alumnos] Error ranking:', error);
        return res.status(500).json({ error: 'Error al obtener ranking' });
      }
    }

    // DELETE /api/alumnos/:id - Desactivar alumno
    if (path.startsWith('/api/alumnos/') && method === 'DELETE') {
      try {
        requireAuth(req);
        const alumnoId = path.replace('/api/alumnos/', '');
        const alumno = await Alumno.findByIdAndUpdate(alumnoId, { activo: false }, { new: true });
        if (!alumno) {
          return res.status(404).json({ error: 'Alumno no encontrado' });
        }
        return res.status(200).json({ message: 'Alumno desactivado', alumno });
      } catch (error: any) {
        if (error?.message === 'No auth token' || error?.message === 'Invalid token') {
          return res.status(401).json({ error: error.message });
        }
        console.error('[alumnos] Error al eliminar:', error);
        return res.status(500).json({ error: 'Error al eliminar alumno' });
      }
    }

    // ============================================================
    // CHAT AI AGENT
    // ============================================================
    if (path === '/api/chat' && (method === 'POST' || method === 'OPTIONS')) {
      return chatHandler(req, res);
    }

    // Ruta no encontrada
    return res.status(404).json({ error: 'Ruta no encontrada' });
  } catch (error) {
    console.error('Error en handler:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}