// api/index.ts - Serverless function para Vercel
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

// Evitar unión de tipos: forzar el tipo explícito del modelo
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
    }

    // GET /api/me
    if (path === '/api/me' && method === 'GET') {
      const token = extractBearerToken(req);
      if (!token) {
        return res.status(401).json({ error: 'No auth token' });
      }

      try {
        const decoded = verifyToken(token);
        return res.json({ user: decoded });
      } catch {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    // ============================================================
    // RUTAS DE ADMINISTRACIÓN
    // ============================================================

    // POST /api/admin/create-user
    if (path === '/api/admin/create-user' && method === 'POST') {
      try {
        const currentUser = requireAuth(req);

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
      } catch (e: any) {
        if (e?.message === 'No auth token' || e?.message === 'Invalid token') {
          return res.status(401).json({ error: e.message });
        }
        console.error('[admin] Error listando usuarios:', e);
        return res.status(500).json({ error: 'Error al listar usuarios' });
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

        console.log('[admin] Usuario eliminado:', id);

        return res.json({
          success: true,
          message: 'Usuario eliminado exitosamente',
        });
      } catch (e: any) {
        if (e?.message === 'No auth token' || e?.message === 'Invalid token') {
          return res.status(401).json({ error: e.message });
        }
        console.error('[admin] Error eliminando usuario:', e);
        return res.status(500).json({ error: 'Error al eliminar usuario' });
      }
    }

    // Ruta no encontrada
    return res.status(404).json({ error: 'Ruta no encontrada' });
  } catch (error) {
    console.error('Error en handler:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
