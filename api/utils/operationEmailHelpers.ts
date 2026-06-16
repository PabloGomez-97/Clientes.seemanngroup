import { downloadPDFBuffer } from '../services/r2Storage.js';

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
