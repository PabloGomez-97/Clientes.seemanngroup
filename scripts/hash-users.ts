// scripts/hash-users.ts
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

// ✅ Usa el bundle ESM de xlsx
import * as XLSX from 'xlsx/xlsx.mjs';

// En Node, hay que inyectar fs al bundle ESM
(XLSX as any).set_fs?.(fs);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXCEL_PATH = path.resolve(__dirname, '../data/usuarios.xlsx');
const OUT_PATH = path.resolve(__dirname, '../data/users.json');

type Row = {
  'Correo electrónico': string;
  'Clave': string;
  'Nombre usuario': string;
};

if (!fs.existsSync(EXCEL_PATH)) {
  console.error('No se encuentra data/usuarios.xlsx');
  process.exit(1);
}

const wb = XLSX.readFile(EXCEL_PATH);               // ← ahora sí existe
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json<Row>(sheet);

const users = rows
  .map((r, i) => {
    const email = String(r['Correo electrónico'] ?? '').trim().toLowerCase();
    const password = String(r['Clave'] ?? '');
    const username = String(r['Nombre usuario'] ?? '').trim();

    if (!email || !password) {
      console.warn(`Fila ${i + 2}: faltan campos; se omite`);
      return null;
    }

    return {
      email,
      username,
      passwordHash: bcrypt.hashSync(password, 12),
    };
  })
  .filter(Boolean);

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify(users, null, 2));
console.log(`✓ users.json generado con ${users.length} usuarios → ${OUT_PATH}`);
