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

  const ejecutivoId = actor.ejecutivoId;
  if (!ejecutivoId) {
    return { ok: false, status: 403, error: "Ejecutivo sin cartera asignada" };
  }

  const portfolio = await findClientsByEjecutivoId(ejecutivoId);
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
