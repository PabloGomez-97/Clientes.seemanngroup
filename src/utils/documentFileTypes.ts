/**
 * Allowed formats for client/operational document uploads (Cloudflare R2).
 * Keep in sync with api/constants/documentFileTypes.ts
 */
export const DOCUMENT_MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

export const DOCUMENT_ALLOWED_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "csv",
  "txt",
  "rtf",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "tif",
  "tiff",
  "zip",
  "rar",
  "7z",
] as const;

export const DOCUMENT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/csv",
  "text/plain",
  "application/rtf",
  "text/rtf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.rar",
  "application/x-rar-compressed",
  "application/x-rar",
  "application/x-7z-compressed",
] as const;

export const DOCUMENT_ACCEPT_ATTR =
  ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.jpg,.jpeg,.png,.webp,.tif,.tiff,.zip,.rar,.7z";

export const DOCUMENT_FORMATS_HINT =
  "PDF, Word, Excel, CSV, TXT, RTF, imágenes (JPG/PNG/WebP/TIFF), ZIP, RAR y 7Z. Máximo 15MB.";

const EXT_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  txt: "text/plain",
  rtf: "application/rtf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  tif: "image/tiff",
  tiff: "image/tiff",
  zip: "application/zip",
  rar: "application/vnd.rar",
  "7z": "application/x-7z-compressed",
};

export function getDocumentExtension(fileName: string): string {
  const parts = fileName.split(".");
  if (parts.length < 2) return "";
  return (parts.pop() || "").toLowerCase();
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

export function isAllowedDocumentUpload(
  fileName: string,
  mime?: string | null,
): boolean {
  if (isAllowedDocumentMime(mime)) return true;
  return isAllowedDocumentExtension(fileName);
}

export function resolveDocumentMime(
  fileName: string,
  mimeFromBrowser?: string | null,
): string | null {
  if (isAllowedDocumentMime(mimeFromBrowser)) {
    return mimeFromBrowser as string;
  }
  return mimeFromDocumentFileName(fileName);
}

/** FileReader data URL with a reliable MIME (fixes empty type on rar/7z/etc.). */
export function fileToDocumentDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      let result = reader.result as string;
      const mime = resolveDocumentMime(file.name, file.type);
      if (mime && result.startsWith("data:")) {
        result = result.replace(/^data:[^;]*;base64,/, `data:${mime};base64,`);
      }
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function validateDocumentFile(file: {
  name: string;
  type?: string;
  size: number;
}): string | null {
  if (file.size > DOCUMENT_MAX_FILE_SIZE) {
    return `"${file.name}" excede 15MB`;
  }
  if (!isAllowedDocumentUpload(file.name, file.type)) {
    return `"${file.name}" tipo no permitido`;
  }
  return null;
}
