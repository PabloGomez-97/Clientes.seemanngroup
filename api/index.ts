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

    // Ruta no encontrada
    return res.status(404).json({ error: 'Ruta no encontrada' });
  } catch (error) {
    console.error('Error en handler:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}