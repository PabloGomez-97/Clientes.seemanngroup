export const MOBILE_API_BASE = "https://portalclientes.seemanngroup.com";

export type TenantId = "cl" | "mx";

export type TenantOption = {
  id: TenantId;
  label: string;
  redirectTo: string;
};

export type Ejecutivo = {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  idInterno?: number | null;
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
  tenant?: TenantId;
};

export type Cliente = {
  id: string;
  email: string;
  username: string;
  usernames?: string[];
  nombreuser: string;
  createdAt: string;
};

export type LoginSuccess = {
  requiresTenantSelection?: false;
  token: string;
  user: AuthUser;
  tenant: TenantId;
  redirectTo: string;
};

export type LoginTenantSelection = {
  requiresTenantSelection: true;
  selectionToken: string;
  tenants: TenantOption[];
};

export type LoginResponse = LoginSuccess | LoginTenantSelection;

function apiUrl(apiBase: string, path: string): string {
  if (!apiBase) return path;
  return `${apiBase.replace(/\/$/, "")}${path}`;
}

function normalizeUser(raw: Record<string, unknown>): AuthUser {
  const username = String(raw.username || "");
  const usernames =
    Array.isArray(raw.usernames) && raw.usernames.length > 0
      ? (raw.usernames as string[])
      : [username];

  return {
    email: String(raw.email || raw.sub || ""),
    username,
    usernames,
    nombreuser: String(raw.nombreuser || ""),
    ejecutivo: (raw.ejecutivo as Ejecutivo) || null,
    roles: (raw.roles as Roles) || null,
    tenant: raw.tenant === "mx" || raw.tenant === "cl" ? raw.tenant : undefined,
  };
}

export async function loginRequest(
  apiBase: string,
  email: string,
  password: string,
  turnstileToken?: string,
  options?: {
    client?: "mobile" | "web";
    tenant?: TenantId;
    selectionToken?: string;
  },
): Promise<LoginResponse> {
  const body: Record<string, unknown> = {};
  if (options?.selectionToken && options.tenant) {
    body.selectionToken = options.selectionToken;
    body.tenant = options.tenant;
  } else {
    body.email = email;
    body.password = password;
    if (turnstileToken) body.turnstileToken = turnstileToken;
    if (options?.tenant) body.tenant = options.tenant;
  }
  if (options?.client) body.client = options.client;

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

  if (data.requiresTenantSelection) {
    return {
      requiresTenantSelection: true,
      selectionToken: String(data.selectionToken),
      tenants: (data.tenants || []) as TenantOption[],
    };
  }

  return {
    token: data.token,
    tenant: data.tenant === "mx" ? "mx" : "cl",
    redirectTo: String(data.redirectTo || (data.tenant === "mx" ? "/mx" : "/")),
    user: normalizeUser({ ...data.user, tenant: data.tenant }),
  };
}

export async function meRequest(
  apiBase: string,
  token: string,
  options?: { client?: "mobile" | "web" },
): Promise<{ user: AuthUser; token?: string; redirectTo?: string }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (options?.client === "mobile") {
    headers["X-Client"] = "mobile";
  }

  const r = await fetch(apiUrl(apiBase, "/api/me"), { headers });

  if (r.status === 409) {
    const d = await r.json().catch(() => ({}));
    const err = new Error(d.error || "Sesión de otro país") as Error & {
      redirectTo?: string;
    };
    err.redirectTo = d.redirectTo;
    throw err;
  }

  if (!r.ok) throw new Error("Sesión inválida");

  const d = await r.json();
  return {
    user: normalizeUser(d.user),
    token: typeof d.token === "string" ? d.token : undefined,
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
