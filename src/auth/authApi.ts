export const MOBILE_API_BASE = "https://portalclientes.seemanngroup.com";

export type Ejecutivo = {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
} | null;

export type Roles = {
  administrador: boolean;
  pricing: boolean;
  ejecutivo: boolean;
  proveedor: boolean;
  operaciones: boolean;
} | null;

export type AuthUser = {
  email: string;
  username: string;
  usernames: string[];
  nombreuser: string;
  ejecutivo?: Ejecutivo;
  roles?: Roles;
};

export type Cliente = {
  id: string;
  email: string;
  username: string;
  usernames?: string[];
  nombreuser: string;
  createdAt: string;
};

function apiUrl(apiBase: string, path: string): string {
  if (!apiBase) return path;
  return `${apiBase.replace(/\/$/, "")}${path}`;
}

export async function loginRequest(
  apiBase: string,
  email: string,
  password: string,
  turnstileToken?: string,
): Promise<{ token: string; user: AuthUser }> {
  const body: Record<string, unknown> = { email, password };
  if (turnstileToken) body.turnstileToken = turnstileToken;

  const r = await fetch(apiUrl(apiBase, "/api/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    const err = new Error(e.error || "No se pudo iniciar sesión") as Error & {
      requiresCaptcha?: boolean;
      failCount?: number;
    };
    err.requiresCaptcha = e.requiresCaptcha;
    err.failCount = e.failCount;
    throw err;
  }

  const data = await r.json();
  const usernames =
    data.user.usernames && data.user.usernames.length > 0
      ? data.user.usernames
      : [data.user.username];

  return {
    token: data.token,
    user: {
      ...data.user,
      usernames,
    },
  };
}

export async function meRequest(
  apiBase: string,
  token: string,
): Promise<AuthUser> {
  const r = await fetch(apiUrl(apiBase, "/api/me"), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!r.ok) throw new Error("Sesión inválida");

  const d = await r.json();
  const usernames =
    d.user.usernames && d.user.usernames.length > 0
      ? d.user.usernames
      : [d.user.username];

  return {
    email: d.user.sub,
    username: d.user.username,
    usernames,
    nombreuser: d.user.nombreuser,
    ejecutivo: d.user.ejecutivo || null,
    roles: d.user.roles || null,
  };
}

export async function ejecutivosRequest(
  apiBase: string,
  token: string,
): Promise<Ejecutivo[]> {
  const r = await fetch(apiUrl(apiBase, "/api/ejecutivos"), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!r.ok) throw new Error("Error al obtener ejecutivos");

  const data = await r.json();
  return data.ejecutivos || [];
}

export async function misClientesRequest(
  apiBase: string,
  token: string,
): Promise<Cliente[]> {
  const r = await fetch(apiUrl(apiBase, "/api/ejecutivo/clientes"), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!r.ok) {
    const errorData = await r.json().catch(() => ({}));
    throw new Error(errorData.error || "Error al obtener clientes");
  }

  const data = await r.json();
  return data.clientes || [];
}

export async function todosClientesRequest(
  apiBase: string,
  token: string,
): Promise<Cliente[]> {
  const r = await fetch(apiUrl(apiBase, "/api/admin/users"), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!r.ok) {
    const errorData = await r.json().catch(() => ({}));
    throw new Error(errorData.error || "Error al obtener clientes");
  }

  const data = await r.json();
  const allUsers = data.users || [];
  return allUsers
    .filter((u: { username: string }) => u.username !== "Ejecutivo")
    .map(
      (u: {
        id: string;
        email: string;
        username: string;
        usernames?: string[];
        nombreuser: string;
        createdAt: string;
      }) => ({
        id: u.id,
        email: u.email,
        username: u.username,
        usernames: u.usernames,
        nombreuser: u.nombreuser,
        createdAt: u.createdAt,
      }),
    );
}
