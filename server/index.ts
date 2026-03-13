// server/index.ts ESTO ES SOLO PARA DESARROLLO LOCAL
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import chatHandler from '../api/chat.ts'; 
import { buildOversizeEmailHTML, getOversizeEmailSubject, type OversizeEmailData } from '../api/emails/oversizeEmailTemplate.ts';
import { buildOceanOversizeEmailHTML, getOceanOversizeEmailSubject, type OceanOversizeEmailData } from '../api/emails/oversizeEmailTemplateOcean.ts';

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
const MAX_VISIBLE_TRACK_FOLLOWERS = 9;
const MAX_SAVED_TRACKING_EMAILS = 5;
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
 *  Express app
 *  ========================= */
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.all('/api/chat', (req, res) => chatHandler(req as any, res as any));

/** =========================
 *  Mongoose / Modelos tipados
 *  ========================= */

// ✅ NUEVO: Modelo Ejecutivo
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

// ✅ MODIFICADO: Modelo User con referencia a Ejecutivo
interface IUser {
  email: string;
  nombreuser: string;
  username: string;
  usernames: string[];  // Múltiples empresas/cuentas asignadas
  passwordHash: string;
  ejecutivoId?: mongoose.Types.ObjectId;  // Referencia al ejecutivo
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

function getRequestedDocumentOwnerUsername(req: express.Request): string | undefined {
  const headerValue = req.headers['x-owner-username'];
  const headerOwner = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const queryOwner = Array.isArray(req.query.ownerUsername)
    ? req.query.ownerUsername[0]
    : req.query.ownerUsername;
  const bodyOwner = req.body?.ownerUsername;

  for (const candidate of [headerOwner, queryOwner, bodyOwner]) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return undefined;
}

type DocumentExecutiveAccess = {
  _id?: mongoose.Types.ObjectId | null;
  roles?: IEjecutivo['roles'];
} | null;

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

  let ejecutivoDoc = me.ejecutivoId as unknown as DocumentExecutiveAccess;
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

const AirShipmentDocumentoSchema = new mongoose.Schema(
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

    // trazabilidad/seguridad (igual que en quotes)
    subidoPor: { type: String, required: true }, // email o sub
    usuarioId: { type: String, required: true, index: true }, // username/id interno
  },
  { timestamps: true }
);

AirShipmentDocumentoSchema.index({ shipmentId: 1, usuarioId: 1 });

export const AirShipmentDocumento =
  mongoose.models.AirShipmentDocumento ||
  mongoose.model('AirShipmentDocumento', AirShipmentDocumentoSchema);


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

