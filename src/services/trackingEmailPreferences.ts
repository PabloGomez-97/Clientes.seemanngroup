const API_BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:4000"
    : "https://portalclientes.seemanngroup.com";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MAX_SAVED_TRACKING_EMAILS = 5;

export interface TrackingEmailPreference {
  reference: string;
  emails: string[];
  updatedAt: string | null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidTrackingEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function hasEmail(list: string[], email: string): boolean {
  const normalized = normalizeEmail(email);
  return list.some((item) => normalizeEmail(item) === normalized);
}

export function addUniqueEmail(
  list: string[],
  email: string,
  max: number,
): string[] {
  const trimmed = email.trim();

  if (!trimmed || hasEmail(list, trimmed)) {
    return list;
  }

  const next = [...list];
  const emptyIndex = next.findIndex((item) => !item.trim());

  if (emptyIndex >= 0) {
    next[emptyIndex] = trimmed;
    return next;
  }

  if (next.length >= max) {
    return next;
  }

  next.push(trimmed);
  return next;
}

export async function fetchTrackingEmailPreference(
  token: string,
  reference: string,
): Promise<TrackingEmailPreference> {
  const response = await fetch(
    `${API_BASE_URL}/api/tracking-email-preferences?reference=${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || "No se pudieron cargar los correos guardados.",
    );
  }

  return {
    reference,
    emails: Array.isArray(data.preference?.emails) ? data.preference.emails : [],
    updatedAt: data.preference?.updatedAt || null,
  };
}

export async function saveTrackingEmailPreference(
  token: string,
  reference: string,
  emails: string[],
): Promise<TrackingEmailPreference> {
  const response = await fetch(`${API_BASE_URL}/api/tracking-email-preferences`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reference, emails }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || "No se pudieron guardar los correos configurados.",
    );
  }

  return {
    reference,
    emails: Array.isArray(data.preference?.emails) ? data.preference.emails : [],
    updatedAt: data.preference?.updatedAt || null,
  };
}