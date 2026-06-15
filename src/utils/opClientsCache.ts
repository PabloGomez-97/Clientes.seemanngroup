const OP_CLIENTS_RAW_CACHE_KEY = "op_admin_users_v1";
const CACHE_TTL = 60 * 60 * 1000;

export interface OpCachedClient {
  id: string;
  email: string;
  username: string;
  nombreuser?: string;
  usernames?: string[];
  createdAt: string;
}

export function getCachedOpClients(): OpCachedClient[] | null {
  try {
    const raw = localStorage.getItem(OP_CLIENTS_RAW_CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      localStorage.removeItem(OP_CLIENTS_RAW_CACHE_KEY);
      return null;
    }
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export function setCachedOpClients(data: OpCachedClient[]) {
  try {
    localStorage.setItem(
      OP_CLIENTS_RAW_CACHE_KEY,
      JSON.stringify({ data, ts: Date.now() }),
    );
  } catch {
    /* quota exceeded */
  }
}

export function normalizeOpClientsFromApi(raw: unknown): OpCachedClient[] {
  const payload = raw as { users?: OpCachedClient[] } | OpCachedClient[] | null;
  const arr: OpCachedClient[] = Array.isArray((payload as { users?: OpCachedClient[] })?.users)
    ? (payload as { users: OpCachedClient[] }).users
    : Array.isArray(payload)
      ? payload
      : [];
  return arr.filter((user) => user.username !== "Ejecutivo");
}
