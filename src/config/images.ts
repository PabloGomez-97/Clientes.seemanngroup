import {
  buildPublicImageUrl,
  R2_PUBLIC_IMAGES_BASE,
} from "./r2PublicImagesBase";

/**
 * Base URL para imágenes servidas desde el bucket de Cloudflare R2.
 * Configura VITE_R2_PUBLIC_IMAGES en Vercel y en tu .env local.
 */
const R2_BASE = (
  (import.meta.env.VITE_R2_PUBLIC_IMAGES as string | undefined) ??
  R2_PUBLIC_IMAGES_BASE
).replace(/\/$/, "");

/**
 * Construye la URL completa para una imagen del bucket de Cloudflare R2.
 * @param path Ruta del archivo, ej: '/logo.png' o 'ejecutivos/ab.png'
 */
export function imgUrl(path: string): string {
  return buildPublicImageUrl(R2_BASE, path);
}
