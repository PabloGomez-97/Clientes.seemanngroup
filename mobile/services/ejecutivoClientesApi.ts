import {
  misClientesRequest,
  MOBILE_API_BASE,
} from "../../src/auth/authApi";

export type ClienteEjecutivoRef = {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
};

/** Cliente de directorio; subcuenta → `parentUsername`. */
export type Cliente = {
  id: string;
  email: string;
  username: string;
  usernames?: string[];
  nombreuser: string;
  createdAt: string;
  parentUsername?: string;
  ejecutivo?: ClienteEjecutivoRef | null;
};

/**
 * Expande `usernames` en filas (misma lógica que Tracking/Reportería web).
 * La primera entrada es la cuenta principal; el resto son subcuentas.
 */
export function expandClientesWithSubcuentas(rawClients: Cliente[]): Cliente[] {
  const expanded: Cliente[] = [];
  for (const client of rawClients) {
    const names =
      client.usernames && client.usernames.length > 1
        ? client.usernames
        : [client.username];
    for (let i = 0; i < names.length; i++) {
      expanded.push({
        ...client,
        username: names[i],
        parentUsername: i > 0 ? names[0] : undefined,
      });
    }
  }
  return expanded;
}

function sortClientes(list: Cliente[]): Cliente[] {
  return [...list].sort((a, b) =>
    a.username.localeCompare(b.username, "es", { sensitivity: "base" }),
  );
}

export async function fetchMisClientes(token: string): Promise<Cliente[]> {
  const raw = await misClientesRequest(MOBILE_API_BASE, token);
  return sortClientes(expandClientesWithSubcuentas(raw as Cliente[]));
}

/**
 * Todos los clientes del portal (rol operaciones / admin users).
 * Conserva `ejecutivo` asignado.
 */
export async function fetchTodosClientes(token: string): Promise<Cliente[]> {
  const r = await fetch(
    `${MOBILE_API_BASE.replace(/\/$/, "")}/api/admin/users`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!r.ok) {
    const errorData = await r.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error || "Error al obtener clientes",
    );
  }

  const data = (await r.json()) as {
    users?: Array<{
      id: string;
      email: string;
      username: string;
      usernames?: string[];
      nombreuser?: string;
      createdAt?: string;
      ejecutivo?: {
        id?: string;
        nombre?: string;
        email?: string;
        telefono?: string;
      } | null;
    }>;
  };

  const mapped: Cliente[] = (data.users || [])
    .filter((u) => u.username && u.username !== "Ejecutivo")
    .map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      usernames: u.usernames,
      nombreuser: u.nombreuser || "",
      createdAt: u.createdAt || "",
      ejecutivo: u.ejecutivo?.nombre
        ? {
            id: String(u.ejecutivo.id ?? ""),
            nombre: String(u.ejecutivo.nombre),
            email: String(u.ejecutivo.email ?? ""),
            telefono: u.ejecutivo.telefono
              ? String(u.ejecutivo.telefono)
              : undefined,
          }
        : null,
    }));

  return sortClientes(expandClientesWithSubcuentas(mapped));
}
