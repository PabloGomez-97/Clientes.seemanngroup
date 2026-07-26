import {
  misClientesRequest,
  type Cliente as ClienteBase,
  MOBILE_API_BASE,
} from "../../src/auth/authApi";

/** Cliente de cartera; si es alias/subcuenta, trae `parentUsername`. */
export type Cliente = ClienteBase & {
  parentUsername?: string;
};

/**
 * Expande `usernames` en filas (misma lógica que TrackingAdminEjecutivo / Reportería web).
 * La primera entrada es la cuenta principal; el resto son subcuentas.
 */
export function expandClientesWithSubcuentas(
  rawClients: ClienteBase[],
): Cliente[] {
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

export async function fetchMisClientes(token: string): Promise<Cliente[]> {
  const raw = await misClientesRequest(MOBILE_API_BASE, token);
  return expandClientesWithSubcuentas(raw).sort((a, b) =>
    a.username.localeCompare(b.username, "es", { sensitivity: "base" }),
  );
}
