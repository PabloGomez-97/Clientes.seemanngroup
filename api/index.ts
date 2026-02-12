// api/index.ts - Serverless function para Vercel, ESTO ES SOLO PARA PRODUCCIÓN
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

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

/** =========================
 *  Mongoose / Modelos tipados
 *  ========================= */

// ✅ Modelo Ejecutivo
interface IEjecutivo {
  nombre: string;
  email: string;
  telefono: string;
  activo: boolean;
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
  },
  { timestamps: true }
);

const Ejecutivo = (mongoose.models.Ejecutivo || mongoose.model<IEjecutivoDoc>('Ejecutivo', EjecutivoSchema)) as EjecutivoModel;

// ✅ Modelo User con referencia a Ejecutivo
interface IUser {
  email: string;
  username: string;
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
    nombreuser: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    ejecutivoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ejecutivo' },
  },
  { timestamps: true }
);

const User = (mongoose.models.User || mongoose.model<IUserDoc>('User', UserSchema)) as UserModel;

// ============================================================
// MODELO DE DOCUMENTOS (AIR SHIPMENTS)
// ============================================================

type TipoDocumentoAirShipment =
  | 'Documento de transporte Internacional (AWB - Aereo y BL - Maritimo)'
  | 'Facturas asociados al servicio';

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
        'Documento de transporte Internacional (AWB - Aereo y BL - Maritimo)',
        'Facturas asociados al servicio',
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
      return res.json({
        token,
        user: { 
          email: user.email, 
          username: user.username,
          nombreuser: user.nombreuser,
          ejecutivo: ejecutivo ? {
            id: ejecutivo._id,
            nombre: ejecutivo.nombre,
            email: ejecutivo.email,
            telefono: ejecutivo.telefono
          } : null
        },
      });
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
        return res.json({ 
          user: {
            sub: user.email,
            username: user.username,
            nombreuser: user.nombreuser,
            ejecutivo: ejecutivo ? {
              id: ejecutivo._id,
              nombre: ejecutivo.nombre,
              email: ejecutivo.email,
              telefono: ejecutivo.telefono
            } : null
          }
        });
      } catch {
        return res.status(401).json({ error: 'Invalid token' });
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
          { ejecutivoId: ejecutivoObjectId },
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
        if (currentUser.username !== 'Administrador') {
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
        if (currentUser.username !== 'Administrador') {
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
        if (currentUser.username !== 'Administrador') {
          return res.status(403).json({ error: 'No tienes permisos' });
        }

        const { nombre, email, telefono } = (req.body as any) || {};
        if (!nombre || !email || !telefono) {
          return res.status(400).json({ error: 'Faltan campos requeridos' });
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
          activo: true
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
        if (currentUser.username !== 'Administrador') {
          return res.status(403).json({ error: 'No tienes permisos' });
        }

        const id = path.split('/').pop();
        const { nombre, email, telefono, activo } = (req.body as any) || {};

        const ejecutivo = await Ejecutivo.findById(id);
        if (!ejecutivo) {
          return res.status(404).json({ error: 'Ejecutivo no encontrado' });
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
            activo: ejecutivo.activo
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
        if (currentUser.username !== 'Administrador') {
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
        if (currentUser.username !== 'Administrador') {
          return res.status(403).json({ error: 'No tienes permisos para crear usuarios' });
        }

        const { email, username, nombreuser, password, ejecutivoId } = (req.body as any) || {};
        if (!email || !username || !nombreuser || !password) {
          return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const normalizedEmail = String(email).toLowerCase().trim();
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
          return res.status(400).json({ error: 'El email ya está registrado' });
        }

        const passwordHash = bcrypt.hashSync(String(password), 12);

        const newUser = new User({
          email: normalizedEmail,
          username: String(username).trim(),
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
        if (currentUser.username !== 'Administrador') {
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
        if (currentUser.username !== 'Administrador') {
          return res.status(403).json({ error: 'No tienes permisos para actualizar usuarios' });
        }

        const id = path.split('/').pop();
        const { username, nombreuser, password, ejecutivoId } = (req.body as any) || {};

        const userToUpdate = await User.findById(id);
        if (!userToUpdate) {
          return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        if (userToUpdate.username === 'Administrador') {
          return res.status(400).json({ error: 'No puedes modificar la cuenta de administrador' });
        }

        if (username) {
          userToUpdate.username = String(username).trim();
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
        if (currentUser.username !== 'Administrador') {
          return res.status(403).json({ error: 'No tienes permisos para eliminar usuarios' });
        }

        const id = path.split('/').pop();

        const userToDelete = await User.findById(id);
        if (userToDelete?.username === 'Administrador') {
          return res.status(400).json({ error: 'No puedes eliminar la cuenta de administrador' });
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

        // ✅ SEGURIDAD: Validar que la referencia coincida con el username del usuario
        if (reference !== currentUser.username) {
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

        // Validar máximo 10 followers
        if (followers && followers.length > 10) {
          return res.status(400).json({ 
            error: 'Máximo 10 emails permitidos en followers' 
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
          followers: followers || [],
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

        const nuevoDocumento = await Documento.create({
          quoteId: String(quoteId),
          tipo,
          nombreArchivo: String(nombreArchivo),
          tipoArchivo: mimeType,
          tamanoBytes: fileSize,
          contenidoBase64,
          subidoPor: currentUser.sub,
          usuarioId: currentUser.username
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

        const documentos = await Documento.find({ 
          quoteId: String(quoteId),
          usuarioId: currentUser.username 
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

        const documento = await Documento.findById(documentoId);

        if (!documento) {
          return res.status(404).json({ error: 'Documento no encontrado' });
        }

        if (documento.usuarioId !== currentUser.username) {
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

        const documento = await Documento.findById(documentoId);

        if (!documento) {
          return res.status(404).json({ error: 'Documento no encontrado' });
        }

        if (documento.usuarioId !== currentUser.username) {
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
          'Documento de transporte Internacional (AWB - Aereo y BL - Maritimo)',
          'Facturas asociados al servicio',
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

        const nuevoDocumento = await AirShipmentDocumento.create({
          shipmentId: String(shipmentId),
          tipo,
          nombreArchivo: String(nombreArchivo),
          tipoArchivo: mimeType,
          tamanoBytes: fileSize,
          contenidoBase64,
          subidoPor: currentUser.sub,
          usuarioId: currentUser.username,
        });

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

        const documentos = await AirShipmentDocumento.find({
          shipmentId: String(shipmentId),
          usuarioId: currentUser.username,
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

        const documento = await AirShipmentDocumento.findById(documentoId);
        if (!documento) return res.status(404).json({ error: 'Documento no encontrado' });

        if (documento.usuarioId !== currentUser.username) {
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

        const documento = await AirShipmentDocumento.findById(documentoId);
        if (!documento) return res.status(404).json({ error: 'Documento no encontrado' });

        if (documento.usuarioId !== currentUser.username) {
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

        // Permitir override desde el frontend cuando el administrador/ejecutivo
        // genera el PDF en nombre de un cliente. Sólo se usará si ambos campos
        // están presentes y el usuario autenticado tiene username === 'Administrador'.
        const overrideUsuarioId = typeof (req.body.usuarioId) === 'string' ? String(req.body.usuarioId) : null;
        const overrideSubidoPor = typeof (req.body.subidoPor) === 'string' ? String(req.body.subidoPor) : null;
        const shouldUseOverride = currentUser.username === 'Administrador' && overrideUsuarioId && overrideSubidoPor;
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


    // Ruta no encontrada
    return res.status(404).json({ error: 'Ruta no encontrada' });
  } catch (error) {
    console.error('Error en handler:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}