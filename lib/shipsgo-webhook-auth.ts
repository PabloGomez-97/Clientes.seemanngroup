import crypto from "node:crypto";

/**
 * Obtiene el cuerpo crudo para HMAC. Si el body ya fue parseado a objeto,
 * no se puede verificar de forma fiable contra la firma original.
 */
export function getShipsgoWebhookRawBody(body: unknown): string | null {
  if (Buffer.isBuffer(body)) return body.toString("utf8");
  if (body instanceof Uint8Array) {
    return Buffer.from(body).toString("utf8");
  }
  if (typeof body === "string") return body;
  return null;
}

export function parseShipsgoWebhookJson(rawBody: string): unknown {
  return JSON.parse(rawBody || "{}");
}

/**
 * Si hay secreto configurado: exige firma y body crudo.
 * Si no hay secreto: acepta (útil en entornos sin validación).
 */
export function verifyShipsgoWebhookSignature(opts: {
  secret?: string | null;
  signature?: string | null;
  rawBody: string | null;
}): { ok: true } | { ok: false; error: string } {
  const secret = String(opts.secret || "").trim();
  if (!secret) return { ok: true };

  const signature = String(opts.signature || "").trim();
  if (!signature) {
    return { ok: false, error: "Missing webhook signature" };
  }

  if (opts.rawBody == null) {
    return {
      ok: false,
      error: "Unable to verify webhook signature (raw body unavailable)",
    };
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(opts.rawBody)
    .digest("hex");

  const sigBuf = Buffer.from(signature, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expBuf.length) {
    return { ok: false, error: "Invalid webhook signature" };
  }
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { ok: false, error: "Invalid webhook signature" };
  }

  return { ok: true };
}
