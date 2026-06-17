import { downloadPDFBuffer } from '../services/r2Storage.js';

export const MAX_QUOTE_RESEND_RECIPIENTS = 5;

export function normalizeQuoteResendEmails(
  emails: unknown,
  emailRegex: RegExp,
): { ok: true; emails: string[] } | { ok: false; error: string } {
  if (!Array.isArray(emails)) {
    return { ok: false, error: 'emails debe ser un arreglo' };
  }

  const normalized = emails
    .map((email) => (typeof email === 'string' ? email.trim() : ''))
    .filter(Boolean);

  if (normalized.length === 0) {
    return { ok: false, error: 'Debes ingresar al menos un correo electrónico' };
  }

  if (normalized.length > MAX_QUOTE_RESEND_RECIPIENTS) {
    return { ok: false, error: 'Máximo 5 correos electrónicos' };
  }

  const unique = new Map<string, string>();
  for (const email of normalized) {
    if (!emailRegex.test(email)) {
      return { ok: false, error: `El correo ${email} no es válido` };
    }
    const key = email.toLowerCase();
    if (unique.has(key)) {
      return { ok: false, error: 'No repitas correos electrónicos' };
    }
    unique.set(key, email);
  }

  return { ok: true, emails: Array.from(unique.values()) };
}

export interface EjecutivoEmailResolution {
  ejecutivoEmail: string;
  ejecutivoNombre: string;
}

export async function resolveEjecutivoForEmail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentUser: any,
  body: { ejecutivoEmail?: unknown; ejecutivoNombre?: unknown },
  EjecutivoModel: { findOne: (query: object) => Promise<{ email?: string; nombre?: string } | null> },
): Promise<EjecutivoEmailResolution | null> {
  let ejecutivoEmail =
    (typeof body.ejecutivoEmail === 'string' && body.ejecutivoEmail.trim()) ||
    (typeof (currentUser.ejecutivoId as { email?: string } | null)?.email === 'string'
      ? (currentUser.ejecutivoId as { email?: string }).email
      : '') ||
    '';

  let ejecutivoNombre =
    (typeof body.ejecutivoNombre === 'string' && body.ejecutivoNombre.trim()) ||
    (typeof (currentUser.ejecutivoId as { nombre?: string } | null)?.nombre === 'string'
      ? (currentUser.ejecutivoId as { nombre?: string }).nombre
      : '') ||
    '';

  if (!ejecutivoEmail && currentUser.username === 'Ejecutivo' && currentUser.email) {
    const ejDoc = await EjecutivoModel.findOne({
      email: String(currentUser.email).toLowerCase().trim(),
    });
    if (ejDoc?.email) {
      ejecutivoEmail = ejDoc.email;
      if (!ejecutivoNombre) {
        ejecutivoNombre = ejDoc.nombre || '';
      }
    }
  }

  if (!ejecutivoEmail && currentUser.email) {
    ejecutivoEmail = currentUser.email;
  }

  if (!ejecutivoNombre) {
    ejecutivoNombre = currentUser.nombreuser || currentUser.username || 'Ejecutivo';
  }

  if (!ejecutivoEmail) {
    return null;
  }

  return {
    ejecutivoEmail: String(ejecutivoEmail).trim(),
    ejecutivoNombre,
  };
}

export async function loadQuotePdfAttachment(
  quoteNumber: string,
  usuarioId: string,
  QuotePDFModel: {
    findOne: (query: object) => { lean: () => Promise<{
      r2Key?: string;
      contenidoBase64?: string;
      nombreArchivo?: string;
    } | null> };
  },
): Promise<{ content: string; name: string } | null> {
  const quotePdf = await QuotePDFModel.findOne({
    quoteNumber: String(quoteNumber),
    usuarioId: String(usuarioId),
  }).lean();

  if (!quotePdf) {
    console.warn(
      `[send-operation-email] PDF no encontrado para quoteNumber=${quoteNumber}, usuarioId=${usuarioId}`,
    );
    return null;
  }

  let pdfBuffer: Buffer | null = null;

  if (quotePdf.r2Key) {
    try {
      pdfBuffer = await downloadPDFBuffer(quotePdf.r2Key);
    } catch (err) {
      console.error(`[send-operation-email] Error descargando PDF de R2 (${quotePdf.r2Key}):`, err);
      return null;
    }
  } else if (quotePdf.contenidoBase64) {
    const base64Content = quotePdf.contenidoBase64.includes('base64,')
      ? quotePdf.contenidoBase64.split('base64,')[1]
      : quotePdf.contenidoBase64;
    pdfBuffer = Buffer.from(base64Content, 'base64');
  }

  if (!pdfBuffer || pdfBuffer.length === 0) {
    return null;
  }

  return {
    content: pdfBuffer.toString('base64'),
    name: quotePdf.nombreArchivo || `${quoteNumber}.pdf`,
  };
}

export async function loadQuotePdfAttachmentWithRetry(
  quoteNumber: string,
  usuarioId: string,
  QuotePDFModel: Parameters<typeof loadQuotePdfAttachment>[2],
  options?: { attempts?: number; delayMs?: number },
): Promise<{ content: string; name: string } | null> {
  const attempts = options?.attempts ?? 4;
  const delayMs = options?.delayMs ?? 1200;

  for (let i = 0; i < attempts; i++) {
    const attachment = await loadQuotePdfAttachment(quoteNumber, usuarioId, QuotePDFModel);
    if (attachment) return attachment;
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return null;
}
