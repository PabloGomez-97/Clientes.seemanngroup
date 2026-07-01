import { MOBILE_API_BASE } from "../../src/auth/authApi";
import type {
  AirResponse,
  AirShipment,
  AirShipmentDetail,
  OceanResponse,
  OceanShipment,
  OceanShipmentDetail,
} from "../../src/components/cliente/tracking/shipsgo/types";
import {
  mapCreateAirError,
  mapCreateOceanError,
} from "../../src/services/shipsgoTrackingLogic";
import {
  addUniqueEmail,
  fetchTrackingEmailPreference,
  hasEmail,
  isValidTrackingEmail,
  MAX_VISIBLE_TRACK_FOLLOWERS,
  mergeTrackingEmails,
  saveTrackingEmailPreference,
} from "../../src/services/trackingEmailPreferences";

export {
  addUniqueEmail,
  hasEmail,
  isValidTrackingEmail,
  MAX_VISIBLE_TRACK_FOLLOWERS,
  mergeTrackingEmails,
};

type ApiOptions = {
  method?: string;
  token?: string | null;
  body?: unknown;
};

async function apiFetch<T>(
  path: string,
  { method = "GET", token, body }: ApiOptions = {},
): Promise<{ ok: boolean; status: number; data: T }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${MOBILE_API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = (await response.json().catch(() => ({}))) as T;
  return { ok: response.ok, status: response.status, data };
}

export async function fetchAirShipments(): Promise<AirShipment[]> {
  const { ok, data } = await apiFetch<AirResponse>("/api/shipsgo/shipments");
  if (!ok) throw new Error("Error al obtener envíos aéreos");
  return Array.isArray(data.shipments) ? data.shipments : [];
}

export async function fetchOceanShipments(): Promise<OceanShipment[]> {
  const { ok, data } = await apiFetch<OceanResponse>(
    "/api/shipsgo/ocean/shipments",
  );
  if (!ok) throw new Error("Error al obtener envíos marítimos");
  return Array.isArray(data.shipments) ? data.shipments : [];
}

export async function fetchAirShipmentDetail(
  shipmentId: number,
): Promise<AirShipmentDetail | null> {
  const { ok, data } = await apiFetch<{ shipment?: AirShipmentDetail }>(
    `/api/shipsgo/shipments/${shipmentId}`,
  );
  if (!ok) return null;
  return data.shipment ?? null;
}

export async function fetchOceanShipmentDetail(
  shipmentId: number,
): Promise<OceanShipmentDetail | null> {
  const { ok, data } = await apiFetch<{ shipment?: OceanShipmentDetail }>(
    `/api/shipsgo/ocean/shipments/${shipmentId}`,
  );
  if (!ok) return null;
  return data.shipment ?? null;
}

export async function createAirShipment(
  token: string,
  payload: {
    reference: string;
    awb_number: string;
    followers: string[];
    tags: string[];
  },
): Promise<AirShipment> {
  const { ok, status, data } = await apiFetch<{ shipment?: AirShipment; error?: string }>(
    "/api/shipsgo/shipments",
    { method: "POST", token, body: payload },
  );
  if (!ok) {
    throw new Error(mapCreateAirError(status, data.error));
  }
  if (!data.shipment) throw new Error("Respuesta inválida del servidor.");
  return data.shipment;
}

export async function createOceanShipment(
  token: string,
  payload: Record<string, unknown>,
): Promise<OceanShipment> {
  const { ok, status, data } = await apiFetch<{
    shipment?: OceanShipment;
    error?: string;
  }>("/api/shipsgo/ocean/shipments", {
    method: "POST",
    token,
    body: payload,
  });
  if (!ok) {
    throw new Error(mapCreateOceanError(status, data.error));
  }
  if (!data.shipment) throw new Error("Respuesta inválida del servidor.");
  return data.shipment;
}

export async function deleteAirShipment(
  token: string,
  shipmentId: number,
): Promise<void> {
  const { ok, data } = await apiFetch<{ error?: string }>(
    `/api/shipsgo/shipments/${shipmentId}`,
    { method: "DELETE", token },
  );
  if (!ok) throw new Error(data.error || "No se pudo eliminar el tracking.");
}

export async function deleteOceanShipment(
  token: string,
  shipmentId: number,
): Promise<void> {
  const { ok, data } = await apiFetch<{ error?: string }>(
    `/api/shipsgo/ocean/shipments/${shipmentId}`,
    { method: "DELETE", token },
  );
  if (!ok) throw new Error(data.error || "No se pudo eliminar el tracking.");
}

export async function fetchMobileTrackingEmailPreference(
  token: string,
  reference: string,
) {
  return fetchTrackingEmailPreference(token, reference, MOBILE_API_BASE);
}

export async function saveMobileTrackingEmailPreference(
  token: string,
  reference: string,
  emails: string[],
) {
  return saveTrackingEmailPreference(
    token,
    reference,
    emails,
    MOBILE_API_BASE,
  );
}
