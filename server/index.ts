// server/index.ts
import express from 'express';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';
import jwt from 'jsonwebtoken';      // ⬅️ import default (esModuleInterop)
import bcrypt from 'bcryptjs';       // ⬅️ import default (esModuleInterop)
import 'dotenv/config';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const USERS_PATH = path.resolve(__dirname, '../data/users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'cambia-esto-en-.env';
const TOKEN_TTL = process.env.JWT_TTL || '7d';

type User = { email: string; username: string; passwordHash: string };

const loadUsers = (): User[] => {
  try {
    if (!fs.existsSync(USERS_PATH)) return [];
    const raw = fs.readFileSync(USERS_PATH, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('[loadUsers] error:', e);
    return [];
  }
};

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

app.post('/api/login', (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Faltan campos' });
    }

    const users = loadUsers();
    console.log('[login] usuarios cargados:', users.length);

    const lookupEmail = String(email).toLowerCase().trim();
    const user = users.find(u => u.email === lookupEmail);

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
    return res.json({ token, user: { email: user.email, username: user.username } });
  } catch (e) {
    console.error('[login] error inesperado:', e);
    return res.status(500).json({ error: 'Error interno' });
  }
});

app.get('/api/me', auth, (req, res) => {
  res.json({ user: (req as any).user });
});

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => console.log(`Auth server: http://localhost:${PORT}`));
