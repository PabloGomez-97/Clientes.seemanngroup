// server/index.ts
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

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

/** =========================
 *  Mongoose / Modelos tipados
 *  ========================= */
interface IUser {
  email: string;
  username: string;
  passwordHash: string;
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
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

// Evita redefinir el modelo y, sobre todo, evita unión de tipos
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
    const user = await User.findOne({ email: lookupEmail });

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
    return res.json({
      token,
      user: { email: user.email, username: user.username },
    });
  } catch (e) {
    console.error('[login] error inesperado:', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

// Verificar token
app.get('/api/me', auth, (req, res) => {
  res.json({ user: (req as any).user });
});

// ============================================================
// ENDPOINTS DE ADMINISTRACIÓN
// ============================================================

// Crear nuevo usuario (solo para administradores)
app.post('/api/admin/create-user', auth, async (req, res) => {
  try {
    const currentUser = (req as any).user as AuthPayload;
    if (currentUser.username !== 'Administrador') {
      return res.status(403).json({ error: 'No tienes permisos para crear usuarios' });
    }

    const { email, username, password } = (req.body as any) || {};
    if (!email || !username || !password) {
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
      passwordHash,
    });

    await newUser.save();

    console.log('[admin] Usuario creado:', normalizedEmail);

    return res.json({
      success: true,
      message: 'Usuario creado exitosamente',
      user: {
        email: newUser.email,
        username: newUser.username,
      },
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

    const users = await User.find({}, { passwordHash: 0 }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      users: users.map((u: IUserDoc) => ({
        id: u._id,
        email: u.email,
        username: u.username,
        createdAt: u.createdAt,
      })),
    });
  } catch (e) {
    console.error('[admin] Error listando usuarios:', e);
    return res.status(500).json({ error: 'Error al listar usuarios' });
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
      message: 'Usuario eliminado exitosamente',
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

    // Si el access_token aún es válido (con 5 min de margen), usarlo
    const now = Date.now();
    if (linbisTokenCache.access_token && 
        linbisTokenCache.access_token_expiry && 
        linbisTokenCache.access_token_expiry > now + 300000) {
      console.log('[linbis-token] Using cached access token');
      return res.json({ token: linbisTokenCache.access_token });
    }

    // Si expiró o no existe, renovar usando refresh_token
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

    const data = await response.json();

    // Actualizar el cache con el nuevo token
    linbisTokenCache.access_token = data.access_token;
    linbisTokenCache.access_token_expiry = now + (data.expires_in * 1000);
    
    // Si viene un nuevo refresh_token, actualizarlo también
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
 *  Start
 *  ========================= */
const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`🚀 Auth server: http://localhost:${PORT}`);
});