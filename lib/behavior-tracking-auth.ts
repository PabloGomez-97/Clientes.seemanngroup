/**
 * Shared authorization helpers for POST /api/behavior-tracking.
 * Used by api/index.ts and server/index.ts.
 */

export interface BehaviorTrackingTokenClaims {
  sub: string;
  username?: string;
}

export interface BehaviorTrackingClientUser {
  email: string;
  username?: string;
  ejecutivoId?: unknown;
}

export type BehaviorTrackingAuthResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

/** Normalizes ejecutivoId whether populated document or raw ObjectId. */
export function normalizeEjecutivoObjectId(ejecutivoId: unknown): string | null {
  if (ejecutivoId == null) return null;
  if (typeof ejecutivoId === "object" && "_id" in (ejecutivoId as object)) {
    return String((ejecutivoId as { _id: unknown })._id);
  }
  return String(ejecutivoId);
}

/**
 * Resolves the Ejecutivo document id for a portal user — same fallback as
 * GET /behavior-tracking/clients when User.ejecutivoId is unset.
 */
export async function resolveEjecutivoObjectId(
  ejecutivoUser: { email?: string; ejecutivoId?: unknown },
  findEjecutivoByEmail: (
    email: string,
  ) => Promise<{ _id: unknown } | null>,
): Promise<string | null> {
  const fromUser = normalizeEjecutivoObjectId(ejecutivoUser.ejecutivoId);
  if (fromUser) return fromUser;
  const email = String(ejecutivoUser.email || "")
    .toLowerCase()
    .trim();
  if (!email) return null;
  const ej = await findEjecutivoByEmail(email);
  return ej ? String(ej._id) : null;
}

export function clientBelongsToEjecutivo(
  clientUser: { ejecutivoId?: unknown } | null | undefined,
  ejecutivoObjectId: string | null,
): boolean {
  if (!clientUser || !ejecutivoObjectId) return false;
  return (
    normalizeEjecutivoObjectId(clientUser.ejecutivoId) === ejecutivoObjectId
  );
}

/**
 * Validates that the authenticated user may record events for clientEmail.
 * - Portal clients: email must match token sub.
 * - Ejecutivo / pricing staff: client must belong to their portfolio (ejecutivoId).
 */
export async function authorizeBehaviorTrackingPost(
  claims: BehaviorTrackingTokenClaims,
  clientEmail: string,
  findUserByEmail: (
    email: string,
  ) => Promise<BehaviorTrackingClientUser | null>,
  findClientsByEjecutivoId: (
    ejecutivoId: unknown,
  ) => Promise<BehaviorTrackingClientUser[]>,
  findEjecutivoByEmail?: (
    email: string,
  ) => Promise<{ _id: unknown } | null>,
): Promise<BehaviorTrackingAuthResult> {
  const normalizedClientEmail = String(clientEmail).toLowerCase().trim();
  if (!normalizedClientEmail) {
    return { ok: false, status: 400, error: "clientEmail inválido" };
  }

  const actorEmail = String(claims.sub).toLowerCase().trim();
  const actor = await findUserByEmail(actorEmail);
  if (!actor) {
    return { ok: false, status: 403, error: "Usuario no encontrado" };
  }

  const isStaff =
    claims.username === "Ejecutivo" ||
    actor.username === "Ejecutivo" ||
    Boolean((actor as { roles?: { pricing?: boolean } }).roles?.pricing);

  if (!isStaff) {
    if (normalizedClientEmail !== actorEmail) {
      return {
        ok: false,
        status: 403,
        error: "No autorizado para registrar eventos de otro cliente",
      };
    }
    return { ok: true };
  }

  const ejecutivoObjectId = findEjecutivoByEmail
    ? await resolveEjecutivoObjectId(actor, findEjecutivoByEmail)
    : normalizeEjecutivoObjectId(actor.ejecutivoId);
  if (!ejecutivoObjectId) {
    return { ok: false, status: 403, error: "Ejecutivo sin cartera asignada" };
  }

  const portfolio = await findClientsByEjecutivoId(ejecutivoObjectId);
  const allowed = portfolio.some(
    (c) => String(c.email).toLowerCase().trim() === normalizedClientEmail,
  );
  if (!allowed) {
    return {
      ok: false,
      status: 403,
      error: "El cliente no pertenece a la cartera del ejecutivo",
    };
  }

  return { ok: true };
}
