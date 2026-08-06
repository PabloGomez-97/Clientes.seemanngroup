/**
 * Allowed formats for client/operational document uploads (Cloudflare R2).
 * Keep in sync with src/utils/documentFileTypes.ts
 */
export const DOCUMENT_MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

export const DOCUMENT_ALLOWED_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'csv',
  'txt',
  'rtf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'tif',
  'tiff',
  'zip',
  'rar',
  '7z',
] as const;

export const DOCUMENT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/csv',
  'text/plain',
  'application/rtf',
  'text/rtf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.rar',
  'application/x-rar-compressed',
  'application/x-rar',
  'application/x-7z-compressed',
] as const;

const EXT_TO_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  txt: 'text/plain',
  rtf: 'application/rtf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  zip: 'application/zip',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
};

export function getDocumentExtension(fileName: string): string {
  const parts = fileName.split('.');
  if (parts.length < 2) return '';
  return (parts.pop() || '').toLowerCase();
}

export function mimeFromDocumentFileName(fileName: string): string | null {
  const ext = getDocumentExtension(fileName);
  return EXT_TO_MIME[ext] || null;
}

export function isAllowedDocumentExtension(fileName: string): boolean {
  const ext = getDocumentExtension(fileName);
  return (DOCUMENT_ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
}

export function isAllowedDocumentMime(mime: string | null | undefined): boolean {
  if (!mime) return false;
  return (DOCUMENT_ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

/** Accept if MIME is allowed, or extension is allowed (covers empty/octet-stream MIME). */
export function isAllowedDocumentUpload(
  fileName: string,
  mime?: string | null,
): boolean {
  if (isAllowedDocumentMime(mime)) return true;
  return isAllowedDocumentExtension(fileName);
}

/** MIME to store: prefer allowed data-URL mime, else map from filename. */
export function resolveDocumentMime(
  fileName: string,
  mimeFromDataUrl?: string | null,
): string | null {
  if (isAllowedDocumentMime(mimeFromDataUrl)) {
    return mimeFromDataUrl as string;
  }
  const fromName = mimeFromDocumentFileName(fileName);
  if (fromName) return fromName;
  return null;
}

export const DOCUMENT_FORMATS_HINT =
  'PDF, Word, Excel, CSV, TXT, RTF, imágenes (JPG/PNG/WebP/TIFF), ZIP, RAR y 7Z. Máximo 15MB.';
