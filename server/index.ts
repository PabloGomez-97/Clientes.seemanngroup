// server/index.ts
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

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

const User = mongoose.model('User', UserSchema);

// Conectar a MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Conectado a MongoDB Atlas');
  })
  .catch((error) => {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  });

const sign = (payload: object) =>
  jwt.sign(payload as any, JWT_SECRET, { expiresIn: TOKEN_TTL });

const auth: express.RequestHandler = (req, res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No auth token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Faltan campos' });
    }

    const lookupEmail = String(email).toLowerCase().trim();
    
    // Buscar usuario en MongoDB
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
      user: { email: user.email, username: user.username } 
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
    // Verificar que el usuario autenticado sea administrador
    const currentUser = (req as any).user;
    if (currentUser.username !== 'Administrador') {
      return res.status(403).json({ error: 'No tienes permisos para crear usuarios' });
    }

    const { email, username, password } = req.body || {};

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Hashear la contraseña
    const passwordHash = bcrypt.hashSync(password, 12);

    // Crear el nuevo usuario
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
  } catch (e) {
    console.error('[admin] Error creando usuario:', e);
    return res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// Listar todos los usuarios (solo para administradores)
app.get('/api/admin/users', auth, async (req, res) => {
  try {
    // Verificar que el usuario autenticado sea administrador
    const currentUser = (req as any).user;
    if (currentUser.username !== 'Administrador') {
      return res.status(403).json({ error: 'No tienes permisos para ver usuarios' });
    }

    const users = await User.find({}, { passwordHash: 0 }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      users: users.map(u => ({
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

// Eliminar usuario (solo para administradores)
app.delete('/api/admin/users/:id', auth, async (req, res) => {
  try {
    // Verificar que el usuario autenticado sea administrador
    const currentUser = (req as any).user;
    if (currentUser.username !== 'Administrador') {
      return res.status(403).json({ error: 'No tienes permisos para eliminar usuarios' });
    }

    const { id } = req.params;

    // No permitir que el admin se elimine a sí mismo
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

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`🚀 Auth server: http://localhost:${PORT}`);
});