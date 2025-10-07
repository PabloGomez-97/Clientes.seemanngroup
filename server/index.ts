// server/index.ts
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import * as jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

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
 *  Mongoose / Modelos
 *  ========================= */
const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

// Evita redefinir el modelo si hay recarga en dev
const User = mongoose.models.User || mongoose.model('User', UserSchema);

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
      users: users.map((u: any) => ({
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

/** =========================
 *  Start
 *  ========================= */
const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`🚀 Auth server: http://localhost:${PORT}`);
});
