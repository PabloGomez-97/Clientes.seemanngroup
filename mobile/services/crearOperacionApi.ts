/**
 * Cliente API para crear operaciones desde mobile
 * (misma API que web, con MOBILE_API_BASE).
 */
import { MOBILE_API_BASE } from "../../src/auth/authApi";
import type {
  CrearOperacionPayload,
  OperacionCreada,
  Proveedor,
} from "../../src/services/operaciones";

export type {
  CrearOperacionPayload,
  DocumentoOperacionPayload,
  OperacionCreada,
  OperacionDetallePayload,
  Proveedor,
} from "../../src/services/operaciones";

const buildHeaders = (token: string): HeadersInit => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

export async function listarProveedores(
  token: string,
  ownerUsername?: string,
): Promise<Proveedor[]> {
  const qs = ownerUsername
    ? `?ownerUsername=${encodeURIComponent(ownerUsername)}`
    : "";
  const res = await fetch(
    `${MOBILE_API_BASE}/api/cliente-proveedores${qs}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) {
    throw new Error(`Error listando proveedores: ${res.status}`);
  }
  const json = await res.json();
  return Array.isArray(json?.proveedores) ? json.proveedores : [];
}

export async function crearOperacion(
  token: string,
  payload: CrearOperacionPayload,
): Promise<OperacionCreada> {
  const url = payload.ownerUsername
    ? `${MOBILE_API_BASE}/api/operaciones?ownerUsername=${encodeURIComponent(payload.ownerUsername)}`
    : `${MOBILE_API_BASE}/api/operaciones`;

  const res = await fetch(url, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Error al crear operación (${res.status})`);
  }
  return data.operacion as OperacionCreada;
}
