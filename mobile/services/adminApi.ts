import { MOBILE_API_BASE } from "../../src/auth/authApi";

const base = () => MOBILE_API_BASE.replace(/\/$/, "");

export type AdminRoles = {
  administrador: boolean;
  pricing: boolean;
  ejecutivo: boolean;
  proveedor: boolean;
  operaciones: boolean;
};

export type AdminStaffRoleKey =
  | "administrador"
  | "ejecutivo"
  | "operaciones"
  | "pricing"
  | "proveedor";

export const ADMIN_ROLE_OPTIONS: {
  key: AdminStaffRoleKey;
  label: string;
}[] = [
  { key: "administrador", label: "Administrador" },
  { key: "ejecutivo", label: "Ejecutivo" },
  { key: "operaciones", label: "Operaciones" },
  { key: "pricing", label: "Pricing" },
  { key: "proveedor", label: "Proveedor" },
];

export function emptyRoles(): AdminRoles {
  return {
    administrador: false,
    pricing: false,
    ejecutivo: false,
    proveedor: false,
    operaciones: false,
  };
}

export function rolesFromSingle(key: AdminStaffRoleKey): AdminRoles {
  const roles = emptyRoles();
  roles[key] = true;
  return roles;
}

export function singleRoleFromRoles(
  roles?: Partial<AdminRoles> | null,
): AdminStaffRoleKey | null {
  if (!roles) return null;
  if (roles.administrador) return "administrador";
  if (roles.operaciones) return "operaciones";
  if (roles.pricing) return "pricing";
  if (roles.ejecutivo) return "ejecutivo";
  if (roles.proveedor) return "proveedor";
  return null;
}

export function roleLabels(roles?: Partial<AdminRoles> | null): string {
  if (!roles) return "Sin rol";
  const labels = ADMIN_ROLE_OPTIONS.filter((o) => roles[o.key]).map(
    (o) => o.label,
  );
  return labels.length ? labels.join(", ") : "Sin rol";
}

export type AdminUserRow = {
  id: string;
  email: string;
  username: string;
  usernames: string[];
  nombreuser: string;
  createdAt: string;
  ejecutivo?: {
    id: string;
    nombre: string;
    email: string;
    telefono?: string;
  } | null;
};

export type AdminEjecutivoRow = {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  idInterno?: number | null;
  activo: boolean;
  roles?: AdminRoles;
  clientesAsignados?: number;
  createdAt?: string;
};

export type CompanySearchResult = {
  id: number;
  name: string;
  email: string;
  contact: string;
  salesRepId: number | null;
  salesRepName: string;
};

export type AuditLogRow = {
  _id: string;
  usuario?: string;
  email?: string;
  accion?: string;
  categoria?: string;
  descripcion?: string;
  clienteAfectado?: string;
  ejecutivo?: string;
  createdAt?: string;
  detalles?: Record<string, unknown>;
};

async function apiJson<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${base()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      (data as { error?: string }).error || "Error en la solicitud",
    );
  }
  return data as T;
}

export async function fetchAdminUsers(token: string): Promise<AdminUserRow[]> {
  const data = await apiJson<{ users?: AdminUserRow[] }>(
    "/api/admin/users",
    token,
  );
  return Array.isArray(data.users) ? data.users : [];
}

export async function fetchAdminClientUsers(
  token: string,
): Promise<AdminUserRow[]> {
  const users = await fetchAdminUsers(token);
  return users.filter((u) => u.username !== "Ejecutivo");
}

export async function fetchAdminStaffUsers(
  token: string,
): Promise<AdminUserRow[]> {
  const users = await fetchAdminUsers(token);
  return users.filter((u) => u.username === "Ejecutivo");
}

export async function fetchAdminEjecutivos(
  token: string,
): Promise<AdminEjecutivoRow[]> {
  const data = await apiJson<{ ejecutivos?: AdminEjecutivoRow[] }>(
    "/api/admin/ejecutivos",
    token,
  );
  return Array.isArray(data.ejecutivos) ? data.ejecutivos : [];
}

