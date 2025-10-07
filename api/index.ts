// api/index.ts - Serverless function para Vercel
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'cambia-esto-en-.env';
const TOKEN_TTL = process.env.JWT_TTL || '7d';
const MONGODB_URI = process.env.MONGODB_URI || '';

// Definir esquema de Usuario
const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Evitar redefinir el modelo si ya existe
const User = mongoose.models.User || mongoose.model('User', UserSchema);

// Conectar a MongoDB (reutiliza la conexión)
let cachedDb: typeof mongoose | null = null;

async function connectDB() {
  if (cachedDb) {
    return cachedDb;
  }

  const db = await mongoose.connect(MONGODB_URI, {
    bufferCommands: false,
  });

  cachedDb = db;
  return db;
}

const sign = (payload: object): string => {
  return jwt.sign(
    payload, 
    JWT_SECRET as jwt.Secret, 
    { expiresIn: TOKEN_TTL }
  );
};

// Función principal del handler
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
      const { email, password } = req.body || {};

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

      const token = sign({ sub: user.email, username: user.username });
      return res.json({
        token,
        user: { email: user.email, username: user.username },
      });
    }

    // GET /api/me
    if (path === '/api/me' && method === 'GET') {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

      if (!token) {
        return res.status(401).json({ error: 'No auth token' });
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return res.json({ user: decoded });
      } catch {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    // ============================================================
    // RUTAS DE ADMINISTRACIÓN
    // ============================================================

    // Verificar autenticación para rutas admin
    const requireAuth = () => {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

      if (!token) {
        throw new Error('No auth token');
      }

      try {
        return jwt.verify(token, JWT_SECRET) as any;
      } catch {
        throw new Error('Invalid token');
      }
    };

    // POST /api/admin/create-user
    if (path === '/api/admin/create-user' && method === 'POST') {
      try {
        const currentUser = requireAuth();

        if (currentUser.username !== 'Administrador') {
          return res.status(403).json({ error: 'No tienes permisos para crear usuarios' });
        }

        const { email, username, password } = req.body || {};

        if (!email || !username || !password) {
          return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
          return res.status(400).json({ error: 'El email ya está registrado' });
        }

        const passwordHash = bcrypt.hashSync(password, 12);

        const newUser = new User({
          email: email.toLowerCase().trim(),
          username: username.trim(),
          passwordHash,
        });

        await newUser.save();

        console.log('[admin] Usuario creado:', email);

        return res.json({
          success: true,
          message: 'Usuario creado exitosamente',
          user: {
            email: newUser.email,
            username: newUser.username,
          },
        });
      } catch (e: any) {
        if (e.message === 'No auth token' || e.message === 'Invalid token') {
          return res.status(401).json({ error: e.message });
        }
        console.error('[admin] Error creando usuario:', e);
        return res.status(500).json({ error: 'Error al crear usuario' });
      }
    }

    // GET /api/admin/users
    if (path === '/api/admin/users' && method === 'GET') {
      try {
        const currentUser = requireAuth();

        if (currentUser.username !== 'Administrador') {
          return res.status(403).json({ error: 'No tienes permisos para ver usuarios' });
        }

        const users = await User.find({}, { passwordHash: 0 }).sort({ createdAt: -1 });

        return res.json({
          success: true,
          users: users.map((u) => ({
            id: u._id,
            email: u.email,
            username: u.username,
            createdAt: u.createdAt,
          })),
        });
      } catch (e: any) {
        if (e.message === 'No auth token' || e.message === 'Invalid token') {
          return res.status(401).json({ error: e.message });
        }
        console.error('[admin] Error listando usuarios:', e);
        return res.status(500).json({ error: 'Error al listar usuarios' });
      }
    }

    // DELETE /api/admin/users/:id
    if (path?.startsWith('/api/admin/users/') && method === 'DELETE') {
      try {
        const currentUser = requireAuth();

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
        if (e.message === 'No auth token' || e.message === 'Invalid token') {
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