const OceanShipmentDocumentoSchema = new mongoose.Schema(
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

export const OceanShipmentDocumento =
  mongoose.models.OceanShipmentDocumento ||
  mongoose.model('OceanShipmentDocumento', OceanShipmentDocumentoSchema);

// ============================================================
// MODELO GROUND-SHIPMENT DOCUMENTOS
// ============================================================

const GroundShipmentDocumentoSchema = new mongoose.Schema(
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

export const GroundShipmentDocumento =
  mongoose.models.GroundShipmentDocumento ||
  mongoose.model('GroundShipmentDocumento', GroundShipmentDocumentoSchema);

// ============================================================
// MODELO DE DOCUMENTOS EN MONGODB
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
// CONSTANTES PARA DOCUMENTOS
// ============================================================

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// ============================================================
// FUNCIONES AUXILIARES PARA DOCUMENTOS
// ============================================================

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

// Conectar a MongoDB
mongoose
  .connect(MONGODB_URI, { bufferCommands: false })
  .then(() => {
    console.log('✅ Conectado a MongoDB Atlas');
  })
  .catch((error) => {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  });

/** =========================
 *  Middleware de autenticación
 *  ========================= */
const auth: express.RequestHandler = (req, res, next) => {
  const h = req.headers.authorization || '';
  console.log('Auth header:', h ? 'Present' : 'Missing');
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ error: 'No auth token' });
  }

  try {
    console.log('Token length:', token.length);
    const decoded = verifyToken(token);
    console.log('Token decoded, user sub:', decoded.sub);
    (req as any).user = decoded;
    next();
  } catch (err) {
    console.log('Token verification failed:', (err as Error).message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/** =========================
 *  Rutas
 *  ========================= */

// Login
app.post('/api/login', async (req, res) => {
  try {
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
    
    // Retornar datos del ejecutivo si existe
    const ejecutivo = user.ejecutivoId as any;

    // Buscar roles del ejecutivo (por populate o por email)
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
          ejecutivo: ejDoc.roles?.ejecutivo !== false, // default true
          proveedor: ejDoc.roles?.proveedor || false,
          operaciones: ejDoc.roles?.operaciones || false,
        };
      }
    }

    // Construir usernames: usar el array si existe, sino fallback a [username]
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
  } catch (e) {
    console.error('[login] error inesperado:', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// Cambiar contraseña
app.post('/api/change-password', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user as AuthPayload;
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
});

// Verificar token
app.get('/api/me', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user as AuthPayload;
    const user = await User.findOne({ email: currentUser.sub }).populate('ejecutivoId');
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Retornar datos del ejecutivo si existe
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

    // Construir usernames: usar el array si existe, sino fallback a [username]
    const usernames = (user.usernames && user.usernames.length > 0)
      ? user.usernames
      : [user.username];

    res.json({ 
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
  } catch (e) {
    console.error('[me] error:', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

app.get('/api/tracking-email-preferences', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user as AuthPayload;
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
  } catch (error) {
    console.error('[tracking-email-preferences:get] error:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
});

app.put('/api/tracking-email-preferences', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user as AuthPayload;
    const reference = String(req.body?.reference || '').trim();

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

    const validation = validateTrackingPreferenceEmails(req.body?.emails);

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
  } catch (error) {
    console.error('[tracking-email-preferences:put] error:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// ============================================================
// ENDPOINTS DEL EJECUTIVO (ver sus clientes)
// ============================================================

app.get('/api/ejecutivo/clientes', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user as AuthPayload;

    // Buscar el usuario logueado en la colección users
    const me = await User.findOne({ email: currentUser.sub }).populate('ejecutivoId');

    if (!me) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Resolver el _id del ejecutivo:
    // 1) si el user tiene ejecutivoId, usamos ese
    // 2) si no, intentamos encontrar un Ejecutivo cuyo email coincida con el del user logueado (caso "ejecutivo con cuenta")
    let ejecutivoObjectId: any = null;

    if (me.ejecutivoId) {
      // Cuando está populado, me.ejecutivoId es el doc; cuando no, es ObjectId.
      ejecutivoObjectId = (me.ejecutivoId as any)._id ?? me.ejecutivoId;
    } else {
      const lookupEmail = String(me.email).toLowerCase().trim();
      const ej = await Ejecutivo.findOne({ email: lookupEmail });
      if (ej) ejecutivoObjectId = ej._id;
    }

    if (!ejecutivoObjectId) {
      // No hay ejecutivo asociado => no hay clientes que mostrar
      return res.json({ success: true, clientes: [] });
    }

    // Buscar clientes asociados a ese ejecutivoId
    const clientes = await User.find(
      { ejecutivoId: ejecutivoObjectId, username: { $ne: 'Ejecutivo' } },
      { passwordHash: 0 }
    )
      .populate('ejecutivoId')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      clientes: clientes.map((u: any) => ({
        id: u._id,
        email: u.email,
        username: u.username,
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
  } catch (e) {
    console.error('[ejecutivo] Error listando clientes:', e);
    return res.status(500).json({ error: 'Error al listar clientes del ejecutivo' });
  }
});


// ============================================================
// ENDPOINTS DE EJECUTIVOS
// ============================================================

// Listar ejecutivos (usuarios autenticados)
app.get('/api/ejecutivos', auth, async (req, res) => {
  try {
    const ejecutivos = await Ejecutivo.find({ activo: true }).sort({ nombre: 1 });

    return res.json({
      success: true,
      ejecutivos: ejecutivos.map(ej => ({
        id: ej._id,
        nombre: ej.nombre,
        email: ej.email,
        telefono: ej.telefono
      }))
    });
  } catch (e) {
    console.error('[ejecutivos] Error listando ejecutivos:', e);
    return res.status(500).json({ error: 'Error al listar ejecutivos' });
  }
});

// Listar ejecutivos (solo ejecutivos)
app.get('/api/admin/ejecutivos', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user as AuthPayload;
    if (currentUser.username !== 'Ejecutivo') {
      return res.status(403).json({ error: 'No tienes permisos' });
    }

    const ejecutivos = await Ejecutivo.find().sort({ nombre: 1 });

    // Contar clientes por ejecutivo
    const ejecutivosConContador = await Promise.all(
      ejecutivos.map(async (ej) => {
        const count = await User.countDocuments({ ejecutivoId: ej._id });
        return {
          id: ej._id,
          nombre: ej.nombre,
          email: ej.email,
          telefono: ej.telefono,
          activo: ej.activo,
          roles: {
            administrador: ej.roles?.administrador || false,
            pricing: ej.roles?.pricing || false,
            ejecutivo: ej.roles?.ejecutivo !== false,
          },
          clientesAsignados: count,
          createdAt: ej.createdAt
        };
      })
    );

    return res.json({
      success: true,
      ejecutivos: ejecutivosConContador
    });
  } catch (e) {
    console.error('[admin] Error listando ejecutivos:', e);
    return res.status(500).json({ error: 'Error al listar ejecutivos' });
  }
});

// Crear ejecutivo (solo ejecutivos)
app.post('/api/admin/ejecutivos', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user as AuthPayload;
    if (currentUser.username !== 'Ejecutivo') {
      return res.status(403).json({ error: 'No tienes permisos' });
    }

    const { nombre, email, telefono } = (req.body as any) || {};
    if (!nombre || !email || !telefono) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const nuevoEjecutivo = new Ejecutivo({
      nombre: String(nombre).trim(),
      email: String(email).toLowerCase().trim(),
      telefono: String(telefono).trim(),
      activo: true
    });

    await nuevoEjecutivo.save();

    console.log('[admin] Ejecutivo creado:', nuevoEjecutivo.nombre);

    return res.json({
      success: true,
      message: 'Ejecutivo creado exitosamente',
      ejecutivo: {
        id: nuevoEjecutivo._id,
        nombre: nuevoEjecutivo.nombre,
        email: nuevoEjecutivo.email,
        telefono: nuevoEjecutivo.telefono,
        activo: nuevoEjecutivo.activo
      }
    });
  } catch (e) {
    console.error('[admin] Error creando ejecutivo:', e);
    return res.status(500).json({ error: 'Error al crear ejecutivo' });
  }
});

// Actualizar ejecutivo (solo ejecutivos)
app.put('/api/admin/ejecutivos/:id', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user as AuthPayload;
    if (currentUser.username !== 'Ejecutivo') {
      return res.status(403).json({ error: 'No tienes permisos' });
    }

    const { id } = req.params;
    const { nombre, email, telefono, activo, roles } = (req.body as any) || {};

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

    const ejecutivo = await Ejecutivo.findByIdAndUpdate(
      id,
      {
        nombre: String(nombre).trim(),
        email: String(email).toLowerCase().trim(),
        telefono: String(telefono).trim(),
        activo: activo !== undefined ? activo : true,
        ...(roles ? { roles } : {}),
      },
      { new: true }
    );

    if (!ejecutivo) {
      return res.status(404).json({ error: 'Ejecutivo no encontrado' });
    }

    console.log('[admin] Ejecutivo actualizado:', ejecutivo.nombre);

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
  } catch (e) {
    console.error('[admin] Error actualizando ejecutivo:', e);
    return res.status(500).json({ error: 'Error al actualizar ejecutivo' });
  }
});

// Eliminar ejecutivo (solo ejecutivos)
app.delete('/api/admin/ejecutivos/:id', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user as AuthPayload;
    if (currentUser.username !== 'Ejecutivo') {
      return res.status(403).json({ error: 'No tienes permisos' });
    }

    const { id } = req.params;

    // Verificar si hay usuarios asignados
    const clientesAsignados = await User.countDocuments({ ejecutivoId: id });
    if (clientesAsignados > 0) {
      return res.status(400).json({ 
        error: `No se puede eliminar. Hay ${clientesAsignados} cliente(s) asignado(s) a este ejecutivo.` 
      });
    }

    await Ejecutivo.findByIdAndDelete(id);

    console.log('[admin] Ejecutivo eliminado:', id);

    return res.json({
      success: true,
      message: 'Ejecutivo eliminado exitosamente'
    });
  } catch (e) {
    console.error('[admin] Error eliminando ejecutivo:', e);
    return res.status(500).json({ error: 'Error al eliminar ejecutivo' });
  }
});

// ============================================================
// ENDPOINTS DE ADMINISTRACIÓN DE USUARIOS
// ============================================================

// Crear nuevo usuario (solo para ejecutivos)
app.post('/api/admin/create-user', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user as AuthPayload;
    if (currentUser.username !== 'Ejecutivo') {
      return res.status(403).json({ error: 'No tienes permisos para crear usuarios' });
    }

    // ✅ MODIFICADO: Recibir ejecutivoId, nombreuser y usernames
    const { email, username, nombreuser, password, ejecutivoId, usernames } = (req.body as any) || {}; // ✅ AGREGADO usernames
    if (!email || !username || !nombreuser || !password) { // ✅ AGREGADO nombreuser
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

    const newUser = new User({
      email: normalizedEmail,
      username: String(username).trim(),
      usernames: usernamesArray,
      nombreuser: String(nombreuser).trim(), // ✅ AGREGADO
      passwordHash,
      ejecutivoId: ejecutivoId || undefined
    });

    await newUser.save();

    console.log('[admin] Usuario creado:', normalizedEmail);

    return res.json({
      success: true,
      message: 'Usuario creado exitosamente',
      user: {
        email: newUser.email,
        username: newUser.username
      }
    });
  } catch (e) {
    console.error('[admin] Error creando usuario:', e);
    return res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// Listar usuarios (solo ejecutivos)
app.get('/api/admin/users', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user as AuthPayload;
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
  } catch (e) {
    console.error('[admin] Error listando usuarios:', e);
    return res.status(500).json({ error: 'Error al listar usuarios' });
  }
});

// Actualizar usuario (solo ejecutivos)
app.put('/api/admin/users/:id', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user as AuthPayload;
    if (currentUser.username !== 'Ejecutivo') {
      return res.status(403).json({ error: 'No tienes permisos para actualizar usuarios' });
    }

    const { id } = req.params;
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

        // Buscar ejecutivo por email o ejecutivoId
        let ejDoc = userToUpdate.ejecutivoId
          ? await Ejecutivo.findById(userToUpdate.ejecutivoId)
          : await Ejecutivo.findOne({ email: userToUpdate.email });

        if (ejDoc) {
          ejDoc.roles = roles;
          await ejDoc.save();
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

    // Actualizar campos
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

    // ✅ AGREGADO: Actualizar nombreuser
    if (nombreuser) {
      userToUpdate.nombreuser = String(nombreuser).trim();
    }

    if (password) {
      userToUpdate.passwordHash = bcrypt.hashSync(String(password), 12);
    }

    // Actualizar ejecutivoId (puede ser null para "sin asignar")
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
  } catch (e) {
    console.error('[admin] Error actualizando usuario:', e);
    return res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// Eliminar usuario (solo ejecutivos)
app.delete('/api/admin/users/:id', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user as AuthPayload;
    if (currentUser.username !== 'Ejecutivo') {
      return res.status(403).json({ error: 'No tienes permisos para eliminar usuarios' });
    }

    const { id } = req.params;

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
        // Eliminar también el documento Ejecutivo
        await Ejecutivo.findByIdAndDelete(ejDoc._id);
      }
    }

    await User.findByIdAndDelete(id);

    console.log('[admin] Usuario eliminado:', id);

    return res.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });
  } catch (e) {
    console.error('[admin] Error eliminando usuario:', e);
    return res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

// Modelo para guardar el token (en memoria para dev local)
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

// GET /api/linbis-token - Obtener token (con renovación automática)
app.get('/api/linbis-token', async (req, res) => {
  console.log('🔵 [linbis-token] Endpoint llamado');
  try {
    const LINBIS_CLIENT_ID = process.env.LINBIS_CLIENT_ID;
    const LINBIS_TOKEN_URL = process.env.LINBIS_TOKEN_URL;

    if (!LINBIS_CLIENT_ID || !LINBIS_TOKEN_URL) {
      return res.status(500).json({ 
        error: 'Missing Linbis configuration. Set LINBIS_CLIENT_ID and LINBIS_TOKEN_URL in .env' 
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
});

// POST /api/admin/init-linbis-token - Inicializar token
app.post('/api/admin/init-linbis-token', (req, res) => {
  try {
    const { refresh_token } = req.body;

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
});

/** =========================
 *  ShipsGo API
 *  ========================= */

// GET /api/shipsgo/shipments - Obtener todos los shipments de ShipsGo (SIN autenticación)
app.get('/api/shipsgo/shipments', async (req, res) => {
  console.log('🚢 [shipsgo] Fetching shipments...');
  try {
    const SHIPSGO_API_TOKEN = process.env.SHIPSGO_API_TOKEN;
    const SHIPSGO_API_URL = 'https://api.shipsgo.com/v2/air/shipments';

    if (!SHIPSGO_API_TOKEN) {
      return res.status(500).json({ 
        error: 'Missing ShipsGo API token. Set SHIPSGO_API_TOKEN in .env' 
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
});

// POST /api/shipsgo/shipments - Crear un nuevo shipment
app.post('/api/shipsgo/shipments', auth, async (req, res) => {
  console.log('🚢 [shipsgo] Creating new shipment...');
  try {
    const currentUser = (req as any).user as AuthPayload;
    
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

    // Validar máximo 9 followers visibles + 1 correo interno de operaciones
    if (followers && followers.length > MAX_VISIBLE_TRACK_FOLLOWERS) {
      return res.status(400).json({ 
        error: 'Máximo 9 emails visibles permitidos en followers' 
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

    const data = await response.json() as { shipment?: any };

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
    console.error('[shipsgo] Error:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/shipsgo/shipments/:id - Eliminar un shipment aéreo
app.delete('/api/shipsgo/shipments/:id', auth, async (req, res) => {
  const { id } = req.params;
  console.log(`✈️ [shipsgo] Deleting air shipment id=${id}...`);

  try {
    const currentUser = (req as any).user as AuthPayload;
    const SHIPSGO_API_TOKEN = process.env.SHIPSGO_API_TOKEN;

    if (!SHIPSGO_API_TOKEN) {
      return res.status(500).json({ error: 'Missing ShipsGo API token' });
    }

    const permission = await canDeleteShipsgoShipment(
      currentUser,
      'air',
      id,
      SHIPSGO_API_TOKEN,
    );

    if (!permission.allowed) {
      return res.status(permission.status).json({
        error: permission.error || 'No tienes permisos para eliminar este tracking',
      });
    }

    const response = await fetch(
      `https://api.shipsgo.com/v2/air/shipments/${encodeURIComponent(id)}`,
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
  } catch (error) {
    console.error('[shipsgo] Delete air shipment error:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/shipsgo/shipments/:id/followers - Agregar follower a shipment aéreo existente
app.post('/api/shipsgo/shipments/:id/followers', auth, async (req, res) => {
  const { id } = req.params;
  console.log(`✈️ [shipsgo] Adding follower to air shipment id=${id}...`);
  try {
    const SHIPSGO_API_TOKEN = process.env.SHIPSGO_API_TOKEN;
    if (!SHIPSGO_API_TOKEN) {
      return res.status(500).json({ error: 'Missing ShipsGo API token' });
    }

    if (!/^\d+$/.test(String(id || ''))) {
      return res.status(400).json({ error: 'shipment_id inválido' });
    }

    const follower = String(req.body?.follower || '').trim();
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
      `https://api.shipsgo.com/v2/air/shipments/${encodeURIComponent(id)}/followers`,
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
  } catch (error) {
    console.error('[shipsgo] Add follower error:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/shipsgo/shipments/:id/followers/:followerId - Eliminar follower de shipment aéreo existente
app.delete('/api/shipsgo/shipments/:id/followers/:followerId', auth, async (req, res) => {
  const { id, followerId } = req.params;
  console.log(`✈️ [shipsgo] Removing follower ${followerId} from air shipment id=${id}...`);
  try {
    const SHIPSGO_API_TOKEN = process.env.SHIPSGO_API_TOKEN;
    if (!SHIPSGO_API_TOKEN) {
      return res.status(500).json({ error: 'Missing ShipsGo API token' });
    }

    if (!/^\d+$/.test(String(id || '')) || !/^\d+$/.test(String(followerId || ''))) {
      return res.status(400).json({ error: 'shipment_id o follower_id inválido' });
    }

    const followerEmail = await getShipsgoShipmentFollowerEmail('air', id, followerId, SHIPSGO_API_TOKEN);
    if (followerEmail === OPERATIONS_FOLLOWER_EMAIL) {
      return res.status(400).json({
        error: 'El correo de operaciones es obligatorio y no puede eliminarse',
      });
    }

    const response = await fetch(
      `https://api.shipsgo.com/v2/air/shipments/${encodeURIComponent(id)}/followers/${encodeURIComponent(followerId)}`,
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
  } catch (error) {
    console.error('[shipsgo] Remove follower error:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/shipsgo/shipments/:id - Obtener detalles de un shipment aéreo
app.get('/api/shipsgo/shipments/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`✈️ [shipsgo] Fetching air shipment detail for id=${id}...`);
  try {
    const SHIPSGO_API_TOKEN = process.env.SHIPSGO_API_TOKEN;
    if (!SHIPSGO_API_TOKEN) {
      return res.status(500).json({ error: 'Missing ShipsGo API token' });
    }

    const response = await fetch(`https://api.shipsgo.com/v2/air/shipments/${encodeURIComponent(id)}`, {
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
});

// GET /api/shipsgo/shipments/:id/geojson - Obtener ruta GeoJSON de un shipment aéreo (experimental)
app.get('/api/shipsgo/shipments/:id/geojson', async (req, res) => {
  const { id } = req.params;
  console.log(`✈️ [shipsgo] Fetching air shipment geojson for id=${id}...`);
  try {
    const SHIPSGO_API_TOKEN = process.env.SHIPSGO_API_TOKEN;
    if (!SHIPSGO_API_TOKEN) {
      return res.status(500).json({ error: 'Missing ShipsGo API token' });
    }

    const response = await fetch(`https://api.shipsgo.com/v2/air/shipments/${encodeURIComponent(id)}/geojson`, {
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
});

// POST /api/shipsgo/webhooks/air - Webhook endpoint para eventos de ShipsGo Air
app.post('/api/shipsgo/webhooks/air', express.raw({ type: 'application/json' }), async (req, res) => {
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
    const shipmentId = payload?.shipment?.id;

    console.log(`[shipsgo-webhook] Event: ${eventName}, Webhook-Id: ${webhookId}, Webhook-Name: ${webhookName}, Shipment: ${shipmentId}`);
    console.log('[shipsgo-webhook] Payload:', JSON.stringify(payload, null, 2));

    // Respond immediately with 200 to acknowledge receipt
    res.status(200).json({ received: true, event: eventName });
  } catch (error) {
    console.error('[shipsgo-webhook] Error processing webhook:', error);
    res.status(200).json({ received: true, error: 'Processing error' });
  }
});

/** =========================
 *  ShipsGo Ocean API (Marítimo)
 *  ========================= */

// GET /api/shipsgo/ocean/carriers - Obtener lista de carriers marítimos
app.get('/api/shipsgo/ocean/carriers', async (req, res) => {
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
});

// GET /api/shipsgo/ocean/shipments - Obtener todos los shipments marítimos
app.get('/api/shipsgo/ocean/shipments', async (req, res) => {
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
});

// POST /api/shipsgo/ocean/shipments - Crear un nuevo shipment marítimo
app.post('/api/shipsgo/ocean/shipments', auth, async (req, res) => {
  console.log('🚢 [shipsgo-ocean] Creating new ocean shipment...');
  try {
    const currentUser = (req as any).user as AuthPayload;

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
      return res.status(400).json({ error: 'Máximo 9 emails visibles permitidos en followers' });
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
    console.error('[shipsgo-ocean] Error:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/shipsgo/ocean/shipments/:id - Eliminar un shipment marítimo
app.delete('/api/shipsgo/ocean/shipments/:id', auth, async (req, res) => {
  const { id } = req.params;
  console.log(`🚢 [shipsgo-ocean] Deleting ocean shipment id=${id}...`);

  try {
    const currentUser = (req as any).user as AuthPayload;
    const SHIPSGO_API_TOKEN = process.env.SHIPSGO_API_TOKEN;

    if (!SHIPSGO_API_TOKEN) {
      return res.status(500).json({ error: 'Missing ShipsGo API token' });
    }

    const permission = await canDeleteShipsgoShipment(
      currentUser,
      'ocean',
      id,
      SHIPSGO_API_TOKEN,
    );

    if (!permission.allowed) {
      return res.status(permission.status).json({
        error: permission.error || 'No tienes permisos para eliminar este tracking',
      });
    }

    const response = await fetch(
      `https://api.shipsgo.com/v2/ocean/shipments/${encodeURIComponent(id)}`,
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
  } catch (error) {
    console.error('[shipsgo-ocean] Delete ocean shipment error:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/shipsgo/ocean/shipments/:id/followers - Agregar follower a shipment marítimo existente
app.post('/api/shipsgo/ocean/shipments/:id/followers', auth, async (req, res) => {
  const { id } = req.params;
  console.log(`🚢 [shipsgo-ocean] Adding follower to ocean shipment id=${id}...`);
  try {
    const SHIPSGO_API_TOKEN = process.env.SHIPSGO_API_TOKEN;
    if (!SHIPSGO_API_TOKEN) {
      return res.status(500).json({ error: 'Missing ShipsGo API token' });
    }

    if (!/^\d+$/.test(String(id || ''))) {
      return res.status(400).json({ error: 'shipment_id inválido' });
    }

    const follower = String(req.body?.follower || '').trim();
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
      `https://api.shipsgo.com/v2/ocean/shipments/${encodeURIComponent(id)}/followers`,
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
  } catch (error) {
    console.error('[shipsgo-ocean] Add follower error:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/shipsgo/ocean/shipments/:id/followers/:followerId - Eliminar follower de shipment marítimo existente
app.delete('/api/shipsgo/ocean/shipments/:id/followers/:followerId', auth, async (req, res) => {
  const { id, followerId } = req.params;
  console.log(`🚢 [shipsgo-ocean] Removing follower ${followerId} from ocean shipment id=${id}...`);
  try {
    const SHIPSGO_API_TOKEN = process.env.SHIPSGO_API_TOKEN;
    if (!SHIPSGO_API_TOKEN) {
      return res.status(500).json({ error: 'Missing ShipsGo API token' });
    }

    if (!/^\d+$/.test(String(id || '')) || !/^\d+$/.test(String(followerId || ''))) {
      return res.status(400).json({ error: 'shipment_id o follower_id inválido' });
    }

    const followerEmail = await getShipsgoShipmentFollowerEmail('ocean', id, followerId, SHIPSGO_API_TOKEN);
    if (followerEmail === OPERATIONS_FOLLOWER_EMAIL) {
      return res.status(400).json({
        error: 'El correo de operaciones es obligatorio y no puede eliminarse',
      });
    }

    const response = await fetch(
      `https://api.shipsgo.com/v2/ocean/shipments/${encodeURIComponent(id)}/followers/${encodeURIComponent(followerId)}`,
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
  } catch (error) {
    console.error('[shipsgo-ocean] Remove follower error:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/shipsgo/ocean/shipments/:id - Obtener detalles de un shipment marítimo
app.get('/api/shipsgo/ocean/shipments/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`🚢 [shipsgo-ocean] Fetching ocean shipment detail for id=${id}...`);
  try {
    const SHIPSGO_API_TOKEN = process.env.SHIPSGO_API_TOKEN;
    if (!SHIPSGO_API_TOKEN) {
      return res.status(500).json({ error: 'Missing ShipsGo API token' });
    }

    const response = await fetch(`https://api.shipsgo.com/v2/ocean/shipments/${encodeURIComponent(id)}`, {
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
});

// GET /api/shipsgo/ocean/shipments/:id/geojson - Obtener ruta GeoJSON de un shipment marítimo (experimental)
app.get('/api/shipsgo/ocean/shipments/:id/geojson', async (req, res) => {
  const { id } = req.params;
  console.log(`🚢 [shipsgo-ocean] Fetching ocean shipment geojson for id=${id}...`);
  try {
    const SHIPSGO_API_TOKEN = process.env.SHIPSGO_API_TOKEN;
    if (!SHIPSGO_API_TOKEN) {
      return res.status(500).json({ error: 'Missing ShipsGo API token' });
    }

    const response = await fetch(`https://api.shipsgo.com/v2/ocean/shipments/${encodeURIComponent(id)}/geojson`, {
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
});

// POST /api/shipsgo/webhooks/ocean - Webhook endpoint para eventos de ShipsGo Ocean
app.post('/api/shipsgo/webhooks/ocean', express.raw({ type: 'application/json' }), async (req, res) => {
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
    res.status(200).json({ received: true, event: eventName });
  } catch (error) {
    console.error('[shipsgo-webhook] Error processing ocean webhook:', error);
    res.status(200).json({ received: true, error: 'Processing error' });
  }
});

// ============================================================
// RUTAS DE DOCUMENTOS
// ============================================================

// POST /api/documentos/upload - Subir documento
app.post('/api/documentos/upload', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    
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
    console.error('[documentos] Error al subir:', error);
    return res.status(500).json({ 
      error: 'Error interno al subir documento',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/documentos/:quoteId - Obtener documentos de una cotización
app.get('/api/documentos/:quoteId', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    
    if (!currentUser || !currentUser.username) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { quoteId } = req.params;

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
    console.error('[documentos] Error al obtener:', error);
    return res.status(500).json({ 
      error: 'Error interno al obtener documentos'
    });
  }
});

// GET /api/documentos/download/:documentoId - Descargar documento
app.get('/api/documentos/download/:documentoId', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    
    if (!currentUser || !currentUser.username) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { documentoId } = req.params;

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
    console.error('[documentos] Error al descargar:', error);
    return res.status(500).json({ 
      error: 'Error interno al descargar documento'
    });
  }
});

// DELETE /api/documentos/:documentoId - Eliminar documento
app.delete('/api/documentos/:documentoId', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    
    if (!currentUser || !currentUser.username) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { documentoId } = req.params;

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
    console.error('[documentos] Error al eliminar:', error);
    return res.status(500).json({ 
      error: 'Error interno al eliminar documento'
    });
  }
});

console.log('📄 Rutas de documentos configuradas');

app.post('/api/air-shipments/documentos/upload', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user; // ajuste a su implementación real
    if (!currentUser?.username || !currentUser?.sub) {
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

    return res.status(201).json({
      success: true,
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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno al subir documento' });
  }
});

app.get('/api/air-shipments/documentos/:shipmentId', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser?.username) return res.status(401).json({ error: 'Usuario no autenticado' });

    const { shipmentId } = req.params;

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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno al obtener documentos' });
  }
});

app.get('/api/air-shipments/documentos/download/:documentoId', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser?.username) return res.status(401).json({ error: 'Usuario no autenticado' });

    const { documentoId } = req.params;

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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno al descargar documento' });
  }
});

app.delete('/api/air-shipments/documentos/:documentoId', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser?.username) return res.status(401).json({ error: 'Usuario no autenticado' });

    const { documentoId } = req.params;

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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno al eliminar documento' });
  }
});

// ============================================================
// RUTAS DE DOCUMENTOS (OCEAN SHIPMENTS)
// ============================================================

app.post('/api/ocean-shipments/documentos/upload', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser?.username || !currentUser?.sub) {
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

    return res.status(201).json({
      success: true,
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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno al subir documento' });
  }
});

app.get('/api/ocean-shipments/documentos/:shipmentId', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser?.username) return res.status(401).json({ error: 'Usuario no autenticado' });

    const { shipmentId } = req.params;

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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno al obtener documentos' });
  }
});

app.get('/api/ocean-shipments/documentos/download/:documentoId', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser?.username) return res.status(401).json({ error: 'Usuario no autenticado' });

    const { documentoId } = req.params;

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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno al descargar documento' });
  }
});

app.delete('/api/ocean-shipments/documentos/:documentoId', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser?.username) return res.status(401).json({ error: 'Usuario no autenticado' });

    const { documentoId } = req.params;

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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno al eliminar documento' });
  }
});

// ============================================================
// RUTAS DE DOCUMENTOS (GROUND SHIPMENTS)
// ============================================================

app.post('/api/ground-shipments/documentos/upload', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser?.username || !currentUser?.sub) {
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

    return res.status(201).json({
      success: true,
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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno al subir documento' });
  }
});

app.get('/api/ground-shipments/documentos/:shipmentId', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser?.username) return res.status(401).json({ error: 'Usuario no autenticado' });

    const { shipmentId } = req.params;

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
      documentos: documentos.map((doc: any) => ({
        id: doc._id,
        shipmentId: doc.shipmentId,
        tipo: doc.tipo,
        nombreArchivo: doc.nombreArchivo,
        tipoArchivo: doc.tipoArchivo,
        tamanoMB: (doc.tamanoBytes / 1024 / 1024).toFixed(2),
        fechaSubida: doc.createdAt,
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno al obtener documentos' });
  }
});

app.get('/api/ground-shipments/documentos/download/:documentoId', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser?.username) return res.status(401).json({ error: 'Usuario no autenticado' });

    const { documentoId } = req.params;

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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno al descargar documento' });
  }
});

app.delete('/api/ground-shipments/documentos/:documentoId', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser?.username) return res.status(401).json({ error: 'Usuario no autenticado' });

    const { documentoId } = req.params;

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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno al eliminar documento' });
  }
});

// POST /api/google-sheets/append - Enviar datos a Google Sheets
app.post('/api/google-sheets/append', auth, async (req, res) => {
  try {
    const { values } = req.body;

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
      return res.status(response.status).json({ 
        error: 'Failed to append to Google Sheets' 
      });
    }

    const data = await response.json();
    res.status(200).json({ 
      success: true, 
      message: 'Data appended successfully',
      data 
    });

  } catch (error: any) {
    console.error('❌ Error appending to Google Sheets:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// POST /api/send-oversize-email - Notificar al ejecutivo sobre carga especial (oversize / no apta / carguero)
app.post('/api/send-oversize-email', auth, async (req, res) => {
  try {
    console.log('Endpoint /api/send-oversize-email hit');
    const currentUser = await User.findOne({ email: (req as any).user.sub }).populate('ejecutivoId');
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

    res.json({ success: true, message: 'Notificación de carga especial enviada al ejecutivo' });
  } catch (err) {
    console.error('Error en /api/send-oversize-email:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/send-oversize-email-ocean - Notificar al ejecutivo sobre carga oversize marítima LCL
app.post('/api/send-oversize-email-ocean', auth, async (req, res) => {
  try {
    console.log('Endpoint /api/send-oversize-email-ocean hit');
    const currentUser = await User.findOne({ email: (req as any).user.sub }).populate('ejecutivoId');
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

    res.json({ success: true, message: 'Notificación de carga marítima especial enviada al ejecutivo' });
  } catch (err) {
    console.error('Error en /api/send-oversize-email-ocean:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/send-operation-email - Enviar notificación de nueva operación al ejecutivo
app.post('/api/send-operation-email', auth, async (req, res) => {
  try {
    console.log('Endpoint /api/send-operation-email hit');
    // Obtener el usuario actual con su ejecutivo poblado
    const currentUser = await User.findOne({ email: (req as any).user.sub }).populate('ejecutivoId');
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
      date 
    } = req.body;
    
    console.log('Email data:', req.body);

    // Construir el mensaje en español
    const tipoTexto = tipoAccion === 'operacion' ? 'operación' : 'cotización';
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

${tipoAccion === 'operacion' ? 'Esta operación está pendiente de proceso.' : 'Esta cotización está lista para revisión.'}

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

${tipoAccion === 'operacion' ? 'Esta operación está pendiente de proceso.' : 'Esta cotización está lista para revisión.'}

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

${tipoAccion === 'operacion' ? 'Esta operación está pendiente de proceso.' : 'Esta cotización está lista para revisión.'}

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

    if (!brevoResponse.ok) {
      const errorText = await brevoResponse.text();
      console.error('Error enviando correo con Brevo:', errorText);
      // No devolver error al cliente, solo loggear
    }

    res.json({ success: true, message: 'Notificación enviada al ejecutivo' });
  } catch (err) {
    console.error('Error en /api/send-operation-email:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================================
// RUTAS DE PDF DE COTIZACIONES
// ============================================================

// POST /api/quote-pdf/upload - Subir PDF de cotización
app.post('/api/quote-pdf/upload', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user;

    if (!currentUser || !currentUser.sub || !currentUser.username) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { quoteNumber, nombreArchivo, contenidoBase64, tipoServicio, origen, destino } = req.body;

    // Permitir que el cliente (front) envíe `usuarioId` y `subidoPor` cuando
    // el usuario autenticado es el ejecutivo que actúa en nombre
    // de un cliente. Esto evita cambiar el comportamiento para usuarios
    // autenticados normales (clientes). Sólo se usará el override cuando
    // ambos campos estén presentes y el username sea 'Ejecutivo'.
    const overrideUsuarioId = typeof (req.body.usuarioId) === 'string' ? String(req.body.usuarioId) : null;
    const overrideSubidoPor = typeof (req.body.subidoPor) === 'string' ? String(req.body.subidoPor) : null;

    const shouldUseOverride =
      currentUser.username === 'Ejecutivo' && overrideUsuarioId && overrideSubidoPor;

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
    console.error('[quote-pdf] Error al subir:', error);
    return res.status(500).json({ error: 'Error interno al guardar PDF de cotización' });
  }
});

// GET /api/quote-pdf/list - Obtener lista de PDFs disponibles para el usuario
app.get('/api/quote-pdf/list', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user;

    if (!currentUser || !currentUser.username) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const pdfs = await QuotePDF.find({ 
      usuarioId: currentUser.username,
      quoteNumber: { $exists: true, $nin: ['', null] }
    })
      .select('-contenidoBase64')
      .sort({ createdAt: -1 });

    const pdfList = pdfs.map(pdf => ({
      id: pdf._id,
      quoteNumber: pdf.quoteNumber,
      nombreArchivo: pdf.nombreArchivo,
      tipoServicio: pdf.tipoServicio,
      origen: pdf.origen,
      destino: pdf.destino,
      tamanoMB: (pdf.tamanoBytes / 1024 / 1024).toFixed(2),
      fechaCreacion: pdf.createdAt,
    }));

    console.log(`[quote-pdf] Listando PDFs para ${currentUser.username}: ${pdfs.length} encontrados`);
    console.log(`[quote-pdf] quoteNumbers en DB:`, pdfList.map(p => p.quoteNumber));

    return res.json({
      success: true,
      pdfs: pdfList,
    });
  } catch (error: any) {
    console.error('[quote-pdf] Error al listar:', error);
    return res.status(500).json({ error: 'Error interno al listar PDFs' });
  }
});

// DELETE /api/quote-pdf/cleanup - Eliminar todos los PDFs del usuario (para limpieza)
app.delete('/api/quote-pdf/cleanup', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser || !currentUser.username) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    const result = await QuotePDF.deleteMany({ usuarioId: currentUser.username });
    console.log(`[quote-pdf] Limpieza: ${result.deletedCount} PDFs eliminados para ${currentUser.username}`);
    return res.json({ success: true, deletedCount: result.deletedCount });
  } catch (error: any) {
    console.error('[quote-pdf] Error en limpieza:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// GET /api/quote-pdf/download/:quoteNumber - Descargar PDF de cotización
app.get('/api/quote-pdf/download/:quoteNumber', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user;

    if (!currentUser || !currentUser.username) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { quoteNumber } = req.params;

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
    console.error('[quote-pdf] Error al descargar:', error);
    return res.status(500).json({ error: 'Error interno al descargar PDF' });
  }
});


// ============================================================
// RUTAS DE AUDITORÍA
// ============================================================

// POST /api/audit — Registrar evento de auditoría
app.post('/api/audit', auth, async (req, res) => {
  try {
    const { usuario, email, rol, ejecutivo, ejecutivoEmail, accion, categoria, descripcion, detalles, clienteAfectado } = req.body;

    if (!accion || !categoria || !descripcion) {
      return res.status(400).json({ error: 'accion, categoria y descripcion son requeridos' });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;

    const auditEntry = await AuditLog.create({
      usuario: usuario || (req as any).user?.username || 'desconocido',
      email: email || (req as any).user?.sub || '',
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
    console.error('[audit] Error al registrar evento:', error);
    return res.status(500).json({ error: 'Error al registrar evento de auditoría' });
  }
});

// GET /api/audit — Listar eventos de auditoría (solo ejecutivos/admins)
app.get('/api/audit', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user as AuthPayload;
    
    // Solo ejecutivos pueden ver la auditoría
    if (currentUser.username !== 'Ejecutivo') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const {
      page = '1',
      limit = '50',
      categoria,
      accion,
      usuario,
      desde,
      hasta,
      busqueda,
    } = req.query as Record<string, string>;

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

    // Estadísticas rápidas
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
    console.error('[audit] Error al listar eventos:', error);
    return res.status(500).json({ error: 'Error al obtener auditoría' });
  }
});

// ============================================================
// RUTAS DE ALUMNOS PRÁCTICA
// ============================================================

// GET /api/alumnos - Obtener todos los alumnos ordenados por puntaje
app.get('/api/alumnos', auth, async (_req, res) => {
  try {
    // Incluir documentos legacy sin campo `activo`
    const filtroActivo = { $or: [{ activo: true }, { activo: { $exists: false } }] };
    const alumnos = await Alumno.find(filtroActivo).sort({ puntajeTotal: -1 }).lean();
    // Evitar cache de CDN/edge para respuesta dinámica
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ alumnos });
  } catch (error) {
    console.error('[alumnos] Error:', error);
    return res.status(500).json({ error: 'Error al obtener alumnos' });
  }
});

// POST /api/alumnos - Crear un nuevo alumno
app.post('/api/alumnos', auth, async (req, res) => {
  try {
    const { nombre, tipoEntrenamiento, puntaje } = req.body || {};
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
  } catch (error) {
    console.error('[alumnos] Error al crear alumno:', error);
    return res.status(500).json({ error: 'Error al crear alumno' });
  }
});

// POST /api/alumnos/puntaje - Agregar puntaje a un alumno existente
app.post('/api/alumnos/puntaje', auth, async (req, res) => {
  try {
    const { alumnoId, tipoEntrenamiento, puntaje } = req.body || {};
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
    return res.json({ alumno });
  } catch (error) {
    console.error('[alumnos] Error al agregar puntaje:', error);
    return res.status(500).json({ error: 'Error al agregar puntaje' });
  }
});

// GET /api/alumnos/ranking - Ranking con filtros por semana/mes
app.get('/api/alumnos/ranking', auth, async (req, res) => {
  try {
    const periodo = (req.query.periodo as string) || 'total';
    const mes = req.query.mes as string | undefined;
    const anio = req.query.anio as string | undefined;

    const filtroActivo = { $or: [{ activo: true }, { activo: { $exists: false } }] };
    const alumnos = await Alumno.find(filtroActivo).lean();

    if (periodo === 'total') {
      const ranking = alumnos
        .map(a => ({ _id: a._id, nombre: a.nombre, tipoEntrenamiento: a.tipoEntrenamiento, puntajeTotal: a.puntajeTotal }))
        .sort((a, b) => b.puntajeTotal - a.puntajeTotal);
      return res.json({ ranking, periodo });
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
      const m = mes !== undefined ? parseInt(mes) : new Date().getMonth();
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

    return res.json({ ranking, periodo, fechaInicio, fechaFin });
  } catch (error) {
    console.error('[alumnos] Error ranking:', error);
    return res.status(500).json({ error: 'Error al obtener ranking' });
  }
});

// GET /api/alumnos/detalle/:id - Obtener un alumno específico con historial
app.get('/api/alumnos/detalle/:id', auth, async (req, res) => {
  try {
    const alumno = await Alumno.findById(req.params.id).lean();
    if (!alumno) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }
    return res.json({ alumno });
  } catch (error) {
    console.error('[alumnos] Error:', error);
    return res.status(500).json({ error: 'Error al obtener alumno' });
  }
});

// DELETE /api/alumnos/:id - Desactivar alumno
app.delete('/api/alumnos/:id', auth, async (req, res) => {
  try {
    const alumno = await Alumno.findByIdAndUpdate(req.params.id, { activo: false }, { new: true });
    if (!alumno) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }
    return res.json({ message: 'Alumno desactivado', alumno });
  } catch (error) {
    console.error('[alumnos] Error al eliminar:', error);
    return res.status(500).json({ error: 'Error al eliminar alumno' });
  }
});

/** =========================
 *  Start
 *  ========================= */
const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`🚀 Auth server: http://localhost:${PORT}`);
});