export async function createAdminClient(
  token: string,
  input: {
    emailPrefix: string;
    nombreuser: string;
    usernames: string[];
    ejecutivoId?: string | null;
  },
): Promise<{ email: string; username: string }> {
  const usernames = input.usernames.map((u) => u.trim()).filter(Boolean);
  if (!usernames.length) throw new Error("Debes indicar al menos una empresa");
  const email = `${input.emailPrefix.trim().toLowerCase()}@seemanngroup.com`;
  const data = await apiJson<{ user: { email: string; username: string } }>(
    "/api/admin/create-user",
    token,
    {
      method: "POST",
      body: JSON.stringify({
        email,
        username: usernames[0],
        usernames,
        nombreuser: input.nombreuser.trim(),
        ejecutivoId: input.ejecutivoId || undefined,
      }),
    },
  );
  return data.user;
}

export async function updateAdminClient(
  token: string,
  id: string,
  input: {
    nombreuser: string;
    usernames: string[];
    ejecutivoId?: string | null;
    password?: string;
  },
): Promise<void> {
  const usernames = input.usernames.map((u) => u.trim()).filter(Boolean);
  if (!usernames.length) throw new Error("Debes indicar al menos una empresa");
  const body: Record<string, unknown> = {
    username: usernames[0],
    usernames,
    nombreuser: input.nombreuser.trim(),
    ejecutivoId: input.ejecutivoId ?? null,
  };
  if (input.password?.trim()) {
    if (input.password.trim().length < 6) {
      throw new Error("La contraseña debe tener al menos 6 caracteres");
    }
    body.password = input.password.trim();
  }
  await apiJson(`/api/admin/users/${encodeURIComponent(id)}`, token, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteAdminUser(token: string, id: string): Promise<void> {
  await apiJson(`/api/admin/users/${encodeURIComponent(id)}`, token, {
    method: "DELETE",
  });
}

export async function createAdminEjecutivoAccount(
  token: string,
  input: {
    email: string;
    nombreuser: string;
    telefono: string;
    idInterno: number;
    role: AdminStaffRoleKey;
  },
): Promise<void> {
  const roles = rolesFromSingle(input.role);
  const email = input.email.trim().toLowerCase();
  const ej = await apiJson<{
    success?: boolean;
    ejecutivo?: { id?: string };
  }>("/api/admin/ejecutivos", token, {
    method: "POST",
    body: JSON.stringify({
      nombre: input.nombreuser.trim(),
      email,
      telefono: input.telefono.trim(),
      idInterno: input.idInterno,
      roles,
    }),
  });

  const ejecutivoId = ej.ejecutivo?.id ? String(ej.ejecutivo.id) : null;
  if (!ejecutivoId) {
    throw new Error("Error al crear ejecutivo");
  }

  try {
    await apiJson("/api/admin/create-user", token, {
      method: "POST",
      body: JSON.stringify({
        email,
        username: "Ejecutivo",
        usernames: ["Ejecutivo"],
        nombreuser: input.nombreuser.trim(),
      }),
    });
  } catch (err) {
    // Compensación: no dejar ejecutivo sin cuenta de login.
    try {
      await apiJson(
        `/api/admin/ejecutivos/${encodeURIComponent(ejecutivoId)}`,
        token,
        { method: "DELETE" },
      );
    } catch {
      /* best-effort */
    }
    throw err;
  }
}

export async function updateAdminEjecutivoUser(
  token: string,
  userId: string,
  input: {
    nombreuser: string;
    telefono: string;
    idInterno: number;
    role: AdminStaffRoleKey;
    password?: string;
  },
): Promise<void> {
  const body: Record<string, unknown> = {
    nombreuser: input.nombreuser.trim(),
    telefono: input.telefono.trim(),
    idInterno: input.idInterno,
    roles: rolesFromSingle(input.role),
  };
  if (input.password?.trim()) {
    if (input.password.trim().length < 6) {
      throw new Error("La contraseña debe tener al menos 6 caracteres");
    }
    body.password = input.password.trim();
  }
  await apiJson(`/api/admin/users/${encodeURIComponent(userId)}`, token, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function searchCompanies(
  token: string,
  term: string,
): Promise<CompanySearchResult[]> {
  const tokenRes = await fetch(`${base()}/api/linbis-token`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!tokenRes.ok) {
    throw new Error("No se pudo iniciar la búsqueda de empresas");
  }
  const { token: searchToken } = (await tokenRes.json()) as { token?: string };
  if (!searchToken) {
    throw new Error("No se pudo iniciar la búsqueda de empresas");
  }

  const headers = { Authorization: `Bearer ${searchToken}` };
  const [accountsRes, salesRepsRes] = await Promise.all([
    fetch(
      `https://api.linbis.com/accounts/list?searchTerm=${encodeURIComponent(term)}&take=10`,
      { headers },
    ),
    fetch(`https://api.linbis.com/salesreps/list?take=100`, { headers }),
  ]);

  if (!accountsRes.ok) {
    throw new Error("Error al buscar empresas");
  }

  const accountsData = await accountsRes.json();
  const salesRepsData = salesRepsRes.ok ? await salesRepsRes.json() : [];
  const salesRepMap = new Map<number, string>();
  if (Array.isArray(salesRepsData)) {
    for (const sr of salesRepsData as Array<{ id: number; name: string }>) {
      if (sr.id != null) salesRepMap.set(Number(sr.id), sr.name || "");
    }
  }

  type RawAccount = {
    id?: number;
    name?: string;
    email?: string;
    contact?: string;
    salesRepId?: number | null;
  };
  const raw = (Array.isArray(accountsData) ? accountsData : []) as RawAccount[];
  return raw.map((a) => {
    const repId = a.salesRepId != null ? Number(a.salesRepId) : null;
    return {
      id: Number(a.id ?? 0),
      name: a.name || "",
      email: a.email || "",
      contact: a.contact || "",
      salesRepId: repId,
      salesRepName: repId != null ? (salesRepMap.get(repId) ?? "") : "",
    };
  });
}

const LEGAL_SUFFIXES = new Set([
  "sa",
  "spa",
  "ltda",
  "limitada",
  "eirl",
  "inc",
  "llc",
  "corp",
  "co",
  "company",
  "the",
  "de",
  "del",
  "la",
  "las",
  "los",
  "y",
]);

export function generateCompanyEmailPrefix(
  companyName: string,
  existingEmails: string[] = [],
): string {
  const normalized = companyName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
  const words = normalized.split(/\s+/).filter(Boolean);
  const filtered = words.filter((w) => !LEGAL_SUFFIXES.has(w));
  const baseName = (filtered.length > 0 ? filtered : words).join("");
  if (!baseName) return "cliente";
  const truncated = baseName.slice(0, 13);
  const existing = new Set(existingEmails.map((e) => e.toLowerCase()));
  const candidates = [
    truncated,
    truncated + "chile",
    truncated + "cl",
    ...Array.from({ length: 10 }, (_, i) => truncated + (i + 1)),
  ];
  for (const candidate of candidates) {
    if (!existing.has(candidate + "@seemanngroup.com")) return candidate;
  }
  return truncated + Date.now().toString().slice(-4);
}

export async function fetchAuditLogs(
  token: string,
  params: {
    page?: number;
    limit?: number;
    categoria?: string;
    busqueda?: string;
  } = {},
): Promise<{
  logs: AuditLogRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: Record<string, number>;
}> {
  const q = new URLSearchParams();
  q.set("page", String(params.page ?? 1));
  q.set("limit", String(params.limit ?? 15));
  if (params.categoria) q.set("categoria", params.categoria);
  if (params.busqueda?.trim()) q.set("busqueda", params.busqueda.trim());
  const data = await apiJson<{
    logs?: AuditLogRow[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    stats?: Record<string, number>;
  }>(`/api/audit?${q.toString()}`, token);
  return {
    logs: Array.isArray(data.logs) ? data.logs : [],
    pagination: data.pagination ?? {
      page: 1,
      limit: 15,
      total: 0,
      totalPages: 1,
    },
    stats: data.stats ?? {},
  };
}
