export interface OpEjecutivoRef {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
}

export interface OpCachedClient {
  id: string;
  email: string;
  username: string;
  nombreuser?: string;
  usernames?: string[];
  createdAt: string;
  ejecutivo?: OpEjecutivoRef | null;
}

/** Limpia la clave legacy de localStorage (caché TTL ya no se usa). */
export function clearLegacyOpClientsCache() {
  try {
    localStorage.removeItem("op_admin_users_v2");
  } catch {
    /* ignore */
  }
}

function mapEjecutivo(raw: unknown): OpEjecutivoRef | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  if (!e.id && !e.nombre) return null;
  return {
    id: String(e.id ?? ""),
    nombre: String(e.nombre ?? ""),
    email: String(e.email ?? ""),
    telefono: e.telefono ? String(e.telefono) : undefined,
  };
}

function mapClientUser(raw: unknown): OpCachedClient | null {
  if (!raw || typeof raw !== "object") return null;
  const u = raw as Record<string, unknown>;
  const username = String(u.username ?? "").trim();
  if (!username || username === "Ejecutivo") return null;
  return {
    id: String(u.id ?? ""),
    email: String(u.email ?? ""),
    username,
    nombreuser: u.nombreuser ? String(u.nombreuser) : undefined,
    usernames: Array.isArray(u.usernames)
      ? u.usernames.map((n) => String(n))
      : [username],
    createdAt: String(u.createdAt ?? ""),
    ejecutivo: mapEjecutivo(u.ejecutivo),
  };
}

export function normalizeOpClientsFromApi(raw: unknown): OpCachedClient[] {
  const payload = raw as { users?: unknown[] } | unknown[] | null;
  const arr: unknown[] = Array.isArray((payload as { users?: unknown[] })?.users)
    ? (payload as { users: unknown[] }).users
    : Array.isArray(payload)
      ? payload
      : [];
  return arr
    .map(mapClientUser)
    .filter((c): c is OpCachedClient => c !== null);
}
