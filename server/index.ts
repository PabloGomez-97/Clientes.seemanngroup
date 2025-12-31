// server/index.ts ESTO ES SOLO PARA DESARROLLO LOCAL
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import chatHandler from '../api/chat.ts'; 

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
 *  Express app
 *  ========================= */
const app = express();
app.use(cors());
app.use(express.json());

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

// ✅ MODIFICADO: Modelo User con referencia a Ejecutivo
interface IUser {
  email: string;
  nombreuser: string;
  username: string;
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
    nombreuser: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    ejecutivoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ejecutivo' },
  },
  { timestamps: true }
);

const User = (mongoose.models.User || mongoose.model<IUserDoc>('User', UserSchema)) as UserModel;

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
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No auth token' });

  try {
    const decoded = verifyToken(token);
    (req as any).user = decoded;
    next();
  } catch {
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
    
    // ✅ MODIFICADO: Retornar datos del ejecutivo si existe
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
  } catch (e) {
    console.error('[login] error inesperado:', e);
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

    // ✅ MODIFICADO: Retornar datos del ejecutivo si existe
    const ejecutivo = user.ejecutivoId as any;
    res.json({ 
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
  } catch (e) {
    console.error('[me] error:', e);
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
      { ejecutivoId: ejecutivoObjectId, username: { $ne: 'Administrador' } },
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

// Listar ejecutivos (solo administradores)
app.get('/api/admin/ejecutivos', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user as AuthPayload;
    if (currentUser.username !== 'Administrador') {
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

// Crear ejecutivo (solo administradores)
app.post('/api/admin/ejecutivos', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user as AuthPayload;
    if (currentUser.username !== 'Administrador') {
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

// Actualizar ejecutivo (solo administradores)
app.put('/api/admin/ejecutivos/:id', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user as AuthPayload;
    if (currentUser.username !== 'Administrador') {
      return res.status(403).json({ error: 'No tienes permisos' });
    }

    const { id } = req.params;
    const { nombre, email, telefono, activo } = (req.body as any) || {};

    if (!nombre || !email || !telefono) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const ejecutivo = await Ejecutivo.findByIdAndUpdate(
      id,
      {
        nombre: String(nombre).trim(),
        email: String(email).toLowerCase().trim(),
        telefono: String(telefono).trim(),
        activo: activo !== undefined ? activo : true
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
        activo: ejecutivo.activo
      }
    });
  } catch (e) {
    console.error('[admin] Error actualizando ejecutivo:', e);
    return res.status(500).json({ error: 'Error al actualizar ejecutivo' });
  }
});

// Eliminar ejecutivo (solo administradores)
app.delete('/api/admin/ejecutivos/:id', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user as AuthPayload;
    if (currentUser.username !== 'Administrador') {
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

// Crear nuevo usuario (solo para administradores)
app.post('/api/admin/create-user', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user as AuthPayload;
    if (currentUser.username !== 'Administrador') {
      return res.status(403).json({ error: 'No tienes permisos para crear usuarios' });
    }

    // ✅ MODIFICADO: Recibir ejecutivoId y nombreuser
    const { email, username, nombreuser, password, ejecutivoId } = (req.body as any) || {}; // ✅ AGREGADO nombreuser
    if (!email || !username || !nombreuser || !password) { // ✅ AGREGADO nombreuser
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

// Listar usuarios (solo administradores)
app.get('/api/admin/users', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user as AuthPayload;
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
  } catch (e) {
    console.error('[admin] Error listando usuarios:', e);
    return res.status(500).json({ error: 'Error al listar usuarios' });
  }
});

// Actualizar usuario (solo administradores)
app.put('/api/admin/users/:id', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user as AuthPayload;
    if (currentUser.username !== 'Administrador') {
      return res.status(403).json({ error: 'No tienes permisos para actualizar usuarios' });
    }

    const { id } = req.params;
    const { username, nombreuser, password, ejecutivoId } = (req.body as any) || {}; // ✅ AGREGADO nombreuser

    const userToUpdate = await User.findById(id);
    if (!userToUpdate) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (userToUpdate.username === 'Administrador') {
      return res.status(400).json({ error: 'No puedes modificar la cuenta de administrador' });
    }

    // Actualizar campos
    if (username) {
      userToUpdate.username = String(username).trim();
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

// Eliminar usuario (solo administradores)
app.delete('/api/admin/users/:id', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user as AuthPayload;
    if (currentUser.username !== 'Administrador') {
      return res.status(403).json({ error: 'No tienes permisos para eliminar usuarios' });
    }

    const { id } = req.params;

    const userToDelete = await User.findById(id);
    if (userToDelete?.username === 'Administrador') {
      return res.status(400).json({ error: 'No puedes eliminar la cuenta de administrador' });
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

/** =========================
 *  Start
 *  ========================= */
const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`🚀 Auth server: http://localhost:${PORT}`);
});