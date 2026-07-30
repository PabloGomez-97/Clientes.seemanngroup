import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Content-ID usado en <img src="cid:seemann-logo"> */
export const EMAIL_LOGO_CONTENT_ID = 'seemann-logo';

/**
 * src del logo en HTML de correo (inline CID).
 * Requiere adjuntar getEmailLogoBrevoAttachment() en el payload de Brevo.
 */
export const EMAIL_LOGO_CID_SRC = `cid:${EMAIL_LOGO_CONTENT_ID}`;

/**
 * URL pública de respaldo (versión reducida ~560px).
 */
export const EMAIL_LOGO_URL =
  'https://portalclientes.seemanngroup.com/logocompleto-email.png';

export type BrevoAttachment = {
  content: string;
  name: string;
  contentId?: string;
};

let cachedLogoAttachment: BrevoAttachment | null | undefined;

/**
 * Adjunto inline del logo para Brevo (base64).
 */
export function getEmailLogoBrevoAttachment(): BrevoAttachment | null {
  if (cachedLogoAttachment !== undefined) return cachedLogoAttachment;

  const candidates = [
    path.resolve(__dirname, '../../public/logocompleto-email.png'),
    path.resolve(process.cwd(), 'public/logocompleto-email.png'),
    path.resolve(process.cwd(), 'logocompleto-email.png'),
  ];

  for (const filePath of candidates) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const content = fs.readFileSync(filePath).toString('base64');
      cachedLogoAttachment = {
        content,
        name: 'logocompleto-email.png',
        contentId: EMAIL_LOGO_CONTENT_ID,
      };
      return cachedLogoAttachment;
    } catch {
      // try next
    }
  }

  cachedLogoAttachment = null;
  return null;
}

/** Antepone el logo CID a la lista de adjuntos Brevo. */
export function withEmailLogoAttachment(
  attachments: BrevoAttachment[] = [],
): BrevoAttachment[] {
  const logo = getEmailLogoBrevoAttachment();
  if (!logo) return attachments;
  return [logo, ...attachments];
}
